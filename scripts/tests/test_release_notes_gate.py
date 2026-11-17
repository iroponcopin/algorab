"""Unit tests for scripts/release_notes_gate.py. Run: python3 -m unittest scripts/tests/test_release_notes_gate.py
(or from scripts/tests: python3 -m unittest test_release_notes_gate). Everything here is an in-memory fixture except
the last class, which runs the gate on the repository's own committed files and must stay green."""
import sys
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SCRIPTS))
import release_notes_gate as G  # noqa: E402

GOOD = {"title": "Title", "new_features": ["A new thing."]}


def manifest(corvus=("6.2.1", "6.2.2", "6.2.3"), agent="6.6.1", baseline_ouka="1.8.6166"):
    native = {os_: {"version": v} for os_, v in zip(("linux", "macos", "windows"), corvus)}
    return {
        "corvus6": {"latest": corvus[-1], "native": native},
        "agent": {"latest": agent},
        "ouka": {"latest": baseline_ouka},
        "algorab_audio": {"latest": "1.0.0"},
    }


def entries(**by_brand):
    """entries(corvus6=[("6.2.1", True)], ...) -> the shape load_entries() returns."""
    return {b: [{"release": r, "channel": "stable", "english_ok": ok} for r, ok in rows]
            for b, rows in by_brand.items()}


FULL = entries(
    corvus6=[("6.2.1", True), ("6.2.2", True), ("6.2.3", True), ("6.3.0", True)],
    agent=[("6.6.1", True), ("6.7.0", True)],
    ouka=[("1.8.6166", True)],
)
BASE = {"ouka": "1.8.6166", "algorab_audio": "1.0.0"}


def merged(base, **by_brand):
    out = dict(base)
    out.update(entries(**by_brand))
    return out


class Normalise(unittest.TestCase):
    def test_mod_style_and_dotted_are_the_same_version(self):
        self.assertEqual(G.norm_version("V1.8 6166"), "1.8.6166")
        self.assertEqual(G.norm_version("1.8.6166"), "1.8.6166")
        self.assertEqual(G.norm_version("V1.0.0"), "1.0.0")
        self.assertEqual(G.norm_version("6.2.1"), "6.2.1")

    def test_english_needs_title_and_one_section(self):
        self.assertTrue(G.english_ok(GOOD))
        self.assertFalse(G.english_ok({"title": "T", "new_features": [], "bug_fixes": [], "refinements": []}))
        self.assertFalse(G.english_ok({"new_features": ["x"]}))
        self.assertFalse(G.english_ok(None))


class Gate(unittest.TestCase):
    def test_clean_fixture_passes(self):
        self.assertEqual(G.check_manifest(manifest(), FULL, "stable", BASE), [])

    def test_missing_entry_fails_and_names_block_and_version(self):
        e = merged(FULL, corvus6=[("6.2.1", True), ("6.2.2", True), ("6.3.0", True)])
        errs = G.check_manifest(manifest(), e, "stable", BASE)
        self.assertTrue(any("corvus6 6.2.3" in x and "no changelog entry" in x for x in errs), errs)

    def test_entry_without_english_fails(self):
        e = merged(FULL, agent=[("6.6.1", False), ("6.7.0", True)])
        errs = G.check_manifest(manifest(), e, "stable", BASE)
        self.assertTrue(any("agent 6.6.1 has no English text" in x for x in errs), errs)

    def test_entry_with_three_empty_arrays_fails(self):
        empty = {"title": "T", "new_features": [], "bug_fixes": [], "refinements": []}
        self.assertFalse(G.english_ok(empty))
        e = G.load_entries({"brands": {"agent": [{"id": "agent-v6.6.1", "release": "6.6.1"}]}},
                           {"changelog_brands": {"agent": [dict(empty, id="agent-v6.6.1")]}})
        errs = G.check_manifest(manifest(), dict(FULL, **e), "stable", BASE)
        self.assertTrue(any("agent 6.6.1 has no English text" in x for x in errs), errs)

    def test_beta_version_missing_fails(self):
        beta = manifest(agent="6.7.0", corvus=("6.2.1", "6.2.2", "6.3.0"))
        e = merged(FULL, agent=[("6.6.1", True)])
        errs = G.check_manifest(beta, e, "beta")
        self.assertTrue(any(x.startswith("beta: agent 6.7.0 has no changelog entry") for x in errs), errs)

    def test_baseline_unchanged_passes_without_notes(self):
        e = merged(FULL, ouka=[])
        self.assertEqual(G.check_manifest(manifest(baseline_ouka="1.8.6166"), e, "stable", BASE), [])

    def test_baseline_changed_without_notes_fails(self):
        e = merged(FULL, ouka=[("1.8.6166", True)])
        errs = G.check_manifest(manifest(baseline_ouka="1.9.0001"), e, "stable", BASE)
        self.assertTrue(any("ouka 1.9.0001 has no changelog entry" in x for x in errs), errs)

    def test_baseline_changed_with_notes_passes(self):
        e = merged(FULL, ouka=[("1.8.6166", True), ("1.9.0001", True)])
        self.assertEqual(G.check_manifest(manifest(baseline_ouka="1.9.0001"), e, "stable", BASE), [])

    def test_block_without_brand_that_changes_version_fails_with_clear_message(self):
        m = manifest()
        m["algorab_audio"]["latest"] = "1.0.1"
        errs = G.check_manifest(m, FULL, "stable", BASE)
        self.assertTrue(any("algorab_audio moved from 1.0.0 to 1.0.1" in x and "create its brand" in x for x in errs),
                        errs)

    def test_overrides_are_applied_to_a_copy(self):
        stable = manifest()
        view = G.apply_beta_overrides(stable, {"agent": {"latest": "6.7.0"},
                                               "corvus6_windows": {"version": "6.3.0"}})
        self.assertEqual(view["agent"]["latest"], "6.7.0")
        self.assertEqual(view["corvus6"]["native"]["windows"]["version"], "6.3.0")
        self.assertEqual(stable["agent"]["latest"], "6.6.1")

    def test_load_entries_reads_english_from_the_bundle(self):
        cb = {"brands": {"agent": [{"id": "agent-v6.6.1", "release": "6.6.1"}]}}
        en = {"changelog_brands": {"agent": [{"id": "agent-v6.6.1", "title": "T", "bug_fixes": ["x"]}]}}
        out = G.load_entries(cb, en)
        self.assertEqual(out["agent"], [{"release": "6.6.1", "channel": "stable", "english_ok": True}])


class RepositoryIsGreen(unittest.TestCase):
    def test_committed_files_pass_the_gate(self):
        self.assertEqual(G.check_repo(), [])


if __name__ == "__main__":
    unittest.main()
