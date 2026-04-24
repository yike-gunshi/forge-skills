---
name: forge-eng
description: '工程文档管理与代码实现。管理项目的 ENGINEERING.md 和 ENGINEERING-CHANGELOG，涵盖前端和后端。支持完整模式（文档+审查+实现）和轻量模式（跳过文档直接实现）。集成 Worktree 会话级隔离、分级 TDD（严格/轻量/验证驱动）、Verification Gate（证据先于断言）。基于 PRD 和 DESIGN.md 产出架构设计、数据流、API 设计、实现清单、测试矩阵，与用户确认关键技术决策后将实现拆分为原子任务、Wave 并行执行、每个任务独立 git commit。触发方式：用户说"工程"、"实现"、"forge-eng"、forge-dev 调度器调用、需要实现代码变更时使用。'
---

# /forge-eng：工程文档管理与代码实现 v2

管理项目的 ENGINEERING.md（前后端合并），基于 PRD + DESIGN.md 产出工程方案并实现。
集成 Worktree 隔离、分级 TDD、Verification Gate。

## 流程总览

```
完整模式：
  第0步 定位文档 → 第0.5步 模式选择 → 第1步 范围挑战 → 第2步 理解现状
  → 第3步 四章审查 → 第4步 方案设计 → 第5步 更新文档
  → 第5.5步 创建Worktree → 第5.6步 Dev Server 端口契约 → 第5.7步 测试框架检测
  → 第6步 任务拆分(含TDD级别) → 第7步 Wave执行(TDD+Verification)
  → 第8步 必需产出 → 第9步 确认总结 → 第10步 分支收尾

轻量模式：
  第0步 定位文档 → 第0.5步 模式选择
  → 第5.5步 创建Worktree → 第5.6步 Dev Server 端口契约 → 第5.7步 测试框架检测
  → 第6步 任务拆分(含TDD级别) → 第7步 Wave执行(TDD+Verification)
  → 第9步 确认总结 → 第10步 分支收尾
```

全程中文。关键技术决策需用户确认后再实现。

---

## AskUserQuestion 格式规范

**每次提问必须遵循以下结构：**

1. **重新聚焦**：说明当前项目、分支和正在设计/实现的内容。（1-2句）
2. **通俗解释**：用高中生能听懂的语言解释问题。说清楚"做什么"，不是"叫什么"。
3. **给出建议**：`推荐：选择[X]，因为[一句话原因]`。标注每个选项的`完整度：X/10`。
4. **列出选项**：`A) ... B) ... C) ...`——涉及工作量时同时注明：`（人工：~X / AI协助：~Y）`

---

## 完整性原则——把湖烧干

有 AI 辅助时，"做完整"的边际成本接近于零：

| 任务类型 | 人工团队 | AI辅助 | 压缩比 |
|---------|---------|-------|-------|
| 样板/脚手架 | 2天 | 15分钟 | ~100x |
| 写测试 | 1天 | 15分钟 | ~50x |
| 功能实现 | 1周 | 30分钟 | ~30x |
| Bug修复+回归测试 | 4小时 | 15分钟 | ~20x |
| 架构/设计 | 2天 | 4小时 | ~5x |
| 调研/探索 | 1天 | 3小时 | ~3x |

当完整方案只比捷径多几分钟时，永远推荐完整方案。

---

## 工程思维框架

1. **爆炸半径直觉** — 每个决定都评估："最坏情况是什么？影响多少系统和人？"
2. **无聊优先** — "每个公司大约只有三个创新机会。"其他一切用成熟技术。
3. **增量而非革命** — 绞杀者模式而非大爆炸。灰度发布而非全量切换。
4. **系统而非英雄** — 为凌晨3点疲惫的工程师设计。
5. **可逆性偏好** — 功能开关、A/B测试、灰度发布。让犯错的代价变低。
6. **DX就是产品质量** — 慢 CI、糟糕的本地开发环境 → 更差的软件。
7. **先让修改变简单，再做简单的修改** — 先重构，再实现。永远不要同时改结构和行为。

---

## 三条铁律（来自 Superpowers，不可违反）

1. **不先验证就不准声称完成** — 必须运行验证命令、读取完整输出、确认 exit code 后才能 commit 或声称成功。禁用"should work"、"probably fixed"等措辞。详见 [references/verification-checklist.md](references/verification-checklist.md)。
2. **不先写失败测试就不准写实现**（严格 TDD 级别适用）— 写了实现再补测试？删掉实现，从测试重新开始。详见 [references/tdd-guide.md](references/tdd-guide.md)。
3. **3 次修复失败就质疑架构** — 不要尝试第 4 次修复，停下来和用户讨论设计方案是否有根本问题。

---

## 第0步：定位项目文档

1. 定位 PRD：搜索 `{项目目录}/docs/PRD.md`
2. 定位 DESIGN.md：搜索 `{项目目录}/docs/DESIGN.md`
3. 定位 RESEARCH.md：搜索 `{项目目录}/docs/*RESEARCH*`（如果 forge-dev 产出了调研报告）
4. 定位 ENGINEERING.md：
   ```
   搜索模式：
   - {项目目录}/docs/ENGINEERING.md
   - {项目目录}/docs/*engineering*（不区分大小写）
   - {项目目录}/docs/*工程*
   - {项目目录}/**/ENGINEERING*.md
   ```
5. 定位 ENGINEERING CHANGELOG：模式匹配 `*engineering*changelog*`
6. 分支判断：有 → 迭代模式；无 → 创建模式

---

## 第0.5步：模式选择

根据项目状态自动判断，或通过 AskUserQuestion 确认：

```
检查是否有 PRD + ENGINEERING.md
  ├── 有 → 默认完整模式
  └── 无 → 提议选择：
        A) 完整模式 — 创建工程文档，走完整流程（适合正式项目）
        B) 轻量模式 — 跳过文档管理，只做：
           Worktree 隔离 → 任务拆分 → TDD/验证驱动 → 原子提交 → 收尾
           （适合小 demo、POC、快速实验）
```

**轻量模式保留的能力**：Worktree 隔离、任务拆分、TDD/验证驱动、原子 commit、分支收尾。
**轻量模式跳过的内容**：ENGINEERING.md 管理、四章审查、CHANGELOG、.features/ 状态管理。

**如果选择轻量模式**：跳转到第 5.5 步（创建 Worktree）。

---

## 第1步：范围挑战

**在设计任何方案之前，先回答这些问题：**

1. **哪些现有代码已经部分或完全解决了每个子问题？** 能复用还是在重建？
2. **实现目标所需的最小变更集是什么？** 哪些工作可以推迟而不阻碍核心目标？
3. **复杂度检查**：如果方案涉及超过 8 个文件或引入超过 2 个新类/服务，视为警告信号——同样的目标能用更少的活动部件实现吗？
4. **TODOS 交叉检查**：读取 `TODOS.md`（如果存在）。有没有推迟项在阻塞此方案？有没有推迟项可以顺带做了？

**完整度检查**：方案是在做完整版还是捷径版？用 AI 辅助，"完整"比人工便宜 100 倍。如果方案选择了捷径而只省了几分钟，推荐做完整版。

如果复杂度检查触发（8+ 文件或 2+ 新类/服务）：通过 AskUserQuestion 主动建议缩减范围。

---

## 第2步：理解现状（迭代模式）

1. 读取 PRD 最新迭代摘要，提取工程相关变更
2. 读取 DESIGN.md（如有），提取设计约束
3. 读取 RESEARCH.md（如有），提取技术调研结论
4. 读取完整 ENGINEERING.md
5. 读取 ENGINEERING CHANGELOG（如有），做热点分析
6. 用 Agent(Explore) 扫描项目源码，理解当前架构
7. 向用户总结当前工程状态，确认理解是否正确

---

## 第2步（替代）：从零创建 ENGINEERING.md

1. **深度阅读项目代码**：
   - Agent(Explore) 扫描项目结构
   - 读取核心源码、配置文件、数据库 schema
   - 分析前后端代码组织方式
   - 查看 git log 了解架构演进

2. **与用户多轮确认**：
   - 第1轮：架构概览 — 展示 ASCII 架构图，确认是否准确
   - 第2轮：技术栈确认 — 列出检测到的框架/库/工具
   - 第3轮：模块划分 — 前端模块 + 后端模块的边界确认
   - 第4轮：数据流 — 关键数据流的流转路径
   - 第5轮：已知技术债 — 当前代码中的问题

3. **产出 ENGINEERING.md 初稿**（参考 [references/engineering-template.md](references/engineering-template.md)）
4. **新建 ENGINEERING CHANGELOG**
5. 逐节确认后写入文件

---

## 第3步：四章工程审查

章节顺序：架构 → 代码质量 → 测试 → 性能。
每个章节发现问题后，逐一通过 AskUserQuestion 确认后再进入下一章节。

### 第1章：架构审查

评估：
- 整体系统设计和组件边界
- 依赖关系图和耦合问题
- 数据流模式和潜在瓶颈
- 扩展性和单点故障
- 安全架构（认证、数据访问、API 边界）
- 关键流程是否值得用 ASCII 图说明
- 对每个新代码路径，描述一个真实的生产故障场景

**停止**。每发现一个问题，单独调用 AskUserQuestion。每次一个问题。

### 第2章：代码质量审查

评估：
- 代码组织和模块结构
- DRY 违反——要有侵略性
- 错误处理模式和缺失的边界情况
- 技术债热点
- 被修改文件中已有的 ASCII 图——改动后还准确吗？

**停止**。每个问题单独 AskUserQuestion。

### 第3章：测试审查

画出所有新 UX、新数据流、新代码路径、新的分支逻辑的图。对每一项，确认是否有对应测试。

**测试矩阵产出**：审查完成后，把测试矩阵写入工程文档，供 `/forge-qa` 使用。

**停止**。每个问题单独 AskUserQuestion。

### 第4章：性能审查

评估：
- N+1 查询和数据库访问模式
- 内存使用问题
- 缓存机会
- 高时间复杂度代码路径

**停止**。每个问题单独 AskUserQuestion。

---

## 第4步：工程方案设计

### 需要用户确认的关键技术决策

对每个变更点，通过 AskUserQuestion 确认：

1. **架构设计**：用 ASCII 图展示模块关系和数据流
2. **技术选型**：涉及新依赖或新模式时，说明选型理由
3. **实现清单**：按依赖顺序列出需要创建/修改的文件及其职责
4. **API 设计**：新增/修改的 API 端点定义
5. **测试矩阵**：需要覆盖的测试场景

### 不需要用户确认的内容

- 具体代码实现细节
- 变量命名、函数签名
- 错误处理的具体策略（遵循项目已有模式）

---

## 第5步：更新工程文档

### A. 更新 ENGINEERING CHANGELOG

追加本次变更记录：时间、背景、技术方案、关键决策。

### B. 更新 ENGINEERING.md

1. 更新版本号、日期
2. 更新迭代摘要区（保留所有版本）
3. 前端章节：更新组件/页面/交互实现说明
4. 后端章节：更新 API/数据模型/业务逻辑说明
5. 更新架构图（如有变更）
6. 更新实现清单和测试矩阵
7. 自洽性检查

---

## 第5.5步：创建 Worktree（会话级隔离）

**核心原则**：不在主工作目录写代码，创建隔离副本。每个 forge-eng 会话一个 worktree，多会话互不冲突。

详细命令参考见 [references/worktree-guide.md](references/worktree-guide.md)。

### 流程

```bash
# 1. 检查/创建 worktree 目录
ls -d .worktrees 2>/dev/null || mkdir -p .worktrees

# 2. 安全检查：确认 .gitignore
git check-ignore -q .worktrees 2>/dev/null || {
  echo ".worktrees/" >> .gitignore
  git add .gitignore
  git commit -m "chore: add .worktrees to gitignore"
}

# 3. 创建 worktree + 分支
BRANCH="eng/{feature-slug}-$(date +%Y-%m-%d)"
WORKTREE=".worktrees/{feature-slug}"
git worktree add "$WORKTREE" -b "$BRANCH"
cd "$WORKTREE"

# 4. 安装依赖（自动检测项目类型）
[ -f package.json ] && npm install
[ -f requirements.txt ] && pip install -r requirements.txt
[ -f go.mod ] && go mod download

# 5. 基线测试
npm test 2>/dev/null || python -m pytest 2>/dev/null || echo "无测试框架"
```

### 基线测试结果处理

| 结果 | 操作 |
|------|------|
| 测试通过 | 报告就绪，继续 |
| 测试失败 | 报告失败数量，询问是否继续 |
| 无测试框架 | 跳过，进入第 5.7 步 |

### 报告格式

```
Worktree 就绪：
  路径：{full-path}
  分支：{branch-name}
  基线测试：{通过 N 个 / 无测试框架}
  Backend URL：{如已启动则填写；未启动则写 未启动}
  Frontend URL：{如已启动则填写；未启动则写 未启动}
  APP_URL：{供浏览器/QA 使用的 URL；来自 dev:status，不得猜}
  准备开始实现 {feature-name}
```

**后续所有 Wave 执行都在 worktree 目录中进行。**

---

## 第5.6步：Dev Server 端口契约（如项目需要运行应用）

**核心原则**：worktree 可以并行，但 dev server 必须由项目统一入口分配和复用端口。不要在 worktree 里裸跑 `uvicorn`、`vite`、`next dev` 或临时 `npm run dev -- --port ...`，除非项目没有统一入口。

### 统一入口优先级

```bash
# 必须在 worktree 根目录执行
cd "$WORKTREE"

if npm run 2>/dev/null | grep -q "dev:status"; then
  npm run dev:status
  npm run dev
  npm run dev:status | tee /tmp/forge-dev-status.txt
elif [ -x scripts/dev-stack.sh ]; then
  bash scripts/dev-stack.sh status
  bash scripts/dev-stack.sh start
  bash scripts/dev-stack.sh status | tee /tmp/forge-dev-status.txt
else
  echo "未发现统一 dev server 入口；如必须启动应用，使用显式非默认端口并记录 PID/cwd/URL"
fi
```

### 硬性要求

1. **有统一入口就必须用统一入口**：`npm run dev:status` / `npm run dev` / `scripts/dev-stack.sh` 优先于任何手写启动命令。
2. **APP_URL 必须来自状态输出**：浏览器测试、curl、forge-qa 的 `app_url` 都从 `dev:status` / `dev-stack status` 输出读取，不得凭常见端口猜测。
3. **启动前先看状态**：如果当前 worktree 已有对应服务，复用；不要重复启动同一套前后端。
4. **进程身份必须核对**：状态输出或 `lsof -p $PID | grep cwd` 必须证明监听进程 cwd 属于当前 worktree。
5. **主分支端口固定，worktree 端口自动隔离**：如果项目 dev-stack 已规定 main 使用固定端口，worktree 不得抢这些端口。
6. **收尾前停本 worktree 服务**：删除或合并 worktree 前运行 `npm run dev:stop` 或 `bash scripts/dev-stack.sh stop`；没有统一入口时，按记录的 PID 精确停止当前 worktree 的进程。

---

## 第5.7步：测试框架检测与引导

**首次检测到项目无测试框架时触发。**

```bash
# 检测已有测试框架
ls jest.config.* vitest.config.* .rspec pytest.ini 2>/dev/null
ls -d test/ tests/ spec/ __tests__/ e2e/ 2>/dev/null
```

**如果无测试框架**，通过 AskUserQuestion 提议安装：

```
检测到项目无测试框架。推荐安装以启用 TDD：

A) 安装 vitest + @testing-library（推荐，Node.js/Next.js 项目）
   npm i -D vitest @testing-library/react @testing-library/jest-dom
B) 安装 pytest + pytest-cov（Python 项目）
   pip install pytest pytest-cov
C) 跳过 — 使用验证驱动模式（每个任务定义可执行验证命令）
D) 跳过 — 不做任何验证（不推荐）
```

**如果用户选择安装**：
1. 安装依赖包
2. 创建配置文件（vitest.config.ts / pytest.ini）
3. 写一个示例测试，验证框架正常工作
4. 运行测试 → 确认通过
5. 提交：`chore: add test framework (vitest/pytest)`

**如果已有测试框架**：读取 2-3 个已有测试文件，学习命名惯例、导入风格、断言模式，供后续 TDD 使用。

详细框架安装指引见 [references/tdd-guide.md](references/tdd-guide.md)。

---

## 第6步：任务拆分与 Wave 规划

### 任务拆分原则

1. **垂直切片优先** — 每个任务端到端完成一个功能
2. **每个任务足够小** — 通常 1-3 个文件，最多 5 个
3. **每个任务可独立验证** — 有明确的验证方式
4. **每个任务有 TDD 级别标注** — 根据文件类型自动判断

### TDD 级别自动判断

```
项目有测试框架？
├── 否（且用户拒绝安装）→ 全部任务使用"验证驱动"
└── 是 → 按任务文件类型判断：
      ├── *.py / *.go / *.rs / *api* / *service* / *model*  → 严格 TDD
      ├── *.tsx / *.vue / *.jsx（前端组件）                   → 轻量 TDD
      ├── *.css / *.scss / *.config.* / *.md / *.json        → 跳过
      └── Bug 修复（任何类型）                                → 严格 TDD
```

### 任务定义格式

```markdown
### Task-{N}: {任务名}

**TDD 级别**: 严格 / 轻量 / 验证驱动 / 跳过
**类型**: auto | manual
**依赖**: [Task-X, Task-Y]
**文件**:
- {file_path_1} — {做什么改动}
- {file_path_2} — {做什么改动}

**实现要求**:
{具体实现指令}

**验证命令**:
{可执行的验证命令：测试命令 / curl / 浏览器截图 / 脚本}

**完成标准**:
{什么状态算"做完了"——必须可验证}
```

### Wave 分组

```
┌─────────────────────────────────────────────────────────┐
│  WAVE 1 (并行)              WAVE 2 (并行)      WAVE 3    │
│  ┌─────────┐ ┌─────────┐   ┌─────────┐        ┌──────┐ │
│  │ Task-01 │ │ Task-02 │ → │ Task-03 │      → │T-05  │ │
│  │ 严格TDD │ │ 跳过TDD │   │ 轻量TDD │        │验证  │ │
│  └─────────┘ └─────────┘   └─────────┘        │驱动  │ │
│                                                 └──────┘ │
└─────────────────────────────────────────────────────────┘
```

**分组规则**：
- 无依赖或依赖已在前序 wave 完成 → 归入当前 wave
- 同一 wave 内任务互相不依赖 → 可并行
- 修改同一文件 → 不同 wave 顺序执行，或合并为一个任务

### 用户确认

通过 AskUserQuestion 展示任务拆分和 wave 规划，包括每个任务的 TDD 级别。

---

## 第7步：Wave 并行执行（TDD + Verification Gate）

### 执行方式

**同一 wave 内的任务使用 Agent 工具并行执行**，每个任务在独立上下文中完成。所有 Agent 的工作目录为 worktree 路径。

### 任务执行模板（Agent Prompt）

每个 Agent 收到的完整指令：

```
你需要在项目 {worktree_path} 中完成以下任务：

任务：{task.name}
TDD 级别：{task.tdd_level}
文件：{task.files}
实现要求：{task.instructions}
验证命令：{task.verify_command}
完成标准：{task.done_criteria}

工程上下文：
- ENGINEERING.md: {eng_doc_path}（如有）
- DESIGN.md: {design_doc_path}（如有）

=== 实现流程（根据 TDD 级别） ===

[严格 TDD]
1. 读取涉及的文件，理解上下文
2. 写失败测试（测试文件路径随代码文件就近放置）
3. 运行测试 → 必须看到测试失败（失败原因是功能缺失，不是语法错误）
4. 写最小实现让测试通过
5. 运行测试 → 确认通过
6. 重构（保持测试绿色）
7. Verification Gate → commit

[轻量 TDD]
1. 读取涉及的文件
2. 实现功能
3. 写关键交互/边界测试（点击、提交、状态切换、空值、超长）
4. 运行测试 → 确认通过
5. Verification Gate → commit

[验证驱动]
1. 读取涉及的文件
2. 实现功能
3. 执行验证命令：{task.verify_command}
4. 读取完整输出，确认结果正确
5. Verification Gate → commit

[跳过 TDD]
1. 读取涉及的文件
2. 实现
3. Verification Gate → commit

=== Verification Gate（所有级别通用） ===

commit 前必须执行：
1. 运行验证命令（不截断输出）
2. 读取完整输出
3. 检查 exit code
   - = 0 且输出正确 → 允许 commit
   - ≠ 0 → 诊断修复 → 重新验证（最多 3 次）
   - 3 次失败 → 停止，报告失败原因

禁止使用："should work" / "probably fixed" / "seems to pass"
必须使用："验证通过：{命令} 输出 {结果}，exit code 0"

=== commit 规则 ===
只修改任务列出的文件（+ 测试文件）
遵循项目已有的代码风格
```

### 原子 Git 提交

**每个任务完成验证后立刻创建独立的 git commit。** 不可跳过。

#### 提交格式

```bash
git add {task_files}
git commit -m "$(cat <<'EOF'
{type}({scope}): {task_name}

{一句话描述做了什么}

Task-{N} of Wave-{M}
验证：{验证命令} → {结果摘要}
EOF
)"
```

**type 规范**：feat / fix / refactor / docs / test / chore
**scope**：模块名或文件名简写

### Wave 间验证

每个 wave 完成后，进入下一 wave 前：

1. **运行全量验证** — 执行项目测试套件（如果有），确认无回归
2. **检查冲突** — 确认并行任务没有产生代码冲突
3. **状态更新** — 更新 `.features/{feature-id}/status.md`（完整模式下）

如果验证失败：
- 定位失败的任务
- 启动新 Agent 诊断和修复
- 修复后创建新 commit：`fix({scope}): resolve {issue} in Task-{N}`
- **最多 3 次修复尝试**。3 次失败 → 暂停，报告给用户，质疑设计方案
- 修复成功后继续下一 wave

---

## 第8步：必需产出

### "未纳入范围"清单

每项审查中考虑但明确推迟的工作，附一句话原因。

### "已存在的内容"清单

已有的代码/流程，以及方案是复用了它们还是重复建设。

### 故障模式清单

对每个新代码路径，列出一种现实中可能的失败方式，并说明：
1. 有没有测试覆盖这种失败
2. 有没有错误处理
3. 用户是否会看到清晰的错误，还是静默失败

**无测试 + 无错误处理 + 静默失败** = **严重缺口**，需要标红。

### TODOS 更新

每个潜在 TODO 作为单独 AskUserQuestion 提问。绝不批量——每次一个。

---

## 第9步：确认与总结

```
+======================================================+
|                  工程交付完成                            |
+======================================================+
| 项目：[项目名]                                          |
| 版本：vX.Y                                             |
| 模式：完整 / 轻量                                       |
| Worktree：[路径] / 分支：[分支名]                        |
+------------------------------------------------------+
| 第0步 范围挑战：[接受/缩减]（完整模式）                    |
| 第1-4章 审查：___ 个问题（完整模式）                      |
| 测试框架：[已有/新安装/验证驱动]                          |
+------------------------------------------------------+
| 任务拆分：共 ___ 个任务，分 ___ 个 wave                  |
|   严格 TDD: ___ 个 | 轻量 TDD: ___ 个                  |
|   验证驱动: ___ 个 | 跳过: ___ 个                        |
| Wave 执行：                                             |
|   Wave 1: Task-01 ✅, Task-02 ✅                        |
|   Wave 2: Task-03 ✅, Task-04 ✅                        |
| Git 提交：___ 个原子提交                                 |
| Verification Gate：___ 次通过 / ___ 次重试               |
+------------------------------------------------------+
| 代码变更：X 个文件（新增 Y / 修改 Z）                      |
| 测试：[通过 X / 失败 Y / 新增 Z]                          |
| 文件：                                                    |
|   ENGINEERING.md          — [已更新/已创建/跳过]           |
|   ENGINEERING-CHANGELOG   — [已追加/已创建/跳过]           |
+======================================================+
```

### 未解决决策

如果用户未回答某个 AskUserQuestion，列出"未解决的决策——可能在后续咬你一口"。

---

## 第10步：分支收尾

**所有任务完成且验证通过后，处理 worktree 和分支。**

通过 AskUserQuestion 展示选项：

```
实现完成。如何处理分支？

1. 合并回主分支 — git merge 到 main，删除 worktree
2. 推送并创建 PR — git push + gh pr create，删除 worktree
3. 保留分支 — 不清理，稍后处理
4. 丢弃 — 删除分支和 worktree（需二次确认）
```

### 选项 1：合并回主分支

```bash
cd "$(git worktree list | head -1 | awk '{print $1}')"  # 回到主目录
git checkout main && git pull
git merge {branch-name}
# 运行测试验证合并结果
npm test 2>/dev/null || python -m pytest 2>/dev/null
# 通过后清理
git branch -d {branch-name}
git worktree remove {worktree-path}
```

### 选项 2：推送并创建 PR

```bash
git push -u origin {branch-name}
gh pr create --title "eng: {feature-name}" --body "$(cat <<'EOF'
## Summary
- {变更摘要}

## Test Plan
- [ ] {验证步骤}
EOF
)"
git worktree remove {worktree-path}
```

### 选项 3：保留

不做任何清理。报告路径和分支名。

### 选项 4：丢弃

**必须二次确认**，展示将删除的分支和提交列表，用户确认后：
```bash
cd "$(git worktree list | head -1 | awk '{print $1}')"
git worktree remove {worktree-path} --force
git branch -D {branch-name}
```

---

## Feature 状态管理（.features/ 架构，仅完整模式）

### 核心原则

**领域文档（ENGINEERING.md）只存内容，不存运行状态。** 运行状态写入 `.features/{feature-id}/status.md`。

### 状态标记协议

| 标记 | 含义 |
|------|------|
| `[⏳ 待处理]` | 已规划，未开始 |
| `[🔄 进行中]` | 当前正在执行 |
| `[✅ 已完成]` | 执行完成 |
| `[❌ 失败]` | 执行失败，需干预 |
| `[⏸️ 暂停]` | 等待用户确认或外部依赖 |

### 操作规则

1. **启动时（第0步）**：读取 status.md，确认前序依赖已完成，将 eng 行更新为 `[🔄 进行中]`
2. **第6步任务拆分完成后**：在 status.md 中追加 Engineering Tasks 表
3. **每个任务开始/完成/失败时**：更新任务行状态
4. **Wave 间验证**：当前 Wave 所有任务为 `[✅ 已完成]` 后才启动下一 Wave
5. **全部完成后**：eng 行状态改为 `[✅ 已完成]`

### 跨 Agent 协作

- forge-dev 调度器通过 status.md 感知工程进度
- forge-qa 启动前确认 eng 行为 `[✅ 已完成]`
- 多个会话可以同时在不同 feature 上执行 forge-eng（各自有独立 worktree）

---

## 格式规则

- 问题编号（1, 2, 3...），选项字母（A, B, C...）
- 每个选项一句话，5 秒能做决定
- 每个章节结束后暂停，等用户反馈

---

## 资源

- **工程文档模板**：[references/engineering-template.md](references/engineering-template.md)
- **TDD 指南**：[references/tdd-guide.md](references/tdd-guide.md) — 红绿重构、分级 TDD、rationalization 对照表、测试框架安装
- **Worktree 指南**：[references/worktree-guide.md](references/worktree-guide.md) — 创建/清理命令、安全检查、分支收尾
- **Verification 检查清单**：[references/verification-checklist.md](references/verification-checklist.md) — 验证门控流程、禁用措辞、失败处理
