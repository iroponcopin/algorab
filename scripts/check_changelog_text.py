#!/usr/bin/env python3
"""check_changelog_text.py -- the forbidden-text gate for the changelog page (see changelog_filter.py).

  python3 scripts/check_changelog_text.py            # the report is up to date, and no exported changelog page holds a term
  python3 scripts/check_changelog_text.py --write    # regenerate data/changelog_hidden_entries.md
  python3 scripts/check_changelog_text.py --self-test

WHAT IS SCANNED
  * The feeds (changelog_feed/<brand>/<lang>.json, every offered brand, 13 languages): a release with a hit is hidden
    on the page in every language. The committed report must equal what the scan finds now.
  * The exported changelog pages (web/out/**/changelog/**, the .html pages and their .txt payloads): visible text and
    the attribute values a visitor can read (alt, title, aria-label, meta content that is not a URL). Script and style
    blocks, URLs and paths are not text a visitor reads and are not scanned; the machine id `corvus6` is removed first
    (changelog_filter.MACHINE_TOKENS). A hit in an exported page FAILS.
"""
import html
import re
import shutil
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import changelog_filter as F  # noqa: E402

ROOT = F.ROOT
EXPORT = ROOT / "web" / "out"
ATTRS = re.compile(r'\s(alt|title|aria-label|content)="([^"]*)"')
SCRIPT_STYLE = re.compile(r"<(script|style)\b.*?</\1>", re.S | re.I)
TAG = re.compile(r"<[^>]+>")
URLISH = re.compile(r"://|/|=")


def visible_text_of_html(markup):
    markup = SCRIPT_STYLE.sub(" ", markup)
    parts = []
    for m in ATTRS.finditer(markup):
        if not URLISH.search(m.group(2)):
            parts.append(html.unescape(m.group(2)))
    parts.append(TAG.sub(" ", markup))
    return "\n".join(parts)


def text_of_payload(txt):
    txt = re.sub(r"https?://\S+", " ", txt)
    txt = re.sub(r'"/[^"\s]*"', " ", txt)     # quoted paths
    txt = re.sub(r"/[\w./?=&%+-]+", " ", txt)  # bare paths
    txt = re.sub(r"__corvus\w*|corvus-[\w-]+", " ", txt, flags=re.I)  # the portal's own script identifiers
    txt = re.sub(r'\\?"[A-Za-z_][\w-]*\\?":', " ", txt)  # JSON keys (machine names of the page data, not text)
    return txt


def export_pages(export_dir):
    """The exported changelog pages: <lang>/changelog/**.html and .txt (and the root one)."""
    out = []
    if not export_dir.exists():
        return out
    for p in sorted(export_dir.rglob("*")):
        if not p.is_file() or p.suffix not in (".html", ".txt"):
            continue
        rel = p.relative_to(export_dir).parts
        if "changelog" in rel:
            out.append(p)
    return out


def scan_export(export_dir):
    problems = []
    for p in export_pages(export_dir):
        raw = p.read_text(encoding="utf-8", errors="replace")
        text = visible_text_of_html(raw) if p.suffix == ".html" else text_of_payload(raw)
        clean = F.strip_machine_tokens(text)
        for cat, rx in F._COMPILED:
            m = rx.search(clean)
            if m:
                problems.append(f"{p.relative_to(export_dir)}: {cat} term {m.group(0)!r} in the exported changelog page")
    return problems


def check(export_dir=EXPORT, root=ROOT):
    problems = []
    report = root / "data" / "changelog_hidden_entries.md"
    expected = F.report_text(F.scan(root), root)
    if not report.exists() or report.read_text(encoding="utf-8") != expected:
        problems.append("data/changelog_hidden_entries.md is missing or out of date: run "
                        "python3 scripts/check_changelog_text.py --write and commit it")
    if export_dir.exists():
        problems += scan_export(export_dir)
    return problems


def self_test():
    """Plant one forbidden term in a copy of an export page and require the check to go red; a clean copy stays green."""
    fails = []
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        page = tmp / "en" / "changelog" / "index.html"
        page.parent.mkdir(parents=True)
        page.write_text('<html><head><meta property="og:image" content="/portal/wiki/corvus/x.png"/>'
                        '<script>var a="corvus-theme";</script></head><body><h1>Changelog</h1>'
                        '<p>Algorab 6.2.3</p><a href="?model=corvus6">Algorab</a></body></html>', encoding="utf-8")
        if scan_export(tmp):
            fails.append("a clean page (portal chrome and machine ids only) was reported")
        page.write_text(page.read_text(encoding="utf-8").replace("Algorab 6.2.3", "Glimpse Alpha 6.2.3"), encoding="utf-8")
        if not scan_export(tmp):
            fails.append("a planted 'Glimpse' in visible text was not reported")
    return fails


def main(argv):
    if "--self-test" in argv:
        fails = self_test()
        for f in fails:
            print("FAIL " + f)
        print("changelog text self-test: " + ("GREEN" if not fails else f"RED ({len(fails)})"))
        return 0 if not fails else 1
    if "--write" in argv:
        F.REPORT.write_text(F.report_text(F.scan(ROOT), ROOT), encoding="utf-8")
        hits = F.scan(ROOT)
        print(f"wrote {F.REPORT.relative_to(ROOT)}: {len(hits)} hidden release(s)")
        return 0
    export = EXPORT
    if "--export" in argv:
        export = Path(argv[argv.index("--export") + 1])
    problems = check(export, ROOT)
    for p in problems:
        print("FAIL " + p)
    hits = F.scan(ROOT)
    print(f"changelog text: {len(hits)} hidden release(s), {len(export_pages(export))} exported changelog page(s): "
          + ("GREEN" if not problems else f"RED ({len(problems)})"))
    return 0 if not problems else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
