#!/usr/bin/env python3
"""Gate for beta/glimpse_manifest.json (the beta channel's manifest). Offline; it re-derives every expectation itself
and does not import build_beta_manifest, so a mistake in the builder cannot make this agree with it. It then runs the
builder in --check mode, which compares the file with a fresh build.

Fails when:
  * beta/glimpse_manifest.json is missing, not JSON, or its top-level keys differ from the stable manifest's;
  * any value differs from the stable manifest outside agent (latest, download_url, file_name, file_size, sha256) and
    corvus6.native.windows (version, download_url, file_name, file_size, sha256);
  * an overridden version is not purely numeric (one to three parts) or is older than or equal to the stable one;
  * an overridden file is not under https://algorab.uk/downloads/beta/, has the wrong extension (.msi for Windows,
    .zip for the agent), is missing from downloads/beta/, or its size or SHA-256 differs from the file;
  * beta/overrides.json is missing or has keys the builder does not allow;
  * the builder's --check fails (the file on disk is stale).
"""
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
BETA = ROOT / "beta"
PREFIX = "https://algorab.uk/downloads/beta/"
AGENT = ("latest", "download_url", "file_name", "file_size", "sha256")
WIN = ("version", "download_url", "file_name", "file_size", "sha256")
NUMERIC = re.compile(r"(?:0|[1-9][0-9]*)(?:\.(?:0|[1-9][0-9]*)){0,2}")  # fullmatch: no trailing newline, no leading zeros
ALLOWED_TOP = {"agent", "corvus6_windows", "notes"}

problems = []


def bad(where, what):
    problems.append(f"{where}: {what}")


def numtuple(v):
    p = [int(x) for x in v.split(".")]
    return tuple(p + [0] * (3 - len(p)))


def check_file(where, block, ext, keys):
    name = block.get("file_name", "")
    if not isinstance(name, str) or not name.endswith(ext):
        bad(where, f"file_name {name!r} must end with {ext}")
    if block.get("download_url") != PREFIX + str(name):
        bad(where, f"download_url must be {PREFIX}{name}")
    path = ROOT / "downloads" / "beta" / str(name)
    if not path.is_file():
        bad(where, f"{path.relative_to(ROOT)} is not in the repository")
        return
    if path.stat().st_size != block.get("file_size"):
        bad(where, f"file_size {block.get('file_size')} is not the size of {name} ({path.stat().st_size})")
    if hashlib.sha256(path.read_bytes()).hexdigest() != block.get("sha256"):
        bad(where, f"sha256 is not the SHA-256 of {name}")


def main():
    stable_path = ROOT / "glimpse_manifest.json"
    beta_path = BETA / "glimpse_manifest.json"
    if not beta_path.is_file():
        print(f"RED  {beta_path.relative_to(ROOT)} is missing: run python3 scripts/build_beta_manifest.py")
        return 1
    try:
        stable = json.loads(stable_path.read_text(encoding="utf-8"))
        beta = json.loads(beta_path.read_text(encoding="utf-8"))
        overrides = json.loads((BETA / "overrides.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"RED  could not read the manifests or overrides: {exc}")
        return 1

    if set(beta) != set(stable):
        bad("beta", f"top-level keys differ from stable: {sorted(set(beta) ^ set(stable))}")
    for key in stable:
        if key in ("agent", "corvus6"):
            continue
        if beta.get(key) != stable[key]:
            bad(key, "differs from the stable manifest, but only agent and corvus6.native.windows may be overridden")

    if not isinstance(overrides, dict):
        print("RED  beta/overrides.json must be a JSON object")
        return 1
    if set(overrides) - ALLOWED_TOP:
        bad("beta/overrides.json", f"unexpected keys {sorted(set(overrides) - ALLOWED_TOP)}")

    # agent
    sa, ba = stable.get("agent"), beta.get("agent")
    if sa is None or ba is None:
        if sa != ba:
            bad("agent", "present in only one of the two manifests")
    else:
        if set(sa) != set(ba):
            bad("agent", "key set differs from stable")
        for k in sa:
            if k not in AGENT and sa.get(k) != ba.get(k):
                bad(f"agent.{k}", "not an overridable key")
        if ba.get("latest") != sa.get("latest"):
            if not (isinstance(ba.get("latest"), str) and NUMERIC.fullmatch(ba["latest"])):
                bad("agent.latest", f"{ba.get('latest')!r} is not numeric")
            elif numtuple(ba["latest"]) <= numtuple(sa["latest"]):
                bad("agent.latest", f"{ba['latest']} is not newer than stable {sa['latest']}")
            check_file("agent", ba, ".zip", AGENT)
        elif any(ba.get(k) != sa.get(k) for k in AGENT):
            bad("agent", "changed a file field without changing latest")

    # corvus6
    sc, bc = stable.get("corvus6") or {}, beta.get("corvus6") or {}
    if set(sc) != set(bc) or set(sc.get("native", {})) != set(bc.get("native", {})):
        bad("corvus6", "keys differ from stable")
    if sc.get("latest") != bc.get("latest"):
        bad("corvus6.latest", "must stay the stable value")
    for pid in set(sc.get("native", {})) | set(bc.get("native", {})):
        if pid == "windows":
            continue
        if sc.get("native", {}).get(pid) != bc.get("native", {}).get(pid):
            bad(f"corvus6.native.{pid}", "differs from stable, but only the Windows block may be overridden")
    sw = sc.get("native", {}).get("windows") or {}
    bw = bc.get("native", {}).get("windows") or {}
    if set(sw) != set(bw):
        bad("corvus6.native.windows", "key set differs from stable")
    for k in sw:
        if k not in WIN and sw.get(k) != bw.get(k):
            bad(f"corvus6.native.windows.{k}", "not an overridable key")
    if bw.get("version") != sw.get("version"):
        if not (isinstance(bw.get("version"), str) and NUMERIC.fullmatch(bw["version"])):
            bad("corvus6.native.windows.version", f"{bw.get('version')!r} is not numeric")
        elif numtuple(bw["version"]) <= numtuple(sw["version"]):
            bad("corvus6.native.windows.version", f"{bw['version']} is not newer than stable {sw['version']}")
        check_file("corvus6.native.windows", bw, ".msi", WIN)
    elif any(bw.get(k) != sw.get(k) for k in WIN):
        bad("corvus6.native.windows", "changed a file field without changing version")

    for p in problems:
        print(f"RED  {p}")
    builder = subprocess.run([sys.executable, "-B", str(HERE / "build_beta_manifest.py"), "--check"],
                             capture_output=True, text=True)
    for line in (builder.stdout + builder.stderr).splitlines():
        print(f"     {line}")
    if builder.returncode != 0:
        problems.append("build_beta_manifest.py --check failed")
    if not problems:
        mirror = "a mirror of stable" if beta == stable else "stable plus the valid overrides above"
        print(f"GREEN beta manifest valid: {mirror}")
    return 0 if not problems else 1


if __name__ == "__main__":
    sys.exit(main())
