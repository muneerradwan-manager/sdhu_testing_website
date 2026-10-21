# -*- coding: utf-8 -*-
"""The requirements specification (SRS), from one source (docs/_build-guide/srs):

    python build_srs.py <out dir>          → <out>/توصيف-المتطلبات.docx
    python build_srs.py --check            → only validates the content

Every reference is checked first, and nothing is written while one is wrong: each requirement's rules are ids of
the business rules (rules/), its routes folders under app/, its data tables or columns of the model (schema/);
ids are unique and carry their area's prefix; priority and state are known values. Then finalize.ps1 updates
the table of contents and prints the PDF."""
import sys, re, datetime
from pathlib import Path
from collections import defaultdict, Counter

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).parent
SITE = ROOT.parent.parent
sys.path.insert(0, str(ROOT))
from srs import AREAS, META, PURPOSE, SCOPE, REFERENCES, USERS, ENVIRONMENT, CONSTRAINTS, ASSUMPTIONS, INTERFACES, NFRS, QUESTIONS
from srs.dsl import PRIORITY, STATE
from build_rules import check_data, RULES, DOMAINS

OUT_NAME = "توصيف-المتطلبات"
REQS = [r for a in AREAS for r in a.reqs]
RULE_IDS = {r.id: r for r in RULES}


# ═══════════════ validation ═══════════════
def validate():
    errors = []
    seen = set()
    for a in AREAS:
        for r in a.reqs:
            w = r.id
            if r.id in seen: errors.append(f"{w}: duplicate id")
            seen.add(r.id)
            if not re.fullmatch(rf"FR-{a.prefix}-\d{{2,3}}", r.id): errors.append(f"{w}: id does not carry FR-{a.prefix}")
            if r.pri not in PRIORITY: errors.append(f"{w}: priority {r.pri}")
            if r.state not in STATE: errors.append(f"{w}: state {r.state}")
            if not r.accept: errors.append(f"{w}: no acceptance criteria")
            for x in r.rules:
                if x not in RULE_IDS: errors.append(f"{w}: no rule {x}")
            for x in r.routes:
                if not (SITE / x).is_dir(): errors.append(f"{w}: no folder {x}")
            for x in r.data:
                e = check_data(x)
                if e: errors.append(f"{w}: {e}")
    nfr_ids = [n.id for n in NFRS]
    q_ids = [q.id for q in QUESTIONS]
    for ids, kind in ((nfr_ids, "NFR"), (q_ids, "question")):
        for i in ids:
            if ids.count(i) > 1: errors.append(f"{kind} {i}: duplicate")
    for name, _, _, q in INTERFACES:
        if q and q not in q_ids: errors.append(f"interface {name}: no question {q}")
    return sorted(set(errors))


# ═══════════════ DOCX ═══════════════
import docgen as dg
from docgen import (GREEN, GOLD, MAROON, SOFT, add_text, add_code, para, heading, bullets, table, callout)


def meta_line(label, value, code=False, color=GOLD):
    p = para("", after=1, size=10, line=1.2)
    add_text(p, label + ": ", 10, True, color)
    if code: add_code(p, value, 8.5, False, SOFT)
    else: add_text(p, value, 10, False, SOFT)


def render_req(r):
    heading(f"{r.id} — {r.title}", 3, before=10)
    para(r.text, after=2, line=1.3)
    meta_line("المستخدم", r.actor)
    meta_line("الأولوية", PRIORITY[r.pri] + "   |   النسخة التجريبية: " + STATE[r.state], color=MAROON if r.state != "demo" else GOLD)
    para("معايير القبول:", 10.5, True, GREEN, after=1, before=2)
    bullets(r.accept, 10.5, style="List Number")
    if r.rules: meta_line("القواعد", "، ".join(r.rules), code=True)
    if r.routes: meta_line("في النسخة التجريبية", "  |  ".join(x.removeprefix("app/") for x in r.routes), code=True)
    if r.data: meta_line("البيانات", "  |  ".join(r.data), code=True)


def build_docx(out_path):
    dg.new_document()
    pri = Counter(r.pri for r in REQS); st = Counter(r.state for r in REQS)
    dg.cover(META["title"], META["subtitle"], META["tagline"],
             [("متطلبات وظيفية", str(len(REQS))), ("غير وظيفية", str(len(NFRS))), ("أسئلة مفتوحة", str(len(QUESTIONS))), ("تاريخ الإعداد", datetime.date.today().strftime("%d/%m/%Y"))],
             "وثيقة تقنية لفريق التطوير والإدارة. أسماء الأشخاص والأرقام الواردة أمثلةً مأخوذة من البيانات الوهمية للنسخة التجريبية.")
    dg.body_section(META["title"])

    # ── 1. introduction ──
    heading("1. مقدمة", 1, before=0)
    heading("الغرض من الوثيقة", 2, before=4)
    for x in PURPOSE: para(x, after=8, line=1.35)
    heading("نطاق المنصة", 2)
    for x in SCOPE: para(x, after=8, line=1.35)
    heading("الوثائق المرجعية", 2)
    table(["الوثيقة", "ما فيها"], [list(x) for x in REFERENCES], [5.6, 11.4], size=10)
    heading("كيف تقرأ المتطلبات؟", 2)
    bullets([
        "رقم المتطلب (مثل FR-REG-04) ثابت لا يُعاد استعماله، ويُحال إليه في خطة العمل والاختبارات.",
        "الأولوية: «إلزامي» لا تُطلق المنصة دونه، و«مهم» يُبنى في الإصدار الأول إن أمكن، و«مرغوب» يمكن تأجيله.",
        "النسخة التجريبية: «موجود» يعني أن الموقع يعرض السلوك كاملاً، و«موجود جزئياً» أنه محاكاة أو ناقص، و«غير موجود» أن القواعد أو التصميم يطلبانه والموقع لا يعرضه.",
        "معايير القبول: ما يجب أن يتحقق ليُعدّ المتطلب منجزاً. كل معيار قابل للاختبار.",
        "القواعد: أرقام قواعد العمل التي يجب أن يلتزمها المتطلب، وتفاصيلها في وثيقة «قواعد العمل».",
    ])
    rows = [[PRIORITY[k], str(pri[k])] for k in PRIORITY] + [[STATE[k], str(st[k])] for k in STATE]
    table(["", "عدد المتطلبات"], rows, [9.0, 8.0], size=10)
    dg.toc()

    # ── 2. overall description ──
    heading("2. الوصف العام", 1, page_break=True, before=0)
    heading("فئات المستخدمين", 2, before=4)
    table(["الفئة", "عددهم وخصائصهم", "ما يفعلونه"], [list(u) for u in USERS], [2.8, 5.6, 8.6], size=9.5)
    para("صلاحيات كل فئة بالتفصيل في وثيقة «الأدوار والصلاحيات».", 10, False, SOFT, after=6)
    heading("بيئة التشغيل", 2)
    bullets(ENVIRONMENT, 10.5)
    heading("القيود", 2)
    bullets(CONSTRAINTS, 10.5)
    heading("الافتراضات والاعتماديات", 2)
    bullets(ASSUMPTIONS, 10.5)

    # ── 3. functional requirements ──
    heading("3. المتطلبات الوظيفية", 1, page_break=True, before=0)
    rows = []
    for a in AREAS:
        c = Counter(r.pri for r in a.reqs); s = Counter(r.state for r in a.reqs)
        rows.append([a.title, f"FR-{a.prefix}", str(len(a.reqs)), str(c["M"]), str(s["partial"] + s["new"])])
    table(["القسم", "البادئة", "المتطلبات", "إلزامي", "ليس كاملاً في التجريبية"], rows, [6.6, 2.4, 2.4, 2.2, 3.4], size=9.5, code_cols=(1,))
    for i, a in enumerate(AREAS, 1):
        heading(f"3.{i} {a.title}", 1, page_break=True, before=0)
        for x in a.intro: para(x, after=8, line=1.35)
        table(["الرقم", "المتطلب", "الأولوية", "التجريبية"], [[r.id, r.title, PRIORITY[r.pri], STATE[r.state]] for r in a.reqs],
              [2.6, 8.4, 2.2, 3.8], size=9, code_cols=(0,))
        for r in a.reqs: render_req(r)

    # ── 4. external interfaces ──
    heading("4. الواجهات الخارجية", 1, page_break=True, before=0)
    para("الأنظمة التي تتصل بها المنصة، وما تحتاجه من كل منها، وما تفعله النسخة التجريبية بدلاً منها.", after=6)
    table(["النظام", "ما تحتاجه المنصة", "في النسخة التجريبية", "السؤال"], [[a, b, c, q or "—"] for a, b, c, q in INTERFACES], [3.0, 7.4, 4.6, 2.0], size=9.5)
    heading("واجهة المستخدم", 2)
    bullets([
        "بوابة الحاج وبوابة الإداري: خطوات قصيرة، وشريط جانبي للأقسام، وبطاقات تعرض الحال والخطوة التالية.",
        "بوابة الموظفين على نمط ووردبريس: لوحات تعرض الأرقام فقط، وصفحات إدارة هي جداول قوائم وشاشات تحرير. «ملفاتي التشغيلية» ظاهرة دائماً لكل موظف.",
        "الموقع العام: أقسام الرئيسية، والأكاديمية، ومواقيت الصلاة، والأخبار، بهوية إدارة الحج والعمرة (الأخضر والذهبي والعنابي، وخط itf Qomra).",
        "اللقطات المرجعية لكل شاشة في أدلة الاستخدام الثلاثة.",
    ], 10.5)

    # ── 5. non-functional ──
    heading("5. المتطلبات غير الوظيفية", 1, page_break=True, before=0)
    by_kind = defaultdict(list)
    for n in NFRS: by_kind[n.kind].append(n)
    for kind, ns in by_kind.items():
        heading(kind, 2)
        for n in ns:
            heading(f"{n.id} — {n.title}", 3, before=8)
            para(n.text, after=2, line=1.3)
            if n.measure: meta_line("كيف يُتحقق منه", n.measure)
            if n.now: meta_line("النسخة التجريبية", n.now, color=MAROON)

    # ── 6. open questions ──
    heading("6. أسئلة مفتوحة على الإدارة", 1, page_break=True, before=0)
    para("ما يجب أن تحسمه الإدارة قبل البناء أو في بدايته، لأن متطلبات كثيرة تتوقف على جوابه.", after=6)
    for q in QUESTIONS:
        heading(f"{q.id} — {q.topic}", 3, before=8)
        para(q.question, after=2, line=1.3, bold=True)
        meta_line("ما يتوقف عليه", q.why)
        if q.options: meta_line("خيارات", "؛ ".join(q.options))

    # ── appendices ──
    heading("ملحق 1: مصفوفة التتبع", 1, page_break=True, before=0)
    para("لكل قاعدة عمل المتطلبات التي تلتزمها. القاعدة التي لا يحيل إليها متطلب تُراجع: إما أن متطلباً ينقص، أو أنها تُطبَّق في كل المنصة.", after=6)
    by_rule = defaultdict(list)
    for r in REQS:
        for x in r.rules: by_rule[x].append(r.id)
    rows = []
    for d in DOMAINS:
        for x in d.rules: rows.append([x.id, x.title, "، ".join(by_rule[x.id]) or "—"])
    table(["القاعدة", "عنوانها", "المتطلبات"], rows, [2.2, 7.4, 7.4], size=8.5, code_cols=(0, 2))
    uncovered = [r for r in RULES if r.id not in by_rule]
    callout(f"{len(RULES) - len(uncovered)} قاعدة من {len(RULES)} يحيل إليها متطلب واحد على الأقل.", label="التغطية")

    heading("ملحق 2: ما لا تعرضه النسخة التجريبية كاملاً", 1, page_break=True, before=0)
    para("المتطلبات التي هي محاكاة أو ناقصة أو غائبة في النسخة التجريبية: هنا يقع أكثر العمل الجديد.", after=6)
    table(["الرقم", "المتطلب", "الأولوية", "التجريبية"], [[r.id, r.title, PRIORITY[r.pri], STATE[r.state]] for r in REQS if r.state != "demo"],
          [2.6, 8.4, 2.2, 3.8], size=9, code_cols=(0,))

    heading("ملحق 3: كيف تُولَّد هذه الوثيقة", 1, page_break=True, before=0)
    bullets([
        "المصدر: docs/_build-guide/srs/ — ملف لكل قسم من المتطلبات الوظيفية (a01_public.py …)، والفصول العامة والمتطلبات غير الوظيفية والواجهات والأسئلة في srs/__init__.py، بلغة وصف بسيطة (srs/dsl.py).",
        "التوليد: python build_srs.py <المجلد> يتحقق من كل إحالة (رقم القاعدة موجود في «قواعد العمل»، ومجلد الشاشة موجود، والجدول والعمود موجودان) ثم يكتب الوثيقة.",
        "ثم: powershell -File finalize.ps1 -Docx <الوثيقة> -Pdf <PDF> لتحديث الفهرس والطباعة (يحتاج Word على Windows).",
        "كل ميزة جديدة في الموقع متطلب جديد هنا، وكل قاعدة جديدة في «قواعد العمل» تُربط بمتطلب.",
    ], 10.5)
    dg.finish(out_path)


if __name__ == "__main__":
    errors = validate()
    for e in errors: print("ERROR:", e)
    print(f"{len(AREAS)} areas, {len(REQS)} requirements, {len(NFRS)} NFRs, {len(QUESTIONS)} questions, {len(errors)} errors")
    if errors: sys.exit(1)
    if sys.argv[1:] == ["--check"]: sys.exit(0)
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / OUT_NAME
    build_docx(out / f"{OUT_NAME}.docx")
    print("saved", out / f"{OUT_NAME}.docx")
