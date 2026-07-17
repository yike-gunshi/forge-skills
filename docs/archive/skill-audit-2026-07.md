---
status: live
type: research
module: global
last_updated: 2026-07-04
owner: dbwu + Claude
---

# Forge Skill 体系全面审计（2026-07）

> 目的：① 帮你把每个 skill 的功能重新梳理一遍，达到如数家珍；② 逐个记录问题，作为优化的依据。
> 配套任务清单见仓库根 `TODO.md`。
> 阅读建议：先看第 1 节全景图建立地图感，再挑感兴趣的 skill 看第 2 节档案，最后看第 3 节横向问题。

---

## 1. 体系全景

### 1.1 一句话总纲

Forge 是一套**规范驱动开发**的工作流：所有工作先落文档（PRD / DESIGN / ENGINEERING / 验收报告），代码严格对标文档实现，QA 基于文档断言验收，最后复盘沉淀知识。15 个 skill 按角色分四类：

| 角色 | Skill | 类比 |
|---|---|---|
| **入口/导航** | forge（总入口）、forge-status | 前台+保安 |
| **编排器**（自己不干活，调别人） | forge-dev、forge-deliver | 项目经理 |
| **执行者**（真正产出文档/代码/报告） | forge-brainstorm、forge-prd、forge-design、forge-design-impl、forge-eng、forge-bugfix、forge-qa、forge-fupan | 各工种 |
| **守门/收尾** | forge-review、forge-ship、forge-doc-release、forge-doc-policy | 质检+发货+档案室 |

### 1.2 生命周期主链路

```
想法 → forge-brainstorm（思考文档）
     → forge-prd（PRD + Feature Spec，含异常态门禁）
     → forge-design（DESIGN.md + Image 2 视觉稿门禁）【前端项目才走】
     → forge-design-impl（设计转代码，只改样式）
     → forge-eng（worktree + TDD + Wave 并行实现）
     → forge-qa Mode A（test-spec → 断言引擎 → 报告 + User Gate）
     → forge-review（上线前结构性审查，发现直接修）
     → forge-ship（PR → 合并 → 同步本地 main）
     → forge-doc-release（发布后文档同步）
     → forge-fupan（复盘沉淀）

旁路：bug 进 forge-bugfix（P0-P8，内部在 P6 调 forge-qa Mode B）
调度：forge-dev / forge-deliver 把上面串起来自动跑
```

### 1.3 体积总表（按大小排序）

| Skill | 行数 | 体积 | 附属资产 | 健康度 |
|---|---|---|---|---|
| forge-qa | 1517 | 64 KB | references×2、qa-runner.mjs、docs | 🔴 过重 |
| forge-bugfix | 1409 | 63 KB | scripts×2、templates×3、docs | 🔴 过重 |
| forge-fupan | 879 | 38 KB | parse_tokens.py + **整个 Workbench Web 应用** | 🔴 过重+重基建 |
| forge-design | 716 | 30 KB | references×1、scripts×3、data/*.csv×8 | 🟡 偏重 |
| forge-eng | 734 | 28 KB | references×4（已有按需加载意识） | 🟡 偏重 |
| forge-dev | 701 | 28 KB | 无 | 🟡 偏重 |
| forge-brainstorm | 684 | 27.5 KB | 无（模板全部内嵌正文） | 🟡 偏重 |
| forge-prd | 536 | 26 KB | references×3 | 🟡 偏重 |
| forge-deliver | 560 | 20 KB | README | 🟡 与 dev 重叠 |
| forge-ship | 469 | 13 KB | 无 | 🟢 良好（有硬编码） |
| forge-doc-release | 352 | 13 KB | 无 | 🟢 良好 |
| forge-status | 219 | 8 KB | 无 | 🟢 良好（有硬编码） |
| forge-review | 209 | 7 KB | 无 | 🟢 标杆 |
| forge-design-impl | 200 | 7.6 KB | 无 | 🟢 标杆 |
| forge-doc-policy | 111 | 5.6 KB | doc-paths、schema、snippet | 🟢 标杆（脚本未实现） |
| forge（总入口） | 163 | 6.2 KB | — | 🟢 标杆 |
| **合计** | | **386 KB** | | |

### 1.4 状态文件足迹（谁读写哪些跨会话状态）

| 状态文件 | 写入者 | 读取者 | 用途 |
|---|---|---|---|
| `.features/{id}/feature-spec.md` + `_registry.md` | forge-prd | prd/dev/design/eng/qa/brainstorm/deliver | 功能规格 + 状态注册表 |
| `.forge/active.md` | forge-bugfix | forge-status、forge-fupan | 多会话并行登记（防撞车） |
| `docs/bugfix/backlog.md` | forge-bugfix、forge-status | forge-bugfix | Bug 任务池（单一入口） |
| `docs/bugfix/reviews/BF-XX.md` | forge-bugfix、forge-qa | 用户 | 双层验收报告 |
| `.deliver/state.json` | forge-deliver | forge-deliver | 交付流水线检查点 |
| `.do-dev/state.json`、checkpoints | forge-dev | forge-dev | ⚠️ 另一套检查点（与上面并存） |
| `docs/PRD.md` 等根级真相源 | 各执行 skill | 全体 | 当前事实源 |

**⚠️ 注意**：`.deliver/` 和 `.do-dev/` 是两套并行的编排状态目录，这是 dev/deliver 职责重叠的直接证据（详见 3.4）。

---

## 2. 逐 Skill 档案

每份档案固定五栏：**定位 / 核心机制 / 输入输出 / 亮点 / 问题**。问题带编号（P-系列），第 3 节汇总。

---

### 2.1 forge（总入口）— 6.2 KB 🟢

**定位**：不知道下一步干什么时的导航员。检测项目状态 → 按决策树推荐下一个 skill。

**核心机制**：
1. 跑一段只读检测脚本（文档存在性、git 状态、worktree、dev server、分支）
2. 按 8 条决策树规则判断处境（新项目→brainstorm；有 PRD 无设计→design/dev；改完没测→qa……）
3. AskUserQuestion 给出推荐 + 备选
4. 自己绝不干活（铁律：只检测和推荐，10 秒内完成）

**亮点**：轻、快、职责单一，每个 forge-* skill 完成后也有"出口建议"，形成链式引导。

**问题**：
- **P-01**：决策树没有"小改动轻量车道"——一个 5 分钟的小修改也会被导向完整仪式链。
- **P-02**：检测到"什么文档都没有"时只会推荐 brainstorm，不能一键铺好状态文件（脚手架缺位，关联 P-30）。
- **P-03**：触发词包含"继续"，过于宽泛，容易在无关场景被误触发。

---

### 2.2 forge-brainstorm — 27.5 KB 🟡

**定位**：万能头脑风暴。4 种模式（产品/内容/构建/探索）× 6 个阶段，产出可跨会话续讨论的"思考文档"。

**核心机制**：
- Phase 0 上下文感知+模式检测 → Phase 1 深度提问（模式专属题库）→ Phase 2 景观感知（竞品/参考，可选）→ Phase 3 前提挑战（质疑你的假设）→ Phase 4 强制给 2-3 个方案 → Phase 4.5 视觉辅助（Mermaid/图）→ Phase 5 写思考文档
- 思考文档有精细的模板：决策表逐轮锁定、多轮审视追加、"给下一台电脑的自己"的续聊指引、原始讨论纪实
- Phase 6 出口：推荐 forge-prd 或 forge-dev

**亮点**：前提挑战 + 强制多方案，是防"AI 顺着你说"的好设计；思考文档的多轮决策表在 info2action 实战中效果好（33 决策锁定那次复盘）。

**问题**：
- **P-04**：约 40% 篇幅（约 300 行）是内嵌的思考文档模板和跳转总览，应外置到 `references/`，用到 Phase 5 才加载。

---

### 2.3 forge-prd — 26 KB 🟡

**定位**：产品诊断与 PRD 迭代管理器。描述问题 → 诊断根因（产品缺陷/实现偏离/PRD 遗漏）→ 更新 PRD + 生成 Feature Spec。

**核心机制**：
- 第 0 步定位项目文档 → 第 1 步理解现状（或从零创建 PRD）→ 第 2 步自适应深度诊断 → 第 3 步方案确认 → **第 3.5 步生成 Feature Spec（用户确认门禁）** → 第 3.6 步生成/更新项目 CLAUDE.md → 第 4 步写入文档
- Feature Spec 必含：用户流程、Given/When/Then 场景、验收检查表、**每个功能点至少 3 种异常态**（空态/错误态/降级态，本地存储加陈旧态）——对应工作区 R8 铁律
- 附属模板做得好：prd-template、feature-spec-template、project-claude-md-template 都在 references/

**亮点**：异常态门禁是真金白银的教训沉淀；**已经具备生成项目 CLAUDE.md 的能力**——这是"新项目一键接入"的现成半成品（关联 P-30）。

**问题**：
- **P-05**：正文 26 KB 仍偏重，诊断题库和写入格式细则可外置。

---

### 2.4 forge-design — 30 KB 🟡

**定位**：全栈设计规划。管理 DESIGN.md 三层 Token 架构，带分级门控（改动大小决定流程深度）、99 条 UX 规则审计、Image 2 视觉稿门禁、反 AI 模板检测、0-10 交互评分。

**核心机制**：
- 第 0 步门控判定（小改动走浅流程）→ 第 1 步理解现状/从零创建 → 第 2 步设计审计（用 data/*.csv 的规则库：配色/字体/风格/UX 规则等 8 个 CSV）→ 第 3 步设计方案 → 第 4 步更新文档 → 第 5 步质量评估 → 第 6 步确认
- 自带 3 个 Python 脚本（design_system.py / core.py / search.py）做设计系统计算和检索
- "设计师认知模式"+"设计批评格式"两节给 AI 灌输设计审美人格

**亮点**：分级门控是全家唯一明确做了"改动大小分流"的 skill；CSV 规则库让审计有据可依，不是拍脑袋。

**问题**：
- **P-06**：30 KB 正文 + 脚本 + 8 个 CSV，是个小型设计引擎。正文里大量审计细则可搬进 references（按门控级别加载）。
- **P-07**：Python 脚本是否还在实际使用需要验证——如果实战里 AI 都是直接读 CSV，就该删脚本减负。

---

### 2.5 forge-design-impl — 7.6 KB 🟢 标杆

**定位**：把 DESIGN.md 转成代码。只改样式和布局，绝不碰业务逻辑。

**核心机制**：
- 前置门禁：DESIGN.md 必须存在且评分 ≥ B
- 流程：识别实现清单 → 逐项实现（CSS 优先 / Token 驱动 / 遵循现有风格 / 响应式必须）→ 每项自检 + 原子提交 → 质量验证（token 引用率、AI 模板痕迹扫描、真实截图对比视觉稿）
- 内嵌"反 AI 模板"负面清单：不要紫色渐变英雄区、不要彩色圆圈图标、不要千篇一律三列网格……

**亮点**：7.6 KB 做完一件完整的事，边界清晰（有异议回 forge-design，改逻辑归 forge-eng），是全家瘦身的目标形态。

**问题**：
- **P-08**：结尾推荐"下一步：forge-qa 验证 或 **cn-qa-design** 设计QA"——`cn-qa-design` 这个 skill 不存在，是改名残留的死引用。

---

### 2.6 forge-eng — 28 KB 🟡

**定位**：工程文档管理 + 代码实现。完整模式（文档+审查+实现）和轻量模式（跳过文档直接实现）。

**核心机制**：
- "把湖烧干"完整性原则 + 三条铁律（来自 Superpowers 方法论）
- 流程：定位文档 → 模式选择 → 范围挑战 → 四章工程审查 → 方案设计 → 更新 ENGINEERING.md → **创建 Worktree（会话级隔离）** → Dev Server 端口契约 → 测试框架检测 → 任务拆分 Wave 规划 → **Wave 并行执行（TDD + 证据先于断言的验证门）** → 产出 → 分支收尾
- 已有 4 个 references（tdd-guide / worktree-guide / engineering-template / verification-checklist）——全家最早实践按需加载的

**亮点**：轻量模式是现成的"小改动车道"；worktree 隔离 + 端口契约直接来自 info2action 撞端口的实战教训。

**问题**：
- **P-09**：已经有 references 却还留着 28 KB 正文，5.6/5.7 步（端口契约、测试框架检测）等细则可继续外移。

---

### 2.7 forge-dev — 28 KB 🟡（编排器之一）

**定位**：开发调度器。接力 PRD 变更，判断需要哪些子 skill（design/eng/qa），用 Agent 工具在**独立上下文**里跑子技能。

**核心机制**：
- **上下文工程**（全文档最重要的设计思想）：主上下文只做调度，防止"越聊越傻"（context rot）；每个子 skill 在子代理的全新上下文执行；只传必要文档路径；结果回主上下文汇总
- 流程：Brainstorm 感知 → 读真相源+Feature Spec 检查 → Discussion（偏好收集）→ Research（并行技术调研）→ 分析与调度建议 → Wave 并行调度 → 汇总交付
- 三种模式：交互（3 个硬卡点）/ --auto（前置沟通 1-2 轮后全自动，不 commit，每阶段存 patch 检查点）/ --resume

**亮点**：上下文工程原则正是治疗"63 KB skill 塞爆窗口"的思路本身——讽刺的是它自己的正文也 28 KB。

**问题**：
- **P-10**：与 forge-deliver 大面积重叠（见 3.4），且各用一套状态目录（`.do-dev/` vs `.deliver/`）。`.do-dev/` 还是文档治理白名单里的反模式命名。

---

### 2.8 forge-deliver — 20 KB 🟡（编排器之二）

**定位**：端到端交付纯编排层。比 forge-dev 管得更宽：从 brainstorm 一路编排到 ship + doc-release。

**核心机制**：
- Phase 0 需求理解 → 1 设计 → 2 工程 → 3 QA → 4 审查 → 5 发布 → 6 文档 → 7 验收
- `.deliver/state.json` 检查点、--auto / 交互 / --resume 三模式、三条铁律、交付报告模板

**亮点**：状态机设计完整，检查点思路对。

**问题**：
- **P-11**：与 forge-dev 是"两个项目经理"：dev 管 设计→工程→QA，deliver 管 全流程。实战里（info2action）留下的是 `.do-dev/` 目录，说明 dev 用得多、deliver 用得少。两者应该合并或明确分工，状态目录统一成一个。

---

### 2.9 forge-qa — 64 KB 🔴 全家最重

**定位**：纯验收（只测不修）。Mode A 完整 QA / Mode B 配合 bugfix 的单 bug 回归。

**核心机制**：
- **三层架构**：Layer 1 从文档生成 test-spec.json（铁律：不生成就不执行）→ Layer 2 多维度 Playwright 断言引擎（控制台/数据/网络/视觉/交互/响应式/可访问性/SSE/URL/懒加载）→ Layer 3 智能分析（console→源码→diff 交叉归因）
- 8 条铁律最有价值的三条：**断言必须验证数据值/文本/状态变化，元素存在不算验收**；**控制台零容忍**（任何 console.error 自动 FAIL）；**不得猜端口**（必须用调用方传的 app_url）
- Mode B 有清晰的参数契约（mode=B / review_doc / bug_id / worktree / commit / app_url），回填 QA 证据到 BF 报告
- User Gate：QA 全过后仍必须用户人工验收

**亮点**：断言深度规则治好了"截图即通过"的假 QA；Mode B 契约让 bugfix↔qa 的接力有了硬接口。

**问题**：
- **P-12**：64 KB 单文件，Mode A 和 Mode B 完全可以拆开按需加载（Mode B 调用方永远是 bugfix，根本不需要加载 Mode A 的 1000 行）。
- **P-13**：自相矛盾："三层架构"说 **10 维度**断言引擎，第 5 步标题是 **7 维度**测试执行——文档内部失去同步。
- **P-14**：与 forge-bugfix 双向重复描述同一套契约（两边各写一份 Mode B 参数表），改一处另一处不跟。

---

### 2.10 forge-bugfix — 63 KB 🔴 全家第二重

**定位**：系统性 bug 修复。一次修一个，强制根因分析、独立 worktree、双层验收、新发现分流。

**核心机制**（P0-P8 流水线）：
- 会话级：P0 环境探测（150 行前置脚本：active.md 判重、端口、dev server）→ P1 强制读 PRD/ENG/bugfix 历史
- 每 bug：P2 范围推荐（从 backlog 捞候选）→ P2.5 建 BF 验收报告 → P3 worktree+复现 → P4 根因+5 Whys+方案确认 → P5 TDD 最小修复+原子提交 → P5.3 报告更新为待 QA → P6 调 forge-qa Mode B → P6.5 用户人工验收（硬关卡）→ P7 按 Pass/Fail/Pass+新发现分流 → P7.4 边界确认 → P7.5 新发现进 backlog → P8 归档沉淀
- 9 条铁律核心：不做根因不写代码；新发现禁止顺手修（同根必须举证）；没有用户最终结论不合并；自动闭环 3 次失败必须 blocked-human
- 多会话并行：.forge/active.md 登记 + 功能域判重 + 合并前 merge 预演

**亮点**：这是整个体系打磨最久、实战最多的 skill（info2action 几十个 BF 报告）；"新发现分流 + Pass 边界"从根上治住了 scope 蔓延；双层验收（QA 自动 + 用户人工）配合验收报告文档是可追溯性的典范。

**问题**：
- **P-15**：63 KB 且必然链式加载 forge-qa，一次 bugfix 的说明书成本全家最高；复盘里"重新加载 forge-bugfix"事件就是它被上下文挤出去的直接证据。按 P0-P8 拆 references 是收益最大的单项瘦身。
- **P-16**：P0 前置脚本里有按 PID 回溯 `~/.claude/sessions/` 拿会话 ID 的黑科技，依赖 Claude Code 内部实现，脆弱。

---

### 2.11 forge-review — 7 KB 🟢 标杆

**定位**：上线前 PR 审查，专抓"测试测不出来"的结构性问题。发现问题直接修，不只是报告。

**核心机制**：
- 两轮审查。第一轮严重问题：SQL 注入/无 WHERE 全表操作/事务边界、竞态条件（检查-再-操作）、**LLM 输出信任边界**（AI 生成内容入库前有没有验证）、**枚举完整性**（新增枚举值必须 Grep diff 之外的所有引用处）
- 第二轮信息性：条件副作用、魔法数字、死代码、测试缺口、XSS/前端兜底
- 修复优先原则：机械修复直接改（AUTO-FIX），需要权衡的批量进一次 AskUserQuestion（ASK）

**亮点**：LLM 信任边界和枚举完整性是 AI 时代特有的审查项，别处很少见；7 KB 高密度无废话。实战战绩：v12.1 安全加固那轮自动发现并修复 2 个安全问题。

**问题**：
- **P-17**：读取 `TODOS.md`，而工作区规范是 `TODO.md`，命名不一致会漏检（doc-release 同病，见 P-22）。

---

### 2.12 forge-ship — 13 KB 🟢（有硬伤）

**定位**：发布。PR only（创建 PR 就停）/ Full ship（合并 PR + 同步本地 main）两模式。

**核心机制**：
- 12 步：定模式和基础分支 → 安全检查 → 先吸收最新 main → 跑项目验证 → 发布前 diff 审查（查调试代码/密钥/构建产物）→ 更新 CHANGELOG → 提交 → 推送 → 建/更 PR → PR 合并前检查（mergeable/checks/review 状态逐项核）→ 合并 → 只从 origin 同步本地 main
- 状态诚实是灵魂：**永远区分**"已提交/已推送/PR 已建/PR 已合并/远程 main 已更新/本地 main 已同步/已部署"七种状态，禁止说"线上已更新"除非真部署验证过
- 安全铁则：不 force push、不 reset --hard、禁止吞失败的链式测试命令（`npm test || echo 没找到`）

**亮点**：七状态区分 + "发布不等于部署"直接治好了 AI 报喜不报忧的顽疾。

**问题**：
- **P-18**：第 3 步写死了 info2action 专属命令（`INFO2ACTION_CLUSTER_BACKEND=sqlite uv run pytest ...`、`frontend-react/` 路径、ECS 措辞）——通用 skill 里长出了单项目的毛，换项目就是噪音甚至误导。

---

### 2.13 forge-doc-release — 13 KB 🟢

**定位**：发布后文档同步。读所有文档和 diff 交叉对照，让 README/ARCHITECTURE/CONTRIBUTING/CLAUDE.md 匹配已发布内容。

**核心机制**：
- 9 步：diff 分析 → 逐文件审计（每类文档有专属检查法，如 CONTRIBUTING 要做"新贡献者冒烟测试"）→ 自动更新事实性内容 / 风险变更询问 → CHANGELOG 只润色语气绝不覆盖 → 跨文档一致性+可发现性检查 → TODOS 清理 → VERSION 询问 → 提交 + 幂等更新 PR body
- 自动/询问边界划得很细：事实更正直接做，叙事/删除/安全模型必须问

**亮点**：CHANGELOG"推销测试"（用户读了会想试吗）是少见的用户视角文档观。

**问题**：
- **P-19**：提交模板写死 `Co-Authored-By: Claude Opus 4.6`——模型版本过时，属于该参数化的东西。
- **P-20**：用 `/tmp` 存临时文件（工作区规范是用会话 scratchpad）。
- **P-21**：与 P-17 同病：认 `TODOS.md` 不认 `TODO.md`。

---

### 2.14 forge-fupan — 38 KB 🔴（重基建）

**定位**：协作复盘。工作做完后启动本地 Workbench（网页界面）让你勾选想学的知识点和深度，再按选择调研生成结构化复盘文档 + 学习配图。

**核心机制**：
- 160 行前置脚本启动 Workbench（Python server + vite 前端），你在网页上确认知识点选择
- 复盘文档结构：TLDR → 知识点展开（按你选的深度）→ 行为诊断（AI 和你双方）→ 表达优化 → 领域知识 → 可执行清单
- 输出统一到 `~/claudecode_workspace/记录/复盘/{项目名}/` + INDEX.md 索引回流
- 每个展开的知识模块默认尝试生成一张 Image 2 学习图（走 gpt-image-2，失败保存 prompt 待补）
- 会话结束时顺带清理 .forge/active.md 登记

**亮点**：复盘产出在 记录/复盘/info2action/ 里有 40+ 篇，是真实高频使用的；"用户勾选知识点"避免了 AI 自嗨式复盘。

**问题**：
- **P-23**：一个 skill 内嵌整个 Web 应用（server.py + vite 前端 + package-lock + tests + __pycache__），是全家最重的基建，维护成本高、克隆体积大。Workbench 应降级为可选组件或独立工具。
- **P-24**：输出路径写死 `~/claudecode_workspace/记录/复盘/`，绑定本机目录结构。
- **P-25**：图片生成耦合 OPENAI_API_KEY + gpt-image-2 特定模型，环境不满足时流程有卡顿感。

---

### 2.15 forge-status — 8 KB 🟢（有硬伤）

**定位**：并行会话巡检。扫 .forge/active.md 里的登记，按硬信号判僵尸（worktree 没了 / 分支已合并），一次确认批量清理。

**核心机制**：
- 判僵尸只认两个硬信号：worktree 目录不存在、分支已合并 main。**明确拒绝**时间戳/进程存活等启发式（"AI 慢不等于死"）
- 两种模式：用户触发的交互清理 / 被 bugfix・prd・eng P0 调用的只读巡检
- 清 active.md 必须联动 backlog.md（已合并→resolved 归档；worktree 没了→回 pending 可重领）
- Dev server 附加巡检只报告不参与判定

**亮点**：硬信号哲学是整个体系里最干净的一段决策设计；三个典型场景写得清楚（早上开机/新窗口启动/手动删过 worktree）。

**问题**：
- **P-26**：`tmux ls | grep "dev|frontend|backend|info2action"`——写死 info2action；端口列表 3000/3456/5173… 也是拍脑袋清单。应改为读项目的 dev 状态入口。

---

### 2.16 forge-doc-policy — 5.6 KB 🟢（半成品）

**定位**：文档治理规范源头。管三件事：写时约束（doc-paths.md 白名单）、读时索引（frontmatter + INDEX 生成）、生命周期（live/draft/archive 标记）。

**核心机制**：
- 规范型 skill，自己不产出，被 14 个 skill 顶部引用
- LLM 强校验铁律（创建 .md 前自查白名单，违规停下问用户）；刻意不用 PreToolUse hook（会误伤打断，用户会关掉）
- 版本化管理：项目引用时锁版本号（@v0.2），改规则走 worktree + 跨项目审计预演

**亮点**：hook vs LLM 自觉的权衡决策记录在案，是"为什么这样设计"的好示范。

**问题**：
- **P-27**：文件清单里 8 个配套脚本/模板 6 个是 ⏳ 未实现（init-project.sh、audit-project.sh、build-index.sh、docs 骨架模板等），但 SKILL.md 和其他文档已经在引用它们——**承诺了没兑现，而这些恰恰是"新项目一键接入"最需要的**（关联 P-30）。

---

### 2.17 _shared（共享层）— 非 skill

**内容**：current-doc-loading.md（当前文档加载契约：先读真相源、changelog 和 raw 只在追溯时读）、visual-decision-layer.md（Image 2/show-widget/截图的选型指引）、generate_image2.py。

**问题**：
- **P-28**：**install.sh 没把 _shared 加入链接清单**——通过 `~/.claude/skills/forge-xxx/` 加载时 `../_shared/` 指向不存在的位置，全部断链（现行 bug）。
- **P-29**：引用写法不统一（`skills/_shared/...` 和 `../_shared/...` 两种并存）。

---

## 3. 横向问题汇总（跨 skill 的系统性问题）

### 3.1 🔴 A 类：可靠性——链接与真源

| 编号 | 问题 | 证据 | 影响 |
|---|---|---|---|
| P-28/29 | _shared 未被 install.sh 链接 + 引用写法不统一 | install.sh SKILLS 数组无 _shared | 视觉决策层/文档加载契约随时读不到 |
| A-1 | 真源 6 周未提交（27 文件 +396/−603，最后提交 2026-05-23） | git status | 一次误操作丢 6 周工作；GitHub 远端过时 |
| A-2 | 死引用：cn-qa-design（P-08）、doc-policy 未实现脚本被提前引用（P-27） | design-impl 结尾、doc-policy 文件清单 | AI 照做时撞墙 |
| A-3 | ~~仓库垃圾被跟踪~~ **勘误（07-04）**：.gitignore 已覆盖 __pycache__/.pytest_cache，磁盘残留均未入库，无需动作 | git ls-files 复核 | 无 |

### 3.2 🔴 B 类：上下文经济学——最大的日常成本

- 四大件（qa 64K + bugfix 63K + fupan 38K + design 30K）占全家体积一半。
- **链式加载是隐形炸弹**：bugfix→qa 必然连载 127 KB；dev 调度 design+eng+qa 理论上更多（好在 dev 用子代理隔离了）。
- 15 个 description 常驻**每个会话**（含非开发会话），其中 bugfix/qa 的 description 本身就是小作文。
- 实证：复盘中"重新加载 forge-bugfix"事件 = 长会话压缩把规则挤出去了。
- **方向**：骨架+按需加载（forge-eng 的 references 模式推广到全家）；Mode A/B 拆分；description 全部 2-4 行。

### 3.3 🟡 C 类：可移植性——"任何项目"的拦路虎

| 硬编码 | 位置 |
|---|---|
| `~/claudecode_workspace/工具/forge-cookbook/...` 绝对路径 | 14 个 skill 顶部 + doc-policy 装载段 |
| info2action 专属测试命令/目录/ECS | forge-ship 第 3 步（P-18） |
| `grep "...|info2action"` + 固定端口清单 | forge-status（P-26） |
| 复盘输出目录绑定本机 | forge-fupan（P-24） |
| `Co-Authored-By: Claude Opus 4.6` | forge-doc-release（P-19） |
| Codex/browser-use 环境假设散落多处 | bugfix/qa description 等 |

**方向**：路径统一走 `~/.claude/skills/forge/` 锚点；项目特例（测试命令、端口）改为读项目自己的配置（package.json scripts / dev:status 契约），skill 里只留通用协议。

### 3.4 🟡 D 类：重复与重叠

1. **forge-dev vs forge-deliver**：两个编排器、两套检查点目录（`.do-dev/` vs `.deliver/`）、三分之二的阶段重叠。实战证据偏向 dev（info2action 有 .do-dev/）。建议合并为一个编排器（保留 dev 的上下文工程设计 + deliver 的 ship/doc 尾段），状态目录统一。
2. **bugfix ↔ qa 的 Mode B 契约双写**：同一张参数表两边各维护一份（P-14）。应单一来源（放 _shared 或 qa 侧），另一边只引用。
3. **工作区 CLAUDE.md ↔ skill 正文**：R1-R11 约 200 行与 skill 内规则重复（R11 ≈ bugfix P6-P7.5 摘要），已经漂移过一次（失效路径）。CLAUDE.md 应收缩为路由表 + 铁律索引。

### 3.5 🟢 E 类：一致性小病（顺手修）

- P-13：qa 内部 10 维度 vs 7 维度自相矛盾
- P-17/21：TODOS.md vs TODO.md 命名不一致
- P-20：/tmp vs scratchpad
- P-03：总入口触发词"继续"过宽

### 3.6 缺失能力（唯一允许"补"的部分）

- **P-30 新项目一键接入**：拼图其实都在——forge-prd 能生成项目 CLAUDE.md、doc-policy 规划了 init-project.sh（未实现）、install.sh 管 skill 注册。缺的是把它们串成一条 `/forge-init` 或 doc-policy 脚本兑现。这不算新功能，算兑现已规划未交付的承诺。

---

## 4. 优化方案总览（对应 TODO.md 阶段）

| 阶段 | 动作 | 解决的问题 | 预期效果 |
|---|---|---|---|
| P0 保命 | 审查+提交 6 周漂移；_shared 入链接清单；统一引用锚点；清仓库垃圾 | A-1/2/3、P-28/29、C 类路径 | 真源三点一致，断链清零 |
| P1 减重 | 四大件骨架化（≤15KB）+ references 按阶段加载；qa Mode A/B 拆分；description 全压缩；CLAUDE.md 收缩 | B 类全部、P-04/05/06/09/12/15、3.4-3 | 单次调用上下文成本降 60-75% |
| P1 顺手 | 修 E 类小病 + 死引用 | P-03/08/13/17/19/20/21 | 一致性 |
| P2 降门槛 | 兑现 init-project.sh → /forge-init；决策树轻量车道；dev/deliver 合并方案讨论 | P-01/02/10/11/27/30 | 新项目 1 条命令接入 |
| 验收 | 全新空项目端到端跑一个小需求 | — | 步数和上下文消耗可量化对比 |

> 注：dev/deliver 合并动作较大，建议单独讨论定案后再动手，不混入 P1。

---

## 5. 上游 Skill 对照（2026-07-04 调研）

Forge 的血统：融合了 4 个上游体系（详见 `external-tools-analysis.md` 和 `design-skill-fusion-methodology.md`）。上次全面对照是 **2026-03-26**，已过去 3 个多月。本次调研各家最新状态：

### 5.1 Superpowers（obra/superpowers）— 最大上游

- **现状**：v5.1.0（2026-05-04），v5 大版本 2026-03 发布，正好在我们融合之后。GitHub 22 万+ star，已进 Anthropic 官方插件市场，支持 8 个平台（Claude Code / Codex / Cursor / Gemini CLI 等）。
- **v5 关键变化（对 forge 有借鉴价值的）**：
  1. **砍掉了子代理审查循环**，改为内联自审——执行时间从约 25 分钟大幅压缩。方向与我们"只做减法"完全一致，也验证了 P1 瘦身的判断。
  2. **对抗性 spec 审查循环** + Spec 自审清单（约 30 秒抓 4-5 个 bug）→ forge-prd 第 3.5 步可借鉴。
  3. **可视化头脑风暴**：HTML 实物模型代替文字描述（零依赖 WebSocket 服务器）→ 与 forge-brainstorm Phase 4.5 的视觉决策层同方向，实现可对照。
  4. **子代理默认路由到更便宜的模型** → forge-dev 的 Agent 调度可加 model 参数，直接省钱。
  5. 技能数从 14 精简到 12（他们也在合并瘦身）。
- **建议**：P1 瘦身时对照其 v5 的骨架化写法；对抗性 spec 审查和模型路由列为 P2 后的增量融合候选。

### 5.2 gstack（garrytan/gstack）— 工作流上游

- **现状**：从我们融合时的 23 个 skill 扩展到 30+，新增了 /design-shotgun、/design-html、/land-and-deploy、/autoplan、/pair-agent、**/learn** 等。
- **⚠️ 现行问题**：文档记载 gstack/browse 浏览器引擎"保留在 ~/.claude/skills/gstack/"，但该目录已随本次 symlink 事故**整体丢失**，forge-qa/bugfix 引用的这个测试引擎实际不存在（新增问题 P-31）。选项：A) 从 garrytan/gstack 重装 browse；B) 从 forge-qa 引擎清单中删除该选项（已有 Playwright + browser-use 兜底）。倾向 B（减法原则）。
- **/learn 和 /retro 最新版**：与 fupan 重设计目标（去公式化、以提升用户能力为核心）直接相关，重设计时应先精读这两个的最新版。

### 5.3 frontend-design（anthropics/skills）— 设计观上游

- **现状**：Anthropic 官方仓库持续更新（近期有专项 PR 提升清晰度和可执行性）。核心理念仍是反 AI 千篇一律：排版承载个性、色彩敢于主导、先定美学方向再写代码。
- **建议**：P1 做 forge-design/design-impl 瘦身时，顺手拉最新版 SKILL.md 对照一遍反 AI 模板清单，增量更新措辞即可（融合原则本来就是"引用不内嵌"）。

### 5.4 ui-ux-pro-max（nextlevelbuilder/ui-ux-pro-max-skill）— 设计数据上游

- **现状**：v2.0+ 数据规模：67 风格 / 161 配色 / 57 字体搭配 / 99 UX 规则 / 25 图表 / 16 技术栈 / 161 条推理规则。旗舰功能 Design System Generator 就是我们 scripts/ 里那套 search.py + design_system.py。
- **P-07 结论（已定）**：**脚本保留**。search.py 是流程正经入口，design_system.py 是它的引擎，CSV 是查询库——这套"知识放数据文件、脚本按需查询、不占上下文"正是全家应该学习的模式。
- **建议**：P2 后做一次数据文件增量同步（对照上游 CSV 行数和字段）。

### 5.5 CKM 体系 — 低优先级

只融合了三层 Token 架构理念和 shadcn/ui 组件参考，其余已归档。理念类融合不易过时，本轮不动。

### 5.6 上游对照的总判断

1. **不需要推倒重来**。上游最大的动向（Superpowers v5 砍审查循环、精简技能数）恰恰是在向我们 P1 的方向走——"骨架化 + 减法"是行业共识，不是我们的偏方。
2. **更新方式沿用老原则**："外部 Skill 原封不动，引用不内嵌"（design-skill-fusion-methodology.md 1.2 节）——所以上游更新的吸收成本天然是低的。
3. **顺序**：先做完 P0/P1（自身健康），再做增量融合（P2 之后单开一批），避免在肥胖的文件上叠新东西。
4. 新增问题编号：**P-31**（gstack/browse 引擎丢失，forge-qa 引用悬空）。
