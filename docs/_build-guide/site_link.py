# -*- coding: utf-8 -*-
"""Clickable link to the live demo in a guide: one line on the cover, one sentence at the end of the introduction.

Used by build_docx.py when a guide is built, and by add_site_link.py to add the link to a guide that already
exists (the pilgrim guide carries the user's own direction fixes, so it is patched rather than rebuilt).
Each new paragraph copies the paragraph properties of the one it follows, so alignment and RTL stay as set."""
import copy
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.opc.constants import RELATIONSHIP_TYPE as RT
from docx.text.paragraph import Paragraph

LINK_COLOR = "289E92"


def _run(text, rpr_src, rtl, color=None, size_half_pts=None, underline=False, bold=None):
    r = OxmlElement("w:r")
    rpr = copy.deepcopy(rpr_src) if rpr_src is not None else OxmlElement("w:rPr")
    for tag in ("w:rtl", "w:color", "w:u", "w:rStyle"):
        for el in rpr.findall(qn(tag)):
            rpr.remove(el)
    if bold is not None:
        for tag in ("w:b", "w:bCs"):
            for el in rpr.findall(qn(tag)):
                rpr.remove(el)
            if bold:
                rpr.append(OxmlElement(tag))
    if size_half_pts:
        for tag in ("w:sz", "w:szCs"):
            for el in rpr.findall(qn(tag)):
                rpr.remove(el)
            e = OxmlElement(tag); e.set(qn("w:val"), str(size_half_pts)); rpr.append(e)
    if color:
        c = OxmlElement("w:color"); c.set(qn("w:val"), color); rpr.append(c)
    if underline:
        u = OxmlElement("w:u"); u.set(qn("w:val"), "single"); rpr.append(u)
    if rtl:
        rpr.append(OxmlElement("w:rtl"))
    _order(rpr)
    r.append(rpr)
    t = OxmlElement("w:t"); t.set(qn("xml:space"), "preserve"); t.text = text
    r.append(t)
    return r


# CT_RPr children must follow the schema order or Word may drop them
_RPR_ORDER = ["rStyle", "rFonts", "b", "bCs", "i", "iCs", "caps", "smallCaps", "strike", "dstrike", "outline", "shadow",
              "emboss", "imprint", "noProof", "snapToGrid", "vanish", "webHidden", "color", "spacing", "w", "kern",
              "position", "sz", "szCs", "highlight", "u", "effect", "bdr", "shd", "fitText", "vertAlign", "rtl", "cs",
              "em", "lang", "eastAsianLayout", "specVanish", "oMath"]


def _order(rpr):
    kids = list(rpr)
    for k in kids:
        rpr.remove(k)
    kids.sort(key=lambda e: _RPR_ORDER.index(e.tag.split("}")[1]) if e.tag.split("}")[1] in _RPR_ORDER else 99)
    for k in kids:
        rpr.append(k)


def _new_par_after(ref_el, ppr_src, parent):
    p = OxmlElement("w:p")
    if ppr_src is not None:
        p.append(copy.deepcopy(ppr_src))
    ref_el.addnext(p)
    return Paragraph(p, parent)


def link_after(ref: Paragraph, label: str, url: str, size_half_pts=None, bold=None, label_color=None, url_size=None):
    """Insert «label» and, on its own line under it, the url as a clickable hyperlink. Returns (label, url) paragraphs.
    The url sits on its own line so it never wraps mid-address, and is wrapped in LRM marks so the bidi paragraph
    keeps its trailing slash at the end instead of moving it to the front."""
    src = ref.runs[0]._r.rPr if ref.runs else None
    lab = _new_par_after(ref._p, ref._p.pPr, ref._parent)
    lab._p.append(_run(label, src, rtl=True, color=label_color, size_half_pts=size_half_pts, bold=bold))
    lnk = _new_par_after(lab._p, ref._p.pPr, ref._parent)
    rid = ref.part.relate_to(url, RT.HYPERLINK, is_external=True)
    h = OxmlElement("w:hyperlink"); h.set(qn("r:id"), rid); h.set(qn("w:history"), "1")
    h.append(_run("‎" + url + "‎", src, rtl=False, color=LINK_COLOR, size_half_pts=url_size or size_half_pts, underline=True, bold=False))
    lnk._p.append(h)
    return lab, lnk


def set_space_after(p: Paragraph, pts: float):
    ppr = p._p.get_or_add_pPr()
    sp = ppr.find(qn("w:spacing"))
    if sp is None:
        sp = OxmlElement("w:spacing"); ppr.append(sp)
    sp.set(qn("w:after"), str(int(pts * 20)))


def add_to_guide(doc, meta, intro):
    """Cover line under the tagline, and a sentence after the last introduction paragraph. Idempotent."""
    url = meta["site_url"]
    if any(url in (h.get(qn("r:id")) and doc.part.rels[h.get(qn("r:id"))].target_ref or "")
           for h in doc.element.body.iter(qn("w:hyperlink"))):
        return False
    ps = doc.paragraphs
    tag = next(p for p in ps if p.text.strip() == meta["tagline"].strip())
    sp = tag._p.pPr.find(qn("w:spacing")) if tag._p.pPr is not None else None
    after = sp.get(qn("w:after")) if sp is not None else None
    lab, lnk = link_after(tag, meta["site_cover_label"], url, size_half_pts=26, bold=True, label_color="672146", url_size=22)
    set_space_after(tag, 10); set_space_after(lab, 2)
    if after is not None:
        set_space_after(lnk, int(after) / 20)
    last = next(p for p in ps if p.text.strip() == intro[-1].strip())
    lab, lnk = link_after(last, meta["site_intro"], url)
    set_space_after(lab, 2)
    return True
