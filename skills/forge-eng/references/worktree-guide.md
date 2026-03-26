# Git Worktree 指南：会话级代码隔离

本文档是 do-eng Worktree 操作的详细参考。核心原则：不在主工作目录写代码，
创建隔离副本，开发完成后合并回去。

## 为什么用 Worktree

| 问题 | Worktree 怎么解决 |
|------|------------------|
| 多个会话同时改代码产生冲突 | 每个会话有独立的 worktree，互不影响 |
| 实验性改动破坏主分支 | worktree 在隔离分支上，主分支始终干净 |
| 需要回退到干净状态 | 直接 discard worktree，主分支不受影响 |
| git stash 管理混乱 | 不需要 stash，每个 worktree 有自己的工作区 |

## 创建流程

### 1. 检查现有 Worktree 目录

```bash
# 按优先级检查
ls -d .worktrees 2>/dev/null     # 首选（隐藏目录）
ls -d worktrees 2>/dev/null      # 备选
```

如果都不存在 → 创建 `.worktrees/`

### 2. 安全检查：确认 .gitignore

```bash
git check-ignore -q .worktrees 2>/dev/null
```

如果**未被忽略** → 立即修复：
```bash
echo ".worktrees/" >> .gitignore
git add .gitignore
git commit -m "chore: add .worktrees to gitignore"
```

**为什么关键**：防止 worktree 内容被意外提交到仓库。

### 3. 生成分支名

格式：`eng/{feature-slug}-{YYYY-MM-DD}`

```bash
# 示例
BRANCH="eng/search-optimize-2026-03-26"
WORKTREE_PATH=".worktrees/search-optimize"
```

分支名规则：
- 前缀 `eng/` 标识工程分支
- feature-slug 从任务描述中提取（小写、连字符分隔）
- 日期后缀避免名称冲突

### 4. 创建 Worktree

```bash
git worktree add "$WORKTREE_PATH" -b "$BRANCH"
cd "$WORKTREE_PATH"
```

### 5. 项目环境初始化

自动检测项目类型并安装依赖：

```bash
# Node.js
[ -f package.json ] && npm install

# Python
[ -f requirements.txt ] && pip install -r requirements.txt
[ -f pyproject.toml ] && pip install -e .

# Go
[ -f go.mod ] && go mod download

# Rust
[ -f Cargo.toml ] && cargo build
```

### 6. 基线测试

```bash
# 运行项目测试（如果有测试框架）
npm test 2>/dev/null || python -m pytest 2>/dev/null || go test ./... 2>/dev/null
```

| 结果 | 操作 |
|------|------|
| 测试通过 | 报告就绪，继续开发 |
| 测试失败 | 报告失败数量和原因，询问是否继续 |
| 无测试框架 | 跳过基线测试，报告"无测试框架" |

### 7. 报告就绪

```
Worktree 就绪：
  路径：{full-path}
  分支：{branch-name}
  基线测试：{通过 N 个 / 无测试框架}
  准备开始实现 {feature-name}
```

## 开发阶段

所有 Wave 执行都在 worktree 目录中进行：

```bash
cd "$WORKTREE_PATH"
# Wave 1, 2, 3... 都在这里
# 每个原子 commit 都在这个分支上
```

## 分支收尾

### 选项 1：合并回主分支

```bash
# 回到主工作目录
cd "$(git worktree list | head -1 | awk '{print $1}')"

# 切到主分支
git checkout main  # 或 master

# 拉取最新
git pull

# 合并 feature 分支
git merge "$BRANCH"

# 验证合并后测试
npm test 2>/dev/null || python -m pytest 2>/dev/null

# 合并成功 → 清理
git branch -d "$BRANCH"
git worktree remove "$WORKTREE_PATH"
```

### 选项 2：推送并创建 PR

```bash
git push -u origin "$BRANCH"

gh pr create --title "eng: {feature-name}" --body "$(cat <<'EOF'
## Summary
- {变更摘要}

## Test Plan
- [ ] {验证步骤}
EOF
)"

# PR 创建后清理 worktree（分支保留在远端）
git worktree remove "$WORKTREE_PATH"
```

### 选项 3：保留分支

不做任何清理。报告：
```
保留分支 {branch-name}
Worktree 路径：{path}
后续可以继续开发或手动处理
```

### 选项 4：丢弃

**必须二次确认**：
```
⚠️ 这将永久删除：
  - 分支 {branch-name}
  - 所有提交：{commit-list}
  - Worktree 路径：{path}

确认丢弃？(是/否)
```

确认后：
```bash
cd "$(git worktree list | head -1 | awk '{print $1}')"
git worktree remove "$WORKTREE_PATH" --force
git branch -D "$BRANCH"
```

## 快速参考

| 操作 | 命令 |
|------|------|
| 列出所有 worktree | `git worktree list` |
| 创建 worktree | `git worktree add <path> -b <branch>` |
| 删除 worktree | `git worktree remove <path>` |
| 强制删除 | `git worktree remove <path> --force` |
| 清理无效引用 | `git worktree prune` |

## 常见错误

| 错误 | 原因 | 修复 |
|------|------|------|
| "already checked out" | 分支已被另一个 worktree 使用 | 换一个分支名 |
| worktree 内容出现在 git status | .gitignore 没有包含 worktree 目录 | 添加到 .gitignore |
| 依赖安装失败 | node_modules 不共享 | 每个 worktree 独立 npm install |
| 合并冲突 | 主分支有新提交 | 先 rebase 或解决冲突 |

## 与 .features/ 状态管理的关系

`.features/` 目录在主仓库中，worktree 也能访问（因为共享 .git）。
但建议：
- 状态文件（status.md）在主仓库的 .features/ 中读写
- 代码变更在 worktree 中进行
- Wave 执行时，Agent 的工作目录设为 worktree 路径
