---
name: forge-dev
description: |
  开发调度器：接力 PRD 变更，主上下文只编排，子 skill（design/eng/qa）在独立上下文执行防 context rot；交互 / --auto / --resume 三模式。
  触发方式：用户说"开始开发"、"实现需求"、"forge-dev"、PRD 更新后进入开发阶段时；说"端到端交付"、"全自动交付"、"一路到发布"时走 --full 尾段（原 forge-deliver 已退役并入）。
---

> **文档落地路径**：遵循 forge-doc-policy 规范。完整白名单 + frontmatter schema 见
> `~/.claude/skills/forge-doc-policy/doc-paths.md`。
> **当前文档加载顺序**：先读项目 `CLAUDE.md`、`docs/README.md`、`docs/INDEX.md`，
> 再读相关根级当前真相源和 `.features/{feature-id}/feature-spec.md`。
> 详细规则见 `~/.claude/skills/_shared/current-doc-loading.md`。

# /forge-dev：开发调度器

接力 `/forge-prd` 或 `/forge-brainstorm` 的产出，调度设计、工程、QA 子技能完成开发交付。

全程中文。

## 前置脚本（每次先运行）

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
echo "当前分支: $_BRANCH"
echo "项目根目录: $_ROOT"

# 检测项目环境
[ -f "$_ROOT/package.json" ] && echo "检测到: Node.js 项目" && cat "$_ROOT/package.json" | head -5
[ -f "$_ROOT/requirements.txt" ] && echo "检测到: Python 项目"
[ -f "$_ROOT/go.mod" ] && echo "检测到: Go 项目"
[ -f "$_ROOT/Cargo.toml" ] && echo "检测到: Rust 项目"
[ -f "$_ROOT/Makefile" ] && echo "检测到: Makefile"

# 检查浏览器工具（QA 阶段可能需要）
command -v npx >/dev/null 2>&1 && npx playwright --version >/dev/null 2>&1 && echo "浏览器工具: Playwright 可用" || echo "浏览器工具: Playwright 不可用（QA 将用 browser-use 或纯代码模式）"

# 检查 .forge 状态
[ -f "$_ROOT/.forge/dev-state.json" ] && echo "发现未完成的开发流水线" && cat "$_ROOT/.forge/dev-state.json"

# 检查 .features/ 注册表
[ -f "$_ROOT/.features/_registry.md" ] && echo "发现 Feature 注册表" && cat "$_ROOT/.features/_registry.md"

# 检查 brainstorm 思考文档
ls "$_ROOT"/brainstorm-*.md 2>/dev/null && echo "发现思考文档（根目录）"
ls "$_ROOT"/docs/brainstorm-*.md 2>/dev/null && echo "发现思考文档（docs/）"
```

---

## 流程

```
读取 PRD 迭代摘要
  → 项目类型判断（frontend / backend / fullstack）
  → Discussion 阶段（结构化偏好收集，识别灰区）
  → Research 阶段（技术调研，基于知识+代码扫描+按需搜索）
  → 产出 RESEARCH.md
  → 分析变更 + 调研结果，判断需要哪些子 skill
  → 列出建议的执行计划，用户确认
  → Wave 并行调度子 skill（每个子 skill 在独立上下文执行）
  → 汇总交付结果
```

全程中文。

---

## 上下文工程（核心设计）

**问题**：随着会话上下文窗口被填满，AI 输出质量会逐步劣化（context rot）。

**解决方案**：主调度器只做编排，真正的工作发生在子 agent 的独立上下文中。

### 原则

1. **主上下文只做调度** — 读取 PRD、判断计划、协调子 agent，不做具体实现
2. **子 skill 在独立上下文执行** — 使用 Agent 工具启动子代理，每个子 skill 拥有全新的上下文窗口
3. **精准传递上下文** — 只传递子 skill 需要的文档路径和指令，不传递无关信息
4. **结果汇总回主上下文** — 子 agent 返回执行摘要，主调度器汇总为交付报告

### 子 skill 调用方式

```
使用 Agent 工具，prompt 中包含：
1. 子 skill 的完整指令（从 SKILL.md 读取）
2. 项目路径和 PRD 路径
3. 本次变更的具体内容（从 PRD 迭代摘要提取）
4. 前序子 skill 的产出路径（如 DESIGN.md）
5. RESEARCH.md 路径（如有）
```

**关键约束**：
- 每个 Agent 调用只执行一个子 skill
- **模型路由**（Superpowers v5 实践）：机械型子任务（跑测试、批量重命名、模板填充）给 Agent 传 `model: sonnet` 用便宜模型；判断型子任务（架构、设计、审查）保持默认模型，不降级
- 不要在主上下文中重复子 skill 的工作
- 子 agent 完成后，读取其产出文档确认结果，而非依赖其返回的文本
- **传递 Feature Spec**：如果 `.features/{feature-id}/feature-spec.md` 存在，SHALL 将其路径和关键内容（行为场景 + 验收检查表）传递给 forge-eng 和 forge-qa 子 agent
- **forge-eng 行为约束**：告知 forge-eng 子 agent 每完成一个功能点后，SHALL 自验对应的 Given/When/Then 场景，确认 PASS 后再继续下一个功能点

---

## 模式说明

### 交互模式（默认）

在 3 个硬卡点暂停等待用户确认：
1. **Discussion 完成后** — 确认偏好收集是否完整
2. **Research + 执行计划确认** — 调研结果 + 建议的执行计划
3. **所有子技能完成后** — 交付总结确认

其他阶段正常推进，遇到不确定问题时用 AskUserQuestion 询问。

### 自动模式（`--auto`）

**前置沟通（1-2 轮，必须）：**

执行任何阶段之前，先完成前置沟通。这不是可选的。

**第1轮（必选）— 需求对齐：**
通过 AskUserQuestion 确认：
- "我理解你要做的是 [复述需求]，对吗？"
- "项目类型判断：[frontend / backend / fullstack]"（决定是否跳过设计）
- "我的方案大纲是：[1-3 句话概括方案方向]"
- "预计影响 [N 个文件 / 新建 N 个文件]"

**第2轮（按需）— 依赖确认：**
只在以下情况触发：
- 检测到需要外部依赖（API key、数据库、第三方服务）
- 需求存在歧义（多种理解方式）
- 项目结构复杂（多个入口、微服务架构）

**前置沟通完毕后：** 全自动执行，不再暂停。

**自动模式特殊规则：**
- **不 git commit** — 代码改动只存在于工作区
- **每个阶段结束保存检查点** — `git diff > .forge/checkpoints/phase-N-done.patch`
- **遇到阻塞不死等** — 记录阻塞原因，跳到下一个可执行阶段，在报告中标注

### 恢复模式（`--resume`）

读取 `.forge/dev-state.json`，从上次中断的阶段继续：

1. 显示当前进度摘要
2. 通过 AskUserQuestion 确认："上次停在 [阶段名]，要从这里继续吗？"
3. 选项：
   - A) 从该阶段继续
   - B) 从指定阶段重新开始
   - C) 全部重来

---

## AskUserQuestion 格式规范

1. **重新聚焦**：当前项目、正在调度的开发任务。（1-2句）
2. **通俗解释**：用简单语言说清接下来要做什么。
3. **给出推荐**：推荐的执行计划和理由。
4. **列出选项**：可调整的执行方案。

---

## 状态管理

每阶段结束写检查点（state.json + patch），--resume 从断点恢复。
操作细则必读 [references/orchestration-details.md](references/orchestration-details.md)。

## 第-1步：Brainstorm 感知

在读取 PRD 之前，先检查项目是否有 PRD 和思考文档：

```
检查项目文档状态：
├── 有 PRD → 正常进入第0步
├── 无 PRD，有思考文档 →
│     AskUserQuestion:
│       "发现思考文档 [{文件名}]，但没有正式 PRD 和 .features Feature Spec。建议：
│        A) /forge-prd — 将思考转化为正式 PRD + Feature Spec（推荐）
│        B) 轻量模式 — 跳过 PRD，直接基于思考文档进入开发（⚠️ 无验收锚点）
│        C) /forge-brainstorm — 思考还不够充分，继续讨论"
├── 无 PRD，无思考文档 →
│     AskUserQuestion:
│       "没有发现 PRD 或思考文档。建议：
│        A) /forge-brainstorm — 先讨论一下需求再开发
│        B) /forge-prd — 直接从零创建 PRD
│        C) 轻量模式 — 直接告诉我要做什么，跳过文档"
└── 用户选择轻量模式 → 跳过第0-2步，直接进入第3步（调度建议）
```

---

## 第0步：读取当前真相源 + Feature Spec 检查

1. 根据用户指定的项目目录，定位当前文档入口和产品当前真相源：
   ```
   搜索模式：
   - {项目目录}/docs/README.md
   - {项目目录}/docs/INDEX.md
   - {项目目录}/docs/PRD.md
   - {项目目录}/.features/_registry.md
   ```

2. 读取 `docs/PRD.md` 的当前产品事实和本次相关章节，提取：
   - 变更概览
   - 页面/模块/接口映射
   - 受影响文件

3. **⚠️ Feature Spec 检查**：
   优先从 `.features/_registry.md` 或用户输入定位 `.features/{feature-id}/feature-spec.md`。
   - **找到 Feature Spec** → 读取并提取行为场景（Given/When/Then）和验收检查表，作为开发的行为契约
   - **legacy 项目仅有 PRD 内嵌 Feature Spec** → 可兼容读取，但需要在交付报告中建议迁移到 `.features`
   - **未找到 Feature Spec** → 通过 AskUserQuestion 警告：
     ```
     ⚠️ 没有找到 .features Feature Spec（含 Given/When/Then 验收场景）。
     没有 Feature Spec 意味着开发缺乏精确的行为锚点，可能导致实现偏离需求。
     
     A) 先运行 /forge-prd 生成 Feature Spec（推荐）
     B) 继续开发，但接受验收标准不够精确的风险
     ```
   - 用户选 A → 退出 forge-dev，引导用户运行 /forge-prd
   - 用户选 B → 继续，但在交付报告中标注「⚠️ 无 Feature Spec，验收标准可能不精确」

4. 如需追溯历史，先读 `docs/CHANGELOG.md` 顶部索引，再读取相关分账 changelog；不要默认加载长历史全文

5. **项目类型判断**：
   根据需求内容和现有代码判断类型：
   - **frontend** — 涉及 UI、页面、组件、样式
   - **backend** — 涉及 API、数据库、服务端逻辑、CLI 工具
   - **fullstack** — 两者兼有

---

## 第1步：Discussion 阶段（结构化偏好收集）

**目的**：在调研和规划之前，把用户脑中的偏好收集进来。PRD 说了"做什么"，但具体"怎么做"有很多灰区。

### 灰区识别

根据变更内容的类型，自动识别需要讨论的灰区：

| 变更类型 | 需要讨论的灰区 |
|---------|--------------|
| 视觉功能 | 布局偏好、信息密度、交互方式、空状态处理、动效风格 |
| API / CLI | 返回格式、错误码设计、参数命名、详细程度、版本策略 |
| 内容系统 | 内容结构、语气风格、深度层级、内容流转 |
| 数据处理 | 分组标准、去重策略、命名规则、例外处理 |
| 组织型任务 | 目录结构、文件命名、模块划分、配置管理 |

### 执行方式

1. 分析 PRD 变更内容，列出识别到的灰区
2. 对每个灰区，通过 AskUserQuestion 逐一讨论：
   - 说明这个灰区是什么
   - 给出推荐方案和理由
   - 列出替代选项
3. 用户的回答写入 `CONTEXT.md`（如果用户跳过，使用合理默认值并标注）
4. `CONTEXT.md` 会传递给后续的 Research 和子 skill

### 产出

```
{项目目录}/docs/{版本号}-CONTEXT.md
```

**可跳过**：用户说"用默认"或"跳过讨论"时，标记 discussion 为 skipped，使用合理默认值。

---

## 第2步：Research 阶段（技术调研）

**目的**：在规划执行方案前，调研技术栈、最佳实践和潜在坑点，让后续的设计和工程方案建立在充分调研基础上。

### 触发条件

- **默认触发**：所有非配置类变更
- **可跳过**：用户明确说"跳过调研"，或变更极小（纯配置/参数调整）

### 调研方式

在当前上下文中一次性完成四个维度的调研，不拉子 agent：

1. **技术栈调研**：本次变更涉及的技术栈最佳实践、库选择、版本兼容性
2. **架构模式调研**：类似功能在业界的常见架构模式、数据流设计、模块划分
3. **坑点调研**：类似功能在实现中的常见问题和陷阱、规避策略、边界情况
4. **现有代码分析**：用 Glob/Grep/Read 扫描项目中已有的可复用代码和模式

**调研手段**：
- 基于自身知识直接给出技术建议和风险提示
- 使用 Glob/Grep 搜索项目已有代码，识别可复用模块
- 需要时使用 WebSearch 搜索最新技术文档和已知问题

### 产出

汇总为 `RESEARCH.md`：

```markdown
# 技术调研报告 — vX.Y

## 调研时间：YYYY-MM-DD
## 调研范围：[本次 PRD 变更摘要]

### 一、技术方案推荐
[推荐的技术方案、库选择、版本兼容性]

### 二、架构模式推荐
[推荐的架构模式、数据流设计、模块划分]

### 三、风险与坑点
[已知坑点、规避策略、边界情况]

### 四、可复用资产
[项目中已有的可复用模块/函数/模式、需要重构的部分]

### 五、综合建议
[基于以上四个维度的综合推荐方案]
```

保存到 `{项目目录}/docs/{版本号}-RESEARCH.md`，传递给 forge-design 和 forge-eng。

---

## 第3步：分析与调度建议

根据 PRD 迭代摘要 + RESEARCH.md 的内容，判断需要调用哪些子技能：

### 判断规则

| 变更类型 | 需要的子技能 | 说明 |
|----------|-------------|------|
| 涉及 UI/交互/视觉变化 | forge-design → forge-eng → forge-qa | 先设计再实现 |
| 纯后端（API/数据/逻辑） | forge-eng → forge-qa | 跳过设计 |
| 纯前端样式调整 | forge-design → forge-eng → forge-qa | 设计先行 |
| 配置/参数调整 | forge-eng → forge-qa | 轻量工程+验证 |
| 新功能（全栈） | forge-design → forge-eng → forge-qa | 完整流程 |
| Bug 修复 | forge-eng → forge-qa | 工程+验证 |

**跳过条件：** `type == "backend"` 时跳过 forge-design，在 state.json 中标记为 `skipped`。

### 视觉决策传递（UI/前端任务）

如果项目类型为 `frontend` 或 `fullstack`，且变更涉及页面、组件、状态或布局：

1. 读取 `~/.claude/skills/_shared/visual-decision-layer.md`，判断是否需要 Image 2、show-widget 或真实截图。
2. 若 PRD/brainstorm/DESIGN.md 已有视觉稿，汇总到 `.forge/visual-decision.md`。
3. 调度 `forge-design` 时明确要求完成 Image 2 视觉稿门禁；若无法生成，至少产出 prompt pack 并标注阻塞。
4. 调度 `forge-eng` / `forge-design-impl` 时传入 `.forge/visual-decision.md`，要求实现后用真实截图替换或对比视觉稿。
5. 调度 `forge-qa` 时说明：Image 2 只作为观感参考，pass/fail 仍基于 Feature Spec、DESIGN.md、CSS 断言和真实截图。

### 产出执行计划

通过 AskUserQuestion 向用户展示：

```
项目：[项目名]
PRD 版本：vX.Y
项目类型：[frontend / backend / fullstack]
本次变更：[变更摘要]

调研摘要：
- 技术方案：[RESEARCH.md 中的推荐方案]
- 风险提示：[RESEARCH.md 中的关键坑点]

建议执行计划：
1. /forge-design — [需要设计的内容摘要]
2. /forge-eng — [需要实现的内容摘要]
3. /forge-qa — [需要测试的内容摘要]

推荐：按上述顺序执行，因为 [理由]。
预计影响：[N 个文件]
```

选项：
- A) 按建议顺序执行全部
- B) 跳过某个环节（指定跳过哪个）
- C) 只执行其中一个（指定哪个）
- D) 调整顺序或内容

---

## 第4步：Wave 并行调度子技能

用户确认执行计划后开始调度。**核心机制**：用 Agent 工具在**独立上下文**里跑每个子 skill，
按依赖关系分 Wave（可并行的同 Wave），主上下文只传必要文档路径、只等结果、不重复子 skill 的活。

**执行前必读 [references/orchestration-details.md](references/orchestration-details.md) 的「第4步调度机制」**——
含 Wave 分组、Agent prompt 模板、子 skill 完成后的验收（读产出文档不轻信口头汇报）、阻塞处理。

骨架红线：子 agent 完成后必须读其产出文档确认（`git diff --stat` + 读 DESIGN/ENGINEERING/QA.md），
不轻信返回文本；任何一环阻塞按模式处理（交互问用户 / 自动跳过并标注）。

## 第5步：汇总交付

所有子 skill 完成后，读取各产出文档（不轻信子 agent 口头汇报），汇总交付报告并请用户验收。
报告格式与验收流程必读 [references/orchestration-details.md](references/orchestration-details.md)。

## 验收操作清单

给用户的验收操作按"能直接跑通"标准写（带命令和预期）。
清单格式见 [references/orchestration-details.md](references/orchestration-details.md)。

## 第6步（可选）：发布尾段（--full）

**默认不执行**。仅当用户明说"一路到发布 / 端到端交付 / --full"时，在第 5 步交付总结经用户确认后继续：

1. 调度 `forge-review`（结构性审查，发现直接修）
2. 审查通过 → 调度 `forge-ship`（默认 PR only，用户明确要求才 Full ship）
3. 合并前 → 调度 `forge-doc-release`（文档同步）
4. 汇总最终交付报告（含 Ship Summary 状态表），更新 `.forge/dev-state.json`

每个尾段环节仍是独立上下文子代理；任何一环失败即停，不带病往下走。

---

## 单独调用模式

用户也可以直接指定调用某个子技能：

- `/forge-design` — 只执行设计环节
- `/forge-eng` — 只执行工程环节
- `/forge-qa` — 只执行 QA 验收

单独调用时，子技能会自行读取 PRD 和已有的领域文档，不需要经过调度器。

---

## Feature 状态管理（.features/ 架构）

调度前读 `.features/_registry.md` 与 status.md；各子 skill 更新自己的行，dev 只维护调度侧状态与 heartbeat。
字段与操作细则见 [references/orchestration-details.md](references/orchestration-details.md)。

## 重要规则

### 上下文工程规则
- **子 skill 必须在独立上下文执行** — 使用 Agent 工具启动，不在主会话中直接执行
- **只传递必要信息** — 文档路径 + 变更摘要 + 用户偏好，不传递主会话的完整历史
- **主上下文保持精简** — 调度器只做编排和汇总，不做具体实现
- **验收在主上下文完成** — 读取子 agent 的产出文档做最终确认

### 调度规则
- **半自动调度** — 列出建议，用户确认后再执行，不自动跳过任何环节
- **上下文传递** — 确保每个子技能能读到前序产出（通过文件路径传递，非上下文传递）
- **不重复工作** — 如果某个领域文档已经是最新（版本号与 PRD 一致），提示跳过
- **状态文件实时更新** — 每次阶段状态变更都写 state.json

### 自动模式规则
- **前置沟通不可省略** — 自动模式的"自动"是沟通完毕后的执行自动，不是跳过沟通
- **绝不 git commit** — 代码改动只在工作区，检查点用 patch 保存
- **遇阻不死等** — 记录阻塞原因，跳到可执行阶段，在报告中标注

### 质量规则
- **不引入安全漏洞** — 每次修改都检查 OWASP Top 10
- **不破坏现有功能** — 修改现有代码前先读懂上下文
- **遵循项目已有风格** — 缩进、命名、目录结构与项目保持一致
- **一个想法，一个交付** — 不要在一次流水线中塞入多个不相关的功能

### 设计规则（仅 frontend/fullstack）
- **避免 AI 模板痕迹** — 不用紫色渐变、三列功能网格、千篇一律的 SaaS 布局
- **遵循现有设计体系** — 如果项目已有样式，新功能必须一致
- **响应式不是可选的** — 所有新 UI 必须适配移动端
