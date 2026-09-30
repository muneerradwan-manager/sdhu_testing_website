# -*- coding: utf-8 -*-
"""Microsoft Print to PDF drops hyperlinks. Re-add a clickable area over every printed copy of the url.
Usage: python pdf_links.py <guide.pdf> <url> [first_pages=8]"""
import sys, pymupdf, os
sys.stdout.reconfigure(encoding="utf-8")
pdf, url = sys.argv[1], sys.argv[2]
n = int(sys.argv[3]) if len(sys.argv) > 3 else 8
doc = pymupdf.open(pdf)
key = "muneerradwan"  # start of the host, always on the url line
added = 0
for i in range(min(n, len(doc))):
    pg = doc[i]
    for l in pg.get_links():
        if l.get("uri") == url: pg.delete_link(l)
    words = pg.get_text("words")
    for w in words:
        if key in w[4]:
            # the url's line: all words on the same baseline band
            line = [x for x in words if abs(x[3] - w[3]) < 2 and ("/" in x[4] or "." in x[4] or "http" in x[4] or "_" in x[4])]
            r = pymupdf.Rect(w[:4])
            for x in line: r |= pymupdf.Rect(x[:4])
            pg.insert_link({"kind": pymupdf.LINK_URI, "from": r, "uri": url}); added += 1
tmp = pdf + ".tmp"
doc.save(tmp, garbage=0, deflate=True); doc.close(); os.replace(tmp, pdf)
print("links added:", added)
