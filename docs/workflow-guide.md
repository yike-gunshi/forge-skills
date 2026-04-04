# 使用指南

## 一、场景选择

### 场景 A：完整流程（推荐）

有新需求或发现产品问题，走完整链路：

```
1. 用户：「瀑布流布局在移动端卡片间距不对」
2. /forge-prd             → 诊断根因，更新 PRD v3.2
3.   ↳ 生成 Feature Spec  → 用户流程 + 页面结构 + Given/When/Then + 验收检查表
4.   ↳ 用户确认 Feature Spec（⚠️ 关键门禁）
5. /forge-dev             → 检查 Feature Spec → Discussion → Research → 调度
6. 用户确认执行计划
7. forge-dev 调度 forge-design → forge-eng（逐场景自验）→ forge-qa
8.   ↳ forge-qa 先给用户看验收计划 → 确认后执行测试 → 验收报告
9. /forge-review          → 代码审查
10. /forge-ship           → 发布
11. /forge-fupan          → 复盘沉淀（可选）
```

**适用**：新功能、功能调整、跨模块变更

> **与之前的区别**：步骤 3-4 是新增的 Feature Spec 确认门禁，步骤 8 是 QA 验收计划确认。

### 场景 B：跳过诊断，直接开发

PRD 已更新好，或需求非常明确：

```
1. /forge-dev             → 读取最新 PRD 迭代摘要
2. 用户确认调度方案
3. 执行
```

### 场景 C：单独调用子技能

只需完成特定环节：

```
/forge-design             → 只做设计 + 样式实现
/forge-eng                → 只写代码
/forge-qa                 → 只跑测试
/forge-bugfix             → 系统性修 Bug
/forge-review             → 只做代码审查
```

### 场景 D：从零创建项目文档

```
1. /forge-prd             → 深度读代码 + 5 轮交互 → 创建 PRD v1.0
2. /forge-design          → 从 CSS 提取设计体系 → DESIGN.md v1.0
3. /forge-eng             → 分析架构 → ENGINEERING.md v1.0
4. /forge-qa              → 建立测试基线 → QA.md v1.0
```

### 场景 E：全自动交付

```
/forge-deliver            → 9 个 Phase 全自动
/forge-deliver --auto     → 前置沟通后完全自动
```

### 场景 F：恢复中断的开发

```
/forge-dev --resume       → 从 .do-dev/state.json 恢复
```

---

## 二、最佳实践

### 需求阶段

- **先诊断再改**：用 `/forge-prd` 诊断根因，不要直接改 PRD
- **Feature Spec 是最重要的门禁**：确认 Feature Spec 中的用户流程、页面结构、Given/When/Then 场景后才进入开发。整体不满意可调整架构，细节不满意可精确反馈
- **利用反驳机制**：forge-prd 会主动质疑不合理需求——这是特性不是 Bug
- **版本号预留**：forge-prd 会预留版本号，避免多会话冲突

### 调度阶段

- **不要跳过 Discussion**：灰区识别能提前发现 80% 的返工原因
- **Research 对非配置变更必须走**：能发现可复用代码和已知坑点
- **确认执行计划是最重要的门控**：最后一次低成本调整方向的机会

### 执行阶段

- **范围挑战认真对待**：forge-eng 报 8+ 文件警告时，考虑拆分
- **四章审查每章确认**：不要一口气跑完
- **原子提交立即做**：任务完成就 commit，不攒到最后
- **Wave 间检查结果**：发现问题及早处理

### 质量阶段

- **先看验收计划再测试**：forge-qa 会基于 Feature Spec 生成验收计划，确认后才执行
- **QA 级别选标准**：除非时间极紧
- **反馈时触发举一反三**：报告问题后 AI 会搜索相似模式，产出类似风险清单
- **forge-review 的 AUTO-FIX 不需要确认**
- **严重问题必须修**

### 发布与复盘

- **CHANGELOG 必须更新**
- **发布后跑 cn-doc-release**
- **每个功能做完都复盘**：`/forge-fupan`

---

## 三、跳过机制

| 阶段 | 如何跳过 | 什么时候可以跳过 |
|------|---------|---------------|
| Discussion | 说"用默认" | 纯配置变更、需求完全明确 |
| Research | 说"跳过调研" | 纯配置变更、技术栈熟悉 |
| forge-design | 不调度 | 纯后端变更 |
| forge-qa | 不调度 | 仅文档变更 |
| forge-review | 不调用 | 极小变更（<10行） |

---

## 四、多会话并行

### 启动并行开发

```
终端 A：/forge-prd → 创建 feat-dark-mode → /forge-dev
终端 B：/forge-prd → 创建 feat-api-v2   → /forge-dev
```

### 状态隔离

- 每个 feature 自动注册到 `.features/_registry.md`
- 运行状态在 `.features/{id}/status.md` 中独立
- 领域文档共享，按版本区分

### 孤儿检测

- forge-dev 启动时检查 heartbeat > 30 分钟的 feature
- 提醒用户：恢复 / 完成 / 清理

### 代码隔离（演进方向）

未来引入 Git Worktree：
```bash
git worktree add .worktrees/feat-dark-mode -b feat/dark-mode
```

---

## 五、模式对比

### forge-dev 三种模式

| 模式 | 门控点 | 适用场景 |
|------|--------|---------|
| 交互（默认） | 3 个硬卡点 | 新功能、复杂变更 |
| 自动 (`--auto`) | 前置沟通 | 信任度高、小型变更 |
| 恢复 (`--resume`) | 从断点继续 | 会话中断后恢复 |

---

## 六、常见问题

**Q：必须按顺序执行吗？**
A：不是。每个 Skill 独立可用。

**Q：没有 PRD 能直接用 forge-eng 吗？**
A：可以，但 forge-dev 会警告缺少 Feature Spec。有 PRD + Feature Spec 效果最好。

**Q：什么是 Feature Spec？**
A：PRD 中的一个章节，包含用户流程总览、页面/系统结构、Given/When/Then 行为场景和验收检查表。它同时服务于用户确认和 QA 验收。

**Q：举一反三是什么？**
A：当你在验收时反馈问题，AI 会修复后自动搜索代码库中相似模式，产出类似风险清单问你是否一并修复。

**Q：forge-dev 会自动执行所有子技能吗？**
A：不会。确认后才执行。

**Q：文件名必须是英文吗？**
A：不必须。模式匹配，支持中文。

**Q：什么是 context rot？**
A：上下文窗口填满后质量下降。子 Skill 独立上下文解决。

**Q：原子提交的好处？**
A：`git bisect` 定位 Bug、独立 revert、清晰 history。
