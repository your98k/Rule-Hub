#!/usr/bin/env bash
# 一键跑完 Stash 覆写的三项校验。用法：bash scripts/check-all.sh [目录，默认 Stash]
set -u
DIR="${1:-Stash}"
fail=0
skip=0

echo "== 1/3 结构与格式 =="
python3 scripts/check-overrides.py "$DIR" || fail=1

echo
echo "== 2/3 脚本依赖可达性 =="
if command -v curl >/dev/null 2>&1; then
  python3 scripts/check-providers.py "$DIR" || fail=1
else
  echo "跳过：未找到 curl"; skip=$((skip+1))
fi

echo
echo "== 3/3 response-jq 语法 =="
if command -v jq >/dev/null 2>&1 && jq --version >/dev/null 2>&1; then
  python3 - "$DIR" <<'PY'
import yaml, glob, re, subprocess, sys
root = sys.argv[1] if len(sys.argv) > 1 else 'Stash'
n = bad = 0
for p in glob.glob(root + '/*.stoverride'):
    d = yaml.safe_load(open(p, encoding='utf-8'))
    for r in (d.get('http') or {}).get('body-rewrite') or []:
        s = r.split(' ', 2)
        if len(s) == 3 and s[1] == 'response-jq':
            n += 1
            e = re.sub(r'\$\{args\.[A-Za-z0-9_]+\}', 'true', s[2])
            pr = subprocess.run(['jq', '-n', e], capture_output=True, text=True)
            if pr.returncode and re.search(r'syntax error|unexpected', pr.stderr, re.I):
                bad += 1
                print('  FAIL', p)
print(f'  jq {n} 条，语法错 {bad}')
sys.exit(1 if bad else 0)
PY
  [ $? -ne 0 ] && fail=1
else
  echo "跳过：未找到可用的 jq（本机 /bin/jq 可能是空壳，用 jq --version 自检）"; skip=$((skip+1))
fi

echo
if [ "$fail" -ne 0 ]; then
  echo "存在失败项 ❌"
elif [ "$skip" -ne 0 ]; then
  echo "已跑的项目没有发现问题，但有 $skip 项被跳过——不能算全量验证 ⚠️"
else
  echo "三项全部通过 ✅"
fi
exit "$fail"
