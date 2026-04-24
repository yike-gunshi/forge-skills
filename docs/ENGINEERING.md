# Forge — 工程文档 (ENGINEERING.md)

**版本:** v2026.04.24-fupan-workbench
**日期:** 2026-04-24
**状态:** 已实现

---

## 迭代历史摘要

### v2026.04.24-fupan-workbench — Fupan Workbench 本地交互式复盘学习工作台

- 在 `skills/forge-fupan/workbench/` 新增本地 fullstack workbench。
- 后端使用 FastAPI + JSON 文件存储，提供 task、selection、history review API。
- 前端使用 React + Vite，构建后输出到 `workbench/static/`，由 FastAPI 托管。
- `forge-fupan/SKILL.md` 新增 Phase 1.5：学习地图确认。
- 历史复盘列表只展示“学到的知识”，不展示 selection/depth/My selections。

---

## 一、架构

```text
forge-fupan
  ├─ Phase 1 对话分析
  ├─ Phase 1.5 生成 learning_map.json
  │    └─ launcher.py create-task / start / wait
  ├─ Workbench API
  │    ├─ task_store.py       task JSON 状态机
  │    ├─ review_index.py     历史复盘索引
  │    ├─ markdown_reader.py  Markdown/frontmatter 读取
  │    └─ server.py           FastAPI + 静态前端托管
  └─ Phase 2 按用户选择调研
```

运行时数据默认位于：

- task：`~/.forge/fupan-workbench/tasks/`
- server 状态：`~/.forge/fupan-workbench/server.json`
- 历史复盘：`~/claudecode_workspace/记录/复盘/`

## 二、API

| Method | Path | 用途 |
|---|---|---|
| GET | `/api/health` | 服务健康、版本、静态文件状态 |
| GET | `/api/tasks` | 任务队列 |
| GET | `/api/tasks/{task_id}` | 单个 task |
| POST | `/api/tasks/{task_id}/selection` | 提交学习选择 |
| GET | `/api/reviews` | 历史复盘索引 |
| GET | `/api/reviews/{review_id}` | Markdown 详情 |

## 三、状态机

task 状态：

```text
pending_selection -> submitted -> consumed
                  └-> failed
```

约束：

- `submit_selection` 只允许从 `pending_selection` 流转到 `submitted`。
- `wait` 只读取指定 `task_id`，不会消费其他 task。
- 写入 JSON 使用临时文件 + `os.replace()` 原子替换。

## 四、前端实现

- 首页：任务队列、当前任务表单、历史复盘列表。
- 当前任务表单支持 `expression_issue_quotes`，用于展示 LLM 自行判断出的表达待优化原话；老 task 缺少该字段时继续显示 `user_questions`。
- 详情页：知识地图侧栏、Markdown 阅读区、源文件路径。
- 响应式：桌面三列 topic，中等宽度两列，移动端单列；历史表格移动端改为纵向条目。
- TopBar 的本地地址和刷新按钮使用独立 flex action 区，避免中等宽度下重合。
- 样式使用 `docs/DESIGN.md` 的 Slate + Blue + Amber token。

## 五、测试矩阵

| 场景 | 验证方式 | 当前结果 |
|---|---|---|
| task 创建与默认状态 | `test_task_store.py` | PASS |
| selection 单向提交 | `test_task_store.py` | PASS |
| AI 只等待自己的 task | `test_task_store.py` | PASS |
| 历史列表不含 selection/depth | `test_review_index.py` | PASS |
| review_id 安全映射 | `test_review_index.py` | PASS |
| 前端构建 | `npm run build` | PASS |
| 依赖安装 | Python 3.7 临时 venv + `requirements.txt` | PASS |
| 本地服务健康 | `GET /api/health` | PASS |
| task 提交 | `POST /api/tasks/{id}/selection` | PASS |
| 历史复盘索引 | `GET /api/reviews` | PASS |
| 首屏渲染 | `npx playwright screenshot` | PASS |
