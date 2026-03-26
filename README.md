# Forge — 文档驱动开发系统

## 这是什么

Forge 是一套**以文档为中心的 AI 辅助开发框架**。核心理念：先充分讨论，再写文档明确需求，再基于文档设计和实现。每个环节都有独立的 Skill（AI 技能指令）驱动，既可全链路串联，也可独立调用。

**品牌名 Forge（锻造）**：反复打磨、质量导向——充分讨论 → 充分设计 → 高质量交付。

### 解决的核心问题

| 问题 | 传统做法 | Forge |
|------|---------|-------|
| 讨论不足，直接开干 | 口头一说就写代码 | forge-brainstorm 先行 → 多轮讨论 → 方案确认 |
| 设计粗糙，改了又改 | 简单想法直接写 | forge-design 自闭环（竞品+美学+99条UX规则+门控） |
| QA 反复修 bug | 写完测、测完改、改完又测 | TDD 嵌入 forge-eng + forge-qa 纯验收 |
| 多会话冲突 | 手动协调分支 | Worktree 会话级隔离 |
| AI 长会话质量劣化 | 一个会话干到底 | 上下文工程：调度器精简，子任务独立上下文 |
| 不知道下一步 | 记住所有 skill 名字 | /forge 总入口，检查状态推荐下一步 |
| 知识不沉淀 | 做完就忘 | forge-fupan 复盘闭环 → 方法论迭代 |

---

## 系统全景

```
用户有想法
       │
       ▼
  ┌─────────────────┐
  │ forge-brainstorm │  头脑风暴 → 思考文档
  └──────┬──────────┘  （4模式：产品·内容·构建·探索）
         │ 可选
         ▼
  ┌──────────┐
  │ forge-prd│  产品诊断 → PRD + CHANGELOG
  └────┬─────┘
       │ PRD 迭代摘要
       ▼
  ┌──────────┐
  │ forge-dev│  调度器：Discussion → Research → 子技能调度
  └────┬─────┘  （感知 brainstorm，无 PRD 时引导创建）
       │ 独立上下文执行
  ┌────┼──────────────────────┐
  ▼    ▼                      ▼
┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────┐
│  forge-  │ │forge-design- │ │  forge-  │ │  forge-  │
│  design  │ │    impl      │ │   eng    │ │    qa    │
└──────────┘ └──────────────┘ └──────────┘ └──────────┘
  设计规划     设计→代码         工程实现      QA 验收
  (695行)     (182行)       (690行+TDD+    (纯测试报告
  自闭环                    Worktree+       不修代码)
                           Verification)
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

## Skill 清单

### 总入口

| Skill | 命令 | 职责 |
|-------|------|------|
| forge | `/forge` | 检查项目状态，推荐下一步该用哪个 skill |

### 核心链路（按执行顺序）

| 阶段 | Skill | 命令 | 职责 | 产出文档 |
|------|-------|------|------|---------|
| **讨论** | forge-brainstorm | `/forge-brainstorm` | 头脑风暴（4模式·6阶段·反谄媚·对抗性审查） | 思考文档 |
| **需求** | forge-prd | `/forge-prd` | 产品诊断、需求审查、PRD 迭代 | PRD.md + PRD-CHANGELOG |
| **调度** | forge-dev | `/forge-dev` | 开发调度器，感知 brainstorm，半自动编排子技能 | CONTEXT.md + RESEARCH.md |
| **设计规划** | forge-design | `/forge-design` | 全栈设计规划（自闭环：竞品+美学+Token+UX规则+评分） | DESIGN.md + DESIGN-CHANGELOG |
| **设计实现** | forge-design-impl | `/forge-design-impl` | 设计转代码（反AI模板+shadcn/ui+Token驱动+原子提交） | 样式/布局代码 |
| **工程** | forge-eng | `/forge-eng` | 工程实现（Worktree+TDD+Verification Gate） | ENGINEERING.md + 代码 |
| **QA** | forge-qa | `/forge-qa` | QA 纯验收（测试+报告，不修代码） | QA.md + 修复清单 |
| **审查** | forge-review | `/forge-review` | 代码审查（结构性问题） | — |
| **发布** | forge-ship | `/forge-ship` | 合并 + 测试 + CHANGELOG + PR | — |

### 辅助技能

| Skill | 命令 | 职责 |
|-------|------|------|
| forge-bugfix | `/forge-bugfix` | 系统性 Bug 调查与修复（六阶段根因分析） |
| forge-deliver | `/forge-deliver` | 端到端交付纯编排层（8 Phase，调用 forge-* 子 Skill，支持 --auto/--resume） |
| forge-doc-release | `/forge-doc-release` | 发布后文档同步 |
| forge-fupan | `/forge-fupan` | 协作复盘与知识沉淀 |

---

## 文档导航

| 文档 | 内容 |
|------|------|
| [forge-user-guide.md](docs/forge-user-guide.md) | **Forge 使用指南** — 架构图、14 个 Skill 详解、5 种工作流、关键机制、FAQ |
| [external-tools-analysis.md](docs/external-tools-analysis.md) | **外部工具分析** — Superpowers/gstack/CKM/独立 Skill 的完整能力拆解与融合映射 |
| [architecture.md](docs/architecture.md) | 架构设计 — 上下文工程、分层架构、状态管理、并行执行 |
| [skills-reference.md](docs/skills-reference.md) | 技能参考手册 — 每个 Skill 的完整机制、阶段、门控、产出 |
| [workflow-guide.md](docs/workflow-guide.md) | 使用指南 — 场景选择、最佳实践、常见问题 |
| [superpowers-comparison.md](docs/superpowers-comparison.md) | Superpowers 对照 — 融合对比与完成状态 |
| [design-skill-fusion-methodology.md](docs/design-skill-fusion-methodology.md) | 设计 Skill 融合方法论 — 整合思路、迭代流程 |
| [design-skill-audit-report.md](docs/design-skill-audit-report.md) | 设计 Skill 审计报告 — 能力评估 |
| [forge-deliver-analysis.md](docs/forge-deliver-analysis.md) | forge-deliver 重写分析 — v1 vs v2 对比、逐 Phase 差异、重写映射表 |
| [glossary.md](docs/glossary.md) | 术语词典 — 关键概念中英对照 |

---

## 快速开始

**场景 A：新想法**
```
/forge-brainstorm  → 讨论想法，产出思考文档
/forge-prd         → 转化为正式 PRD
/forge-dev         → 调度设计 + 工程 + QA
```

**场景 B：已有 PRD**
```
/forge-dev         → 直接调度
```

**场景 C：不知道下一步**
```
/forge             → 检查状态，告诉你该做什么
```

**场景 D：单独调用**
```
/forge-eng         → 只写代码（含 Worktree + TDD）
/forge-qa          → 只跑验收测试
/forge-bugfix      → 系统性修 Bug
```

**场景 E：全自动交付**
```
/forge-deliver     → 端到端编排（8 Phase，调用所有 forge-* 子 Skill）
/forge-deliver --auto   → 前置沟通后全自动
/forge-deliver --resume → 从检查点恢复
```

**场景 F：写文章/做 demo**
```
/forge-brainstorm  → 内容模式 / 构建模式
```

---

## 设计哲学

1. **讨论是最便宜的修复** — 充分讨论 → 充分设计 → 才写代码。前端严格，后端轻松。
2. **文档是源代码的上游** — PRD 变更驱动代码变更，不是反过来
3. **上下文是最稀缺的资源** — 调度器精简（30%），子任务独立上下文（100%）
4. **证据先于断言** — TDD + Verification Gate，不说"应该可以"
5. **用户保持控制权** — 关键决策交用户确认，执行细节自动完成
6. **原子化一切** — 每个任务独立 commit，可追溯、可回滚
7. **方法论完整继承** — 不压缩成口号，完整继承成熟方法论到 Skill 中
8. **复盘闭环** — 做完 → 复盘 → 沉淀 → 反哺 Skill → 下次更好

---

## 融合来源

Forge 体系融合了以下框架的精华：

| 来源 | 整合了什么 |
|------|-----------|
| **Superpowers** | Worktree 隔离、TDD 红绿重构、Verification Gate、对抗性审查 |
| **gstack office-hours** | 6 个强迫性问题、反谄媚规则、Pushback 模板 |
| **gstack plan-ceo-review** | 梦想状态映射、反转思维、最窄楔子等思维工具 |
| **ui-ux-pro-max** | 99 条 UX 规则、配色/字体搜索引擎、交付前检查清单 |
| **design-consultation** | 竞品调研、美学方向探索、预览页生成 |
| **frontend-design** | 反 AI-slop 方法论、前端美学 5 维度 |
| **ckm-design-system** | 三层 Token 架构 |
| **ckm-ui-styling** | shadcn/ui 组件选型、无障碍模式 |
| **plan-design-review** | 0-10 维度评分 + 满分标准展示 |

---

## 安装

```bash
# 1. Clone 仓库
git clone git@github.com:yike-gunshi/forge-cookbook.git

# 2. 运行安装脚本（创建 symlink 到 ~/.claude/skills/）
cd forge-cookbook
./install.sh

# 3. 新开 Claude Code 会话即可使用
```

卸载：
```bash
./install.sh --uninstall
```

---

## 仓库结构

```
forge-cookbook/
├── README.md                    ← 你在这里
├── SKILL.md                     ← forge 总入口（/forge 命令）
├── install.sh                   ← 一键安装/卸载脚本
├── skills/                      ← 所有子 Skill（14 个）
│   ├── forge-brainstorm/        ←   头脑风暴
│   ├── forge-prd/               ←   PRD 管理
│   ├── forge-dev/               ←   开发调度器
│   ├── forge-design/            ←   设计规划（含 data/ + scripts/）
│   ├── forge-design-impl/       ←   设计实现
│   ├── forge-eng/               ←   工程实现（含 references/）
│   ├── forge-qa/                ←   QA 验收
│   ├── forge-bugfix/            ←   Bug 调查修复
│   ├── forge-review/            ←   PR 审查
│   ├── forge-ship/              ←   发布
│   ├── forge-deliver/           ←   端到端编排
│   ├── forge-doc-release/       ←   发布后文档更新
│   └── forge-fupan/             ←   复盘
├── docs/                        ← 文档（10 篇）
│   ├── forge-user-guide.md      ←   使用指南
│   ├── external-tools-analysis.md ←  外部工具分析
│   ├── architecture.md          ←   架构设计
│   ├── skills-reference.md      ←   技能参考手册
│   └── ...
└── assets/                      ← 架构图、流程图（SVG）
```
