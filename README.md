<p align="center"><img src="https://raw.githubusercontent.com/your98k/Icon-Hub/main/icons/Rule-Hub.png" alt="Rule-Hub Logo" width="240"></p>

# Rule-Hub

自用及精选的 **Stash 覆写**合集，专为 Stash 整理与适配。

🌐 **在线覆写画廊**：[your98k.github.io/Rule-Hub](https://your98k.github.io/Rule-Hub/)（支持搜索、标签筛选、一键安装）

> ⚠️ **带「自定义参数」的覆写需要 Stash 3.7 及以上版本。** 低于 3.7 导入会失败（报错类似 `the override is invalid`）。涉及：Porntube、Apple WLOC、哔哩哔哩、YouTube、京东、Reven、Telegram、Trakt、去上网。

## 安装

在 Stash 中打开「覆写」→「＋」→「从 URL 下载」，粘贴对应的 Raw 或 CDN 链接，保存并启用。

> 部分覆写需要 MitM：在 Stash 设置中生成并安装 CA 证书，再到 iOS「设置 → 通用 → 关于本机 → 证书信任设置」中完全信任。更新覆写后，请彻底退出对应 App 再重新打开。

## 收录覆写

| 覆写 | 版本要求 | 说明 | Raw | CDN |
| :--- | :--- | :--- | :---: | :---: |
| 菜鸟去广告 | iOS/tvOS 2.8+ | 移植 loon.103516.xyz 插件；首页瀑布流/搜索栏/寄件券/发现页直接 REJECT，四处响应 jq 删广告位；纯原生实现，无远程脚本 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/CaiNiao.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/CaiNiao.stoverride) |
| HTTPDNS 拦截器 | 通用 | 移植可莉 Block_HTTPDNS.lpx;161 条规则(域名 68 / IP-CIDR 59 / IP-CIDR6 8 / URL-REGEX 16 / USER-AGENT 4 / KEYWORD 2 / AND 4)+ 6 条 url-rewrite;去重 3 条、补 3 个漏掉的 mitm 域名,AND 例外补 UTF-8 UA 变体 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/Block_HTTPDNS.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/Block_HTTPDNS.stoverride) |
| Porntube VIP 解锁 | Stash 3.7+ | Yu9191 上游 2026-11-14 四脚本版移植；视频页内嵌播放器按钮（网页播放/lenna/SenPlayer/Infuse/VLC/自定义），5 项原生参数，跳转默认关闭 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/Porntube.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/Porntube.stoverride) |
| YouTube 去广告增强版 | Stash 3.7+ | 12 项参数（10 开关 + 字幕/歌词翻译 + 首页补强），内嵌脚本 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/YouTube-ADBlock-Enhanced.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/YouTube-ADBlock-Enhanced.stoverride) |
| 哔哩哔哩去广告 | Stash 3.7+ | Biliverse v0.7.5 移植，32 项原生参数，无需 BoxJS；内置 8 条 QUIC 拦截 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/Bilibili.ADBlock.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/Bilibili.ADBlock.stoverride) |
| BiliBili Global 原生参数版 | Stash 3.7+ | Biliverse Global v0.9.3；10 项原生参数：CDN 类型、四地区开关、四地区策略名称及日志。内嵌核心脚本，固定版本 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/BiliBili.Global.Native.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/BiliBili.Global.Native.stoverride) |
| Biliverse Enhanced 原生参数版 | Stash 3.7+ | Biliverse Enhanced v0.6.4；21 项原生参数（首页顶栏/标签页/底部导航、分区、我的页、iPad 页、日志）。**默认保留 App 内「自定义标签页」保存的顺序**，需接管时打开「首页标签页优先采用本覆写参数」；另可选配置优先来源 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/Biliverse.Enhanced.Native.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/Biliverse.Enhanced.Native.stoverride) |
| Biliverse Redirect 原生参数版 | Stash 3.7+ | Biliverse Redirect v0.2.25；5 项原生参数选港澳台 OverseaVideo / 国际版 BStar / 大陆 PCDN / MCDN 目标主机名。修正上游覆写残留的 Loon/Surge `header` 动作与 `{{{Host.X}}}` 模板，改为 Stash `transparent` 并保留原路径与签名 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/Biliverse.Redirect.Native.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/Biliverse.Redirect.Native.stoverride) |
| Pinterest 去广告 | 通用 | 移植可莉 Pinterest_remove_ads；2 条响应 jq 过滤瀑布流与「更多探索」推广位。修正上游 `select(.is_promoted == false)` 在字段缺失/null 时误删正常内容的问题，并对 `data` 非数组做原样放行 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/Pinterest.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/Pinterest.stoverride) |
| iRingo Location 定位 | Stash 3.7+ | NSRingo Location v4.3.2；2 项原生参数（定位地区、日志等级）。**上游该覆写写的是 `releases/latest`，而 GeoServices 已并入 MapKit、最新版删除了 `/pep/gcc` 处理**，照原样装等于空跑；本版把脚本固定到仍实现定位改写的 v4.3.2 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/iRingo.Location.Native.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/iRingo.Location.Native.stoverride) |
| 红果短剧去广告 | 通用 | 域名拦截，不改动全局 IPv6/DNS | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/HongGuo.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/HongGuo.stoverride) |
| 番茄小说去广告 | 通用 | 50 条域名拦截（广告 SDK / 埋点上报 / 素材下发 / 抖音引流），全部 `no-track`；**不做 MitM 与改写**——该 App 有证书校验，一开 MitM 就断网 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/DragonRead.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/DragonRead.stoverride) |
| Trakt 增强 | Stash 3.7+ | DemoJameson Loon 插件移植：页面与海报中文化、历史剧集按剧合并、详情页 Forward/Infuse/Rex 跳转；12 项原生参数，13 条脚本路由，脚本每日同步上游 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/Trakt.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/Trakt.stoverride) |
| 腾讯视频净化 | iOS/tvOS 3.2.5+ | 开屏/暂停/底部推荐广告过滤；脚本每日自动同步上游 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/TxvideoAD.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/TxvideoAD.stoverride) |
| Telegram 链接跳转 | Stash 3.7+ | t.me 等链接 307 跳转至所选 Telegram 客户端，3 项原生参数 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/Telegram.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/Telegram.stoverride) |
| 京东去广告 + 比价 | Stash 3.7+ | 京东广告过滤 + 慢慢买历史价格，5 项原生参数 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/JingDong.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/JingDong.stoverride) |
| 虎扑去广告 | iOS/tvOS 2.8+ | Stash 原生 jq，不依赖远程脚本；勿与其他虎扑规则叠加 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/HuPu.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/HuPu.stoverride) |
| Apple WLOC 定位修改 | Stash 3.7+ | Yu9191 上游脚本，5 项原生参数；在线选点优先，仅修改网络定位响应 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/WLOC.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/WLOC.stoverride) |
| 百度地图去广告 | iOS/tvOS 2.8+ | 移植 kelee.one 插件；需去 SSL Pinning 的签名 IPA，App Store 原版无效 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/BaiduMap_remove_ads.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/BaiduMap_remove_ads.stoverride) |
| usAge Pro 解锁 | Stash 3.7+ | 改写账号权益接口响应，把 `entitlements.pro.active` 置为有效（/api/v1/me、/api/v1/auth/apple、/api/v1/me/entitlements）；需 MitM，脚本每日同步 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/usAgePro.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/usAgePro.stoverride) |
| Reven 内购解锁 | Stash 3.7+ | 移植 reven.lpx；RevenueCat / Superwall / Adapty 三框架通杀，2 项原生参数（跳过指定 App、注入策略）；MitM 解密后由内嵌脚本透明转发到 Reven 服务替换订阅响应 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/Reven.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/Reven.stoverride) |
| FilmNoir解锁内购 | Stash 3.7+ | 只对 FilmNoir(app.filmnoir.appstore)生效;请求侧删除 RevenueCat 条件缓存头避免 304,响应侧在真实 customer info 上补写 plus/premier 权益与订阅记录,并清掉 x-signature;9 项原生参数,其他 App 原样放行 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/FilmNoir.Unlock.v2.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/FilmNoir.Unlock.v2.stoverride) |
| 水印猫会员信息解锁 | iOS/tvOS 3.2.5+ | 移植 89996462/Quantumult-X 的 sym.js；实测 App 接口域名为 watersymaoa.zijiemofang.cn（上游的 yunxiaoguo.cn 已弃用，两个域名均已覆盖）；需 MitM，脚本每日同步 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/ShuiYinMao.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/ShuiYinMao.stoverride) |
| 去上网 去广告 | Stash 3.7+ | 76 条域名拦截（实测 30+ 广告联盟，含二进制静态分析才可见的 iytcdn/adiu.amap/mon.toutiao）；开屏广告由自有接口 AES 下发，改为替换响应为空 data 让 App 直接跳过，不破解密钥；4 项原生参数 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/QuShangWang.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/QuShangWang.stoverride) |
| 可莉广告平台拦截器 | 通用 | 330 条规则拦截广告 SDK 域名/IP（穿山甲/优量汇/快手/百度/友盟/汇量/AppLovin 等近百平台）+ 4 条拼多多路径；纯声明式无脚本。**依赖型**：只拦广告平台本身，需配合其他去广告覆写并排在前面 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/KeliBlockAdvertisers.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/KeliBlockAdvertisers.stoverride) |
| 多邻国解锁会员 | Stash 3.7+ | 移植 TAKAGIVEGETA/MyScripts 的 lingoDuo 三脚本版;注入 `gold_subscription` 解锁 Max(无限体力/去广告/视频通话),另可开经验倍数、限时挑战时长、解锁全部关卡、直接通关;7 项原生参数,三个脚本内嵌 | [链接](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/Duolingo.stoverride) | [链接](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/Duolingo.stoverride) |

## 使用要点

- **Porntube**：播放器按钮注入在视频页，「自定义」填完 Scheme 必须点「保存」，由页面请求 `/porntube-scheme` 写回本地存储，留空不覆盖。跳转默认关闭，想解锁后自动唤起播放器才把「播放器跳转」改成 yes。需信任 MitM CA；站点走 QUIC 时脚本不触发。**不要与旧版 Porntube 覆写同时启用**——同名脚本会互相顶掉，异名脚本会各触发一次导致双重改写。
- **YouTube**：默认关闭字幕/歌词翻译；介意字幕或歌词内容外发时请保持关闭。「首页信息流补强」误删正常卡片时可关闭；不要与其他 YouTube 去广告覆写同时启用。
- **哔哩哔哩**：开屏广告若重新出现，多为 QUIC 绕过；覆写已内置 8 条 QUIC REJECT 规则。去广告未生效时，把「[调试] 日志等级」调到 INFO 查看脚本日志；不要与其他 B 站去广告覆写叠加。
- **BiliBili Global**：在覆写「参数」中设置。大陆默认 DIRECT，港澳台填写现有节点或策略组名；开关开启但策略名为空时，该地区跳过自动探测。停用原版 Global，避免重复处理。核心脚本固定 v0.9.3，不随上游自动更新；文件约 1.16 MB。已完成静态与模拟测试，未做真机播放联调。
- **Biliverse Enhanced**：需信任 MitM CA。首页标签页默认跟随 App 分区页「自定义标签页」保存的顺序；只有在参数里打开「首页标签页优先采用本覆写参数」后，才会用覆写里的标签参数覆盖。列表类参数（标签页、分区、我的页各项）用英文逗号分隔，可选值清单写在参数说明里——Stash 参数只有输入框/单选/开关三种控件，没法做勾选。界面没变化时先确认 App「我的 → Biliverse 哔哩万象」入口是否正常。
- **Biliverse Redirect**：只改视频 CDN 主机名，不改分流规则。需要设备支持重定向主机名（Stash 走 `transparent`，无需额外开关）。港澳台、国际版、大陆 PCDN/MCDN 分开选，选到的域名必须是官方列表里的真实 CDN 主机名。与「链接重定向合集」（`Redirect.stoverride`）是两份不同东西，不冲突。
- **Pinterest**：纯 `body-rewrite`，需信任 MitM CA，无参数。只剔除 `is_promoted` 显式为 `true`/`"true"` 的条目；字段缺失或为 `null` 时保留，避免 Pinterest 改字段后整条瀑布流被清空。若广告又出现，先在 Stash 连接记录里确认接口路径是否已从 `/v3/feeds/home/` 变更。
- **iRingo Location**：把「基于网络的地区检测」结果固定为所选国家/地区代码，`AUTO` 表示保留 Apple 原始返回。需信任 MitM CA。覆写自带一条 `DOMAIN,gspe1-ssl.ls.apple.com,DIRECT` 规则。**脚本只在响应 `Content-Type` 属于 XML/plist 族时改写 `/pep/gcc`**（`text/plain` 不触发），这是上游实现的分支条件；定位没变化时先在连接记录里确认该请求的响应类型与域名。脚本已固定在 v4.3.2，不会跟随上游（上游已移除定位功能）。
- **腾讯视频**：首次使用需卸载重装 App，并冷启动 2–3 次；脚本每 24 小时自动拉取，无需手动更新。
- **京东**：保持「获取慢慢买 Cookie」参数开启，在慢慢买 App「我的」页刷新一次即可获取 Cookie。
- **usAge Pro**：需信任 MitM CA；启用后彻底结束 App 再重新打开。脚本由云端拉取、每 24 小时自动更新，无需手动改本地文件；与其他同名脚本（`usage-pro`）不要重复启用。
- **Reven**：需信任 MitM CA；Adapty 需卸载重装 App 才生效。解锁后报错或闪退的 App（如 Filebar），把它的 UA 关键词填进「跳过指定 App」，多个用英文逗号分隔，填 `-` 表示全解锁；lifetime 没解成功时把「注入策略」换成 `lifetime_sub` 再试。不要与 Loon 版插件同时启用。
- **Telegram**：「代理指向的策略」须填写当前配置中已存在的策略组或节点名。
- **菜鸟**：纯 Stash 原生实现（1 条 AND 规则 + 4 条 url-rewrite reject + 4 条 jq 响应改写），无远程脚本，只需信任 MitM CA。首页若仍有广告位残留，多为 App 走 QUIC 或没有彻底退出 App 重进。
- **番茄小说**：纯域名拦截，无需 MitM，不改 DNS/IPv6。**该 App 有 SSL Pinning**：一旦覆写里出现 `mitm`（哪怕只列域名、没有任何改写动作），App 就会报「网络出错，请点击重试」。所以路径级秒拒与响应体清理都上不了，只保留域名层。开屏、章末这类走自己接口的广告去不掉；广告 SDK、埋点、素材、引流入口已全部拦死。
- **去上网**：开屏广告由 App 自有接口 `qudaapi.8quan.com` 下发，响应为 AES-CBC 密文（密钥运行时绑定，静态拿不到）。覆写不对抗加密，而是把 400–600 字节的那个响应替换成空 `data` 的合法 JSON，App 解密时无内容可显示，直接跳过开屏。**范围别调宽**：`<600` 会连 190 字节的初始化响应一起替换，可能导致 App 起不来。脚本会把最后一次命中的长度写进 `qd_skip_log`；若 App 更新后开屏复活，先读这个值再按实际长度调整。
- **Trakt**：需信任 MitM CA 并开启 MitM，否则脚本不触发。12 项参数与上游 Loon 插件一一对应；「篡改应用授权」默认关闭，仅在第三方 App 报连接数超限时开启。「翻译引擎」选 DeepLX 可免翻墙但较慢。不要与 Loon 版 Trakt 插件同时启用——同名请求会被两边各改写一次。
- **可莉广告平台拦截器**：依赖型插件，只拦广告平台自身的域名与 IP，不针对具体 App，所以装上后单靠它不会让某个 App 变干净。关键是在覆写列表里**排到其他去广告覆写前面**，否则广告平台的连接会先被后面的覆写按域名放行。330 条规则里含 12 条 `DOMAIN-KEYWORD`，其中 `adstrategy` 较宽、另有几条写的其实是完整域名（如 `trace.qq.com`），均为上游原样保留。只有 4 条拼多多路径拦截需要 MitM，其余纯域名/IP 规则不需要。
- **水印猫**：只改写会员字段（isPurchasedSubscribe、waterVipInfo、maskMobile、nickName），需信任 MitM CA；脚本每 24 小时从仓库内的 `Stash/ShuiYinMao.stash.js` 同步，内嵌 payload 仅作离线兜底。**域名会变**：上游脚本写的是 yunxiaoguo.cn，实测 App 已改用 zijiemofang.cn，覆写已同时覆盖两者；若日后又失效，先在 Stash 的连接记录里看 App 实际连哪个域名，再据此调整 mitm 与 match，不要只信脚本注释。
- **多邻国**:需信任 MitM CA;改完参数点「保存并应用」,首次生效要彻底退出 App 再打开。会员是写在用户资料响应里的 `gold_subscription` 记录,到期时间每次请求往后推一年,不会因为旧记录过期掉会员。**「直接通关」会跳过 `SIDE_QUEST_RAMP_UP_PRACTICE` 与 `MATCH_PRACTICE`**——这两类练习清空挑战池会让 App 卡在加载。经验加倍只维持一小时,过期重进练习即刷新。不要与 Loon 版插件同时启用。

## 鸣谢

[Yu9191/Rewrite](https://github.com/Yu9191/Rewrite)（Porntube 上游）· [Sparkle](https://github.com/kokoryh/Sparkle)（kokoryh）· [Biliverse/ADBlock](https://github.com/Biliverse/ADBlock)（ClydeTime / VirgilClyne / app2smile / RuCu6 / Maasea）· Maasea / gholts / RuCu6 / DivineEngine / Choler · [Hey-sayiwanna](https://github.com/Hey-sayiwanna/YouTube-ADBlock-on-Feed) · Tartarus2014 · kelee.one · ZenmoFeiShi/Qx · [jsforbaby](https://reven.jsforbaby.workers.dev/reven/reven.lpx)（Reven）· TomCatXue（番茄小说）· DemoJameson（Trakt）

本项目仅供学习研究与个人自用，请勿商用。
