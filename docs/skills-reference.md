# 技能参考手册

本文档是 Doc-Driven Dev 体系所有 Skill 的完整参考。每个 Skill 按统一格式描述：触发方式、核心阶段、门控点、产出物。

---

## forge-prd — 产品诊断与 PRD 迭代

**命令**：`/forge-prd`
**触发词**：「更新PRD」「调整需求」「迭代PRD」或描述产品问题
**职责**：诊断产品问题根因 → 审查模块健康度 → 更新 PRD 文档

### 核心阶段

| 阶段 | 动作 | 门控 |
|------|------|------|
| Phase 0 | 定位项目 PRD 和 CHANGELOG | — |
| Phase 1 | 深度阅读代码，理解当前状态 | — |
| Phase 2 | 诊断根因 + 三层深度审查 | 用户确认诊断结论 |
| Phase 3 | 确认 PRD 修改方案 | 用户确认方案 |
| Phase 4 | 更新 PRD + CHANGELOG | — |

### 核心机制

**三层自适应审查**：
- **轻量**：改阈值、调文案 → 快速确认后直接更新
- **标准**：功能调整、多个小改动 → 模块健康度审查
- **深度**：新模块、架构调整 → 10 星挑战 + 假设审查
- **自动升级**：同一模块 CHANGELOG ≥3 版本反复修改 → 触发深度审查

**问题归因三分法**：
1. 产品设计缺陷（PRD 本身有问题）
2. 实现偏离 PRD（代码没按 PRD 做）
3. PRD 遗漏场景（PRD 没覆盖到）

**反驳机制**：认为需求不合理时直接说出来，给替代方案。

**双模式**：
- 迭代：已有 PRD → 读取 → 诊断 → 方案确认 → 更新
- 从零创建：无 PRD → 深度读代码 + 5 轮交互确认 → 完整 PRD

### Feature 状态管理

- 每个 feature 在 `.features/{id}/status.md` 跟踪
- 全局注册表 `.features/_registry.md`
- Heartbeat 机制支持多会话并行

### 产出

- `PRD.md` — 头部含版本迭代摘要 + 正文融入变更
- `PRD-CHANGELOG.md` — 完整决策历史

---

## forge-dev — 开发调度器

**命令**：`/forge-dev`
**触发词**：「开始开发」「实现需求」
**职责**：接力 PRD 变更 → 收集偏好 → 技术调研 → 调度子技能

### 核心阶段

| 阶段 | 动作 | 门控 |
|------|------|------|
| 第 0 步 | 读取 PRD 输出，判断项目类型 | — |
| 第 1 步 | Discussion：识别灰区，收集偏好 | 可跳过 |
| 第 2 步 | Research：四维调研 | 可跳过 |
| 第 3 步 | 分析 + 调度建议 | 用户确认执行计划 |
| 第 4 步 | Wave 并行调度（上下文工程） | — |
| 第 5 步 | 汇总交付 | 交付报告 |

### Discussion 阶段

灰区类型：视觉功能 / API 设计 / 数据处理 / 性能策略
产出 `CONTEXT.md`，可跳过（用户说"用默认"）

### Research 阶段（四维调研）

- 技术栈最佳实践（知识 + WebSearch）
- 架构模式推荐（知识 + 代码分析）
- 坑点和风险预警（知识 + WebSearch）
- 可复用代码分析（Glob/Grep/Read）
- 产出 `RESEARCH.md`

### 调度矩阵

| 变更类型 | 子技能组合 |
|---------|----------|
| 纯视觉调整 | forge-design |
| 新增/修改交互 | forge-design → forge-eng |
| 纯后端逻辑 | forge-eng |
| UI 功能变更 | forge-design → forge-eng → forge-qa |
| 新功能模块 | forge-design → forge-eng → forge-qa |
| Bug 修复 | forge-eng → forge-qa |

### 三种模式

- **交互**（默认）：3 个硬卡点暂停
- **自动**（`--auto`）：前置沟通后全自动
- **恢复**（`--resume`）：从 `.do-dev/state.json` 恢复

### 产出

- `vX.Y-CONTEXT.md` / `vX.Y-RESEARCH.md` / `delivery-report.md`

---

## forge-design — 全栈设计规划（自闭环）

**命令**：`/forge-design`
**触发词**：「设计」「更新设计」
**职责**：管理 DESIGN.md，产出像素级设计规范。**纯设计规划，不写代码。** 实现交给 forge-design-impl 或 do-eng。

**自闭环**：所有设计知识内嵌于 Skill 中，不依赖外部 Skill 调用。数据文件（配色库、字体库、UX规则、产品类型等）和搜索脚本均在 forge-design 目录内。

### 内嵌知识来源

| 来源 Skill | 内嵌的能力 | 用于步骤 |
|-----------|-----------|---------|
| `design-consultation` | 竞品调研方法论、3+美学方向探索、预览页生成 | 第1步 |
| `ui-ux-pro-max` | 99条UX规则(10类)、161配色方案、57字体搭配、搜索引擎 | 第1-2步 |
| `frontend-design` | 反AI-slop方法论、前端美学5维度 | 第2步 |
| `plan-design-review` | 0-10维度评分 + 满分标准解释 | 第3步 |
| `ckm-design-system` | 三层Token架构(primitive→semantic→component)、组件状态规范 | 第1步 |
| `ckm-ui-styling` | shadcn/ui组件选型参考、无障碍模式清单 | 第3步 |
| `web-design-guidelines` | 交付前合规检查 | 第5步 |

### 分级门控

| 级别 | 触发条件 | 流程 |
|------|---------|------|
| **L1 完整** | 新项目/新页面/新独立功能 | 竞品调研 → 美学探索 → 完整审计 → 0-10评审 → DESIGN.md |
| **L2 轻量** | 迭代已有功能/样式微调 | 读已有 DESIGN.md → 对照检查 → 快速审计(重点10项) |
| **L3 跳过** | 纯后端/API/无UI变更 | 直接跳过 |
| **自动升级** | 同一模块 PRD CHANGELOG ≥3次迭代 | L2 → L1 强制重新设计 |
| **子模块一致性** | 属于更大页面的子模块 | 读取父 DESIGN.md 约束，检查一致性 |

### 流程（6 步）

| 步骤 | 内容 | 门控 |
|------|------|------|
| 第0步 | 定位文档 + 门控级别判断 + 迭代不满检测 | — |
| 第1步 | 产品理解 → 竞品调研 → 美学方向(3+方案) → 配色字体搜索 → Token体系 → 多轮确认 | L1 必做 |
| 第2步 | 双层设计审计（80项清单 + 99条UX规则 + 美学5维度） | L1/L2 |
| 第3步 | 设计方案 + 0-10评审 + 子模块一致性 | L1 必做 |
| 第4步 | 更新 DESIGN.md + DESIGN-CHANGELOG + 可选预览页 | — |
| 第5步 | 设计质量评估（A-F评分 + 交付前清单） | L1: ≥B; L2: ≥C |
| 第6步 | 确认与总结 → 交由 forge-design-impl 或 forge-eng | — |

### 产出

- `DESIGN.md`（像素级规范：Token三层架构、组件状态表、响应式行为、动效参数）
- `DESIGN-CHANGELOG.md`
- 字体+配色 HTML 预览页（L1 模式可选）

### 数据资源（自带）

| 文件 | 内容 |
|------|------|
| `data/colors.csv` | 99种产品类型配色方案 |
| `data/typography.csv` | 57组字体搭配 |
| `data/styles.csv` | 50+种设计风格 |
| `data/ux-guidelines.csv` | 99条UX规则 |
| `data/products.csv` | 161种产品类型属性 |
| `scripts/search.py` | 设计资源搜索引擎 |

---

## 三B、forge-design-impl — 设计实现

**命令**：`/forge-design-impl`
**触发词**：「实现设计」「设计转代码」
**职责**：将 DESIGN.md 规范转化为代码。**只改样式和布局，不改业务逻辑。**

### 前置条件

- DESIGN.md 存在且通过 forge-design 审核（评分 ≥ B）

### 流程

| 步骤 | 内容 | 门控 |
|------|------|------|
| 第1步 | 读取 DESIGN.md，提取实现清单 | 用户确认清单 |
| 第2步 | 逐项实现（CSS优先 + Token驱动 + 反AI模板编码） | 每项自检 |
| 第3步 | 原子提交（每个逻辑单元一个 commit） | — |
| 第4步 | 质量验证（一致性检查 + AI痕迹扫描） | — |

### 核心原则

- **CSS 优先**：能用 CSS 解决的不改 HTML 结构
- **Token 驱动**：不硬编码颜色/字号/间距值
- **反 AI 模板**：主动避免泛用模式（三列等宽网格、紫色渐变、统一大圆角等）
- **shadcn/ui 组件推荐**：表单/布局/叠加层/反馈/导航/展示 6 类
- **DESIGN.md 是唯一真相源**：不"改进"设计，按文档实现

### 产出

- 样式/布局代码变更（原子提交）
- Token 引用率报告
- AI 痕迹检查结果

---

## forge-eng v2 — 工程文档与代码实现

**命令**：`/forge-eng`
**触发词**：「工程」「实现」「写代码」
**职责**：管理 ENGINEERING.md + Worktree 隔离 + 分级 TDD + Verification Gate + Wave 并行 + 原子提交

### 双模式

| 模式 | 触发条件 | 包含步骤 |
|------|---------|---------|
| **完整模式** | 有 PRD + ENGINEERING.md，或正式项目 | 全部 12 步 |
| **轻量模式** | 小 demo / POC / 快速实验 | Worktree → 任务拆分 → TDD → 提交 → 收尾 |

### 核心阶段（完整模式）

| 步骤 | 动作 | 门控 |
|------|------|------|
| 0 | 定位文档 | — |
| 0.5 | **模式选择**（完整/轻量） | — |
| 1 | 范围挑战（8+ 文件 = 警告） | 复杂度检查 |
| 2-4 | 理解现状 + 四章审查 | 每章暂停 |
| 5 | 更新工程文档 | — |
| 5.5 | **创建 Worktree**（会话级隔离） | .gitignore 检查 |
| 5.7 | **测试框架检测与引导** | 用户确认安装/跳过 |
| 6 | 任务拆分 + Wave 规划（含 **TDD 级别标注**） | 用户确认 |
| 7 | Wave 并行执行（**TDD + Verification Gate**） | 每任务验证 + Wave 间全量验证 |
| 8 | 必需产出 | — |
| 9 | 确认总结 | — |
| 10 | **分支收尾**（merge/PR/keep/discard） | 用户选择 |

### 三条铁律（来自 Superpowers）

1. **不先验证就不准声称完成** — 证据先于断言，禁用 "should work"
2. **不先写失败测试就不准写实现** — 严格 TDD 级别适用
3. **3 次修复失败就质疑架构** — 不打第 4 次补丁

### 分级 TDD

| 级别 | 触发条件 | 流程 |
|------|---------|------|
| **严格 TDD** | 后端 API / 数据处理 / Bug 修复 | RED → GREEN → REFACTOR |
| **轻量 TDD** | 前端组件 / 页面交互 | 实现 → 写关键测试 → 验证 |
| **验证驱动** | 无测试框架的项目 | 实现 → 执行验证命令 → 确认输出 |
| **跳过** | 纯样式 / 配置 / 文档 | 直接实现 |

### Worktree 隔离

- 每个 forge-eng 会话创建独立 worktree + 分支
- 多会话并行互不冲突
- 完成后选择 merge / PR / keep / discard

### 核心机制

**完整性原则（"把湖烧干"）**：AI 边际成本接近零 → 完整方案只多几分钟

**7 条工程思维**：爆炸半径直觉 / 无聊优先 / 增量而非革命 / 系统而非英雄 / 可逆性偏好 / DX就是产品质量 / 先让修改变简单

**三个必需产出**：未纳入范围清单 / 已存在内容清单 / 故障模式清单

### 辅助资源

| 文件 | 内容 |
|------|------|
| `references/tdd-guide.md` | TDD 红绿重构详细指南 + rationalization 对照 + 测试框架安装 |
| `references/worktree-guide.md` | Worktree 创建/清理命令参考 + 安全检查 |
| `references/verification-checklist.md` | Verification Gate 完整检查清单 + 禁用措辞 |
| `references/engineering-template.md` | ENGINEERING.md 模板 |

### 产出

- `ENGINEERING.md` + `ENGINEERING-CHANGELOG.md`（完整模式）
- Worktree 隔离分支 + 原子 Git commits
- 测试（严格/轻量 TDD 产出）或验证记录（验证驱动产出）

---

## forge-qa — QA 文档与测试执行

**命令**：`/forge-qa`
**触发词**：「测试」「QA」
**职责**：管理 QA.md + 三引擎测试 + Bug 修复

### 三种测试引擎

1. **gstack/browse**（无头浏览器）：截图、视觉回归、E2E
2. **Playwright**：可编程 E2E、交互验证
3. **纯代码测试**：项目测试框架（始终可用）

降级链：gstack → Playwright → 纯代码

### 测试级别

- **快速**：仅严重问题
- **标准**：+ 中等问题 + 边界
- **详尽**：+ 外观 + 响应式 + 性能

### Diff-aware 模式

分析 `git diff` → 定位受影响页面 → 只测变更区域 + 核心回归

### 5 维度健康评分

功能(40%) / 安全(20%) / 性能(15%) / 可维护性(15%) / UX(10%)

上线判定：✅ ≥80 / ⚠️ 60-79 / ❌ <60

### 产出

- `QA.md` + `QA-CHANGELOG.md`
- Bug 记录（分级 + 步骤 + 截图）

---

## 六、forge-bugfix — 系统性 Bug 调查与修复

**命令**：`/forge-bugfix`
**铁律**：不做根因分析就不写修复代码

### 核心机制

- 每个 bug 独立 `docs/bugfix/reviews/BF-XX.md` Bug 修复验收报告
- 每个 bug 独立 worktree、独立 TDD、独立 commit、独立 QA 回归
- `docs/bugfix/backlog.md` 做任务池和状态看板
- `.forge/active.md` 做多会话功能域判重
- forge-qa 发现 bug 可结构化交给 forge-bugfix 自动闭环
- bug 多时可用批次汇总做最终一次人工验收

### 关键阶段

| 阶段 | 动作 | 门控 |
|------|------|------|
| P0 | 环境探测 + active.md 并行巡检 | — |
| P1 | 问题理解 + 上下文 | 读 PRD/ENG/backlog |
| P2 | 范围推荐 + 功能域判重 | 一次只修一个 bug，除非同根举证 |
| P2.5 | 创建/更新 Bug 修复验收报告 | 没有报告不进 worktree |
| P3 | 创建 worktree + 复现 + dev server 身份核对 | 必须能复现 |
| P4 | 根因追踪 + 5 Whys + 方案确认 | 不做根因不写代码 |
| P5 | 独立 TDD 驱动修复 + 原子提交 | RED/GREEN 证据 |
| P6 | forge-qa Mode B 回归 | 截图、断言、前后端环境一致 |
| P6.5 | 单 bug 人工验收或批次待最终验收 | 用户/批次最终结论 |

### 模式检查清单（8 项）

竞态条件 / 空值传播 / 状态不同步 / 缓存过期 / 类型强转 / 资源泄漏 / 边界溢出 / 编码问题

---

## 七、forge-review — 代码审查

**命令**：`/forge-review`
**职责**：分析 diff，检查测试捕获不到的结构性问题

### 两轮审查

**第一轮（严重，8 类）**：SQL 注入 / 竞态 / LLM 信任边界 / 枚举完整性 / 资源泄漏 / 认证绕过 / 数据一致性 / 错误吞没

**第二轮（信息，9 类）**：副作用 / 魔法数字 / 死代码 / 测试缺口 / 前端安全 / 性能隐患 / 日志质量 / 文档过期 / 命名不一致

**修复策略**：AUTO-FIX（机械性）/ ASK（有权衡）

---

## 七·五、forge-status — 并行会话巡检（v6.0 新增）

**命令**：`/forge-status`
**职责**：读 `.forge/active.md` 心跳文件，按硬信号（worktree 目录存在性 + 分支合并状态）判定哪些并行会话登记是活跃、哪些是僵尸，交互确认后清理。

### 触发场景

- 用户主动：早上打开电脑查看并行状态、手动清理过 worktree 后同步 active
- 其他 skill 调用（只读）：forge-bugfix 的 P0 阶段调用，只报告不清理

### 硬信号（不使用时间戳）

- worktree 目录不存在 → 真·已弃用
- 分支已 `merged` 到 main → 真·已完成，漏清理
- 两者都不满足 → 真·活跃，保留

### backlog.md 联动

清理 active.md 时同步更新 `docs/bugfix/backlog.md`：
- 已合并 → 状态改 `resolved`，剪切到"已处理"区
- 已删除（未合并）→ 状态回 `pending`，清空"领取会话"

---

## 八、forge-ship — 发布工作流

**命令**：`/forge-ship`
**职责**：合并基础分支 → 测试 → CHANGELOG → PR

### 8 步流程

0. 确定基础分支
1. 就绪检查
2. 合并基础分支
3. 运行测试
4. Diff 自查
5. 更新 CHANGELOG
6. 最终 commit
7. Push + 创建 PR
8. 交付总结

---

## 九、forge-deliver — 端到端交付流水线

**命令**：`/forge-deliver`
**职责**：从想法到上线，9 Phase 全自动

| Phase | 调用 |
|-------|------|
| 0 | 前置沟通 |
| 1-2 | forge-prd（需求 + 产品审查） |
| 3 | forge-design（设计） |
| 4-5 | forge-eng（工程 + 实现） |
| 6 | forge-qa（QA） |
| 7 | forge-review（审查） |
| 8 | forge-ship（发布） |
| 9 | cn-doc-release（文档） |

模式：交互（3 检查点）/ 自动（`--auto`）

---

## 十、cn-retro — 工程周复盘

**命令**：`/forge-retro`
**职责**：提交分析 → 质量趋势 → 按人贡献 → 复盘报告

Phase 0-6：范围 → 提交分析 → 质量趋势 → 按人贡献 → 亮点/低谷 → 下周聚焦 → 持久化

---

## 十一、cn-doc-release — 发布后文档同步

**命令**：`/forge-doc-release`
**职责**：发布后同步文档，确保文档与代码一致

Phase 0-9：基础分支 → diff 分析 → 逐文件审计 → 自动更新 → 确认变更 → CHANGELOG 润色 → 一致性检查 → TODOS 清理 → VERSION → Commit

---

## 共享机制：视觉决策层

**路径**：`skills/_shared/visual-decision-layer.md`
**配套脚本**：`skills/_shared/generate_image2.py`

### 使用原则

- 流程、因果链、状态机、知识地图优先用 Mermaid / show-widget。
- UI 首屏、复杂组件、空态/错态、品牌气质和复盘学习图可用 Image 2 做前置判断。
- Image 2 只辅助人工确认方向，不作为 QA 通过证据。
- 实现后必须用真实截图、CSS 属性和行为断言替代概念图作为事实证据。

### 接入位置

- `/forge-brainstorm`：在用户需要“看见才好判断”时产出结构图或概念图。
- `/forge-prd`：在 Feature Spec 中记录视觉决策需求和已有图链接。
- `/forge-design`：新页面/组件/状态执行 Image 2 视觉稿门禁。
- `/forge-design-impl` / `/forge-eng`：读取视觉稿作为观感参考，以 DESIGN.md 和真实截图收口。
- `/forge-qa`：把视觉稿写入“视觉意图参考”，pass/fail 只看真实证据。
- `/forge-fupan`：按需生成学习图或决策路径图，帮助长期回看。

---

## 十二、fupan — 协作复盘与知识沉淀

**命令**：`/forge-fupan`
**触发词**：「复盘」「总结知识」
**职责**：提取会话背景 → 打开本地 Workbench 确认学习地图 → 按用户选择调研 → 结构化复盘

### 复盘闭环

```
做项目 → /forge-fupan → 页面确认想学什么 → 生成复盘 → 网页回看历史 → 反哺 Skill
```

### Fupan Workbench

- 本地服务默认只监听 `127.0.0.1`。
- 首页展示待确认复盘任务和历史复盘。
- 用户在页面中选择知识区数量和学习深度：`了解 / 表达 / 复现`。
- AI 只轮询自己创建的 task ID；多个复盘任务可以并存。
- FastAPI/Uvicorn 不可用时，降级为对话内确认。
