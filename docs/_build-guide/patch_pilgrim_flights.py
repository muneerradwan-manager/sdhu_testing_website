# -*- coding: utf-8 -*-
"""Pilgrim guide after the flights module: swap four screenshots in place and fix the flight numbers in the
text, inside the user's own .docx (it carries his direction fixes, so it is patched, not rebuilt)."""
import sys, shutil, copy, json, re
from pathlib import Path
from docx import Document
from docx.oxml.ns import qn
sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))
import content as C

DOCX = Path(r"C:/Users/ASUS/Documents/المنصة الوطنية/projects/docs/دليل-الحاج-لاستخدام-المنصة/دليل-الحاج-لاستخدام-المنصة.docx")
KEYS = ["post-visa-done", "dossier-flights", "season-now", "return-day"]
ADD = " يسندكم رئيس تكتلكم إلى رحلتي الذهاب والعودة، فتظهر البطاقتان هنا بعد صدور التأشيرة. وإذا تغيّر موعد الرحلة أو أُجّلت يتغير ما في البطاقة ويصلك إشعار. الأسرة كلها على الرحلة نفسها."

shutil.copy(DOCX, ROOT / "backup-flights-pilgrim" / "guide-before.docx")
man = {e["key"]: e for e in json.loads((ROOT / "manifest.json").read_text("utf-8"))}
order = [s["img"] for ch in C.CHAPTERS for sec in ch["sections"] for s in sec["steps"] if s["img"]]
doc = Document(str(DOCX))
blips = list(doc.element.body.iter(qn("a:blip")))
print("pictures in docx:", len(blips), "steps with pictures:", len(order))
assert len(blips) == len(order) + 1, "the cover logo plus one picture per step"
for k in KEYS:
    i = order.index(k) + 1
    rid = blips[i].get(qn("r:embed"))
    part = doc.part.related_parts[rid]
    new = (ROOT / "jpg" / (Path(man[k]["file"]).stem + ".jpg")).read_bytes()
    print(k, "->", part.partname, len(part.blob), "->", len(new))
    part._blob = new

n = 0
for p in doc.element.body.iter(qn("w:p")):
    for t in p.iter(qn("w:t")):
        if t.text and "1448-07" in t.text:
            t.text = t.text.replace("1448-07R", "RB 508").replace("1448-07", "RB 507"); n += 1
print("flight numbers fixed:", n)

# one more sentence on the boarding-pass step
target = next(s for ch in C.CHAPTERS for sec in ch["sections"] for s in sec["steps"] if s["img"] == "dossier-flights")
head = target["x"][:40]
done = False
for p in doc.paragraphs:
    if p.text.startswith(head) and ADD.strip()[:30] not in p.text:
        last = p.runs[-1]
        r = copy.deepcopy(last._r)
        for t in r.findall(qn("w:t")): r.remove(t)
        from docx.oxml import OxmlElement
        t = OxmlElement("w:t"); t.set(qn("xml:space"), "preserve"); t.text = ADD; r.append(t)
        rpr = r.find(qn("w:rPr"))
        if rpr is not None and rpr.find(qn("w:rtl")) is None: rpr.append(OxmlElement("w:rtl"))
        last._r.addnext(r); done = True; break
print("sentence added:", done)
doc.save(str(DOCX))

# keep the content module in step, for any later rebuild
src = (ROOT / "content.py").read_text("utf-8")
src2 = src.replace("1448-07R", "RB 508").replace("1448-07", "RB 507")
if ADD.strip()[:30] not in src2:
    i = src2.index('"dossier-flights"'); j = src2.rfind('S("', 0, i)
    seg = src2[j:i]
    k = seg.rfind('", ')  # end of the explanation string
    seg = seg[:k] + ADD.replace('"', "'") + seg[k:]
    src2 = src2[:j] + seg + src2[i:]
(ROOT / "content.py").write_text(src2, "utf-8")
print("content.py updated")
