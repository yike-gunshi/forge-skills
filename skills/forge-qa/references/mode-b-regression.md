# forge-qa · Mode B 单 bug 回归手册

> 由 SKILL.md 骨架按需加载：被 forge-bugfix P6 调用（mode=B）时必读本文件。
> 参数契约（mode/review_doc/bug_id/worktree/commit/app_url）以 SKILL.md「调用模式」节为唯一出处。

## Mode B：单 bug 修复验收报告模式

> 🎯 配合 forge-bugfix 的 P6 调用。目标：针对**一个 bug 的 Bug 修复验收报告**跑自动化测试，把环境身份、逐步截图、深度断言回填到同一份报告里。

### B.1 前提与入口

- **触发方**：forge-bugfix 的 P6 节点
- **传入参数**：`REVIEW_DOC`（活跃 Bug 修复验收报告路径，形如 `docs/bugfix/reviews/BF-0419-2.md`；历史已结案报告在 archive/raw 中，只供追溯，不作为回填目标）
- **跳过的节点**：不做 test-spec 生成（Layer 1）、不做 User Gate（那一步由 forge-bugfix 的 P6.5 做）
- **继承的能力**：仍然用 10 维度断言引擎和三种测试引擎（browser-use / Playwright / 纯代码）

### B.2 读取 Bug 修复验收报告

```bash
# 必须存在
[ -f "$REVIEW_DOC" ] || { echo "❌ Bug 修复验收报告不存在: $REVIEW_DOC"; exit 1; }

# 读取报告全部内容
cat "$REVIEW_DOC"
```

AI 解析出：
- BUG_ID
- 修复 commit hash（用于定位修复范围）
- 涉及文件列表（用于缩小测试范围）
- TDD / 回归用例区
- 验收入口与环境身份校验区
- 人工验收指南的每一行（检查点 / 操作步骤 / 预期效果）

### B.3 为每个验证项选择测试引擎

| 验证项性质 | 默认引擎 | 选择理由 |
|---|---|---|
| UI 交互 / 视觉 / 控制台 | browser-use:browser（Codex 可用时优先）或 Playwright | 需要真实浏览器和用户视角截图 |
| API / 数据 / 业务逻辑 | curl / 代码单元测试 | 更快更直接 |
| 响应式 / 可访问性 | Playwright | 专业断言库 |
| 静态代码属性（文件存在 / import 正确） | Grep / Bash | 无需运行时 |

### B.4 执行验证 + 回填

对每条验证项：

1. 按"人工验收指南"的"怎么操作"执行
2. 每个有意义的状态节点截图：打开页面、操作前、操作后、加载态、结果态、错误态
3. 按"预期效果"做深度断言
4. 截图保存到活跃报告旁的 `docs/bugfix/reviews/assets/${BUG_ID}/`，并在 Markdown 中用 `![](...)` 内嵌；报告结案归档时由 forge-bugfix 一并移动或更新链接
5. 回填"QA 测试过程与截图证据"节和"验收入口与环境身份校验"节

在 Codex 环境中，前端验证默认用 `browser-use:browser` 采集截图和 DOM 证据；需要更强可重复性时，再补 Playwright 脚本断言。若 Browser Use 不可用或被用户/插件中断，报告必须写明 fallback 原因。

截图命名建议：

```text
docs/bugfix/reviews/assets/${BUG_ID}/qa-1-01-open-page.png
docs/bugfix/reviews/assets/${BUG_ID}/qa-1-02-click-submit.png
docs/bugfix/reviews/assets/${BUG_ID}/qa-1-03-final-state.png
```

报告中必须写成：

```markdown
![](./assets/BF-0419-2/qa-1-01-open-page.png)
```

**断言原则**（和 Mode A 一致）：
- 必须基于"用户视角可见的内容变化"
- 不得单独用技术指标（HTTP 200 数量 / DOM 节点存在）
- 每个测试至少包含一个内容、状态、URL、CSS、网络响应或数据变化断言
- 必须核对前后端进程身份（优先看 `dev:status` / `dev-stack status`；兜底用 `ps aux | grep <服务>` + `lsof -p $PID | grep cwd`）
- QA 使用的 Frontend/Backend 地址必须和报告中交给用户验收的地址一致

### B.5 控制台零容忍（强制）

任何 `pageerror` 或 `console.error` 自动标记为 FAIL，即使该验证项的主逻辑通过。

### B.6 环境身份强校验

forge-qa 必须在报告的"验收入口与环境身份校验"区写入：

- Frontend URL、来源、PID、cwd、branch/commit（能获取时）
- Backend/API URL、来源、PID、cwd、branch/commit（涉及后端时）
- API health 或关键接口探活结果（涉及后端时）
- QA 执行时间
- 环境一致性结论：PASS / FAIL / EXPIRED

硬性 FAIL 条件：

- QA 实际访问的 URL 与报告交给用户验收的 URL 不一致
- 能拿到 PID/cwd，但 cwd 不属于当前 worktree
- 前端页面来自旧进程或主仓库，而不是当前 bug worktree
- 涉及后端但 Backend/API 地址无法确认
- 交给用户前再次检查发现地址或进程身份已变化

### B.7 回填"QA 测试过程与截图证据"节

forge-qa 必须填充报告里的"## QA 测试过程与截图证据（forge-qa 填）"：

```markdown
## QA 测试过程与截图证据（forge-qa 填）

**模式**：Mode B（单 bug 修复回归）
**执行时间**：2026-04-19 15:45

**自动化测试范围**：
- 跑了 Playwright 重放（3 步：打开登录 / 登录 / 查看头像）
- 跑了 tests/auth.test.ts（2 个相关 case）
- 控制台检查：0 error, 0 warning

### 验证项 1：登录后头像刷新

**结论**：PASS

**操作轨迹与截图**

1. 打开登录页

   ![](./assets/BF-0419-2/qa-1-01-open-login.png)

2. 提交登录

   ![](./assets/BF-0419-2/qa-1-02-submit-login.png)

3. 检查右上角头像

   ![](./assets/BF-0419-2/qa-1-03-avatar-updated.png)

**断言**
- 头像元素可见：PASS
- 头像 URL 已更新：PASS
- console.error：0
- network error：0

**Bug 复现核对**：
- 修复前：重现了 BF-0419-2 的原始症状（已对比 before 截图）
- 修复后：原始症状消失（after 截图）
```

### B.8 QA 自动闭环状态信号和退出

- **所有验证项 PASS 且环境一致性 PASS**：
  ```
  ✅ QA_PASS (BF-0419-2)
  报告已回填：docs/bugfix/reviews/BF-0419-2.md
  下一步：交还 forge-bugfix。单 bug 模式进入 P6.5；批量模式进入 qa-pass-pending-final-review。
  ```

- **至少一条 FAIL 或环境一致性 FAIL**：
  ```
  ❌ QA_FAIL (BF-0419-2)
  失败项: 第 3 条（控制台 TypeError）
  报告已回填 FAIL + 截图/日志证据。
  下一步：交还 forge-bugfix，有界回 P5 继续修复。
  ```

- **需求/设计/环境身份无法判断**：
  ```
  ⚠️ BLOCKED_HUMAN (BF-0419-2)
  原因: 保存后是否必须 toast 提示，Feature Spec 未定义。
  报告已写入决策卡。
  下一步：交还 forge-bugfix，询问用户。
  ```

### B.9 Mode B 不做的事

明确禁止：
- ❌ 不生成 `docs/QA.md`（那是 Mode A 的产物）
- ❌ 不做 User Gate（那由 forge-bugfix 的 P6.5 做）
- ❌ 不写 FEEDBACK.md（那是 Mode A 的 reject 闭环）
- ❌ 不主动判断"产品上是否接受"（只按报告和 Feature Spec 断言，最终由用户/批次验收决定）
- ❌ 不修改代码（和 Mode A 一样，只测不修）

### B.10 Mode B 的铁律

1. **只填 Bug 修复验收报告，不新建散乱 QA 文档**
2. **每条验证项必须有 pass/fail**（和 Mode A 第 3 条铁律一致）
3. **每个前端交互关键步骤必须有 Markdown 内嵌截图**
4. **控制台零容忍**（一致）
5. **不能越界修改用户验收列和最终结论**
6. **应用 URL 必须由调用方或 dev-status 提供**，不得在 Mode B 中猜测本地端口。
7. **环境身份校验失败就是 QA_FAIL**，不能用“页面能打开”替代。
8. **发现疑似新需求、范围外问题或设计歧义时输出 BLOCKED_HUMAN**，不要替用户决定。
9. **Codex 中优先使用 browser-use:browser 做本地浏览器验收**；Computer Use 不是浏览器首选兜底。

