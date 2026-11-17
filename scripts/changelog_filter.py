#!/usr/bin/env python3
"""The forbidden-text rule for the changelog page (owner, 2026-10-30 and 2026-11-17).

The page was stubbed on 2026-10-30 because old feed entries carry text that must never be shown: product names that
were retired (Corvus, Miau, Glimpse, the standalone name Alpha) and anything about another company's franchise (JJK).
The feed and the old entries are history and contract (the app reads them), so they are NOT edited. Instead:

  * A release (one brand, one version) with a hit in ANY language is hidden on the page in EVERY language.
  * The alpha root feed and the legacy launcher notes brand are never offered on the page.
  * Every hidden release is listed, with its language, the term and the sentence, in data/changelog_hidden_entries.md.
  * The exported changelog pages are scanned too (scripts/check_changelog_text.py): a hit there fails the build.

One term list serves the page filter (web/scripts/extract_wiki.py) and the checks, so they cannot disagree.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LANGS = ["ja", "en", "es", "fr", "zh", "ko", "pt-br", "it", "ar", "ru", "id", "de", "tr"]
NEVER_OFFERED = ("alpha", "corvus")  # the root feed (Alpha) and the legacy Java launcher notes brand

# (category, pattern, flags). Latin spellings are case-insensitive; the brand "Alpha" is case-sensitive so that
# "alphabet" and "alpha" in ordinary prose are not hits. Transliterations are in the scripts each language uses.
_I = re.IGNORECASE
TERMS = [
    ("Corvus", r"corvus", _I),
    ("Corvus", r"コルヴス|コーヴス|코르부스|코르버스|Корвус|كورفوس|科尔沃斯", 0),
    ("Miau", r"miau", _I),
    ("Miau", r"ミアウ|미아우|Миау", 0),
    ("Glimpse", r"glimpse", _I),
    ("Glimpse", r"グリンプス|글림프스|Глимпс|غليمبس", 0),
    ("Alpha (brand)", r"(?<![A-Za-z])Alpha(?![a-z])", 0),
    ("JJK", r"JJK|Jujutsu|Sukuna|Gojo|Infinite Void|Domain Expansion|Megumi|Itadori", _I),
    ("JJK", r"呪術|呪霊|宿儺|五条|無量空処|領域展開|伏黒|虎杖", 0),
    ("JJK", r"주술회전|주술|Магическая битва|Джуджуцу|جوجوتسو", 0),
]
_COMPILED = [(cat, re.compile(p, f)) for cat, p, f in TERMS]
# The one allowance: the machine id of the Algorab app's brand (brands.json "corvus6"), which is a URL and API token
# and never prose. It is removed before the scan; nothing else is. Reported as a doubt in the audit notes.
MACHINE_TOKENS = (re.compile(r"\bcorvus6\b"),)
SENTENCE_END = re.compile(r"(?<=[.!?。！？])\s*")


def strip_machine_tokens(text):
    for rx in MACHINE_TOKENS:
        text = rx.sub(" ", text)
    return text


def hits_in(text):
    """[(category, matched, sentence)] for one string."""
    clean = strip_machine_tokens(text)
    out = []
    for cat, rx in _COMPILED:
        for m in rx.finditer(clean):
            # the sentence that holds the match
            start = 0
            for piece in SENTENCE_END.split(clean):
                end = clean.find(piece, start) + len(piece) if piece else start
                if piece and clean.find(piece, start) <= m.start() < end:
                    out.append((cat, m.group(0), piece.strip()))
                    break
                start = end
            else:
                out.append((cat, m.group(0), clean.strip()))
    return out


def strings_of(node):
    if isinstance(node, str):
        yield node
    elif isinstance(node, dict):
        for k, v in node.items():
            if k in ("version", "date", "type", "channel", "kind", "lang", "brand", "updated", "updated_label"):
                continue
            yield from strings_of(v)
    elif isinstance(node, list):
        for v in node:
            yield from strings_of(v)


def brand_feeds(root=ROOT):
    """[(brand_id, lang, payload)] for every feed the page could offer, read from changelog_feed/ (the contract)."""
    index = json.loads((root / "changelog_feed" / "brands.json").read_text(encoding="utf-8"))
    out = []
    for b in index["brands"]:
        if b["id"] in NEVER_OFFERED:
            continue
        for lang in LANGS:
            path = root / b["feed"].replace("{lang}", lang)
            if not path.exists():
                raise SystemExit(f"ERROR: {path} is missing (brand {b['id']}, {lang})")
            out.append((b["id"], lang, json.loads(path.read_text(encoding="utf-8"))))
    return out


def scan(root=ROOT):
    """{(brand, version): [(lang, category, matched, sentence)]} over every offered release in every language."""
    hits = {}
    for brand, lang, payload in brand_feeds(root):
        for group in payload.get("groups", []):
            for rel in group.get("releases", []):
                key = (brand, str(rel.get("version")))
                for s in strings_of(rel):
                    for cat, matched, sentence in hits_in(s):
                        hits.setdefault(key, []).append((lang, cat, matched, sentence))
    return hits


def hidden_keys(root=ROOT):
    """The (brand, version) pairs the page must not render, in any language."""
    return set(scan(root))


def report_text(hits, root=ROOT):
    """The committed report: deterministic markdown."""
    lines = [
        "# Changelog entries hidden from the page (forbidden text)",
        "",
        "Generated by `python3 scripts/check_changelog_text.py --write`. The feed files are NOT edited (contract and history);",
        "the page filter in `web/scripts/extract_wiki.py` hides each release listed here in every language. To show a release",
        "again, fix its text in `data/i18n/<lang>.json` (or the structural file), rebuild the feeds, and rerun this check.",
        "",
    ]
    per_brand = {}
    for (brand, _v) in hits:
        per_brand[brand] = per_brand.get(brand, 0) + 1
    lines.append("## Counts per brand (hidden releases)")
    lines.append("")
    lines.append("| brand | hidden releases |")
    lines.append("| --- | --- |")
    for brand in sorted(per_brand):
        lines.append(f"| {brand} | {per_brand[brand]} |")
    if not per_brand:
        lines.append("| (none) | 0 |")
    lines.append("")
    lines.append("## Hits")
    lines.append("")
    lines.append("| brand | version | language | term | sentence |")
    lines.append("| --- | --- | --- | --- | --- |")
    for (brand, version) in sorted(hits):
        for lang, cat, matched, sentence in sorted(hits[(brand, version)], key=lambda h: (LANGS.index(h[0]), h[1], h[2])):
            sent = sentence.replace("|", "\\|").replace("\n", " ")
            lines.append(f"| {brand} | {version} | {lang} | {cat}: `{matched}` | {sent} |")
    return "\n".join(lines) + "\n"


REPORT = ROOT / "data" / "changelog_hidden_entries.md"
