# forge-fupan · 会话日志探测与 Token 统计（深度分析用）

> 由 SKILL.md 骨架按需加载：只在需要基于原始会话 JSONL 做逐条深度分析时使用。
> v2 默认流程不依赖本文件——教训提取以当前上下文和用户确认为准。

## 前置脚本（每次先运行）

```bash
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "当前分支: $_BRANCH"
echo "项目根目录: $_ROOT"

# === Git 卫生检查 ===
git fetch --quiet 2>/dev/null
_AHEAD=$(git rev-list @{u}..HEAD --count 2>/dev/null || echo "?")
_BEHIND=$(git rev-list HEAD..@{u} --count 2>/dev/null || echo "?")
echo "远程同步: 领先 $_AHEAD / 落后 $_BEHIND"
if [ "$_BEHIND" != "?" ] && [ "$_BEHIND" -gt 0 ]; then
  echo "⚠️ 落后远程 $_BEHIND 个提交，自动 rebase..."
  _HAS_CHANGES=$(git status --porcelain 2>/dev/null | head -1)
  [ -n "$_HAS_CHANGES" ] && git stash --quiet 2>/dev/null && _STASHED=1 || _STASHED=0
  git pull --rebase --quiet 2>/dev/null && echo "✅ 已同步远程" || echo "❌ rebase 失败，请手动处理"
  [ "$_STASHED" = "1" ] && git stash pop --quiet 2>/dev/null
fi
_DIRTY=$(git status --porcelain 2>/dev/null | head -5)
[ -n "$_DIRTY" ] && echo "⚠️ 工作区有未提交改动"

# === 项目上下文收集 ===
_RECENT_COMMITS=$(git log --oneline -20 2>/dev/null)
_DIFF_STAT=$(git diff --stat HEAD~10..HEAD 2>/dev/null)
_PROJECT_DOCS=$(ls docs/*.md 2>/dev/null)
echo "--- 最近提交 ---"
echo "$_RECENT_COMMITS"
echo "--- 变更统计 ---"
echo "$_DIFF_STAT"
echo "--- 项目文档 ---"
echo "$_PROJECT_DOCS"

# === 会话日志定位（Claude Code / Codex）===
_SESSION_SOURCE="unknown"
_JSONL_FILE=""
_CLAUDE_PROJECT_DIR="$HOME/.claude/projects"
_CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
_PARSE_TOKENS="$HOME/.claude/skills/forge-fupan/parse_tokens.py"
[ -f "$_PARSE_TOKENS" ] || _PARSE_TOKENS=$(find ~ -maxdepth 6 -path '*/forge-fupan/parse_tokens.py' -type f 2>/dev/null | head -1)

_latest_jsonl() {
  _name_pattern="$1"
  shift
  find "$@" -type f -name "$_name_pattern" -print 2>/dev/null | while IFS= read -r _f; do
    [ -f "$_f" ] || continue
    _mtime=$(stat -f %m "$_f" 2>/dev/null || stat -c %Y "$_f" 2>/dev/null || echo 0)
    printf "%s\t%s\n" "$_mtime" "$_f"
  done | sort -rn | head -1 | cut -f2-
}

if [ -n "${CODEX_THREAD_ID:-}" ] && [ -d "$_CODEX_HOME" ]; then
  _JSONL_FILE=$(_latest_jsonl "*${CODEX_THREAD_ID}*.jsonl" "$_CODEX_HOME/sessions" "$_CODEX_HOME/archived_sessions")
  [ -n "$_JSONL_FILE" ] && _SESSION_SOURCE="codex"
fi
if [ -z "$_JSONL_FILE" ] && [ -n "${CODEX_THREAD_ID:-}" ] && [ -d "$_CODEX_HOME" ]; then
  _JSONL_FILE=$(_latest_jsonl "*.jsonl" "$_CODEX_HOME/sessions" "$_CODEX_HOME/archived_sessions")
  [ -n "$_JSONL_FILE" ] && _SESSION_SOURCE="codex"
fi
if [ -z "$_JSONL_FILE" ] && [ -d "$_CLAUDE_PROJECT_DIR" ]; then
  _JSONL_FILE=$(_latest_jsonl "*.jsonl" "$_CLAUDE_PROJECT_DIR")
  [ -n "$_JSONL_FILE" ] && _SESSION_SOURCE="claude"
fi
if [ -z "$_JSONL_FILE" ] && [ -z "${CODEX_THREAD_ID:-}" ] && [ -d "$_CODEX_HOME" ]; then
  _JSONL_FILE=$(_latest_jsonl "*.jsonl" "$_CODEX_HOME/sessions" "$_CODEX_HOME/archived_sessions")
  [ -n "$_JSONL_FILE" ] && _SESSION_SOURCE="codex"
fi

echo "--- 会话日志 ---"
echo "会话来源: $_SESSION_SOURCE"
echo "会话日志: ${_JSONL_FILE:-未找到}"

if [ -n "$_JSONL_FILE" ]; then
  echo "--- Token 统计 ---"
  if [ -n "$_PARSE_TOKENS" ]; then
    python3 "$_PARSE_TOKENS" "$_JSONL_FILE" 2>/dev/null || echo "⚠️ Token 解析失败，将使用轮次估算"
  else
    echo "⚠️ parse_tokens.py 未找到，将使用轮次估算"
  fi
fi

if [ -n "$_JSONL_FILE" ]; then
  echo "--- 原始会话可用性 ---"
  python3 - "$_JSONL_FILE" "$_SESSION_SOURCE" <<'PY' 2>/dev/null || echo "⚠️ 原始会话检查失败，将按摘要降级判断"
import json
import sys

path = sys.argv[1]
source = sys.argv[2]
counts = {"user": 0, "agent": 0, "tool": 0, "compacted": 0}

with open(path, encoding="utf-8") as f:
    for line in f:
        try:
            data = json.loads(line)
        except Exception:
            continue

        payload = data.get("payload") or {}
        top_type = data.get("type")
        payload_type = payload.get("type") if isinstance(payload, dict) else None

        if top_type == "compacted" or payload_type == "context_compacted":
            counts["compacted"] += 1

        if source == "codex":
            if top_type == "event_msg" and payload_type == "user_message":
                counts["user"] += 1
            elif top_type == "event_msg" and payload_type == "agent_message":
                counts["agent"] += 1
            elif top_type == "event_msg" and payload_type in {"exec_command_end", "patch_apply_end"}:
                counts["tool"] += 1
        else:
            msg = data.get("message") or data.get("data", {}).get("message") or {}
            role = msg.get("role")
            if role == "user":
                counts["user"] += 1
            elif role == "assistant":
                counts["agent"] += 1
            if data.get("type") in {"tool_result", "tool_use"}:
                counts["tool"] += 1

if counts["user"] > 0 and counts["agent"] > 0:
    status = "FULL_LOG_AVAILABLE"
elif counts["user"] > 0:
    status = "PARTIAL_LOG_AVAILABLE"
else:
    status = "SUMMARY_ONLY_OR_MISSING"

print(f"原始消息: user={counts['user']} agent={counts['agent']} tool={counts['tool']} compacted={counts['compacted']}")
print(f"复盘可用性: {status}")
PY
fi

# === 同会话迭代检测 ===
_FUPAN_DIR="$HOME/claudecode_workspace/记录/复盘"
if [ -n "$_JSONL_FILE" ]; then
  _SESSION_ID=$(basename "$_JSONL_FILE")
  _EXISTING_FUPAN=$(grep -rl "session: $_SESSION_ID" "$_FUPAN_DIR" 2>/dev/null | head -1)
  if [ -n "$_EXISTING_FUPAN" ]; then
    echo "⚠️ 检测到同会话已有复盘: $_EXISTING_FUPAN"
    echo "将迭代更新该文档，而非新建"
  fi
fi
```

Token 数据只作为内部判断材料，不在复盘正文输出“精力分布”“会话脉络”或仪表盘。

会话日志来源说明：
- Claude Code 日志通常位于 `~/.claude/projects/**/*.jsonl`，消息 usage 在 `message.usage`。
- Codex Desktop 当前会话通常位于 `~/.codex/sessions/YYYY/MM/DD/rollout-...{CODEX_THREAD_ID}.jsonl`，归档会话可能位于 `~/.codex/archived_sessions/rollout-*.jsonl`。
- Codex JSONL 属于本地会话记录格式，不假定其结构长期稳定；解析时必须按 `event_msg.token_count` 等可识别字段防御式读取，缺字段时降级而不是中断复盘。

上下文压缩后的复盘策略：
- **最佳**：压缩前复盘。当前模型上下文和本地 JSONL 都可用，正常执行完整复盘。
- **可接受**：已经压缩，但前置脚本输出 `FULL_LOG_AVAILABLE` 或 `PARTIAL_LOG_AVAILABLE`。说明本地 JSONL 仍保留原始消息，可从 JSONL 恢复逐条 Prompt 分析和行为序列分析。
- **降级**：找不到 JSONL，或前置脚本输出 `SUMMARY_ONLY_OR_MISSING`。只能做轻量复盘：不做逐条 Prompt 分析，不对行为序列做强判断；只基于当前摘要、文件 diff、工具结果和用户补充反馈提炼知识点、AI 表现风险和下次 SOP。

---

