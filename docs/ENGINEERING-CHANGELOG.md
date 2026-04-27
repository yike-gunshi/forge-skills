# 工程变更日志

## [v2026.04.27-fupan-report-structure] - 2026-04-27

### 变更背景

用户反馈 `forge-fupan` 最终复盘中的仪表盘、会话脉络、决策复盘、避坑指南、效率词典和下次行动清单阅读价值低，Prompt 分析结构也有批改感，需要改成更贴近 AI coding 协作学习的报告结构。

### 技术方案

- 重写 `skills/forge-fupan/SKILL.md` 报告结构，删除强制 show-widget 仪表盘阶段。
- 新增 Claude Code / Codex Desktop 双来源会话定位，避免 Codex 环境误读 Claude 最新 JSONL。
- 新增原始会话可用性检查，压缩后按 `FULL_LOG_AVAILABLE` / `PARTIAL_LOG_AVAILABLE` / `SUMMARY_ONLY_OR_MISSING` 分流复盘策略。
- 扩展 `parse_tokens.py`，支持 Codex `event_msg.token_count` 的累计 token 快照差分解析。
- 保留 Workbench task JSON 兼容字段 `topics`，但在 skill 语义中明确它表示“知识点”。
- 明确 Workbench `selection.feedback` 是调研和成文约束，不得静默忽略。
- 新增知识模块图生成阶段：Codex 内置 `image_gen` 优先，`generate_image2.py` fallback，每个展开知识模块 1 张图；复制图片时用 marker 只选本轮新增 PNG。
- Workbench task 时间戳改为 timezone-aware UTC，移除 `datetime.utcnow()` deprecation warning。
- Prompt 分析改为“表达问题 + 低关键词版 / 进阶版”。
- 行为诊断接管原模式诊断和决策复盘。
- AI 表现复盘取消固定四维评分，改为按会话证据自行诊断。
- TLDR 移到全文最后，并聚焦知识、表达优化和协作 SOP。

### 验证计划

- `rg` 检查 skill 中不存在旧章节定义和强制仪表盘流程。
- `python3 -m py_compile skills/forge-fupan/parse_tokens.py`。
- 分别用当前 Codex Desktop JSONL 和最新 Claude Code JSONL 验证 `parse_tokens.py`。
- 用当前已压缩过的 Codex Desktop JSONL 验证原始消息仍可被识别为可恢复复盘。
- 用 Codex 内置 `image_gen` 生成一张测试知识图，确认图片生成路径可用。
- `git diff --check` 检查 Markdown 空白和格式。

## [v2026.04.25-fupan-workbench-polish] - 2026-04-25

### 变更背景

Workbench 第一版已可用，但真实使用后发现任务生命周期和阅读导航还不够闭环：已完成任务没有从队列消失，UTC 时间直接展示，详情页缺少目录，表达原话阅读成本偏高。

### 技术方案

- `task_store.list_tasks()` 默认过滤 `consumed` task。
- `forge-fupan/SKILL.md` 在最终复盘保存后补充 `launcher.py consume` 调用。
- React 前端新增上海时间格式化、详情页目录生成、Markdown heading id 注入。
- CSS 调整 quote block 字号、详情页侧栏目录、无任务时首页历史复盘的布局。
- Markdown 图片渲染为可点击按钮，点击后由 React lightbox 放大展示，Escape/关闭按钮退出。
- 左侧知识地图改为 `KnowledgeMap` 编号列表，展示“学习路线”和知识点数量。
- `forge-fupan/SKILL.md` 的文档结构新增 `TLDR` 强制区块，要求在全文最后给出可快速学习的记忆卡。

### 验证计划

- Python 单测覆盖 `consumed` task 出队。
- Vite build 验证前端构建产物。
- 文档规则检查覆盖 TLDR 位置、条数、“下次可以说”表达方法和协作 SOP。
- Playwright 验证首页不展示已完成任务、上海时间展示、详情页目录跳转、图片放大、知识地图编号列表和控制台无错误。

## [v2026.04.24-fupan-workbench] - 2026-04-24

### 变更背景

用户反馈现有 `forge-fupan` 复盘文档阅读负担过高，希望复盘前先确认想学习的知识、数量和深度，并能通过本地网页长期回看历史复盘。

### 技术方案

- 新增 `skills/forge-fupan/workbench/`。
- 后端：FastAPI + Uvicorn + Pydantic v1 + 标准库 JSON 存储。
- 前端：React + Vite，构建产物由 FastAPI 静态托管。
- 存储：task JSON 位于 `~/.forge/fupan-workbench/tasks/`，复盘 Markdown 仍位于 `~/claudecode_workspace/记录/复盘/`。

### 关键决策

| 议题 | 决策 | 原因 |
|---|---|---|
| 是否污染根目录 | 不在根目录放 package/requirements | forge-cookbook 是 skill 仓库，不是 app 仓库 |
| 前端运行态 | 托管预构建静态文件 | 不要求用户手动运行 npm dev server |
| task 存储 | 每个 task 一个 JSON | 简单、可查、可恢复 |
| 多任务 | AI 只轮询自己的 task ID | 防止多会话串读 |
| Markdown 浏览 | 通过 review id 映射路径 | 不暴露任意文件读取 |

### 验证

- 依赖安装：Python 3.7 临时 venv 中 `requirements.txt` 可安装。
- 后端单测：5 passed。
- 前端构建：Vite build passed。
- 本地服务：`http://127.0.0.1:8899/api/health` 返回 `ok: true`。
- API 冒烟：tasks、reviews、selection 提交均已验证。
- Playwright CLI：首屏全页截图已验证。
