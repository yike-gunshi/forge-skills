# 文档驱动开发（Doc-Driven Dev）

一套 5 个 AI Skill 组成的自动化开发工作流，从需求诊断到设计、工程、QA 全流程调度。支持多会话并行开发。

## 解决什么问题

每次有新需求或遇到问题时，需要手动协调产品分析、设计、工程实现、测试验证各环节。容易遗漏步骤，上下文在长会话中劣化（context rot），没有统一的文档沉淀和决策追溯。多个功能并行开发时，代码冲突和状态混乱更加严重。

## 核心能力

- **产品诊断**：描述问题 → 自动归因（设计缺陷/实现偏离/PRD遗漏）→ 更新 PRD
- **技术调研**：prompt 驱动四维调研（技术栈/架构模式/坑点/可复用代码）
- **自动调度**：半自动编排设计→工程→QA，关键决策交人确认
- **上下文工程**：子 skill 在独立上下文执行，避免质量随会话变长而劣化
- **原子化交付**：代码拆分为原子任务，Wave 并行执行，每任务独立 git commit
- **多会话并行**：Git Worktree 代码隔离 + `.features/` 状态隔离，支持多终端同时开发不同功能

## 快速开始

```bash
# 单功能开发
/up-prd          # 1. 产品诊断
/do-dev          # 2. 开发调度（自动编排下游 skill）

# 单独调用某个环节
/do-design       # 只做设计
/do-eng          # 只做工程
/do-qa           # 只做测试

# 多功能并行开发
claude -w feat-info-feed-dedup       # 终端 1：在隔离 worktree 中开发功能 A
claude -w feat-info-feed-briefing    # 终端 2：在隔离 worktree 中开发功能 B
```

## Skill 清单

| Skill | 命令 | 职责 |
|-------|------|------|
| up-prd | `/up-prd` | 产品诊断、PRD 迭代 |
| do-dev | `/do-dev` | 开发调度器 |
| do-design | `/do-design` | 设计文档 + 样式实现 |
| do-eng | `/do-eng` | 工程文档 + 代码实现 |
| do-qa | `/do-qa` | QA 文档 + 测试执行 |

## 文档

- [使用手册](docs/使用手册.md) — 完整的架构、流程、方法论、FAQ
- [多会话并行规范](docs/多会话并行规范.md) — Git Worktree + .features/ 状态管理
- [PRD](docs/PRD.md) — 产品需求文档
- [迭代记录](docs/CHANGELOG.md) — 版本变更历史

## Skill 源码位置

```
~/.claude/skills/
├── up-prd/SKILL.md
├── do-dev/SKILL.md
├── do-design/SKILL.md
├── do-eng/SKILL.md
└── do-qa/SKILL.md

# 实际文件（symlink 指向）：
/Users/dbwu/claudecode_workspace/.claude/skills/
├── up-prd/
├── do-dev/
├── do-design/
├── do-eng/
└── do-qa/
```
