# forge-qa v3.0 迭代调研文档

> 日期：2026-03-28
> 状态：方案确认，开始实施

## 1. 问题诊断

### 当前 forge-qa 的执行层空洞

forge-qa SKILL.md 定义了 900 行的流程，但**执行层是空的**——依赖 Claude 在会话中即兴写测试脚本。

| 环节 | skill 定义承诺 | 实际执行 |
|------|--------------|---------|
| 验收标准前置 | 对照 PRD 逐项覆盖 | 从未解析 PRD 验收项 |
| 测试执行 | Playwright E2E | 5 个脚本全是截图，4 个无断言 |
| 证据先于结论 | 截图+日志+断言 | 只有截图，无 pass/fail |
| 数据驱动 | 多种数据类型覆盖 | 只点一张卡 |
| 网络验证 | API 拦截 | 从未使用 |
| 控制台零容忍 | 监控所有错误 | 收集了但不 fail |
| 性能采集 | Web Vitals | 从未采集 |

### 现有 Playwright 脚本分析

项目中有 5 个 QA 脚本，**只有 1 个有真正的 pass/fail 逻辑**：

| 脚本 | 用途 | 有断言？ | 问题 |
|------|------|---------|------|
| qa_debug.mjs | 调试频道视图 | 无 | 纯诊断 |
| qa_regression.mjs | 12 步回归 | 无 | `.catch(() => {})` 吞错误 |
| qa_regression.py | 7 步回归 | 无 | 纯截图 |
| qa_round4.mjs | 11 步验证 | **有** | 唯一有 CHECK 逻辑的 |
| take_screenshots.mjs | 16 步截图 | 无 | fallback 吞错误 |

### Bug 发现方式分析

对照最近两份 QA 报告（2026-03-27 + 2026-03-28），严重 bug 的发现方式：

| Bug | 实际发现方式 | Playwright 能做到吗？ |
|-----|-------------|---------------------|
| 27% 卡片 Object 崩溃 | 代码审查+数据分析 | 数据驱动遍历可以发现 |
| TopBar store 引用错误 | 代码审查 | 点击+console 监控可以发现 |
| React Error #31 | console 监听 | page.on('console') 能抓 |
| 频道页空白 | 截图 | 能发现现象，不能定位根因 |

**结论：大部分严重 bug 靠代码审查发现，Playwright 只提供"证据"。**

---

## 2. 外部工具调研

### Chrome DevTools MCP vs Playwright

| 维度 | Chrome DevTools MCP | Playwright |
|------|-------------------|------------|
| 定位 | AI agent 浏览器控制（探索式） | 程序化 E2E 测试自动化 |
| 浏览器 | 仅 Chrome | Chromium + Firefox + WebKit |
| 确定性 | 非确定性（LLM 决策） | 完全确定性（脚本驱动） |
| 断言能力 | 无 | 丰富的 expect 断言库 |
| 性能分析 | 强（Chrome Trace、Lighthouse、堆快照） | 弱 |
| 成熟度 | 6 个月 pre-1.0，Google 官方 32K stars | 4+ 年 battle-tested |
| MCP 集成 | 原生 MCP，29 个工具 | 微软官方 MCP，20+ 工具 |

**结论：** Playwright 是 forge-qa 主力，Chrome DevTools MCP 可作为性能分析补充。

### skillsmp.com QA/Playwright Skills 调研

| Skill | 值得借鉴的模式 | 我们缺的 |
|-------|--------------|---------|
| Anthropics/webapp-testing | 黑盒脚本哲学：脚本是 CLI 工具 | 每次从零写脚本 |
| fugazi/qa-test-planner | ISTQB 模板 + 分层回归（Smoke/Full/Targeted） | 没有分层策略 |
| currents-dev/playwright-best-practices | 验证循环：必须全 pass 才继续 | catch 吞错误 |
| wshobson/e2e-testing-patterns | POM + Fixtures + 网络 Mock + axe-core | 只用了 screenshot() |
| lackeyjb/playwright-skill | 通用执行器 run.js | 每个脚本自己管 launch/close |
| fugazi/playwright-e2e-testing | "First Questions" + test.step() 结构化 | 无前置问题 |
| PramodDutta/playwright-e2e | 选择器优先级 getByRole > getByTestId | 硬编码 CSS |

### 刻意不引入的模式

- **POM（Page Object Model）**：Claude 生成一次性脚本，POM 封装收益为负
- **视觉回归 baseline**：需要管理 golden screenshots，当前阶段 ROI 不够
- **Playwright Test Runner**：qa-runner.mjs 轻量框架足够

---

## 3. Forge 上下文传递机制

### 调度方式

forge-dev 通过 Agent tool 传递文件路径（非上下文）给子 skill：

```
agent_prompt 包含:
  - project_path: 项目路径
  - prd_path: PRD 文件路径
  - worktree_path: 工作树路径
  - branch_name: 分支名
  - change_summary: 变更摘要
  - feature_id: .features/{id}/status.md
  - previous_outputs: 前序产出路径
```

### Worktree 传递链

```
forge-eng 创建 worktree → 报告路径 → forge-dev 记录 → 传给 forge-qa
```

forge-qa 需要能处理三种场景：
1. forge-dev 调度传入 worktree_path
2. 用户手动调用（需自动探测）
3. 同一会话中 forge-eng 之后调用（从上下文读取）

### 状态跟踪

`.features/{id}/status.md` Pipeline 表 + `_registry.md` heartbeat

---

## 4. 方案设计：三层架构

```
┌─────────────────────────────────────────────────┐
│  Layer 1: 测试规格生成（文档 → 可执行测试计划）      │
│  输入: PRD / DESIGN.md / git diff / 会话上下文       │
│  输出: test-spec.json（结构化验收清单）               │
├─────────────────────────────────────────────────┤
│  Layer 2: Playwright 测试引擎（执行 + 断言）         │
│  7 个测试维度，每个维度有标准化的测试模板              │
│  输出: test-results.json + 截图证据                  │
├─────────────────────────────────────────────────┤
│  Layer 3: 智能分析（失败归因 + 报告生成）            │
│  交叉引用代码、定位根因、生成修复清单                  │
│  输出: qa-report.md + fix-list for forge-eng         │
└─────────────────────────────────────────────────┘
```

### Layer 1: 测试规格生成（文档 → test-spec.json）

**目标：** Claude 不再"即兴测试"，而是先从文档提取结构化验收项，再执行。

**输入源优先级：**

| 优先级 | 输入源 | 场景 | 提取方式 |
|--------|-------|------|---------|
| 1 | PRD.md 验收标准 | 有 PRD 时 | 解析每个 feature 的验收条件 → 映射为可测试断言 |
| 2 | DESIGN.md 视觉规则 | 有设计文档时 | 提取颜色/字号/间距/动画规则 → 映射为 CSS 断言 |
| 3 | ENGINEERING.md API 契约 | 有工程文档时 | 提取 API endpoint + 响应结构 → 映射为网络断言 |
| 4 | git diff | 增量 QA 时 | 分析变更文件 → 推断影响范围 → 只测变更相关 |
| 5 | 会话上下文 | 讨论完需求后 | 从对话提取"用户期望行为" → 生成临时验收项 |
| 6 | FEEDBACK.md | 回归 QA 时 | 历史用户反馈 → 纳入回归测试基线 |

**输出格式 test-spec.json 示例：**

```json
{
  "metadata": {
    "source": "PRD.md v10.1 + DESIGN.md v2",
    "branch": "eng/react-rewrite-2026-03-28",
    "generated_at": "2026-03-28T10:00:00Z",
    "scope": "full"
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
          "description": "首页加载后展示推荐频道的信息卡片",
          "dimension": "functional",
          "steps": [
            { "action": "navigate", "url": "http://localhost:8080" },
            { "action": "wait", "selector": "[data-testid='feed-section']", "timeout": 5000 }
          ],
          "assertions": [
            { "type": "visible", "selector": "[data-testid='feed-section']" },
            { "type": "count_gte", "selector": "[data-testid='info-card']", "min": 1 },
            { "type": "no_console_errors" }
          ]
        },
        {
          "id": "feed-002",
          "description": "点击信息卡片弹出详情面板，包含精华速览、全文拆解、行动点",
          "dimension": "functional",
          "data_driven": { "selector": "[data-item-id]", "sample_size": 20, "strategy": "stratified" },
          "steps": [
            { "action": "click", "selector": "$item" }
          ],
          "assertions": [
            { "type": "visible", "selector": "[data-testid='detail-panel']" },
            { "type": "contains_text", "selector": "[data-testid='detail-panel']", "texts": ["精华速览", "全文拆解", "行动点"] },
            { "type": "no_console_errors" }
          ]
        }
      ]
    }
  ]
}
```

**用户确认关卡：** 生成 test-spec 后输出摘要供用户确认再执行：

```
📋 测试计划摘要（基于 PRD v10.1）：

  P0 核心流程（必测）：
  ├── feed-001: 首页信息流加载 [functional]
  ├── feed-002: 卡片点击→详情面板 [functional + data-driven×20]
  ├── feed-003: 频道切换 [functional]
  └── feed-004: 搜索功能 [functional]

  P1 视觉规则（DESIGN.md）：
  ├── visual-001: 字号≥12px [visual]
  ├── visual-002: 平台配色 [visual]
  └── visual-003: 响应式三断点 [responsive]

  P2 API 契约（ENGINEERING.md）：
  ├── api-001: /api/feed 响应结构 [network]
  └── api-002: /api/actions 响应结构 [network]

  P3 控制台 + 可访问性：
  ├── console-001: 零 JS 错误 [console]
  └── a11y-001: axe-core WCAG 2.0 AA [accessibility]

  共 12 个测试用例，预计 3-5 分钟。
  确认执行？[Y/n]
```

### Layer 2: Playwright 测试引擎（7 维度）

每个维度有标准化代码模板，Claude 填充具体选择器和断言值。

#### 维度 1: 控制台零容忍 [console]

```javascript
// 自动挂载，每个导航/交互后检查
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', err => errors.push(err.message));
// 每个测试结束后：if (errors.length > 0) result.fail(...)
```

能发现：React 渲染崩溃、未捕获异常、404 资源

#### 维度 2: 数据驱动遍历 [data-driven]

```javascript
const cards = await page.locator('[data-item-id]').all();
const sampleSize = Math.min(cards.length, 20);
const indices = pickStratified(cards.length, sampleSize);
for (const i of indices) {
  await cards[i].click();
  const panel = page.locator('[data-testid="detail-panel"]');
  await expect(panel).toBeVisible({ timeout: 3000 });
  // 验证内容区块存在
  await page.keyboard.press('Escape');
}
```

能发现：27% 卡片数据类型崩溃（当前完全测不到的）

#### 维度 3: 网络契约验证 [network]

```javascript
page.on('response', async response => {
  if (response.url().includes('/api/') && response.status() >= 400) {
    collector.networkErrors.push({ url, status });
  }
});
// 验证响应结构匹配 ENGINEERING.md 定义
```

能发现：API 404、响应结构不匹配、后端未启动

#### 维度 4: 视觉规则断言 [visual]

```javascript
// DESIGN.md → CSS 断言
await expect(card).toHaveCSS('font-size', /^(1[2-9]|[2-9]\d|\d{3,})px$/); // ≥12px
// 平台配色验证
const bg = await twitterCard.evaluate(el => getComputedStyle(el).backgroundColor);
```

能发现：字号不达标、间距违反 4px 网格、平台配色错误

#### 维度 5: 交互完整性 [functional]

```javascript
const tabs = await page.locator('[role="tab"]').all();
for (const tab of tabs) {
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  // 检查对应面板可见 + 无 console 错误
}
```

能发现：Tab 崩溃（TopBar store 错误）、交互无响应

#### 维度 6: 响应式断点 [responsive]

```javascript
const breakpoints = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];
for (const bp of breakpoints) {
  await page.setViewportSize(bp);
  const hasOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  if (hasOverflow) result.fail(`overflow-${bp.name}`, ...);
}
```

#### 维度 7: 可访问性 [accessibility]

```javascript
import AxeBuilder from '@axe-core/playwright';
const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa'])
  .analyze();
for (const v of results.violations) {
  result.fail(`a11y-${v.id}`, `${v.help} (${v.nodes.length} 处)`);
}
```

#### 执行顺序（分阶段，快速失败）

```
Phase 1（冒烟）：console + 首页加载 + API 基础
  → 全失败则停止（环境问题）

Phase 2（核心）：functional + data-driven
  → 覆盖 P0 用例

Phase 3（视觉）：visual + responsive
  → 覆盖 P1 用例

Phase 4（深度）：accessibility + 边界条件
  → 覆盖 P2-P3 用例
```

### Layer 3: 智能分析（失败归因 + 报告）

对每个 FAIL 的测试用例：

1. **错误分类** — Console Error → stack trace → 源文件:行号
2. **交叉验证** — 崩溃文件是否在 git diff 中（本次引入 vs 已有问题）
3. **影响范围** — data-driven 5/20 崩溃 → 推算 25% 受影响

**Bug 输出格式：**

```markdown
### BUG-001 [Critical] DetailPanel 渲染 Object 崩溃

**现象：** 点击卡片后详情面板白屏
**影响：** 采样 20 张卡片中 5 张崩溃（推算 25% 数据受影响）
**证据：**
  - Console: "Objects are not valid as a React child"
  - 截图: qa_screenshots/07_detail_crash.png
**根因定位：**
  - `frontend-react/src/components/detail/DetailPanel.tsx:360`
  - `ai_key_points` 字段部分数据为 Object 类型，直接渲染未做类型检查
**本次引入：** 是（文件在 git diff 中）
**修复建议：** 类型检查 point，Object 类型取 .text 或 JSON.stringify
```

### 执行引擎：qa-runner.mjs

通用框架提供三个核心能力，Claude 往框架里填充测试用例，不从零写脚本：

- **TestCollector** — pass/fail/skip 结构化结果收集器，带退出码
- **attachMonitors** — console + network 自动监听（挂载即生效）
- **snap** — 截图工具（自动编号 + 路径管理 + boundingBox 裁剪）

```javascript
// Claude 使用方式：import 框架，只写测试逻辑
import { TestCollector, attachMonitors, snap } from './qa-runner.mjs';

const collector = new TestCollector();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
attachMonitors(page, collector);

// ... 测试逻辑 ...

const summary = collector.summary();
// { total, passed, failed, pass_rate, console_errors, results: [...] }
process.exit(summary.failed > 0 ? 1 : 0);
```

### SKILL.md 改动清单

| 改动位置 | 内容 |
|---------|------|
| Step 0 增强 | Worktree 检测（3 种场景）+ 文档链定位 + 变更范围分析 + 服务探测 |
| Step 2.5 新增 | test-spec 生成（铁律：不生成 spec 就不执行测试）+ 用户确认关卡 |
| Step 5 重写 | 7 维度测试执行模板 + 分阶段执行（快速失败） |
| Step 6 增强 | 失败归因：错误分类 → 交叉验证 → 影响范围 → Bug 格式化 |
| Step 7 新增 | User Gate（accept/reject + FEEDBACK.md） |
| 新增 references/ | test-dimensions.md（7 维度代码模板参考） |

### 实施计划

| 阶段 | 交付物 | 说明 |
|------|-------|------|
| P1 | `scripts/qa-runner.mjs` | 通用测试执行引擎（TestCollector + monitors + snap） |
| P2 | SKILL.md 重写 | Step 0/2.5/5/6/7 全部改动 |
| P3 | `references/test-dimensions.md` | 7 维度完整代码模板 |
| P4 | 用 React 重构跑一轮验证 | 验收框架有效性 |

---

## 5. QA↔ENG↔User 反馈闭环设计

### 问题分析

当前流程断裂点：

```
forge-eng → forge-qa → qa-report → forge-eng(修) → 用户验收 → 发现问题 → ???
```

三类问题 QA 自动化无法覆盖：
1. **设计意图偏差** — "交互感觉不对"、"布局不是我想要的"
2. **功能遗漏** — PRD 有但实现遗漏，QA 也没覆盖到
3. **ENG 修复引入的新问题** — 修 A 坏 B

### 解决方案：User Gate + FEEDBACK.md

#### 完整流程

```
forge-eng
    │
    ↓
forge-qa (自动化 7 维度测试)
    │
    ├─ 产出: qa-report.md + test-results.json + 截图
    │
    ↓
User Gate（用户验收 — 不可跳过）
    │
    ├─ accept → forge-ship
    │
    └─ reject → FEEDBACK.md
                    │
                    ↓
              forge-eng（修 qa-report bugs + FEEDBACK items）
                    │
                    ↓
              forge-qa（回归: 只测变更 + FEEDBACK 覆盖）
                    │
                    ↓
              User Gate（再次验收）
                    │
                    └─ ... 直到 accept
```

#### FEEDBACK.md 结构

```markdown
# User Feedback — {feature-name}
## Date: YYYY-MM-DD
## QA Report Ref: qa-report-YYYY-MM-DD.md

### UF-001 [{类型}] {标题}
**期望：** ...
**现状：** ...
**参考：** DESIGN.md#section / PRD.md#version
**截图：** feedback_screenshots/001.png（可选）
```

反馈类型：
- `[Design Intent]` — 设计意图偏差（QA 测不到）
- `[Missing]` — 功能缺失（PRD 有但没实现）
- `[Regression]` — 回归问题
- `[Polish]` — 打磨细节

#### FEEDBACK.md 的流转

| 角色 | 怎么用 |
|------|-------|
| forge-eng | 读取 → 作为 fix list |
| forge-qa (下一轮) | 读取 → 纳入 test-spec，确保不再漏测 |
| forge-qa (回归) | 历史 FEEDBACK 累积为回归测试基线 |
| 用户 | 只写"发现了什么+期望什么"，不需要定位根因 |

#### User Gate 在 SKILL.md 中的位置

forge-qa 第 7 步新增 User Gate：
- `/forge-qa --accept` → 验收通过
- `/forge-qa --reject` → 引导填写 FEEDBACK.md
- 直接在会话描述问题 → Claude 自动提取为 FEEDBACK.md

#### 为什么 User Gate 不可跳过

| 场景 | 跳过后果 |
|------|---------|
| QA 全 PASS | 你可能发现设计意图偏差 |
| QA 有 FAIL | ENG 修了 QA 的 bug 但可能引入新问题 |
| 多轮 QA↔ENG | 没有"北极星"校准，越修越偏 |

User Gate 是收敛保障。没有它，QA↔ENG 可以无限循环但永远不符合用户预期。

### QA 产出对 ENG 的充分性

v3.0 每个 bug 包含：
- 现象 + 截图证据
- console error 原文 + stack trace
- 定位到的文件:行号
- git diff 交叉引用（本次引入 or 已有）
- 修复建议

**技术 bug 足够给 ENG 修。** 但设计意图偏差类问题必须通过 FEEDBACK.md 由用户补充。

---

## 6. 实战验证反馈（2026-03-28）

### 发现：断言深度不足

v3.0 首次实战测试中发现，即使有了 7 维度框架和 test-spec 机制，Claude 生成的 test-spec 仍然倾向于**只生成存在性断言**（`visible`、`count_gte`），而不是功能正确性断言。

具体案例：

| Bug | QA 生成的断言（浅） | 应有的断言（深） |
|-----|-------------------|----------------|
| SSE 生成全链路 | `button.isVisible()` + `connection opens` | 等待生成完成 → reload → 新 action 出现在列表 |
| 收藏页卡片 | `cards.count() > 0` | 每张卡片有 `starred_at`，总数与 header 一致 |
| 模态框内容 | `modal.isVisible()` | 模态框内有标题 + 内容文本长度 > 0 |
| 频道文本 | `section.isVisible()` | section 标题是中文，卡片 platform 匹配频道 |

### 根因分析

问题不在框架能力（`contains_text`、`evaluate`、`matches_regex` 类型都已支持），而在 **SKILL.md 没有明确禁止浅断言**。铁律第 3 条"每个测试必须有 pass/fail"只禁止了"没有断言"，没有禁止"浅断言"。

### 修复措施

1. **SKILL.md 新增铁律第 4 条**：断言必须验证功能正确性，不能只验证元素存在
2. **新增"断言深度规则"章节**：正反面示例 + 检查表（7 个常见场景）
3. **qa-runner.mjs 新增自检**：执行 test-spec 前扫描所有 case，标记只有浅断言的用例
4. **新增 `evaluate` 和 `matches_regex` 断言类型**：支持自定义 JS 表达式验证

---

## 7. 第二轮迭代：通用性 + 缺失维度（2026-03-28）

### 问题：零 data-testid + 项目耦合

对照 info2action React 代码审计发现：
- 代码中 **0 个 `data-testid`**
- SKILL.md 和 test-spec 示例全部使用 `[data-testid='xxx']`，在实际项目中全部失效
- test-dimensions.md 的代码模板中硬编码了项目特定的选择器

### 修复：Step 0.4 选择器审计

新增 Step 0.4，在生成 test-spec 前自动扫描项目代码，确认可用的 DOM 锚点（`data-*`、ARIA、语义标签、CSS class），输出选择器映射表。test-spec 中的选择器必须来自审计结果，**绝不编造不存在的 `data-testid`**。

选择器优先级：`role/aria` > `data-*` > 语义标签 > 文本 > CSS class 组合（最脆弱）

### 缺失维度补全

| 新维度 | 标识 | 启用条件 | 解决的问题 |
|--------|------|---------|-----------|
| **SSE/流式生成全链路** | `[streaming]` | 代码含 `EventSource`/`ReadableStream`/`WebSocket` | 之前只测"按钮存在"，现在测完整生命周期（触发→中间态→完成→持久化） |
| **URL 状态/深度链接** | `[url-state]` | 代码含 `useHash`/`useRouter`/`pushState` | 完全未覆盖的盲区 |
| **懒加载/异步内容** | `[async-content]` | 几乎所有 SPA | 替代 `waitForTimeout` 硬等，用 `waitForResponse`/`waitForSelector` |

### qa-runner.mjs 扩展

新增步骤类型：
- `wait_for_response`: 等待特定 API 响应（替代 `waitForTimeout`）
- `navigate_hash`: 修改 URL hash
- `go_back`/`go_forward`: 浏览器前进后退
- `wait_for_selector_hidden`: 等待元素消失（骨架屏消失）
- `wait_for_load_state`: 等待网络空闲
- `intercept_route`/`clear_routes`: API 拦截（模拟错误态）

新增断言类型：
- `url_contains`: URL 包含指定字符串
- `url_hash_match`: URL hash 匹配正则
- `response_json_match`: API 响应匹配
- `text_length_gte`: 文本长度 >= N（验证"有实质内容"）
- `element_count_changed`: 元素数量变化（滚动加载后数量增加）

### 确保通用性

所有改动都不绑定特定项目：
- 选择器来自运行时审计，不是硬编码
- 维度启用条件通过 `grep` 自动检测项目特征
- 代码模板中的选择器都标注了"根据项目调整"
- 等待策略优先使用语义化等待（`waitForResponse`），不依赖特定 DOM 结构

---

## 8. 参考资料

- Chrome DevTools MCP: https://github.com/ChromeDevTools/chrome-devtools-mcp
- Playwright MCP: https://github.com/microsoft/playwright-mcp
- skillsmp.com: https://skillsmp.com/zh
- Anthropics webapp-testing: https://github.com/anthropics/skills/blob/main/skills/webapp-testing/SKILL.md
- fugazi qa-test-planner: https://github.com/fugazi/test-automation-skills-agents
- currents-dev best practices: https://github.com/currents-dev/playwright-best-practices-skill
