# -*- coding: utf-8 -*-
"""Pilgrim guide, second pass: the officer (not the cluster head) puts the group on its flights, and the whole
group travels together. Swap three screenshots and fix one sentence, in the user's own .docx."""
import sys, shutil, json
from pathlib import Path
from PIL import Image
from docx import Document
from docx.oxml.ns import qn
sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))
import content as C

DOCX = Path(r"C:/Users/ASUS/Documents/المنصة الوطنية/projects/docs/دليل-الحاج-لاستخدام-المنصة/دليل-الحاج-لاستخدام-المنصة.docx")
OLD = " يسندكم رئيس تكتلكم إلى رحلتي الذهاب والعودة، فتظهر البطاقتان هنا بعد صدور التأشيرة. وإذا تغيّر موعد الرحلة أو أُجّلت يتغير ما في البطاقة ويصلك إشعار. الأسرة كلها على الرحلة نفسها."
NEW = " تضع إدارة الحج مجموعتكم كاملة على رحلة ذهاب ورحلة عودة، فتظهر البطاقتان هنا بعد صدور التأشيرة. كل أفراد المجموعة، ومعهم أسرتك، على الرحلة نفسها، وإذا تغيّر موعد الرحلة أو أُجّلت يتغير ما في البطاقة ويصلك إشعار."
SWAP = {"post-visa-progress": "027-post-visa-progress.png", "post-visa-done": "028-post-visa-done.png", "dossier-flights": "030-dossier-flights.png"}

shutil.copy(DOCX, ROOT / "backup-flights-pilgrim" / "guide-before-staffonly.docx")
man = {e["key"]: e for e in json.loads((ROOT / "manifest.json").read_text("utf-8"))}
for k, src in SWAP.items():
    dst = ROOT / "shots" / man[k]["file"]
    shutil.copy(ROOT / "ptmp2" / "shots" / src, dst)
    im = Image.open(dst).convert("RGB"); im.thumbnail((1600, 1600)); im.save(ROOT / "jpg" / (dst.stem + ".jpg"), quality=82, optimize=True)

order = [s["img"] for ch in C.CHAPTERS for sec in ch["sections"] for s in sec["steps"] if s["img"]]
doc = Document(str(DOCX))
blips = list(doc.element.body.iter(qn("a:blip")))
assert len(blips) == len(order) + 1
for k in SWAP:
    part = doc.part.related_parts[blips[order.index(k) + 1].get(qn("r:embed"))]
    part._blob = (ROOT / "jpg" / (Path(man[k]["file"]).stem + ".jpg")).read_bytes()
    print("picture swapped:", k)

n = 0
for t in doc.element.body.iter(qn("w:t")):
    if t.text and OLD.strip() in t.text:
        t.text = t.text.replace(OLD.strip(), NEW.strip()); n += 1
print("sentence replaced:", n)
doc.save(str(DOCX))

src = (ROOT / "content.py").read_text("utf-8")
assert src.count(OLD) == 1
(ROOT / "content.py").write_text(src.replace(OLD, NEW), "utf-8")
print("content.py updated")
