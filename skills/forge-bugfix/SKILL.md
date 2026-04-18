---
name: forge-bugfix
version: 4.0.0
description: |
  单弹道最小 Bug 修复 + worktree 隔离。每个会话每发只修 1 个 bug（或 1-2 个共因 bug），
  每发独立 worktree，修复中发现的新 bug 进 TODO 不污染当前弹道。
  铁律：不做根因分析就不写修复代码 + 修完不自动合并 + 多 bug 不串成长会话。

  会话级（一次性）：P0 环境探测 → P1 问题理解+强制读 PRD/ENG/Bugfix历史/Memory。
  弹道级（每弹道一次，可循环）：
    P2 范围推荐 → P3 创建 worktree（端口预检）+ 复现 → P4 根因追踪+5 Whys+方案确认
    → P5 worktree 内修复+原子提交 → P6 动态 QA（AI 评估范围用户可否决）
    → P7 worktree 合并决策（合并/暂存/弃用，必须问用户） → P8 沉淀。
  出口：还想继续 → 回 P2 启动下一弹道；全部完成 → 建议 /forge-review、/forge-ship 或 /forge-fupan。

  触发方式：用户说"修这个 bug"、"这里有问题"、"为什么不对"、"排查一下"、"investigate"、"forge-bugfix"，
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
---

# /forge-bugfix v4.0：单弹道最小修复 + worktree 隔离

## 设计哲学

**短会话、小弹道、可丢弃。**

历史教训（v3.x 时期）：一次会话承包用户报告的所有 bug，过程中又吸入新 bug 和新需求，最终演化成"21 commits / 9 bugs / 1.8M tokens"的迷你重构。修一个 bug 半天修不好、scope creep 失控、多 bug 之间互相污染上下文。

v4.0 改变：
- **单弹道 = 1 bug 或 1-2 共因 bug**（AI 推荐范围，用户拍板）
- **每弹道一个 worktree**（隔离 + 失败可弃 + 不污染主仓库）
- **修完必须问"要合并吗"**（不自动 merge）
- **新发现的 bug → TODO，不当场修**（要修就走新弹道）
- **会话出口必须建议下一步**（review / ship / fupan）

## 铁律

1. **不做根因分析，就不写修复代码。** 直觉再强也要先验证。
2. **每发只修 1 bug，或 1-2 个**经 P3.4 确认共因**的 bug**。其余进 TODO。
3. **每发一个 worktree**。修复在 worktree 内完成，主分支只通过 P7 合并。
4. **修完不自动合并**，必须经 P7 用户确认。
5. **新发现的 bug/新需求 → TODO**，要修就开新弹道（用户授权后），绝不在当前弹道夹带。

---

## 流程总览

```
═══════════ 会话级（每会话一次，多弹道复用）═══════════
P0  环境探测（前置脚本，自动执行）
P1  问题理解 + 强制读 PRD/ENGINEERING/Bugfix历史/Memory

═══════════ 弹道级（每弹道一发，可循环）═══════════
P2  范围推荐
    ├─ AI 列出所有报告的 bug
    ├─ 推荐"本弹道修 X"（1 个 / 或 1-2 共因），其余 → TODO
    └─ 用户确认范围
P3  创建 worktree（端口预检）+ 复现
P4  根因追踪 + 假设验证 + 5 Whys + 修复方案确认
P5  worktree 内最小修复 + 原子提交
P6  动态 QA（AI 评估范围 → 用户可否决 → 执行）
P7  ⚠️ worktree 合并决策（合并 / 暂存 / 弃用）
P8  写 bugfix 文档 + 经验沉淀

═══════════ 出口 ═══════════
- 用户想继续修下一发 → 回 P2（P0/P1 不重读）
- 全部完成 → 建议 /forge-review、/forge-ship 或 /forge-fupan
```

**红线**：写任何修复代码前必须完成 P2-P4（含范围确认和 5 Whys 根因确认）。

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

# === 现有 worktree 清单（v4.0 新增）===
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

# === 框架 / 测试框架 / 应用端口（同 v3.x，略）===
# ... 保留 v3.x 完整脚本中的框架/测试/端口/文档检测逻辑 ...

# === 扫描本地端口 → $APP_URL ===
APP_URL=""
for port in 3456 3000 4000 5173 8080 8000; do
  if lsof -i :"$port" -sTCP:LISTEN &>/dev/null 2>&1; then
    APP_URL="http://localhost:$port"
    # v4.0 新增：记录占用进程的 cwd，避免 worktree 端口劫持
    _PID=$(lsof -ti :"$port" -sTCP:LISTEN 2>/dev/null | head -1)
    _CWD=$(lsof -p "$_PID" 2>/dev/null | awk '$4=="cwd"{print $9}')
    echo "APP_URL=$APP_URL (PID=$_PID cwd=$_CWD)"
    break
  fi
done
[ -z "$APP_URL" ] && echo "APP_URL=（未检测到运行中的应用）"

# === 项目文档清单 ===
DOC_PRD=""; DOC_ENG=""; DOC_QA=""; DOC_TODO=""; DOC_BUGFIX=""
for p in "$_ROOT/docs/PRD.md" "$_ROOT/PRD.md"; do [ -f "$p" ] && DOC_PRD="$p" && echo "PRD: $p" && break; done
for p in "$_ROOT/docs/ENGINEERING.md" "$_ROOT/ENGINEERING.md"; do [ -f "$p" ] && DOC_ENG="$p" && echo "ENGINEERING: $p" && break; done
for p in "$_ROOT/docs/QA.md" "$_ROOT/QA.md"; do [ -f "$p" ] && DOC_QA="$p" && echo "QA: $p" && break; done
for p in "$_ROOT/TODO.md" "$_ROOT/TODOS.md"; do [ -f "$p" ] && DOC_TODO="$p" && echo "TODO: $p" && break; done
[ -d "$_ROOT/docs/bugfix" ] && DOC_BUGFIX="$_ROOT/docs/bugfix" && echo "BUGFIX历史: $DOC_BUGFIX"

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
| `$DOC_PRD` / `$DOC_ENG` / `$DOC_BUGFIX` / `$DOC_TODO` | 文档路径 |
| `$REPORT_DIR` | 截图和报告输出目录 |

⚠️ **新增**：APP_URL 检测时记录占用进程 PID 和 cwd，防止 worktree 端口劫持（历史踩坑：worktree 旧 uvicorn 抢 8080，主项目改动不生效，30+ 分钟才定位）。

---

## P1 问题理解 + 上下文采集（会话级·一次执行）

> ⚡ **会话级声明**：本步只在会话首次进入时执行一次。同一会话起多个弹道时，P1 不重读，直接复用上下文。

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
| QA.md (`$DOC_QA`) | 按需 | 已知问题列表 |
| TODO 文件 (`$DOC_TODO`) | 按需 | 待办事项 |
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

## P2 范围推荐（弹道级·替换 v3.x 多 bug 分诊）

> 🎯 **本节是 v4.0 的核心改动**。不再做"全量分诊排序后逐个修"，改为"AI 推荐单弹道范围，其余进 TODO"。

### 2.1 AI 推荐范围

列出用户报告的所有 bug，AI 推荐**本弹道修哪个/哪些**：

```
推荐规则：
- 默认推荐 1 个 bug
- 当且仅当 AI 判断 2 个 bug 共享同一根因时，可推荐 1-2 个
- 共因判断标准：
  ✓ 修同一组文件
  ✓ 改同一个函数/数据结构
  ✓ 同一个上游依赖（如同一个 API 端点失效）
- 不共因的"看起来类似" → 拆开走多个弹道
```

### 2.2 AskUserQuestion 确认

```
🎯 弹道范围推荐

你报告了 N 个问题。我推荐本弹道修：

  ✅ 本弹道：[Bug A]
     理由：影响阻塞核心流程，且独立可定位
     （或：Bug A + Bug C，因为共因 = ChannelsView.tsx 的 source 字段处理）

  📋 推迟到 TODO（下一弹道或下次会话再说）：
     - Bug B: [症状]
     - Bug D: [症状]
     - 新需求 N1: [描述]（这是新功能，建议走 /forge-prd）

我会把推迟的写入 $DOC_TODO。

A) 同意推荐 — 进入 P3 创建 worktree
B) 调整范围 — 改修 [其他 bug]
C) 我想多修一些 — 但这违反单弹道原则，请说明理由
```

### 2.3 写入 TODO

用户确认后，把推迟的 bug/需求追加到 `$DOC_TODO`：

```markdown
## 来自 forge-bugfix（{日期}）

- [ ] BF-{MMDD}-X: [症状] — {一句话}（推迟自 {会话日期}）
- [ ] 新需求 N1: [描述] — 建议 /forge-prd 立项
```

### 2.4 Bug 编号

确认范围时为本弹道分配编号：`BF-{MMDD}-{N}`（N = 当日已用编号 +1）。这个编号将用于 worktree 命名、commit message、bugfix 文档条目。

---

## P3 创建 worktree + 复现（弹道级）

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

**v4.0 强制步骤**。历史踩坑：worktree 内启动的服务和主仓库抢同一端口，curl/前端打到旧代码上，调试 30+ 分钟。

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
#     本弹道启动服务会走端口冲突。建议：
#     A) kill 该进程后启动本弹道服务（推荐）
#     B) 本弹道服务用其他端口（如 +10）
#     C) 本弹道不启服务，直接读代码 + 单元测试"
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

## P4 根因追踪 + 假设验证 + 方案确认（弹道级）

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
D) 弃用本弹道 — git worktree remove，开新会话用精炼描述重启
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

## P5 worktree 内最小修复 + 原子提交（弹道级）

### 5.1 修复原则

- **修根因不修症状** — 最小变更，消除实际问题
- **最少文件、最少行数** — 抵制"顺手重构"
- **只修本弹道范围内的 bug，不加功能**

### 5.2 ⚠️ 修复中的范围守门（Scope Guard）

**修复过程中识别到以下信号 → 立即停下，写入 TODO，不在本弹道处理：**

| 信号 | 处理 |
|------|------|
| 用户说"顺便加..."、"另外..."、"延伸需求"、"我希望..."、"如果能..." | 写入 `$DOC_TODO`，告知用户"已记录，本弹道不做" |
| 验收反馈中描述了当前功能不存在的行为 | 同上 |
| AI 自己想到"顺手重构"、"加 lint"、"优化下" | 写入 `$DOC_TODO`，标"待评估" |
| 修复中发现新 bug | 写入 `$DOC_TODO`，告知用户"是否本会话开新弹道修，还是下次"|

新 bug 的处理（v4.0 默认行为）：

```
通过 AskUserQuestion：

🆕 修 {当前 BUG_ID} 时发现新 bug：
   [新 bug 症状]

我已记到 $DOC_TODO（候选编号 BF-{MMDD}-{N+1}）。

A) 完成当前弹道后，本会话起新弹道修（推荐 — 你今天有时间）
B) 留到下次会话修
C) 这是当前 bug 的一部分（很罕见，请说明为什么共因）
```

### 5.3 爆炸半径控制

修复涉及 >5 个文件 → AskUserQuestion：

```
本弹道修复涉及 N 个文件，超出"最小修复"预期。

A) 继续 — 根因确实跨这些文件
B) 拆分 — 先修关键路径，其余开新弹道
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

## P6 动态 QA（弹道级·v4.0 重写）

> **不做固定流程的 QA**。AI 根据 bug 类型评估**本次需要跑的 QA 范围**，向用户报备，用户可否决/扩缩。

### 6.1 AI 评估 QA 范围

参考下表选择默认范围：

| Bug 类型 | 默认 QA 范围 |
|---|---|
| 纯前端样式/文案 | 截图（before vs after）+ browse 视觉断言 |
| 业务逻辑/数据流 | 单点验证 + 1-2 个相关回归测试 |
| 跨模块/共享状态 | 单点验证 + 全套测试 |
| 抓取/外部依赖 | 端到端验证（curl + DB 查询）|
| 配置/环境 | 重启服务 + curl health endpoint |
| 性能/竞态 | 并发触发 + 多次复现确认 |

### 6.2 向用户报备

```
🧪 QA 范围建议（{BUG_ID}）

Bug 类型：[业务逻辑/数据流]

建议跑：
  1. 单点验证：用 P3 同引擎重新复现，确认已修
  2. 回归测试：跑 tests/feed.test.ts（与本次改动直接相关）
  3. ⏭ 跳过全套测试（理由：改动只在 feedStore 一个文件，全套测试 5min+ 性价比低）

A) 按建议跑（推荐）
B) 加跑全套测试
C) 只跑单点（更轻）
```

### 6.3 执行 QA

#### 单点验证（必跑）

用 P3 复现时使用的相同引擎，重复 bug 触发步骤，确认已修。

```bash
$BROWSE goto $APP_URL/path
$BROWSE click @e5
$BROWSE snapshot -D
$BROWSE console --errors
$BROWSE screenshot $REPORT_DIR/screenshots/${BUG_ID}-after.png
```

⚠️ **断言原则**（避免虚假 PASS）：
- 必须基于"用户视角可见的内容变化"（标题文本、可见卡片、截图内容）
- 不得单独用"技术指标"（HTTP 200 数量 / DOM 节点存在 / 数组长度）
- 必须用进程身份核对：`ps aux | grep <服务>` + `lsof -p $PID | grep cwd`

#### 回归测试（按 QA 范围）

```bash
npm test -- --grep "related" 2>/dev/null
python3 -m pytest -k "related" -v 2>/dev/null
```

测试失败 → 修一次 → 仍失败 → AskUserQuestion 是否升级。

#### 截图对比

用 Read 工具展示 `${BUG_ID}-before.png` 和 `${BUG_ID}-after.png`，让用户直观确认。

### 6.4 QA 报告

```
QA 报告（{BUG_ID}）
════════════════════════════════════════
QA 范围：     [按 6.2 选定]
单点验证：    ✅ / ❌
回归测试：    ✅ N pass / ❌ N fail
截图对比：    [before/after 路径]
进程身份核对：✅ PID/cwd 一致
════════════════════════════════════════
状态：完成 | 完成但有顾虑 | 阻塞
```

---

## P7 worktree 合并决策（弹道级·v4.0 新增·必须问用户）

> **本步是 v4.0 的硬约束。修完不自动合并。**

### 7.1 AskUserQuestion 决策

```
🎯 worktree 合并决策（{BUG_ID}）

worktree: .worktrees/bf-{MMDD}-N
分支:     bugfix/bf-{MMDD}-N
本弹道:   N commits
QA 状态:  ✅ 通过 / ⚠️ 有顾虑

A) 合并到主分支 — 我会执行：
   git checkout main
   git merge --no-ff bugfix/bf-{MMDD}-N
   git push
   git worktree remove .worktrees/bf-{MMDD}-N
   git branch -d bugfix/bf-{MMDD}-N

B) 暂存不合并 — 保留 worktree 和分支待你后续决定
   （适用于：想先在 worktree 里再观察、想攒几个 worktree 一起 review/ship）

C) 弃用本弹道 — 修复有问题，丢掉重来
   git worktree remove .worktrees/bf-{MMDD}-N --force
   git branch -D bugfix/bf-{MMDD}-N
   （worktree 删除前我会列出未提交的改动，避免误删）

D) 推迟决定 — 本弹道暂停，先做别的
```

### 7.2 选 A（合并）的执行步骤

```bash
cd "$_ROOT"  # 回到主仓库
git checkout main  # 或当前主分支
git pull --ff-only  # 同步远端
git merge --no-ff "bugfix/$WT_NAME" -m "Merge bugfix/$WT_NAME ($BUG_ID)"
git push
git worktree remove "$WT_PATH"
git branch -d "$WT_BRANCH"
echo "✅ 已合并并清理"
```

如果 `git pull` 拉到了新的 commits → 先 rebase worktree 分支：

```bash
cd "$WT_PATH"
git rebase main
# 解决冲突后再回主仓库执行 merge
```

### 7.3 选 B（暂存）的提示

```
✅ 已暂存 worktree（.worktrees/bf-{MMDD}-N）
  下次想合并：在主仓库跑 git merge bugfix/bf-{MMDD}-N
  下次想弃用：git worktree remove .worktrees/bf-{MMDD}-N
  查看所有暂存：git worktree list
```

### 7.4 选 C（弃用）的安全检查

```bash
cd "$WT_PATH"
git status --porcelain  # 列出未提交改动
git log --oneline main.."$WT_BRANCH"  # 列出本弹道的 commits
# 如果有未提交改动或 commits 用户不知情 → 二次确认
```

---

## P8 沉淀（弹道级·精简版）

### 8.1 写入 bugfix 文档

追加到 `docs/bugfix/{当日日期}.md`：

```markdown
### {BUG_ID}: {一句话标题}

- **状态**: ✅ 已修复 / ⚠️ 待验收 / ❌ 阻塞
- **类型**: {数据流断裂 / 前后端不一致 / 状态同步 / 配置漂移 / 工具链 / UI 渲染 / 兄弟路径遗漏 / 进程身份}
- **现象**: {用户看到了什么}
- **5 Whys 链**:
  1. 为什么 → 因为
  2. 为什么 → 因为
  ✅ 根因：{一句话}
- **修复**: {做了什么}
- **改动文件**: {列表}
- **worktree**: `.worktrees/bf-{MMDD}-N`（已合并 / 暂存 / 已弃用）
- **QA 范围**: {按 P6.2 选定的范围} → {通过/失败}
- **验收方式**: {用户如何验证}
- **衍生 TODO**: {本弹道分流到 TODO 的项，链接到 $DOC_TODO}
```

### 8.2 写入 Memory（仅当真的有跨会话价值）

判断标准（严格）：

| 值得 | 不值得 |
|---|---|
| 通用踩坑模式（如"过滤后计数必须联动"）| 具体代码改动细节 |
| 新的调试方法论（如"先查进程 cwd"）| 一次性配置修复 |
| 工具使用技巧 | 特定 bug 的症状描述 |

值得 → 写入 `~/.claude/projects/.../memory/feedback_{name}.md`，并在 MEMORY.md 加索引。

> ⚠️ **不要批量写 memory**。v3.x 的"修完就沉淀"导致 memory 膨胀且重复。v4.0 默认**不写**，除非你能说出"这条 memory 在下次会话会触发什么具体行为"。

### 8.3 ❌ 已删除：v3.x 的 P5.5 同类模式扫描

> 同类模式扫描（grep 全代码库找同类 bug）属于"主动出击找新 bug"，**不是当前弹道的范围**。挪到 `/forge-review`。

---

## 出口：建议下一步（v4.0 新增）

弹道完成（P8 写完）后，AskUserQuestion：

```
✅ 本弹道完成（{BUG_ID}）

📊 当前会话状态：
  - 已完成弹道：N 个（{BUG_ID 列表}）
  - 暂存的 worktree：M 个（git worktree list）
  - TODO 中待修：K 个

下一步建议（按场景推荐）：

A) 还想继续修一发 → 回 P2 启动下一弹道
   （我会从 TODO 推荐下一个，不重读 P0/P1）

B) 暂停修 bug，审查已合并的代码 → /forge-review
   （检查 SQL 安全/竞态条件/枚举完整性等结构性问题）

C) 已合并的 commits 想发布 → /forge-ship
   （更新 CHANGELOG + push + 创建 PR）

D) 想沉淀本会话经验 → /forge-fupan
   （提取知识、诊断 AI/用户协作模式、写复盘文档）

E) 关闭会话 — 没事了

如果有暂存的 worktree（B 选项），建议在 review/ship 前先决定它们的去留。
```

---

## AskUserQuestion 格式规范

每次提问结构：
1. **重新聚焦**：当前项目、分支、正在调查的 BUG_ID
2. **通俗解释**：高中生能懂的语言
3. **给出建议**：推荐选项 + 理由
4. **列出选项**：`A) B) C)`

---

## 重要规则（v4.0 全量）

### 单弹道纪律（v4.0 核心）

1. **每发只修 1 bug，或 1-2 经 P4.5 确认共因的 bug**。其余进 TODO。
2. **每发一个 worktree**，命名 `.worktrees/bf-{MMDD}-{N}`。
3. **修完不自动合并**。必须经 P7 用户确认（合并/暂存/弃用）。
4. **新发现的 bug → TODO**。要修就开新弹道（用户授权后），绝不在当前弹道夹带。
5. **新需求/新功能 → TODO + 建议走 /forge-prd**。永远不在 bugfix 内做。
6. **会话出口必须建议下一步**（review / ship / fupan）。

### 调查纪律

7. **铁律：不做根因分析就不写修复代码。**
8. **强制读 PRD + ENGINEERING.md + Bugfix 历史**（会话级一次）。
9. **根因必须用 5 Whys 因果链向用户解释，用户确认方案后才动手。**
10. **3 次假设失败 → 停下来质疑架构（或弃用本弹道开新会话）。**
11. **绝不说"这应该能修好"**。验证它，证明它。
12. **修复涉及 >5 个文件 → 必须确认。**
13. **无法复现就不要修。**

### worktree 纪律

14. **worktree 创建前必须做端口冲突预检**（避免历史踩坑）。
15. **worktree 内启动服务 → 必须核对进程 cwd**（`lsof -p $PID | grep cwd`）。
16. **worktree 弃用前列出未提交改动**，避免误删。
17. **多弹道并发允许，但每发独立 worktree + 独立端口**。

### QA 纪律

18. **QA 范围由 AI 动态评估**，向用户报备，用户可否决。
19. **QA 断言必须基于"用户视角可见的内容"**，不得单独用技术指标。
20. **截图留证**（修复前后）。
21. **临时 `[DEBUG H` 日志必须清理。**

### 沉淀纪律

22. **每个修复原子提交**。一个 BUG_ID，一个 commit（或一个 commit 组）。
23. **bugfix 文档必填字段**：5 Whys + Bug 类型 + worktree 状态 + QA 范围。
24. **Memory 默认不写**。除非能说出"这条会触发未来什么具体行为"。

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
