# forge-eng · Dev 环境准备手册（端口契约 + 测试框架检测）

> 由 SKILL.md 骨架按需加载：worktree 建好后、需要运行应用或首次配测试时必读。

## 第5.6步：Dev Server 端口契约（如项目需要运行应用）

**核心原则**：worktree 可以并行，但 dev server 必须由项目统一入口分配和复用端口。不要在 worktree 里裸跑 `uvicorn`、`vite`、`next dev` 或临时 `npm run dev -- --port ...`，除非项目没有统一入口。

### 统一入口优先级

```bash
# 必须在 worktree 根目录执行
cd "$WORKTREE"

if npm run 2>/dev/null | grep -q "dev:status"; then
  npm run dev:status
  npm run dev
  npm run dev:status | tee /tmp/forge-dev-status.txt
elif [ -x scripts/dev-stack.sh ]; then
  bash scripts/dev-stack.sh status
  bash scripts/dev-stack.sh start
  bash scripts/dev-stack.sh status | tee /tmp/forge-dev-status.txt
else
  echo "未发现统一 dev server 入口；如必须启动应用，使用显式非默认端口并记录 PID/cwd/URL"
fi
```

### 硬性要求

1. **有统一入口就必须用统一入口**：`npm run dev:status` / `npm run dev` / `scripts/dev-stack.sh` 优先于任何手写启动命令。
2. **APP_URL 必须来自状态输出**：浏览器测试、curl、forge-qa 的 `app_url` 都从 `dev:status` / `dev-stack status` 输出读取，不得凭常见端口猜测。
3. **启动前先看状态**：如果当前 worktree 已有对应服务，复用；不要重复启动同一套前后端。
4. **进程身份必须核对**：状态输出或 `lsof -p $PID | grep cwd` 必须证明监听进程 cwd 属于当前 worktree。
5. **主分支端口固定，worktree 端口自动隔离**：如果项目 dev-stack 已规定 main 使用固定端口，worktree 不得抢这些端口。
6. **收尾前停本 worktree 服务**：删除或合并 worktree 前运行 `npm run dev:stop` 或 `bash scripts/dev-stack.sh stop`；没有统一入口时，按记录的 PID 精确停止当前 worktree 的进程。

---

## 第5.7步：测试框架检测与引导

**首次检测到项目无测试框架时触发。**

```bash
# 检测已有测试框架
ls jest.config.* vitest.config.* .rspec pytest.ini 2>/dev/null
ls -d test/ tests/ spec/ __tests__/ e2e/ 2>/dev/null
```

**如果无测试框架**，通过 AskUserQuestion 提议安装：

```
检测到项目无测试框架。推荐安装以启用 TDD：

A) 安装 vitest + @testing-library（推荐，Node.js/Next.js 项目）
   npm i -D vitest @testing-library/react @testing-library/jest-dom
B) 安装 pytest + pytest-cov（Python 项目）
   pip install pytest pytest-cov
C) 跳过 — 使用验证驱动模式（每个任务定义可执行验证命令）
D) 跳过 — 不做任何验证（不推荐）
```

**如果用户选择安装**：
1. 安装依赖包
2. 创建配置文件（vitest.config.ts / pytest.ini）
3. 写一个示例测试，验证框架正常工作
4. 运行测试 → 确认通过
5. 提交：`chore: add test framework (vitest/pytest)`

**如果已有测试框架**：读取 2-3 个已有测试文件，学习命名惯例、导入风格、断言模式，供后续 TDD 使用。

详细框架安装指引见 [references/tdd-guide.md](references/tdd-guide.md)。

---

