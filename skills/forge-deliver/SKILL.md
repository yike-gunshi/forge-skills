---
name: forge-deliver
description: |
  端到端交付纯编排层。自身不实现任何业务逻辑，通过调用 forge-* 子 Skill 完成交付：
  forge-brainstorm → forge-prd → forge-design → forge-design-impl → forge-eng →
  forge-qa → forge-review → forge-ship → forge-doc-release。
  管理 .deliver/ 状态目录、state.json 检查点、子 Skill 间的文档传递。
  两种模式：--auto（前置沟通后全自动）、交互模式（关键节点暂停确认）。
  支持 --resume 从检查点恢复。
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - AskUserQuestion
  - Agent
---

# /forge-deliver v2：端到端交付编排层

一句话描述你的想法，拿到完整交付。

---

## 三条铁律

1. **编排不实现** — deliver 不写任何业务逻辑、不做设计、不写代码。所有领域工作由对应 forge-* 子 Skill 完成。deliver 只负责：调度顺序、传递输入输出、管理状态。
2. **状态必持久** — 每个 Phase 完成必须更新 state.json + 保存检查点。崩溃后 `--resume` 能从任意 Phase 恢复。
3. **证据先于断言** — 每个 Phase 完成必须有可验证的产出文件。不接受"已完成"的口头声明，必须检查文件存在且非空。

---

## 前置脚本（每次先运行）

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
echo "当前分支: $_BRANCH"
echo "项目根目录: $_ROOT"

# 检测项目环境
[ -f "$_ROOT/package.json" ] && echo "检测到: Node.js 项目" && head -5 "$_ROOT/package.json"
[ -f "$_ROOT/requirements.txt" ] && echo "检测到: Python 项目"
[ -f "$_ROOT/go.mod" ] && echo "检测到: Go 项目"
[ -f "$_ROOT/Cargo.toml" ] && echo "检测到: Rust 项目"
[ -f "$_ROOT/Makefile" ] && echo "检测到: Makefile"

# 检查 .deliver 状态
if [ -f "$_ROOT/.deliver/state.json" ]; then
  echo "====== 发现未完成的交付流水线 ======"
  cat "$_ROOT/.deliver/state.json"
  echo ""
  echo "提示：使用 --resume 从检查点恢复"
fi
```

---

## 参数解析

从用户输入中解析：

| 参数 | 默认值 | 示例 |
|------|--------|------|
| 模式 | 交互 | `--auto`（全自动） |
| 需求 | 用户输入的文字 | `"给信息雷达加 RSS 订阅"` |
| 恢复 | 否 | `--resume`（从检查点恢复） |

---

## 模式说明

### 交互模式（默认）

在 3 个硬卡点暂停等待用户确认：
1. **Phase 0 完成后** — 需求方案确认
2. **Phase 2 完成后** — 工程实现确认
3. **Phase 7** — 验收报告交付

其他 Phase 自动推进，遇到不确定问题时用 AskUserQuestion 询问。

### 自动模式（`--auto`）

**前置沟通（1-2 轮，必须）：**

执行任何阶段之前，先完成前置沟通。这不是可选的。

**第 1 轮（必选）— 需求对齐：**
通过 AskUserQuestion 确认：
- "我理解你要做的是 [复述需求]，对吗？"
- "项目类型判断：[frontend / backend / fullstack]"（决定是否跳过 Phase 1 的设计部分）
- "我的方案大纲是：[1-3 句话概括方案方向]"
- "预计影响 [N 个文件 / 新建 N 个文件]"

**第 2 轮（按需）— 依赖确认：**
只在以下情况触发：
- 检测到需要外部依赖（API key、数据库、第三方服务）
- 需求存在歧义
- 项目结构复杂（多个入口、微服务架构）

**前置沟通完毕后：** 全自动执行 Phase 0-7，不再暂停。

**自动模式特殊规则：**
- **不 git commit** — 代码改动只存在于工作区
- **每个阶段结束保存检查点** — `git diff > .deliver/checkpoints/phase-N-done.patch`
- **文档产出实时写入** `.deliver/` 目录
- **遇到阻塞不死等** — 记录阻塞原因，跳到下一个可执行阶段，在验收报告中标注

---

## 恢复模式（`--resume`）

读取 `.deliver/state.json`，从上次中断的阶段继续：

```bash
cat .deliver/state.json
```

1. 显示当前进度摘要
2. 通过 AskUserQuestion 确认："上次停在 Phase X，要从这里继续吗？"
3. 选项：
   - A) 从 Phase X 继续
   - B) 从 Phase Y 重新开始（选择具体阶段）
   - C) 全部重来

---

## 状态管理

### .deliver/ 目录结构

```
.deliver/
├── state.json                    # 流水线状态（持久化）
├── requirement.md                # Phase 0 产出（forge-prd）
├── visual-decision.md            # UI/设计任务的视觉决策索引（可选）
├── design.md                     # Phase 1 产出（forge-design，可能不存在）
├── design-impl-report.md         # Phase 1 产出（forge-design-impl，可能不存在）
├── eng-report.md                 # Phase 2 产出（forge-eng）
├── qa-report.md                  # Phase 3 产出（forge-qa）
├── review-report.md              # Phase 4 产出（forge-review）
├── ship-report.md                # Phase 5 产出（forge-ship）
├── doc-release-report.md         # Phase 6 产出（forge-doc-release）
├── acceptance-report.md          # Phase 7 最终验收报告
└── checkpoints/
    ├── phase-0-done.patch
    ├── phase-1-done.patch
    ├── phase-2-done.patch
    ├── phase-3-done.patch
    ├── phase-4-done.patch
    ├── phase-5-done.patch
    └── phase-6-done.patch
```

### state.json 格式

```json
{
  "task": "需求描述",
  "mode": "auto|interactive",
  "type": "frontend|backend|fullstack",
  "branch": "分支名",
  "started_at": "ISO 8601 时间",
  "current_phase": 0,
  "qa_loop_count": 0,
  "phases": {
    "0": { "name": "需求理解",  "skill": "forge-brainstorm + forge-prd", "status": "pending", "output": "", "note": "" },
    "1": { "name": "设计",      "skill": "forge-design + forge-design-impl", "status": "pending", "output": "", "note": "" },
    "2": { "name": "工程",      "skill": "forge-eng", "status": "pending", "output": "", "note": "" },
    "3": { "name": "QA",        "skill": "forge-qa", "status": "pending", "output": "", "note": "" },
    "4": { "name": "审查",      "skill": "forge-review", "status": "pending", "output": "", "note": "" },
    "5": { "name": "发布",      "skill": "forge-ship", "status": "pending", "output": "", "note": "" },
    "6": { "name": "文档",      "skill": "forge-doc-release", "status": "pending", "output": "", "note": "" },
    "7": { "name": "验收",      "skill": "（deliver 自身汇总）", "status": "pending", "output": "", "note": "" }
  }
}
```

### 状态流转规则

**进入阶段时：**
1. 将该阶段标记为 `in_progress`
2. 更新 `current_phase`
3. 写入 state.json

**完成阶段时：**
1. 验证产出文件存在且非空（铁律 3）
2. 将该阶段标记为 `done`，记录产出文件路径到 `output`
3. 写入 state.json
4. 保存检查点

### 检查点保存

每个 Phase 完成后保存检查点：

```bash
mkdir -p .deliver/checkpoints
git diff > .deliver/checkpoints/phase-N-done.patch
echo "Phase N checkpoint saved at $(date -u +%Y-%m-%dT%H:%M:%SZ)" > .deliver/checkpoints/phase-N-done.patch.summary
git diff --stat >> .deliver/checkpoints/phase-N-done.patch.summary
```

**回退方法（供用户手动使用）：**
```bash
git checkout -- .                              # 清除当前工作区
git apply .deliver/checkpoints/phase-N-done.patch  # 恢复到阶段 N
```

---

## AskUserQuestion 格式规范

每次提问结构：
1. **重新聚焦**：当前项目、分支、流水线阶段、在做什么
2. **通俗解释**：高中生能懂的语言描述问题
3. **给出建议**：推荐选项 + 一句话原因
4. **列出选项**：`A) B) C)` + 工作量估算（如适用）

---

# ========================================
# 流水线阶段定义（8 个 Phase）
# ========================================

## Phase 0：需求理解

**调用子 Skill：** `forge-brainstorm`（可选）→ `forge-prd`

**编排逻辑：**

1. **判断是否需要头脑风暴**
   - 用户需求模糊、方向不明确 → 先调用 `forge-brainstorm` 讨论，产出思考文档
   - 用户需求清晰 → 跳过 brainstorm，直接进入 forge-prd

2. **调用 forge-prd**
   - 输入：用户需求描述（+ brainstorm 产出，如有）
   - 指令：让 forge-prd 产出/更新 PRD 和 CHANGELOG
   - 期望产出：项目中的 PRD.md（或等效文档）已更新

3. **收集 forge-prd 产出，写入 .deliver/**
   - 将 PRD 核心内容（目标、用户故事、功能点、约束条件、项目类型）摘要到 `.deliver/requirement.md`
   - 确定项目类型：`frontend / backend / fullstack`

4. **产出验证**
   - 检查 `.deliver/requirement.md` 存在且非空
   - 检查项目类型已确定

5. **[交互模式] 硬卡点暂停**
   通过 AskUserQuestion：
   - "需求理解完成。项目类型：[type]。核心目标：[一句话]。继续进入设计/工程阶段？"
   - A) 继续
   - B) 调整需求后继续
   - C) 重新讨论（回到 brainstorm）

6. 更新 state.json，进入 Phase 1（或 Phase 2，如果 `type == "backend"`）

---

## Phase 1：设计

**跳过条件：** `type == "backend"` 时跳过，在 state.json 中标记为 `skipped`。

**调用子 Skill：** `forge-design` → `forge-design-impl`

**编排逻辑：**

1. **调用 forge-design**
   - 输入：指向项目中的 PRD.md
   - 指令：让 forge-design 产出/更新 DESIGN.md；如涉及前端页面、组件、状态或布局，必须执行 Image 2 视觉稿门禁（见 `../_shared/visual-decision-layer.md`）
   - 期望产出：项目中的 DESIGN.md 已更新

2. **调用 forge-design-impl**
   - 输入：指向项目中的 DESIGN.md
   - 指令：让 forge-design-impl 将设计规范转化为样式代码；若有 Image 2 视觉稿，作为观感参考，最终用真实截图验证
   - 期望产出：样式/布局代码已实现

3. **收集产出**
   - 将设计摘要写入 `.deliver/design.md`
   - 将实现报告写入 `.deliver/design-impl-report.md`
   - 如有视觉稿/真实截图，将路径、prompt、确认结论汇总写入 `.deliver/visual-decision.md`

4. **产出验证**
   - 检查项目中 DESIGN.md 存在
   - 检查设计代码已写入

5. 更新 state.json + 保存检查点，进入 Phase 2

---

## Phase 2：工程

**调用子 Skill：** `forge-eng`

forge-eng 是一个重量级 Skill，内部自行完成：文档管理、Worktree 隔离、任务拆分、TDD、Wave 执行、Verification Gate。deliver 只需要启动它并收集结果。

**编排逻辑：**

1. **调用 forge-eng**
   - 输入：指向项目中的 PRD.md、DESIGN.md（如有）、ENGINEERING.md（如有）
   - 指令：让 forge-eng 完成工程方案设计和代码实现
   - 模式提示：如果是 deliver 自动模式，建议 forge-eng 使用轻量模式（跳过文档直接实现），除非是新项目
   - 期望产出：ENGINEERING.md 已更新 + 代码已实现 + 测试通过

2. **收集产出**
   - 将工程摘要（架构、实现清单、测试结果）写入 `.deliver/eng-report.md`

3. **产出验证**
   - 检查 `.deliver/eng-report.md` 存在且非空
   - 检查 forge-eng 报告中测试是否通过

4. **[交互模式] 硬卡点暂停**
   通过 AskUserQuestion：
   - "工程实现完成。共修改/新增 X 个文件。测试 [通过/失败]。要继续 QA 还是先看看代码？"
   - A) 继续进入 QA
   - B) 让我先看看代码（暂停）
   - C) 有问题需要调整

5. 更新 state.json + 保存检查点，进入 Phase 3

---

## Phase 3：QA

**调用子 Skill：** `forge-qa`

forge-qa 是纯验收模式：只测不修。发现的 Bug 回 forge-eng 修复。

**编排逻辑：**

1. **调用 forge-qa**
   - 输入：指向项目中的 PRD.md、ENGINEERING.md
   - 指令：让 forge-qa 执行测试计划并产出 QA 报告
   - 期望产出：QA.md 或测试报告

2. **检查 QA 结果**
   - 读取 forge-qa 的报告
   - 如果发现 Bug：

3. **QA-Eng 修复循环**（最多 2 轮）
   ```
   forge-qa 发现 Bug
     → 调用 forge-eng 修复（传入 Bug 清单）
     → 再次调用 forge-qa 验证
     → 如果还有 Bug 且循环次数 < 2，重复
     → 如果循环次数 >= 2，记录遗留 Bug 到报告，继续
   ```
   - 每轮循环更新 `state.json` 中的 `qa_loop_count`

4. **收集产出**
   - 将 QA 摘要（测试方式、Bug 统计、健康评分）写入 `.deliver/qa-report.md`

5. **产出验证**
   - 检查 `.deliver/qa-report.md` 存在且非空

6. 更新 state.json + 保存检查点，进入 Phase 4

---

## Phase 4：审查

**调用子 Skill：** `forge-review`

**编排逻辑：**

1. **调用 forge-review**
   - 输入：当前分支的 diff（forge-review 会自行收集）
   - 指令：让 forge-review 执行代码审查，发现问题直接修复
   - 期望产出：审查完成，问题已修复

2. **收集产出**
   - 将审查摘要（发现问题数、修复数、安全问题）写入 `.deliver/review-report.md`

3. **产出验证**
   - 检查 `.deliver/review-report.md` 存在且非空

4. 更新 state.json + 保存检查点，进入 Phase 5

---

## Phase 5：发布

**调用子 Skill：** `forge-ship`

**编排逻辑：**

### 自动模式

跳过 git commit/push/PR。在 state.json 中标记为 `done`，附注："自动模式不创建 PR，代码在工作区中，用户验收后决定。"

将跳过说明写入 `.deliver/ship-report.md`。

### 交互模式

1. **调用 forge-ship**
   - 输入：forge-ship 会自行检测未提交更改、远程分支状态
   - 指令：让 forge-ship 完成提交、推送、创建 PR
   - 期望产出：PR 已创建（或代码已推送）

2. **收集产出**
   - 将发布摘要（PR URL、提交数、CHANGELOG 更新）写入 `.deliver/ship-report.md`

3. **产出验证**
   - 检查 `.deliver/ship-report.md` 存在且非空

4. 更新 state.json + 保存检查点，进入 Phase 6

---

## Phase 6：文档

**调用子 Skill：** `forge-doc-release`

**编排逻辑：**

1. **调用 forge-doc-release**
   - 输入：forge-doc-release 会自行扫描项目文档和 diff
   - 指令：让 forge-doc-release 更新项目文档使之匹配已发布内容
   - 期望产出：项目文档已更新

2. **收集产出**
   - 将文档更新摘要写入 `.deliver/doc-release-report.md`

3. **产出验证**
   - 检查 `.deliver/doc-release-report.md` 存在且非空

4. 更新 state.json + 保存检查点，进入 Phase 7

---

## Phase 7：验收

**调用子 Skill：** 无（deliver 自身汇总所有子 Skill 产出）

这是唯一一个 deliver 自己执行的阶段——但它只做汇总，不做领域工作。

**编排逻辑：**

1. **读取所有前序产出**
   ```bash
   ls -la .deliver/*.md .deliver/checkpoints/ 2>/dev/null
   cat .deliver/state.json
   ```

2. **产出 `.deliver/acceptance-report.md`**

```markdown
# 验收报告

## 基本信息
| 字段 | 值 |
|------|---|
| **任务** | {从 state.json 读取} |
| **模式** | {auto / interactive} |
| **项目类型** | {frontend / backend / fullstack} |
| **开始时间** | {从 state.json 读取} |
| **完成时间** | {当前时间} |
| **分支** | {从 state.json 读取} |

## 流水线执行摘要
| Phase | 名称 | 子 Skill | 状态 | 产出文件 | 备注 |
|-------|------|----------|------|----------|------|
| 0 | 需求理解 | forge-prd | {status} | {output} | {note} |
| 1 | 设计 | forge-design + forge-design-impl | {status} | {output} | {note} |
| 2 | 工程 | forge-eng | {status} | {output} | {note} |
| 3 | QA | forge-qa | {status} | {output} | {note} |
| 4 | 审查 | forge-review | {status} | {output} | {note} |
| 5 | 发布 | forge-ship | {status} | {output} | {note} |
| 6 | 文档 | forge-doc-release | {status} | {output} | {note} |
| 7 | 验收 | deliver | done | acceptance-report.md | — |

## 需求回顾
{从 .deliver/requirement.md 提取核心目标}

## 工程摘要
{从 .deliver/eng-report.md 提取：架构、实现文件数、测试结果}

## QA 结果
{从 .deliver/qa-report.md 提取}
- 测试方式：{浏览器 / 纯代码 / 自动化测试}
- Bug 统计：发现 X，修复 Y，遗留 Z
- QA 循环次数：{qa_loop_count}

## 代码审查结果
{从 .deliver/review-report.md 提取}
- 发现问题：X 个，修复 Y 个
- 安全问题：{有/无}

## 发布状态
{从 .deliver/ship-report.md 提取}
- [自动模式] 代码在工作区中，未提交。检查点可用。
- [交互模式] PR：{URL}

## 文档更新
{从 .deliver/doc-release-report.md 提取}

## 已知遗留
{汇总各阶段的遗留问题：未修复的 Bug、跳过的 Phase、阻塞项}

## 检查点清单
| 阶段 | 检查点文件 | 大小 |
|------|-----------|------|
{列出 .deliver/checkpoints/ 中所有文件}

## 下一步建议
{基于遗留问题和项目状态，建议 1-3 个后续动作}
```

3. **输出总结给用户**

```
+================================================================+
|                        交付完成                                  |
+================================================================+
| 任务：{一句话}                                                   |
| 阶段：8/8 完成（跳过 X 个）                                      |
| QA：发现 X / 修复 Y / 遗留 Z                                    |
| 发布状态：{PR URL / 代码在工作区}                                  |
| 验收报告：.deliver/acceptance-report.md                           |
+================================================================+
```

4. 更新 state.json，所有阶段标记为 `done`

---

## 重要规则

### 编排规则（最高优先级）
- **deliver 不写代码** — 所有代码由 forge-eng / forge-design-impl 完成
- **deliver 不做设计** — 所有设计由 forge-design 完成
- **deliver 不做测试** — 所有测试由 forge-qa 完成
- **deliver 不做审查** — 所有审查由 forge-review 完成
- **deliver 只做三件事** — 调度子 Skill、传递文档、管理状态

### 子 Skill 调用规则
- **输入明确** — 调用子 Skill 时，明确告知它需要读取哪些文件
- **产出收集** — 子 Skill 完成后，将关键信息摘要到 .deliver/ 对应文件
- **失败处理** — 子 Skill 报告失败时，记录原因到 state.json 的 note 字段，决定是重试、跳过还是终止

### 自动模式规则
- **前置沟通不可省略** — "自动"是沟通完毕后的执行自动，不是跳过沟通
- **绝不 git commit** — 代码改动只在工作区，检查点用 patch 保存
- **遇阻不死等** — 记录阻塞原因，跳到可执行阶段，在报告中标注

### 交互模式规则
- **3 个硬卡点必须暂停** — Phase 0 后、Phase 2 后、Phase 7
- **其他阶段有问题才问** — 不要每一步都暂停确认

### 质量规则
- **一个想法，一个交付** — 不在一次流水线中塞入多个不相关功能
- **每个阶段的产出是下个阶段的输入** — 严格按顺序执行
- **状态文件实时更新** — 每次阶段状态变更都写 state.json
