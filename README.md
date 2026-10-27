# Rule-Hub

自用及精选的代理规则合集，包含 **Loon 插件** 与 **Stash 覆写**。

---

## 📑 规则与插件列表

### 1. Loon 插件

| 插件名称 | 说明 | 订阅链接 (GitHub Raw) | 国内加速 (jsDelivr CDN) |
| :--- | :--- | :--- | :--- |
| **红果短剧去广告** | 拦截开屏与信息流广告（已裁剪影响抖音的宽泛规则） | [查看/复制](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Loon/HongGuo.plugin) | [查看/复制](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Loon/HongGuo.plugin) |

### 2. Stash 覆写

| 覆写名称 | 版本要求 | 说明 | 订阅链接 (GitHub Raw) | 国内加速 (jsDelivr CDN) |
| :--- | :---: | :--- | :--- | :--- |
| **YouTube 去广告** | **TF 3.7+** | 去除 YouTube 视频与信息流广告，支持可调参数（底栏 Shorts/上传按钮、字幕/歌词翻译等） | [查看/复制](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/YouTube.stoverride) | [查看/复制](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/YouTube.stoverride) |
| **哔哩哔哩去广告** | **iOS 15+** | 过滤广告/青少年模式弹窗/互动弹幕，解锁后台播放与投屏，支持空降助手跳过片中广告（可调参数） | [查看/复制](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/Bilibili.stoverride) | [查看/复制](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/Bilibili.stoverride) |
| **哔哩哔哩 ADBlock（Biliverse 移植）** | **iOS/tvOS 3.7+** | 移植 Biliverse ADBlock v0.7.5，全部功能改为 Stash 原生参数表单（32 项），无需 BoxJS；已加响应体上限控制内存 | [查看/复制](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/Bilibili.ADBlock.stoverride) | [查看/复制](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/Bilibili.ADBlock.stoverride) |
| **红果短剧去广告** | 通用 | 裁剪域名拦截，不改动全局 IPv6/DNS | [查看/复制](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/HongGuo.stoverride) | [查看/复制](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/HongGuo.stoverride) |
| **腾讯视频净化** | **iOS/tvOS 3.2.5+** | 开屏/播放前/暂停/播放页底部推荐广告过滤与页面净化；脚本每日自动同步上游；需 MITM，已加 QUIC 拦截防 UDP 443 绕过。首次使用前卸载并重新安装腾讯视频，之后冷启动 2–3 次 | [查看/复制](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/TxvideoAD.stoverride) | [查看/复制](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/TxvideoAD.stoverride) |
| **Telegram 链接跳转** | 需 Stash MitM | 将 t.me、telegram.me、telegram.dog 链接 307 跳转至所选 Telegram 客户端，支持 Telegram、Swiftgram、Nagram、Turrit、iMe、Nicegram、Lingogram | [查看/复制](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/Telegram.stoverride) | [查看/复制](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/Telegram.stoverride) |
| **京东去广告 + 慢慢买历史比价** | **iOS/tvOS 3.7+；macOS 4.4+** | 京东广告过滤与慢慢买历史价格；内置 Stash Cookie 采集修复，需启用并信任 MitM CA | [查看/复制](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/JingDong.stoverride) | [查看/复制](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/JingDong.stoverride) |
| **虎扑去广告（Stash 原生 jq）** | **iOS/tvOS 2.8+** | 保留原拦截规则，将 4 处 JS 响应改为原生 jq；需启用并信任 MitM CA。请勿与旧虎扑覆写叠加 | [Raw 订阅](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/HuPu.stoverride) | [CDN 订阅](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/HuPu.stoverride) |

---

## 📖 腾讯视频净化使用说明

> ⚠️ 需要 Stash iOS/tvOS 3.2.5 或更新版本，并启用 MitM、安装 Stash 生成的 CA 证书且在系统中完全信任。请勿使用他人提供的 CA 证书。

### 安装与首次生效
1. 在 Stash「覆写 (Overrides)」页面点击 `+` →「从 URL 下载」，导入上方腾讯视频覆写并启用。
2. 按此规则要求，先卸载腾讯视频，再从 App Store 重新安装。
3. 安装后冷启动腾讯视频 2–3 次（彻底退出 App 后再打开），等待规则生效。
4. 保持 Stash 运行并确认腾讯视频流量经过 Stash；若未生效，检查 MitM CA 是否已完全信任，以及旧规则是否与本覆写冲突。

本版对 `iacc.stgw.qq.com`、`tacc.video.qq.com`、`i.video.qq.com`、`iacc.qq.com`、`config.ab.qq.com`、`rdelivery.qq.com` 增加了 QUIC（UDP 443）拦截，防止开屏广告绕过 MitM。若开屏广告仍出现，通常是广告走了未覆盖的域名或使用了本地缓存；请再次彻底退出腾讯视频（必要时重装）后测试。

v1.0.2 起同步上游 2026-10-27 脚本更新：新增播放暂停广告（JCE `129196`）与播放页底部瀑布流合并推荐广告过滤。更新覆写后强制退出腾讯视频再打开即可生效，无需重新安装。

### 🔄 自动更新（v1.1.0+）

- 脚本单独托管在 `Stash/txvideo-ad.stash.js`，覆写通过 `script-providers` 的 `url` + `interval: 86400` 每 24 小时自动拉取；内嵌 `payload` 仅作离线兜底。
- 仓库内的 `.github/workflows/sync-txvideo.yml` 每天检查上游 `ZenmoFeiShi/Qx`，自动把 `bodyBytes` 适配为 Stash 的 `body`，运行开屏/暂停/瀑布流等回归测试，测试通过后才提交。
- 若上游规则文件 `TxvideoAD.snippet` 变化，工作流会停止并等待人工确认，不会自动修改域名/MitM/规则。
- 首次使用需在仓库 Actions 页面启用该 workflow；GitHub 可能暂停长期无提交的定时任务，脚本内置每月心跳提交以保持运行。
- 若仓库保护规则禁止 Actions 直接 push，需要允许 `github-actions[bot]` 写入，或手动触发后自行合并。

本覆写内嵌的 `payload` 是最近一次同步的离线快照；在线时由远程脚本覆盖，实际效果取决于腾讯视频当前版本。

---

## 📖 虎扑去广告（Stash 原生 jq）使用说明

> ⚠️ 需要 Stash iOS/tvOS 2.8 或更新版本，且需启用 MitM、安装并在系统中完全信任 Stash CA 证书。本覆写使用 Stash 原生 `body-rewrite`/`response-jq`，不依赖远程 JavaScript 脚本。

### 📌 导入与配置
1. 在 Stash「覆写 (Overrides)」页面点 `+` →「从 URL 下载」。
2. 粘贴上方 **Raw 订阅**或 **CDN 订阅**链接，保存并启用。
3. 在 Stash「设置」→「MitM」启用 MitM 并生成、安装 CA；再到 iOS「设置」→「通用」→「关于本机」→「证书信任设置」中完全信任该证书。
4. **禁用旧的虎扑插件/覆写及其他重复的虎扑去广告规则**，避免同一请求被多次处理。
5. 应用配置后，彻底退出虎扑再重新打开。

### 🔧 处理范围与说明
- 保留原规则的 8 条定向接口拦截，4 个响应接口改为 Stash 原生 jq：移除横幅、热榜顶部横幅、个人页推广字段，以及指定的「我的」页推广入口。
- 响应处理增加了字段类型保护。无需额外的脚本订阅或脚本引擎。
- 如果导入后虎扑无法正常加载或部分页面异常，先禁用本覆写确认，再检查 Stash MitM 证书信任及旧规则是否仍启用。
- 该版本减少了对 JS 响应脚本的依赖，但没有在 README 中承诺启动速度改善；实际效果取决于设备、Stash 版本和虎扑当前接口，请以实测为准。

---

## 📖 京东去广告与慢慢买历史比价

- 需要 Stash iOS/tvOS 3.7+ 或 macOS 4.4+；启用 MitM，并在系统中完全信任 Stash CA 证书。
- 导入后在覆写参数中保持「[京东比价]获取慢慢买Cookie」开启。
- 保持 Stash 连接，打开慢慢买 App →「我的」并刷新；看到「获取ck成功」后返回京东查看历史价格。
- 标题嵌入版、详情通知版、详情表格图和折线图可在参数中选择；通知版与嵌入版、表格图与折线图不要同时开启。
- Cookie 采集脚本使用 Stash 内嵌实现，并兼容比价脚本所需的两种持久化键。若没有触发，请确认实际请求仍经过 Stash MitM；采集成功不保证慢慢买服务端比价接口始终可用。

## 📖 Telegram 链接跳转使用说明

> ⚠️ 本覆写通过 HTTPS MitM 检查 Telegram 短链接并返回 307 跳转。需安装并在系统中完全信任 Stash MitM CA 证书；未启用 MitM 或未信任证书时不会生效。

### 📌 配置说明
- 导入覆写后，在参数中选择要打开链接的客户端；默认是官方 Telegram，也可选 Swiftgram、Nagram、Turrit、iMe、Nicegram 或 Lingogram。
- 「代理指向的策略」须填写当前 Stash 配置中已存在的策略组或节点名（如 `PROXY`、`🚀 节点选择`）；覆写会为所选第三方客户端的相关域名添加分流规则，并插入规则列表最前。
- 在 Stash「覆写 (Overrides)」页面点击 `+` →「从 URL 下载」，导入上方 Raw 或 jsDelivr 链接后启用。

---

## 📖 YouTube 去广告使用特别说明

> ⚠️ **前置版本要求**：本覆写使用了 Stash 最新的二进制响应体处理与高级参数系统，**必须使用 Stash TestFlight 3.7 及以上版本**，低版本可能无法生效或抛出脚本执行错误。

### 📌 详细配置步骤：
1. **安装并信任 MitM 证书**（必要前提）：
   - 打开 Stash -> **设置** -> **MitM**。
   - 生成并安装 CA 证书到系统，并在 iOS **系统设置** -> **通用** -> **关于本机** -> **证书信任设置** 中完全信任该证书。
2. **导入覆写**：
   - 在 Stash **覆写 (Overrides)** 页面点击右上角 `+`，选择「从 URL 下载」。
   - 填入上方 YouTube 覆写的 Raw 链接或 jsDelivr CDN 链接。
3. **参数个性化配置**（可选）：
   - 导入后点击该覆写卡片，可直接调整参数：
     - **隐藏上传按钮 / Shorts 按钮**：自定义是否隐藏 YouTube 底部多余 Tab。
     - **字幕翻译语言**：默认简体中文 (`zh-Hans`)，可选繁体/英文/日文/韩文或关闭。
     - **歌词翻译语言**：针对 YouTube Music 歌词翻译。
     - **启用调试模式**：日常使用建议关闭以提升性能和减少日志。
4. **生效与排错**：
   - 首次启用或更新覆写后，请**强制划掉退出 YouTube App**重新打开，并清除应用缓存以加载最新去广告策略。

---

## 📖 哔哩哔哩去广告使用特别说明

> ⚠️ **前置要求**：基于 kokoryh/Sparkle 移植，需 **iOS 15 及以上**，并在 Stash 中启用 **MitM over HTTP/2**，否则部分 gRPC 接口无法生效。

### 🛡️ v1.1.x 脚本架构（含本地定制补丁）

本覆写的 5 个脚本由 `script-providers` 托管于本仓库 `Script/` 目录，其中两个为 **Sparkle 官方 dist 的补丁副本**（作者更新后需手动同步）：

| 脚本 | 来源 | 作用 |
|---|---|---|
| Bilibili_mock.js | 本地编写 | 开屏 -404 / 活动横幅等 JSON mock |
| Bilibili_jq.js | 本地编写 | P2P 屏蔽 / 番剧净化 + 「我的」页漏网入口兜底过滤 |
| **Bilibili_patch.js** | 本地编写 | **PlayerRelates 播放器关联推荐广告卡过滤**（Sparkle 未覆盖） |
| dist/bilibili.protobuf.request.js | **Sparkle dist + 补丁** | 声明并移除 `cm_under_player`（field 48，播放页横幅广告位） |
| dist/bilibili.protobuf.response.js | **Sparkle dist + 补丁** | 同上（response 侧） |
| bilibili.json.js / webpage.bilibili.js | Sparkle 官方 | 信息流 / 我的页 / 直播间网页 |

覆写还内置：**QUIC 全系拦截**（8 个 B 站后缀，防 UDP 443 绕过 MitM）、**cm.bilibili.com 归因上报与第三方广告归因（千问/Solar Engine）本地 mock**、B 站 gRPC **四 host 全覆盖**（grpc/app × bili(bili.com/api.net)）。

### 📌 详细配置步骤：
1. **安装并信任 MitM 证书**（必要前提）：
   - 打开 Stash -> **设置** -> **MitM**。
   - 生成并安装 CA 证书到系统，并在 iOS **系统设置** -> **通用** -> **关于本机** -> **证书信任设置** 中完全信任该证书。
2. **导入覆写**：
   - 在 Stash **覆写 (Overrides)** 页面点击右上角 `+`，选择「从 URL 下载」。
   - 填入上方哔哩哔哩覆写的 Raw 链接或 jsDelivr CDN 链接。
3. **参数个性化配置**（可选）：
   - 导入后点击该覆写卡片，可直接调整参数：
     - **空降助手**：跳过视频中插入的广告（默认开启，依赖第三方服务器 `bsbsb.top`，数据来自社区标注，可能存在偏差或失效）。
     - **空降助手策略**：`bsbsb.top` 的走线策略，默认 `DIRECT` 直连，可填写自己的代理组名。
     - **过滤置顶评论广告**：移除评论区置顶的广告与带货链接（默认开启）。
     - **日志等级**：默认 `ERROR`，日常使用无需调整。
4. **生效与排错**：
   - 首次启用或更新覆写后，请**强制划掉退出哔哩哔哩 App**重新打开。
   - **彻底关闭空降助手**：除关闭参数开关外，还需在覆写脚本中删除 `DmSegMobile` 匹配段（该请求脚本无法通过参数停用）。
   - **关于“百年大会员”**：脚本会将本地页面显示的会员状态改为大会员样式（`role: 15`），仅客户端 UI 效果，**并非真实会员**，无任何服务器特权。

### ⚠️ 已知限制
- 播放页下方的**通栏商业横幅**（`cm_under_player` 广告位）已通过 dist 补丁移除字段，但实测部分场景仍可能偶现——该广告位的数据通道疑似走 QUIC 或客户端广告库缓存，持续排查中；清一次 B 站「存储缓存」可缓解。

---

## 📖 哔哩哔哩 ADBlock（Biliverse 移植）使用说明

> ⚠️ **与上面的 Sparkle 版二选一，不要同时启用**：两者都会拦截同一批 B 站接口，叠加启用会让请求被处理两遍（内存翻倍、行为叠加）。

### 📦 来源与版本
- 基于 [Biliverse/ADBlock](https://github.com/Biliverse/ADBlock) **v0.7.5** 官方覆写移植（原作者：ClydeTime / VirgilClyne / app2smile / RuCu6 / Maasea）。
- 本仓库版本：`0.7.5-native.3`。与官方原版的**唯一结构差异**：官方原版的 31 项功能开关存在网页配置面板（BoxJS/PersistentStore），本移植版将其全部改为 **Stash 原生参数表单**（`arguments-version: 1`，32 项参数），在 Stash「覆写详情 → 参数」中直接开关，无需 BoxJS。
- 6 条 URL 改写、1 条 gRPC Mock、16 条脚本规则、脚本资源 URL（固定 v0.7.5）与官方原版完全一致。

### 🧠 内存说明（相对官方原版的差异）
- 官方原版仅 1 条响应脚本有 `max-size`，其余 12 条 `require-body: true` 的规则**无上限**，会把整个响应体（推荐流/搜索/播放页 gRPC 动辄几百 KB 到几 MB）完整载入内存。
- 本移植版为全部响应脚本补齐上限：**JSON 规则 1 MiB、gRPC 规则 256 KiB**。超过上限的响应会跳过脚本处理（该响应中的广告不去除），换取内存可控。
- 若发现内存仍明显高于预期，请确认没有同时启用其他 B 站去广告覆写。

### 📌 参数说明
- **配置来源**：默认 `Argument`（本页参数优先）；若你之前用 BoxJS 配置过 ADBlock，可切到 `PersistentStore`（已有配置优先，本页作为后备）。
- **[推荐] 屏蔽UP主直播推广**：仅支持**单个数字 UID**，填 `0` 表示不屏蔽。上游 v0.7.5 的多 UID（逗号分隔）存在类型缺陷（会触发脚本错误），故本版限制为单个 UID。
- 功能开关默认值与官方推荐一致：开屏/推荐/首页/搜索/番剧/直播/动态/播放页/评论去广告默认开启；隐私严格模式、交互弹幕去除等默认关闭。

### 📌 详细配置步骤：
1. **安装并信任 MitM 证书**（必要前提，与 Sparkle 版相同）：Stash -> **设置** -> **MitM** 生成安装证书，并在 iOS 系统设置中完全信任。
2. **导入覆写**：覆写页面 `+` → 从 URL 下载 → 填入上方 Raw 链接或 jsDelivr CDN 链接。
3. **参数设置**：导入后点击覆写卡片 → 「参数」，按需开关 32 项功能 → 「保存并应用」。
4. **生效与排错**：更新覆写后强制划掉哔哩哔哩 App 重新打开；去广告未生效时把「[调试] 日志等级」调到 `INFO` 后查看 Stash 脚本日志。

---

## 🚀 其它规则通用安装方法

### Loon
1. 打开 **Loon** App。
2. 进入 **配置 (Configuration)** -> **插件 (Plugin)**。
3. 点击右上角 **`+`** 号，选择 **从 URL 添加插件**。
4. 粘贴对应的 Raw 或 jsDelivr CDN 链接并启用。

### Stash
1. 打开 **Stash** App。
2. 进入 **覆写 (Overrides)** 页面。
3. 点击右上角 **`+`** 导入，选择 **从 URL 下载**。
4. 粘贴对应的 Raw 或 jsDelivr CDN 链接保存并启用。

---

## 📌 鸣谢与声明
- **YouTube 去广告** 原作者群：Maasea, VirgilClyne, Choler, DivineEngine, app2smile
- **哔哩哔哩去广告** 原作者：kokoryh（[Sparkle](https://github.com/kokoryh/Sparkle)），脚本由 `script-providers` 直接引用其官方 dist
- **红果短剧** 原始规则：Tartarus2014
- 本项目规则仅供学习研究与个人自用，请勿商用。
