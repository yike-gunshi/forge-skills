#!/bin/bash
# get-session-id.sh
# 获取当前 Claude Code 会话的 session id。
#
# 原理：
# - Claude Code 在 ~/.claude/sessions/<pid>.json 记录每个会话元数据
# - 从当前 shell 的 $PPID 向上回溯进程树，找到哪个 PID 在 sessions/ 里有对应 json
# - 读出 sessionId 字段
#
# 使用：
#   SID=$(bash skills/forge-bugfix/scripts/get-session-id.sh)
#
# 退出码：
#   0: 成功（stdout 输出 session id）
#   1: 未找到（非 Claude Code 环境、或 PID 追溯失败）

set -euo pipefail

SESSIONS_DIR="$HOME/.claude/sessions"

if [ ! -d "$SESSIONS_DIR" ]; then
  echo "sessions dir not found: $SESSIONS_DIR" >&2
  exit 1
fi

# 从 $PPID 向上回溯进程树
pid="$PPID"
max_depth=20
depth=0

while [ "$pid" != "1" ] && [ "$depth" -lt "$max_depth" ]; do
  candidate="$SESSIONS_DIR/${pid}.json"
  if [ -f "$candidate" ]; then
    # 用 python 解析 JSON（比 jq 更稳，macOS 默认有 python3）
    sid=$(python3 -c "import json,sys; print(json.load(open('$candidate'))['sessionId'])" 2>/dev/null || true)
    if [ -n "$sid" ]; then
      echo "$sid"
      exit 0
    fi
  fi

  # 往上一层
  parent=$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ' || echo "")
  if [ -z "$parent" ] || [ "$parent" = "$pid" ]; then
    break
  fi
  pid="$parent"
  depth=$((depth + 1))
done

# 兜底：取最近修改的 jsonl 文件名（仅当只能估算时）
PROJECT_DIR=$(pwd | sed 's|/|-|g')
JSONL_DIR="$HOME/.claude/projects/${PROJECT_DIR}"
if [ -d "$JSONL_DIR" ]; then
  latest=$(ls -t "$JSONL_DIR"/*.jsonl 2>/dev/null | head -1 || true)
  if [ -n "$latest" ]; then
    basename "$latest" .jsonl
    exit 0
  fi
fi

echo "session id not resolved" >&2
exit 1
