"""Tests for the feed shape of one release (scripts/build_changelog_feed.py release_for). Fixtures only.
Run: python3 -m unittest scripts/tests/test_changelog_feed.py"""
import sys
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SCRIPTS))
import build_changelog_feed as F  # noqa: E402

LABELS = {
    "changelog_new_features_label": "New Features",
    "changelog_bug_fixes_label": "Bug Fixes",
    "changelog_refinements_label": "Refinements",
    "changelog_highlights_label": "Highlights",
    "changelog_balance_label": "Balance",
    "changelog_warnings_label": "Warnings",
    "changelog_limitations_label": "Limitations",
}


def entry(**kw):
    base = {"id": "corvus6-v7.0.1", "release": "V7.0 Beta 1", "date": "2026-11-20", "type": "release",
            "title": "Algorab V7.0 Beta 1", "summary": "s", "new_features": ["A new thing."]}
    base.update(kw)
    return base


class CombinedRelease(unittest.TestCase):
    def test_combined_release_carries_label_number_and_covers(self):
        rel = F.release_for(entry(version="7.0.1", covers=["agent"], channel="beta"), LABELS)
        self.assertEqual(rel["version"], "V7.0 Beta 1")
        self.assertEqual(rel["number"], "7.0.1")
        self.assertEqual(rel["covers"], ["agent"])
        self.assertEqual(rel["channel"], "beta")
        self.assertEqual(rel["sections"][0], {"title": "New Features", "kind": "new_features", "items": ["A new thing."]})

    def test_old_release_keeps_its_shape(self):
        rel = F.release_for(entry(id="corvus6-v6.2.1", release="6.2.1", new_features=[], bug_fixes=["x"]), LABELS)
        self.assertEqual(rel["version"], "6.2.1")
        self.assertNotIn("number", rel)
        self.assertNotIn("covers", rel)
        self.assertEqual([s["kind"] for s in rel["sections"]], ["bug_fixes"])


if __name__ == "__main__":
    unittest.main()
