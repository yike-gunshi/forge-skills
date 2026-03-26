# /do-qa 使用手册 v2.0

> QA 文档管理与全栈测试执行工具。截图 + 浏览器自动化 + 前后端联动测试 + 文档管理。

---

## 一、调用方式

### 1. 被 do-dev 自动调用（最常见）

`/do-dev` 是开发调度器，按 **do-design → do-eng → do-qa** 的顺序调度子技能。当工程阶段（do-eng）完成后，do-dev 会自动在**独立上下文**中启动 do-qa。

调用链路：
```
用户说 "开始开发" 或 "/do-dev"
  → do-dev 读取 PRD
  → Discussion + Research
  → 调度 do-design（如需要）
  → 调度 do-eng
  → 调度 do-qa          ← 自动调用，用户无需手动触发
  → 汇总交付报告
```

do-dev 传递给 do-qa 的上下文：
- 项目路径
- PRD 路径和版本号
- ENGINEERING.md 路径
- DESIGN.md 路径（如有）
- RESEARCH.md 路径（如有）
- Feature ID（用于 .features/ 状态管理）
- 本次变更的摘要

### 2. 手动单独调用

在任何项目中直接输入 `/do-qa`，它会自行读取 PRD 和已有文档，不需要经过调度器。

```
/do-qa                    # 默认：标准级别，自动检测模式
/do-qa --quick            # 快速冒烟测试
/do-qa --full             # 全量遍历
/do-qa --level=详尽       # 详尽级别（含外观问题）
```

### 3. 在 do-dev --auto 模式中

自动模式下，do-qa 在前置沟通完毕后全自动执行，不再暂停确认。每个阶段结束保存检查点。

---

## 二、适用场景

### 场景 A：功能开发完成后（核心场景）

**触发时机**：do-eng 完成代码实现，需要验证功能是否符合 PRD 验收标准。

**do-qa 会做什么**：
1. 读取 PRD 验收标准 + ENGINEERING.md 测试矩阵
2. 检测本地运行的应用（扫描 3456/3000/4000/5173/8080 端口）
3. 启动浏览器，截图基准状态
4. 按验收标准逐项测试
5. 发现 Bug → 登记 → 修复 → 原子提交 → 截图验证
6. 回归测试 → 健康评分 → 上线就绪评估

**适合项目**：Web 应用、前后端分离项目、全栈项目。

### 场景 B：Bug 修复后的验证

**触发时机**：修了一个 Bug，想确认修复有效且没有引入新问题。

**do-qa 会做什么**：
1. 分析 git diff，定位受影响的页面/路由
2. 针对性测试受影响区域
3. 运行回归测试
4. 如果有 baseline.json，输出增量对比报告

### 场景 C：上线前全量检查

**触发时机**：代码准备合并，需要全面质量把关。

**do-qa 会做什么**：
1. 系统性遍历所有可达页面
2. 核心功能 + 错误处理 + 边界情况 + 响应式布局
3. 性能指标采集（LCP/CLS/FCP）
4. 无障碍检查
5. 产出完整 QA 报告 + 上线就绪评估

### 场景 D：首次为项目建立 QA 体系

**触发时机**：项目还没有 QA.md，第一次跑 /do-qa。

**do-qa 会做什么**：
1. 分析项目测试现状（已有测试框架、覆盖率）
2. 多轮与用户确认测试策略
3. 如果没有测试框架 → 推荐并安装（vitest/pytest 等）
4. 创建 QA.md + QA-CHANGELOG
5. 执行首次测试 → 建立 baseline

### 场景 E：纯后端项目（无 UI）

**触发时机**：API 服务、CLI 工具、数据处理管线。

**do-qa 会做什么**：
1. 运行已有的自动化测试（pytest/jest/go test）
2. 代码静态分析（边界检查、错误处理、SQL 安全）
3. API 端点测试（用 Playwright 或 curl 验证请求/响应）
4. 产出 QA 文档

---

## 三、测试引擎

do-qa v2.0 内置三种测试引擎，自动检测可用性并选择最优组合：

### 引擎 1：gstack/browse（优先使用）

无头 Chromium 浏览器，支持：
- `screenshot` — 页面截图
- `snapshot -i -a` — 标注所有可交互元素（带编号）
- `snapshot -D` — 操作前后对比
- `click` / `fill` — 交互操作
- `console --errors` — JS 错误捕获
- `network` — 网络请求监控
- `perf` — Core Web Vitals（LCP/CLS/FCP）
- `responsive` — 多视口截图
- `links` — 导航结构地图
- `viewport WxH` — 切换视口尺寸

**安装**：通过 `/gstack` 技能安装。

### 引擎 2：Playwright

Python Playwright，适合复杂 E2E 流程：
- **前后端联动断言** — 拦截 request/response，验证 API 调用链路是否正确
- **多步骤表单** — 跨页面状态维持
- **文件上传** — gstack/browse 不支持的场景
- **多服务器启动** — 前后端分离项目，同时启动前端和后端
- **多视口响应式测试** — 编程式多设备截图

**安装**：`pip install playwright && playwright install chromium`

### 引擎 3：纯代码模式（降级方案）

当两个浏览器引擎都不可用时：
- 逐文件读取源码，检查边界情况
- 运行已有自动化测试
- 验证数据库操作安全性
- 检查 API 端点输入验证

### 引擎选择逻辑

```
需要截图/视觉验证？
├── 是 → gstack/browse 可用？
│     ├── 是 → 用 gstack/browse（快速，带标注）
│     │     └── 需要复杂 E2E？→ 同时用 Playwright 补充
│     └── 否 → Playwright 可用？
│           ├── 是 → 用 Playwright
│           └── 否 → 纯代码模式（建议安装 gstack）
└── 否 → 纯代码测试
```

**两个引擎协同**：gstack/browse 做快速探索和截图，Playwright 做复杂 E2E 流程和前后端联动断言。

---

## 四、完整执行流程

以下是 do-qa 从启动到交付的完整步骤：

### 第0步：环境检测与准备

| 操作 | 说明 |
|------|------|
| 检测测试引擎 | gstack/browse、Playwright 是否可用 |
| 检测项目框架 | Next.js / React / Vue / Rails / Python / Go |
| 检测测试框架 | jest / vitest / pytest / rspec 等 |
| 检测本地应用 | 扫描 3456/3000/4000/5173/8080 端口 |
| 确定测试级别 | 快速（5-10min）/ 标准（15-30min）/ 详尽（30-60min）|
| 确定测试模式 | Diff-aware / Full / Quick / Regression |
| 定位文档 | PRD.md / ENGINEERING.md / QA.md / QA-CHANGELOG |
| 检查工作区 | 未提交变更 → 询问 commit/stash/忽略/中止 |
| 读取 .features/ 状态 | 确认前序依赖（eng）已完成 |

### 第1步：建立健康基准

- 打开目标 URL，截图保存为 `baseline.png`
- 采集控制台错误、死链、性能指标
- 计算测试前健康评分（0-100）

### 第2步：理解现状 / 创建 QA 文档

**迭代模式**（已有 QA.md）：
- 读取 PRD 验收标准
- 读取 ENGINEERING.md 测试矩阵
- 热点分析：哪些模块反复出 Bug

**创建模式**（无 QA.md）：
- 分析项目测试现状
- 多轮确认测试策略
- 创建 QA.md + QA-CHANGELOG

### 第2.5步：测试框架引导（如无测试框架）

| 运行时 | 推荐 | 备选 |
|--------|------|------|
| Node.js | vitest + @testing-library | jest |
| Next.js | vitest + @testing-library/react + playwright | jest + cypress |
| Python | pytest + pytest-cov | unittest |
| Go | stdlib testing + testify | stdlib only |

安装后创建示例测试并运行验证。

### 第3步：测试计划与确认

- 列出本次变更需要测试的功能点
- 列出回归范围
- 用户确认后开始执行

### 第4步：更新 QA 文档

- 更新 QA.md（版本号、测试矩阵、验收清单）
- 追加 QA-CHANGELOG

### 第5步：系统性测试执行

这是核心步骤，按以下顺序执行：

#### 5.0 认证处理
- Cookie 导入 / 表单登录 / 2FA 暂停
- 需要浏览器 cookie → 提示用户 `/setup-browser-cookies`

#### 5.1 自动化测试
- 运行项目已有的 `npm test` / `pytest` / `go test`

#### 5.2 浏览器测试（gstack/browse）

| 测试项 | 命令 | 产出 |
|--------|------|------|
| 全局导航探索 | `snapshot -i -a` + `links` | 导航结构图 + 标注截图 |
| 页面加载 | `goto` + `text` + `console --errors` | 白屏/500/JS错误检测 |
| 核心功能 | `fill` + `click` + `snapshot -D` | 操作前后对比截图 |
| 表单测试 | 空提交/超长输入/有效输入 | 错误处理验证 |
| 错误状态 | 无效URL/无权限/网络错误 | 错误消息质量检查 |
| 响应式布局 | `viewport 375x812` / `768x1024` / `1440x900` | 三视口截图 |
| 性能指标 | `perf` | LCP/CLS/FCP 数值 |
| 框架特定 | hydration检查/CSRF/N+1/SPA路由 | 框架级问题 |

#### 5.3 浏览器测试（Playwright）

复杂场景补充：
- **前后端联动**：拦截 API request/response，验证数据链路
- **多步骤流程**：跨页面状态、文件上传
- **多服务器**：前后端分离项目同时启动

#### 5.4 纯代码测试
- 源码逐文件审查
- 边界情况/错误处理/SQL安全

### 第6步：Bug 整理与修复

对每个发现的 Bug：

```
1. 登记 Bug（现象 + 复现步骤 + 截图 + 严重度）
2. 分析根因（读取源码）
3. 修复代码
4. 原子提交：git commit -m "fix: <描述>"
5. 重新截图验证
6. 更新 Bug 状态
7. 生成回归测试（如项目有测试框架）
8. 回归风险检查（新错误 → git revert → 标记 deferred）
```

**自我调节机制**（WTF 启发式）：
- 每 5 个修复计算风险值
- WTF > 20% → 停止并询问用户
- 硬上限：30 个修复

### 第7步：回归测试

- 修复的 Bug 不再复现
- 未修改的功能仍正常
- 自动化测试全部通过

### 第8步：健康评分与上线就绪

| 维度 | 权重 |
|------|------|
| 核心功能 | 20% |
| 控制台错误 | 15% |
| 无障碍 | 15% |
| 用户体验 | 15% |
| 视觉呈现 | 10% |
| 链接完整性 | 10% |
| 性能 | 10% |
| 内容 | 5% |

上线就绪判断：
- **可以上线**：无严重/高 Bug，验收标准全部通过
- **需关注**：有中等 Bug，核心功能不受影响
- **不建议上线**：有严重/高 Bug 未修复

### 第9步：产出交付物

```
.gstack/qa-reports/
├── qa-report-{YYYY-MM-DD}.md      # 结构化报告
├── screenshots/
│   ├── baseline.png                # 测试前基准
│   ├── initial.png                 # 首页标注
│   ├── issue-001-step-1.png        # Bug 证据
│   ├── issue-001-after.png         # 修复后
│   ├── mobile.png                  # 响应式
│   ├── tablet.png
│   └── desktop.png
└── baseline.json                   # 回归基准数据

docs/
├── QA.md                           # QA 测试文档（持久化）
└── QA-CHANGELOG.md                 # QA 变更日志
```

---

## 五、测试模式详解

### Diff-aware 模式（feature 分支自动触发）

最智能的模式。当你在 feature 分支上运行 do-qa：

1. `git diff main...HEAD --name-only` 分析变更文件
2. 从文件路径推断受影响的页面/路由：
   - 路由文件 → URL 路径
   - 组件文件 → 渲染它的页面
   - Model/Service → 引用它的控制器
   - CSS 文件 → 包含这些样式的页面
   - API 端点 → 直接测试
3. 自动检测本地运行的应用
4. 针对性测试受影响区域 + 关联回归

### Full 模式

指定 URL 后系统性遍历所有可达页面。适合上线前全量检查。

### Quick 模式

冒烟测试：首页 + Top 5 导航目标 + 控制台错误检查。适合快速确认没有明显问题。

### Regression 模式

存在 `baseline.json` 时自动触发。与上次测试结果对比，输出增量报告：哪些问题新增、哪些已修复、评分变化。

---

## 六、与 do-dev 生态的协作

### 文档流转

```
up-prd → PRD.md（验收标准）
           ↓
do-dev → RESEARCH.md（技术调研）
           ↓
do-design → DESIGN.md（设计规范）
           ↓
do-eng → ENGINEERING.md（实现清单 + 测试矩阵）
           ↓
do-qa → QA.md（测试计划 + 结果）→ 交付报告
```

do-qa 读取上游所有文档，但只写入 QA.md、QA-CHANGELOG 和 .gstack/qa-reports/。

### .features/ 状态架构

do-qa 通过 `.features/{feature-id}/status.md` 与 do-dev 和其他子技能通信：

```markdown
## Pipeline
| phase   | status   | skill  | started | completed | note |
|---------|----------|--------|---------|-----------|------|
| prd     | [已完成] | up-prd | ...     | ...       |      |
| design  | [已完成] | do-design | ...  | ...       |      |
| eng     | [已完成] | do-eng | ...     | ...       |      |
| qa      | [进行中] | do-qa  | ...     | —         |      |

## QA Items
| item-id | name     | status   | severity | commit | note |
|---------|----------|----------|----------|--------|------|
| TEST-01 | 页面加载 | [已完成] | —        | —      | 通过 |
| BUG-01  | 去重误判 | [已完成] | critical | abc123 | 已修复 |
```

do-dev 调度器通过读取这个表来感知 QA 进度，无需读取 QA.md。

### 启动前置检查

do-qa 启动时会检查：
- eng 行是否为 `[已完成]` → 否则提示用户
- prd 行是否为 `[进行中]` → 说明需求可能在变更中，警告
- 是否有孤儿 feature（heartbeat 超过 30 分钟）

---

## 七、框架特定检查

| 框架 | 检查项 |
|------|--------|
| Next.js | hydration 错误、`_next/data` 404、客户端导航、CLS |
| Rails | N+1 查询、CSRF token、Turbo/Stimulus 集成 |
| React SPA | stale state、浏览器前进/后退、客户端路由 |
| Vue SPA | 同 React SPA |
| Python Web | API 响应格式、错误码、CORS 头 |

---

## 八、常见问题

### Q: gstack/browse 和 Playwright 都没有怎么办？

do-qa 会以纯代码模式运行（静态分析 + 已有测试框架），但会建议你安装 gstack：
```
/gstack
```

### Q: 测试需要登录怎么办？

三种方式：
1. `/setup-browser-cookies` — 从浏览器导入 cookie
2. 表单登录 — do-qa 会自动识别登录表单并填写
3. 手动提供 cookie JSON 文件

### Q: 可以只跑测试不修 Bug 吗？

用 `/cn-qa-only`（纯报告模式），或者在 do-qa 的测试计划确认阶段选择"只报告不修复"。

### Q: do-qa 修的代码质量可靠吗？

每个修复都有自我调节机制：
- 原子提交（单个 Bug 单个 commit）
- 修复后立即截图验证
- 回归风险检查（新错误 → 自动 revert）
- WTF > 20% 自动停止
- 硬上限 30 个修复

### Q: 如何恢复到 QA 前的状态？

```bash
# 查看 do-qa 的所有 commit
git log --oneline

# 回退到 QA 前
git reset --soft HEAD~N  # N = do-qa 产生的 commit 数
```

如果是 do-dev --auto 模式，检查点保存在 `.do-dev/checkpoints/`。
