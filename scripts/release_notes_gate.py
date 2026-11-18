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

FROM VERSION 7 ON (VERSION_DESIGN.md G7, owner 2026-11-18: one entry and one bot post per release)
  * The Windows app and Algorab Agents carry ONE number from 7 on (scripts/version_label.py): agent.latest and
    corvus6.native.windows.version must be equal whenever either of them is 7 or more (combined_errors).
  * ONE changelog entry covers both. It lives under corvus6 (Algorab) with the mandatory numeric "version" (for
    example "7.0.1"), "release" equal to the label of that number ("V7.0 Beta 1") and "covers": ["agent"].
    Example: {"id": "corvus6-v7.0.1", "release": "V7.0 Beta 1", "version": "7.0.1", "covers": ["agent"],
              "date": "...", "type": "release", "channel": "beta"}
    An agent entry from 7 on is refused: the notes are never written twice.
  * A V7-or-later block is matched by the entry's "version" only (never by the text of "release"; "V7.0.1" is a hotfix
    label, not the number 7.0.1). Agent matches only an entry that covers agent.
  * Every entry from 7 on must have a title and at least one item in one of the three sections in ALL 13 languages
    (data/i18n/<lang>.json, changelog_brands), not only in English.
  * The Beta mark is true (channel_errors): Beta N (P 1 to 99) is "channel": "beta" and never on the stable manifest;
    V7.0 and its hotfixes are "beta" until the stable manifest names them, then not. One entry per number.
  * Below major 7 nothing changes: entries match by "release" text as before.

The functions are pure (they take dicts), so the unit tests run on fixtures: scripts/tests/test_release_notes_gate.py.
Run the repository check with `python3 scripts/release_notes_gate.py`.
"""
import copy
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import version_label  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "glimpse_manifest.json"
BETA_MANIFEST = ROOT / "beta" / "glimpse_manifest.json"
BETA_OVERRIDES = ROOT / "beta" / "overrides.json"
CHANGELOG_BRANDS = ROOT / "data" / "changelog_brands.json"
EN_BUNDLE = ROOT / "data" / "i18n" / "en.json"
BASELINE = ROOT / "data" / "release_notes_baseline.json"

GATED_BRANDS = ("corvus6", "agent")
NOTE_KEYS = ("new_features", "bug_fixes", "refinements")
# The 13 languages of the site and the app (build_beta_manifest.LANGS); every entry from 7 on needs notes in each.
LANGUAGES = ("ja", "en", "es", "fr", "zh", "ko", "pt-br", "it", "ar", "ru", "id", "de", "tr")


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
    """{brand: [{"release", "channel", "english_ok"}]} from the structural file and the English prose.
    An entry that carries a numeric "version" (from 7 on) also gets "number" and, when it has one, "covers"."""
    en = en_bundle.get("changelog_brands") or {}
    out = {}
    for brand, rows in changelog_brands["brands"].items():
        by_id = {e.get("id"): e for e in (en.get(brand) or [])}
        out[brand] = []
        for r in rows:
            row = {
                "release": norm_version(r.get("release")),
                "channel": r.get("channel", "stable"),
                "english_ok": english_ok(by_id.get(r.get("id"))),
            }
            if r.get("version"):
                row["number"] = norm_version(r["version"])
            if r.get("covers"):
                row["covers"] = list(r["covers"])
            out[brand].append(row)
    return out


def structure_errors(changelog_brands, en_bundle, bundles):
    """Errors in the shape of the entries of the gated brands from 7 on (see the header), and the missing languages.
    bundles is {lang: data/i18n bundle} for the 13 languages; the English bundle is en_bundle."""
    errors = []
    numbers_seen = {}
    for brand in GATED_BRANDS:
        for r in changelog_brands["brands"].get(brand, []):
            rid = r.get("id", "?")
            rel = str(r.get("release") or "")
            if r.get("version") is None:
                if version_label.is_v7_or_later(rel):
                    errors.append(f"{brand} {rid}: from 7 on the entry needs a numeric \"version\" "
                                  f"(for example \"7.0.1\"); \"release\" alone is not enough")
                if r.get("covers") is not None:
                    errors.append(f"{brand} {rid}: \"covers\" is only allowed on a numeric V7-or-later entry")
                continue
            number = str(r["version"])
            lab = version_label.label(number)
            if lab is None:
                errors.append(f"{brand} {rid}: version {number!r} is not a valid number (its label is null)")
                continue
            if rel != lab:
                errors.append(f"{brand} {rid}: release {rel!r} must be the label {lab!r} of version {number!r}")
            if not version_label.is_v7_or_later(number):
                if r.get("covers") is not None:
                    errors.append(f"{brand} {rid}: \"covers\" is only allowed from 7 on")
                continue
            if brand == "agent":
                errors.append(f"agent {rid}: from 7 on the notes are one entry under corvus6 with "
                              f"\"covers\": [\"agent\"]; remove this agent entry")
                continue
            seen = numbers_seen.setdefault(number, rid)
            if seen != rid:
                errors.append(f"corvus6 {rid}: version {number!r} already has the entry {seen}; one release, one entry")
            patch = int(number.split(".")[2])
            if patch <= 99 and r.get("channel") != "beta":
                errors.append(f"corvus6 {rid}: {lab} is a beta: it needs \"channel\": \"beta\" (the Beta mark on the "
                              f"changelog and in the feed)")
            if r.get("covers") != ["agent"]:
                errors.append(f"corvus6 {rid}: from 7 on it must declare \"covers\": [\"agent\"] "
                              f"(one entry for Algorab and Algorab Agents)")
            for lang in LANGUAGES:
                own = bundles.get(lang) if lang != "en" else en_bundle
                prose = next((t for t in ((own or {}).get("changelog_brands", {}).get(brand) or [])
                              if t.get("id") == r.get("id")), None)
                if not english_ok(prose):
                    errors.append(f"corvus6 {rid}: no notes in {lang} (title and at least one of New Features, "
                                  f"Bug Fixes, Refinements in data/i18n/{lang}.json)")
    return errors


def channel_errors(changelog_brands, stable):
    """From 7 on, the Beta mark tells the truth about the stable manifest (VERSION_DESIGN.md section 4, step 7):
    a release on the stable manifest is not marked beta, a V7 release not on it is, and a beta number (P 1 to 99) is
    never on the stable manifest. The same entry serves the beta manifest first and stable after promotion: the
    promotion commit drops its "channel"."""
    errors = []
    on_stable = {norm_version(v) for b in GATED_BRANDS for v in gated_versions(stable, b)}
    for v in sorted(on_stable):
        lab = version_label.label(v)
        if version_label.is_v7_or_later(v) and lab is not None and int(v.split(".")[2]) <= 99:
            errors.append(f"stable: {v} is {lab}: a beta number never goes on the stable manifest")
    for r in changelog_brands["brands"].get("corvus6", []):
        number = norm_version(r.get("version") or "")
        if not version_label.is_v7_or_later(number) or version_label.label(number) is None:
            continue
        if int(number.split(".")[2]) <= 99:
            continue  # structure_errors requires its beta mark
        beta = r.get("channel") == "beta"
        if number in on_stable and beta:
            errors.append(f"corvus6 {r.get('id')}: {number} is on the stable manifest but still marked "
                          f"\"channel\": \"beta\"; drop it in the promotion commit")
        if number not in on_stable and not beta:
            errors.append(f"corvus6 {r.get('id')}: {number} is not on the stable manifest yet: mark it "
                          f"\"channel\": \"beta\" until it is promoted")
    return errors


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


def _matches(brand, version, entries):
    """The entries that answer for one brand's version. From 7 on: by number, and agent only through an entry
    that covers agent (the one combined entry under corvus6). Below 7: by the release text, as before."""
    if version_label.is_v7_or_later(version):
        pool = entries.get("corvus6", []) if brand == "agent" else entries.get(brand, [])
        return [r for r in pool if r.get("number") == version
                and (brand != "agent" or "agent" in r.get("covers", []))]
    return [r for r in entries.get(brand, []) if r["release"] == version]


def _need(brand, version, entries, label):
    if version_label.is_v7_or_later(version) and version_label.label(version) is None:
        return [f"{label}: {brand} {version!r} is not a valid V7 number (its label is null); "
                f"from 7 on it must be exactly X.Y.P with P from 1 to 199"]
    rows = _matches(brand, version, entries)
    if not rows:
        home = "the corvus6 entry that covers agent" if (brand == "agent" and version_label.is_v7_or_later(version)) \
            else f"data/changelog_brands.json, data/i18n/en.json changelog_brands.{brand}"
        return [f"{label}: {brand} {version} has no changelog entry ({home}); write its notes before it is released"]
    if not any(r["english_ok"] for r in rows):
        return [f"{label}: {brand} {version} has no English text, or none of New Features, Bug Fixes and "
                f"Refinements has an item"]
    return []


def combined_errors(manifest, label):
    """From 7 on the Algorab Agents number and the Windows app number are the same (VERSION_DESIGN.md G7). macOS and
    Linux are not compared: they stay on 6.x until their own V7 builds exist."""
    agent = norm_version((manifest.get("agent") or {}).get("latest") or "")
    win = norm_version((((manifest.get("corvus6") or {}).get("native") or {}).get("windows") or {}).get("version") or "")
    if (version_label.is_v7_or_later(agent) or version_label.is_v7_or_later(win)) and agent != win:
        return [f"{label}: Algorab Agents {agent or '-'} and the Windows app {win or '-'} must be the same number "
                f"from 7 on (VERSION_DESIGN.md G7)"]
    return []


def check_manifest(manifest, entries, label, baseline=None):
    """Errors for one manifest view ('stable' or 'beta'). baseline is {block: version} or None."""
    errors = combined_errors(manifest, label)
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


def load_bundles(root=ROOT):
    """{lang: data/i18n/<lang>.json} for the 13 languages; a missing file is an error in structure_errors."""
    out = {}
    for lang in LANGUAGES:
        path = root / "data" / "i18n" / f"{lang}.json"
        out[lang] = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    return out


def check_repo(root=ROOT):
    """The repository's own check (used by check_changelog_brands.py and by this file's CLI)."""
    stable = json.loads((root / "glimpse_manifest.json").read_text(encoding="utf-8"))
    beta = json.loads((root / "beta" / "glimpse_manifest.json").read_text(encoding="utf-8"))
    brands = json.loads((root / "data" / "changelog_brands.json").read_text(encoding="utf-8"))
    en = json.loads((root / "data" / "i18n" / "en.json").read_text(encoding="utf-8"))
    baseline = json.loads((root / "data" / "release_notes_baseline.json").read_text(encoding="utf-8"))["blocks"]
    entries = load_entries(brands, en)
    return (structure_errors(brands, en, load_bundles(root)) + channel_errors(brands, stable)
            + check_manifest(stable, entries, "stable", baseline) + check_manifest(beta, entries, "beta"))


def check_build(manifest, root=ROOT):
    """Used by scripts/build_glimpse_manifest.py before it writes the stable manifest: the stable view and the
    beta view that the overrides will produce."""
    brands = json.loads((root / "data" / "changelog_brands.json").read_text(encoding="utf-8"))
    en = json.loads((root / "data" / "i18n" / "en.json").read_text(encoding="utf-8"))
    baseline = json.loads((root / "data" / "release_notes_baseline.json").read_text(encoding="utf-8"))["blocks"]
    overrides = json.loads((root / "beta" / "overrides.json").read_text(encoding="utf-8"))
    entries = load_entries(brands, en)
    return (structure_errors(brands, en, load_bundles(root)) + channel_errors(brands, manifest)
            + check_manifest(manifest, entries, "stable", baseline)
            + check_manifest(apply_beta_overrides(manifest, overrides), entries, "beta"))


def main(argv):
    errors = check_repo()
    for e in errors:
        print("FAIL " + e)
    print("release notes gate: " + ("GREEN" if not errors else f"RED ({len(errors)})"))
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
