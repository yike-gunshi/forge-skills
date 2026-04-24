---
name: forge-ship
description: |
  发布工作流：检测并合并基础分支、运行测试、审查 diff、
  更新 CHANGELOG、提交、推送、创建 PR。
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
---

# /forge-ship：发布上线

## 前置脚本（每次先运行）

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "当前分支: $_BRANCH"
git status --short
```

---

## AskUserQuestion 格式规范

每次提问结构：
1. **重新聚焦**：当前项目、分支、当前正在做的步骤
2. **通俗解释**：说清楚需要决策的内容
3. **给出建议**：推荐选项 + 一句话原因
4. **列出选项**：`A) B) C)`

---

## 第0步：确定基础分支

```bash
# 1. 检查是否已有 PR
gh pr view --json baseRefName -q .baseRefName 2>/dev/null

# 2. 没有 PR 则获取仓库默认分支
gh repo view --json defaultBranchRef -q .defaultBranchRef.name 2>/dev/null

# 3. 都失败则回退到 main
```

---

## 第1步：审查就绪检查

```bash
# 检查是否有未提交的更改
git status --short

# 查看与基础分支的差异摘要
git fetch origin <基础分支> --quiet
git diff origin/<基础分支> --stat
git log origin/<基础分支>..HEAD --oneline
```

如果有未提交的更改，通过 AskUserQuestion 询问：
- A) 将所有更改加入暂存区并提交（推荐）
- B) 交互式选择要提交的文件
- C) 先停下来，让我处理这些更改

---

## 第2步：合并基础分支（获取最新代码）

```bash
git fetch origin <基础分支>
git merge origin/<基础分支> --no-edit
```

如果有合并冲突：
1. 列出所有冲突文件
2. 通过 AskUserQuestion 逐一询问解决方式
3. 帮助解决冲突
4. 提交合并结果

---

## 第3步：运行测试

按优先级依次尝试以下测试命令，直到找到可用的：

```bash
# 依次尝试，找到第一个成功的
npm test 2>/dev/null || \
yarn test 2>/dev/null || \
go test ./... 2>/dev/null || \
python -m pytest 2>/dev/null || \
cargo test 2>/dev/null || \
echo "未找到测试命令"
```

**如果测试失败**：
1. 分析失败输出
2. 判断是否是本次改动导致的
3. 通过 AskUserQuestion 询问：
   - A) 修复测试（推荐，如果失败与本次改动相关）
   - B) 跳过测试（如果确认失败与本次改动无关）
   - C) 停下来，我来处理

**如果没有测试**：
通过 AskUserQuestion 询问：
- A) 现在为本次改动添加基础测试（推荐）
- B) 跳过，直接继续发布

---

## 第4步：审查本次 diff

```bash
git diff origin/<基础分支> --stat
git diff origin/<基础分支>
```

快速自检（不是完整的 `/forge-review`，是发布前的最后把关）：

- [ ] 有没有调试代码遗留？（`console.log`、`print`、`debugger`、`byebug`）
- [ ] 有没有硬编码的测试数据或密钥？
- [ ] 有没有 `TODO: 上线前删除` 类型的注释？
- [ ] 变更文件数量是否合理？（意外包含大量无关文件？）

如果发现问题，通过 AskUserQuestion 确认是否修复。

---

## 第5步：更新 CHANGELOG

读取现有 `CHANGELOG.md`（如果存在），基于 git log 生成本次发布记录：

```bash
git log origin/<基础分支>..HEAD --oneline --no-merges
```

**CHANGELOG 格式**：
```markdown
## [版本号] - YYYY-MM-DD

### 新增
- 功能描述（来自 feat: 类型的提交）

### 修复
- 修复描述（来自 fix: 类型的提交）

### 改进
- 改进描述（来自 refactor:/perf: 类型的提交）

### 其他
- 其他改动
```

如果存在 `VERSION` 文件，询问是否需要升级版本号：
- A) 升级补丁版本（如 1.0.0 → 1.0.1，Bug修复）
- B) 升级次版本（如 1.0.0 → 1.1.0，新功能）
- C) 升级主版本（如 1.0.0 → 2.0.0，破坏性变更）
- D) 不升级版本号

---

## 第6步：最终提交

如果有未提交的更改（CHANGELOG、VERSION 等）：

```bash
git add CHANGELOG.md VERSION  # 只提交文档更新
git commit -m "chore: 更新 CHANGELOG 和版本号 for v{version}"
```

---

## 第7步：推送

```bash
git push origin <当前分支>
```

如果推送被拒绝（远端有新提交）：
```bash
git pull origin <当前分支> --rebase
git push origin <当前分支>
```

---

## 第8步：创建 PR

```bash
# 检查是否已有 PR
gh pr view 2>/dev/null
```

如果没有 PR，生成 PR 描述并创建：

**PR 标题格式**：`[类型] 一句话描述主要变更`（类型：feat/fix/refactor/chore）

**PR 描述格式**：
```markdown
## 变更摘要
- 主要改动1
- 主要改动2

## 测试情况
- [ ] 单元测试通过
- [ ] 手动测试通过（测试了哪些场景）

## 注意事项
（有特殊部署步骤、数据库迁移等提前说明）
```

```bash
gh pr create \
  --title "<PR标题>" \
  --body "<PR描述>" \
  --base <基础分支>
```

---

## 发布完成总结

```
+====================================================+
|                  发布完成                            |
+====================================================+
| 分支：<当前分支>                                     |
| 基础分支：<基础分支>                                  |
| 提交数：X 个                                         |
| 文件变更：X 个文件，+X 行，-X 行                       |
| 测试：通过 / 跳过 / 新增                              |
| 版本：X.X.X                                         |
| PR：<PR URL>                                        |
+====================================================+
```

---

## 重要规则

- **先合并，后发布** — 永远先把基础分支的最新代码合并进来
- **测试失败不发布** — 除非明确确认失败与本次改动无关
- **CHANGELOG 必须更新** — 让未来的自己和同事感谢你
- **不要 force push** — 除非用户明确要求，且当前在功能分支上
