# forge-bugfix · P2/P2.5 范围与报告创建手册

> 由 SKILL.md 骨架按需加载：每次领取新 bug 时必读。含多来源捞候选、backlog 写入、BF 验收报告创建。

## P2 范围推荐（多来源捞候选 + 写入 backlog.md）

> 🎯 核心：不做"全量分诊排序后逐个修"，而是"AI 推荐单次修复范围，其余进 backlog.md"。
> **v6.0 新增**：P2 必须做功能域判重（读 `.forge/active.md`），决定**同域合并到已有会话** vs **异域鼓励新窗口并行**。
> **v7.0 新增**：forge-qa 发现的问题也是正式入口。QA 自动闭环可以批量登记 bug，但修复执行仍然一次一个 bug。

### 2.0 并行状态读取 + 功能域准备（v6.0 新增）

**硬性步骤**。在 2.1 捞候选之前，AI 必须：

1. **读 `.forge/active.md`**
   - 解析"功能域声明"区 → 得到本项目的合法功能域标签清单 `$DOMAINS`
   - 解析"进行中会话"节 → 得到所有占用中的域集合 `$BUSY_DOMAINS`（多域条目视为同时占用多个）
   - 如果 `.forge/active.md` 不存在，AI 提示用户"首次使用并行化，需要你在 .forge/active.md 里声明功能域标签（示例已给出）"，并暂停等用户确认后再继续

2. **给每条候选 bug 打功能域标签**
   - 标签必须从 `$DOMAINS` 选取，不得自创
   - 重构型 bug 允许多域（逗号分隔），任一域与 `$BUSY_DOMAINS` 有交集即判冲突
   - 无法判定时向用户确认，不猜测

3. **对照判定**
   - bug.功能域 ∩ `$BUSY_DOMAINS` ≠ 空 → 标记"⚠️ 域冲突：域 X 当前由 session Y 占用"
   - bug.功能域 ∩ `$BUSY_DOMAINS` = 空 → 标记"✅ 可并行"

### 2.1 AI 捞候选

候选来源有三个：

1. **用户本会话报告的 bug**（直接描述）
2. **forge-qa 发现的结构化 bug**（来自功能开发后的 QA 自动闭环或完整 QA 报告）
3. **`$DOC_BACKLOG` 的 🐛 待修区**（跨会话登记的）

forge-qa 传入的问题必须包含：标题、严重度、关联 Feature Spec 场景、复现步骤、截图/日志证据、Frontend/Backend 地址、环境身份摘要、是否属于本轮功能范围。缺字段则先补齐报告，不直接修。

AI 合并三个来源，推荐**本次修哪个/哪些**：

```
推荐规则：
- 默认推荐 1 个 bug
- 当且仅当 AI 判断 2 个 bug 共享同一根因时，可推荐 1-2 个（必须举证）
- 共因判断标准：
  ✓ 修同一组文件
  ✓ 改同一个函数/数据结构
  ✓ 同一个上游依赖（如同一个 API 端点失效）
- 不共因的"看起来类似" → 拆开走多次修复（单独会话）
- 从 backlog 捞候选时，优先级 P0 > P1 > P2，相同优先级按登记时间
```

### 2.2 AskUserQuestion 确认

```
🎯 本次修复范围推荐

本会话新报告：N 个问题
Backlog 待修区：M 个条目（P0: X 个 / P1: Y 个 / P2: Z 个）
当前并行会话：K 个（域 asr / 域 player ... 被占用）

我推荐本次修：

  ✅ 本次：[Bug A]（BF-0419-2）
     来源：本会话新报告 / 或 backlog 登记于 2026-04-17
     功能域：asr
     并行判定：✅ 可并行（域 asr 当前无活跃会话）
        或：⚠️ 域冲突（域 asr 已被 session abc-123 占用——建议你切去那个窗口加入而非新开）
     理由：阻塞核心流程且独立可定位（或：Bug A + Bug C 共因 = XX.tsx 的 source 字段处理）

  📋 推迟到 backlog（下次修复或下次会话再说）：
     - Bug B: [症状] → 写入 backlog.md 🐛 待修区（P1，域 auth）
     - Bug D: [症状] → 写入 backlog.md 🐛 待修区（P2，域 player）
     - 新需求 N1: [描述] → 写入 backlog.md 💡 新需求区（建议 /forge-prd）

我会把推迟的写入 `$DOC_BACKLOG`，把本次修复的在 P3 登记到 `.forge/active.md`。

A) 同意推荐 — 进入 P3 创建 worktree 并登记 active
B) 调整范围 — 改修 [其他 bug]
C) 我想多修一些 — 违反单次修复原则，请说明理由
D) 域冲突，我切到已有会话 — 本次终止，去 session abc-123 的窗口继续
```

### 2.3 写入 backlog.md

用户确认后，把推迟的条目追加到 `$DOC_BACKLOG` 的对应区：

**🐛 待修区（独立 bug）**：追加一行到表格：

```markdown
| BF-0419-3 | [症状一句话] | 会话 2026-04-19 用户报告 | [相关文件/模块] | auth | P1 | pending | — | docs/bugfix/reviews/BF-0419-3.md |
```

**💡 新需求区**：追加一行到表格：

```markdown
| N-0419-1 | [新需求一句话] | 会话 2026-04-19 用户报告 | 2026-04-19 | 待立项 |
```

**🌀 待澄清区**：追加一行到列表：

```markdown
- [2026-04-19] [模糊反馈原话]，未复现 / 待澄清
```

如果 `$DOC_BACKLOG` 不存在，AI 从模板 `skills/forge-bugfix/templates/backlog.md` 初始化。

### 2.4 Bug 编号

确认范围时为本次修复分配编号：`BF-{MMDD}-{N}`（N = 当日已用编号 +1）。
- 编号用于：worktree 命名、commit message、Bug 修复验收报告文件名
- 从 backlog 捞的条目，沿用其原编号，不重新分配

### 2.5 创建 / 更新 Bug 修复验收报告（硬性）

确认本次修复范围后，AI 必须确保 `$REVIEW_DOC="$DOC_REVIEWS/${BUG_ID}.md"` 存在：

```bash
REVIEW_DOC="$DOC_REVIEWS/${BUG_ID}.md"
if [ ! -f "$REVIEW_DOC" ]; then
  cp "$HOME/.claude/skills/forge-bugfix/templates/review-checklist.md" "$REVIEW_DOC"
fi
```

然后写入报告的前置事实：

| 区域 | 填什么 |
|---|---|
| 当前状态 | `pending` 或 `in-progress` |
| 问题发现记录 | 来源、原始描述、关联 Feature Spec、初始影响范围 |
| 初始证据 | 用户截图、QA 截图、console/network 摘要、日志路径 |
| 复现记录 | 当前复现结论和待执行步骤 |
| 验收入口 | 如已知 Frontend/Backend 地址，先写入；最终以 P6 forge-qa 强校验结果为准 |

同时把 `$DOC_BACKLOG` 中该 bug 的“报告”列指向活跃报告 `docs/bugfix/reviews/${BUG_ID}.md`。

**禁止**等到修完代码才创建报告。报告是单个 bug 的过程案卷，不是最后的附录。

---

