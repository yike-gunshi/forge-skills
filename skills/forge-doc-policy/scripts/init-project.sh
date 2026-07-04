#!/bin/bash
# forge-doc-policy · init-project.sh — 新项目 day 0 一键脚手架
# 用法：在新项目根目录运行
#   ~/.claude/skills/forge-doc-policy/scripts/init-project.sh [目标目录] [--dry-run]
# 原则：幂等、只创建缺失的文件、绝不覆盖已有内容。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd -P)"
POLICY_DIR="$(dirname "$SCRIPT_DIR")"
SKILLS_DIR="$(dirname "$POLICY_DIR")"

ROOT="$(pwd)"
DRY=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY=1 ;;
    *) ROOT="$arg" ;;
  esac
done
ROOT="$(cd "$ROOT" && pwd)"
TODAY="$(date +%Y-%m-%d)"
PROJECT_NAME="$(basename "$ROOT")"

created=0
skipped=0

log_add()  { echo "  add  $1"; created=$((created+1)); }
log_skip() { echo "  skip $1（已存在）"; skipped=$((skipped+1)); }

ensure_dir() {
  if [ -d "$ROOT/$1" ]; then log_skip "$1/"; else
    [ "$DRY" -eq 0 ] && mkdir -p "$ROOT/$1"
    log_add "$1/"
  fi
}

ensure_file() {
  # $1=相对路径  stdin=内容
  if [ -f "$ROOT/$1" ]; then log_skip "$1"; cat > /dev/null; else
    if [ "$DRY" -eq 0 ]; then cat > "$ROOT/$1"; else cat > /dev/null; fi
    log_add "$1"
  fi
}

echo "Forge 项目脚手架：$ROOT"
[ "$DRY" -eq 1 ] && echo "（dry-run 模式，不写入任何文件）"
echo ""

# ── 1. 目录骨架 ──────────────────────────────────────────
ensure_dir "docs"
ensure_dir "docs/modules"
ensure_dir "docs/bugfix/reviews"
ensure_dir "docs/archive/raw/bugfix-reviews"
ensure_dir ".features"

# ── 2. docs/README.md（唯一文档入口）─────────────────────
ensure_file "docs/README.md" <<EOF
---
status: live
type: guide
module: global
last_updated: $TODAY
---

# $PROJECT_NAME 文档入口

| 文档 | 用途 |
|---|---|
| [INDEX.md](INDEX.md) | 当前 live 文档索引 |
| PRD.md | 产品当前真相源（由 /forge-prd 创建） |
| DESIGN.md | 设计当前真相源（由 /forge-design 创建，前端项目） |
| ENGINEERING.md | 工程当前真相源（由 /forge-eng 创建） |
| QA.md | 当前验收手册（由 /forge-qa 创建） |
| [bugfix/backlog.md](bugfix/backlog.md) | Bug 任务池 |

> 文档落地规则见 \`~/.claude/skills/forge-doc-policy/doc-paths.md\`。
EOF

# ── 3. docs/INDEX.md ─────────────────────────────────────
ensure_file "docs/INDEX.md" <<EOF
---
status: live
type: reference
module: global
last_updated: $TODAY
---

# 当前 live 文档索引

| 文档 | type | module | 最后更新 |
|---|---|---|---|
| docs/README.md | guide | global | $TODAY |
EOF

# ── 4. .features/_registry.md ────────────────────────────
ensure_file ".features/_registry.md" <<EOF
# Feature 注册表

| feature-id | prd | design | eng | qa | 最后心跳 |
|---|---|---|---|---|---|
EOF

# ── 5. docs/bugfix/backlog.md（复用 forge-bugfix 模板）────
if [ -f "$ROOT/docs/bugfix/backlog.md" ]; then
  log_skip "docs/bugfix/backlog.md"
elif [ -f "$SKILLS_DIR/forge-bugfix/templates/backlog.md" ]; then
  [ "$DRY" -eq 0 ] && cp "$SKILLS_DIR/forge-bugfix/templates/backlog.md" "$ROOT/docs/bugfix/backlog.md"
  log_add "docs/bugfix/backlog.md（来自 forge-bugfix 模板）"
else
  echo "  warn backlog 模板未找到：$SKILLS_DIR/forge-bugfix/templates/backlog.md"
fi

# ── 6. 项目 CLAUDE.md ────────────────────────────────────
if [ -f "$ROOT/CLAUDE.md" ]; then
  log_skip "CLAUDE.md"
  echo "       如需接入 Forge，请追加引用段（见 $POLICY_DIR/claude-md-snippet.md 的项目级片段）"
else
  ensure_file "CLAUDE.md" <<EOF
# $PROJECT_NAME 项目指引

> 索引层文件，只保留必要入口和硬约束。

## 走 Forge 体系

功能、Bug、发布类工作优先走 Forge skill；阶段不明确时先用 \`/forge\` 判断。
完整规则以各 skill 为唯一出处（\`~/.claude/skills/forge-*/SKILL.md\`）。

- 需求不清楚：\`/forge-brainstorm\` → 需求定义：\`/forge-prd\`
- 实现：\`/forge-eng\`（小改动用轻量模式） → 验收：\`/forge-qa\`
- Bug：\`/forge-bugfix\` → 审查发布：\`/forge-review\` + \`/forge-ship\`

## 文档治理

本项目遵循 forge-doc-policy 规范，完整白名单见
\`~/.claude/skills/forge-doc-policy/doc-paths.md\`。
新建 .md 前先自查白名单，不确定就停下问用户。

## 项目特化规则

（在此追加本项目特有的硬约束）
EOF
fi

# ── 7. .gitignore 追加 ───────────────────────────────────
GITIGNORE_BLOCK="# forge 状态与产物
.DS_Store
__pycache__/
.gstack/"
if [ -f "$ROOT/.gitignore" ] && grep -q "^\.gstack/" "$ROOT/.gitignore"; then
  log_skip ".gitignore（forge 规则已存在）"
else
  if [ "$DRY" -eq 0 ]; then printf "\n%s\n" "$GITIGNORE_BLOCK" >> "$ROOT/.gitignore"; fi
  log_add ".gitignore（追加 forge 规则）"
fi

# ── 汇总 ─────────────────────────────────────────────────
echo ""
echo "完成：新建 $created 项，跳过 $skipped 项（已存在的一律不动）。"
echo ""
echo "下一步："
echo "  1. 新开 Claude Code 会话，运行 /forge 查看状态推荐"
echo "  2. 用 /forge-prd 创建 PRD 和第一个 Feature Spec"
echo "  3. 小工具项目可直接 /forge-eng 轻量模式动手"
