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

    def test_below_seven_is_untouched(self):
        (self.root / "downloads" / "beta" / "algorab-agents-6.7.0.zip").write_bytes(AGENT_ZIP)
        _, _, errors = self.resolve(agent_block())
        self.assertEqual(errors, [])


class StableAgentName(unittest.TestCase):
    def test_four_parts_refused_from_seven_on(self):
        self.assertIsNotNone(V.zip_version_problem("7.0.1.5"))
        self.assertIsNone(V.zip_version_problem("6.7.0.5"))


if __name__ == "__main__":
    unittest.main()
