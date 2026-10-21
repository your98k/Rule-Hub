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
| **红果短剧去广告** | 通用 | 裁剪域名拦截，不改动全局 IPv6/DNS | [查看/复制](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/HongGuo.stoverride) | [查看/复制](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/HongGuo.stoverride) |
| **广告拦截&净化合集** | 通用 | 约 730 款 APP/小程序广告拦截与净化（12306、爱奇艺、百度地图、贴吧、B站等），每款 APP 独立开关可调 | [查看/复制](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/blockAds.stoverride) | [查看/复制](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/blockAds.stoverride) |

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
   - 首次启用或更新覆写后，请**强制划掉退出 YouTube App** 重新打开，并清除应用缓存以加载最新去广告策略。

---

## 📖 哔哩哔哩去广告使用特别说明

> ⚠️ **前置要求**：基于 kokoryh/Sparkle 移植，需 **iOS 15 及以上**，并在 Stash 中启用 **MitM over HTTP/2**，否则部分 gRPC 接口无法生效。

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
   - 首次启用或更新覆写后，请**强制划掉退出哔哩哔哩 App** 重新打开。
   - **彻底关闭空降助手**：除关闭参数开关外，还需在覆写脚本中删除 `DmSegMobile` 匹配段（该请求脚本无法通过参数停用）。
   - **关于"百年大会员"**：脚本会将本地页面显示的会员状态改为大会员样式（`role: 15`），仅客户端 UI 效果，**并非真实会员**，无任何服务器特权。

---

## 📖 广告拦截&净化合集 (blockAds) 使用特别说明

> 基于 [fmz200/wool_scripts](https://github.com/fmz200/wool_scripts)（奶思）整理的综合性广告拦截与净化合集，覆盖 **约 730 款 APP 与小程序**。

### 📌 功能特点
- **广覆盖**：12306、爱奇艺、百度地图、百度贴吧、哔哩哔哩、菜鸟裹裹、阿里云盘等海量 APP/小程序的开屏、信息流、横幅广告拦截与页面净化。
- **独立开关**：每款 APP/小程序都有独立的 `arguments` 开关（80+ 个参数），可在导入后按需单独启用/停用，避免误伤。
- **远程脚本联动**：广告净化脚本通过 `script-providers` 从原作者仓库（fmz200/wool_scripts、kokoryh、zirawell 等）自动拉取并每日更新。

### 📌 详细配置步骤
1. **安装并信任 MitM 证书**（必要前提）：
   - 打开 Stash -> **设置** -> **MitM**。
   - 生成并安装 CA 证书到系统，并在 iOS **系统设置** -> **通用** -> **关于本机** -> **证书信任设置** 中完全信任该证书。
2. **导入覆写**：
   - 在 Stash **覆写 (Overrides)** 页面点击右上角 `+`，选择「从 URL 下载」。
   - 填入上方 blockAds 覆写的 Raw 链接或 jsDelivr CDN 链接。
3. **按需调整参数**（强烈建议）：
   - 导入后点击该覆写卡片，进入参数列表，把**用不到的 APP 开关关闭**，仅保留自己常用 APP，可显著降低资源占用与误拦截概率。
4. **生效与排错**：
   - ⚠️ **某些 APP 需清除缓存或卸载重装后拦截才会生效**（作者原文提示）。
   - 启用或更新覆写后，建议彻底划掉相关 APP 重新打开。

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
- **广告拦截&净化合集** 原作者：奶思（[fmz200/wool_scripts](https://github.com/fmz200/wool_scripts)），另引用 kokoryh、zirawell 等脚本
- **红果短剧** 原始规则：Tartarus2014
- 本项目规则仅供学习研究与个人自用，请勿商用。
