# OpenSpec 调研报告

**调研日期**: 2026-04-04
**调研目的**: 评估 OpenSpec 对 Forge skill 体系的参考价值
**结论**: 吸收思想，不引入工具

---

## 1. OpenSpec 概览

**项目**: Fission AI 出品的 Spec-Driven Development (SDD) 框架
**GitHub**: 37,000+ 星，MIT 协议，TypeScript 实现
**定位**: 在人与 AI 之间加一层轻量级规格层，让双方在写代码前先对齐"要构建什么"
**依赖**: Node.js >= 20.19.0，npm 包名 `@fission-ai/openspec`
**支持工具**: Claude Code、Cursor、Windsurf、GitHub Copilot、Cline、Codex 等 24 款

---

## 2. 核心架构

### 目录结构

```
openspec/
├── config.yaml          # 项目配置（上下文注入 + 规则）
├── specs/               # 当前系统行为的"真相源"
│   ├── cli-init/spec.md
│   ├── cli-archive/spec.md
│   └── ...每个能力域一个子目录
└── changes/             # 进行中的变更
    ├── add-dark-mode/   # 每个变更一个独立文件夹
    │   ├── proposal.md  # 为什么做
    │   ├── specs/       # delta specs（行为增量）
    │   ├── design.md    # 怎么做
    │   └── tasks.md     # checkbox 任务清单
    └── archive/         # 已完成变更的归档
```

### config.yaml 详解

```yaml
schema: spec-driven              # 使用的工作流 schema
context: |                        # 注入到所有 AI artifact 生成提示中的上下文
  Tech stack: TypeScript, Node.js (>=20.19.0), ESM modules
  Package manager: pnpm
  CLI framework: Commander.js
rules:                            # 按 artifact 类型的专用规则
  specs:
    - Include scenarios for Windows path handling
    - Use SHALL/MUST for normative requirements
  tasks:
    - Add Windows CI verification as a task
  design:
    - Prefer Node.js path module over string manipulation
```

- `context` 注入到**所有** artifact 的 AI 生成指令中
- `rules` **仅对对应类型的 artifact 生效**
- 本质是**静态编译进命令文件**，不是运行时 API 调用

---

## 3. 工作流命令

| 命令 | 功能 | 输入 | 产出 |
|------|------|------|------|
| `/opsx:explore` | 探索性调研，不产出承诺 | 模糊想法 | 分析结论、可行性评估 |
| `/opsx:propose` | 一步创建变更 + 全部规划文件 | 变更名称 + 描述 | `changes/<name>/` 下的四件套 |
| `/opsx:apply` | 按 tasks.md 逐项实现代码 | 已有 tasks.md | 代码修改 + 勾选完成的 checkbox |
| `/opsx:verify` | 验证实现是否匹配 spec | 已实现代码 | 验证报告 |
| `/opsx:archive` | 归档变更，delta specs 合并入主 specs | 已完成的变更 | `archive/YYYY-MM-DD-<name>/` |
| `/opsx:new` | 仅创建变更脚手架 | 变更名称 | 空的 `changes/<name>/` |
| `/opsx:ff` | 快进生成所有规划 artifact | 已有变更目录 | proposal + specs + design + tasks |
| `/opsx:continue` | 按依赖链创建下一个 artifact | 当前变更状态 | 下一个缺失的 artifact |
| `/opsx:sync` | 将 delta specs 合并入主 specs（不归档） | delta specs | 更新后的主 specs |

**关键设计**: 没有强制阶段门禁。依赖关系是"启用器"而非"阻断器"。

---

## 4. Spec 格式详解

### spec.md 结构

```markdown
# CLI Init Specification

## Purpose
The `openspec init` command SHALL create a complete OpenSpec directory structure...

## Requirements

### Requirement: Directory Creation
The command SHALL create the OpenSpec directory structure with config file.

#### Scenario: Creating OpenSpec structure
- **WHEN** `openspec init` is executed
- **THEN** create the following directory structure:
  openspec/ ├── config.yaml ├── specs/ └── changes/

### Requirement: Progress Indicators
The command SHALL display progress indicators during initialization.

#### Scenario: Displaying initialization progress
- **WHEN** executing initialization steps
- **THEN** validate environment silently in background
- **AND** display progress with ora spinners
```

### 关键规范

- **RFC 2119 关键词**: SHALL/MUST = 强制要求，SHOULD = 推荐，MAY = 可选
- **场景格式**: `#### Scenario:` + `WHEN/THEN/AND`（必须用 4 个 `#`）
- **每个 Requirement 至少一个 Scenario**
- **Scenario 本质就是可测试的用例**

---

## 5. 变更管理（Delta Spec）

### proposal.md

```markdown
## Why
（问题背景，1-2 句）

## What Changes
（具体变更清单，breaking change 标记 BREAKING）

## Capabilities
- **New**: add-dark-mode（对应 specs/add-dark-mode/spec.md）
- **Modified**: theme-system（对应 specs/theme-system/spec.md）

## Impact
（影响范围）
```

### Delta Specs（增量规格）

```markdown
## ADDED Requirements
（新行为）

## MODIFIED Requirements
（必须复制完整 requirement 块再修改）

## REMOVED Requirements
（废弃行为，必须包含 Reason + Migration 说明）
```

### design.md

Context / Goals & Non-Goals / Decisions（含替代方案对比）/ Risks & Trade-offs / Migration Plan

### tasks.md

```markdown
## 1. Global Config + Validation
- [ ] 1.1 Add installScope to GlobalConfig
- [ ] 1.2 Update config schema validation
## 2. Tool Capability Metadata
- [ ] 2.1 Extend AI_TOOLS metadata
```

`/opsx:apply` 解析 checkbox 格式追踪进度，完成标记 `- [x]`。

---

## 6. 与 AI 编码助手的集成

### 集成机制

`openspec init` 为选定工具生成两类文件：
- **Skills**（知识模块）：如 `.claude/skills/openspec-*/SKILL.md`
- **Commands**（斜杠命令）：如 `.claude/commands/opsx/<id>.md`

### 不同工具的路径约定

| 工具 | 命令路径 | 语法 |
|------|---------|------|
| Claude Code | `.claude/commands/opsx/<id>.md` | `/opsx:propose` |
| GitHub Copilot | `.github/prompts/opsx-<id>.prompt.md` | `/opsx-propose` |
| Cursor/Windsurf | 连字符格式 | `/opsx-propose` |
| Codex | `$CODEX_HOME/prompts/` | 全局安装 |
| Gemini CLI | `.toml` 格式 | — |

### 上下文注入原理

命令文件本身就是 Markdown prompt。config.yaml 的 `context` 和 `rules` 被**编译进命令文件**。AI 读取命令文件时自然获得项目上下文。静态注入，非运行时 API。

---

## 7. 模板系统

```
schemas/
└── spec-driven/           # 默认 schema
    ├── schema.yaml        # 定义 artifact 依赖图和 AI 指令
    └── templates/
        ├── proposal.md
        ├── spec.md
        ├── design.md
        └── tasks.md
```

`schema.yaml` 定义每个 artifact 的：`id`、`generates`（输出文件名）、`template`（模板引用）、`instruction`（AI 生成指令）、`requires`（前置依赖）。

自定义方式：
- `openspec schema fork spec-driven my-workflow` — fork 现有 schema
- `openspec schema init` — 交互式创建
- `openspec schema validate my-workflow` — 验证语法、模板、循环依赖

---

## 8. 局限性

1. **无运行时验证**: specs 是静态 Markdown，`/opsx:verify` 依赖 AI 判断，非确定性
2. **嵌套 spec 不支持**: `list --specs` 不递归扫描子目录
3. **Delta spec 合并风险**: MODIFIED 操作要求复制完整 requirement 块，归档时可能丢失细节
4. **无断点续传**: 不支持 resume 中断的 skill/command
5. **模型依赖性强**: 推荐 Opus 4.5、GPT 5.2 等高推理模型，低端模型效果不稳定
6. **Context 窗口限制**: config.yaml 的 context 有 50KB 上限
7. **SDD→TDD 桥接未实现**: 从 spec 自动生成测试代码目前是开放提案状态
8. **单语言模板**: 官方模板仅英文
9. **工具适配碎片化**: 24 款工具各有不同路径约定

**核心局限**: OpenSpec 本质是一个**结构化 prompt 管理系统**。Spec 的执行质量完全取决于 AI 模型的理解能力和遵从度。它解决"AI 编码前缺乏明确需求"的问题，但**不保证"AI 一定按 spec 编码"**。

---

## 9. 对 Forge 体系的评估

| OpenSpec 特性 | 对 Forge 的价值 | 判断 |
|---|---|---|
| Given/When/Then 场景格式 | **高** — 精确的验收锚点，桥接开发和 QA | 吸收 |
| 每个 Requirement 至少一个 Scenario | **高** — 防止模糊需求 | 吸收 |
| SHALL/MUST 措辞规范 | **中** — 提高 spec 明确性 | 吸收 |
| 四件套变更管理 | **中** — Forge 已有 PRD + CHANGELOG，结构类似 | 部分参考 |
| schema.yaml artifact 依赖图 | **中** — 对 forge-deliver 的阶段管理有参考价值 | 参考 |
| Delta spec 增量管理 | **低** — Forge PRD 原位更新，不需要 delta/merge | 不需要 |
| config.yaml 上下文注入 | **低** — 已有 CLAUDE.md + skill 前置脚本 | 已有等价物 |
| `/opsx:verify` 验证 | **低** — AI 自判，和当前 QA 问题一样 | 不解决根本问题 |
| CLI 工具链 | **低** — 额外依赖，Forge skill 体系更灵活 | 不引入 |

### 最终结论

**吸收三个核心思想，不引入工具链**：

1. **Given/When/Then 场景格式** → 融入 forge-prd 的 Feature Spec 章节
2. **每个功能点至少一个 Scenario 的纪律** → 融入 Feature Spec 验收检查表
3. **SHALL/MUST 的明确性措辞** → 融入 Feature Spec 的写作规范

**不引入的部分**：
- OpenSpec CLI 工具链（额外依赖，Forge skill 体系更灵活）
- Delta spec 机制（过度复杂，PRD 原位更新更直接）
- `/opsx:verify`（AI 自判，不比当前 QA 更可靠）
