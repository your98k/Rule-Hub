# Rule-Hub

自用及精选的 **Stash 覆写**合集，专为 Stash 整理与适配。

🌐 **在线覆写画廊**：[your98k.github.io/Rule-Hub](https://your98k.github.io/Rule-Hub/)（支持搜索、标签筛选、一键安装）

## 安装

在 Stash 中打开「覆写」→「＋」→「从 URL 下载」，粘贴对应的 Raw 或 CDN 链接，保存并启用。

> 部分覆写需要 MitM：在 Stash 设置中生成并安装 CA 证书，再到 iOS「设置 → 通用 → 关于本机 → 证书信任设置」中完全信任。更新覆写后，请彻底退出对应 App 再重新打开。

## 收录覆写

| 覆写 | 版本要求 | 说明 | Raw | CDN |
| :--- | :--- | :--- | :---: | :---: |
| YouTube 去广告增强版 | TF 3.7+ | 12 项参数（10 开关 + 字幕/歌词翻译 + 首页补强），内嵌脚本 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/YouTube-ADBlock-Enhanced.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/YouTube-ADBlock-Enhanced.stoverride) |
| 哔哩哔哩去广告 | iOS/tvOS 3.7+ | Biliverse v0.7.5 移植，32 项原生参数，无需 BoxJS；内置 8 条 QUIC 拦截 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/Bilibili.ADBlock.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/Bilibili.ADBlock.stoverride) |
| 红果短剧去广告 | 通用 | 域名拦截，不改动全局 IPv6/DNS | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/HongGuo.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/HongGuo.stoverride) |
| 腾讯视频净化 | iOS/tvOS 3.2.5+ | 开屏/暂停/底部推荐广告过滤；脚本每日自动同步上游 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/TxvideoAD.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/TxvideoAD.stoverride) |
| Telegram 链接跳转 | 需 MitM | t.me 等链接 307 跳转至所选 Telegram 客户端 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/Telegram.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/Telegram.stoverride) |
| 京东去广告 + 比价 | iOS/tvOS 3.7+；macOS 4.4+ | 京东广告过滤 + 慢慢买历史价格 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/JingDong.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/JingDong.stoverride) |
| 虎扑去广告 | iOS/tvOS 2.8+ | Stash 原生 jq，不依赖远程脚本；勿与其他虎扑规则叠加 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/HuPu.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/HuPu.stoverride) |
| Apple WLOC 定位修改 | iOS/tvOS 3.7+；macOS 4.4+ | Yu9191 上游脚本，5 项原生参数；在线选点优先，仅修改网络定位响应 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/WLOC.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/WLOC.stoverride) |
| 百度地图去广告 | iOS/tvOS 2.8+ | 移植 kelee.one 插件；需去 SSL Pinning 的签名 IPA，App Store 原版无效 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/BaiduMap_remove_ads.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/BaiduMap_remove_ads.stoverride) |

## 使用要点

- **YouTube**：默认关闭字幕/歌词翻译；介意字幕或歌词内容外发时请保持关闭。「首页信息流补强」误删正常卡片时可关闭；不要与其他 YouTube 去广告覆写同时启用。
- **哔哩哔哩**：开屏广告若重新出现，多为 QUIC 绕过；覆写已内置 8 条 QUIC REJECT 规则。去广告未生效时，把「[调试] 日志等级」调到 INFO 查看脚本日志；不要与其他 B 站去广告覆写叠加。
- **腾讯视频**：首次使用需卸载重装 App，并冷启动 2–3 次；脚本每 24 小时自动拉取，无需手动更新。
- **京东**：保持「获取慢慢买 Cookie」参数开启，在慢慢买 App「我的」页刷新一次即可获取 Cookie。
- **Telegram**：「代理指向的策略」须填写当前配置中已存在的策略组或节点名。

## 鸣谢

[Sparkle](https://github.com/kokoryh/Sparkle)（kokoryh）· [Biliverse/ADBlock](https://github.com/Biliverse/ADBlock)（ClydeTime / VirgilClyne / app2smile / RuCu6 / Maasea）· Maasea / gholts / RuCu6 / DivineEngine / Choler · [Hey-sayiwanna](https://github.com/Hey-sayiwanna/YouTube-ADBlock-on-Feed) · Tartarus2014 · kelee.one · ZenmoFeiShi/Qx

本项目仅供学习研究与个人自用，请勿商用。
