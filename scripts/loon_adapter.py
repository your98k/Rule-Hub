# -*- coding: utf-8 -*-
"""Loon 插件（.plugin / .lpx）→ Stash 覆写（.stoverride）保守转换器。

设计原则
========
1. **绝不静默丢条目**：每一行只有三种归宿——转换成功、`degraded`（已转换但记录了
   语义损失）、`blocked`（不转换并记录行号与原因）。三者都可在返回值里查到行号。
2. **保真优先**：宁可 blocked，也不猜。凡是 Stash 侧没有等价表达、或需要额外部署
   资源、或依赖未被核实的字段，一律 blocked。
3. **不做字符串猜测**：不靠域名后缀猜 mitm、不从正则里挖主机名、不自动重命名参数
   （改密钥名会破坏脚本里的 `$argument` 取值）。

支持的输入
==========
- 元数据：``#!name`` ``#!desc`` ``#!author`` ``#!homepage`` ``#!icon`` ``#!date``
  ``#!tag``（→ ``category``）``#!openUrl`` / ``#!open-url``（→ ``openUrl``）
- 段落：``[Argument]`` ``[Rule]`` ``[Rewrite]`` ``[Script]`` ``[Mitm]``/``[MitM]``
- 旧版 Rewrite：``reject`` / ``reject-dict`` / ``reject-array`` / ``reject-img``、
  URL 替换 ``<target> header``、``302`` / ``307``、``header-add|del|replace|
  replace-regex``、``response-header-*``、``request|response-body-replace-regex``、
  ``request|response-body-json-del|jq``
- 新版 Rewrite：``request|response if <cond> then <action> [| <action> ...]``，
  支持 ``url.replace`` ``redirect`` ``reject*`` ``*.header.*`` ``*.body.replace``
  ``*.json.add|delete|replace|jq`` ``*.body.mock``
- 新版 Script：``request|response if ... then script("url"[, arg]) [with ...]``、
  ``cron <expr> then script(...)``
- 旧版 Script：``http-request|http-response <regex> script-path=..., requires-body=...``、
  ``cron "<expr>" script-path=...``
- ``[Argument]``：``input`` / ``select`` / ``switch``（``type=string|number|boolean``）

明确不支持（一律 blocked，并给行号）
====================================
``[Host]`` ``[General]`` ``[IP Rewrite]`` ``[Remote Script]`` 等无等价字段的段落；
Loon ``reject_video``；带 ``${name.N}`` 捕获替换的 ``url.replace``；本地相对路径脚本；
``network-changed`` / ``generic`` 触发器；``jq_file`` / ``mock_file``；``PROCESS-NAME``
/ ``PROCESS-PATH`` 规则；非内置策略名；非法参数名等。

公开 API
========
``convert(text, *, strict=False, name_hint=None) -> dict``
    返回 ``{"yaml", "blocked", "degraded", "warnings", "stats"}``。
``to_stoverride(text, **kwargs) -> str``
    只要 YAML 文本。
``convert_or_raise(text, **kwargs) -> str``
    ``strict=True`` 的快捷方式，存在 blocked 时抛 :class:`UnsupportedError`。

``strict=True`` 时，``degraded`` 也视作失败（因为语义损失同样不可接受）。
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

__all__ = [
    "UnsupportedError",
    "convert",
    "convert_or_raise",
    "to_stoverride",
    "SUPPORTED_RULE_TYPES",
    "SUPPORTED_POLICIES",
]

# --------------------------------------------------------------------------- #
# 常量表：只列已核实、能一一对应的项
# --------------------------------------------------------------------------- #

SUPPORTED_RULE_TYPES = {
    "DOMAIN",
    "DOMAIN-SUFFIX",
    "DOMAIN-KEYWORD",
    "DOMAIN-WILDCARD",
    "DOMAIN-REGEX",
    "IP-CIDR",
    "IP-CIDR6",
    "IP-ASN",
    "GEOIP",
    "DST-PORT",
    "SRC-IP",
    "SRC-PORT",
    "NETWORK",
    "PROTOCOL",
    "USER-AGENT",
    "URL-REGEX",
    "RULE-SET",
    "GEOSITE",
    "AND",
    "OR",
    "NOT",
}

# Stash 侧能确认存在的内置策略。PROXY 不在其中：它是 Loon 的「由用户在插件里
# 选策略组」占位符，Stash 没有同义关键字，落到规则里等于凭空引用一个不存在的组，
# 必须由调用方显式给出映射表后再转换，否则 blocked。
SUPPORTED_POLICIES = {"DIRECT", "REJECT", "REJECT-DROP", "REJECT-TINYGIF"}

RULE_OPTIONS = {"no-resolve", "no-track", "pre-matching"}

# Loon 规则里明确不可用于 iOS/tvOS 的类型
BLOCKED_RULE_TYPES = {"PROCESS-NAME", "PROCESS-PATH"}

MOCK_CONTENT_TYPES = {
    "json": "application/json",
    "text": "text/plain",
    "plain": "text/plain",
    "html": "text/html",
    "css": "text/css",
    "javascript": "application/javascript",
    "text/event-stream": "text/event-stream",
    "png": "image/png",
    "gif": "image/gif",
    "jpeg": "image/jpeg",
    "tiff": "image/tiff",
    "svg": "image/svg+xml",
    "mp4": "video/mp4",
    "form-data": "multipart/form-data",
    # Loon 允许把 "base64" 当内容类型写，第 4 个参数再置 true；Stash 用 base64 键表达
    "base64": None,
}

# 无等价表达、直接整段落 blocked 的 section
BLOCKED_SECTIONS = {
    "host": "Stash 覆写无 [Host] 的 DNS 映射字段，需人工改写为 dns 配置",
    "general": "Loon 插件 General 白名单与 Stash 配置项不同名，无已核实的对应写法",
    "ip rewrite": "Stash 无 IP Rewrite（TUN 数据包动作）能力",
    "remote script": "Stash 的脚本统一放在 http.script / script-providers，无 Remote Script 段",
    "plugin": "Stash 无插件嵌套段",
    "proxy": "Stash 覆写不承载节点定义",
    "metadata": "该段不是配置段",
}

SECTION_ALIASES = {
    "argument": "argument",
    "rule": "rule",
    "rewrite": "rewrite",
    "script": "script",
    "mitm": "mitm",
    "mit m": "mitm",
}

# --------------------------------------------------------------------------- #
# 数据结构
# --------------------------------------------------------------------------- #


@dataclass
class Finding:
    """一条无法保真转换（blocked）或已转换但有损失（degraded）的记录。"""

    line: int
    reason: str
    raw: str = ""
    severity: str = "blocked"

    def as_dict(self) -> Dict[str, Any]:
        return {
            "line": self.line,
            "severity": self.severity,
            "reason": self.reason,
            "raw": self.raw,
        }

    def __str__(self) -> str:  # pragma: no cover - 展示用
        tag = "BLOCKED" if self.severity == "blocked" else "DEGRADED"
        raw = f" | {self.raw}" if self.raw else ""
        return f"L{self.line} {tag}: {self.reason}{raw}"


class UnsupportedError(Exception):
    """存在无法保真转换的条目。

    ``blocked`` 与 ``degraded`` 分别是 :class:`Finding` 列表，均带行号。
    """

    def __init__(self, findings: Sequence[Finding], *, cause: Optional[str] = None):
        self.findings = list(findings)
        self.blocked = [f for f in self.findings if f.severity == "blocked"]
        self.degraded = [f for f in self.findings if f.severity == "degraded"]
        head = cause or "存在无法保真转换的条目"
        detail = "\n".join(f"  {f}" for f in self.findings[:20])
        more = "" if len(self.findings) <= 20 else f"\n  …另有 {len(self.findings) - 20} 条"
        super().__init__(f"{head}（{len(self.findings)} 条）：\n{detail}{more}")


@dataclass
class Context:
    """转换过程中的累积状态。"""

    blocked: List[Finding] = field(default_factory=list)
    degraded: List[Finding] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    stats: Dict[str, int] = field(default_factory=lambda: {
        "rules": 0,
        "url_rewrite": 0,
        "header_rewrite": 0,
        "body_rewrite": 0,
        "mock": 0,
        "script": 0,
        "cron": 0,
        "mitm": 0,
        "arguments": 0,
        "providers": 0,
    })

    def block(self, line: int, reason: str, raw: str = "") -> None:
        self.blocked.append(Finding(line, reason, raw, "blocked"))

    def degrade(self, line: int, reason: str, raw: str = "") -> None:
        self.degraded.append(Finding(line, reason, raw, "degraded"))

    def warn(self, message: str) -> None:
        self.warnings.append(message)


# --------------------------------------------------------------------------- #
# 通用工具
# --------------------------------------------------------------------------- #


def _split_top(text: str, sep: str = ",") -> List[str]:
    """按 ``sep`` 切分，忽略括号、方括号、花括号与引号内部的分隔符。"""

    out: List[str] = []
    buf: List[str] = []
    depth = 0
    quote: Optional[str] = None
    i = 0
    while i < len(text):
        ch = text[i]
        if quote:
            buf.append(ch)
            if ch == "\\" and i + 1 < len(text):
                buf.append(text[i + 1])
                i += 2
                continue
            if ch == quote:
                quote = None
            i += 1
            continue
        if ch in "\"'`":
            quote = ch
            buf.append(ch)
        elif ch in "([{":
            depth += 1
            buf.append(ch)
        elif ch in ")]}":
            depth -= 1
            buf.append(ch)
        elif ch == sep and depth == 0:
            out.append("".join(buf))
            buf = []
        else:
            buf.append(ch)
        i += 1
    if "".join(buf).strip():
        out.append("".join(buf))
    return [x.strip() for x in out]


def _split_pipe(text: str) -> List[str]:
    """按顶层 ``|`` 切分 Action 管道（jq 表达式里常有 ``|``，需按括号/引号保护）。"""

    out: List[str] = []
    buf: List[str] = []
    depth = 0
    quote: Optional[str] = None
    i = 0
    while i < len(text):
        ch = text[i]
        if quote:
            buf.append(ch)
            if ch == "\\" and i + 1 < len(text):
                buf.append(text[i + 1])
                i += 2
                continue
            if ch == quote:
                quote = None
            i += 1
            continue
        if ch in "\"'`":
            quote = ch
            buf.append(ch)
        elif ch in "([{":
            depth += 1
            buf.append(ch)
        elif ch in ")]}":
            depth -= 1
            buf.append(ch)
        elif ch == "|" and depth == 0:
            out.append("".join(buf).strip())
            buf = []
        else:
            buf.append(ch)
        i += 1
    if "".join(buf).strip():
        out.append("".join(buf).strip())
    return out


def _unquote(text: str) -> str:
    """去掉成对引号/反引号，并还原常见转义（不还原 \\\\n，交由 YAML 层处理）。"""

    s = text.strip()
    if len(s) >= 2 and s[0] == s[-1] and s[0] in "\"'`":
        quote = s[0]
        inner = s[1:-1]
        if quote == "`":
            return inner.replace("``", "`")
        return inner.replace('\\"', '"').replace("\\'", "'") if quote == '"' else inner.replace("\\'", "'")
    return s


def _yaml_scalar(value: Any) -> str:
    """把标量写成 YAML。含换行或控制字符时退化为 JSON 双引号写法。"""

    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return repr(value)
    s = str(value)
    if "\n" in s or "\r" in s or "\t" in s:
        return json.dumps(s, ensure_ascii=False)
    return "'" + s.replace("'", "''") + "'"


def _regex_literal(pattern: str) -> str:
    """把 Loon 的 ``/.../ims`` 正则字面量转成裸正则；不是字面量则原样返回。"""

    s = pattern.strip()
    if len(s) >= 2 and s.startswith("/"):
        # 找到未被转义、且不在字符类里的收尾斜杠
        i = 1
        in_class = False
        while i < len(s):
            ch = s[i]
            if ch == "\\":
                i += 2
                continue
            if ch == "[":
                in_class = True
            elif ch == "]":
                in_class = False
            elif ch == "/" and not in_class:
                body = s[1:i]
                flags = s[i + 1:]
                if flags:
                    # Stash 的匹配串不带 flags；有 flags 时用内联标志保留语义
                    if re.fullmatch(r"[ims]*", flags):
                        body = f"(?{flags})" + body if flags else body
                    else:
                        return s
                return body
            i += 1
    return s


def _scan_regex_literal(text: str, start: int) -> Optional[Tuple[str, str, int]]:
    """从 ``start`` 处的 ``/`` 起扫描正则字面量，返回 (裸正则, flags, 结束下标)。

    正确处理 ``\\/`` 转义与 ``[...]`` 字符类，避免把 ``\\/`` 里的斜杠当成收尾。
    """

    if start >= len(text) or text[start] != "/":
        return None
    i = start + 1
    in_class = False
    buf: List[str] = []
    while i < len(text):
        ch = text[i]
        if ch == "\\" and i + 1 < len(text):
            buf.append(text[i : i + 2])
            i += 2
            continue
        if ch == "[":
            in_class = True
        elif ch == "]":
            in_class = False
        elif ch == "/" and not in_class:
            body = "".join(buf)
            j = i + 1
            flags_chars = []
            while j < len(text) and text[j] in "imsgxu":
                flags_chars.append(text[j])
                j += 1
            flags = "".join(flags_chars)
            if not re.fullmatch(r"[ims]*", flags or ""):
                return None
            if flags:
                body = f"(?{flags})" + body
            return body, flags, j
        buf.append(ch)
        i += 1
    return None


def _extract_url_regex(condition: str) -> Optional[str]:
    """从条件里取出 ``${url} ~= /.../`` 的正则；没有则返回 None。"""

    m = re.search(r"\$\{url\}\s*~=\s*", condition)
    if not m:
        return None
    scanned = _scan_regex_literal(condition, m.end())
    if not scanned:
        return None
    return scanned[0]



# --------------------------------------------------------------------------- #
# 元数据
# --------------------------------------------------------------------------- #

_META_KEYS = {
    "name": "name",
    "desc": "desc",
    "author": "author",
    "homepage": "homepage",
    "icon": "icon",
    "date": "date",
    "tag": "category",
    "tags": "category",
    "category": "category",
    "openurl": "openUrl",
    "open-url": "openUrl",
    "open_url": "openUrl",
}

_META_IGNORED = {
    "system": "Loon 平台限制字段，Stash 无对应项，已丢弃（不影响配置）",
    "system_version": "Loon 系统版本限制字段，Stash 无对应项，已丢弃",
    "system-version": "Loon 系统版本限制字段，Stash 无对应项，已丢弃",
    "loon_version": "Loon 客户端版本限制字段，Stash 无对应项，已丢弃",
    "loon-version": "Loon 客户端版本限制字段，Stash 无对应项，已丢弃",
    "type": "Loon 插件类型（normal/parser），Stash 无对应项，已丢弃",
}


_BUILTIN_COND_VARS = ("url", "request.", "response.")


def _param_guard(residue: str, param_names: Iterable[str]) -> Optional[str]:
    """判断残留条件里是否含插件参数 guard。

    内置变量（``${url}``、``${request.*}``、``${response.*}``）不算；
    其余 ``${xxx}`` 一律视为参数式开关/分支，Stash 声明式改写与脚本条目都没有
    对应字段，转过去会静默改变行为，因此调用方应 blocked。
    """

    declared = set(param_names)
    for match in re.finditer(r"\$\{([^}]+)\}", residue):
        ref = match.group(1).strip()
        if ref.startswith(_BUILTIN_COND_VARS):
            continue
        head = ref.split(".")[0]
        if head in declared or re.fullmatch(r"[A-Za-z][A-Za-z0-9_]*", head):
            return ref
    return None


_CAPTURE_RE = re.compile(r"\$[0-9]")


def _has_capture(target: str) -> bool:
    """目标串里是否引用了 $1/$2 这类捕获组。

    Stash 的 url-rewrite 没有捕获替换语法；旧版 Loon 的 ``$1`` 取自行首正则，
    新版用 ``as name`` + ``${name.1}``。两者转过去都会丢语义，因此统一 blocked。
    """

    return bool(_CAPTURE_RE.search(target))


def _has_space(s: str) -> bool:
    """是否含空白字符（Stash 的改写串按空白分段，正则里不能有空格）。"""

    return bool(re.search(r"\s", s))


def _split_url_condition(condition: str) -> Tuple[Optional[str], str]:
    """拆出 ``${url} ~= /正则/`` 与其余条件，返回 (正则, 剩余条件)。"""

    m = re.search(r"\$\{url\}\s*~=\s*", condition)
    if not m:
        return None, condition.strip()
    scanned = _scan_regex_literal(condition, m.end())
    if not scanned:
        return None, condition.strip()
    body, _flags, stop = scanned
    residue = (condition[: m.start()] + condition[stop:]).strip()
    residue = re.sub(r"^[()\s]*[&|]{1,2}[()\s]*", "", residue).strip("() \t")
    residue = re.sub(r"[&|]{1,2}[()\s]*$", "", residue).strip()
    return body, residue


def _parse_metadata(lines: Sequence[Tuple[int, str]], ctx: Context) -> Dict[str, str]:
    meta: Dict[str, str] = {}
    last_key: Optional[str] = None
    for lineno, raw in lines:
        stripped = raw.strip()
        if not stripped:
            continue
        if not stripped.startswith("#"):
            # 上一行值的续行（desc 常见多行写法）
            if last_key and raw[:1].isspace():
                meta[last_key] = (meta[last_key] + " " + stripped).strip()
                ctx.warn(f"L{lineno}: 多行元数据已合并为单行（Stash 面板只解析单行 desc）")
            continue
        m = re.match(r"^#!\s*([A-Za-z0-9_-]+)\s*=\s*(.*)$", stripped)
        if not m:
            continue
        key = m.group(1).strip()
        value = m.group(2).strip()
        low = key.lower()
        last_key = None
        if low in _META_IGNORED:
            ctx.warn(f"L{lineno}: {_META_IGNORED[low]}（#!{key}）")
            continue
        target = _META_KEYS.get(low)
        if not target:
            ctx.warn(f"L{lineno}: 未知元数据 #!{key}，已忽略")
            continue
        if target in meta:
            ctx.warn(f"L{lineno}: 元数据 #!{key} 重复出现，后值覆盖前值")
        meta[target] = value
        last_key = target
    return meta



# --------------------------------------------------------------------------- #
# [Argument]
# --------------------------------------------------------------------------- #

_ARG_NAME_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_]{0,63}$")
_ARG_CTRLS = {"input", "select", "switch"}
_ARG_TYPES = {"string", "number", "boolean"}


def _parse_arguments(
    entries: Sequence[Tuple[int, str]], ctx: Context
) -> Tuple[List[Dict[str, Any]], Dict[str, str]]:
    """返回 (参数声明顺序列表, 原参数名 → Stash 参数名 的映射)。"""

    args: List[Dict[str, Any]] = []
    seen: Dict[str, int] = {}
    for lineno, raw in entries:
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            ctx.block(lineno, "[Argument] 行缺少 '='，无法解析", line)
            continue
        name, rest = line.split("=", 1)
        name = name.strip()
        if not _ARG_NAME_RE.match(name):
            ctx.block(
                lineno,
                f"参数名 '{name}' 不符合 Stash 规则（字母开头，仅字母/数字/下划线，≤64）；"
                "重命名会破坏脚本读取 $argument 的键名，故不自动改名",
                line,
            )
            continue
        if name in seen:
            ctx.block(lineno, f"参数 '{name}' 重复声明（首次在第 {seen[name]} 行）", line)
            continue
        seen[name] = lineno

        parts = _split_top(rest)
        if not parts:
            ctx.block(lineno, "[Argument] 行没有控件类型", line)
            continue
        ctrl = parts[0].strip().lower()
        if ctrl not in _ARG_CTRLS:
            ctx.block(lineno, f"不支持的参数控件 '{ctrl}'（仅 input/select/switch）", line)
            continue

        declared_type: Optional[str] = None
        title: Optional[str] = None
        desc: Optional[str] = None
        positional: List[str] = []
        bad = False
        for chunk in parts[1:]:
            kv = re.match(r"^([A-Za-z_-]+)\s*=\s*(.*)$", chunk)
            if kv:
                k = kv.group(1).lower()
                v = _unquote(kv.group(2))
                if k == "type":
                    declared_type = v.lower()
                elif k == "tag":
                    title = v
                elif k in ("desc", "description"):
                    desc = v
                else:
                    ctx.block(lineno, f"不认识的参数属性 '{k}'（仅 type/tag/desc）", line)
                    bad = True
                    break
            else:
                positional.append(_unquote(chunk))
        if bad:
            continue

        if declared_type is None:
            declared_type = "boolean" if ctrl == "switch" else "string"
        if declared_type not in _ARG_TYPES:
            ctx.block(lineno, f"不支持的参数类型 '{declared_type}'（仅 string/number/boolean）", line)
            continue

        if ctrl == "switch" and declared_type != "boolean":
            ctx.block(lineno, "switch 控件的 type 必须是 boolean", line)
            continue
        if ctrl in ("input", "select") and declared_type == "boolean":
            ctx.block(lineno, f"{ctrl} 控件不支持 boolean 类型", line)
            continue

        def coerce(text: str, where: str) -> Any:
            if declared_type == "number":
                try:
                    return float(text) if any(c in text for c in ".eE") else int(text)
                except ValueError:
                    ctx.block(lineno, f"{where} '{text}' 不是合法数字", line)
                    return None
            if declared_type == "boolean":
                low = text.lower()
                if low in ("true", "1", "yes", "on"):
                    return True
                if low in ("false", "0", "no", "off"):
                    return False
                ctx.block(lineno, f"{where} '{text}' 不是合法布尔值", line)
                return None
            return text

        decl: Dict[str, Any] = {
            "name": name,
            "type": ctrl,
            "title": title or name,
        }
        if desc:
            decl["description"] = desc

        if ctrl == "switch":
            default = coerce(positional[0], "switch 默认值") if positional else False
            if default is None:
                continue
            decl["default"] = default
        elif ctrl == "select":
            if not positional:
                ctx.block(lineno, "select 没有任何候选值", line)
                continue
            options = []
            for opt in positional:
                val = coerce(opt, "select 候选值")
                if val is None:
                    options = None  # type: ignore[assignment]
                    break
                options.append(val)
            if options is None:
                continue
            decl["options"] = options
            decl["default"] = options[0]
        else:  # input
            if positional:
                default = coerce(positional[0], "input 默认值")
                if default is None:
                    continue
                if declared_type == "number":
                    if isinstance(default, int):
                        decl["value-type"] = "integer"
                    else:
                        ctx.degrade(
                            lineno,
                            "input 的 type=number 但默认值不是整数；Stash 仅支持 integer，已按字符串保留",
                            line,
                        )
                decl["default"] = default
            elif declared_type == "number":
                decl["value-type"] = "integer"


        args.append(decl)
        ctx.stats["arguments"] += 1
    return args, {a["name"]: a["name"] for a in args}


def _subst_params(text: str, names: Iterable[str]) -> str:
    """把 ``${param}`` 换成 ``${args.param}``；不改动字符串之外的内容。"""

    known = set(names)

    def repl(m: re.Match) -> str:
        name = m.group(1)
        if name in known:
            return "${args." + name + "}"
        return m.group(0)

    return re.sub(r"\$\{([A-Za-z][A-Za-z0-9_]*)\}", repl, text)


# --------------------------------------------------------------------------- #
# [Rule]
# --------------------------------------------------------------------------- #


def _parse_rules(entries: Sequence[Tuple[int, str]], ctx: Context, param_names: Iterable[str]) -> List[str]:
    rules: List[str] = []
    for lineno, raw in entries:
        line = raw.strip()
        if not line:
            continue
        if line.startswith("#"):
            continue
        if " #" in line:
            line = line.split(" #", 1)[0].strip()
        parts = _split_top(line)
        rtype = parts[0].strip().upper()

        if rtype in ("FINAL", "MATCH"):
            policy = parts[1].strip().upper() if len(parts) > 1 else "DIRECT"
            if policy == "PROXY":
                ctx.block(
                    lineno,
                    "兜底规则用了 PROXY 占位符，Stash 需要具体策略组名；请先提供映射",
                    line,
                )
                continue
            if policy not in SUPPORTED_POLICIES:
                ctx.block(lineno, f"兜底规则的策略 '{parts[1]}' 不是 Stash 内置策略", line)
                continue
            rules.append(f"MATCH,{policy}")
            ctx.stats["rules"] += 1
            ctx.warn(f"L{lineno}: Loon FINAL 已转换为 Stash MATCH")
            continue

        if rtype in BLOCKED_RULE_TYPES:
            ctx.block(lineno, f"{rtype} 在 iOS/tvOS 上不被支持，转换后会静默失效", line)
            continue

        if rtype not in SUPPORTED_RULE_TYPES:
            ctx.block(lineno, f"未知或未核实对应写法的规则类型 '{parts[0].strip()}'", line)
            continue

        if len(parts) < 2:
            ctx.block(lineno, "规则缺少目标值", line)
            continue

        # AND/OR/NOT 的复合参数在括号内，_split_top 已保证不被切碎
        value = parts[1].strip()
        rest = parts[2:]
        if not rest:
            ctx.block(lineno, "规则缺少策略", line)
            continue
        policy = rest[0].strip().upper()
        options = [p.strip() for p in rest[1:] if p.strip()]
        if policy == "PROXY":
            ctx.block(
                lineno,
                "Loon 的 PROXY 是「插件内选策略组」占位符，Stash 无同义内置策略；"
                "需先给出策略映射（PROXY → 实际策略组名）再转换，不能凭空生成组",
                line,
            )
            continue
        if policy not in SUPPORTED_POLICIES:
            ctx.block(
                lineno,
                f"策略 '{rest[0].strip()}' 不是 Stash 内置策略；Loon 插件只允许 DIRECT/PROXY/REJECT 系列",
                line,
            )
            continue
        unknown_opts = [o for o in options if o not in RULE_OPTIONS]
        if unknown_opts:
            ctx.block(lineno, f"不认识的规则选项 {unknown_opts}", line)
            continue
        if "pre-matching" in options and policy not in ("REJECT", "REJECT-DROP"):
            ctx.block(lineno, "pre-matching 只能配 REJECT / REJECT-DROP，否则 Stash 加载失败", line)
            continue

        value = _subst_params(value, param_names)
        rules.append(",".join([rtype, value, policy] + options))
        ctx.stats["rules"] += 1
    return rules


# --------------------------------------------------------------------------- #
# [Rewrite]：旧版行 + 新版 DSL
# --------------------------------------------------------------------------- #

_REJECT_ACTIONS = {
    "reject": "- reject",
    "reject-200": "- reject-200",
    "reject-dict": "- reject-dict",
    "reject-array": "- reject-array",
    "reject-img": "- reject-img",
}


def _build_url_rewrite(pattern: str, target: str, action: str) -> str:
    return f"{pattern} {target} {action}"


_KNOWN_ACTIONS = {
    "reject", "reject-200", "reject-dict", "reject-array", "reject-img", "reject-video",
    "header",
    "header-add", "header-del", "header-replace", "header-replace-regex",
    "response-header-add", "response-header-del", "response-header-replace",
    "response-header-replace-regex",
    "request-body-replace-regex", "response-body-replace-regex",
    "request-body-json-del", "response-body-json-del",
    "request-body-json-jq", "response-body-json-jq",
}


def _legacy_rewrite(
    lineno: int, line: str, ctx: Context, param_names: Iterable[str]
) -> Optional[Tuple[str, str]]:
    """解析旧版 Rewrite 行，返回 (类别, 生成的条目) 或 None（已记录 blocked）。

    旧版形态有三种：
    ``<pattern> - reject-dict``、``<pattern> <target> header``、``<pattern> header-add X Y``。
    """

    parts = line.split(None, 1)
    if len(parts) != 2:
        ctx.block(lineno, "旧版 Rewrite 至少需要「URL 正则 + 动作」两段", line)
        return None
    pattern, rest = parts[0].strip(), parts[1].strip()
    if _has_space(pattern):
        ctx.block(lineno, "URL 正则内含空格，Stash 的三段式无法容纳", line)
        return None

    tokens = rest.replace("\\x20", " ").split()
    if not tokens:
        ctx.block(lineno, "旧版 Rewrite 缺少动作", line)
        return None

    # <pattern> - <action>：横杠是「无替换目标」的占位符
    if tokens[0] == "-":
        tokens = tokens[1:]
        if not tokens:
            ctx.block(lineno, "旧版 Rewrite 的 '-' 后面没有动作", line)
            return None
    # <pattern> <target> header|302|307：目标在前、动作在后
    elif (
        len(tokens) >= 2
        and tokens[0].lower() not in _KNOWN_ACTIONS
        and tokens[-1].lower() in ("header", "302", "307")
    ):
        tokens = [tokens[-1]] + [tokens[0]]

    action = tokens[0].lower()
    args = tokens[1:]

    if action in _REJECT_ACTIONS:
        if args:
            ctx.degrade(lineno, f"旧版 '{action}' 的附加参数已忽略", line)
        return "url", f"{pattern} {_REJECT_ACTIONS[action]}"

    if action == "reject-video":
        ctx.block(lineno, "Loon reject-video 无 Stash 等价动作", line)
        return None

    if action in ("302", "307"):
        if not args:
            ctx.block(lineno, "重定向缺少目标 URL", line)
            return None
        if _has_capture(args[0]):
            ctx.block(
                lineno,
                "重定向目标是 $1 之类的捕获引用；Stash 的 url-rewrite 无捕获替换，需人工改写",
                line,
            )
            return None
        target = _subst_params(args[0], param_names)
        return "url", _build_url_rewrite(pattern, target, action)

    if action == "header":  # URL 替换
        if not args:
            ctx.block(lineno, "URL 替换缺少目标 URL", line)
            return None
        if _has_capture(args[0]):
            ctx.block(
                lineno,
                "URL 替换目标含 $1 捕获引用；Stash 的 url-rewrite 无捕获替换，需人工改写",
                line,
            )
            return None
        target = _subst_params(args[0], param_names)
        return "url", _build_url_rewrite(pattern, target, "transparent")

    header_side = None
    if action in ("response-header-add", "response-header-del",
                  "response-header-replace", "response-header-replace-regex"):
        header_side = "response"
    elif action in ("header-add", "header-del", "header-replace", "header-replace-regex"):
        header_side = "request"

    if header_side:
        prefix = "response-header-" if action.startswith("response-header-") else "header-"
        op = action[len(prefix):]
        if op == "del":
            if len(args) != 1:
                ctx.block(lineno, f"{action} 需要「头名」一个参数", line)
                return None
            return "header", f"{pattern} {header_side}-del {args[0]}"
        if op == "replace-regex":
            joined = " ".join(args)
            m = re.match(r"^(\S+)\s+/(.*?)/[a-z]*\s+(.*)$", joined)
            if not m:
                ctx.block(lineno, f"{action} 需要「头名 /正则/ 替换串」", line)
                return None
            head, body, rep = m.group(1), m.group(2), m.group(3)
            if _has_space(head):
                ctx.block(lineno, "头名含空格，无法写入 Stash 四段式", line)
                return None
            return "header", f"{pattern} {header_side}-replace-regex {head} {body} {rep}"
        if len(args) < 2:
            ctx.block(lineno, f"{action} 需要「头名 + 值」两个参数", line)
            return None
        head, value = args[0], " ".join(args[1:])
        value = _subst_params(value, param_names)
        mapped = "replace" if op == "replace" else "add"
        return "header", f"{pattern} {header_side}-{mapped} {head} {value}"

    if action in ("request-body-replace-regex", "response-body-replace-regex"):
        joined = " ".join(args)
        m = re.match(r"^/(.*?)/[a-z]*\s+(.*)$", joined)
        if not m:
            ctx.block(lineno, f"{action} 需要「/正则/ 替换串」", line)
            return None
        side = "request" if action.startswith("request") else "response"
        return "body", f"{pattern} {side}-replace-regex {m.group(1)} {m.group(2)}"

    if action in ("request-body-json-del", "response-body-json-del"):
        if not args:
            ctx.block(lineno, f"{action} 缺少 JSON 路径", line)
            return None
        path = _unquote(" ".join(args))
        side = "request" if action.startswith("request") else "response"
        return "body", f"{pattern} {side}-json-del {path}"

    if action in ("request-body-json-jq", "response-body-json-jq"):
        if not args:
            ctx.block(lineno, f"{action} 缺少 jq 表达式", line)
            return None
        expr = _unquote(" ".join(args))
        side = "request" if action.startswith("request") else "response"
        return "body", f"{pattern} {side}-jq {expr}"

    if action.startswith("mock-"):
        ctx.block(lineno, f"旧版 '{action}' 的参数形态未核实，请按新版 body.mock 重写", line)
        return None

    ctx.block(lineno, f"不认识的旧版 Rewrite 动作 '{tokens[0]}'", line)
    return None


_ACTION_RE = re.compile(r"^([A-Za-z_][A-Za-z0-9_.]*)\((.*)\)$", re.S)


def _new_rewrite(
    lineno: int, phase: str, condition: str, actions: str, ctx: Context, param_names: Iterable[str]
) -> List[Tuple[str, str]]:
    """解析新版 ``request|response if <cond> then <action>|...``。"""

    out: List[Tuple[str, str]] = []
    cond = condition.strip()
    if re.search(r"\bas\s+\w+", cond):
        ctx.block(lineno, "条件里的 'as 捕获' 无法在 Stash 声明式改写中表达", actions)
        return out

    url_pattern, residue = _split_url_condition(cond)
    if not url_pattern:
        ctx.block(lineno, "条件里没有 ${url} ~= /正则/，无法确定 Stash 的匹配串", actions)
        return out
    if residue:
        guard = _param_guard(residue, param_names)
        if guard:
            ctx.block(
                lineno,
                f"条件含插件参数 guard ${{{guard}}}；Stash 的改写没有条件分支字段，转换会改变行为",
                actions,
            )
            return out
        ctx.degrade(
            lineno,
            "条件含 url 之外的判断（如 response.status/header），Stash 声明式改写无对应字段，"
            "已只保留 URL 条件",
            actions,
        )

    if _has_space(url_pattern or ""):
        ctx.block(lineno, "URL 正则内含空格，Stash 的改写串无法容纳", actions)
        return out

    for chunk in _split_pipe(actions):
        matched = _ACTION_RE.match(chunk.strip())
        if not matched:
            ctx.block(lineno, f"无法解析的 Action '{chunk.strip()[:60]}'", actions)
            continue
        name = matched.group(1)
        raw_args = matched.group(2).strip()
        args = [_unquote(a) for a in _split_top(raw_args)] if raw_args else []

        low = name.lower()
        side_prefix = "request" if phase == "request" else "response"

        if low == "url.replace":
            if len(args) != 1:
                ctx.block(lineno, "url.replace 需要 1 个参数", chunk)
                continue
            target = args[0]
            if "${" in target or _has_capture(target):
                ctx.block(lineno, "url.replace 的目标含变量/捕获，Stash 无替换占位", chunk)
                continue
            out.append(("url", _build_url_rewrite(url_pattern, target, "transparent")))
            continue

        if low == "redirect":
            if len(args) != 2 or args[0] not in ("302", "307"):
                ctx.block(lineno, "redirect 需要 (302|307, 目标 URL)", chunk)
                continue
            if _has_capture(args[1]) or "${" in args[1]:
                ctx.block(lineno, "redirect 的目标含捕获/变量，Stash 无替换占位", chunk)
                continue
            out.append(("url", _build_url_rewrite(url_pattern, args[1], args[0])))
            continue

        if low.startswith("reject"):
            status = None
            if args:
                if not args[0].isdigit():
                    ctx.block(lineno, f"{name} 的第一个参数必须是状态码", chunk)
                    continue
                status = int(args[0])
            body = args[1] if len(args) > 1 else None
            if low == "reject":
                if status is None:
                    out.append(("url", f"{url_pattern} - reject"))
                elif status == 404:
                    out.append(("url", f"{url_pattern} - reject"))
                elif status == 200:
                    if body:
                        ctx.block(lineno, "reject(200, body) 需返回自定义正文，Stash 仅支持空正文", chunk)
                        continue
                    out.append(("url", f"{url_pattern} - reject-200"))
                else:
                    ctx.block(lineno, f"reject({status}) 的状态码在 Stash 中无法指定", chunk)
                continue
            mapping = {
                "reject_dict": "reject-dict",
                "reject_array": "reject-array",
                "reject_img": "reject-img",
            }
            if low in mapping:
                if status is not None and status != 200:
                    ctx.degrade(lineno, f"{name}({status}) 的状态码被忽略（Stash 固定行为）", chunk)
                out.append(("url", f"{url_pattern} - {mapping[low]}"))
                continue
            ctx.block(lineno, f"Loon {name} 无 Stash 等价动作", chunk)
            continue

        header_match = re.match(r"^(request|response)\.header\.(add|set|del|replace)$", low)
        if header_match:
            side, op = header_match.group(1), header_match.group(2)
            mapped = {"add": "add", "set": "replace", "del": "del", "replace": "replace-regex"}[op]
            if op == "del":
                if len(args) != 1:
                    ctx.block(lineno, f"{name} 需要 1 个参数", chunk)
                    continue
                out.append(("header", f"{url_pattern} {side}-del {args[0]}"))
                continue
            if op == "replace":
                if len(args) != 3:
                    ctx.block(lineno, f"{name} 需要 (头名, 正则, 替换串)", chunk)
                    continue
                out.append(("header", f"{url_pattern} {side}-replace-regex {args[0]} {args[1]} {args[2]}"))
                continue
            if len(args) != 2:
                ctx.block(lineno, f"{name} 需要 (头名, 值)", chunk)
                continue
            value = _subst_params(args[1], param_names)
            out.append(("header", f"{url_pattern} {side}-{mapped} {args[0]} {value}"))
            continue

        body_replace = re.match(r"^(request|response)\.body\.replace$", low)
        if body_replace:
            if len(args) != 2:
                ctx.block(lineno, f"{name} 需要 (正则, 替换串)", chunk)
                continue
            side = body_replace.group(1)
            out.append(("body", f"{url_pattern} {side}-replace-regex {args[0]} {args[1]}"))
            continue

        json_op = re.match(r"^(request|response)\.json\.(add|delete|replace|jq)$", low)
        if json_op:
            side, op = json_op.group(1), json_op.group(2)
            if op == "jq":
                if not args:
                    ctx.block(lineno, f"{name} 缺少 jq 表达式", chunk)
                    continue
                expr = _unquote(raw_args)
                out.append(("body", f"{url_pattern} {side}-jq {expr}"))
                continue
            if op == "delete":
                if len(args) != 1:
                    ctx.block(lineno, f"{name} 需要 1 个 JSON 路径", chunk)
                    continue
                out.append(("body", f"{url_pattern} {side}-json-del {args[0]}"))
                continue
            if len(args) < 2:
                ctx.block(lineno, f"{name} 需要 (JSON 路径, 值)", chunk)
                continue
            value = args[1]
            if not re.fullmatch(r"-?\d+(?:\.\d+)?|true|false|null|\".*\"", value):
                ctx.block(
                    lineno,
                    f"{name} 的值 '{value}' 不是标量；Stash 的 json-* 改写不支持对象/数组字面量，"
                    "请改用 jq",
                    chunk,
                )
                continue
            out.append(("body", f"{url_pattern} {side}-json-{op} {args[0]} {value}"))
            continue

        json_file = re.match(r"^(request|response)\.json\.jq_file$", low)
        if json_file:
            ctx.block(lineno, f"{name} 依赖外部文件，Stash 覆写无法引用", chunk)
            continue

        mock_match = re.match(r"^(request|response)\.body\.(mock|mock_file)$", low)
        if mock_match:
            side, kind = mock_match.group(1), mock_match.group(2)
            if kind == "mock_file":
                ctx.block(lineno, f"{name} 依赖外部文件，Stash 覆写无法引用", chunk)
                continue
            if len(args) < 2:
                ctx.block(lineno, f"{name} 至少需要 (内容类型, 内容)", chunk)
                continue
            ctype_key = args[0].lower()
            if ctype_key not in MOCK_CONTENT_TYPES:
                ctx.block(lineno, f"未核实的内容类型 '{args[0]}'", chunk)
                continue
            body = args[1]
            status = 200
            base64 = False
            if len(args) >= 3:
                if not args[2].isdigit():
                    ctx.block(lineno, f"{name} 第三个参数必须是状态码", chunk)
                    continue
                status = int(args[2])
            if len(args) >= 4:
                base64 = args[3].lower() == "true"
            payload = {
                "match": url_pattern,
                "text": body,
                "status": status,
                "content_type": MOCK_CONTENT_TYPES[ctype_key],
                "base64": base64,
                "side": side,
            }
            out.append(("mock", json.dumps(payload, ensure_ascii=False)))
            continue

        ctx.block(lineno, f"不认识的 Action '{name}'", chunk)
    return out


def _parse_rewrite(
    entries: Sequence[Tuple[int, str]], ctx: Context, param_names: Iterable[str]
) -> Dict[str, List[str]]:
    bucket: Dict[str, List[str]] = {"url": [], "header": [], "body": [], "mock": []}
    for lineno, raw in entries:
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        m = re.match(r"^(request|response)\s+if\s+(.+?)\s+then\s+(.+)$", line, re.S)
        if m:
            for kind, item in _new_rewrite(
                lineno, m.group(1), m.group(2), m.group(3), ctx, param_names
            ):
                bucket[kind].append(item)
            continue
        parsed = _legacy_rewrite(lineno, line, ctx, param_names)
        if parsed:
            bucket[parsed[0]].append(parsed[1])
    return bucket


# --------------------------------------------------------------------------- #
# [Script]
# --------------------------------------------------------------------------- #


def _parse_with_options(lineno: int, text: str, ctx: Context) -> Optional[Dict[str, Any]]:
    """解析 ``with k=v, k=v``；未知字段或非法值一律 blocked。"""

    opts: Dict[str, Any] = {}
    if not text.strip():
        return opts
    for chunk in _split_top(text):
        m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$", chunk.strip())
        if not m:
            ctx.block(lineno, f"无法解析的 with 选项 '{chunk.strip()}'", text)
            return None
        key = m.group(1)
        raw_value = m.group(2).strip()
        value = _unquote(raw_value)
        if key == "requires_body":
            if value.lower() not in ("true", "false"):
                ctx.block(lineno, "requires_body 必须是布尔值", text)
                return None
            opts["require-body"] = value.lower() == "true"
        elif key == "binary_body_mode":
            if value.lower() not in ("true", "false"):
                ctx.block(lineno, "binary_body_mode 必须是布尔值", text)
                return None
            opts["binary-mode"] = value.lower() == "true"
        elif key == "timeout":
            try:
                number = float(value)
            except ValueError:
                ctx.block(lineno, f"timeout '{value}' 不是数字", text)
                return None
            if number <= 0:
                ctx.block(lineno, "timeout 必须是正数", text)
                return None
            opts["timeout"] = int(number) if number.is_integer() else number
        elif key == "enable":
            if value.lower() == "true":
                pass
            elif value.lower() == "false":
                ctx.block(lineno, "enable=false 的脚本在 Stash 里只能整条不写，语义不同", text)
                return None
            else:
                ctx.block(
                    lineno,
                    f"enable={raw_value} 依赖插件参数开关；Stash 脚本无 enable 字段，"
                    "按常开处理会改变行为",
                    text,
                )
                return None
        elif key in ("tag", "img_url", "debug"):
            # 纯 Loon 展示/调试字段，丢掉不改变配置语义，因此不算语义损失
            ctx.warn(f"L{lineno}: with {key} 是 Loon 专有展示字段，已丢弃")
        else:
            ctx.block(lineno, f"不认识的 with 字段 '{key}'", text)
            return None
    return opts


def _provider_name(url: str, taken: Dict[str, str]) -> str:
    base = os.path.basename(url.split("?")[0].split("#")[0])
    stem = base.rsplit(".", 1)[0]
    name = re.sub(r"[^A-Za-z0-9_]", "_", stem) or "loon_script"
    if not name[0].isalpha():
        name = "s_" + name
    name = name[:64]
    candidate = name
    index = 2
    while candidate in taken and taken[candidate] != url:
        suffix = f"_{index}"
        candidate = name[: 64 - len(suffix)] + suffix
        index += 1
    return candidate


def _script_argument(
    lineno: int, raw: str, ctx: Context, param_names: Iterable[str], *, object_form: bool
) -> Optional[str]:
    """把 Loon 的第二个参数转成 Stash 的 ``argument`` 字符串。"""

    text = raw.strip()
    if not text:
        return None
    if object_form or text.startswith("{"):
        inner = text.strip()
        if inner.startswith("{") and inner.endswith("}"):
            inner = inner[1:-1]
        names = [_unquote(p) for p in _split_top(inner) if p.strip()]
        fields = []
        for item in names:
            token = item.strip()
            m = re.fullmatch(r"\$\{([A-Za-z][A-Za-z0-9_]*)\}", token)
            if m:
                key = m.group(1)
            elif re.fullmatch(r"[A-Za-z][A-Za-z0-9_]*", token):
                # 旧版 Loon 的对象参数写作 {region,level}，不带 ${}
                key = token
            else:
                ctx.block(
                    lineno,
                    f"脚本对象参数里的 '{item}' 不是插件参数引用；Stash 只支持逐字段映射",
                    raw,
                )
                return None
            if key not in set(param_names):
                ctx.block(lineno, f"脚本对象参数引用了未声明的参数 '{key}'", raw)
                return None
            fields.append(f'"{key}":${{args.{key}|json}}')
        if not fields:
            ctx.block(lineno, "脚本对象参数为空", raw)
            return None
        return "{" + ",".join(fields) + "}"
    # 字符串 / Raw String：原样保留
    return _unquote(text)


def _parse_script(
    entries: Sequence[Tuple[int, str]],
    ctx: Context,
    param_names: Iterable[str],
    providers: Dict[str, Dict[str, Any]],
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    scripts: List[Dict[str, Any]] = []
    crons: List[Dict[str, Any]] = []

    for lineno, raw in entries:
        line = raw.strip()
        if not line or line.startswith("#"):
            continue

        # ---- 新版 Script: <trigger> [cond] then script(...) [with ...]
        m = re.match(
            r"^(request|response)\s+if\s+(.+?)\s+then\s+script\s*\((.*)\)\s*(?:with\s+(.+))?$",
            line,
            re.S,
        )
        if m:
            phase, cond, call, with_text = m.group(1), m.group(2), m.group(3), m.group(4) or ""
            args = _split_top(call)
            if not args:
                ctx.block(lineno, "script() 缺少脚本路径", line)
                continue
            path = _unquote(args[0])
            if not re.match(r"^https?://", path):
                ctx.block(
                    lineno,
                    f"脚本路径 '{path}' 不是 http(s) 地址；Stash 的 script-providers 需要 url 或 payload",
                    line,
                )
                continue
            pattern, bare = _split_url_condition(cond)
            if not pattern:
                ctx.block(
                    lineno,
                    "response/request 脚本条件里没有 ${url} ~= /正则/，Stash 的 match 无处可取",
                    line,
                )
                continue
            if _has_space(pattern):
                ctx.block(lineno, "脚本 match 正则含空格，Stash 无法容纳", line)
                continue
            if bare:
                guard = _param_guard(bare, param_names)
                if guard:
                    ctx.block(
                        lineno,
                        f"脚本条件含插件参数 guard ${{{guard}}}；Stash 脚本没有条件开关，转换会改变行为",
                        line,
                    )
                    continue
                ctx.degrade(
                    lineno,
                    "脚本条件含 URL 之外的判断（status/header 等），Stash 脚本无对应字段，已只保留 URL 匹配",
                    line,
                )
            opts = _parse_with_options(lineno, with_text, ctx)
            if opts is None:
                continue
            argument = None
            if len(args) > 1:
                argument = _script_argument(
                    lineno, args[1], ctx, param_names, object_form=args[1].strip().startswith("{")
                )
                if argument is None:
                    continue
            if len(args) > 2:
                ctx.block(lineno, "script() 只接受「路径」与可选「参数」两个位置参数", line)
                continue
            name = _provider_name(path, {k: v["url"] for k, v in providers.items()})
            providers.setdefault(name, {"url": path, "interval": 86400})
            ctx.stats["providers"] += 1
            entry: Dict[str, Any] = {"name": name, "match": pattern, "type": phase}
            entry.update(opts)
            if argument is not None:
                entry["argument"] = argument
            scripts.append(entry)
            ctx.stats["script"] += 1
            continue

        # ---- 新版 cron
        m = re.match(r"^cron\s+(.+?)\s+then\s+script\s*\((.*)\)\s*(?:with\s+(.+))?$", line, re.S)
        if m:
            expr_raw, call, with_text = m.group(1), m.group(2), m.group(3) or ""
            args = _split_top(call)
            if not args:
                ctx.block(lineno, "cron 的 script() 缺少脚本路径", line)
                continue
            path = _unquote(args[0])
            if not re.match(r"^https?://", path):
                ctx.block(lineno, f"脚本路径 '{path}' 不是 http(s) 地址", line)
                continue
            opts = _parse_with_options(lineno, with_text, ctx)
            if opts is None:
                continue
            cron_expr = expr_raw.strip()
            pm = re.fullmatch(r"\$\{([A-Za-z][A-Za-z0-9_]*)\}", cron_expr)
            if pm:
                if pm.group(1) not in set(param_names):
                    ctx.block(lineno, f"cron 引用了未声明的参数 '{pm.group(1)}'", line)
                    continue
                cron_expr = "${args." + pm.group(1) + "}"
            else:
                cron_expr = _unquote(cron_expr)
                if len(cron_expr.split()) not in (5, 6):
                    ctx.block(lineno, f"cron 表达式 '{cron_expr}' 不是 5/6 段", line)
                    continue
            name = _provider_name(path, {k: v["url"] for k, v in providers.items()})
            providers.setdefault(name, {"url": path, "interval": 86400})
            ctx.stats["providers"] += 1
            entry = {"name": name, "cron": cron_expr}
            if "timeout" in opts:
                entry["timeout"] = opts["timeout"]
            if len(args) > 1:
                argument = _script_argument(
                    lineno, args[1], ctx, param_names, object_form=args[1].strip().startswith("{")
                )
                if argument is None:
                    continue
                entry["argument"] = argument
            crons.append(entry)
            ctx.stats["cron"] += 1
            continue

        # ---- 其余触发器
        m = re.match(r"^(network-changed|generic)\b", line)
        if m:
            ctx.block(lineno, f"Loon {m.group(1)} 触发器无 Stash 等价形式", line)
            continue

        # ---- 旧版 Script: http-request/http-response <regex> k=v,...
        m = re.match(r"^(http-request|http-response)\s+(\S+)\s+(.+)$", line, re.S)
        if m:
            kind, pattern, opts_text = m.group(1), m.group(2), m.group(3)
            pattern = _regex_literal(pattern)
            if _has_space(pattern):
                ctx.block(lineno, "脚本正则含空格，Stash 无法容纳", line)
                continue
            opts_raw: Dict[str, str] = {}
            bad = False
            for chunk in _split_top(opts_text):
                kv = re.match(r"^([A-Za-z_-]+)\s*=\s*(.*)$", chunk.strip())
                if not kv:
                    ctx.block(lineno, f"无法解析的脚本选项 '{chunk.strip()}'", line)
                    bad = True
                    break
                opts_raw[kv.group(1).lower()] = kv.group(2).strip()
            if bad:
                continue
            path = _unquote(opts_raw.get("script-path", ""))
            if not path:
                ctx.block(lineno, "旧版脚本缺少 script-path", line)
                continue
            if not re.match(r"^https?://", path):
                ctx.block(lineno, f"脚本路径 '{path}' 不是 http(s) 地址", line)
                continue
            entry = {
                "name": None,
                "match": pattern,
                "type": "request" if kind == "http-request" else "response",
            }
            for key, value in opts_raw.items():
                if key == "script-path":
                    continue
                if key in ("requires-body", "requires_body"):
                    entry["require-body"] = _unquote(value).lower() == "true"
                elif key in ("binary-body-mode", "binary_body_mode"):
                    entry["binary-mode"] = _unquote(value).lower() == "true"
                elif key == "timeout":
                    try:
                        entry["timeout"] = int(float(_unquote(value)))
                    except ValueError:
                        ctx.block(lineno, f"timeout '{value}' 不是数字", line)
                        bad = True
                        break
                elif key in ("argument", "img-url", "img_url", "enable", "enabled", "tag", "debug"):
                    if key == "argument":
                        arg = _script_argument(
                            lineno, value, ctx, param_names, object_form=value.strip().startswith("{")
                        )
                        if arg is None:
                            bad = True
                            break
                        entry["argument"] = arg
                    elif key in ("img-url", "img_url", "tag", "debug"):
                        ctx.warn(f"L{lineno}: 旧版脚本选项 '{key}' 是 Loon 专有字段，已丢弃")
                    else:
                        ctx.degrade(
                            lineno,
                            f"旧版脚本选项 '{key}' 无 Stash 对应字段，可能是开关或附加行为，已丢弃",
                            line,
                        )
                else:
                    ctx.block(lineno, f"不认识的旧版脚本选项 '{key}'", line)
                    bad = True
                    break
            if bad:
                continue
            name = _provider_name(path, {k: v["url"] for k, v in providers.items()})
            providers.setdefault(name, {"url": path, "interval": 86400})
            ctx.stats["providers"] += 1
            entry["name"] = name
            scripts.append(entry)
            ctx.stats["script"] += 1
            continue

        # ---- 旧版 cron
        m = re.match(r"^cron\s+(.+?)\s+script-path\s*=\s*(\S+)(.*)$", line, re.S)
        if m:
            ctx.block(
                lineno,
                "旧版 cron 的表达式/选项需按新版 cron ... then script(...) 重写后再转",
                line,
            )
            continue

        ctx.block(lineno, "无法识别的 [Script] 行", line)

    return scripts, crons


# --------------------------------------------------------------------------- #
# [Mitm]
# --------------------------------------------------------------------------- #


def _parse_mitm(entries: Sequence[Tuple[int, str]], ctx: Context) -> List[str]:
    hosts: List[str] = []
    for lineno, raw in entries:
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        m = re.match(r"^hostname\s*=\s*(.+)$", line, re.I)
        payload = m.group(1) if m else line
        if not m and "=" in line:
            ctx.block(lineno, "[Mitm] 只支持 'hostname = a,b' 或裸域名列表", line)
            continue
        for part in re.split(r"[,\s]+", payload):
            host = part.strip()
            if not host:
                continue
            if not re.fullmatch(r"-?[A-Za-z0-9*?._:\[\]-]+", host):
                ctx.block(lineno, f"MitM 主机名 '{host}' 形态不合法", line)
                continue
            hosts.append(host)
    # 去重保序
    seen = set()
    unique = []
    for host in hosts:
        key = host.lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(host)
    ctx.stats["mitm"] = len(unique)
    return unique


# --------------------------------------------------------------------------- #
# YAML 组装
# --------------------------------------------------------------------------- #


def _emit(
    meta: Dict[str, str],
    args: List[Dict[str, Any]],
    mitm: List[str],
    bucket: Dict[str, List[str]],
    scripts: List[Dict[str, Any]],
    crons: List[Dict[str, Any]],
    providers: Dict[str, Dict[str, Any]],
    rules: List[str],
    name_hint: Optional[str],
) -> str:
    out: List[str] = []

    name = meta.get("name") or name_hint or "未命名覆写"
    out.append("name: " + _yaml_scalar(name))
    desc = meta.get("desc") or ""
    # Loon 的 #!desc 常用字面转义 \n 表示换行；Stash 面板只解析单行，统一折成空格
    desc = desc.replace("\\r\\n", " ").replace("\\n", " ").replace("\\r", " ")
    desc = " ".join(part.strip() for part in desc.replace("\r", " ").split("\n") if part.strip())
    desc = desc or "（无描述）"
    out.append("desc: " + _yaml_scalar(desc))

    if meta.get("category"):
        out.append("category: " + _yaml_scalar(meta["category"]))
    if meta.get("openUrl"):
        out.append("openUrl: " + _yaml_scalar(meta["openUrl"]))
    if meta.get("author"):
        out.append("author: " + _yaml_scalar(meta["author"]))
    if meta.get("homepage"):
        out.append("homepage: " + _yaml_scalar(meta["homepage"]))
    if meta.get("icon"):
        out.append("icon: " + _yaml_scalar(meta["icon"]))
    if meta.get("date"):
        out.append("date: " + _yaml_scalar(meta["date"]))

    if args:
        out.append("arguments-version: 1")
        out.append("arguments:")
        for decl in args:
            out.append(f"  {decl['name']}:")
            out.append(f"    type: {decl['type']}")
            out.append("    title: " + _yaml_scalar(decl["title"]))
            if "description" in decl:
                out.append("    description: " + _yaml_scalar(decl["description"]))
            if "value-type" in decl:
                out.append(f"    value-type: {decl['value-type']}")
            if "default" in decl:
                out.append("    default: " + _yaml_scalar(decl["default"]))
            if "options" in decl:
                out.append("    options:")
                for option in decl["options"]:
                    out.append("      - value: " + _yaml_scalar(option))

    http_lines: List[str] = []
    if mitm:
        http_lines.append("  mitm:")
        for host in mitm:
            http_lines.append("    - " + _yaml_scalar(host))
    for key, source in (
        ("url-rewrite", bucket["url"]),
        ("header-rewrite", bucket["header"]),
        ("body-rewrite", bucket["body"]),
    ):
        if source:
            http_lines.append(f"  {key}:")
            for item in source:
                http_lines.append("    - " + _yaml_scalar(item))
    if bucket["mock"]:
        http_lines.append("  mock:")
        for payload in bucket["mock"]:
            data = json.loads(payload)
            http_lines.append("    - match: " + _yaml_scalar(data["match"]))
            if data["base64"]:
                http_lines.append("      base64: " + _yaml_scalar(data["text"]))
            else:
                http_lines.append("      text: " + _yaml_scalar(data["text"]))
            http_lines.append(f"      status-code: {data['status']}")
            if data["content_type"]:
                http_lines.append("      headers:")
                http_lines.append("        Content-Type: " + _yaml_scalar(data["content_type"]))
    if scripts:
        http_lines.append("  script:")
        for entry in scripts:
            first = True
            for key, value in entry.items():
                prefix = "    - " if first else "      "
                first = False
                if isinstance(value, bool):
                    http_lines.append(f"{prefix}{key}: {'true' if value else 'false'}")
                elif isinstance(value, (int, float)):
                    http_lines.append(f"{prefix}{key}: {value}")
                else:
                    http_lines.append(prefix + key + ": " + _yaml_scalar(value))
    if http_lines:
        out.append("http:")
        out.extend(http_lines)

    if providers:
        out.append("script-providers:")
        for name, payload in providers.items():
            out.append(f"  {name}:")
            out.append("    url: " + _yaml_scalar(payload["url"]))
            out.append(f"    interval: {payload.get('interval', 86400)}")

    if rules:
        out.append("rules:")
        for rule in rules:
            out.append("  - " + _yaml_scalar(rule))

    if crons:
        out.append("cron:")
        out.append("  script:")
        for entry in crons:
            first = True
            for key, value in entry.items():
                prefix = "    - " if first else "      "
                first = False
                if isinstance(value, (int, float)) and not isinstance(value, bool):
                    http_value = str(value)
                    out.append(prefix + key + ": " + http_value)
                else:
                    out.append(prefix + key + ": " + _yaml_scalar(value))

    return "\n".join(out) + "\n"


# --------------------------------------------------------------------------- #
# 主流程
# --------------------------------------------------------------------------- #


def _split_sections(text: str) -> Tuple[List[Tuple[int, str]], Dict[str, List[Tuple[int, str]]], List[Tuple[int, str]]]:
    """把文本切成 (头部行, 段落字典, 未知段落行)。"""

    head: List[Tuple[int, str]] = []
    sections: Dict[str, List[Tuple[int, str]]] = {}
    unknown: List[Tuple[int, str]] = []
    current: Optional[str] = None
    for index, raw in enumerate(text.splitlines(), start=1):
        line = raw.strip()
        m = re.match(r"^\[([^\]]+)\]\s*$", line)
        if m:
            title = m.group(1).strip()
            key = title.lower().replace("mit m", "mitm")
            current = key
            if key in BLOCKED_SECTIONS:
                unknown.append((index, raw))
            else:
                sections.setdefault(key, [])
            continue
        if current is None:
            head.append((index, raw))
        elif current in BLOCKED_SECTIONS:
            unknown.append((index, raw))
        else:
            sections.setdefault(current, []).append((index, raw))
    return head, sections, unknown


def convert(
    text: str,
    *,
    strict: bool = False,
    name_hint: Optional[str] = None,
) -> Dict[str, Any]:
    """把 Loon 插件文本转成 Stash 覆写。

    :param text: Loon ``.plugin`` / ``.lpx`` 全文。
    :param strict: 为 True 时，只要存在 blocked **或** degraded 就抛
        :class:`UnsupportedError`。
    :param name_hint: 元数据缺 ``#!name`` 时用作名称。
    :returns: ``{"yaml", "blocked", "degraded", "warnings", "stats"}``
    """

    if not isinstance(text, str):
        raise TypeError("convert() 需要 str")
    if text.startswith("\ufeff"):
        text = text[1:]

    ctx = Context()
    head, sections, unknown_sections = _split_sections(text)

    meta = _parse_metadata(head, ctx)

    args, param_names = _parse_arguments(sections.get("argument", []), ctx)

    rules = _parse_rules(sections.get("rule", []), ctx, param_names)
    bucket = _parse_rewrite(sections.get("rewrite", []), ctx, param_names)
    providers: Dict[str, Dict[str, Any]] = {}
    scripts, crons = _parse_script(sections.get("script", []), ctx, param_names, providers)
    mitm = _parse_mitm(sections.get("mitm", []), ctx)

    # 未识别段落：整段 blocked，并标注段落名
    seen_sections: List[str] = []
    for lineno, raw in unknown_sections:
        title = raw.strip()
        m = re.match(r"^\[([^\]]+)\]\s*$", title)
        if m:
            name = m.group(1).strip()
            if name not in seen_sections:
                seen_sections.append(name)
            reason = BLOCKED_SECTIONS.get(name.lower(), "未支持或未核实的段落")
            ctx.block(lineno, f"[{name}] 整段未转换：{reason}", title)
    for name in sections:
        if name in ("argument", "rule", "rewrite", "script", "mitm"):
            continue
        reason = BLOCKED_SECTIONS.get(name, "未支持或未核实的段落")
        for lineno, raw in sections[name]:
            if raw.strip():
                ctx.block(lineno, f"[{name}] 未转换：{reason}", raw)

    ctx.stats["url_rewrite"] = len(bucket["url"])
    ctx.stats["header_rewrite"] = len(bucket["header"])
    ctx.stats["body_rewrite"] = len(bucket["body"])
    ctx.stats["mock"] = len(bucket["mock"])

    yaml_text = _emit(
        meta, args, mitm, bucket, scripts, crons, providers, rules, name_hint
    )

    findings = ctx.blocked + ctx.degraded
    if strict and findings:
        raise UnsupportedError(findings)

    return {
        "yaml": yaml_text,
        "blocked": [f.as_dict() for f in ctx.blocked],
        "degraded": [f.as_dict() for f in ctx.degraded],
        "warnings": list(ctx.warnings),
        "stats": dict(ctx.stats),
    }


def to_stoverride(text: str, **kwargs: Any) -> str:
    """只要 YAML 文本；需要 blocked/degraded 明细时用 :func:`convert`。"""

    return convert(text, **kwargs)["yaml"]


def convert_or_raise(text: str, **kwargs: Any) -> str:
    """严格转换：任何 blocked 或 degraded 都抛 :class:`UnsupportedError`。"""

    kwargs.setdefault("strict", True)
    return convert(text, **kwargs)["yaml"]


def convert_strict(text: str, *, name_hint: Optional[str] = None) -> str:
    """:func:`convert_or_raise` 的具名别名。"""

    return convert_or_raise(text, name_hint=name_hint)

def _main(argv: Sequence[str]) -> int:
    """命令行入口：``python3 loon_adapter.py FILE [--strict] [--json]``。

    成功（无 blocked）时把 YAML 打到 stdout，诊断写 stderr；存在 blocked 时退出码 2，
    便于集成脚本用退出码判断是否可用。
    """

    import argparse

    parser = argparse.ArgumentParser(prog="loon_adapter", description="Loon 插件 → Stash 覆写")
    parser.add_argument("path", help="Loon .plugin / .lpx 文件；'-' 表示 stdin")
    parser.add_argument("--strict", action="store_true", help="blocked/degraded 一律报错")
    parser.add_argument("--json", action="store_true", help="把完整结果（含诊断）输出为 JSON")
    args = parser.parse_args(argv)

    if args.path == "-":
        import sys

        text = sys.stdin.read()
        hint = None
    else:
        with open(args.path, encoding="utf-8", errors="replace") as handle:
            text = handle.read()
        hint = os.path.basename(args.path).rsplit(".", 1)[0]

    try:
        result = convert(text, strict=args.strict, name_hint=hint)
    except UnsupportedError as error:
        import sys

        print(str(error), file=sys.stderr)
        return 2

    import sys

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        sys.stdout.write(result["yaml"])
        for item in result["blocked"]:
            print(f"BLOCKED L{item['line']}: {item['reason']}", file=sys.stderr)
        for item in result["degraded"]:
            print(f"DEGRADED L{item['line']}: {item['reason']}", file=sys.stderr)
        for message in result["warnings"]:
            print(f"WARN {message}", file=sys.stderr)
    return 2 if result["blocked"] else 0


if __name__ == "__main__":  # pragma: no cover
    import sys

    raise SystemExit(_main(sys.argv[1:]))
