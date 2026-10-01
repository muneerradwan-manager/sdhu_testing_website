# -*- coding: utf-8 -*-
"""Staff guide — run C: operations room, content, employees, reference data, operational files, medical/transport.
Usage: CAP_DIR=staff python stf_c.py <keep> <part>"""
import sys
from cap import Cap, ROOT, truncate
from stf_a import Staff
def dismiss(p, c):
    for sel in ["[role=dialog] button[aria-label='إغلاق']", "button:text-is('إلغاء')"]:
        b = p.locator(sel).filter(visible=True)
        try:
            if b.count(): b.first.click(timeout=3000); c.settle(600); return
        except Exception: pass
    p.keyboard.press("Escape"); c.settle(600)

truncate(int(sys.argv[1]))
ONLY = sys.argv[2]

# ───────── I. operations.room ─────────
if ONLY == "i":
    s = Staff(); c, p = s.c, s.p; S = "I"
    s.login("fadi")
    c.goto("/staff/operations", wait=2200)
    c.shot("ops-top", "غرفة العمليات: المؤشرات الحية", section=S)
    c.scroll_to("text=خريطة المشاعر — البلاغات الحية", 110)
    c.shot("ops-map", "خريطة المشاعر وطابور البلاغات", section=S)
    row = p.locator("main button:has-text('سليم حسن (66)')").first
    row.scroll_into_view_if_needed(); row.click(); c.settle(1200)
    c.shot("ops-drawer", "تفاصيل البلاغ: الحالة والإسناد ومسار البلاغ", section=S)
    dlg = p.locator("[role=dialog]").last
    sel = dlg.locator("select[aria-label='الجهة المسند إليها']").first
    if sel.count():
        opts = sel.locator("option").all_inner_texts()
        if len(opts) > 1: sel.select_option(label=opts[1])
        dlg.locator("button:text-is('إسناد')").first.click(); c.settle(900)
    ta = dlg.locator("textarea").first
    ta.fill("وصل الفريق الطبي، الحالة مستقرة وتُتابع في الخيمة."); c.settle(300)
    c.shot("ops-update", "إسناد البلاغ وإضافة تحديث", hl=[("[role=dialog] button[aria-label='إضافة تحديث']", "")], section=S)
    p.locator("button[aria-label='إضافة تحديث']").filter(visible=True).first.click(); c.settle(900)
    p.get_by_role("button", name="مغلق", exact=True).filter(visible=True).last.click(); c.settle(1200)
    c.shot("ops-closed", "تغيير حالة البلاغ إلى «مغلق»", section=S)
    p.keyboard.press("Escape"); c.settle(600)
    cl = p.locator("[role=dialog] button[aria-label='إغلاق']")
    if cl.count() and cl.first.is_visible(): cl.first.click(); c.settle(500)
    c.scroll_to("text=تنبؤ: حافلات مزدلفة المبكرة (كبار السن)", 130)
    c.shot("ops-bus", "اقتراح حافلات مزدلفة المبكرة لكبار السن", hl=[("button:has-text('قبول الاقتراح وطلب الحافلة')", "")], section=S)
    s.btn("قبول الاقتراح وطلب الحافلة", 1200)
    c.scroll_to("text=المهام الداخلية", 130)
    c.shot("ops-tasks", "المهام الداخلية (كانبان)", section=S)
    s.btn("مهمة جديدة", 700)
    p.locator("input[placeholder='عنوان المهمة']").filter(visible=True).first.fill("تجهيز مياه باردة عند مدخل مخيم 42")
    c.settle(300)
    c.shot("ops-task-new", "إضافة مهمة جديدة وإسنادها", section=S)
    s.btn("إضافة", 900)
    c.scroll_to("text=سجل المناوبة", 130)
    c.shot("ops-log", "سجل المناوبة", section=S)
    c.goto("/staff/operational-files", wait=1800)
    c.shot("ops-files-view", "الملفات التشغيلية لغرفة العمليات: عرض فقط", section=S)
    s.close()

# ───────── J. content.manage ─────────
if ONLY == "j":
    s = Staff(); c, p = s.c, s.p; S = "J"
    s.login("nour")
    c.goto("/staff/content", wait=2000)
    c.shot("cms-top", "محتوى المنصة: الصفحات والأقسام", section=S)
    ed = p.locator("main button:has-text('الصفحة الرئيسيةمنشورة'), main button:has-text('الصفحة الرئيسية')").first
    ed.scroll_into_view_if_needed(); c.settle(300)
    c.shot("cms-pages", "قائمة الصفحات: اضغط بطاقة الصفحة لتعديلها", hl=[("main button:has-text('واجهة المنصة')", "")], section=S)
    ed.click(); c.settle(1800); c.scroll_top()
    c.shot("cms-editor", "محرر الصفحة: أقسام الصفحة ونموذج القسم", section=S)
    inp = p.locator("main input[type=text], main input:not([type])").first
    if inp.count():
        inp.fill(inp.input_value() + " ✦"); c.settle(800)
    c.shot("cms-edit", "تعديل نص في قسم: يُحفظ في المسودة تلقائياً", hl=[("main button:text-is('نشر')", "1"), ("main button:has-text('حفظ كمسودة')", "2")], section=S)
    s.btn("معاينة", 1200)
    c.shot("cms-preview", "معاينة المسودة قبل النشر", section=S)
    p.keyboard.press("Escape"); c.settle(500)
    c.goto("/staff/content", wait=1800)
    c.scroll_to("text=مجموعات المحتوى", 150)
    c.shot("cms-collections", "مجموعات المحتوى: الأخبار والأسئلة الشائعة والتكتلات والأكاديمية", section=S)
    op = p.locator("main button:has-text('مقالات الأخبار والإعلانات')").first
    op.scroll_into_view_if_needed(); op.click(); c.settle(1500)
    c.scroll_top()
    c.shot("cms-news", "مقالات الأخبار: إضافة مقال جديد أو تعديل مقال", section=S)
    nb = p.locator("main button:has-text('مقال جديد')").first
    if nb.count():
        nb.click(); c.settle(1500); c.scroll_top()
        c.shot("cms-news-new", "نموذج مقال جديد", section=S)
    c.goto("/staff/content", wait=1800)
    for t, key, cap in [("مكتبة الوسائط", "cms-media", "مكتبة الوسائط"), ("النسخ السابقة", "cms-revisions", "النسخ السابقة واستعادتها"), ("الأرشيف", "cms-archive", "الأرشيف واستعادة المحذوف")]:
        s.tab(t, 1200); c.scroll_to("[role=tablist]", 110)
        c.shot(key, cap, section=S)
    s.close()

# ───────── K. staff.create ─────────
if ONLY == "k":
    s = Staff(); c, p = s.c, s.p; S = "K"
    s.login("abusami")
    c.goto("/staff/employees", wait=2000)
    c.shot("emp-top", "الموظفون: البحث والتصفية والجدول", section=S)
    p.locator("input[aria-label='بحث في الموظفين']").first.fill("وسام"); c.settle(900)
    c.shot("emp-search", "البحث عن موظف", section=S)
    p.locator("main tbody tr").first.click(); c.settle(1200)
    c.shot("emp-drawer", "ملف الموظف: البيانات والمشاركة في الموسم والصلاحيات", section=S)
    lk = p.locator("[role=dialog] :text('صفحته كما يراها')").first
    if lk.count():
        lk.click(); c.settle(1500)
        c.shot("emp-asseen", "صفحة الموظف كما يراها هو", section=S)
    p.keyboard.press("Escape"); c.settle(400); p.keyboard.press("Escape"); c.settle(400)
    c.goto("/staff/employees", wait=1800)
    s.btn("إضافة موظف", 1200)
    c.shot("emp-new", "إضافة موظف: البيانات الأساسية", section=S)
    dlg = p.locator("[role=dialog]").last
    def f(label, val):
        el = dlg.locator(f"label:has-text('{label}') input").first
        if el.count(): el.fill(val)
    f("الاسم الأول", "مالك"); f("اسم الأب", "سمير"); f("الكنية", "الحسيني"); f("سنة الميلاد", "1988"); f("الرقم الوطني", "01044400123"); f("هاتف سوريا", "0944400123")
    c.settle(400)
    c.shot("emp-new-filled", "بعد تعبئة بيانات الموظف", section=S)
    add = dlg.locator("button:has-text('إضافة الموظف')").first
    add.scroll_into_view_if_needed(); c.settle(300)
    c.shot("emp-new-save", "حفظ الموظف الجديد", hl=[("[role=dialog] button:has-text('إضافة الموظف')", "")], section=S)
    add.click(); c.settle(1500)
    c.shot("emp-added", "أُضيف الموظف", section=S)
    s.close()

# ───────── L. ops.files ─────────
if ONLY == "l":
    s = Staff(); c, p = s.c, s.p; S = "L"
    s.login("ghassan")
    c.goto("/staff/reference", wait=2000)
    c.shot("ref-hotels", "البيانات المرجعية: الفنادق", section=S)
    s.btn("إضافة فندق", 1000)
    c.shot("ref-hotel-new", "نموذج إضافة فندق", section=S)
    dismiss(p, c)
    s.btn("نقل من موسم 1447", 1000)
    c.shot("ref-copy", "نقل عناصر من موسم 1447", section=S)
    dismiss(p, c)
    for t in ["القطاعات", "المراكز", "المخيمات"]:
        s.tab(t, 1000)
    c.scroll_to("[role=tablist]", 110)
    c.shot("ref-camps", "المخيمات في منى وعرفات", section=S)
    c.goto("/staff/operational-files", wait=2000)
    c.shot("of-top", "الملفات التشغيلية: ثلاثة أنواع لكل موسم", section=S)
    c.scroll_to("text=مناصب إلزامية شاغرة", 150)
    c.shot("of-vacant", "ملف التسكين في مكة: المناصب الإلزامية الشاغرة", section=S)
    asg = p.locator("main button:has-text('إسناد')").first
    asg.click(); c.settle(1500)
    c.shot("of-picker", "اختيار موظف لمنصب شاغر", section=S)
    p.locator("button:text-is('اختيار')").filter(visible=True).first.click(); c.settle(600)
    c.settle(1200)
    c.shot("of-assigned", "بعد إسناد المنصب", section=S)
    c.scroll_top()
    s.btn("معلومات الملف", 1000)
    di = p.locator("label:has-text('رقم القرار') input").filter(visible=True).first
    di.fill("3171"); c.settle(300)
    c.shot("of-info", "معلومات الملف: رقم القرار وفترة العمل", section=S)
    p.locator("button:text-is('حفظ')").filter(visible=True).first.click(); c.settle(1000)
    s.btn("تفعيل الملف", 1500)
    c.shot("of-activate", "محاولة التفعيل: يُفعَّل الملف عند اكتمال المناصب الإلزامية ووجود رقم القرار", section=S)
    s.close()

# ───────── M. medical / transport ─────────
if ONLY == "m":
    for user, key, cap in [("layla", "med", "الفريق الطبي"), ("bassel", "trn", "فريق المواصلات")]:
        s = Staff(); c, p = s.c, s.p; S = "M"
        s.login(user)
        c.scroll_to("text=مهامي اليوم", 130)
        c.shot(f"{key}-tasks", f"{cap}: مهامي اليوم في لوحتي", section=S)
        c.goto("/staff/my-files", wait=1800)
        c.shot(f"{key}-files", f"{cap}: ملفاتي التشغيلية", section=S)
        s.close()
print("DONE stf_c")
