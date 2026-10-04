# -*- coding: utf-8 -*-
"""Patch the pilgrim guide in place after a site change: swap the given screenshots, replace every text the
change touched (step titles, explanations, actions, results, notes, captions, FAQ, fees table), and add the
steps that are new (built on the step before them, with the steps and figures after renumbered), inside the
user's own .docx — it carries his direction fixes, so it is patched, not rebuilt.

    python patch_pilgrim.py <capture dir> <git rev> <key> [<key> ...]

<capture dir> holds manifest.json + shots/ from the capture runs (run them in a copy of this folder: run1.py
wipes the tracked manifest.json). <git rev> is a commit whose content.py still has the guide's text as the
.docx has it; the difference with the current content.py is what gets replaced. The keys are the shots to swap.
Used for: accommodation (4d5e007; post-group … dossier-payments), sign-in and registration pages (4026ef2),
the 3D tour page (d6f7a25; home-more-menu, and the new step tour-3d), the live stream (baffdcd; home-hero,
home-scale, home-more-menu, and the new step home-live), the lottery by birth years and months (51da5d9; the
home, results, apply and lottery shots, and the new steps results-draw and sc-lottery-not-drawn).
"""
import sys, copy, difflib, io, json, importlib.util, re, subprocess
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
CAP, REV, KEYS = Path(sys.argv[1]), sys.argv[2], sys.argv[3:]
assert KEYS, __doc__

# The guide's text before this change, from git, step by step beside the new one
old_src = subprocess.run(["git", "show", f"{REV}:docs/_build-guide/content.py"], cwd=ROOT, capture_output=True, check=True).stdout
spec = importlib.util.spec_from_loader("content_old", loader=None); O = importlib.util.module_from_spec(spec)
exec(old_src.decode("utf-8"), O.__dict__)
steps = lambda M: [s for ch in M.CHAPTERS for sec in ch["sections"] for s in sec["steps"]]

doc = Document(str(DOCX))
cap_man = {e["key"]: e for e in json.loads((CAP / "manifest.json").read_text("utf-8"))}

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
tracked = json.loads((ROOT / "manifest.json").read_text("utf-8"))

def jpeg(key):
    im = Image.open(CAP / "shots" / cap_man[key]["file"]).convert("RGB"); im.thumbnail((1600, 1600))
    buf = io.BytesIO(); im.save(buf, "JPEG", quality=82, optimize=True)
    return buf.getvalue()

# Old and new steps side by side: the same step keeps its picture key (or its title when it has none)
O_STEPS, C_STEPS = steps(O), steps(C)
skey = lambda s: s["img"] or "t:" + s["t"]
ops = difflib.SequenceMatcher(None, [skey(s) for s in O_STEPS], [skey(s) for s in C_STEPS], autojunk=False).get_opcodes()
pairs, inserted = [], []
for tag, i1, i2, j1, j2 in ops:
    if tag in ("equal", "replace") and i2 - i1 == j2 - j1:
        pairs += list(zip(O_STEPS[i1:i2], C_STEPS[j1:j2]))
    elif tag == "insert":
        inserted += [(C_STEPS[j - 1], C_STEPS[j]) for j in range(j1, j2)]
    else:
        sys.exit(f"steps removed or reshuffled ({tag} {i1}:{i2} → {j1}:{j2}): not handled, rebuild that part by hand")

def swap(old, new, start=0, stop=None, what=""):
    global done
    for p in body[start:stop]:
        if norm(old) in ptext(p):
            assert replace_in(p, old, new), what
            done += 1
            return body.index(p)
    missed.append(what or old[:40])

def style(e):
    ps = e.find(qn("w:pPr")); st = ps.find(qn("w:pStyle")) if ps is not None else None
    return st.get(qn("w:val")) if st is not None else ""

# Each changed step: its title, explanation, actions and result, looked up after its own heading — the
# headings by place, as titles repeat («مُقدَّم») and a step's text may itself begin «الخطوة الأولى»
heads = [i for i, p in enumerate(body) if style(p) == "Heading3" and ptext(p).startswith("الخطوة ")]
assert len(heads) == len(O_STEPS), "one heading per step of the old text"
for a, b in pairs:
    if a == b: continue
    k = next(i for i, s in enumerate(O_STEPS) if s is a)
    h, nxt = heads[k], (heads[k + 1] if k + 1 < len(heads) else len(body))
    if not ptext(body[h]).endswith(norm(a["t"])): missed.append("heading " + a["t"]); continue
    if a["t"] != b["t"]: swap(a["t"], b["t"], h, h + 1, "title " + a["t"])
    if a["x"] != b["x"]: swap(a["x"], b["x"], h + 1, nxt, "text " + a["t"])
    for oa, ob in zip(a["do"], b["do"]):
        if oa != ob: swap(oa, ob, h + 1, nxt, "do " + a["t"])
    for k in ("r", "note", "warn", "tip"):
        if a[k] != b[k] and a[k] and b[k]: swap(a[k], b[k], h + 1, nxt, f"{k} " + a["t"])

# ── new steps: a copy of the step before, with its own text and picture; the steps and figures after move on ──
def step_heading(title):
    return next(e for e in doc.element.body if e.tag == qn("w:p") and style(e) == "Heading3" and ptext(e).startswith("الخطوة ") and ptext(e).endswith(norm(title)))

def block_of(h):
    els, e = [h], h.getnext()
    while e is not None and not style(e).startswith("Heading") and e.find(".//" + qn("w:br")) is None:
        els.append(e); e = e.getnext()
    return els

def caption_of(key):
    return next(e["caption"] for e in tracked if e["key"] == key)

new_pics = 0
for prev, new in inserted:
    old_prev = next(o for o, c in pairs if c is prev)
    assert old_prev["img"] and new["img"], "a new step is built on a step with a picture, and has one"
    assert not any(old_prev[k] or new[k] for k in ("note", "warn", "tip")), "callouts in a new step are not handled"
    h = step_heading(prev["t"])
    blk = block_of(h)
    dup = [copy.deepcopy(e) for e in blk]
    num = int(re.match(r"الخطوة (\d+):", ptext(h)).group(1))
    fig = int(re.match(r"صورة (\d+):", next(ptext(e) for e in blk if ptext(e).startswith("صورة "))).group(1))
    # heading, explanation, caption, result
    assert replace_in(dup[0], f"الخطوة {num}: {prev['t']}", f"الخطوة {num + 1}: {new['t']}")
    assert replace_in(dup[1], prev["x"], new["x"])
    cap = next(e for e in dup if ptext(e).startswith("صورة "))
    assert replace_in(cap, f"صورة {fig}: {caption_of(prev['img'])}", f"صورة {fig + 1}: {cap_man[new['img']]['caption']}")
    res = next(e for e in dup if ptext(e).startswith("النتيجة المتوقعة: "))
    assert replace_in(res, prev["r"], new["r"])
    # the actions: as many bullets as the new step has
    bullets = [e for e in dup if style(e) == "ListBullet"]
    while len(bullets) < len(new["do"]):
        b2 = copy.deepcopy(bullets[-1]); dup.insert(dup.index(bullets[-1]) + 1, b2); bullets.append(b2)
    for b2 in bullets[len(new["do"]):]:
        dup.remove(b2)
    for b2, text in zip(bullets, new["do"]):
        assert replace_in(b2, ptext(b2), text)
    # its own picture, with fresh drawing ids
    rid, _ = doc.part.get_or_add_image(io.BytesIO(jpeg(new["img"])))
    pic = next(e for e in dup if e.find(".//" + qn("a:blip")) is not None)
    pic.find(".//" + qn("a:blip")).set(qn("r:embed"), rid)
    top = max(int(d.get("id")) for d in doc.element.body.iter(qn("wp:docPr")))
    for d in pic.iter(qn("wp:docPr")): d.set("id", str(top + 1))
    # in place, after the step it follows
    after = blk[-1]
    for e in dup:
        after.addnext(e); after = e
    # the steps after it in this chapter, and every figure after it, move on by one
    e = after.getnext()
    while e is not None and style(e) != "Heading1":
        if style(e) == "Heading3" and (m := re.match(r"الخطوة (\d+):", ptext(e))):
            replace_in(e, f"الخطوة {m.group(1)}:", f"الخطوة {int(m.group(1)) + 1}:")
        e = e.getnext()
    for e in after.itersiblings():
        if e.tag == qn("w:p") and (m := re.match(r"صورة (\d+):", ptext(e))):
            replace_in(e, f"صورة {m.group(1)}:", f"صورة {int(m.group(1)) + 1}:")
    # and in the capture record, after the shot it follows
    i = next(k for k, e in enumerate(tracked) if e["key"] == prev["img"])
    tracked.insert(i + 1, {**cap_man[new["img"]]})
    new_pics += 1
    done += 1
    print("added step:", new["t"], "after", prev["t"])
body = list(doc.element.body.iter(qn("w:p")))

# ── pictures: one per step with a picture, after the cover logo ──
order = [s["img"] for s in steps(C) if s["img"]]
blips = list(doc.element.body.iter(qn("a:blip")))
print("pictures in docx:", len(blips), "steps with pictures:", len(order))
assert len(blips) == len(order) + 1, "the cover logo plus one picture per step"
for k in [k for k in KEYS if k not in {n["img"] for _, n in inserted}]:
    i = order.index(k) + 1
    part = doc.part.related_parts[blips[i].get(qn("r:embed"))]
    im = Image.open(CAP / "shots" / cap_man[k]["file"]).convert("RGB"); im.thumbnail((1600, 1600))
    buf = io.BytesIO(); im.save(buf, "JPEG", quality=82, optimize=True)
    print(f"{k}: {len(part.blob)} -> {len(buf.getvalue())}")
    part._blob = buf.getvalue()


# Captions of the swapped pictures
by_key, by_n = {e["key"]: e for e in tracked}, {e["n"]: e for e in tracked}
for k in KEYS:
    if k in {n["img"] for _, n in inserted}: continue
    new_e = cap_man[k]
    old_e = by_key.get(k) or by_n[new_e["n"]]  # a renamed shot keeps its place
    if old_e["caption"] != new_e["caption"]:
        swap(old_e["caption"], new_e["caption"], what="caption " + k)
    old_e.update(key=new_e["key"], caption=new_e["caption"])
# numbered in capture order, as a full capture would number them
for n, e in enumerate(tracked, 1):
    e.update(n=n, file=f"{n:03d}-{e['key']}.png")
(ROOT / "manifest.json").write_text(json.dumps(tracked, ensure_ascii=False, indent=1), "utf-8")

# FAQ: question and answer
for (oq, oa), (nq, na) in zip(O.FAQ, C.FAQ):
    if (oq, oa) == (nq, na): continue
    i = swap(oq, nq, what="faq " + oq)
    if i is not None: swap(oa, na, i + 1, i + 3, "faq answer " + oq)

# The appendix tables (season dates, fees, rules…): a changed row is found by its old cells
cell_text = lambda tc: norm("".join(t.text or "" for t in tc.iter(qn("w:t")))).strip()
for ot, nt in zip(O.APPENDICES, C.APPENDICES):
    if ot["rows"] == nt["rows"] or len(ot["rows"]) != len(nt["rows"]): continue
    for orow, nrow in zip(ot["rows"], nt["rows"]):
        if orow == nrow: continue
        hit = False
        for tr in doc.element.body.iter(qn("w:tr")):
            cells = list(tr.iter(qn("w:tc")))
            if len(cells) == len(orow) and all(cell_text(tc) == norm(o) for tc, o in zip(cells, orow)):
                for tc, o, n in zip(cells, orow, nrow):
                    if o != n: assert replace_in(next(tc.iter(qn("w:p"))), o, n), o
                done += 1; hit = True
                break
        if not hit: missed.append("table row " + str(orow[0]))

print("text replaced:", done, "| missed:", missed)
doc.save(str(DOCX))
print("saved", DOCX.name)
