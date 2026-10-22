# -*- coding: utf-8 -*-
"""The roles, permissions and state machines document, from one source (docs/_build-guide/flows):

    python build_flows.py <out dir>          → draws the machines (flows-erd/ and the SVGs), then
                                               <out>/الأدوار-والصلاحيات.docx
    python build_flows.py --check            → only validates the content

Every reference is checked first, and nothing is written while one is wrong: src is a file and line of the site,
data a table or table.column of the model (schema/), a route a folder under app/, every system of the permission
catalog (lib/permissions.ts CATALOG, read by flows/catalog.py) is described once, and every transition joins two states
of its machine. Then finalize.ps1 updates the table of
contents and prints the PDF."""
import sys, re, html, datetime
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).parent
SITE = ROOT.parent.parent
sys.path.insert(0, str(ROOT))
from flows import ACTORS, PERMS, GRANTS, DEMO_ACCOUNTS, MACHINES, META, INTRO
from build_rules import check_src, check_data
from flows.catalog import SYSTEMS as CATALOG, BY_KEY, ALL_KEYS, VERB_LABEL, SCOPE_LABEL

OUT_NAME = "الأدوار-والصلاحيات"
PNG_DIR = ROOT / "flows-erd"
SVG_DIR = ROOT.parent / OUT_NAME / "مخططات-الحالات"


# ═══════════════ validation ═══════════════
def declared_permissions():
    """The systems of the permission catalog in lib/permissions.ts, in its order"""
    return [c.key for c in CATALOG]


def validate():
    errors = []
    refs = [(f"actor {a.key}", a.src, []) for a in ACTORS] + [(f"perm {p.key}", p.src, p.data) for p in PERMS]
    refs += [(f"machine {m.key}", m.src + [s for t in m.moves for s in t.src], [m.data]) for m in MACHINES]
    for where, srcs, data in refs:
        for s in srcs:
            e = check_src(s)
            if e: errors.append(f"{where}: {e}")
        for x in data:
            e = check_data(x)
            if e: errors.append(f"{where}: {e}")
    for p in PERMS:
        for r in p.routes:
            if not (SITE / r).is_dir(): errors.append(f"perm {p.key}: no folder {r}")
    keys = [p.key for p in PERMS]
    declared = declared_permissions()
    for k in declared:
        if k not in keys: errors.append(f"system {k} of lib/permissions.ts is not described")
    for k in keys:
        if keys.count(k) > 1: errors.append(f"system {k} described twice")
        if k not in declared: errors.append(f"system {k} is not in lib/permissions.ts CATALOG")
    if keys != [k for k in declared if k in keys]: errors.append("systems not in the catalog's order")
    for m in MACHINES:
        values = [s.value for s in m.states]
        if len(values) != len(set(values)): errors.append(f"machine {m.key}: duplicate state")
        if m.initial and m.initial not in values: errors.append(f"machine {m.key}: initial {m.initial} is not a state")
        for t in m.moves:
            for v in (t.a, t.b):
                if v != "*" and v not in values: errors.append(f"machine {m.key}: {t.a} → {t.b} uses unknown state {v}")
    return sorted(set(errors))


# ═══════════════ drawings ═══════════════
GREEN, MAROON, SOFT, LINE = "#00594F", "#672146", "#555F6B", "#8C8C8C"


def ar(s):
    """Arabic for a plain (centred) label, embedded right-to-left so «» and trailing marks stay in place. Plain
    labels, not HTML ones: Graphviz places HTML label text from its own estimate of the width, which it gets
    wrong for Arabic, so the text drifts off the middle of its box"""
    return "‫" + s.replace("\\", "\\\\").replace('"', '\\"') + "‬"


def machine_dot(m):
    """States as boxes (Arabic label over the stored value), each arrow numbered as its row in the transitions
    table; dashed when the system makes it; a double border on final states; «أي حالة» for moves from any"""
    lr = len(m.states) <= 6
    lines = [f'digraph "{m.key}" {{', f'graph [rankdir={"LR" if lr else "TB"}, nodesep=0.45, ranksep=0.6, bgcolor="white", pad=0.3];',
             'node [shape=box, style="rounded,filled", fillcolor="#F7F4EF", color="#D9C89E", fontname="Helvetica", fontsize=14, margin="0.3,0.12"];',
             f'edge [color="{LINE}", fontname="Helvetica", fontsize=12, fontcolor="{MAROON}", arrowsize=0.8];']
    if m.initial:
        lines.append(f'"__start" [shape=circle, style=filled, fillcolor="{GREEN}", color="{GREEN}", label="", width=0.22, fixedsize=true];')
        lines.append(f'"__start" -> "{m.initial}";')
    for s in m.states:
        extra = f', peripheries=2, fillcolor="#EAF4F2", color="{GREEN}"' if s.final else ""
        lines.append(f'"{s.value}" [label="{ar(s.label)}\\n{s.value}"{extra}];')
    if any(t.a == "*" for t in m.moves):
        lines.append(f'"__any" [label="{ar("أي حالة")}", style="rounded,dashed", fillcolor="white", fontcolor="{SOFT}"];')
    for n, t in enumerate(m.moves, 1):
        a = "__any" if t.a == "*" else t.a
        style = ', style=dashed' if t.auto else ""
        lines.append(f'"{a}" -> "{t.b}" [label=" {n} "{style}];')
    return "\n".join(lines + ["}"])


def diagrams():
    return [(f"{i:02d}-{m.key}", m.title, machine_dot(m)) for i, m in enumerate(MACHINES, 1)]


# ═══════════════ DOCX ═══════════════
import docgen as dg
from docgen import (Cm, WD_ALIGN_PARAGRAPH, GREEN as G_GREEN, GOLD, MAROON as G_MAROON, SOFT as G_SOFT,
                    add_text, add_code, para, heading, bullets, table, callout)


def meta_line(label, value, code=False, color=GOLD):
    p = para("", after=1, size=10, line=1.2)
    add_text(p, label + ": ", 10, True, color)
    if code: add_code(p, value, 8.5, False, G_SOFT)
    else: add_text(p, value, 10, False, G_SOFT)


def figure(stem, caption):
    import struct
    png = PNG_DIR / f"{stem}.png"
    w, h = struct.unpack(">II", png.read_bytes()[16:24])
    p = dg.doc.add_paragraph(); dg.bidi(p, WD_ALIGN_PARAGRAPH.CENTER); p.paragraph_format.keep_with_next = True
    if h / w > 20 / 17.4: p.add_run().add_picture(str(png), height=Cm(20))
    else: p.add_run().add_picture(str(png), width=Cm(min(17.4, w / 2 / 96 * 2.54)))
    para(caption, 9.5, False, G_SOFT, after=8, align=WD_ALIGN_PARAGRAPH.CENTER)


def build_docx(out_path):
    dg.new_document()
    dg.cover(META["title"], META["subtitle"], META["tagline"],
             [("الأطراف", str(len(ACTORS))), ("أنظمة بوابة الموظفين", str(len(PERMS))), ("الصلاحيات", str(len(ALL_KEYS))), ("دورات الحياة", str(len(MACHINES))), ("تاريخ الإعداد", datetime.date.today().strftime("%d/%m/%Y"))],
             "وثيقة تقنية لفريق التطوير. أسماء الأشخاص والأرقام الواردة أمثلةً مأخوذة من البيانات الوهمية للنسخة التجريبية.")
    dg.body_section(META["title"])

    heading("مقدمة", 1, before=0)
    for x in INTRO: para(x, after=8, line=1.35)
    heading("كيف تقرأ مخططات الحالات؟", 2)
    bullets([
        "كل مربع حالة: اسمها كما تعرضه المنصة، وتحته القيمة التي يخزنها الكود والعمود.",
        "الدائرة الخضراء الصغيرة بداية الدورة، والمربع ذو الإطار المزدوج حالة نهائية لا خروج منها.",
        "كل سهم يحمل رقماً هو رقم الانتقال في الجدول تحت المخطط، وفيه سببه ومن يملكه ومصدره في الكود.",
        "السهم المتقطع انتقال يقوم به النظام وحده (مهلة، أو حساب، أو موعد)، والمتصل يقوم به شخص.",
        "«أي حالة»: انتقال مسموح من كل الحالات، مثل الإلغاء أو السحب.",
    ])
    dg.toc()

    # ── part 1: actors ──
    heading("الجزء الأول: أطراف المنصة", 1, page_break=True, before=0)
    for a in ACTORS:
        heading(a.label, 2)
        para(a.text, after=4, line=1.35)
        if a.can:
            para("ما يستطيعه:", 11, True, G_GREEN, after=1)
            bullets(a.can, 10.5)
        if a.cannot:
            para("ما لا يستطيعه:", 11, True, G_MAROON, after=1, before=3)
            bullets(a.cannot, 10.5)
        if a.src: meta_line("المصدر", "  |  ".join(a.src), code=True)

    # ── part 2: staff permissions ──
    heading("الجزء الثاني: صلاحيات الموظفين", 1, page_break=True, before=0)
    heading("قواعد المنح", 2, before=4)
    bullets(GRANTS, 10.5)
    heading("الأنظمة", 2)
    table(["النظام", "المفتاح", "ملف إدارة", "الموارد", "الصلاحيات", "النطاق"],
          [[p.label, p.key, "نعم" if p.manages else "—", str(len(BY_KEY[p.key].resources)), str(len(BY_KEY[p.key].keys())),
            SCOPE_LABEL.get(BY_KEY[p.key].scope, "—") if BY_KEY[p.key].scope else "—"] for p in PERMS],
          [4.8, 2.6, 1.6, 1.6, 1.8, 4.6], size=9, code_cols=(1,))
    heading("الحسابات التجريبية", 2)
    para("ما يفتتح به كل حساب الموسم (lib/staff.ts STAFF)، ويتغير بعدها من «صلاحيات الموظفين».", 10, after=3)
    table(["الموظف", "اسم الدخول", "الصفة", "الصلاحيات"], [list(r) for r in DEMO_ACCOUNTS], [3.4, 2.4, 4.6, 6.6], size=9, code_cols=(1,))
    for p in PERMS:
        c = BY_KEY[p.key]
        heading(f"{p.label} ({p.key})", 2)
        para(p.text, after=3, line=1.35)
        if c.scope: meta_line("النطاق", f"{SCOPE_LABEL[c.scope]} ({c.scope}): تُمنح صلاحيات النظام كله لمعرّفات بعينها، وبلا نطاق لكلها")
        rows = []
        for r in c.resources:
            verbs = "، ".join(f"{VERB_LABEL[v]} {v}" for v in r.verbs) or "—"
            special = "، ".join(f"{label} ({k})" for k, label in r.special) or "—"
            notes = "، ".join(x for x in [r.sensitive and "حساس", r.scope and f"نطاق: {SCOPE_LABEL[r.scope]}", r.note] if x) or ""
            rows.append([r.label, r.key, verbs, special, notes])
        table(["المورد", "المفتاح", "الأفعال", "أفعال خاصة", "ملاحظة"], rows, [3.6, 2.8, 4.0, 4.6, 2.0], size=8.5, code_cols=(1,))
        if p.actions: bullets(p.actions, 10.5)
        if p.routes: meta_line("الشاشات", "  |  ".join(p.routes), code=True)
        if p.data: meta_line("البيانات", "  |  ".join(p.data), code=True)
        meta_line("المصدر", "  |  ".join([f"lib/permissions.ts:{c.line}"] + p.src), code=True)

    # ── part 3: state machines ──
    heading("الجزء الثالث: دورات حياة البيانات", 1, page_break=True, before=0)
    table(["#", "دورة الحياة", "مكان الحالة", "الحالات", "الانتقالات"],
          [[str(i), m.title, m.data, str(len(m.states)), str(len(m.moves))] for i, m in enumerate(MACHINES, 1)],
          [0.8, 6.6, 5.4, 2.0, 2.2], size=9.5, code_cols=(2,))
    for (stem, _, _), m in zip(diagrams(), MACHINES):
        heading(m.title, 2, page_break=True, before=0)
        para(m.text, after=4, line=1.35)
        meta_line("مكان الحالة", m.data, code=True)
        figure(stem, f"{m.title}: الأرقام على الأسهم أرقام الانتقالات في الجدول أدناه.")
        table(["الحالة", "القيمة", "معناها"], [[s.label + (" (نهائية)" if s.final else ""), s.value, s.text] for s in m.states],
              [3.6, 3.4, 10.0], size=9, code_cols=(1,))
        label = {s.value: s.label for s in m.states} | {"*": "أي حالة"}
        table(["#", "من", "إلى", "السبب", "من يقوم به"],
              [[str(n), label[t.a], label[t.b], t.trigger, t.actor + (" (تلقائي)" if t.auto else "")] for n, t in enumerate(m.moves, 1)],
              [0.8, 2.8, 2.8, 7.4, 3.2], size=9)
        srcs = sorted({s for t in m.moves for s in t.src} | set(m.src))
        if srcs: meta_line("المصدر", "  |  ".join(srcs), code=True)
        if m.gap: callout(m.gap, fill="F8EEF2", border="C99BB2", label="الفجوة", color=G_MAROON)

    heading("ملحق: كيف تُولَّد هذه الوثيقة", 1, page_break=True, before=0)
    bullets([
        "المصدر: docs/_build-guide/flows/ — permissions.py (الأطراف والصلاحيات) وmachines.py (دورات الحياة)، بلغة وصف بسيطة (flows/dsl.py).",
        "التوليد: python build_flows.py <المجلد> يتحقق من كل إحالة (الملف والسطر، والجدول والعمود، ومجلد الشاشة، وأن كل نظام في كتالوج الصلاحيات lib/permissions.ts موصوف مرة واحدة بترتيبه، وتُقرأ موارده وأفعاله من الكتالوج نفسه (flows/catalog.py)، وأن كل انتقال بين حالتين معرّفتين)، ثم يرسم المخططات (Graphviz عبر viz.js كما في build_erd.py) ويكتب الوثيقة.",
        "ثم: powershell -File finalize.ps1 -Docx <الوثيقة> -Pdf <PDF> لتحديث الفهرس والطباعة (يحتاج Word على Windows).",
        "أي نظام جديد في كتالوج الصلاحيات أو حالة جديدة في الموقع تُضاف هنا في الـcommit نفسه، وإلا رفض المولِّد البناء (للأنظمة) أو بقي المخطط ناقصاً (للحالات). والموارد والأفعال الجديدة في نظام قائم تظهر وحدها.",
    ], 10.5)
    dg.finish(out_path)


if __name__ == "__main__":
    errors = validate()
    for e in errors: print("ERROR:", e)
    print(f"{len(ACTORS)} actors, {len(PERMS)} systems ({len(ALL_KEYS)} permissions), {len(MACHINES)} machines, "
          f"{sum(len(m.moves) for m in MACHINES)} transitions, {len(errors)} errors")
    if errors: sys.exit(1)
    if sys.argv[1:] == ["--check"]: sys.exit(0)
    import build_erd
    items = diagrams()
    if build_erd.stale(items, PNG_DIR): build_erd.render(items, PNG_DIR, SVG_DIR)
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / OUT_NAME
    build_docx(out / f"{OUT_NAME}.docx")
    print("saved", out / f"{OUT_NAME}.docx")
