---
name: forge-ship
description: Use when a reviewed feature or fix branch in a worktree needs to be shipped through PR into the remote base branch and, when requested, synchronized back to the local base-branch worktree.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
---

> **文档落地路径**：遵循 forge-doc-policy 规范。完整白名单 + frontmatter schema 见
> `~/claudecode_workspace/工具/forge-cookbook/skills/forge-doc-policy/doc-paths.md`。

# /forge-ship：发布上线

## 核心原则

`ship` 不是“创建 PR 就结束”。它有两个模式：

- **PR only**：提交、推送、创建或更新 PR，然后停止。
- **Full ship**：提交、推送、创建或更新 PR，检查 PR 状态，合并 PR 到远程基础分支，再把本地基础分支 worktree 同步到 `origin/<基础分支>`。

当用户明确说“ship / 发布 / 合并 / 通过 PR / 更新远程和本地 main”时，默认使用 **Full ship**。当用户只说“创建 PR / 提交 PR / 先发 PR”时，使用 **PR only**。

永远区分这些状态：代码已提交、分支已推送、PR 已创建、PR 已合并、远程 main 已更新、本地 main 已同步、ECS 已部署。除非真的执行部署并验证运行态，否则不要说线上已更新。

---

## 前置脚本

每次先运行：

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "当前分支: $_BRANCH"
git status --short
git remote -v
```

如果当前分支就是基础分支（通常是 `main`），不要直接 ship。先询问用户是要：
- A) 新建功能分支再 ship（推荐）
- B) 只同步本地 main
- C) 停止

---

## AskUserQuestion 格式规范

每次提问结构：
1. **重新聚焦**：当前项目、分支、当前步骤
2. **通俗解释**：说清楚这个选择会改变什么
3. **给出建议**：推荐选项 + 一句话原因
4. **列出选项**：`A) B) C)`

---

## 第0步：确定 Ship 模式和基础分支

先确定模式：

```bash
# 根据用户措辞判断；不确定时询问
# PR only: 只创建/更新 PR
# Full ship: PR 合并后同步本地基础分支
```

确定基础分支：

```bash
# 1. 如果已有 PR，读取 PR base
gh pr view --json baseRefName -q .baseRefName 2>/dev/null

# 2. 没有 PR，则读取仓库默认分支
gh repo view --json defaultBranchRef -q .defaultBranchRef.name 2>/dev/null

# 3. 都失败则回退到 main
```

记录：
- 当前分支
- 基础分支
- ship 模式
- 当前 HEAD
- `origin/<基础分支>` HEAD

---

## 第1步：安全检查

检查当前 worktree：

```bash
git status --short --branch
git fetch origin <基础分支> --quiet
git diff origin/<基础分支> --stat
git log origin/<基础分支>..HEAD --oneline
```

如果有未提交更改，询问：
- A) 将本次相关更改加入暂存区并提交（推荐）
- B) 交互式选择文件
- C) 停下来，让我处理

不要自动加入无关文件。特别注意构建产物，如 `frontend-react/tsconfig.app.tsbuildinfo`。

如果是 Full ship，提前定位本地基础分支 worktree，但此时不要修改它：

```bash
_BASE=<基础分支>
_MAIN_CWD=$(git worktree list --porcelain | awk -v branch="refs/heads/${_BASE}" '
  BEGIN { RS=""; FS="\n" }
  $0 ~ "branch " branch {
    for (i=1; i<=NF; i++) {
      if ($i ~ /^worktree /) {
        sub(/^worktree /, "", $i)
        print $i
      }
    }
  }
')
echo "$_MAIN_CWD"
```

如果找不到本地基础分支 worktree，记录“未找到”，不要自动创建，除非用户明确要求。

---

## 第2步：同步基础分支到当前功能分支

```bash
git fetch origin <基础分支> --quiet
git merge origin/<基础分支> --no-edit
```

如果项目约定使用 rebase，需先确认，不要擅自 rebase 已共享分支。

如果有冲突：
1. 列出冲突文件。
2. 解释冲突发生在当前功能分支合并基础分支阶段。
3. 帮助解决冲突。
4. 解决后重新运行关键测试。
5. 冲突未解决前停止 ship。

---

## 第3步：运行项目验证

不要使用 `npm test || yarn test || ... || echo "未找到测试命令"` 这种链式命令，它会吞掉真实失败。

先识别项目可用命令：

```bash
test -f package.json && cat package.json
test -f frontend-react/package.json && cat frontend-react/package.json
test -f pyproject.toml && sed -n '1,160p' pyproject.toml
test -f pytest.ini && cat pytest.ini
```

优先运行与本次改动相关、项目历史已验证的命令。对于 info2action 常见组合：

```bash
INFO2ACTION_CLUSTER_BACKEND=sqlite uv run pytest tests/test_summary_writer.py -q
cd frontend-react && npx vitest run <相关测试文件>
cd frontend-react && npm run lint
cd frontend-react && npm run build
python3 -m py_compile <相关 Python 文件>
git diff --check
```

如果测试失败：
1. 分析是否与本次改动相关。
2. 相关则修复后重跑。
3. 不相关则列出证据并询问是否继续。
4. 未经确认不要跳过失败测试。

如果没有可用测试，询问：
- A) 为本次改动补基础测试（推荐）
- B) 只做静态检查和人工验证
- C) 停止

---

## 第4步：发布前 diff 审查

```bash
git diff origin/<基础分支> --stat
git diff origin/<基础分支>
```

检查：
- 是否有调试代码：`console.log`、`debugger`、临时 `print`
- 是否有密钥、token、私有配置
- 是否有 `TODO: 上线前删除`
- 是否误提交构建产物、缓存、tsbuildinfo
- 是否包含无关文件
- 是否修改了数据库、prompt、skill、部署脚本等高风险区域

发现问题先修复或询问，不要带病 push。

---

## 第5步：更新 CHANGELOG

如果仓库存在 `CHANGELOG.md`，且本次变更值得未来追溯，则更新。

```bash
git log origin/<基础分支>..HEAD --oneline --no-merges
```

如果只是纯机械变更，或用户明确不需要文档，允许跳过，但发布总结要写明“CHANGELOG 未更新”。

如果存在 `VERSION` 文件，询问是否升级版本：
- A) patch
- B) minor
- C) major
- D) 不升级

---

## 第6步：最终提交

暂存本次相关文件：

```bash
git add <本次相关文件>
git status --short
```

确认无关文件未暂存后提交：

```bash
git commit -m "<type>: <summary>"
```

如果已经有提交且只有 CHANGELOG/VERSION 变更，可单独提交：

```bash
git add CHANGELOG.md VERSION
git commit -m "chore: update changelog"
```

提交后记录 commit SHA。

---

## 第7步：推送当前分支

```bash
git push -u origin <当前分支>
```

如果推送被拒绝，不要直接 `git pull --rebase`。先查看远端差异：

```bash
git fetch origin <当前分支> --quiet
git log --left-right --graph --oneline HEAD...origin/<当前分支>
```

询问：
- A) rebase 到远端分支后再推送（推荐，若只是远端新增提交）
- B) merge 远端分支后再推送
- C) 停止，让我处理

不要 force push，除非用户明确要求且确认影响范围。

---

## 第8步：创建或更新 PR

先检查是否已有 PR：

```bash
gh pr view --json number,url,state,baseRefName,headRefName 2>/dev/null
```

如果没有 PR，创建：

```bash
gh pr create \
  --title "<PR标题>" \
  --body "<PR描述>" \
  --base <基础分支> \
  --head <当前分支>
```

PR 描述必须包含：
- 变更摘要
- 测试情况
- 注意事项
- 是否需要部署
- 是否有 migration / 数据修正 / prompt 变更

PR 创建后记录 PR URL。

如果模式是 **PR only**，到这里停止，并输出当前状态。

---

## 第9步：PR 合并前检查

Full ship 必须检查 PR 是否可以合并：

```bash
gh pr view <PR编号> --json number,url,state,isDraft,mergeable,mergeStateStatus,statusCheckRollup,reviewDecision,baseRefName,headRefName
```

规则：
- `state` 必须是 `OPEN`。
- `isDraft` 必须是 `false`。
- `mergeable=CONFLICTING` 时停止。
- `mergeable=UNKNOWN` 时等待片刻并重查；仍 UNKNOWN 则说明 GitHub 尚未计算完成，不要强行合并。
- `statusCheckRollup` 为空时，只能说“无远程 checks”，不能说“CI 已通过”。
- 有 failed check 时停止并列出失败项。
- 有 pending check 时优先等待：

```bash
gh pr checks <PR编号> --watch
```

如果 `reviewDecision` 表示需要 review，按仓库规则停止或询问用户，不绕过保护规则。

---

## 第10步：合并 PR 以更新远程基础分支

确认 PR 可合并后，根据仓库约定选择 merge 方式。

默认推荐 merge commit，因为它保留分支提交历史，并且本地基础分支若曾快进到功能分支，也更容易继续快进到远程 merge commit：

```bash
gh pr merge <PR编号> --merge --delete-branch=false
```

如果仓库约定 squash 或 rebase，先确认：

```bash
gh pr merge <PR编号> --squash --delete-branch=false
gh pr merge <PR编号> --rebase --delete-branch=false
```

合并失败时：
1. 输出失败原因。
2. 不绕过 review、CI、权限或保护规则。
3. 不 force push。
4. 停在 PR 合并阶段。

合并后：

```bash
git fetch origin <基础分支> --quiet
git rev-parse origin/<基础分支>
```

记录远程基础分支新 SHA。

---

## 第11步：同步本地基础分支 worktree

只从 `origin/<基础分支>` 同步本地基础分支。不要用功能分支直接覆盖本地 main。

如果第1步没找到本地基础分支 worktree，重新查找：

```bash
_BASE=<基础分支>
_MAIN_CWD=$(git worktree list --porcelain | awk -v branch="refs/heads/${_BASE}" '
  BEGIN { RS=""; FS="\n" }
  $0 ~ "branch " branch {
    for (i=1; i<=NF; i++) {
      if ($i ~ /^worktree /) {
        sub(/^worktree /, "", $i)
        print $i
      }
    }
  }
')
```

如果仍找不到：
- 报告“未找到本地 `<基础分支>` worktree”。
- 不自动创建。

如果找到，先检查：

```bash
git -C "$_MAIN_CWD" fetch origin "$_BASE" --quiet
git -C "$_MAIN_CWD" status --short --branch
git -C "$_MAIN_CWD" rev-list --left-right --count "origin/${_BASE}...HEAD"
```

处理规则：
- 有未提交变更：列出文件，询问，不自动覆盖。
- 本地基础分支有未推送提交或与远程分叉：停止并解释，不自动 reset。
- 干净且可快进：执行

```bash
git -C "$_MAIN_CWD" merge --ff-only "origin/${_BASE}"
```

如果用户选择 stash：
- 必须使用带名字的 stash。
- 如有 untracked 文件，说明是否包含 `-u`。
- stash 后再同步。
- 同步完成后不要自动 pop，除非用户明确要求。

禁止：
- `git reset --hard`
- `git checkout --`
- 静默覆盖用户未提交文件

同步后验证：

```bash
git -C "$_MAIN_CWD" rev-parse HEAD
git rev-parse "origin/${_BASE}"
```

两者一致，才能说“本地基础分支已同步到远程基础分支”。

---

## 第12步：发布完成总结

总结必须拆状态：

```text
+====================================================+
|                  Ship Summary                      |
+====================================================+
| 模式：PR only / Full ship                           |
| 功能分支：<branch>                                  |
| 基础分支：<base>                                    |
| 提交：<commit sha>                                  |
| PR：<url>                                           |
| PR 状态：已创建 / 已合并 / 未合并                    |
| 远程基础分支：<origin/base sha>                      |
| 本地基础分支 worktree：<路径 / 未找到>               |
| 本地基础分支状态：已同步 / 未同步 / 因脏工作区暂停    |
| 测试：通过 / 跳过 / 失败                             |
| CHANGELOG：已更新 / 未更新                           |
| 部署：未执行 / 已执行并验证                          |
+====================================================+
```

如果没有执行 ECS 部署，必须写：

```text
ECS/线上部署未执行。本次 ship 只表示代码进入远程基础分支，并同步了本地基础分支。
```

---

## 重要规则

- **先 review，后 ship**：`forge-ship` 默认用于 review 后的发布，不替代完整 code review。
- **先同步基础分支，后发布**：功能分支必须先吸收最新 `origin/<基础分支>`。
- **测试失败不发布**：除非用户明确确认失败与本次改动无关。
- **不要假绿**：禁止用会吞失败的链式测试命令。
- **PR 是远程 main 的入口**：需要进入远程 main 的代码必须通过 PR merge。
- **本地 main 以 origin/main 为权威**：PR 合并后再同步本地 main。
- **保护用户未提交变更**：本地 main 有脏文件时，不自动 reset、checkout 或覆盖。
- **发布不等于部署**：ship 不代表 ECS 已更新；部署要单独执行并验证。
- **不要 force push**：除非用户明确要求，并且当前在功能分支上。
