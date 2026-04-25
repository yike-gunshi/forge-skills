---
name: forge-bugfix
description: |
  一次修一个 bug + 独立 worktree + 独立 TDD + Bug 修复验收报告 + **多会话并行协调** + dev server 端口治理（v7.1）。
  每个 bug 从登记开始就创建结构化 Bug 修复验收报告。支持 3-4 个窗口同时修不同功能域的 bug，
  靠 `.forge/active.md` 心跳文件 + 功能域判重 + 合并前 merge 预演避免撞车；
  启动应用时优先使用项目统一 dev entrypoint，避免 worktree 抢端口或测到旧服务。
  在 Codex 环境中，前端复现和修复后自验优先使用 browser-use:browser 的 in-app browser；
  Computer Use 只作为 browser-use 不可用或非浏览器桌面应用的兜底。
  铁律：不做根因分析就不写修复代码 + 每个 bug 独立 worktree/TDD/commit/QA + 没有 Bug 修复验收报告不算完 +
  用户问题闭环断言、配置/开关/数据就绪检查、QA 截图证据完整性门禁缺一不可 +
  新发现禁止当场顺手修（必须分流到 backlog）+ 多 bug 默认不串成长会话 +
  **并行会话必须在 active.md 登记，同域归并会话、异域鼓励并行**。

  会话级（一次性）：P0 环境探测（+ 读 active.md 看其他会话）→ P1 问题理解 + 强制读 PRD / ENG / Bugfix 历史 / Memory。
  每次修复（可循环）：
    P2 范围推荐（用户指定、QA 发现、backlog 候选、按功能域判重）→ P2.5 创建/更新 Bug 修复验收报告
    → P3 创建 worktree + 写入 active.md + 复现 → P4 根因追踪 + 5 Whys + 方案确认
    → P5 独立 TDD 驱动修复 + 原子提交 → P5.3 更新报告为待 QA 状态
    → P6 调用 forge-qa 做自动验收 → P6.5 用户人工验收或批次最终验收等待
    → P7 按三选一分流（Pass 合并 + merge 预演 / Fail 回 P5 / Pass + 新发现）
    → P7.5 新发现分流到 backlog.md → P8 沉淀（active.md 由 forge-fupan 清理）。
  出口：强烈建议新会话或 /clear、/compact 后继续下一个 bug；
    全部完成 → 建议 /forge-review、/forge-ship、/forge-fupan 或 /forge-status。

  触发方式：用户说"bugfix"、"反馈个问题"、"修这个 bug"、"这里有问题"、"为什么不对"、"排查一下"、"investigate"、"forge-bugfix"，
  或用户报告错误、异常行为、功能失效时主动建议使用。
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - TodoWrite
  - AskUserQuestion
  - WebSearch
  - Skill  # P6 必须用 Skill 工具调用 forge-qa（mode=B）
---

# /forge-bugfix：一次一 bug + Bug 修复验收报告

## 设计哲学

**短会话、单 bug 隔离、结构化证据、可追溯、可丢弃。**

核心机制：

- **Bug 修复验收报告**：每个 bug 从登记/领取开始就创建 `docs/bugfix/reviews/BF-XX.md`
  - 发现时：记录来源、现象、初始截图/日志、关联 Feature Spec
  - 修复时：记录 worktree、TDD 红绿证据、根因、commit、涉及文件
  - QA 时：forge-qa 回填前后端地址、环境身份校验、逐步截图、深度断言
  - 人工验收时：用户只看"人工验收指南"和同一组验收地址，填最终结论
- **两种验收节奏**：
  - **单 bug 模式**：QA 全过后立即进入 P6.5，等用户验收该 bug
  - **QA 自动闭环 / 批量模式**：单 bug QA 通过后标记 `qa-pass-pending-final-review`，最后由批次汇总统一交给用户验收
- **新发现必须分流**（禁止顺手修）：
  - 独立 bug → `docs/bugfix/backlog.md` 的待修区，分配 BF-XX 编号
  - 新需求 → `docs/bugfix/backlog.md` 的新需求区，建议 /forge-prd 立项
  - 模糊反馈 → `docs/bugfix/backlog.md` 的待澄清区
  - 同根（并入当前修复）→ **AI 必须举证**（同文件/同函数/同数据流的具体证据），举证不通过默认独立 bug
- **下一个 bug 默认建议新会话或 /clear、/compact**：
  - 上下文干净 + 边界清晰 + 避免长会话的 scope 蔓延
  - 除非用户明确要共因地一起修

> 演进历史和设计决策背景见 `forge-cookbook/docs/forge-bugfix-changelog.md`。

## 铁律

1. **不做根因分析，就不写修复代码。** 直觉再强也要先验证。
2. **每次只修 1 bug，或 1-2 个**经 P4.5 确认共因**的 bug**。其余进 `docs/bugfix/backlog.md`。
3. **每个 bug 独立 worktree + 独立 TDD + 独立 commit + 独立 QA 回归**。批量只做编排，不合并工程单元。
4. **修完不自动合并**，必须等用户填完单 bug 或批次最终验收结论。
5. **没有 Bug 修复验收报告不算完**。每个 BF 编号必须有 `docs/bugfix/reviews/BF-XX.md`，经 forge-qa 和用户/批次两层验收后才进 P7。
6. **新发现的 bug / 新需求 / 模糊反馈 → `docs/bugfix/backlog.md`**，绝不在当前修复内夹带。
7. **同根判定必须举证**。AI 声称"这条新发现是当前 bug 同根"时，必须列出具体证据（同文件、同函数、同数据流），证据不足默认为独立 bug。
8. **并行协调必须登记**（v6.0）。P2 确认范围 + P3 创建 worktree 之后，必须在项目根 `.forge/active.md` 追加一行会话登记；P2 推荐前必须读 `.forge/active.md` 做功能域判重；P7 合并前必须跑 `git merge --no-commit --no-ff` 预演。清理 active 的责任在 forge-fupan 或 /forge-status，不在 forge-bugfix 自己。
9. **自动闭环有上限**。同一 bug 连续回修失败 3 次，或遇到需求/设计/环境身份不确定，必须标记 `blocked-human` 并让用户判断，禁止无限循环。

---

## 流程总览

```
═══════════ 会话级（每会话一次，多次修复复用）═══════════
P0  环境探测（前置脚本，自动执行）
P1  问题理解 + 强制读 PRD/ENGINEERING/Bugfix 历史/Memory

═══════════ 每次修复（一次一 bug，可循环）═══════════
P2   范围推荐
     ├─ AI 从 docs/bugfix/backlog.md 捞候选 + 列出本会话新报告的 bug
     ├─ AI 接收 forge-qa 发现的结构化 bug（若来自 QA 自动闭环）
     ├─ 推荐"本次修 X"（1 个 / 或 1-2 共因），其余 → backlog
     └─ 用户确认范围
P2.5 创建/更新 Bug 修复验收报告 docs/bugfix/reviews/BF-XX.md
     ├─ 写入来源、现象、初始证据、Feature Spec 场景、功能域、当前状态
     └─ 同步 backlog.md 的报告链接
P3   创建 worktree（端口预检）+ 复现
P4   根因追踪 + 假设验证 + 5 Whys + 修复方案确认
P5   worktree 内独立 TDD 驱动修复 + 原子提交
P5.3 ⭐ 更新 Bug 修复验收报告为待 QA 状态
     ├─ 写入 TDD 红绿证据、根因、修复摘要、commit、涉及文件
     └─ 写入人工验收指南草案，QA 区域留给 forge-qa
P6   ⭐ 调用 forge-qa 自动验收
     ├─ forge-qa 针对每个验证项跑自动化测试
     ├─ 强校验 Frontend/Backend 地址、PID、cwd、commit 一致性
     ├─ 把每个前端交互关键步骤截图嵌入报告
     ├─ QA 全过 → 单 bug 模式进 P6.5；批量模式标记 qa-pass-pending-final-review
     └─ QA 有挂 → 有界回 P5；达到上限或有疑问则 blocked-human
P6.5 ⭐ 用户人工验收 / 批次最终验收
     ├─ AI 输出"请人工验收 @ docs/bugfix/reviews/BF-XX.md"
     ├─ 用户打开文档填"你的验收"列 + 最终结论（Pass / Fail / Pass + 新发现）
     └─ 用户说"验收了" → AI 读报告 → 判定
P7   ⭐ 按最终结论分流
     ├─ Pass → worktree 合并决策（合并 / 暂存 / 推迟）
     ├─ Fail → 回 P5（只修原 bug，不接新问题）
     └─ Pass + 新发现 → 先合并当前修复 → 进 P7.5
P7.5 ⭐ 新发现分流到 backlog
     ├─ 逐条分析，AI 做分类判断（同根 / 独立 bug / 新需求 / 模糊反馈）
     ├─ 同根（声称时必须举证）→ 新 bug 建议在新会话修
     ├─ 独立 bug → backlog.md 的 🐛 待修区，分配 BF-XX
     ├─ 新需求 → backlog.md 的 💡 新需求区，建议 /forge-prd 立项
     └─ 模糊反馈 → backlog.md 的 🌀 待澄清区
P8   沉淀：归档 backlog 对应条目 + bugfix 文档补记

═══════════ 出口 ═══════════
- 用户想继续修下一个 bug → 默认建议新会话或 /clear、/compact
  （除非明确共因才本会话继续，由用户主动选择）
- 全部完成 → 建议 /forge-review、/forge-ship 或 /forge-fupan
```

**红线**：
1. 写任何修复代码前必须完成 P2-P4（含范围确认和 5 Whys 根因确认）
2. 每个 BF 编号必须先有 Bug 修复验收报告（P2.5），修复后必须更新报告（P5.3）才能进入 QA
3. 报告没有用户最终结论或批次最终结论前，**不进 P7**——即使 QA 全过
4. 同根判定声称必须举证，证据不足默认独立 bug → 走新会话

---

## P0 环境探测（会话级·前置脚本，自动执行）

```bash
# === 基础信息 ===
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
echo "分支: $_BRANCH"
echo "根目录: $_ROOT"
echo "---"

# === Git 状态 ===
echo "=== Git 状态 ==="
git status --porcelain 2>/dev/null | head -20
echo "=== 最近 10 条提交 ==="
git log --oneline -10 2>/dev/null
echo "---"

# === 现有 worktree 清单 ===
echo "=== 现有 worktree ==="
git worktree list 2>/dev/null
echo "---"

# === 复现引擎 1: gstack/browse → $BROWSE ===
BROWSE=""
for p in "$_ROOT/.Codex/skills/gstack/browse/dist/browse" \
         "$HOME/.Codex/skills/gstack/browse/dist/browse" \
         "$_ROOT/.Codex/skills/browse/dist/browse" \
         "$HOME/.Codex/skills/browse/dist/browse"; do
  [ -x "$p" ] && BROWSE="$p" && break
done
[ -n "$BROWSE" ] && echo "BROWSE=$BROWSE" || echo "BROWSE=（不可用）"

# === 复现引擎 2: Playwright → $PW_AVAILABLE ===
PW_AVAILABLE="false"
if command -v npx &>/dev/null && npx playwright --version &>/dev/null 2>&1; then
  PW_AVAILABLE="true"
elif python3 -c "from playwright.sync_api import sync_playwright" 2>/dev/null; then
  PW_AVAILABLE="true"
fi
echo "PW_AVAILABLE=$PW_AVAILABLE"

# === 框架 / 测试框架 / Dev Server 状态 ===
# ... 框架探测 / 测试框架探测 ...

# === 统一 dev server 入口 → $APP_URL ===
APP_URL=""
DEV_STATUS=""
if [ -f "$_ROOT/package.json" ] && (cd "$_ROOT" && npm run 2>/dev/null | grep -q "dev:status"); then
  DEV_STATUS="$(cd "$_ROOT" && npm run dev:status 2>/dev/null || true)"
  echo "$DEV_STATUS"
  APP_URL="$(printf "%s\n" "$DEV_STATUS" | awk '/Frontend:/{print $2; exit}')"
elif [ -x "$_ROOT/scripts/dev-stack.sh" ]; then
  DEV_STATUS="$(cd "$_ROOT" && bash scripts/dev-stack.sh status 2>/dev/null || true)"
  echo "$DEV_STATUS"
  APP_URL="$(printf "%s\n" "$DEV_STATUS" | awk '/Frontend:/{print $2; exit}')"
else
  # 兼容旧项目：只读探测，不把探测结果当作 worktree 启动许可
  for port in 3456 3000 4000 5173 8080 8000; do
    if lsof -i :"$port" -sTCP:LISTEN &>/dev/null 2>&1; then
      APP_URL="http://localhost:$port"
      _PID=$(lsof -ti :"$port" -sTCP:LISTEN 2>/dev/null | head -1)
      _CWD=$(lsof -p "$_PID" 2>/dev/null | awk '$4=="cwd"{print $9}')
      echo "APP_URL=$APP_URL (PID=$_PID cwd=$_CWD)"
      break
    fi
  done
fi
[ -z "$APP_URL" ] && echo "APP_URL=（未检测到运行中的应用）"

# === 项目文档清单 ===
DOC_PRD=""; DOC_ENG=""; DOC_QA=""; DOC_BACKLOG=""; DOC_BUGFIX=""; DOC_REVIEWS=""
for p in "$_ROOT/docs/PRD.md" "$_ROOT/PRD.md"; do [ -f "$p" ] && DOC_PRD="$p" && echo "PRD: $p" && break; done
for p in "$_ROOT/docs/ENGINEERING.md" "$_ROOT/ENGINEERING.md"; do [ -f "$p" ] && DOC_ENG="$p" && echo "ENGINEERING: $p" && break; done
for p in "$_ROOT/docs/QA.md" "$_ROOT/QA.md"; do [ -f "$p" ] && DOC_QA="$p" && echo "QA: $p" && break; done

# backlog（bug 任务池，单一入口）
for p in "$_ROOT/docs/bugfix/backlog.md" "$_ROOT/backlog.md"; do
  [ -f "$p" ] && DOC_BACKLOG="$p" && echo "BACKLOG: $p" && break
done
if [ -z "$DOC_BACKLOG" ]; then
  DOC_BACKLOG="$_ROOT/docs/bugfix/backlog.md"
  echo "BACKLOG（首次使用，将从模板初始化）: $DOC_BACKLOG"
fi

# reviews 目录（每个 bug 一个 Bug 修复验收报告）
DOC_REVIEWS="$_ROOT/docs/bugfix/reviews"
mkdir -p "$DOC_REVIEWS" 2>/dev/null
echo "REVIEWS 目录: $DOC_REVIEWS"

[ -d "$_ROOT/docs/bugfix" ] && DOC_BUGFIX="$_ROOT/docs/bugfix" && echo "BUGFIX 历史: $DOC_BUGFIX"

# === 报告目录 ===
REPORT_DIR="$_ROOT/.gstack/bugfix-reports"
mkdir -p "$REPORT_DIR/screenshots" 2>/dev/null
echo "报告目录: $REPORT_DIR"

# === 并行会话环境（v6.0 新增）===
# active.md: 跨 worktree 的心跳文件，项目根 .forge/active.md
mkdir -p "$_ROOT/.forge" 2>/dev/null
ACTIVE="$_ROOT/.forge/active.md"
if [ ! -f "$ACTIVE" ]; then
  # 首次使用，从模板初始化（模板路径按 skill 安装位置回退）
  for tpl in "$HOME/.claude/skills/forge-bugfix/templates/active.md" \
             "$HOME/.claude/skills/forge/skills/forge-bugfix/templates/active.md"; do
    [ -f "$tpl" ] && cp "$tpl" "$ACTIVE" && echo "✅ 初始化 .forge/active.md（请编辑功能域声明区）" && break
  done
fi
echo "ACTIVE=$ACTIVE"

# 当前 Claude Code session id（通过 PID 回溯 ~/.claude/sessions/<pid>.json）
SID_SCRIPT=""
for s in "$HOME/.claude/skills/forge-bugfix/scripts/get-session-id.sh" \
         "$HOME/.claude/skills/forge/skills/forge-bugfix/scripts/get-session-id.sh"; do
  [ -x "$s" ] || [ -f "$s" ] && SID_SCRIPT="$s" && break
done
CURRENT_SID=""
if [ -n "$SID_SCRIPT" ]; then
  CURRENT_SID=$(bash "$SID_SCRIPT" 2>/dev/null || echo "")
fi
[ -n "$CURRENT_SID" ] && echo "SESSION_ID=$CURRENT_SID" || echo "SESSION_ID=（无法自动获取，后续 P3 会提示）"

# 扫一眼 active.md 里"进行中会话"节，报告当前有哪些并行会话
if [ -f "$ACTIVE" ]; then
  echo "--- 当前并行会话 ---"
  awk '/^## 进行中会话/{flag=1;next} /^## /{flag=0} flag && /^- /{print}' "$ACTIVE" | grep -v '<!--' || echo "（暂无）"
fi
```

**关键变量**：

| 变量 | 含义 |
|------|------|
| `$BROWSE` | gstack/browse 路径，空=不可用 |
| `$PW_AVAILABLE` | Playwright 是否可用 |
| `$APP_URL` | 本地应用 URL（优先来自项目 `dev:status` / `dev-stack status`）|
| `$DOC_PRD` / `$DOC_ENG` / `$DOC_BUGFIX` | 项目文档路径 |
| `$DOC_BACKLOG` | bug 任务池 `docs/bugfix/backlog.md` |
| `$DOC_REVIEWS` | Bug 修复验收报告目录 `docs/bugfix/reviews/` |
| `$REPORT_DIR` | 截图和报告输出目录 |
| `$ACTIVE` | 并行心跳文件 `.forge/active.md`（v6.0） |
| `$CURRENT_SID` | 当前 Claude Code session id（v6.0） |

⚠️ **新增**：APP_URL 不再优先扫描常见端口。若项目提供 `npm run dev:status` 或 `scripts/dev-stack.sh`，必须从统一状态输出读取 URL、PID、cwd，防止 worktree 端口劫持（历史踩坑：worktree 旧 uvicorn 抢 8080，主项目改动不生效，30+ 分钟才定位）。

⚠️ **v6.0 新增**：P0 结束时 AI 必须向用户报告当前 `.forge/active.md` 的"进行中会话"情况——如果发现疑似僵尸（worktree 目录不存在 / 分支已合并到 main），**建议用户先跑 /forge-status 清理**再继续。AI 不自己清（那是 /forge-status 的职责）。

---

## P1 问题理解 + 上下文采集（会话级·一次执行）

> ⚡ **会话级声明**：本步只在会话首次进入时执行一次。同一会话做多次修复时，P1 不重读，直接复用上下文。

### 1.1 解析用户输入

用户报告 bug 的方式：
- 直接描述现象 / 粘贴错误 / 提供截图 / 引用已有 Bug ID

### 1.2 强制读取项目文档

**不读 PRD 不知道"正确"，不读 ENGINEERING.md 不理解数据流，不读 bugfix 历史会重复排查。**

| 文档 | 必须/按需 | 读什么 |
|------|-----------|--------|
| PRD (`$DOC_PRD`) | **必须** | 功能预期行为、验收标准 |
| ENGINEERING.md (`$DOC_ENG`) | **必须** | 架构、数据流、模块边界 |
| Bugfix 历史 (`$DOC_BUGFIX`) | **必须** | 已修 bug 的根因 — 防重复排查 |
| **Backlog (`$DOC_BACKLOG`)** | **必须** | 任务池 — 了解已登记待修 bug / 新需求 / 待澄清反馈 |
| **已归档已处理区** | **必须** | 历史修复回溯 — 以后遇到类似问题时搜这里 |
| QA.md (`$DOC_QA`) | 按需 | 已知问题列表 |
| Memory（MEMORY.md） | **必须** | feedback 类条目 — 历史踩坑 |
| `git log --since="3 days" -- affected-files` | 按需 | 最近变更（回归 Bug 必看）|

#### Bugfix 历史检索

```bash
if [ -n "$DOC_BUGFIX" ]; then
  ls -t "$DOC_BUGFIX"/*.md 2>/dev/null | head -5
  grep -rl "<用户描述的关键词>" "$DOC_BUGFIX" 2>/dev/null
fi
```

匹配到历史记录 → AskUserQuestion："这个问题与 BF-XXXX-N 类似，上次根因是 XXX，沿用还是重新排查？"

### 1.3 检查工作区状态

```bash
git status --porcelain
```

主仓库有未提交变更 → AskUserQuestion：
- A) 先提交 — commit 后再开始（推荐）
- B) 先暂存 — stash，修复完 pop
- C) 直接开始 — worktree 隔离，不影响主仓库

### 1.4 信息不足时

通过 AskUserQuestion 一次问一个：什么操作触发？预期行为？实际行为？一直存在还是最近出现？

---

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

同时把 `$DOC_BACKLOG` 中该 bug 的“报告”列指向 `docs/bugfix/reviews/${BUG_ID}.md`。

**禁止**等到修完代码才创建报告。报告是单个 bug 的过程案卷，不是最后的附录。

---

## P3 创建 worktree + 复现

### 3.1 创建 worktree

```bash
# Bug 编号已在 P2.4 确定，例如 BF-0418-9
BUG_ID="BF-0418-9"
WT_NAME="bf-${BUG_ID#BF-}"  # → bf-0418-9
WT_PATH="$_ROOT/.worktrees/$WT_NAME"
WT_BRANCH="bugfix/$WT_NAME"

git worktree add "$WT_PATH" -b "$WT_BRANCH"
echo "✅ worktree 创建: $WT_PATH (分支: $WT_BRANCH)"
```

### 3.1.5 登记 .forge/active.md（v6.0 硬性步骤）

worktree 创建成功之后**立即**登记，不得拖到修复结束再补。

```bash
# 字段：session id / worktree 相对路径 / 任务 id / 功能域
DOMAIN="<P2.0 打好的功能域标签，单域或逗号分隔多域>"
REL_WT="${WT_PATH#$_ROOT/}"   # 存相对路径，便于跨机器
LINE="- session: $CURRENT_SID / worktree: $REL_WT / 任务: $BUG_ID / 域: $DOMAIN"

# 追加到 active.md 的"进行中会话"节末尾（用 awk 精确插入在 "---" 之前）
python3 -c "
import pathlib,re
p=pathlib.Path('$ACTIVE')
txt=p.read_text()
# 找到'## 进行中会话'节，在它后面的（暂无进行中会话）或第一个 --- 之前插入
pat=re.compile(r'(## 进行中会话\n[\s\S]*?)(\n---)', re.M)
line='''$LINE'''
def repl(m):
    body=m.group(1)
    # 去掉占位行
    body=re.sub(r'\n（暂无进行中会话）', '', body)
    if not body.endswith('\n'):
        body+='\n'
    return body + line + '\n' + m.group(2)
p.write_text(pat.sub(repl, txt, count=1))
"

echo "✅ 已登记到 .forge/active.md: session=$CURRENT_SID 域=$DOMAIN"
```

**硬性要求**：
- `$CURRENT_SID` 为空时 AI 必须停下问用户，不得用 "unknown" 或占位符登记
- 登记失败（awk 未匹配等）必须向用户报错，不得静默跳过
- backlog.md 中对应 bug 的状态同时改 `in-progress`，"领取会话"字段填 session id 前 12 位即可

### 3.2 ⚠️ worktree Dev Server 契约

**强制步骤**。历史踩坑：worktree 内启动的服务和主仓库抢同一端口，curl/前端打到旧代码上，调试 30+ 分钟。

如果本 bug 只需读代码和单元测试即可复现，可以不启动应用；一旦需要浏览器、curl、截图或端到端复现，就必须走项目统一 dev server 入口。

```bash
cd "$WT_PATH"

if [ -f package.json ] && npm run 2>/dev/null | grep -q "dev:status"; then
  npm run dev:status || true
  npm run dev
  npm run dev:status | tee /tmp/forge-dev-status.txt
  APP_URL=$(awk '/Frontend:/{print $2; exit}' /tmp/forge-dev-status.txt)
elif [ -x scripts/dev-stack.sh ]; then
  bash scripts/dev-stack.sh status || true
  bash scripts/dev-stack.sh start
  bash scripts/dev-stack.sh status | tee /tmp/forge-dev-status.txt
  APP_URL=$(awk '/Frontend:/{print $2; exit}' /tmp/forge-dev-status.txt)
else
  echo "未发现统一 dev server 入口；必须显式选择非默认端口，并记录 PID/cwd/URL"
  echo "旧项目兜底探测："
  for port in 3456 3000 4000 5173 8080 8000; do
    PID=$(lsof -ti :"$port" -sTCP:LISTEN 2>/dev/null | head -1)
    if [ -n "$PID" ]; then
      CWD=$(lsof -p "$PID" 2>/dev/null | awk '$4=="cwd"{print $9}')
      echo "端口 $port: PID=$PID cwd=$CWD"
    fi
  done
fi
```

**硬性要求**：
- 有 `npm run dev:status` 或 `scripts/dev-stack.sh` 时，不得裸跑 `uvicorn` / `vite` / `next dev`。
- `APP_URL` 必须从状态输出读取，传给复现、截图和 forge-qa；不得凭常见端口猜。
- 状态输出必须显示监听进程 cwd 属于当前 worktree；不一致就先 `npm run dev:stop` / `bash scripts/dev-stack.sh stop` 后重启。
- 旧项目没有统一入口时，AI 必须把端口、PID、cwd、URL 写进报告，且不得占用主分支固定端口。

### 3.3 切换到 worktree 工作

```bash
cd "$WT_PATH"
# 后续所有操作（复现、修改、commit）都在 worktree 内进行
```

### 3.4 复现 Bug

**确定性复现是调查的核心。无法复现就无法验证修复。**

引擎优先级：Codex browser-use:browser（可用时） > Playwright / gstack-browse > 纯代码

#### Codex browser-use:browser（Codex + Browser Use 插件可用时）

用于前端页面、交互、视觉、控制台相关 bug 的复现：

- 打开 P3.2 得到的 `APP_URL`，不得猜端口
- 按用户路径操作页面，采集 DOM snapshot 和关键状态截图
- 复现截图写入 `docs/bugfix/reviews/assets/${BUG_ID}/`，并在报告“初始证据 / 复现截图”区内嵌
- 读取 console logs，错误写入报告
- 如果代码或 build 刚变更，验证前 reload 页面并重新采集 DOM/screenshot

规则：

1. 执行浏览器动作前必须加载并遵守 `browser-use:browser` skill。
2. 使用 Codex in-app browser 的 `iab` backend；不要因为 Computer Use 工具可见就跳过 Browser Use。
3. Computer Use 只在 Browser Use 不可用、被中断或目标不是浏览器页面时兜底，兜底原因必须写入报告。
4. P3 复现可以用 Browser Use；P6 正式 QA 仍必须交给 forge-qa。

#### gstack/browse（`$BROWSE` 非空时）

```bash
$BROWSE goto $APP_URL/path/to/page
$BROWSE screenshot $REPORT_DIR/screenshots/${BUG_ID}-before.png
$BROWSE snapshot -i              # 查可交互元素
$BROWSE click @e5                # 触发 bug
$BROWSE snapshot -D              # 查变化
$BROWSE console --errors         # 查 JS 错误
$BROWSE network                  # 查失败请求
```

#### Playwright（`$PW_AVAILABLE=true`）

```bash
npx playwright test --grep "related-test"
npx playwright screenshot $APP_URL/path /tmp/${BUG_ID}-before.png
```

#### 纯代码（始终可用）

```bash
curl -s $APP_URL/api/endpoint | python3 -m json.tool
npm test -- --grep "related-test" 2>/dev/null
python3 -m pytest -k "related-test" -v 2>/dev/null
tail -50 $_ROOT/logs/*.log 2>/dev/null
```

**无法复现 → 停止**。AskUserQuestion 升级或收集更多证据。

---

## P4 根因追踪 + 假设验证 + 方案确认

### 4.1 根因追踪

从症状回溯到根因：
1. **Grep 定位引用**：用错误消息、函数名、API 端点搜索
2. **Read 追踪调用链**：从入口点沿调用链追踪
3. **画数据流**：输入 → 处理 → 输出，哪一步断裂？
4. **检查最近变更**：`git log --oneline -20 -- <affected-files>`

### 4.2 模式检查清单（追踪时内嵌）

- **竞态条件** — 间歇性、时序敏感 → 查共享状态并发访问
- **空值传播** — TypeError → 查可选值缺少守卫
- **状态不同步** — 数据不一致、部分更新 → 查事务/回调/生命周期
- **前后端不一致** — 前端异常但 API 正确 → 查字段映射、类型转换
- **缓存过期** — 旧数据 → 查 Redis/CDN/浏览器/SW 缓存版本号
- **配置漂移** — 本地正常线上不行 → 查环境变量、特性开关
- **进程身份** — 改了代码没效果 → 查进程 cwd（worktree 端口劫持是典型）
- **SQL/查询错误** — 数据缺失或重复 → 查 WHERE/JOIN/去重
- **开关/数据就绪错位** — API 通过但 UI 仍不对 → 查 feature flag、config、DB settings、后端 `enabled` 字段、测试数据是否足以展示用户问题

### 4.2.1 用户问题闭环检查（前端/交互 bug 必做）

如果 bug 来自用户反馈，AI 必须把用户原话转成一句可验收断言：

```
用户原话：<用户看到/无法完成的问题>
闭环断言：修复后，用户在 <页面/流程> 中应该能 <看到/完成的结果>
证明方式：<截图 / 交互 / API / 测试命令>
```

后续 P5/P6/P6.5 都以这句闭环断言为准。**接口 200、单测通过、没有 console error 都只是证据，不等于用户问题闭环。**

### 4.2.2 配置 / 开关 / 数据就绪门禁

涉及页面展示、权限边界、数据可见性、灰度发布、冷启动、实验开关的 bug，根因阶段必须检查并写入报告：

| 检查面 | 必查内容 |
|---|---|
| Feature flag / config | 配置文件、环境变量、远程配置、DB settings 是否符合预期 |
| 后端返回状态 | API 是否返回 `enabled/disabled`、权限状态、空态原因 |
| 数据就绪 | 本地/测试/线上数据是否足以让用户看到目标状态 |
| UI fallback | 前端是否因开关/空态/error 走了合理 fallback |

如果配置或数据不满足用户闭环断言，不得声称 bug 已修复；应修正配置/数据，或标记 `blocked-human` 请用户确认开关策略。

### 4.3 假设验证（标签化日志）

在疑似根因处加**标签化临时日志**，每条标注假设编号：

```
命名规则：[DEBUG H{N}] — N 是假设编号
  console.log('[DEBUG H1] feedItems length:', items.length)
  logger.info(f'[DEBUG H2] query params: {params}')
```

复现后查日志，按 `[DEBUG HN]` 过滤验证。

### 4.4 三振出局

3 个假设都失败 → 立即停止。AskUserQuestion：

```
A) 继续调查 — 我有新假设：[描述]
B) 升级处理 — 需要更了解系统的人
C) 埋点等待 — 加日志，下次触发时捕获
D) 放弃本次尝试 — git worktree remove，开新会话用精炼描述重启
   （适用于上下文已嘈杂的情况）
```

### 4.5 5 Whys 根因确认 + 方案确认

**假设验证通过后不直接动手。先向用户解释根因 + 方案，确认后才进 P5。**

通过 AskUserQuestion，用 5 Whys 因果链：

```
🔍 根因定位完成（{BUG_ID}）

问题：[用户看到的现象]

5 Whys 因果链：
  1. 为什么 [症状]？→ 因为 [直接原因]
  2. 为什么 [直接原因]？→ 因为 [更深一层]
  3. 为什么 [更深一层]？→ 因为 [根因]
  ✅ 根因：[一句话]

影响范围：[影响哪些功能/页面]

Bug 类型：[选一个]
  数据流断裂 / 前后端不一致 / 状态同步 / 配置漂移
  / 工具链约束 / UI 渲染 / 兄弟路径遗漏 / 进程身份

修复方案：
  A) [用"做什么"描述，不写代码] （推荐）
  B) [备选]

推荐 A，理由 [一句话]。
```

**用户确认才进 P5。**

### 红旗信号

- "先临时修一下" — 没有"临时"。要么修到位，要么升级。
- 还没追踪数据流就提方案 — 在猜。
- 每次修复都暴露新问题 — 错误层级。

---

## P5 worktree 内最小修复 + 原子提交

### 5.1 修复原则

- **修根因不修症状** — 最小变更，消除实际问题
- **最少文件、最少行数** — 抵制"顺手重构"
- **只修本次范围内的 bug，不加功能**

### 5.2 ⚠️ 修复中的范围控制（默认硬性拒绝 + 同根必须举证）

**修复过程中识别到以下信号 → 立即停下，写入 `$DOC_BACKLOG` 对应区，不在本次修复中处理：**

| 信号 | 处理 |
|------|------|
| 用户说"顺便加..."、"另外..."、"延伸需求"、"我希望..."、"如果能..." | 写入 `$DOC_BACKLOG` 的 💡 新需求区，告知用户"已记录，本次修复不做，建议走 /forge-prd 立项" |
| 验收反馈中描述了当前功能不存在的行为 | 同上（大概率是新需求） |
| AI 自己想到"顺手重构"、"加 lint"、"优化下" | **硬性拒绝**：不写入 backlog（backlog 不是 AI 想法垃圾桶），在相关代码加 `// REFACTOR: {想法}` 注释即可，下次动到这个文件时再看 |
| 修复中发现新 bug（明显不共因）| 写入 `$DOC_BACKLOG` 的 🐛 待修区，分配 BF-XX 编号，告知用户"下次会话修" |
| 修复中怀疑发现"同根"的另一个 bug | **必须举证**（下文 5.2.1）否则默认独立 bug |

#### 5.2.1 同根判定的举证要求（硬约束）

AI 不得轻易声称"这个新发现和当前 bug 同根、要一起修"。声称同根必须满足以下**至少一项**并向用户展示证据：

- ✓ **同一文件的同一函数** 被两个症状触发（贴代码位置：文件名:行号）
- ✓ **同一个数据结构/状态字段** 的错误处理引发两个症状（贴字段名 + 引用点）
- ✓ **同一个上游依赖失效**（同一个 API 端点 / 同一个外部库调用）

举证不足 → 默认独立 bug，写入 backlog，走下次会话。

新发现 bug 的默认处理：

```
通过 AskUserQuestion：

🆕 修 {当前 BUG_ID} 时发现新 bug：
   [新 bug 症状]

AI 同根判定：[独立 / 疑似同根（附证据）]
已记到 $DOC_BACKLOG 🐛 待修区（候选编号 BF-{MMDD}-{N+1}，优先级待定）。

A) 默认：本次修复继续，新 bug 等下一会话处理（推荐 — 上下文干净）
B) 这是共因（AI 举证已给出）→ 并入当前修复（罕见）
C) 我现在就想修 → 完成当前修复后本会话起新一次修复（上下文仍会污染，不推荐）
```

### 5.3 爆炸半径控制

修复涉及 >5 个文件 → AskUserQuestion：

```
本次修复涉及 N 个文件，超出"最小修复"预期。

A) 继续 — 根因确实跨这些文件
B) 拆分 — 先修关键路径，其余开新会话
C) 重新思考 — 可能有更精准的方案
```

### 5.4 原子提交（在 worktree 内）

```bash
# 仍在 $WT_PATH 内
git add <修改的文件>
git commit -m "$(cat <<EOF
fix(${BUG_ID}): <一句话描述>

根因: <根因>
修复: <修复方式>
EOF
)"
```

### 5.5 清理临时代码

删除所有 `[DEBUG H` 标签化日志和断言。

```bash
grep -rn "\[DEBUG H" --include="*.{js,ts,tsx,py,go,rb}" .
# 上述命令应返回空
```

---

## P5.3 更新 Bug 修复验收报告为待 QA 状态

> 🎯 **关键节点**。代码修完 + 独立 TDD 变绿 + 原子提交之后，AI **必须**更新 `docs/bugfix/reviews/{BUG_ID}.md`。没有完整报告，禁止进入 P6。

### 5.3.1 文档存在性

`$REVIEW_DOC` 应该已经在 P2.5 创建。若不存在，说明流程违规，AI 必须回到 P2.5 补建，并在报告中注明“补建原因”。

```bash
REVIEW_DOC="$DOC_REVIEWS/${BUG_ID}.md"
test -f "$REVIEW_DOC" || echo "❌ Bug 修复验收报告缺失，回 P2.5 补建"
```

### 5.3.2 AI 填充的内容

AI 负责更新报告的工程事实和人工验收草案：

| 字段 | 填什么 |
|------|--------|
| BUG_ID | `BF-{MMDD}-{N}` |
| Bug 描述 | 一句话用户视角的现象 |
| 根因 | P4 5 Whys 追到的根因 |
| 修复做了什么 | 关键逻辑改动，不超过两句话 |
| 涉及文件 | 本次 commit 改到的文件列表 |
| 修复时间 | 当前时间 |
| 修复 commit | 短 hash + commit message 首行 |
| TDD / 回归用例 | RED 失败证据 + GREEN 通过证据 |
| 验收入口 | Frontend/Backend URL 草案；最终由 forge-qa 强校验 |
| 人工验收指南 | 用户要检查什么 / 怎么操作 / 预期效果 / QA 参考截图占位 |
| 用户问题闭环断言 | 用户原话 / 最终用户可见结果 / 证明方式 |
| 配置 / 开关 / 数据就绪 | feature flag、config、后端 enabled 状态、测试数据状态 |
| 当前状态 | `fixed-awaiting-qa` |

同时把 `$DOC_BACKLOG` 中该 bug 状态更新为 `fixed-awaiting-qa`。

### 5.3.3 人工验收指南最少条件

- **至少 3 条**验证项
- 其中**至少 1 条边界/异常态**（空数据 / 失败场景 / 错误恢复）
- 每条验证项必须可以**独立验证**（不依赖其他条）
- 操作步骤用 `1. ... → 2. ...` 方式写，明确可执行

### 5.3.4 禁止行为

- ❌ AI 不得填"QA 测试过程与截图证据"节（留给 forge-qa）
- ❌ AI 不得填"你的验收"列或最终结论（留给用户）
- ❌ AI 不得自行勾选最终结论
- ❌ AI 不得省略任何验证项（即使 bug 很小，也要最少 3 条）
- ❌ AI 不得把多个非同根 bug 写进同一份报告

### 5.3.5 完成后向用户报告

```
✅ Bug 修复验收报告已更新为待 QA (BF-0419-2)

📄 文档路径：docs/bugfix/reviews/BF-0419-2.md

我已经填好：根因、修复记录、TDD 红绿证据、{N} 条人工验收指南。
接下来我会调用 forge-qa 跑自动验收（P6），
QA 会把逐步截图、深度断言、前后端环境身份校验写回报告。

现在开始 P6，请稍候。
```

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

**args 字段强制要求**：

| 参数 | 值 | 必填 |
|------|-----|------|
| `mode=B` | 指示 forge-qa 进入 Mode B（单 bug 验收）| ✅ |
| `review_doc=<路径>` | Bug 修复验收报告的绝对路径 | ✅ |
| `bug_id=BF-{MMDD}-{N}` | 本次 Bug 编号 | ✅ |
| `worktree=<路径>` | 当前 worktree 绝对路径 | ✅ |
| `commit=<hash>` | 修复 commit 短 hash | ✅ |
| `app_url=<URL>` | 本地应用 URL（若 bug 类型需要；必须来自 dev:status/dev-stack status）| 条件必填 |

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

forge-bugfix 的 browser-use:browser、gstack/browse、Playwright、截图留证等工具在 **P3 复现**阶段由 forge-bugfix 直接调用。P6 阶段这些工具由 forge-qa 统一编排，结果填到 Bug 修复验收报告，不产出散乱的 QA 报告。

Codex 环境中的优先级：

1. 前端页面/交互/视觉 bug：优先 browser-use:browser
2. 可重复脚本断言：Playwright / 项目测试框架
3. 快速探索或已有 gstack 项目：gstack/browse
4. API / 数据 / 静态逻辑：curl、单元测试、代码检查

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
| PASS + 新发现 | 进 P7 合并当前修复 → 进 P7.5 分流新发现 |

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

### 7.3 Pass + 新发现 → 合并当前 + 进 P7.5

```
✅ Pass + 新发现 (BF-0419-2)

当前 bug 修复已通过你的验收，我立即进行合并（同 7.1）。
新发现我会在 P7.5 里逐条分流，不会漏也不会夹带到当前修复。

合并中...
```

合并完成后，立即进入 P7.5（不等用户）。

---

## P7.5 新发现分流

> 🎯 **硬性要求**：新发现不得直接修、不得进 TODO、不得停在 AI 脑里。必须逐条分类并写入 `docs/bugfix/backlog.md` 对应区。

### 7.5.1 读取新发现

从 Bug 修复验收报告的"新发现"区读取，解析成一条一条的条目（一行一条）。

### 7.5.2 AI 逐条分类

对每条新发现，AI 判断属于哪一类：

| 类别 | 判定标准 | 去哪 | 编号 |
|-----|---------|------|------|
| 同根（罕见）| 符合 P5.2.1 举证要求（同文件同函数/同数据字段/同上游依赖）| 不进 backlog，建议开新会话修 | 暂不编号 |
| 独立 bug | 是可复现的失效行为，但不符合同根标准 | `$DOC_BACKLOG` 🐛 待修区 | BF-{MMDD}-{N+1}, +2... |
| 新需求 | 描述的是"希望能..."、当前功能不存在的能力 | `$DOC_BACKLOG` 💡 新需求区 | N-{MMDD}-{M+1}... |
| 模糊反馈 | 现象说不清、未复现、"感觉有点怪" | `$DOC_BACKLOG` 🌀 待澄清区 | 无编号，时间戳 |

### 7.5.3 AI 必须举证同根

如果 AI 判定某条是"同根"，向用户展示证据：

```
🔍 新发现 #1：登录页右上角铃铛图标偶尔闪一下

AI 判定：疑似同根

举证：
- 根因位置：AuthStore.ts:45 `onAuthChange` 回调
- 当前 bug 引用点：Avatar.tsx:23 订阅该回调
- 新发现引用点：Bell.tsx:17 同样订阅该回调
- 结论：两者都受 AuthStore.onAuthChange 回调执行时机影响

A) 确认同根 → 建议新会话一起修（我会写进 backlog 并标记"共因 with BF-0419-2"）
B) 我觉得不是 → 按独立 bug 处理，写 backlog.md 🐛 待修区
```

举证不足 → AI 直接按独立 bug 处理，不问用户（用户如果不认可可覆盖）。

### 7.5.4 分流报告

完成分流后向用户输出总结：

```
📋 新发现分流完成 (来自 BF-0419-2 的验收)

写入 $DOC_BACKLOG：

🐛 待修 bug:
  - BF-0419-3 铃铛图标偶尔闪一下（P2，独立）
  - BF-0419-4 登出时有一次 404 请求（P1，独立）

💡 新需求:
  - N-0419-1 希望登录页加"记住我"选项（建议后续走 /forge-prd）

🌀 待澄清:
  - [2026-04-19] 翻页时感觉"卡了一下"，未复现

下次想修 backlog 里的任何一条 → 开新会话或 /clear，说"修 bugfix"，我会从 backlog 推荐候选。
```

---

---

## P8 沉淀（Bug 修复验收报告作为主产出 + backlog 归档）

### 8.1 主产出：Bug 修复验收报告已就位

`docs/bugfix/reviews/{BUG_ID}.md` 本身已经是最全的历史记录：
- 问题发现记录（来源 / 初始证据 / Feature Spec 场景）
- 复现记录与根因分析
- 修复记录（worktree / TDD 红绿证据 / 文件 / commit）
- 验收入口与环境身份校验（Frontend / Backend / PID / cwd / commit）
- 人工验收指南
- QA 测试过程与 Markdown 内嵌截图证据
- 最终结论

**不再重写日级别 bugfix 文档的冗余内容**。如果项目有 `docs/bugfix/{日期}.md` 的日汇总习惯，AI 只追加一行索引：

```markdown
### {BUG_ID}: {一句话标题}

- **状态**: ✅ 已修复 / ❌ 阻塞
- **Bug 修复验收报告**: [docs/bugfix/reviews/{BUG_ID}.md](./reviews/{BUG_ID}.md)
- **worktree**: `.worktrees/bf-{MMDD}-N`（已合并 / 暂存）
```

### 8.2 Backlog 归档（硬动作）

修复完成的 bug，如果原本登记在 `$DOC_BACKLOG` 🐛 待修区，AI 必须：

1. 从"🐛 待修"表格中**剪切**该行
2. 粘贴到"🗄️ 已处理"区的对应月份下，格式：
   ```
   - **BF-0419-2** 登录头像不刷新 — resolved 2026-04-19 → 详见 docs/bugfix/reviews/BF-0419-2.md
   ```
3. **已处理区永久保留**。不做清理，用于将来定位类似问题时回溯。

如果修复过程中有新发现分流进 backlog（P7.5），那些条目是新登记的，保持在待修区。

### 8.2.1 批量最终验收汇总（可选但推荐）

如果本次是 QA 自动闭环或多会话批量修复，AI 必须维护批次汇总文档：

```text
docs/bugfix/batches/BATCH-YYYY-MM-DD.md
```

批次汇总只做聚合，不替代单 bug 报告：

```markdown
# BATCH-YYYY-MM-DD BugFix 批量修复汇总

## 验收入口
- Frontend: ...
- Backend: ...
- 环境一致性: PASS

## 本批次 Bug
| Bug ID | 标题 | 状态 | 会话/Worktree | QA | 人工验收 | 报告 |
|---|---|---|---|---|---|---|
| BF-0425-1 | ... | qa-pass-pending-final-review | ... | PASS | 待填 | ../reviews/BF-0425-1.md |

## 最终人工验收指南
{{把本批次需要用户走的关键用户流程合并成一条或少数几条验收路线}}
```

批次汇总用于让用户最后只验收一次；每个 bug 的技术证据仍回到各自 `BF-XX.md`。

### 8.3 写入 Memory（仅当真的有跨会话价值）

判断标准（严格）：

| 值得 | 不值得 |
|---|---|
| 通用踩坑模式（如"过滤后计数必须联动"）| 具体代码改动细节 |
| 新的调试方法论（如"先查进程 cwd"）| 一次性配置修复 |
| 工具使用技巧 | 特定 bug 的症状描述 |

值得 → 写入 `~/.claude/projects/.../memory/feedback_{name}.md`，并在 MEMORY.md 加索引。

> ⚠️ **不要批量写 memory**。默认**不写**，除非你能说出"这条 memory 在下次会话会触发什么具体行为"。

### 8.4 同类模式扫描（挪到 /forge-review）

同类模式扫描（grep 全代码库找同类 bug）不是本次修复的范围，挪到 `/forge-review` 做。

---

## 出口：建议下一步

P8 完成后，AskUserQuestion：

```
✅ 本次修复完成（{BUG_ID}）

📊 当前会话状态：
  - 已完成的 bug：N 个（{BUG_ID 列表}）
  - 暂存的 worktree：M 个（git worktree list）
  - Backlog 待修：K 个（P0: a / P1: b / P2: c）

下一步建议（按场景推荐）：

A) 结束会话，下一个 bug 开新会话（强烈推荐）
   原因：上下文已经被本次修复占据，继续会引发 scope 蔓延。
   backlog 里 K 条待修，打开新会话说"修 bugfix"即可，我会从 backlog 推荐下一个。

B) 本会话继续修下一个 bug（不推荐，除非明确共因）
   等价于：立即用 /clear 清上下文，然后回 P2 启动。
   /compact 也可以，但 /clear 更干净。

C) 暂停修 bug，审查已合并的代码 → /forge-review
   检查 SQL 安全/竞态条件/枚举完整性等结构性问题。

D) 已合并的 commits 想发布 → /forge-ship
   更新 CHANGELOG + push + 创建 PR。

E) 想沉淀本会话经验 → /forge-fupan
   提取知识、诊断 AI/用户协作模式、写复盘文档。
   （复盘时会自动清理本会话在 .forge/active.md 的登记）

F) 清点所有并行会话 → /forge-status
   如果你开了多个窗口在修不同 bug，这个命令扫一遍 .forge/active.md，
   基于 worktree 存在性 + 分支合并状态报告哪些是活跃、哪些是僵尸可清理。

G) 关闭会话 — 没事了
   ⚠️ 但 .forge/active.md 里本会话的登记还在，下次建议跑 /forge-status 清理。

⚠️ 如果有暂存的 worktree，建议在 review/ship 前先决定它们的去留。
```

**默认推荐 A**。用户明确偏好："新 bug 默认新会话完成工作，或 /clear /compact 后继续"。
**走 A) 之前如果用户开了多个并行会话**，AI 可以主动提一句"别忘了也可以用 /forge-status 总览一下其他会话"。

---

## AskUserQuestion 格式规范

每次提问结构：
1. **重新聚焦**：当前项目、分支、正在调查的 BUG_ID
2. **通俗解释**：高中生能懂的语言
3. **给出建议**：推荐选项 + 理由
4. **列出选项**：`A) B) C)`

---

## 重要规则

### 单次修复纪律

1. **每次只修 1 bug，或 1-2 经 P4.5 确认共因的 bug**。其余进 `docs/bugfix/backlog.md`。
2. **每次一个 worktree**，命名 `.worktrees/bf-{MMDD}-{N}`。
3. **修完不自动合并**。必须等用户填完单 bug 或批次最终验收结论，AI 才能按 Pass 走 P7 合并。
4. **新发现的 bug / 新需求 / 模糊反馈 → backlog.md**。要修就开新会话（默认）或用户明确授权本会话继续。
5. **会话出口必须建议下一步**，默认推荐新会话或 /clear、/compact。

### 调查纪律

6. **铁律：不做根因分析就不写修复代码。**
7. **强制读 PRD + ENGINEERING.md + Bugfix 历史 + backlog.md**（会话级一次）。
8. **根因必须用 5 Whys 因果链向用户解释，用户确认方案后才动手。**
9. **3 次假设失败 → 停下来质疑架构（或弃用本次尝试开新会话）。**
10. **绝不说"这应该能修好"**。验证它，证明它。
11. **修复涉及 >5 个文件 → 必须确认。**
12. **无法复现就不要修。**

### Bug 修复验收报告纪律（硬性）

13. **P2.5 必须创建或更新 `docs/bugfix/reviews/{BUG_ID}.md`**。没有报告不创建 worktree、不进 P3。
14. **P5 修复完成后必须更新报告**。根因、修复记录、TDD 红绿证据、人工验收指南缺一不可。
15. **人工验收指南至少 3 条**，其中至少 1 条边界/异常态。
16. **AI 不得自行勾选最终结论**。
17. **没有用户最终结论或批次最终结论不进 P7**，即使 forge-qa 全过。
17.1. **状态枚举只能使用**：`pending / in-progress / fixed-awaiting-qa / qa-incomplete / qa-failed / qa-pass-pending-user-verification / qa-pass-pending-final-review / qa-pass-user-accepted / blocked-human / resolved / deferred`。
17.2. **用户问题闭环断言必须存在**。每份报告都要写清：用户原话、最终用户可见结果、证明方式、结论。
17.3. **配置/开关/数据就绪必须记录**。涉及前端展示、权限边界或数据可见性的 bug，缺少该检查不得进入 QA。

### 自动 QA + 人工验收纪律

18. **P6 明确调用 forge-qa**。不再在 forge-bugfix 内部做 QA。
19. **forge-qa 全过才进 P6.5 或批次待最终验收状态**。QA 挂了 AI 有界回 P5 继续修，不打扰用户。
20. **P6 后必须跑报告完整性校验器**：`validate-bugfix-report.py --ready-for-user` 不通过就是 `QA_INCOMPLETE`。
21. **前端/交互 bug 必须有 Markdown 内嵌 QA 截图**。没有截图、截图路径不存在、环境一致性不是 PASS，都不能交给用户验收。
22. **P6.5 等用户"验收了"信号**。单 bug 模式收到前不合并、不进 P7、不反复追问；批量模式等待最终验收包。
23. **用户结论三选一**：Pass / Fail / Pass + 新发现。
24. **Fail 不接受新问题进来**，只继续修原 bug。
25. **Pass + 新发现**：先合并当前 bug，再 P7.5 分流。
25.1. **自动闭环最多 3 轮**。第 3 次仍失败，或遇到需求/设计/环境身份疑问，必须 `blocked-human`。

### 同根举证纪律（硬约束）

24. **AI 声称"同根"必须举证**：同一文件的同一函数 / 同一数据字段 / 同一上游依赖。
25. **举证不足 → 默认独立 bug 写进 backlog**，不并入当前修复。

### worktree 纪律

26. **worktree 创建后如需启动应用，必须先执行 P3.2 Dev Server 契约**。
27. **项目存在统一入口时必须使用它**：`npm run dev:status` / `npm run dev` / `scripts/dev-stack.sh`，不得裸跑 `uvicorn`、`vite`、`next dev`。
28. **不提供 "弃用 worktree" 选项**。Fail 走回 P5 继续修；真的要放弃走 P4.4 三振出局。
29. **多次修复并发允许，但每次独立 worktree + 独立端口**；端口必须来自项目 dev-stack / `.devserver.json` / 状态输出，不能靠猜常见端口。
29.0. **APP_URL 必须可追溯**：传给浏览器、curl、forge-qa 的 URL 必须能在 dev:status/dev-stack status 中找到对应 cwd。
29.0.1. **无独立 worktree 不进入 P5**。如果项目无法创建 worktree（磁盘/权限/仓库状态异常），状态改 `blocked-human`，让用户决定，不在主工作区硬修。

### 并行协调纪律（v6.0 新增）

29.1. **P0 必须读 `.forge/active.md`**，把已占用功能域报告给用户；发现僵尸记录建议用户跑 /forge-status 清理。
29.2. **P2 必须做功能域判重**。同域冲突时优先建议"切去那个会话"，不默认新开窗口。
29.3. **P3 创建 worktree 成功后立即登记 active.md**，不得拖到修复结束。`$CURRENT_SID` 为空必须停下问用户，不得用占位符登记。
29.4. **功能域标签必须从 `.forge/active.md` 的"功能域声明"区选**，AI 不得自创新标签；首次使用的项目由 AI 初始化模板 + 用户编辑域列表后才继续。
29.5. **P7.1 合并前必须跑 `git merge --no-commit --no-ff` 预演**，冲突就回退 + 让用户决策 rebase 或暂存。
29.6. **合并成功后不清 active.md**，交给 forge-fupan 或 /forge-status 清理。backlog.md 的状态同步改 `resolved` 是 forge-bugfix 的职责。
29.7. **不得基于时间戳判定"会话已死"**。只认 worktree 存在性 + 分支 merge 状态这两个硬信号。

### Backlog 纪律

30. **新发现分流必须写进 `docs/bugfix/backlog.md`**。不写 TODO.md，不分散到多个文件。
31. **"已处理"区永久保留**（用户明确要求，用于以后定位问题时回溯）。
32. **AI 不得往 backlog 塞"顺手重构"想法**。那种东西写代码注释 `// REFACTOR: xxx`。
33. **P2 范围推荐必须先扫 backlog**，把待修区的条目作为候选之一。

### 沉淀纪律

34. **每个修复原子提交**。一个 BUG_ID，一个 commit（或一个 commit 组）。
34.1. **每个 bug 独立 TDD**。前端 bug 可用 Playwright 断言作为 RED/GREEN，不能只靠截图。
35. **Bug 修复验收报告即历史产出**，不再重复写 bugfix/{日期}.md（可留索引）。
36. **Memory 默认不写**。除非能说出"这条会触发未来什么具体行为"。

### 完成状态

- **完成** — 根因找到，修复已应用，QA 通过，worktree 已合并/暂存/弃用
- **完成但有顾虑** — 已修复但无法完全验证（间歇性 Bug、需要线上确认）
- **阻塞** — 根因不明确，已升级处理

### 升级机制

可以随时停下来说"超出能力"或"对结果没信心"。

**糟糕的修复比不修更糟。** 升级不会被惩罚。

升级格式：
```
状态：阻塞 | 需要更多信息
原因：[1-2 句话]
已尝试：[做了什么]
worktree：[路径，建议保留以便其他人接手]
建议：[用户接下来做什么]
```
