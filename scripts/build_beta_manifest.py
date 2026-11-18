#!/usr/bin/env python3
"""Builds beta/glimpse_manifest.json: the manifest a PC that opted into the beta channel reads.

A beta PC reads https://algorab.uk/beta/glimpse_manifest.json instead of https://algorab.uk/glimpse_manifest.json.
The file is a FULL copy of the stable manifest (every block present, the same values, the same bytes when there is
no override) except for the blocks deliberately overridden here, and only these may be overridden:

  agent                      latest, download_url, file_name, file_size, sha256
  corvus6.native.windows     version, download_url, file_name, file_size, sha256

Everything else stays the stable value, always (launcher, the brand blocks, macOS and Linux for now).

The source of truth is beta/overrides.json, hand-edited and committed:

  { "agent": {...} | null, "corvus6_windows": {...} | null, "notes": { "<lang>": "..." } }

Rules (a mistake here loops or crashes the released app and agent, so they are strict):

  * A version is purely numeric and dotted, one to three parts (6.7, 6.7.0, 6.7.0.1 is refused), and STRICTLY NEWER
    than the stable value of the same field. Otherwise that override is IGNORED, the stable value is used, and this
    build says so. corvus6.latest is never overridden.
  * A file must be named as its block says (a Windows file ends in .msi; the agent keeps the stable .zip), its URL is
    https://algorab.uk/downloads/beta/<file_name>, the file exists at downloads/beta/ under the root, and its size and
    SHA-256 match. Any of these failing is an ERROR: nothing is written.
  * Any other key, block or language is an ERROR.
  * No valid override: the beta manifest equals the stable manifest byte for byte.

Usage:
  python3 scripts/build_beta_manifest.py                 # write beta/glimpse_manifest.json, print what was done
  python3 scripts/build_beta_manifest.py --check         # fail if the file on disk is stale or an override is invalid
  python3 scripts/build_beta_manifest.py --dir D --root R --stable F   # tests and fixtures only

build_glimpse_manifest.py calls write() after it writes the stable manifest, so a stable publish cannot leave a stale
beta manifest behind. The README's release steps say the same.
"""
from __future__ import annotations

import copy
import hashlib
import json
import re
import sys
from pathlib import Path

import version_label  # same folder; the one V7 rule (scripts/version_label.py)

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
DEFAULT_DIR = ROOT / "beta"
BETA_URL_PREFIX = "https://algorab.uk/downloads/beta/"
ALLOWED_TOP = ("agent", "corvus6_windows", "notes")
AGENT_KEYS = ("latest", "download_url", "file_name", "file_size", "sha256")
WINDOWS_KEYS = ("version", "download_url", "file_name", "file_size", "sha256")
LANGS = ("ja", "en", "es", "fr", "zh", "ko", "pt-br", "it", "ar", "ru", "id", "de", "tr")
# fullmatch, never match: with match, "$" also accepts a trailing newline, and "6.7.0\n" would reach the manifest (the
# released Agents 6.6.1 exits at start on a non-numeric agent.latest). No leading zeros either ("06.7" is refused), so a
# version has exactly one spelling.
VERSION_RE = re.compile(r"(?:0|[1-9][0-9]*)(?:\.(?:0|[1-9][0-9]*)){0,2}")
SHA_RE = re.compile(r"[0-9a-f]{64}")
# No word boundary: "CorvusStore" and "Miau's" are refused too.
FORBIDDEN_WORDS = re.compile(r"corvus|miau", re.IGNORECASE)


def dump(obj) -> str:
    """The stable manifest's own formatting (scripts/build_glimpse_manifest.py writes exactly this)."""
    return json.dumps(obj, indent=2, ensure_ascii=False) + "\n"


def version_problem(new, stable) -> str | None:
    """None when `new` is a usable beta version newer than `stable`; otherwise the reason it is ignored."""
    if not isinstance(new, str) or not VERSION_RE.fullmatch(new):
        return f"{new!r} is not a purely numeric version of one to three parts"
    if not isinstance(stable, str) or not VERSION_RE.fullmatch(stable):
        return f"the stable value {stable!r} is not a numeric version"
    def pad(v: str) -> tuple[int, ...]:
        parts = [int(p) for p in v.split(".")]
        return tuple(parts + [0] * (3 - len(parts)))
    if pad(new) <= pad(stable):
        return f"{new} is not newer than the stable {stable}"
    return None


def v7_problem(new) -> str | None:
    """From major 7 on the version must have a label (exactly X.Y.P, P from 1 to 199; scripts/version_label.py).
    A refusal here is an error, not an ignored override: a V7 number that cannot be labelled must never reach a user."""
    if not version_label.is_v7_or_later(new):
        return None
    if version_label.label(new) is None:
        return f"{new!r} has no label: from 7 on it must be exactly X.Y.P with P from 1 to 199"
    return None


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _shape(where: str, obj, keys: tuple[str, ...], errors: list[str]) -> bool:
    if not isinstance(obj, dict):
        errors.append(f"{where} must be an object with exactly the keys {', '.join(keys)}")
        return False
    missing = [k for k in keys if k not in obj]
    extra = [k for k in obj if k not in keys]
    if missing or extra:
        errors.append(f"{where}: missing {missing or 'nothing'}, unexpected {extra or 'nothing'} (exactly {', '.join(keys)})")
        return False
    return True


def _file(where: str, obj: dict, prefix_ext: str, root: Path, errors: list[str]) -> bool:
    """URL, name, size, hash of one beta file. Returns False (and records why) on any failure."""
    ok = True
    name = obj["file_name"]
    if not isinstance(name, str) or not name or "/" in name or "\\" in name or name in (".", ".."):
        errors.append(f"{where}: file_name {name!r} must be a bare file name")
        return False
    if not name.endswith(prefix_ext):
        errors.append(f"{where}: file_name {name!r} must end with {prefix_ext}")
        ok = False
    if obj["download_url"] != BETA_URL_PREFIX + name:
        errors.append(f"{where}: download_url must be {BETA_URL_PREFIX}{name} (https on algorab.uk under /downloads/beta/)")
        ok = False
    size, sha = obj["file_size"], obj["sha256"]
    if not isinstance(size, int) or isinstance(size, bool) or size <= 0:
        errors.append(f"{where}: file_size must be a positive integer")
        ok = False
    if not isinstance(sha, str) or not SHA_RE.fullmatch(sha):
        errors.append(f"{where}: sha256 must be 64 lowercase hex digits")
        ok = False
    if not ok:
        return False
    path = root / "downloads" / "beta" / name
    if not path.is_file():
        errors.append(f"{where}: {path} does not exist (a beta file must be in the repository at downloads/beta/)")
        return False
    actual_size = path.stat().st_size
    if actual_size != size:
        errors.append(f"{where}: file_size {size} is not the size of {name} ({actual_size})")
        return False
    if sha256_of(path) != sha:
        errors.append(f"{where}: sha256 is not the SHA-256 of {name}")
        return False
    return True


def resolve(stable: dict, overrides, root: Path = ROOT) -> tuple[dict, list[str], list[str]]:
    """(beta manifest, report lines, errors). The beta manifest is only meaningful when errors is empty."""
    beta = copy.deepcopy(stable)
    report: list[str] = []
    errors: list[str] = []
    if not isinstance(overrides, dict):
        return beta, report, ["beta/overrides.json must be a JSON object"]
    for key in overrides:
        if key not in ALLOWED_TOP:
            errors.append(f"override {key!r} is not allowed: only {', '.join(ALLOWED_TOP)} may be overridden")

    agent = overrides.get("agent")
    if agent is not None and _shape("agent", agent, AGENT_KEYS, errors):
        stable_agent = (stable.get("agent") or {})
        why = version_problem(agent["latest"], stable_agent.get("latest"))
        bad = v7_problem(agent["latest"])
        if bad:
            errors.append(f"agent: {bad}")
        elif why:
            report.append(f"agent: override {agent['latest']!r} ignored: {why}; the stable value is used")
        elif _file("agent", agent, ".zip", root, errors):
            for k in AGENT_KEYS:
                beta["agent"][k] = agent[k]
            report.append(f"agent: beta {agent['latest']} (stable {stable_agent.get('latest')})")

    win = overrides.get("corvus6_windows")
    if win is not None and _shape("corvus6_windows", win, WINDOWS_KEYS, errors):
        stable_win = ((stable.get("corvus6") or {}).get("native") or {}).get("windows") or {}
        why = version_problem(win["version"], stable_win.get("version"))
        bad = v7_problem(win["version"])
        if bad:
            errors.append(f"corvus6.native.windows: {bad}")
        elif why:
            report.append(f"corvus6.native.windows: override {win['version']!r} ignored: {why}; the stable value is used")
        elif _file("corvus6.native.windows", win, ".msi", root, errors):
            for k in WINDOWS_KEYS:
                beta["corvus6"]["native"]["windows"][k] = win[k]
            report.append(f"corvus6.native.windows: beta {win['version']} (stable {stable_win.get('version')})")

    # One number for the Windows app and Algorab Agents from 7 on (VERSION_DESIGN.md G7). Checked on the RESOLVED beta
    # manifest, so an override that was ignored (not newer) cannot leave the two numbers apart.
    agent_now = (beta.get("agent") or {}).get("latest")
    win_now = (((beta.get("corvus6") or {}).get("native") or {}).get("windows") or {}).get("version")
    if agent_now != win_now and (version_label.is_v7_or_later(agent_now) or version_label.is_v7_or_later(win_now)):
        errors.append(f"agent {agent_now} and the Windows app {win_now} must be the same number from 7 on "
                      f"(VERSION_DESIGN.md G7): override both in one commit")

    notes = overrides.get("notes", {})
    if not isinstance(notes, dict):
        errors.append("notes must be an object keyed by language")
    else:
        for lang, text in notes.items():
            if lang not in LANGS:
                errors.append(f"notes: unknown language {lang!r}")
            elif not isinstance(text, str) or not text.strip():
                errors.append(f"notes.{lang} must be a non-empty string")
            elif FORBIDDEN_WORDS.search(text):
                errors.append(f"notes.{lang} uses a retired brand word (Corvus or Miau)")

    if not report and not errors:
        report.append("no valid overrides: the beta manifest equals the stable manifest")
    return beta, report, errors


def load_overrides(directory: Path):
    path = directory / "overrides.json"
    if not path.is_file():
        raise SystemExit(f"ERROR: {path} is missing (it is committed; start from both overrides null)")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"ERROR: {path} is not valid JSON: {exc}")


def build(directory: Path, root: Path, stable_path: Path, write_file: bool) -> tuple[int, list[str]]:
    stable = json.loads(stable_path.read_text(encoding="utf-8"))
    beta, report, errors = resolve(stable, load_overrides(directory), root)
    out_path = directory / "glimpse_manifest.json"
    if errors:
        return 1, ["ERROR: " + e for e in errors] + report
    text = dump(beta)
    if write_file:
        directory.mkdir(parents=True, exist_ok=True)
        out_path.write_text(text, encoding="utf-8")
        return 0, report + [f"wrote {out_path} ({'mirror of stable' if text == dump(stable) else 'with overrides'})"]
    if not out_path.is_file() or out_path.read_text(encoding="utf-8") != text:
        return 1, report + [f"STALE: {out_path} does not match what beta/overrides.json and the stable manifest give; "
                            "run python3 scripts/build_beta_manifest.py"]
    return 0, report + [f"up to date: {out_path}"]


def write(root: Path = ROOT) -> None:
    """Called by build_glimpse_manifest.py after the stable manifest is written. Stops the release if it cannot."""
    code, lines = build(root / "beta", root, root / "glimpse_manifest.json", write_file=True)
    for line in lines:
        print(f"build_beta_manifest.py: {line}", file=sys.stderr if code else sys.stdout)
    if code:
        raise SystemExit("ERROR: the beta manifest could not be built; the stable publish is stopped so that no stale beta is left behind")


def main(argv: list[str]) -> int:
    args = list(argv)
    directory, root, stable = DEFAULT_DIR, ROOT, ROOT / "glimpse_manifest.json"
    check = False
    while args:
        a = args.pop(0)
        if a == "--check":
            check = True
        elif a in ("--dir", "--root", "--stable"):
            if not args:
                raise SystemExit(f"ERROR: {a} needs a path")
            value = Path(args.pop(0)).resolve()
            if a == "--dir":
                directory = value
            elif a == "--root":
                root = value
            else:
                stable = value
        else:
            raise SystemExit(f"ERROR: unknown argument {a!r}")
    code, lines = build(directory, root, stable, write_file=not check)
    for line in lines:
        print(f"build_beta_manifest.py: {line}", file=sys.stderr if code else sys.stdout)
    return code


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
