# -*- coding: utf-8 -*-
"""Staff guide — run B: «إدارة الامتحانات» and the hall (E), «إدارة الإداريين» (F, G), audit and the executive board (H).
Usage: CAP_DIR=staff python stf_b.py <keep> [part]"""
import sys
from cap import Cap, ROOT, truncate
from stf_a import Staff

truncate(int(sys.argv[1]))
ONLY = sys.argv[2] if len(sys.argv) > 2 else None
D = "[role=dialog]"

def esc(c, p, n=1):
    for _ in range(n):
        p.keyboard.press("Escape"); c.settle(600)

# ───────── E. «إدارة الامتحانات» (munir), and a sitting in the hall of مركز دمشق (nisreen) ─────────
if ONLY in (None, "e"):
    # مروان (eligible, from the administrator run) waits for his exam in مركز دمشق
    s = Staff(storage=str(ROOT / "admin" / "state-eligible.json")); c, p = s.c, s.p; S = "E"
    TABS = "nav[aria-label='تبويبات إدارة الامتحانات']"
    s.login("munir")
    c.goto("/staff/exam", wait=2000)
    c.shot("ex-top", "ملخص الامتحانات: أرقام الامتحان، وما ينتظرك الآن", hl=[("aside a[href$='/staff/exam']", "1"), ("aside a[href$='/staff/exam/manage']", "2")], section=S)
    c.scroll_to("main h2:has-text('المراكز')", 120)
    c.shot("ex-summary", "المراكز ومشرفو قاعاتها، والامتحانات وحال كل منها", section=S)
    c.goto("/staff/exam/manage", wait=1800)
    c.shot("ex-centers", "إدارة الامتحانات: خمسة تبويبات بترتيب العمل، وأولها المراكز", hl=[(TABS, "")], section=S)
    p.locator("main li:has-text('مركز دمشق') button:has-text('تعديل')").first.click(); c.settle(1200)
    mp = p.locator(f"{D} [role=application]").first
    mp.scroll_into_view_if_needed(); c.settle(2500)
    c.shot("ex-center", "تعديل مركز: قاعته وموقعها على الخريطة، والمحافظات التي يخدمها، ومقاعده ومشرف قاعته", hl=[(f"{D} [role=application]", "")], section=S)
    esc(c, p)
    s.page_tab("الامتحانات")
    c.shot("ex-exams", "الامتحانات: لكل صفة امتحانها الأساسي بموعده ومدته وأسئلته ومراكزه", section=S)
    p.locator("main li button:has-text('تعديل')").first.click(); c.settle(1200)
    c.shot("ex-exam", "تعديل امتحان: اسمه وموعده ومدته ومراكزه", section=S)
    p.locator(f"{D} input[aria-label='اسم القسم']").first.scroll_into_view_if_needed(); c.settle(500)
    c.shot("ex-exam-sections", "أقسام الامتحان: وزن كل قسم، والتصنيفات التي يُسحب منها، وعدد أسئلته من كل نوع", section=S)
    esc(c, p)
    s.page_tab("بنك الأسئلة")
    c.shot("ex-bank", "بنك الأسئلة: ثلاثة أنواع، والتصفية بالصفة والتصنيف والنوع", hl=[("main button:has-text('سؤال جديد')", "")], section=S)
    s.btn("سؤال جديد", 900)
    c.scroll_to("main h3:has-text('سؤال جديد'), main :text-is('سؤال جديد')", 120)
    c.shot("ex-bank-new", "سؤال جديد: نوعه وتصنيفه والصفات التي يدخل امتحانها، ونصه وإجابته", section=S)
    s.page_tab("المتقدمون")
    c.shot("ex-people", "المتقدمون: مركز كل متقدم وحاله، والنقل إلى مركز آخر", section=S)
    # the hall
    s.login("nisreen")
    c.goto("/staff/hall", wait=1800)
    c.shot("hall-idle", "قاعتي الامتحانية: امتحانات المركز ومؤشرات الجلسة وفتح القاعة", hl=[("main button:has-text('فتح القاعة')", "")], section=S)
    s.btn("فتح القاعة", 1200)
    c.goto("/administrator/exam", wait=2200)
    c.goto("/staff/hall", wait=1800)
    b = p.locator("main button:has-text('تأكيد الحضور')").first
    b.scroll_into_view_if_needed(); c.settle(300)
    c.shot("hall-joined", "متقدم فتح حسابه في القاعة: مطابقة الهوية وتأكيد الحضور", hl=[("main button:has-text('تأكيد الحضور')", "")], section=S)
    b.click(); c.settle(900)
    s.btn("بدء الامتحان", 1500)
    c.goto("/administrator/exam", wait=2200)
    for i in range(40):
        box = p.locator("textarea[aria-label='الإجابة التحريرية']")
        if box.count():
            box.first.fill("أهدّئ الحاج، وأبحث معه في الغرفة والفندق، وأبلغ المعاون وغرفة العمليات عبر المنصة، وأنسّق مع البعثة لوثيقة بديلة.")
            c.settle(800)
        elif p.locator("[role=application] [role=radio]").count():
            p.locator("[role=application] [role=radio]").first.click(timeout=5000); c.settle(200)
        nxt = p.locator("button:text-is('التالي')")
        if i >= 9 or not nxt.count():
            break
        # let the question that leaves finish its exit, or its options are clicked as they vanish
        nxt.last.click(); c.settle(700)
    c.goto("/staff/hall", wait=1800)
    c.scroll_top()
    c.shot("hall-running", "الامتحان جارٍ: العدّاد واحد للقاعة، وتقدّم كل متقدم", hl=[("main button:has-text('إنهاء الامتحان')", "")], section=S)
    s.btn("إنهاء الامتحان", 600)
    s.btn("تأكيد الإنهاء", 1500)
    c.shot("hall-ended", "انتهى الامتحان: أُرسلت الأوراق وصُحّحت المؤتمتة", hl=[("main button:has-text('إغلاق القاعة')", "")], section=S)
    s.btn("إغلاق القاعة", 1500)
    c.shot("hall-closed", "أُغلقت القاعة: الحاضرون والغائبون", section=S)
    # the results
    s.login("munir")
    c.goto("/staff/exam/manage/results?s=grading", wait=2200)
    c.shot("ex-grading", "تصحيح الأسئلة التحريرية: رقم الورقة لا اسم صاحبها", section=S)
    dlg = p.locator(D).last
    marks = dlg.locator("button[aria-pressed]")
    if marks.count():
        marks.last.click(); c.settle(300)
        dlg.locator("button:has-text('حفظ الدرجة')").first.click(); c.settle(1200)
    esc(c, p)
    c.goto("/staff/exam/manage/results", wait=1800)
    c.shot("ex-results", "النتائج: قواعد النجاح، وما ينتظر التصحيح والشفهي والإعلان", section=S)
    p.locator("main [role=radio]:has-text('بانتظار الشفهي')").first.click(); c.settle(900)
    b = p.locator("main button:has-text('إدخال الشفهي')").first
    b.scroll_into_view_if_needed(); c.settle(300)
    c.shot("ex-oral-row", "متقدّم بانتظار نتيجة الشفهي", hl=[("main button:has-text('إدخال الشفهي')", "")], section=S)
    b.click(); c.settle(900)
    dlg = p.locator(D).last
    dlg.locator("input[aria-label='درجة الشفهي رقماً']").first.fill("82"); c.settle(400)
    c.shot("ex-oral", "إدخال درجة الشفهي واللجنة والملاحظات", section=S)
    dlg.locator("button:has-text('حفظ النتيجة')").first.click(); c.settle(1200)
    p.locator("main [role=radio]:has-text('جاهزة للإعلان')").first.click(); c.settle(900)
    an = p.locator("main button:text-is('إعلان')").first
    an.scroll_into_view_if_needed(); c.settle(300)
    c.shot("ex-announce", "إعلان النتيجة النهائية للمتقدّم", hl=[("main button:text-is('إعلان')", "")], section=S)
    # the announcement's toast leaves before the rules are shown
    an.click(); c.settle(5800)
    c.scroll_top()
    s.btn("تعديل القواعد", 1000)
    c.shot("ex-rules", "قواعد النجاح: علامة النجاح، وحد الكتابي، ووزنا الكتابي والشفهي", section=S)
    esc(c, p)
    c.scroll_to("main h2:has-text('سجل النتائج')", 120)
    c.shot("ex-records", "سجل النتائج: كل تغيير في هذا الجزء، ومن أجراه ومتى", section=S)
    s.close()

# ───────── F. «إدارة الإداريين» (maher): the summary, the rules, the applicants, evaluation, grading ─────────
if ONLY in (None, "f"):
    s = Staff(); c, p = s.c, s.p; S = "F"
    TABS = "nav[aria-label='تبويبات إدارة الإداريين']"
    s.login("maher")
    c.goto("/staff/admins", wait=2000)
    c.shot("adm-top", "ملخص الإداريين: أرقامهم، وما ينتظرك الآن", hl=[("aside a[href$='/staff/admins']", "1"), ("aside a[href$='/staff/admins/manage']", "2")], section=S)
    c.scroll_to("main h2:has-text('المتقدمون صفةً صفة')", 120)
    c.shot("adm-summary", "حال كل جزء من الملف: القواعد والمتقدمون والمجموعات والتكتلات", section=S)
    c.goto("/staff/admins/manage", wait=1800)
    c.shot("adm-rules", "إدارة الإداريين: ستة تبويبات بترتيب الموسم، وأولها القواعد", hl=[(TABS, "")], section=S)
    for t, key, cap in [
        ("الصفات والالتزامات", "rules-roles", "الصفات المتاحة والتزامات الإداري"),
        ("الشهادات والمهارات واللغات", "rules-catalog", "الشهادات والمهارات واللغات: القوائم التي يُبنى منها ملف الإداري"),
        ("شروط الصفات", "rules-requirements", "شروط الصفات: جدول الموسم — لكل صفة شهاداتها، مطلوبة أو تقوّي الطلب"),
        ("مراحل التقييم", "rules-stages", "مراحل تقييم الإداري"),
        ("الرزنامة", "rules-calendar", "رزنامة الإداريين"),
    ]:
        s.tab(t, 1200)
        c.scroll_to("main [role=tablist]", 110)
        c.shot(key, cap, section=S)
    s.page_tab("المتقدمون", 1800)
    c.scroll_to("main h2:has-text('المتقدمون صفةً صفة')", 120)
    c.shot("adm-applicants", "المتقدمون صفةً صفة: من تقدّم ومن ثبتت أهليته وسدد ونجح وتأهّل", section=S)
    c.scroll_to("main h2:has-text('الملفات الدائمة')", 120)
    c.shot("adm-files", "الملفات الدائمة للإداريين: الوثائق وصلاحيتها وما ينقص كل ملف", section=S)
    s.page_tab("التقييم", 1800)
    c.shot("adm-eval-list", "التقييم مرحلةً مرحلة: من قُيّم في كل مرحلة", section=S)
    p.locator("main button:has-text('ياسر')").first.click(); c.settle(1200)
    dlg = p.locator(D).last
    dlg.locator("[role=radiogroup] [role=radio]:has-text('4')").first.click(); c.settle(400)
    c.shot("adm-eval", "تقييم الإداري: درجة من 1 إلى 5 لكل مرحلة، وملاحظة ودليل", hl=[(f"{D} button:has-text('حفظ التقييم')", "")], section=S)
    dlg.locator("button:has-text('حفظ التقييم')").first.click(); c.settle(1200)
    esc(c, p)
    s.page_tab("التصنيف", 1800)
    c.shot("grade-top", "تصنيف المجموعات والتكتلات ونشره", hl=[("main button:has-text('اعتماد النتائج ونشرها')", "")], section=S)
    c.scroll_by(600)
    c.shot("grade-tier", "الترتيب داخل كل فئة: مرقّاة وثابتة ومخفّضة", section=S)
    c.scroll_top()
    s.btn("اعتماد النتائج ونشرها", 1500)
    c.shot("grade-published", "اعتُمدت نتائج التصنيف ونُشرت", section=S)
    c.scroll_to("main h2:has-text('سجل التصنيف')", 120)
    c.shot("adm-records", "سجل التصنيف: كل تغيير في هذا الجزء، ومن أجراه ومتى", section=S)
    s.close()

# ───────── G. «إدارة الإداريين» (mazen): a group's request, the election, a cluster's programme ─────────
if ONLY in (None, "g"):
    s = Staff(storage=str(ROOT / "staff" / "state-group-submitted.json")); c, p = s.c, s.p; S = "G"
    s.login("mazen")
    c.goto("/staff/admins/manage/groups", wait=1800)
    c.shot("grp-capacity", "فئات المجموعات: لكل فئة شرطها وسعتها وفريقها", hl=[("main button:has-text('تعديل الفئات')", "")], section=S)
    s.btn("تعديل الفئات", 1000)
    c.shot("grp-capacity-edit", "تعديل الفئات: من تنطبق عليه كل فئة، وسعتها، وفريقها، وترتيبها", section=S)
    esc(c, p)
    # the request of the guide's new head, group 28: its card, by its heading
    card = p.locator("main div.space-y-4:has(h3:text-is('المجموعة 28'))").first
    card.scroll_into_view_if_needed(); c.settle(500)
    c.shot("grp-card", "طلب تشكيل المجموعة 28: الشروط مكتملة، وسعتها وفريقها بفئة رئيسها", section=S)
    ap = card.locator("button:has-text('اعتماد المجموعة')").first
    ap.scroll_into_view_if_needed(); c.settle(300)
    c.shot("grp-approve", "اعتماد المجموعة", hl=[("main div.space-y-4:has(h3:text-is('المجموعة 28')) button:has-text('اعتماد المجموعة')", "")], section=S)
    ap.click(); c.settle(1500)
    c.shot("grp-approved", "اعتُمدت المجموعة", section=S)
    # a request whose head is not qualified yet (group 27): sent back with what it lacks
    ret = p.locator("main div.space-y-4:has(h3:text-is('المجموعة 27')) button:has-text('إعادة إلى رئيسها')").first
    ret.scroll_into_view_if_needed(); ret.click(); c.settle(900)
    c.shot("grp-return", "طلب ناقص: يُعاد إلى رئيسه بملاحظة بما ينقصه", hl=[(f"{D} button:has-text('إعادة مع الملاحظة')", "")], section=S)
    p.locator(f"{D} button:has-text('إعادة مع الملاحظة')").first.click(); c.settle(1200)
    c.scroll_to("main h2:has-text('المجموعات المعتمدة')", 120)
    c.shot("grp-list", "المجموعات المعتمدة: رئيس كل مجموعة وسعتها وفريقها وتكتلها", section=S)
    c.goto("/staff/admins/manage/clusters", wait=1800)
    c.shot("elec-top", "انتخاب رؤساء التكتلات: فتح باب الترشح", hl=[("main button:has-text('فتح باب الترشح')", "")], section=S)
    s.btn("فتح باب الترشح", 1500)
    c.shot("elec-open", "الترشح والتصويت مفتوحان: المرشحون والأصوات", hl=[("main button:has-text('إغلاق التصويت وإعلان الرؤساء')", "")], section=S)
    s.btn("إغلاق التصويت وإعلان الرؤساء", 1800)
    c.shot("elec-closed", "النتيجة النهائية: رؤساء التكتلات المنتخبون", section=S)
    s.close()
    # The head of تكتل النور created his cluster, chose his deputy and sent his programme (administrator run «head»)
    s = Staff(storage=str(ROOT / "admin" / "state-head-profile.json")); c, p = s.c, s.p
    s.login("mazen")
    c.goto("/staff/admins/manage/clusters", wait=1800)
    c.scroll_to("main h2:has-text('التكتلات بعد الانتخاب')", 120)
    c.shot("adm-clusters", "التكتلات بعد الانتخاب: رئيس كل تكتل ومعاونه", section=S)
    c.scroll_to("main h2:has-text('برامج تنتظر اعتمادك')", 120)
    c.shot("prof-diff", "برنامج تكتل ينتظر اعتمادك: قبل وبعد لكل حقل عدّله رئيس التكتل", hl=[("main button:has-text('اعتماد ونشر')", "1"), ("main button:has-text('إعادة مع السبب')", "2")], section=S)
    s.btn("اعتماد ونشر", 1500)
    c.scroll_to("main h2:has-text('البرامج المنشورة')", 120)
    c.shot("prof-published", "اعتُمد البرنامج ونُشر في دليل الخدمات", section=S)
    s.close()

# ───────── H. audit + the executive board ─────────
if ONLY in (None, "h"):
    s = Staff(); c, p = s.c, s.p; S = "H"
    s.login("tarek")
    c.goto("/staff/audit", wait=1800)
    c.shot("audit-top", "سجل الأحداث: للإضافة فقط", section=S)
    s.btn("تتبّع الطلب 51877", 1200)
    c.shot("audit-trace", "تتبّع طلب عند الاعتراض", section=S)
    c.scroll_to("input[aria-label='بحث في السجل']", 160)
    c.shot("audit-filters", "البحث والتصفية حسب الموظف والصفة والإجراء", section=S)
    c.goto("/staff/executive", wait=1800)
    c.shot("exec-top", "لوحة الإدارة العليا", section=S)
    c.scroll_by(800)
    c.shot("exec-2", "رضا الحجاج والشكاوى وترتيب التكتلات", section=S)
    s.close()
print("DONE stf_b")
