#!/usr/bin/env python3
"""The release-notes gate: no notes, no release.

2026-11-17 (owner): every release lists what changed under exactly three headings, New Features, Bug Fixes and
Refinements, in the Discord post and on the site. This gate makes the notes a condition of building the manifests,
the same way the launcher's notes are (build_glimpse_manifest.py: a launcher version with no notes stops the build).

WHAT IS REQUIRED
  * corvus6 (Algorab, the app): every version the stable manifest names (corvus6.native.<os>.version for each OS
    present) and every version the beta manifest names (the Windows beta override, through the same rule).
  * agent (Algorab Agents): the stable agent.latest and the beta agent.latest.
    Each of these needs a changelog entry whose English text has a title and at least one non-empty section among
    new_features, bug_fixes and refinements (data/changelog_brands.json plus data/i18n/en.json changelog_brands).
  * BASELINE: data/release_notes_baseline.json lists the blocks that have a feed brand (ouka, cherry, aureum,
    astraea, tsubomi, halia) and the two Algorab blocks that have no feed yet (algorab_audio, algorab_io), with the
    version each one is live at today. A block whose version is still the baseline needs nothing. A block whose
    version has moved needs the same notes as above, from that version on; a block with no brand and no feed fails
    with a message that a brand and a feed must be created first.

The functions are pure (they take dicts), so the unit tests run on fixtures: scripts/tests/test_release_notes_gate.py.
Run the repository check with `python3 scripts/release_notes_gate.py`.
"""
import copy
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "glimpse_manifest.json"
BETA_MANIFEST = ROOT / "beta" / "glimpse_manifest.json"
BETA_OVERRIDES = ROOT / "beta" / "overrides.json"
CHANGELOG_BRANDS = ROOT / "data" / "changelog_brands.json"
EN_BUNDLE = ROOT / "data" / "i18n" / "en.json"
BASELINE = ROOT / "data" / "release_notes_baseline.json"

GATED_BRANDS = ("corvus6", "agent")
NOTE_KEYS = ("new_features", "bug_fixes", "refinements")


def norm_version(v):
    """One spelling for a version: 'V1.8 6166' (the mod's own style) and '1.8.6166' are the same version,
    and so are 'V1.0.0' and '1.0.0'. Used on both sides of every comparison in this gate."""
    s = re.sub(r"\s+", " ", str(v or "").strip())
    s = re.sub(r"^[Vv]", "", s)
    return s.replace(" ", ".").replace("_", ".")


def english_ok(entry):
    """True when the English text has a title and at least one non-empty section of the three."""
    if not entry:
        return False
    if not str(entry.get("title") or "").strip():
        return False
    return any(str(x).strip() for k in NOTE_KEYS for x in (entry.get(k) or []))


def load_entries(changelog_brands, en_bundle):
    """{brand: [{"release", "channel", "english_ok"}]} from the structural file and the English prose."""
    en = en_bundle.get("changelog_brands") or {}
    out = {}
    for brand, rows in changelog_brands["brands"].items():
        by_id = {e.get("id"): e for e in (en.get(brand) or [])}
        out[brand] = [{
            "release": norm_version(r.get("release")),
            "channel": r.get("channel", "stable"),
            "english_ok": english_ok(by_id.get(r.get("id"))),
        } for r in rows]
    return out


def gated_versions(manifest, brand):
    """The versions a gated brand's block names in this manifest."""
    block = manifest.get(brand) or {}
    out = []
    if brand == "corvus6":
        for _os, row in sorted((block.get("native") or {}).items()):
            if isinstance(row, dict) and row.get("version"):
                out.append(norm_version(row["version"]))
    elif block.get("latest"):
        out.append(norm_version(block["latest"]))
    return out


def apply_beta_overrides(stable, overrides):
    """The beta manifest's two overridable values applied to a copy of the stable manifest (the beta copy is
    otherwise byte-identical to stable; see scripts/build_beta_manifest.py)."""
    view = copy.deepcopy(stable)
    agent = overrides.get("agent") or {}
    if agent.get("latest") and "agent" in view:
        view["agent"]["latest"] = agent["latest"]
    win = overrides.get("corvus6_windows") or {}
    if win.get("version") and "corvus6" in view:
        view["corvus6"].setdefault("native", {}).setdefault("windows", {})["version"] = win["version"]
    return view


def _need(brand, version, entries, label):
    rows = [r for r in entries.get(brand, []) if r["release"] == version]
    if not rows:
        return [f"{label}: {brand} {version} has no changelog entry (data/changelog_brands.json, "
                f"data/i18n/en.json changelog_brands.{brand}); write its notes before it is released"]
    if not any(r["english_ok"] for r in rows):
        return [f"{label}: {brand} {version} has no English text, or none of New Features, Bug Fixes and "
                f"Refinements has an item"]
    return []


def check_manifest(manifest, entries, label, baseline=None):
    """Errors for one manifest view ('stable' or 'beta'). baseline is {block: version} or None."""
    errors = []
    for brand in GATED_BRANDS:
        for version in gated_versions(manifest, brand):
            errors += _need(brand, version, entries, label)
    for block, base in sorted((baseline or {}).items()):
        row = manifest.get(block) or {}
        if not row.get("latest"):
            errors.append(f"{label}: baseline block {block} is missing from the manifest")
            continue
        now, was = norm_version(row["latest"]), norm_version(base)
        if now == was:
            continue
        if block not in entries:
            errors.append(f"{label}: {block} moved from {was} to {now}, but {block} has no changelog brand or "
                          f"feed: create its brand (data/changelog_brands.json, data/i18n/*.json changelog_brands, "
                          f"changelog_feed/{block}/) and its notes before it is released")
            continue
        errors += _need(block, now, entries, f"{label} ({block} moved from {was})")
    return errors


def check_repo(root=ROOT):
    """The repository's own check (used by check_changelog_brands.py and by this file's CLI)."""
    stable = json.loads((root / "glimpse_manifest.json").read_text(encoding="utf-8"))
    beta = json.loads((root / "beta" / "glimpse_manifest.json").read_text(encoding="utf-8"))
    brands = json.loads((root / "data" / "changelog_brands.json").read_text(encoding="utf-8"))
    en = json.loads((root / "data" / "i18n" / "en.json").read_text(encoding="utf-8"))
    baseline = json.loads((root / "data" / "release_notes_baseline.json").read_text(encoding="utf-8"))["blocks"]
    entries = load_entries(brands, en)
    return check_manifest(stable, entries, "stable", baseline) + check_manifest(beta, entries, "beta")


def check_build(manifest, root=ROOT):
    """Used by scripts/build_glimpse_manifest.py before it writes the stable manifest: the stable view and the
    beta view that the overrides will produce."""
    brands = json.loads((root / "data" / "changelog_brands.json").read_text(encoding="utf-8"))
    en = json.loads((root / "data" / "i18n" / "en.json").read_text(encoding="utf-8"))
    baseline = json.loads((root / "data" / "release_notes_baseline.json").read_text(encoding="utf-8"))["blocks"]
    overrides = json.loads((root / "beta" / "overrides.json").read_text(encoding="utf-8"))
    entries = load_entries(brands, en)
    return (check_manifest(manifest, entries, "stable", baseline)
            + check_manifest(apply_beta_overrides(manifest, overrides), entries, "beta"))


def main(argv):
    errors = check_repo()
    for e in errors:
        print("FAIL " + e)
    print("release notes gate: " + ("GREEN" if not errors else f"RED ({len(errors)})"))
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
