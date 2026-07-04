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
- [ ] A3. 基于分析文档定稿优化方案清单（哪些做、哪些不做）

### 阶段 1：P0 保命（真源与链接）✅ 2026-07-04 完成

- [x] B1. 审查 6 周未提交改动 → 全部是正经工作（doc-policy v0.2 适配 + description 压缩 + bugfix 瘦身 321 行），整体入库 `472b080`；漏提交的 _shared/current-doc-loading.md 一并入库
- [x] B2. 已推送 origin/main（2273987 → 773c4ac，共 4 个 commit），三点一致恢复
- [x] B3. install.sh 增加 _shared 链接（install/uninstall/status 三处）`cccec47`，已执行生效
- [x] B4. 跨 skill 引用统一 `~/.claude/skills/` 锚点 `4925ded`；有意保留：fupan 复盘输出目录（P-24 阶段 4 再议）
- [x] B5. 勘误：.gitignore 本来就覆盖缓存垃圾，磁盘残留未入库，无需动作（审计 A-3 已修正）

### 阶段 2：P1 减重（上下文经济学)

- [ ] C1. forge-bugfix 瘦身：63KB → 骨架 ≤15KB + references/ 按阶段加载
- [ ] C2. forge-qa 瘦身：64KB → 同上
- [ ] C3. forge-fupan / forge-design / forge-dev / forge-eng / forge-brainstorm / forge-prd 瘦身（26–38KB 各个评估）
- [ ] C4. 15 个 frontmatter description 全部压缩到 2–4 行
- [ ] C5. 工作区 CLAUDE.md 的 forge 段落（约 200 行）收缩成路由表 + 铁律，流程细节回归 skill 单一出处

### 阶段 3：P2 降门槛（任何项目可用）

- [ ] D1. `/forge-init` 一键脚手架：状态文件 + 项目 CLAUDE.md 引用段一条命令铺好（兑现 doc-policy 的 init-project.sh）
- [ ] D2. `/forge` 决策树增加小改动轻量车道
- [ ] D3. 用一个全新空项目做端到端验收（几步跑通 + 上下文消耗对比）

### 阶段 4：结构性调整（每项单独讨论定案后动手）

- [ ] E1. dev/deliver 合并：保 forge-dev（上下文工程设计），吸收 deliver 的 ship/doc-release 尾段编排，退役 forge-deliver，状态目录统一（消灭 .do-dev/ 与 .deliver/ 并存）
- [ ] E2. forge-fupan 重设计：去公式化，以「提升用户能力」为核心目标重构；Workbench 降级为可选组件；先精读 gstack 最新版 /learn 和 /retro 做参考（用户反馈：每次都开但效果不好）
- [ ] E3. P-31 处理：forge-qa/bugfix 引擎清单去掉已丢失的 gstack/browse（倾向删除而非重装，已有 Playwright + browser-use）
- [ ] E4. 上游增量融合批次：Superpowers v5 的对抗性 spec 审查 + 子代理模型路由；frontend-design 最新反 AI 模板清单；ui-ux-pro-max 数据文件同步（原则：引用不内嵌，先瘦身后融合）

## 决策记录

| 日期 | 决策 | 原因 |
|---|---|---|
| 2026-07-03 | 重建 ~/.claude/skills symlink（install.sh） | 目录整体丢失导致 skill 全部未注册 |
| 2026-07-04 | 本轮只做减法不加功能 | 复盘证据：失效都源于上下文超载，不是功能缺失 |
