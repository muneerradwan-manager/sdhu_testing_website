# -*- coding: utf-8 -*-
"""Pilgrim guide after the accommodation change (no "private-room difference": the shared accommodation at no
cost, or private rooms the family spreads over as it likes, priced per person by room type). Swaps the
screenshots of the group, payment and medical steps and replaces the changed text, inside the user's own
.docx (it carries his direction fixes, so it is patched, not rebuilt).

    python patch_pilgrim_rooms.py <capture dir>   # a dir with manifest.json + shots/ from run1.py + run2.py
"""
import sys, copy, io, json, importlib.util, re, subprocess
from pathlib import Path
from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.text.run import Run
from PIL import Image
sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))
import content as C

# The guide builder's own run splitting (build_docx runs a whole build on import, so it is copied here)
_LTR = re.compile(r"\+?[A-Za-z]*\d[\dA-Za-z]*(?:[ \-][A-Za-z]*\d[\dA-Za-z]*)+|[A-Z]{2,}-\d+|\d+-[A-Z]-\d+(?:-\d+)?")
_PAREN_OPEN = re.compile(r"\((?=[\d%])")
_PAREN_CLOSE = re.compile(r"(?<=[\d%])\)")
def _split_ltr(run):
    text = _PAREN_CLOSE.sub("‏)", _PAREN_OPEN.sub("(‏", run.text))
    run.text = text
    parts, pos = [], 0
    for m in _LTR.finditer(text):
        if m.start() > pos: parts.append((text[pos:m.start()], False))
        parts.append((m.group(0), True)); pos = m.end()
    if pos < len(text): parts.append((text[pos:], False))
    if not parts or (len(parts) == 1 and not parts[0][1]): return
    template = copy.deepcopy(run._r)
    run.text = parts[0][0]
    if parts[0][1]:
        for e in run._r.rPr.findall(qn("w:rtl")): run._r.rPr.remove(e)
    prev = run._r
    for t, ltr in parts[1:]:
        r2 = copy.deepcopy(template)
        for ch in list(r2):
            if ch.tag != qn("w:rPr"): r2.remove(ch)
        te = OxmlElement("w:t"); te.set(qn("xml:space"), "preserve"); te.text = t; r2.append(te)
        if ltr:
            for e in r2.rPr.findall(qn("w:rtl")): r2.rPr.remove(e)
        prev.addnext(r2); prev = r2

DOCX = ROOT.parent / "دليل-الحاج-لاستخدام-المنصة" / "دليل-الحاج-لاستخدام-المنصة.docx"
CAP = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT
KEYS = ["post-group", "post-group-dir", "post-group-compare", "post-cluster-detail", "post-mygroup", "post-payment", "post-payment-receipts",
        "post-payment-modal", "post-payment-done", "post-medical-needs", "dossier-payments"]

# The guide's text before this change, from git, step by step beside the new one
old_src = subprocess.run(["git", "show", "4d5e007:docs/_build-guide/content.py"], cwd=ROOT, capture_output=True, check=True).stdout
spec = importlib.util.spec_from_loader("content_old", loader=None); O = importlib.util.module_from_spec(spec)
exec(old_src.decode("utf-8"), O.__dict__)
steps = lambda M: [s for ch in M.CHAPTERS for sec in ch["sections"] for s in sec["steps"]]

doc = Document(str(DOCX))
cap_man = {e["key"]: e for e in json.loads((CAP / "manifest.json").read_text("utf-8"))}

# ── pictures: one per step with a picture, after the cover logo ──
order = [s["img"] for s in steps(C) if s["img"]]
blips = list(doc.element.body.iter(qn("a:blip")))
print("pictures in docx:", len(blips), "steps with pictures:", len(order))
assert len(blips) == len(order) + 1, "the cover logo plus one picture per step"
for k in KEYS:
    i = order.index(k) + 1
    part = doc.part.related_parts[blips[i].get(qn("r:embed"))]
    im = Image.open(CAP / "shots" / cap_man[k]["file"]).convert("RGB"); im.thumbnail((1600, 1600))
    buf = io.BytesIO(); im.save(buf, "JPEG", quality=82, optimize=True)
    print(f"{k}: {len(part.blob)} -> {len(buf.getvalue())}")
    part._blob = buf.getvalue()

# ── text ──
RLM = "‏"
norm = lambda s: s.replace(RLM, "")

def set_text(r, text):
    for t in r.findall(qn("w:t")): r.remove(t)
    te = OxmlElement("w:t"); te.set(qn("xml:space"), "preserve"); te.text = text; r.append(te)

def replace_in(p, old, new):
    """Replace `old` (marks ignored) inside paragraph element p, in the formatting of the run it starts in."""
    runs = [r for r in p.iter(qn("w:r")) if r.find(qn("w:t")) is not None]
    raw = ["".join(t.text or "" for t in r.findall(qn("w:t"))) for r in runs]
    full = "".join(norm(t) for t in raw)
    a = full.find(norm(old))
    if a < 0: return False
    b = a + len(norm(old))
    hit, pos = [], 0
    for r, t in zip(runs, raw):
        start = pos; pos += len(norm(t))
        if pos <= a or start >= b: continue
        head = tail = ""; k = start
        for ch in t:
            if ch == RLM:
                if k < a: head += ch
                elif k >= b: tail += ch
                continue
            if k < a: head += ch
            elif k >= b: tail += ch
            k += 1
        hit.append((r, head, tail))
    first, head, _ = hit[0]
    last, _, tail = hit[-1]
    new_r = copy.deepcopy(first)
    set_text(new_r, new)  # in the run's own formatting (its direction included)
    first.addnext(new_r)
    if tail:
        tail_r = copy.deepcopy(last); set_text(tail_r, tail); new_r.addnext(tail_r)
    for r, _, _ in hit:
        if r is first and head: set_text(r, head)
        else: r.getparent().remove(r)
    _split_ltr(Run(new_r, None))
    return True

body = list(doc.element.body.iter(qn("w:p")))
ptext = lambda p: norm("".join(t.text or "" for t in p.iter(qn("w:t"))))
done, missed = 0, []

def swap(old, new, start=0, stop=None, what=""):
    global done
    for p in body[start:stop]:
        if norm(old) in ptext(p):
            assert replace_in(p, old, new), what
            done += 1
            return body.index(p)
    missed.append(what or old[:40])

# Each changed step: its title, explanation, actions and result, looked up after its own heading
for a, b in zip(steps(O), steps(C)):
    if a == b: continue
    h = next((i for i, p in enumerate(body) if ptext(p).startswith("الخطوة ") and ptext(p).endswith(norm(a["t"]))), None)
    if h is None: missed.append("heading " + a["t"]); continue
    nxt = next((i for i in range(h + 1, len(body)) if ptext(body[i]).startswith("الخطوة ")), len(body))
    if a["t"] != b["t"]: swap(a["t"], b["t"], h, h + 1, "title " + a["t"])
    if a["x"] != b["x"]: swap(a["x"], b["x"], h + 1, nxt, "text " + a["t"])
    for oa, ob in zip(a["do"], b["do"]):
        if oa != ob: swap(oa, ob, h + 1, nxt, "do " + a["t"])
    if a["r"] != b["r"]: swap(a["r"], b["r"], h + 1, nxt, "result " + a["t"])

# Captions of the swapped pictures
tracked = json.loads((ROOT / "manifest.json").read_text("utf-8"))
by_n = {e["n"]: e for e in tracked}
for k in KEYS:
    new_e = cap_man[k]; old_e = by_n[new_e["n"]]
    if old_e["caption"] != new_e["caption"]:
        swap(old_e["caption"], new_e["caption"], what="caption " + k)
    by_n[new_e["n"]].update(key=new_e["key"], file=new_e["file"], caption=new_e["caption"])
(ROOT / "manifest.json").write_text(json.dumps(tracked, ensure_ascii=False, indent=1), "utf-8")

# FAQ: question and answer
for (oq, oa), (nq, na) in zip(O.FAQ, C.FAQ):
    if (oq, oa) == (nq, na): continue
    i = swap(oq, nq, what="faq " + oq)
    if i is not None: swap(oa, na, i + 1, i + 3, "faq answer " + oq)

# The fees table in the appendix
for orow, nrow in zip(O.FEES, C.FEES):
    if orow == nrow: continue
    for tbl in doc.element.body.iter(qn("w:tbl")):
        rows = list(tbl.iter(qn("w:tr")))
        for tr in rows:
            cells = list(tr.iter(qn("w:tc")))
            if len(cells) == len(orow) and norm("".join(t.text or "" for t in cells[0].iter(qn("w:t")))).strip() == orow[0]:
                for tc, o, n in zip(cells, orow, nrow):
                    p = next(tc.iter(qn("w:p")))
                    assert replace_in(p, o, n), o
                done += 1

print("text replaced:", done, "| missed:", missed)
doc.save(str(DOCX))
print("saved", DOCX.name)
