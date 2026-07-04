# Forge 体系优化项目 — 目标与任务清单

> 创建于 2026-07-04。协作模式：AI 分析 → 用户学习 → AI 提方案 → 用户确认 → AI 落地。
> 详细分析文档：`docs/skill-audit-2026-07.md`

## 目标

让 forge skill 体系在**任何开发类项目**（如 info2action）中都能低成本实际用起来。

三个子目标：
1. **可靠**：真源不漂移、引用不断链、换项目不失效
2. **便宜**：单次调用的上下文消耗大幅下降，长会话不再"中途失忆"
3. **易上手**：新项目一键接入，小改动有轻量车道

硬约束（本轮自律）：**只做减法和解耦，不加新功能**。
验收标准：新项目从零跑通一个小需求，数一数要几步、烧多少上下文。

## 任务清单

### 阶段 0：深度分析（进行中）

- [x] A1. 逐 skill 详细分析 → `docs/skill-audit-2026-07.md`（15 个 skill + 总入口 + _shared，30 个编号问题 P-01~P-30）✅ 2026-07-04
- [x] A2. 用户回答 3 个待定问题 ✅ 2026-07-04：
  - forge-design Python 脚本 → 用户授权 AI 定夺 → **保留**（流程正经入口 + 不占上下文的正确模式）
  - dev vs deliver → **用户实际用 dev** → 合并方向定为：保 dev、吸收 deliver 的发布/文档尾段、退役 deliver
  - fupan Workbench → 每次都开但**效果不好**；复盘要去公式化，核心目的=提升用户自己的能力 → 立项重设计
- [x] A4. 上游 skill 最新版调研 ✅ 2026-07-04 → 审计文档第 5 节（Superpowers v5.1 / gstack 30+ / frontend-design / ui-ux-pro-max v2）
- [x] A3. 优化方案确认单已出 → `docs/optimization-plan-2026-07.md`（D-00~D-11 待用户逐项确认）✅ 2026-07-04
- [x] A5. 技能手册全量重写 → `docs/skills-reference.md`（16 单元人话版档案）✅ 2026-07-04

### 阶段 1：P0 保命（真源与链接）✅ 2026-07-04 完成

- [x] B1. 审查 6 周未提交改动 → 全部是正经工作（doc-policy v0.2 适配 + description 压缩 + bugfix 瘦身 321 行），整体入库 `472b080`；漏提交的 _shared/current-doc-loading.md 一并入库
- [x] B2. 已推送 origin/main（2273987 → 773c4ac，共 4 个 commit），三点一致恢复
- [x] B3. install.sh 增加 _shared 链接（install/uninstall/status 三处）`cccec47`，已执行生效
- [x] B4. 跨 skill 引用统一 `~/.claude/skills/` 锚点 `4925ded`；有意保留：fupan 复盘输出目录（P-24 阶段 4 再议）
- [x] B5. 勘误：.gitignore 本来就覆盖缓存垃圾，磁盘残留未入库，无需动作（审计 A-3 已修正）

### 阶段 2：P1 减重（上下文经济学)

- [x] C1. forge-bugfix 瘦身：63KB → 骨架 12.6KB + 4 份阶段手册（含 Mode B 契约单源化）`1a0f65b` ✅ 2026-07-04
- [x] C2. forge-qa 瘦身：64KB → 骨架 15.4KB + Mode A/B 两份手册 `0422e06` ✅ 2026-07-04
- [x] C3. 中型瘦身完成 ✅ 2026-07-04：brainstorm 27.5→17K、prd 26→17.4K、design 30→15.4K、dev 28→20.5K、eng 28→24.9K（各配 references 手册；fupan 等 E2、deliver 等 E1）
- [x] C4. description 全部压缩到 2-4 行（附带删除总入口过宽触发词"继续"）`0d92b74` ✅ 2026-07-04
- [x] C5. 工作区 CLAUDE.md Forge 段收缩 206→127 行（R1-R11 一行版速查表；原文备份进 cookbook docs/archive/raw/）✅ 2026-07-04
- [ ] C6. 实战验证：info2action 下一个真实 bug 走一遍新骨架的 P0-P8 + Mode B（瘦身回归测试）

### 阶段 3：P2 降门槛（任何项目可用）

- [x] D1. init-project.sh 已兑现（幂等、绝不覆盖、复用 bugfix backlog 模板；scratchpad 实测两遍通过）✅ 2026-07-04
  - 附带修复：install.sh 的 SKILLS 清单漏了 forge-doc-policy，导致 B4 改的 ~/.claude/skills/forge-doc-policy/ 引用一直是断链（实测踩出，已补链）
- [x] D2. /forge 决策树：轻量车道置顶 + 空项目导向 init 脚手架 ✅ 2026-07-04
- [ ] D3. 用一个全新空项目做端到端验收（几步跑通 + 上下文消耗对比）

### 阶段 4：结构性调整（每项单独讨论定案后动手）

- [ ] E1. dev/deliver 合并：保 forge-dev（上下文工程设计），吸收 deliver 的 ship/doc-release 尾段编排，退役 forge-deliver，状态目录统一（消灭 .do-dev/ 与 .deliver/ 并存）
- [x] E2. fupan v2 重设计 ✅ 2026-07-04（细案经用户确认）：
  - 主产出改为 learnings.jsonl 账本（append-only/置信度/复发检测，参考 gstack /learn+/retro）
  - 一页纸 ≤60 行 + 每次 1 个深度小课；五章模板/流水账/强制配图/网页勾选门禁全部砍掉
  - 回放钩子接入 bugfix P1 + eng 理解现状（闭环：产条目→开工回放→复盘验复发），端到端实测通过
  - 试点迁移：近 5 篇复盘蒸馏 12 条入账本（跨篇复现的「ship 状态链验收」置信度 9）
  - 踩坑沉淀：账本必须紧凑 JSON（grep 契约），已写进 schema 铁律
  - 子项 3 Workbench 阅览器改造 ✅ 2026-07-04：账本+文档双页（UI 草图经确认），/api/learnings 上线，勾选门禁路由退役，实测通过
- [x] E3. P-31：qa/bugfix 两侧 gstack/browse 引擎引用全部移除（.gstack/ 报告目录名保留兼容存量）✅ 2026-07-04
- [ ] E4. 上游增量融合批次：Superpowers v5 的对抗性 spec 审查 + 子代理模型路由；frontend-design 最新反 AI 模板清单；ui-ux-pro-max 数据文件同步（原则：引用不内嵌，先瘦身后融合）

## 决策记录

| 日期 | 决策 | 原因 |
|---|---|---|
| 2026-07-03 | 重建 ~/.claude/skills symlink（install.sh） | 目录整体丢失导致 skill 全部未注册 |
| 2026-07-04 | 本轮只做减法不加功能 | 复盘证据：失效都源于上下文超载，不是功能缺失 |
