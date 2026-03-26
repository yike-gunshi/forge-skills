# forge-deliver 分析：单体流水线 vs 模块化编排

## 背景

forge-deliver 是 v1 时代的端到端交付流水线，内建 10 个 Phase，每个 Phase 是对应子 Skill 的简化版实现。
在 Forge v2 体系建立后，每个子 Skill（forge-design、forge-eng、forge-qa 等）都经过了深度重写和能力融合。

本文档分析 forge-deliver 与 forge + 子 Skill 的差异，为重写方案提供依据。

---

## 核心差异

| 维度 | forge-deliver（v1 单体） | forge + 子 Skill（v2 模块化） |
|------|-------------------------|------------------------------|
| **架构** | 自己内建所有阶段 | 调用独立 Skill |
| **设计审查** | ~30 行简化 | forge-design 695 行自闭环 |
| **工程实现** | 无 Worktree / TDD / Verification | forge-eng 690 行 + 3 辅助文件 |
| **QA** | 测试+修复混合 | forge-qa 纯验收，修复回 forge-eng |
| **状态管理** | ✅ state.json + 检查点 | ❌ 无统一状态管理 |
| **恢复能力** | ✅ --resume 从任意 Phase | ❌ 无恢复机制 |
| **全自动模式** | ✅ --auto 前置沟通后全自动 | ❌ 需手动逐步调用 |

## 逐 Phase 对比

### Phase 0: 需求理解 vs forge-brainstorm + forge-prd

- **deliver**: 解析用户输入 → requirement.md（简单结构化）
- **forge 体系**: 4 模式发散讨论 + 前提挑战 + 结构化 PRD
- **差距**: deliver 的需求理解是被动解析，forge 体系是主动挑战

### Phase 1: 产品审查 vs forge-prd

- **deliver**: 10 星挑战 + 假设审查 + 范围决策（来自 cn-plan-product）
- **forge 体系**: forge-prd 内含诊断 + 挑战 + 范围，且经过多版迭代
- **差距**: 相似，但 forge-prd 更成熟

### Phase 2: 设计审查 vs forge-design

- **deliver**: ~30 行，检查现有体系 + 简单推荐
- **forge-design**: 695 行，99 条 UX 规则、配色/字体搜索引擎、3+ 美学方向、三层 Token、反 AI-slop、A-F 评分、分级门控
- **差距**: **巨大**。deliver 的设计审查几乎是空壳

### Phase 3-4: 工程方案 + 实现 vs forge-eng

- **deliver**: ~80 行，按文件清单逐个编码，无隔离
- **forge-eng**: 690 行 + 3 辅助文件，Worktree 隔离、四级 TDD、Wave 并行、Verification Gate
- **差距**: **巨大**。deliver 没有任何质量保障机制

### Phase 5: QA vs forge-qa

- **deliver**: 测试 + 发现 bug + 直接修复（测试和修复混合）
- **forge-qa**: 纯验收模式（只测不修），产出修复清单回 forge-eng
- **差距**: deliver 的模式正是用户的核心痛点——"不断迭代修 bug"

### Phase 6-9: 审查 + 发布 + 文档 + 验收

- 差距较小，deliver 的简化版基本够用
- forge-review/ship/doc-release 各自更完整但差距不像设计/工程/QA 那么大

## forge-deliver 独有的 3 个能力

1. **全自动模式（--auto）**: 前置沟通后自动执行，不暂停
2. **检查点恢复（--resume）**: state.json 持久化，中断后从任意 Phase 恢复
3. **状态持久化（.deliver/）**: 每阶段产出 + patch 检查点

## 重写决策

**方案 B：重写为纯编排层**

forge-deliver v2 不做任何具体工作，只负责：
- 状态管理（state.json）
- 检查点保存/恢复
- 按顺序调度 forge-* 子 Skill
- 在子 Skill 之间传递产出物（通过文档文件）

每个 Phase 变为"调用对应 forge-* Skill"，deliver 只管编排和状态。

## 重写映射表

| Phase | v1（自己实现） | v2（调用子 Skill） |
|-------|--------------|-------------------|
| 0 需求理解 | 自己解析 | → forge-brainstorm（可选）→ forge-prd |
| 1 产品审查 | 自己做 10 星挑战 | → forge-prd（内含诊断挑战） |
| 2 设计审查 | ~30 行简化 | → forge-design（695 行满配） |
| 2.5 设计实现 | 无 | → forge-design-impl（新增） |
| 3 工程方案 | 自己做 | → forge-eng 第 1-5 步（方案阶段） |
| 4 实现 | 自己逐文件编码 | → forge-eng 第 5.5-7 步（Worktree+TDD+Wave） |
| 5 QA | 测试+修复混合 | → forge-qa（纯验收）→ 有 bug 回 forge-eng |
| 6 代码审查 | 自己做简单清单 | → forge-review |
| 7 发布 | 自己做 | → forge-ship |
| 8 文档 | 自己做 | → forge-doc-release |
| 9 验收 | 自己做 | → 自己生成（汇总所有子 Skill 产出） |

---

*创建日期: 2026-03-26*
*状态: 重写进行中*
