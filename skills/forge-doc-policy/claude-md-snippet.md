---
status: live
type: reference
module: forge-doc-policy
last_updated: 2026-06-09
---

# CLAUDE.md 引用片段

把下面的内容复制到目标 `CLAUDE.md` 即可启用 forge-doc-policy 治理。

---

## 适用位置

| 文件 | 段落标题 | 用途 |
|---|---|---|
| `~/claudecode_workspace/CLAUDE.md`（工作区级） | `## 文档治理（forge-doc-policy）` | 工作区入口 + LLM 强校验铁律 |
| `{项目根}/CLAUDE.md`（项目级） | `## 文档治理` | 项目级引用，**只列项目特化细规则**，共享规则不重复 |

---

## 工作区级引用片段（粘贴到 `~/claudecode_workspace/CLAUDE.md`）

```markdown
## 文档治理（forge-doc-policy）

本工作区遵循 forge-doc-policy 规范。完整白名单 + 兜底规则:
~/claudecode_workspace/工具/forge-cookbook/skills/forge-doc-policy/doc-paths.md

frontmatter schema(新文档必填):
~/claudecode_workspace/工具/forge-cookbook/skills/forge-doc-policy/frontmatter-schema.md

### LLM 强校验铁律（每次创建 .md / 新目录前必须执行）

1. **自查**：核对目标路径是否在 doc-paths.md 的层 1 白名单内
2. **违规处理**：若不在白名单 / 介于多个目录 / 涉及新分类 → **停下问用户**（给 2-3 个候选路径）
3. **合规处理**：在白名单内 → 静默写入，不打断用户
4. **铁律**：违反 1-3 的写入即视为 bug，用户报告后 AI 必须立即移动文件 + 在 memory 加 feedback

### 新文档必填 frontmatter（创建时同步带，不要后补）

\`\`\`yaml
---
status: live | draft | archive
type: prd | design | engineering | qa | brainstorm | bugfix | research | plan | guide | reference | changelog
module: {模块名} | global
last_updated: YYYY-MM-DD
replaces: {old-path} | ~  # 选填
owner: {team} | ~  # 选填
---
\`\`\`

**Why 不上 PreToolUse hook**：第 10 轮 brainstorm 决策 — Hook 误伤会让用户频繁被打断，3 次就会自己关掉，反而失效。LLM 自觉 + 违规才问 = 更友好且对 forge skill 已有约束的补强。
```

---

## 项目级引用片段（粘贴到 `{项目根}/CLAUDE.md`）

```markdown
## 文档治理

本项目遵循 forge-doc-policy 规范。规则源头见
`~/claudecode_workspace/CLAUDE.md` 「文档治理」段，
完整白名单见
`~/claudecode_workspace/工具/forge-cookbook/skills/forge-doc-policy/doc-paths.md`。

### 项目特化规则

（只列本项目特定的细规则。共享规则不在此重复，统一从 forge-doc-policy 读取。）

- （示例）根级 `docs/PRD.md` / `docs/DESIGN.md` / `docs/ENGINEERING.md` 是当前真相源。
- （示例）新 bugfix 报告先写 `docs/bugfix/reviews/`，结案后归档到 `docs/archive/raw/bugfix-reviews/`。
- （在此追加项目特定的 doc 约定，如有）
```

---

## 14 个 forge-* skill 顶部引用行（A.3 用）

每个 `forge-cookbook/skills/forge-*/SKILL.md` 在 frontmatter 后第一段加：

```markdown
> **文档落地路径**：遵循 forge-doc-policy 规范。完整白名单 + frontmatter 见
> `~/claudecode_workspace/工具/forge-cookbook/skills/forge-doc-policy/doc-paths.md`。
```

---

## 修订记录

| 版本 | 日期 | 变更 |
|---|---|---|
| v0.2 | 2026-06-09 | 增加 `changelog` type 和当前真相源 / active bugfix 后归档示例 |
| v0.1 | 2026-04-28 | 初版，工作区级 + 项目级 + 14 skill 引用模板 |
