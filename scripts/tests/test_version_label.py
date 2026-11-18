"""Unit tests for scripts/version_label.py and the shared vectors scripts/version-labels.v1.json.
Run: python3 -m unittest scripts/tests/test_version_label.py (or from scripts/tests: python3 -m unittest test_version_label).
The SHA-256 pin is the contract with the other repositories (agent, app, bot, Windows msi builder): they must carry the
same bytes. If the file changes, every copy changes with it and this constant is updated on purpose."""
import hashlib
import sys
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SCRIPTS))
import version_label as V  # noqa: E402

VECTORS_SHA256 = "139fe6fa3518f53d4c6ee92a99d0556bbbbba5891ff54a59857fd528067d1a6d"


class SharedVectors(unittest.TestCase):
    def test_file_bytes_are_pinned(self):
        digest = hashlib.sha256((SCRIPTS / "version-labels.v1.json").read_bytes()).hexdigest()
        self.assertEqual(digest, VECTORS_SHA256)

    def test_every_vector_matches_the_rule(self):
        rows = V.vectors()
        self.assertEqual(len(rows), 20)
        for text, want in rows:
            with self.subTest(text=text):
                self.assertEqual(V.label(text), want)


class LabelRule(unittest.TestCase):
    def test_beta_release_hotfix_and_next_minor(self):
        self.assertEqual(V.label("7.0.1"), "V7.0 Beta 1")
        self.assertEqual(V.label("7.0.99"), "V7.0 Beta 99")
        self.assertEqual(V.label("7.0.100"), "V7.0")
        self.assertEqual(V.label("7.0.101"), "V7.0.1")
        self.assertEqual(V.label("7.1.1"), "V7.1 Beta 1")
        self.assertEqual(V.label("8.0.100"), "V8.0")

    def test_below_seven_is_unchanged(self):
        self.assertEqual(V.label("6.7.0"), "6.7.0")
        self.assertEqual(V.label("6.2.3"), "6.2.3")

    def test_refusals(self):
        for text in ("7.0.0", "7.0.200", "7.0", "7.0.1.0", "07.0.1", "7.0.01", "7.0.1\n", "7.0.1-beta", "", None, 701):
            with self.subTest(text=text):
                self.assertIsNone(V.label(text))

    def test_seven_or_later_is_decided_by_the_first_number(self):
        self.assertTrue(V.is_v7_or_later("7.0"))
        self.assertTrue(V.is_v7_or_later("V8.0 Beta 1"))
        self.assertFalse(V.is_v7_or_later("6.9.100.1"))
        self.assertFalse(V.is_v7_or_later(""))


class OrderKey(unittest.TestCase):
    def test_release_sorts_after_the_betas_of_its_minor(self):
        keys = [V.order_key(x) for x in ("V7.0 Beta 9", "V7.0", "V7.0.1", "V7.1 Beta 1")]
        self.assertEqual(keys, sorted(keys))

    def test_labels_map_back_to_their_number(self):
        self.assertEqual(V.number_of_label("V7.0 Beta 1"), "7.0.1")
        self.assertEqual(V.number_of_label("V7.0"), "7.0.100")
        self.assertEqual(V.number_of_label("V7.0.1"), "7.0.101")
        self.assertEqual(V.number_of_label("7.0.101"), "7.0.101")

    def test_text_that_is_not_a_label_has_no_key(self):
        for text in ("V1.1.4", "V7.0 Beta 0", "V7.0 Beta 100", "V7.0.100", "7.0.1.5"):
            with self.subTest(text=text):
                self.assertIsNone(V.order_key(text))


class ZipVersion(unittest.TestCase):
    def test_four_parts_are_refused_from_seven_on(self):
        self.assertIsNotNone(V.zip_version_problem("7.0.1.5"))
        self.assertIsNotNone(V.zip_version_problem("7.0"))
        self.assertIsNotNone(V.zip_version_problem("7.0.0"))

    def test_three_parts_from_seven_on_are_accepted(self):
        self.assertIsNone(V.zip_version_problem("7.0.1"))
        self.assertIsNone(V.zip_version_problem("7.0.100"))

    def test_below_seven_keeps_the_old_rule(self):
        self.assertIsNone(V.zip_version_problem("6.7.0"))
        self.assertIsNone(V.zip_version_problem("6.7.0.1"))
        self.assertIsNotNone(V.zip_version_problem("6.7"))


if __name__ == "__main__":
    unittest.main()
