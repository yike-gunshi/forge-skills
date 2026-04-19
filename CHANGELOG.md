# Changelog

本文档记录 forge-cookbook 的重要变更。遵循 [Keep a Changelog](https://keepachangelog.com/) 风格。

标签命名：`vYYYY.MM.DD`（以迭代发布日期为准，同日多次发布追加 `.N` 后缀）。

---

## [v2026.04.19.1] — 2026-04-19（并行化迭代）

### 主题

`forge-bugfix` v5.0 → v6.0：**多会话并行协调**。支持 3–4 个 Claude Code 窗口同时修不同功能域的 bug，互不撞车。

详细见 [`docs/forge-bugfix-changelog.md`](docs/forge-bugfix-changelog.md) 的 v6.0 节。

### Added
- **`.forge/active.md` 心跳文件**：跨 worktree 共享的并行会话登记表，字段极简（session id / worktree / 任务 id / 功能域）
- **功能域判重**：`backlog.md` 表格新增"功能域"和"领取会话"列；`.forge/active.md` 头部有"功能域声明"区，项目自定义业务标签（AI 不得自创）
- **合并前 merge 预演**（forge-bugfix P7.1.0）：`git merge --no-commit --no-ff` 预演，冲突则回退 + 让用户决策 rebase 或暂存
- **新 skill `/forge-status`**：扫 `.forge/active.md`，按硬信号（worktree 存在性 + 分支合并状态）判活/死，交互确认后清理。合并 status + cleanup 两种职责为一个 skill
- **session id 自动获取**：`skills/forge-bugfix/scripts/get-session-id.sh` 通过 `$PPID` 回溯读 `~/.claude/sessions/<pid>.json`
- **新增模板**：`skills/forge-bugfix/templates/active.md`

### Changed
- **`forge-bugfix` SKILL.md**：version 5.0 → 6.0；铁律 +1（并行协调登记）；P0 新增并行探测；P2 新增 2.0 功能域判重节；P3 新增 3.1.5 登记 active；P7 新增 7.1.0 合并预演 / 7.1.2 冲突处理；规则新增 7 条并行纪律（29.1-29.7）
- **`forge-fupan` SKILL.md**：Phase 5.0 新增"清理本会话 `.forge/active.md` 登记"步骤（只清 session id 匹配的行，不动其他会话）
- **`forge-bugfix` description**：从串行"一次只修一个 bug"改为支持"多会话并行 + 同域归并 + 异域并行 + 合并预演"
- **闭环哲学**：修复完成后**不立即清 active.md**，交给 forge-fupan（正常结束）或 /forge-status（兜底）；绝不用时间戳判"僵尸"
- **README.md / docs/forge-user-guide.md / docs/skills-reference.md / SKILL.md**：Skills-14 → 15，相关 skill 清单同步加入 forge-status
- **`install.sh`**：SKILLS 数组新增 forge-status

### Design Decisions（关键决策记录在 changelog）

- **为什么不用文件集判重而用功能域**：用户直接否决文件集方案——3 个 ASR bug 跨前后端时文件集零重叠但上下文强相关，功能域是业务视角能正确分组
- **为什么一个会话内多 bug 仍然各自独立 worktree**：同域归并是复用"认知"，但代码隔离价值与会话数量无关
- **为什么不用时间戳判僵尸**：时间启发式会误杀活跃会话；worktree 存在性 + 分支合并状态是客观事实
- **为什么 status 和 cleanup 合并成一个 skill**：用户明确要求"别复杂"，一个命令一条流程直接走完

---

## [v2026.04.19] — 2026-04-19

### 主题

`forge-bugfix` 双层验收清单：给 bug 修复加明确封闭边界 + 新发现行动化分流。

详细见 [`docs/iterations/2026-04-19-双层验收清单.md`](docs/iterations/2026-04-19-双层验收清单.md)。

### Added
- **`forge-bugfix` 新节点**：
  - P5.3 生成验收清单文档
  - P6.5 用户人工验收
  - P7.5 新发现分流到 backlog
- **模板**：
  - `skills/forge-bugfix/templates/review-checklist.md`（单 bug 验收清单）
  - `skills/forge-bugfix/templates/backlog.md`（4 区任务池：待修 / 新需求 / 待澄清 / 已处理）
- **`forge-qa` 新增 Mode B**（单 bug 验收清单模式），Mode A 不变
- **文档沉淀**：
  - `docs/brainstorm-人工反馈收集-2026-04-19.md`（讨论过程）
  - `docs/forge-bugfix-changelog.md`（skill 演进索引）
  - `docs/iterations/2026-04-19-双层验收清单.md`（迭代记录）
  - `updatemd/claude-md/2026-04-19-R11-双层验收清单.md`（R11 规则模板，供其他用户抄到 CLAUDE.md）
  - `updatemd/forge-bugfix/2026-04-19-双层验收清单改造.md`
  - `updatemd/forge-qa/2026-04-19-Mode-B单bug验收.md`
- **`skills/forge-bugfix` allowed-tools 新增 `Skill`**（用于 P6 调用 forge-qa）

### Changed
- **`forge-bugfix` P6 重写**：不再内部做 QA，明确通过 Skill 工具调用 `forge-qa`（Mode B），强规范包含前置门禁 / 参数契约 / 异常兜底
- **`forge-bugfix` P7 改造**：按用户验收结论三选一分流（Pass 合并 / Fail 回 P5 / Pass + 新发现 合并并 P7.5）
- **`forge-bugfix` 出口默认**：推荐新会话或 `/clear`、`/compact`，避免长会话 scope 蔓延
- **任务池**：`TODO.md` → `docs/bugfix/backlog.md`（单一入口 + 4 区结构）
- **同根判定**：软建议 → 硬性举证（同文件/同函数/同数据流），举证不足默认独立 bug

### Removed
- **`forge-bugfix` P7 "弃用 worktree" 选项**：Fail 回 P5 继续修，真要放弃走 P4.4 三振出局
- **skill 内所有版本号引用**：`v5.0`、`v4.0`、`v3.x` 相关标注从 SKILL.md 移除，历史对比放 `docs/forge-bugfix-changelog.md`

### Fixed
- **验收边界模糊**：加入用户人工验收的明确 Pass/Fail/Pass + 新发现 结论，解决"修到第 5 个还没封闭"
- **scope 蔓延**：新发现禁止当场顺手修，必须分流到 backlog
- **QA 散乱**：每次修复的证据集中到同一份验收清单文档，不再散落各处

---

## [v2026.04.18] — 2026-04-18（追溯）

### 主题

`forge-bugfix` v2.1.0 → v4.0.0：单弹道最小修复 + worktree 隔离。

### Changed
- **一次只修 1 个 bug**（或 1-2 个共因 bug），其余进 TODO
- **每次一个 worktree** 隔离代码变更
- **修完不自动合并**，必须用户 P7 确认
- **出口建议下一步**（review / ship / fupan）

### Added
- **CLAUDE.md R8/R9/R10 规则**：异常态必须设计 / 改动必须扫描影响面 / 环境改动必须验证

---

## [2026-04 早期]（追溯）

- 规范驱动开发框架确立：Feature Spec + 验收计划 + 举一反三
- 仓库重构为 skill repository 结构
- README 重写 + MIT License

---

## 命名约定

- **稳定标签**：`vYYYY.MM.DD`
- **迭代记录**：`docs/iterations/YYYY-MM-DD-<主题>.md`
- **skill 优化记录**：`updatemd/<skill>/YYYY-MM-DD-<主题>.md`
