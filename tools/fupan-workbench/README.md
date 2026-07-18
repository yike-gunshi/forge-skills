# Fupan Workbench

`forge-fupan` 的本地复盘工作台：复盘流程的确认门禁 + 全部历史会话回看。

## 页面结构（2026-07 重构）

- `/`：首页。「复盘会话」列出所有 Workbench 会话（进行中在上、历史在下），另有「教训账本」「复盘文档」两个页签。
- `/session/{task_id}`：单次复盘的独立页面。待确认时展示知识点勾选表单；提交后显示生成中；
  AI 执行 `consume --review` 后出现"打开这次的复盘文档"入口。
- `/review/{review_id}`：复盘文档阅读页（目录 + 知识地图 + 图片放大）。

## 安装依赖

```bash
python3 -m pip install -r tools/fupan-workbench/requirements.txt
```

## 基本命令

```bash
_WB="$HOME/.claude/skills/forge/tools/fupan-workbench/launcher.py"

# 创建 task
python3 "$_WB" create-task --input /tmp/fupan-task.json

# 启动或复用本地服务；带 --task-id 时 --open 直接打开该会话的独立页面
python3 "$_WB" start --task-id <task_id> --open

# 等待用户在页面提交
python3 "$_WB" wait --task-id <task_id> --timeout 1800

# 复盘文档写完后标记完成，--review 让会话页能跳转到文档
python3 "$_WB" consume --task-id <task_id> --review <复盘文档绝对路径>
```

## 运行原则

- 默认只监听 `127.0.0.1`。
- task 文件默认保存到 `~/.forge/fupan-workbench/tasks/`。
- 历史复盘默认从 `~/claudecode_workspace/记录/复盘/` 扫描。
- 如果 FastAPI/Uvicorn 缺失，`forge-fupan` 应降级到对话内确认。

## 前端开发

```bash
cd tools/fupan-workbench/frontend
npm install
npm run build   # 输出到 ../static/
```
