# -*- coding: utf-8 -*-
"""Staff guide — part «ops»: the operations room (fadi), the events log and the executive board (tarek),
the site's content (nour), the medical team (layla) and the transport team (bassel).
Usage: CAP_DIR=<folder> python stf_ops.py [part ...]   (parts: ops audit cms med trn; none = all; «prep» = the pilgrim only)

The medical and transport pages need a pilgrim's family past its group: محمد الخطيب's family (the pilgrim
guide's full example, run1.py + run2.py) is driven here without shots, from the account to the medical file:
the coordinator records the health file (خديجة, 78: a wheelchair), the family uploads its medical documents,
and the browser leaves the pilgrim's page at once, so they wait for the medical team (on the pilgrim's page the
demo approves them by itself after a few seconds). The state is kept as <CAP_DIR>/state-medical.json and reused."""
import sys, time
from cap import OUTDIR
from stf_common import Staff

PARTS = [a for a in sys.argv[1:]] or ["ops", "audit", "cms", "med", "trn"]
PILGRIM_STATE = OUTDIR / "state-medical.json"
FAQ_OPEN = "main tbody tr:has(button:text-is('الأسئلة الشائعة')) button:text-is('فتح')"


def seg(group, label):
    """A choice of a segmented bar (role=radiogroup)"""
    return f"main [role=radiogroup][aria-label='{group}'] button:has-text('{label}')"


# ───────────────────────── the pilgrim's family, to its medical documents ─────────────────────────
def prep_pilgrim():
    s = Staff(); c, p = s.c, s.p

    def btn(text, wait=900, exact=False):
        p.get_by_role("button", name=text, exact=exact).first.click(); c.settle(wait)

    # the account (run1.py, chapter B)
    c.goto("/register", wait=1200)
    c.fill("input[placeholder='01012345412']", "01012345412")
    c.fill("input[autocomplete='given-name']", "محمد")
    c.fill("input[placeholder='09xxxxxxxx']", "0944345412")
    c.fill("input[type='email']", "mohammad@example.com")
    c.fill("input[type='password']", "Hajj@1448")
    c.click("button[type='submit']", wait=1600)
    c.otp("1448")
    c.click("button:has-text('تحقق')", wait=1500)
    p.wait_for_selector("text=هذه بياناتك كما وردت من الشؤون المدنية", timeout=15000); c.settle(1000)
    c.click("button:has-text('نعم، بياناتي صحيحة')", wait=900)
    c.click("button:has-text('إنشاء الحساب')", wait=1800)
    print("  account")
    # the application, on the first day of direct acceptance (run2.py, chapter E)
    p.evaluate("""() => { const k = 'sdhu-demo-v1'; const s = JSON.parse(localStorage.getItem(k) || '{}');
      s.clock = { ...(s.clock || {}), today: '2026-08-12', time: undefined }; localStorage.setItem(k, JSON.stringify(s)); }""")
    c.goto("/portal", wait=1200)
    c.click("a:has-text('ابدأ الطلب الآن')", wait=1500)
    btn("لنبدأ"); btn("التسجيل على القبول المباشر"); btn("لي أنا"); btn("داخل سوريا"); btn("نعم"); btn("من دفتر العائلة")
    btn("صوّر دفتر العائلة", wait=1400)
    p.wait_for_selector("text=من سيسافر معك؟", timeout=20000); c.settle(1000)
    p.get_by_role("button", name="فاطمة يوسف الحلبي").first.click(); c.settle(400)
    p.get_by_role("button", name="عمر محمد الخطيب").first.click(); c.settle(600)
    p.locator("button:has-text('التالي (')").click(); c.settle(900)
    btn("الأفراد صحيحون", wait=1000)
    p.wait_for_selector("text=هناك ملاحظات تحتاج إلى تعديل", timeout=20000); c.settle(800)
    btn("إضافة والد أو والدة", wait=900)
    p.locator("button:has-text('والدته خديجة')").click(); c.settle(500)
    btn("ابحث في الشؤون المدنية", wait=500)
    p.wait_for_selector("text=وجدنا هذا الشخص", timeout=15000); c.settle(800)
    btn("نعم، هذا هو"); btn("والدتي", wait=1000)
    btn("إضافة خديجة إلى الطلب", wait=1500)
    p.wait_for_selector("text=هناك ملاحظات تحتاج إلى تعديل", timeout=20000); c.settle(800)
    btn("اختر مرافقاً", wait=900)
    p.get_by_role("button", name="محمد", exact=False).first.click(); c.settle(900)
    btn("التحقق من الأهلية", wait=1000)
    p.wait_for_selector("text=جميع أفراد الطلب مستوفون للشروط", timeout=25000); c.settle(800)
    btn("متابعة", wait=1500)
    for _ in range(3):
        b = p.locator("button:has-text('محاكاة: واف')").first
        if b.count() == 0: break
        b.click(); c.settle(500)
    btn("وافق الجميع", wait=1200)
    btn("إلى الدفع", wait=1200)
    btn("شام كاش", wait=900)
    p.locator("button:has-text('رقم عملية تجريبي')").click(); c.settle(400)
    btn("تأكيد الدفع", wait=900)
    p.wait_for_selector("text=تقديم الطلب نهائياً", timeout=15000); c.settle(1000)
    btn("تقديم الطلب نهائياً", wait=300)
    c.wait_splash(); c.settle(800)
    print("  application submitted")
    # accepted (chapter F)
    c.goto("/portal/application", wait=300)
    btn("إعادة المحاكاة", wait=200)
    c.settle(12000)
    # the steps after acceptance (chapter G)
    c.scroll_to("#steps", 100); c.scroll_by(250)
    p.locator("div.max-h-80.overflow-y-auto").evaluate("el => { el.scrollTop = el.scrollHeight; el.dispatchEvent(new Event('scroll')); }")
    c.settle(800)
    p.locator("button:has-text('قرأت التعليمات')").click(); c.settle(400)
    btn("أؤكد وأوقّع إلكترونياً", wait=2200)
    btn("التالي:", wait=1200)
    c.scroll_to("#steps", 100); c.scroll_by(300)
    btn("رفع الناقص", wait=5200)

    def upload_rest():
        for name in ["محمد", "فاطمة", "عمر", "خديجة"]:
            p.locator(f"button:has-text('{name}')").first.click(); c.settle(500)
            b = p.locator("button:has-text('رفع الناقص')")
            if b.count() and b.first.is_enabled():
                b.first.click(); c.settle(200)
        c.settle(7000)
    upload_rest()
    btn("التالي:", wait=1500)

    def go_step(title):
        c.scroll_to("#steps", 100)
        p.locator(f"#steps li:has-text('{title}') button").first.click(); c.settle(1200)
        c.scroll_to("#steps", 100)

    def open_step(title):
        c.goto("/portal/application", wait=1500)
        go_step(title)

    open_step("الإلحاق بمجموعة")
    j = p.locator("main button:has-text('جرّبها الآن')")
    if j.count():
        j.first.click(); c.settle(1500)
    p.locator("button:has-text('محاكاة: وقّعنا العقد')").first.click(); c.settle(6000)
    print("  in a group")
    open_step("الدفعة الثانية")
    btn("ادفع المتبقي", wait=1000)
    p.locator("div[role='dialog'] button:has-text('شام كاش')").click(); c.settle(700)
    p.locator("div[role='dialog'] button:has-text('رقم عملية تجريبي')").click(); c.settle(400)
    p.locator("div[role='dialog'] button:has-text('تأكيد الدفع')").click(); c.settle(6200)
    go_step("جواز السفر")
    c.scroll_by(300)
    btn("رفع الناقص", wait=5700)
    r = p.locator("button:has-text('رفع الجواز المجدَّد')")
    if r.count():
        r.first.click(); c.settle(6000)
    upload_rest()
    c.settle(4000)
    print("  passports")
    go_step("الملف الطبي")
    p.locator("button:has-text('محاكاة: المنسق يسجّل الآن')").click(); c.settle(1200)
    btn("المعلومات صحيحة", wait=800)
    c.scroll_to("text=اللقاحات والوثائق الطبية", 120)
    # uploaded, then away from the pilgrim's page before the demo approves them by itself
    p.get_by_role("button", name="رفع الكل").first.click(); c.settle(400)
    c.goto("/staff/login", wait=800)
    # back to the season's real date
    p.evaluate("""() => { const k = 'sdhu-demo-v1'; const s = JSON.parse(localStorage.getItem(k) || '{}');
      if (s.clock) { delete s.clock.today; delete s.clock.time; } localStorage.setItem(k, JSON.stringify(s)); }""")
    waiting = p.evaluate("""() => { const s = JSON.parse(localStorage.getItem('sdhu-demo-v1') || '{}');
      return Object.values(s.post || {}).flatMap(x => Object.values(x.medical || {})).filter(v => v === 'uploaded').length; }""")
    print("  medical documents waiting:", waiting)
    c.save_state(str(PILGRIM_STATE))
    s.close()
    return waiting


if "prep" in PARTS or (({"med", "trn"} & set(PARTS)) and not PILGRIM_STATE.exists()):
    prep_pilgrim()


# ───────────────────────── shared ─────────────────────────
def side(href):
    """An entry of the sidebar, by its page"""
    return f"aside a[href='{href}']"


def drawer():
    return "[role=dialog]"


def close_drawer(s):
    p, c = s.p, s.c
    p.keyboard.press("Escape"); c.settle(700)


# ───────────────────────── 1. غرفة العمليات (fadi) ─────────────────────────
if "ops" in PARTS:
    s = Staff(); c, p = s.c, s.p; S = "OPS"
    s.login("fadi"); c.settle(4500)  # the welcome toast goes
    c.shot("ops-home", "لوحتي لغرفة العمليات: أرقام اليوم ومهامه", hl=[(side("/staff/operations"), "1"), ("main a:has-text('افتح غرفة العمليات')", "2")], section=S)
    s.nav("غرفة العمليات", 2200)
    c.shot("ops-list", "غرفة العمليات: البلاغات في قائمة، والوقت المتبقي لكل بلاغ", hl=[(seg("تصفية البلاغات", "النشطة"), "1"), ("main select[aria-label='المنطقة']", "2"), ("main tbody tr:has-text('سليم حسن') td:first-child > button", "3")], section=S)
    # the map, folded under the list
    b = p.locator("main button:has-text('خريطة المشاعر')").first
    b.scroll_into_view_if_needed(); b.click(); c.settle(1200)
    c.scroll_to("main button:has-text('خريطة المشاعر')", 110)
    c.shot("ops-map", "خريطة المشاعر: البلاغات المفتوحة في أماكنها", hl=[("main svg[aria-label^='خريطة مكة'] g[aria-label^='عرفة']", "")], section=S)
    p.locator("main svg[aria-label^='خريطة مكة'] g[aria-label^='عرفة']").first.click(); c.settle(900)
    c.scroll_to("main [role=radiogroup][aria-label='تصفية البلاغات']", 130)
    c.shot("ops-zone", "القائمة مصفّاة بمنطقة عرفة", hl=[("main select[aria-label='المنطقة']", "")], section=S)
    p.locator("main select[aria-label='المنطقة']").first.select_option(""); c.settle(700)
    # one report, from opening to closing
    c.scroll_top()
    p.locator("main tbody tr:has-text('سليم حسن') button:text-is('فتح')").first.click(); c.settle(1300)
    c.shot("ops-drawer", "البلاغ مفتوحاً: تفاصيله وحالته وإسناده ومساره", hl=[(f"{drawer()} select[aria-label='الجهة المسند إليها']", "1"), (f"{drawer()} button:text-is('إسناد')", "2")], section=S)
    dlg = p.locator(drawer()).last
    dlg.locator("select[aria-label='الجهة المسند إليها']").select_option(label="الفريق الميداني للتكتل"); c.settle(400)
    dlg.locator("button:text-is('إسناد')").click(); c.settle(1200)
    dlg.locator("textarea").first.fill("وصل الفريق الميداني إلى بوابة الجمرات الشرقية، ووُزّعت صورة الحاج على نقاط الإرشاد.")
    c.settle(400)
    p.locator(f"{drawer()} textarea").first.scroll_into_view_if_needed(); c.settle(400)
    c.shot("ops-update", "بعد الإسناد: صار البلاغ «قيد المعالجة»، وتحديث يُكتب في مساره", hl=[(f"{drawer()} button[aria-label='إضافة تحديث']", "")], section=S)
    dlg.locator("button[aria-label='إضافة تحديث']").click(); c.settle(1000)
    dlg.locator("button:has-text('مغلق')").first.scroll_into_view_if_needed()
    dlg.locator("button:has-text('مغلق')").first.click(); c.settle(1500)
    c.shot("ops-closed", "البلاغ مغلقاً، ومساره كاملاً", hl=[(f"{drawer()} button:has-text('مغلق')", "")], section=S)
    close_drawer(s)
    # the platform's suggestion of an extra bus
    c.scroll_top(); c.settle(4500)  # the toast goes
    c.shot("ops-bus", "اقتراح المنصة: حافلة تاسعة لمزدلفة", hl=[("main button:has-text('قبول الاقتراح وطلب الحافلة')", "")], section=S)
    s.btn("قبول الاقتراح وطلب الحافلة", 1500)
    # the internal tasks
    p.locator(seg("الأقسام", "المهام الداخلية")).first.click(); c.settle(1500)
    c.shot("ops-tasks", "المهام الداخلية: قائمة بحالة كل مهمة", hl=[("main button:has-text('+ مهمة جديدة')", "1"), ("main tbody tr:has-text('توزيع صورة سليم حسن') button:has-text('نقل إلى')", "2")], section=S)
    s.btn("+ مهمة جديدة", 900)
    dlg = p.locator(drawer()).last
    dlg.locator("label:has-text('عنوان المهمة') input").fill("تجهيز مياه باردة عند مدخل مخيم 42 في عرفة")
    dlg.locator("label:has-text('تُسند إلى') input").fill("مشرف الإعاشة"); c.settle(400)
    c.shot("ops-task-new", "مهمة جديدة: عنوانها ومن تُسند إليه", hl=[(f"{drawer()} button:has-text('إضافة المهمة')", "")], section=S)
    dlg.locator("button:has-text('إضافة المهمة')").click(); c.settle(1500)
    c.shot("ops-task-added", "المهمة الجديدة في أول القائمة بحالة «جديدة»", hl=[("main tbody tr:has-text('مخيم 42') button:has-text('نقل إلى')", "")], section=S)
    p.locator("main tbody tr:has-text('مخيم 42') button:has-text('نقل إلى')").first.click(); c.settle(1000)
    # the shift log
    b = p.locator("main button:has-text('سجل المناوبة')").first
    b.scroll_into_view_if_needed(); b.click(); c.settle(1000)
    c.scroll_to("main button:has-text('سجل المناوبة')", 200)
    c.shot("ops-log", "سجل المناوبة: كل قرار باسم صاحبه ووقته", section=S)
    # the operational files, to look at only
    s.nav("الملفات التشغيلية", 2000)
    c.shot("ops-files", "الملفات التشغيلية: للاطلاع فقط لغرفة العمليات", hl=[("main tbody tr:has-text('مخيمات عرفات') a:text-is('عرض')", "")], section=S)
    p.locator("main tbody tr:has-text('مخيمات عرفات') a:text-is('عرض')").first.click(); c.settle(2200)
    c.shot("ops-file-view", "ملف مخيمات عرفات للاطلاع: المراكز والمخيمات ومن يشغل كل منصب", hl=[("main p:has-text('للاطلاع فقط')", "")], section=S)
    s.close()

# ───────────────────────── 2. سجل الأحداث ولوحة الإدارة العليا (tarek) ─────────────────────────
if "audit" in PARTS:
    s = Staff(); c, p = s.c, s.p; S = "AUD"
    s.login("tarek"); c.settle(4500)  # the welcome toast goes
    c.shot("audit-home", "لوحتي للتدقيق، والصفحتان في القائمة الجانبية", hl=[(side("/staff/audit"), "1"), (side("/staff/executive"), "2")], section=S)
    s.nav("سجل الأحداث", 2000)
    c.shot("audit-top", "سجل الأحداث: من فعل، ومتى، والقيمة قبل وبعد", hl=[("main button:has-text('تصدير ما يظهر')", "1"), ("main input[aria-label='بحث في السجل']", "2")], section=S)
    s.btn("مثال: اعتراض على نتيجة القرعة", 800)
    c.shot("audit-example", "مثال الاعتراض على نتيجة القرعة", hl=[("main button:has-text('تتبّع الطلب')", "")], section=S)
    s.btn("تتبّع الطلب", 1400)
    c.scroll_to("main p:has-text('النتيجة: الطلب')", 160)
    c.shot("audit-trace", "تتبّع الطلب 51877: أحداثه من الأقدم، والنتيجة", section=S)
    s.btn("مسح", 800)
    p.locator("main select[aria-label='الموظف']").select_option(label="كنان الأحمد"); c.settle(600)
    c.scroll_to("main [role=radiogroup][aria-label='النطاق']", 130)
    c.shot("audit-filters", "التصفية: أحداث موظف واحد", hl=[("main select[aria-label='الموظف']", "1"), ("main label:has-text('تعديلات فقط')", "2"), ("main button:has-text('مسح')", "3")], section=S)
    s.nav("لوحة الإدارة العليا", 3500)
    c.shot("exec-top", "لوحة الإدارة العليا: من التقديم إلى أداء الفريضة", hl=[("main button:has-text('طباعة التقرير')", "")], section=S)
    c.scroll_to("text=نتائج القبول المباشر والقرعة", 120); c.settle(1500)
    c.shot("exec-2", "نتائج القبول والقرعة، ورضا الحجاج حسب المرحلة", section=S)
    c.scroll_to("text=أكثر الشكاوى تكراراً", 120); c.settle(1500)
    c.shot("exec-3", "الشكاوى، وترتيب التكتلات، ومقارنة الموسمين، ومقدّمو الخدمات", section=S)
    s.close()

# ───────────────────────── 3. محتوى الموقع (nour) ─────────────────────────
if "cms" in PARTS:
    from PIL import Image, ImageDraw
    img = OUTDIR / "صورة-خبر-القرعة.png"
    im = Image.new("RGB", (1200, 675), (0, 64, 58)); d = ImageDraw.Draw(im)
    d.rectangle([60, 60, 1140, 615], outline=(217, 200, 158), width=10); d.ellipse([480, 217, 720, 457], fill=(217, 200, 158))
    im.save(img)
    s = Staff(); c, p = s.c, s.p; S = "CMS"
    s.login("nour"); c.settle(4500)  # the welcome toast goes
    c.shot("cms-home", "لوحتي لمحرّرة المحتوى: أرقام المحتوى", hl=[(side("/staff/content"), "1")], section=S)
    s.nav("محتوى الموقع", 2000)
    c.shot("cms-pages", "محتوى الموقع: الصفحات في قائمة", hl=[(seg("أقسام المحتوى", "الصفحات والمجموعات"), "1"), ("main input[aria-label='بحث في الصفحات']", "2"), ("main tbody tr:has(button:text-is('الصفحة الرئيسية')) td:first-child > button", "3")], section=S)
    c.scroll_to("main h2:has-text('مجموعات المحتوى')", 120)
    c.shot("cms-collections", "مجموعات المحتوى: الأخبار والأسئلة الشائعة وغيرها", hl=[(FAQ_OPEN, "")], section=S)
    c.scroll_top()
    p.locator("main tbody tr:has(button:text-is('الصفحة الرئيسية')) button:text-is('تعديل')").first.click(); c.settle(2000)
    c.shot("cms-editor", "تعديل الصفحة الرئيسية: أقسامها، وحقول القسم المختار", hl=[("main button:has-text('الواجهة الرئيسية')", "1"), ("main div:has(> div > label:text-is('الشارة العلوية')) input", "2")], section=S)
    f = p.locator("main div:has(> div > label:text-is('الشارة العلوية')) input").first
    f.fill("التسجيل لموسم حج 1448هـ مفتوح الآن — تابع مواعيدك من «طلبي وخطواته»"); c.settle(1200)
    c.scroll_top()
    c.shot("cms-edit", "بعد التعديل: الحقل «معدَّل»، والصفحة فيها مسودة لم تُنشر", hl=[("main button:has-text('حفظ كمسودة')", "")], section=S)
    s.btn("حفظ كمسودة", 7500)  # the toast goes
    c.shot("cms-preview-on", "زر «وضع المعاينة» أعلى الصفحة", hl=[("main button:has-text('وضع المعاينة')", "")], section=S)
    p.locator("main button:has-text('وضع المعاينة')").first.click(); c.settle(1200)
    c.goto("/", wait=3000)
    c.shot("cms-preview", "الموقع في وضع المعاينة: المسودة ظاهرة لك وحدك", hl=[("text=تابع مواعيدك", "1"), ("a:has-text('لوحة المحتوى')", "2")], section=S)
    p.locator("a:has-text('لوحة المحتوى')").first.click(); c.settle(2200)
    p.locator("main button:has-text('وضع المعاينة')").first.click(); c.settle(4500)  # preview off, its toast goes
    p.locator("main tbody tr:has(button:text-is('الصفحة الرئيسية')) button:text-is('تعديل')").first.click(); c.settle(2000)
    s.btn("نشر", 1800)
    c.shot("cms-published", "نُشرت الصفحة: صارت «منشورة» بآخر تعديل واسمك", section=S)
    # a section hidden or archived from the list of sections
    row = p.locator("main div.group:has(button:has-text('شريط الآية'))").first
    c.settle(3500)  # the toast goes
    c.scroll_to("main div.group:has(button:has-text('شريط الآية'))", 450); row.hover(); c.settle(500)
    c.shot("cms-section-tools", "أدوات القسم: التحريك، والإخفاء عن الزوار، والأرشفة", hl=[("main div.group:has(button:has-text('شريط الآية'))", "")], section=S)
    p.locator("main div.group:has(button:has-text('شريط الآية')) button[title='أرشفة القسم']").first.click(); c.settle(1500)
    # a collection: the frequently asked questions (the news articles' «فتح» opens the news page's header instead:
    # the page and the collection share the id «news»)
    s.btn("كل الصفحات", 1800)
    c.scroll_to("main h2:has-text('مجموعات المحتوى')", 120)
    p.locator(FAQ_OPEN).first.click(); c.settle(2000)
    c.shot("cms-faq", "الأسئلة الشائعة: بطاقة لكل سؤال، وزر «سؤال جديد»", hl=[("main button:has-text('سؤال جديد')", "")], section=S)
    s.btn("سؤال جديد", 1800)
    c.scroll_top()
    p.locator("main div:has(> div > label:text-is('السؤال')) textarea").first.fill("هل أستطيع تغيير مكتب المحافظة بعد قبول طلبي؟"); c.settle(300)
    p.locator("main div:has(> div > label:text-is('الجواب')) textarea").first.fill("نعم، قبل إلحاقك بمجموعة فقط: راجع مكتب المحافظة الجديدة ومعك إيصال التسجيل، فيُنقل طلبك إليه."); c.settle(1200)
    c.shot("cms-faq-new", "سؤال جديد: التصنيف والسؤال والجواب", hl=[("main div:has(> div > label:text-is('السؤال')) textarea", "1"), ("main button:has-text('نشر')", "2")], section=S)
    s.btn("نشر", 1500)
    # media, earlier versions, archive
    c.goto("/staff/content?tab=media", wait=2000)
    p.locator("main input[type=file]").first.set_input_files(str(img)); c.settle(2500)
    c.shot("cms-media", "مكتبة الوسائط بعد رفع صورة", hl=[("main button:has-text('اختر ملفات من جهازك')", "")], section=S)
    p.locator(seg("أقسام المحتوى", "النسخ السابقة")).first.click(); c.settle(1500)
    c.shot("cms-revisions", "النسخ السابقة: نسخة قبل كل نشر، مع «استعادة»", hl=[("main button:has-text('استعادة')", "")], section=S)
    p.locator(seg("أقسام المحتوى", "الأرشيف")).first.click(); c.settle(1500)
    c.shot("cms-archive", "الأرشيف: القسم المؤرشف مع «استعادة»", hl=[("main button:has-text('استعادة')", "")], section=S)
    s.btn("استعادة", 1200)
    s.close()

# ───────────────────────── 4. الفريق الطبي (layla) ─────────────────────────
if "med" in PARTS:
    s = Staff(storage=PILGRIM_STATE); c, p = s.c, s.p; S = "MED"
    s.login("layla"); c.settle(4500)  # the welcome toast goes
    c.shot("med-home", "لوحتي للفريق الطبي: وثائق تنتظر، وحالات، وبلاغات", hl=[(side("/staff/medical"), "1")], section=S)
    s.nav("الفريق الطبي", 2000)
    c.shot("med-docs", "وثائق تنتظر المراجعة: وثيقة في كل صف", hl=[("main tbody tr:nth-child(1) button:text-is('اعتماد')", "1"), ("main tbody tr:nth-child(2) button:text-is('إعادة بسبب')", "2")], section=S)
    p.locator("main tbody tr button:text-is('اعتماد')").first.click(); c.settle(1500)
    p.locator("main tbody tr:has-text('خديجة') button:text-is('إعادة بسبب')").first.click(); c.settle(900)
    p.locator("textarea[aria-label='السبب']").fill("الصورة غير واضحة: تاريخ الجرعة الثانية لا يُقرأ. ارفعها مرة أخرى بإضاءة أفضل."); c.settle(400)
    c.shot("med-return", "إعادة وثيقة مع سببها", hl=[("[role=dialog] button:text-is('إعادة')", "")], section=S)
    p.locator("[role=dialog] button:text-is('إعادة')").first.click(); c.settle(1500)
    p.locator(seg("القسم", "الحالات الصحية")).first.click(); c.settle(1500)
    c.shot("med-files", "الحالات الصحية: ما سجّله منسقو المجموعات لكل حاج", section=S)
    p.locator(seg("القسم", "البلاغات الصحية")).first.click(); c.settle(1500)
    c.shot("med-reports", "البلاغات الصحية من الميدان", hl=[("main tbody tr button:text-is('فتح')", "")], section=S)
    p.locator("main tbody tr button:text-is('فتح')").first.click(); c.settle(1300)
    c.shot("med-report-open", "بلاغ صحي مفتوحاً: الحالة والإسناد والمسار", hl=[(f"{drawer()} button:has-text('قيد المعالجة')", "1"), (f"{drawer()} textarea", "2")], section=S)
    s.close()

# ───────────────────────── 5. المواصلات (bassel) ─────────────────────────
if "trn" in PARTS:
    s = Staff(storage=PILGRIM_STATE); c, p = s.c, s.p; S = "TRN"
    s.login("bassel"); c.settle(4500)  # the welcome toast goes
    c.shot("trn-home", "لوحتي لفريق المواصلات", hl=[(side("/staff/transport"), "1")], section=S)
    s.nav("المواصلات", 2000)
    c.shot("trn-reports", "بلاغات النقل من الميدان", hl=[("main tbody tr button:text-is('فتح')", "")], section=S)
    p.locator(seg("القسم", "حجاج يحتاجون تجهيزاً")).first.click(); c.settle(1500)
    c.shot("trn-needs", "حجاج يحتاجون حافلة مجهّزة، بمجموعاتهم ومرافقيهم", section=S)
    p.locator(seg("القسم", "الحافلات")).first.click(); c.settle(1500)
    c.shot("trn-buses", "الحافلات: خطة حافلات مزدلفة المبكرة", section=S)
    s.close()

print("DONE stf_ops", PARTS)
