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
| **红果短剧去广告** | 通用 | 裁剪域名拦截，不改动全局 IPv6/DNS | [查看/复制](https://raw.githubusercontent.com/your98k/Rule-Hub/main/Stash/HongGuo.stoverride) | [查看/复制](https://cdn.jsdelivr.net/gh/your98k/Rule-Hub@main/Stash/HongGuo.stoverride) |

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
- **红果短剧** 原始规则：Tartarus2014
- 本项目规则仅供学习研究与个人自用，请勿商用。
