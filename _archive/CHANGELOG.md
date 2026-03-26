# 文档驱动开发工作流 — 变更日志

## [v1.3] - 2026-03-21

### 变更背景

v1.2 设计了 `.features/` 目录架构和 Git Worktree 方案，但 5 个 skill 的 SKILL.md 仍然使用旧的"领域文档内嵌状态"机制（在 PRD.md/DESIGN.md/ENGINEERING.md/QA.md 顶部写运行状态区块）。这在多会话并行场景下会导致文件写冲突和状态覆盖。

### 设计方案

**将所有 5 个 skill 的状态管理从"领域文档内嵌"迁移到 `.features/` 独立管理。**

### 关键决策

| 议题 | 决定 | 原因 |
|------|------|------|
| 状态写入位置 | `.features/{id}/status.md` | 领域文档只存内容，避免多会话写冲突 |
| up-prd 职责 | Feature 创建者（mkdir + 注册 + 版本预留） | up-prd 是流程入口，最适合初始化 feature |
| do-dev 新职责 | 孤儿检测（30分钟心跳超时） | 惰性检测，不需要守护进程 |
| do-eng 任务表 | 在 status.md 中追加 Engineering Tasks 表 | 让 do-dev 和 do-qa 能感知任务级进度 |
| do-qa Bug 表 | 在 status.md 中追加 QA Items 表 | 让 do-dev 能感知 Bug 修复进度 |
| Heartbeat | 每次状态变更同步更新 _registry.md | 最低成本的活跃检测 |

### 影响范围

- **up-prd**：新增 Feature 创建流程（第0步额外操作）
- **do-dev**：新增孤儿检测、status.md 读写、前置脚本检查 `.features/`
- **do-design**：状态写入 status.md design 行，不再写 DESIGN.md 顶部
- **do-eng**：状态写入 status.md eng 行 + Engineering Tasks 表
- **do-qa**：状态写入 status.md qa 行 + QA Items 表
- **使用手册**：更新文档体系结构、新增多会话并行说明和 FAQ

---

## [v1.2] - 2026-03-21

### 变更背景

用户的工作模式是同时开多个 Claude Code 会话并行处理不同功能方向。在单一 git 分支上同时操作导致：文件写冲突、状态混乱、版本号竞争、依赖误判。需要引入代码级和状态级的双层隔离机制。

### 设计方案

**代码隔离层：Git Worktree**
- 每个 feature 在独立 worktree + 分支中开发，共享 .git 数据库（磁盘开销极小）
- 三种使用方式：`claude -w`（推荐）/ `Agent(isolation: "worktree")` / 手动管理
- 合并策略：先合大改动分支，小分支 rebase
- 分支命名：`feat/<project>-<feature-name>`

**状态隔离层：.features/ 目录**
- 运行状态从领域文档中拆出，改为 feature-scoped 的独立 status.md
- `_registry.md` 全局注册表让所有会话互相感知
- Heartbeat 机制：>30 分钟无更新视为可能孤儿（惰性检测，不需要守护进程）
- 版本号预留机制：up-prd 创建时预留版本号，不回收

### 关键决策

| 决策 | 结论 | 原因 |
|------|------|------|
| 代码隔离方案 | Git Worktree | 经测试 `claude -w` / `Agent isolation: worktree` / 手动全部可行，原生支持 |
| 状态存储位置 | .features/ 独立目录 | 领域文档内嵌状态导致多会话写冲突、依赖误判 |
| 孤儿检测 | 惰性 heartbeat | 不引入守护进程，每个 skill 启动时检查 |
| .features/ 是否 gitignore | 不忽略（提交到 git） | 多设备同步时需要看到 feature 状态 |
| Worktree 目录 | .claude/worktrees/ | 已有 .claude 约定，加入 .gitignore |

### 影响范围

- 新增 `docs/多会话并行规范.md` — 完整的 worktree + .features/ 使用指南
- `.gitignore` — 新增 `.claude/worktrees/` 排除
- `docs/PRD.md` — 更新至 v1.2，新增多会话架构章节
- 待更新：5 个 SKILL.md 需要集成 .features/ 状态管理（替换当前的文档内嵌状态）

---

## [v1.1] - 2026-03-20

### 变更背景

用户在创建初始版本后，对比了 GSD（Get Shit Done）框架，发现几个关键差距：
1. 没有上下文工程机制，长会话中质量会劣化
2. 没有 Research 阶段，规划前缺乏技术调研
3. 代码实现是顺序执行的，没有任务拆分和并行能力
4. 没有原子 Git 提交，无法精确追踪变更

### 设计方案

**P0 — 上下文工程（do-dev）**
- do-dev 调度子 skill 时使用 Agent 工具启动独立上下文
- 主调度器只做编排（~30-40% 上下文利用率），不做具体实现
- 子 agent 通过文件路径传递上下文，而非在同一会话中传递

**P1 — Research 阶段（do-dev）**
- 新增 Discussion 阶段：在调研前结构化收集用户偏好，识别灰区
- 新增 Research 阶段：四维技术调研（技术栈/架构模式/坑点/可复用代码），prompt 驱动而非拉子 agent
- 产出 CONTEXT.md 和 RESEARCH.md，供下游 skill 参考

**P2 — 任务拆分 + Wave 并行 + 原子 Git（do-eng）**
- 实现计划拆分为原子任务（垂直切片优先，每任务 1-3 个文件）
- 分析依赖关系，独立任务归为同一 Wave 并行执行
- 每个任务完成后立刻独立 git commit（feat/fix/refactor 等格式）
- Wave 间验证：运行验证命令 + 检查冲突 + 自动修复

### 关键决策

| 决策 | 结论 | 原因 |
|------|------|------|
| Research 放在 do-dev 还是 up-prd | do-dev | up-prd 管"做什么"，Research 管"怎么做好"，时序上 PRD 确定后才知道调研方向 |
| 子 skill 执行方式 | Agent 独立上下文 | 解决 context rot，参考 GSD 的核心设计 |
| 任务拆分粒度 | 1-3 个文件/任务 | 足够小可在单上下文完成，足够大有独立验证价值 |
| Git 提交策略 | 每任务独立 commit | 支持 bisect、独立回滚、清晰 git 历史 |

### 影响范围

- do-dev/SKILL.md — 重写（新增 Discussion/Research/Wave/上下文工程）
- do-eng/SKILL.md — 重写（新增任务拆分/Wave 并行/原子 Git）
- docs/document-driven-dev-guide.md — 更新（同步新流程）

---

## [v1.0.1] - 2026-03-20

### 变更背景

用户对比了 cn-plan-design、cn-plan-eng、cn-qa、cn-deliver 等参考 skill，发现 do-* 系列的方法论内容过于简化，缺失大量关键审查机制。

### 设计方案

逐个补齐每个 do-* skill 缺失的方法论内容：
- do-design：认知模式从 5 条恢复到 12 条，新增 80 项审计清单、A-F 评分、设计批评格式
- do-eng：思维框架从 5 条恢复到 7 条，新增范围挑战、四章审查、3 个必需产出
- do-qa：新增 5 维度健康评分、浏览器测试命令、Bug 登记格式、原子修复流程
- do-dev：新增前置脚本、双模式、恢复模式、状态管理、检查点机制

### 关键决策

| 决策 | 结论 | 原因 |
|------|------|------|
| 是否完整照搬参考 skill | 参考改造，不照搬 | 需要适配文档驱动场景，保留核心方法论但调整流程 |
| 方法论深度 | 保留完整细节 | 初版过于精简导致审查能力不足，口号式原则没有可操作性 |

---

## [v1.0] - 2026-03-20

### 变更背景

用户需要一套完整的文档驱动开发 skill 体系，能够从产品需求诊断到设计、工程、QA 全流程自动调度。

### 设计方案

构建 5 个 skill：
1. **up-prd**：产品诊断与 PRD 迭代（三层审查 + CHANGELOG 热点 + 反驳机制）
2. **do-dev**：开发调度器（半自动编排 + 状态管理）
3. **do-design**：设计文档管理 + 样式实现
4. **do-eng**：工程文档管理 + 代码实现
5. **do-qa**：QA 文档管理 + 测试执行

### 关键决策

| 决策 | 结论 | 原因 |
|------|------|------|
| 前后端文档分开还是合并 | 合并为 ENGINEERING.md | 用户项目多数全栈，前后端耦合度高 |
| 调度器智能程度 | 半自动（列计划→用户确认→执行） | 用户要求关键决策由人确认 |
| PRD 和 CHANGELOG 是否合并 | 分离 + PRD 内嵌迭代摘要 | 方案 C：PRD 干净 + 快速定位变更 + 历史有 CHANGELOG 兜底 |
| 迭代摘要保留策略 | 保留所有版本 | 用户明确要求，便于下游 agent 了解演进 |
| 文档面向对象 | 统一面向 Agent | 不分人工区/Agent区，确认后的信息 + 补充内容统一写入 |
| 每个 skill 是否可独立使用 | 是 | 有时只想改设计或只跑测试 |

### 与用户的关键讨论

1. **PRD CHANGELOG 格式**：用户要求两部分——独立的 changelog（时间/背景/需求/设计/关键讨论）+ PRD 正文全量更新
2. **诊断深度**：用户要求根据需求大小自适应，多个小需求集中同一模块时自动升级审查深度
3. **迭代交付说明**：不需要人工确认区，确认完的信息直接写入文档给 Agent 看
4. **语言**：全部中文