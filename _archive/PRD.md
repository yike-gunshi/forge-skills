# 文档驱动开发工作流 — PRD

**版本:** v1.2 | **日期:** 2026-03-21 | **状态:** 已上线

## 迭代历史摘要

### v1.2 — 2026-03-21 — 多会话并行 + Git Worktree + Feature 状态隔离
- 引入 Git Worktree 实现代码级隔离（`claude -w` / `Agent isolation: worktree` / 手动管理）
- 引入 `.features/` 目录实现状态级隔离（注册表 + 流水线状态 + heartbeat 孤儿检测）
- 运行状态从领域文档中拆出，改为 feature-scoped 的独立 status.md
- 版本号预留机制解决多会话竞争问题
- 依赖检查改为只读自己 feature 的 status.md

### v1.1 — 2026-03-20 — 上下文工程 + Research + Wave 并行
- do-dev 新增 Discussion 阶段（结构化偏好收集）和 Research 阶段（四维技术调研）
- do-dev 改为上下文工程模式（子 skill 在独立 Agent 上下文中执行，解决 context rot）
- do-eng 新增任务拆分 + Wave 并行执行 + 原子 Git 提交
- 参考 GSD 框架优化整体架构

### v1.0 — 2026-03-20 — 初始版本
- 创建 up-prd（产品诊断与 PRD 迭代管理器）
- 创建 do-dev（开发调度器）+ do-design + do-eng + do-qa
- 参考 cn-plan-product/cn-plan-design/cn-plan-eng/cn-qa/cn-deliver 方法论
- 建立完整文档驱动开发流程

---

## 一、产品定位

### 1.1 解决的问题

在 AI 辅助开发中，用户面临三个核心问题：

1. **流程碎片化**：需求分析、设计、工程、测试各环节独立执行，缺乏串联
2. **上下文劣化**：长会话中 AI 输出质量下降（context rot），但用户往往不自知
3. **知识流失**：决策过程没有沉淀，同样的问题反复讨论

### 1.2 目标用户

使用 Claude Code 进行项目开发的个人开发者或小团队，需要：
- 系统性地管理需求变更
- 让 AI 按正确的顺序完成开发任务
- 保留决策历史，避免重复讨论

### 1.3 核心价值

- **文档即真相源**：PRD 是唯一需求源头，所有下游工作从 PRD 获取输入
- **自动化编排**：半自动调度设计→工程→QA，减少人工协调成本
- **质量保障**：上下文隔离避免劣化，原子提交保证可追溯

---

## 二、系统架构

### 2.1 整体架构

```
用户描述问题/需求
       │
       ▼
  ┌─────────┐
  │  up-prd  │  产品诊断层
  └────┬─────┘
       │ PRD 迭代摘要
       ▼
  ┌─────────┐
  │  do-dev  │  编排层（上下文工程 + 状态管理）
  └────┬─────┘
       │ Agent 工具（独立上下文 + Git Worktree 隔离）
  ┌────┼────────────────┐
  ▼    ▼                ▼
┌──────┐ ┌──────┐ ┌──────┐
│design│ │ eng  │ │  qa  │  执行层
└──────┘ └──────┘ └──────┘
       │                │
       ▼                ▼
  .features/         Git Worktree
  (状态隔离)          (代码隔离)
```

### 2.2 层级职责

| 层级 | Skill | 职责 | 上下文策略 | 隔离策略 |
|------|-------|------|-----------|---------|
| 产品诊断层 | up-prd | 需求分析、问题归因、PRD 管理 | 在主上下文执行 | 创建 .features/{id}/ |
| 编排层 | do-dev | Discussion + Research + 调度 | 主上下文只做编排 | 管理 _registry.md |
| 执行层 | do-design/do-eng/do-qa | 具体实现 | 独立 Agent 上下文 | Git Worktree + status.md |

### 2.3 数据流

```
PRD.md → do-dev 读取迭代摘要
  → CONTEXT.md（用户偏好）
  → RESEARCH.md（技术调研）
  → do-design 读取 PRD + RESEARCH → DESIGN.md
  → do-eng 读取 PRD + DESIGN + RESEARCH → ENGINEERING.md + 代码 + git commits
  → do-qa 读取 PRD + ENGINEERING → QA.md + 测试报告
```

### 2.4 多会话并行架构

```
终端 1: claude -w feat-X       终端 2: claude -w feat-Y
│ (独立 worktree + 分支)       │ (独立 worktree + 分支)
│                              │
├ .features/feat-X/status.md   ├ .features/feat-Y/status.md
├ 代码改动在自己分支上          ├ 代码改动在自己分支上
│                              │
└──────── 共享 ────────────────┘
         _registry.md（全局注册表）
         .git/（共享 git 数据库）
```

隔离策略：
- **代码隔离**：Git Worktree（每个 feature 独立分支+目录）
- **状态隔离**：`.features/` 目录（每个 feature 独立 status.md）
- **孤儿检测**：heartbeat 机制（>30分钟无更新视为可能孤儿）
- **版本号隔离**：预留机制（up-prd 创建时预留，不回收）

---

## 三、核心功能

### 3.1 up-prd — 产品诊断

**输入**：用户描述的问题或需求
**输出**：更新后的 PRD.md + PRD-CHANGELOG.md

| 功能 | 说明 |
|------|------|
| 三层自适应审查 | 轻量（小改动）/ 标准（功能调整）/ 深度（架构级） |
| 自动升级 | CHANGELOG 同一模块 ≥3 版本反复修改 → 深度审查 |
| 问题归因 | 产品设计缺陷 / 实现偏离 PRD / PRD 遗漏场景 |
| 反驳机制 | 需求不合理时给出替代方案 |
| 从零创建 | 深度读代码 + 5 轮交互 → 完整 PRD |

### 3.2 do-dev — 开发调度

**输入**：PRD 迭代摘要
**输出**：CONTEXT.md + RESEARCH.md + 调度子 skill 执行

| 功能 | 说明 |
|------|------|
| Discussion | 识别灰区，结构化收集用户偏好 |
| Research | 四维调研（技术栈/架构/坑点/复用），prompt 驱动 |
| 智能调度 | 根据变更类型判断需要哪些子 skill |
| 上下文工程 | 子 skill 在独立 Agent 上下文执行 |
| 状态管理 | `.do-dev/state.json` + 检查点 patch |
| 三种模式 | 交互 / 自动（--auto）/ 恢复（--resume） |

### 3.3 do-design — 设计

**输入**：PRD + RESEARCH.md
**输出**：DESIGN.md + DESIGN-CHANGELOG.md + 样式变更

| 功能 | 说明 |
|------|------|
| 12 条认知模式 | 同理心即模拟、约束崇拜、提问反射 等 |
| 80 项审计清单 | 视觉层级/排版/颜色/间距/交互/响应式/动效/微文案/AI痕迹/性能 |
| A-F 评分 | 10 类权重评估 |
| 线框图输出 | ASCII 线框图供用户确认 |

### 3.4 do-eng — 工程

**输入**：PRD + DESIGN.md + RESEARCH.md
**输出**：ENGINEERING.md + ENG-CHANGELOG + 代码 + 原子 git commits

| 功能 | 说明 |
|------|------|
| 7 条工程思维 | 爆炸半径/无聊优先/增量/系统设计/可逆性/DX/先重构 |
| 范围挑战 | 8+ 文件或 2+ 新类 = 警告 |
| 四章审查 | 架构 → 代码质量 → 测试 → 性能 |
| 任务拆分 | 垂直切片，每任务 1-3 个文件 |
| Wave 并行 | 独立任务并行，依赖任务顺序 |
| 原子 Git | 每任务独立 commit，支持 bisect |
| 3 个必需清单 | 未纳入范围 / 已存在内容 / 故障模式 |

### 3.5 do-qa — QA

**输入**：PRD + ENGINEERING.md + 代码
**输出**：QA.md + QA-CHANGELOG + 测试报告 + 健康评分

| 功能 | 说明 |
|------|------|
| 5 维度评分 | 功能(30%)/UI(25%)/性能(20%)/错误处理(15%)/兼容性(10%) |
| 三级测试 | 快速（严重）/ 标准（+中等）/ 详尽（+外观） |
| 两种模式 | 浏览器 E2E / 纯代码测试 |
| 原子修复 | 每 Bug 独立 commit + 验证 |
| 上线判定 | ✅ 可上线 / ⚠️ 需关注 / ❌ 不建议 |

---

## 四、文档体系

### 4.1 项目文档结构

```
project/
├── docs/
│   ├── PRD.md                        ← up-prd
│   ├── PRD-CHANGELOG.md              ← up-prd
│   ├── vX.Y-CONTEXT.md               ← do-dev（用户偏好）
│   ├── vX.Y-RESEARCH.md              ← do-dev（技术调研）
│   ├── DESIGN.md                     ← do-design
│   ├── DESIGN-CHANGELOG.md           ← do-design
│   ├── ENGINEERING.md                ← do-eng（前后端合一）
│   ├── ENGINEERING-CHANGELOG.md      ← do-eng
│   ├── QA.md                         ← do-qa
│   └── QA-CHANGELOG.md               ← do-qa
├── .features/                         ← 多会话状态管理
│   ├── _registry.md                   ← 全局注册表
│   ├── {feature-id}/
│   │   ├── status.md                  ← 流水线状态
│   │   └── state.json                 ← do-dev 检查点
│   └── ...
```

### 4.2 文档规范

- 文件名通过模式匹配定位（不写死，支持中文命名）
- 每份文档顶部有迭代历史摘要，保留所有版本记录
- CHANGELOG 不存在时从 git 历史 + 项目文档回溯创建
- 下游 skill 读取上游文档（do-eng 读 DESIGN.md，do-qa 读 ENGINEERING.md）

---

## 五、方法论来源

| Skill | 参考来源 | 继承的核心方法 |
|-------|---------|--------------|
| up-prd | cn-plan-product | 10 星挑战、假设审查、反驳机制 |
| do-design | cn-plan-design | 12 条认知模式、80 项审计清单、A-F 评分 |
| do-eng | cn-plan-eng | 7 条工程思维、范围挑战、四章审查、故障模式清单 |
| do-qa | cn-qa | 5 维度健康评分、浏览器测试命令、原子修复流程 |
| do-dev | cn-deliver + GSD | 状态管理、双模式、检查点、上下文工程、Wave 并行 |

---

## 六、已知限制

1. **Wave 并行受限**：当前 do-design → do-eng → do-qa 是严格顺序依赖，无法跨阶段并行
2. **Discussion 深度有限**：灰区识别依赖变更类型的规则匹配，可能遗漏特殊场景
3. **Research 无外网搜索**：调研基于自身知识 + 项目代码，需要时可用 WebSearch 补充
4. **状态恢复粒度**：do-dev 的 `--resume` 只能恢复到阶段级别，无法恢复到任务级别
5. **无部署/运维 skill**：当前体系不覆盖部署、运维、数据迁移等环节
6. **Worktree 合并冲突**：多个 feature 修改同一文件时，合并回 main 仍需手动解决冲突
7. **注册表并发写入**：`_registry.md` 是共享文件，极端情况下多会话同时写可能丢行（概率低，因为写入间隔大）