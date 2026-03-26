# Verification Gate 检查清单

本文档是 do-eng 每个原子 commit 前的验证门控参考。
核心原则来自 Superpowers：**证据先于断言（Evidence before claims）**。

## 铁律

```
没有验证证据就不准声称完成
```

如果你在这条消息中没有运行过验证命令，你就不能声称它通过了。

## 门控流程

```
任务实现完成
  ↓
确定验证命令（什么命令能证明这个声明？）
  ↓
运行完整命令（不截断、不跳过）
  ↓
读取完整输出（检查 exit code、失败数量、警告）
  ↓
输出确认声明？
  ├── 是 → 允许 commit
  │        commit message 中注明验证结果
  ├── 否 → 修复 → 重新验证（最多 3 次）
  └── 3 次失败 → 暂停，报告给用户
```

## 验证类型对照表

| 声明 | 需要的证据 | 不充分的证据 |
|------|-----------|-------------|
| "测试通过" | 测试命令输出：0 失败 | 上次运行结果 / "应该通过" |
| "Lint 干净" | Linter 输出：0 错误 | 部分检查 / 推断 |
| "构建成功" | 构建命令：exit 0 | Lint 通过（lint ≠ 编译） |
| "Bug 已修复" | 复现步骤验证：通过 | 改了代码 / "应该修好了" |
| "回归测试通过" | 红绿循环验证 | 测试只通过了一次 |
| "API 正常" | curl 返回期望结果 | 代码看起来对 |
| "页面正确" | 截图/浏览器验证 | DOM 结构看起来对 |
| "需求已满足" | 逐条对照检查清单 | 测试通过 ≠ 需求满足 |

## 禁用措辞

**绝对不能使用**：
- "should work"（应该能用）
- "probably fixed"（可能修好了）
- "seems to pass"（看起来通过了）
- "looks correct"（看起来正确）
- "I'm confident"（我很有信心）
- "Great!"/"Perfect!"/"Done!"（在验证之前）

**必须使用**：
- "验证通过：`{命令}` 输出 `{关键结果}`，exit code 0"
- "验证失败：`{命令}` 输出 `{错误信息}`，exit code {N}"
- "第 {N} 次修复尝试，重新验证..."

## 验证命令示例

### 测试
```bash
# Node.js
npm test 2>&1 | tail -20
echo "Exit code: $?"

# Python
python -m pytest -v 2>&1 | tail -20
echo "Exit code: $?"

# Go
go test ./... 2>&1 | tail -20
echo "Exit code: $?"
```

### API
```bash
# GET 请求
curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:3456/api/xxx

# POST 请求
curl -s -X POST http://localhost:3456/api/xxx \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}' \
  -w "\nHTTP Status: %{http_code}\n"
```

### 浏览器（gstack/browse）
```bash
$B goto http://localhost:3456
$B screenshot /tmp/verify-task-N.png
$B console --errors
```

### 浏览器（Playwright）
```python
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://localhost:3456')
    page.wait_for_load_state('networkidle')
    page.screenshot(path='/tmp/verify-task-N.png')
    # 检查关键元素
    assert page.locator('.expected-element').is_visible()
    browser.close()
```

### 数据库
```bash
sqlite3 xxx.db "SELECT count(*) FROM table_name WHERE condition"
```

### 构建
```bash
npm run build 2>&1 | tail -20
echo "Exit code: $?"
```

## 失败处理

### 修复重试（最多 3 次）

```
第 1 次失败：
  → 读取错误信息
  → 分析根因（不要猜）
  → 最小修复
  → 重新验证

第 2 次失败：
  → 重新分析（之前的假设可能错了）
  → 检查是否遗漏了什么
  → 修复
  → 重新验证

第 3 次失败：
  → 暂停
  → 不要再尝试
  → 报告给用户：
    "任务 Task-{N} 验证失败 3 次。
     尝试过的修复：{列表}
     最后的错误：{错误信息}
     选项：
       A) 继续尝试修复（我来诊断）
       B) 跳过此任务，标记为失败
       C) 回退到上一个稳定状态"
```

### 3 次失败的信号

如果每次修复揭示了不同位置的新问题 → 这不是 Bug，是**架构问题**。
不要继续打补丁，而是质疑设计方案。

## Commit Message 中的验证记录

每个原子 commit 的 message 中包含验证摘要：

```
feat(search): add fuzzy search API endpoint

实现模糊搜索接口，支持中文分词

Task-3 of Wave-2
验证：npm test → 47 passed, 0 failed; curl /api/search?q=测试 → 200 OK, 3 results
```

## 常见 Rationalization 对照表

| 借口 | 现实 |
|------|------|
| "应该能用了" | 运行验证命令 |
| "我很有信心" | 信心 ≠ 证据 |
| "就这一次" | 没有例外 |
| "Lint 通过了" | Lint ≠ 编译 ≠ 运行正确 |
| "Agent 说成功了" | 独立验证 |
| "太累了" | 疲惫不是借口 |
| "部分检查就够了" | 部分证明不了什么 |

## 何时应用

**每次以下情况之前必须验证**：
- 声称任务完成
- 声称 Bug 修复
- 创建 git commit
- 进入下一个 Wave
- 声称所有测试通过
- 进入分支收尾

没有例外。
