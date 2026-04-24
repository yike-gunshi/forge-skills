#!/usr/bin/env python3
"""Generate Image 2 assets and save prompt metadata.

This helper intentionally uses only the Python standard library so Forge skills
can call it without installing the OpenAI SDK. It expects OPENAI_API_KEY.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
from pathlib import Path
import sys
import urllib.error
import urllib.request


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a GPT Image 2 asset.")
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--prompt-file", help="Markdown/text file containing the prompt.")
    source.add_argument("--prompt", help="Prompt text.")
    parser.add_argument("--out", required=True, help="Output image path.")
    parser.add_argument("--model", default="gpt-image-2", help="Image model.")
    parser.add_argument("--size", default="1536x1024", help="Output size, e.g. 1536x1024.")
    parser.add_argument("--quality", default="medium", choices=["low", "medium", "high", "auto"])
    parser.add_argument("--output-format", default="png", choices=["png", "jpeg", "webp"])
    parser.add_argument("--output-compression", type=int, default=None)
    parser.add_argument("--n", type=int, default=1, help="Number of images.")
    parser.add_argument("--meta-out", help="Optional metadata JSON path.")
    parser.add_argument("--timeout", type=int, default=180)
    parser.add_argument("--dry-run", action="store_true", help="Write metadata only; no API call.")
    return parser.parse_args()


def read_prompt(args: argparse.Namespace) -> str:
    if args.prompt_file:
        return Path(args.prompt_file).read_text(encoding="utf-8").strip()
    return args.prompt.strip()


def output_path_for(base: Path, index: int, total: int) -> Path:
    if total == 1:
        return base
    return base.with_name(f"{base.stem}-{index + 1}{base.suffix}")


def main() -> int:
    args = parse_args()
    prompt = read_prompt(args)
    if not prompt:
        print("Prompt is empty.", file=sys.stderr)
        return 1

    out_path = Path(args.out).expanduser()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    meta_path = Path(args.meta_out).expanduser() if args.meta_out else out_path.with_suffix(".meta.json")

    payload = {
        "model": args.model,
        "prompt": prompt,
        "size": args.size,
        "quality": args.quality,
        "n": args.n,
    }
    if args.output_format != "png":
        payload["output_format"] = args.output_format
    if args.output_compression is not None:
        payload["output_compression"] = args.output_compression

    meta = {
        "model": args.model,
        "size": args.size,
        "quality": args.quality,
        "output_format": args.output_format,
        "prompt_file": args.prompt_file,
        "output": str(out_path),
        "dry_run": args.dry_run,
    }

    prompt_path = out_path.with_suffix(".prompt.md")
    if args.prompt_file:
        prompt_path.write_text(Path(args.prompt_file).read_text(encoding="utf-8"), encoding="utf-8")
    else:
        prompt_path.write_text(prompt + "\n", encoding="utf-8")
    meta["saved_prompt"] = str(prompt_path)

    if args.dry_run:
        meta_path.write_text(json.dumps({**meta, "payload": payload}, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Dry run metadata written: {meta_path}")
        return 0

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        meta["status"] = "missing_openai_api_key"
        meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
        print("OPENAI_API_KEY is not set. Prompt and metadata were saved; image was not generated.", file=sys.stderr)
        return 2

    base_url = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    request = urllib.request.Request(
        f"{base_url}/images/generations",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=args.timeout) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        meta["status"] = "http_error"
        meta["error"] = details
        meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Image generation failed: HTTP {exc.code}\n{details}", file=sys.stderr)
        return 1
    except urllib.error.URLError as exc:
        meta["status"] = "url_error"
        meta["error"] = str(exc)
        meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Image generation failed: {exc}", file=sys.stderr)
        return 1

    result = json.loads(body)
    images = result.get("data") or []
    if not images:
        meta["status"] = "no_images_returned"
        meta["response"] = result
        meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
        print("No images returned.", file=sys.stderr)
        return 1

    written = []
    for index, item in enumerate(images):
        b64_json = item.get("b64_json") or item.get("base64")
        if not b64_json:
            continue
        path = output_path_for(out_path, index, len(images))
        path.write_bytes(base64.b64decode(b64_json))
        written.append(str(path))

    meta["status"] = "ok" if written else "no_base64_image_data"
    meta["outputs"] = written
    meta["usage"] = result.get("usage")
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    if not written:
        print("Response did not contain base64 image data.", file=sys.stderr)
        return 1

    print("\n".join(written))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
