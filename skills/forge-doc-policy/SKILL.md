---
name: forge-doc-policy
description: 文档落地治理规范。统一管理 docs/ 目录下文档的写时约束、读时索引、生命周期标记。提供当前真相源白名单（doc-paths.md）+ frontmatter schema + 新老项目装载脚本（init-project.sh / audit-project.sh）。所有 forge-* skill 的文档落地路径以本 skill 的 doc-paths.md 为准。触发方式：用户说"文档治理"、"文档放哪"、"docs 目录乱了"、"forge-doc-policy"、AI 准备创建任意 .md 或新目录前的自查。
---

# /forge-doc-policy：文档落地治理规范

> 这是一个**规范型 skill**，不主动产出代码或文档，作为其他 forge-* skill 和 LLM 自觉行为的**当前真相源**。
>
> 全程中文。

---

## 设计目标

解决三层文档治理痛点：

| 层级 | 痛点 | 本 skill 提供 |
|---|---|---|
| 写时约束 | AI 创建文档时落到错位置（forge skill 部分约束 + CLAUDE.md 表不全 + 直接对话完全无约束） | `doc-paths.md` 三层白名单 + LLM 强校验铁律 |
| 读时索引 | 文档分散，找不到最新信息 | `frontmatter-schema.md` + `scripts/build-index.sh` 自动生成 `docs/INDEX.md` |
| 生命周期 | 不带元数据，分不清活/死文档 | `frontmatter-schema.md` 必填字段 + `scripts/backfill-frontmatter.sh` 批量回填 |

---

## 文件清单

| 文件 | 作用 | 状态 |
|---|---|---|
| `SKILL.md` | 本文件，元信息和装载说明 | ✅ v0.2 |
| `doc-paths.md` | 当前真相源、模块附录、active 工作区、archive 白名单 | ✅ v0.2 |
| `frontmatter-schema.md` | frontmatter 字段定义（4 必填 + 2 选填） | ✅ v0.2 |
| `claude-md-snippet.md` | 项目 CLAUDE.md 复制粘贴的引用段 | ✅ v0.2 |
| `CHANGELOG.md` | 版本号 + 演进记录 | ✅ v0.2 |
| `scripts/init-project.sh` | 新项目 day 0 一键脚手架 | ✅ 2026-07-04 |
| `scripts/audit-project.sh` | 老项目接入兼容性审计 | ⏳ Sprint E |
| `scripts/backfill-frontmatter.sh` | 批量 AI 回填 frontmatter | ⏳ Sprint C1 |
| `scripts/build-index.sh` | 扫 frontmatter 生成 docs/INDEX.md | ⏳ Sprint C2 |
| `hooks/post-stop-update-index.sh` | Stop hook 触发 INDEX 更新 | ⏳ Sprint C2 |
| `templates/docs-skeleton/` | docs/ 标准目录骨架 | ⏳ Sprint E |
| `templates/CLAUDE.md.tmpl` | 项目级 CLAUDE.md 模板 | ⏳ Sprint E |
| `templates/.gitignore.tmpl` | 文档治理相关 .gitignore 规则 | ⏳ Sprint E |

---

## 装载方式（三选一，按场景）

### 装载 1：项目 CLAUDE.md 引用（**当前主装载**，Sprint A）

每个项目的 `CLAUDE.md`（项目根 / `~/claudecode_workspace/CLAUDE.md`）加 3 行引用段，详见 `claude-md-snippet.md`。

**Why**：第 10 轮决策砍掉 PreToolUse hook，改 LLM 强校验自觉路线。规则源头在本 skill，所有项目通过引用读取。

### 装载 2：新项目 day 0（Sprint E）

```bash
~/.claude/skills/forge-doc-policy/scripts/init-project.sh
```

在新项目根跑一次：创建 docs/ 标准骨架 + 拷贝 CLAUDE.md 模板 + 配 .gitignore + 生成 docs/README.md。

### 装载 3：老项目接入审计（Sprint E）

```bash
~/.claude/skills/forge-doc-policy/scripts/audit-project.sh
```

在已有项目根跑：检测偏差 + 输出 audit-report.md，用户确认后跑 `--fix` 自动补 frontmatter / 创建缺失目录。

---

## LLM 强校验铁律（每次创建 .md / 新目录前必须执行）

> 本段被 `claude-md-snippet.md` 引用，写进每个项目 CLAUDE.md。

1. **自查** — 核对目标路径是否在 `doc-paths.md` 的层 1 白名单内
2. **违规处理** — 若不在白名单 / 介于多个目录 / 涉及新分类 → **停下问用户**（给 2-3 个候选路径）
3. **合规处理** — 在白名单内 → 静默写入，不打断用户
4. **铁律** — 违反 1-3 的写入即视为 bug，用户报告后 AI 必须立即移动文件 + 在 memory 加 feedback

**Why 不上 PreToolUse hook**：第 10 轮 brainstorm 决策（追问 1）— Hook 误伤会让用户频繁被打断，3 次就会自己关掉，反而失效。LLM 自觉 + 违规才问 = 更友好且对 forge skill 已有约束的补强。

---

## 触发关键词

| 用户说 | 行为 |
|---|---|
| "文档治理" / "forge-doc-policy" | 进入本 skill，按用户具体诉求路由（查白名单 / 装载 / 审计） |
| "文档放哪" / "这个文档应该放哪" | 读 `doc-paths.md` 给路径建议 |
| "docs 目录乱了" / "想清理文档" | 提示走 `audit-project.sh`（Sprint E 后可用） |
| AI 准备创建任意 .md 或新目录 | 自查 `doc-paths.md` 三层白名单（LLM 强校验铁律） |

---

## 与其他 forge-* skill 的关系

| skill | 关系 |
|---|---|
| 14 个 forge-* skill | 顶部加引用 `> 文档落地路径见 forge-doc-policy/doc-paths.md`，原 skill 私有路径合并到当前真相源体系 |
| forge-cookbook `_shared/` | 不重复造轮子。`_shared/visual-decision-layer.md` 等保留；本 skill 只管文档落地路径 |
| 项目 CLAUDE.md / 工作区 CLAUDE.md | 引用本 skill 的 `claude-md-snippet.md`，不在 CLAUDE.md 重复规则 |

---

## 版本与演进

- **v0.2**（2026-06-09）适配根级当前真相源、模块附录、active bugfix 后归档和 archive/raw 结构。
- **v0.1**（2026-04-28）骨架 + 文档规则源头 + claude-md-snippet（Sprint A.1）
- 后续版本演进见 `CHANGELOG.md`
- 项目 CLAUDE.md 引用时**锁版本号**（如 `forge-doc-policy@v0.2`），规则改动走独立 worktree → audit-project.sh 跨项目预演 → 没炸再合 main
