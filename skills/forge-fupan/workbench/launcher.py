"""Command line launcher for Fupan Workbench."""

import argparse
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from task_store import (
    create_task,
    default_root,
    mark_consumed,
    mark_failed,
    read_task,
    submit_selection,
    wait_for_submission,
)

HOST = "127.0.0.1"
DEFAULT_PORT = 8765


def state_path(root):
    return Path(root).expanduser() / "server.json"


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write_json(path, payload):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_state(root):
    path = state_path(root)
    if not path.exists():
        return None
    try:
        return read_json(path)
    except Exception:
        return None


def request_json(url, timeout=1.5):
    with urllib.request.urlopen(url, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def health_for(url):
    try:
        return request_json(url.rstrip("/") + "/api/health")
    except Exception:
        return None


def find_free_port(start=DEFAULT_PORT, attempts=80):
    for port in range(start, start + attempts):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            sock.bind((HOST, port))
            return port
        except OSError:
            continue
        finally:
            sock.close()
    raise RuntimeError("No free localhost port found from {}".format(start))


def check_dependencies():
    missing = []
    for name in ("fastapi", "uvicorn"):
        try:
            __import__(name)
        except ModuleNotFoundError:
            missing.append(name)
    return missing


def existing_service(root):
    state = load_state(root)
    if not state:
        return None
    url = state.get("url")
    if not url:
        return None
    health = health_for(url)
    if not health or not health.get("ok"):
        return None
    state["health"] = health
    return state


def start_service(args):
    root = Path(args.home).expanduser() if args.home else default_root()
    root.mkdir(parents=True, exist_ok=True)

    current = existing_service(root)
    if current:
        if args.open:
            webbrowser.open(current["url"])
        print(json.dumps({"ok": True, "reused": True, **current}, ensure_ascii=False))
        return 0

    missing = check_dependencies()
    if missing:
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": "dependency_missing",
                    "missing": missing,
                    "install": "python3 -m pip install -r skills/forge-fupan/workbench/requirements.txt",
                },
                ensure_ascii=False,
            )
        )
        return 2

    port = args.port or find_free_port()
    url = "http://{}:{}".format(HOST, port)
    log_path = root / "server.log"
    command = [
        sys.executable,
        str(CURRENT_DIR / "server.py"),
        "--host",
        HOST,
        "--port",
        str(port),
        "--home",
        str(root),
        "--repo-path",
        args.repo_path or "",
        "--skill-path",
        str(CURRENT_DIR.parent),
    ]
    if args.review_root:
        command.extend(["--review-root", args.review_root])

    log_file = log_path.open("ab")
    process = subprocess.Popen(command, stdout=log_file, stderr=log_file, start_new_session=True)

    deadline = time.time() + 8
    health = None
    while time.time() < deadline:
        if process.poll() is not None:
            break
        health = health_for(url)
        if health:
            break
        time.sleep(0.2)

    if not health:
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": "server_start_failed",
                    "pid": process.pid,
                    "log": str(log_path),
                },
                ensure_ascii=False,
            )
        )
        return 1

    state = {
        "host": HOST,
        "port": port,
        "pid": process.pid,
        "url": url,
        "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "repo_path": args.repo_path or "",
        "skill_path": str(CURRENT_DIR.parent),
        "log": str(log_path),
    }
    write_json(state_path(root), state)
    if args.open:
        webbrowser.open(url)
    print(json.dumps({"ok": True, "reused": False, **state, "health": health}, ensure_ascii=False))
    return 0


def create_task_command(args):
    payload = read_json(args.input)
    task = create_task(payload, root=Path(args.home).expanduser() if args.home else None)
    print(json.dumps(task, ensure_ascii=False))
    return 0


def wait_command(args):
    task = wait_for_submission(
        args.task_id,
        timeout_seconds=args.timeout,
        interval_seconds=args.interval,
        root=Path(args.home).expanduser() if args.home else None,
    )
    print(json.dumps(task, ensure_ascii=False))
    return 0


def read_command(args):
    task = read_task(args.task_id, root=Path(args.home).expanduser() if args.home else None)
    print(json.dumps(task, ensure_ascii=False))
    return 0


def submit_command(args):
    selection = read_json(args.input)
    task = submit_selection(args.task_id, selection, root=Path(args.home).expanduser() if args.home else None)
    print(json.dumps(task, ensure_ascii=False))
    return 0


def consume_command(args):
    task = mark_consumed(args.task_id, root=Path(args.home).expanduser() if args.home else None)
    print(json.dumps(task, ensure_ascii=False))
    return 0


def fail_command(args):
    task = mark_failed(args.task_id, args.message, root=Path(args.home).expanduser() if args.home else None)
    print(json.dumps(task, ensure_ascii=False))
    return 0


def build_parser():
    parser = argparse.ArgumentParser(description="Manage the local Fupan Workbench.")
    parser.add_argument("--home", default=None, help="Workbench data root. Defaults to ~/.forge/fupan-workbench.")
    sub = parser.add_subparsers(dest="command", required=True)

    create = sub.add_parser("create-task")
    create.add_argument("--input", required=True, help="JSON file with learning map payload.")
    create.set_defaults(func=create_task_command)

    start = sub.add_parser("start")
    start.add_argument("--task-id", default="")
    start.add_argument("--port", type=int, default=0)
    start.add_argument("--review-root", default="")
    start.add_argument("--repo-path", default="")
    start.add_argument("--open", action="store_true")
    start.set_defaults(func=start_service)

    wait = sub.add_parser("wait")
    wait.add_argument("--task-id", required=True)
    wait.add_argument("--timeout", type=float, default=1800)
    wait.add_argument("--interval", type=float, default=2)
    wait.set_defaults(func=wait_command)

    read = sub.add_parser("read-task")
    read.add_argument("--task-id", required=True)
    read.set_defaults(func=read_command)

    submit = sub.add_parser("submit-selection")
    submit.add_argument("--task-id", required=True)
    submit.add_argument("--input", required=True)
    submit.set_defaults(func=submit_command)

    consume = sub.add_parser("consume")
    consume.add_argument("--task-id", required=True)
    consume.set_defaults(func=consume_command)

    fail = sub.add_parser("fail")
    fail.add_argument("--task-id", required=True)
    fail.add_argument("--message", required=True)
    fail.set_defaults(func=fail_command)

    return parser


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except TimeoutError as exc:
        print(json.dumps({"ok": False, "error": "timeout", "message": str(exc)}, ensure_ascii=False))
        return 124
    except Exception as exc:
        print(json.dumps({"ok": False, "error": type(exc).__name__, "message": str(exc)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
