# -*- coding: utf-8 -*-
"""Staff guide — part «mission»: «إدارة الموظفين» (abusami), «الملفات التشغيلية والبيانات المرجعية» (ghassan),
«إدارة الطيران» (haitham) and the airport's representative (omar), each in the order its work is done.
Every chapter starts from a fresh browser (the demo data as the site ships it); none depends on the demo date.
Usage: CAP_DIR=<folder> python stf_mission.py [emp|of|fl]   (no argument: the three chapters, in order)"""
import sys
from stf_common import Staff

ONLY = sys.argv[1] if len(sys.argv) > 1 else None
D = "[role=dialog]"


def run(part):
    return ONLY in (None, part)


def quiet(c, ms=5600):
    """Let the toasts of the last action fade before the next shot"""
    c.settle(ms)


def side(href):
    """An entry of the portal's menu by its address"""
    return f"aside:not([role=dialog]) a[href$='{href}']"


# ═════════════════════════ 1. «إدارة الموظفين» — abusami ═════════════════════════
if run("emp"):
    s = Staff(); c, p = s.c, s.p; S = "emp"
    s.login("abusami")
    # ── the dashboard: numbers only
    c.goto("/staff/employees", wait=2200)
    c.shot("emp-dash", "لوحة التحكم في ملف الموظفين: كيف تعمل، وأرقام السجل والحسابات والموسم",
           hl=[(side("/staff/employees"), "1"), ("main button:has-text('رفع أمر إلى المدير')", "2")], section=S)
    c.scroll_to("main :text('ما ينتظرك الآن')", 120)
    c.shot("emp-todo", "ما ينتظرك الآن: كل بند بزر يفتح مكان العمل", hl=[("main a:has-text('أكملها'), main button:has-text('أكملها')", "")], section=S)
    c.scroll_to("main :text('تركيب السجل')", 110)
    c.shot("emp-figures", "تركيب السجل، وحسابات البوابة، والمشاركة في الموسم حسب البعثة", section=S)

    # ── the register
    s.nav("سجل الموظفين", 2000)
    c.shot("emp-register", "سجل الموظفين: العروض بأعدادها، والبحث، والمرشحات، وزر «إضافة موظف»",
           hl=[(side("/staff/employees/manage"), "1"), ("main nav[aria-label='عرض السجل']", "2"), ("main input[aria-label='بحث في الموظفين']", "3")], section=S)
    p.locator("main nav[aria-label='عرض السجل'] button:has-text('سجلات ناقصة')").first.click(); c.settle(900)
    c.shot("emp-incomplete", "عرض «سجلات ناقصة»: ما ينقص كل سجل، و«أكمل سجله» تحت اسمه",
           hl=[("main tbody tr >> nth=0 >> a:has-text('أكمل سجله')", "")], section=S)
    p.locator("main tbody tr").first.locator("a:has-text('أكمل سجله')").click(); c.settle(1800)
    c.shot("emp-edit", "شاشة الموظف: سجله في الوسط، وفي الجانب الحفظ والحالة ومواقعه ورحلتاه وحسابه",
           hl=[("main p:has-text('ينقص سجله')", "1"), ("main button:has-text('حفظ التعديلات')", "2")], section=S)
    phone = p.locator("main label:has-text('هاتف سوريا') input").first
    phone.scroll_into_view_if_needed(); phone.fill("0944 512 778"); c.settle(400)
    c.shot("emp-edit-phone", "إكمال الحقل الناقص (هاتف سوريا)", hl=[("main label:has-text('هاتف سوريا') input", "1"), ("main button:has-text('حفظ التعديلات')", "2")], section=S)
    p.locator("main button:has-text('حفظ التعديلات')").first.click(); c.settle(1200)
    c.scroll_top()
    c.shot("emp-edit-saved", "حُفظت التعديلات: اختفى تنبيه السجل الناقص", section=S)
    quiet(c)

    # ── his page as he sees it, from an employee with posts
    c.goto("/staff/employees/manage", wait=1800)
    p.locator("main input[aria-label='بحث في الموظفين']").first.fill("نادر يوسف"); c.settle(900)
    p.locator("main tbody tr").first.locator("a").first.click(); c.settle(1800)
    c.shot("emp-posts", "موظف له موقع: «المواقع في الملفات التشغيلية» و«رحلتاه» في الجانب",
           hl=[("main aside button:has-text('صفحته كما يراها')", "")], section=S)
    p.locator("main aside button:has-text('صفحته كما يراها')").first.click(); c.settle(1800)
    c.shot("emp-asseen", "صفحته كما يراها: «ملفاتي التشغيلية» كما تظهر للموظف نفسه", section=S)
    p.keyboard.press("Escape"); c.settle(700)

    # ── suspending someone who holds a post asks first
    c.goto("/staff/employees/manage", wait=1800)
    p.locator("main input[aria-label='بحث في الموظفين']").first.fill("نادر يوسف"); c.settle(900)
    p.locator("main tbody tr").first.locator("button:has-text('إيقاف')").click(); c.settle(900)
    c.shot("emp-suspend", "إيقاف موظف له موقع: يُطلب التأكيد أولاً", hl=[(f"{D} button:has-text('تراجع')", "")], section=S)
    p.locator(f"{D} button:has-text('تراجع')").first.click(); c.settle(700)

    # ── adding an employee: his own screen
    s.link("إضافة موظف", 1800)  # a sub-page of the register: its button, not an entry of the menu
    def fill(label, val):
        p.locator(f"main label:has-text('{label}') input").first.fill(val)
    # the record of رزان الحسن, whose portal account has none yet (linked in the next section)
    fill("الاسم الأول", "رزان"); fill("اسم الأب", "محمود"); fill("الكنية", "الحسن")
    p.locator("main label:has-text('الجنس') select").first.select_option("female")
    fill("سنة الميلاد", "1994"); fill("الرقم الوطني", "01044400123")
    c.settle(300)
    c.shot("emp-new", "إضافة موظف: الاسم والجنس وسنة الميلاد والرقم الوطني والمحافظة والمسمى والبعثة",
           hl=[("aside nav div.border-r-2", "1"), ("main label:has-text('الاسم الأول') input", "2")], section=S)
    fill("هاتف سوريا", "0944 400 123")
    c.scroll_top()
    c.shot("emp-new-more", "نوع الموظف، والهواتف، واللغات، و«مشارك في موسم 1448»، ثم «إضافة الموظف»",
           hl=[("main label:has-text('نوع الموظف') select", "1"), ("main label:has(input[type=checkbox])", "2"), ("main button:has-text('إضافة الموظف')", "3")], section=S)
    p.locator("main button:has-text('إضافة الموظف')").first.click(); c.settle(1800)
    c.scroll_top()
    c.shot("emp-new-saved", "أُضيف الموظف: تُفتح شاشته باسمه", section=S)
    quiet(c)

    # ── the portal accounts: each tied to its owner's record
    s.nav("حسابات البوابة", 2000)
    c.shot("emp-accounts", "حسابات البوابة: صلاحيات كل حساب ومواقعه الميدانية، وسجل صاحبه",
           hl=[(side("/staff/employees/manage/accounts"), "1"), ("main nav[aria-label='عرض الحسابات']", "2"), ("main tbody tr >> nth=0 >> td >> nth=0", "3")], section=S)
    p.locator("main tbody tr").first.locator("button:has-text('ربط بسجل')").click(); c.settle(1500)
    c.shot("emp-account", "حساب بلا سجل: البحث عن سجل صاحبه بين الموظفين الذين لا حساب لهم", hl=[(f"{D} button:has-text('ربط')", "")], section=S)
    p.locator(f"{D} button:has-text('ربط')").first.click(); c.settle(1500)
    quiet(c)
    c.shot("emp-account-linked", "رُبط الحساب: «افتح سجله» و«فك الربط»، و«إرسال كلمة مرور مؤقتة»",
           hl=[(f"{D} button:has-text('إرسال كلمة مرور مؤقتة')", "")], section=S)
    p.keyboard.press("Escape"); c.settle(800)
    quiet(c, 3000)

    # ── the season's participants
    s.nav("المشاركون في الموسم", 2000)
    c.shot("emp-season", "المشاركون في الموسم: مواقع كل مشارك في الملفات، ورحلتا ذهابه وعودته",
           hl=[(side("/staff/employees/manage/season"), "1"), ("main nav[aria-label='عرض المشاركين']", "2"), ("main button:has-text('تسجيل موظف في الموسم')", "3")], section=S)
    p.locator("main button:has-text('تسجيل موظف في الموسم')").first.click(); c.settle(1000)
    c.shot("emp-season-out", "غير المشاركين: مواسمهم السابقة، و«تسجيله في الموسم» تحت اسم كل منهم",
           hl=[("main tbody tr >> nth=0 >> button:has-text('تسجيله في الموسم')", "")], section=S)
    p.locator("main tbody tr").first.locator("button:has-text('تسجيله في الموسم')").click(); c.settle(1200)
    quiet(c)
    p.locator("main button:has-text('سجل المشاركة في الموسم')").first.click(); c.settle(1000)
    c.scroll_to("main button:has-text('سجل المشاركة في الموسم')", 260)
    c.shot("emp-season-records", "سجل المشاركة في الموسم: كل تسجيل وإلغاء، ومن أجراه ومتى",
           hl=[("main button:has-text('سجل المشاركة في الموسم')", "")], section=S)
    s.close()


# ═════════════════ 2. «الملفات التشغيلية والبيانات المرجعية» — the reference lists are rima's, the files ghassan's ═════════════════
if run("of"):
    s = Staff(); c, p = s.c, s.p; S = "of"
    s.login("rima")
    # ── the reference data
    s.nav("البيانات المرجعية", 2000)
    c.shot("refd-hotels", "البيانات المرجعية: الفنادق والقطاعات والمراكز والمخيمات لكل موسم",
           hl=[(side("/staff/reference"), "1"), ("main [role=tablist] >> nth=1", "2"), ("main button:has-text('إضافة فندق')", "3"), ("main button:has-text('نقل من موسم')", "4")], section=S)
    p.locator("main button:has-text('إضافة فندق')").first.click(); c.settle(1200)
    dlg = p.locator(D).last
    dlg.locator("label:has-text('اسم الفندق') input").first.fill("فندق إشراقة العزيزية")
    dlg.locator("label:has-text('الحي') input").first.fill("العزيزية")
    dlg.locator("label:has-text('المسافة عن الحرم') input").first.fill("3.1 كم")
    dlg.locator("label:has-text('الطاقة الاستيعابية') input").first.fill("520")
    dlg.locator("label:has-text('رقم الترخيص') input").first.fill("22871190")
    c.settle(400)
    c.shot("refd-hotel-new", "إضافة فندق: الاسم والمدينة والحي والمسافة والطاقة والترخيص", hl=[(f"{D} button:has-text('حفظ')", "")], section=S)
    dlg.locator("button:has-text('حفظ')").last.click(); c.settle(1200)
    quiet(c)
    p.locator("main button:has-text('نقل من موسم')").first.click(); c.settle(1000)
    p.locator(f"{D} input[type=checkbox]").first.check(); c.settle(400)
    c.shot("refd-copy", "نقل من موسم 1447: ما كان في الموسم السابق وليس في هذا الموسم", hl=[(f"{D} button:has-text('نقل 1')", "")], section=S)
    p.locator(f"{D} button:has-text('نقل 1')").first.click(); c.settle(1200)
    quiet(c)
    p.get_by_role("tab", name="المخيمات").first.click(); c.settle(1000)
    c.shot("refd-camps", "المخيمات: رقم المخيم وموقعه وطاقته، والمركز الذي هو فيه في الملف", section=S)

    # ── the operational files: the head of the mission's affairs
    s.logout(); s.login("ghassan")
    s.nav("الملفات التشغيلية", 2000)
    c.shot("of-list", "الملفات التشغيلية: ملف لكل نوع في كل موسم، بحالته وقراره ومناصبه الشاغرة",
           hl=[(side("/staff/operational-files"), "1"), ("main tbody tr >> nth=0 >> td >> nth=0", "2")], section=S)
    # the Madinah file: the hotels of Madinah alone, the staff sorted straight on them
    c.goto("/staff/operational-files?type=madinah-housing&season=1448", wait=2500)
    c.shot("of-madinah", "ملف التسكين في المدينة المنورة: فنادقها وحدها، والموظفون المسندون إلى كل فندق", hl=[("main button:has-text('إضافة فندق')", "1")], section=S)
    s.nav("الملفات التشغيلية", 2000)
    p.locator("main tbody tr").first.locator("a:has-text('تعديل')").click(); c.settle(2200)
    c.shot("of-file", "ملف التسكين في مكة: المناصب الإلزامية الشاغرة، والقطاعات وأبراجها، وفي الجانب حالة الملف",
           hl=[("main section:has(h2:has-text('مناصب إلزامية شاغرة'))", "1"), ("main button:has-text('تفعيل الملف')", "2")], section=S)
    c.scroll_to("main h2:has-text('القطاعات')", 110)
    c.shot("of-sector", "قطاع في الملف: رئيسه ومعاونه، وأبراجه بمشرفيها وحجاجها", hl=[("main button:has-text('إضافة قطاع')", "")], section=S)
    # a tower's sheet
    c.scroll_top()
    tw = p.locator("main tbody tr").first.locator("button:has-text('تعديل')").first
    tw.scroll_into_view_if_needed(); tw.click(); c.settle(1500)
    c.shot("of-tower", "صفحة البرج: الحجاج والتكتلات فيه، ومناصبه", section=S)
    p.keyboard.press("Escape"); c.settle(800)
    # fill the vacant mandatory posts, the first one on camera
    c.scroll_top()
    gap = "main section:has(h2:has-text('مناصب إلزامية شاغرة')) li button"
    p.locator(gap).first.click(); c.settle(1500)
    c.shot("of-picker", "اختيار موظف للمنصب: المشاركون في الموسم، بمواقعهم الحالية والسابقة",
           hl=[(f"{D} button:text-is('اختيار') >> nth=0", "")], section=S)
    p.locator(f"{D} button:text-is('اختيار')").first.click(); c.settle(1500)
    c.shot("of-assigned", "بعد الإسناد: نقص عدد المناصب الشاغرة", hl=[("main section:has(h2:has-text('مناصب إلزامية شاغرة'))", "")], section=S)
    for _ in range(6):
        if not p.locator(gap).count():
            break
        p.locator(gap).first.click(); c.settle(1300)
        pick = p.locator(f"{D} button:text-is('اختيار')")
        pick.first.click(); c.settle(1300)
    quiet(c)
    # the decision number, then activate
    p.locator("main button:has-text('معلومات الملف')").first.click(); c.settle(900)
    p.locator(f"{D} label:has-text('رقم القرار') input").first.fill("3171"); c.settle(300)
    c.shot("of-info", "معلومات الملف: رقم القرار، وبداية العمل ونهايته، والتقارير الدورية", hl=[(f"{D} label:has-text('رقم القرار') input", "1"), (f"{D} button:has-text('حفظ')", "2")], section=S)
    p.locator(f"{D} button:has-text('حفظ')").last.click(); c.settle(1000)
    c.scroll_top()
    c.shot("of-ready", "اكتملت المناصب الإلزامية ودُوّن رقم القرار: الملف جاهز للتفعيل", hl=[("main button:has-text('تفعيل الملف')", "")], section=S)
    p.locator("main button:has-text('تفعيل الملف')").first.click(); c.settle(1300)
    c.shot("of-active", "فُعّل الملف: وصل إلى كل موظف إشعار بموقعه", section=S)
    s.close()


# ═════════════════════════ 3. «إدارة الطيران» — haitham, then omar ═════════════════════════
ROW = lambda no: f"main table tbody tr:has(a:text-is('{no}'))"


if run("fl"):
    s = Staff(); c, p = s.c, s.p; S = "fl"

    def open_flight(no, wait=1800):
        c.goto("/staff/flights/manage/flights", wait=1600)
        a = p.locator(f"{ROW(no)} a:text-is('{no}')").first
        a.scroll_into_view_if_needed(); a.click(); c.settle(wait)

    def dbtn(text, wait=1200):
        b = p.locator(f"{D} button:has-text('{text}')").filter(visible=True).last
        b.scroll_into_view_if_needed(); b.click(); c.settle(wait)

    def sbtn(text, wait=1300):
        """A button of the flight screen's side boxes"""
        b = p.locator(f"main aside button:has-text('{text}')").filter(visible=True).first
        b.scroll_into_view_if_needed(); b.click(); c.settle(wait)

    def emergencies():
        """Open the closed «ظروف طارئة» box"""
        b = p.locator("main aside button[aria-expanded]:has-text('ظروف طارئة')").first
        if b.get_attribute("aria-expanded") == "false":
            b.click(); c.settle(500)
        b.scroll_into_view_if_needed(); c.settle(300)

    s.login("haitham")
    # ── the dashboard
    c.goto("/staff/flights", wait=2300)
    c.shot("fl-dash", "لوحة التحكم في ملف الطيران: كيف تعمل، وأرقام الموسم",
           hl=[(side("/staff/flights"), "1"), ("main a:has-text('إدارة الطيران')", "2")], section=S)
    c.scroll_to("main :text('ما ينتظرك الآن')", 120)
    c.shot("fl-todo", "ما ينتظرك الآن: مطار بلا مندوب، ومسودة لم تُنشر، ومجموعات وموظفون بلا رحلة", section=S)
    c.scroll_to("main h2:has-text('المطارات ومندوبوها')", 110)
    c.shot("fl-figures", "المطارات ومندوبوها، والرحلات القادمة بإشغالها", section=S)

    # ── airports and their representatives, carriers
    s.nav("المطارات ومندوبوها", 2000)
    jed = "main tbody tr:has-text('JED')"
    c.scroll_by(230)
    c.shot("fl-airports", "المطارات ومندوبوها: مندوب كل مطار، ورحلاته مغادرةً ووصولاً",
           hl=[(side("/staff/flights/manage"), "1"), ("main [role=radiogroup][aria-label='تصفية المطارات']", "2"), (f"{jed} td >> nth=0", "3")], section=S)
    p.locator(f"{jed} button:text-is('تعديل')").first.click(); c.settle(1200)
    c.shot("fl-airport-rep", "صفحة المطار: بياناته، ومندوبه للاطلاع", hl=[(f"{D} div:has(> p:text-is('مندوب المطار'))", "1"), (f"{D} button:has-text('حفظ')", "2")], section=S)
    dbtn("إلغاء", 900)
    # Jeddah's representative: the director grants عمر الشامي «رحلات المطار» for Jeddah too, at «صلاحيات الموظفين»
    s.logout(); s.login("nour.a")
    c.goto("/staff/access?id=omar", wait=2200)
    ap = "main section:has(> button:has-text('رحلات المطار'))"
    p.locator(f"{ap} button[aria-pressed]:has-text('الملك عبد العزيز')").first.click(); c.settle(400)
    c.scroll_to(ap, 110)
    c.shot("fl-rep-grant", "مندوب لجدة: نطاق «رحلات المطار» لعمر الشامي يصير دمشق وجدة", hl=[(f"{ap} button[aria-pressed]:has-text('الملك عبد العزيز')", "1")], section=S)
    s.btn("مراجعة التغييرات وحفظها", 1000)
    p.locator("[role=dialog] button:text-is('حفظ')").first.click(); c.settle(1500)
    quiet(c)
    s.logout(); s.login("haitham")
    s.nav("المطارات ومندوبوها", 2000)
    c.scroll_to(jed, 380)
    c.shot("fl-airport-saved", "عمر الشامي مندوب جدة في قائمة المطارات", hl=[(f"{jed} td >> nth=2", "")], section=S)
    dam = "main tbody tr:has-text('DAM')"
    p.locator(f"{dam} button:text-is('تعديل')").first.click(); c.settle(1200)
    ret = p.locator(D).last.locator("p:has-text('من يقلع منه يعود إلى')").first
    ret.scroll_into_view_if_needed(); c.settle(400)
    c.shot("fl-airport-return", "مطار دمشق: إلى أين يعود من يقلع منه", hl=[(f"{D} div:has(> p:has-text('من يقلع منه يعود إلى'))", "")], section=S)
    dbtn("إلغاء", 900)
    s.nav("الناقلون الجويون", 1800)
    c.shot("fl-carriers", "الناقلون الجويون: رمز كل ناقل وهاتف التنسيق ورحلاته",
           hl=[(side("/staff/flights/manage/carriers"), "1"), ("main button:has-text('إضافة ناقل')", "2")], section=S)

    # ── the flights
    s.nav("الرحلات", 2000)
    c.shot("fl-list", "الرحلات: المسار والموعد والمقاعد والمجموعات والحالة، و«فتح | تعديل البيانات» تحت كل رحلة",
           hl=[(side("/staff/flights/manage/flights"), "1"), ("main [role=radiogroup][aria-label='الحالة']", "2"), ("main button:has-text('إضافة رحلة')", "3")], section=S)

    # ── a round trip for employees: two drafts, published together
    p.locator("main button:has-text('إضافة رحلة')").first.click(); c.settle(1300)
    m = p.locator(D).last
    m.locator("label:has-text('لمن الرحلة') select").select_option("staff"); c.settle(300)
    m.locator("[role=radio]:has-text('ذهاب وعودة')").click(); c.settle(300)
    m.locator("label:has-text('السعة') input").fill("6")
    fn = m.locator("input[placeholder='RB 513']")
    fn.nth(0).fill("RB 415"); fn.nth(1).fill("RB 416"); c.settle(400)
    c.shot("fl-new", "رحلة جديدة: لمن الرحلة، ونوعها (ذهاب فقط، عودة فقط، ذهاب وعودة)، والسعة",
           hl=[(f"{D} label:has-text('لمن الرحلة') select", "1"), (f"{D} [role=radiogroup]", "2"), (f"{D} label:has-text('السعة') input", "3")], section=S)
    m.locator("h3:has-text('رحلة العودة')").first.evaluate("el => el.scrollIntoView({block: 'start'})"); c.settle(500)
    c.shot("fl-new-return", "في «ذهاب وعودة» تُملأ رحلة العودة تحت رحلة الذهاب، ثم «حفظ الرحلتين»", hl=[(f"{D} button:has-text('حفظ الرحلتين')", "")], section=S)
    dbtn("حفظ الرحلتين", 2200)
    c.shot("fl-draft", "صفحة الرحلة وهي مسودة: «نشر الرحلتين» في مربع الحالة، والرحلة المقابلة في بياناتها",
           hl=[("main aside button:has-text('نشر الرحلتين')", "")], section=S)
    sbtn("نشر الرحلتين", 1500)
    quiet(c)
    p.locator("main button:has-text('إسناد موظفين')").first.click(); c.settle(1400)
    pk = p.locator(D).last
    for i in range(4):
        pk.locator("ul li button:not([disabled])").nth(i).click(); c.settle(150)
    c.shot("fl-picker", "إسناد موظفين: واحد أو أكثر، بالبحث أو البعثة أو الملف التشغيلي", section=S)
    sel = pk.locator("label:has-text('أيضاً') select").first
    sel.scroll_into_view_if_needed(); c.settle(400)
    c.shot("fl-picker-return", "رحلة العودة المقابلة مختارة سلفاً: يُسند الموظفون ذهاباً وعودة معاً",
           hl=[(f"{D} label:has-text('أيضاً') select", "1"), (f"{D} button:has-text('إسناد 4')", "2")], section=S)
    pk.locator("button:has-text('إسناد 4')").first.click(); c.settle(1500)
    c.shot("fl-staff-done", "الموظفون الأربعة على الرحلة، وحالتهم «مسند»", section=S)
    quiet(c)

    # ── the clusters' days: سهل حوران gets RB 511 and its return
    s.nav("أيام التكتلات", 2000)
    hw = "main tbody tr:has-text('تكتل سهل حوران')"
    c.scroll_to(hw, 300)
    c.shot("fl-allot", "أيام التكتلات: رحلات كل تكتل ومقاعده عليها مقابل مسافريه",
           hl=[(side("/staff/flights/manage/allotments"), "1"), (f"{hw} td >> nth=0", "2")], section=S)
    p.locator(f"{hw} button:has-text('إعطاء أيام')").first.click(); c.settle(1200)
    m = p.locator(D).last
    for no in ("RB 511", "RB 512"):
        box = m.locator(f"input[aria-label^='{no} ']").first
        box.scroll_into_view_if_needed(); box.check(); c.settle(250)
    m.locator("input[aria-label^='RB 511 ']").first.scroll_into_view_if_needed(); c.settle(300)
    c.shot("fl-allot-sheet", "أيام تكتل: الرحلة كلها أو حصة من رحلة مشتركة",
           hl=[(f"{D} li:has(input[aria-label^='RB 511 '])", "1"), (f"{D} button:has-text('حفظ الأيام')", "2")], section=S)
    dbtn("حفظ الأيام", 1400)
    c.scroll_to(hw, 300)
    c.shot("fl-allot-saved", "أُعطي تكتل سهل حوران يومين: RB 511 ذهاباً وRB 512 عودة", hl=[(hw, "")], section=S)
    quiet(c)

    # ── whole groups on a pilgrims' flight, outbound and return at once
    open_flight("RB 511")
    c.shot("fl-pilgrims", "رحلة حجاج بلا مجموعات بعد: «إضافة مجموعات» مع المقاعد المتبقية",
           hl=[("main button:has-text('إضافة مجموعات')", "")], section=S)
    p.locator("main button:has-text('إضافة مجموعات')").first.click(); c.settle(1400)
    gp = p.locator(D).last
    gp.locator("select").first.select_option(label="تكتل سهل حوران"); c.settle(600)
    for b in gp.locator("ul li button:not([disabled])").all()[:2]:
        b.click(); c.settle(200)
    c.shot("fl-groups", "إضافة مجموعات: المجموعة كاملة، ورحلة العودة المقابلة في الخطوة نفسها، والعدد والمتبقي في الأسفل",
           hl=[(f"{D} select[aria-label='التكتل']", "1"), (f"{D} label:has-text('أيضاً') select", "2"), (f"{D} button:has-text('إسناد 2')", "3")], section=S)
    gp.locator("button:has-text('إسناد 2')").first.click(); c.settle(1600)
    c.scroll_top()
    c.shot("fl-groups-done", "المجموعتان على الرحلة، وتحتهما حجاجهما مرتبون بالمجموعة والعائلة",
           hl=[("main li:has(button:text-is('إزالة')) >> nth=0", "")], section=S)
    quiet(c)
    # take the second group off again (it goes back on from the dispatch below)
    p.locator("main li:has(button:text-is('إزالة'))").nth(1).locator("button:text-is('إزالة')").click(); c.settle(900)
    c.shot("fl-group-remove", "إزالة مجموعة من الرحلة: تعود مقاعدها متاحة", hl=[(f"{D} button:has-text('تنفيذ')", "")], section=S)
    dbtn("تنفيذ", 1300)
    quiet(c)

    # ── lock and the manifest
    c.scroll_top()
    c.shot("fl-lock", "رحلة منشورة: «إقفال وإصدار الكشف» في مربع الحالة", hl=[("main aside button:has-text('إقفال وإصدار الكشف')", "")], section=S)
    sbtn("إقفال وإصدار الكشف", 1500)
    quiet(c)
    mb = p.locator("main button[aria-expanded]:has-text('كشف الركاب')").first
    if mb.get_attribute("aria-expanded") == "false":
        mb.click(); c.settle(600)
    p.locator("main summary:has-text('عرض الصفوف')").first.click(); c.settle(600)
    c.scroll_to("main button[aria-expanded]:has-text('كشف الركاب')", 110)
    c.shot("fl-manifest", "كشف الركاب: الإصدار، والتصدير إلى نسك مسار والناقل، وصفوف الكشف",
           hl=[("main button:has-text('تصدير إلى نسك مسار')", "1"), ("main button:has-text('تصدير للناقل')", "2")], section=S)
    c.scroll_top()
    boxes = p.locator("main input[type=checkbox][aria-label^='اختيار']")
    boxes.nth(0).check(); boxes.nth(1).check(); c.settle(500)
    c.shot("fl-select", "اختيار أفراد على رحلة مقفلة: إلغاء الإسناد أو النقل إلى رحلة أخرى",
           hl=[("main button:has-text('نقل إلى رحلة أخرى')", "")], section=S)
    p.locator("main button:has-text('نقل إلى رحلة أخرى')").first.click(); c.settle(900)
    p.locator(f"{D} textarea").last.fill("ظرف طبي — بطلب رئيس التكتل هاتفياً"); c.settle(300)
    c.shot("fl-move", "النقل بعد الإقفال: الرحلة الجديدة والسبب الإلزامي", hl=[(f"{D} select", "1"), (f"{D} button:has-text('تنفيذ')", "2")], section=S)
    dbtn("تنفيذ", 1500)
    quiet(c)

    # ── when something goes wrong: postpone, divert, cancel
    open_flight("SV 3421")
    emergencies()
    c.shot("fl-emergency", "«ظروف طارئة» في جانب صفحة الرحلة: تأجيل، موعد جديد، تحويل الوجهة، إلغاء الرحلة",
           hl=[("main aside button:has-text('تأجيل')", "")], section=S)
    sbtn("تأجيل", 900)
    p.locator(f"{D} textarea").last.fill("إغلاق الأجواء"); c.settle(300)
    c.shot("fl-postpone", "تأجيل رحلة: السبب، والإسنادات تبقى", hl=[(f"{D} button:has-text('تنفيذ')", "")], section=S)
    dbtn("تنفيذ", 1400)
    quiet(c)
    c.scroll_top()
    c.shot("fl-postponed", "الرحلة مؤجلة: حدّد الموعد الجديد أو ألغها", hl=[("main aside button:has-text('تحديد الموعد الجديد')", "")], section=S)
    sbtn("تحديد الموعد الجديد", 900)
    ins = p.locator(D).last.locator("input")
    ins.nth(0).fill("2027-04-26"); ins.nth(1).fill("09:00"); ins.nth(2).fill("2027-04-26"); ins.nth(3).fill("11:30"); c.settle(300)
    c.shot("fl-reschedule", "الموعد الجديد: تاريخ ووقت المغادرة والوصول", hl=[(f"{D} button:has-text('تنفيذ')", "")], section=S)
    dbtn("تنفيذ", 1400)
    quiet(c)
    open_flight("RB 522")
    emergencies()
    sbtn("تحويل الوجهة", 900)
    m = p.locator(D).last
    m.locator("select").select_option("ap-amm"); m.locator("input[type=number]").fill("3")
    m.locator("input:not([type=number])").last.fill("الحافلات عند صالة الوصول"); c.settle(300)
    c.shot("fl-divert", "تحويل الوجهة: المطار البديل وعدد الحافلات", hl=[(f"{D} button:has-text('تنفيذ')", "")], section=S)
    dbtn("تنفيذ", 1400)
    c.scroll_top()
    c.shot("fl-diverted", "الرحلة محوّلة: المرحلة الأرضية بالحافلات", hl=[("main p:has-text('مرحلة أرضية')", "")], section=S)
    quiet(c)
    open_flight("XY 2210")
    emergencies()
    sbtn("إلغاء الرحلة", 900)
    p.locator(f"{D} textarea").last.fill("ألغى الناقل الرحلة"); c.settle(300)
    c.shot("fl-cancel", "إلغاء رحلة: المسافرون يصيرون «بحاجة إلى رحلة»", hl=[(f"{D} button:has-text('تنفيذ')", "")], section=S)
    dbtn("تنفيذ", 1500)
    quiet(c)
    p.locator("main button[aria-expanded]:has-text('سجل الرحلة')").first.click(); c.settle(600)
    c.scroll_to("main button[aria-expanded]:has-text('سجل الرحلة')", 160)
    c.shot("fl-log", "سجل الرحلة: كل ما تغيّر فيها، ومن غيّره ومتى", hl=[("main button[aria-expanded]:has-text('سجل الرحلة')", "")], section=S)

    # ── the dispatch
    s.nav("التفويج", 2000)
    grow = "main tbody tr:has-text('مجموعة ركب ذي النورين'):has(button:text-is('إسناد'))"
    p.locator("main select[aria-label='التكتل']").first.select_option(label="تكتل سهل حوران"); c.settle(800)
    c.shot("fl-dispatch", "التفويج: كل مجموعة ورحلتاها، و«إسناد» لمن ليست على رحلة في أحد الاتجاهين",
           hl=[(side("/staff/flights/manage/dispatch"), "1"), ("main [role=radiogroup][aria-label='التفويج']", "2"), ("main select[aria-label='التكتل']", "3"), (f"{grow} >> td >> nth=0", "4")], section=S)
    p.locator(grow).first.locator("button:text-is('إسناد')").click(); c.settle(1000)
    c.shot("fl-dispatch-assign", "إسناد مجموعة من التفويج: رحلة الذهاب ورحلة العودة مقترحتان", hl=[(f"{D} button:has-text('إسناد المجموعة')", "")], section=S)
    dbtn("إسناد المجموعة", 1500)
    quiet(c)
    p.locator("main [role=radiogroup][aria-label='التفويج'] [role=radio]:has-text('بحاجة إلى رحلة')").click(); c.settle(1000)
    c.shot("fl-needs", "بحاجة إلى رحلة: من أُلغيت رحلته أو أُلغي إسناده أو تخلّف، مع «إسناد» و«وسيلة أخرى»",
           hl=[("main tbody tr >> nth=0 >> button:text-is('إسناد')", "")], section=S)
    p.locator("main tbody tr:has(td:text-is('ذهاب'))").first.locator("button:text-is('إسناد')").click(); c.settle(900)
    m = p.locator(D).last
    # onto RB 511, locked since its manifest: the reason is required
    opt = next(o for o in m.locator("select option").all_inner_texts() if "RB 511" in o)
    m.locator("select").select_option(label=opt); m.locator("input").last.fill("إعادة إسناد بعد إلغاء الرحلة"); c.settle(300)
    c.shot("fl-assign-one", "إسناد فردي لمن فقد مقعده: الرحلة، والسبب على الرحلة المقفلة", hl=[(f"{D} button:has-text('إسناد') >> nth=-1", "")], section=S)
    m.locator("button:has-text('إسناد')").last.click(); c.settle(1200)
    quiet(c)
    # a traveller added after the manifest: the flight asks for a new one
    open_flight("RB 511")
    c.shot("fl-reissue", "أُضيف مسافر بعد إصدار الكشف: «كشف بإصدار جديد»", hl=[("main aside button:has-text('كشف بإصدار جديد')", "")], section=S)
    sbtn("كشف بإصدار جديد", 1300)
    c.scroll_to("main button[aria-expanded]:has-text('كشف الركاب')", 110)
    c.shot("fl-reissued", "صدر الإصدار 2 وصار «الحالي»، وبقي الإصدار 1 محفوظاً", section=S)
    s.nav("التفويج", 2000)
    p.locator("main [role=radiogroup][aria-label='التفويج'] [role=radio]:has-text('موظفون بلا رحلة ذهاب')").click(); c.settle(1000)
    c.shot("fl-staff-noflight", "موظفون بلا رحلة ذهاب: لهم منصب في ملف تشغيلي ولم يُسندوا بعد", section=S)

    # ── «رحلاتي» in his own files: he travels with the mission, out with the first pilgrims (RB 501) and back on the
    # staff return (RB 402), as the demo seeds it (lib/flights.ts REAR_PARTY); he has no post in a tower or a camp
    s.nav("ملفاتي التشغيلية", 2000)
    c.scroll_to("main h2:has-text('رحلاتي'), main :text-is('رحلاتي')", 120)
    c.shot("fl-my", "رحلاتي في «ملفاتي التشغيلية»: رحلة الذهاب ورحلة العودة", hl=[("main section:has(:text-is('رحلاتي'))", "")], section=S)

    # ── the airport's representative: take-off from Damascus, landing in Jeddah
    s.logout()
    s.login("omar")
    c.goto("/staff/airport", wait=2300)
    dep_row = "main tbody tr:has(span[dir=ltr]:text-is('RB 511')):has-text('مغادرة')"
    p.locator("main [role=radiogroup][aria-label='الرحلات'] [role=radio]:has-text('بانتظار تسجيلك')").click(); c.settle(800)
    c.shot("fl-airport", "رحلات مطاري: المغادرة من مطار المندوب والوصول إليه، و«بانتظار تسجيلك»",
           hl=[(side("/staff/airport"), "1"), ("main [role=radiogroup][aria-label='الرحلات']", "2"), (f"{dep_row} button:has-text('تسجيل الإقلاع')", "3")], section=S)
    b = p.locator(f"{dep_row} button:has-text('تسجيل الإقلاع')").first
    b.scroll_into_view_if_needed(); b.click(); c.settle(1000)
    p.locator(D).last.locator("input[type=checkbox]").nth(2).check(); c.settle(300)
    c.shot("fl-depart", "تسجيل الإقلاع: علّم من تخلّف فقط", hl=[(f"{D} button:has-text('تسجيل الإقلاع')", "")], section=S)
    dbtn("تسجيل الإقلاع", 1500)
    p.locator("main [role=radiogroup][aria-label='الرحلات'] [role=radio]:has-text('المغادرة من')").click(); c.settle(800)
    c.scroll_to(dep_row, 380)
    c.shot("fl-departed", "أقلعت: صعد الجميع إلا من عُلّم متخلفاً", hl=[(dep_row, "")], section=S)
    quiet(c)
    p.locator("main [role=radiogroup][aria-label='المطار'] [role=radio]:has-text('جدة')").first.click(); c.settle(1000)
    p.locator("main [role=radiogroup][aria-label='الرحلات'] [role=radio]:has-text('بانتظار تسجيلك')").click(); c.settle(800)
    arr_row = "main tbody tr:has(span[dir=ltr]:text-is('RB 511')):has-text('وصول')"
    land = p.locator(f"{arr_row} button:has-text('تسجيل الهبوط')").first
    land.scroll_into_view_if_needed(); land.click(); c.settle(600)
    c.shot("fl-land", "تسجيل الهبوط في مطار الوصول: «تأكيد الهبوط»", hl=[(f"{arr_row} button:has-text('تأكيد الهبوط')", "")], section=S)
    p.locator(f"{arr_row} button:has-text('تأكيد الهبوط')").first.click(); c.settle(1300)
    p.locator("main [role=radiogroup][aria-label='الرحلات'] [role=radio]:has-text('الوصول إلى')").click(); c.settle(800)
    c.scroll_to(arr_row, 380)
    c.shot("fl-arrived", "هبطت الرحلة", hl=[(arr_row, "")], section=S)
    s.close()

print("DONE stf_mission")
