# Feature 状态协议（单源）

> `.features/` 状态标记与操作规则以本文件为准。各 SKILL.md 只写一行引用 + 本 skill 特有的行级动作，不再复制标记表。

## 核心原则

**领域文档（PRD.md / DESIGN.md / ENGINEERING.md / QA.md）只存内容，不存运行状态。** 运行状态写入 `.features/{feature-id}/status.md`，注册表在 `.features/_registry.md`。

## 状态标记

| 标记 | 含义 |
|------|------|
| `[⏳ 待处理]` | 已规划，未开始 |
| `[🔄 进行中]` | 当前正在执行 |
| `[✅ 已完成]` | 执行完成 |
| `[❌ 失败]` | 执行失败，需干预 |
| `[⏸️ 暂停]` | 等待用户确认或外部依赖 |

## 通用操作规则

1. **启动时**：读取 status.md，确认前序阶段行为 `[✅ 已完成]`，把本 skill 对应行更新为 `[🔄 进行中]`
2. **阶段推进时**：更新 note 字段和 `_registry.md` heartbeat
3. **等待确认时**：本 skill 行改为 `[⏸️ 暂停]`
4. **完成后**：本 skill 行改为 `[✅ 已完成]`，记录 completed 时间；note 填关键结果（如 QA 的 `{passed}/{total} PASS`）
5. **失败时**：本 skill 行改为 `[❌ 失败]`，note 填失败原因

## 跨 Agent 协作

- forge-dev 调度器通过 status.md 感知各阶段进度
- 下游 skill 启动前确认上游行为 `[✅ 已完成]`（如 qa 确认 eng）
- 多个会话可同时在不同 feature 上执行（各自独立 worktree）
