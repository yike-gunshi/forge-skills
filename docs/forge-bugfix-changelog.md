# forge-bugfix 演进历史

> SKILL.md 只描述当前行为。历史版本对比、设计决策演进都记录在本文件。
> 读 SKILL.md 时不需要理解历史版本；需要理解为什么某条铁律存在时来这里查。

---

## v7.0（2026-04-25）

### 解决的核心问题

v6.1 已经约束了 worktree、并行协调和 dev server 身份，但单 bug 文档仍偏“修完后的验收清单”。真实使用中，用户需要在最终人工验收时看到 QA 当时的逐步截图、前后端地址、进程身份和环境一致性；同时，功能开发后的 forge-qa 发现多个 bug 时，应自动进入有界 bugfix 闭环，而不是每个 bug 都打断用户。

### 核心改变

- **验收清单升级为 Bug 修复验收报告**
  - 路径仍为 `docs/bugfix/reviews/BF-XX.md`，兼容历史链接和 `review_doc` 参数
  - 创建时机前移到 bug 登记/领取时，不再等修完才创建
  - 报告覆盖发现、复现、根因、TDD、修复、QA、人工验收和新发现分流
- **QA 截图内嵌 Markdown**
  - 前端交互每个有意义的状态节点都截图
  - 截图保存在 `docs/bugfix/reviews/assets/BF-XX/`
  - 报告中直接使用 `![](./assets/BF-XX/...)`
- **Codex Browser Use 接入**
  - 在 Codex 环境中，前端页面/交互/视觉/控制台验收优先使用 `browser-use:browser`
  - Browser Use 负责用户视角截图、DOM 证据和 in-app browser 操作
  - Playwright 继续负责可重复脚本断言，gstack/browse 作为已有项目补充
  - Computer Use 只作为 Browser Use 不可用或非浏览器桌面应用的兜底
- **前后端环境身份强校验**
  - 报告展示 Frontend/Backend URL、来源、PID、cwd、commit
  - QA 使用的地址必须和用户验收地址一致
  - PID/cwd 不指向当前 worktree 直接 QA_FAIL
- **QA 自动闭环**
  - forge-qa Mode A 发现 bug 时产出结构化 BF candidate
  - 调度层/forge-dev 可自动写入 backlog、创建 BF 报告并调用 forge-bugfix
  - forge-bugfix 修复后再由 forge-qa Mode B 回归
  - 全部 QA 绿后，用户只做一次最终人工验收
- **批量仍保持单 bug 工程隔离**
  - 每个 bug 独立 BF 报告、worktree、TDD、commit、QA
  - 批次文档只做最终验收汇总，不替代单 bug 报告
- **自动闭环有上限**
  - 同一 bug 连续回修失败 3 次或遇到需求/设计/环境疑问，标记 `blocked-human`
  - AI 必须给用户决策卡，禁止无限循环

### 新增/修改清单

| 文件 | 性质 | 说明 |
|---|---|---|
| `skills/forge-bugfix/templates/review-checklist.md` | 改 | 从验收清单模板升级为 Bug 修复验收报告模板 |
| `skills/forge-bugfix/templates/backlog.md` | 改 | 增加报告链接列和 `fixed-awaiting-qa` / `qa-failed` / `qa-pass-pending-final-review` / `blocked-human` 等状态 |
| `skills/forge-bugfix/SKILL.md` | 改 | P2.5 创建报告；P5 独立 TDD；P6 批量待最终验收；P8 批次汇总 |
| `skills/forge-qa/SKILL.md` | 改 | Mode A 输出结构化 BF candidate；Mode B 回填截图、断言、环境身份；接入 browser-use:browser |
| `docs/iterations/2026-04-25-Bug修复验收报告与QA自动闭环.md` | 新 | 本次迭代说明 |

### 设计决策

- **为什么不改 `reviews/` 路径**：路径是稳定接口，backlog 和 forge-qa 都依赖它。语义升级通过标题和模板完成。
- **为什么不让 forge-qa 修代码**：职责分离仍然成立。forge-qa 发现问题并产出结构化 bug，forge-bugfix 独立修复。
- **为什么批量仍要求独立 worktree/TDD**：批量是管理单元，不是工程单元。质量边界必须落在单 bug 上。
- **为什么 Codex 下优先 Browser Use**：用户最后是在 Codex in-app browser 里验收前端结果，Browser Use 生成的 DOM 和截图证据更贴近人工验收表面；脚本级 Playwright 仍保留为稳定断言能力。

---

## v6.1（2026-04-24）

### 解决的核心问题

v6.0 解决了"多个 worktree 能不能并行修 bug"的问题，但还没有约束"这些 worktree 怎么启动前后端"。真实使用中会出现旧 Vite / uvicorn 进程继续占着 `3000`、`5173`、`8080`，新会话打开浏览器后看到的是旧代码，排查成本很高。

### 核心改变

- **统一 dev server 入口优先**：如果项目提供 `npm run dev:status` / `npm run dev` / `scripts/dev-stack.sh`，forge-bugfix 必须使用它，不得裸跑 `uvicorn`、`vite`、`next dev`
- **APP_URL 可追溯**：复现、截图、curl、forge-qa 的 `app_url` 必须来自 dev-status 输出，不能凭常见端口猜
- **进程身份核对前移**：P3.2 要求状态输出或 `lsof` 能证明监听进程 cwd 属于当前 worktree
- **QA 不猜端口**：forge-qa v3.2 在 Mode B 中要求调用方传入来自 dev-status 的 URL；未传时只提示，不自行发明 `localhost:3000`
- **forge-status 增加只读 dev server 巡检**：报告 `.devserver.json`、tmux session、监听端口、PID、cwd，但不把进程状态用于 active.md 僵尸判定

### 新增/修改清单

| 文件 | 性质 | 说明 |
|---|---|---|
| `SKILL.md` | 改 | 总入口只读展示项目统一 dev server 状态 |
| `skills/forge-bugfix/SKILL.md` | 改 | version 6.0→6.1；P0/P3.2/P6/铁律接入 dev-status/dev-stack |
| `skills/forge-eng/SKILL.md` | 改 | 新增第 5.6 步 Dev Server 端口契约 |
| `skills/forge-qa/SKILL.md` | 改 | version 3.1→3.2；Mode B 不猜端口，app_url 必须可追溯 |
| `skills/forge-status/SKILL.md` | 改 | 新增 dev server 附加巡检，明确不参与僵尸判定 |

### 设计决策

- **为什么不只写在项目 CLAUDE.md**：CLAUDE.md 是提醒，不是流程门禁；forge-bugfix / forge-eng / forge-qa 都可能直接启动或验收应用，所以约束必须进入 skill 本身
- **为什么不继续扫描常见端口**：扫描只能知道"有服务"，不知道"是不是当前 worktree 的服务"；URL 必须来自项目状态入口，才能追溯到 cwd
- **为什么 forge-status 不用进程判断僵尸**：dev server 可能手动停掉，也可能会话结束后仍在跑；active.md 仍然只认 worktree 存在性和分支合并状态这两个硬信号

---

## v6.0（2026-04-19）

### 解决的核心问题

v5.0 收敛了"何时算修完"和"新发现如何分流"两个闭环问题，但**每个 bug 仍然是串行一个会话**。用户（有能力同时照看 3-4 个 Claude Code 窗口）的实际瓶颈卡在"AI 写代码慢"，而 v5.0 只允许一次修一个。想并行就会撞车：
- 两个窗口不知对方在修什么（认知冲突）
- 合并到 main 时才发现改了同一个文件（代码冲突）
- 会话崩了或漏复盘，状态无法回收

### 核心改变

- **`.forge/active.md` 心跳文件**（跨 worktree 共享的主仓库根文件）
  - 登记字段极简：session id / worktree 相对路径 / 任务 id / 功能域
  - 故意不记 Phase、不记时间戳——避免 AI 每步都要更新的心智负担
  - 头部有"功能域声明"区，项目自定义标签清单（`asr` / `player` / `auth` ...），AI 不得自创
- **功能域判重**（不用文件集判重）
  - 用户明确反对"文件集"判重——"模块/业务视角"比"文件视角"合理：3 个 ASR bug 跨前后端，应视为同组
  - 同域有活跃会话 → 建议"去那个会话顺序修"；异域 → 建议"新开窗口并行"
  - 重构型 bug 允许多域标签（`asr,player`），任一域冲突即判冲突
- **合并前强制 merge 预演**（P7.1.0）
  - `git merge --no-commit --no-ff` 做预演，成功回退 → 正式合并；失败 → 让用户决策 rebase 或暂存
  - 彻底闭合"并行会话撞到同一文件"的兜底
- **session id 自动获取**（`skills/forge-bugfix/scripts/get-session-id.sh`）
  - 通过 $PPID 回溯读 `~/.claude/sessions/<pid>.json` 的 sessionId 字段
  - 用户无需手动粘贴，skill 在 P0 自动调
  - 便于日后从 jsonl 追溯具体会话
- **闭环清理用硬信号**（不用时间戳）
  - 正常结束：forge-fupan Phase 5.0 清掉本会话的登记
  - 漏复盘兜底：新增 `/forge-status` 扫描，按 `worktree 目录不存在` + `分支已合并到 main` 两个硬信号判定僵尸，用户确认后清理
  - 明确不采用"超过 N 小时算失联"等时间启发式
- **新增 skill `/forge-status`**（合并 status + cleanup，用户要求简单）
  - 交互清理模式：用户主动触发，扫描 → 报告 → 一次 y/n → 清理
  - 只读巡检模式：被 forge-bugfix P0 调用，只报告不清理

### 新增/修改清单

| 文件 | 性质 | 说明 |
|---|---|---|
| `skills/forge-bugfix/SKILL.md` | 改 | version 5.0→6.0；铁律+1（并行协调）；P0+并行探测；P2+功能域判重（2.0）；P3+登记 active（3.1.5）；P7+合并预演（7.1.0/7.1.2）；规则+7 条并行纪律 |
| `skills/forge-bugfix/scripts/get-session-id.sh` | 新 | 自动获取 session id |
| `skills/forge-bugfix/templates/active.md` | 新 | 心跳文件模板 + 功能域声明区 |
| `skills/forge-bugfix/templates/backlog.md` | 改 | 表格加 `功能域` `领取会话` 两列；头部注释加 v6.0 规则 |
| `skills/forge-status/SKILL.md` | 新 | 并行会话巡检 + 清理 skill |
| `skills/forge-fupan/SKILL.md` | 改 | Phase 5.0 加 active.md 清理步骤 |
| `install.sh` | 改 | SKILLS 数组加 forge-status |

### 设计决策的 why

#### 为什么判重粒度从"文件集"换成"功能域"
v6.0 讨论初期 AI 提议"每个 bug 声明预计改动文件，判重看文件集交集"，被用户直接否决："文件集判重是非常蠢的行为"。真实场景：3 个 ASR 相关 bug 可能跨前端组件 + 后端接口，文件集零重叠但**上下文强相关**——同一个会话修它们能复用"ASR 数据流怎么跑"的理解，拆成 3 个会话反而低效。功能域是业务视角，正好匹配这种复用需求。

#### 为什么一个会话内多个 bug 仍然各自独立 worktree
同功能域归并是为了"认知复用"，但代码还是每个 bug 一个 worktree——因为 worktree 的核心价值（失败可弃、主分支干净、端口/服务可隔离）和会话数量无关。AI 在同一个会话里顺序处理：修完 A 合并 → 开 B 的 worktree → 修完合并 → ...。

#### 为什么不用时间戳判僵尸
用户在方案讨论阶段明确反对："间隔时长无法真正代表工作完成"。想想就知道——AI 可能慢，用户可能离开 4 小时再回来，"超过 N 小时"只会误杀活跃会话。相比之下：
- worktree 目录不存在 = 用户已经手动删了 = 硬信号真·弃用
- 分支已 merged 到 main = 工作已完成但漏清 = 硬信号真·完成

这两个都是**事实**，不是启发式。

#### 为什么 status 和 cleanup 合并成一个 skill
用户明确要求"尽量简单"。拆两个 skill 会让用户多记一个命令、决策成本变高。合并后的 /forge-status 默认行为是"扫 → 报告 → 问一次 y/n → 清理"，一条命令走完。如果未来有人想只看不清，可以在自然语言里说"只看一下别清"，AI 走只读模式即可。

---

## v5.0（2026-04-19）

### 解决的核心问题

v4.0 解决了隔离问题（worktree、单 bug），但**验收阶段依然是 AI 隐式判断 + 用户模糊回复**，导致"修到第 5 个还没封闭"——用户不知道什么时候算"修完"。新发现无止境地吞进当前修复，产生 scope 蔓延。

### 核心改变

- **双层验收清单**：每次修完必须生成 `docs/bugfix/reviews/BF-XX.md` 表格化清单
  - 第一层：forge-qa 跑自动化测试，填 "QA 验证" 列（新增 Mode B）
  - 第二层：用户人工二次验收，填 "你的验收" 列 + 最终结论
  - **明确封闭时刻**：用户填完最终结论（Pass / Fail / Pass + 新发现）才算修复结束
- **新发现必须分流**（禁止顺手修）：
  - 独立 bug → `docs/bugfix/backlog.md` 的 🐛 待修区
  - 新需求 → `docs/bugfix/backlog.md` 的 💡 新需求区（建议 /forge-prd 立项）
  - 模糊反馈 → `docs/bugfix/backlog.md` 的 🌀 待澄清区
  - 同根并入当前修复 → **AI 必须举证**（同文件/同函数/同数据流），举证不足默认独立 bug
- **任务池统一**：TODO.md（散在多处）→ `docs/bugfix/backlog.md`（4 区：待修 / 新需求 / 待澄清 / 已处理永久保留）
- **下一个 bug 默认建议新会话或 /clear /compact**
- **移除 "弃用 worktree" 选项**：Fail 回 P5 继续修，不弃用
- **新增节点**：P5.3 生成验收清单 / P6（重写为调用 forge-qa）/ P6.5 用户人工验收 / P7.5 新发现分流

### 配套改动

- `skills/forge-qa` 新增 Mode B（单 bug 验收清单模式），Mode A（完整 QA）保留不变
- `CLAUDE.md` 新增 R11：双层验收清单 + 新发现分流 + 同根举证 + 已处理区永久保留
- 模板文件：`templates/review-checklist.md`、`templates/backlog.md`

---

## v4.0（2026-04-18）

### 解决的核心问题

v3.x 时期"21 commits / 9 bugs / 1.8M tokens"的迷你重构失控。一次会话承包所有报告的 bug，过程中吸入新 bug 和新需求，scope creep 失控、多 bug 之间互相污染上下文。

### 核心改变

- **单弹道 = 1 bug 或 1-2 共因 bug**（AI 推荐范围，用户拍板）
- **每弹道一个 worktree**（代码隔离 + 失败可弃 + 不污染主仓库）
- **修完必须问"要合并吗"**（不自动 merge）
- **新发现的 bug → TODO.md，不当场修**（要修就走新弹道）
- **会话出口必须建议下一步**（review / ship / fupan）
- **端口冲突预检**（worktree 内启动服务和主仓库抢端口的历史踩坑）

### 遗留缺口（v5.0 已解决）

- P1.5-rolling（滚动分诊）：v4.0 没覆盖"边做边重新分类"场景
- P5.2 新发现处理是软建议，不是硬性拒绝
- 验收是 AI 隐式判断，没有用户明确的 Pass/Fail 节点

---

## v3.x（2026-04 之前）

### 已知问题

- 一次会话承包所有报告的 bug
- 过程中吸入新 bug 和新需求
- 最终演化成 21 commits / 9 bugs / 1.8M tokens 的迷你重构
- 多 bug 上下文互相污染
- 无 worktree 隔离，修复失败难以回退

---

## 设计决策的 why

### 为什么要求"同根必须举证"

历史案例：AI 喜欢把"看起来相关"的 bug 声称为共因、一起修。结果往往是"两个 bug 根因其实不同、改动面扩大、其中一个没修好"。v5.0 要求 AI 用"同文件/同函数/同数据流"这种**可验证的具体证据**证明同根，降低 scope 蔓延概率。

### 为什么 backlog 的 🗄️ 已处理区永久保留

用户明确要求（2026-04-19）：历史 bug 是以后定位类似问题的最佳检索入口。不清理 = 成本几乎为零，收益是将来 debug 时可以 grep 到类似历史案例及其根因。

### 为什么移除 "弃用 worktree" 选项

v4.0 的 P7 有"弃用本弹道"选项。v5.0 把这个场景挪到 P4.4（三振出局）——修复失败应该在根因追踪阶段就撤退，而不是修完代码再弃用。P7 只处理"修复已到位"的情况。

### 为什么 P6 不再由 forge-bugfix 自己做 QA

职责分离：
- forge-bugfix 专注于"修"
- forge-qa 专注于"验"
- 调用方和被调用方分开，更容易独立迭代
- 用户期望的"double check"需要两套独立的验收主体（自动 + 人工）

### 为什么下一个 bug 默认建议新会话

长会话的典型问题（v3.x 踩坑）：
- 上下文被前一个 bug 的细节污染
- AI 更容易 scope 蔓延
- 单会话 62M tokens 的教训

一次修完开新会话 = 每次修复都有干净的 P1 问题理解。代价是要重读一次项目文档，但收益是边界清晰。
