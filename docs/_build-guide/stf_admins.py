# -*- coding: utf-8 -*-
"""Staff guide — part «admins»: the «إدارة الإداريين» file, held by مازن الحلبي (mazen) alone.
Its dashboard (numbers only), then every operation in the menu's order, which is the order of a season:
the rules and the calendar, the reference lists, the administrative references, the permanent cadre and its
events, the applicants and their files, forming groups at the office (in their dates: 6 November), forming
clusters at the office (25 November, before the 30 November deadline: a draft entered then cancelled, so the season
stays as it was, and تكتل الشهباء's contract, exceptional edit and archive), the clusters and groups directory, the letters,
the evaluation and the classification.
Screens that need an administrator's own submission — the programme and the operational plan of تكتل النور sent
by its head — start from admin/state-head-profile.json (adm_c.py head); the rest is the demo's own season.
Usage: CAP_DIR=<folder> python stf_admins.py [a|b|c|d|e]"""
import sys
from cap import ROOT
from stf_common import Staff, STATE

ONLY = sys.argv[1] if len(sys.argv) > 1 else None
D = "[role=dialog]"
M = "/staff/admins/manage"
S_DASH, S_RULES, S_REF, S_REFS, S_CADRE, S_APP, S_GRP, S_CL, S_DIR, S_LET, S_EVAL = "DASH", "RULES", "REF", "REFS", "CADRE", "APP", "GRP", "CL", "DIR", "LET", "EVAL"


def esc(c, p, n=1):
    for _ in range(n):
        p.keyboard.press("Escape"); c.settle(700)


def box(p, c, title, scope="main"):
    """Open a closed box (Box / RecordsBox / «كيف تعمل؟») by its title"""
    b = p.locator(f"{scope} button[aria-expanded=false]:has-text('{title}')").first
    b.scroll_into_view_if_needed(); b.click(); c.settle(800)


def view(p, c, label, wait=1500):
    """A view of the page: the tabs across it or the light links over its list (links kept in the address)"""
    p.locator(f"main nav:not([aria-label='أقسام بوابة الموظفين']) a:has-text('{label}')").first.click(); c.settle(wait)


def filt(p, c, label, wait=800):
    """An in-page filter over a list («الكل (12) | ناقصة (3)»)"""
    p.locator(f"main [role=radiogroup] button:has-text('{label}')").first.click(); c.settle(wait)


def start(storage=None, today="2026-10-11", time="09:00"):
    s = Staff(storage=storage); c, p = s.c, s.p
    c.goto("/staff", wait=800)
    s.clock(today, time)
    s.login("mazen")
    return s, c, p


# ═════════════ A. the dashboard, the rules, the reference lists, the administrative references ═════════════
if ONLY in (None, "a"):
    s, c, p = start()
    c.goto("/staff/admins", wait=2200)
    c.shot("adm-dash", "لوحة التحكم: «كيف تعمل» بخطواته الأربع، وعمليات الملف في القائمة الجانبية بترتيب الموسم", hl=[("aside a[href$='/staff/admins']", "1"), ("aside a[href$='/staff/admins/manage']", "2")], section=S_DASH)
    c.scroll_to("main :text-is('ما ينتظرك الآن')", 300)
    c.shot("adm-dash-todo", "أرقام الإداريين الأربعة، وما ينتظرك الآن: لكل بند زر يفتح مكان عمله", hl=[("main a:has-text('قرّر'), main button:has-text('قرّر')", "")], section=S_DASH)
    c.scroll_to("main h2:has-text('القواعد'), main :text-is('القواعد')", 110)
    c.shot("adm-dash-parts", "حال كل جزء من الملف بترتيب العمل، ولكل جزء رابط «إدارتها»", hl=[("main a:has-text('إدارتها')", "")], section=S_DASH)
    c.scroll_top()
    s.btn("رفع أمر إلى المدير", 900)
    p.locator(f"{D} textarea[aria-label='الأمر المرفوع']").first.fill("رئيس تكتل ابن الوليد يطلب مهلة يومين بعد الموعد النهائي ليستبدل منسقاً اعتذر. نحتاج قراراً قبل إغلاق الطلبات."); c.settle(300)
    c.shot("adm-escalate", "رفع أمر إلى المدير: ما لا تحسمه وحدك يصل إلى مدير الموسم طلبَ تدخّل", hl=[(f"{D} button:has-text('إرسال')", "")], section=S_DASH)
    esc(c, p)

    # ── the rules ──
    s.nav("قواعد الإداريين", 1800)
    c.shot("rules-ops", "قواعد الإداريين — المواعيد: كل عملية بحالتها وبدايتها ونهايتها وساعتيهما", hl=[("main nav[aria-label='أقسام القواعد']", "1"), ("main button:has-text('تلقائي بالتواريخ')", "2")], section=S_RULES)
    view(p, c, "صلاحيات الصفات")
    c.shot("rules-perms", "صلاحيات الصفات: ما تستطيعه كل صفة في بوابة الإداريين، يُحفظ مرة واحدة", hl=[("main button:has-text('حفظ الصلاحيات')", "")], section=S_RULES)
    view(p, c, "الالتزامات")
    c.shot("rules-commit", "الالتزامات: ما يوقّعه كل متقدم، وتحت كل التزام «تعديل» و«إسقاط من الطلب»", hl=[("main tr:has-text('ميثاق الأخلاقيات') button:text-is('تعديل')", "")], section=S_RULES)
    view(p, c, "الشهادات والوثائق")
    c.shot("rules-docs", "الشهادات والوثائق: صلاحية كل وثيقة، والصفات التي تطلبها", hl=[("main button:has-text('إضافة شهادة')", "")], section=S_RULES)
    s.btn("إضافة شهادة", 1000)
    dlg = p.locator(D).last
    dlg.locator("input").first.fill("شهادة دورة الإرشاد في المشاعر"); c.settle(200)
    dlg.locator("input").nth(1).fill("من جهة تدريبية معتمدة"); c.settle(200)
    dlg.locator("button:has-text('سارية عدة مواسم')").first.click(); c.settle(300)
    for role in ["رئيس مجموعة", "معاون"]:
        dlg.locator(f"[role=group][aria-label='ما تطلبه صفة {role}'] button:has-text('تقوّي الطلب')").first.click(); c.settle(200)
    c.shot("rules-doc-form", "إضافة شهادة: اسمها وملاحظتها، ومدة صلاحيتها، وما تطلبه كل صفة منها", hl=[(f"{D} button:has-text('حفظ')", "")], section=S_RULES)
    esc(c, p)
    view(p, c, "المهارات")
    c.shot("rules-skills", "المهارات: يُسأل عنها كل متقدم بنعم أو لا، وإضافة مهارة من المربع الجانبي", hl=[("main aside button:has-text('إضافة المهارة')", "")], section=S_RULES)
    view(p, c, "شروط الصفات")
    c.shot("rules-req", "شروط الصفات: لكل صفة عمود ولكل شرط سطر — العمر والجنس والخبرة، ثم الوثائق", section=S_RULES)
    p.locator("main button[aria-label^='صورة عن الشهادة الجامعية — منسق تقني']").first.click(); c.settle(500)
    c.scroll_to("main select[aria-label='شرط جديد']", 420)
    c.shot("rules-req-save", "إضافة سطر إلى الجدول، ثم «حفظ شروط الصفات» مرة واحدة", hl=[("main select[aria-label='شرط جديد']", "1"), ("main button:has-text('حفظ شروط الصفات')", "2")], section=S_RULES)
    s.btn("حفظ شروط الصفات", 1200)
    view(p, c, "مراحل التقييم")
    c.shot("rules-stages", "مراحل تقييم الإداري: ما يظهر في شاشة «التقييم»", section=S_RULES)
    view(p, c, "الرزنامة")
    c.shot("rules-cal", "رزنامة الإداريين: المواعيد التي يراها الإداري في بوابته", hl=[("main aside button:has-text('إضافة إلى الرزنامة')", "")], section=S_RULES)
    box(p, c, "من «إعدادات الموسم»")
    box(p, c, "خيارات متقدمة")
    box(p, c, "سجل القواعد")
    c.scroll_to("main button:has-text('من «إعدادات الموسم»')", 200)
    c.shot("rules-more", "في أسفل كل قسم: أرقام الإداريين من «إعدادات الموسم»، والإعادة إلى الأصل، وسجل القواعد", section=S_RULES)

    # ── the reference lists ──
    s.nav("القوائم المرجعية", 1800)
    c.shot("ref-roles", "القوائم المرجعية — الصفات: مستوى كل صفة وسلوكها في التكتل، ومن يحملها", hl=[("main button:has-text('إضافة صفة')", "")], section=S_REF)
    p.locator("main tr:has-text('موجّه ديني أ') button:text-is('تعديل')").first.click(); c.settle(1200)
    c.shot("ref-role-form", "تعديل صفة: اسمها ووصفها ومستواها، وسلوكها في التكتل", section=S_REF)
    p.locator(f"{D} button:has-text('حفظ الصفة')").first.scroll_into_view_if_needed(); c.settle(600)
    c.shot("ref-role-form-2", "الاختبار والأعداد: العمر المثبَّت في متوسط التكتل، والاختبارات التي تؤديها الصفة", hl=[(f"{D} button:has-text('حفظ الصفة')", "")], section=S_REF)
    esc(c, p)
    view(p, c, "الفئات والأعداد")
    c.scroll_to("main h2:has-text('فئات المجموعات'), main :text('فئات المجموعات —')", 380)
    c.shot("ref-categories", "الفئات والأعداد: لكل مستوى تكتل تركيبته وأعداد فئاته", section=S_REF)
    view(p, c, "الفروع")
    c.shot("ref-branches", "الفروع والمكاتب: عدد المرتبطين بكل فرع، وإضافة فرع", section=S_REF)
    view(p, c, "التسميات الموسمية")
    c.shot("ref-labels", "التسميات الموسمية الجاهزة: اسم يُعرض مع الصفة الموسمية", section=S_REF)

    # ── the administrative references ──
    s.nav("المراجع الإدارية", 1800)
    c.shot("refs-jobs", "المراجع الإدارية — التوصيف الوظيفي: بطاقة لكل صفة كما تُنشر للكادر", hl=[("main a:has-text('الصفحة العامة')", "")], section=S_REFS)
    p.locator("main tr:has-text('رئيس تكتل') button:text-is('تعديل')").first.click(); c.settle(1000)
    c.shot("refs-job-form", "توصيف صفة: خلاصتها ومهامها، مهمة في كل سطر", hl=[(f"{D} button:has-text('حفظ التوصيف')", "")], section=S_REFS)
    esc(c, p)
    view(p, c, "النظام الإداري")
    c.shot("refs-system", "النظام الإداري: أقسامه بترتيبها كما تُنشر للكادر", hl=[("main button:has-text('إضافة قسم')", "")], section=S_REFS)
    p.locator("main tr:has-text('القسم الخامس') button:text-is('تعديل')").first.click(); c.settle(1200)
    c.shot("refs-system-form", "تحرير قسم: عنوانه ونصه، وإلى جانبه كما يظهر في الصفحة العامة", hl=[(f"{D} button:has-text('حفظ القسم')", "")], section=S_REFS)
    esc(c, p)
    view(p, c, "المقررات الإدارية")
    s.btn("إضافة مقرر", 1000)
    dlg = p.locator(D).last
    dlg.locator("input").first.fill("المقرر 4/1448: مهلة استبدال المنسقين بعد الموعد النهائي"); c.settle(300)
    dlg.locator("textarea").first.fill("يومان بعد الموعد النهائي لاستبدال منسق اعتذر، بكتاب من رئيس التكتل."); c.settle(300)
    dlg.locator("input[type=file]").first.set_input_files({"name": "مقرر-4-1448.pdf", "mimeType": "application/pdf", "buffer": b"%PDF-1.4\n%%EOF\n"}); c.settle(400)
    c.shot("refs-decision", "المقررات الإدارية: مقرر جديد بعنوانه وموسمه ووصفه وملفه", hl=[(f"{D} label:has-text('مقرر-4-1448.pdf')", "1"), (f"{D} button:text-is('نشر')", "2")], section=S_REFS)
    esc(c, p)
    view(p, c, "العقود")
    c.shot("refs-contracts", "نماذج العقود: طرفا كل عقد وملفه", hl=[("main button:has-text('إضافة نموذج')", "")], section=S_REFS)
    s.close()

    # the operational plan of تكتل النور, submitted by its head (administrator run «head»)
    s, c, p = start(STATE / "state-head-profile.json", "2026-11-25", "10:00")
    c.goto(M + "/references?tab=plans", wait=2000)
    c.shot("refs-plans", "الخطط التشغيلية: ما قدّمه رؤساء التكتلات، تُقبل أو تُعاد بملاحظات", hl=[("main tr:has-text('تكتل النور') button:text-is('مراجعة')", "")], section=S_REFS)
    p.locator("main tr:has-text('تكتل النور') button:text-is('مراجعة')").first.click(); c.settle(1200)
    c.shot("refs-plan", "خطة تشغيلية: عنوانها وخلاصتها وملفها، والقبول أو الإعادة بملاحظات", hl=[(f"{D} button:has-text('قبول')", "1"), (f"{D} button:has-text('إعادة')", "2")], section=S_REFS)
    p.locator(f"{D} button:has-text('قبول')").first.click(); c.settle(1500)
    c.shot("refs-plan-accepted", "قُبلت الخطة: تصل إلى رئيس التكتل في «إدارة التكتل»", section=S_REFS)
    s.close()

# ═════════════ B. the cadre and its events, the applicants and their files ═════════════
if ONLY in (None, "b"):
    s, c, p = start()
    s.nav("الكادر الإداري", 2400)
    c.shot("cadre-roster", "الكادر الإداري: كل فرد عبر المواسم، بصفته ومكانه وفرعه وهاتفه وتيليجرامه وحضوره", hl=[("main button:has-text('إضافة فرد إلى الكادر')", "1"), ("main button:has-text('الأعمدة')", "2")], section=S_CADRE)
    s.btn("الأعمدة", 700)
    for lab in ["رقم الباركود", "تاريخ الميلاد"]:
        p.locator(f"{D} label:has-text('{lab}') input").first.check(); c.settle(150)
    c.shot("cadre-columns", "الأعمدة: تختار ما يظهر في الجدول وما يُصدَّر إلى Excel", section=S_CADRE)
    p.locator(f"{D} button:text-is('تم')").first.click(); c.settle(700)
    p.locator("main input[aria-label='بحث في الكادر']").first.fill("هالة"); c.settle(900)
    p.locator("main tbody tr").first.locator("a").first.click(); c.settle(1800)
    c.shot("cadre-person", "ملف الفرد: بياناته، والحساب، والدخول وتيليجرام", section=S_CADRE)
    c.scroll_to("main h2:has-text('الصفة والفئة والفروع'), main :text-is('الصفة والفئة والفروع')", 110)
    p.locator("main label:has-text('حمص') input[type=checkbox]").first.check(); c.settle(500)
    p.locator("main textarea").first.fill("ينسّق مع موجّهات فرع حمص هذا الموسم، بكتاب الفرع"); c.settle(400)
    c.scroll_to("main h2:has-text('الصفة والفئة والفروع'), main :text-is('الصفة والفئة والفروع')", 110)
    c.shot("cadre-person-role", "الصفة والفئة والفروع: كل تعديل بسبب يُكتب في أحداث ملفه", hl=[("main textarea", "1"), ("main button:has-text('حفظ التغييرات')", "2")], section=S_CADRE)
    s.btn("حفظ التغييرات", 1500)
    c.scroll_top()
    s.btn("إيقاف الحساب", 800)
    p.locator(f"{D} textarea[aria-label='السبب']").last.fill("لم يحضر تدريب الكادر الإلزامي، بكتاب الفرع"); c.settle(300)
    c.shot("cadre-stop", "إيقاف الحساب: بسببه، ولا يدخل المنصة حتى يُفعَّل", hl=[(f"{D} button:text-is('تنفيذ')", "")], section=S_CADRE)
    p.locator(f"{D} button:text-is('تنفيذ')").last.click(); c.settle(5500)
    c.scroll_to("main h2:has-text('أحداث ملفه')", 330)
    c.shot("cadre-person-events", "أحداث ملفه: انضمامه إلى تكتل، وكل تعديل عليه، وما يُكتب بيدك", hl=[("main button:has-text('إضافة حدث')", "")], section=S_CADRE)
    p.locator("main a:has-text('الكادر الإداري')").first.click(); c.settle(1800)
    s.btn("إضافة فرد إلى الكادر", 900)
    dlg = p.locator(D).last
    dlg.locator("input").first.fill("02055500123"); c.settle(700)
    dlg.locator("label:has-text('الهاتف') input[type=tel]").first.fill("0933111222")
    dlg.locator("label:has-text('الفرع') select").first.select_option(label="حمص"); c.settle(300)
    dlg.locator("textarea").first.fill("بكتاب فرع حمص رقم 112: معاون من خارج التسجيل الموسمي"); c.settle(300)
    c.shot("cadre-add", "إضافة فرد إلى الكادر: من السجل المدني بالرقم الوطني، بصفته وفرعه وسبب إضافته", hl=[(f"{D} button:has-text('إضافة')", "")], section=S_CADRE)
    esc(c, p)
    view(p, c, "أحداث الكادر")
    c.shot("cadre-events", "أحداث الكادر: ملفات الأفراد كلهم بنوع كل حدث وموسمه وتغييره ومن سجّله", hl=[("main button:has-text('إضافة حدث')", "")], section=S_CADRE)
    view(p, c, "الكادر")
    p.locator("main select").filter(has=p.locator("option:text-is('كل الفروع')")).first.select_option(label="حمص"); c.settle(900)
    s.btn("إرسال تيليجرام", 800)
    p.locator(f"{D} textarea[aria-label='نص الرسالة']").last.fill("تذكير: اجتماع كادر فرع حمص الخميس الساعة 10 في مبنى الفرع"); c.settle(300)
    c.shot("cadre-telegram", "إرسال تيليجرام إلى من في القائمة المعروضة: صفِّها أولاً", hl=[(f"{D} button:has-text('إرسال')", "")], section=S_CADRE)
    p.locator(f"{D} button:has-text('إرسال')").last.click(); c.settle(1200)
    view(p, c, "رسائل تيليجرام", 4500)
    c.shot("cadre-telegram-log", "رسائل تيليجرام: ما أُرسل ومن أرسله ولمن وصل", section=S_CADRE)

    # ── the applicants ──
    s.nav("المتقدمون", 1800)
    c.shot("adm-applicants", "ملفات المتقدمين: وثائق كل ملف، ورسمه، وما ينقصه مما تطلبه صفته", hl=[("main [role=radiogroup] button:has-text('ناقصة أو منتهية')", "")], section=S_APP)
    p.locator("main tr:has-text('أحمد سليمان الحمصي') a:has-text('فتح الملف')").first.click(); c.settle(1800)
    c.shot("adm-file", "الملف الدائم: وثائقه وصلاحيتها، ومهاراته ولغاته، ونتيجة تأهيله", section=S_APP)
    s.close()

# ═════════════ C. forming groups at the office, in their dates (1–10 November) ═════════════
CONTRACTS = ROOT.parent.parent / "public" / "images" / "contracts"


def pick_option(sel, text, fallback=1):
    """A select's option by part of its text, else its n-th option"""
    o = sel.locator("option", has_text=text)
    if o.count():
        sel.select_option(value=o.first.get_attribute("value"))
    else:
        sel.select_option(index=fallback)


if ONLY in (None, "c"):
    # مروان الحلبي passed both tests (adm_a.py): a head without a group, formed at the office as the old requests wait
    s, c, p = start(STATE / "state-passed.json", "2026-11-06", "10:00")
    s.nav("تشكيل المجموعات", 2000)
    c.shot("grp-list", "مجموعات الموسم: «تشكيل مجموعة» للتشكيل في المكتب، وطلب قديم ينتظر قرارك", hl=[("main button:has-text('تشكيل مجموعة')", "1"), ("main tr:has-text('اللطيف') button:has-text('مراجعة واعتماد')", "2")], section=S_GRP)
    # a group head at the office with his team
    s.btn("تشكيل مجموعة", 1200)
    dlg = p.locator(D).last
    # مروان, not a head whose request waits (اللطيف's is reviewed below)
    heads = dlg.locator("select").first
    texts = heads.locator("option").all_inner_texts()
    heads.select_option(index=next(i for i, t in enumerate(texts) if "مروان" in t)); c.settle(800)
    cat = dlg.locator("select").nth(1)
    if not cat.input_value():
        cat.select_option(index=2); c.settle(600)
    for lab in ["الموجّه الديني", "المعاون"]:
        seats = dlg.locator(f"select[aria-label='{lab}']")
        for i in range(seats.count()):
            if seats.nth(i).locator("option").count() > 1:
                seats.nth(i).select_option(index=1); c.settle(400)
    c.shot("grp-form", "تشكيل مجموعة في المكتب: رئيسها المؤهل، واسمها، وفئته، ومن يشغل كل مقعد من فريقها", section=S_GRP)
    dlg.locator("label:has-text('سدّد رسم التشكيل') input").first.check(); c.settle(300)
    dlg.locator("input[type=file][aria-label='عقد المجموعة']").set_input_files(str(CONTRACTS / "group-contract.svg")); c.settle(1800)
    dlg.locator("label:has-text('وقّع العقدَ') input").first.check(); c.settle(300)
    dlg.locator("button:has-text('تشكيل مجموعة')").last.scroll_into_view_if_needed(); c.settle(300)
    c.shot("grp-form-contract", "رسم التشكيل، وعقد المجموعة الموقّع يُرفع صورة، ثم «تشكيل مجموعة …»", hl=[(f"{D} button:has-text('تشكيل مجموعة')", "")], section=S_GRP)
    dlg.locator("button:has-text('تشكيل مجموعة')").last.click(); c.settle(1800)
    filt(p, c, "معتمدة", 1000)
    c.shot("grp-approved-list", "المجموعات المعتمدة: رئيس كل مجموعة وفرعها وفئتها وحجاجها وتكتلها", section=S_GRP)
    # a request filed on the platform before the office formed the groups
    filt(p, c, "تنتظر قرارك", 1000)
    p.locator("main tr:has-text('اللطيف') button:has-text('مراجعة واعتماد')").first.click(); c.settle(1400)
    c.shot("grp-sheet", "طلب قديم ينتظر قرارك: فئة رئيسه، وشروطه، والاعتماد أو الإعادة", hl=[(f"{D} button:has-text('اعتماد المجموعة')", "1"), (f"{D} button:has-text('إعادة إلى رئيسها')", "2")], section=S_GRP)
    p.locator(f"{D} button:has-text('اعتماد المجموعة')").first.click(); c.settle(1600)
    c.shot("grp-approved", "اعتُمدت المجموعة بفئة رئيسها", section=S_GRP)
    esc(c, p)
    s.close()

# ═════════════ D. the clusters, formed at the office (25 November, in their dates) ═════════════
if ONLY in (None, "d"):
    s, c, p = start(today="2026-11-25", time="10:00")
    c.goto(M + "/clusters", wait=2000)
    c.shot("cl-list", "التكتلات: كل تكتل بحاله وشروطه، و«تشكيل تكتل في المكتب»", hl=[("main nav:not([aria-label='أقسام بوابة الموظفين']) a:has-text('التكتلات') >> nth=0", "1"), ("main button:has-text('تشكيل تكتل في المكتب')", "2")], section=S_CL)
    # its head comes to the office with everyone in it
    s.btn("تشكيل تكتل في المكتب", 1000)
    dlg = p.locator(D).last
    pick_option(dlg.locator("select").first, "نبيل الساعاتي"); c.settle(500)
    c.shot("cl-onbehalf", "تشكيل تكتل في المكتب: رئيسه الحاضر واسم التكتل ومستواه", hl=[(f"{D} button:has-text('بدء التشكيل')", "")], section=S_CL)
    dlg.locator("button:has-text('بدء التشكيل')").first.click(); c.settle(2200)
    c.scroll_top()
    grp = p.locator("main select[aria-label='مجموعة تدخل التكتل']").first
    if grp.locator("option").count() > 1:
        grp.select_option(index=1); c.settle(300)
    grp.scroll_into_view_if_needed(); c.settle(300)
    c.shot("cl-desk", "قيد التشكيل في المكتب: الاسم والمستوى، والمجموعات بمقاعد فرقها، وإدخال مجموعة حضر رئيسها", hl=[("main button:has-text('إدخالها')", "")], section=S_CL)
    if grp.input_value():
        p.locator("main button:has-text('إدخالها')").first.click(); c.settle(1200)
    for lst in ["المنسقون التقنيون", "الموجّهات الدينيات", "معاونو التكتل"]:
        sel = p.locator(f"main select[aria-label^='إضافة: {lst}']").first
        if sel.count() and sel.locator("option").count() > 1:
            sel.select_option(index=1); c.settle(900)
    acc = p.locator("main label:has-text('محاسب التكتل') select").first
    if acc.locator("option").count() > 1:
        acc.select_option(index=1); c.settle(900)
    c.scroll_to("main :text('٣. كادر التكتل')", 120)
    c.shot("cl-desk-team", "كادر التكتل يختاره رئيسه: المنسقون والموجّهات ومعاونو التكتل، والمحاسب من أعضائه", section=S_CL)
    c.scroll_to("main :text('٤. توزيع المنسقين')", 120)
    auto = p.locator("main button:has-text('توزيع تلقائي ضمن الحدود')").first
    c.shot("cl-desk-sort", "توزيع المنسقين والموجّهات على المجموعات، كلٌّ ضمن حدّه من الوحدات", hl=[("main button:has-text('توزيع تلقائي ضمن الحدود')", "")], section=S_CL)
    if auto.is_enabled():
        auto.click(); c.settle(1000)
    side = p.locator("main aside:has-text('سدّد رسم التكتل')").last
    side.locator("label:has-text('سدّد رسم التكتل') input").first.check(); c.settle(300)
    side.locator("input[type=file][aria-label='عقد التكتل']").set_input_files(str(CONTRACTS / "cluster-contract.svg")); c.settle(1800)
    side.locator("label:has-text('وقّع العقدَ') input").first.check(); c.settle(300)
    c.scroll_top()
    c.shot("cl-finish", "إنشاء التكتل: شروطه، ورسمه، وعقده الموقّع، ثم «إنشاء التكتل» أو إلغاء التشكيل", hl=[("main aside button:has-text('إنشاء التكتل')", "")], section=S_CL)
    # the demo's season stays as it was: the draft is cancelled
    p.locator("main aside button:has-text('إلغاء هذا التشكيل')").first.click(); c.settle(1800)
    # a cluster formed at the office: its report, its contract, its exceptional edits, the archive
    c.goto(M + "/clusters", wait=1800)
    filt(p, c, "شُكّل في المكتب")
    p.locator("main tr:has-text('تكتل الشهباء للحج والعمرة') a:text-is('فتح')").first.click(); c.settle(1800)
    c.shot("cl-formed", "تكتل شُكّل في المكتب: تقريره، وحاله، وعقده، والطباعة وExcel", section=S_CL)
    up = p.locator("main aside input[type=file][aria-label='عقد التكتل']").first
    up.set_input_files(str(CONTRACTS / "cluster-contract.svg")); c.settle(1800)
    c.scroll_to("main aside :text('عقد التكتل')", 120)
    c.shot("cl-contract", "عقد التكتل: صورته ومن رفعه ومتى، وفتحه أو استبداله", hl=[("main aside label:has-text('استبدال العقد')", "")], section=S_CL)
    c.scroll_top()
    box(p, c, "تعديل استثنائي")
    p.locator("main button:has-text('منسق التكتل — إضافة')").first.click(); c.settle(700)
    who = p.locator("main select[aria-label='من يُضاف']").first
    if who.count() and who.locator("option").count() > 1:
        who.select_option(index=1); c.settle(300)
    p.locator("main textarea[aria-label='سبب التعديل الاستثنائي']").first.fill("منسق ثانٍ لكثرة كبار السن في مجموعات التكتل، بحضور رئيسه في المكتب"); c.settle(300)
    c.scroll_to("main button:has-text('تنفيذ التعديل')", 680)
    c.shot("cl-exceptional", "التعديل الاستثنائي: يُزال الشاغل ويُملأ الشاغر، بسبب يُكتب في ملفه", hl=[("main button:has-text('منسق التكتل — إضافة')", "1"), ("main button:has-text('تنفيذ التعديل')", "2")], section=S_CL)
    c.scroll_top()
    box(p, c, "الأرشيف")
    c.shot("cl-archive", "الأرشيف: التكتل المنشأ يُؤرشف فيخرج من عمل الموسم ويبقى بموسمه", hl=[("main aside button:has-text('أرشفة')", "")], section=S_CL)
    p.locator("main aside button:has-text('أرشفة')").first.click(); c.settle(1500)
    c.goto(M + "/clusters", wait=1800)
    view(p, c, "مجموعات خارج التكتلات")
    c.shot("cl-outside", "مجموعات معتمدة خارج كل تكتل: تُضاف بتعديل استثنائي بعد الموعد النهائي", section=S_CL)
    box(p, c, "مواعيد الاستقبال")
    c.scroll_to("main button:has-text('مواعيد الاستقبال')", 110)
    c.shot("cl-window", "مواعيد الاستقبال: البدء والموعد الأول والموعد النهائي باليوم والساعة", section=S_CL)
    view(p, c, "المؤرشفة", 4000)
    c.shot("cl-archived", "التشكيلات المؤرشفة: بموسمها، ويُستعاد أي منها من صفحته", section=S_CL)
    s.close()

if ONLY in (None, "d"):
    # the programme of تكتل النور, sent by its head (administrator run «head»)
    s, c, p = start(STATE / "state-head-profile.json", "2026-11-25", "10:00")
    c.goto(M + "/clusters?v=programmes", wait=2000)
    p.locator("main tr:has-text('تكتل النور') button:text-is('مراجعة')").first.click(); c.settle(1400)
    c.shot("prof-diff", "برنامج تكتل ينتظر اعتمادك: قبل وبعد لكل حقل عدّله رئيس التكتل", hl=[(f"{D} button:has-text('اعتماد ونشر')", "1"), (f"{D} button:has-text('إعادة مع السبب')", "2")], section=S_CL)
    p.locator(f"{D} button:has-text('اعتماد ونشر')").first.click(); c.settle(1600)
    filt(p, c, "المنشورة")
    c.shot("prof-published", "البرامج المنشورة: يراها الحجاج في «التكتلات والمجموعات»", section=S_CL)
    # the page of the head's own group, sent in the same run
    c.goto(M + "/clusters?v=group-pages", wait=2000)
    p.locator("main tr button:text-is('مراجعة')").first.click(); c.settle(1400)
    c.shot("gp-diff", "صفحة مجموعة تنتظر اعتمادك: ما تغيّر، وصورتها ومعرضها كما ستُنشر", hl=[(f"{D} button:has-text('اعتماد ونشر')", "1"), (f"{D} button:has-text('إعادة مع السبب')", "2")], section=S_CL)
    p.locator(f"{D} button:has-text('اعتماد ونشر')").first.click(); c.settle(1600)
    filt(p, c, "المنشورة")
    c.shot("gp-published", "صفحات المجموعات المنشورة", section=S_CL)
    s.close()

# ═════════════ E. the directory, the letters, the evaluation, the classification ═════════════
if ONLY in (None, "e"):
    s, c, p = start(today="2026-11-25", time="10:00")
    c.goto(M + "/directory", wait=2000)
    c.shot("dir-clusters", "التكتلات: كل تكتل معتمد بموسمه وأرقامه، وأعضاؤه وملاحظة الإدارة", hl=[("main tbody tr >> nth=0 >> button:has-text('الأعضاء')", "")], section=S_DIR)
    p.locator("main tbody tr").first.locator("button:has-text('الأعضاء')").first.click(); c.settle(1400)
    c.shot("dir-members", "أعضاء تكتل: كل فرد بصفته في التكتل ومجموعته", section=S_DIR)
    esc(c, p)
    p.locator("main tbody tr").first.locator("button:text-is('ملاحظة')").first.click(); c.settle(1000)
    p.locator(f"{D} textarea").first.fill("تأخّر في تسليم كشوف الحجاج النهائية يومين."); c.settle(300)
    c.shot("dir-note", "ملاحظة الإدارة على تكتل: الشيء الوحيد الذي يُعدَّل هنا", hl=[(f"{D} button:has-text('حفظ الملاحظة')", "")], section=S_DIR)
    p.locator(f"{D} button:has-text('حفظ الملاحظة')").first.click(); c.settle(1000)
    esc(c, p)
    view(p, c, "المجموعات")
    c.shot("dir-groups", "المجموعات: كل مجموعة في تكتل معتمد بتكتلها وموسمها وفئة رئيسها وحجاجها", section=S_DIR)
    box(p, c, "بدء موسم جديد")
    p.locator("main button:not([aria-expanded]):has-text('بدء موسم جديد')").first.click(); c.settle(900)
    p.locator(f"{D} input[aria-label='رقم الموسم الجديد']").fill("1449")
    p.locator(f"{D} textarea[aria-label='السبب']").fill("انتهاء موسم 1448 وتصنيفه"); c.settle(300)
    c.shot("dir-season", "بدء موسم جديد: تُؤرشف تشكيلات الموسم المعتمدة، وتُختم الطلبات بعده بالموسم التالي", hl=[(f"{D} button:has-text('بدء موسم 1449')", "")], section=S_DIR)
    esc(c, p)

    # ── the letters ──
    s.nav("المراسلات", 1800)
    c.shot("let-list", "المراسلات: غير مقروءة، وبدون رد، وتم الرد، ومغلقة", hl=[("main tr:has-text('لا تصلني رسائل الإدارة') button:has-text('قراءة والرد')", "")], section=S_LET)
    p.locator("main tr:has-text('لا تصلني رسائل الإدارة') button:has-text('قراءة والرد')").first.click(); c.settle(1400)
    p.locator(f"{D} textarea").first.fill("أُعيد إرسال رمزك عبر البوت، وإن لم يصل فخذه من فرع حمص."); c.settle(300)
    c.shot("let-thread", "مراسلة: سياقها ومرفقها، والرد والإغلاق والطباعة", hl=[(f"{D} button:has-text('إرسال الرد')", "")], section=S_LET)
    p.locator(f"{D} button:has-text('إرسال الرد')").first.click(); c.settle(1200)
    esc(c, p)

    # ── the evaluation ──
    s.nav("نتائج التقييم", 1800)
    c.shot("adm-eval-list", "نتائج التقييم: تقييمه لنفسه وتقييم الموظفين والاعتراض والدرجة المعتمدة، للاطلاع فقط", section=S_EVAL)
    p.locator("main tbody tr").first.locator("a:has-text('النتيجة')").first.click(); c.settle(1600)
    c.shot("adm-eval", "نتيجة إداري مرحلةً مرحلة: درجته ودرجة الموظفين والمعتمدة، دون أسماء المقيّمين", section=S_EVAL)

    # ── the classification ──
    s.nav("التصنيف", 1800)
    c.shot("grade-list", "التصنيف: ترتيب المجموعات داخل كل فئة، ومآل كل مجموعة", hl=[("main button:has-text('اعتماد النتائج ونشرها')", "")], section=S_EVAL)
    p.locator("main tbody tr").first.locator("button:has-text('التفاصيل')").first.click(); c.settle(1200)
    c.shot("grade-detail", "تفصيل نتيجة مجموعة", section=S_EVAL)
    esc(c, p)
    s.btn("اعتماد النتائج ونشرها", 1600)
    p.locator("main tbody tr").first.scroll_into_view_if_needed(); c.scroll_top()
    c.shot("grade-published", "اعتُمدت نتائج التصنيف ونُشرت لرؤساء المجموعات والتكتلات", section=S_EVAL)
    box(p, c, "سجل التصنيف")
    c.scroll_to("main button:has-text('سجل التصنيف')", 200)
    c.shot("grade-records", "سجل التصنيف: كل ما جرى في العملية، ومن أجراه ومتى", section=S_EVAL)
    s.close()
print("DONE stf_admins")
