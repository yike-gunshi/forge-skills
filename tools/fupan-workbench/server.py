"""FastAPI server for the local Fupan Workbench."""

import argparse
import json
from pathlib import Path
import sys

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from review_index import ReviewIndex, default_review_root

try:
    from __init__ import WORKBENCH_VERSION
except Exception:
    WORKBENCH_VERSION = "2026.04.24"


def create_app(workbench_home=None, review_root=None, repo_path=None, skill_path=None):
    try:
        from fastapi import FastAPI, HTTPException
        from fastapi.responses import FileResponse, HTMLResponse
        from fastapi.staticfiles import StaticFiles
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "Fupan Workbench requires FastAPI. Install with: python3 -m pip install -r skills/forge-fupan/workbench/requirements.txt"
        ) from exc

    root = Path(workbench_home).expanduser() if workbench_home else None
    reviews = ReviewIndex(review_root=review_root)
    static_dir = CURRENT_DIR / "static"
    index_html = static_dir / "index.html"
    app = FastAPI(title="Fupan Workbench", version=WORKBENCH_VERSION)

    @app.get("/api/health")
    def health():
        return {
            "ok": True,
            "version": WORKBENCH_VERSION,
            "repo_path": str(repo_path or ""),
            "skill_path": str(skill_path or CURRENT_DIR.parent),
            "static_ready": index_html.exists(),
        }

    ledger_path = Path(review_root).expanduser() / "learnings.jsonl" if review_root else Path(default_review_root()) / "learnings.jsonl"

    @app.get("/api/learnings")
    def api_learnings():
        """读取 learnings.jsonl 账本（fupan v2 主产出）。同 key 取最新 ts，旧条目标 superseded。"""
        if not ledger_path.exists():
            return {"learnings": [], "counts": {}, "ledger_path": str(ledger_path)}
        rows = []
        for line_no, line in enumerate(ledger_path.read_text(encoding="utf-8").splitlines(), 1):
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
                row["_line"] = line_no
                rows.append(row)
            except Exception:
                continue  # 坏行跳过，不让一行脏数据拖垮整个账本
        latest_by_key = {}
        for row in rows:
            key = row.get("key", "")
            if key not in latest_by_key or (row.get("ts") or "") >= (latest_by_key[key].get("ts") or ""):
                latest_by_key[key] = row
        for row in rows:
            explicit = row.get("status") or "active"
            row["effective_status"] = explicit if explicit != "active" else (
                "active" if latest_by_key.get(row.get("key", "")) is row else "superseded"
            )
        counts = {
            "total": len(rows),
            "active": sum(1 for r in rows if r["effective_status"] == "active"),
            "projects": sorted({r.get("project", "") for r in rows if r.get("project")}),
            "domains": sorted({r.get("domain", "") for r in rows if r.get("domain")}),
        }
        rows.sort(key=lambda r: (r["effective_status"] != "active", -(r.get("confidence") or 0), r.get("ts") or ""))
        return {"learnings": rows, "counts": counts, "ledger_path": str(ledger_path)}

    @app.get("/api/reviews")
    def api_reviews():
        return {"reviews": reviews.list_reviews()}

    @app.get("/api/reviews/{review_id}")
    def api_review(review_id):
        try:
            return reviews.read_review(review_id)
        except KeyError:
            raise HTTPException(status_code=404, detail="review_not_found")
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    @app.get("/api/reviews/{review_id}/assets/{asset_path:path}")
    def api_review_asset(review_id, asset_path):
        try:
            asset = reviews.resolve_asset_path(review_id, asset_path)
        except KeyError:
            raise HTTPException(status_code=404, detail="asset_not_found")
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        if not asset.exists() or not asset.is_file():
            raise HTTPException(status_code=404, detail="asset_not_found")
        return FileResponse(str(asset))

    assets_dir = static_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{path:path}")
    def spa(path):
        requested = static_dir / path
        if path and requested.exists() and requested.is_file():
            return FileResponse(str(requested))
        if index_html.exists():
            return FileResponse(str(index_html))
        return HTMLResponse(
            """
            <!doctype html>
            <html lang="zh-CN">
              <head><meta charset="utf-8"><title>Fupan Workbench</title></head>
              <body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;padding:32px">
                <h1>Fupan Workbench</h1>
                <p>后端服务已启动，但前端静态文件尚未构建。</p>
                <pre>cd skills/forge-fupan/workbench/frontend && npm install && npm run build</pre>
              </body>
            </html>
            """,
            status_code=200,
        )

    return app


def main(argv=None):
    parser = argparse.ArgumentParser(description="Run Fupan Workbench API server.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--home", default=None)
    parser.add_argument("--review-root", default=None)
    parser.add_argument("--repo-path", default="")
    parser.add_argument("--skill-path", default="")
    parser.add_argument("--log-level", default="warning")
    args = parser.parse_args(argv)

    try:
        import uvicorn
    except ModuleNotFoundError:
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": "dependency_missing",
                    "message": "uvicorn is not installed. Install workbench requirements first.",
                },
                ensure_ascii=False,
            ),
            file=sys.stderr,
        )
        return 2

    app = create_app(
        workbench_home=args.home,
        review_root=args.review_root,
        repo_path=args.repo_path,
        skill_path=args.skill_path,
    )
    uvicorn.run(app, host=args.host, port=args.port, log_level=args.log_level)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
