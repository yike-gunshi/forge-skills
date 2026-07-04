# cn-deliver：端到端交付流水线

> 一句话描述你的想法，拿到完整交付。

## 这是什么

`cn-deliver` 是一个编排技能，将 10 个独立的 cn- 技能串联成一条自动化流水线。你只需要输入一个想法或功能描述，它会自动完成从需求分析到验收报告的全流程。

```
想法 → 产品审查 → 设计 → 工程方案 → 实现 → QA → 审查 → 发布 → 文档 → 验收报告
```

## 快速开始

```bash
# 交互模式（默认）— 关键节点暂停让你确认
/cn-deliver "给信息雷达添加 RSS 订阅功能"

# 全自动模式 — 先沟通 1-2 轮，然后全自动执行
/cn-deliver --auto "把列表页的加载改成骨架屏"

# 指定项目路径
/cn-deliver --auto --path ./my-project "重构登录模块"

# 从上次中断处恢复
/cn-deliver --resume
```

## 两种模式

### 交互模式（默认）

适合重要功能、不确定性较高的任务。在 3 个关键节点暂停等待你确认：

| 卡点 | 时机 | 你需要做什么 |
|------|------|------------|
| 卡点 1 | 产品方案审查完成后 | 确认方案方向是否正确 |
| 卡点 2 | 代码实现完成后 | 决定是否先看代码再继续 QA |
| 卡点 3 | 验收报告 | 最终验收 |

其他阶段正常推进，只在遇到不确定问题时才会额外询问你。

### 自动模式（`--auto`）

适合明确的小功能、bug 修复、确定性高的任务。

**前置沟通（必须）：**
- 第 1 轮（必选）：确认需求理解、项目类型、方案方向
- 第 2 轮（按需）：确认外部依赖、解决歧义

沟通完毕后全自动执行，不再暂停。

**自动模式特殊行为：**
- 不执行 `git commit` — 代码改动只存在于工作区
- 每个阶段结束保存检查点（patch 文件），可随时回退
- 遇到阻塞不死等，记录原因后跳到下一个可执行阶段

## 流水线阶段

```
Phase 0  需求理解        将模糊想法转化为结构化需求文档
Phase 1  产品审查        10 星方案挑战、假设审查、范围决策
Phase 2  设计审查        视觉规范、设计体系、交互方案（backend 跳过）
Phase 3  工程方案        架构设计、文件清单、测试矩阵
Phase 4  实现            按工程方案逐文件编码 + 测试
Phase 5  QA 测试+修复    功能测试 + 设计审计（frontend/fullstack）
Phase 6  代码审查        安全、性能、结构性问题检查
Phase 7  发布            创建 PR（交互模式）/ 跳过（自动模式）
Phase 8  文档更新        README/CHANGELOG 等文档同步
Phase 9  验收报告        最终交付总结
```

### 智能跳过

- **纯后端任务**（`type: backend`）自动跳过 Phase 2（设计审查）和 Phase 5 中的设计 QA
- **无浏览器工具时** QA 自动切换为纯代码审查模式
- **无远程仓库时** Phase 7 跳过 PR 创建

## 产出文件

所有产出存放在项目根目录的 `.deliver/` 文件夹下：

```
.deliver/
├── state.json                    # 流水线状态（支持断点续做）
├── requirement.md                # Phase 0：结构化需求文档
├── product-review.md             # Phase 1：产品审查报告
├── design-review.md              # Phase 2：设计审查报告（backend 无此文件）
├── eng-plan.md                   # Phase 3：工程方案
├── checkpoints/                  # 检查点（仅自动模式）
│   ├── phase-3-done.patch        #   工程方案定稿后的代码快照
│   ├── phase-4-done.patch        #   实现完成后的完整 diff
│   ├── phase-5-done.patch        #   QA 修复后的完整 diff
│   └── phase-6-done.patch        #   代码审查修复后的完整 diff
└── acceptance-report.md          # Phase 9：最终验收报告
```

## 检查点与回退

自动模式下不执行 git commit，而是通过 patch 文件保存每个阶段的代码快照。

**回退到指定阶段：**

```bash
# 清除当前工作区改动
git checkout -- .

# 恢复到 Phase 4（实现完成后）的状态
git apply .deliver/checkpoints/phase-4-done.patch
```

**查看检查点摘要：**

```bash
cat .deliver/checkpoints/phase-4-done.patch.summary
```

## state.json 格式

```json
{
  "task": "需求描述",
  "mode": "auto",
  "type": "fullstack",
  "branch": "feat/rss-feed",
  "started_at": "2026-03-19T10:00:00Z",
  "current_phase": 4,
  "phases": {
    "0": { "status": "done", "output": ".deliver/requirement.md" },
    "1": { "status": "done", "output": ".deliver/product-review.md" },
    "2": { "status": "skipped", "reason": "backend-only" },
    "3": { "status": "done", "output": ".deliver/eng-plan.md" },
    "4": { "status": "in_progress" },
    "5": { "status": "pending" },
    "6": { "status": "pending" },
    "7": { "status": "pending" },
    "8": { "status": "pending" },
    "9": { "status": "pending" }
  }
}
```

阶段状态：`pending` → `in_progress` → `done` / `skipped` / `blocked`

## 依赖的 cn- 技能

cn-deliver 编排以下技能的核心逻辑（不需要手动调用它们）：

| 阶段 | 依赖技能 | 用途 |
|------|---------|------|
| Phase 1 | cn-plan-product | 10 星方案、假设审查、范围决策 |
| Phase 2 | cn-plan-design | 设计体系提取、视觉审计清单 |
| Phase 3 | cn-plan-eng | 架构设计、测试矩阵 |
| Phase 5 | cn-qa + cn-qa-design | 功能测试 + 设计审计 |
| Phase 6 | cn-review | 代码审查清单 |
| Phase 7 | cn-ship | PR 创建、CHANGELOG 更新 |
| Phase 8 | cn-doc-release | 文档交叉对照更新 |

## 验收报告示例

验收报告（`.deliver/acceptance-report.md`）包含：

- **基本信息** — 任务、模式、项目类型、时间
- **需求回顾** — 原始需求 vs 最终方案
- **方案摘要** — 产品星级、设计评分、工程概要
- **实现清单** — 每个文件的操作和完成状态
- **QA 结果** — 健康评分、Bug 统计、测试覆盖
- **代码审查** — 发现和修复的问题
- **发布状态** — PR URL 或工作区状态
- **已知遗留** — 未修复的 Bug、推迟的功能
- **检查点清单** — 所有可回退的检查点
- **下一步建议** — 后续工作方向

## 注意事项

1. **一次一个功能** — 不要在一次流水线中塞入多个不相关的功能
2. **自动模式前置沟通不可跳过** — "自动"是沟通完毕后的执行自动，不是跳过沟通
3. **自动模式不提交代码** — 验收通过后由你决定是否 commit/push
4. **断点续做** — 如果对话中断，下次用 `--resume` 从上次位置继续
5. **通用性** — 不绑定任何特定项目、框架或语言，自动检测环境
