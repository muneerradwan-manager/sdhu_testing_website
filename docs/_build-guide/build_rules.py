# -*- coding: utf-8 -*-
"""The business rules and glossary document, from one source (docs/_build-guide/rules):

    python build_rules.py <out dir>          → <out>/قواعد-العمل-والمصطلحات.docx
    python build_rules.py --check            → only validates the content

Every reference is checked first, and nothing is written while one is wrong: each src is a file of the site
and a line inside it, each data reference is a table or table.column of the data model (schema/), rule ids are
unique and carry their chapter's prefix, and every «see» names a glossary term. Then finalize.ps1 updates the
table of contents and prints the PDF."""
import sys, re, datetime
from pathlib import Path
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).parent
SITE = ROOT.parent.parent
sys.path.insert(0, str(ROOT))
from rules import DOMAINS, TERMS, ISSUES, META, INTRO, HOW_TO_READ
from schema import MODULES

TABLES = {t.name: {c.name for c in t.cols} for m in MODULES for t in m.tables}
RULES = [r for d in DOMAINS for r in d.rules]


# ═══════════════ validation ═══════════════
_lines = {}


def check_src(ref):
    path, _, line = ref.partition(":")
    f = SITE / path
    if not f.is_file(): return f"missing file {path}"
    if not line: return None
    if path not in _lines: _lines[path] = f.read_text("utf-8").count("\n") + 1
    if not line.isdigit() or not 1 <= int(line) <= _lines[path]: return f"{path} has no line {line}"
    return None


def check_data(ref):
    t, _, c = ref.partition(".")
    if t not in TABLES: return f"no table {t}"
    if c and c not in TABLES[t]: return f"no column {t}.{c}"
    return None


def validate():
    errors = []
    seen = set()
    for d in DOMAINS:
        for n, r in enumerate(d.rules, 1):
            where = r.id
            if r.id in seen: errors.append(f"{where}: duplicate id")
            seen.add(r.id)
            if not re.fullmatch(rf"{d.prefix}-\d{{2,3}}", r.id): errors.append(f"{where}: id does not carry the prefix {d.prefix}")
            if not r.src: errors.append(f"{where}: no src")
            for s in r.src:
                e = check_src(s)
                if e: errors.append(f"{where}: {e}")
            for x in r.data:
                e = check_data(x)
                if e: errors.append(f"{where}: {e}")
    names = [t.term for t in TERMS]
    for t in TERMS:
        if names.count(t.term) > 1: errors.append(f"term {t.term}: duplicate")
        for s in t.code:
            e = check_src(s)
            if e: errors.append(f"term {t.term}: {e}")
        for x in t.data:
            e = check_data(x)
            if e: errors.append(f"term {t.term}: {e}")
        for s in t.see:
            if s not in names: errors.append(f"term {t.term}: see «{s}» is not a term")
    for title, _, srcs in ISSUES:
        for s in srcs:
            e = check_src(s)
            if e: errors.append(f"issue {title}: {e}")
    return sorted(set(errors))


# ═══════════════ DOCX ═══════════════
import docgen as dg
from docgen import (Pt, GREEN, GOLD, MAROON, SOFT, add_text, add_code, para, heading, bullets, table, callout)

_FOLD = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ة": "ه", "ى": "ي", "ؤ": "و", "ئ": "ي"})


def ar_key(s):
    """Arabic dictionary order: the article «ال» and hamza seats don't count"""
    s = s.strip("«»\"' ").translate(_FOLD)
    return re.sub(r"^ال(?=..)", "", s)


def meta_line(label, value, code=False, color=GOLD):
    p = para("", after=1, size=10, line=1.2)
    add_text(p, label + ": ", 10, True, color)
    if code: add_code(p, value, 8.5, False, SOFT)
    else: add_text(p, value, 10, False, SOFT)


def render_rule(r):
    heading(f"{r.id} — {r.title}", 3, before=10)
    para(r.text, after=3, line=1.3)
    meta_line("المصدر", "  |  ".join(r.src), code=True)
    if r.data: meta_line("البيانات", "  |  ".join(r.data), code=True)
    if r.cfg: meta_line("قابل للضبط", r.cfg)
    if r.ex: meta_line("مثال", r.ex)
    if r.gap: meta_line("الفجوة", r.gap, color=MAROON)


def build_docx(out_path):
    dg.new_document()
    n_gaps = sum(1 for r in RULES if r.gap)
    dg.cover(META["title"], META["subtitle"], META["tagline"],
             [("القواعد", str(len(RULES))), ("الفصول", str(len(DOMAINS))), ("المصطلحات", str(len(TERMS))), ("تاريخ الإعداد", datetime.date.today().strftime("%d/%m/%Y"))],
             "وثيقة تقنية لفريق التطوير. أسماء الأشخاص والأرقام الواردة أمثلةً مأخوذة من البيانات الوهمية للنسخة التجريبية.")
    dg.body_section(META["title"])

    # ── introduction ──
    heading("مقدمة", 1, before=0)
    for x in INTRO: para(x, after=8, line=1.35)
    heading("كيف تقرأ هذه الوثيقة؟", 2)
    bullets(HOW_TO_READ)
    heading("خريطة الفصول", 2)
    rows = [[str(i), d.title, d.prefix, str(len(d.rules)), str(sum(1 for r in d.rules if r.gap))] for i, d in enumerate(DOMAINS, 1)]
    table(["#", "الفصل", "البادئة", "القواعد", "فجوات"], rows, [0.8, 9.6, 2.0, 2.2, 2.4], size=10, code_cols=(2,))
    callout(f"في {n_gaps} قاعدة بند «الفجوة»: ما لا تفعله النسخة التجريبية وعلى المنصة الحقيقية فعله. جُمعت كلها في الملحق 1.", label="للفريق البرمجي")
    dg.toc()

    # ── part 1: glossary ──
    heading("الجزء الأول: مسرد المصطلحات", 1, page_break=True, before=0)
    para("كل مصطلح كما تكتبه المنصة، ومعناه فيها تحديداً، والاسم الذي يستعمله الكود، وأين يُحفظ. والمصطلحات مرتبة ترتيباً هجائياً "
         "لا تُحسب فيه «ال». وفي الملحق 3 الفهرس المعاكس: من اسم الكود إلى المصطلح.", after=8, line=1.35)
    rows = []
    for t in sorted(TERMS, key=lambda t: ar_key(t.term)):
        text = t.text + (" انظر: " + "، ".join(t.see) + "." if t.see else "")
        rows.append([t.term, t.en, text, "، ".join(t.data)])
    table(["المصطلح", "في الكود", "المعنى", "في البيانات"], rows, [3.0, 3.2, 7.6, 3.2], size=9, code_cols=(1, 3))
    heading("مصطلحات تحتاج توحيداً", 2, before=16)
    para("كلمات لا تستعملها المنصة بالطريقة نفسها في كل مكان: شيء واحد باسمين، أو اسم واحد لشيئين. "
         "تُحسم قبل بناء المنصة الحقيقية، وتتبعها الأدلة.", after=6)
    table(["المصطلح", "المشكلة واقتراح الحل", "أين يظهر"], [[a, b, "  ".join(c)] for a, b, c in ISSUES], [3.6, 9.4, 4.0], size=9, code_cols=(2,))

    # ── part 2: rules ──
    for i, d in enumerate(DOMAINS, 1):
        heading(f"الفصل {i}: {d.title}", 1, page_break=True, before=0)
        for x in d.intro: para(x, after=8, line=1.35)
        table(["الرقم", "القاعدة"], [[r.id, r.title] for r in d.rules], [2.4, 14.6], size=9.5, code_cols=(0,))
        for r in d.rules: render_rule(r)

    # ── appendices ──
    heading("ملحق 1: ما على المنصة الحقيقية فعله", 1, page_break=True, before=0)
    para("القواعد التي لا تطبقها النسخة التجريبية كاملة، أو تطبقها في المتصفح وحده. هذه قائمة عمل جاهزة للفريق البرمجي.", after=6)
    table(["الرقم", "القاعدة", "الفجوة"], [[r.id, r.title, r.gap] for r in RULES if r.gap], [2.2, 4.8, 10.0], size=9, code_cols=(0,))

    heading("ملحق 2: القواعد حسب الجدول", 1, page_break=True, before=0)
    para("لمن يعمل على جدول بعينه: كل القواعد التي تحكم بياناته.", after=6)
    by_table = defaultdict(list)
    for r in RULES:
        for x in r.data:
            t = x.partition(".")[0]
            if r.id not in by_table[t]: by_table[t].append(r.id)
    table(["الجدول", "القواعد"], [[t, "، ".join(ids)] for t, ids in sorted(by_table.items())], [5.5, 11.5], size=9, code_cols=(0, 1))

    heading("ملحق 3: فهرس أسماء الكود", 1, page_break=True, before=0)
    table(["في الكود", "المصطلح"], [[t.en, t.term] for t in sorted(TERMS, key=lambda t: t.en.lower())], [7.0, 10.0], size=9, code_cols=(0,))

    heading("ملحق 4: كيف تُولَّد هذه الوثيقة", 1, page_break=True, before=0)
    bullets([
        "المصدر: docs/_build-guide/rules/ — ملف لكل فصل (r01_registration.py …) ومسرد المصطلحات في glossary.py، بلغة وصف بسيطة (rules/dsl.py): R للقاعدة، D للفصل، G للمصطلح.",
        "التوليد: python build_rules.py <المجلد> يتحقق من كل إحالة (كل ملف وسطر في المصدر موجود، وكل جدول وعمود موجود في هيكلية قاعدة البيانات، ولا يتكرر رقم قاعدة) ثم يكتب الوثيقة.",
        "ثم: powershell -File finalize.ps1 -Docx <الوثيقة> -Pdf <PDF> لتحديث الفهرس والطباعة (يحتاج Word على Windows).",
        "كل تعديل في الموقع يغيّر قاعدة يُعدَّل هنا أيضاً. وإن تحرك سطر في الكود فشل التحقق إن خرج السطر من الملف، لذا يُراجَع المصدر مع كل تعديل كبير في الملف.",
    ], 10.5)
    dg.finish(out_path)


if __name__ == "__main__":
    errors = validate()
    for e in errors: print("ERROR:", e)
    print(f"{len(DOMAINS)} chapters, {len(RULES)} rules, {sum(1 for r in RULES if r.gap)} gaps, {len(TERMS)} terms, {len(errors)} errors")
    if errors: sys.exit(1)
    if sys.argv[1:] == ["--check"]: sys.exit(0)
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / "قواعد-العمل-والمصطلحات"
    build_docx(out / "قواعد-العمل-والمصطلحات.docx")
    print("saved", out / "قواعد-العمل-والمصطلحات.docx")
