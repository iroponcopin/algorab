"""Unit tests for the release order used by scripts/check_changelog_brands.py (defect H7: on one date "V7.0" sorted
below "V7.0 Beta 9"). Fixtures only. Run: python3 -m unittest scripts/tests/test_changelog_order.py"""
import sys
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SCRIPTS))
import check_changelog_brands as C  # noqa: E402


class ReleaseOrder(unittest.TestCase):
    def test_v7_release_is_after_its_betas_on_the_same_date(self):
        day = "2026-11-18"
        self.assertGreater(C.release_key(day, "V7.0"), C.release_key(day, "V7.0 Beta 9"))
        self.assertGreater(C.release_key(day, "V7.0.1"), C.release_key(day, "V7.0"))

    def test_stored_number_wins_over_the_label(self):
        day = "2026-11-18"
        self.assertEqual(C.release_key(day, "V7.0 Beta 1", "7.0.1")[1], (7, 0, 1))
        self.assertEqual(C.release_key(day, "V7.0", "7.0.100")[1], (7, 0, 100))

    def test_newest_first_accepts_v7_labels_in_order(self):
        keys = [C.release_key("2026-11-18", r) for r in ("V7.0", "V7.0 Beta 9", "V7.0 Beta 1")]
        self.assertTrue(C.newest_first(keys))
        swapped = [C.release_key("2026-11-18", r) for r in ("V7.0 Beta 9", "V7.0")]
        self.assertFalse(C.newest_first(swapped))

    def test_other_versions_keep_the_digits_rule(self):
        self.assertEqual(C.release_key("2026-11-10", "V1.1.4")[1], (1, 1, 4))
        self.assertEqual(C.release_key("2026-11-10", "1.8 6166")[1], (1, 8, 6166))
        self.assertEqual(C.release_key("2026-11-10", "6.2.3")[1], (6, 2, 3))


if __name__ == "__main__":
    unittest.main()
