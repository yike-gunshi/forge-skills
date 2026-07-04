---
name: forge-fupan
description: |
  复盘 v2（能力复利型）：教训落成账本条目（记录/复盘/learnings.jsonl），下次开工由 bugfix/eng 自动回放，再复盘时检测复发/改进；每次产出 ≤60 行一页纸 + 1 个深度小课。Workbench 是复盘阅览器（按需启动）。
  触发方式：用户说"总结知识"、"学习总结"、"复盘"、"/forge-fupan"。
---

> **文档落地路径**：遵循 forge-doc-policy 规范。完整白名单 + frontmatter schema 见
> `~/.claude/skills/forge-doc-policy/doc-paths.md`。

# /forge-fupan：复盘 v2 — 能力复利，不是文档仪式

## 设计哲学（v2，2026-07-04 重设计）

**复盘的唯一 KPI 是用户的能力增量，不是文档的完整性。**

知识长在身上的时刻不是"写文档"的时候，而是：
1. **下次开工前被提醒**"你上次在这栽过"（回放）
2. **再下次复盘时看见**"这个坑我避开了 / 又踩了"（复发检测）

所以 v2 的主产出是**账本条目**（可检索、可回放、可复利），一页纸只是给人看的摘要。
砍掉的东西：固定五章模板、工作叙事流水账、强制配图、复盘前的网页勾选门禁。

## 使用建议

- **会话收尾时复盘，不要中途插入**（工作未收敛，判断会被推翻）
- **优先在上下文压缩/清空之前复盘**（当前上下文可用即可完成 v2 流程；
  需要逐条深挖原始会话时才读 `references/session-log-detection.md`）
- 一个会话的工作做完 → 复盘一次 → 结束，5-15 分钟

## 输出位置

| 产物 | 位置 |
|---|---|
| **账本**（主产出） | `~/claudecode_workspace/记录/复盘/learnings.jsonl`（工作区唯一一本，append-only） |
| 一页纸 | `~/claudecode_workspace/记录/复盘/{项目名}/{YYYY-MM-DD}-{HHMM}-[标签]-{主题}.md` |
| 索引 | `~/claudecode_workspace/记录/复盘/INDEX.md` |

## 前置脚本（每次先运行）

```bash
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
_PROJECT=$(basename "$_ROOT")
_FUPAN_DIR="$HOME/claudecode_workspace/记录/复盘"
_LEDGER="$_FUPAN_DIR/learnings.jsonl"
echo "项目: $_PROJECT / 分支: $(git branch --show-current 2>/dev/null || echo '?')"

# 本项目 + 全局的活跃教训（复发检测的对照组）
if [ -f "$_LEDGER" ]; then
  echo "--- 账本已有条目（本项目 + global）---"
  grep -h "\"project\":\"$_PROJECT\"\|\"project\":\"global\"" "$_LEDGER" | tail -30
else
  echo "账本尚不存在，本次将创建：$_LEDGER"
fi

# 本次会话上下文
git log --oneline -15 2>/dev/null
git diff --stat HEAD~5..HEAD 2>/dev/null | tail -3

# 同会话已有复盘检测（有则迭代更新，不新建）
grep -rl "session:" "$_FUPAN_DIR/$_PROJECT" 2>/dev/null | head -3
```

## 核心流程（5 步）

### 第1步：提取候选教训（AI 做）

从本次会话中提取 2-6 条候选教训，来源优先级：
用户当场纠正过 AI 的地方 > 返工/走弯路的地方 > 用户的好指令（值得复用的模式）> 新学到的领域知识。
每条按四个能力域粗分类：`ai-collab` / `tech` / `product` / `expression`。

### 第2步：问用户（轻量对话，一句话）

> "你觉得这次最值得记住的是什么？我提取的候选：{2-6 条一行清单}"

用户挑选/修改/补充。**用户视角优先**——用户说重要的就是重要的，AI 只补盲区。

### 第3步：落账本（主产出）

确认的每条教训写成账本条目追加进 learnings.jsonl。
**写法、字段、同 key 处理、置信度规则必读 [references/learnings-schema.md](references/learnings-schema.md)。**

### 第4步：复发检测 + 深度小课

- 对照账本旧条目：复发的标 🔴（置信度 +1，复发 ≥2 次建议固化为流程约束）、
  避开的标 🟢 已改进——规则见 learnings-schema.md
- 挑 **1 个点**做深度小课（用户点名优先，否则 AI 挑当次最痛的）：
  300-600 字讲透"为什么会这样 → 原理 → 可迁移的判断标准"。每次只讲一个。
  需要配图时用户说一声再生成（默认不配图）。

### 第5步：一页纸 + 收尾

- 按 [references/one-pager-template.md](references/one-pager-template.md) 生成 ≤60 行一页纸
- 更新 `记录/复盘/INDEX.md`（一行：日期 | 项目 | 主题 | 账本 +N 条 | 🔴/🟢 标记）
- **清理 `.forge/active.md` 中本会话的登记**（多会话协调的收尾职责，保留自 v1）
- 提交：`git add 记录/复盘/ && git commit -m "docs: 复盘 — {主题}"`（在工作区仓库）

## 铁律

1. **账本是主产出**。没落账本的复盘不算复盘；一页纸写得再好也只是副产品。
2. **每次最多 3 个关键点 + 1 个深度小课**。贪多 = 什么都记不住。
3. **每条洞察必须锚定具体事件**（哪个 bug、哪次返工、哪句指令），禁止"要多注意 X"式空话。
4. **不为覆盖四个能力域硬凑条目**。这次只有技术教训就只记技术。
5. **复发必须标注**，不许假装第一次见。复发 ≥2 次 → 建议固化为流程约束，账本不是回收站。
6. **用户说了算**。用户认为重要的教训优先入账，AI 的候选被否就放弃。

## Workbench（复盘阅览器，按需启动）

Workbench 定位是**浏览工具**，不再是复盘流程的门禁：
- 用户想浏览历史复盘/账本时说"打开复盘工作台"再启动（`workbench/launcher.py`）
- 阅览器改造方案见 TODO E2 子项 3（UI 草图确认后实施）

## 深度分析（可选路径）

需要逐条分析原始会话（如"帮我看这个会话里我的指令哪里可以改进"）时，
读 [references/session-log-detection.md](references/session-log-detection.md) 定位会话 JSONL 后再做。
v2 默认流程不依赖它。

## 出口

- 复盘完成 → 建议 `/clear` 或新会话开始下一件事
- 若本会话还有未合并的 worktree → 提示先走 /forge-ship 或 /forge-status
