# merge-and-sync：PR 合并与本地基础分支同步（执行细节）

> 本文件是 forge-ship 第 9-11 步的执行手册。SKILL.md 只保留步骤名、目的和红线；
> 所有命令、判断规则、异常处理以本文件为准。
>
> 导航：
> - [第9步：PR 合并前检查](#第9步pr-合并前检查)
> - [第10步：合并 PR 以更新远程基础分支](#第10步合并-pr-以更新远程基础分支)
> - [第11步：同步本地基础分支 worktree](#第11步同步本地基础分支-worktree)

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
- `statusCheckRollup` 为空时，只能说"无远程 checks"，不能说"CI 已通过"。
- 有 failed check 时停止并列出失败项。
- 有 pending check 时优先等待：

```bash
gh pr checks <PR编号> --watch
```

如果 `reviewDecision` 表示需要 review，按仓库规则停止或询问用户，不绕过保护规则。

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
- 报告"未找到本地 `<基础分支>` worktree"。
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

两者一致，才能说"本地基础分支已同步到远程基础分支"。
