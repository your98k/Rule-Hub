# Rule-Hub

自用及精选的 Loon 插件与 Stash 覆写合集。

🌐 **在线插件画廊**：<https://your98k.github.io/Rule-Hub/>（支持搜索、标签筛选、一键安装）

## 安装

**Loon**：配置 → 插件 → `+` → 从 URL 添加，粘贴 Raw 或 CDN 链接。
**Stash**：覆写 → `+` → 从 URL 下载，粘贴 Raw 或 CDN 链接，保存并启用。

> 部分覆写需要 MitM：Stash 设置 → MitM 生成并安装 CA 证书，再到 iOS「设置 → 通用 → 证书信任设置」中完全信任。更新覆写后请彻底退出对应 App 再重新打开。

## Loon 插件

| 插件 | 说明 | Raw | CDN |
| :--- | :--- | :---: | :---: |
| 红果短剧去广告 | 拦截开屏与信息流广告 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Loon/HongGuo.plugin) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Loon/HongGuo.plugin) |
| YouTube 去广告增强版 | 12 项参数 + 首页补强 + 字幕/歌词翻译，与 Stash 增强版同源 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Loon/YouTube-ADBlock-Enhanced.plugin) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Loon/YouTube-ADBlock-Enhanced.plugin) |

## Stash 覆写

| 覆写 | 版本要求 | 说明 | Raw | CDN |
| :--- | :--- | :--- | :---: | :---: |
| YouTube 去广告增强版 | TF 3.7+ | 12 项参数（10 开关 + 字幕/歌词翻译 + 首页补强），内嵌脚本 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/YouTube-ADBlock-Enhanced.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/YouTube-ADBlock-Enhanced.stoverride) |
| 哔哩哔哩去广告 | iOS 15+ | 基于 Sparkle，需 MitM over HTTP/2；过滤广告/弹窗，解锁后台播放与投屏，支持空降助手 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/Bilibili.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/Bilibili.stoverride) |
| 哔哩哔哩 ADBlock | iOS/tvOS 3.7+ | Biliverse v0.7.5 移植，32 项原生参数，无需 BoxJS。**与上一条二选一** | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/Bilibili.ADBlock.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/Bilibili.ADBlock.stoverride) |
| 红果短剧去广告 | 通用 | 域名拦截，不改动全局 IPv6/DNS | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/HongGuo.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/HongGuo.stoverride) |
| 腾讯视频净化 | iOS/tvOS 3.2.5+ | 开屏/暂停/底部推荐广告过滤；脚本每日自动同步上游 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/TxvideoAD.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/TxvideoAD.stoverride) |
| Telegram 链接跳转 | 需 MitM | t.me 等链接 307 跳转至所选 Telegram 客户端 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/Telegram.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/Telegram.stoverride) |
| 京东去广告 + 比价 | iOS/tvOS 3.7+；macOS 4.4+ | 京东广告过滤 + 慢慢买历史价格 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/JingDong.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/JingDong.stoverride) |
| 虎扑去广告 | iOS/tvOS 2.8+ | Stash 原生 jq，不依赖远程脚本。勿与其他虎扑规则叠加 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/HuPu.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/HuPu.stoverride) |
| 百度地图去广告 | iOS/tvOS 2.8+ | 移植 kelee.one 插件；需去 SSL Pinning 的签名 IPA，App Store 原版无效 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/BaiduMap_remove_ads.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/BaiduMap_remove_ads.stoverride) |

## 使用要点

- **YouTube（Stash/Loon）**：参数默认关翻译，介意字幕/歌词外发请保持关闭；「首页信息流补强」误删正常卡片时关闭；不要与其他 YouTube 去广告插件同时启用。
- **哔哩哔哩（两版二选一）**：空降助手默认开启（数据来自 bsbsb.top）；「百年大会员」仅客户端 UI 效果，非真实会员；开屏广告若回来了，多为 QUIC 绕过，覆写已内置 8 条 QUIC REJECT 规则。
- **腾讯视频**：首次使用需卸载重装 App，冷启动 2–3 次；脚本每 24h 自动拉取，无需手动更新。
- **京东**：保持「获取慢慢买 Cookie」参数开启，在慢慢买 App「我的」页刷新一次即可取到 Cookie。
- **Telegram**：「代理指向的策略」须填写当前配置中已存在的策略组或节点名。

## 鸣谢

[Sparkle](https://github.com/kokoryh/Sparkle)（kokoryh）· [Biliverse/ADBlock](https://github.com/Biliverse/ADBlock)（ClydeTime / VirgilClyne / app2smile / RuCu6 / Maasea）· Maasea / gholts / RuCu6 / DivineEngine / Choler · [Hey-sayiwanna](https://github.com/Hey-sayiwanna/YouTube-ADBlock-on-Feed) · Tartarus2014 · kelee.one · ZenmoFeiShi/Qx

本项目仅供学习研究与个人自用，请勿商用。
