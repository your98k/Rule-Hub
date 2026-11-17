# 上游自动同步

## 运行与发布

- 工作流已安装并启用（GitHub state: active）；安装提交 `bc419ba05a47e2bfa231216d6e1a929809151187`。
- 工作流名称：`Sync all upstreams to test`。
- 计划每周日 UTC 19:10（北京时间每周一 03:10，每7天一次）运行，也支持手动 Run workflow；GitHub 定时任务可能延迟。
- 先检测上游实质内容变化；有更新才写入 test 并验证，通过后自动发布本轮对应文件到 main。
- test 缺少的正式文件从 main 补齐；test 已有文件（含微博试用版、诊断覆写）保留。
- 仅发布本轮测试通过的精确文件列表，逐项核对测试前后哈希；main 有并发修复或 test 为另一套实现时中止发布，禁止整分支合并。
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

没有实质内容变化时不提交仓库，仅将报告保存到 Actions artifacts/运行摘要。发生更新时，test 保存候选、基线和报告；发布中断的候选保留 pending_publish 标记供下次重试，main 已包含相同哈希的文件不重复发布。

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

## 首次 Actions 验证

- [首轮运行](https://github.com/your98k/Rule-Hub/actions/runs/43924738689)：依赖安装、82 项回归测试、来源登记、test 提交及报告上传均完成。
- 来源登记：110 enrolled、16 local-only、9 test-only；没有覆写更新候选。
- 资源审计：135 个覆写、249 项资源；134 fetched、80 self-mirror、25 inline、9 HTML、1 HTTP 403，另有 1 个重复 YAML 键错误，共 11 项异常。
- 最终失败是审计报告的预期信号，不代表工作流未启用；异常没有被自动修改或当成健康资源。

## 每周发布规则与异常修复

- 2026-11-17：改为每7天检测；无内容更新零提交，有更新先test自检后自动按文件发布main。
- 资源审计使用 provider 已声明的 headers，缓存按 URL + headers 隔离，敏感头不回显。京东原配置已有 UA，不为误报修改其覆写。
- 超格教育的三个 mock 合并到同一列表，三条静态响应全部保留。MyBlockAds/WebPage 七个 HTML 缓存地址恢复为验证过的原站源码并显式配置其请求头。YouTube test 专用覆写改用作者逐字节一致的公开镜像。
- 自动检测覆盖仍以 sources.json 的已登记来源为准；review/local 项不伪装为全自动适配，自托管脚本资源审计不等于已接入原作者同步。
