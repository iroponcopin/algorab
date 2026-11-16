"""Unit tests for scripts/build_beta_manifest.py. Run: python3 -m unittest scripts/tests/test_beta_manifest.py
(or from scripts/tests: python3 -m unittest test_beta_manifest). Every file is made in a temporary directory; nothing
in the repository is read or written, and no beta file is ever committed."""
import copy
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SCRIPTS))
import build_beta_manifest as B  # noqa: E402

AGENT_ZIP = b"agent zip bytes (test)"
WIN_MSI = b"windows msi bytes (test)"


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def stable_manifest() -> dict:
    return {
        "pack": {"id": "glimpse-pack", "latest": "4.4.0.2", "sha256": "61" * 32, "file_size": 11060},
        "launcher": {"latest": "5.5.1312", "native": {"macos": {"file_name": "x.dmg", "sha256": "a" * 64}}},
        "agent": {
            "latest": "6.6.1",
            "download_url": "https://algorab.uk/downloads/algorab-agents-6.6.1.zip",
            "file_name": "algorab-agents-6.6.1.zip",
            "file_size": 901646,
            "sha256": "8d14401e610ec0913b8d5a53dac571630ac7703b4fed6c752fa92117a433c806",
        },
        "corvus6": {
            "latest": "6.2.3",
            "native": {
                "macos": {"version": "6.2.2", "download_url": "https://algorab.uk/downloads/m.dmg", "file_name": "m.dmg",
                          "file_size": 1, "sha256": "7" * 64, "min_os": "14.0", "arch": "arm64"},
                "windows": {"version": "6.2.3", "download_url": "https://algorab.uk/downloads/algorab-6.2.3-windows.msi",
                            "file_name": "algorab-6.2.3-windows.msi", "file_size": 29120605,
                            "sha256": "01574b83b4e932eb43f03d93169e4c4a56c2a31c4820ce58e5cb850cb526754f"},
                "linux": {"version": "6.2.1", "download_url": "https://algorab.uk/downloads/l.AppImage",
                          "file_name": "l.AppImage", "file_size": 2, "sha256": "8" * 64},
            },
        },
    }


def agent_block(name="algorab-agents-6.7.0.zip", version="6.7.0", data=AGENT_ZIP):
    return {"latest": version, "download_url": B.BETA_URL_PREFIX + name, "file_name": name,
            "file_size": len(data), "sha256": sha(data)}


def windows_block(name="algorab-6.3.0-windows.msi", version="6.3.0", data=WIN_MSI):
    return {"version": version, "download_url": B.BETA_URL_PREFIX + name, "file_name": name,
            "file_size": len(data), "sha256": sha(data)}


class Fixture(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmp.name)
        self.root = self.tmp / "root"
        (self.root / "downloads" / "beta").mkdir(parents=True)
        self.directory = self.tmp / "beta"
        self.directory.mkdir()
        self.stable_path = self.tmp / "glimpse_manifest.json"
        self.stable = stable_manifest()
        self.write_stable()
        (self.root / "downloads" / "beta" / "algorab-agents-6.7.0.zip").write_bytes(AGENT_ZIP)
        (self.root / "downloads" / "beta" / "algorab-6.3.0-windows.msi").write_bytes(WIN_MSI)

    def tearDown(self):
        self._tmp.cleanup()

    def write_stable(self):
        self.stable_path.write_text(B.dump(self.stable), encoding="utf-8")

    def overrides(self, **kw):
        base = {"agent": None, "corvus6_windows": None, "notes": {}}
        base.update(kw)
        (self.directory / "overrides.json").write_text(json.dumps(base), encoding="utf-8")

    def run_build(self, write_file=True):
        return B.build(self.directory, self.root, self.stable_path, write_file=write_file)

    def beta(self) -> dict:
        return json.loads((self.directory / "glimpse_manifest.json").read_text(encoding="utf-8"))

    def assertRefused(self, code, lines, fragment=None):
        self.assertEqual(code, 1, lines)
        self.assertFalse((self.directory / "glimpse_manifest.json").exists(), "a refused build must not write")
        if fragment:
            self.assertTrue(any(fragment in line for line in lines), (fragment, lines))


class MirrorAndFormat(Fixture):
    def test_mirror_is_byte_identical_to_stable(self):
        self.overrides()
        code, lines = self.run_build()
        self.assertEqual(code, 0, lines)
        self.assertEqual((self.directory / "glimpse_manifest.json").read_bytes(), self.stable_path.read_bytes())
        self.assertTrue(any("no valid overrides" in line for line in lines))

    def test_check_mode_passes_on_fresh_mirror_and_fails_when_stale(self):
        self.overrides()
        self.run_build()
        self.assertEqual(self.run_build(write_file=False)[0], 0)
        (self.directory / "glimpse_manifest.json").write_text("{}\n", encoding="utf-8")
        code, lines = self.run_build(write_file=False)
        self.assertEqual(code, 1)
        self.assertTrue(any(line.startswith("STALE") for line in lines))

    def test_check_mode_fails_when_file_missing(self):
        self.overrides()
        code, _ = self.run_build(write_file=False)
        self.assertEqual(code, 1)

    def test_only_overridable_blocks_differ(self):
        self.overrides(agent=agent_block(), corvus6_windows=windows_block())
        code, lines = self.run_build()
        self.assertEqual(code, 0, lines)
        beta, stable = self.beta(), copy.deepcopy(self.stable)
        self.assertEqual(set(beta), set(stable))
        self.assertEqual(beta["launcher"], stable["launcher"])
        self.assertEqual(beta["pack"], stable["pack"])
        self.assertEqual(beta["corvus6"]["latest"], stable["corvus6"]["latest"])
        self.assertEqual(beta["corvus6"]["native"]["macos"], stable["corvus6"]["native"]["macos"])
        self.assertEqual(beta["corvus6"]["native"]["linux"], stable["corvus6"]["native"]["linux"])
        for k in B.AGENT_KEYS:
            self.assertEqual(beta["agent"][k], agent_block()[k])
        for k in B.WINDOWS_KEYS:
            self.assertEqual(beta["corvus6"]["native"]["windows"][k], windows_block()[k])


class ValidOverrides(Fixture):
    def test_valid_agent_override_applied(self):
        self.overrides(agent=agent_block())
        code, lines = self.run_build()
        self.assertEqual(code, 0, lines)
        self.assertEqual(self.beta()["agent"]["latest"], "6.7.0")
        self.assertEqual(self.beta()["corvus6"], self.stable["corvus6"])

    def test_valid_windows_override_applied(self):
        self.overrides(corvus6_windows=windows_block())
        code, lines = self.run_build()
        self.assertEqual(code, 0, lines)
        self.assertEqual(self.beta()["corvus6"]["native"]["windows"]["version"], "6.3.0")
        self.assertEqual(self.beta()["corvus6"]["latest"], "6.2.3")
        self.assertEqual(self.beta()["agent"], self.stable["agent"])

    def test_two_part_version_accepted(self):
        self.overrides(agent=agent_block(version="6.7"))
        code, lines = self.run_build()
        self.assertEqual(code, 0, lines)
        self.assertEqual(self.beta()["agent"]["latest"], "6.7")


class IgnoredVersions(Fixture):
    def test_equal_version_is_ignored(self):
        self.overrides(agent=agent_block(version="6.6.1"))
        code, lines = self.run_build()
        self.assertEqual(code, 0, lines)
        self.assertEqual(self.beta(), self.stable)
        self.assertTrue(any("not newer" in line for line in lines))

    def test_older_version_is_ignored_for_windows(self):
        self.overrides(corvus6_windows=windows_block(version="6.2.2"))
        code, lines = self.run_build()
        self.assertEqual(code, 0, lines)
        self.assertEqual(self.beta(), self.stable)
        self.assertTrue(any("ignored" in line for line in lines))

    def test_non_numeric_versions_are_ignored(self):
        for bad_version in ("6.7.0-beta.1", "v6.7.0", "6.7.0.1", "6.7.x", ""):
            with self.subTest(version=bad_version):
                self.overrides(agent=agent_block(version=bad_version))
                code, lines = self.run_build()
                self.assertEqual(code, 0, lines)
                self.assertEqual(self.beta(), self.stable)
                self.assertTrue(any("ignored" in line for line in lines))


class RefusedOverrides(Fixture):
    def test_forbidden_block_is_refused(self):
        self.overrides(launcher={"latest": "9.9.9"})
        code, lines = self.run_build()
        self.assertRefused(code, lines, "not allowed")

    def test_forbidden_macos_block_is_refused(self):
        self.overrides(corvus6_macos={"version": "7.0.0"})
        code, lines = self.run_build()
        self.assertRefused(code, lines, "corvus6_macos")

    def test_missing_file_is_refused(self):
        (self.root / "downloads" / "beta" / "algorab-agents-6.7.0.zip").unlink()
        self.overrides(agent=agent_block())
        code, lines = self.run_build()
        self.assertRefused(code, lines, "does not exist")

    def test_wrong_sha_is_refused(self):
        block = agent_block()
        block["sha256"] = "0" * 64
        self.overrides(agent=block)
        code, lines = self.run_build()
        self.assertRefused(code, lines, "sha256 is not")

    def test_wrong_size_is_refused(self):
        block = windows_block()
        block["file_size"] = block["file_size"] + 1
        self.overrides(corvus6_windows=block)
        code, lines = self.run_build()
        self.assertRefused(code, lines, "file_size")

    def test_url_outside_beta_is_refused(self):
        block = windows_block()
        block["download_url"] = "https://algorab.uk/downloads/algorab-6.3.0-windows.msi"
        self.overrides(corvus6_windows=block)
        code, lines = self.run_build()
        self.assertRefused(code, lines, "download_url must be")

    def test_http_url_is_refused(self):
        block = windows_block()
        block["download_url"] = block["download_url"].replace("https://", "http://")
        self.overrides(corvus6_windows=block)
        code, lines = self.run_build()
        self.assertRefused(code, lines, "download_url must be")

    def test_non_msi_windows_file_is_refused(self):
        name = "algorab-6.3.0-windows.exe"
        (self.root / "downloads" / "beta" / name).write_bytes(WIN_MSI)
        self.overrides(corvus6_windows=windows_block(name=name))
        code, lines = self.run_build()
        self.assertRefused(code, lines, "must end with .msi")

    def test_path_in_file_name_is_refused(self):
        block = windows_block()
        block["file_name"] = "../algorab-6.3.0-windows.msi"
        block["download_url"] = B.BETA_URL_PREFIX + block["file_name"]
        self.overrides(corvus6_windows=block)
        code, lines = self.run_build()
        self.assertRefused(code, lines, "bare file name")

    def test_extra_key_in_block_is_refused(self):
        block = agent_block()
        block["channel"] = "beta"
        self.overrides(agent=block)
        code, lines = self.run_build()
        self.assertRefused(code, lines, "unexpected")

    def test_notes_with_unknown_language_or_retired_word_are_refused(self):
        self.overrides(notes={"xx": "text"})
        self.assertRefused(*self.run_build(), "unknown language")
        self.overrides(notes={"en": "Corvus beta"})
        self.assertRefused(*self.run_build(), "retired brand word")

    def test_notes_are_not_in_the_manifest(self):
        self.overrides(notes={"en": "Beta notes"})
        code, lines = self.run_build()
        self.assertEqual(code, 0, lines)
        self.assertEqual(self.beta(), self.stable)


if __name__ == "__main__":
    unittest.main()
