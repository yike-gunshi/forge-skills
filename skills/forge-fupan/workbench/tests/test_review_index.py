import tempfile
import unittest
from pathlib import Path
import sys

WORKBENCH_DIR = Path(__file__).resolve().parents[1]
if str(WORKBENCH_DIR) not in sys.path:
    sys.path.insert(0, str(WORKBENCH_DIR))

from review_index import ReviewIndex


class ReviewIndexTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.project = self.root / "skill-system"
        self.project.mkdir(parents=True)
        (self.root / "INDEX.md").write_text(
            "\n".join(
                [
                    "# 复盘索引",
                    "",
                    "## 2026-04-24",
                    "",
                    "- **[Fupan Workbench 设计](skill-system/2026-04-24-1010-[fupan]-workbench.md)** `skill-system` `React` `FastAPI`",
                    "  核心收获：把复盘做成可交互学习工作台。",
                ]
            ),
            encoding="utf-8",
        )
        (self.project / "2026-04-24-1010-[fupan]-workbench.md").write_text(
            "# Fupan Workbench 设计\n\n## 本次学到什么\n\nReact 和 FastAPI。\n",
            encoding="utf-8",
        )

    def tearDown(self):
        self.tmp.cleanup()

    def test_reads_index_without_selection_fields(self):
        index = ReviewIndex(review_root=self.root)
        reviews = index.list_reviews()

        self.assertEqual(len(reviews), 1)
        review = reviews[0]
        self.assertEqual(review["project"], "skill-system")
        self.assertEqual(review["learned_topics"], ["React", "FastAPI"])
        self.assertNotIn("selection", review)
        self.assertNotIn("depth", review)

    def test_detail_uses_id_mapping_not_arbitrary_path(self):
        index = ReviewIndex(review_root=self.root)
        review_id = index.list_reviews()[0]["id"]
        detail = index.read_review(review_id)

        self.assertIn("Fupan Workbench", detail["content"])
        with self.assertRaises(KeyError):
            index.read_review("../secret")

    def test_rewrites_review_asset_links_to_http_route(self):
        assets = self.project / "assets"
        assets.mkdir()
        (assets / "dashboard.png").write_bytes(b"png")
        (self.project / "2026-04-24-1010-[fupan]-workbench.md").write_text(
            "# Fupan Workbench 设计\n\n![仪表盘](assets/dashboard.png)\n",
            encoding="utf-8",
        )
        index = ReviewIndex(review_root=self.root)
        review_id = index.list_reviews()[0]["id"]
        detail = index.read_review(review_id)

        self.assertIn(f"/api/reviews/{review_id}/assets/assets/dashboard.png", detail["content"])
        self.assertEqual(index.resolve_asset_path(review_id, "assets/dashboard.png"), (assets / "dashboard.png").resolve())
        with self.assertRaises(KeyError):
            index.resolve_asset_path(review_id, "../secret.png")


if __name__ == "__main__":
    unittest.main()
