#!/usr/bin/env python3
"""把 Stash 覆写的 desc 统一精简为单行。

规则：一句话说明做什么 + 来源 + 规则条数，不再写实现细节、调试方法、安装步骤。
用法：python3 scripts/shorten-desc.py [目录，默认 Stash]
"""
import sys, os, glob, re
import yaml

SHORT = {
    'Amap': '高德地图去广告，需信任 MitM 证书。',
    'BaiduMap_remove_ads': '百度地图去广告与我的页精简，需信任 MitM 证书。',
    'Bilibili.ADBlock': '哔哩哔哩去广告，32 项原生参数，内置 8 条 QUIC 拦截。',
    'CaiNiao': '菜鸟 App 去广告（首页瀑布流、搜索栏、寄件券、发现页）。',
    'HongGuo': '红果短剧广告拦截，含穿山甲与字节系兜底规则。',
    'HuPu': '虎扑去广告，用 Stash 原生 mock 实现。',
    'JingDong': '京东去广告与历史比价。',
    'Porntube': 'Porntube VIP 解锁与去广告，四脚本版。',
    'Reven': '解锁 RevenueCat / Superwall / Adapty 三个订阅框架的内购。',
    'ShuiYinMao': '水印猫会员字段解锁（脚本改写响应）。',
    'Telegram': '把 t.me 等网页链接交给指定的 Telegram 客户端。',
    'TxvideoAD': '腾讯视频净化（开屏、暂停、底栏广告）。',
    'WLOC': '修改 Apple 网络定位，经纬度等可在参数中设置。',
    'YouTube-ADBlock-Enhanced': 'YouTube 去广告与增强，12 项原生参数。',
    'usAgePro': '解锁 usAge Pro 的账号权益字段。',
    'SF-Express': '顺丰速运去广告；module-config 用空模块响应替代（原 mock 文本非法）。',
    'MeetYou': '美柚去广告；去掉上游与 rewrite 冲突的 circle 整域规则。',
    'PandaTV': 'PandaTV 补 Origin 头绕过区域校验；路由规则需填入实际策略组后启用。',
}


def count_rules(d):
    h = d.get('http') or {}
    return sum(len(h.get(k) or []) for k in
               ('url-rewrite', 'body-rewrite', 'header-rewrite', 'mock', 'script')) \
        + len(d.get('rules') or [])


def main():
    root = sys.argv[1] if len(sys.argv) > 1 else 'Stash'
    changed = 0
    for p in sorted(glob.glob(os.path.join(root, '*.stoverride'))):
        name = os.path.basename(p)[:-len('.stoverride')]
        text = open(p, encoding='utf-8').read()
        d = yaml.safe_load(text)

        if name in SHORT:
            new = SHORT[name]
        else:
            m = re.search(r'loonlab 插件仓库 (\S+?)\.lpx', d.get('desc') or '')
            src = m.group(1) if m else name
            new = f'移植 loonlab 的 {src}.lpx，Stash 原生声明式，{count_rules(d)} 条规则。'

        lines = text.split('\n')
        try:
            start = next(i for i, l in enumerate(lines) if l.startswith('desc:'))
        except StopIteration:
            continue
        end = start + 1
        while end < len(lines) and (lines[end].startswith((' ', '\t')) or lines[end].strip() == ''):
            if lines[end].strip() == '' and (end + 1 >= len(lines) or not lines[end + 1].startswith((' ', '\t'))):
                break
            end += 1
        if lines[start] == f"desc: '{new}'":
            continue
        lines[start:end] = [f"desc: '{new}'"]
        open(p, 'w', encoding='utf-8').write('\n'.join(lines))
        changed += 1
    print(f'已精简 {changed} 个覆写的描述')


if __name__ == '__main__':
    main()
