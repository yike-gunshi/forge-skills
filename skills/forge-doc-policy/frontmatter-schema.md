---
status: live
type: reference
module: forge-doc-policy
last_updated: 2026-04-28
---

# Frontmatter Schema 定义

所有活文档（status: live / draft）**必填** frontmatter。`status: archive` 的归档文档不强制（已沉淀的死文档不再回填）。

---

## 字段定义

### 4 个必填字段

| 字段 | 取值 | 说明 |
|---|---|---|
| `status` | `live` \| `draft` \| `archive` | 文档生命周期状态 |
| `type` | `prd` \| `design` \| `engineering` \| `qa` \| `brainstorm` \| `bugfix` \| `research` \| `plan` \| `guide` \| `reference` | 文档类型（用于 INDEX 聚合） |
| `module` | 具体模块名 / `global` | 所属模块（跨模块用 `global`） |
| `last_updated` | `YYYY-MM-DD` | 最后更新日期（修改时同步更新） |

### 2 个选填字段

| 字段 | 取值 | 说明 |
|---|---|---|
| `replaces` | 旧文档相对路径 / `~` | 本文取代的旧文档路径（用于 INDEX 显示"取代谁"） |
| `owner` | `team` 或 GitHub handle / `~` | 负责人 / 团队（多人协作有用） |

---

## status 字段的语义

| 值 | 含义 | 何时用 |
|---|---|---|
| `live` | 当前权威，AI 应以本文档为准 | 默认值。`docs/PRD.md` / `docs/DESIGN.md` / 当前活跃 brainstorm / plans 等 |
| `draft` | 草稿 / 未确认 / 进行中 | brainstorm 未收束 / PRD 待 review |
| `archive` | 历史归档，不再更新 | 已被 `replaces` 字段指向的新文档取代 / 旧版本设计稿 / 已结案 BF |

**判活规则**（用户读时使用）：
- 读 `status` 字段，不靠人肉看 last_updated 推测
- 同模块多份文档，看 `replaces` 链找最新一份

---

## type 字段的取值清单（10 类，封闭枚举）

| 值 | 对应文档 | 示例 |
|---|---|---|
| `prd` | 产品需求 | `docs/PRD.md` / `docs/PRD-CHANGELOG.md` |
| `design` | 设计规范 | `docs/DESIGN.md` / `docs/DESIGN-CHANGELOG.md` |
| `engineering` | 工程架构 | `docs/ENGINEERING.md` |
| `qa` | QA 验收 | `docs/QA.md` / `docs/bugfix/reviews/BF-*.md` |
| `brainstorm` | 立项前讨论 | `docs/讨论/{模块}/{date}-*.md` |
| `bugfix` | bug 修复记录 | `docs/bugfix/{date}.md` / `docs/bugfix/backlog.md` |
| `research` | 一次性调研 | `docs/调研/{date}-*.md` |
| `plan` | 跨轮执行计划 | `docs/plans/{date}-*.md` / 已上线功能 `docs/优化/{date}-*.md` |
| `guide` | 操作指南 | `docs/DEPLOY.md` / `docs/SELF-HOST.md` / `docs/配置指南.md` / `docs/产品实现速查.md` |
| `reference` | 参考资料 | `docs/REVIEW-CHECKLIST.md` / 本 SSoT 文件 |

> **新增 type 值**：必须先在本 schema 加定义 + 解释场景，再在文档使用。AI 不准临时造新值。

---

## 模板

### 新建文档时直接复制粘贴

```yaml
---
status: live
type: brainstorm
module: 文档治理
last_updated: 2026-04-28
---
```

### 取代旧文档时

```yaml
---
status: live
type: design
module: 信息卡片
last_updated: 2026-04-28
replaces: docs/archive/design/旧版卡片设计-2025-12-01.md
---
```

### 草稿状态

```yaml
---
status: draft
type: prd
module: 用户系统
last_updated: 2026-04-28
owner: yike-gunshi
---
```

---

## 校验规则（脚本 + AI 自查）

| 规则 | 严重性 |
|---|---|
| 4 必填字段任一缺失 | ❌ 错误（新文档拒绝合并；老文档进 backfill 队列） |
| `status` 不在三选一 | ❌ 错误 |
| `type` 不在 10 类枚举 | ❌ 错误（先加 schema 定义） |
| `last_updated` 格式不是 `YYYY-MM-DD` | ⚠️ 警告（自动修正） |
| `last_updated` > 今天日期 | ⚠️ 警告（拼错了？） |
| `module` 是 `global` 但路径在 `docs/讨论/{X}/` | ⚠️ 警告（应该用具体模块名 X） |
| `replaces` 指向不存在的路径 | ⚠️ 警告 |

---

## 老文档批量回填策略（Sprint C1）

200+ 个 `docs/*.md` 中活文档约 50-80 份。回填脚本 `scripts/backfill-frontmatter.sh`：

1. 扫所有 `.md`，跳过已有 frontmatter 的
2. 对每个文件提取标题 + 前 50 行内容 + 文件路径作为上下文
3. 调 LLM 生成 frontmatter（带文件原路径作为输入，让 LLM 推断 type / module）
4. 输出 patch 文件让用户审（不直接 apply）
5. 用户审完跑 `--apply` 写入

**预期**：200 文件 5min 生成 + 1h 人审 + 5min apply。

---

## 修订记录

| 版本 | 日期 | 变更 |
|---|---|---|
| v0.1 | 2026-04-28 | 初版，schema 定义 + 校验规则 + 回填策略 |
