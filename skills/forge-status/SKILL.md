---
name: forge-status
description: |
  查看并清理 .forge/active.md 里登记的并行会话记录。扫描所有"进行中"条目，
  基于硬信号（worktree 目录是否存在、分支是否已合并到 main）判断哪些是僵尸记录，
  列清单 → 用户一次 y/n 确认 → 批量清理。
  不使用时间戳、不使用启发式"超过 N 小时算失联"，完全依赖 git / 文件系统现实状态。
  触发方式：用户说"forge 状态"、"看下谁在跑"、"清理 worktree"、"forge-status"、
  新会话启动 forge-bugfix / forge-prd / forge-eng 时 P0 阶段主动调用（只读模式）。
allowed-tools:
  - Bash
  - Read
  - Edit
  - AskUserQuestion
---

# /forge-status：并行会话巡检 + 清理

## 设计哲学

**只读扫描 + 一次确认 + 硬信号判定。**

- 多会话并行的心跳文件是 `.forge/active.md`，由 forge-bugfix / forge-prd / forge-eng 在领取任务时追加、由 forge-fupan 在会话结束时清理
- 但人会漏复盘、会话会崩掉、worktree 可能被手动删，导致 active.md 里残留"僵尸"记录
- 本 skill 专治僵尸：扫一遍表 → 按硬信号判活/死 → 让你确认后清理

**硬信号（僵尸判定）**：
- 对应 worktree 目录不存在 → 真·已弃用或已清理
- 对应分支已 `merged` 到 main/master → 真·已完成，只是漏清理
- 以上两个都不满足 → 真·活跃，保留

**明确不用的信号**：
- ❌ 时间戳 / "超过 N 小时" / "启动超过 N 天"——这些不代表工作完成
- ❌ 最近 commit 时间——AI 慢不等于僵尸
- ❌ 进程存活检查——Claude Code 会话结束后进程就没了，不代表工作废弃

**Dev server 附加巡检（不参与僵尸判定）**：
- 可以报告 `.devserver.json`、tmux session、监听端口、PID、cwd，帮助用户发现多余前后端
- 这些信息只用于"有哪些服务在跑"的可见性，不用于判定 `.forge/active.md` 的会话是否僵尸
- 如需停止服务，优先提示用户在对应 worktree 内运行项目自己的 `npm run dev:stop` / `scripts/dev-stack.sh stop`

## 两种调用模式

| 模式 | 调用方 | 行为 |
|---|---|---|
| **交互清理**（默认）| 用户说 `/forge-status` / "看下 forge 状态" / "清理 worktree" | 扫 → 报告 → 问 y/n → 清理 |
| **只读巡检** | forge-bugfix / forge-prd / forge-eng 的 P0 阶段自动调用 | 扫 → 只报告"当前有 N 个活跃会话，其中 M 个疑似僵尸"，不清理 |

调用方通过自然语言区分：
- 用户直接触发 → 走交互清理
- 其他 skill 委托 → 在调用文本中说"只读巡检，不要清理"

## 流程

### 步骤 0：前置定位

```bash
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
ACTIVE="$_ROOT/.forge/active.md"

if [ ! -f "$ACTIVE" ]; then
  echo "（本项目暂无 .forge/active.md，说明还没用过并行化流程）"
  exit 0
fi
```

### 步骤 1：解析 active.md

读 `.forge/active.md` 的"进行中会话"节，按行解析字段：
```
- session: <id> / worktree: <path> / 任务: <id> / 域: <domains>
```

跳过注释行（`<!--`、`-->`）和空行。

### 步骤 2：逐条硬信号判定

对每条记录：

```bash
# 1) worktree 是否存在
if [ ! -d "$WT_PATH" ]; then
  verdict="已删除"  # 可清理
  reason="worktree 目录不存在"
  continue
fi

# 2) 分支是否已合并到 main（或 master）
_MAIN_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|^refs/remotes/origin/||' || echo "main")
_WT_BRANCH=$(git -C "$WT_PATH" branch --show-current 2>/dev/null)
if git branch --merged "$_MAIN_BRANCH" 2>/dev/null | grep -qE "^\s*${_WT_BRANCH}$"; then
  verdict="已合并"  # 可清理
  reason="分支 ${_WT_BRANCH} 已合并到 ${_MAIN_BRANCH}"
  continue
fi

# 3) 两个都不满足 → 活跃
verdict="活跃"
reason="worktree 存在 + 分支未合并"
```

### 步骤 3：生成报告

按判定分组输出：

```
📋 .forge/active.md 巡检结果

✅ 活跃（保留）：
  - abc-123 / bf-0419-1 / 域:asr      worktree 存在 + 未合并
  - def-456 / feat-12   / 域:player   worktree 存在 + 未合并

🗑️ 疑似僵尸（建议清理）：
  - ghi-789 / bf-0418-2 / 域:auth     worktree 目录不存在
  - jkl-012 / bf-0419-3 / 域:asr      分支已合并到 main

合计：活跃 2 条 / 待清理 2 条
```

### 步骤 3.5：Dev server 附加巡检

只报告，不清理、不作为 active.md 僵尸判定依据：

```bash
echo "🖥️ Dev server 附加巡检（只读，不参与僵尸判定）"

find "$_ROOT" "$_ROOT/.worktrees" -name .devserver.json -print 2>/dev/null | while read -r f; do
  echo "- devserver: $f"
  cat "$f" 2>/dev/null
done

tmux ls 2>/dev/null | grep -E "dev|frontend|backend|info2action" || true

for port in 3000 3001 3456 3567 3568 3600 5173 8000 8080 8100; do
  PID=$(lsof -ti :"$port" -sTCP:LISTEN 2>/dev/null | head -1)
  if [ -n "$PID" ]; then
    CWD=$(lsof -p "$PID" 2>/dev/null | awk '$4=="cwd"{print $9}')
    echo "- port $port: PID=$PID cwd=$CWD"
  fi
done
```

报告中明确写：

```
说明：上面的 dev server 只说明"有服务在跑"，不说明 active.md 里的任务已完成或已废弃。
```

### 步骤 4：分模式处理

#### 模式 A：交互清理（默认）

用户触发时，通过 AskUserQuestion：

```
发现 2 条疑似僵尸，要清理吗？

A) 全部清理 — 从 .forge/active.md 删除上述 2 条（推荐，硬信号已确认）
B) 我要逐条看 — 一条一条确认
C) 先不清 — 只报告，暂不改文件
```

- A) → 批量 Edit active.md 删除对应行，同步把 backlog.md 里对应 bug 的"领取会话"字段改回 `—`、状态改为 `resolved`（如果分支已合并）或保持 `pending`（如果 worktree 被删除且未合并，视为放弃）
- B) → 逐条 AskUserQuestion 确认
- C) → 不改任何文件

#### 模式 B：只读巡检（被其他 skill 调用）

不 AskUserQuestion，直接输出报告：

```
（被 forge-bugfix P0 调用，只读模式）

当前 .forge/active.md 状态：
- 活跃会话：2
- 疑似僵尸：2（建议用户稍后 /forge-status 清理）

返回供调用方参考。
```

## backlog.md 联动清理

从 `.forge/active.md` 删除一条记录后，如果该任务在 `docs/bugfix/backlog.md` 仍显示 `in-progress`：

- 如果判定为"已合并" → backlog 状态改 `resolved`，剪切到"🗄️ 已处理"对应月份，清空"领取会话"字段
- 如果判定为"已删除"（worktree 不存在且分支未合并）→ backlog 状态改回 `pending`，清空"领取会话"字段（视为本次放弃，下次可重新领取）

## 铁律

1. **不得基于时间戳判定僵尸**。只认 worktree 存在性 + 分支合并状态。
2. **清理前必须让用户确认**（除非处于只读巡检模式）。
3. **批量清理只在用户选 A) 时执行**，模糊回复默认走 B) 逐条确认。
4. **backlog.md 和 active.md 必须联动**，不能只清 active 留 backlog 挂着"领取会话"。
5. **不主动删 worktree 目录或分支**。这是 forge-bugfix P7 的职责，/forge-status 只改文档记录。
6. **Dev server 巡检不得参与僵尸判定**。进程存在不代表任务活跃，进程不存在也不代表任务废弃。

## 典型使用场景

**场景 1：早上打开电脑**
```
用户：/forge-status
AI：扫一遍 → 昨天有 3 个会话，2 个已合并（漏复盘）、1 个还活着 → 问清理 → 清掉 2 条
```

**场景 2：新窗口启动 bugfix**
```
forge-bugfix P0 调用 /forge-status（只读）
→ 报告"当前活跃 2 个会话，域 asr 和 player 已被占用"
→ forge-bugfix 据此在 P2 推荐时规避撞车
```

**场景 3：worktree 手动清理后**
```
用户手动跑了 git worktree remove（没走 P7 流程）
下次 /forge-status 会发现 worktree 目录不存在 → 自动提示清理 active 记录
```
