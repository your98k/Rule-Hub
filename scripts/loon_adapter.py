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
