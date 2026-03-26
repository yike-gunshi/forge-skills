---
name: forge-qa
version: 2.0.0
description: |
  QA 验收与测试报告。纯验收模式：测试+报告，不修代码。发现的问题回 forge-eng 修复。
  管理项目的 QA.md 和 QA-CHANGELOG，基于 PRD + ENGINEERING.md 产出测试计划并执行。
  支持三种测试引擎：gstack/browse（无头浏览器截图+交互）、Playwright（自定义 E2E 脚本）、
  纯代码（无浏览器时的静态分析）。端到端用户流程测试、跨模块集成测试、视觉回归+响应式、
  性能指标采集、验收标准逐项核对。
  触发方式：用户说"测试"、"QA"、"forge-qa"、forge-dev 调度器调用。
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - AskUserQuestion
---

# /forge-qa：QA 验收与测试报告 v3.0

**纯验收模式：测试 + 报告，不修代码。** 发现的问题生成修复清单，回 `/forge-eng` 修复。

管理项目的 QA.md，基于 PRD + ENGINEERING.md 产出测试计划并执行。
三种测试引擎：**gstack/browse**（截图+浏览器交互）、**Playwright**（自定义 E2E 脚本）、**纯代码**（静态分析）。

## 铁律

1. **只测不修** — forge-qa 不修改任何业务代码。发现 bug 记录到报告，由 forge-eng 修复。
2. **验收标准前置** — 测试计划必须对照 PRD 验收标准，逐项覆盖。
3. **证据先于结论** — 每个测试结果必须有截图、输出、或日志作为证据。

## 定位说明

forge-eng v2 已嵌入 TDD（单元测试）和 Verification Gate（原子验证），forge-qa 聚焦在 forge-eng 做不到的事：

| forge-eng 负责 | forge-qa 负责 |
|----------------|--------------|
| 单元测试（TDD 红绿重构） | **端到端用户流程测试** |
| 原子 commit 验证（exit code） | **跨模块集成测试** |
| 任务级验证 | **视觉回归 + 响应式** |
| — | **性能指标采集** |
| — | **验收标准逐项核对** |

## 流程总览

```
读取 PRD + ENGINEERING.md + 定位 QA.md
  ├── 已有 → 读取现状 → 测试诊断 → 计划确认 → 更新文档 → 执行测试 → 生成报告
  └── 无   → 分析项目 → 多轮确认 → 创建文档 → 执行测试 → 生成报告
```

全程中文。关键测试策略需用户确认后再执行。

## 报告产出后的出口建议

```
QA 验收完成。建议下一步：

[如果发现问题]
A) /forge-eng — 将修复清单作为新任务，回到工程实现
B) 暂不修复 — 记录为已知问题，继续发布流程

[如果全部通过]
A) /forge-review — PR 审查
B) /forge-ship — 直接发布
C) /forge-fupan — 先复盘
```

---

## 前置脚本

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
echo "当前分支: $_BRANCH"

# === 测试引擎 1: gstack/browse（无头浏览器）===
B=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/.claude/skills/gstack/browse/dist/browse" ] && B="$_ROOT/.claude/skills/gstack/browse/dist/browse"
[ -z "$B" ] && [ -x "$HOME/.claude/skills/gstack/browse/dist/browse" ] && B="$HOME/.claude/skills/gstack/browse/dist/browse"
[ -n "$B" ] && echo "gstack/browse: $B" || echo "gstack/browse: 不可用"

# === 测试引擎 2: Playwright ===
PW=""
python3 -c "from playwright.sync_api import sync_playwright" 2>/dev/null && PW="available"
[ -n "$PW" ] && echo "Playwright: 可用" || echo "Playwright: 不可用"

# Playwright 辅助脚本
PW_SERVER=""
[ -f "$HOME/.claude/skills/webapp-testing/scripts/with_server.py" ] && PW_SERVER="$HOME/.claude/skills/webapp-testing/scripts/with_server.py"
[ -n "$PW_SERVER" ] && echo "Playwright with_server: $PW_SERVER" || echo "Playwright with_server: 不可用"

# === 框架检测 ===
[ -f "$_ROOT/package.json" ] && grep -q '"next"' "$_ROOT/package.json" 2>/dev/null && echo "框架: Next.js"
[ -f "$_ROOT/Gemfile" ] && grep -q "rails" "$_ROOT/Gemfile" 2>/dev/null && echo "框架: Rails"
[ -f "$_ROOT/package.json" ] && grep -q '"vue"' "$_ROOT/package.json" 2>/dev/null && echo "框架: Vue"
[ -f "$_ROOT/package.json" ] && grep -q '"react"' "$_ROOT/package.json" 2>/dev/null && echo "框架: React"
[ -f "$_ROOT/requirements.txt" ] || [ -f "$_ROOT/pyproject.toml" ] && echo "运行时: Python"
[ -f "$_ROOT/go.mod" ] && echo "运行时: Go"
[ -f "$_ROOT/package.json" ] && echo "运行时: Node.js"
[ -f "$_ROOT/Gemfile" ] && echo "运行时: Ruby"

# === 已有测试框架检测 ===
ls "$_ROOT"/jest.config.* "$_ROOT"/vitest.config.* "$_ROOT"/playwright.config.* "$_ROOT"/.rspec "$_ROOT"/pytest.ini 2>/dev/null
ls -d "$_ROOT"/test/ "$_ROOT"/tests/ "$_ROOT"/spec/ "$_ROOT"/__tests__/ "$_ROOT"/cypress/ "$_ROOT"/e2e/ 2>/dev/null

# === 报告目录 ===
REPORT_DIR="$_ROOT/.gstack/qa-reports"
mkdir -p "$REPORT_DIR/screenshots" 2>/dev/null
echo "报告目录: $REPORT_DIR"
```

**引擎可用性说明**：
- **两个引擎都可用**（最佳）：gstack/browse 用于交互式截图测试，Playwright 用于复杂 E2E 流程脚本
- **仅 gstack/browse**：可完成所有截图和交互测试
- **仅 Playwright**：可完成截图、E2E 测试，但无 snapshot 标注功能
- **都不可用**：以纯代码模式继续（跳过截图步骤），建议用户安装 gstack（`/gstack` 技能）

---

## AskUserQuestion 格式规范

每次提问结构：
1. **重新聚焦**：当前项目、分支、正在测试的功能
2. **通俗解释**：高中生能懂的语言描述问题
3. **给出建议**：推荐选项 + 完整度评分
4. **列出选项**：`A) B) C)` + 工作量估算

---

## 第0步：确定测试级别、模式和定位文档

### 测试级别

如果用户未指定，通过 AskUserQuestion 确认：

- A) **快速** — 只测严重和高优先级问题（约5-10分钟）
- B) **标准** — 快速 + 中等优先级问题（约15-30分钟）
- C) **详尽** — 标准 + 低优先级和外观问题（约30-60分钟）

推荐：上线前用标准级别，功能开发中用快速级别。

### 测试模式

根据上下文自动选择：

| 模式 | 触发条件 | 行为 |
|------|---------|------|
| **Diff-aware** | 在 feature 分支且未指定 URL | 分析分支 diff，定位受影响页面，自动检测本地应用端口 |
| **Full** | 指定了 URL | 系统性遍历所有可达页面 |
| **Quick** | 用户指定 `--quick` | 首页 + Top 5 导航目标的冒烟测试 |
| **Regression** | 存在 baseline.json | 对比上次测试结果，输出增量报告 |

### Diff-aware 模式（feature 分支自动触发）

```bash
# 1. 分析分支变更
git diff main...HEAD --name-only
git log main..HEAD --oneline

# 2. 从变更文件推断受影响的页面/路由
#    - 路由/控制器文件 → 对应的 URL 路径
#    - 视图/组件文件 → 渲染它们的页面
#    - Model/Service 文件 → 引用它们的控制器
#    - CSS/样式文件 → 包含这些样式的页面
#    - API 端点 → 直接用 $B js "await fetch('/api/...')" 测试

# 3. 检测本地运行的应用
for port in 3456 3000 4000 5173 8080 8000; do
  curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port" 2>/dev/null | grep -q "200\|301\|302" && echo "发现应用: http://localhost:$port" && break
done
```

如果分支 diff 无法推断出明确的页面/路由，**不要跳过浏览器测试**——回退到 Quick 模式：访问首页，跟随 Top 5 导航目标，检查控制台错误。

### 检测基础分支

```bash
gh pr view --json baseRefName -q .baseRefName 2>/dev/null || \
gh repo view --json defaultBranchRef -q .defaultBranchRef.name 2>/dev/null || \
echo "main"
```

### 读取测试计划

```bash
_SLUG=$(basename $(git rev-parse --show-toplevel 2>/dev/null) 2>/dev/null || echo "project")
_BRANCH=$(git branch --show-current 2>/dev/null)
ls ~/.cn-dev/projects/$_SLUG/*$_BRANCH*test-plan*.md 2>/dev/null || \
ls ~/.gstack/projects/$_SLUG/*test-plan*.md 2>/dev/null || \
echo "未找到测试计划文件"
```

如果找到测试计划文件（由 `/forge-eng` 或 `/cn-plan-eng` 产出），读取它——它比 git diff 启发式方法更准确，优先使用。

### 定位项目文档

1. 定位 PRD：搜索 `{项目目录}/docs/PRD.md`
2. 定位 ENGINEERING.md：搜索 `{项目目录}/docs/ENGINEERING.md`
3. 定位 QA.md：
   ```
   搜索模式：
   - {项目目录}/docs/QA.md
   - {项目目录}/docs/*qa*（不区分大小写）
   - {项目目录}/docs/*测试*
   - {项目目录}/**/QA*.md
   ```
4. 定位 QA CHANGELOG：模式匹配 `*qa*changelog*`
5. 分支判断：有 → 迭代模式；无 → 创建模式

### 检查工作区状态

```bash
git status --porcelain
```

如果工作区有未提交变更，通过 AskUserQuestion 询问：
- A) 提交变更 — 先 commit 当前改动，再开始 QA
- B) 暂存变更 — stash，QA 完成后 pop
- C) 直接开始 — 忽略未提交变更（不推荐，fix commit 会混杂）
- D) 中止 — 手动清理后再跑

推荐 A，因为 QA 需要原子 commit 每个 fix。

---

## 第1步：建立健康基准

**在测试前打分（0-100分）：**

| 维度 | 权重 | 评估方式 |
|------|------|---------|
| 控制台错误 | 15% | JS 错误数量（0→100, 1-3→70, 4-10→40, 10+→10）|
| 链接完整性 | 10% | 死链数量（每个 -15，最低 0）|
| 核心功能 | 20% | 主要用户流程是否可用 |
| 视觉呈现 | 10% | 页面布局、样式是否正确 |
| 用户体验 | 15% | 交互流畅度、反馈及时性 |
| 性能 | 10% | 首屏加载、LCP、CLS |
| 内容 | 5% | 文案、数据展示是否正确 |
| 无障碍 | 15% | 键盘导航、对比度、语义化 |

**测试前截图**（如果浏览器引擎可用）：

使用 gstack/browse：
```bash
$B goto <URL>
$B screenshot $REPORT_DIR/screenshots/baseline.png
$B console --errors
$B perf
```

或使用 Playwright（如果 gstack/browse 不可用）：
```python
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('<URL>')
    page.wait_for_load_state('networkidle')
    page.screenshot(path='/tmp/qa-baseline.png', full_page=True)
    errors = []
    page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
    page.reload()
    page.wait_for_load_state('networkidle')
    print(f"Console errors: {len(errors)}")
    for e in errors: print(f"  - {e}")
    browser.close()
```

---

## 第2步：理解现状（迭代模式）

1. 读取 PRD 最新迭代摘要，提取验收标准
2. 读取 ENGINEERING.md（如有），提取测试矩阵和实现清单
3. 读取完整 QA.md
4. 读取 QA CHANGELOG（如有），做热点分析：
   - 哪些模块反复出现 Bug？
   - 上一轮测试遗留了哪些问题？
5. 检查 TODOS.md（如存在），记录已知 Bug
6. 向用户总结当前测试状态，确认理解是否正确

---

## 第2步（替代）：从零创建 QA.md

1. **分析项目测试现状**：
   - 检查现有测试文件（pytest/jest/mocha 等）
   - 检查测试覆盖率
   - 分析 PRD 中的验收标准
   - 分析 ENGINEERING.md 中的测试矩阵

2. **与用户多轮确认**：
   - 第1轮：测试策略 — 浏览器测试 vs 纯代码测试 vs 混合
   - 第2轮：测试范围 — 核心功能 vs 全量覆盖
   - 第3轮：验收标准 — 确认每个功能点的验收条件
   - 第4轮：已知问题 — 当前存在的 Bug 或薄弱环节

3. **产出 QA.md 初稿**（参考 [references/qa-template.md](references/qa-template.md)）
4. **新建 QA CHANGELOG**
5. 确认后写入文件

---

## 第2.5步：测试框架引导（如检测到无测试框架）

**如果前置脚本未检测到测试框架且项目有代码**：

1. 检测项目运行时：Node.js/Python/Ruby/Go/Rust
2. 通过 AskUserQuestion 推荐测试框架：

| 运行时 | 推荐 | 备选 |
|--------|------|------|
| Node.js | vitest + @testing-library | jest + @testing-library |
| Next.js | vitest + @testing-library/react + playwright | jest + cypress |
| Python | pytest + pytest-cov | unittest |
| Ruby/Rails | minitest + capybara | rspec + factory_bot |
| Go | stdlib testing + testify | stdlib only |

3. 选项：A) 安装推荐框架  B) 安装备选  C) 跳过
4. 如果用户选择安装：安装包、创建配置、写一个示例测试、运行验证、commit

**如果已有测试框架**：读取 2-3 个已有测试文件，学习命名惯例、导入风格、断言模式，供后续回归测试生成使用。

---

## 第3步：测试计划与确认

### 需要用户确认的关键测试决策

通过 AskUserQuestion 确认：

1. **测试级别**：
   - A) 快速 — 只测严重和高优先级（5-10 分钟）
   - B) 标准 — 快速 + 中等优先级（15-30 分钟）
   - C) 详尽 — 标准 + 低优先级和外观（30-60 分钟）

2. **测试范围**：列出本次变更需要测试的功能点和验收标准

3. **回归范围**：列出可能受影响的现有功能

### 不需要用户确认的内容

- 具体测试用例的实现方式
- 测试数据的构造
- Bug 修复的具体代码

---

## 第4步：更新 QA 文档

### A. 更新 QA CHANGELOG

追加本次变更记录：时间、测试范围、发现的 Bug、修复状态。

### B. 更新 QA.md

1. 更新版本号、日期
2. 更新迭代摘要区
3. 更新测试矩阵（新增测试场景）
4. 更新验收清单
5. 更新已知问题列表（移除已修复的、新增发现的）

---

## 第5步：系统性测试执行

### 5.0 认证处理（如需登录态）

**如果用户指定了认证方式：**

使用 gstack/browse：
```bash
# 导入 cookies
$B cookie-import cookies.json
$B goto <target-url>

# 或表单登录
$B goto <login-url>
$B snapshot -i                    # 找到登录表单
$B fill @e3 "user@example.com"
$B fill @e4 "[REDACTED]"         # 绝不在报告中包含真实密码
$B click @e5                      # 提交
$B snapshot -D                    # 验证登录成功
```

使用 Playwright：
```python
page.goto('<login-url>')
page.wait_for_load_state('networkidle')
page.fill('input[name="email"]', 'user@example.com')
page.fill('input[name="password"]', '[REDACTED]')
page.click('button[type="submit"]')
page.wait_for_load_state('networkidle')
page.screenshot(path='/tmp/qa-login-result.png')
```

**如果需要导入浏览器 cookies**：提示用户使用 `/setup-browser-cookies`。
**如果需要 2FA/验证码**：暂停并要求用户提供验证码。

### 5.1 自动化测试

```bash
# 运行项目已有的测试
npm test 2>/dev/null || python -m pytest 2>/dev/null || go test ./... 2>/dev/null || echo "无自动化测试框架"
```

### 5.2 浏览器测试 — gstack/browse 引擎

#### 5.2.1 全局导航探索

```bash
$B goto <URL>
$B snapshot -i -a                # 标注所有可交互元素
$B links                         # 导航结构地图
$B console --errors              # JS 错误
$B network                       # 失败的请求
$B perf                          # LCP、CLS 等性能指标
$B screenshot $REPORT_DIR/screenshots/initial.png
```

**截图后必须用 Read 工具读取截图文件展示给用户。**

#### 5.2.2 框架特定检查

**Next.js**：
- 检查 hydration 错误（`Hydration failed`, `Text content did not match`）
- 监控 `_next/data` 请求是否有 404
- 测试客户端导航（点击链接，不只是 goto）
- 检查 CLS（动态内容页面）

**Rails**：
- 检查 N+1 查询警告
- 验证 CSRF token
- 测试 Turbo/Stimulus 集成

**SPA（React/Vue/Angular）**：
- 使用 `snapshot -i` 导航（`links` 命令可能漏掉客户端路由）
- 检查 stale state（导航离开再回来，数据是否刷新？）
- 测试浏览器前进/后退

#### 5.2.3 页面加载测试

```bash
$B goto <URL>
$B text                    # 页面有内容吗？
$B console --errors        # 有 JS 错误吗？
$B network                 # 有失败的请求吗？
$B screenshot $REPORT_DIR/screenshots/page-load.png
```

**Bug 判断标准（严重）**：
- 页面白屏或 500 错误
- JS 报错导致功能不可用
- 关键资源加载失败（API、图片、脚本）

#### 5.2.4 核心功能测试

基于测试计划或 git diff 识别的核心用户流程，逐一测试：

```bash
# 1. 看所有可交互元素
$B snapshot -i

# 2. 逐步走完流程
$B fill @e3 "测试输入"
$B click @e5

# 3. 验证结果
$B snapshot -D              # 查看前后变化
$B is visible ".success"    # 断言成功状态

# 4. 截图留证
$B screenshot $REPORT_DIR/screenshots/flow-result.png
```

#### 5.2.5 表单和输入测试

对每个表单：
```bash
# 空提交——验证报错是否出现
$B click @submit
$B snapshot -D
$B is visible ".error-message"

# 边界输入测试
$B fill @e3 ""              # 空值
$B fill @e3 "a"             # 最短
$B fill @e3 "$(python3 -c 'print("a"*1000)')"  # 超长

# 成功路径
$B fill @e3 "有效输入"
$B click @submit
$B snapshot -D
```

#### 5.2.6 错误状态测试

- 模拟网络错误（如果可以）
- 测试权限不足的访问
- 测试无效 URL/ID
- 验证错误消息是否清晰（不是"出错了"这种无用提示）

#### 5.2.7 响应式布局测试（标准+详尽级别）

```bash
$B viewport 375x812    # iPhone SE
$B screenshot $REPORT_DIR/screenshots/mobile.png
$B viewport 768x1024   # iPad
$B screenshot $REPORT_DIR/screenshots/tablet.png
$B viewport 1440x900   # 桌面
$B screenshot $REPORT_DIR/screenshots/desktop.png
```

或使用 `$B responsive` 命令一次性生成三个视口的截图。

#### 5.2.8 性能指标采集

```bash
$B perf                    # Core Web Vitals: LCP, CLS, FCP
$B js "performance.getEntriesByType('resource').filter(e => e.duration > 1000).map(e => ({name: e.name, duration: Math.round(e.duration)}))"
```

### 5.3 浏览器测试 — Playwright 引擎

当需要**更复杂的 E2E 流程**（多步骤表单、文件上传、跨页面状态、前后端联动验证）时使用 Playwright。

#### 5.3.1 基本 Playwright 脚本模式

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # 采集控制台错误
    console_errors = []
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)

    page.goto('http://localhost:3456')
    page.wait_for_load_state('networkidle')  # 关键：等待 JS 执行完成

    # 截图
    page.screenshot(path='/tmp/qa-page.png', full_page=True)

    # DOM 检查
    buttons = page.locator('button').all()
    print(f"找到 {len(buttons)} 个按钮")

    # 交互测试
    page.fill('input[name="search"]', '测试关键词')
    page.click('button[type="submit"]')
    page.wait_for_load_state('networkidle')
    page.screenshot(path='/tmp/qa-search-result.png', full_page=True)

    # 输出错误
    if console_errors:
        print(f"发现 {len(console_errors)} 个控制台错误:")
        for err in console_errors:
            print(f"  - {err}")

    browser.close()
```

#### 5.3.2 前后端联动测试（Playwright 专长）

Playwright 特别适合测试**前端发送请求 → 后端处理 → 前端展示结果**的完整链路：

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # 拦截网络请求，验证 API 调用
    api_calls = []
    page.on('request', lambda req: api_calls.append({
        'url': req.url, 'method': req.method
    }) if '/api/' in req.url else None)

    api_responses = []
    page.on('response', lambda res: api_responses.append({
        'url': res.url, 'status': res.status
    }) if '/api/' in res.url else None)

    page.goto('http://localhost:3456')
    page.wait_for_load_state('networkidle')

    # 执行操作并验证 API 请求和响应
    page.click('button.submit-action')
    page.wait_for_load_state('networkidle')

    # 验证前后端联动
    print(f"API 调用: {len(api_calls)}")
    for call in api_calls:
        print(f"  {call['method']} {call['url']}")
    for resp in api_responses:
        print(f"  响应: {resp['status']} {resp['url']}")

    # 截图验证最终状态
    page.screenshot(path='/tmp/qa-api-flow.png', full_page=True)

    browser.close()
```

#### 5.3.3 多服务器启动（前后端分离项目）

使用 webapp-testing 的 `with_server.py` 辅助脚本：

```bash
# 单服务器
python $PW_SERVER --server "npm run dev" --port 5173 -- python /tmp/qa-test.py

# 前后端分离
python $PW_SERVER \
  --server "cd backend && python server.py" --port 3000 \
  --server "cd frontend && npm run dev" --port 5173 \
  -- python /tmp/qa-test.py
```

#### 5.3.4 Playwright 多视口响应式测试

```python
from playwright.sync_api import sync_playwright

viewports = [
    {'name': 'mobile', 'width': 375, 'height': 812},
    {'name': 'tablet', 'width': 768, 'height': 1024},
    {'name': 'desktop', 'width': 1440, 'height': 900},
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for vp in viewports:
        page = browser.new_page(viewport={'width': vp['width'], 'height': vp['height']})
        page.goto('http://localhost:3456')
        page.wait_for_load_state('networkidle')
        page.screenshot(path=f'/tmp/qa-{vp["name"]}.png', full_page=True)
        page.close()
    browser.close()
```

### 5.4 纯代码测试（无浏览器引擎时）

- 逐文件读取实现代码，检查边界情况处理
- 验证错误处理完整性
- 检查测试覆盖率
- 验证数据库操作的安全性
- 检查 API 端点的输入验证

### 5.5 引擎选择决策树

```
测试任务 → 需要截图/视觉验证？
  ├── 是 → gstack/browse 可用？
  │     ├── 是 → 用 gstack/browse（快速，带标注）
  │     │     └── 需要复杂 E2E 流程？→ 是 → 同时用 Playwright 补充
  │     └── 否 → Playwright 可用？
  │           ├── 是 → 用 Playwright（截图+完整 E2E）
  │           └── 否 → 纯代码模式
  └── 否 → 纯代码测试（单元测试、静态分析）
```

**两个引擎协同使用的场景**：
- gstack/browse：快速探索页面、截图、snapshot 标注、简单交互
- Playwright：复杂多步骤流程、网络请求拦截验证、文件上传、跨域测试、前后端联动断言

---

## 第6步：Bug 整理与报告（只记录，不修复）

### Bug 登记格式

```
## Bug #N [严重度]
**现象**：用户看到了什么
**步骤**：
1. 访问 /xxx
2. 点击 xxx
3. 预期：xxx
4. 实际：xxx
**截图**：[路径]
**根因分析**：[文件:行号 — 一句话说明可能的原因]
**建议修复方向**：[简要描述修复思路，供 forge-eng 参考]
```

### Bug 分类

| 严重度 | 定义 | 处理 |
|--------|------|------|
| 严重 | 核心功能完全不可用 | 报告 → 回 forge-eng 修复 |
| 高 | 功能可用但结果错误 | 报告 → 回 forge-eng 修复 |
| 中 | 功能可用但体验差 | 报告 → 视优先级决定 |
| 低 | 外观/措辞问题 | 报告 → 可延后处理 |

### 修复清单产出

所有 Bug 登记完成后，生成一份结构化修复清单，供 `/forge-eng` 使用：

```markdown
# 修复清单（由 forge-qa 生成）

## 必须修复（严重 + 高）
- [ ] Bug #1: {现象} — {文件:行号} — {建议修复方向}
- [ ] Bug #2: ...

## 建议修复（中）
- [ ] Bug #3: ...

## 可延后（低）
- [ ] Bug #5: ...
```

**铁律：forge-qa 不修改任何业务代码，不做 git commit（测试代码除外）。**

---

## 第8步：健康评分与上线就绪

### 健康评分计算

| 维度 | 权重 | 评分方式 |
|------|------|---------|
| 控制台错误 | 15% | 0 错误→100, 1-3→70, 4-10→40, 10+→10 |
| 链接完整性 | 10% | 每个死链 -15，最低 0 |
| 视觉呈现 | 10% | 每个严重 -25, 高 -15, 中 -8, 低 -3 |
| 核心功能 | 20% | 同上扣分规则 |
| 用户体验 | 15% | 同上扣分规则 |
| 性能 | 10% | 同上扣分规则 |
| 内容 | 5% | 同上扣分规则 |
| 无障碍 | 15% | 同上扣分规则 |

`score = Σ (category_score × weight)`

### 上线就绪判断

- ✅ 可以上线：无严重/高 Bug，验收标准全部通过
- ⚠️ 需关注：有中等 Bug，核心功能不受影响 → 建议回 `/forge-eng` 修复后再测
- ❌ 不建议上线：有严重/高优先级 Bug → 必须回 `/forge-eng` 修复

---

## 第9步：确认与总结

### 报告输出

**输出到项目目录**：`$REPORT_DIR/qa-report-{YYYY-MM-DD}.md`

**输出结构**：
```
.gstack/qa-reports/
├── qa-report-{YYYY-MM-DD}.md      # 结构化报告
├── screenshots/
│   ├── baseline.png                # 测试前基准截图
│   ├── initial.png                 # 首页标注截图
│   ├── issue-001-step-1.png        # Bug 证据截图
│   ├── issue-001-after.png         # 修复后截图
│   ├── mobile.png                  # 响应式截图
│   ├── tablet.png
│   ├── desktop.png
│   └── ...
└── baseline.json                   # 回归模式基准数据
```

**保存 baseline.json**（供下次回归对比）：
```json
{
  "date": "YYYY-MM-DD",
  "url": "<target>",
  "healthScore": 85,
  "issues": [{ "id": "BUG-001", "title": "...", "severity": "...", "status": "fixed" }],
  "categoryScores": { "console": 100, "links": 85, "visual": 90, "functional": 80 }
}
```

### 终端报告

```
+============================================================+
|                     QA 交付完成                              |
+============================================================+
| 项目：[项目名]                                               |
| 版本：vX.Y                                                  |
| 测试级别：快速 / 标准 / 详尽                                   |
| 测试模式：Diff-aware / Full / Quick / Regression             |
| 测试引擎：gstack/browse + Playwright / 纯代码                |
+------------------------------------------------------------+
| 健康评分                                                     |
|   测试前：XX/100                                             |
|   测试后：XX/100                                             |
|   改善：+XX 分                                               |
+------------------------------------------------------------+
| Bug 统计                                                     |
|   严重：X 个（已修复 X）                                       |
|   高：X 个（已修复 X）                                         |
|   中：X 个（已修复 X）                                         |
|   低：X 个（已修复 X）                                         |
+------------------------------------------------------------+
| 回归测试                                                     |
|   新增：X 个回归测试                                           |
|   自动化测试：全部通过 / X 个失败                               |
+------------------------------------------------------------+
| 上线就绪：可以上线 / 需关注 / 不建议上线                        |
| 原因：                                                       |
+------------------------------------------------------------+
| 文件：                                                       |
|   QA.md          — [已更新/已创建]                            |
|   QA-CHANGELOG   — [已追加/已创建]                            |
|   报告           — .gstack/qa-reports/qa-report-*.md         |
|   截图           — .gstack/qa-reports/screenshots/           |
+============================================================+
```

### TODOS.md 更新

如果项目有 `TODOS.md`：
- 新增的 deferred Bug → 添加为 TODO，含严重度和复现步骤
- 已修复的 Bug 如果在 TODOS.md 中 → 标注 "Fixed by /forge-qa on {branch}, {date}"

---

## Feature 状态管理（.features/ 架构）

### 核心原则

**领域文档（QA.md）只存内容，不存运行状态。** 运行状态写入 `.features/{feature-id}/status.md`，按 feature 隔离，支持多会话并行。

### 状态标记协议

| 标记 | 含义 |
|------|------|
| `[待处理]` | 已规划，未开始 |
| `[进行中]` | 当前正在执行 |
| `[已完成]` | 执行完成 |
| `[失败]` | 执行失败，需干预 |
| `[暂停]` | 等待用户确认或外部依赖 |

### 状态读写位置

**Pipeline 表**：`.features/{feature-id}/status.md` 的 `qa` 行。
**QA Items 表**：在 status.md 中维护独立的测试项和 Bug 跟踪表。

**不写入**：QA.md。领域文档只存测试计划和验收标准。

### 操作规则

1. **启动时（第0步）**：
   - 读取 `.features/{feature-id}/status.md`，确认前序依赖已完成（eng 行为 `[已完成]`）
   - 将 Pipeline 表中 `qa` 行更新为 `[进行中]`，填入 skill=`forge-qa`、started 时间
   - 更新 `_registry.md` 中该 feature 的 skill 和 heartbeat

2. **测试执行阶段**（第5步）：在 status.md 中追加 QA Items 表：
   ```markdown
   ## QA Items
   | item-id | name | status | severity | commit | note |
   |---------|------|--------|----------|--------|------|
   | TEST-01 | 页面加载 | [已完成] | — | — | 通过 |
   | TEST-02 | 核心功能 | [进行中] | — | — | — |
   | BUG-01 | 去重误判 | [待处理] | critical | — | — |
   ```

3. **每个 Bug 修复并 commit 后**：Bug 行状态改为 `[已完成]`，commit 列填 hash，更新 heartbeat

4. **回归测试**（第7步）：更新 note 字段标注回归通过/失败

5. **全部完成后**：Pipeline 表中 `qa` 行状态改为 `[已完成]`，记录 completed 时间和健康评分，更新 heartbeat

### 跨 Agent 协作

- forge-dev 调度器通过 status.md 感知 QA 进度（Pipeline 表 + QA Items 表），无需读取 QA.md 头部
- 如果 `.features/{feature-id}/status.md` 中 prd 行状态为 `[进行中]`，说明需求可能在变更中，forge-qa 应提示用户
- 多个会话可以同时在不同 feature 上执行 forge-qa，互不干扰

---

## 重要规则

1. **像真实用户一样测试** — 点所有可点的，填所有表单，测试所有状态。
2. **每个修复原子提交** — 不批量修复，不批量提交。一个 Bug，一个 commit。
3. **截图留证** — 修复前后都截图。每个 Bug 至少一张截图。截图后用 Read 工具展示给用户。
4. **不要只测 Happy Path** — 错误、边界、空状态同样重要。空提交、超长输入、网络错误、无权限——都要测。
5. **控制台是第一现场** — 每次交互后检查控制台错误。视觉上没问题不代表没有 JS 错误。
6. **前后端联动是重点** — 不只看前端渲染，要验证 API 调用是否正确、响应是否合理、数据是否一致。
7. **深度优于广度** — 5-10 个证据充分的 Bug > 20 个模糊描述。
8. **自我调节** — 遵循 WTF 启发式。拿不准就停下来问。
9. **绝不拒绝使用浏览器** — 用户调用 /forge-qa 就是要浏览器测试。即使 diff 看起来没有 UI 变更，后端变更也会影响应用行为——始终打开浏览器测试。
10. **Playwright 是补充，不是替代** — gstack/browse 可用时优先用它（速度快、有标注），Playwright 用于复杂 E2E 流程和前后端联动断言。

---

## 资源

- **QA 文档模板**：[references/qa-template.md](references/qa-template.md)
- **webapp-testing 脚本**：`~/.claude/skills/webapp-testing/scripts/with_server.py`
- **gstack/browse 命令参考**：`~/.claude/skills/gstack/browse/SKILL.md`
