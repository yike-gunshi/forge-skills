# 外部工具体系分析 — Superpowers · gstack · CKM · 独立 Skill

> 本文档记录所有被 Forge 体系融合的外部 Skill 的详细分析，包括能力拆解、融合去向和归档位置。
> 作为 Forge 的知识溯源文档，未来外部 Skill 更新时参照本文进行增量融合。

---

## 一、Superpowers 体系

### 1.1 整体架构

Superpowers 是一套**严格线性 + 门控审查**的开发流程框架。

- **4 个阶段**：设计（Design）→ 开发（Development）→ 审查（Review）→ 收尾（Landing）
- **入口看门狗**：`using-superpowers`（每次对话自动触发，判断调用哪些子技能）
- **元技能**：`writing-skills`（用 TDD 方法编写新 Skill）
- **核心理念**：模型路闭——限制 AI 自由度，关闭 rationalization 的逃生口

### 1.2 五条铁律

| # | 铁律 | 含义 |
|---|------|------|
| 1 | 不先设计就写代码 | brainstorming → spec → 批准 → 才能写代码 |
| 2 | 不先写失败测试就写实现 | TDD 红绿重构，失败测试是前提 |
| 3 | 不先验证就声称完成 | 运行命令 → 读输出 → 确认 exit code → 才能说"完成" |
| 4 | 不先找根因就提出修复 | systematic-debugging 的核心纪律 |
| 5 | 不先技术评估就实施审查反馈 | 收到 code review 不盲从，先验证反馈是否正确 |

> "违反字面意思就是违反精神。绝不 rationalize 跳过。"

### 1.3 14 个子技能详解

#### 设计阶段（3 个）

**1. brainstorming**
- 职责：逐问细化用户意图 → 提出 2-3 方案 → 分段呈现设计 → 写 spec
- 关键机制：一次一个问题（优先选择题）、YAGNI 原则、spec 自审（占位符/矛盾/模糊/范围）
- 产出：`docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
- → **融合到 forge-brainstorm**（Phase 1-4：逐问细化、方案生成、spec 自审）

**2. writing-plans**
- 职责：读 spec → 拆任务 → 依赖分析 → 写 plan 文档
- 关键机制：每个任务必须有验证命令、任务间依赖图
- → **融合到 forge-eng**（第 6 步任务拆分 + Wave 规划）

**3. using-superpowers（看门狗）**
- 职责：每次对话开始自动触发，扫描可用 Skill，判断当前应调用哪些
- 关键机制：创建 TodoWrite 跟踪进度、强制在任何响应前先调用相关 Skill
- → **融合到 forge**（总入口状态检测 + 推荐下一步）

#### 开发阶段（5 个）

**4. using-git-worktrees**
- 职责：创建隔离工作目录，安全验证，环境初始化
- 关键机制：
  - 优先用 `.worktrees/` 目录
  - 自动检查 `.gitignore` 是否包含 worktree 目录
  - `git worktree add <path> -b <branch>` 一条命令创建分支+目录
  - 自动检测项目类型并跑 `npm install` / `pip install`
  - 基线测试验证
- → **融合到 forge-eng**（第 5.5 步：创建 Worktree）

**5. test-driven-development**
- 职责：红绿重构铁律
- 关键机制：
  - 不先写失败测试不准写实现代码
  - 写了就删除重来
  - RED（写失败测试）→ GREEN（最小实现）→ REFACTOR（保持绿色）
- → **融合到 forge-eng**（四级 TDD：严格/轻量/验证驱动/跳过）
- 注：Forge 增加了"验证驱动"级别，适配无测试框架的项目

**6. systematic-debugging**
- 职责：根因分析 → 假设 → 验证，铁律：不找根因不写修复
- 关键机制：收集证据 → 形成假设 → 最小实验验证 → 排除其他可能 → 修复
- → **已有 forge-bugfix 覆盖**（更详细的 6 阶段流程）

**7. subagent-driven-development**
- 职责：每个任务启动新 Agent，双阶段审查
- 关键机制：
  - Spec Reviewer：检查实现是否符合规格
  - Code Quality Reviewer：检查代码质量
  - 3 次修复不过 → 质疑架构而非继续打补丁
- → **部分融合到 forge-eng**（Wave 并行执行的 Agent 模板）

**8. executing-plans**
- 职责：独立会话执行 plan，每批 3 任务，批间审查
- 关键机制：
  - 批间暂停：展示已完成内容，等用户说 "continue"
  - 每批完成后的 diff 审查
- → **融合到 forge-eng**（Wave 执行 + 批间暂停概念）

**9. dispatching-parallel-agents**
- 职责：2+ 独立任务并行执行
- 关键机制：判断任务是否真正独立（无共享状态）→ 并行启动 Agent
- → **融合到 forge-eng**（Wave 内并行 Agent）

**10. verification-before-completion**
- 职责：完成前强制验证
- 关键机制：
  - 运行验证命令 → 读完整输出 → 确认 exit code
  - 禁用措辞："should work"、"probably fixed"、"seems to pass"
  - 必须措辞："验证通过：{命令} 输出 {结果}，exit code 0"
- → **融合到 forge-eng**（Verification Gate，每个原子 commit 前）

#### 审查阶段（2 个）

**11. requesting-code-review**
- 职责：派遣 reviewer subagent 独立审查
- 关键机制：Critical 立即修、Important 修后才继续
- → **融合到 forge-review**

**12. receiving-code-review**
- 职责：收到审查反馈时的处理纪律
- 关键机制：先验证反馈的技术正确性再实施，技术性 pushback
- → **融合到 forge-review**

#### 收尾阶段（1 个）

**13. finishing-a-development-branch**
- 职责：完成后分支处理
- 关键机制：4 选项——Merge / PR / Keep / Discard
- → **融合到 forge-eng**（第 10 步分支收尾）

#### 元技能（1 个）

**14. writing-skills**
- 职责：用 TDD 方法编写新 Skill
- 关键机制：
  - RED：先不给 skill，观察 AI 怎么 rationalize 错误行为
  - GREEN：写最小 skill 堵住这些 rationalization
  - REFACTOR：发现新漏洞，添加 counter-rule
- → **未直接融合**，作为方法论参考（见 `design-skill-fusion-methodology.md`）

### 1.4 Superpowers 中文版（superpowers-cn）

14 个 skill 的中文翻译版，内容完全对应英文版。已全部归档。

---

## 二、gstack 体系

### 2.1 核心能力：浏览器引擎

**gstack/browse** 是一个无头浏览器引擎（~100ms/命令），支持：
- 导航任意 URL
- 元素交互（点击、输入、滚动）
- 截图（全页/区域/标注）
- 状态断言
- 前后 diff
- 响应式测试

**保留在 `~/.claude/skills/gstack/`**，被 forge-qa 和 forge-bugfix 依赖。

### 2.2 工作流 Skill（12 个，已融合或归档）

| Skill | 核心能力 | 融合去向 |
|-------|---------|---------|
| **office-hours** | YC 诊断 6 问 + Builder 设计思维 + 反谄媚 + Pushback 5 模板 + 前提挑战 + 景观搜索 + 对抗性审查 + 急躁逃生口 | forge-brainstorm（产品模式问题、Pushback、对抗性审查） |
| **plan-ceo-review** | 梦想状态映射 + 18 条 CEO 认知模式 + 前提挑战增强版 + 4 种范围模式（扩张/选择性扩张/锁定/精简） | forge-brainstorm（Phase 3 前提挑战、精选思维工具） |
| **plan-design-review** | 每维度 0-10 评分 + "10 分是什么样"展示 + 交互审查 | forge-design（第 3 步方案确认的 0-10 评分） |
| **design-consultation** | 产品理解 → 竞品调研 → 3+ 美学方向 → 字体/配色预览页 → DESIGN.md | forge-design（竞品调研、美学方向探索、预览页生成） |
| **frontend-design** | 反 AI-slop 方法论 + 前端美学 5 维度 + 字体黑名单 + 实现复杂度匹配 | forge-design（反 AI-slop）+ forge-design-impl（编码指导） |
| **investigate** | 四阶段：investigate → analyze → hypothesize → implement | forge-bugfix 覆盖（更详细的 6 阶段） |
| **qa / qa-only** | 三级 QA（Quick/Standard/Exhaustive）+ 修复循环 | forge-qa 覆盖（纯验收模式） |
| **review** | PR diff 分析：SQL 安全 / 竞态 / LLM 边界 | forge-review 覆盖 |
| **ship** | 合并 base → 测试 → CHANGELOG → PR | forge-ship 覆盖 |
| **document-release** | 发布后文档同步 | forge-doc-release 覆盖 |
| **retro** | 工程周复盘 + 趋势追踪 | forge-fupan 覆盖 |
| **其他** | benchmark/canary/careful/freeze/guard/unfreeze/codex/setup-* | 归档，可通过 gstack 子命令按需调用 |

### 2.3 gstack 的主动推荐机制

gstack 的 SKILL.md 包含一个"阶段 → 推荐 skill"的映射表。这个机制被 **forge（总入口）** 替代——forge 根据项目状态推荐 forge-* skill。

---

## 三、CKM 体系

CKM（Creative Knowledge Management）是一套品牌和设计资产管理工具。

### 3.1 设计类（3 个）

| Skill                 | 核心能力                                                                      | 融合去向                            |
| --------------------- | ------------------------------------------------------------------------- | ------------------------------- |
| **ckm-design**        | 品牌 · Logo（55 种风格）· CIP（50+ 交付物）· Banner（22 种风格）· 图标（15 种）· 社交图片           | 归档。Forge 聚焦产品 UI，不做品牌资产         |
| **ckm-ui-styling**    | shadcn/ui 组件库（基于 Radix UI + Tailwind）· 6 类组件 · 主题 · 暗色模式 · 无障碍            | forge-design（组件选型参考 + 无障碍清单）    |
| **ckm-design-system** | 三层 Token 架构：Primitive → Semantic → Component · CSS 变量 · 间距/排版比例尺 · 组件状态定义 | forge-design（Token 体系 + 组件状态规范） |

### 3.2 其他（3 个）

| Skill | 核心能力 | 融合去向 |
|-------|---------|---------|
| **ckm-brand** | 品牌声音 / 视觉识别 / 消息框架 | 归档 |
| **ckm-slides** | HTML 演示文稿 + Chart.js + 设计 Token | 归档 |
| **ckm-banner-design** | 多平台 Banner 设计（22 种风格）| 归档 |

---

## 四、独立设计 Skill

### 4.1 ui-ux-pro-max（最大的设计知识库）

**规模**：
- 50+ 设计风格
- 161 个配色方案（按产品类型 + 按风格分类）
- 57 组字体搭配（heading + body）
- 99 条 UX 规则（10 大类）
- 25 种图表类型（含适用场景 + 反面模式 + 无障碍指导）
- 10 个技术栈指导
- 搜索引擎（`search.py` + 8 个 CSV 数据文件）

**99 条 UX 规则的 10 大类**：

| 分类 | 优先级 | 条数 | 示例 |
|------|--------|------|------|
| 无障碍 | CRITICAL | ~12 | 颜色对比度、屏幕阅读器、键盘导航 |
| 触摸交互 | CRITICAL | ~8 | 触摸目标尺寸、手势反馈 |
| 性能 | HIGH | ~10 | 图片懒加载、字体加载策略 |
| 风格选择 | HIGH | ~10 | 风格一致性、品牌对齐 |
| 布局 | HIGH | ~12 | 响应式断点、网格系统 |
| 排版颜色 | MEDIUM | ~10 | 行高、字体层级、颜色语义 |
| 动效 | MEDIUM | ~8 | 过渡时间、减少动画偏好 |
| 表单反馈 | MEDIUM | ~10 | 即时验证、错误信息位置 |
| 导航 | HIGH | ~10 | 面包屑、活跃状态、返回操作 |
| 图表 | LOW | ~9 | 图表类型选择、数据墨水比 |

**融合方式**：
- ✅ 8 个 CSV 数据文件 + 3 个 Python 脚本 → 完整复制到 `forge-design/data/` 和 `forge-design/scripts/`
- ✅ 99 条 UX 规则 → 融合到 forge-design 设计审计环节
- ✅ 配色/字体/风格搜索 → 融合到 forge-design "从零创建"阶段
- ✅ 产品类型匹配逻辑 → 融合到 forge-design 第 1 步
- ✅ 交付前检查清单 → 融合到 forge-design 第 6 步质量评估
- ❌ 不融合：10 个技术栈的代码模板（属于 forge-eng 领域）

### 4.2 web-design-guidelines

- 实时从 GitHub 拉取 Vercel 的 Web Interface Guidelines
- 逐文件合规检查，输出 `file:line` 格式
- → 交付前合规检查理念融合到 forge-design 第 6 步

### 4.3 其他已归档

| Skill | 归档原因 |
|-------|---------|
| algorithmic-art | 特殊场景（p5.js 生成式艺术），不在主流程 |
| brand-guidelines | Anthropic 品牌专用 |
| canvas-design | 静态海报/艺术设计，不在产品 UI 范围 |
| theme-factory | 主题工厂，能力已被 forge-design Token 体系覆盖 |
| web-artifacts-builder | claude.ai 专用 artifact 构建 |
| remotion-best-practices | Remotion 视频专用 |

---

## 五、归档位置

| 位置 | 内容 | 条目数 |
|------|------|--------|
| `~/.claude/_archive-skills/superpowers/` | Superpowers 英文版源目录 | 14 个子 Skill |
| `~/.claude/_archive-skills/superpowers-cn/` | Superpowers 中文版源目录 | 14 个子 Skill |
| `~/.claude/_archive-skills/fused/` | 已融合进 Forge 的外部设计 Skill | 15 个目录 |
| `~/.claude/_archive-skills/unused/` | 不常用 Skill | 9 个目录 |
| `~/.claude/_archive-skills/fupan` | 旧版 fupan 独立安装 | 1 个目录 |
| `~/.claude/_archive-skills/prd-review.md` | 旧版 PRD 审查（散文件） | 1 个文件 |
| `~/.claude/_archive-skills/video-gen-seedance-2-0.md` | 视频生成 Prompt（散文件） | 1 个文件 |
| `workspace/.claude/_archive-skills/old-skills/` | 旧版 do-*/cn-*/up-* 工作流 | 20 个目录 |

---

## 六、融合全景映射表

| 来源 | Skill 名称 | 核心能力（一句话） | 融合到 | 方式 |
|------|-----------|-------------------|--------|------|
| Superpowers | brainstorming | 逐问细化→方案→spec | forge-brainstorm | 整合 |
| Superpowers | writing-plans | spec→任务拆分→plan | forge-eng | 整合 |
| Superpowers | using-superpowers | 对话看门狗+skill调度 | forge | 整合 |
| Superpowers | using-git-worktrees | 隔离工作目录+安全验证 | forge-eng | 整合 |
| Superpowers | test-driven-development | 红绿重构铁律 | forge-eng | 整合 |
| Superpowers | systematic-debugging | 根因分析+假设验证 | forge-bugfix | 参考 |
| Superpowers | subagent-driven-development | 双阶段审查 | forge-eng | 部分整合 |
| Superpowers | executing-plans | 批间审查+独立会话 | forge-eng | 整合 |
| Superpowers | dispatching-parallel-agents | 并行Agent调度 | forge-eng | 整合 |
| Superpowers | verification-before-completion | 完成前强制验证 | forge-eng | 整合 |
| Superpowers | requesting-code-review | 派遣reviewer | forge-review | 参考 |
| Superpowers | receiving-code-review | 技术性pushback | forge-review | 参考 |
| Superpowers | finishing-a-development-branch | 分支4选项 | forge-eng | 整合 |
| Superpowers | writing-skills | TDD写Skill方法论 | — | 方法论参考 |
| gstack | office-hours | YC诊断6问+Builder+Pushback | forge-brainstorm | 整合 |
| gstack | plan-ceo-review | 梦想映射+CEO认知模式 | forge-brainstorm | 部分整合 |
| gstack | plan-design-review | 0-10评分+满分标准 | forge-design | 整合 |
| gstack | design-consultation | 竞品调研+美学方向+预览页 | forge-design | 整合 |
| gstack | frontend-design | 反AI-slop+美学5维度 | forge-design + impl | 整合 |
| gstack | investigate | 四阶段调试 | forge-bugfix | 参考 |
| gstack | qa/qa-only | 三级QA+修复循环 | forge-qa | 参考 |
| gstack | review | PR审查 | forge-review | 参考 |
| gstack | ship | 合并+测试+PR | forge-ship | 参考 |
| gstack | document-release | 发布后文档同步 | forge-doc-release | 参考 |
| gstack | retro | 工程周复盘 | forge-fupan | 参考 |
| gstack | browse | 无头浏览器引擎 | forge-qa/bugfix | 依赖保留 |
| CKM | ckm-ui-styling | shadcn/ui+Tailwind+无障碍 | forge-design | 部分整合 |
| CKM | ckm-design-system | 三层Token架构 | forge-design | 整合 |
| CKM | ckm-design | 品牌Logo/CIP/Banner | — | 归档 |
| CKM | ckm-brand | 品牌声音/识别 | — | 归档 |
| CKM | ckm-slides | HTML演示文稿 | — | 归档 |
| CKM | ckm-banner-design | 多平台Banner | — | 归档 |
| 独立 | ui-ux-pro-max | 99条UX+161配色+搜索引擎 | forge-design | 整合（含数据） |
| 独立 | web-design-guidelines | Vercel规范合规 | forge-design | 部分整合 |
| 独立 | algorithmic-art | p5.js生成式艺术 | — | 归档 |
| 独立 | brand-guidelines | Anthropic品牌 | — | 归档 |
| 独立 | canvas-design | 静态海报设计 | — | 归档 |
| 独立 | theme-factory | 主题工厂 | — | 归档 |
