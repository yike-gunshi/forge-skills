## Forge 工作流

本工作区使用 Forge 规范驱动开发。以下规则在每次会话中生效。

### 状态感知（每次会话开始时 SHALL 执行）

1. 读取 `.features/_registry.md`，了解所有活跃 feature 的 phase 和状态
2. 读取当前 `git branch`，判断所在的工作上下文（main / feature 分支 / worktree）
3. 如果用户描述的需求与某个活跃 feature 相关，SHALL 主动关联并告知用户当前进度
4. 如果存在 `.deliver/state.json`，SHALL 读取并告知用户交付流水线的当前阶段

### 规范驱动规则

#### R1: 无 Feature Spec 不写代码

- 每个功能 SHALL 在 `.features/{feature-id}/feature-spec.md` 中有对应的 Feature Spec
- `docs/PRD.md` 是产品当前真相源，只吸收已确认且仍有效的产品事实
- Feature Spec SHALL 包含：用户流程总览、页面/系统结构、Given/When/Then 行为场景、验收检查表
- 如果用户要求开发但 Feature Spec 不存在，SHALL 提示：「该功能没有 Feature Spec，建议先运行 /forge-prd 生成并确认」
- 用户明确确认 Feature Spec 后才可进入开发

#### R2: 实现严格对标文档

- 写代码时 SHALL 逐条对照 Feature Spec 的行为场景实现
- 每完成一个功能点，SHALL 自验对应的 Given/When/Then 场景（运行代码或检查逻辑），确认 PASS 后再继续下一个
- SHALL NOT 添加 Feature Spec 中未描述的功能或行为（scope creep）
- 如果实现中发现 Feature Spec 有遗漏或矛盾，SHALL 暂停并告知用户，而非自行决定

#### R3: 视觉实现对标设计文档

- 如果存在 `docs/DESIGN.md`，前端代码 SHALL 严格对标其中的配色、字体、间距、布局规范
- CSS 属性值（颜色、字号、间距、圆角等）SHALL 与 DESIGN.md 中定义的 Token 一致
- SHALL NOT 使用 DESIGN.md 未定义的颜色或字号
- 视觉偏离 SHALL 被视为与功能 bug 同等严重的问题

#### R4: QA 基于验收检查表断言

- 测试 SHALL 基于 Feature Spec 的验收检查表逐项执行
- 每个断言 SHALL 验证功能正确性（数据值/文本内容/状态变化），SHALL NOT 仅验证元素存在
- 视觉相关断言 SHALL 包含具体的 CSS 属性值检查（font-size、color、padding 等）
- 测试前 SHALL 生成用户可读的验收计划并请用户确认
- 测试后 SHALL 产出结构化的验收报告（全局评估 → 逐项结果 → 问题清单）

#### R5: 收到反馈时举一反三

- 用户报告问题后，SHALL 先修复该问题
- 修复后 SHALL 在代码库中搜索所有相似模式（Grep 同类 CSS 属性、同类逻辑、同类组件）
- SHALL 回查 Feature Spec，检查其他场景是否可能存在同类问题
- SHALL 产出「类似风险清单」并询问用户是否一并修复
- SHALL NOT 仅修复用户明确指出的单点问题就声称完成

#### R6: 提交前自验

- `git commit` 前 SHALL 验证所有相关的 Given/When/Then 场景仍然 PASS
- 如果涉及前端变更，SHALL 检查页面无控制台错误（console.error）
- SHALL NOT 在未自验的情况下提交代码

#### R7: 声称完成时提供证据

- 声称修复了某个问题时，SHALL 提供验证证据（测试输出、截图、或代码对比）
- SHALL NOT 仅说「已修复」而不给出验证结果
- 如果无法验证（如需要用户手动操作），SHALL 明确说明验证方式并请用户确认

#### R8: 异常态必须设计

- Feature Spec 中每个功能点 SHALL 包含至少 3 种异常态场景：空态（数据为空）、错误态（网络/API 失败）、降级态（部分数据缺失）
- 涉及本地存储（localStorage/IndexedDB）的功能 SHALL 额外包含「陈旧态」场景（旧版数据结构兼容）
- 缺少异常态的 Feature Spec SHALL 被视为未完成，不可进入 forge-design
- 异常态的 Then 子句 SHALL 明确指定 UI 行为（隐藏/显示占位/显示错误提示/重试按钮），SHALL NOT 使用「适当处理」等模糊描述

#### R9: 改动必须扫描影响面

- 任何涉及类型定义（interface/type）、API 返回格式、枚举值、store state shape 的改动，commit 前 SHALL Grep 全代码库确认所有引用处已适配
- SHALL 产出影响面清单（改动项 / 引用文件 / 是否需要适配 / 是否已处理）
- 所有「需要适配」的位置 SHALL 在同一 PR 内完成，SHALL NOT 留下未处理的引用
- 特别注意：过滤/分页组件的计数逻辑（remaining/hasMore）必须跟随过滤状态联动

#### R10: 环境改动必须验证

- 新增 API 路由 → SHALL curl 验证实际行为，不信任路由定义顺序
- 修改 proxy/端口配置 → SHALL curl 验证代理路径的实际请求
- 创建 worktree → SHALL diff 主仓库 .env 确认关键变量完整
- 修改后端代码 → SHALL 重启服务并 curl health endpoint 确认
- SHALL NOT 在未验证环境的情况下进入下一步

#### R11: Bug 修复走双层验收清单 + 新发现必须分流

- **每次 bug 修复 SHALL 生成结构化验收清单文档** `docs/bugfix/reviews/BF-{MMDD}-{N}.md`，使用 `status: draft`；修复合并后移动到 `docs/archive/raw/bugfix-reviews/`
  - AI 填基本信息 + 验证项前 3 列（验证项 / 预期效果 / 操作步骤）
  - 验证项至少 3 条，其中至少 1 条边界/异常态
  - AI 不得填 "QA 验证" 和 "你的验收" 两列
- **必须先由 forge-qa 做自动验收**（填 "QA 验证" 列），**QA 全过后**才让用户做人工二次验收（填 "你的验收" 列 + 最终结论）
- **没有用户最终结论，不得进入合并步骤**（即使 QA 全过）
- **用户验收结果是三选一**：Pass / Fail / Pass + 新发现
  - Pass → 合并 worktree
  - Fail → 回 P5 继续修（不接受新问题进来）
  - Pass + 新发现 → 先合并当前修复 → 分流新发现
- **新发现必须写入 `docs/bugfix/backlog.md` 对应区**，禁止当场顺手修：
  - 独立 bug → 🐛 待修区（分配 BF-XX 编号 + 优先级 P0/P1/P2）
  - 新需求 → 💡 新需求区（建议走 /forge-prd 立项）
  - 模糊反馈 → 🌀 待澄清区
  - 同根（并入当前修复）→ **AI 必须举证**（同文件的同一函数 / 同一数据字段 / 同一上游依赖），举证不足默认独立 bug
- **backlog.md 的 🗄️ 已处理区永久保留**，不清理（用于以后定位问题时回溯）
- **AI 自己想到的顺手重构 SHALL NOT 写进 backlog**，写代码文件里的 `// REFACTOR: {想法}` 注释即可
- **下一个 bug 默认建议新会话或 /clear、/compact**，避免长会话的 scope 蔓延
- 具体流程见 `工具/forge-cookbook/skills/forge-bugfix/SKILL.md` 的 P5.3 / P6 / P6.5 / P7 / P7.5

### 状态→行动映射

| `.features/` 中的状态 | 建议行动 |
|---|---|
| 无 .features/ 或无活跃 feature | 使用 `/forge-prd` 创建需求和 Feature Spec |
| prd: ✅ 已完成, design: ⏳ 待处理 | 使用 `/forge-design` 进行设计（前端项目）或 `/forge-dev` 调度开发 |
| prd: ✅ 已完成, eng: ⏳ 待处理 | 使用 `/forge-dev` 进入开发调度 |
| eng: 🔄 进行中 | 继续实现，逐场景对标 Feature Spec |
| eng: ✅ 已完成, qa: ⏳ 待处理 | 使用 `/forge-qa` 进行验收测试 |
| qa: ❌ 失败 | 读取 QA 报告，修复问题并举一反三 |
| qa: ✅ 已完成 | 使用 `/forge-review` 审查或 `/forge-ship` 发布 |

### 文档位置

- PRD 当前真相源：`docs/PRD.md`
- Feature Spec：`.features/{feature-id}/feature-spec.md`
- PRD 变更日志：`docs/PRD-CHANGELOG.md`
- 设计文档：`docs/DESIGN.md`
- 工程文档：`docs/ENGINEERING.md`
- QA 报告：`docs/QA.md`
- Feature 状态：`.features/_registry.md`
- **Bug 任务池**：`docs/bugfix/backlog.md`（forge-bugfix 单一入口）
- **当前 Bug 验收清单**：`docs/bugfix/reviews/BF-{MMDD}-{N}.md`（进行中）
- **历史 Bug 验收清单**：`docs/archive/raw/bugfix-reviews/BF-{MMDD}-{N}.md`（结案后）
- Bug 历史汇总（可选）：`docs/bugfix/{日期}.md`

---

