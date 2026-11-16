# 上游自动同步

## 运行与发布

- 当前新工作流尚未启用：GitHub MCP 缺少 workflow 写入权限，待重新连接并授予 workflow 权限后安装。
- 设计工作流名称：`Sync all upstreams to test`。
- 安装启用后，计划每天 UTC 19:10（北京时间次日 03:10）运行，也支持手动 Run workflow。
- 调度与工具从 main 读取；更新候选、基线与报告只写 test，正式覆写不自动发布。
- test 缺少的正式文件从 main 补齐；test 已有文件（含微博试用版、诊断覆写）保留。
- 通过测试后，由维护者按文件发布到 main，禁止把整个历史 test 分支直接合入 main。
- 现有腾讯视频专项同步工作流保留，其原有正式发布行为独立于此工作流。

## 来源与覆盖

`upstream/sources.json` 是明确的源文件清单，不把 homepage 当同步地址。每个正式覆写必须被列入清单；新增未登记文件会阻止任务，避免漏管。test 专用文件列入 test_only 白名单。

模式：

- merge：严格转换为 Stash，再以上次上游、最新上游、当前 test 文件做三方合并；修改通过检查后才写入。
- review：自动抓取和比较上游哈希，变化时报告待审，不替换本地适配。
- specialized：由专门适配器维护（当前为腾讯视频），本流程监测源变化。
- local：原生定制或尚未核实对应源文件，保持原样，报告覆盖缺口。

首次登记只建立当前上游快照，不声称已补齐历史上游变化，也不覆盖现版。上游身份发生变化必须重新审查登记，不按相同哈希掩盖换源。

`upstream/resource-report.json` 另行盘点远程脚本和内嵌脚本。直接引用上游的资源由 Stash 按其 interval 刷新；自托管副本不等于已自动同步原作者。未注册行为测试的镜像脚本只监测，不自动覆盖定制代码。

## 检查与失败行为

- Loon 转换器 strict 模式：未知语法或语义损失即停止该文件，带原始行号；不丢弃后宣称通过。
- 重复 YAML 键、无效字段/参数引用、rewrite 结构、provider 引用、仓库自检、jq 参数变体编译、内嵌 JS 语法检查。
- 有序规则冲突、本地修复与上游修改重叠时保留旧版及旧基线，下次继续报告。
- 下载失败、空响应、HTML/异常跳转、超大响应均保留旧版。
- 每个候选覆写在写入前独立通过 provider 资源门禁；远程脚本失败或本地镜像缺失时，该文件及其同步基线都保留。外部资源使用去重缓存，仅运行 `node --check`，不执行上游代码。
- 单个失败不妨碍其他已验证候选进入 test；Actions 最后仍显示失败并提供完整报告。
- 并发推送不使用 force、不重写历史；远端变动导致推送失败时保留现有远端数据。

报告：test 分支的 `upstream/sync-report.json`、`upstream/resource-report.json` 以及 Actions artifacts/运行摘要。没有时间戳噪声时重复运行不应产生空提交。

这些是静态/样本自检，不代表 Stash 真机加载及目标 App 功能验证。仅在 YG 明确要求本地测试时进行本机联调。

## 开发验证

```bash
python -m pip install -r scripts/sync-requirements.txt
python scripts/test-sync-upstreams.py
python -m unittest discover -s scripts -p 'test_loon_adapter.py'
python scripts/test-upstream-resources.py
python scripts/sync-upstreams.py       # 预览，报告仍会写入
python scripts/sync-upstreams.py --apply # 仅在 test 检出目录运行
```

不要手工将下载失败或冲突项的快照推进，否则会把未处理的更新误标为已同步。
