#!/usr/bin/env python3
"""Read-only provider audit: inspect(root, fetcher, previous={}) -> report.

Fetchers accept one URL and return bytes (or UTF-8 text). Only node --check is
used: upstream JavaScript is never executed. Self-hosted Rule-Hub resources are
read from the checkout, never fetched as their own upstream. Failed observations
retain an earlier good hash only when the exact source identity is unchanged.
CLI: --root . --report upstream/resource-report.json --state upstream/resource-state.json
"""
from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import inspect as _inspect
import ipaddress
import json
import re
import socket
import subprocess
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import yaml

MAX_BYTES = 8 * 1024 * 1024
SUCCESS = {"fetched", "self-mirror", "inline"}
REPO = ("your98k", "rule-hub")
AUDIT_UA = "Rule-Hub-Resource-Audit/1.0"
SENSITIVE = ("authorization", "proxy-authorization", "cookie", "set-cookie",
             "x-api-key", "api-key", "token", "secret", "password")
_HEADER_NAME = re.compile(r"^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$")
# Headers the auditor sets itself; a provider may override them explicitly.
_BASE_HEADERS = {"User-Agent": AUDIT_UA, "Cache-Control": "no-cache"}


def _headers_of(spec):
    """Validated provider headers from a script-providers entry, as str->str."""
    raw = spec.get("headers") if isinstance(spec, dict) else None
    if raw is None:
        return {}
    if not isinstance(raw, dict):
        raise SourceError("invalid-headers", "provider headers must be a mapping")
    out = {}
    for name, value in raw.items():
        name = str(name)
        if not _HEADER_NAME.match(name):
            raise SourceError("invalid-headers", "provider header name is not a valid token")
        if isinstance(value, (list, tuple)):
            value = ", ".join(str(v) for v in value)
        value = str(value)
        if any(ord(c) < 32 or ord(c) == 127 for c in value):
            raise SourceError("invalid-headers", "provider header value has control characters")
        if name.lower() in {k.lower() for k in out}:
            raise SourceError("invalid-headers", "provider headers repeat a name with different case")
        out[name] = value
    return out


def _header_digest(headers):
    """Stable identity for a header set; same URL with other headers is a new request."""
    canonical = sorted((str(k).lower(), str(v)) for k, v in (headers or {}).items())
    return hashlib.sha256(json.dumps(canonical, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()


def cache_key(url, headers=None):
    """Fetch-cache identity: URL plus normalized headers, never the URL alone."""
    return str(url) + "\n" + _header_digest(headers)


def _redact(headers):
    """Report headers but never a credential value."""
    out = {}
    for name, value in (headers or {}).items():
        low = str(name).lower()
        out[str(name)] = "<redacted>" if any(word in low for word in SENSITIVE) else str(value)
    return out


def request_headers(headers=None):
    """Provider headers merged over the auditor defaults, audited last."""
    merged = {k: v for k, v in _BASE_HEADERS.items()}
    for name, value in (headers or {}).items():
        for existing in [k for k in merged if k.lower() == str(name).lower()]:
            del merged[existing]
        merged[str(name)] = str(value)
    return merged


def _accepts_headers(fetcher):
    """Custom fetchers keep their one-argument contract; only 2+ positional get headers."""
    try:
        signature = _inspect.signature(fetcher)
    except (TypeError, ValueError):
        return False
    positional = 0
    for parameter in signature.parameters.values():
        if parameter.kind is parameter.VAR_POSITIONAL:
            return True
        if parameter.kind in (parameter.POSITIONAL_ONLY, parameter.POSITIONAL_OR_KEYWORD):
            positional += 1
    return positional >= 2


class SourceError(ValueError):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


class UniqueLoader(yaml.SafeLoader):
    pass


def _unique(loader, node, deep=False):
    out = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in out:
            raise SourceError("override-parse-failed", "duplicate YAML key: " + str(key))
        out[key] = loader.construct_object(value_node, deep=deep)
    return out


UniqueLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _unique)


def _sha(data):
    return hashlib.sha256(data).hexdigest()


def _url_parts(url, resolve=False):
    """Reject credentialed, local, private, non-HTTPS and malformed URLs."""
    try:
        p = urllib.parse.urlsplit(url)
        host = p.hostname
        port = p.port or 443
    except (ValueError, TypeError) as error:
        raise SourceError("invalid-url", "malformed source URL") from error
    if (p.scheme != "https" or not host or p.username is not None or p.password is not None
            or p.fragment or any(ord(c) < 33 for c in url) or "\\" in url):
        raise SourceError("invalid-url", "source must be HTTPS without credentials, fragments or control characters")
    host = host.lower().rstrip(".")
    if host == "localhost" or host.endswith((".localhost", ".local", ".internal", ".test", ".invalid")) or "." not in host:
        raise SourceError("non-public-url", "source host is not public")
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        address = None
    if address is not None and not address.is_global:
        raise SourceError("non-public-url", "source address is not public")
    if resolve:
        try:
            addresses = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
        except OSError as error:
            raise SourceError("fetch-error", "source DNS lookup failed") from error
        if not addresses or any(not ipaddress.ip_address(x[4][0].split('%')[0]).is_global for x in addresses):
            raise SourceError("non-public-url", "source DNS includes a non-public address")
    return p


def _self_mirror(url):
    p = urllib.parse.urlsplit(url)
    host = (p.hostname or "").lower()
    parts = [v for v in urllib.parse.unquote(p.path).split("/") if v]
    if host in {"raw.githubusercontent.com", "github.com"}:
        return len(parts) >= 2 and tuple(v.lower() for v in parts[:2]) == REPO
    if host == "jsdelivr.net" or host.endswith(".jsdelivr.net"):
        return len(parts) >= 3 and parts[0] == "gh" and parts[1].lower() == REPO[0] and parts[2].split('@')[0].lower() == REPO[1]
    return host == "your98k.github.io" and bool(parts) and parts[0].lower() == REPO[1]


def _mirror_path(url):
    p = urllib.parse.urlsplit(url)
    parts = [v for v in urllib.parse.unquote(p.path).split("/") if v]
    host = (p.hostname or "").lower()
    if any(v in {".", ".."} for v in parts):
        raise SourceError("self-mirror-invalid", "mirror path contains traversal")
    if host == "raw.githubusercontent.com":
        tail = parts[2:]
    elif host == "github.com":
        if len(parts) < 4 or parts[2] not in {"raw", "blob"}:
            raise SourceError("self-mirror-invalid", "repository URL is not a file resource")
        tail = parts[3:]
    elif host == "jsdelivr.net" or host.endswith(".jsdelivr.net"):
        tail = parts[3:]
        if '@' not in parts[2]:
            raise SourceError("self-mirror-invalid", "CDN mirror is missing its ref")
        return "/".join(tail)
    elif host == "your98k.github.io":
        tail = parts[1:]
        if tail and tail[0] == "files":
            tail = tail[1:]
        return "/".join(tail)
    else:
        raise SourceError("self-mirror-invalid", "unknown mirror layout")
    # raw /repo/main/file, /repo/refs/heads/main/file, /repo/refs/tags/v1/file
    if tail[:2] in (["refs", "heads"], ["refs", "tags"]):
        tail = tail[3:]
    else:
        tail = tail[1:]
    if not tail:
        raise SourceError("self-mirror-invalid", "mirror has no file path")
    return "/".join(tail)


def _type(url):
    if _self_mirror(url):
        return "self-mirror"
    p = urllib.parse.urlsplit(url)
    if re.search(r"(?i)(?:/|@)[0-9a-f]{40}(?:/|$)", p.path) or "/refs/tags/" in p.path or "/releases/download/" in p.path:
        return "pinned"
    return "direct"


def call_fetcher(fetcher, url, headers=None):
    """Invoke a fetcher, passing headers only to fetchers that accept them.

    Custom fetchers (including test doubles) written against the original
    one-argument protocol keep working unchanged.
    """
    if headers and _accepts_headers(fetcher):
        return fetcher(url, headers)
    return fetcher(url)


def default_fetcher(url, headers=None):
    """Bounded HTTPS fetch; every redirect must also resolve to public addresses.

    ``headers`` are the provider's own headers (for example a User-Agent some
    hosts require before serving JavaScript). They are merged over the auditor
    defaults instead of overriding every request with one blanket agent.
    """
    _url_parts(url, resolve=True)

    class Redirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            _url_parts(newurl, resolve=True)
            if _self_mirror(newurl):
                raise SourceError("self-redirect", "external source redirected into Rule-Hub; local mapping required")
            return super().redirect_request(req, fp, code, msg, headers, newurl)

    request = urllib.request.Request(url, headers=request_headers(headers))
    try:
        with urllib.request.build_opener(Redirect()).open(request, timeout=25) as response:
            _url_parts(response.url, resolve=True)
            data = response.read(MAX_BYTES + 1)
            if "text/html" in response.headers.get("Content-Type", "").lower():
                raise SourceError("html", "source returned HTML content type")
    except urllib.error.HTTPError as error:
        raise SourceError("not-found" if error.code == 404 else "http-error", "HTTP " + str(error.code)) from error
    except urllib.error.URLError as error:
        raise SourceError("fetch-error", "source request failed") from error
    if len(data) > MAX_BYTES:
        raise SourceError("too-large", "source exceeds 8 MiB")
    return data


def _bytes(value):
    if isinstance(value, str):
        value = value.encode("utf-8")
    if not isinstance(value, (bytes, bytearray)):
        raise SourceError("fetch-error", "fetcher must return bytes or text")
    if len(value) > MAX_BYTES:
        raise SourceError("too-large", "source exceeds 8 MiB")
    return bytes(value)


def _check(data):
    try:
        text = data.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise SourceError("invalid-encoding", "source is not UTF-8") from error
    if not text.strip():
        raise SourceError("empty", "source is empty")
    if re.match(r"(?is)\s*(?:<!doctype\s+html|<html\b)", text):
        raise SourceError("html", "source returned HTML")
    with tempfile.TemporaryDirectory(prefix="rulehub-resource-check-") as directory:
        candidate = Path(directory) / "candidate.js"
        candidate.write_text(text, encoding="utf-8")
        try:
            result = subprocess.run(["node", "--check", str(candidate)], capture_output=True, text=True, timeout=20)
        except FileNotFoundError as error:
            raise SourceError("node-missing", "node is missing") from error
        except subprocess.TimeoutExpired as error:
            raise SourceError("node-check-timeout", "node --check timed out") from error
    if result.returncode:
        detail = result.stderr.replace(str(candidate), "<candidate>")[-500:]
        raise SourceError("node-check-failed", detail)
    return {"sha256": _sha(data), "bytes": len(data), "node_check": "passed"}


def inspect(root, fetcher, previous=None):
    """Return a JSON-serializable inventory; never write checkout/provider files.

    Concurrent, deduplicated external inspection uses at most eight workers.
    ``previous`` is an earlier report. Failed observations preserve only an
    identical URL/kind baseline; changing source never adopts an older hash.
    Self-mirror hashes describe the checkout only, not original-author freshness.
    """
    root = Path(root).resolve()
    prior = {r["resource_key"]: r for r in (previous or {}).get("resources", []) if isinstance(r, dict) and r.get("resource_key")}
    rows, parse_errors, fetched_headers = [], [], {}
    files = sorted((root / "Stash").glob("*.stoverride"))
    if not (root / "Stash").is_dir():
        parse_errors.append({"source_status": "inventory-missing", "error": "Stash directory is missing"})
    for path in files:
        override = path.relative_to(root).as_posix()
        try:
            document = yaml.load(path.read_text(encoding="utf-8"), Loader=UniqueLoader)
            if not isinstance(document, dict):
                raise SourceError("override-parse-failed", "YAML root must be a mapping")
            providers = document.get("script-providers", {})
            if not isinstance(providers, dict):
                raise SourceError("invalid-providers", "script-providers must be a mapping")
        except Exception as error:
            parse_errors.append({"override": override, "source_status": getattr(error, "status", "override-parse-failed"), "error": str(error)})
            continue
        for name, spec in providers.items():
            name = str(name)
            items = []
            if not isinstance(spec, dict):
                items.append(("provider", None, "invalid-provider"))
            else:
                if "url" in spec:
                    items.append(("url", spec["url"], None))
                if "payload" in spec:
                    items.append(("payload", spec["payload"], None))
                if not items:
                    items.append(("provider", None, "missing-source"))
            for kind, value, error in items:
                row = {"resource_key": json.dumps([override, name, kind], ensure_ascii=False, separators=(',', ':')),
                       "override": override, "provider": name, "resource_kind": kind,
                       "source_url": value if kind == "url" and isinstance(value, str) else None,
                       "source_type": "inline" if kind == "payload" else None,
                       "source_status": "pending", "sha256": None, "bytes": None,
                       "node_check": "not-run", "baseline_preserved": False,
                       "request_headers": None, "headers_digest": None}
                if error:
                    row.update(source_status=error, error="provider has no valid url/payload" if error == "missing-source" else "provider must be a mapping")
                elif kind == "payload":
                    try:
                        if not isinstance(value, str):
                            raise SourceError("invalid-payload", "payload must be a string")
                        row.update(_check(_bytes(value)), source_status="inline")
                    except SourceError as problem:
                        row.update(source_status=problem.status, error=str(problem))
                else:
                    try:
                        if not isinstance(value, str) or not value.strip() or value != value.strip():
                            raise SourceError("invalid-url", "url must be a nonempty, unpadded string")
                        _url_parts(value)
                        provider_headers = _headers_of(spec)
                        row["request_headers"] = _redact(provider_headers)
                        row["headers_digest"] = _header_digest(provider_headers)
                        fetched_headers[row["resource_key"]] = provider_headers
                        row["source_type"] = _type(value)
                        if row["source_type"] == "self-mirror":
                            relative = _mirror_path(value)
                            local = (root / relative).resolve()
                            if not relative or not local.is_relative_to(root) or local == root:
                                raise SourceError("self-mirror-invalid", "mirror path escapes root")
                            row["local_path"] = relative
                            if not local.is_file():
                                raise SourceError("self-mirror-missing", "local mirror is missing")
                            row.update(_check(_bytes(local.read_bytes())), source_status="self-mirror", upstream_status="unverified-local-mirror")
                    except (OSError, SourceError) as problem:
                        row.update(source_status=getattr(problem, "status", "self-mirror-read-error"), error=str(problem))
                rows.append(row)

    pending = [r for r in rows if r["source_status"] == "pending"]
    targets, urls = {}, sorted({r["source_url"] for r in pending})
    for row in pending:
        headers = fetched_headers.get(row["resource_key"]) or {}
        targets[cache_key(row["source_url"], headers)] = (row["source_url"], headers)

    def fetch_one(item):
        key, (url, headers) = item
        try:
            content = call_fetcher(fetcher, url, headers)
            return key, {**_check(_bytes(content)), "source_status": "fetched"}
        except urllib.error.HTTPError as error:
            return key, {"source_status": "not-found" if error.code == 404 else "http-error", "error": "HTTP " + str(error.code)}
        except Exception as error:
            return key, {"source_status": getattr(error, "status", "fetch-error"), "error": str(error)}

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        observations = dict(pool.map(fetch_one, targets.items()))
    for row in rows:
        if row["source_status"] == "pending":
            row.update(observations[cache_key(row["source_url"], fetched_headers.get(row["resource_key"]) or {})])
        old = prior.get(row["resource_key"], {})
        if row["source_status"] not in SUCCESS and old.get("sha256"):
            if ((old.get("source_url"), old.get("source_type"), old.get("headers_digest"))
                    == (row.get("source_url"), row.get("source_type"), row.get("headers_digest"))):
                row.update(sha256=old["sha256"], bytes=old.get("bytes"), baseline_preserved=True,
                           baseline_source_url=old.get("baseline_source_url", old.get("source_url")))
            else:
                row["previous_source_changed"] = True
        if row["source_status"] in SUCCESS:
            row["baseline_source_url"] = row["source_url"]
    errors = parse_errors + [r for r in rows if r["source_status"] not in SUCCESS]
    counts = {}
    for row in rows:
        counts[row["source_status"]] = counts.get(row["source_status"], 0) + 1
    return {"version": 1, "resources": rows, "override_errors": parse_errors, "errors": errors,
            "summary": {"overrides": len(files), "total": len(rows), "unique_external_urls": len(urls),
                        "unique_requests": len(targets), "errors": len(errors), "by_status": counts}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--report", "--output", dest="report", type=Path, default=Path("upstream/resource-report.json"))
    parser.add_argument("--state", "--previous", dest="state", type=Path)
    args = parser.parse_args()
    root = args.root.resolve()
    state = (root / args.state).resolve() if args.state else None
    previous = json.loads(state.read_text(encoding="utf-8")) if state and state.is_file() else {}
    result = inspect(root, default_fetcher, previous)
    encoded = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    outputs = {(root / args.report).resolve()}
    if state:
        outputs.add(state)
    source_dirs = [root / "Stash", root / "Script", root / "scripts"]
    if any(p == Path(__file__).resolve() or any(p.is_relative_to(d) for d in source_dirs) for p in outputs):
        parser.error("report/state must not overwrite provider or override sources")
    for output in outputs:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(encoded, encoding="utf-8")
    print(json.dumps(result["summary"], ensure_ascii=False))
    return 1 if result["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
