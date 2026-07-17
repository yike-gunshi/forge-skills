---
status: live
type: reference
module: forge-doc-policy
last_updated: 2026-06-09
---

# forge-doc-policy CHANGELOG

按时间倒序，最新在上。

---

## Roadmap（规划中，均未实现——不要引导用户运行）

| 能力 | 说明 |
|---|---|
| `scripts/audit-project.sh` | 老项目接入兼容性审计 |
| `scripts/backfill-frontmatter.sh` | 批量 AI 回填 frontmatter（Sprint C1） |
| `scripts/build-index.sh` | 扫 frontmatter 生成 docs/INDEX.md（Sprint C2） |
| `hooks/post-stop-update-index.sh` | Stop hook 触发 INDEX 更新（Sprint C2） |
| `templates/docs-skeleton/` + `CLAUDE.md.tmpl` + `.gitignore.tmpl` | 标准骨架与模板（Sprint E） |

> 2026-07-17 起，未实现项从 SKILL.md 文件清单表移到这里（消除 future-outline-vs-build 反模式）。

---

## v0.2 — 2026-06-09（当前真相源 + archive/raw）

**适配文档系统重构**：

- `doc-paths.md` 改为“根级当前真相源 + 模块附录 + active 工作区 + archive/raw”四层结构。
- `frontmatter-schema.md` 新增 `type: changelog`，并更新 `brainstorm/research/guide/reference` 示例路径。
- 明确项目若存在 `docs/modules/doc-system.md`，优先遵守项目级文档系统。
- 新 bugfix 报告先写 `docs/bugfix/reviews/`，结案后移动到 `docs/archive/raw/bugfix-reviews/`。
- `docs/讨论/调研/优化/复盘` 变成 legacy 兼容路径；对已采用 archive/raw 的项目不再作为当前写入目标。
- `docs/DEPLOY.md` 不再默认是生产权威；优先项目 CLAUDE、`docs/modules/ops-runtime.md` 和 `docs/ops/README.md`。

---

## v0.1 — 2026-04-28（骨架）

**Sprint A.1 交付**：

- 新建 `forge-doc-policy/` skill 目录骨架
- `SKILL.md` — 元信息 + 装载说明 + 触发关键词 + LLM 强校验铁律
- `doc-paths.md` — 当前真相源三层白名单（粗目录 15 条 + 高频细规则 10 条 + 兜底铁律），含路径合法性快速决策树和反模式清单
- `frontmatter-schema.md` — 4 必填（status/type/module/last_updated）+ 2 选填（replaces/owner）字段定义，含 10 类 type 枚举和校验规则
- `claude-md-snippet.md` — 工作区级 + 项目级 + 14 skill 引用模板
- `scripts/` / `hooks/` / `templates/` 子目录占位，等 Sprint C/E 填充

**未交付（后续 sprint）**：
- ⏳ A.2 — 工作区级 CLAUDE.md 加治理段
- ⏳ A.3 — 14 forge skill 顶部加引用
- ⏳ A.4 — info2action CLAUDE.md 改引用版
- ⏳ A.5 — forge-cookbook git push + release tag `forge-doc-policy@v0.1`
- ⏳ A.6 — 主观验证（4 场景）
- ⏳ Sprint C1 — `scripts/backfill-frontmatter.sh`
- ⏳ Sprint C2 — `scripts/build-index.sh` + `hooks/post-stop-update-index.sh`
- ⏳ Sprint E — `scripts/init-project.sh` + `scripts/audit-project.sh` + `templates/`

**Why v0.1 而不是 v1.0**：
- v0.1 = 骨架 + 当前真相源文档完整，但脚本/hook 都是占位
- v1.0 = Sprint A+C+E 全部完成，可作为新项目 day 0 一键启用
- 项目 CLAUDE.md 引用时锁版本号（如 `@v0.1`），当前真相源体系改动走 brainstorm worktree → audit-project.sh 跨项目预演 → 没炸再合 main

---

## 设计渊源

本 skill 来自 info2action 项目 brainstorm（共 11 轮，2026-04-28）：
- legacy 证据路径：`docs/讨论/文档治理-2026-04-28/2026-04-28-文档治理-需求讨论.md`
- 关键决策：D1-D18 见 brainstorm §7 + §10.1
- 第 8 轮用户补充关键约束："不要只放在 CLAUDE.md 中，我希望它是可以复用的"
- 第 10 轮砍 hook：改 LLM 强校验自觉路线（追问 1）
