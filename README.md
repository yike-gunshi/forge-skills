<div align="center">

# Forge

**规范驱动的 AI 辅助开发框架**

> 先充分讨论，再写文档明确需求，再基于文档设计和实现。<br>
> 无 Feature Spec 不写代码。无验收计划不跑测试。发现问题必须举一反三。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Skill-blueviolet)](https://claude.ai/code)
[![Skills](https://img.shields.io/badge/Skills-15-blue)]()

[快速开始](#快速开始) · [Skill 清单](#skill-清单) · [设计哲学](#设计哲学) · [安装](#安装) · [文档](#文档导航) · [**English**](README_EN.md)

</div>

---

## 这是什么

Forge 是一套 Claude Code Skills，覆盖从头脑风暴到发布复盘的**完整开发链路**。14 个 Skill 既可全链路串联（`/forge-deliver`），也可独立调用（`/forge-eng`）。

核心理念：**规范驱动开发（Spec-Driven Development）**——每个功能在写代码前必须有 Feature Spec（Given/When/Then 行为场景 + 验收检查表），用户确认后才进入开发，QA 基于同一份 Spec 做断言。

### 解决的核心问题

| 问题 | 没有 Forge | 有 Forge |
|------|-----------|---------|
| 讨论不足，直接开干 | 口头一说就写代码 | forge-brainstorm 多轮讨论 → 方案确认 |
| 需求模糊，验收靠人肉 | PRD 没有精确验收标准 | Feature Spec（Given/When/Then + 验收检查表）→ 用户确认后才开发 |
| QA 测不出问题 | 只测"元素存在"不测"符合设计" | 基于验收检查表逐项断言（含 CSS 属性值）|
| 反馈后不举一反三 | 报了 3 个 bug，只修 3 个 | 搜索相似模式 → 类似风险清单 → 一并修复 |
| 设计粗糙，改了又改 | 简单想法直接写 | forge-design 自闭环（竞品+美学+99条UX规则+门控）|
| AI 长会话质量劣化 | 一个会话干到底 | 上下文工程：调度器精简，子任务独立上下文 |
| 新会话不知道项目状态 | 手动交代上下文 | CLAUDE.md 规范驱动规则（R1-R7）+ 状态感知 |
| 不知道下一步 | 记住所有 skill 名字 | `/forge` 检查状态，推荐下一步 |

---

## 系统全景

```
用户有想法
       │
       ▼
  ┌─────────────────┐
  │ forge-brainstorm │  头脑风暴 → 思考文档
  └──────┬──────────┘  4 模式：产品 · 内容 · 构建 · 探索
         │
         ▼
  ┌──────────┐
  │ forge-prd│  产品诊断 → PRD + Feature Spec + CHANGELOG
  └────┬─────┘  ⚠️ Feature Spec 用户确认后才进入开发
       │
       ▼
  ┌──────────┐
  │ forge-dev│  调度器 → Discussion → Research → 子技能调度
  └────┬─────┘
       │ 独立上下文执行
  ┌────┼──────────────────────┐
  ▼    ▼                      ▼
┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────┐
│  forge-  │ │forge-design- │ │  forge-  │ │  forge-  │
│  design  │ │    impl      │ │   eng    │ │    qa    │
└──────────┘ └──────────────┘ └──────────┘ └──────────┘
 设计规划      设计→代码        工程实现      QA 验收
 自闭环                       TDD+Worktree  验收计划→测试
                                            →举一反三
       │
       ▼
  ┌──────────┐   ┌──────────┐   ┌──────────┐
  │  forge-  │ → │  forge-  │ → │  forge-  │
  │  review  │   │   ship   │   │  fupan   │
  └──────────┘   └──────────┘   └──────────┘
   代码审查       发布流程       复盘沉淀

随时：/forge → 检查项目状态，推荐下一步
```

---

## 快速开始

**场景 A：新想法**
```
/forge-brainstorm  → 讨论想法，产出思考文档
/forge-prd         → PRD + Feature Spec（用户确认后才开发）
/forge-dev         → 调度设计 + 工程 + QA
```

**场景 B：已有 PRD**
```
/forge-dev         → 检查 Feature Spec → 调度
```

**场景 C：不知道下一步**
```
/forge             → 检查状态，告诉你该做什么
```

**场景 D：单独调用**
```
/forge-eng         → 只写代码（Worktree + TDD）
/forge-qa          → 只跑验收测试
/forge-bugfix      → 系统性修 Bug
```

**场景 E：全自动交付**
```
/forge-deliver --auto   → 前置沟通后全自动（8 Phase）
/forge-deliver --resume → 从检查点恢复
```

---

## 效果示例

### Feature Spec 确认门禁

```
用户    ❯ 帮我加一个频道管理功能

forge   ❯ ⚠️ 该功能没有 Feature Spec。建议先运行 /forge-prd 生成。

用户    ❯ /forge-prd

forge   ❯ Feature Spec 已生成，请审阅：
          一、用户流程：设置页 → 频道列表 → 添加/删除/排序 → 保存
          二、页面结构：3 个区块，5 个组件
          三、行为场景：3 个功能点，共 9 个 Given/When/Then 场景
          四、验收检查表：18 项（功能 9 + 视觉 6 + 流程 3）
          
          A) 确认，进入开发
          B) 整体方向需要调整
          C) 细节需要修改
```

### 举一反三

```
用户    ❯ 频道卡片的间距不对，应该是 16px 不是 12px

forge   ❯ 已修复。搜索代码库发现 3 处类似风险：
          1. src/components/SourceCard.tsx:42 — 同样使用 gap-3（12px）
          2. src/components/ActionCard.tsx:28 — padding 也是 12px
          3. Feature Spec 中 StarredView 组件要求 gap: 16px，当前为 12px
          
          要一并修复吗？
          A) 全部修复
          B) 选择性修复
```

---

## Skill 清单

### 核心链路

| 阶段 | Skill | 命令 | 职责 | 产出 |
|------|-------|------|------|------|
| 讨论 | forge-brainstorm | `/forge-brainstorm` | 头脑风暴（4模式 · 6阶段 · 反谄媚 · 对抗性审查） | 思考文档 |
| 需求 | forge-prd | `/forge-prd` | 产品诊断 + Feature Spec 生成 | PRD.md（含 Feature Spec）|
| 调度 | forge-dev | `/forge-dev` | 开发调度器，编排子技能 | CONTEXT.md + RESEARCH.md |
| 设计 | forge-design | `/forge-design` | 全栈设计（竞品+美学+Token+UX规则+评分） | DESIGN.md |
| 设计实现 | forge-design-impl | `/forge-design-impl` | 设计转代码（反AI模板+shadcn/ui+原子提交） | 样式代码 |
| 工程 | forge-eng | `/forge-eng` | 工程实现（Worktree+TDD+逐场景自验） | ENGINEERING.md + 代码 |
| QA | forge-qa | `/forge-qa` | 验收计划→测试→报告→举一反三 | QA 验收报告 |
| 审查 | forge-review | `/forge-review` | 代码审查（结构性问题） | — |
| 发布 | forge-ship | `/forge-ship` | 合并 + 测试 + CHANGELOG + PR | — |

### 辅助技能

| Skill | 命令 | 职责 |
|-------|------|------|
| forge-bugfix | `/forge-bugfix` | 系统性 Bug 调查与修复（双层验收 + 多会话并行协调 + 端口治理 v6.1） |
| forge-status | `/forge-status` | 并行会话巡检与清理（扫 `.forge/active.md`，按硬信号判活/死） |
| forge-deliver | `/forge-deliver` | 端到端交付编排（8 Phase，支持 `--auto` / `--resume`） |
| forge-doc-release | `/forge-doc-release` | 发布后文档同步 |
| forge-fupan | `/forge-fupan` | 协作复盘与知识沉淀（结束时自动清本会话 active 登记） |

### 总入口

```
/forge  →  检查项目状态（.features/、git branch、文档），推荐下一步
```

---

## 关键机制

### Feature Spec（规范驱动）

每个功能在开发前 **必须** 有 Feature Spec，包含：

| 章节 | 内容 | 服务于 |
|------|------|--------|
| 用户流程总览 | 入口 → 步骤 → 出口（含异常分支） | 用户确认整体方向 |
| 页面/系统结构 | 全局布局 → 区块职责 → 组件清单 + CSS 约束 | 用户确认结构 |
| 行为场景 | Given/When/Then × 3（正常/异常/边界） | 开发对标 + QA 断言 |
| 验收检查表 | 功能验证 + 视觉合规（含 CSS 值）+ 流程完整性 | QA 直接用作测试用例 |

### 规范驱动规则（R1-R7）

写入项目 CLAUDE.md，每次会话自动加载：

| 规则 | 内容 |
|------|------|
| **R1** | 无 Feature Spec 不写代码 |
| **R2** | 实现严格对标文档，逐场景自验 Given/When/Then |
| **R3** | 视觉实现对标 DESIGN.md，CSS 值必须一致 |
| **R4** | QA 基于验收检查表断言，含具体 CSS 属性值检查 |
| **R5** | 收到反馈时举一反三（搜索相似模式 + 类似风险清单） |
| **R6** | 提交前自验所有相关场景 |
| **R7** | 声称完成时提供验证证据 |

### 上下文工程

解决 AI 长会话质量劣化（Context Rot）问题：

```
forge-dev（调度器，~30% 上下文）     forge-eng（执行器，100% 全新上下文）
┌─────────────────────┐           ┌──────────────────────────┐
│ PRD 摘要             │  Agent    │ ENGINEERING.md 全文       │
│ RESEARCH.md 摘要     │ ───────→ │ Feature Spec 行为场景     │
│ 执行计划             │  传递路径  │ 源代码（按需读取）         │
└─────────────────────┘           └──────────────────────────┘
```

---

## 安装

```bash
# 克隆到本地
git clone https://github.com/yike-gunshi/forge-skills.git

# 运行安装脚本（默认同时安装到 Claude Code 和 Codex 可发现目录）
cd forge-skills
./install.sh

# 新开 Claude Code / Codex 会话即可使用
```

卸载：
```bash
./install.sh --uninstall
```

指定安装目标：
```bash
./install.sh --target claude  # 仅 ~/.claude/skills
./install.sh --target codex   # 仅 ~/.agents/skills
./install.sh --status         # 检查当前 symlink 是否完整
```

---

## 设计哲学

1. **讨论是最便宜的修复** — 充分讨论 → 充分设计 → 才写代码
2. **文档是源代码的上游** — PRD 变更驱动代码变更，不是反过来
3. **规范驱动开发** — Feature Spec（Given/When/Then）是行为契约，无 Spec 不写代码
4. **上下文是最稀缺的资源** — 调度器精简（30%），子任务独立上下文（100%）
5. **证据先于断言** — TDD + Verification Gate，声称完成须提供证据
6. **用户保持控制权** — Feature Spec、验收计划、举一反三——关键决策交用户
7. **举一反三** — 发现问题后搜索相似模式，不仅修单点
8. **原子化一切** — 每个任务独立 commit，可追溯、可回滚
9. **复盘闭环** — 做完 → 复盘 → 沉淀 → 反哺 Skill → 下次更好

---

## 文档导航

| 文档 | 内容 |
|------|------|
| [forge-user-guide.md](docs/forge-user-guide.md) | 使用指南 — 架构图、14 个 Skill 详解、5 种工作流 |
| [architecture.md](docs/architecture.md) | 架构设计 — 上下文工程、分层架构、状态管理 |
| [workflow-guide.md](docs/workflow-guide.md) | 工作流 — 场景选择、最佳实践、常见问题 |
| [skills-reference.md](docs/skills-reference.md) | 技能手册 — 每个 Skill 的完整机制和产出 |
| [openspec-research.md](docs/openspec-research.md) | OpenSpec 调研 — Given/When/Then 思想来源 |
| [glossary.md](docs/glossary.md) | 术语词典 — 关键概念中英对照 |

<details>
<summary>更多文档</summary>

| 文档 | 内容 |
|------|------|
| [external-tools-analysis.md](docs/external-tools-analysis.md) | 外部工具分析 — Superpowers/gstack/CKM 能力拆解 |
| [superpowers-comparison.md](docs/superpowers-comparison.md) | Superpowers 对照 — 融合对比与完成状态 |
| [design-skill-fusion-methodology.md](docs/design-skill-fusion-methodology.md) | 设计 Skill 融合方法论 |
| [design-skill-audit-report.md](docs/design-skill-audit-report.md) | 设计 Skill 审计报告 |
| [forge-deliver-analysis.md](docs/forge-deliver-analysis.md) | forge-deliver 重写分析 — v1 vs v2 对比 |

</details>

---

## 仓库结构

```
forge-skills/
├── README.md                       ← 你在这里
├── SKILL.md                        ← /forge 总入口
├── LICENSE                         ← MIT
├── install.sh                      ← 一键安装/卸载
├── skills/                         ← 14 个子 Skill
│   ├── forge-brainstorm/           ←   头脑风暴
│   ├── forge-prd/                  ←   PRD + Feature Spec
│   │   └── references/
│   │       ├── prd-template.md
│   │       ├── feature-spec-template.md    ← NEW
│   │       └── project-claude-md-template.md ← NEW
│   ├── forge-dev/                  ←   开发调度器
│   ├── forge-design/               ←   设计规划
│   ├── forge-design-impl/          ←   设计实现
│   ├── forge-eng/                  ←   工程实现
│   ├── forge-qa/                   ←   QA 验收
│   ├── forge-bugfix/               ←   Bug 调查修复
│   ├── forge-review/               ←   PR 审查
│   ├── forge-ship/                 ←   发布
│   ├── forge-deliver/              ←   端到端编排
│   ├── forge-doc-release/          ←   发布后文档更新
│   └── forge-fupan/                ←   复盘
├── docs/                           ← 11 篇文档
└── assets/                         ← 架构图（SVG）
```

---

## 融合来源

Forge 融合了以下框架的精华：

| 来源 | 整合了什么 |
|------|-----------|
| **OpenSpec** | Given/When/Then 行为场景、SHALL/MUST 措辞规范（思想，非工具链） |
| **Superpowers** | Worktree 隔离、TDD 红绿重构、Verification Gate、对抗性审查 |
| **gstack office-hours** | 6 个强迫性问题、反谄媚规则、Pushback 模板 |
| **gstack plan-ceo-review** | 梦想状态映射、反转思维、最窄楔子 |
| **ui-ux-pro-max** | 99 条 UX 规则、配色/字体搜索引擎 |
| **design-consultation** | 竞品调研、美学方向探索 |
| **frontend-design** | 反 AI-slop 方法论 |
| **ckm-design-system** | 三层 Token 架构 |

---

<div align="center">

MIT License &copy; [yike-gunshi](https://github.com/yike-gunshi)

</div>
