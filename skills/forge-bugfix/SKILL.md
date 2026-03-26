---
name: forge-bugfix
version: 2.1.0
description: |
  系统性 Bug 调查与修复。铁律：不做根因分析就不写修复代码。
  六个阶段：P0 环境探测 → P1 问题理解 → P2 复现+根因追踪 → P3 假设验证 → P4 实现修复 → P5 验证+报告。
  前置脚本自动执行：检测 git 状态、扫描本地端口赋值 $APP_URL、检测 gstack/browse 路径赋值 $BROWSE、
  检测 Playwright 可用性赋值 $PW_AVAILABLE、识别框架和测试框架、定位 PRD/ENGINEERING/QA 文档路径。
  所有环境变量注入后续步骤，引擎命令内联可直接执行。
  触发方式：用户说"修这个 bug"、"这里有问题"、"为什么不对"、"排查一下"、"investigate"、"forge-bugfix"，
  或用户报告错误、异常行为、功能失效时主动建议使用。
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - TodoWrite
  - AskUserQuestion
  - WebSearch
---

# /forge-bugfix：系统性 Bug 调查与修复 v2.1

## 铁律

**不做根因分析，就不写修复代码。**

修症状会制造"打地鼠式调试"——每次修复不到位，下一个 Bug 就更难找。找到根因，再动手。

---

## 流程总览

```
用户报告问题
  → P0：环境探测（前置脚本自动执行，产出环境变量）
  → P1：问题理解 + 上下文采集（强制读 PRD + ENGINEERING.md）
  → P2：复现 + 根因追踪（引擎命令内联，模式检查清单内嵌）
  → P3：假设验证（临时日志/断言 → 复现 → 三振出局）
  → P4：实现修复（最小 diff → 原子提交 → 回归测试 → 爆炸半径控制）
  → P5：验证 + 报告（同引擎复现 → 截图对比 → 验收操作清单）
```

全程中文。**红线**：写任何修复代码前必须完成 P1-P3。

---

## P0 环境探测（前置脚本，自动执行）

```bash
# === 基础信息 ===
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
echo "分支: $_BRANCH"
echo "根目录: $_ROOT"
echo "---"

# === 当前会话上下文 ===
echo "=== Git 状态 ==="
git status --porcelain 2>/dev/null | head -20
echo "=== 最近 10 条提交 ==="
git log --oneline -10 2>/dev/null
echo "=== 未提交的变更 ==="
git diff --stat 2>/dev/null | tail -5
echo "---"

# === 复现引擎 1: gstack/browse → 赋值 $BROWSE ===
BROWSE=""
for p in "$_ROOT/.claude/skills/gstack/browse/dist/browse" \
         "$HOME/.claude/skills/gstack/browse/dist/browse" \
         "$_ROOT/.claude/skills/browse/dist/browse" \
         "$HOME/.claude/skills/browse/dist/browse"; do
  [ -x "$p" ] && BROWSE="$p" && break
done
[ -n "$BROWSE" ] && echo "BROWSE=$BROWSE" || echo "BROWSE=（不可用）"

# === 复现引擎 2: Playwright → 赋值 $PW_AVAILABLE ===
PW_AVAILABLE="false"
if command -v npx &>/dev/null && npx playwright --version &>/dev/null 2>&1; then
  PW_AVAILABLE="true"
elif python3 -c "from playwright.sync_api import sync_playwright" 2>/dev/null; then
  PW_AVAILABLE="true"
fi
echo "PW_AVAILABLE=$PW_AVAILABLE"

# === 复现引擎 3: 纯代码（始终可用）===
echo "纯代码模式: 始终可用（curl/test/日志）"
echo "---"

# === 框架检测 ===
echo "=== 框架 ==="
[ -f "$_ROOT/package.json" ] && grep -q '"next"' "$_ROOT/package.json" 2>/dev/null && echo "框架: Next.js"
[ -f "$_ROOT/package.json" ] && grep -q '"react"' "$_ROOT/package.json" 2>/dev/null && echo "框架: React"
[ -f "$_ROOT/package.json" ] && grep -q '"vue"' "$_ROOT/package.json" 2>/dev/null && echo "框架: Vue"
[ -f "$_ROOT/Gemfile" ] && grep -q "rails" "$_ROOT/Gemfile" 2>/dev/null && echo "框架: Rails"
[ -f "$_ROOT/requirements.txt" ] || [ -f "$_ROOT/pyproject.toml" ] && echo "运行时: Python"
[ -f "$_ROOT/go.mod" ] && echo "运行时: Go"
[ -f "$_ROOT/package.json" ] && echo "运行时: Node.js"

# === 测试框架检测 ===
echo "=== 测试框架 ==="
ls "$_ROOT"/jest.config.* "$_ROOT"/vitest.config.* "$_ROOT"/playwright.config.* "$_ROOT"/.rspec "$_ROOT"/pytest.ini "$_ROOT"/pyproject.toml 2>/dev/null
ls -d "$_ROOT"/test/ "$_ROOT"/tests/ "$_ROOT"/spec/ "$_ROOT"/__tests__/ "$_ROOT"/cypress/ "$_ROOT"/e2e/ 2>/dev/null

# === 扫描本地端口 → 赋值 $APP_URL ===
APP_URL=""
for port in 3456 3000 4000 5173 8080 8000; do
  if lsof -i :"$port" -sTCP:LISTEN &>/dev/null 2>&1; then
    APP_URL="http://localhost:$port"
    echo "APP_URL=$APP_URL"
    break
  fi
done
[ -z "$APP_URL" ] && echo "APP_URL=（未检测到运行中的应用）"

# === 项目文档清单 ===
echo "=== 项目文档 ==="
DOC_PRD=""; DOC_ENG=""; DOC_QA=""; DOC_TODOS=""
for p in "$_ROOT/docs/PRD.md" "$_ROOT/PRD.md"; do [ -f "$p" ] && DOC_PRD="$p" && echo "PRD: $p" && break; done
for p in "$_ROOT/docs/ENGINEERING.md" "$_ROOT/ENGINEERING.md"; do [ -f "$p" ] && DOC_ENG="$p" && echo "ENGINEERING: $p" && break; done
for p in "$_ROOT/docs/QA.md" "$_ROOT/QA.md"; do [ -f "$p" ] && DOC_QA="$p" && echo "QA: $p" && break; done
[ -f "$_ROOT/TODOS.md" ] && DOC_TODOS="$_ROOT/TODOS.md" && echo "TODOS: $DOC_TODOS"

# === .features/ 状态 ===
[ -f "$_ROOT/.features/_registry.md" ] && echo "Feature 注册表: 存在" && cat "$_ROOT/.features/_registry.md"

# === 报告目录 ===
REPORT_DIR="$_ROOT/.gstack/bugfix-reports"
mkdir -p "$REPORT_DIR/screenshots" 2>/dev/null
echo "报告目录: $REPORT_DIR"
```

**前置脚本产出的变量，后续所有步骤直接引用：**

| 变量 | 含义 | 示例 |
|------|------|------|
| `$BROWSE` | gstack/browse 可执行路径，空=不可用 | `~/.claude/skills/gstack/browse/dist/browse` |
| `$PW_AVAILABLE` | Playwright 是否可用 | `true` / `false` |
| `$APP_URL` | 本地应用 URL | `http://localhost:3456` |
| `$DOC_PRD` | PRD 文件路径 | `$_ROOT/docs/PRD.md` |
| `$DOC_ENG` | ENGINEERING.md 路径 | `$_ROOT/docs/ENGINEERING.md` |
| `$DOC_QA` | QA.md 路径 | `$_ROOT/docs/QA.md` |
| `$REPORT_DIR` | 截图和报告输出目录 | `$_ROOT/.gstack/bugfix-reports` |

---

## P1 问题理解 + 上下文采集

### 1.1 解析用户输入

用户可能以多种方式报告 Bug：
- 直接描述现象："点击提交按钮没反应"
- 粘贴错误信息/堆栈跟踪
- 提供截图路径
- 引用已有的 Bug ID（QA.md / TODOS.md 中的）

### 1.2 强制读取项目文档

**不读 PRD 就不知道什么是"正确行为"，不读 ENGINEERING.md 就不理解数据流。**

| 文档 | 必须/按需 | 读什么 |
|------|-----------|--------|
| PRD (`$DOC_PRD`) | **必须** | 功能预期行为、验收标准 — 这定义了"Bug 的对立面" |
| ENGINEERING.md (`$DOC_ENG`) | **必须** | 架构、数据流、模块边界 — 这告诉你数据怎么走 |
| QA.md (`$DOC_QA`) | 按需 | 已知问题列表 — 检查是否已被记录 |
| TODOS.md (`$DOC_TODOS`) | 按需 | 待办事项 — 检查是否已在计划中 |
| `git log --since="3 days" -- affected-files` | 按需 | 最近变更 — 如果是回归 Bug，根因在 diff 里 |

**如果 PRD 或 ENGINEERING.md 不存在**：跳过，但在报告中标注"缺少项目文档，预期行为基于代码推断"。

### 1.3 检查工作区状态

```bash
git status --porcelain
```

如果有未提交变更，通过 AskUserQuestion 询问：
- A) 先提交 — commit 当前改动后再开始修复（推荐）
- B) 先暂存 — stash 当前改动，修复完后 pop
- C) 直接开始 — 在当前状态上修复

### 1.4 信息不足时

通过 AskUserQuestion 询问（一次只问一个）：
- 什么操作触发了问题？
- 预期行为是什么？
- 实际行为是什么？
- 这个问题是一直存在还是最近才出现的？

---

## P2 复现 + 根因追踪

### 2.1 复现

**确定性复现是调查的核心。无法复现就无法验证修复。**

引擎优先级：gstack/browse（快+截图）→ Playwright（API 拦截）→ 纯代码（始终可用）

#### gstack/browse 复现（`$BROWSE` 非空时）

```bash
# 导航到问题页面
$BROWSE goto $APP_URL/path/to/page

# 截图保存修复前状态
$BROWSE screenshot $REPORT_DIR/screenshots/before.png

# 查看所有可交互元素
$BROWSE snapshot -i

# 执行触发 Bug 的操作
$BROWSE click @e5

# 查看前后变化
$BROWSE snapshot -D

# 检查 JS 错误
$BROWSE console --errors

# 检查失败的网络请求
$BROWSE network
```

#### Playwright 复现（`$PW_AVAILABLE=true` 时）

```bash
# 运行已有的相关测试
npx playwright test --grep "related-test-name"

# 截图
npx playwright screenshot $APP_URL/path /tmp/bugfix-before.png

# 交互式调试（打开浏览器 UI）
npx playwright open $APP_URL/path

# 自定义复现脚本（写入临时文件执行）
cat > /tmp/bugfix-repro.py << 'PYEOF'
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("APP_URL_HERE")
    page.wait_for_load_state("networkidle")
    # 执行触发 Bug 的操作
    page.click("selector")
    page.wait_for_timeout(2000)
    page.screenshot(path="/tmp/bugfix-before.png", full_page=True)
    browser.close()
PYEOF
python3 /tmp/bugfix-repro.py
```

#### 纯代码复现（始终可用）

```bash
# 直接调用 API
curl -s $APP_URL/api/endpoint | python3 -m json.tool

# 运行相关测试（按项目类型选用）
npm test -- --grep "related-test" 2>/dev/null
python3 -m pytest -k "related-test" -v 2>/dev/null
go test ./... -run "TestRelated" -v 2>/dev/null

# 检查服务端日志
tail -50 $_ROOT/logs/*.log 2>/dev/null
tail -50 $_ROOT/tmp/logs/*.log 2>/dev/null
```

**无法复现 → 停止，不继续。** 收集更多证据或通过 AskUserQuestion 升级。

### 2.2 根因追踪

从症状回溯到根因，遵循这个链条：

1. **Grep 定位引用**：用错误消息文本、函数名、API 端点搜索
2. **Read 追踪调用链**：从入口点（路由/控制器/事件处理器）沿调用链追踪
3. **画数据流**：输入 → 处理 → 输出，在哪一步断裂？
4. **检查最近变更**：
   ```bash
   git log --oneline -20 -- <affected-files>
   git log --oneline --since="3 days ago"
   ```

### 2.3 模式检查清单

追踪过程中对照以下常见模式（不是独立步骤，是追踪时的内嵌检查）：

- **竞态条件** — 间歇性、时序敏感？→ 查共享状态的并发访问
- **空值传播** — TypeError / Cannot read property？→ 查可选值缺少守卫
- **状态不同步** — 数据不一致、部分更新？→ 查事务、回调、生命周期钩子
- **前后端不一致** — 前端异常但 API 正确？→ 查字段映射、类型转换
- **缓存过期** — 旧数据、清缓存后正常？→ 查 Redis/CDN/浏览器/SW 缓存版本号
- **配置漂移** — 本地正常线上不行？→ 查环境变量、特性开关
- **SQL/查询错误** — 数据缺失或重复？→ 查 WHERE 条件、JOIN、去重逻辑

```bash
# 检查同区域历史 Bug — 反复修 Bug 是架构腐烂信号
git log --oneline --all -- <affected-files> | grep -i "fix\|bug\|修复"

# 检查已知问题
grep -i "<关键词>" "$DOC_QA" 2>/dev/null
grep -i "<关键词>" "$DOC_TODOS" 2>/dev/null
```

### 2.4 输出

**"根因假设：……"** — 一个具体的、可验证的断言，说明什么出了问题以及为什么。

---

## P3 假设验证

**在写任何修复代码前，验证假设。**

### 3.1 确认假设

在疑似根因处添加**临时日志/断言/调试输出**：

gstack/browse 验证：
```bash
$BROWSE goto $APP_URL/path
$BROWSE js "localStorage.setItem('debug', 'true')"
$BROWSE click @e5
$BROWSE console    # 查看所有控制台输出（含调试日志）
```

纯代码验证：
```bash
# 在代码中加入临时日志后，重新触发
curl -s $APP_URL/api/endpoint | python3 -m json.tool
# 或运行测试
npm test -- --grep "related-test" 2>/dev/null
```

### 3.2 假设失败

如果假设被证伪：
1. **先搜索**：用脱敏后的错误信息搜索（WebSearch 可用时）— **脱敏规则**：去掉主机名、IP、文件路径、SQL、用户数据
2. **回到 P2**，收集更多证据
3. **不要猜**

### 3.3 三振出局

如果 3 个假设都失败了，**立即停止**。通过 AskUserQuestion：

```
已测试 3 个假设，均不匹配。这可能是架构层面的问题，不是简单的代码 Bug。

A) 继续调查 — 我有新的假设：[描述]
B) 升级处理 — 需要更了解系统的人来看
C) 埋点等待 — 在相关区域添加日志，下次触发时捕获
```

### 红旗信号

看到这些信号时必须**放慢脚步**：
- "先临时修一下" — 没有"临时"。要么修到位，要么升级。
- 还没追踪数据流就提出修复方案 — 你在猜。
- 每次修复都暴露新问题 — 错误的层级，不是错误的代码。

---

## P4 实现修复

根因确认后，开始修复。

### 4.1 修复原则

- **修根因不修症状** — 最小变更，消除实际问题
- **最少的文件、最少的行数** — 抵制"顺手重构"的冲动

### 4.2 爆炸半径控制

**修复涉及 >5 个文件 → 必须通过 AskUserQuestion 确认：**

```
这个修复涉及 N 个文件。对于 Bug 修复来说这是较大的影响范围。

A) 继续 — 根因确实跨越这些文件
B) 拆分 — 先修关键路径，其余延后
C) 重新思考 — 可能有更精准的方案
```

### 4.3 原子提交

```bash
git add <修改的文件>
git commit -m "$(cat <<'EOF'
fix: <一句话描述修复内容>

根因: <根因分析>
修复: <修复方式>
EOF
)"
```

### 4.4 回归测试

1. **Read 2-3 个相近的测试文件**，匹配命名和断言风格
2. 写回归测试，包含归因注释：`// Regression: <Bug 描述>, found by /forge-bugfix on <日期>`
3. 回归测试必须满足：没有修复时会失败，有修复时会通过
4. 运行测试：
   ```bash
   npm test 2>/dev/null || python3 -m pytest 2>/dev/null || go test ./... 2>/dev/null
   ```
5. 测试通过后单独提交：
   ```bash
   git add <测试文件>
   git commit -m "test: 回归测试 — <Bug 描述>"
   ```

测试失败 → 修一次 → 仍失败 → 删除测试，跳过。不要在测试上耗太多时间。

### 4.5 清理

删除所有临时日志/断言/调试输出。验证完假设后的临时代码不能留在代码库里。

---

## P5 验证 + 报告

### 5.1 同引擎复现确认

**用 P2 复现时使用的相同引擎，重新执行原始 Bug 场景，确认已修复。这不是可选步骤。**

gstack/browse：
```bash
$BROWSE goto $APP_URL/path
# 重复触发 Bug 的完整步骤
$BROWSE click @e5
$BROWSE snapshot -D
$BROWSE console --errors
$BROWSE screenshot $REPORT_DIR/screenshots/after.png
```

纯代码：
```bash
curl -s $APP_URL/api/endpoint | python3 -m json.tool
npm test 2>/dev/null || python3 -m pytest 2>/dev/null || go test ./... 2>/dev/null
```

### 5.2 运行完整测试套件

```bash
npm test 2>/dev/null || python3 -m pytest 2>/dev/null || go test ./... 2>/dev/null
```

**不允许任何回归。**

### 5.3 截图对比

用 Read 工具展示 `$REPORT_DIR/screenshots/before.png` 和 `$REPORT_DIR/screenshots/after.png`，让用户直观确认。

### 5.4 结构化报告

```
调试报告
════════════════════════════════════════
症状：     [用户观察到的现象]
根因：     [实际出了什么问题]
修复：     [改了什么，file:line 引用]
证据：     [测试输出、复现验证结果]
回归测试： [测试文件:行号]
相关问题： [TODOS.md 条目、同区域历史 Bug、架构备注]
状态：     完成 | 完成但有顾虑 | 阻塞
════════════════════════════════════════
```

### 5.5 验收操作清单

```
验收操作清单
────────────────────────────────────────
[ ] 1. 修复前截图已确认（$REPORT_DIR/screenshots/before.png）
[ ] 2. 修复后截图已确认（$REPORT_DIR/screenshots/after.png）
[ ] 3. 回归测试通过
[ ] 4. 完整测试套件无回归
[ ] 5. 临时调试代码已清理
[ ] 6. 提交信息包含根因说明
────────────────────────────────────────
```

### 5.6 文档联动

- **QA.md**：如果 Bug 在已知问题列表中 → 标记已修复
- **TODOS.md**：如果 Bug 在 TODOS 中 → 标注 "Fixed by /forge-bugfix on {branch}, {date}"
- **新发现的问题**：不在本次范围内 → 添加为 TODO，不自行修复

---

## AskUserQuestion 格式规范

每次提问结构：
1. **重新聚焦**：当前项目、分支、正在调查的 Bug
2. **通俗解释**：高中生能懂的语言描述问题和当前进展
3. **给出建议**：推荐选项 + 理由
4. **列出选项**：`A) B) C)`

---

## 重要规则

1. **铁律：不做根因分析就不写修复代码。** 直觉再强也要先验证。
2. **强制读 PRD + ENGINEERING.md。** 不知道"正确"是什么就无法判断 Bug。
3. **3 次假设失败 → 停下来质疑架构。** 连续失败说明问题不在你以为的层级。
4. **绝不说"这应该能修好"。** 验证它，证明它。跑测试。
5. **修复涉及 >5 个文件 → 必须确认。** Bug 修复不应该有大的影响范围。
6. **每个修复原子提交。** 一个 Bug，一个 commit。方便回滚。
7. **无法复现就不要修。** 如果不能复现和确认，就不要发布。
8. **截图留证。** 修复前后都截图（浏览器引擎可用时）。截图后用 Read 工具展示给用户。
9. **先查历史。** 同一文件反复修 Bug 是架构腐烂的信号。
10. **清理临时代码。** 验证完假设后，删除所有调试日志/断言。

### 完成状态

- **完成** — 根因找到，修复已应用，回归测试已写，所有测试通过
- **完成但有顾虑** — 已修复但无法完全验证（如间歇性 Bug、需要线上环境确认）
- **阻塞** — 根因不明确，已升级处理

### 升级机制

可以随时停下来说"这个问题超出了我的能力"或"我对这个结果没有信心"。

**糟糕的修复比不修更糟。** 升级不会被惩罚。

升级格式：
```
状态：阻塞 | 需要更多信息
原因：[1-2 句话]
已尝试：[做了什么]
建议：[用户接下来应该做什么]
```
