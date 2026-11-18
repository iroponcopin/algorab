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


LEGACY = [{"release": "6.2.1", "channel": "stable", "english_ok": True},
          {"release": "6.2.2", "channel": "stable", "english_ok": True}]


def v7_row(release, number, covers=("agent",), english=True, channel="beta"):
    """One loaded entry from 7 on, as load_entries() returns it."""
    return {"release": G.norm_version(release), "channel": channel, "english_ok": english,
            "number": number, "covers": list(covers)}


def v7_manifest(agent="7.0.1", windows="7.0.1"):
    return manifest(corvus=("6.2.1", "6.2.2", windows), agent=agent)


def v7_structure(entries_brands, bundle_ok=True, langs=None):
    """structure_errors() input: entries_brands is {brand: [raw entry]}; every language gets the same notes unless
    langs is given (then only those languages have a title and items for the entry ids)."""
    ids = [e.get("id") for rows in entries_brands.values() for e in rows]
    def notes(ids_):
        return {"changelog_brands": {"corvus6": [{"id": i, "title": "T", "new_features": ["x"]} for i in ids_
                                                  if i.startswith("corvus6")]}}
    bundles = {lang: notes(ids) if (langs is None or lang in langs) else {"changelog_brands": {}}
               for lang in G.LANGUAGES}
    if not bundle_ok:
        bundles = {lang: {} for lang in G.LANGUAGES}
    en = bundles["en"]
    return G.structure_errors({"brands": entries_brands}, en, bundles)


GOOD_ENTRY = {"id": "corvus6-v7.0.1", "release": "V7.0 Beta 1", "version": "7.0.1", "covers": ["agent"],
              "date": "2026-11-20", "type": "release", "channel": "beta"}


class V7Gate(unittest.TestCase):
    def test_one_combined_entry_satisfies_app_and_agent(self):
        e = {"corvus6": LEGACY + [v7_row("V7.0 Beta 1", "7.0.1")], "agent": []}
        self.assertEqual(G.check_manifest(v7_manifest(), e, "beta"), [])

    def test_agent_without_a_covering_entry_fails(self):
        e = {"corvus6": LEGACY + [v7_row("V7.0 Beta 1", "7.0.1", covers=())], "agent": []}
        errs = G.check_manifest(v7_manifest(), e, "beta")
        self.assertTrue(any("agent 7.0.1 has no changelog entry" in x for x in errs), errs)

    def test_hotfix_label_does_not_satisfy_beta_one(self):
        # "V7.0.1" is the first hotfix (number 7.0.101). Its text normalises to 7.0.1, the number of Beta 1: it must not match.
        e = {"corvus6": LEGACY + [v7_row("V7.0.1", "7.0.101")], "agent": []}
        errs = G.check_manifest(v7_manifest(), e, "beta")
        self.assertTrue(any("corvus6 7.0.1 has no changelog entry" in x for x in errs), errs)
        self.assertTrue(any("agent 7.0.1 has no changelog entry" in x for x in errs), errs)

    def test_stable_release_matches_by_number(self):
        e = {"corvus6": LEGACY + [v7_row("V7.0", "7.0.100", channel="stable")], "agent": []}
        self.assertEqual(G.check_manifest(v7_manifest("7.0.100", "7.0.100"), e, "stable"), [])

    def test_agent_and_windows_numbers_must_match(self):
        e = {"corvus6": LEGACY + [v7_row("V7.0 Beta 1", "7.0.1"), v7_row("V7.0 Beta 2", "7.0.2")], "agent": []}
        errs = G.check_manifest(v7_manifest(agent="7.0.1", windows="7.0.2"), e, "beta")
        self.assertTrue(any("must be the same number from 7 on" in x for x in errs), errs)

    def test_an_app_and_agent_below_seven_are_not_compared(self):
        self.assertEqual(G.combined_errors(manifest(corvus=("6.2.1", "6.2.2", "6.3.0"), agent="6.7.0"), "beta"), [])

    def test_invalid_number_has_null_label_and_fails(self):
        errs = G.check_manifest(v7_manifest(agent="7.0.0", windows="7.0.0"), {"corvus6": LEGACY, "agent": []}, "beta")
        self.assertTrue(any("is not a valid V7 number (its label is null)" in x for x in errs), errs)

    def test_four_part_agent_from_seven_fails(self):
        errs = G.check_manifest(v7_manifest(agent="7.0.1.5", windows="7.0.1"), {"corvus6": LEGACY, "agent": []}, "beta")
        self.assertTrue(any("is not a valid V7 number" in x for x in errs), errs)

    def test_good_entry_has_no_structure_errors(self):
        self.assertEqual(v7_structure({"corvus6": [GOOD_ENTRY]}), [])

    def test_release_must_be_the_label_of_its_number(self):
        bad = dict(GOOD_ENTRY, release="V7.0")
        errs = v7_structure({"corvus6": [bad]})
        self.assertTrue(any("must be the label 'V7.0 Beta 1'" in x for x in errs), errs)

    def test_from_seven_an_entry_needs_a_numeric_version(self):
        bad = {"id": "corvus6-v7.0", "release": "V7.0", "date": "2026-11-20", "type": "release"}
        errs = v7_structure({"corvus6": [bad]})
        self.assertTrue(any("needs a numeric" in x for x in errs), errs)

    def test_an_agent_entry_from_seven_is_refused(self):
        bad = {"id": "agent-v7.0.1", "release": "V7.0 Beta 1", "version": "7.0.1", "date": "2026-11-20", "type": "release"}
        errs = v7_structure({"agent": [bad]})
        self.assertTrue(any("remove this agent entry" in x for x in errs), errs)

    def test_combined_entry_must_declare_covers_agent(self):
        bad = {k: v for k, v in GOOD_ENTRY.items() if k != "covers"}
        errs = v7_structure({"corvus6": [bad]})
        self.assertTrue(any('must declare "covers"' in x for x in errs), errs)

    def test_each_of_the_thirteen_languages_is_required(self):
        langs = [x for x in G.LANGUAGES if x != "de"]
        errs = v7_structure({"corvus6": [GOOD_ENTRY]}, langs=langs)
        self.assertEqual(len(errs), 1, errs)
        self.assertIn("no notes in de", errs[0])

    def test_thirteen_languages_are_the_site_list(self):
        self.assertEqual(len(G.LANGUAGES), 13)
        self.assertEqual(len(set(G.LANGUAGES)), 13)

    def test_below_seven_nothing_is_asked_of_the_entry_shape(self):
        old = {"id": "corvus6-v6.7.0", "release": "6.7.0", "date": "2026-11-16", "type": "release"}
        self.assertEqual(v7_structure({"corvus6": [old]}, bundle_ok=False), [])

    def test_load_entries_keeps_number_and_covers_only_when_present(self):
        cb = {"brands": {"corvus6": [GOOD_ENTRY], "agent": [{"id": "agent-v6.6.1", "release": "6.6.1"}]}}
        en = {"changelog_brands": {"corvus6": [{"id": "corvus6-v7.0.1", "title": "T", "bug_fixes": ["x"]}],
                                   "agent": [{"id": "agent-v6.6.1", "title": "T", "bug_fixes": ["x"]}]}}
        out = G.load_entries(cb, en)
        self.assertEqual(out["corvus6"], [{"release": "7.0.Beta.1", "channel": "beta", "english_ok": True,
                                           "number": "7.0.1", "covers": ["agent"]}])
        self.assertEqual(out["agent"], [{"release": "6.6.1", "channel": "stable", "english_ok": True}])


class RepositoryIsGreen(unittest.TestCase):
    def test_committed_files_pass_the_gate(self):
        self.assertEqual(G.check_repo(), [])


if __name__ == "__main__":
    unittest.main()
