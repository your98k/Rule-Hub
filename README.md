# Rule-Hub

自用及精选的 **Stash 覆写**合集，专为 Stash 整理与适配。

🌐 **在线覆写画廊**：[your98k.github.io/Rule-Hub](https://your98k.github.io/Rule-Hub/)（支持搜索、标签筛选、一键安装）

## 安装

在 Stash 中打开「覆写」→「＋」→「从 URL 下载」，粘贴对应的 Raw 或 CDN 链接，保存并启用。

> 部分覆写需要 MitM：在 Stash 设置中生成并安装 CA 证书，再到 iOS「设置 → 通用 → 关于本机 → 证书信任设置」中完全信任。更新覆写后，请彻底退出对应 App 再重新打开。

## 收录覆写

| 覆写 | 版本要求 | 说明 | Raw | CDN |
| :--- | :--- | :--- | :---: | :---: |
| 菜鸟去广告 | iOS/tvOS 2.8+ | 移植 loon.103516.xyz 插件；首页瀑布流/搜索栏/寄件券/发现页直接 REJECT，四处响应 jq 删广告位；纯原生实现，无远程脚本 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/CaiNiao.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/CaiNiao.stoverride) |
| Porntube VIP 解锁 | iOS/tvOS 3.7+ | Yu9191 上游 2026-11-14 四脚本版移植；视频页内嵌播放器按钮（网页播放/lenna/SenPlayer/Infuse/VLC/自定义），5 项原生参数，跳转默认关闭 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/Porntube.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/Porntube.stoverride) |
| YouTube 去广告增强版 | TF 3.7+ | 12 项参数（10 开关 + 字幕/歌词翻译 + 首页补强），内嵌脚本 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/YouTube-ADBlock-Enhanced.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/YouTube-ADBlock-Enhanced.stoverride) |
| 哔哩哔哩去广告 | iOS/tvOS 3.7+ | Biliverse v0.7.5 移植，32 项原生参数，无需 BoxJS；内置 8 条 QUIC 拦截 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/Bilibili.ADBlock.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/Bilibili.ADBlock.stoverride) |
| 红果短剧去广告 | 通用 | 域名拦截，不改动全局 IPv6/DNS | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/HongGuo.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/HongGuo.stoverride) |
| 番茄小说去广告 | 通用 | 移植 kelee.one 插件 DragonRead_remove_ads；34 条域名拦截（广告 SDK / 埋点上报 / 抖音引流 / 素材下发），全部加 no-track，纯原生无脚本无 MitM | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/DragonRead.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/DragonRead.stoverride) |
| 腾讯视频净化 | iOS/tvOS 3.2.5+ | 开屏/暂停/底部推荐广告过滤；脚本每日自动同步上游 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/TxvideoAD.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/TxvideoAD.stoverride) |
| Telegram 链接跳转 | 需 MitM | t.me 等链接 307 跳转至所选 Telegram 客户端 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/Telegram.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/Telegram.stoverride) |
| 京东去广告 + 比价 | iOS/tvOS 3.7+；macOS 4.4+ | 京东广告过滤 + 慢慢买历史价格 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/JingDong.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/JingDong.stoverride) |
| 虎扑去广告 | iOS/tvOS 2.8+ | Stash 原生 jq，不依赖远程脚本；勿与其他虎扑规则叠加 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/HuPu.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/HuPu.stoverride) |
| Apple WLOC 定位修改 | iOS/tvOS 3.7+；macOS 4.4+ | Yu9191 上游脚本，5 项原生参数；在线选点优先，仅修改网络定位响应 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/WLOC.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/WLOC.stoverride) |
| 百度地图去广告 | iOS/tvOS 2.8+ | 移植 kelee.one 插件；需去 SSL Pinning 的签名 IPA，App Store 原版无效 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/BaiduMap_remove_ads.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/BaiduMap_remove_ads.stoverride) |
| usAge Pro 解锁 | iOS/tvOS 3.7+ | 改写账号权益接口响应，把 `entitlements.pro.active` 置为有效（/api/v1/me、/api/v1/auth/apple、/api/v1/me/entitlements）；需 MitM，脚本每日同步 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/usAgePro.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/usAgePro.stoverride) |
| Reven 内购解锁 | iOS/tvOS 3.7+ | 移植 reven.lpx；RevenueCat / Superwall / Adapty 三框架通杀，2 项原生参数（跳过指定 App、注入策略）；MitM 解密后由内嵌脚本透明转发到 Reven 服务替换订阅响应 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/Reven.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/Reven.stoverride) |
| 水印猫会员信息解锁 | iOS/tvOS 3.2.5+ | 移植 89996462/Quantumult-X 的 sym.js；实测 App 接口域名为 watersymaoa.zijiemofang.cn（上游的 yunxiaoguo.cn 已弃用，两个域名均已覆盖）；需 MitM，脚本每日同步 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/ShuiYinMao.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/ShuiYinMao.stoverride) |

## 使用要点

- **Porntube**：播放器按钮注入在视频页，「自定义」填完 Scheme 必须点「保存」，由页面请求 `/porntube-scheme` 写回本地存储，留空不覆盖。跳转默认关闭，想解锁后自动唤起播放器才把「播放器跳转」改成 yes。需信任 MitM CA；站点走 QUIC 时脚本不触发。**不要与旧版 Porntube 覆写同时启用**——同名脚本会互相顶掉，异名脚本会各触发一次导致双重改写。
- **YouTube**：默认关闭字幕/歌词翻译；介意字幕或歌词内容外发时请保持关闭。「首页信息流补强」误删正常卡片时可关闭；不要与其他 YouTube 去广告覆写同时启用。
- **哔哩哔哩**：开屏广告若重新出现，多为 QUIC 绕过；覆写已内置 8 条 QUIC REJECT 规则。去广告未生效时，把「[调试] 日志等级」调到 INFO 查看脚本日志；不要与其他 B 站去广告覆写叠加。
- **腾讯视频**：首次使用需卸载重装 App，并冷启动 2–3 次；脚本每 24 小时自动拉取，无需手动更新。
- **京东**：保持「获取慢慢买 Cookie」参数开启，在慢慢买 App「我的」页刷新一次即可获取 Cookie。
- **usAge Pro**：需信任 MitM CA；启用后彻底结束 App 再重新打开。脚本由云端拉取、每 24 小时自动更新，无需手动改本地文件；与其他同名脚本（`usage-pro`）不要重复启用。
- **Reven**：需信任 MitM CA；Adapty 需卸载重装 App 才生效。解锁后报错或闪退的 App（如 Filebar），把它的 UA 关键词填进「跳过指定 App」，多个用英文逗号分隔，填 `-` 表示全解锁；lifetime 没解成功时把「注入策略」换成 `lifetime_sub` 再试。不要与 Loon 版插件同时启用。
- **Telegram**：「代理指向的策略」须填写当前配置中已存在的策略组或节点名。
- **菜鸟**：纯 Stash 原生实现（1 条 AND 规则 + 4 条 url-rewrite reject + 4 条 jq 响应改写），无远程脚本，只需信任 MitM CA。首页若仍有广告位残留，多为 App 走 QUIC 或没有彻底退出 App 重进。
- **番茄小说**：纯域名拦截，无需 MitM、无脚本、不改 DNS/IPv6。34 条规则覆盖广告 SDK、埋点上报、抖音引流、素材下发四类，全部带 `no-track`，连接页不会被拒连记录刷屏。这是域名级方案，同域返送的推广字段拦不到；若要处理，需要按设备实际流量做 mitm + jq 响应改写。
- **水印猫**：只改写会员字段（isPurchasedSubscribe、waterVipInfo、maskMobile、nickName），需信任 MitM CA；脚本每 24 小时从仓库内的 `Stash/ShuiYinMao.stash.js` 同步，内嵌 payload 仅作离线兜底。**域名会变**：上游脚本写的是 yunxiaoguo.cn，实测 App 已改用 zijiemofang.cn，覆写已同时覆盖两者；若日后又失效，先在 Stash 的连接记录里看 App 实际连哪个域名，再据此调整 mitm 与 match，不要只信脚本注释。

## 鸣谢

[Yu9191/Rewrite](https://github.com/Yu9191/Rewrite)（Porntube 上游）· [Sparkle](https://github.com/kokoryh/Sparkle)（kokoryh）· [Biliverse/ADBlock](https://github.com/Biliverse/ADBlock)（ClydeTime / VirgilClyne / app2smile / RuCu6 / Maasea）· Maasea / gholts / RuCu6 / DivineEngine / Choler · [Hey-sayiwanna](https://github.com/Hey-sayiwanna/YouTube-ADBlock-on-Feed) · Tartarus2014 · kelee.one · ZenmoFeiShi/Qx · [jsforbaby](https://reven.jsforbaby.workers.dev/reven/reven.lpx)（Reven）

本项目仅供学习研究与个人自用，请勿商用。
