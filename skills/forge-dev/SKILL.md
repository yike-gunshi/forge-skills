---
name: forge-dev
description: '开发调度器。接力 forge-prd 产出的 PRD 变更，半自动调度设计(forge-design)、工程(forge-eng)、QA(forge-qa) 子技能。读取 PRD 迭代摘要，并行调研技术方案，传递 Image 2/Figma/真实截图等视觉决策索引，判断需要调用哪些子技能，列出建议顺序供用户确认后以独立上下文执行。触发方式：用户说"开始开发"、"实现需求"、"forge-dev"、PRD 更新后需要进入开发阶段时使用。'
---

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
B=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/.claude/skills/gstack/browse/dist/browse" ] && B="$_ROOT/.claude/skills/gstack/browse/dist/browse"
[ -z "$B" ] && [ -x "$HOME/.claude/skills/gstack/browse/dist/browse" ] && B="$HOME/.claude/skills/gstack/browse/dist/browse"
[ -n "$B" ] && echo "浏览器工具: $B" || echo "浏览器工具: 不可用（QA 将以纯代码模式运行）"

# 检查 .do-dev 状态
[ -f "$_ROOT/.do-dev/state.json" ] && echo "发现未完成的开发流水线" && cat "$_ROOT/.do-dev/state.json"

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
- 不要在主上下文中重复子 skill 的工作
- 子 agent 完成后，读取其产出文档确认结果，而非依赖其返回的文本
- **传递 Feature Spec**：如果 PRD 中有 Feature Spec，SHALL 将其路径和关键内容（行为场景 + 验收检查表）传递给 forge-eng 和 forge-qa 子 agent
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
- **每个阶段结束保存检查点** — `git diff > .do-dev/checkpoints/phase-N-done.patch`
- **遇到阻塞不死等** — 记录阻塞原因，跳到下一个可执行阶段，在报告中标注

### 恢复模式（`--resume`）

读取 `.do-dev/state.json`，从上次中断的阶段继续：

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

### 状态文件

所有调度产出写入项目根目录的 `.do-dev/` 文件夹：

```
.do-dev/
├── state.json                    # 调度状态（持久化）
├── visual-decision.md            # UI/设计相关任务的视觉决策索引（可选）
├── checkpoints/
│   ├── design-done.patch         # 设计阶段完成后的代码状态
│   ├── eng-done.patch            # 工程阶段完成后的完整 diff
│   └── qa-done.patch             # QA 修复后的完整 diff
└── delivery-report.md            # 最终交付报告
```

### state.json 格式

```json
{
  "task": "需求描述",
  "mode": "auto|interactive",
  "type": "frontend|backend|fullstack",
  "branch": "分支名",
  "prd_version": "vX.Y",
  "started_at": "ISO 8601 时间",
  "phases": {
    "discussion": { "status": "pending|in_progress|done|skipped", "note": "" },
    "research": { "status": "pending|in_progress|done|skipped", "note": "" },
    "design": { "status": "pending|in_progress|done|skipped|blocked", "note": "" },
    "eng": { "status": "pending", "note": "" },
    "qa": { "status": "pending", "note": "" }
  }
}
```

**每次进入新阶段时：** 更新状态为 `in_progress`，写入 state.json。
**每次完成一个阶段时：** 更新状态为 `done`，保存检查点（自动模式）。

### 检查点保存

自动模式下，每个阶段完成后保存检查点：

```bash
mkdir -p .do-dev/checkpoints
git diff > .do-dev/checkpoints/[phase]-done.patch
git diff --stat >> .do-dev/checkpoints/[phase]-done.patch.summary
```

**回退方法（供用户手动使用）：**
```bash
git checkout -- .                                     # 清除当前工作区
git apply .do-dev/checkpoints/[phase]-done.patch      # 恢复到指定阶段
```

---

## 第-1步：Brainstorm 感知

在读取 PRD 之前，先检查项目是否有 PRD 和思考文档：

```
检查项目文档状态：
├── 有 PRD → 正常进入第0步
├── 无 PRD，有思考文档 →
│     AskUserQuestion:
│       "发现思考文档 [{文件名}]，但没有正式 PRD 和 Feature Spec。建议：
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

## 第0步：读取 PRD 输出 + Feature Spec 检查

1. 根据用户指定的项目目录，定位 PRD 文件：
   ```
   搜索模式：
   - {项目目录}/docs/PRD.md
   - {项目目录}/docs/*PRD*
   - {项目目录}/**/PRD*.md
   ```

2. 读取 PRD 的「迭代历史摘要」章节（最新版本），提取：
   - 变更概览
   - 迭代交付说明（前端/后端/设计/验收标准）
   - 受影响文件

3. **⚠️ Feature Spec 检查**：
   在 PRD 中搜索 `## Feature Spec` 章节。
   - **找到 Feature Spec** → 读取并提取行为场景（Given/When/Then）和验收检查表，作为开发的行为契约
   - **未找到 Feature Spec** → 通过 AskUserQuestion 警告：
     ```
     ⚠️ PRD 中没有 Feature Spec（含 Given/When/Then 验收场景）。
     没有 Feature Spec 意味着开发缺乏精确的行为锚点，可能导致实现偏离需求。
     
     A) 先运行 /forge-prd 生成 Feature Spec（推荐）
     B) 继续开发，但接受验收标准不够精确的风险
     ```
   - 用户选 A → 退出 forge-dev，引导用户运行 /forge-prd
   - 用户选 B → 继续，但在交付报告中标注「⚠️ 无 Feature Spec，验收标准可能不精确」

4. 搜索并读取 CHANGELOG（如有），了解本次变更的完整决策上下文

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

1. 读取 `../_shared/visual-decision-layer.md`，判断是否需要 Image 2、show-widget 或真实截图。
2. 若 PRD/brainstorm/DESIGN.md 已有视觉稿，汇总到 `.do-dev/visual-decision.md`。
3. 调度 `forge-design` 时明确要求完成 Image 2 视觉稿门禁；若无法生成，至少产出 prompt pack 并标注阻塞。
4. 调度 `forge-eng` / `forge-design-impl` 时传入 `.do-dev/visual-decision.md`，要求实现后用真实截图替换或对比视觉稿。
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

用户确认后，按计划执行。**核心变化：使用 Agent 工具在独立上下文中执行每个子 skill。**

### Wave 分组

分析子 skill 间的依赖关系，将可并行的分为同一 wave：

```
Wave 1（可并行）：
  - forge-design（如需要）— 读取 PRD + RESEARCH.md

Wave 2（依赖 Wave 1）：
  - forge-eng — 读取 PRD + DESIGN.md + RESEARCH.md

Wave 3（依赖 Wave 2）：
  - forge-qa — 读取 PRD + ENGINEERING.md + 代码
```

**注意**：在当前架构中 forge-design → forge-eng → forge-qa 是严格顺序依赖的，所以实际是 3 个 wave 各 1 个 skill。但如果未来有多个并行的 forge-eng 任务（如前端和后端互不依赖），可以归入同一 wave 并行执行。

### 每个子 skill 的调度方式

使用 Agent 工具启动独立上下文：

```python
# 伪代码示意
for wave in waves:
    agents = []
    for skill in wave.skills:
        agent = Agent(
            prompt=f"""
            你是 {skill.name} 技能，现在执行以下任务：

            项目路径：{project_path}
            PRD 路径：{prd_path}
            本次变更：{change_summary}
            调研报告：{research_path}
            前序产出：{previous_outputs}
            用户偏好：{context_path}
            视觉决策索引：{visual_decision_path or "无"}

            请按照你的 SKILL.md 流程执行。
            """,
            subagent_type="general-purpose"
        )
        agents.append(agent)
    # 同一 wave 内的 agent 并行启动
    # 等待所有 agent 完成后进入下一 wave
```

### 子 skill 执行后的验收

每个子 skill（Agent）完成后：

1. **读取产出文档** — 确认文档已正确更新（DESIGN.md / ENGINEERING.md / QA.md）
2. **读取代码变更** — `git diff --stat` 确认变更范围合理
3. **保存检查点**（自动模式）：`git diff > .do-dev/checkpoints/[phase]-done.patch`
4. **阶段确认**（交互模式）：向用户简要汇报，确认是否继续下一个 wave

### 阻塞处理

某个子 skill 执行中遇到问题时：
- **交互模式**：暂停并通过 AskUserQuestion 询问用户
  - A) 修正后重试（重新启动 Agent）
  - B) 跳过此环节继续下一个 wave
  - C) 中止，保存当前进度
- **自动模式**：记录阻塞原因，跳到下一个可执行阶段，在交付报告中标注

---

## 第5步：汇总交付

所有子技能完成后，输出交付总结：

```
+================================================================+
|                      开发交付完成                                 |
+================================================================+
| 项目：[项目名]                                                    |
| PRD 版本：vX.Y                                                   |
| 项目类型：[frontend / backend / fullstack]                        |
| 模式：[交互 / 自动]                                               |
+----------------------------------------------------------------+
| Discussion：[完成/跳过] — CONTEXT.md [已生成/已跳过]               |
| Research：[完成/跳过] — RESEARCH.md [已生成/已跳过]                |
+----------------------------------------------------------------+
| 执行的子技能（独立上下文）：                                        |
|   forge-design  — [完成/跳过/阻塞] — DESIGN.md [已更新/已创建]        |
|   forge-eng     — [完成/跳过/阻塞] — ENGINEERING.md [已更新/已创建]   |
|   forge-qa      — [完成/跳过/阻塞] — QA.md [已更新/已创建]            |
+----------------------------------------------------------------+
| 代码变更：X 个文件（新增 Y / 修改 Z）                               |
| Git 提交：N 个原子提交                                             |
| 测试结果：[通过/有遗留问题]                                        |
| 健康评分：XX/100                                                  |
| 上线就绪：✅ / ⚠️ / ❌                                             |
+----------------------------------------------------------------+
| [自动模式] 检查点：                                                |
|   .do-dev/checkpoints/design-done.patch                          |
|   .do-dev/checkpoints/eng-done.patch                             |
|   .do-dev/checkpoints/qa-done.patch                              |
+================================================================+
```

写入 `.do-dev/delivery-report.md`，更新 state.json 所有阶段标记为 `done`。

### 验收操作清单（必须产出）

每次实现完成后，**必须**输出一份面向用户的验收操作清单。用户会按照清单逐步操作确认修复效果。格式如下：

```
## 验收操作清单

### 改动说明
逐条列出本次所有代码改动，每条包含：
- **文件**：文件路径 + 行号范围
- **改了什么**：用一句话说清楚改动内容（不用代码术语，用户能理解的语言）
- **为什么改**：对应 PRD 的哪个变更项（如 G1、G2）

### 验收步骤
编号列出用户需要执行的操作步骤，每步包含：
1. **操作**：具体要做什么（如"打开频道页 → 点击 B 站 → 点击展开更多"）
2. **预期结果**：正确行为是什么（如"页面不跳动，停留在原位"）
3. **对比旧行为**：修复前是什么样的（如"之前会跳到 B 站所有卡片的最底部"）

### 回归检查
列出需要额外确认没有被破坏的功能点（如"收起按钮仍正常滚动到 section 顶部"）
```

**规则：**
- 验收步骤必须覆盖 PRD 变更清单中的每一项
- 每个步骤必须具体到可操作（不能写"检查展开功能"，要写"打开频道页 → 点击 B 站 → 点击展开更多"）
- 如果变更涉及多个 Tab/Section，必须列出所有需要检查的位置
- 回归检查覆盖相关联的未修改功能

### 出口建议（交付完成后）

交付报告产出后，通过 AskUserQuestion 建议下一步：

```
开发交付完成。建议下一步：

A) /forge-review — PR 审查，检查结构性问题
B) /forge-ship — 直接发布（适合小改动，跳过审查）
C) /forge-fupan — 先复盘再发布（推荐，沉淀经验）
D) 继续迭代 — 还有功能要加
E) /forge — 不确定，让 Forge 帮我判断
```

---

## 单独调用模式

用户也可以直接指定调用某个子技能：

- `/forge-design` — 只执行设计环节
- `/forge-eng` — 只执行工程环节
- `/forge-qa` — 只执行 QA 验收

单独调用时，子技能会自行读取 PRD 和已有的领域文档，不需要经过调度器。

---

## Feature 状态管理（.features/ 架构）

### 核心原则

**领域文档只存内容，不存运行状态。** 所有运行状态集中在 `.features/{feature-id}/status.md`，按 feature 隔离，支持多会话并行。

### 状态标记协议

| 标记 | 含义 |
|------|------|
| `[⏳ 待处理]` | 已规划，未开始 |
| `[🔄 进行中]` | 当前正在执行 |
| `[✅ 已完成]` | 执行完成 |
| `[❌ 失败]` | 执行失败，需干预 |
| `[⏸️ 暂停]` | 等待用户确认或外部依赖 |

### 调度器的状态管理职责

forge-dev 作为调度器，承担三重职责：

#### 1. 管理自身状态（state.json + status.md）

state.json 用于调度器内部的阶段跟踪（discussion/research/dispatch 等）。
同时通过 `.features/{feature-id}/status.md` 暴露全局可见的 Pipeline 状态。

#### 2. 孤儿检测（启动时）

```
第0步启动时：
  → 读取 .features/_registry.md
  → 遍历所有 status == active 的 feature
  → 如果某 feature 的 heartbeat 超过 30 分钟：
    → 警告用户："Feature X 已 30+ 分钟无心跳，上次活跃 skill: Y"
    → 选项：A) 认领继续  B) 标记为 abandoned  C) 忽略
```

#### 3. 感知子 skill 的运行状态

在调度子 skill 前后，**读取 `.features/{feature-id}/status.md` 的 Pipeline 表**：

```
调度 forge-design 前：
  → 读取 status.md → 确认 prd 行为 [✅ 已完成]
  → 如果 prd 行为 [🔄 进行中]，暂停并提示用户

调度 forge-eng 前：
  → 读取 status.md → 确认 design 行为 [✅ 已完成] 或 skipped
  → 如果 design 行为 [🔄 进行中]，等待 forge-design 完成

调度 forge-qa 前：
  → 读取 status.md → 确认 eng 行为 [✅ 已完成]
  → 如果 eng 行有 Tasks 表中存在 [❌ 失败]，提示用户
```

#### 4. 汇总全局运行状态

在交付报告中，读取 `.features/{feature-id}/status.md` 汇总 Pipeline + Tasks + QA Items 的完整状态。

### 传递给子 skill 的状态指令

调度子 skill 时，在 Agent prompt 中加入状态管理指令：

```
状态管理要求：
1. Feature ID: {feature-id}
2. 状态文件: .features/{feature-id}/status.md
3. 注册表: .features/_registry.md
4. 开始执行时，更新 status.md Pipeline 表中对应行为 [🔄 进行中]
5. 每个阶段/任务的状态变更实时更新到 status.md
6. 完成时更新为 [✅ 已完成]，记录 completed 时间
7. 失败时标记 [❌ 失败] 并在 note 中写明原因
8. 每次状态变更都更新 _registry.md 中的 heartbeat
9. 不要在领域文档（DESIGN.md/ENGINEERING.md/QA.md）中写入任何运行状态
```

---

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
