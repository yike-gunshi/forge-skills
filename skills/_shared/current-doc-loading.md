---
status: live
type: reference
module: forge-doc-policy
last_updated: 2026-06-09
---

# 当前文档加载契约

forge-* skill 做当前任务时按这个顺序加载文档：

1. 项目 `CLAUDE.md`
2. `docs/README.md`
3. `docs/INDEX.md`
4. 与任务相关的根级当前真相源：`PRD.md` / `DESIGN.md` / `ENGINEERING.md` / `QA.md` / `产品实现速查.md`
5. 相关 `docs/modules/*.md` 或 `docs/ops/*.md`
6. 需要历史原因时，读 `docs/CHANGELOG.md` 和对应 `*-CHANGELOG.md` 顶部索引
7. 只有需要原始证据时，进入 `docs/archive/summaries/` 或 `docs/archive/raw/`

## 写入规则

- 根级文档写当前事实，不写完整 AI 讨论过程。
- Feature Spec 写 `.features/{feature-id}/feature-spec.md`，根级 PRD 只吸收最终有效结论。
- 设计探索、brainstorm、调研和优化原文默认进入 archive/raw；确认后的结论再写入当前真相源或模块附录。
- 新 bugfix 报告先写 `docs/bugfix/reviews/BF-{MMDD}-{N}.md`，`status: draft`；结案后归档到 `docs/archive/raw/bugfix-reviews/`。
- 长 changelog 是历史账本，不是默认当前事实源。
