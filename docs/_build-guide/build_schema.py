# -*- coding: utf-8 -*-
"""The database design document and its SQL, from one source (docs/_build-guide/schema):

    python build_schema.py <out dir>          → <out>/هيكلية-قاعدة-البيانات.docx and <out>/schema.sql
    python build_schema.py --check            → only validates the model

The model is checked first (foreign keys and their types, primary keys, the columns of every key), and
nothing is written while it has an error. Then finalize.ps1 updates the table of contents and prints the PDF."""
import sys, re, copy, hashlib, datetime
from pathlib import Path
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))
from schema import MODULES, META, INTRO, HOW_TO_READ, HOW_ITEMS, CONVENTIONS, DEMO_GAPS

TABLES = [t for m in MODULES for t in m.tables]
BY_NAME = {t.name: t for t in TABLES}

# MySQL and MariaDB refuse a CHECK on a column whose foreign key has a referential action (SET NULL / CASCADE):
# such a column deletes RESTRICT. Updates RESTRICT everywhere: surrogate ids and reference codes never change.
for _t in TABLES:
    _exprs = " ".join([c.ck for c in _t.cols if c.ck] + list(_t.checks))
    for _c in _t.cols:
        if _c.fk and re.search(rf"\b{re.escape(_c.name)}\b", _exprs): _c.od = "RESTRICT"


# ═══════════════ validation ═══════════════
def base_type(t):
    t = t.upper()
    if t.startswith("VARCHAR"): return "VARCHAR"
    if t.startswith("CHAR"): return "CHAR"
    return t


def effective_pk(t):
    """The declared primary key, else the first unique key whose columns are all NOT NULL"""
    pk = t.pk_cols()
    if pk: return pk
    cols = {c.name: c for c in t.cols}
    for u in t.uq:
        if all(n in cols and not cols[n].null for n in u): return list(u)
    for c in t.cols:
        if c.uq and not c.null: return [c.name]
    return None


def validate():
    errors, warns = [], []
    seen = set()
    for t in TABLES:
        if t.name in seen: errors.append(f"duplicate table {t.name}")
        seen.add(t.name)
        if len(t.name) > 64: errors.append(f"{t.name}: name too long")
        names = [c.name for c in t.cols]
        if len(names) != len(set(names)): errors.append(f"{t.name}: duplicate column {[n for n in names if names.count(n) > 1]}")
        cols = {c.name: c for c in t.cols}
        for key in list(t.uq) + list(t.idx):
            for n in key:
                if n not in cols: errors.append(f"{t.name}: key column {n} missing")
        if not effective_pk(t): errors.append(f"{t.name}: no primary key (add pk() or a NOT NULL unique key)")
        for c in t.cols:
            if c.pk and c.null: errors.append(f"{t.name}.{c.name}: primary key column is nullable")
            if c.ai and "INT" not in c.type.upper(): errors.append(f"{t.name}.{c.name}: AUTO_INCREMENT on a non-integer")
            tgt = c.fk_target()
            if not tgt: continue
            tt, tc = tgt
            if tt not in BY_NAME: errors.append(f"{t.name}.{c.name}: FK to missing table {tt}"); continue
            tcol = {x.name: x for x in BY_NAME[tt].cols}.get(tc)
            if not tcol: errors.append(f"{t.name}.{c.name}: FK to missing column {tt}.{tc}"); continue
            if base_type(tcol.type) != base_type(c.type): errors.append(f"{t.name}.{c.name} {c.type} ≠ {tt}.{tc} {tcol.type}")
            elif tcol.type.upper() != c.type.upper(): warns.append(f"{t.name}.{c.name} {c.type} vs {tt}.{tc} {tcol.type}")
            if not (tcol.pk or tcol.uq or [tc] == effective_pk(BY_NAME[tt]) or any(list(u)[:1] == [tc] for u in BY_NAME[tt].uq)):
                errors.append(f"{t.name}.{c.name}: FK target {tt}.{tc} is not a key")
            if c.od == "SET NULL" and not c.null: errors.append(f"{t.name}.{c.name}: ON DELETE SET NULL on a NOT NULL column")
    return errors, warns


# ═══════════════ SQL ═══════════════
def ident_name(prefix, table, cols):
    name = f"{prefix}_{table}_{'_'.join(cols)}"
    if len(name) <= 64: return name
    h = hashlib.md5(name.encode()).hexdigest()[:8]
    return f"{prefix}_{table[:40]}_{h}"


def sql_str(s, limit):
    s = s.replace("\\", "\\\\").replace("'", "''").replace("\n", " ")
    if len(s) > limit: s = s[:limit - 1] + "…"
    return f"'{s}'"


def col_sql(c, pk_auto):
    parts = [f"`{c.name}`", c.type]
    parts.append("NULL" if c.null else "NOT NULL")
    if c.ai and pk_auto: parts.append("AUTO_INCREMENT")
    if c.d is not None: parts.append(f"DEFAULT {c.d}")
    if c.onupdate: parts.append("ON UPDATE CURRENT_TIMESTAMP(3)")
    parts.append(f"COMMENT {sql_str(c.desc, 1000)}")
    return " ".join(parts)


def build_sql():
    out = []
    w = out.append
    w("-- ═══════════════════════════════════════════════════════════════════════════")
    w(f"-- {META['title']} — {META['subtitle']}")
    w("-- المنصة الوطنية للحج — إدارة الحج والعمرة السورية")
    w(f"-- MySQL 8.0.16+ / MariaDB 10.6+   |   {len(TABLES)} جدولاً   |   مولَّد من docs/_build-guide/schema في {datetime.date.today():%Y-%m-%d}")
    w("-- لا تعدّل هذا الملف يدوياً: عدّل النموذج ثم شغّل build_schema.py")
    w("-- ═══════════════════════════════════════════════════════════════════════════")
    w("")
    w("SET NAMES utf8mb4;")
    w("SET FOREIGN_KEY_CHECKS = 0;")
    w("")
    fks = []
    for m in MODULES:
        w(f"-- ───────────────────────────────────────────────────────────────")
        w(f"-- {m.title}")
        w(f"-- ───────────────────────────────────────────────────────────────")
        w("")
        for t in m.tables:
            lines = []
            pk = effective_pk(t)
            for c in t.cols:
                lines.append("  " + col_sql(c, c.pk))
            lines.append(f"  PRIMARY KEY ({', '.join(f'`{n}`' for n in pk)})")
            uqs = [(c.name,) for c in t.cols if c.uq and [c.name] != pk] + [u for u in t.uq if list(u) != pk]
            for u in uqs:
                lines.append(f"  UNIQUE KEY `{ident_name('uq', t.name, u)}` ({', '.join(f'`{n}`' for n in u)})")
            for ix in t.idx:
                lines.append(f"  KEY `{ident_name('ix', t.name, ix)}` ({', '.join(f'`{n}`' for n in ix)})")
            n_ck = 0
            for c in t.cols:
                if c.ck:
                    n_ck += 1
                    lines.append(f"  CONSTRAINT `{ident_name('ck', t.name, [str(n_ck)])}` CHECK ({c.ck})")
            for ck in t.checks:
                n_ck += 1
                lines.append(f"  CONSTRAINT `{ident_name('ck', t.name, [str(n_ck)])}` CHECK ({ck})")
            w(f"CREATE TABLE `{t.name}` (")
            w(",\n".join(lines))
            w(f") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT={sql_str(t.title + ' — ' + t.desc, 1800)};")
            w("")
            for c in t.cols:
                tgt = c.fk_target()
                if tgt: fks.append((t.name, c, tgt))
    w("-- ───────────────────────────────────────────────────────────────")
    w(f"-- العلاقات ({len(fks)} مفتاحاً أجنبياً)")
    w("-- ───────────────────────────────────────────────────────────────")
    w("")
    for tname, c, (tt, tc) in fks:
        w(f"ALTER TABLE `{tname}` ADD CONSTRAINT `{ident_name('fk', tname, [c.name])}` FOREIGN KEY (`{c.name}`) REFERENCES `{tt}` (`{tc}`) ON DELETE {c.od} ON UPDATE RESTRICT;")
    w("")
    w("SET FOREIGN_KEY_CHECKS = 1;")
    return "\n".join(out) + "\n", len(fks)


# ═══════════════ DOCX ═══════════════
import docgen as dg
from docgen import (Pt, Cm, WD_ALIGN_PARAGRAPH, GREEN, GOLD, MAROON, SOFT, add_text, add_code, para, heading, bullets, table, callout)
ERD = ROOT / "erd"


def erd_figure(stem, caption):
    """A diagram drawn by build_erd.py, as wide as the page or as tall as it allows, with its caption under it"""
    import struct
    png = ERD / f"{stem}.png"
    w, h = struct.unpack(">II", png.read_bytes()[16:24])
    p = dg.doc.add_paragraph(); dg.bidi(p, WD_ALIGN_PARAGRAPH.CENTER); p.paragraph_format.keep_with_next = True
    if h / w > 23.5 / 17.4: p.add_run().add_picture(str(png), height=Cm(23.5))
    else: p.add_run().add_picture(str(png), width=Cm(17.4))
    para(caption, 9.5, False, SOFT, after=8, align=WD_ALIGN_PARAGRAPH.CENTER)


def constraint_text(t, c, pk):
    bits = []
    if c.name in pk: bits.append("مفتاح أساسي" + (" تلقائي" if c.ai else ""))
    if c.uq: bits.append("فريد")
    tgt = c.fk_target()
    if tgt:
        tt, tc = tgt
        bits.append(f"← {tt}" + ("" if tc == "id" else f".{tc}"))
        if c.od != "RESTRICT": bits.append(f"عند الحذف {c.od}")
    bits.append("اختياري" if c.null else "إلزامي")
    if c.d is not None and not c.onupdate and "CURRENT_TIMESTAMP" not in c.d: bits.append(f"افتراضي {c.d}")
    if c.d is not None and "CURRENT_TIMESTAMP" in c.d: bits.append("الآن افتراضياً")
    return "، ".join(bits)


def render_table(t, n):
    pk = effective_pk(t)
    hp = heading(f"{t.name} — {t.title}", 2, before=14)
    para(t.desc, after=4, line=1.3)
    meta = []
    if t.new: meta.append(("مقترح", "لا مقابل مخزَّن له في النسخة التجريبية"))
    if t.src: meta.append(("المصدر في الكود", t.src))
    if t.seed: meta.append(("البيانات الأولية", t.seed))
    for label, val in meta:
        p = para("", after=2, size=10)
        add_text(p, label + ": ", 10, True, MAROON if label == "مقترح" else GOLD)
        if label == "المصدر في الكود": add_code(p, val.replace("؛", " |").replace("،", ","), 8.5, False, SOFT)
        else: add_text(p, val, 10, False, SOFT)
    rows = [[c.name, c.type.replace(",", ", "), constraint_text(t, c, pk), c.desc] for c in t.cols]
    table(["العمود", "النوع", "القيود", "الوصف"], rows, [4.0, 2.8, 3.0, 7.6], code_cols=(0, 1), size=9)
    keys = []
    if len(pk) > 1: keys.append("المفتاح الأساسي المركب: (" + "، ".join(pk) + ")")
    for u in t.uq:
        if list(u) != pk: keys.append("فريد معاً: (" + "، ".join(u) + ")")
    for ix in t.idx: keys.append("فهرس: (" + "، ".join(ix) + ")")
    for ck in t.checks: keys.append("قيد تحقق: " + ck)
    if keys:
        p = para("المفاتيح والقيود:", size=10.5, bold=True, color=GREEN, after=1)
        bullets(keys, 10)
    if t.rules:
        para("قواعد العمل:", size=10.5, bold=True, color=GREEN, after=1, before=2)
        bullets(t.rules, 10.5)


def render_blocks(blocks):
    for b in blocks:
        kind = b[0]
        if kind == "h": heading(b[1], 2, before=16)
        elif kind == "h3": heading(b[1], 3, before=10)
        elif kind == "p": para(b[1], after=6, line=1.3)
        elif kind == "list": bullets(b[1], 10.5)
        elif kind == "table": table(b[1], b[2], b[3], size=9.5)
        elif kind == "note": callout(b[1])


def build_docx(out_path, n_fks):
    doc = dg.new_document()
    dg.cover(META["title"], META["subtitle"], META["tagline"],
             [("الجداول", str(len(TABLES))), ("العلاقات", str(n_fks)), ("قاعدة البيانات", "MySQL 8 / MariaDB"), ("تاريخ الإعداد", datetime.date.today().strftime("%d/%m/%Y"))],
             "وثيقة تقنية لفريق التطوير. أسماء الأشخاص والأرقام الواردة أمثلةً مأخوذة من البيانات الوهمية للنسخة التجريبية.")
    dg.body_section(META["title"])

    # ── introduction ──
    heading("مقدمة", 1, before=0)
    for x in INTRO: para(x, after=8, line=1.35)
    heading("كيف تقرأ هذه الوثيقة؟", 2)
    for x in HOW_TO_READ: para(x, after=4)
    bullets(HOW_ITEMS)
    heading("الاصطلاحات المعتمدة في التصميم", 2)
    table(["البند", "الاصطلاح"], [[a, b] for a, b in CONVENTIONS], [3.6, 13.4], size=10)
    heading("خريطة الفصول", 2)
    para("كل فصل مجال، وهذه أهم جداوله وعدد جداوله كلها. وتلتقي الفصول عند جداول قليلة: seasons وaccounts وcivil_persons وapplications وadmin_groups وclusters وstaff_users وfiles.", after=6)
    rows = []
    for i, m in enumerate(MODULES, 1):
        top = "، ".join(t.name for t in m.tables[:6]) + ("…" if len(m.tables) > 6 else "")
        rows.append([str(i), m.title, str(len(m.tables)), top])
    table(["#", "الفصل", "الجداول", "أهمها"], rows, [0.8, 6.0, 1.4, 8.8], size=9.5, code_cols=(3,))
    erd_figure("00-overview", "الفصول والعلاقات بينها: الرقم على الخط عدد المفاتيح الأجنبية بين الفصلين، والفصول الداكنة هي المحاور. "
               "العلاقات بـ seasons وstaff_users وfiles محذوفة لأن كل الفصول تقريباً تشير إليها.")
    heading("رحلة البيانات من الحساب إلى العودة", 2)
    bullets([
        "civil_persons ← accounts ← account_season_paths: الشخص موجود في السجل، فيُنشئ حسابه، ويختار مساره في الموسم.",
        "المسار pilgrim: application_drafts ← applications (application_members، payments) ← post_acceptance والخطوات السبع ← member_visas ← tickets وseason_ratings ← hajj_certificates.",
        "المسار admin: admin_season_files ← exam_attempts وoral_bookings ← admin_groups وclusters ← field_records وdaily_reports ← self_evaluations وpeer_evaluations ← grading_results.",
        "يلتقي المساران في post_acceptance.group_id: العائلة تُلحق بمجموعة يقودها إداري، وتركب رحلات مجموعتها (group_flight_legs ← flight_assignments)، وتسكن حيث يسكن تكتلها (op_inner_node_clusters).",
        "والموظفون (staff_users) يقررون ويراجعون ويديرون في كل خطوة، وكل ذلك في audit_events. ومحتوى الصفحات العامة في cms_* وجداول المحتوى.",
    ])

    dg.toc()

    # ── chapters ──
    for i, m in enumerate(MODULES, 1):
        heading(f"الفصل {i}: {m.title}", 1, page_break=True, before=0)
        for x in m.intro: para(x, after=8, line=1.35)
        if m.flow:
            para("كيف تتدفق البيانات:", 12, True, MAROON, after=2, before=4)
            bullets(m.flow, 11, style="List Number")
        para(f"جداول الفصل ({len(m.tables)}): " + "، ".join(t.name for t in m.tables), 10, False, SOFT, after=6)
        erd_figure(f"{i:02d}-{m.key}", f"مخطط الفصل {i}: لكل جدول مفتاحه الأساسي (PK) ومفاتيحه الأجنبية (FK) وأعمدته الفريدة (UQ)، والرمادي جداول من فصول أخرى. "
                   "شوكة الغراب عند طرف «المتعدد»، والدائرة للعلاقة الاختيارية، و? للعمود الذي يقبل NULL. "
                   "العلاقات بـ seasons وstaff_users وfiles في جدول علاقات الفصل آخره. ونسخة SVG قابلة للتكبير في مجلد «مخططات-ERD».")
        for n, t in enumerate(m.tables, 1): render_table(t, n)
        rels = []
        for t in m.tables:
            for c in t.cols:
                tgt = c.fk_target()
                if not tgt: continue
                tt, tc = tgt
                one = c.uq or [c.name] == effective_pk(t)
                rels.append([f"{t.name}.{c.name}", f"{tt}.{tc}", "واحد إلى واحد" if one else "متعدد إلى واحد", c.od])
        if rels:
            heading(f"علاقات الفصل ({len(rels)})", 2, before=16)
            table(["من", "إلى", "العلاقة", "عند الحذف"], rels, [7.0, 5.2, 2.7, 2.5], size=9, code_cols=(0, 1, 3))
        render_blocks(m.blocks)

    # ── appendices ──
    heading("ملحق 1: فجوات النسخة التجريبية وما يقابلها في هذا التصميم", 1, page_break=True, before=0)
    para("ما وجدناه في كود النسخة التجريبية ولا يصلح لخادم حقيقي، وكيف عالجه التصميم. كل بند منها يحتاج أيضاً تعديلاً في واجهة المنصة حين تُربط بالخادم.", after=6)
    bullets(DEMO_GAPS, 10.5)
    heading("ملحق 2: فهرس الجداول", 1, page_break=True, before=0)
    idx = sorted(((t.name, t.title, next(i for i, m in enumerate(MODULES, 1) if t in m.tables)) for t in TABLES))
    table(["الجدول", "الاسم", "الفصل"], [[a, b, str(c)] for a, b, c in idx], [6.0, 9.4, 1.6], size=9, code_cols=(0,))
    heading("ملحق 3: كيف تُولَّد هذه الوثيقة وملف SQL", 1, page_break=True, before=0)
    bullets([
        "المصدر: docs/_build-guide/schema/ — ملف لكل فصل (m01_core.py … m16_cms.py) بلغة وصف بسيطة (schema/dsl.py): T للجدول، c للعمود، وعلاقاته وقيوده وقواعده.",
        "التوليد: python build_schema.py <المجلد> يتحقق من النموذج (كل مفتاح أجنبي يشير إلى مفتاح موجود بنوع مطابق، ولكل جدول مفتاح أساسي، وأعمدة كل مفتاح موجودة) ثم يكتب الوثيقة وschema.sql.",
        "ثم: powershell -File finalize.ps1 -Docx <الوثيقة> -Pdf <PDF> لتحديث الفهرس والطباعة (يحتاج Word على Windows).",
        "المخططات: python build_erd.py يرسمها من النموذج نفسه (Graphviz عبر viz.js في Chromium من Playwright، فلا يلزم تثبيت Graphviz)، صوراً للوثيقة في erd/ ونسخ SVG في «مخططات-ERD». ويرفض build_schema.py البناء إن تغيّر النموذج بعد آخر رسم.",
        "التطبيق: mysql -u root -p hajj < schema.sql على قاعدة فارغة بترميز utf8mb4. الجداول تُنشأ أولاً ثم تُضاف العلاقات في آخر الملف.",
        "أي تغيير في المنصة يمس بياناتها يُعدَّل في النموذج، ويُعاد توليد الوثيقة والملف معاً.",
    ], 10.5)

    dg.finish(out_path)

if __name__ == "__main__":
    errors, warns = validate()
    for w_ in warns: print("warn:", w_)
    for e in errors: print("ERROR:", e)
    print(f"{len(MODULES)} chapters, {len(TABLES)} tables, {sum(len(t.cols) for t in TABLES)} columns, {len(errors)} errors, {len(warns)} warnings")
    if errors: sys.exit(1)
    if sys.argv[1:] == ["--check"]: sys.exit(0)
    import build_erd
    old = build_erd.stale()
    if old:
        print("ERROR: the ERD drawings are older than the model (" + ", ".join(old) + "): run python build_erd.py first")
        sys.exit(1)
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / "هيكلية-قاعدة-البيانات"
    sql, n_fks = build_sql()
    (out).mkdir(parents=True, exist_ok=True)
    (out / "schema.sql").write_text(sql, "utf-8")
    build_docx(out / "هيكلية-قاعدة-البيانات.docx", n_fks)
    print("saved", out / "schema.sql", "and", out / "هيكلية-قاعدة-البيانات.docx", "| foreign keys:", n_fks)
