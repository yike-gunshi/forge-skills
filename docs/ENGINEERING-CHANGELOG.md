# 工程变更日志

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
