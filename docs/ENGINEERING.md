# Forge — 工程文档 (ENGINEERING.md)

**版本:** v2026.04.27-fupan-report-structure
**日期:** 2026-04-27
**状态:** 已实现

---

## 迭代历史摘要

### v2026.04.27-fupan-report-structure — Fupan 复盘报告结构优化

- `forge-fupan/SKILL.md` 报告结构改为：工作叙事、表达与行为复盘、知识拓展、AI 表现复盘、速查手册、末尾 TLDR。
- 删除强制 show-widget 仪表盘生成阶段，Token 统计只作为内部分析材料，不再输出精力分布图。
- 预检脚本新增 Claude Code / Codex Desktop 双来源会话定位：Codex 优先用 `CODEX_THREAD_ID` 匹配 `~/.codex/sessions/**/rollout-*.jsonl`，Claude 保留 `~/.claude/projects/**/*.jsonl`。
- 预检脚本新增原始会话可用性检查：统计 user/agent/tool/compacted 事件，输出 `FULL_LOG_AVAILABLE`、`PARTIAL_LOG_AVAILABLE` 或 `SUMMARY_ONLY_OR_MISSING`。
- `parse_tokens.py` 新增 Codex JSONL 方言解析：从 `event_msg.token_count.payload.info.total_token_usage` 读取累计快照并做差分，避免流式刷新重复计数。
- Workbench task JSON 的 `topics` 字段保持兼容，但语义改为“知识点”而不是大领域。
- Workbench 提交的 `selection.feedback` 必须作为全局写作约束消费，影响知识调研、行为诊断取舍、AI 表现复盘和 TLDR/SOP。
- Phase 1 根据原始会话可用性选择完整复盘、JSONL 恢复复盘或轻量复盘；轻量复盘不得伪造用户原话、轮次或行为序列证据。
- 新增 Phase 2.5：每个展开知识模块生成 1 张 Image 2 学习图。优先使用 Codex 内置 `image_gen`，生成前创建 marker，生成后只复制新增 PNG 到复盘 `assets/`；fallback 使用 `skills/_shared/generate_image2.py`。
- Workbench task 时间戳改为 timezone-aware UTC，避免 `datetime.utcnow()` deprecation warning。
- Prompt 分析字段收敛为“表达问题”和“低关键词版 / 进阶版”两档优化说法。
- 文档内容检查改为结构门禁：禁止旧章节、禁止严重度标记、TLDR 必须位于全文最后。

### v2026.04.25-fupan-workbench-polish — Fupan Workbench 阅读与队列体验优化

- `/api/tasks` 默认不返回 `consumed` task，让已完成复盘从首页任务队列出队。
- `forge-fupan` 在最终复盘写完后调用 `launcher.py consume --task-id "$_TASK_ID"` 标记任务完成。
- 前端时间格式化改为中国上海时区语义：UTC task 时间转换到上海时间，文件名解析出的本地复盘时间按上海本地时间展示。
- 详情页基于 Markdown headings 生成 H2/H3 目录，并给渲染后的标题注入稳定锚点。
- Markdown 图片渲染为可点击 zoom 控件，通过 React lightbox 放大查看。
- 详情页知识地图独立组件化，使用编号列表替代左侧大块标签。
- `forge-fupan/SKILL.md` 文档结构要求新增末尾 `TLDR`，位于全文最后。
- 前端构建产物继续输出到 `skills/forge-fupan/workbench/static/`。

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
- `list_tasks` 默认过滤 `consumed`，保留 JSON 文件但不进入首页任务队列。
- 写入 JSON 使用临时文件 + `os.replace()` 原子替换。

## 四、前端实现

- 首页：任务队列、当前任务表单、历史复盘列表。
- 当前任务表单支持 `expression_issue_quotes`，用于展示 LLM 自行判断出的表达待优化原话；老 task 缺少该字段时继续显示 `user_questions`。
- 详情页：本篇目录、编号式知识地图、Markdown 阅读区、图片放大层、源文件路径。
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
