# Forge — QA 报告

**版本:** v2026.04.24-fupan-workbench
**日期:** 2026-04-24
**结论:** PASS

---

## 全局评估

Fupan Workbench 第一版已通过核心验收：task 创建、页面展示、用户提交、AI 按 task_id 读取、历史复盘列表、详情页渲染和移动端布局均可用。

## 验证命令

```bash
/tmp/fupan-workbench-release-venv/bin/python -m pip install -r skills/forge-fupan/workbench/requirements.txt
```

结果：Python 3.7 临时 venv 可安装；`requirements.txt` 已锁定 FastAPI 0.103 + Pydantic v1，避免 Pydantic v2 在 Python 3.7 下触发 Rust 构建链。

```bash
/tmp/fupan-workbench-release-venv/bin/python -m pytest -q skills/forge-fupan/workbench/tests
```

结果：`5 passed in 0.08s`。

```bash
npm run build
```

结果：Vite build passed，产物输出到 `skills/forge-fupan/workbench/static/`。

```bash
curl -s http://127.0.0.1:8899/api/health
```

结果：`{"ok": true, "static_ready": true}`。

```bash
curl -s http://127.0.0.1:8899/api/tasks
curl -s http://127.0.0.1:8899/api/reviews
curl -s -X POST http://127.0.0.1:8899/api/tasks/release-smoke/selection ...
```

结果：任务队列、历史复盘索引、selection 提交均返回预期 JSON。

## 浏览器验收

- `npx playwright screenshot --full-page http://127.0.0.1:8898 /tmp/fupan-workbench-release.png`：PASS
- 首页首屏显示当前任务、学习深度选择、补充反馈、历史复盘列表：PASS
- 历史复盘列表显示“学到的知识”，未显示 `My selections` / selection / depth：PASS
- 批注修复：知识区卡片的推荐标签和 `了解 / 表达 / 复现` 按钮固定在底部，左右卡片底线对齐：PASS
- 批注修复：反馈输入框与 footer 操作区保持清楚间距：PASS
- 举一反三：768-1199px 宽度下知识区卡片改为 2 列，不留下空白第三列：PASS

## 验收操作清单

### 改动说明

- **文件**：`skills/forge-fupan/workbench/*`
  - **改了什么**：新增本地 Workbench 的后端、前端、launcher 和测试。
  - **为什么改**：对应 PRD 场景 1、5、7、8。
- **文件**：`skills/forge-fupan/SKILL.md`
  - **改了什么**：新增 Phase 1.5 学习地图确认，并调整复盘语气。
  - **为什么改**：对应 PRD 场景 1、2、3、4、6。
- **文件**：`README.md`、`docs/skills-reference.md`、`CHANGELOG.md`
  - **改了什么**：同步说明 Fupan Workbench。
  - **为什么改**：让 Forge 用户知道新能力和依赖降级方式。

### 用户验收步骤

1. **操作**：安装依赖后运行 `python3 skills/forge-fupan/workbench/launcher.py start --open`
   **预期结果**：浏览器打开本地 Fupan Workbench。
   **对比旧行为**：之前只有 Markdown 文档，没有交互页面。
2. **操作**：创建一个 pending task 后打开首页。
   **预期结果**：当前任务置顶，任务队列只展开一个完整表单。
   **对比旧行为**：之前没有复盘前学习确认。
3. **操作**：勾选知识区，选择 `了解 / 表达 / 复现`，填写反馈并提交。
   **预期结果**：task 状态变为 `submitted`，表单只读。
   **对比旧行为**：之前需要在对话里继续来回确认。
4. **操作**：点击历史复盘条目。
   **预期结果**：进入详情页，看到学习标签和 Markdown 正文。
   **对比旧行为**：之前需要去 Obsidian 或文件夹里找 Markdown。

### 回归检查

- `forge-fupan` 原有输出目录规则仍保留。
- `parse_tokens.py` 未改变。
- 历史复盘 Markdown 不要求有 frontmatter。
- FastAPI/Uvicorn 不可用时，skill 文档明确要求降级到对话内确认。
