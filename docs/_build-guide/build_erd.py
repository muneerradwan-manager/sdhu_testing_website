# -*- coding: utf-8 -*-
"""The entity-relationship diagrams of the data model, drawn from the same source as the document (schema/):

    python build_erd.py              → erd/<NN-key>.png for the document, and the same as SVG in
                                       docs/هيكلية-قاعدة-البيانات/مخططات-ERD/ to open and zoom on screen

One diagram for the chapters and how they connect, then one per chapter: its tables with their keys, and the
tables of other chapters they point to, greyed. The links to seasons, staff_users and files are left out of the
chapter diagrams (nearly every table has them; the chapter's relations table lists them all).
Graphviz runs in the browser (viz.js), so neither machine needs it installed: only Playwright's Chromium."""
import sys, html
from pathlib import Path
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))
from schema import MODULES
from build_schema import effective_pk

PNG_DIR = ROOT / "erd"
SVG_DIR = ROOT.parent / "هيكلية-قاعدة-البيانات" / "مخططات-ERD"
VIZ = "https://cdn.jsdelivr.net/npm/@viz-js/viz@3.25.0/dist/viz-global.js"
UBIQUITOUS = {"seasons", "staff_users", "files"}
MODULE_OF = {t.name: m for m in MODULES for t in m.tables}
BY_NAME = {t.name: t for m in MODULES for t in m.tables}

GREEN, MAROON, GOLD, INK, SOFT, LINE = "#00594F", "#672146", "#AD9E6E", "#021526", "#555F6B", "#8C8C8C"
FONT = "Helvetica"


def file_stem(i, m):
    return f"{i:02d}-{m.key}"


def short_type(t):
    t = t.replace(" UNSIGNED", "").replace("VARCHAR", "VARCHAR")
    return t if len(t) <= 18 else t.split("(")[0] + "(…)"


def node(t, external=False):
    """An HTML-like Graphviz label: the table's name, then its key columns, each with a port the edges leave from"""
    e = html.escape
    if external:
        return (f'"{t.name}" [label=<<table border="0" cellborder="1" cellspacing="0" cellpadding="5" color="#BFBFBF">'
                f'<tr><td bgcolor="#EFEFEF"><font color="{SOFT}">{e(t.name)}</font></td></tr></table>>];')
    pk = effective_pk(t) or []
    rows = []
    for c in t.cols:
        is_fk = bool(c.fk_target()) and c.fk_target()[0] not in UBIQUITOUS
        if not (c.name in pk or is_fk or c.uq): continue
        mark = "PK" if c.name in pk else ("FK" if is_fk else "UQ")
        if c.name in pk and is_fk: mark = "PK FK"
        col = MAROON if mark.startswith("PK") else INK
        rows.append(f'<tr><td align="left" port="{e(c.name)}"><font color="{GOLD}">{mark}</font>  <font color="{col}">{e(c.name)}</font>'
                    f'  <font color="{SOFT}" point-size="9">{e(short_type(c.type))}{"?" if c.null else ""}</font></td></tr>')
    rest = len(t.cols) - len(rows)
    if rest > 0: rows.append(f'<tr><td align="left"><font color="{SOFT}" point-size="9">+ {rest} {"columns" if rest > 1 else "column"}</font></td></tr>')
    return (f'"{t.name}" [label=<<table border="0" cellborder="1" cellspacing="0" cellpadding="4" color="#D9C89E">'
            f'<tr><td bgcolor="{GREEN}"><font color="white"><b>{e(t.name)}</b></font></td></tr>{"".join(rows)}</table>>];')


def edge(t, c, target):
    """Crow's foot at the many side (the table holding the key); a bar for one-to-one; a circle when optional"""
    one = c.uq or [c.name] == (effective_pk(t) or [])
    tail = ("tee" if one else "crow") + ("odot" if c.null else "tee")
    return f'"{t.name}":"{c.name}" -> "{target}" [arrowtail={tail}, arrowhead=teetee, dir=both];'


def module_dot(m):
    own = {t.name for t in m.tables}
    lines = [f'digraph "{m.key}" {{', 'graph [rankdir=LR, nodesep=0.35, ranksep=0.9, bgcolor="white", pad=0.3, splines=true];',
             f'node [shape=plain, fontname="{FONT}", fontsize=11];', f'edge [color="{LINE}", penwidth=1.1, arrowsize=0.8];']
    externals, edges = [], []
    for t in m.tables:
        lines.append(node(t))
        for c in t.cols:
            tgt = c.fk_target()
            if not tgt or tgt[0] in UBIQUITOUS and tgt[0] not in own: continue
            if tgt[0] not in own and tgt[0] not in externals: externals.append(tgt[0])
            edges.append(edge(t, c, tgt[0]))
    for x in externals: lines.append(node(BY_NAME[x], external=True))
    return "\n".join(lines + edges + ["}"])


def overview_dot():
    """The chapters as boxes, and one line for every pair of chapters whose tables point into each other, as
    thick as the number of keys between them: faint for a single key, so the main paths stand out"""
    links = Counter()
    for m in MODULES:
        for t in m.tables:
            for c in t.cols:
                tgt = c.fk_target()
                if tgt and MODULE_OF[tgt[0]] is not m and tgt[0] not in UBIQUITOUS:
                    links[tuple(sorted((m.key, MODULE_OF[tgt[0]].key)))] += 1
    lines = ['graph overview {', 'graph [layout=neato, overlap=false, sep="+18", splines=true, bgcolor="white", pad=0.4, mode=major];',
             f'node [shape=box, style="rounded,filled", fillcolor="#F7F4EF", color="#D9C89E", fontname="{FONT}", fontsize=13, margin="0.25,0.12"];',
             f'edge [fontname="{FONT}", fontsize=10, fontcolor="{SOFT}"];']
    for i, m in enumerate(MODULES, 1):
        hub = sum(n for k, n in links.items() if m.key in k) >= 25
        fill = f', fillcolor="{GREEN}", fontcolor="white", color="{GREEN}"' if hub else ""
        lines.append(f'"{m.key}" [label=<<b>{i}. {m.key}</b><br/><font point-size="10">{len(m.tables)} tables</font>>{fill}];')
    for (a, b), n in links.items():
        style = f'color="#D0D0D0", penwidth=0.8' if n == 1 else f'color="{LINE}", penwidth={min(1 + n / 3, 5):.1f}, label="{n}"'
        lines.append(f'"{a}" -- "{b}" [{style}, len={2.2 if n == 1 else 1.6}];')
    for m in MODULES:  # a chapter linked only through seasons/staff/files would drift off: keep it near the core
        if not any(m.key in k for k in links): lines.append(f'"{m.key}" -- "{MODULES[0].key}" [style=invis, len=2.5];')
    return "\n".join(lines + ["}"])


def diagrams():
    """[(stem, title, dot)] in the document's order: the overview, then the chapters"""
    out = [("00-overview", "الفصول والعلاقات بينها", overview_dot())]
    for i, m in enumerate(MODULES, 1): out.append((file_stem(i, m), m.title, module_dot(m)))
    return out


def viz_script():
    """viz.js, fetched once and kept next to the PNGs"""
    cached = PNG_DIR / VIZ.rsplit("/", 1)[1].replace(".js", "-" + VIZ.split("@")[2].split("/")[0] + ".js")
    if not cached.exists():
        import urllib.request
        PNG_DIR.mkdir(exist_ok=True)
        cached.write_bytes(urllib.request.urlopen(VIZ).read())
    return cached.read_text("utf-8")


def stale(items=None, png_dir=PNG_DIR):
    """The drawings whose source changed since they were drawn (or that were never drawn)"""
    return [stem for stem, _, dot in (items if items is not None else diagrams())
            if not (png_dir / f"{stem}.png").exists() or not (png_dir / f"{stem}.dot").exists()
            or (png_dir / f"{stem}.dot").read_text("utf-8") != dot]


def render(items, png_dir=PNG_DIR, svg_dir=SVG_DIR):
    """Draws [(stem, title, dot)]: a PNG for the Word document, the SVG to zoom on screen, and the dot it came from"""
    from playwright.sync_api import sync_playwright
    png_dir.mkdir(exist_ok=True); svg_dir.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(device_scale_factor=2)
        # viz.js resolves its own URL against the page's, which about:blank cannot give it: a file page can
        blank = PNG_DIR / "blank.html"
        blank.write_text("<html><body style='margin:0;background:white'><div id=o></div></body></html>", "utf-8")
        page.goto(blank.as_uri())
        page.add_script_tag(content=viz_script())
        page.wait_for_function("window.Viz && Viz.instance")
        for stem, _, dot in items:
            svg = page.evaluate("async d => (await Viz.instance()).renderString(d, {format: 'svg'})", dot)
            (svg_dir / f"{stem}.svg").write_text(svg, "utf-8")
            (png_dir / f"{stem}.dot").write_text(dot, "utf-8")  # build_schema.py compares it, to refuse a stale drawing
            page.evaluate("s => document.getElementById('o').innerHTML = s", svg)
            page.locator("#o svg").screenshot(path=str(png_dir / f"{stem}.png"))
            print("drew", stem)
        b.close()


if __name__ == "__main__":
    render(diagrams())
