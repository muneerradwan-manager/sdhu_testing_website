# -*- coding: utf-8 -*-
"""Patch the pilgrim guide in place after a site change, inside the user's own .docx — it carries his direction
fixes, so it is patched, never rebuilt:

  - every text the change touched: chapter titles and introductions, section titles, step titles,
    explanations, actions, results, notes/warnings/tips, captions, the FAQ, the journey table and the
    appendix tables (rows changed or added);
  - a chapter whose sections or steps changed is reassembled from its own blocks: a kept step stays as it is
    (its text patched), a removed step goes, a moved step moves, and a new step or section is cloned from the
    guide's own formatting and filled with its text and picture;
  - the given screenshots swapped (their captions with them), the steps renumbered in each chapter and the
    figures throughout, and the tracked manifest.json rewritten in the guide's order.

    python patch_pilgrim.py <capture dir> <git rev> <key> [<key> ...]

<capture dir> holds manifest.json + shots/ from the capture runs (run them in a copy of this folder: run1.py
wipes the tracked manifest.json). <git rev> is a commit whose content.py still has the guide's text as the
.docx has it; the difference with the current content.py is what gets patched. The keys are the shots to swap
(every new step's shot is taken from the capture dir as well).
Used for: accommodation (4d5e007), sign-in and registration pages (4026ef2), the 3D tour (d6f7a25), the live
stream (baffdcd), the lottery by birth years (51da5d9), the cluster's coordinator (4c5f6db), and the seven steps
after acceptance with the account's pages (1d75d30).
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

# ───────────────────────── reading the document ─────────────────────────

tracked = json.loads((ROOT / "manifest.json").read_text("utf-8"))
# PATCH_OUT=<dir>: a dry run — the patched .docx and manifest.json are written there, the repository untouched
OUT = Path(__import__("os").environ["PATCH_OUT"]) if __import__("os").environ.get("PATCH_OUT") else None

def style(e):
    ps = e.find(qn("w:pPr")); st = ps.find(qn("w:pStyle")) if ps is not None else None
    return st.get(qn("w:val")) if st is not None else ""

ptext = lambda e: norm("".join(t.text or "" for t in e.iter(qn("w:t"))))
is_p = lambda e: e.tag == qn("w:p")
skey = lambda s: s["img"] or "t:" + s["t"]
acts = lambda s: [d for d in s["do"] if d.strip() not in ("—", "")]
res = lambda s: s["r"] if s["r"] and s["r"].strip() != "—" else None
CALLOUTS = (("warn", "تنبيه"), ("note", "ملاحظة"), ("tip", "نصيحة"))
missed = []

def text_runs(p):
    return [r for r in p.iter(qn("w:r")) if r.find(qn("w:t")) is not None]

def set_para(p, text, keep=0):
    """The paragraph's text after its first `keep` runs (a label such as «النتيجة المتوقعة: »), in its own formatting"""
    runs = text_runs(p)
    first = runs[keep]
    set_text(first, text)
    for r in runs[keep + 1:]:
        r.getparent().remove(r)
    _split_ltr(Run(first, None))

def swap_text(e, old, new, what):
    if old == new: return
    if not replace_in(e, old, new): missed.append(what)

def chapters():
    """Each chapter: its heading, its introduction, and its parts — a section heading or a step's block, each a list"""
    els = list(doc.element.body)
    heads = [i for i, e in enumerate(els) if is_p(e) and style(e) == "Heading1" and re.match(r"الفصل \d+:", ptext(e))]
    out = []
    for i in heads:
        j = next((n for n in range(i + 1, len(els)) if is_p(els[n]) and style(els[n]) == "Heading1"), len(els))
        part = els[i + 1:j]
        first = next(n for n, e in enumerate(part) if style(e) in ("Heading2", "Heading3"))
        units = []
        for e in part[first:]:
            if style(e) == "Heading2": units.append(["sec", [e]])
            elif style(e) == "Heading3": units.append(["step", [e]])
            else: units[-1][1].append(e)
        out.append({"head": els[i], "intro": part[:first], "units": units})
    return out

# ───────────────────────── templates, from the guide itself ─────────────────────────

ALL = list(doc.element.body)
def first(pred):
    return next(e for e in ALL if pred(e))
T_H2 = first(lambda e: is_p(e) and style(e) == "Heading2")
T_H3 = first(lambda e: is_p(e) and style(e) == "Heading3" and ptext(e).startswith("الخطوة "))
T_X = T_H3.getnext()
T_PIC = first(lambda e: is_p(e) and e.find(".//" + qn("a:blip")) is not None and re.match(r"صورة \d+:", ptext(e.getnext()) if e.getnext() is not None else ""))
T_CAP = T_PIC.getnext()
T_LABEL = first(lambda e: is_p(e) and ptext(e) == "ما يجب عليك فعله:")
T_BULLET = first(lambda e: is_p(e) and style(e) == "ListBullet")
T_RES = first(lambda e: is_p(e) and ptext(e).startswith("النتيجة المتوقعة: "))
T_CALL = {}
for kind, label in CALLOUTS:
    t = first(lambda e, l=label: e.tag == qn("w:tbl") and ptext(e).startswith(l + ": "))
    T_CALL[kind] = (t, t.getnext())
clone = copy.deepcopy

def jpeg_of(key):
    im = Image.open(CAP / "shots" / cap_man[key]["file"]).convert("RGB"); im.thumbnail((1600, 1600))
    buf = io.BytesIO(); im.save(buf, "JPEG", quality=82, optimize=True)
    return buf.getvalue(), im.size

def set_picture(pic, key):
    """The picture paragraph shows this capture: a fresh image, its height by the shot's proportions"""
    data, (w, h) = jpeg_of(key)
    rid, _ = doc.part.get_or_add_image(io.BytesIO(data))
    pic.find(".//" + qn("a:blip")).set(qn("r:embed"), rid)
    ext = pic.find(".//" + qn("wp:extent"))
    cy = str(int(int(ext.get("cx")) * h / w))
    ext.set("cy", cy)
    for x in pic.iter(qn("a:ext")):
        if x.get("cx"): x.set("cy", cy)
    top = max(int(d.get("id")) for d in doc.element.body.iter(qn("wp:docPr")))
    for d in pic.iter(qn("wp:docPr")): d.set("id", str(top + 1))

def caption_text(key):
    return cap_man[key]["caption"] if key in cap_man else next(e["caption"] for e in tracked if e["key"] == key)

def callout(kind, text):
    t, sp = clone(T_CALL[kind][0]), clone(T_CALL[kind][1])
    set_para(next(t.iter(qn("w:p"))), text, keep=1)
    return [t, sp]

def new_step(s):
    blk = [clone(T_H3), clone(T_X)]
    set_para(blk[0], f"الخطوة 0: {s['t']}")
    set_para(blk[1], s["x"])
    if s["img"]:
        pic, cap = clone(T_PIC), clone(T_CAP)
        set_picture(pic, s["img"]); set_para(cap, f"صورة 0: {caption_text(s['img'])}")
        blk += [pic, cap]
    if acts(s):
        blk.append(clone(T_LABEL))
        for d in acts(s):
            b = clone(T_BULLET); set_para(b, d); blk.append(b)
    if res(s):
        r = clone(T_RES); set_para(r, res(s), keep=1); blk.append(r)
    for kind, _ in CALLOUTS:
        if s[kind]: blk += callout(kind, s[kind])
    print("  new step:", s["t"])
    return blk

def drop(blk, e):
    """Out of the step and out of the document"""
    blk.remove(e)
    if e.getparent() is not None: e.getparent().remove(e)

def patch_step(blk, a, b):
    """A kept step's texts, from the old to the new: title, explanation, actions, result, callouts"""
    swap_text(blk[0], a["t"], b["t"], "title " + a["t"])
    swap_text(blk[1], a["x"], b["x"], "text " + a["t"])
    # actions: as many bullets as the new step has, after the label (or a label and bullets where there were none)
    if acts(a) != acts(b):
        bullets = [e for e in blk if is_p(e) and style(e) == "ListBullet"]
        label = next((e for e in blk if is_p(e) and ptext(e) == "ما يجب عليك فعله:"), None)
        if not acts(b):
            for e in bullets + ([label] if label is not None else []): drop(blk, e)
        else:
            if label is None:
                at = next(i for i, e in enumerate(blk) if is_p(e) and re.match(r"صورة \d+:", ptext(e))) + 1 if any(is_p(e) and re.match(r"صورة \d+:", ptext(e)) for e in blk) else 2
                label = clone(T_LABEL); blk.insert(at, label)
            where = blk.index(bullets[-1]) + 1 if bullets else blk.index(label) + 1
            for e in bullets: drop(blk, e)
            where = blk.index(label) + 1
            for d in acts(b):
                e = clone(bullets[0] if bullets else T_BULLET); set_para(e, d); blk.insert(where, e); where += 1
    # the result
    if res(a) != res(b):
        r = next((e for e in blk if is_p(e) and ptext(e).startswith("النتيجة المتوقعة: ")), None)
        if r is not None and res(b): swap_text(r, res(a), res(b), "result " + a["t"])
        elif r is not None: drop(blk, r)
        else:
            r = clone(T_RES); set_para(r, res(b), keep=1)
            calls = [i for i, e in enumerate(blk) if e.tag == qn("w:tbl")]
            blk.insert(calls[0] if calls else len(blk), r)
    # the callouts, in their order: warning, note, tip
    for kind, label in CALLOUTS:
        if a[kind] == b[kind]: continue
        t = next((e for e in blk if e.tag == qn("w:tbl") and ptext(e).startswith(label + ": ")), None)
        if t is not None and b[kind]:
            swap_text(next(t.iter(qn("w:p"))), a[kind], b[kind], f"{kind} " + a["t"])
        elif t is not None:
            i = blk.index(t); drop(blk, t)
            if i < len(blk) and is_p(blk[i]) and not ptext(blk[i]): drop(blk, blk[i])
        else:
            order = [k for k, _ in CALLOUTS]
            after = [e for e in blk if e.tag == qn("w:tbl") and any(ptext(e).startswith(l + ": ") for k, l in CALLOUTS if order.index(k) > order.index(kind))]
            at = blk.index(after[0]) if after else len(blk)
            for e in reversed(callout(kind, b[kind])): blk.insert(at, e)

# ───────────────────────── the chapters ─────────────────────────

CH = chapters()
assert len(CH) == len(O.CHAPTERS) == len(C.CHAPTERS), "one chapter in the guide for each chapter of the old text"
strip_no = lambda t: re.sub(r"^الخطوة \d+: ", "", norm(t))
for ch, oc, cc in zip(CH, O.CHAPTERS, C.CHAPTERS):
    secs = [u for u in ch["units"] if u[0] == "sec"]
    steps_ = [u for u in ch["units"] if u[0] == "step"]
    assert [ptext(u[1][0]) for u in secs] == [norm(x["title"]) for x in oc["sections"]], "sections of " + oc["title"]
    assert len(steps_) == sum(len(x["steps"]) for x in oc["sections"]), "steps of " + oc["title"]
    swap_text(ch["head"], oc["title"], cc["title"], "chapter " + oc["title"])
    if oc.get("intro") != cc.get("intro"):
        swap_text(next(e for e in ch["intro"] if is_p(e) and ptext(e)), oc["intro"], cc["intro"], "intro " + oc["title"])
    o_steps = [s for x in oc["sections"] for s in x["steps"]]
    blocks = list(zip(o_steps, [u[1] for u in steps_]))
    same = [(x["title"], [skey(s) for s in x["steps"]]) for x in oc["sections"]] == [(x["title"], [skey(s) for s in x["steps"]]) for x in cc["sections"]]
    if same:
        c_steps = [s for x in cc["sections"] for s in x["steps"]]
        for (a, blk), b in zip(blocks, c_steps):
            if a != b: patch_step(blk, a, b)
        seq = [e for u in ch["units"] for e in u[1]]
    else:
        print("reassembling:", cc["title"])
        sm = difflib.SequenceMatcher(None, [strip_no(x["title"]) for x in oc["sections"]], [strip_no(x["title"]) for x in cc["sections"]], autojunk=False)
        kept = {}
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            if tag == "equal" or (tag == "replace" and i2 - i1 == j2 - j1):
                kept.update(zip(range(j1, j2), range(i1, i2)))
        by_key = {}
        for a, blk in blocks: by_key.setdefault(skey(a), []).append((a, blk))
        seq = []
        for j, x in enumerate(cc["sections"]):
            if j in kept:
                head_els = secs[kept[j]][1]
                swap_text(head_els[0], oc["sections"][kept[j]]["title"], x["title"], "section " + x["title"])
            else:
                h = clone(T_H2); set_para(h, x["title"]); head_els = [h]
                print("  new section:", x["title"])
            seq += head_els
            for s in x["steps"]:
                if by_key.get(skey(s)):
                    a, blk = by_key[skey(s)].pop(0)
                    if a != s: patch_step(blk, a, s)
                    seq += blk
                else:
                    seq += new_step(s)
        gone = [skey(a) for v in by_key.values() for a, _ in v]
        print("  removed:", gone)
    # in place: the chapter's parts, in their new order, after its introduction
    for u in ch["units"]:
        for e in u[1]:
            if e.getparent() is not None: e.getparent().remove(e)
    anchor = ch["intro"][-1] if ch["intro"] else ch["head"]
    for e in seq:
        anchor.addnext(e); anchor = e

# ───────────────────────── pictures, captions, numbers ─────────────────────────

CH = chapters()
c_order = [s for cc in C.CHAPTERS for x in cc["sections"] for s in x["steps"]]
step_blocks = [u[1] for ch in CH for u in ch["units"] if u[0] == "step"]
assert len(step_blocks) == len(c_order), (len(step_blocks), len(c_order))
new_keys = {s["img"] for s in c_order if s["img"]} - {e["key"] for e in tracked}
swapped = 0
for s, blk in zip(c_order, step_blocks):
    assert ptext(blk[0]).endswith(norm(s["t"])), ("step out of place", s["t"], ptext(blk[0]))
    if not s["img"] or s["img"] in new_keys or s["img"] not in KEYS: continue
    pic = next(e for e in blk if is_p(e) and e.find(".//" + qn("a:blip")) is not None)
    set_picture(pic, s["img"])
    cap = pic.getnext()
    set_para(cap, f"صورة 0: {cap_man[s['img']]['caption']}")
    swapped += 1
# steps numbered in each chapter, figures throughout
for ch in CH:
    n = 0
    for u in ch["units"]:
        if u[0] == "step":
            n += 1
            h = u[1][0]
            m = re.match(r"الخطوة (\d+):", ptext(h))
            if m.group(1) != str(n): assert replace_in(h, f"الخطوة {m.group(1)}:", f"الخطوة {n}:")
fig = 0
for e in doc.element.body.iter(qn("w:p")):
    m = re.match(r"صورة (\d+):", ptext(e))
    if m:
        fig += 1
        if m.group(1) != str(fig): assert replace_in(e, f"صورة {m.group(1)}:", f"صورة {fig}:")
blips = list(doc.element.body.iter(qn("a:blip")))
pictured = [s for s in c_order if s["img"]]
print("pictures:", len(blips), "| steps with pictures:", len(pictured), "| figures:", fig, "| swapped:", swapped, "| new:", sorted(new_keys))
assert len(blips) == len(pictured) + 1 == fig + 1, "the cover logo plus one picture per step"

# the capture record, in the guide's order
by_key = {e["key"]: e for e in tracked}
out = []
for n, s in enumerate(pictured, 1):
    e = dict(cap_man[s["img"]] if (s["img"] in KEYS or s["img"] in new_keys) else by_key[s["img"]])
    e.update(n=n, key=s["img"], file=f"{n:03d}-{s['img']}.png")
    out.append(e)
((OUT or ROOT) / "manifest.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), "utf-8")

# ───────────────────────── the FAQ and the tables ─────────────────────────

paras = list(doc.element.body.iter(qn("w:p")))
assert len(O.FAQ) == len(C.FAQ), "FAQ entries added or removed: not handled"
for (oq, oa), (nq, na) in zip(O.FAQ, C.FAQ):
    if (oq, oa) == (nq, na): continue
    i = next((k for k, p_ in enumerate(paras) if ptext(p_) == norm(oq)), None)
    if i is None: missed.append("faq " + oq); continue
    swap_text(paras[i], oq, nq, "faq " + oq)
    swap_text(paras[i + 1], oa, na, "faq answer " + oq)

cell_text = lambda tc: norm("".join(t.text or "" for t in tc.iter(qn("w:t")))).strip()
def rows_of(tbl):
    return [r for r in tbl.iter(qn("w:tr"))]
def cells(tr):
    return list(tr.iter(qn("w:tc")))

# the journey table: a changed row is found by its old cells
for orow, nrow in zip(O.JOURNEY, C.JOURNEY):
    if orow == nrow: continue
    for tr in doc.element.body.iter(qn("w:tr")):
        cs = cells(tr)
        if len(cs) == 3 and [cell_text(c) for c in cs] == [norm(x) for x in orow]:
            for c, o, n_ in zip(cs, orow, nrow):
                if o != n_: swap_text(next(c.iter(qn("w:p"))), o, n_, "journey " + orow[1])
            break
    else:
        missed.append("journey row " + orow[1])

# the appendix tables: found by their old rows; a row changed in place, a row added cloned from its neighbour
for ot, nt in zip(O.APPENDICES, C.APPENDICES):
    if ot["rows"] == nt["rows"]: continue
    old = [[norm(x) for x in r] for r in ot["rows"]]
    tbl = next((t for t in doc.element.body.iter(qn("w:tbl")) if [[cell_text(c) for c in cells(tr)] for tr in rows_of(t)][-len(old):] == old), None)
    if tbl is None: missed.append("table " + ot.get("title", "")); continue
    trs = rows_of(tbl)[-len(old):]
    sm = difflib.SequenceMatcher(None, [r[0] for r in ot["rows"]], [r[0] for r in nt["rows"]], autojunk=False)
    placed = {}
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal" or (tag == "replace" and i2 - i1 == j2 - j1):
            placed.update(zip(range(j1, j2), range(i1, i2)))
    anchor = trs[0].getprevious()
    for tr in trs: tbl.remove(tr)
    for j, nrow in enumerate(nt["rows"]):
        if j in placed:
            tr = trs[placed[j]]; orow = ot["rows"][placed[j]]
            for c, o, n_ in zip(cells(tr), orow, nrow):
                if o != n_: set_para(next(c.iter(qn("w:p"))), n_)
        else:
            tr = clone(trs[min(j, len(trs) - 1)])
            for c, n_ in zip(cells(tr), nrow): set_para(next(c.iter(qn("w:p"))), n_)
            print("  new row:", nrow[0])
        anchor.addnext(tr); anchor = tr

# The pictures nothing shows any more (swapped or removed) leave the file
used = {x.get(qn("r:embed")) for x in doc.element.body.iter(qn("a:blip"))}
dropped = 0
for rid, rel in list(doc.part.rels.items()):
    if rel.reltype.endswith("/image") and rid not in used:
        doc.part.drop_rel(rid); dropped += 1
print("unused pictures dropped:", dropped)

print("missed:", missed)
saved = (OUT / DOCX.name) if OUT else DOCX
doc.save(str(saved))
print("saved", saved)
