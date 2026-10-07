#!/usr/bin/env bash
# Full recapture of the administrator and staff guides (after a navigation change, or any change to
# screens the guides show). Each run resumes after the shots already in its manifest, so the counts
# never have to be kept by hand when a run gains or loses a shot.
# The site must be running on :3001 (see README). PY picks the Python that has Playwright.
cd "$(dirname "$0")"
export PYTHONIOENCODING=utf-8
PY="${PY:-python}"
count() { "$PY" -c "import json,sys; print(len(json.load(open(sys.argv[1] + '/manifest.json', encoding='utf-8'))))" "$1"; }
run() { local dir="$1"; shift; local keep; keep=$( [ "$FIRST" = 1 ] && echo 0 || count "$dir" ); FIRST=0
  echo "── CAP_DIR=$dir $1 $keep ${*:2}"; CAP_DIR="$dir" "$PY" "$1" "$keep" "${@:2}" 2>&1 | tail -2; }

# `./recapture_all.sh staff` redoes the staff guide only (it reuses the administrator states in admin/)
WHICH="${1:-all}"
cp admin/manifest.json admin/manifest.before.json
cp staff/manifest.json staff/manifest.before.json
set -eo pipefail

if [ "$WHICH" = all ]; then
  FIRST=1; run admin adm_a.py
  run admin adm_b.py
  run admin adm_c.py
  run admin adm_d.py
fi

FIRST=1; run staff stf_a.py a
for part in b c d; do run staff stf_a.py "$part"; done
for part in e f g h; do run staff stf_b.py "$part"; done
for part in i j k l m; do run staff stf_c.py "$part"; done
run staff stf_d.py

"$PY" - <<'EOF'
import json
for d in ("admin", "staff"):
    a = [x["key"] for x in json.load(open(f"{d}/manifest.before.json", encoding="utf-8"))]
    b = [x["key"] for x in json.load(open(f"{d}/manifest.json", encoding="utf-8"))]
    print(d, len(a), "->", len(b), "| new:", sorted(set(b) - set(a)), "| gone:", sorted(set(a) - set(b)))
EOF
echo ALLDONE
