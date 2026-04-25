#!/usr/bin/env python3
"""Validate a Forge bugfix acceptance report before user review."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


REQUIRED_SECTIONS = [
    "## 7. 验收入口与环境身份校验",
    "## 8. 人工验收指南（给用户看）",
    "## 9. QA 测试过程与截图证据（forge-qa 填）",
]

ALLOWED_STATUSES = {
    "pending",
    "in-progress",
    "fixed-awaiting-qa",
    "qa-incomplete",
    "qa-failed",
    "qa-pass-pending-user-verification",
    "qa-pass-pending-final-review",
    "qa-pass-user-accepted",
    "blocked-human",
    "resolved",
    "deferred",
}

READY_STATUSES = {
    "qa-pass-pending-user-verification",
    "qa-pass-pending-final-review",
    "qa-pass-user-accepted",
    "resolved",
}

PLACEHOLDER_PATTERNS = [
    "{{",
    "}}",
    "_待填写_",
    "_待 forge-qa 填写_",
    "待 forge-qa",
    "http://localhost:xxxx",
    "http://localhost:yyyy",
]


def section(text: str, heading: str) -> str:
    start = text.find(heading)
    if start == -1:
        return ""
    next_heading = re.search(r"\n## \d+\. ", text[start + 1 :])
    if not next_heading:
        return text[start:]
    end = start + 1 + next_heading.start()
    return text[start:end]


def image_paths(text: str) -> list[str]:
    return re.findall(r"!\[[^\]]*\]\(([^)]+)\)", text)


def normalize_image_path(path: str) -> str:
    return path.strip().split()[0]


def extract_status(text: str) -> str:
    patterns = [
        r"\|\s*状态\s*\|\s*`?([^`|\n]+)`?\s*\|",
        r"-\s*\*\*状态\*\*\s*[:：]\s*`?([^`\n]+)`?",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1).strip()
    return ""


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("report", type=Path)
    parser.add_argument("--ready-for-user", action="store_true")
    parser.add_argument("--require-browser-evidence", action="store_true")
    parser.add_argument("--require-user-problem-closure", action="store_true")
    parser.add_argument("--require-independent-worktree", action="store_true")
    parser.add_argument("--require-config-readiness", action="store_true")
    parser.add_argument("--expect-app-url")
    args = parser.parse_args()

    errors: list[str] = []
    report = args.report

    if not report.is_file():
        print(f"QA_INCOMPLETE: report not found: {report}", file=sys.stderr)
        return 2

    text = report.read_text(encoding="utf-8")

    for heading in REQUIRED_SECTIONS:
        if heading not in text:
            errors.append(f"missing section: {heading}")

    tdd_section = section(text, "## 6. TDD / 回归用例")
    env_section = section(text, "## 7. 验收入口与环境身份校验")
    manual_section = section(text, "## 8. 人工验收指南（给用户看）")
    qa_section = section(text, "## 9. QA 测试过程与截图证据（forge-qa 填）")

    status = extract_status(text)
    if status and status not in ALLOWED_STATUSES:
        errors.append(f"unknown report status: {status}")
    elif not status:
        errors.append("missing report status")

    if args.expect_app_url and args.expect_app_url not in env_section:
        errors.append(f"expected app_url is not recorded in environment section: {args.expect_app_url}")

    if args.ready_for_user:
        if status not in READY_STATUSES:
            errors.append(f"status is not ready for user review: {status or '<missing>'}")

        if "环境一致性结论**：PASS" not in env_section and "环境一致性结论**: PASS" not in env_section:
            errors.append("environment consistency is not PASS")

        for token in PLACEHOLDER_PATTERNS:
            if token in env_section or token in manual_section or token in qa_section:
                errors.append(f"placeholder remains in user-facing/QA sections: {token}")

        if not re.search(r"\*\*结论\*\*：\s*PASS|\*\*结论\*\*:\s*PASS", qa_section):
            errors.append("QA section has no PASS conclusion")

        if re.search(r"\*\*结论\*\*：\s*(FAIL|BLOCKED)|\*\*结论\*\*:\s*(FAIL|BLOCKED)", qa_section):
            errors.append("QA section still contains FAIL or BLOCKED conclusion")

        tdd_source = tdd_section or text
        if "RED" not in tdd_source or "GREEN" not in tdd_source:
            errors.append("report lacks RED/GREEN TDD evidence")

    if args.require_independent_worktree and ".worktrees/" not in text and "/.worktrees/" not in text:
        errors.append("independent worktree evidence is missing")

    if args.require_config_readiness:
        has_config_heading = re.search(r"配置|开关|feature flag|Feature flag|config", env_section)
        has_config_pass = re.search(r"(配置|开关|feature flag|Feature flag|config).{0,120}PASS", env_section, re.S)
        if not has_config_heading or not has_config_pass:
            errors.append("config/feature-flag/data readiness check is missing or not PASS")

    if args.require_user_problem_closure:
        closure = section(qa_section, "### 用户问题闭环断言")
        if not closure:
            closure = section(qa_section, "### 9.0 用户问题闭环断言")
        if not closure:
            errors.append("user problem closure assertion section is missing")
        else:
            if "用户原话" not in closure and "原始问题" not in closure:
                errors.append("user problem closure lacks original user wording")
            if "最终用户可见结果" not in closure and "用户现在能" not in closure:
                errors.append("user problem closure lacks final user-visible result")
            if not re.search(r"结论\s*\|?\s*(PASS|✅)|\*\*结论\*\*\s*[:：]\s*PASS", closure):
                errors.append("user problem closure conclusion is not PASS")

    images = [normalize_image_path(p) for p in image_paths(qa_section) if "{{" not in p]
    existing_images = []
    missing_images = []
    for image in images:
        if re.match(r"^[a-z]+://", image):
            existing_images.append(image)
            continue
        image_path = (report.parent / image).resolve()
        if image_path.exists():
            existing_images.append(image)
        else:
            missing_images.append(image)

    if missing_images:
        errors.append("missing referenced screenshot files: " + ", ".join(missing_images[:5]))

    if args.require_browser_evidence:
        if not existing_images:
            errors.append("frontend/browser bug requires embedded QA screenshot evidence")
        if "console.error" not in qa_section and "network error" not in qa_section:
            errors.append("frontend/browser QA section lacks console/network evidence summary")

    if errors:
        print("QA_INCOMPLETE")
        for error in errors:
            print(f"- {error}")
        return 1

    print("QA_EVIDENCE_COMPLETE")
    print(f"- report: {report}")
    print(f"- qa_screenshots: {len(existing_images)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
