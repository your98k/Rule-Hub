#!/usr/bin/env python3
"""检查覆写里 script-providers 的 URL 是否真的能拉到脚本。

需要 curl。跟随重定向；落到 Telegram 等非脚本站点视为失败
（部分站按 UA 白名单放行，未带 Loon UA 会被 302 到 t.me）。
"""
import sys, os, glob, subprocess
import yaml

UA_LOON = 'Loon/3.2.6 (iPhone; iOS 17.0)'


def fetch(url, with_ua=False):
    cmd = ['curl', '-sL', '-m', '25', '-o', '/tmp/.prov_check', '-w',
           '%{http_code} %{size_download} %{url_effective}']
    if with_ua:
        cmd += ['-A', UA_LOON]
    cmd.append(url)
    out = subprocess.run(cmd, capture_output=True, text=True).stdout.strip()
    parts = out.split(' ')
    code = parts[0] if parts else 'ERR'
    eff = parts[-1] if len(parts) >= 3 else url
    return code, eff


def main():
    root = sys.argv[1] if len(sys.argv) > 1 else 'Stash'
    bad = 0
    total = 0
    for p in sorted(glob.glob(os.path.join(root, '*.stoverride'))):
        d = yaml.safe_load(open(p, encoding='utf-8'))
        for name, prov in (d.get('script-providers') or {}).items():
            url = prov.get('url')
            if not url:
                continue
            total += 1
            ua = bool((prov.get('headers') or {}).get('User-Agent'))
            code, eff = fetch(url, ua)
            if code != '200':
                code, eff = fetch(url, True)
            ok = code == '200' and 't.me' not in eff and 'telegram' not in eff
            if not ok:
                bad += 1
                print(f'FAIL {code} {os.path.basename(p)} [{name}]')
                print(f'     -> {eff[:100]}')
    print(f'provider 共 {total} 条，异常 {bad}')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
