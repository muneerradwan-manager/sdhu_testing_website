# -*- coding: utf-8 -*-
"""Staff guide — part «basics»: the landing page, login and logout, «لوحتي» (the season director's and a data
entry account's), «صلاحيات الموظفين», «ملفاتي التشغيلية», a page outside one's permissions; «مراجعة الطلبات»
with the attaching to groups; «إعدادات الموسم»; «القبول والقرعة» (entry, then
approval and publishing).
Usage (inside docs/_build-guide): CAP_DIR=<folder> python stf_basics.py [a|b|c|d]"""
import sys
from stf_common import Staff

ONLY = sys.argv[1] if len(sys.argv) > 1 else None


def new(storage=None):
    """A fresh browser; the mouse leaves the page before each shot so no menu entry looks hovered"""
    s = Staff(storage)
    shot = s.c.shot
    def calm_shot(*a, **kw):
        s.p.mouse.move(2, 2)
        return shot(*a, **kw)
    s.c.shot = calm_shot
    return s


def btn_role(s, name, wait=1200):
    b = s.p.get_by_role("button", name=name).first
    b.scroll_into_view_if_needed(); b.click(); s.c.settle(wait)


def jump(s):
    """«جرّبها الآن»: the demo's date moves to the operation's first day"""
    j = s.p.locator("main button:has-text('جرّبها الآن')")
    if j.count():
        j.first.click(); s.c.settle(1500)


def register_one(s):
    """رزان registers one citizen at the office (the steps themselves are in the registration chapter), so that
    her «لوحتي» has something under «ما سجّلته»"""
    c, p = s.c, s.p
    c.goto("/staff/registration", wait=1800)
    jump(s)
    btn_role(s, "بدء طلب جديد")
    p.locator("label:has-text('الرقم الوطني') input").first.fill("01066600620")
    p.locator("label:has-text('الاسم الأول') input").first.fill("غسان"); c.settle(200)
    btn_role(s, "بحث", 2500)
    p.locator("label:has-text('رقم هاتف المواطن') input[type=tel]").fill("0933123456"); c.settle(200)
    btn_role(s, "إرسال رمز التحقق")
    c.otp("1448")
    btn_role(s, "تأكيد الموافقة ومتابعة", 1500)
    btn_role(s, "افحص الأهلية", 1500); p.wait_for_timeout(6000)
    btn_role(s, "متابعة", 2000)
    p.locator("main button:has-text('شام كاش')").first.click(); c.settle(1500)
    btn_role(s, "رقم عملية تجريبي", 600)
    btn_role(s, "تأكيد الدفع وتسجيل الطلب", 3500)


# ───────── A. for every employee: login, «لوحتي», «صلاحيات الموظفين», «ملفاتي التشغيلية» ─────────
if ONLY in (None, "a"):
    S = "A"
    s = new(); c, p = s.c, s.p
    c.goto("/staff", wait=2500)
    c.shot("landing", "بوابة الموظفين: الصفحة الأولى، وفيها «تسجيل الدخول» وحده", hl=[("main a:has-text('تسجيل الدخول')", "1")], section=S)
    c.goto("/staff/login", wait=1800)
    c.shot("login", "دخول الموظفين: اسم المستخدم وكلمة المرور", section=S)
    p.locator("label:has-text('اسم المستخدم') input").first.fill("nour.a")
    p.locator("label:has-text('كلمة المرور') input").first.fill("0000")
    p.locator("main button:text-is('دخول')").first.click(); c.settle(1500)
    c.shot("login-error", "اسم المستخدم أو كلمة المرور غير صحيحة", section=S)
    c.scroll_to("text=حسابات تجريبية", 110)
    c.shot("login-cards", "الحسابات التجريبية: بطاقة لكل موظف مع صلاحيته، والضغط عليها يدخل مباشرة", section=S)
    s.login("nour.a", shots=True, S=S)
    c.goto("/staff/dashboard", wait=2500)
    c.shot("dash-suha", "لوحتي لمدير الموسم: أرقام كل صلاحية تحت اسم صفحتها، ومهامي اليوم، وآخر إجراءاتي",
           hl=[("aside a[href$='/staff/dashboard']", "")], section=S)
    c.scroll_to("main a:has-text('افتح المراجعة')", 160)
    c.shot("dash-suha-2", "أرقام صلاحية في لوحتي، ورابط الصفحة التي تُدار منها", hl=[("main a:has-text('افتح المراجعة')", "1")], section=S)
    c.scroll_top()
    p.locator("aside button[aria-expanded]:has-text('صلاحية')").first.click(); c.settle(900)
    c.shot("dash-perms", "بطاقتك في القائمة الجانبية: صلاحياتك نظاماً نظاماً، وتحتها أقسامك", hl=[("aside button[aria-expanded]:has-text('صلاحية')", "1")], section=S)
    p.locator("aside button[aria-expanded]:has-text('صلاحية')").first.click(); c.settle(500)
    # «صلاحيات الموظفين»: the employees, one employee's permissions system by system, who holds what, the files
    s.nav("صلاحيات الموظفين", 2200)
    c.shot("acc-list", "صلاحيات الموظفين: كل موظف وما يملكه في كل نظام", hl=[("aside a[href$='/staff/access']", "")], section=S)
    p.locator("main a:text-is('فادي سلوم')").first.click(); c.settle(2000)
    c.shot("acc-employee", "صلاحيات موظف: الأنظمة بطاقةً بطاقة، وما يملكه في كل منها",
           hl=[("main section > button:has-text('غرفة العمليات')", "1")], section=S)
    fl = "main section:has(> button:has-text('إدارة الطيران'))"
    p.locator(f"{fl} > button").first.click(); c.settle(800)
    p.locator(f"{fl} input[aria-label='عرض — الرحلات']").first.check(); c.settle(300)
    p.locator(f"{fl} input[aria-label='عرض — الركاب والمقاعد']").first.check(); c.settle(300)
    c.scroll_to(fl, 110)
    c.shot("acc-card", "بطاقة نظام: الموارد صفوفاً، والعرض والإضافة والتعديل والحذف والأفعال الخاصة أعمدة",
           hl=[(f"{fl} input[aria-label='عرض — الرحلات']", "1"), (f"{fl} button:text-is('كل العرض')", "2")], section=S)
    ap = "main section:has(> button:has-text('رحلات المطار'))"
    p.locator(f"{ap} > button").first.click(); c.settle(800)
    p.locator(f"{ap} button[aria-pressed]:has-text('دمشق')").first.click(); c.settle(400)
    c.scroll_to(ap, 110)
    c.shot("acc-scope", "النطاق: صلاحيات تُمنح لمطار أو قاعة أو عملية بعينها", hl=[(f"{ap} button[aria-pressed]:has-text('دمشق')", "1")], section=S)
    # the scope back to «الكل», and the card closed: fadi is given the flights' viewing only
    p.locator(f"{ap} button[aria-pressed]:text-is('الكل')").first.click(); c.settle(300)
    p.locator(f"{ap} > button").first.click(); c.settle(500)
    c.scroll_top()
    s.btn("مراجعة التغييرات وحفظها", 1000)
    c.shot("acc-review", "قبل الحفظ: ما يُمنح وما يُسحب وما يتغير نطاقه", hl=[("[role=dialog] button:text-is('حفظ')", "1")], section=S)
    p.locator("[role=dialog] button:text-is('حفظ')").first.click(); c.settle(1500)
    p.locator("main select[aria-label='الموظف الذي تُنسخ صلاحياته']").first.select_option("tarek"); c.settle(400)
    c.shot("acc-copy", "نسخ صلاحيات موظف آخر إلى هذه الشاشة، ثم الحفظ", hl=[("main select[aria-label='الموظف الذي تُنسخ صلاحياته']", "1")], section=S)
    c.goto("/staff/access", wait=2000)
    p.locator("main [role=radio]:has-text('من يملك ماذا')").first.click(); c.settle(1000)
    c.shot("acc-systems", "من يملك ماذا: لكل نظام صلاحياته ومن يملك فيه شيئاً", hl=[("main a:text-is('إدارة الطيران')", "1")], section=S)
    p.locator("main [role=radio]:has-text('ملفات الإدارة')").first.click(); c.settle(1500)
    c.shot("acc-files", "ملفات الإدارة: حال كل ملف، وما يعطّله، وما رُفع إلى المدير، وأهم أحداثه", section=S)
    c.goto("/staff/exam", wait=2000)
    c.shot("acc-locked", "صفحة ملف لا تملك عرضها: الصلاحية التي تحتاجها، ومن أين تُمنح", section=S)
    s.logout()
    c.shot("logout", "بعد تسجيل الخروج تعود صفحة الدخول", section=S)
    s.close()
    # a data-entry account: its «لوحتي» is what it registered
    s = new(); c, p = s.c, s.p
    s.login("razan")
    register_one(s)
    s.nav("لوحتي", 2500)
    c.shot("dash-razan", "لوحتي لموظفة إدخال البيانات: «ما سجّلته» وأين وصل كل طلب", hl=[("main :text-is('ما سجّلته')", "1")], section=S)
    s.close()
    # «ملفاتي التشغيلية», in everyone's menu
    s = new(); c, p = s.c, s.p
    s.login("layla")
    s.nav("ملفاتي التشغيلية", 2200)
    c.shot("myfiles", "ملفاتي التشغيلية: رحلاتي، ثم أين أكون ومتى في الموسم", hl=[("aside a[href$='/staff/my-files']", "")], section=S)
    c.scroll_by(650)
    c.shot("myfiles-2", "تفاصيل موقعي: الدور والفترة والمكان والمسؤول المباشر والفريق", section=S)
    s.close()
    s = new(); c, p = s.c, s.p
    s.login("tarek")
    c.goto("/staff/season", wait=2000)
    c.shot("locked", "فتح صفحة خارج صلاحياتك", section=S)
    s.close()

# ───────── B. «مراجعة الطلبات والوثائق» ─────────
if ONLY in (None, "b"):
    S = "B"
    s = new(); c, p = s.c, s.p
    s.login("rana")
    s.nav("مراجعة الطلبات", 2200)
    c.shot("rev-list", "مراجعة الطلبات: الطلبات التي تحتاج قراراً، وتحت كل طلب «مراجعة»",
           hl=[("main tr:has-text('50211') a:has-text('بلال حسن الدمشقي')", "1")], section=S)
    p.locator("main tr:has-text('50211') :text-is('مراجعة')").first.click(); c.settle(1800)
    c.shot("rev-screen", "شاشة الطلب: لماذا يحتاج مراجعة، وأفراده وشروط الموسم، والقرار في الجانب", section=S)
    c.scroll_to("main h2:has-text('الوثائق')", 200)
    c.shot("rev-docs", "الوثائق ودليل صلة القرابة", section=S)
    c.scroll_top()
    p.locator("main textarea").first.fill("تمت مطابقة اسم الأم مع قيد الشؤون المدنية بعد التواصل مع المكتب.")
    c.settle(300)
    c.shot("rev-decision", "سبب القرار ثم «اعتماد» أو «رفض»", hl=[("main button:has-text('اعتماد')", "1"), ("main button:has-text('رفض')", "2")], section=S)
    p.locator("main button:has-text('اعتماد')").first.click(); c.settle(1800)
    p.locator("main button:has-text('معتمدة')").first.click(); c.settle(900)
    c.shot("rev-approved", "الطلب في «معتمدة»، وتحته «عرض القرار»", hl=[("main button:has-text('معتمدة')", "")], section=S)
    # a civil correction sent at account creation (عمر الخطيب: his mother's name), as the pilgrim's flow saves it
    p.evaluate("""() => { const k = 'sdhu-demo-v1'; const s = JSON.parse(localStorage.getItem(k) || '{}');
      s.accounts = { ...(s.accounts || {}), '01012345414': { nationalId: '01012345414', phone: '0944345414', password: 'Hajj@1448', createdAt: Date.now() - 3600e3,
        civil: { fields: [{ key: 'motherName', label: 'اسم الأم', registry: 'فاطمة', claimed: 'فاطمة الزهراء' }], doc: { kind: 'بيان قيد مدني', name: 'qaid-omar.pdf' },
          note: 'اسم والدتي في البطاقة مركّب', at: Date.now() - 3600e3, status: 'pending' } } };
      localStorage.setItem(k, JSON.stringify(s)); }""")
    c.goto("/staff/reviews?view=civil", wait=2000)
    c.shot("rev-civil-list", "تصحيح البيانات المدنية: ما أرسله الحجاج، وتحت كل منها «مراجعة»", hl=[("main a:has-text('عمر محمد الخطيب')", "")], section=S)
    p.locator("main a:has-text('عمر محمد الخطيب')").first.click(); c.settle(1800)
    p.locator("main textarea").first.fill("اسم الأم في بيان القيد المرفوع «فاطمة الزهراء»، مطابق لما كتبه الحاج.")
    c.settle(300)
    c.shot("rev-civil-screen", "السجل المدني مقابل ما يقوله الحاج، والوثيقة، والقرار في الجانب", hl=[("main button:has-text('اعتماد')", "1"), ("main button:has-text('رفض')", "2")], section=S)
    s.close()
    # attaching an accepted application to a group: سعاد الحموي was accepted (her portal seeds it)
    s = new(); c, p = s.c, s.p
    c.goto("/login", wait=1800)
    p.locator("main button:has-text('سعاد الحموي')").first.click(); c.settle(3500)
    s.login("rana")
    c.goto("/staff/reviews?view=groups", wait=2000)
    c.shot("rev-groups", "الإلحاق بالمجموعات: خارج مدته تظهر مواعيده", hl=[("main button:has-text('جرّبها الآن')", "1")], section=S)
    jump(s)
    p.locator("main button:has-text('إلحاق طلب بمجموعة')").first.click(); c.settle(1200)
    dlg = "[role=dialog]"
    p.locator(f"{dlg} input[aria-label='الرقم الوطني أو رقم الطلب']").first.fill("01055500730")
    p.locator(f"{dlg} button:has-text('بحث')").first.click(); c.settle(1200)
    p.locator(f"{dlg} select[aria-label='المجموعة']").first.select_option(index=1); c.settle(500)
    p.locator(f"{dlg} button:has-text('ملف تجريبي')").first.click(); c.settle(500)
    c.shot("rev-attach", "إلحاق طلب بمجموعة: الطلب، والمجموعة وسعتها، والعقد الموقّع",
           hl=[(f"{dlg} select[aria-label='المجموعة']", "1"), (f"{dlg} button:has-text('إلحاق الطلب ب')", "2")], section=S)
    p.locator(f"{dlg} button:has-text('إلحاق الطلب ب')").first.click(); c.settle(1800)
    c.shot("rev-attached", "الطلب ملحق بمجموعته، مع عقده ومن ألحقه", section=S)
    s.close()

# ───────── C. «إعدادات الموسم» (its «لوحة الإدارة العليا» is in stf_ops.py, under «سجل الأحداث») ─────────
if ONLY in (None, "c"):
    S = "C"
    s = new(); c, p = s.c, s.p
    s.login("nour.a")
    s.nav("إعدادات الموسم", 2200)
    c.shot("season-top", "إعدادات الموسم: «الشروط والرسوم» في نموذج واحد، و«مواعيد العمليات»", hl=[("aside a[href$='/staff/season']", "")], section=S)
    c.scroll_to("main :text-is('الرسوم والتكاليف')", 110)
    c.shot("season-fees", "الرسوم والتكاليف: الدفعات صارت في «إدارة التسجيل على الحج»", section=S)
    inp = p.locator("input[aria-label='الأعمار المقبولة مباشرة']").first
    inp.scroll_into_view_if_needed(); inp.fill("67"); c.settle(800)
    c.scroll_to("input[aria-label='الأعمار المقبولة مباشرة']", 300)
    c.shot("season-edit", "تعديل قيمة: علامة «غير محفوظ» وشريط الحفظ", hl=[("input[aria-label='الأعمار المقبولة مباشرة']", "1")], section=S)
    p.locator("input[aria-label='مرجع قرار اللجنة']").first.fill("قرار اللجنة 1448/12"); c.settle(300)
    # the demo's date pill sits over the save bar: set aside for this one shot
    p.evaluate("() => document.querySelectorAll('[data-demo-clock]').forEach(e => e.style.visibility = 'hidden')")
    c.shot("season-savebar", "شريط الحفظ: مرجع القرار ثم «حفظ واعتماد»",
           hl=[("input[aria-label='مرجع قرار اللجنة']", "1"), ("button:has-text('حفظ واعتماد')", "2")], section=S)
    p.evaluate("() => document.querySelectorAll('[data-demo-clock]').forEach(e => e.style.visibility = '')")
    p.locator("button:has-text('حفظ واعتماد')").first.click(); c.settle(1800)
    box = p.locator("main details:has-text('سجل تعديلات الإعدادات') summary, main button:has-text('سجل تعديلات الإعدادات')").first
    box.scroll_into_view_if_needed(); box.click(); c.settle(900)
    c.scroll_to("main :text-is('سجل تعديلات الإعدادات')", 200)
    c.shot("season-log", "سجل تعديلات الإعدادات: القيمة قبل وبعد، ومن عدّلها ومرجع القرار", section=S)
    c.scroll_top()
    p.locator("main button:has-text('القيم الافتراضية')").first.click(); c.settle(900)
    c.shot("season-reset", "إعادة القيم الافتراضية بعد تأكيد", hl=[("button:has-text('نعم، أعد الضبط')", "1")], section=S)
    p.locator("button:has-text('نعم، أعد الضبط')").first.click(); c.settle(1200)
    p.locator("main button:has-text('مواعيد العمليات')").first.click(); c.settle(1500)
    c.shot("season-ops", "مواعيد العمليات: حالة كل عملية وبدايتها ونهايتها ومن يتحكم بها",
           hl=[("main button:has-text('مواعيد العمليات')", "1")], section=S)
    p.locator("main button:has-text('مواعيد الوجبات')").first.click(); c.settle(1200)
    c.shot("season-meals-times", "مواعيد الوجبات: الفطور والغداء في فندق مكة وفندق المدينة", hl=[("main button:has-text('مواعيد الوجبات')", "1")], section=S)
    s.close()

# ───────── D. «القبول والقرعة»: entry (كنان), then approval and publishing (يوسف) ─────────
if ONLY in (None, "d"):
    S = "D"
    s = new(); c, p = s.c, s.p
    s.login("kinan")
    s.nav("القبول والقرعة", 2200)
    c.shot("lot-list", "القبول المباشر والقرعة: أربع خطوات، ونتائج 1448 منشورة في بيئة العرض", hl=[("main button:has-text('إعادة التجربة')", "1")], section=S)
    s.btn("إعادة التجربة", 1500)
    c.shot("lot-reset", "بعد «إعادة التجربة»: الخطوات من البداية، وتحت كل خطوة ما ينتظرك فيها",
           hl=[("main tr:has-text('الأعمار المقبولة') a:text-is('إرسال للاعتماد')", "1")], section=S)
    p.locator("main tr:has-text('الأعمار المقبولة') a:text-is('إرسال للاعتماد')").first.click(); c.settle(1800)
    c.shot("lot-ages", "الأعمار المقبولة: العمر الذي تكتمل عنده مقاعد القبول المباشر، والإرسال للاعتماد",
           hl=[("main button:has-text('إرسال للاعتماد')", "1")], section=S)
    s.btn("إرسال للاعتماد", 1500)
    c.shot("lot-sent", "أُرسلت الأعمار للاعتماد", section=S)
    c.goto("/staff/lottery?step=pool", wait=1800)
    c.shot("lot-pool", "إحصاء التسجيل الأولي بسنة ميلاد صاحب الطلب، وتصديره للجنة تنظيم القرعة",
           hl=[("main tr:has-text('1959') button:text-is('الأشهر')", "1"), ("main button:has-text('تصدير الإحصاء للجنة تنظيم القرعة')", "2")], section=S)
    row = p.locator("main tr:has-text('1972')").first
    row.scroll_into_view_if_needed()
    row.locator("button:text-is('الأشهر')").first.click(); c.settle(900)
    c.scroll_to("main tr:has-text('1972')", 260)
    c.shot("lot-pool-months", "أشهر سنة واحدة: عدد المسجّلين في كل شهر", hl=[("main tr:has-text('1972') button:has-text('إخفاء الأشهر')", "1")], section=S)
    c.scroll_top()
    s.btn("تصدير الإحصاء للجنة تنظيم القرعة", 2800)
    c.scroll_top()
    c.shot("lot-export", "صُدّر الإحصاء باسمك ووقته", section=S)
    c.goto("/staff/lottery?step=entry", wait=1800)
    year = p.locator("main label:has-text('سنة الميلاد') select").first
    year.select_option("1961"); c.settle(300)
    s.btn("إضافة السطر", 700)
    year.select_option("1972"); c.settle(300)
    p.locator("main [role=radio]:has-text('أشهر محددة')").first.click(); c.settle(300)
    for m in ("كانون الثاني", "شباط", "آذار", "نيسان"):
        p.locator(f"main button[aria-pressed]:text-is('{m}')").first.click(); c.settle(150)
    c.scroll_top()
    c.shot("lot-entry", "إدخال سطر: سنة الميلاد والأشهر المسحوبة منها", hl=[("main button:has-text('إضافة السطر')", "1")], section=S)
    s.btn("إضافة السطر", 700)
    s.btn("تعبئة ما أُعلن في بث 1448", 900)
    c.scroll_top()
    c.shot("lot-entered", "اكتملت مقاعد القرعة: «حفظ وإرسال للاعتماد»", hl=[("main button:has-text('حفظ وإرسال للاعتماد')", "1")], section=S)
    s.btn("حفظ وإرسال للاعتماد", 1500)
    c.scroll_top()
    c.shot("lot-entry-sent", "أُرسلت النتائج للاعتماد، ويمكن تعديلها قبله", hl=[("main button:has-text('تعديل قبل الاعتماد')", "1")], section=S)
    c.goto("/staff/lottery?step=publish", wait=1800)
    c.shot("lot-locked-publish", "النشر يحتاج صلاحية «اعتماد ونشر النتائج»", section=S)
    s.logout(); s.login("yousef")
    s.nav("القبول والقرعة", 2200)
    c.shot("lot-yousef", "قائمة الخطوات كما تراها لجنة الاعتماد: ما ينتظر اعتمادها",
           hl=[("main tr:has-text('الأعمار المقبولة') a:text-is('اعتماد وإعلان')", "1"), ("main tr:has-text('الاعتماد والنشر') a:text-is('اعتماد ونشر')", "2")], section=S)
    p.locator("main tr:has-text('الأعمار المقبولة') a:text-is('اعتماد وإعلان')").first.click(); c.settle(1800)
    c.shot("lot-approve-ages", "اعتماد وإعلان الأعمار المقبولة", hl=[("main button:has-text('اعتماد وإعلان الأعمار')", "1")], section=S)
    s.btn("اعتماد وإعلان الأعمار", 1500)
    c.goto("/staff/lottery?step=publish", wait=1800)
    c.shot("lot-publish", "وصلت النتائج للاعتماد: «اعتماد ونشر النتائج»", hl=[("main button:has-text('اعتماد ونشر النتائج')", "1")], section=S)
    s.btn("اعتماد ونشر النتائج", 900)
    c.shot("lot-publish-modal", "تأكيد اعتماد ونشر نتائج القرعة", hl=[("[role=dialog] button:has-text('اعتماد ونشر')", "1")], section=S)
    p.locator("[role=dialog] button:has-text('اعتماد ونشر')").first.click(); c.settle(4000)
    c.shot("lot-published", "نُشرت نتائج القرعة", section=S)
    s.close()
print("DONE stf_basics")
