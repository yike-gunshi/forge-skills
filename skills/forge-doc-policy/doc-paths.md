---
status: live
type: reference
module: forge-doc-policy
last_updated: 2026-04-28
---

# 文档落地路径白名单（SSoT）

本文件是**单一真相源**。所有 forge-* skill 和项目 CLAUDE.md 通过引用本文件确定文档落地规则。改规则改这里。

适用范围：`~/claudecode_workspace/` 工作区下所有项目（包括 info2action / MCP / ai-news-radar / bd-writer / chatlog / claude-conversation-archiver / claude-work-dashboard / feishu-export / forge-cookbook 自身），以及未来新建项目。

---

## 层 1：粗目录兜底（15 条）

合法的文档落地路径（粗粒度。覆盖 95% 场景，AI 自查时按本表逐条匹配）：

| # | 路径 | 用途 | 唯一性 |
|---|---|---|---|
| 1 | `docs/PRD.md` | 产品需求总文档 | 单文件，新增内容走 `PRD-CHANGELOG.md` |
| 2 | `docs/DESIGN.md` | 设计规范总文档 | 单文件，新增内容走 `DESIGN-CHANGELOG.md` |
| 3 | `docs/ENGINEERING.md` | 工程架构总文档 | 单文件，新增内容走 `ENGINEERING-CHANGELOG.md` |
| 4 | `docs/QA.md` | QA 验收总报告 | 单文件 |
| 5 | `docs/DEPLOY.md` / `docs/SELF-HOST.md` | 部署 / 自托管文档 | 单文件 |
| 6 | `docs/REVIEW-CHECKLIST.md` / `docs/产品实现速查.md` / `docs/配置指南.md` | 跨模块速查 | 单文件 |
| 7 | `docs/PRD-CHANGELOG.md` / `docs/DESIGN-CHANGELOG.md` / `docs/ENGINEERING-CHANGELOG.md` | 三大权威 changelog | 单文件 |
| 8 | `docs/讨论/{模块名}/{YYYY-MM-DD}-{模块名}-{类型}.md` | brainstorm 阶段产物（用 forge-brainstorm 的） | 子目录强制按模块分 |
| 9 | `docs/bugfix/{YYYY-MM-DD}.md` / `docs/bugfix/reviews/BF-{MMDD}-{N}.md` / `docs/bugfix/backlog.md` / `docs/bugfix/screenshots/` | BF 修复（当日汇总 + 单 BF 验收 + 待修区 + 截图） | forge-bugfix 强制 |
| 10 | `docs/优化/{YYYY-MM-DD}-{topic}.md` | 已上线功能优化讨论（区别于 brainstorm 立项） | 文件名日期在前 |
| 11 | `docs/调研/{YYYY-MM-DD}-{topic}.md` | 一次性技术调研工作区 | 完成后归档到 `docs/archive/research/` |
| 12 | `docs/复盘/` | 早期复盘（后续走仓库外 `~/claudecode_workspace/记录/复盘/{项目}/`） | — |
| 13 | `docs/plans/{YYYY-MM-DD}-{topic}.md` | 跨轮执行计划 / 多人多会话接力计划 | 文件名日期在前 |
| 14 | `docs/ops/` / `docs/qa-screenshots/` / `docs/assets/` | 现行运维全景 / QA 大附件 / 文档配图（子目录按模块分） | — |
| 15 | `docs/archive/{category}/` | 历史归档（11 子分类：brainstorm / context / handoffs / features / research / design / legacy / ops / plans / qa / bugfix-screenshots / security / writing） | — |

**forge skill 私有目录（也合法）**：

| 路径 | 用途 | 谁写 |
|---|---|---|
| `.features/{feature-id}/feature-spec.md` / `.features/{feature-id}/status.md` / `.features/_registry.md` | feature 生命周期 | forge-prd / forge-eng / forge-dev |
| `.deliver/state.json` / `.deliver/delivery-report.md` / `.deliver/visual-decision.md` | 交付流水线状态（视觉决策索引统一在 .deliver 不在 .do-dev） | forge-deliver / forge-design |
| `.forge/active.md` / `.forge/backlog.md` | 多会话协调 + bug 任务池 | forge-bugfix / forge-status |
| `.worktrees/{task-name}/` | 任务级 worktree 隔离 | 通用 |

**仓库根（也合法）**：

| 路径 | 用途 |
|---|---|
| `README.md` | 项目入口 |
| `TODO.md` | **唯一跨会话 TODO**（不准 docs/TODO.md / docs/TODOS.md） |
| `CLAUDE.md` | 项目级 AI 协作规则（引用 forge-doc-policy） |
| `CHANGELOG.md` | 项目级 changelog |
| `LICENSE` | 许可证 |

---

## 层 2：高频细规则（10 条，历史犯错或 memory 已记录的）

这些是已记录的细规则，AI 自查时**优先级高于层 1 粗匹配**：

| # | 规则 | 来源 |
|---|---|---|
| L2-1 | brainstorm 必须 `docs/讨论/{模块名}/{YYYY-MM-DD}-{模块名}-{类型}.md`，**禁止放 docs 根 / docs/调研 / docs/优化** | memory `feedback_brainstorm_doc_location` |
| L2-2 | 单 BF 验收必须 `docs/bugfix/reviews/BF-{MMDD}-{N}.md`（双层验收清单） | forge-bugfix SKILL.md + CLAUDE.md R11 |
| L2-3 | 当日 BF 汇总必须 `docs/bugfix/{YYYY-MM-DD}.md`（一日一份，跨轮交叉引用） | memory `feedback_bugfix_doc_convention` |
| L2-4 | 跨会话 TODO **唯一** `/TODO.md`，**禁止 docs/TODO.md / docs/TODOS.md / 任何分散文件** | memory `feedback_single_todo_location` |
| L2-5 | PRD / DESIGN / ENGINEERING / QA 唯一文件，新版本走 changelog **不开新文件** | docs/README.md「新文档放哪里」表 |
| L2-6 | feature spec 必须 `.features/{feature-id}/feature-spec.md`，**不准放 docs/** | forge-prd / forge-eng SKILL.md |
| L2-7 | 视觉决策索引统一 `.deliver/visual-decision.md`（过去多源 .do-dev/ vs .deliver/，**以 .deliver 为准**） | forge-eng / forge-design 现状 |
| L2-8 | 复盘文档名格式 `{YYYY-MM-DD}-[标题]-描述.md`，**日期在前** | memory `feedback_fupan_filename_format` |
| L2-9 | 已上线功能优化讨论必须 `docs/优化/{YYYY-MM-DD}-{topic}.md`，**不放 docs/讨论 也不放 docs/调研** | memory `feedback_optimization_doc_convention` |
| L2-10 | 调研报告**完成后**归档到 `docs/archive/research/`（`docs/调研/` 是工作区，不是终点） | docs/README.md archive 规则 |

---

## 层 3：兜底铁律（未列出 = 必须先和用户确认目录）

> **铁律**：任何创建新 `.md` / 新目录的动作前，AI 必须按以下顺序自查：
>
> 1. 目标路径在层 1 白名单内？→ 进入层 2 细规则核对 → 都通过 = **静默写入**
> 2. 不在层 1 / 介于多个目录之间 / 涉及新分类 → **停下问用户**：给 2-3 个候选路径让用户选
> 3. 用户确认后写入；用户提出全新目录类型 → 同步更新 `doc-paths.md` SSoT（走 forge-cookbook PR 流程）
>
> **Why 这条铁律**：历史多次出现 AI "随手创建"违规案例：
> - `docs/brainstorm-card-expand-*.md`（应进 `docs/讨论/{模块}/`）
> - `docs/TODO.md` 分散文件（违反 L2-4）
> - `docs/讨论/xxx.md`（直接放 `docs/讨论/` 根，没建子目录，违反 L2-1）

---

## 路径合法性快速决策树

```
新建 .md / 新目录前：
│
├─ 文件名以 BF-{MMDD}-{N}.md 开头? → docs/bugfix/reviews/
├─ 文件名以 {YYYY-MM-DD} 开头? 
│   ├─ brainstorm 类型? → docs/讨论/{模块名}/
│   ├─ 已上线功能优化? → docs/优化/
│   ├─ 一次性技术调研? → docs/调研/（完成归 archive/research/）
│   ├─ 跨轮执行计划? → docs/plans/
│   ├─ BF 当日汇总? → docs/bugfix/
│   └─ 复盘? → ~/claudecode_workspace/记录/复盘/{项目}/（仓库外）
├─ 是 PRD/DESIGN/ENG/QA 内容? → 改对应单文件 + 加 changelog（不开新文件）
├─ 是 feature spec? → .features/{feature-id}/feature-spec.md
├─ 是 TODO? → /TODO.md（唯一）
└─ 都不匹配? → 停下问用户
```

---

## 反模式清单（AI 不要做这些）

| 反模式 | 正确做法 |
|---|---|
| 在 `docs/` 根创建任意 `.md` | 按层 1 表 8-15 找正确子目录 |
| 创建 `docs/TODO.md` / `docs/TODOS.md` / `docs/notes.md` | 跨会话 TODO 进 `/TODO.md`；临时笔记放 brainstorm 文档或会话上下文 |
| 创建新版本 PRD（如 `docs/PRD-v2.md`） | 改 `docs/PRD.md` + 在 `docs/PRD-CHANGELOG.md` 加条目 |
| 在 `docs/讨论/` 根直接放 `xxx.md`（没建模块子目录） | `docs/讨论/{模块名}/{YYYY-MM-DD}-{模块名}-{类型}.md` |
| 把 brainstorm 产物放 `docs/调研/` 或 `docs/优化/` | brainstorm 是立项前讨论，必须 `docs/讨论/{模块}/` |
| 把已上线功能的策略讨论放 `docs/讨论/` | 已上线 = `docs/优化/{YYYY-MM-DD}-{topic}.md` |
| 创建 `.do-dev/visual-decision.md` | 视觉决策索引统一在 `.deliver/visual-decision.md` |
| 临时报告放 `docs/temp/` / `docs/scratch/` 等自创目录 | 不创新分类目录；临时产物放 brainstorm 文档或会话上下文，完成后按用途归档 |

---

## 修订记录

| 版本 | 日期 | 变更 |
|---|---|---|
| v0.1 | 2026-04-28 | 初版，基于 info2action 现状盘点 + brainstorm 第 10 轮决策 |
