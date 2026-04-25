<!--
使用说明（给 AI 看）：

这是单个 bug 从发现到关闭的「Bug 修复验收报告」模板。forge-bugfix 在 bug 被登记
或被领取时复制此模板到 docs/bugfix/reviews/BF-{MMDD}-{N}.md，并随着流程推进持续更新。

核心规则：
- 本文件不是修完后才生成的清单，而是单个 bug 的过程案卷。
- 每个 bug 独立一份报告、独立 worktree、独立 TDD、独立 commit、独立 QA 回归。
- 路径仍使用 docs/bugfix/reviews/，以兼容既有 backlog 链接和 forge-qa 的 review_doc 参数。
- 截图保存在 ./assets/{{BUG_ID}}/ 下，并在 Markdown 中用 ![](...) 内嵌展示。
- QA 只填 QA 相关区域；用户只填「你的验收」和「最终结论」区域。
- 交给用户验收前，forge-bugfix 必须用 scripts/validate-bugfix-report.py 校验通过。
- 前端/交互 bug 的 QA 证据必须回到用户原话，写清"用户现在能看到/完成什么"。
- 涉及前端展示、权限、数据可见性的 bug 必须检查配置/开关/数据就绪状态。
- 若处于 QA 自动闭环/批量修复模式，单 bug 报告可以停在「QA 通过，等待最终人工验收」，
  最终由批次汇总文档统一交给用户验收。
- 若最终结论是「PASS + 新发现」，forge-bugfix 必须先告知原 bug 已完成，
  再询问用户是否把新问题更新到 backlog / 报告索引；用户确认后才正式分流。
-->

# {{BUG_ID}} Bug 修复验收报告

## 1. 当前状态

| 字段 | 内容 |
|---|---|
| 状态 | {{pending / in-progress / fixed-awaiting-qa / qa-incomplete / qa-failed / qa-pass-pending-user-verification / qa-pass-pending-final-review / qa-pass-user-accepted / blocked-human / resolved / deferred}} |
| Bug 描述 | {{一句话描述用户或 QA 看到的现象}} |
| 来源 | {{用户反馈 / forge-qa / 人工验收新发现 / 其他}} |
| 功能域 | {{从 .forge/active.md 的功能域声明中选择}} |
| 严重度 | {{P0 / P1 / P2}} |
| 当前负责人 | {{session id 或 —}} |
| 关联批次 | {{BATCH-YYYY-MM-DD 或 —}} |

## 2. 问题发现记录

| 字段 | 内容 |
|---|---|
| 发现时间 | {{YYYY-MM-DD HH:MM}} |
| 发现环境 | {{前端地址 / 后端地址 / commit / branch，如已知}} |
| 原始描述 | {{用户原话或 QA 发现摘要}} |
| 关联 Feature Spec / 场景 | {{docs/PRD.md 中的章节或 —}} |
| 初始影响范围 | {{影响哪些页面、流程、数据或用户}} |

### 初始证据

<!-- 如果发现时已有截图、日志、console/network 证据，在这里内嵌或链接。 -->

_待填写_

## 3. 复现记录

| 字段 | 内容 |
|---|---|
| 复现结论 | {{已复现 / 未复现 / 间歇复现 / 待复现}} |
| 复现方式 | {{browser-use:browser / Playwright / gstack-browse / 单元测试 / API / 静态检查}} |
| 复现命令或入口 | {{命令、URL、账号、测试数据说明}} |

### 复现步骤

1. {{步骤 1}}
2. {{步骤 2}}
3. {{步骤 3}}

### 复现截图 / 日志

_待填写_

## 4. 根因分析

### 5 Whys

1. 为什么出现该现象？{{...}}
2. 为什么会发生这个原因？{{...}}
3. 为什么没有被已有逻辑挡住？{{...}}
4. 为什么测试没有覆盖到？{{...}}
5. 根因是什么？{{...}}

### 根因结论

{{一句话写清楚根因。}}

### 同类风险扫描

<!-- 修复后搜索同类模式，列出是否存在类似风险。 -->

- {{风险项或“未发现同类风险”}}

## 5. 修复记录

| 字段 | 内容 |
|---|---|
| Worktree | {{绝对路径}} |
| Branch | {{分支名}} |
| 修复 commit | {{短 hash + commit message 首行}} |
| 涉及文件 | {{文件列表，一行一个}} |
| 修复时间 | {{YYYY-MM-DD HH:MM}} |
| 修复摘要 | {{改了哪些关键逻辑，一到两句话}} |

## 6. TDD / 回归用例

| # | 用例类型 | 失败证明（修复前） | 通过证明（修复后） | 证据 |
|---|---|---|---|---|
| 1 | {{Playwright / 单元测试 / API / 静态检查}} | {{RED: 失败输出或截图}} | {{GREEN: 通过输出或截图}} | {{日志路径或截图}} |

> 规则：每个 bug 必须有独立 TDD 驱动。前端 bug 可用 Playwright 复现断言作为 RED，用修复后的同一断言作为 GREEN。

## 7. 验收入口与环境身份校验

**请使用以下地址验收。forge-qa 也必须使用同一组地址测试。**

| 服务 | 地址 | 来源 | 进程身份校验 | 结论 |
|---|---|---|---|---|
| Frontend | {{http://localhost:xxxx}} | {{dev:status / dev-stack status / 其他}} | {{PID=, cwd=, branch=}} | {{PASS / FAIL / N/A}} |
| Backend / API | {{http://localhost:xxxx 或 —}} | {{dev:status / dev-stack status / 其他}} | {{PID=, cwd=, branch=}} | {{PASS / FAIL / N/A}} |
| API Health | {{/health 或 —}} | {{curl / 其他}} | {{状态码 / 响应摘要}} | {{PASS / FAIL / N/A}} |

### 配置 / 开关 / 数据就绪检查

| 检查项 | 实际值 | 预期 | 结论 |
|---|---|---|---|
| Feature flag / config | {{例如 event_aggregation_ready=true 或 N/A}} | {{本 bug 需要的状态}} | {{PASS / FAIL / N/A}} |
| 后端返回状态 | {{例如 enabled=true / 权限状态 / API 字段}} | {{预期值}} | {{PASS / FAIL / N/A}} |
| 数据就绪 | {{记录数量 / fixture / 测试数据说明}} | {{足以验证用户问题}} | {{PASS / FAIL / N/A}} |

**代码身份**

| 字段 | 内容 |
|---|---|
| Worktree | {{绝对路径}} |
| Branch | {{分支名}} |
| Commit | {{短 hash}} |
| QA 执行时间 | {{YYYY-MM-DD HH:MM}} |

**环境一致性结论**：{{PASS / FAIL / EXPIRED}}

**浏览器证据来源**：{{browser-use:browser / Playwright / gstack-browse / N/A}}

<!--
硬规则：
- QA 用的 Frontend/Backend 地址必须和交给用户验收的地址一致。
- 能拿到 PID/cwd 时，cwd 必须指向当前 worktree；否则 QA FAIL。
- 交给用户前要重新确认地址和进程身份。若已变化，标记 EXPIRED 并重跑 QA。
-->

## 8. 人工验收指南（给用户看）

> 这一节是用户最终验收的主入口。只写用户需要看的页面、操作、预期效果和 QA 参考截图。

| # | 你要检查什么 | 怎么操作 | 预期效果 | QA 参考截图 | 你的验收 |
|---|---|---|---|---|---|
| 1 | {{检查点}} | {{打开页面 → 点击按钮 → 观察状态}} | {{用户应该看到什么}} | ![](./assets/{{BUG_ID}}/manual-1.png) | ⏳ 待填 |
| 2 | {{检查点}} | {{步骤}} | {{预期效果}} | ![](./assets/{{BUG_ID}}/manual-2.png) | ⏳ 待填 |
| 3 | {{边界/异常态检查点}} | {{步骤}} | {{预期效果}} | ![](./assets/{{BUG_ID}}/manual-3.png) | ⏳ 待填 |

## 9. QA 测试过程与截图证据（forge-qa 填）

<!--
forge-qa 规则：
- 每个前端验证项必须有结论、断言和 Markdown 内嵌截图。
- Codex 环境中优先使用 browser-use:browser 采集用户视角截图和 DOM 证据；若改用 Playwright/gstack/Computer Use，写明原因。
- “每一步截图”指每个有意义的状态节点：打开页面、操作前、操作后、加载态、结果态、错误态。
- 不需要对每次键入单个字符截图，除非 bug 与输入过程本身有关。
- 截图优先用元素/区域裁剪；需要证明整体布局时才用全页。
-->

_待 forge-qa 填写_

### 9.0 用户问题闭环断言

| 字段 | 内容 |
|---|---|
| 用户原话 / 原始问题 | {{用户看到/反馈的原始问题，不要改写成技术问题}} |
| 最终用户可见结果 | {{现在用户能看到/完成什么，必须对应用户原话}} |
| 证明方式 | {{截图 / 交互步骤 / API 断言 / 测试命令}} |
| 结论 | {{PASS / FAIL / BLOCKED}} |

### 验证项模板

#### 验证项 N：{{标题}}

**结论**：{{PASS / FAIL / BLOCKED}}

**操作轨迹与截图**

1. {{步骤说明}}

   ![](./assets/{{BUG_ID}}/qa-N-01.png)

2. {{步骤说明}}

   ![](./assets/{{BUG_ID}}/qa-N-02.png)

3. {{步骤说明}}

   ![](./assets/{{BUG_ID}}/qa-N-03.png)

**断言**

- {{断言 1}}：{{PASS / FAIL}}
- {{断言 2}}：{{PASS / FAIL}}
- console.error：{{0 / 错误摘要}}
- network error：{{0 / 错误摘要}}

## 10. QA 自动闭环记录（可选）

| 轮次 | 结果 | 处理 | 证据 |
|---|---|---|---|
| 1 | {{QA_FAIL / QA_PASS}} | {{回 bugfix / 进入最终验收 / 升级人工}} | {{链接}} |

<!--
若同一 bug 自动修复失败达到上限，或遇到需求/设计/环境不确定性，必须标记 blocked-human，
写清楚问题、证据、已尝试方案和需要用户判断的选项。
-->

## 11. 最终结论（用户必填一个 x）

- [ ] PASS — 全部验证项通过，可以合并/关闭
- [ ] FAIL — 有未通过项（在原 bug 范围内），需要继续修这个 bug
- [ ] PASS + 新发现 — 这个 bug 修好了，但我看到别的问题（在下面“新发现”区列出；AI 会先询问是否入档，再分流到 backlog）

### 新发现（选 PASS + 新发现时必填，一条一行）

<!-- 格式：一行一条，不用管是 bug 还是需求还是模糊反馈。AI 会先询问是否入档，确认后再分流到 backlog.md。 -->

_（如选 PASS 或 FAIL，此区留空）_

---

**你填完之后告诉我一声“验收了”，我读报告推进下一步。**
