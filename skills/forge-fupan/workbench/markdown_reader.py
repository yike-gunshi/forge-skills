"""Markdown reading helpers for historical Fupan reviews."""

import re
from pathlib import Path


FRONTMATTER_RE = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)
HEADING_RE = re.compile(r"^(#{1,3})\s+(.+?)\s*$", re.MULTILINE)


def parse_frontmatter(text):
    match = FRONTMATTER_RE.match(text)
    if not match:
        return {}, text
    frontmatter = {}
    for line in match.group(1).splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        frontmatter[key.strip()] = value.strip().strip('"').strip("'")
    body = text[match.end() :]
    return frontmatter, body


def read_markdown(path):
    path = Path(path)
    text = path.read_text(encoding="utf-8")
    frontmatter, body = parse_frontmatter(text)
    headings = [{"level": len(level), "title": title.strip()} for level, title in HEADING_RE.findall(body)]
    return {
        "path": str(path),
        "frontmatter": frontmatter,
        "content": body,
        "headings": headings,
    }


def first_date_from_name(path):
    match = re.search(r"(20\d{2}-\d{2}-\d{2})(?:-(\d{4}))?", Path(path).name)
    if not match:
        return ""
    if match.group(2):
        return "{}T{}:{}:00".format(match.group(1), match.group(2)[:2], match.group(2)[2:])
    return match.group(1)
