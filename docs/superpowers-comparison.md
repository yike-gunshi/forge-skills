# Superpowers 体系对照

本文档深度对比 Doc-Driven Dev 与 [Superpowers](https://github.com/obra/superpowers) 两套 AI 开发流程框架。

---

## 一、Superpowers 全景

14 个技能，4 个阶段 + 1 个元技能：

```
阶段一：设计
├── brainstorming        逐问细化 → 2-3 方案 → 写 spec
├── writing-plans        读 spec → 拆任务 → 写 plan
└── [Gate: Spec 批准]

阶段二：开发
├── using-git-worktrees  创建隔离工作目录
├── test-driven-development  红绿重构
├── systematic-debugging  根因分析
├── subagent-driven-development  双阶段审查
├── executing-plans      每批 3 任务 · 批间审查
├── dispatching-parallel-agents  并行调度
└── verification-before-completion  证据先于断言

阶段三：审查
├── requesting-code-review  派 reviewer subagent
└── receiving-code-review   技术 pushback

阶段四：收尾
└── finishing-a-development-branch  Merge / PR / Keep / Discard

元技能：writing-skills  用 TDD 写 Skill
```

### 五条铁律

1. 不先设计就写代码
2. 不先写失败测试就写实现
3. 不先验证就声称完成
4. 不先找根因就提出修复
5. 不先技术评估就实施审查反馈

### 核心理念：模型路闭（Path Closing）

通过显式规则关闭 AI 的错误路径。每条规则含 counter-rationalization。

---

## 二、阶段对照

| 阶段 | Doc-Driven Dev | Superpowers |
|------|---------------|-------------|
| **需求** | forge-prd：三层审查、归因、反驳 | brainstorming：逐问、2-3 方案 |
| **调度** | forge-dev：Discussion → Research → Wave | writing-plans：读 spec → 拆任务 |
| **设计** | forge-design：80 项审计、A-F 评分 | （无） |
| **工程** | forge-eng：四章审查、Wave 并行 | subagent + worktree + TDD |
| **测试** | forge-qa：三引擎、Diff-aware | TDD + verification |
| **调试** | forge-bugfix：六阶段、三振出局 | systematic-debugging |
| **审查** | forge-review：两轮、AUTO-FIX | requesting + receiving CR |
| **发布** | forge-ship：8 步 | finishing-a-branch：4 选项 |
| **复盘** | forge-fupan + cn-retro | （无） |

---

## 三、执行模型对比

| 维度 | Doc-Driven Dev | Superpowers |
|------|---------------|-------------|
| 代码隔离 | `.features/` 状态隔离 | Git Worktree 代码隔离 |
| 任务并行 | Wave 内并行 | 串行（每次 3 任务） |
| 验证时机 | Wave 间验证 | 每 3 任务 + 完成前验证 |
| TDD | 后置测试（forge-qa） | 嵌入每个任务 |
| 用户介入 | 门控点暂停 | 批间强制暂停 |

---

## 四、值得学习的 5 个实践

### 4.1 Git Worktree 隔离

- `git worktree add <path> -b <branch>`
- 安全验证 `.gitignore`、环境初始化、基线测试、收尾清理

### 4.2 Verification Before Completion

- 禁止 "should work"、"probably fixed"
- 运行命令 → 读输出 → 确认 exit code → 才能声称完成

### 4.3 TDD 嵌入实现

RED → GREEN → REFACTOR

### 4.4 双阶段审查

Spec Reviewer + Code Quality Reviewer；3 次不过 → 质疑架构

### 4.5 Skill TDD

RED（观察 rationalization）→ GREEN（堵住）→ REFACTOR（新漏洞）

---

## 五、融合完成状态

| # | 融合点 | 状态 | 嵌入位置 |
|---|--------|------|---------|
| 1 | Worktree 会话级隔离 | ✅ 已嵌入 | forge-eng 第5.5步 + 第10步 |
| 2 | Verification Gate | ✅ 已嵌入 | forge-eng 第7步每个原子 commit 前 |
| 3 | 分级 TDD | ✅ 已嵌入 | forge-eng 第5.7步 + 第6步 + 第7步 |
| 4 | 测试框架引导 | ✅ 已嵌入 | forge-eng 第5.7步 |
| 5 | 轻量模式 | ✅ 已嵌入 | forge-eng 第0.5步 |
| 6 | 3次修复质疑架构 | ✅ 已嵌入 | forge-eng 铁律 #3 |
| 7 | 双阶段审查 | ❌ 未融合 | ROI 低，保持现有 forge-review |

### Doc-Driven Dev 独有优势（保持）

独立设计阶段(do-design 自闭环) / 三引擎 QA / 上下文工程 / `.features/` 隔离 / 复盘闭环 / forge-deliver / Discussion+Research

---

## 六、哲学对比

| 维度 | Doc-Driven Dev | Superpowers |
|------|---------------|-------------|
| 核心理念 | 文档驱动 | 纪律驱动 |
| 控制策略 | 正向指引 | 反向关闭 |
| 设计哲学 | 完整性 | 严格性 |
| AI 自由度 | 中等 | 极低 |
| 知识管理 | 复盘闭环 | 无 |
| 适用场景 | 全生命周期 | 功能开发阶段 |

**结论**：两套体系高度互补。最高 ROI 融合点：Worktree 隔离 + Verification Gate。
