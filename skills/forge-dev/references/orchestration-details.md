# forge-dev · 编排细则手册

> 由 SKILL.md 骨架按需加载。含：state.json 状态管理与 --resume 恢复、汇总交付报告格式、验收操作清单、Feature 状态管理操作。

## 状态管理

### 状态文件

所有调度产出写入项目根目录的 `.forge/` 文件夹：

```
.forge/
├── state.json                    # 调度状态（持久化）
├── visual-decision.md            # UI/设计相关任务的视觉决策索引（可选）
├── checkpoints/
│   ├── design-done.patch         # 设计阶段完成后的代码状态
│   ├── eng-done.patch            # 工程阶段完成后的完整 diff
│   └── qa-done.patch             # QA 修复后的完整 diff
└── delivery-report.md            # 最终交付报告
```

### state.json 格式

```json
{
  "task": "需求描述",
  "mode": "auto|interactive",
  "type": "frontend|backend|fullstack",
  "branch": "分支名",
  "prd_version": "vX.Y",
  "started_at": "ISO 8601 时间",
  "phases": {
    "discussion": { "status": "pending|in_progress|done|skipped", "note": "" },
    "research": { "status": "pending|in_progress|done|skipped", "note": "" },
    "design": { "status": "pending|in_progress|done|skipped|blocked", "note": "" },
    "eng": { "status": "pending", "note": "" },
    "qa": { "status": "pending", "note": "" }
  }
}
```

**每次进入新阶段时：** 更新状态为 `in_progress`，写入 state.json。
**每次完成一个阶段时：** 更新状态为 `done`，保存检查点（自动模式）。

### 检查点保存

自动模式下，每个阶段完成后保存检查点：

```bash
mkdir -p .forge/checkpoints
git diff > .forge/checkpoints/[phase]-done.patch
git diff --stat >> .forge/checkpoints/[phase]-done.patch.summary
```

**回退方法（供用户手动使用）：**
```bash
git checkout -- .                                     # 清除当前工作区
git apply .forge/checkpoints/[phase]-done.patch      # 恢复到指定阶段
```

---


---

## 第5步：汇总交付

所有子技能完成后，输出交付总结：

```
+================================================================+
|                      开发交付完成                                 |
+================================================================+
| 项目：[项目名]                                                    |
| PRD 版本：vX.Y                                                   |
| 项目类型：[frontend / backend / fullstack]                        |
| 模式：[交互 / 自动]                                               |
+----------------------------------------------------------------+
| Discussion：[完成/跳过] — CONTEXT.md [已生成/已跳过]               |
| Research：[完成/跳过] — RESEARCH.md [已生成/已跳过]                |
+----------------------------------------------------------------+
| 执行的子技能（独立上下文）：                                        |
|   forge-design  — [完成/跳过/阻塞] — DESIGN.md [已更新/已创建]        |
|   forge-eng     — [完成/跳过/阻塞] — ENGINEERING.md [已更新/已创建]   |
|   forge-qa      — [完成/跳过/阻塞] — QA.md [已更新/已创建]            |
+----------------------------------------------------------------+
| 代码变更：X 个文件（新增 Y / 修改 Z）                               |
| Git 提交：N 个原子提交                                             |
| 测试结果：[通过/有遗留问题]                                        |
| 健康评分：XX/100                                                  |
| 上线就绪：✅ / ⚠️ / ❌                                             |
+----------------------------------------------------------------+
| [自动模式] 检查点：                                                |
|   .forge/checkpoints/design-done.patch                          |
|   .forge/checkpoints/eng-done.patch                             |
|   .forge/checkpoints/qa-done.patch                              |
+================================================================+
```

写入 `.forge/delivery-report.md`，更新 state.json 所有阶段标记为 `done`。

### 验收操作清单（必须产出）

每次实现完成后，**必须**输出一份面向用户的验收操作清单。用户会按照清单逐步操作确认修复效果。格式如下：

```

---

## 验收操作清单

### 改动说明
逐条列出本次所有代码改动，每条包含：
- **文件**：文件路径 + 行号范围
- **改了什么**：用一句话说清楚改动内容（不用代码术语，用户能理解的语言）
- **为什么改**：对应 PRD 的哪个变更项（如 G1、G2）

### 验收步骤
编号列出用户需要执行的操作步骤，每步包含：
1. **操作**：具体要做什么（如"打开频道页 → 点击 B 站 → 点击展开更多"）
2. **预期结果**：正确行为是什么（如"页面不跳动，停留在原位"）
3. **对比旧行为**：修复前是什么样的（如"之前会跳到 B 站所有卡片的最底部"）

### 回归检查
列出需要额外确认没有被破坏的功能点（如"收起按钮仍正常滚动到 section 顶部"）
```

**规则：**
- 验收步骤必须覆盖 PRD 变更清单中的每一项
- 每个步骤必须具体到可操作（不能写"检查展开功能"，要写"打开频道页 → 点击 B 站 → 点击展开更多"）
- 如果变更涉及多个 Tab/Section，必须列出所有需要检查的位置
- 回归检查覆盖相关联的未修改功能

### 出口建议（交付完成后）

交付报告产出后，通过 AskUserQuestion 建议下一步：

```
开发交付完成。建议下一步：

A) /forge-review — PR 审查，检查结构性问题
B) /forge-ship — 直接发布（适合小改动，跳过审查）
C) /forge-fupan — 先复盘再发布（推荐，沉淀经验）
D) 继续迭代 — 还有功能要加
E) /forge — 不确定，让 Forge 帮我判断
```

---


---

## Feature 状态管理（.features/ 架构）

### 核心原则

**领域文档只存内容，不存运行状态。** 所有运行状态集中在 `.features/{feature-id}/status.md`，按 feature 隔离，支持多会话并行。

### 状态标记协议

| 标记 | 含义 |
|------|------|
| `[⏳ 待处理]` | 已规划，未开始 |
| `[🔄 进行中]` | 当前正在执行 |
| `[✅ 已完成]` | 执行完成 |
| `[❌ 失败]` | 执行失败，需干预 |
| `[⏸️ 暂停]` | 等待用户确认或外部依赖 |

### 调度器的状态管理职责

forge-dev 作为调度器，承担三重职责：

#### 1. 管理自身状态（state.json + status.md）

state.json 用于调度器内部的阶段跟踪（discussion/research/dispatch 等）。
同时通过 `.features/{feature-id}/status.md` 暴露全局可见的 Pipeline 状态。

#### 2. 孤儿检测（启动时）

```
第0步启动时：
  → 读取 .features/_registry.md
  → 遍历所有 status == active 的 feature
  → 如果某 feature 的 heartbeat 超过 30 分钟：
    → 警告用户："Feature X 已 30+ 分钟无心跳，上次活跃 skill: Y"
    → 选项：A) 认领继续  B) 标记为 abandoned  C) 忽略
```

#### 3. 感知子 skill 的运行状态

在调度子 skill 前后，**读取 `.features/{feature-id}/status.md` 的 Pipeline 表**：

```
调度 forge-design 前：
  → 读取 status.md → 确认 prd 行为 [✅ 已完成]
  → 如果 prd 行为 [🔄 进行中]，暂停并提示用户

调度 forge-eng 前：
  → 读取 status.md → 确认 design 行为 [✅ 已完成] 或 skipped
  → 如果 design 行为 [🔄 进行中]，等待 forge-design 完成

调度 forge-qa 前：
  → 读取 status.md → 确认 eng 行为 [✅ 已完成]
  → 如果 eng 行有 Tasks 表中存在 [❌ 失败]，提示用户
```

#### 4. 汇总全局运行状态

在交付报告中，读取 `.features/{feature-id}/status.md` 汇总 Pipeline + Tasks + QA Items 的完整状态。

### 传递给子 skill 的状态指令

调度子 skill 时，在 Agent prompt 中加入状态管理指令：

```
状态管理要求：
1. Feature ID: {feature-id}
2. 状态文件: .features/{feature-id}/status.md
3. 注册表: .features/_registry.md
4. 开始执行时，更新 status.md Pipeline 表中对应行为 [🔄 进行中]
5. 每个阶段/任务的状态变更实时更新到 status.md
6. 完成时更新为 [✅ 已完成]，记录 completed 时间
7. 失败时标记 [❌ 失败] 并在 note 中写明原因
8. 每次状态变更都更新 _registry.md 中的 heartbeat
9. 不要在领域文档（DESIGN.md/ENGINEERING.md/QA.md）中写入任何运行状态
```

---

---

## 第4步：Wave 并行调度机制（完整细则）

> 由 SKILL.md 骨架按需加载：确认执行计划、进入实际调度时必读。

用户确认后，按计划执行。**核心变化：使用 Agent 工具在独立上下文中执行每个子 skill。**

### Wave 分组

分析子 skill 间的依赖关系，将可并行的分为同一 wave：

```
Wave 1（可并行）：
  - forge-design（如需要）— 读取 PRD + RESEARCH.md

Wave 2（依赖 Wave 1）：
  - forge-eng — 读取 PRD + DESIGN.md + RESEARCH.md

Wave 3（依赖 Wave 2）：
  - forge-qa — 读取 PRD + ENGINEERING.md + 代码
```

**注意**：在当前架构中 forge-design → forge-eng → forge-qa 是严格顺序依赖的，所以实际是 3 个 wave 各 1 个 skill。但如果未来有多个并行的 forge-eng 任务（如前端和后端互不依赖），可以归入同一 wave 并行执行。

### 每个子 skill 的调度方式

使用 Agent 工具启动独立上下文：

```python
# 伪代码示意
for wave in waves:
    agents = []
    for skill in wave.skills:
        agent = Agent(
            prompt=f"""
            你是 {skill.name} 技能，现在执行以下任务：

            项目路径：{project_path}
            PRD 路径：{prd_path}
            本次变更：{change_summary}
            调研报告：{research_path}
            前序产出：{previous_outputs}
            用户偏好：{context_path}
            视觉决策索引：{visual_decision_path or "无"}

            请按照你的 SKILL.md 流程执行。
            """,
            subagent_type="general-purpose"
        )
        agents.append(agent)
    # 同一 wave 内的 agent 并行启动
    # 等待所有 agent 完成后进入下一 wave
```

### 子 skill 执行后的验收

每个子 skill（Agent）完成后：

1. **读取产出文档** — 确认文档已正确更新（DESIGN.md / ENGINEERING.md / QA.md）
2. **读取代码变更** — `git diff --stat` 确认变更范围合理
3. **保存检查点**（自动模式）：`git diff > .forge/checkpoints/[phase]-done.patch`
4. **阶段确认**（交互模式）：向用户简要汇报，确认是否继续下一个 wave

### 阻塞处理

某个子 skill 执行中遇到问题时：
- **交互模式**：暂停并通过 AskUserQuestion 询问用户
  - A) 修正后重试（重新启动 Agent）
  - B) 跳过此环节继续下一个 wave
  - C) 中止，保存当前进度
- **自动模式**：记录阻塞原因，跳到下一个可执行阶段，在交付报告中标注

---
