# Fupan Workbench

`forge-fupan` 的本地交互式复盘学习工作台。

## 安装依赖

```bash
python3 -m pip install -r skills/forge-fupan/workbench/requirements.txt
```

## 基本命令

创建 task：

```bash
python3 skills/forge-fupan/workbench/launcher.py create-task --input /tmp/fupan-task.json
```

启动或复用本地服务：

```bash
python3 skills/forge-fupan/workbench/launcher.py start --task-id <task_id> --open
```

等待用户提交：

```bash
python3 skills/forge-fupan/workbench/launcher.py wait --task-id <task_id> --timeout 1800
```

## 运行原则

- 默认只监听 `127.0.0.1`。
- task 文件默认保存到 `~/.forge/fupan-workbench/tasks/`。
- 历史复盘默认从 `~/claudecode_workspace/记录/复盘/` 扫描。
- 如果 FastAPI/Uvicorn 缺失，`forge-fupan` 应降级到对话内确认。
