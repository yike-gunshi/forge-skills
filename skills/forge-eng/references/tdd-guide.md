# TDD 指南：红绿重构与分级测试

本文档是 do-eng 任务执行的 TDD 参考手册。核心理念来自 Superpowers 的 TDD 铁律，
适配为分级模式以匹配不同项目和任务类型。

## 铁律

```
没有失败测试就不准写实现代码
```

写了实现再补测试？删掉实现，从测试重新开始。
- 不要保留作为"参考"
- 不要"改编"已有代码来配合测试
- 删除就是删除

## TDD 级别

### 严格 TDD（后端逻辑 / API / 数据处理 / Bug 修复）

完整红绿重构循环：

```
RED（写失败测试）
  ↓ 运行 → 确认失败（不是报错，是断言失败）
  ↓ 失败原因必须是"功能缺失"，不是拼写错误
GREEN（写最小实现）
  ↓ 运行 → 确认通过
  ↓ 其他测试也必须通过
REFACTOR（清理代码）
  ↓ 运行 → 确认仍然通过
  ↓ 不加新功能
```

**RED 阶段要求：**
- 一个测试只测一个行为
- 测试名描述行为，不是"test1"
- 用真实代码，不 mock（除非不得已）

好的测试：
```typescript
test('空邮箱提交时返回错误提示', async () => {
  const result = await submitForm({ email: '' });
  expect(result.error).toBe('邮箱不能为空');
});
```

坏的测试：
```typescript
test('测试表单', async () => {
  const mock = jest.fn().mockResolvedValue({ ok: true });
  // 测试的是 mock，不是真实代码
});
```

**GREEN 阶段要求：**
- 写能让测试通过的最小代码
- 不要过度设计（YAGNI）
- 不要顺手加功能

**REFACTOR 阶段要求：**
- 消除重复
- 改善命名
- 提取辅助函数
- 保持测试绿色
- 不加新行为

### 轻量 TDD（前端组件 / 页面交互）

不要求严格的红绿循环，但要求关键交互有测试：

```
1. 实现组件/页面
2. 为关键交互写测试：
   - 点击事件
   - 表单提交
   - 状态切换
   - 边界输入（空值、超长、特殊字符）
3. 运行测试 → 确认通过
4. 不要求 100% 覆盖
```

### 验证驱动（无测试框架的项目）

不写自动化测试，但每个任务必须有可执行的验证命令：

```
1. 实现功能
2. 定义验证命令（必须在任务模板中明确写出）：
   - API: curl -s http://localhost:3456/api/xxx | jq .
   - 页面: 用 gstack/browse 截图验证
   - 脚本: python3 xxx.py 并检查输出
   - 数据: sqlite3 xxx.db "SELECT count(*) FROM xxx"
3. 执行验证命令
4. 读取完整输出
5. 确认结果正确
```

### 跳过 TDD（纯样式 / 配置 / 文档）

无需测试。直接实现后提交。

## TDD 级别自动判断

```
项目有测试框架？
├── 否 → 提议安装测试框架
│     ├── 用户同意 → 安装后继续判断
│     └── 用户拒绝 → 全部任务使用"验证驱动"
└── 是 → 按任务文件类型判断：
      ├── *.py / *.go / *.rs / *api* / *service* / *model*  → 严格 TDD
      ├── *.tsx / *.vue / *.jsx（前端组件）                   → 轻量 TDD
      ├── *.css / *.scss / *.config.* / *.md / *.json        → 跳过
      └── Bug 修复（任何类型）                                → 严格 TDD
```

## 测试框架安装指引

首次检测到项目无测试框架时触发。推荐方案：

| 运行时 | 推荐框架 | 安装命令 | 配置文件 |
|--------|---------|---------|---------|
| Node.js | vitest + @testing-library | `npm i -D vitest @testing-library/react @testing-library/jest-dom` | vitest.config.ts |
| Next.js | vitest + @testing-library/react | `npm i -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom` | vitest.config.ts (environment: 'jsdom') |
| Python | pytest + pytest-cov | `pip install pytest pytest-cov` | pytest.ini / pyproject.toml |
| Go | 内置 testing + testify | `go get github.com/stretchr/testify` | 无需配置 |

安装后：
1. 创建配置文件
2. 写一个示例测试（验证框架正常工作）
3. 运行测试 → 确认通过
4. 提交：`chore: add test framework (vitest/pytest/...)`

## 常见 Rationalization 对照表

这些借口都意味着：**停下来，回到 RED 阶段**。

| 借口 | 现实 |
|------|------|
| "太简单了不需要测试" | 简单代码也会坏。写测试只要 30 秒。 |
| "我先写完再补测试" | 后补的测试立刻通过，证明不了任何事。 |
| "手动测过了" | 手动测试是临时的，没有记录，改了代码得重测。 |
| "删掉几小时的代码太浪费了" | 沉没成本谬误。保留没有测试的代码才是浪费。 |
| "TDD 太教条了" | TDD 是实用主义：比事后调试更快。 |
| "探索阶段不需要 TDD" | 可以先探索，但探索完了必须删掉，从 TDD 重新开始。 |
| "测试太难写 = 跳过" | 测试难写 = 设计太复杂。简化接口。 |
| "先保留作参考" | 你会"改编"它，那就不是 TDD 了。删除就是删除。 |
| "这次特殊" | 没有特殊情况。 |

## Bug 修复的 TDD 流程

Bug 修复必须用严格 TDD，无论任务类型：

```
1. 写复现测试（触发 Bug 的最小输入）
2. 运行 → 确认失败（失败原因就是 Bug 症状）
3. 修复 Bug
4. 运行 → 确认通过
5. 运行所有测试 → 确认无回归
6. 提交：test + fix 两个 commit
```

## 验证清单

每个任务完成前：

- [ ] 每个新函数/方法有测试（严格/轻量 TDD）
- [ ] 看到每个测试失败过（严格 TDD）
- [ ] 失败原因是"功能缺失"不是"拼写错误"（严格 TDD）
- [ ] 写了最小实现让测试通过
- [ ] 所有测试通过
- [ ] 输出干净（无错误、无警告）
- [ ] 边界情况和错误场景有覆盖
- [ ] 验证命令已执行且结果正确（验证驱动）

全部打勾才能 commit。
