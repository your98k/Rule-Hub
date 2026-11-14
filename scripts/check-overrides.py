#!/usr/bin/env python3
"""Stash 覆写静态检查（对齐 stash-override skill 规范）

检查项：
1. YAML 可解析，顶部 name/desc 存在
2. url-rewrite 必须是三段：pattern / target / action，无目标时 target 写 '-'
3. body-rewrite / header-rewrite 的 action 必须合法
4. mock 必须含 match 与 text|base64
5. script 的 name 必须在 script-providers 中定义
6. 每条 rewrite 命中的域名必须在 http.mitm 内（否则规则静默不生效）

用法：python3 scripts/check-overrides.py [目录，默认 Stash]
"""
import sys, os, re, glob
import yaml

URL_ACT = {'reject','reject-200','reject-img','reject-dict','reject-array','302','307','transparent'}
BODY_ACT = {'request-replace-regex','response-replace-regex','request-jq','response-jq',
            'request-json-replace','response-json-replace','request-json-add','response-json-add',
            'request-json-del','response-json-del'}
HDR_ACT = {'request-add','request-del','request-replace','request-replace-regex',
           'response-add','response-del','response-replace','response-replace-regex'}


def host_candidates(pat):
    """从 match 正则里提取可能的主机名（处理 (?:a|b) 分支）"""
    p = pat.replace('\\.', '.').replace('\\/', '/')
    m = re.match(r'\^https?://(.*)', p)
    if not m:
        return []
    cut = re.split(r'[/:?]', m.group(1))[0]
    alts = [cut]
    for _ in range(3):
        nxt = []
        for a in alts:
            mm = re.search(r'\(([^()]*)\)', a)
            if mm and '|' in mm.group(1):
                nxt += [a[:mm.start()] + o + a[mm.end():] for o in mm.group(1).split('|')]
            else:
                nxt.append(a)
        alts = nxt
    out = []
    for a in alts:
        a = a.strip('*')
        if re.fullmatch(r'[a-z0-9.-]+\.[a-z]{2,}', a) and '.' in a:
            out.append(a)
    return out


def main():
    root = sys.argv[1] if len(sys.argv) > 1 else 'Stash'
    files = sorted(glob.glob(os.path.join(root, '*.stoverride')))
    issues = []
    for f in files:
        try:
            d = yaml.safe_load(open(f, encoding='utf-8'))
        except Exception as e:
            issues.append((f, 'YAML', str(e)[:90]))
            continue
        if not isinstance(d, dict):
            issues.append((f, '结构', '顶层必须是映射'))
            continue
        for k in ('name', 'desc'):
            if k not in d:
                issues.append((f, k, '缺失'))
        h = d.get('http') or {}
        hosts = [x.lstrip('-').lower() for x in (h.get('mitm') or [])]

        def covered(hh):
            hh = hh.lstrip('*.')
            return any(hh == x.lstrip('*.') or hh.endswith('.' + x.lstrip('*.'))
                       or x.lstrip('*.').endswith('.' + hh) for x in hosts)

        for r in h.get('url-rewrite') or []:
            s = str(r).split(' ')
            if len(s) != 3:
                issues.append((f, 'url-rewrite', f'必须三段 pattern/target/action: {str(r)[:70]}'))
                continue
            if not (s[1] == '-' or s[1].startswith('http')):
                issues.append((f, 'url-rewrite', f'target 非法: {s[1][:40]}'))
            if s[2] not in URL_ACT:
                issues.append((f, 'url-rewrite', f'action 非法: {s[2]}'))
            for hh in host_candidates(s[0]):
                if not covered(hh):
                    issues.append((f, 'url-rewrite', f'域名未入 mitm: {hh}'))

        for key, acts in (('body-rewrite', BODY_ACT), ('header-rewrite', HDR_ACT)):
            for r in h.get(key) or []:
                s = str(r).split(' ')
                if len(s) < 3:
                    issues.append((f, key, f'段数不足: {str(r)[:70]}'))
                    continue
                if s[1] not in acts:
                    issues.append((f, key, f'action 非法: {s[1]}'))
                for hh in host_candidates(s[0]):
                    if not covered(hh):
                        issues.append((f, key, f'域名未入 mitm: {hh}'))

        for m in h.get('mock') or []:
            if not isinstance(m, dict) or 'match' not in m or not ('text' in m or 'base64' in m):
                issues.append((f, 'mock', '必须含 match 与 text/base64'))

        providers = d.get('script-providers') or {}
        for s in h.get('script') or []:
            if not s.get('name') or not s.get('match') or s.get('type') not in ('request', 'response'):
                issues.append((f, 'script', '缺 name/match/type'))
            elif s['name'] not in providers:
                issues.append((f, 'script', f"provider 未定义: {s['name']}"))

        for r in d.get('rules') or []:
            if len(str(r).split(',')) < 3:
                issues.append((f, 'rules', f'字段不足: {str(r)[:50]}'))

    print(f'检查 {len(files)} 个覆写，问题 {len(issues)} 条')
    for f, k, msg in issues:
        print(f'  {os.path.basename(f)} [{k}] {msg}')
    return 1 if issues else 0


if __name__ == '__main__':
    sys.exit(main())
