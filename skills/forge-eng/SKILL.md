---
name: forge-eng
description: |
  工程实现主力：管理 ENGINEERING.md，完整/轻量两模式；worktree 会话隔离、分级 TDD、验证门（证据先于断言）、任务原子化 Wave 并行、独立 commit。
  触发方式：用户说"工程"、"实现"、"forge-eng"，或 forge-dev 调度、需要实现代码变更时。
---

> **文档落地路径**：遵循 forge-doc-policy 规范。完整白名单 + frontmatter schema 见
> `~/.claude/skills/forge-doc-policy/doc-paths.md`。
> **当前文档加载契约**：先读项目 `CLAUDE.md`、`docs/README.md`、`docs/INDEX.md` 和 `docs/ENGINEERING.md` 当前真相源；PRD/DESIGN 只读相关章节，长 changelog 和 raw archive 只在追溯历史原因时加载。详见 `~/.claude/skills/_shared/current-doc-loading.md`。

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
> 提问格式与批量策略见 ~/.claude/skills/_shared/interaction-protocol.md。

## 工程原则

- **完整优先**：当完整方案只比捷径多几分钟时，永远推荐完整方案（AI 辅助下"做完整"的边际成本接近零）。
- **结构与行为分离**：先重构让修改变简单，再做简单的修改；不同时改结构和行为。
- **可逆性偏好**：优先选择能低成本回退的实现方式（功能开关、灰度、增量替换）。

## 三条铁律（来自 Superpowers，不可违反）

1. **不先验证就不准声称完成** — 必须运行验证命令、读取完整输出、确认 exit code 后才能 commit 或声称成功。禁用"should work"、"probably fixed"等措辞。详见 [references/verification-checklist.md](references/verification-checklist.md)。
2. **不先写失败测试就不准写实现**（严格 TDD 级别适用）— 写了实现再补测试？删掉实现，从测试重新开始。详见 [references/tdd-guide.md](references/tdd-guide.md)。
3. **3 次修复失败就质疑架构** — 不要尝试第 4 次修复，停下来和用户讨论设计方案是否有根本问题。

---

## 第0步：定位项目文档

1. 定位 PRD：搜索 `{项目目录}/docs/PRD.md`
2. 定位 DESIGN.md：搜索 `{项目目录}/docs/DESIGN.md`
3. 定位 RESEARCH.md：搜索 `{项目目录}/docs/*RESEARCH*`（如果 forge-dev 产出了调研报告）
4. 定位视觉决策索引（如有）：优先搜索 `.forge/visual-decision.md`；legacy 项目才兼容旧 `.deliver/` / `.do-dev/` 或旧 `docs/讨论/*/assets/*.meta.json`
5. 定位 ENGINEERING.md：
   ```
   搜索模式：
   - {项目目录}/docs/ENGINEERING.md
   - {项目目录}/docs/*engineering*（不区分大小写）
   - {项目目录}/docs/*工程*
   - {项目目录}/**/ENGINEERING*.md
   ```
6. 定位 ENGINEERING CHANGELOG：模式匹配 `*engineering*changelog*`
7. 分支判断：有 → 迭代模式；无 → 创建模式

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

1. 读取 `docs/README.md`、`docs/INDEX.md` 和 `docs/ENGINEERING.md` 当前真相源。
2. 读取 `docs/PRD.md`、`docs/DESIGN.md` 的相关章节，提取产品和设计约束。
3. 读取 RESEARCH.md（如有），提取技术调研结论
4. 读取视觉决策索引（如有），明确哪些 Image 2 / Figma 图只是观感参考，哪些真实截图是验收证据
5. 按需读取相关 `docs/modules/*.md` 或 `docs/ops/*.md`。
6. 只在需要历史原因时读取 `docs/CHANGELOG.md` 顶部索引和 `ENGINEERING-CHANGELOG.md` 相关段落，不默认扫全文。
7. 用 Agent(Explore) 扫描项目源码，理解当前架构
8. **回放 learnings 账本**（forge-fupan v2 闭环）：`grep 本项目名或 global ~/claudecode_workspace/记录/复盘/learnings.jsonl`，挑 status=active、置信度 ≥7、与本次任务相关的条目（≤5 条）向用户一行复述；无账本则跳过
9. 向用户总结当前工程状态，确认理解是否正确

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
每个章节发现的问题按 interaction-protocol 的批量策略确认（≤3 个逐个问，>3 个同类批量一次问），确认完毕再进入下一章节。

### 第1章：架构审查

评估：
- 整体系统设计和组件边界
- 依赖关系图和耦合问题
- 数据流模式和潜在瓶颈
- 扩展性和单点故障
- 安全架构（认证、数据访问、API 边界）
- 关键流程是否值得用 ASCII 图说明
- 对每个新代码路径，描述一个真实的生产故障场景

**停止**。发现的问题按批量策略通过 AskUserQuestion 确认后再继续。

### 第2章：代码质量审查

评估：
- 代码组织和模块结构
- DRY 违反——要有侵略性
- 错误处理模式和缺失的边界情况
- 技术债热点
- 被修改文件中已有的 ASCII 图——改动后还准确吗？

**停止**。发现的问题按批量策略通过 AskUserQuestion 确认后再继续。

### 第3章：测试审查

画出所有新 UX、新数据流、新代码路径、新的分支逻辑的图。对每一项，确认是否有对应测试。

**测试矩阵产出**：审查完成后，把测试矩阵写入工程文档，供 `/forge-qa` 使用。

**停止**。发现的问题按批量策略通过 AskUserQuestion 确认后再继续。

### 第4章：性能审查

评估：
- N+1 查询和数据库访问模式
- 内存使用问题
- 缓存机会
- 高时间复杂度代码路径

**停止**。发现的问题按批量策略通过 AskUserQuestion 确认后再继续。

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

## 第5.6-5.7步：Dev 环境准备（按需）

worktree 建好后：① 若项目需要运行应用 → 遵守项目统一 dev entrypoint 和端口契约，
禁止自起野端口；② 若测试框架缺失 → 检测并引导初始化。
**执行前必读 [references/dev-environment.md](references/dev-environment.md)**。

## 第6-7步：任务拆分 + Wave 并行执行（TDD + 验证门）

方案确认后进入实现。**执行前必读 [references/wave-execution.md](references/wave-execution.md)**，其中：
- 第 6 步：把实现拆成原子任务（每个任务独立可验证、可 commit），按依赖关系分 Wave
- 第 7 步：每个 Wave 内 TDD 红绿循环 + **Verification Gate**——证据先于断言，每个任务跑验证命令读完整输出确认后才 commit

骨架红线：三条铁律见文首（TDD 分级：严格/轻量/验证驱动，按任务风险选）；另加一条——每个原子任务一个独立 commit，不打包不相关变更。

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

潜在 TODO 按 interaction-protocol 的批量策略提问：≤3 个逐个确认，>3 个同类整理后一次批量确认。

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

1. 合并回主分支 — merge 到 main，跑测试验证合并结果，通过后删除分支和 worktree
2. 推送并创建 PR — push + gh pr create，清理 worktree（分支保留在远端）
3. 保留分支 — 不做任何清理，报告路径和分支名
4. 丢弃 — 删除分支和 worktree，必须二次确认（展示将删除的提交列表）
```

具体命令见 [references/worktree-guide.md](references/worktree-guide.md) 的「分支收尾」节。

---

## Feature 状态管理（.features/ 架构，仅完整模式）

> 状态标记与通用操作规则见 ~/.claude/skills/_shared/feature-status-protocol.md。

eng 特有动作：
1. **第6步任务拆分完成后**：在 status.md 中追加 Engineering Tasks 表
2. **每个任务开始/完成/失败时**：更新任务行状态
3. **Wave 间验证**：当前 Wave 所有任务为 `[✅ 已完成]` 后才启动下一 Wave

---

## 资源

- **工程文档模板**：[references/engineering-template.md](references/engineering-template.md)
- **TDD 指南**：[references/tdd-guide.md](references/tdd-guide.md) — 红绿重构、分级 TDD、rationalization 对照表、测试框架安装
- **Worktree 指南**：[references/worktree-guide.md](references/worktree-guide.md) — 创建/清理命令、安全检查、分支收尾
- **Verification 检查清单**：[references/verification-checklist.md](references/verification-checklist.md) — 验证门控流程、禁用措辞、失败处理
