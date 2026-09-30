#!/usr/bin/env bash
# Full recapture of the administrator and staff guides after a navigation change.
cd "$(dirname "$0")"
export PYTHONIOENCODING=utf-8
cp admin/manifest.json admin/manifest.before-flights.json
cp staff/manifest.json staff/manifest.before-flights.json
set -x
CAP_DIR=admin python adm_a.py 0 2>&1 | tail -2
CAP_DIR=admin python adm_b.py 35 2>&1 | tail -2
CAP_DIR=admin python adm_c.py 75 2>&1 | tail -2
CAP_DIR=staff python adm_prep.py 2>&1 | tail -1
CAP_DIR=staff python stf_a.py 0 a 2>&1 | tail -1
CAP_DIR=staff python stf_a.py 11 b 2>&1 | tail -1
CAP_DIR=staff python stf_a.py 17 c 2>&1 | tail -1
CAP_DIR=staff python stf_a.py 22 d 2>&1 | tail -1
CAP_DIR=staff python stf_b.py 32 e 2>&1 | tail -1
CAP_DIR=staff python stf_b.py 44 f 2>&1 | tail -1
CAP_DIR=staff python stf_b.py 50 g 2>&1 | tail -1
CAP_DIR=staff python stf_b.py 53 h 2>&1 | tail -1
CAP_DIR=staff python stf_c.py 61 i 2>&1 | tail -1
CAP_DIR=staff python stf_c.py 71 j 2>&1 | tail -1
CAP_DIR=staff python stf_c.py 81 k 2>&1 | tail -1
CAP_DIR=staff python stf_c.py 89 l 2>&1 | tail -1
CAP_DIR=staff python stf_c.py 99 m 2>&1 | tail -1
python - <<'EOF'
import json
for d in ("admin","staff"):
    a=json.load(open(f"{d}/manifest.before-flights.json",encoding="utf-8")); b=json.load(open(f"{d}/manifest.json",encoding="utf-8"))
    print(d, len(a), len(b), "same keys:", [x["key"] for x in a]==[x["key"] for x in b])
EOF
echo ALLDONE
