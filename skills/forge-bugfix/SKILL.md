---
name: forge-bugfix
version: 5.0.0
description: |
  一次只修一个 bug + 独立 worktree + 双层验收（forge-qa 自动 → 用户人工）。
  每次修完生成结构化验收清单文档，AI 在会话中提供路径供用户点击跳转。
  铁律：不做根因分析就不写修复代码 + 修完不自动合并 + 没有验收清单不算完 +
  新发现禁止当场顺手修（必须分流到 backlog）+ 多 bug 默认不串成长会话。

  会话级（一次性）：P0 环境探测 → P1 问题理解 + 强制读 PRD / ENG / Bugfix 历史 / Memory。
  每次修复（可循环）：
    P2 范围推荐（用户指定、用户新反馈或从 backlog.md 捞候选）→ P3 创建 worktree + 复现
    → P4 根因追踪 + 5 Whys + 方案确认 → P5 worktree 内修复 + 原子提交
    → P5.3 生成验收清单文档（docs/bugfix/reviews/BF-XX.md）
    → P6 调用 forge-qa 做自动验收，填清单 QA 列
    → P6.5 用户人工验收（AI 给清单路径，用户填用户列 + 最终结论）
    → P7 按三选一分流（Pass 合并 / Fail 回 P5 / Pass + 新发现 合并并分流）
    → P7.5 新发现分流到 backlog.md（同根判定必须举证）→ P8 沉淀。
  出口：强烈建议新会话或 /clear、/compact 后继续下一个 bug；
    全部完成 → 建议 /forge-review、/forge-ship 或 /forge-fupan。

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

# /forge-bugfix：一次一 bug + 双层验收清单

## 设计哲学

**短会话、结构化验收、可追溯、可丢弃。**

核心机制：

- **双层验收清单**：每次修完生成 `docs/bugfix/reviews/BF-XX.md` 表格化清单
  - **第一层**：forge-qa 跑自动化测试，填"QA 验证"列
  - **第二层**：用户二次人工验收，填"你的验收"列 + 最终结论
  - **明确封闭时刻**：用户填完最终结论（Pass / Fail / Pass + 新发现）才算修复结束
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
3. **每次一个 worktree**。修复在 worktree 内完成，主分支只通过 P7 合并。
4. **修完不自动合并**，必须等用户填完验收清单的最终结论。
5. **没有验收清单不算完**。P5 修复完成后必须生成 `docs/bugfix/reviews/BF-XX.md`，经 forge-qa 和用户两层填写后才进 P7。
6. **新发现的 bug / 新需求 / 模糊反馈 → `docs/bugfix/backlog.md`**，绝不在当前修复内夹带。
7. **同根判定必须举证**。AI 声称"这条新发现是当前 bug 同根"时，必须列出具体证据（同文件、同函数、同数据流），证据不足默认为独立 bug。

---

## 流程总览

```
═══════════ 会话级（每会话一次，多次修复复用）═══════════
P0  环境探测（前置脚本，自动执行）
P1  问题理解 + 强制读 PRD/ENGINEERING/Bugfix 历史/Memory

═══════════ 每次修复（一次一 bug，可循环）═══════════
P2   范围推荐
     ├─ AI 从 docs/bugfix/backlog.md 捞候选 + 列出本会话新报告的 bug
     ├─ 推荐"本次修 X"（1 个 / 或 1-2 共因），其余 → backlog
     └─ 用户确认范围
P3   创建 worktree（端口预检）+ 复现
P4   根因追踪 + 假设验证 + 5 Whys + 修复方案确认
P5   worktree 内最小修复 + 原子提交
P5.3 ⭐ 生成验收清单文档 docs/bugfix/reviews/BF-XX.md
     ├─ AI 填基本信息 + 验证项表格（前 3 列）
     └─ QA 验证列和用户验收列留 ⏳ 待填
P6   ⭐ 调用 forge-qa 自动验收
     ├─ forge-qa 针对每个验证项跑自动化测试
     ├─ 填"QA 验证"列和"QA 验收记录"节
     ├─ QA 全过 → 进 P6.5
     └─ QA 有挂 → 回 P5 继续修（不打扰用户）
P6.5 ⭐ 用户人工验收
     ├─ AI 输出"请人工验收 @ docs/bugfix/reviews/BF-XX.md"
     ├─ 用户打开文档填"你的验收"列 + 最终结论（Pass / Fail / Pass + 新发现）
     └─ 用户说"验收了" → AI 读清单 → 判定
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
2. 修复代码写完后必须生成验收清单（P5.3）才能进入验收阶段
3. 验收清单没有用户最终结论（P6.5）前，**不进 P7**——即使 QA 全过
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

# === 框架 / 测试框架 / 应用端口 ===
# ... 框架探测 / 测试框架探测 / 默认应用端口探测 ...

# === 扫描本地端口 → $APP_URL ===
APP_URL=""
for port in 3456 3000 4000 5173 8080 8000; do
  if lsof -i :"$port" -sTCP:LISTEN &>/dev/null 2>&1; then
    APP_URL="http://localhost:$port"
    # 记录占用进程的 cwd，避免 worktree 端口劫持
    _PID=$(lsof -ti :"$port" -sTCP:LISTEN 2>/dev/null | head -1)
    _CWD=$(lsof -p "$_PID" 2>/dev/null | awk '$4=="cwd"{print $9}')
    echo "APP_URL=$APP_URL (PID=$_PID cwd=$_CWD)"
    break
  fi
done
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

# reviews 目录（每个 bug 一个验收清单文档）
DOC_REVIEWS="$_ROOT/docs/bugfix/reviews"
mkdir -p "$DOC_REVIEWS" 2>/dev/null
echo "REVIEWS 目录: $DOC_REVIEWS"

[ -d "$_ROOT/docs/bugfix" ] && DOC_BUGFIX="$_ROOT/docs/bugfix" && echo "BUGFIX 历史: $DOC_BUGFIX"

# === 报告目录 ===
REPORT_DIR="$_ROOT/.gstack/bugfix-reports"
mkdir -p "$REPORT_DIR/screenshots" 2>/dev/null
echo "报告目录: $REPORT_DIR"
```

**关键变量**：

| 变量 | 含义 |
|------|------|
| `$BROWSE` | gstack/browse 路径，空=不可用 |
| `$PW_AVAILABLE` | Playwright 是否可用 |
| `$APP_URL` | 本地应用 URL（含占用进程 PID + cwd）|
| `$DOC_PRD` / `$DOC_ENG` / `$DOC_BUGFIX` | 项目文档路径 |
| `$DOC_BACKLOG` | bug 任务池 `docs/bugfix/backlog.md` |
| `$DOC_REVIEWS` | 验收清单目录 `docs/bugfix/reviews/` |
| `$REPORT_DIR` | 截图和报告输出目录 |

⚠️ **新增**：APP_URL 检测时记录占用进程 PID 和 cwd，防止 worktree 端口劫持（历史踩坑：worktree 旧 uvicorn 抢 8080，主项目改动不生效，30+ 分钟才定位）。

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

## P2 范围推荐（双来源捞候选 + 写入 backlog.md）

> 🎯 核心：不做"全量分诊排序后逐个修"，而是"AI 推荐单次修复范围，其余进 backlog.md"。

### 2.1 AI 捞候选

候选来源有两个：

1. **用户本会话报告的 bug**（直接描述）
2. **`$DOC_BACKLOG` 的 🐛 待修区**（跨会话登记的）

AI 合并两个来源，推荐**本次修哪个/哪些**：

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

我推荐本次修：

  ✅ 本次：[Bug A]（BF-0419-2）
     来源：本会话新报告 / 或 backlog 登记于 2026-04-17
     理由：阻塞核心流程且独立可定位（或：Bug A + Bug C 共因 = XX.tsx 的 source 字段处理）

  📋 推迟到 backlog（下次修复或下次会话再说）：
     - Bug B: [症状] → 写入 backlog.md 🐛 待修区（P1）
     - Bug D: [症状] → 写入 backlog.md 🐛 待修区（P2）
     - 新需求 N1: [描述] → 写入 backlog.md 💡 新需求区（建议 /forge-prd）

我会把推迟的写入 `$DOC_BACKLOG`。

A) 同意推荐 — 进入 P3 创建 worktree
B) 调整范围 — 改修 [其他 bug]
C) 我想多修一些 — 违反单次修复原则，请说明理由
```

### 2.3 写入 backlog.md

用户确认后，把推迟的条目追加到 `$DOC_BACKLOG` 的对应区：

**🐛 待修区（独立 bug）**：追加一行到表格：

```markdown
| BF-0419-3 | [症状一句话] | 会话 2026-04-19 用户报告 | [相关文件/模块] | P1 | pending |
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
- 编号用于：worktree 命名、commit message、bugfix 文档、验收清单文件名
- 从 backlog 捞的条目，沿用其原编号，不重新分配

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

### 3.2 ⚠️ worktree 端口冲突预检

**强制步骤**。历史踩坑：worktree 内启动的服务和主仓库抢同一端口，curl/前端打到旧代码上，调试 30+ 分钟。

```bash
# 1. 检查目标端口是否被现有 worktree 占用
for port in 3456 3000 4000 5173 8080 8000; do
  PID=$(lsof -ti :"$port" -sTCP:LISTEN 2>/dev/null | head -1)
  if [ -n "$PID" ]; then
    CWD=$(lsof -p "$PID" 2>/dev/null | awk '$4=="cwd"{print $9}')
    echo "端口 $port: PID=$PID cwd=$CWD"
  fi
done

# 2. 如果发现 cwd 是其他 worktree，向用户报警：
#    "⚠️ 端口 $port 被 .worktrees/$other 的进程占用，
#     本次修复启动服务会走端口冲突。建议：
#     A) kill 该进程后启动本次服务（推荐）
#     B) 本次服务用其他端口（如 +10）
#     C) 本次不启服务，直接读代码 + 单元测试"
```

### 3.3 切换到 worktree 工作

```bash
cd "$WT_PATH"
# 后续所有操作（复现、修改、commit）都在 worktree 内进行
```

### 3.4 复现 Bug

**确定性复现是调查的核心。无法复现就无法验证修复。**

引擎优先级：gstack/browse > Playwright > 纯代码

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

## P5.3 生成验收清单文档

> 🎯 **关键节点**。代码修完 + 提交 + 清理之后，AI **必须**生成一份结构化的验收清单文档。没有这份文档，禁止进入验收阶段。

### 5.3.1 生成文档

```bash
# 文档路径
REVIEW_DOC="$DOC_REVIEWS/${BUG_ID}.md"

# 从模板复制
cp "$HOME/.claude/skills/forge-bugfix/templates/review-checklist.md" "$REVIEW_DOC"
# 或（如果 skill 安装在 cookbook 里）：
# cp "$_ROOT/../forge-cookbook/skills/forge-bugfix/templates/review-checklist.md" "$REVIEW_DOC"

echo "✅ 验收清单已创建: $REVIEW_DOC"
```

### 5.3.2 AI 填充的内容

AI 负责填写清单的前半部分：

| 字段 | 填什么 |
|------|--------|
| BUG_ID | `BF-{MMDD}-{N}` |
| Bug 描述 | 一句话用户视角的现象 |
| 根因 | P4 5 Whys 追到的根因 |
| 修复做了什么 | 关键逻辑改动，不超过两句话 |
| 涉及文件 | 本次 commit 改到的文件列表 |
| 修复时间 | 当前时间 |
| 修复 commit | 短 hash + commit message 首行 |
| 验证项表（前 3 列） | 验证项描述 / 预期效果 / 操作步骤 |

### 5.3.3 验证项最少条件

- **至少 3 条**验证项
- 其中**至少 1 条边界/异常态**（空数据 / 失败场景 / 错误恢复）
- 每条验证项必须可以**独立验证**（不依赖其他条）
- 操作步骤用 `1. ... → 2. ...` 方式写，明确可执行

### 5.3.4 禁止行为

- ❌ AI 不得填"QA 验证"列（留给 forge-qa）
- ❌ AI 不得填"你的验收"列（留给用户）
- ❌ AI 不得自行勾选最终结论
- ❌ AI 不得省略任何验证项（即使 bug 很小，也要最少 3 条）

### 5.3.5 完成后向用户报告

```
✅ 验收清单已就绪 (BF-0419-2)

📄 文档路径：docs/bugfix/reviews/BF-0419-2.md

我已经填好：基本信息 + {N} 条验证项。
接下来我会调用 forge-qa 跑自动验收（P6），
QA 全过之后再交给你做人工二次验收（P6.5）。

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
| 验收清单文档存在 | `test -f "$REVIEW_DOC" && echo OK` | 回 P5.3 生成清单 |
| 验证项 ≥ 3 条 | 读清单，数表格行数 | 回 P5.3 补齐验证项 |
| "QA 验证"列全是 ⏳ 待填 | `grep -c "⏳ 待填" "$REVIEW_DOC"` | AI 越位填过就清空重来 |
| worktree 代码已提交 | `cd "$WT_PATH" && git status --porcelain` 应为空 | 补提交 |
| 应用可访问（如 bug 类型需要） | `curl -sf "$APP_URL" > /dev/null` | 重启服务 |
| 进程身份核对（应用运行） | `lsof -p $PID \| grep cwd` 指向当前 worktree | 杀旧进程重启 |

**任一不通过 → 不启动 forge-qa，先补齐。**

### 6.2 触发 forge-qa（必须用 Skill 工具）

AI **必须**通过 Skill 工具触发 forge-qa，**不得**用自然语言"暗示"、不得绕过：

调用格式：

```
Skill(
  skill="forge-qa",
  args="mode=B review_doc=<清单路径> bug_id=<BF-XXXX> worktree=<路径> app_url=<URL> commit=<hash>"
)
```

**args 字段强制要求**：

| 参数 | 值 | 必填 |
|------|-----|------|
| `mode=B` | 指示 forge-qa 进入 Mode B（单 bug 验收）| ✅ |
| `review_doc=<路径>` | 验收清单文档的绝对路径 | ✅ |
| `bug_id=BF-{MMDD}-{N}` | 本次 Bug 编号 | ✅ |
| `worktree=<路径>` | 当前 worktree 绝对路径 | ✅ |
| `commit=<hash>` | 修复 commit 短 hash | ✅ |
| `app_url=<URL>` | 本地应用 URL（若 bug 类型需要）| 条件必填 |

AI 在调用前向用户说明：

```
🧪 调用 forge-qa 做自动验收 (BF-0419-2)

验收清单: docs/bugfix/reviews/BF-0419-2.md
模式: Mode B（单 bug 验收）
传入参数: review_doc, bug_id, worktree, commit, app_url

forge-qa 会跑完所有验证项，把结果回填到清单里，我等它返回。
```

然后**立刻**执行 Skill 工具调用，不要做任何其他操作。

### 6.3 等待返回 + 重读清单（不依赖记忆）

forge-qa 执行完成后，AI 必须**重新读取 `$REVIEW_DOC`**，以文件内容为准解析结果：

```bash
cat "$REVIEW_DOC"
```

**禁止**依赖 Skill 工具返回的文本消息推断 QA 结果，只以清单文件内容为准。

### 6.4 结果解析（三态）

| 清单状态 | 信号 | 下一步 |
|---------|------|--------|
| 所有验证项 "QA 验证"列 = ✅ | `QA_PASS` | 进 **P6.5** 用户人工验收 |
| 任一验证项 "QA 验证"列 = ❌ | `QA_FAIL` | 回 **P5** 继续修复（不打扰用户）|
| 任一验证项 "QA 验证"列 = ⏳ 待填（未被 forge-qa 填） | `QA_INCOMPLETE` | **异常兜底**（见 6.6）|

### 6.5 QA_FAIL 时的回修纪律

不弹窗问用户、不发送报告，AI 直接：

1. 读清单的"QA 验收记录"节，看哪条 ❌ + 具体原因 + 证据
2. 回到 P4.1 重新追根因（**不跳过根因分析**）
3. 修完 → 重提 commit（新 commit 追加，不 amend）
4. 更新 `$REVIEW_DOC` 的"修复 commit"字段，**不要改清单其他内容**
5. 回到 P6.1 重新走门禁 → 再次触发 forge-qa
6. **同一验证项连续失败 3 次** → 走 P4.4 三振出局升级用户

### 6.6 异常兜底

#### 异常 A：Skill 工具调用失败或不可用

```
❌ forge-qa 调用失败

错误：<原始错误信息>

处理顺序（AI 必须尝试 A → B → C）：
A) 重试一次（瞬时失败常见）
B) AI 手动执行 forge-qa Mode B 的等价流程
   （按 skills/forge-qa/SKILL.md 的 Mode B 章节逐条跑，亲自回填清单）
C) 若 B 也不可行 → AskUserQuestion 告知用户 QA 环节无法自动化，
   请用户决定：C1) 自己先过一遍验证项；C2) 暂停本次修复等环境修好
```

#### 异常 B：QA_INCOMPLETE（清单有 ⏳ 未填项）

```
⚠️ forge-qa 未跑完所有验证项

已跑：X / N
漏掉：<验证项列表>
原因：<读"QA 验收记录"节>

AI 必须判断：
1. 是 blocker 导致（服务挂了/依赖不可用）→ 修 blocker → 回 P6.1 重跑
2. 是清单有不可自动验证的项 → 把那几条的"QA 验证"列填 "N/A 仅人工验收"，继续 P6.5
3. 是 forge-qa 内部错误 → 报错给用户，按异常 A 处理
```

#### 异常 C：清单被 forge-qa 以外的东西污染

```bash
# 调用后检查清单是否完整、格式没被破坏
diff <(wc -l "$REVIEW_DOC") <(预期行数)
```

若清单结构被破坏 → AskUserQuestion 请用户确认，AI 不自行"修复"清单。

### 6.7 铁律（总结）

1. **必须用 Skill 工具调用 forge-qa**，不得用自然语言"暗示"
2. **必须通过门禁检查**（6.1 所有项）才能触发
3. **必须重读清单文件**解析结果，不依赖记忆或返回消息
4. **QA_FAIL 时不打扰用户**，AI 自己回 P5 重来
5. **连续 3 次 QA 失败必须升级用户**，不能无限循环
6. **不得越位填"QA 验证"列**，那是 forge-qa 的领地

### 6.8 P3 复现工具复用

forge-bugfix 的 gstack/browse、Playwright、截图留证等工具在 **P3 复现**阶段由 forge-bugfix 直接调用。P6 阶段这些工具由 forge-qa 统一编排，结果填到验收清单，不产出散乱的 QA 报告。

---

## P6.5 用户人工验收（硬性关卡）

> 🎯 **关键封闭点**。只有 QA 全过才进这里，没有用户的最终结论不进 P7。

### 6.5.1 AI 通知用户

QA 全过后，AI 向用户发送：

```
✅ forge-qa 自动验收全过 (BF-0419-2)

📄 请你做人工二次验收：
   docs/bugfix/reviews/BF-0419-2.md

步骤：
1. 打开文档
2. 按"操作步骤"列逐条亲自验证
3. 在"你的验收"列填 ✅ 通过 / ❌ 未通过 + 原因
4. 在底部"最终结论"区勾一个：Pass / Fail / Pass + 新发现
5. 如果勾了"Pass + 新发现"，在下面的"新发现"区把看到的问题一条一行写出来
6. 填完告诉我一声"验收了"

我会读清单，按你的结论推进下一步。
```

### 6.5.2 等待用户信号

AI 等待用户说"验收了"（或同义表达："验收完了"、"好了你看"、"已经填了"）。

收到信号前 AI 不得：
- 主动合并 worktree
- 进入 P7
- 反复追问"验收完没"

可以：
- 用户问其他问题时正常回答
- 用户说"我还没试"时回应"不着急，我等你"

### 6.5.3 读取清单 + 判定

用户说"验收了"后：

```bash
# AI 读取清单
cat "$REVIEW_DOC"
```

解析"最终结论"区，判定三种情况之一：

| 用户勾的是 | AI 下一步 |
|-----------|----------|
| ✅ Pass | 进 P7 合并决策 |
| ❌ Fail | 回 P5 继续修（读"你的验收"列的 ❌ 原因定位问题）|
| ⚠️ Pass + 新发现 | 进 P7 合并当前修复 → 进 P7.5 分流新发现 |

### 6.5.4 边界情况

- **用户未填任何勾**：AI 提示"最终结论还没勾，请选一个再告诉我验收了"
- **用户勾了多个**：AI 提示"最终结论只能选一个，请确认"
- **用户填了 ❌ 但也写了新发现**：按 Fail 处理（原 bug 还没修好优先），新发现暂存（不丢），等 Pass 后再分流

---

## P7 按最终结论分流

> 🎯 **Pass 即合并**（不再问"是否合并"）。**没有弃用选项**——Fail 走回 P5 继续修，放弃修复走 P4.4 三振出局。

### 7.1 Pass → worktree 合并决策

用户勾了 ✅ Pass，AI 通过 AskUserQuestion 询问合并方式：

```
🎯 worktree 合并决策 (BF-0419-2)

验收结论：✅ Pass
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

从验收清单文档的"新发现"区读取，解析成一条一条的条目（一行一条）。

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

## P8 沉淀（验收清单作为主产出 + backlog 归档）

### 8.1 主产出：验收清单文档已就位

`docs/bugfix/reviews/{BUG_ID}.md` 本身已经是最全的历史记录：
- 基本信息（描述 / 根因 / 改了啥 / 文件 / commit）
- 验证项表格（+ QA 验收记录 + 用户验收记录）
- 最终结论

**不再重写日级别 bugfix 文档的冗余内容**。如果项目有 `docs/bugfix/{日期}.md` 的日汇总习惯，AI 只追加一行索引：

```markdown
### {BUG_ID}: {一句话标题}

- **状态**: ✅ 已修复 / ❌ 阻塞
- **验收清单**: [docs/bugfix/reviews/{BUG_ID}.md](./reviews/{BUG_ID}.md)
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

F) 关闭会话 — 没事了

⚠️ 如果有暂存的 worktree，建议在 review/ship 前先决定它们的去留。
```

**默认推荐 A**。用户明确偏好："新 bug 默认新会话完成工作，或 /clear /compact 后继续"。

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
3. **修完不自动合并**。必须等用户填完验收清单最终结论，AI 才能按 Pass 走 P7 合并。
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

### 验收清单纪律（硬性）

13. **P5 修复完成后必须生成 `docs/bugfix/reviews/{BUG_ID}.md`**。没有清单不进 P6。
14. **AI 只填清单前半部分**（基本信息 + 验证项前 3 列）。QA 列留给 forge-qa，用户列留给用户。
15. **验证项至少 3 条**，其中至少 1 条边界/异常态。
16. **AI 不得自行勾选最终结论**。
17. **没有用户最终结论不进 P7**，即使 forge-qa 全过。

### 双层验收纪律

18. **P6 明确调用 forge-qa**。不再在 forge-bugfix 内部做 QA。
19. **forge-qa 全过才进 P6.5**。QA 挂了 AI 自己回 P5 继续修，不打扰用户。
20. **P6.5 等用户"验收了"信号**。收到前不合并、不进 P7、不反复追问。
21. **用户结论三选一**：Pass / Fail / Pass + 新发现。
22. **Fail 不接受新问题进来**，只继续修原 bug。
23. **Pass + 新发现**：先合并当前 bug，再 P7.5 分流。

### 同根举证纪律（硬约束）

24. **AI 声称"同根"必须举证**：同一文件的同一函数 / 同一数据字段 / 同一上游依赖。
25. **举证不足 → 默认独立 bug 写进 backlog**，不并入当前修复。

### worktree 纪律

26. **worktree 创建前必须做端口冲突预检**。
27. **worktree 内启动服务 → 必须核对进程 cwd**（`lsof -p $PID | grep cwd`）。
28. **不提供 "弃用 worktree" 选项**。Fail 走回 P5 继续修；真的要放弃走 P4.4 三振出局。
29. **多次修复并发允许，但每次独立 worktree + 独立端口**。

### Backlog 纪律

30. **新发现分流必须写进 `docs/bugfix/backlog.md`**。不写 TODO.md，不分散到多个文件。
31. **"已处理"区永久保留**（用户明确要求，用于以后定位问题时回溯）。
32. **AI 不得往 backlog 塞"顺手重构"想法**。那种东西写代码注释 `// REFACTOR: xxx`。
33. **P2 范围推荐必须先扫 backlog**，把待修区的条目作为候选之一。

### 沉淀纪律

34. **每个修复原子提交**。一个 BUG_ID，一个 commit（或一个 commit 组）。
35. **验收清单文档即历史产出**，不再重复写 bugfix/{日期}.md（可留索引）。
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
