# Forge — QA 报告

**版本:** v2026.04.27-fupan-report-structure
**日期:** 2026-04-27
**结论:** PASS

---

## 全局评估

`forge-fupan` 复盘报告结构已按最新反馈收敛：删除强制仪表盘和会话脉络，Prompt 分析不再使用严重度标记，知识拓展按单个知识点输出，AI 表现复盘不再使用固定四维评分，TLDR 位于全文最后。

Claude Code / Codex Desktop 会话兼容已验证：预检脚本能在 Codex 环境通过 `CODEX_THREAD_ID` 定位当前 `~/.codex/sessions/**/rollout-*.jsonl`，`parse_tokens.py` 能分别解析 Codex `event_msg.token_count` 和 Claude `message.usage`。

压缩后复盘策略已补入 skill 约束：预检会统计原始 user/agent/tool 事件和 compacted 事件，决定使用完整复盘、JSONL 恢复复盘或轻量复盘；轻量复盘禁止伪造逐条 Prompt 证据。

Workbench 用户反馈链路已补入 skill 约束：`selection.feedback` 必须参与知识调研、行为诊断取舍、AI 表现复盘和最终 TLDR/SOP。

知识模块图路径已验证：Codex 内置 `image_gen` 可生成学习图，默认输出到 `$CODEX_HOME/generated_images/{CODEX_THREAD_ID}/`；skill 规则要求用 marker 只复制本轮新增 PNG 到复盘 `assets/` 并保存 prompt/meta，失败时保存 prompt pack 不阻塞复盘。最终交付必须说明已生成 N 张 / 待生成 N 张，避免把待生成占位误报为图片已完成。

Fupan Workbench 本次阅读与队列体验优化已通过验收：`consumed` task 默认从首页队列出队，首页任务时间按中国上海时区语义展示，“表达待优化原话”字号提升，详情页 H2/H3 目录可点击跳转，浏览器控制台无错误。

Fupan Workbench 第一版已通过核心验收：task 创建、页面展示、用户提交、AI 按 task_id 读取、历史复盘列表、详情页渲染和移动端布局均可用。

## 验证命令

```bash
python3 -m py_compile skills/forge-fupan/parse_tokens.py
```

结果：PASS。

```bash
python3 -m py_compile skills/forge-fupan/workbench/task_store.py
```

结果：PASS。

```bash
python3 - "$CODEX_JSONL" codex
```

结果：当前已压缩过的 Codex JSONL 输出 `复盘可用性: FULL_LOG_AVAILABLE`。

```bash
python3 skills/forge-fupan/parse_tokens.py "$CODEX_JSONL"
```

结果：Codex JSONL 解析 PASS，输出 `日志格式: codex`。

```bash
python3 skills/forge-fupan/parse_tokens.py "$CLAUDE_JSONL"
```

结果：Claude JSONL 解析 PASS，输出 `日志格式: claude`。

```bash
ls -lh "${CODEX_HOME:-$HOME/.codex}/generated_images/$CODEX_THREAD_ID"/*.png
```

结果：Codex 内置 `image_gen` 已生成测试学习图，路径验证 PASS。

```bash
git diff --check
```

结果：PASS。

```bash
python3 -m unittest discover -s skills/forge-fupan/workbench/tests -p 'test_*.py'
```

结果：`7 tests in 0.068s OK`。

```bash
/tmp/fupan-polish-venv/bin/python -m pytest -q skills/forge-fupan/workbench/tests
```

结果：`7 passed in 0.08s`。

```bash
npm run build
```

结果：Vite build passed，产物输出到 `skills/forge-fupan/workbench/static/`。

```bash
/tmp/fupan-polish-venv/bin/python skills/forge-fupan/workbench/server.py --host 127.0.0.1 --port 8897 --home /tmp/fupan-polish.wiz3uO/home --review-root /tmp/fupan-polish.wiz3uO/reviews --log-level warning
```

结果：临时服务启动成功，Playwright 可访问首页和详情页。

## v2026.04.25 浏览器验收

- 首页显示“上海时间 2026-04-25 12:03”：PASS
- UTC task `2026-04-25T03:48:00Z` 显示为 `2026-04-25 11:48`：PASS
- `consumed` task 文案“已经完成的复盘不应继续显示。”未出现在首页队列：PASS
- “表达待优化原话”以更大 quote block 展示，问题/建议说明可读：PASS
- 详情页左侧显示“本篇目录”，包含 H2/H3：PASS
- 点击目录项后 URL hash 更新到对应章节：PASS
- Markdown 图片渲染为“放大图片”按钮，点击后出现 lightbox：PASS
- lightbox 支持 Escape 关闭，关闭后遮罩消失：PASS
- 左侧“学到的知识”显示为编号学习地图，并展示 `5 个` 数量：PASS
- `forge-fupan/SKILL.md` 文档结构要求全文最后写 `## TLDR`：PASS
- TLDR checklist 要求至少 5 条，并包含 1 条“下次可以说：...”表达优化和 1 条协作 SOP：PASS
- 浏览器 `console.error`：0：PASS

## v2026.04.24 验证命令

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
- Playwright 首页能力截图：`docs/assets/fupan-workbench/v2026.04.24.3-home.png`：PASS
- Playwright 详情页能力截图：`docs/assets/fupan-workbench/v2026.04.24.3-detail.png`：PASS
- 首页首屏显示当前任务、学习深度选择、补充反馈、历史复盘列表：PASS
- 历史复盘列表显示“学到的知识”，未显示 `My selections` / selection / depth：PASS
- 批注修复：顶部 `127.0.0.1` 与“刷新状态”按钮分离显示，不再重合：PASS
- 批注修复：任务区展示 `expression_issue_quotes`，包含表达待优化原话、问题原因和下次说法：PASS
- 批注修复：知识点卡片的推荐标签和 `了解 / 表达 / 复现` 按钮固定在底部，左右卡片底线对齐：PASS
- 批注修复：反馈输入框与 footer 操作区保持清楚间距：PASS
- 举一反三：768-1199px 宽度下知识点卡片改为 2 列，不留下空白第三列：PASS

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
3. **操作**：勾选知识点，选择 `了解 / 表达 / 复现`，填写反馈并提交。
   **预期结果**：task 状态变为 `submitted`，表单只读。
   **对比旧行为**：之前需要在对话里继续来回确认。
4. **操作**：点击历史复盘条目。
   **预期结果**：进入详情页，看到学习标签和 Markdown 正文。
   **对比旧行为**：之前需要去 Obsidian 或文件夹里找 Markdown。

### 回归检查

- `forge-fupan` 原有输出目录规则仍保留。
- `parse_tokens.py` 保持 Claude 解析兼容，并新增 Codex JSONL 解析。
- 历史复盘 Markdown 不要求有 frontmatter。
- FastAPI/Uvicorn 不可用时，skill 文档明确要求降级到对话内确认。
