"""Tests for the V7 number rules in the beta builder (scripts/build_beta_manifest.py resolve) and the stable agent
package name rule (scripts/version_label.py zip_version_problem). Fixtures only: files are written to a temporary
directory, nothing in the repository is read or written. Run: python3 -m unittest scripts/tests/test_v7_numbers.py"""
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
import build_beta_manifest as B  # noqa: E402
import version_label as V  # noqa: E402
from test_beta_manifest import AGENT_ZIP, WIN_MSI, agent_block, stable_manifest, windows_block  # noqa: E402


class BetaV7Numbers(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name)
        (self.root / "downloads" / "beta").mkdir(parents=True)
        (self.root / "downloads" / "beta" / "algorab-agents-7.0.1.zip").write_bytes(AGENT_ZIP)
        (self.root / "downloads" / "beta" / "algorab-7.0.1-windows.msi").write_bytes(WIN_MSI)
        (self.root / "downloads" / "beta" / "algorab-7.0.2-windows.msi").write_bytes(WIN_MSI)
        self.stable = stable_manifest()

    def tearDown(self):
        self._tmp.cleanup()

    def resolve(self, agent=None, win=None):
        return B.resolve(self.stable, {"agent": agent, "corvus6_windows": win, "notes": {}}, self.root)

    def test_same_v7_number_for_both_is_accepted(self):
        _, report, errors = self.resolve(agent_block("algorab-agents-7.0.1.zip", "7.0.1", AGENT_ZIP),
                                         windows_block("algorab-7.0.1-windows.msi", "7.0.1", WIN_MSI))
        self.assertEqual(errors, [], report)

    def test_agent_and_windows_must_match(self):
        _, _, errors = self.resolve(agent_block("algorab-agents-7.0.1.zip", "7.0.1", AGENT_ZIP),
                                    windows_block("algorab-7.0.2-windows.msi", "7.0.2", WIN_MSI))
        self.assertTrue(any("must be the same number" in e for e in errors), errors)

    def test_ignored_windows_override_beside_v7_agent_is_an_error(self):
        # The Windows override 6.2.2 is not newer than the stable 6.2.3, so it is ignored; the agent 7.0.1 stays.
        _, _, errors = self.resolve(agent_block("algorab-agents-7.0.1.zip", "7.0.1", AGENT_ZIP),
                                    windows_block("algorab-7.0.1-windows.msi", "6.2.2", WIN_MSI))
        self.assertTrue(any("must be the same number" in e for e in errors), errors)

    def test_v7_without_label_is_an_error(self):
        data = b"agent zip bytes (test)"
        (self.root / "downloads" / "beta" / "algorab-agents-7.0.0.zip").write_bytes(data)
        _, _, errors = self.resolve(agent_block("algorab-agents-7.0.0.zip", "7.0.0", data))
        self.assertTrue(any("has no label" in e for e in errors), errors)

    def test_v7_file_name_must_carry_the_number(self):
        # 2026-11-18 review: agent 7.0.2 pointing at the 7.0.1 zip (or the msi of another number) is refused.
        _, _, errors = self.resolve(agent_block("algorab-agents-7.0.1.zip", "7.0.2", AGENT_ZIP),
                                    windows_block("algorab-7.0.1-windows.msi", "7.0.2", WIN_MSI))
        self.assertTrue(any("agent: file_name 'algorab-agents-7.0.1.zip' must be" in e for e in errors), errors)
        self.assertTrue(any("windows: file_name 'algorab-7.0.1-windows.msi' must be" in e for e in errors), errors)

    def test_below_seven_is_untouched(self):
        (self.root / "downloads" / "beta" / "algorab-agents-6.7.0.zip").write_bytes(AGENT_ZIP)
        _, _, errors = self.resolve(agent_block())
        self.assertEqual(errors, [])


class BetaReleaseDate(unittest.TestCase):
    """2026-11-19: the changelog date of a V7 release is the day the beta manifest first offers it (build, write mode)."""

    def setUp(self):
        import json
        self.json = json
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name)
        (self.root / "downloads" / "beta").mkdir(parents=True)
        (self.root / "downloads" / "beta" / "algorab-agents-7.0.1.zip").write_bytes(AGENT_ZIP)
        (self.root / "downloads" / "beta" / "algorab-7.0.1-windows.msi").write_bytes(WIN_MSI)
        (self.root / "beta").mkdir()
        (self.root / "data").mkdir()
        self.stable_path = self.root / "glimpse_manifest.json"
        self.stable_path.write_text(json.dumps(stable_manifest()), encoding="utf-8")
        (self.root / "beta" / "overrides.json").write_text(json.dumps({
            "agent": agent_block("algorab-agents-7.0.1.zip", "7.0.1", AGENT_ZIP),
            "corvus6_windows": windows_block("algorab-7.0.1-windows.msi", "7.0.1", WIN_MSI), "notes": {}}),
            encoding="utf-8")

    def tearDown(self):
        self._tmp.cleanup()

    def entry(self, date):
        self.json.dump({"brands": {"corvus6": [{"id": "corvus6-v7.0.1", "release": "V7.0 Beta 1", "version": "7.0.1",
                                                "covers": ["agent"], "date": date, "type": "release",
                                                "channel": "beta"}]}},
                       (self.root / "data" / "changelog_brands.json").open("w", encoding="utf-8"))

    def build(self, write_file=True, today="2026-11-21"):
        return B.build(self.root / "beta", self.root, self.stable_path, write_file, today=today)

    def test_no_entry_is_refused(self):
        code, lines = self.build()
        self.assertEqual(code, 1)
        self.assertTrue(any("has no changelog entry" in x for x in lines), lines)

    def test_wrong_date_is_refused_on_the_day_of_offering(self):
        self.entry("2026-11-19")
        code, lines = self.build()
        self.assertEqual(code, 1)
        self.assertTrue(any('set its "date" to "2026-11-21"' in x for x in lines), lines)
        self.assertFalse((self.root / "beta" / "glimpse_manifest.json").exists())

    def test_right_date_writes(self):
        self.entry("2026-11-21")
        code, lines = self.build()
        self.assertEqual(code, 0, lines)
        self.assertEqual(self.json.loads((self.root / "beta" / "glimpse_manifest.json").read_text())["agent"]["latest"],
                         "7.0.1")

    def test_later_days_and_check_mode_do_not_turn_red(self):
        self.entry("2026-11-21")
        self.assertEqual(self.build()[0], 0)
        # A later write (a stable publish of another block) and the --check mode keep passing on later days.
        self.assertEqual(self.build(today="2026-12-05")[0], 0)
        self.assertEqual(self.build(write_file=False, today="2026-12-05")[0], 0)


class StableAgentName(unittest.TestCase):
    def test_four_parts_refused_from_seven_on(self):
        self.assertIsNotNone(V.zip_version_problem("7.0.1.5"))
        self.assertIsNone(V.zip_version_problem("6.7.0.5"))


if __name__ == "__main__":
    unittest.main()
