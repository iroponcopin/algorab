#!/usr/bin/env python3
"""The one version rule for Algorab (VERSION_DESIGN.md section 1, Algorab Agents and the app share it).

INPUT is the version text as the manifests and the changelog store it: exactly three plain numbers "X.Y.P"
(no leading zeros, no spaces, no suffix). Anything else has no label.

LABEL RULE
  1. Not exactly three plain numbers -> None (the caller refuses it).
  2. Major below 7 -> the number unchanged ("6.7.0" stays "6.7.0"). Old versions look exactly as today.
  3. Major 7 or more, third number P:
       P = 0 or P >= 200      -> None (never published)
       1 <= P <= 99           -> "VX.Y Beta P"
       P = 100                -> "VX.Y"
       101 <= P <= 199        -> "VX.Y.(P-100)"

ORDER KEY: order_key(text) is the tuple of integers of the number a label or a number stands for. It orders
changelog releases on one date ("V7.0" = 7.0.100 comes after "V7.0 Beta 9" = 7.0.9).

The vectors in version-labels.v1.json are shared with the other repositories, which pin its SHA-256 (the test
scripts/tests/test_version_label.py). Change nothing in that file in one repository alone.
"""
import json
import re
from pathlib import Path

VECTORS = Path(__file__).resolve().parent / "version-labels.v1.json"

# Three groups, each "0" or a number without leading zeros. [0-9] and fullmatch: \d would accept other digits and a
# trailing newline would slip through "$".
_CANON = re.compile(r"(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)")
_MAJOR = re.compile(r"\s*[Vv]?([0-9]+)")
_BETA = re.compile(r"V([1-9][0-9]*)\.(0|[1-9][0-9]*) Beta ([1-9][0-9]?)")
_RELEASE = re.compile(r"V([1-9][0-9]*)\.(0|[1-9][0-9]*)")
_HOTFIX = re.compile(r"V([1-9][0-9]*)\.(0|[1-9][0-9]*)\.([1-9][0-9]?)")


def parse(text):
    """(major, minor, patch) as strings when text is exactly three plain numbers, else None."""
    if not isinstance(text, str):
        return None
    m = _CANON.fullmatch(text)
    return m.groups() if m else None


def is_v7_or_later(text):
    """True when the first number of the text is 7 or more. Decided from the first digit run, not from a successful
    parse, so that "7.0" and "7.0.1.0" are still held to the V7 rules."""
    if not isinstance(text, str):
        return False
    m = _MAJOR.match(text)
    return bool(m) and int(m.group(1)) >= 7


def label(text):
    """The label people see for a version text, or None when the text has no label (see the rule above)."""
    parts = parse(text)
    if parts is None:
        return None
    major, minor, patch = parts
    if int(major) < 7:
        return text
    p = int(patch)
    if p == 0 or p >= 200:
        return None
    if p <= 99:
        return f"V{major}.{minor} Beta {patch}"
    if p == 100:
        return f"V{major}.{minor}"
    return f"V{major}.{minor}.{p - 100}"


def number_of_label(text):
    """The version number a label stands for, or None. Only labels that label() itself produces round-trip."""
    if not isinstance(text, str):
        return None
    if parse(text) is not None:
        return text
    candidate = None
    m = _BETA.fullmatch(text)
    if m:
        candidate = f"{m.group(1)}.{m.group(2)}.{m.group(3)}"
    else:
        m = _RELEASE.fullmatch(text)
        if m:
            candidate = f"{m.group(1)}.{m.group(2)}.100"
        else:
            m = _HOTFIX.fullmatch(text)
            if m:
                candidate = f"{m.group(1)}.{m.group(2)}.{100 + int(m.group(3))}"
    if candidate is None or label(candidate) != text:
        return None
    return candidate


def order_key(text):
    """Integer tuple that orders versions; None when the text is neither a number nor a label."""
    number = number_of_label(text)
    if number is None:
        return None
    return tuple(int(x) for x in number.split("."))


def zip_version_problem(version):
    """Why an agent package version is refused, or None. Used by the stable builder (build_glimpse_manifest.py).
    Versions below 7 keep the old rule (two or three numbers); from 7 on exactly three plain numbers with a label."""
    if not isinstance(version, str) or not re.fullmatch(r"[0-9]+(\.[0-9]+){1,3}", version):
        return f"{version!r} is not a dotted version"
    if not is_v7_or_later(version):
        return None if re.fullmatch(r"[0-9]+(\.[0-9]+){2,3}", version) else f"{version!r} needs three numbers"
    if label(version) is None:
        return f"{version!r} has no label: from 7 on it must be exactly X.Y.P with P from 1 to 199"
    return None


def vectors():
    """The shared rows [text, label-or-None] as stored in version-labels.v1.json."""
    return json.loads(VECTORS.read_text(encoding="utf-8"))


def _self_check():
    bad = [(t, want, label(t)) for t, want in vectors() if label(t) != want]
    if bad:
        raise SystemExit(f"version_label: {bad}")
    print(f"version_label: {len(vectors())} vectors agree")


if __name__ == "__main__":
    _self_check()
