# -*- coding: utf-8 -*-
"""Staff guide — run B: the exam, administrators & groups, admin rules, election, grading, cluster programmes, audit, executive.
Usage: CAP_DIR=staff python stf_b.py <keep> [part]"""
import sys
from cap import Cap, ROOT, truncate
from stf_a import Staff

truncate(int(sys.argv[1]))
ONLY = sys.argv[2] if len(sys.argv) > 2 else None

# ───────── E. administrators.manage ─────────
if ONLY in (None, "e"):
    s = Staff(); c, p = s.c, s.p; S = "E"
    s.login("maher")
    c.goto("/staff/exam", wait=1800)
    c.shot("adm-exams", "إدارة الامتحان: المتقدمون ونتائجهم، ومؤشرات الامتحان", section=S)
    b = p.locator("main button:has-text('إدخال الشفهي')").first
    b.scroll_into_view_if_needed(); c.settle(300)
    c.shot("adm-exams-row", "متقدّم بانتظار نتيجة الشفهي", hl=[("main button:has-text('إدخال الشفهي')", "")], section=S)
    b.click(); c.settle(900)
    dlg = p.locator("[role=dialog]").last
    num = dlg.locator("input[aria-label='درجة الشفهي رقماً']").first
    if num.count(): num.fill("82")
    notes = dlg.locator("input").filter(has_not=dlg.locator("[type=range]")).last
    c.settle(400)
    c.shot("adm-oral", "إدخال درجة الشفهي واللجنة والملاحظات", section=S)
    dlg.locator("button:has-text('حفظ النتيجة')").first.click(); c.settle(1200)
    an = p.locator("main button:text-is('إعلان')").first
    if an.count():
        an.scroll_into_view_if_needed(); c.settle(300)
        c.shot("adm-announce", "إعلان النتيجة النهائية للمتقدّم", hl=[("main button:text-is('إعلان')", "")], section=S)
        an.click(); c.settle(1200)
    s.tab("هيكل الامتحان", 1200)
    c.scroll_to("[role=tablist]", 110)
    c.shot("exam-blueprint", "هيكل الامتحان: أقسام امتحان الصفة وأوزانها وأسئلتها من كل نوع", section=S)
    s.tab("بنك الأسئلة", 1200)
    c.scroll_to("[role=tablist]", 110)
    c.shot("rules-bank", "بنك الأسئلة: ثلاثة أنواع، وسؤال جديد، وتعديل سؤال أو سحبه", hl=[("main button:has-text('سؤال جديد')", "")], section=S)
    s.tab("قواعد الامتحان", 1200)
    c.scroll_to("[role=tablist]", 110)
    c.shot("rules-exam", "إدارة الامتحان: قواعد الامتحان", section=S)
    c.goto("/staff/administrators", wait=1800)
    s.tab("تقييم الإداريين", 1200)
    c.scroll_to("[role=tablist]", 110)
    c.shot("adm-eval", "تقييم الإداري مرحلةً مرحلة", section=S)
    s.tab("الملفات الدائمة", 1200)
    c.scroll_to("[role=tablist]", 110)
    c.shot("adm-files", "الملفات الدائمة للإداريين: الوثائق وصلاحيتها واللغات والمهارات", section=S)
    s.tab("طلبات تشكيل المجموعات", 1200)
    c.scroll_to("[role=tablist]", 110)
    c.shot("adm-groups-view", "طلبات تشكيل المجموعات: الاعتماد لمدير المكتب", section=S)
    c.goto("/staff/admin-rules", wait=1800)
    s.tab("الصفات والالتزامات", 1200)
    c.scroll_to("[role=tablist]", 110)
    c.shot("rules-roles", "الصفات المتاحة والتزامات الإداري", section=S)
    s.tab("شروط الصفات", 1200)
    c.scroll_to("[role=tablist]", 110)
    c.shot("rules-requirements", "شروط الصفات: جدول الموسم — لكل صفة شهاداتها، مطلوبة أو تقوّي الطلب", section=S)
    s.tab("مراحل التقييم", 1200)
    c.scroll_to("[role=tablist]", 110)
    c.shot("rules-stages", "مراحل تقييم الإداري", section=S)
    s.tab("رزنامة الإداريين", 1200)
    c.scroll_to("[role=tablist]", 110)
    c.shot("rules-calendar", "رزنامة الإداريين", section=S)
    s.close()
    # The lists of the administrator's file belong to their own permission: its holder sees that one tab
    s = Staff(); c, p = s.c, s.p
    s.login("rahaf")
    c.goto("/staff/admin-rules", wait=1800)
    c.scroll_to("[role=tablist]", 110)
    c.shot("rules-catalog", "الشهادات والمهارات واللغات: القوائم التي يُبنى منها ملف الإداري (رهف الخطيب)", section=S)
    s.close()
    # A sitting in the hall of مركز دمشق: مروان (eligible, from the administrator run) sits it, نسرين supervises
    s = Staff(storage=str(ROOT / "admin" / "state-eligible.json")); c, p = s.c, s.p
    s.login("maher")
    c.goto("/staff/exam", wait=1800)
    s.tab("المراكز والجلسات", 1200)
    c.scroll_to("[role=tablist]", 110)
    c.shot("exam-centers", "المراكز والجلسات: موعد كل صفة، ومشرف قاعة كل مركز، وتوزيع المتقدمين", section=S)
    s.login("nisreen")
    c.goto("/staff/hall", wait=1800)
    c.shot("hall-idle", "قاعتي الامتحانية: جلسات الصفات ومؤشراتها وفتح القاعة", hl=[("main button:has-text('فتح القاعة')", "")], section=S)
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
    s.login("maher")
    c.goto("/staff/exam", wait=1800)
    s.tab("التصحيح", 1200)
    c.scroll_to("[role=tablist]", 110)
    c.shot("exam-grading", "تصحيح الأسئلة التحريرية: رقم الورقة لا اسم صاحبها", section=S)
    s.close()

# ───────── F. groups.approve (office manager) ─────────
if ONLY in (None, "f"):
    s = Staff(storage=str(ROOT / "staff" / "state-group-submitted.json")); c, p = s.c, s.p; S = "F"
    s.login("mazen")
    c.goto("/staff/administrators", wait=1800)
    s.tab("طلبات تشكيل المجموعات", 1200)
    card = p.locator("main :text('المجموعة 40')").first
    card.scroll_into_view_if_needed(); c.settle(500)
    c.shot("grp-card", "طلب تشكيل المجموعة 40: الشروط مكتملة", section=S)
    ap = p.locator("main button:has-text('اعتماد المجموعة')").filter(visible=True)
    # the enabled one belongs to group 40
    for i in range(ap.count()):
        if ap.nth(i).is_enabled():
            ap.nth(i).scroll_into_view_if_needed(); c.settle(300)
            c.shot("grp-approve", "اعتماد المجموعة", hl=[(f"main button:has-text('اعتماد المجموعة') >> nth={i}", "")], section=S)
            ap.nth(i).click(); c.settle(1500)
            break
    c.shot("grp-approved", "اعتُمدت المجموعة", section=S)
    c.goto("/staff/election", wait=1800)
    c.shot("elec-top", "انتخاب رؤساء التكتلات: فتح باب الترشح", section=S)
    s.btn("فتح باب الترشح", 1500)
    c.shot("elec-open", "الترشح والتصويت مفتوحان: المرشحون والأصوات", section=S)
    s.btn("إغلاق التصويت وإعلان الرؤساء", 1800)
    c.shot("elec-closed", "النتيجة النهائية والتكتلات بعد الانتخاب", section=S)
    s.close()

# ───────── G. cluster programmes (approve a head's edit) ─────────
if ONLY in (None, "g"):
    s = Staff(storage=str(ROOT / "admin" / "state-head-profile.json")); c, p = s.c, s.p; S = "G"
    s.login("mazen")
    c.goto("/staff/cluster-profiles", wait=1800)
    c.shot("prof-top", "برامج التكتلات: تعديلات بانتظار قرارك", section=S)
    c.scroll_to("text=تعديلات بانتظار قرارك", 120)
    c.shot("prof-diff", "مقارنة قبل وبعد لكل حقل عدّله رئيس التكتل", hl=[("main button:has-text('اعتماد ونشر')", "1"), ("main button:has-text('إعادة مع السبب')", "2")], section=S)
    s.btn("اعتماد ونشر", 1500)
    c.shot("prof-published", "اعتُمد البرنامج ونُشر في دليل الخدمات", section=S)
    s.close()

# ───────── H. audit + grading + executive ─────────
if ONLY in (None, "h"):
    s = Staff(); c, p = s.c, s.p; S = "H"
    s.login("tarek")
    c.goto("/staff/audit", wait=1800)
    c.shot("audit-top", "سجل الأحداث: للإضافة فقط", section=S)
    s.btn("تتبّع الطلب 51877", 1200)
    c.shot("audit-trace", "تتبّع طلب عند الاعتراض", section=S)
    c.scroll_to("input[aria-label='بحث في السجل']", 160)
    c.shot("audit-filters", "البحث والتصفية حسب الموظف والصفة والإجراء", section=S)
    c.goto("/staff/grading", wait=1800)
    c.shot("grade-top", "تصنيف المجموعات والتكتلات", section=S)
    c.scroll_by(600)
    c.shot("grade-tier", "الترتيب داخل كل فئة: مرقّاة وثابتة ومخفّضة", section=S)
    c.scroll_top()
    s.btn("اعتماد النتائج ونشرها", 1500)
    c.shot("grade-published", "اعتُمدت نتائج التصنيف ونُشرت", section=S)
    c.goto("/staff/executive", wait=1800)
    c.shot("exec-top", "لوحة الإدارة العليا", section=S)
    c.scroll_by(800)
    c.shot("exec-2", "رضا الحجاج والشكاوى وترتيب التكتلات", section=S)
    s.close()
print("DONE stf_b")
