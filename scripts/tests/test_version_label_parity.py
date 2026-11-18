"""Python and TypeScript give the same label for the same text (2026-11-18 review).

Several thousand generated strings (digits, dots, spaces, "v", signs, Unicode digits, very long runs) go through
scripts/version_label.py and web/src/lib/version-label.ts; every answer must agree and Python must never raise.
Needs node with TypeScript type stripping (node 22.6 or later); skipped when node is not there."""
import json
import random
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent.parent
ROOT = SCRIPTS.parent
sys.path.insert(0, str(SCRIPTS))
import version_label as V  # noqa: E402

TS = ROOT / "web" / "src" / "lib" / "version-label.ts"
PIECES = ["0", "1", "6", "7", "9", "00", "07", "99", "100", "101", "199", "200", "255", "9" * 30, "1" * 5000, ".", " ",
          "\n", "\t", "v", "V", "-", "+", "７", "٧", "۷", "१", "Beta", "​", " ", "e", "x"]
FIELDS = ["0", "1", "6", "7", "8", "07", "10", "99", "100", "101", "199", "200", "1" * 25]


def cases():
    rng = random.Random(7)
    out = {t for t, _ in V.vectors()}
    while len(out) < 4000:
        out.add("".join(rng.choice(PIECES) for _ in range(rng.randint(1, 6))))
        out.add(".".join(rng.choice(FIELDS) for _ in range(3)))
    return sorted(out)


@unittest.skipUnless(shutil.which("node"), "node is not installed")
class PythonAndTypeScriptAgree(unittest.TestCase):
    def test_same_label_for_every_generated_text(self):
        texts = cases()
        with tempfile.TemporaryDirectory() as tmp:
            src = Path(tmp) / "cases.json"
            src.write_text(json.dumps(texts), encoding="utf-8")
            script = (f"import {{ readFileSync }} from 'node:fs';"
                      f"import {{ versionLabel }} from {json.dumps(TS.as_uri())};"
                      f"const t = JSON.parse(readFileSync({json.dumps(str(src))}, 'utf8'));"
                      f"process.stdout.write(JSON.stringify(t.map((x) => versionLabel(x))));")
            run = subprocess.run(["node", "--input-type=module", "-e", script], capture_output=True, text=True)
            if run.returncode != 0 and "Unknown file extension" in run.stderr:
                self.skipTest("this node cannot load TypeScript")
            self.assertEqual(run.returncode, 0, run.stderr)
            ts = json.loads(run.stdout)
        py = [V.label(t) for t in texts]
        bad = [(t[:40], p, s) for t, p, s in zip(texts, py, ts) if p != s]
        self.assertEqual(bad, [])
        for t in texts:
            V.is_v7_or_later(t)
            V.order_key(t)
            V.zip_version_problem(t)


if __name__ == "__main__":
    unittest.main()
