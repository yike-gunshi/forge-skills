# forge-bugfix · P6-P7.5 验收与分流手册

> 由 SKILL.md 骨架按需加载：修复完成进入验收时必读。含 forge-qa 调用、人工验收硬关卡、Pass/Fail/新发现分流、边界确认。

## 导航（按需跳读）

> 本文件近 500 行，按当前所处阶段搜小节标题跳读即可。

| 小节 | 何时需要读 |
|---|---|
| P6 调用 forge-qa 自动验收 | 修复提交后触发自动 QA 时：前置门禁、Skill 调用方式、结果解析、QA_FAIL 回修纪律、异常兜底 |
| P6.5 用户人工验收 / 批次最终验收 | 自动 QA 通过后进入人工验收硬关卡时：通知话术、等待信号、判定与边界情况 |
| P7 按最终结论分流 | 用户给出最终结论后：Pass 走 worktree 合并决策，Fail 回 P5，Pass + 新发现进 P7.4 |
| P7.4 Pass 边界确认 + 文档更新询问 | 合并完成后收尾时：告知用户本次 bug 已完成、询问是否写入文档 |
| P7.5 新发现分流 | 验收过程中冒出新问题需要登记分流时 |

---

## P6 调用 forge-qa 自动验收（强规范：必须执行）

> 🎯 **不再由 forge-bugfix 内部做 QA**，明确调用 `/forge-qa`。职责分离 + 双层验收。
> **本节是 AI 必须执行的硬性流程**，任何 QA 跳过都是违规。

### 6.1 触发前置检查（硬性门禁，不通过不得调用）

调用 forge-qa 之前，AI **必须**逐项核对：

| 检查项 | 命令或方式 | 不通过处理 |
|---|---|---|
| Bug 修复验收报告存在 | `test -f "$REVIEW_DOC" && echo OK` | 回 P2.5 补建报告 |
| 人工验收指南 ≥ 3 条 | 读报告，数"人工验收指南"表格行数 | 回 P5.3 补齐验证项 |
| QA 证据区未被 AI 越位填写 | 读"QA 测试过程与截图证据"节 | AI 越位填过就清空重来 |
| 独立 TDD 证据已写入 | 读"TDD / 回归用例"节 | 回 P5 补 RED/GREEN 证据 |
| worktree 代码已提交 | `cd "$WT_PATH" && git status --porcelain` 应为空 | 补提交 |
| 独立 worktree 证据 | 报告 Worktree 字段包含 `.worktrees/bf-...` 或项目约定的独立 worktree 路径 | 回 P3 创建/迁移独立 worktree；已有例外必须写明原因并让用户确认 |
| 用户问题闭环断言 | 报告有"用户问题闭环断言"，且结论不为空 | 回 P5.3 补齐 |
| 配置/开关/数据检查 | 前端/权限/数据可见性 bug 的报告有"配置 / 开关 / 数据就绪检查" | 回 P4 重查根因 |
| APP_URL 来源（如 bug 类型需要） | `APP_URL` 来自 `npm run dev:status` / `scripts/dev-stack.sh status` 输出 | 回 P3.2 重启并重新读取 |
| 应用可访问（如 bug 类型需要） | `curl -sf "$APP_URL" > /dev/null` | 用统一 dev 入口重启 |
| 前后端进程身份核对 | `dev:status` 或 `lsof -p $PID \| grep cwd` 指向当前 worktree | 停当前 worktree 服务后重启；无法确认则 blocked-human |

**任一不通过 → 不启动 forge-qa，先补齐。**

### 6.2 触发 forge-qa（必须用 Skill 工具）

AI **必须**通过 Skill 工具触发 forge-qa，**不得**用自然语言"暗示"、不得绕过：

调用格式：

```
Skill(
  skill="forge-qa",
  args="mode=B review_doc=<报告路径> bug_id=<BF-XXXX> worktree=<路径> app_url=<URL> commit=<hash>"
)
```

**args 字段含义与必填规则**：以 `~/.claude/skills/forge-qa/SKILL.md`「调用模式」节为唯一出处，此处不重复维护。

AI 在调用前向用户说明：

```
🧪 调用 forge-qa 做自动验收 (BF-0419-2)

Bug 修复验收报告: docs/bugfix/reviews/BF-0419-2.md
模式: Mode B（单 bug 验收）
传入参数: review_doc, bug_id, worktree, commit, app_url

forge-qa 会跑完所有验证项，把逐步截图、深度断言、环境身份校验回填到报告里，我等它返回。
```

然后**立刻**执行 Skill 工具调用，不要做任何其他操作。

### 6.3 等待返回 + 重读报告（不依赖记忆）

forge-qa 执行完成后，AI 必须**重新读取 `$REVIEW_DOC`**，以文件内容为准解析结果：

```bash
cat "$REVIEW_DOC"
```

**禁止**依赖 Skill 工具返回的文本消息推断 QA 结果，只以报告文件内容为准。

### 6.4 结果解析（三态 + 证据完整性门禁）

forge-qa 返回后，AI **必须先跑 Bug 修复验收报告完整性校验器**，再判断能否进入 P6.5。

校验器路径：本 skill 的 `scripts/validate-bugfix-report.py`。

推荐命令：

```bash
python3 "<forge-bugfix skill dir>/scripts/validate-bugfix-report.py" \
  "$REVIEW_DOC" \
  --ready-for-user \
  --expect-app-url "$APP_URL" \
  --require-browser-evidence \
  --require-user-problem-closure \
  --require-independent-worktree \
  --require-config-readiness
```

`FRONTEND_OR_INTERACTION_BUG` 的判定：

- bug 涉及页面展示、点击、输入、弹窗、路由、视觉、console/network、移动端适配 → 必须传 `--require-browser-evidence`
- bug 来自用户反馈 → 必须传 `--require-user-problem-closure`
- 每个 bug 原则上必须传 `--require-independent-worktree`
- 前端展示、权限边界、数据可见性、灰度/冷启动开关相关 bug → 必须传 `--require-config-readiness`
- 纯 API / 纯后端 / 纯脚本 bug → 可去掉 `--require-browser-evidence`；若没有 app_url，也去掉 `--expect-app-url "$APP_URL"`。报告仍必须写明浏览器证据来源为 `N/A` 和原因

校验器失败即 `QA_INCOMPLETE`。**不得**因为单元测试、curl smoke 或 forge-qa 文本返回看起来通过，就绕过这个门禁。

| 报告状态 | 信号 | 下一步 |
|---------|------|--------|
| QA 证据区所有验证项 = PASS，环境一致性 = PASS，用户问题闭环断言 = PASS，且校验器输出 `QA_EVIDENCE_COMPLETE` | `QA_PASS` | 单 bug 模式进 **P6.5**；批量模式标记 `qa-pass-pending-final-review` |
| 任一验证项 = FAIL 或环境一致性 = FAIL | `QA_FAIL` | 有界回 **P5** 继续修复 |
| QA 证据区缺少截图、断言、环境校验、截图文件不存在，或校验器失败 | `QA_INCOMPLETE` | **异常兜底**（见 6.6）|
| 需求/设计/环境身份无法判断 | `BLOCKED_HUMAN` | 标记 `blocked-human`，整理决策卡问用户 |

### 6.5 QA_FAIL 时的回修纪律

未达到自动闭环上限时，AI 直接：

1. 读报告的"QA 测试过程与截图证据"和"QA 自动闭环记录"节，看哪条 FAIL + 具体原因 + 证据
2. 回到 P4.1 重新追根因（**不跳过根因分析**）
3. 修完 → 重提 commit（新 commit 追加，不 amend）
4. 更新 `$REVIEW_DOC` 的修复记录、TDD 证据和闭环轮次，**不要改用户验收区**
5. 回到 P6.1 重新走门禁 → 再次触发 forge-qa
6. **同一 bug 连续失败 3 次**，或失败原因涉及需求/设计/环境不确定 → 标记 `blocked-human`，给用户决策卡

决策卡必须包含：问题、QA 截图/日志证据、已尝试修复、当前疑问、2-3 个可选决策和 AI 推荐理由。

### 6.6 异常兜底

#### 异常 A：Skill 工具调用失败或不可用

```
❌ forge-qa 调用失败

错误：<原始错误信息>

处理顺序（AI 必须尝试 A → B → C）：
A) 重试一次（瞬时失败常见）
B) AI 手动执行 forge-qa Mode B 的等价流程
   （按 skills/forge-qa/SKILL.md 的 Mode B 章节逐条跑，亲自回填报告）
C) 若 B 也不可行 → AskUserQuestion 告知用户 QA 环节无法自动化，
   请用户决定：C1) 自己先过一遍验证项；C2) 暂停本次修复等环境修好
```

#### 异常 B：QA_INCOMPLETE（报告缺少证据）

AI 先把报告"当前状态"和 `$DOC_BACKLOG` 对应条目更新为 `qa-incomplete`，再处理原因。禁止把 `qa-incomplete` 报告描述成 "pending user verification"。

```
⚠️ forge-qa 未跑完所有验证项

已跑：X / N
漏掉：<验证项列表>
原因：<读"QA 测试过程与截图证据"节>
校验器输出：
<粘贴 validate-bugfix-report.py 的 QA_INCOMPLETE 列表>

AI 必须判断：
1. 是 blocker 导致（服务挂了/依赖不可用）→ 修 blocker → 回 P6.1 重跑
2. 是报告里有不可自动验证的项 → 在 QA 证据区标 "N/A 仅人工验收"，继续 P6.5 或批次最终验收
3. 是 forge-qa 内部错误 → 报错给用户，按异常 A 处理
```

注意：第 2 种只适用于**确实不可自动验证**的非前端项。只要 bug 涉及前端页面或交互，就不能用 "N/A 仅人工验收" 代替截图；必须补 browser-use/Playwright 截图，或标记 `blocked-human`。

#### 异常 C：报告被 forge-qa 以外的东西污染

```bash
# 调用后检查报告是否完整、格式没被破坏
diff <(wc -l "$REVIEW_DOC") <(预期行数)
```

若报告结构被破坏 → AskUserQuestion 请用户确认，AI 不自行"修复"报告。

### 6.7 铁律（总结）

1. **必须用 Skill 工具调用 forge-qa**，不得用自然语言"暗示"
2. **必须通过门禁检查**（6.1 所有项）才能触发
3. **必须重读报告文件**解析结果，不依赖记忆或返回消息
4. **必须通过 `validate-bugfix-report.py --ready-for-user`**，否则就是 `QA_INCOMPLETE`
5. **前端/交互 bug 没有 Markdown 内嵌截图，禁止进入 P6.5**
6. **QA_FAIL 未达上限时不打扰用户**，AI 自己回 P5 重来
7. **连续 3 次 QA 失败必须升级用户**，不能无限循环
8. **不得越位填"QA 测试过程与截图证据"节**，那是 forge-qa 的领地

### 6.8 P3 复现工具复用

forge-bugfix 的 browser-use:browser、Playwright、截图留证等工具在 **P3 复现**阶段由 forge-bugfix 直接调用。P6 阶段这些工具由 forge-qa 统一编排，结果填到 Bug 修复验收报告，不产出散乱的 QA 报告。

Codex 环境中的优先级：

1. 前端页面/交互/视觉 bug：优先 browser-use:browser
2. 可重复脚本断言：Playwright / 项目测试框架
3. API / 数据 / 静态逻辑：curl、单元测试、代码检查

---

## P6.5 用户人工验收 / 批次最终验收（硬性关卡）

> 🎯 **关键封闭点**。只有 QA 全过才进这里。单 bug 模式需要用户填写该报告的最终结论；QA 自动闭环/批量模式可以先进入 `qa-pass-pending-final-review`，等待批次最终验收包统一收口。
> 进入本阶段前必须满足：`forge-qa Mode B` 已回填报告，且 `validate-bugfix-report.py --ready-for-user` 输出 `QA_EVIDENCE_COMPLETE`。否则停在 `QA_INCOMPLETE`，不得请用户验收。

### 6.5.1 AI 通知用户

单 bug 模式下，QA 全过后，AI 向用户发送：

```
✅ forge-qa 自动验收全过 (BF-0419-2)

📄 请你做人工二次验收：
   docs/bugfix/reviews/BF-0419-2.md

验收地址（QA 也使用同一组地址）：
Frontend: http://localhost:xxxx
Backend: http://localhost:yyyy
环境一致性：PASS

步骤：
1. 打开文档
2. 先看"验收入口与环境身份校验"，使用同一组前后端地址
3. 按"人工验收指南"逐条亲自验证
4. 在"你的验收"列填 PASS / FAIL + 原因
5. 在底部"最终结论"区勾一个：PASS / FAIL / PASS + 新发现
6. 如果勾了"Pass + 新发现"，在下面的"新发现"区把看到的问题一条一行写出来
7. 填完告诉我一声"验收了"

我会读报告，按你的结论推进下一步。
```

批量模式下，AI 不打断用户逐个验收，而是：

1. 把本 bug 状态写为 `qa-pass-pending-final-review`
2. 更新 `$DOC_BACKLOG` 对应行
3. 把本报告加入批次汇总（如 `docs/bugfix/batches/BATCH-YYYY-MM-DD.md`）
4. 继续处理批次中下一个 bug

批次结束时，才把最终验收包交给用户。

### 6.5.2 等待用户信号

AI 等待用户说"验收了"（或同义表达："验收完了"、"好了你看"、"已经填了"）。

收到信号前 AI 不得：
- 主动合并 worktree
- 进入 P7
- 反复追问"验收完没"

可以：
- 用户问其他问题时正常回答
- 用户说"我还没试"时回应"不着急，我等你"

### 6.5.3 读取报告 + 判定

用户说"验收了"后：

```bash
# AI 读取报告
cat "$REVIEW_DOC"
```

解析"最终结论"区，判定三种情况之一：

| 用户勾的是 | AI 下一步 |
|-----------|----------|
| PASS | 进 P7 合并决策 |
| FAIL | 回 P5 继续修（读"你的验收"列的 FAIL 原因定位问题）|
| PASS + 新发现 | 进 P7 完成当前修复的合并/暂存决策 → 进 P7.4 Pass 边界确认 |

### 6.5.4 边界情况

- **用户未填任何勾**：AI 提示"最终结论还没勾，请选一个再告诉我验收了"
- **用户勾了多个**：AI 提示"最终结论只能选一个，请确认"
- **用户填了 ❌ 但也写了新发现**：按 Fail 处理（原 bug 还没修好优先），新发现暂存（不丢），等 Pass 后再分流

---

## P7 按最终结论分流

> 🎯 **Pass 即合并**（不再问"是否合并"）。**没有弃用选项**——Fail 走回 P5 继续修，放弃修复走 P4.4 三振出局。

### 7.1 Pass → worktree 合并决策

用户勾了 ✅ Pass，AI **先做合并预演**（v6.0 新增硬性步骤），再询问合并方式。

#### 7.1.0 合并预演（硬性门禁，v6.0 新增）

并行场景下，另一个会话可能已经合并了东西到 main，或者改到了相同文件。正式合并前必须预演：

```bash
# 进入主仓库（不是 worktree）
cd "$_ROOT"
git fetch origin --quiet 2>/dev/null || true
git checkout main 2>/dev/null || git checkout master
git pull --ff-only 2>/dev/null || true

# --no-commit --no-ff 做一次预演 merge
if git merge --no-commit --no-ff "$WT_BRANCH" 2>/tmp/merge_preview.log; then
  # 预演成功，立即回退，让下一步真正执行
  git merge --abort 2>/dev/null
  MERGE_OK=1
else
  # 冲突了，回退
  git merge --abort 2>/dev/null
  MERGE_OK=0
  echo "⚠️ 合并预演失败："
  cat /tmp/merge_preview.log
fi
```

- `MERGE_OK=1` → 进 7.1.1 询问合并方式
- `MERGE_OK=0` → 进 7.1.2 冲突处理

#### 7.1.1 合并询问（预演通过时）

```
🎯 worktree 合并决策 (BF-0419-2)

验收结论：✅ Pass
合并预演：✅ 无冲突
worktree: .worktrees/bf-{MMDD}-N
分支:     bugfix/bf-{MMDD}-N
本次:     N commits

A) 合并到主分支（推荐）— 我会执行：
   git checkout main
   git pull --ff-only
   git merge --no-ff bugfix/bf-{MMDD}-N
   git push
   git worktree remove .worktrees/bf-{MMDD}-N
   git branch -d bugfix/bf-{MMDD}-N

B) 暂存不合并 — 保留 worktree 和分支待后续
   （适用于：想攒几个修复一起 review/ship）

C) 推迟决定 — 先做别的，稍后回来处理
```

合并细节：如果 `git pull` 拉到新的 commits，先在 worktree 内 `git rebase main` 解决冲突，再回主仓库执行 merge。合并后 `git worktree remove` 清理 worktree 并 `git branch -d` 删除分支。

#### 7.1.2 冲突处理（预演失败时）

预演失败说明并行会话改到了相同文件。不自动解决，交给用户决策：

```
⚠️ 合并冲突 (BF-0419-2)

本次修复合并到 main 会产生冲突。冲突文件：
{冲突文件列表，来自 /tmp/merge_preview.log}

可能原因：另一个 worktree（查 .forge/active.md）已经合并了修改，或者主分支有新提交。

A) 让我先 rebase（推荐）
   cd .worktrees/bf-{MMDD}-N
   git rebase main
   # 我会尝试自动解决，解决不了的给你标记冲突点
   解决后回这里重跑 7.1 预演。

B) 暂存这个修复，先处理别的
   保留 worktree 和分支不动，以后再回来合并。

C) 让我看冲突文件再决定
   我读冲突文件的当前状态和你的修改对比给你看。
```

#### 7.1.3 合并后的 active.md 处理（v6.0）

合并成功后 **不立即清理 active.md**——清理的职责分给 forge-fupan（正常结束）或 /forge-status（兜底）。forge-bugfix 只做两件事：
- 把 `docs/bugfix/backlog.md` 中对应 bug 的状态改 `resolved`，从"🐛 待修"剪切到"🗄️ 已处理"
- 保留 active.md 中的那一行（等复盘或 /forge-status 清）

这样如果会话中还要继续修下一个 bug，active.md 的登记仍有效；如果会话在此结束，用户走 /forge-fupan 会一次性清掉。

### 7.2 Fail → 回 P5

```
❌ 验收未通过 (BF-0419-2)

你标了 ❌ 的验证项：
  - 第 1 条：「点击登录头像立刻更新」未通过
    你的说明：登录后头像还是旧的

读 P4 根因链 + P5 修复内容 + 你的反馈，我会回到 P4.1 重新追根因。

不接受新问题进来（新发现请下次验收时说）。
```

**不弹出 AskUserQuestion**，AI 直接回到 P5 前的根因分析。修完后：
- 更新 commit（新 commit 追加，不 amend）
- 更新 `$REVIEW_DOC` 的"修复 commit"字段
- 重跑 P6 → P6.5

### 7.3 Pass + 新发现 → 处置当前修复 + 进 P7.4

```
✅ Pass + 新发现 (BF-0419-2)

当前 bug 修复已通过你的验收，我会先完成当前修复的合并/暂存决策（同 7.1）。
新发现不会夹带到当前修复。当前修复处置完成后，我会停在 Pass 边界，
先告诉你本次 bug 已完成，再问是否把新问题更新到文档中。

处理中...
```

当前修复处置完成后，立即进入 P7.4（必须问用户，不得自动写 backlog）。

---

## P7.4 Pass 边界确认 + 文档更新询问

> 🎯 **关键边界**：原 bug 一旦 Pass，就先关闭本次修复。新问题可能很重要，但它们不是“当前 bug 未修好”的证据。AI 必须先让用户感知这个边界，再请求是否把新问题入档。

### 7.4.1 触发条件

满足任一条件即进入 P7.4：

- 用户最终结论是 `PASS + 新发现`
- 用户在当前 bug 已 Pass 后又反馈了新问题
- forge-qa / 批次最终验收发现了与原 bug 不同的新问题
- AI 在修复、验证、合并过程中发现了衍生问题，但原 bug 已经通过闭环断言

### 7.4.2 AI 必须先告知“本次 bug 已完成”

输出必须包含三件事：

1. 原 bug 已收敛的依据（用户结论 / QA 结果 / 闭环断言）
2. 当前修复状态（已合并 / 暂存 / 推迟合并）
3. 新问题不会在本会话继续修

示例：

```
✅ {BUG_ID} 本次 bug 修复已完成

证据：
- forge-qa：PASS
- 用户最终结论：PASS / PASS + 新发现
- 用户问题闭环断言：PASS
- 当前修复状态：已合并到 main / 已暂存 worktree / 推迟合并

你后面提到的这些问题属于新的待处理事项，不再说明 {BUG_ID} 没修好。
我不会继续在当前修复里改它们。
```

### 7.4.3 询问是否写入文档

告知完成后，AI 必须用 AskUserQuestion 询问：

```
要不要我把这些新问题更新到文档里？

我会做的事：
- 独立 bug → 写入 docs/bugfix/backlog.md 的 🐛 待修区，并分配 BF 编号
- 新需求 → 写入 docs/bugfix/backlog.md 的 💡 新需求区
- 模糊反馈 → 写入 docs/bugfix/backlog.md 的 🌀 待澄清区
- 然后给你一段简短接力 prompt，建议开另一个会话继续

A) 更新到文档，并给接力 prompt（推荐）
B) 暂不更新，只结束本次 bugfix
C) 我想先改写这些问题的描述
```

### 7.4.4 用户选择后的处理

| 用户选择 | AI 行为 |
|---|---|
| A | 进入 P7.5，分流写入 backlog / 报告索引，然后输出简短接力 prompt |
| B | 不写 backlog，不继续修新问题；只总结本次 bugfix 已完成 |
| C | 请用户给新描述，更新待分流列表后重新询问 A/B |

**禁止行为**：
- ❌ 不问用户就把新问题写入 backlog
- ❌ 把新问题当成原 bug 的 Fail 继续回 P5
- ❌ 在当前会话继续修新问题，除非用户明确要求且重新走 P2-P4；默认仍建议新会话
- ❌ 给过长、过度规定下个会话方案的接力 prompt

---

## P7.5 新发现分流

P7.5 只能在 P7.4 用户确认“更新到文档”后执行。合并读取报告新发现、修复过程待确认新发现、forge-qa/用户补充和用户改写后的描述，逐条分类：

| 类别 | 处理 |
|-----|------|
| 同根关联 bug | 必须举证同文件/同函数/同数据字段/同上游依赖；写入 backlog 待修区，标记共因，默认建议新会话修 |
| 独立 bug | 写入 `docs/bugfix/backlog.md` 待修区，分配 BF 编号 |
| 新需求 | 写入 backlog 新需求区，建议 `/forge-prd` |
| 模糊反馈 | 写入 backlog 待澄清区，不分配 BF 编号 |

举证不足直接按独立 bug 处理。分流完成后只输出简短接力 prompt：原 bug 已完成、报告路径、已登记的新编号、建议下个会话重新判断范围和根因。

---

