---
name: forge-qa
version: 3.0.0
description: |
  QA 验收与测试报告 v3.0。纯验收模式：测试+报告，不修代码。
  三层架构：test-spec 生成（文档→验收清单）→ 10 维度 Playwright 断言引擎 → 智能分析（根因定位）。
  核心改进：从"截图工具"升级为"断言引擎"，每个测试必须有 pass/fail，不允许 catch 吞错误。
  支持三种测试引擎：gstack/browse（截图+交互）、Playwright（7 维度 E2E 断言）、纯代码（静态分析）。
  集成 User Gate（用户验收关卡）+ FEEDBACK.md（用户反馈闭环）。
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

## 三层架构

```
┌─────────────────────────────────────────────────┐
│  Layer 1: 测试规格生成（文档 → test-spec.json）     │
│  输入: PRD / DESIGN.md / git diff / 会话上下文       │
├─────────────────────────────────────────────────┤
│  Layer 2: 10 维度 Playwright 断言引擎               │
│  控制台|数据驱动|网络|视觉|交互|响应式|可访问|SSE|URL|懒加载│
├─────────────────────────────────────────────────┤
│  Layer 3: 智能分析（失败归因 + 根因定位）            │
│  console → 源码 → git diff 交叉引用                │
└─────────────────────────────────────────────────┘
```

## 铁律

1. **只测不修** — forge-qa 不修改任何业务代码。发现 bug 记录到报告，由 forge-eng 修复。
2. **不生成 test-spec 就不执行测试** — 先从文档提取验收项，结构化后再执行。
3. **每个测试必须有 pass/fail** — 不允许 `.catch(() => {})` 吞错误，不允许"只截图不断言"。
4. **断言必须验证功能正确性，不能只验证元素存在** — `visible` 和 `count_gte` 是前置条件，不是验收断言。每个测试用例必须至少包含一个验证**数据值/文本内容/状态变化**的深层断言（`contains_text`、`has_attribute`、`css_value`、`matches_regex`、自定义 `evaluate`）。详见下方"断言深度规则"。
5. **证据先于结论** — 每个测试结果必须有截图、输出、或日志作为证据。
6. **控制台零容忍** — 任何 `pageerror` 或 `console.error` 自动 FAIL。

## 定位说明

| forge-eng 负责 | forge-qa 负责 |
|----------------|--------------|
| 单元测试（TDD 红绿重构） | **端到端用户流程测试** |
| 原子 commit 验证（exit code） | **跨模块集成测试** |
| 任务级验证 | **7 维度断言（视觉+响应式+可访问性+网络+数据驱动）** |
| — | **验收标准逐项核对** |
| — | **User Gate（用户验收关卡）** |

## 完整流程

```
第0步 上下文探测
  ├── 0.1 Worktree 检测
  ├── 0.2 文档链定位（PRD/DESIGN/ENGINEERING/FEEDBACK）
  ├── 0.3 变更范围分析（git diff）
  ├── 0.4 选择器审计（铁律：不盲猜选择器）
  └── 0.5 测试级别确认
  │
第1步 建立健康基准
  │
  ├── 已有 QA.md → 第2步 理解现状
  └── 无 QA.md   → 第2步(替代) 从零创建
  │
第2.5步 生成 test-spec（铁律：不生成就不执行）
  │
第3步 测试计划确认（用户审查 test-spec 摘要）
  │
第4步 更新 QA 文档
  │
第5步 10 维度测试执行
  ├── Phase 1: 控制台[console] + 网络[network]
  ├── Phase 2: 交互[functional] + 数据驱动[data-driven] + SSE[streaming] + URL状态[url-state] + 懒加载[async-content]
  ├── Phase 3: 视觉[visual] + 响应式[responsive]
  └── Phase 4: 可访问性[accessibility]
  │
第6步 智能分析 + Bug 报告
  │
第7步 User Gate（用户验收 — 不可跳过）
  │
  ├── accept → forge-ship
  └── reject → FEEDBACK.md → forge-eng → forge-qa (回归) → User Gate
```

全程中文。关键测试策略需用户确认后再执行。

## 报告产出后的出口

```
QA 验收完成。下一步：

[全部通过 + 用户验收通过]
→ /forge-ship 或 /forge-review

[有 FAIL 或用户 reject]
→ 生成修复清单 + FEEDBACK.md → /forge-eng 修复 → /forge-qa 回归
```

---

## 前置脚本

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
echo "当前分支: $_BRANCH"

# === Worktree 检测 ===
_IN_WORKTREE="no"
_WORKTREE_ROOT=""
git worktree list 2>/dev/null | while read line; do
  echo "  worktree: $line"
done
[ "$(git rev-parse --git-common-dir 2>/dev/null)" != "$(git rev-parse --git-dir 2>/dev/null)" ] && _IN_WORKTREE="yes" && _WORKTREE_ROOT="$_ROOT"
echo "在 Worktree 中: $_IN_WORKTREE"

# === 测试引擎 1: gstack/browse ===
B=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/.claude/skills/gstack/browse/dist/browse" ] && B="$_ROOT/.claude/skills/gstack/browse/dist/browse"
[ -z "$B" ] && [ -x "$HOME/.claude/skills/gstack/browse/dist/browse" ] && B="$HOME/.claude/skills/gstack/browse/dist/browse"
[ -n "$B" ] && echo "gstack/browse: $B" || echo "gstack/browse: 不可用"

# === 测试引擎 2: Playwright ===
PW=""
command -v npx >/dev/null 2>&1 && npx playwright --version >/dev/null 2>&1 && PW="npx"
[ -z "$PW" ] && python3 -c "from playwright.sync_api import sync_playwright" 2>/dev/null && PW="python"
[ -n "$PW" ] && echo "Playwright: 可用 ($PW)" || echo "Playwright: 不可用"

# === qa-runner.mjs 检测 ===
QA_RUNNER=""
[ -f "$HOME/.claude/skills/forge-qa/scripts/qa-runner.mjs" ] && QA_RUNNER="$HOME/.claude/skills/forge-qa/scripts/qa-runner.mjs"
[ -n "$QA_RUNNER" ] && echo "qa-runner: $QA_RUNNER" || echo "qa-runner: 不可用"

# === 框架检测 ===
[ -f "$_ROOT/package.json" ] && grep -q '"react"' "$_ROOT/package.json" 2>/dev/null && echo "框架: React"
[ -f "$_ROOT/package.json" ] && grep -q '"vue"' "$_ROOT/package.json" 2>/dev/null && echo "框架: Vue"
[ -f "$_ROOT/package.json" ] && grep -q '"next"' "$_ROOT/package.json" 2>/dev/null && echo "框架: Next.js"
[ -f "$_ROOT/requirements.txt" ] || [ -f "$_ROOT/pyproject.toml" ] && echo "运行时: Python"
[ -f "$_ROOT/package.json" ] && echo "运行时: Node.js"

# === 本地服务探测 ===
echo "本地服务:"
for port in 3000 3456 4000 5173 8080 8081; do
  curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port" 2>/dev/null | grep -qE "200|301|302|304" && echo "  http://localhost:$port ✓"
done

# === 报告目录 ===
REPORT_DIR="$_ROOT/.gstack/qa-reports"
mkdir -p "$REPORT_DIR/screenshots" 2>/dev/null
echo "报告目录: $REPORT_DIR"
```

---

## AskUserQuestion 格式规范

每次提问结构：
1. **重新聚焦**：当前项目、分支、正在测试的功能
2. **通俗解释**：高中生能懂的语言描述问题
3. **给出建议**：推荐选项 + 完整度评分
4. **列出选项**：`A) B) C)` + 工作量估算

---

## 第0步：上下文探测与环境准备

### 0.1 Worktree 检测（铁律：在正确的分支上测试）

按优先级检测工作环境：

1. **forge-dev 调度传入**：如果 Agent prompt 中包含 `worktree_path`，直接 `cd` 进入
2. **当前目录检测**：前置脚本已检测 `_IN_WORKTREE`，如果是则直接使用
3. **扫描已有 worktree**：`git worktree list` 查找最近的 `eng/*` 分支
4. **当前分支为 feature 分支**：如果当前在 `eng/*` 或非 `main` 分支，可以直接测试
5. **询问用户**：如果当前在 main 且无 worktree，通过 AskUserQuestion 询问

确认后输出：
```
🔧 测试环境：
  Worktree: /path/to/.worktrees/feature-slug (或 "当前目录")
  Branch:   eng/feature-slug-2026-03-28
  Base:     main
```

### 0.2 文档链定位

按搜索模式定位所有参考文档，forge-dev 传入的路径优先级最高：

```bash
# PRD
for f in docs/PRD.md PRD.md docs/*PRD*; do [ -f "$f" ] && echo "PRD: $f" && break; done

# DESIGN
for f in DESIGN.md docs/DESIGN.md docs/DESIGN-BLUEPRINT.md; do [ -f "$f" ] && echo "DESIGN: $f" && break; done

# ENGINEERING
for f in docs/ENGINEERING.md ENGINEERING.md; do [ -f "$f" ] && echo "ENGINEERING: $f" && break; done

# FEEDBACK（历史用户反馈，回归测试用）
for f in FEEDBACK.md docs/FEEDBACK.md; do [ -f "$f" ] && echo "FEEDBACK: $f" && break; done

# QA
for f in docs/QA.md QA.md; do [ -f "$f" ] && echo "QA: $f" && break; done

# .features/status
ls .features/*/status.md 2>/dev/null | head -5
```

**文档版本校验**：读取文档后提取版本号，与 `.features/status.md` 中记录的 PRD 版本对比。不一致则警告。

**降级模式**：如果找不到 PRD/DESIGN → 降级为"无文档模式"（只做 console + 响应式 + 可访问性基础测试）。

### 0.3 变更范围分析

```bash
# 基准分支
BASE=$(gh pr view --json baseRefName -q .baseRefName 2>/dev/null || echo "main")

# 变更文件列表
git diff $BASE...HEAD --name-only 2>/dev/null
git diff $BASE...HEAD --stat 2>/dev/null

# 变更摘要
git log $BASE..HEAD --oneline 2>/dev/null
```

变更文件 → 推断影响范围 → 决定测试重点（Diff-aware 模式）。

### 0.4 选择器审计（铁律：不盲猜选择器）

**在生成 test-spec 前，必须扫描代码确认可用选择器。** 不同项目的 DOM 结构完全不同，不能假设任何 `data-testid` 或 ARIA 属性存在。

```bash
# 扫描项目中可用的选择器锚点
echo "=== data-testid ==="
grep -r 'data-testid' src/ --include='*.tsx' --include='*.jsx' --include='*.vue' --include='*.html' -l 2>/dev/null | head -10

echo "=== data-* 属性 ==="
grep -roh 'data-[a-z_-]*=' src/ --include='*.tsx' --include='*.jsx' --include='*.vue' -h 2>/dev/null | sort -u | head -20

echo "=== ARIA 属性 ==="
grep -roh 'role="[^"]*"\|aria-[a-z]*=' src/ --include='*.tsx' --include='*.jsx' --include='*.vue' -h 2>/dev/null | sort -u | head -20

echo "=== 语义化 HTML ==="
grep -roh '<\(nav\|main\|aside\|header\|footer\|section\|article\|dialog\)[> ]' src/ --include='*.tsx' --include='*.jsx' --include='*.vue' -h 2>/dev/null | sort | uniq -c | sort -rn | head -10
```

**根据扫描结果决定选择器策略：**

| 项目状态 | 选择器策略 | test-spec 中使用 |
|---------|-----------|----------------|
| 有丰富 `data-testid` | 直接使用 testid | `[data-testid='feed-section']` |
| 有 `data-*` 属性但非 testid | 使用已有 data 属性 | `[data-platform='twitter']`, `[data-item-id]` |
| 有 ARIA 属性 | 使用 role + aria | `[role='tab']`, `[aria-selected='true']` |
| 有语义化 HTML | 使用语义标签 | `main`, `nav`, `dialog` |
| 以上都没有 | **文本 + CSS 组合** | `button:has-text("搜索")`, `.card-container > .card:nth-child(1)` |

**选择器优先级（从稳定到脆弱）：**

```
1. getByRole('tab', { name: '推荐' })    ← 最稳定，语义化
2. [data-testid='feed-section']           ← 专为测试设计
3. [data-platform='twitter']              ← 业务语义属性
4. [role='dialog']                        ← ARIA 属性
5. button:has-text("搜索")                ← 可见文本
6. main > section:first-child             ← 结构选择器
7. .bg-card.rounded-lg                    ← CSS class（最脆弱）
```

**如果项目零 data-testid：**
- **不要在 test-spec 中编造 `data-testid`**——这会导致所有测试因选择器找不到而假性 FAIL
- 使用上述优先级中实际存在的选择器
- 在 QA 报告的"改进建议"中标注：建议 forge-eng 在关键交互元素上补充 `data-testid`

**输出选择器映射表**（供 test-spec 生成时引用）：

```
🔍 选择器审计结果：
  data-testid: 0 个（项目未使用 testid）
  data-* 属性: data-platform, data-item-id, data-section
  ARIA: role="dialog" (1处), role="button" (3处)
  语义标签: main, nav, section, header

  推荐策略：data-* 属性 + 文本选择器 + 语义标签组合

  关键元素映射：
  ├── 信息卡片: [data-platform] 或 .cursor-pointer:has(h3)
  ├── 详情面板: [role="dialog"] 或 [class*="detail"]
  ├── Tab 导航: button:has-text("推荐") 等
  └── 搜索框: input[type="search"] 或 input[placeholder*="搜索"]
```

### 0.5 测试级别与模式

**测试级别**（如用户未指定，通过 AskUserQuestion 确认）：

- A) **快速** — 只测 P0 核心流程（约5-10分钟）→ Phase 1+2
- B) **标准** — 快速 + P1 视觉/响应式（约15-30分钟）→ Phase 1+2+3
- C) **详尽** — 标准 + P2-P3 可访问性和边界（约30-60分钟）→ Phase 1+2+3+4

**测试模式**（自动选择）：

| 模式 | 触发条件 | 行为 |
|------|---------|------|
| **Diff-aware** | 在 feature 分支且有 base diff | 从 diff 推断影响范围，聚焦测试 |
| **Full** | 指定了 URL 或用户要求 | 系统性遍历所有页面 |
| **Regression** | 存在 FEEDBACK.md 或历史 QA 报告 | 优先测试历史反馈项 + 变更回归 |

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

使用 gstack/browse 或 Playwright 截取基准截图和控制台状态。

---

## 第2步：理解现状

### 迭代模式（已有 QA.md）
1. 读取 PRD 最新迭代摘要，提取验收标准
2. 读取 ENGINEERING.md，提取 API 契约和测试矩阵
3. 读取 DESIGN.md，提取视觉硬规则（字号、颜色、间距）
4. 读取 FEEDBACK.md（如有），提取历史用户反馈 → 纳入回归基线
5. 读取 QA.md + QA CHANGELOG，做热点分析
6. 向用户总结当前状态

### 从零创建模式（无 QA.md）
1. 分析项目测试现状（检查 tests/、覆盖率、CI 配置）
2. 与用户多轮确认（测试策略、范围、验收标准）
3. 产出 QA.md 初稿（参考 [references/qa-template.md](references/qa-template.md)）

---

## 第2.5步：生成 test-spec（铁律：不生成就不执行）

### 输入 → 输出映射

| 输入源 | 提取内容 | 转化为 |
|--------|---------|-------|
| PRD 验收标准 | "用户点击卡片，弹出详情面板" | `functional` 断言 |
| DESIGN.md 规则 | "最小字号 12px"、"4px 间距网格" | `visual` CSS 断言 |
| ENGINEERING.md API | "GET /api/feed → { items: [...] }" | `network` 断言 |
| git diff | "修改了 DetailPanel.tsx" | `regression` 聚焦断言 |
| 会话上下文 | "刚实现了频道切换功能" | `functional` 断言 |
| FEEDBACK.md | 历史用户反馈 | `regression` 回归断言 |

### test-spec.json 结构

**重要：选择器必须来自 Step 0.4 的审计结果，不能编造不存在的 `data-testid`。** 下面的示例用 `$SELECTOR_*` 占位符表示"根据审计结果填充实际选择器"。

```json
{
  "metadata": {
    "source": "PRD.md v10.1 + DESIGN.md v2",
    "branch": "eng/feature-slug-2026-03-28",
    "generated_at": "2026-03-28T10:00:00Z",
    "scope": "full | diff-aware | regression",
    "app_url": "http://localhost:8080",
    "selector_strategy": "data-* + text + semantic"
  },
  "selector_map": {
    "_comment": "Step 0.4 审计产出，所有 case 引用此映射",
    "feed_section": "main > section:first-child",
    "info_card": ".cursor-pointer:has(h3)",
    "detail_panel": "[role='dialog']",
    "tab_nav": "nav button",
    "search_input": "input[placeholder*='搜索']"
  },
  "suites": [
    {
      "id": "feed-display",
      "name": "信息流展示",
      "source_ref": "PRD.md#v10.0-信息流",
      "priority": "P0",
      "cases": [
        {
          "id": "feed-001",
          "description": "首页加载后展示信息卡片",
          "dimension": "functional",
          "steps": [
            { "action": "navigate", "url": "/" },
            { "action": "wait", "selector": "main > section:first-child", "timeout": 8000 }
          ],
          "assertions": [
            { "type": "visible", "selector": "main > section:first-child" },
            { "type": "count_gte", "selector": ".cursor-pointer:has(h3)", "min": 1 },
            { "type": "contains_text", "selector": "main", "texts": ["$EXPECTED_SECTION_TITLE"] },
            { "type": "no_console_errors" }
          ]
        },
        {
          "id": "feed-002",
          "description": "卡片点击→详情面板，验证内容完整性（数据驱动）",
          "dimension": "data-driven",
          "data_driven": {
            "selector": ".cursor-pointer:has(h3)",
            "sample_size": 15,
            "strategy": "stratified"
          },
          "steps": [
            { "action": "click", "selector": "$item" },
            { "action": "wait", "selector": "[role='dialog']", "timeout": 5000 }
          ],
          "assertions": [
            { "type": "visible", "selector": "[role='dialog']" },
            { "type": "evaluate", "description": "详情面板有标题且文本长度 > 0",
              "script": "const panel = document.querySelector('[role=\"dialog\"]'); const title = panel?.querySelector('h2, h3'); if (!title || title.textContent.trim().length === 0) throw new Error('详情面板标题为空')" },
            { "type": "evaluate", "description": "详情面板有实质内容（不只是骨架屏）",
              "script": "const panel = document.querySelector('[role=\"dialog\"]'); const textLen = panel?.innerText?.trim().length || 0; if (textLen < 50) throw new Error(`面板内容过短: ${textLen} 字符`)" },
            { "type": "no_console_errors" }
          ]
        }
      ]
    }
  ]
}
```

**选择器规则**（参考 Step 0.4 审计 + Playwright 最佳实践）：
- 只使用审计中确认存在的选择器，**绝不编造不存在的 `data-testid`**
- 优先级：`role/aria` > `data-*` 属性 > 语义标签 > 可见文本 > CSS class 组合
- 如果项目缺乏稳定选择器，在 QA 报告的"改进建议"中提出，交由 forge-eng 补充

### 断言深度规则（铁律 4 的展开）

**核心原则："it renders" ≠ "it works correctly"。**

每个 test case 的 assertions 数组必须包含至少一个**深层断言**。`visible` 和 `count_gte` 只能作为前置条件（确认元素在 DOM 中），不能作为验收断言。

#### ❌ 反面示例（浅断言 — 只验证"存在"不验证"正确"）

```json
{
  "id": "starred-001",
  "description": "收藏页展示收藏的卡片",
  "assertions": [
    { "type": "visible", "selector": "section.starred-view" },
    { "type": "count_gte", "selector": ".cursor-pointer:has(h3)", "min": 1 }
  ]
}
```
问题：只验证了"收藏页有卡片"，没验证卡片**确实是收藏的**、内容**确实渲染了**。

#### ✅ 正面示例（深层断言 — 验证数据正确性和功能完整性）

```json
{
  "id": "starred-001",
  "description": "收藏页展示收藏的卡片",
  "assertions": [
    { "type": "visible", "selector": "section.starred-view" },
    { "type": "count_gte", "selector": ".cursor-pointer:has(h3)", "min": 1 },
    { "type": "evaluate", "description": "每张卡片有标题且标题非空",
      "script": "const cards = document.querySelectorAll('.cursor-pointer:has(h3)'); cards.forEach((c, i) => { const title = c.querySelector('h3'); if (!title || title.textContent.trim().length === 0) throw new Error(`第 ${i+1} 张卡片标题为空`) })" },
    { "type": "evaluate", "description": "收藏页卡片数量与页面显示的统计数一致",
      "script": "const displayed = document.querySelectorAll('.cursor-pointer:has(h3)').length; const header = document.querySelector('h2, [class*=\"header\"]')?.textContent || ''; const match = header.match(/(\\d+)/); if (match && displayed !== parseInt(match[1])) throw new Error(`显示 ${displayed} 张但标题显示 ${match[1]}`)" }
  ]
}
```

#### 更多断言深度检查表（生成 test-spec 时逐条对照）

| 测试场景 | 浅断言（❌ 不够） | 深层断言（✅ 必须） |
|---------|-----------------|-------------------|
| 详情/弹窗 | `panel.isVisible()` | `panel.innerText.length > 50` + 包含标题/关键区块 |
| 列表/收藏 | `cards.count() > 0` | 每张卡片有标题且非空，数量与页头统计一致 |
| Tab/频道切换 | `section.isVisible()` | 切换后内容区文本变化（不是切前的旧内容） |
| SSE/流式生成 | `button.isVisible()` | 触发 → 中间态可观测 → 完成后结果持久化（reload 仍在） |
| 搜索/过滤 | `results.isVisible()` | 结果包含关键词，数量合理，空结果有空状态提示 |
| 模态框/对话框 | `dialog.isVisible()` | 有标题 + 正文文本长度 > 0 + Escape 可关闭 |
| 表单提交 | `form.isVisible()` | 填充 → 提交 → 反馈出现（toast/跳转/数据变化） |
| URL/深度链接 | `page.loaded()` | 直接访问带参数的 URL → 视图状态与参数一致 |
| 懒加载内容 | `skeleton.gone()` | 等待加载完成 → 内容非空 → 数量/值与预期一致 |

#### 自检规则

生成 test-spec 后，**自动扫描**所有 case：
- 如果某个 case 的 assertions 只有 `visible`/`count_gte`/`hidden` 类型 → **标记为 ⚠️ 浅断言**，必须补充深层断言
- 如果某个 case 没有任何 `contains_text`/`evaluate`/`has_attribute`/`css_value`/`matches_regex` → **拒绝执行**，回到 test-spec 生成步骤补充

### test-spec 不是手写的

test-spec 由 Claude 基于文档理解自动生成，但它是**结构化的、可审查的**。生成后必须输出摘要供用户确认。

---

## 第3步：生成验收计划并请用户确认

**铁律：不是技术 test-spec 的摘要，而是用户可读的验收计划。** 用户需要先理解"要验什么"，才能判断测试是否充分。

### 3.1 检查 Feature Spec

读取 PRD 中的 Feature Spec 章节。如果存在：
- 从 Feature Spec 的验收检查表提取所有验收项
- 将 Given/When/Then 场景映射为 test-spec 用例
- Feature Spec 的验收检查表是 QA 的**主要输入**，test-spec 的每个用例 SHALL 可追溯到 Feature Spec 中的某个场景

如果 Feature Spec 不存在：
- 通过 AskUserQuestion 警告：「PRD 中没有 Feature Spec，QA 将基于 PRD 功能描述生成测试，但验收标准可能不够精确。建议先运行 /forge-prd 补充 Feature Spec。」
- 如果用户选择继续，降级为从 PRD 功能描述 + DESIGN.md 提取验收项

### 3.2 生成验收计划文档

基于 Feature Spec（或降级来源），生成一份**先全局后细节**的验收计划：

```markdown
## QA 验收计划：{功能名}

### 全局验证（先看整体是否符合预期）

#### 用户流程完整性（对标 Feature Spec 第一节）
- [ ] 用户流程从 {入口} 到 {出口} 无断点
- [ ] 异常路径均有对应的错误处理
- [ ] 流程图中的每个步骤在实际页面中都可达

#### 页面/系统结构合规性（对标 Feature Spec 第二节）
- [ ] 整体布局与 Feature Spec 的结构图一致
- [ ] 各区块职责与描述匹配
- [ ] 组件列表完整，无遗漏无多余

---

### 逐项验证（再看具体细节）

| # | 验收项 | 来源 | 测试方法 | 断言类型 |
|---|--------|------|---------|---------|
| 1 | {场景描述} | Feature Spec: {Requirement名}.正常 | {Playwright/gstack} | {contains_text/css_value/...} |
| 2 | {场景描述} | Feature Spec: {Requirement名}.异常 | ... | ... |
| ... | ... | ... | ... | ... |

---

### 视觉合规验证（对标 DESIGN.md + Feature Spec CSS 约束）

| # | 组件 | CSS 属性 | 预期值 | 断言方式 |
|---|------|---------|--------|---------|
| V1 | {组件名} | font-size | {值} | css_value |
| V2 | {组件名} | color | {值} | css_value |
| V3 | {组件名} | padding | {值} | css_value |
| ... | ... | ... | ... | ... |

---

共 {N} 项验收（功能 {X} 项 + 视觉 {Y} 项 + 流程 {Z} 项），预计 {时间}。
```

### 3.3 用户确认

通过 AskUserQuestion 展示验收计划摘要并等待确认：

```
📋 验收计划已生成（基于 Feature Spec + DESIGN.md）

全局验证：
  - 用户流程完整性：{步骤数} 步
  - 页面结构合规性：{区块数} 区块，{组件数} 组件

逐项验证：
  - 功能场景：{X} 项（{功能点数} 个功能点 × 3 场景）
  - 视觉合规：{Y} 项（CSS 属性断言）
  - 流程完整：{Z} 项

A) 确认执行
B) 需要增减测试项（说明哪些）
C) 需要看完整验收计划再决定
D) Feature Spec 有误，需要先修正
```

**⚠️ 用户确认后才执行测试。**

---

## 第4步：更新 QA 文档

1. 更新/创建 QA.md（参考 [references/qa-template.md](references/qa-template.md)）
2. 更新 QA CHANGELOG
3. 将 test-spec.json 保存到报告目录

---

## 第5步：7 维度测试执行

**使用 qa-runner.mjs 框架。** 详细代码模板参考 [references/test-dimensions.md](references/test-dimensions.md)。

### 测试脚本编写规范

**必须使用 qa-runner.mjs 框架**，不从零写脚本：

```javascript
import { TestCollector, attachMonitors, snap, snapElement, createPage, pickStratified, writeResults } from '$QA_RUNNER';

const collector = new TestCollector();
const { browser, page } = await createPage();
attachMonitors(page, collector);

// ... 测试逻辑（使用 collector.pass/fail/skip）...

collector.printSummary();
writeResults(collector);
await browser.close();
process.exit(collector.summary().failed > 0 ? 1 : 0);
```

**`$QA_RUNNER` 替换为前置脚本检测到的路径。**

### 执行分阶段（快速失败）

```
Phase 1 冒烟（所有级别都执行）
  ├── 控制台零容忍 [console]：page.on('pageerror') + page.on('console error')
  ├── 首页加载：导航 → 等待 → 断言核心元素可见
  └── API/网络基础 [network]：检查 /api/* 状态码 < 400
  → 如果 Phase 1 全 FAIL → 停止测试（环境问题），报告并退出

Phase 2 核心功能（快速+标准+详尽）
  ├── 交互完整性 [functional]：Tab 切换、按钮点击、模态框开关
  ├── 数据驱动遍历 [data-driven]：采样 N 个元素，逐一验证
  ├── SSE/流式生成 [streaming]：全链路（触发→中间态→完成→持久化），有 SSE 时启用
  ├── URL 状态 [url-state]：正反向验证（操作→URL + URL→视图恢复），有路由状态时启用
  └── 懒加载/异步 [async-content]：加载态→内容验证→分页/进度，有异步加载时启用
  → 覆盖 P0 用例

Phase 3 视觉+响应式（标准+详尽）
  ├── 视觉规则断言 [visual]：CSS 属性验证（字号、颜色、间距）
  └── 响应式断点 [responsive]：375/768/1440 三个视口
  → 覆盖 P1 用例

Phase 4 深度（仅详尽级别）
  ├── 可访问性 [accessibility]：axe-core WCAG 2.0 AA
  └── 边界条件：空数据、超长文本、网络异常
  → 覆盖 P2-P3 用例
```

### 7 维度概述

#### 维度 1: 控制台零容忍 [console]

`attachMonitors()` 自动挂载。每个导航/交互后通过 `collector.checkConsoleErrors()` 检查。
任何 `pageerror` = 自动 FAIL，包含错误文本和 stack trace。

**能发现**：React 渲染崩溃、未捕获异常、404 资源
**不能发现**：被 try-catch 包裹的静默错误

#### 维度 2: 数据驱动遍历 [data-driven]

不测 1 个元素，采样 N 个。使用 `pickStratified()` 分层采样（首尾 + 均匀分布）。
每个元素独立 pass/fail，统计崩溃率并推算总体影响。

**能发现**：27% 卡片因数据类型不一致崩溃（当前完全测不到的）
**不能发现**：需要特定数据组合才触发的 bug

#### 维度 3: 网络契约验证 [network]

`attachMonitors()` 自动收集 `/api/*` 响应。断言：状态码 < 400 + 响应结构匹配。
如果 ENGINEERING.md 定义了 API schema，验证响应 JSON 结构。

**能发现**：API 404、响应结构变更、后端未启动
**不能发现**：语义正确但数据错误的响应

#### 维度 4: 视觉规则断言 [visual]

从 DESIGN.md 提取硬规则 → CSS 断言。使用 `page.evaluate(el => getComputedStyle(el))`。
检查项：字号 ≥ 12px、间距遵循 4px 网格、平台配色正确。

**能发现**：字号不达标、间距违规、颜色错误
**不能发现**："看起来不对但 CSS 值合规"的美学问题

#### 维度 5: 交互完整性 [functional]

每个可交互元素：操作 → 状态变化断言 → 可逆性验证。
Tab: `click → aria-selected === true → panel visible`
模态框: `click → modal visible → Escape → modal gone`

**能发现**：Tab 崩溃、按钮无响应、模态框不可关闭
**不能发现**：交互流畅度、动画是否自然

#### 维度 6: 响应式断点 [responsive]

三个断点：mobile(375×812) / tablet(768×1024) / desktop(1440×900)。
每个断点检查：无水平溢出 + 触控目标 ≥ 44px + 截图留证。

#### 维度 7: 可访问性 [accessibility]

axe-core WCAG 2.0 AA 扫描 + 键盘导航验证（Tab 遍历 + Enter 激活 + Escape 关闭）。

#### 维度 8: SSE / 流式生成全链路 [streaming]

**适用条件**：项目包含 SSE 端点、WebSocket、流式 AI 生成等实时特性。通过 Step 0.4 扫描 `EventSource`、`fetch.*stream`、`WebSocket` 判断是否启用。

测试全生命周期，不只是"按钮存在"：

```
触发入口（按钮/表单）→ 中间态（loading/thinking/progress）→ 数据流（逐步到达）→ 完成态 → 持久化验证（reload 后数据仍在）
```

关键断言：
- 触发后：中间态 UI 出现（spinner/进度条/thinking 动画），按钮变为不可操作
- 流式期间：内容区逐步增长（`textContent.length` 单调递增）
- 完成后：loading 消失，最终内容完整渲染
- 取消/中断：如果有取消按钮，点击后回到 idle 态，无残留
- **持久化**：刷新页面后，生成的内容仍然存在（最关键的深层断言）
- 错误恢复：模拟网络中断（`page.route` 拦截 → abort），UI 显示错误态而非卡死

#### 维度 9: URL 状态 / 深度链接 [url-state]

**适用条件**：项目使用 hash 路由（`#view=xxx`）、query 参数（`?tab=xxx`）、或 SPA 路由（`/page/xxx`）管理视图状态。通过 Step 0.4 扫描 `useHash`、`useRouter`、`history.pushState`、`window.location.hash` 判断是否启用。

测试双向一致性：

```
操作 → URL 变化        （正向：UI 操作驱动 URL 更新）
URL → 视图恢复         （反向：直接访问 URL 恢复完整状态）
```

关键断言：
- **正向**：点击 Tab/频道/卡片 → `page.url()` 包含对应参数
- **反向**：直接 `page.goto(url_with_params)` → 视图状态正确恢复（Tab 选中、内容加载）
- **深度链接**：带完整参数的 URL（如 `#l1=recommend&d=item-123`）→ 详情面板自动打开，内容正确
- **浏览器前进/后退**：`page.goBack()` / `page.goForward()` → 视图正确切换
- **边界**：无效参数的 URL（如 `#d=nonexistent-id`）→ 优雅降级，不白屏

#### 维度 10: 懒加载 / 异步内容 [async-content]

**适用条件**：项目包含分页加载、无限滚动、骨架屏、点击后异步获取详情等模式。几乎所有现代 SPA 都适用。

测试加载全生命周期：

```
触发加载 → 加载态（skeleton/spinner）→ 内容到达 → 加载态消失 → 内容正确
```

关键断言：
- **等待策略**：不用 `waitForTimeout` 硬等，使用 `waitForResponse` 或 `waitForSelector` 等具体条件
- **骨架屏消失**：如果有 skeleton，等待 `.skeleton` 消失再断言内容
- **内容非空**：加载完成后，内容区 `textContent.length > 0`（不只是 skeleton 被替换为空 div）
- **分页/进度**：如果有进度提示（"加载中 500/10740"），验证进度文本格式正确，全部加载完成后进度消失
- **滚动加载**：`page.mouse.wheel` 或 `scrollIntoView` 触发加载 → 新内容出现 → 总量增加
- **加载失败**：`page.route` 拦截 API 返回 500 → 显示错误提示而非无限 loading

**通用等待模式**（替代 `waitForTimeout`）：

```javascript
// ❌ 硬等（不可靠，慢）
await page.waitForTimeout(3000);

// ✅ 等 API 响应（精确）
await page.waitForResponse(resp => resp.url().includes('/api/feed') && resp.status() === 200);

// ✅ 等骨架屏消失（语义化）
await page.waitForSelector('.skeleton', { state: 'hidden', timeout: 10000 });

// ✅ 等内容出现（直接）
await page.waitForSelector('main .cursor-pointer:has(h3)', { timeout: 10000 });

// ✅ 等网络空闲（兜底）
await page.waitForLoadState('networkidle');
```

### gstack/browse 引擎（快速探索和截图标注）

当 gstack/browse 可用时，可作为 Playwright 的补充：

```bash
$B goto <URL>
$B snapshot -i -a     # 标注所有可交互元素
$B console --errors   # 控制台错误
$B network            # 网络请求
$B perf               # LCP、CLS 性能
$B screenshot $REPORT_DIR/screenshots/overview.png
$B responsive         # 三视口截图
```

**两个引擎协同**：
- gstack/browse：快速探索、截图标注、性能指标
- Playwright + qa-runner：结构化断言、数据驱动、网络拦截

### 纯代码测试（无浏览器引擎时）

- 逐文件读取实现代码，检查边界情况
- 验证错误处理完整性
- 检查 API 输入验证
- 运行项目已有的测试框架（`npm test` / `pytest` 等）

---

## 第6步：智能分析 + Bug 报告

### 分析流程

对每个 FAIL 的测试用例：

1. **错误分类**
   - Console Error → 提取 stack trace → 定位源文件:行号
   - 元素不存在 → 检查选择器 → 检查组件是否渲染
   - 网络错误 → 检查后端日志 → 检查 API 路由
   - 视觉偏差 → 检查 CSS 来源 → 对比 DESIGN.md 规则

2. **交叉验证**
   - 将 console error 中的文件路径 → 对应到 git diff 中的变更文件
   - 在 diff 中 → 标记 `[本次引入]`
   - 不在 diff 中 → 标记 `[已有问题]`

3. **影响范围估算**
   - data-driven 测试：5/20 崩溃 → 推算 25% 数据受影响
   - 功能测试：特定 tab 崩溃 → 标记该 tab 下所有功能受影响

### Bug 登记格式

```markdown
### BUG-001 [严重度] 标题

**现象：** 用户看到了什么
**影响：** 影响范围（如"25% 的卡片无法打开详情"）
**证据：**
  - Console: "错误信息原文"
  - Stack: `文件:行号`
  - 截图: qa_screenshots/XX_name.png
**根因定位：**
  - 文件: `src/components/DetailPanel.tsx:360`
  - 原因: 一句话说明
**本次引入：** 是/否（基于 git diff 交叉引用）
**修复建议：** 简要描述修复思路
```

### 严重度分类

| 严重度 | 定义 | 处理 |
|--------|------|------|
| 严重 | 核心功能崩溃/不可用 | 必须修复 |
| 高 | 功能可用但结果错误 | 必须修复 |
| 中 | 功能可用但体验差 | 建议修复 |
| 低 | 外观/措辞/细节问题 | 可延后 |

### 修复清单产出

```markdown
# 修复清单（forge-qa 生成）

## 必须修复（严重 + 高）
- [ ] BUG-001: {现象} — {文件:行号} — {修复方向}
- [ ] BUG-002: ...

## 建议修复（中）
- [ ] BUG-003: ...

## 可延后（低）
- [ ] BUG-005: ...
```

---

## 第7步：User Gate（用户验收关卡）

**铁律：不可跳过。** QA 自动化测试无法覆盖设计意图偏差、功能遗漏等只有用户能判断的问题。

### 输出与等待

QA 报告生成后，输出以下内容并等待用户操作：

```
╔══════════════════════════════════════════╗
║           QA 报告已生成                   ║
╠══════════════════════════════════════════╣
║  通过: 10  失败: 3  跳过: 1              ║
║  健康评分: 72/100                        ║
║  报告: .gstack/qa-reports/qa-report-*.md ║
╠══════════════════════════════════════════╣
║  请验收后选择：                            ║
║  A) 验收通过 → 进入发布流程                ║
║  B) 验收不通过 → 填写反馈，回 forge-eng     ║
║  C) 我需要先自己体验一下                    ║
╚══════════════════════════════════════════╝
```

### 用户操作

**A) 验收通过（accept）**
- 更新 `.features/status.md` qa 行为 `[✅ 已完成]`
- 建议下一步：`/forge-review` 或 `/forge-ship`

**B) 验收不通过（reject）**
- 引导用户描述问题（可以直接在会话中描述）
- Claude 自动提取为 FEEDBACK.md 格式
- **⚠️ 触发举一反三机制（见下方）**
- 合并 qa-report 中未修复的 BUG + 用户 FEEDBACK + 举一反三发现
- 生成统一修复清单 → `/forge-eng`

### 举一反三机制（用户反馈问题时 SHALL 执行）

当用户报告任何问题时，SHALL 按以下步骤执行：

1. **修复用户指出的问题**

2. **搜索相似模式**：
   - 使用 Grep 在代码库中搜索与该问题相同的模式（同类 CSS 属性、同类组件、同类逻辑）
   - 示例：用户报告「某组件间距不对」→ Grep 搜索所有使用相同 margin/padding 值的组件

3. **回查 Feature Spec**：
   - 读取 PRD 中的 Feature Spec，检查其他行为场景是否可能存在同类问题
   - 检查验收检查表中未测试的项是否包含类似约束

4. **产出「类似风险清单」**：
   ```markdown
   ### 举一反三：类似风险清单
   
   用户反馈：{用户描述的问题}
   根因：{问题的根本原因}
   
   发现 {N} 处类似风险：
   1. {文件路径:行号} — {组件/模块名} 使用了相同的 {模式}，可能存在同样问题
   2. {文件路径:行号} — Feature Spec 场景 {场景名} 的 THEN 要求 {约束}，当前实现为 {实际值}
   3. ...
   ```

5. **请用户确认**：
   ```
   发现 {N} 处类似风险，要一并修复吗？
   A) 全部修复
   B) 选择性修复（指定哪些）
   C) 只修复用户指出的问题，其余记录到 FEEDBACK.md
   ```

**SHALL NOT 仅修复用户明确指出的单点问题就声称完成。**

**C) 用户自行体验**
- 暂停，等待用户回来反馈
- 用户可以随时在会话中描述问题

### FEEDBACK.md 结构

```markdown
# User Feedback — {feature-name}

## 元数据
- 日期: YYYY-MM-DD
- QA 报告参考: qa-report-YYYY-MM-DD.md
- 分支: eng/feature-name-YYYY-MM-DD

## 反馈项

### UF-001 [Design Intent] 标题
**期望：** 用户期望的行为
**现状：** 实际看到的行为
**参考：** DESIGN.md#section 或 PRD.md#version
**截图：** feedback_screenshots/001.png（可选）

### UF-002 [Missing] 标题
**期望：** PRD 中描述的功能
**现状：** 功能缺失或未实现
**参考：** PRD.md#section
```

**反馈类型：**
- `[Design Intent]` — 设计意图偏差（QA 测不到的，只有用户能判断）
- `[Missing]` — 功能缺失（PRD 有但没实现）
- `[Regression]` — 回归问题（之前好的现在坏了）
- `[Polish]` — 打磨细节（能用但不够好）

### FEEDBACK.md 的流转

| 谁 | 怎么用 |
|----|-------|
| **forge-eng** | 读取 → 作为 fix list，和 qa-report BUG 一起修 |
| **forge-qa（下一轮）** | 读取 → 纳入 test-spec 回归项，确保不再漏测 |
| **forge-qa（长期）** | 历史 FEEDBACK 累积为项目回归测试基线 |
| **用户** | 只写"发现了什么 + 期望什么"，不需要定位根因 |

### 反馈闭环流程

```
QA 报告 → User Gate → reject
                        │
                        ↓
                  FEEDBACK.md（用户反馈）
                        │
                        ↓
                  合并修复清单 = qa-report BUG + FEEDBACK
                        │
                        ↓
                  forge-eng（修复）
                        │
                        ↓
                  forge-qa（回归）
                    ├── test-spec 自动包含 FEEDBACK 项
                    └── 只测变更 + FEEDBACK 涉及范围
                        │
                        ↓
                  User Gate（再次验收）
                        │
                        └── ... 直到 accept
```

---

## 第8步：健康评分与报告

### 健康评分计算

| 维度 | 权重 | 评分方式 |
|------|------|---------|
| 控制台错误 | 15% | 0 错误→100, 1-3→70, 4-10→40, 10+→10 |
| 链接完整性 | 10% | 每个死链 -15，最低 0 |
| 核心功能 | 20% | 每个严重 -25, 高 -15, 中 -8, 低 -3 |
| 视觉呈现 | 10% | 同上 |
| 用户体验 | 15% | 同上 |
| 性能 | 10% | 同上 |
| 内容 | 5% | 同上 |
| 无障碍 | 15% | 同上 |

### 报告结构（先全局后细节）

QA 报告 SHALL 采用以下结构，让用户先看整体是否符合预期，再审阅细节：

```markdown
# QA 验收报告：{功能名}

**日期**: YYYY-MM-DD  **分支**: {branch}  **PRD 版本**: vX.Y

---

## 一、全局评估（先看整体）

### 用户流程完整性
- 状态：PASS / FAIL
- 说明：{流程是否通畅，哪些步骤有问题}
- 证据：{流程截图或描述}

### 页面/系统结构合规性
- 状态：PASS / FAIL
- 说明：{整体布局是否符合 Feature Spec 第二节的结构图}
- 偏差项：{列出与 Feature Spec 不一致的区块/组件}

### 整体健康评分：XX/100

---

## 二、逐项验收结果（再看细节）

| # | 验收项 | 来源场景 | 结果 | 证据 |
|---|--------|---------|------|------|
| 1 | {描述} | {Feature Spec 场景} | ✅ PASS | {截图/日志} |
| 2 | {描述} | {Feature Spec 场景} | ❌ FAIL | {错误详情} |
| ... | ... | ... | ... | ... |

通过率：{X}/{Y} ({Z}%)

---

## 三、视觉合规结果

| # | 组件 | CSS 属性 | 预期值 | 实际值 | 结果 |
|---|------|---------|--------|--------|------|
| V1 | {名} | font-size | 14px | 14px | ✅ |
| V2 | {名} | color | #1e293b | #333 | ❌ |
| ... | ... | ... | ... | ... | ... |

---

## 四、发现的问题（按严重度排序）

{BUG 登记，格式同第6步}

---

## 五、验收结论

- 上线就绪：✅ / ⚠️ / ❌
- 必须修复：{N} 项
- 建议修复：{N} 项
- 举一反三风险：{N} 项（如有用户反馈触发）
```

### 报告输出

**输出到项目目录**：`$REPORT_DIR/qa-report-{YYYY-MM-DD}.md`

```
.gstack/qa-reports/
├── qa-report-{YYYY-MM-DD}.md      # 结构化报告（先全局后细节）
├── test-results.json               # 结构化结果（机器可读，qa-runner 产出）
├── test-spec.json                  # 测试规格（用于回归）
├── screenshots/                    # 截图证据
└── baseline.json                   # 回归基准数据
```

### 终端报告

```
+============================================================+
|                     QA 交付完成                              |
+============================================================+
| 项目：[项目名]      分支：[分支名]                            |
| 测试级别：快速 / 标准 / 详尽                                   |
| 测试引擎：qa-runner + gstack/browse                          |
+------------------------------------------------------------+
| 测试结果                                                     |
|   总计: XX  通过: XX  失败: XX  跳过: XX                      |
|   通过率: XX%  控制台错误: XX  网络错误: XX                    |
+------------------------------------------------------------+
| 健康评分：XX/100                                             |
| 上线就绪：✅ 可以上线 / ⚠️ 需关注 / ❌ 不建议                  |
+------------------------------------------------------------+
| 等待用户验收（User Gate）...                                   |
+============================================================+
```

---

## Feature 状态管理

### 启动时
- 读取 `.features/{feature-id}/status.md`，确认 eng 行为 `[✅ 已完成]`
- 将 qa 行更新为 `[🔄 进行中]`

### 执行中
- 更新 QA Items 表，每个测试项独立状态

### 完成时
- 通过：qa 行 `[✅ 已完成]`，note: `{passed}/{total} PASS, {score}/100`
- 未通过：qa 行 `[❌ 失败]`，note: `{failed} FAIL, 需修复后重测`
- 更新 `_registry.md` heartbeat

---

## 重要规则

1. **像真实用户一样测试** — 点所有可点的，填所有表单，测试所有状态。
2. **截图留证** — 每个测试步骤至少一张截图。用 `snapElement()` 紧凑裁剪，不用 fullPage。截图后用 Read 工具展示给用户。
3. **不要只测 Happy Path** — 边界、空状态、超长输入、网络错误都要测。
4. **控制台是第一现场** — 每次交互后检查控制台。视觉上没问题不代表没有 JS 错误。
5. **数据驱动是核心** — 不只测一条数据。用 `pickStratified()` 采样多条。
6. **前后端联动是重点** — 验证 API 调用是否正确、响应是否合理。
7. **深度优于广度** — 5-10 个证据充分的 Bug > 20 个模糊描述。
8. **自我调节** — 拿不准就停下来问。
9. **绝不拒绝使用浏览器** — 后端变更也会影响应用行为，始终打开浏览器测试。
10. **User Gate 不可跳过** — 自动化测不到设计意图偏差，必须等用户验收。

---

## 资源

- **QA 文档模板**：[references/qa-template.md](references/qa-template.md)
- **10 维度代码模板**：[references/test-dimensions.md](references/test-dimensions.md)
- **通用测试引擎**：[scripts/qa-runner.mjs](scripts/qa-runner.mjs)
