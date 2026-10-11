# -*- coding: utf-8 -*-
"""Join the staff guide's capture runs into staff/: each run (stf_<part>.py) captured its part into <root>/<part>;
their shots are renumbered into staff/shots in the guide's order and staff/manifest.json is rewritten.
Usage: python staff_merge.py <root of the parts' capture folders>"""
import json, shutil, sys
from pathlib import Path

ROOT = Path(__file__).parent
PARTS = ["basics", "registration", "exam", "admins", "ops", "mission"]

src = Path(sys.argv[1])
out = ROOT / "staff"
shots = out / "shots"
if shots.exists():
    shutil.rmtree(shots)
if (out / "jpg").exists():
    shutil.rmtree(out / "jpg")
shots.mkdir(parents=True)

manifest, seen = [], set()
for part in PARTS:
    man = json.loads((src / part / "manifest.json").read_text("utf-8"))
    for e in man:
        if e["key"] in seen:
            sys.exit(f"key {e['key']} captured twice ({part})")
        seen.add(e["key"])
        n = len(manifest) + 1
        name = f"{n:03d}-{e['key']}.png"
        shutil.copy2(src / part / "shots" / e["file"], shots / name)
        manifest.append({**e, "n": n, "file": name, "part": part})
    print(f"{part}: {len(man)}")
(out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), "utf-8")
print("staff:", len(manifest))
