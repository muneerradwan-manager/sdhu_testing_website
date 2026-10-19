# -*- coding: utf-8 -*-
"""Administrator guide — run C: the other roles through their ready demo accounts (one clean browser each).
Usage: CAP_DIR=admin python adm_c.py <keep> [part]"""
import sys
from cap import Cap, ROOT, truncate

truncate(int(sys.argv[1]))
ONLY = sys.argv[2] if len(sys.argv) > 2 else None

NAMES = {"01033300881": "عبد الرحمن العلي", "01033300882": "نبيل الساعاتي", "01033300883": "بسام درويش", "01033300884": "وليد القصاب",
         "01033300871": "أحمد سليمان الحمصي", "01033300872": "ياسر عبد الله", "01033300873": "الشيخ خالد الرفاعي", "01033300874": "سامر نبيل نجار",
         "01033300891": "صلاح الدين المارديني", "01033300896": "الشيخ عبد الهادي البغدادي", "01033300944": "مهند السيد", "01033300981": "هالة الدقر"}
def session(demo_id, path="/administrator/dashboard"):
    c = Cap(); p = c.page
    c.goto("/administrator/login?demo=all", wait=1500)
    card = p.locator(f"main button:has-text('{NAMES[demo_id]} —')").first
    card.scroll_into_view_if_needed(); card.click(); c.settle(2500)
    if path: c.goto(path, wait=1800)
    return c, p

def btn(p, c, text, wait=900):
    b = p.get_by_role("button", name=text).first
    b.scroll_into_view_if_needed(); b.click(); c.settle(wait)

def jump(p, c):
    """«جرّبها الآن»: the demo's date moves to the operation's first day and hour"""
    j = p.locator("main button:has-text('جرّبها الآن')")
    if j.count():
        j.first.click(); c.settle(1500)

def tab(p, c, name, wait=1200):
    p.locator(f"main [role=tab]:has-text('{name}')").first.click(); c.settle(wait)

# ───────── returning administrator: keep the role ─────────
if ONLY in (None, "ret"):
    c = Cap(); p = c.page
    c.goto("/administrator/login?demo=all", wait=1500)
    p.locator("main button:has-text('معتصم العرقسوسي —')").first.scroll_into_view_if_needed(); c.settle(400)
    c.shot("quick-login", "الدخول الفوري بحساب تجريبي من صفحة الدخول", hl=[("main button:has-text('معتصم العرقسوسي —')", "")], section="B")
    p.locator("main button:has-text('معتصم العرقسوسي —')").first.click(); c.settle(2500)
    c.goto("/administrator/apply", wait=1800)
    jump(p, c)
    c.shot("ret-docs", "إداري عائد: ملفه الدائم أول الطلب، ووثيقة منتهية الصلاحية تحتاج تحديثاً", section="D")
    up = p.locator("button:has-text('حدّثها الآن')")
    if up.count():
        up.first.scroll_into_view_if_needed(); c.settle(300)
        c.shot("ret-docs-expired", "زر «حدّثها الآن» للوثيقة المنتهية", hl=[("button:has-text('حدّثها الآن')", "")], section="D")
        up.first.click(); c.settle(2600)
    btn(p, c, "التالي", 1200); btn(p, c, "التالي", 1200); c.scroll_top()
    c.shot("ret-role", "إداري عائد: آخر موسم شارك فيه وخيار الاستمرار في الصفة نفسها", section="D")
    p.locator("main button[aria-pressed]").first.click(); c.settle(600)
    c.scroll_to("text=الاستمرار في الصفة نفسها", 150)
    c.shot("ret-role-keep", "الاستمرار في الصفة نفسها: معفى من الاختبار", section="D")
    c.close()
    c, p = session("01033300884", "/administrator/apply")
    jump(p, c)
    up = p.locator("button:has-text('حدّثها الآن')")
    if up.count():
        up.first.click(); c.settle(2600)
    btn(p, c, "التالي", 1200); btn(p, c, "التالي", 1200)
    c.scroll_to("text=الاستمرار في الصفة نفسها", 150)
    c.shot("ret-role-unavailable", "تقييم الموسم السابق دون الحد: الاستمرار غير متاح والتقدم بالاختبار المؤتمت", section="D")
    c.close()

# ───────── the approved cluster: its head ─────────
if ONLY in (None, "head"):
    S = "J"
    # before: a holder of «رئيس تكتل» whose cluster the office has not formed yet
    c, p = session("01033300882", "/administrator/clusters")
    c.shot("head-before", "إدارة التكتل قبل التشكيل: يُشكَّل التكتل في المكتب، ويظهر هنا فور إنشائه", section=S)
    c.close()
    c, p = session("01033300881")
    c.shot("head-dash", "رئيس التكتل: ملفي — صفته وتكتله المعتمد", section=S)
    c.goto("/administrator/clusters", wait=2000)
    c.shot("head-manage", "إدارة التكتل: شُكّل في المكتب — مجموعاته بفئاتها ومقاعد فريقها، وتبويبات الكادر والعقد والخطة", section=S)
    p.locator("main button:has-text('افتحها')").first.click(); c.settle(1500)
    c.scroll_top()
    c.shot("head-group-open", "مجموعة من التكتل: فريقها في مقاعدها، وحجاجها وعقودهم", section=S)
    tab(p, c, "كادر التكتل")
    c.shot("head-team", "كادر التكتل كما دخل في المكتب: موجّهو المجموعات ومعاونوها، ومعاونوه ومنسقوه وموجّهاته ومحاسبه", section=S)
    c.scroll_to("main :text('توزيع المنسقين على المجموعات')", 120)
    c.shot("head-coord-sort", "توزيع المنسقين على المجموعات: ما يحمله كلٌّ من حدّه، ومنسق كل مجموعة، يغيّره رئيس التكتل", section=S)
    # A change asks first: pick another coordinator (or none) for the first group, show the question, and cancel it
    sel = p.locator("main select[aria-label^='منسق ']").first
    cur = sel.input_value()
    other = [o.get_attribute("value") for o in sel.locator("option:not([disabled])").all() if o.get_attribute("value") != cur]
    sel.select_option(other[0]); c.settle(900)
    c.shot("head-coord-confirm", "تأكيد تغيير المنسق: من يترك المجموعة ومن يأخذها، وحمل كلٍّ من حدّه", hl=[("[role=dialog] button:has-text('موافق')", "")], section=S)
    p.locator("[role=dialog] button:has-text('إلغاء')").click(); c.settle(600)
    tab(p, c, "العقد")
    c.shot("head-contract", "العقد: عقد التكتل الموقّع كما رفعه الموظف، يُفتح بالضغط عليه", hl=[("main button:has-text('فتح العقد')", "")], section=S)
    tab(p, c, "الخطة التشغيلية")
    c.shot("head-plan", "الخطة التشغيلية: خلاصتها وملفها، تقدّمها للإدارة", section=S)
    p.get_by_label("خلاصة الخطة").fill("فندقان في العزيزية على 3 كم من الحرم، وفندق في المدينة على 400 م. حافلات حديثة بين المشاعر، وثلاث وجبات. الكادر موزّع على المراحل الخمس، ولكل مجموعة نقطة تجمّع.")
    p.locator("main input[type=file]").first.set_input_files({"name": "خطة-تكتل-النور.pdf", "mimeType": "application/pdf", "buffer": b"%PDF-1.4"}); c.settle(400)
    btn(p, c, "تقديم الخطة", 1500)
    c.scroll_top()
    c.shot("head-plan-sent", "قُدّمت الخطة: تنتظر قرار الإدارة، ويصلك هنا وفي الإشعارات", section=S)
    # the public page has its own entry in the sidebar
    c.goto("/administrator/cluster-page", wait=1800)
    c.shot("head-profile", "صفحة التكتل العامة في «التكتلات والمجموعات»: التعديل", hl=[("aside a[href='/administrator/cluster-page']", "")], section=S)
    ta = p.locator("main textarea").first
    if ta.count():
        ta.fill(ta.input_value() + " ونوفّر حافلة خاصة لكبار السن إلى الحرم.")
        c.settle(300)
    sb = p.locator("button:has-text('أرسل للاعتماد')").first
    sb.scroll_into_view_if_needed(); c.settle(300)
    c.shot("head-profile-send", "إرسال التعديل لاعتماد الإدارة", hl=[("button:has-text('أرسل للاعتماد')", "")], section=S)
    sb.click(); c.settle(1500)
    c.shot("head-profile-pending", "تعديلك عند الإدارة للاعتماد", section=S)
    # the group's own page: its picture, a word and its gallery, from the head's sidebar
    pics = ROOT.parent.parent / "public" / "images"
    c.goto("/administrator/group-page", wait=1500)
    c.shot("group-page", "صفحات المجموعات العامة: رئيس التكتل يختار أي مجموعة من مجموعاته", hl=[("aside a[href='/administrator/group-page']", "")], section=S)
    p.locator("input[type=file][aria-label='صورة المجموعة']").set_input_files(str(pics / "mina-arrive.jpg")); c.settle(1500)
    p.get_by_label("نبذة عن المجموعة").fill("مجموعة من دمشق منذ 1444هـ، فريقها من المواسم السابقة، ولها درس يومي بعد العصر في مكة.")
    p.locator("input[type=file][aria-label='صور المعرض']").set_input_files([str(pics / n) for n in ("kaaba-hajj.jpg", "tawaf-night.jpg", "jamarat.jpg")]); c.settle(2500)
    c.scroll_to("h3:has-text('معرض الصور')", 140)
    c.shot("group-page-filled", "صورة المجموعة ونبذتها وثلاث صور في معرضها", section=S)
    gb = p.locator("button:has-text('أرسل للاعتماد')").first
    gb.scroll_into_view_if_needed(); c.settle(300)
    gb.click(); c.settle(1500)
    c.scroll_top()
    c.shot("group-page-pending", "صفحة المجموعة عند الإدارة للاعتماد", section=S)
    c.save_state(str(ROOT / "admin" / "state-head-profile.json"))
    c.close()

# ───────── the cluster's accountant ─────────
if ONLY in (None, "acc"):
    S = "K"
    c, p = session("01033300944")
    c.shot("cacc-dash", "محاسب التكتل: ملفي — صفة ثانوية فوق مقعده في المجموعة", section=S)
    c.close()

# ───────── technical coordinator ─────────
if ONLY in (None, "tech"):
    c, p = session("01033300874")
    S = "L"
    c.shot("tech-dash", "المنسق التقني: ملفي — منسق في تكتل النور لثلاث من مجموعاته", section=S)
    c.goto("/administrator/groups", wait=1800)
    c.shot("tech-groups", "إدارة المجموعات: المجموعات التي وُزّع عليها حين شُكّل التكتل في المكتب", section=S)
    c.goto("/administrator/pilgrims", wait=1800)
    jump(p, c)
    c.shot("tech-reg", "التسجيل على الحج: البحث عن المواطن في الشؤون المدنية", section=S)
    p.locator("label:has-text('الرقم الوطني') input").first.fill("01012340078")
    p.locator("label:has-text('الاسم الأول') input").first.fill("خديجة"); c.settle(200)
    btn(p, c, "بحث", 2500)
    c.shot("tech-reg-found", "بيانات المواطن ورقم هاتفه الذي يمليه", section=S)
    p.get_by_label("رقم هاتف المواطن").fill("0933123456"); c.settle(200)
    btn(p, c, "إرسال رمز التحقق", 1200)
    c.otp("1448")
    c.scroll_to("text=رمز الموافقة", 250)
    c.shot("tech-reg-otp", "إدخال رمز موافقة المواطن", hl=[("button:has-text('تأكيد الموافقة ومتابعة')", "")], section=S)
    btn(p, c, "تأكيد الموافقة ومتابعة", 1500); c.scroll_top()
    c.shot("tech-reg-members", "من سيحج مع المواطن؟", section=S)
    btn(p, c, "افحص الأهلية", 1500)
    p.wait_for_timeout(6000); c.scroll_top()
    c.shot("tech-reg-elig", "فحص الأهلية", section=S)
    c.close()
    c, p = session("01033300874", "/administrator/pilgrims")
    jump(p, c)
    det = p.locator("text=عرض التفاصيل").first
    if det.count():
        det.click(); c.settle(1800); c.scroll_top()
        c.shot("tech-detail", "تفاصيل طلب سجّله المنسق", section=S)
    c.goto("/administrator/requests", wait=1800)
    jump(p, c)
    c.shot("tech-requests", "حجاج مجموعاتي: حجاج المجموعات التي وُزّع عليها، وملفاتهم الصحية", section=S)
    c.close()

# ───────── the group's team, and the cluster's own posts ─────────
if ONLY in (None, "members"):
    S = "M"
    for demo, key, cap in [("01033300872", "gdep", "معاون المجموعة"), ("01033300873", "guide", "موجّه المجموعة")]:
        c, p = session(demo)
        c.shot(f"{key}-dash", f"{cap}: ملفي", section=S)
        c.goto("/administrator/groups", wait=1800)
        c.shot(f"{key}-group", f"{cap}: إدارة المجموعة", section=S)
        c.goto("/administrator/requests", wait=1800)
        jump(p, c)
        c.shot(f"{key}-requests", f"{cap}: حجاج المجموعة", section=S)
        c.goto("/administrator/field", wait=1800)
        c.shot(f"{key}-field", f"{cap}: الميدان", section=S)
        c.close()
    # The field of someone who works in several groups: his groups on top with their pictures, the first one's tools under them
    c, p = session("01033300874", "/administrator/field")
    c.shot("field-pick", "الميدان لمن يعمل في أكثر من مجموعة: مجموعاته في الأعلى بصورها، وأدوات المختارة منها تحتها", hl=[("main [role=radiogroup][aria-label='المجموعة']", "")], section=S)
    c.close()
    # The cluster's public page: its team writes it, not its head alone
    c, p = session("01033300872", "/administrator/cluster-page")
    c.shot("team-page", "صفحة التكتل العامة لفريق التكتل: معاون المجموعة يكتب فيها ويرسلها للاعتماد", hl=[("aside a[href='/administrator/cluster-page']", "")], section=S)
    c.close()
    c, p = session("01033300981", "/administrator/groups")
    c.shot("gf-groups", "موجّهة التكتل: المجموعات التي وُزّعت عليها ضمن حدّها من الوحدات", section=S)
    c.close()

# ───────── «قناة التكتل»: its head, then a member who reads ─────────
if ONLY in (None, "channel"):
    S = "N2"
    c, p = session("01033300881", "/administrator/channel")
    c.shot("chan-head", "قناة التكتل: رسائل كادر التكتل، ومن يكتب فيها", hl=[("aside a[href*='/administrator/channel']", "")], section=S)
    p.locator("main div.group:has-text('هل نحضر قوائم') button:has-text('ردّ')").first.click(); c.settle(400)
    p.get_by_label("نص الرسالة").fill("نعم، تكفي على المنصة. وأرسلوا أسماء معاونيكم قبل الاجتماع.")
    c.settle(300)
    c.shot("chan-reply", "الرد على رسالة: يظهر ما تردّ عليه فوق خانة الكتابة", hl=[("main button:has-text('إرسال')", "")], section=S)
    p.locator("main button:has-text('إرسال')").first.click(); c.settle(1500)
    c.scroll_to("main h2:has-text('من يكتب في القناة')", 120)
    c.shot("chan-writers", "من يكتب في القناة: جاهزاً أو صفةً صفة، ورئيس التكتل يكتب دائماً", hl=[("main h2:has-text('من يكتب في القناة')", "")], section=S)
    # stopping a writer, from one of his messages
    stop = p.locator("main div.group button:has-text('إيقاف كتابته')").first
    stop.scroll_into_view_if_needed(); stop.click(); c.settle(600)
    p.locator("[role=dialog] input").first.fill("الأسئلة الخاصة بمجموعته مع رئيس التكتل مباشرة"); c.settle(300)
    c.shot("chan-mute", "إيقاف كتابة عضو: يبقى يقرأ، ولا يكتب حتى تعيدها له", hl=[("[role=dialog] button:has-text('إيقاف الكتابة')", "")], section=S)
    p.locator("[role=dialog] button:has-text('إيقاف الكتابة')").first.click(); c.settle(1200)
    c.close()
    c, p = session("01033300874", "/administrator/dashboard")
    c.shot("chan-badge", "رسائل جديدة في قناة التكتل: عددها بجانب «قناة التكتل»", hl=[("aside a[href*='/administrator/channel']", "")], section=S)
    c.goto("/administrator/channel", wait=2500)
    c.shot("chan-member", "عضو يقرأ: الكتابة لمن حددهم رئيس التكتل", hl=[("main p:has-text('كما حدّدها رئيس التكتل')", "")], section=S)
    c.close()

# ───────── notifications, Telegram, letters, and the PIN ─────────
if ONLY in (None, "letters"):
    S = "C2"
    c, p = session("01033300871", "/administrator/notifications")
    c.shot("notif-list", "الإشعارات: ما وصلك من الإدارة ومن رؤساء التكتلات", section=S)
    c.scroll_to("main button:has-text('محاكاة: أرسلتُ الرمز إلى البوت')", 160)
    c.shot("notif-telegram", "تيليجرام: رمز الربط ببوت المنصة", hl=[("button:has-text('محاكاة: أرسلتُ الرمز إلى البوت')", "")], section=S)
    btn(p, c, "محاكاة: أرسلتُ الرمز إلى البوت", 1200)
    c.shot("notif-telegram-linked", "رُبط تيليجرام: رمز دخولك يظهر ويصلك من البوت", section=S)
    c.goto("/administrator/letters", wait=1800)
    btn(p, c, "رسالة جديدة إلى الإدارة", 800)
    p.get_by_label("الموضوع").fill("موعد اجتماع رؤساء المجموعات في تكتل النور")
    p.get_by_label("نص الرسالة").fill("متى يُعقد اجتماع رؤساء المجموعات قبل السفر؟ وهل يلزم حضور معاون المجموعة؟")
    c.settle(300)
    c.shot("letters-new", "المراسلات: رسالة جديدة إلى الإدارة بموضوعها ونوعها ومرفقها", hl=[("main button:text-is('إرسال')", "")], section=S)
    p.locator("main button:text-is('إرسال')").first.click(); c.settle(1500)
    c.shot("letters-sent", "أُرسلت الرسالة برقمها: يصلك الرد في سياقها", section=S)
    # the administration answers it from the staff portal (same browser, its own session)
    c.goto("/staff/login", wait=1500)
    p.locator("label:has-text('اسم المستخدم') input").first.fill("mazen")
    p.locator("label:has-text('كلمة المرور') input").first.fill("1448")
    p.locator("main button:text-is('دخول')").first.click(); c.settle(3000)
    c.goto("/staff/admins/manage/letters", wait=1800)
    p.locator("main button:has-text('موعد اجتماع رؤساء المجموعات')").first.click(); c.settle(1200)
    p.get_by_label("الرد").fill("يُعقد الأحد 15 تشرين الثاني الساعة 11 في مبنى الإدارة بالمزة، ويحضره رئيس المجموعة ومعاونها.")
    p.locator("[role=dialog] button:has-text('إرسال الرد')").first.click(); c.settle(1200)
    c.goto("/administrator/letters", wait=1800)
    c.shot("letters-list", "رسائلي: «رد جديد» على الرسالة التي ردّت عليها الإدارة", section=S)
    p.locator("main button:has-text('موعد اجتماع رؤساء المجموعات')").first.click(); c.settle(1200)
    c.shot("letters-reply", "رد الإدارة في سياق الرسالة، وتردّ فيه ما دامت مفتوحة", section=S)
    c.close()
    # the cadre's references, public pages
    c = Cap(); p = c.page
    c.goto("/administrator", wait=2000)
    c.scroll_to("text=ما يعمل به الكادر", 140)
    c.shot("refs-landing", "مراجع الكادر في صفحة الإداري: خمس صفحات تنشرها الإدارة", section="A")
    c.goto("/administrator/job-descriptions", wait=2000)
    c.shot("pub-jobs", "التوصيف الوظيفي: الهيكل التنظيمي للتكتل، ثم بطاقة لكل صفة", section="A")
    c.goto("/administrator/system", wait=2000)
    c.shot("pub-system", "النظام الإداري: أقسامه وفهرسها والطباعة", section="A")
    c.close()

print("DONE adm_c")
