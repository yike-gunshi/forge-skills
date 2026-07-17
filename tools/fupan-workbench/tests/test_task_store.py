import tempfile
import unittest
from pathlib import Path
import sys

WORKBENCH_DIR = Path(__file__).resolve().parents[1]
if str(WORKBENCH_DIR) not in sys.path:
    sys.path.insert(0, str(WORKBENCH_DIR))

from task_store import (
    TaskStateError,
    create_task,
    list_tasks,
    mark_consumed,
    read_task,
    submit_selection,
    wait_for_submission,
)


class TaskStoreTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_create_task_sets_pending_defaults_and_lists_current_first(self):
        older = create_task(
            {
                "id": "task-old",
                "project": "skill-system",
                "summary": "older",
                "topics": [{"id": "react", "title": "React"}],
                "active": False,
            },
            root=self.root,
        )
        current = create_task(
            {
                "id": "task-current",
                "project": "forge-cookbook",
                "summary": "current",
                "expression_issue_quotes": [
                    {
                        "quote": "帮我看看这个",
                        "issue": "目标不明确，AI 无法判断要看功能、设计还是代码。",
                        "suggestion": "下次可以说：请按功能正确性和可读性 review 这段实现。",
                    }
                ],
                "topics": [{"id": "fastapi", "title": "FastAPI"}],
                "active": True,
            },
            root=self.root,
        )

        self.assertEqual(older["status"], "pending_selection")
        self.assertEqual(current["status"], "pending_selection")
        self.assertEqual(read_task("task-current", root=self.root)["project"], "forge-cookbook")
        self.assertEqual(read_task("task-current", root=self.root)["expression_issue_quotes"][0]["quote"], "帮我看看这个")
        self.assertEqual([task["id"] for task in list_tasks(root=self.root)], ["task-current", "task-old"])

    def test_consumed_tasks_are_hidden_from_default_queue(self):
        create_task({"id": "task-done", "project": "forge-cookbook", "topics": []}, root=self.root)
        submit_selection("task-done", {"topics": [], "feedback": "done"}, root=self.root)
        mark_consumed("task-done", root=self.root)

        self.assertEqual(list_tasks(root=self.root), [])
        self.assertEqual([task["id"] for task in list_tasks(root=self.root, include_consumed=True)], ["task-done"])

    def test_submit_selection_is_one_way_and_preserves_choice(self):
        create_task(
            {
                "id": "task-one",
                "project": "forge-cookbook",
                "topics": [{"id": "react", "title": "React"}],
            },
            root=self.root,
        )

        submitted = submit_selection(
            "task-one",
            {
                "topics": [{"id": "react", "selected": True, "depth": "表达"}],
                "feedback": "React 从零讲",
            },
            root=self.root,
        )

        self.assertEqual(submitted["status"], "submitted")
        self.assertEqual(submitted["selection"]["topics"][0]["depth"], "表达")
        with self.assertRaises(TaskStateError):
            submit_selection("task-one", {"topics": []}, root=self.root)

    def test_wait_for_submission_only_returns_requested_task(self):
        create_task({"id": "task-a", "project": "a", "topics": []}, root=self.root)
        create_task({"id": "task-b", "project": "b", "topics": []}, root=self.root)
        submit_selection("task-b", {"topics": [], "feedback": "other"}, root=self.root)

        with self.assertRaises(TimeoutError):
            wait_for_submission("task-a", timeout_seconds=0.05, interval_seconds=0.01, root=self.root)

        submit_selection("task-a", {"topics": [], "feedback": "mine"}, root=self.root)
        task = wait_for_submission("task-a", timeout_seconds=0.05, interval_seconds=0.01, root=self.root)
        self.assertEqual(task["selection"]["feedback"], "mine")


if __name__ == "__main__":
    unittest.main()
