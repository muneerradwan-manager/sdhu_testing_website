# -*- coding: utf-8 -*-
"""Staff guide — run A: login/logout, dashboard, my files, locked page, reviews, season settings, lottery.
Usage: CAP_DIR=staff python stf_a.py <keep> [part]"""
import sys
from cap import Cap, ROOT, truncate

# The other runs import Staff from here: only a run of this file captures its parts
MAIN = __name__ == "__main__"
if MAIN:
    truncate(int(sys.argv[1]))
ONLY = (sys.argv[2] if len(sys.argv) > 2 else None) if MAIN else "-"

class Staff:
    def __init__(self, storage=None):
        self.c = Cap(storage=storage); self.p = self.c.page
    def login(self, user, shots=False, S="A"):
        c, p = self.c, self.p
        c.goto("/staff/login", wait=1500)
        p.locator("label:has-text('اسم المستخدم') input").first.fill(user)
        p.locator("label:has-text('كلمة المرور') input").first.fill("1448"); c.settle(300)
        if shots:
            c.shot("login-filled", "إدخال اسم المستخدم وكلمة المرور", hl=[("button[type=submit]:has-text('دخول'), main button:text-is('دخول')", "")], section=S)
        p.locator("main button:text-is('دخول')").first.click(); c.settle(2500)
        # each lands on his own home: a file's summary, «لوحتي», his hall, his airport or his files
        p.wait_for_url(lambda u: "/staff/" in u and "/staff/login" not in u, timeout=20000); c.settle(1500)
    def logout(self):
        b = self.p.locator("button:has-text('تسجيل الخروج')").filter(visible=True).first
        b.scroll_into_view_if_needed(); b.click(); self.c.settle(1500)
    def btn(self, text, wait=900, scope="main"):
        b = self.p.locator(f"{scope} button:has-text('{text}')").filter(visible=True).first
        b.scroll_into_view_if_needed(); b.click(); self.c.settle(wait)
    def tab(self, name, wait=900):
        self.p.get_by_role("tab", name=name).first.click(); self.c.settle(wait)
    def page_tab(self, name, wait=1200):
        """A management page's tab: a link in its tab bar, not a role=tab"""
        self.p.locator(f"nav[aria-label^='تبويبات'] a:has-text('{name}')").first.click(); self.c.settle(wait)
    def close(self):
        self.c.close()

# ───────── A. login, dashboard, my files, locked page ─────────
if ONLY in (None, "a"):
    s = Staff(); c, p = s.c, s.p; S = "A"
    c.goto("/staff", wait=2200)
    c.shot("landing", "بوابة الموظفين: الصفحة الأولى، وفيها تسجيل الدخول وحده", hl=[("main a:has-text('تسجيل الدخول')", "1")], section=S)
    c.goto("/staff/login", wait=1600)
    c.shot("login", "دخول الموظفين: اسم المستخدم وكلمة المرور، وحسابات تجريبية", section=S)
    p.locator("label:has-text('اسم المستخدم') input").first.fill("suha")
    p.locator("label:has-text('كلمة المرور') input").first.fill("0000")
    p.locator("main button:text-is('دخول')").first.click(); c.settle(1500)
    c.shot("login-error", "اسم مستخدم أو كلمة مرور غير صحيحة", section=S)
    c.scroll_to("text=حسابات تجريبية", 110)
    c.shot("login-cards", "بطاقات الحسابات التجريبية وصلاحيات كل موظف (للعرض)", section=S)
    s.login("suha", shots=True)
    c.shot("dash", "لوحتي: مؤشرات حسب صلاحياتك", section=S)
    c.scroll_by(520)
    c.shot("dash-2", "لوحات الموسم ومهامي اليوم", section=S)
    c.scroll_top()
    tog = p.locator("button:has-text('صلاحيات')").filter(visible=True).first
    if tog.count():
        tog.click(); c.settle(600)
        c.shot("dash-perms", "بطاقة الموظف في الشريط الجانبي: صلاحياتك والأقسام التي تظهر لك", section=S)
    # the management of the files: the director grants it and follows each file
    c.goto("/staff/systems", wait=2000)
    c.shot("sys-top", "صلاحيات الإدارة: من يحمل إدارة كل ملف، وحال الملف وما يعطّله وأحداثه المهمة", hl=[("aside a[href$='/staff/systems']", "")], section=S)
    g = p.locator("select[aria-label='منح إدارة الطيران']").first
    g.scroll_into_view_if_needed(); g.select_option("fadi"); c.settle(500)
    c.shot("sys-grant", "منح صلاحية الإدارة لموظف، أو سحبها ممن يحملها", hl=[("select[aria-label='منح إدارة الطيران']", "1"), ("button[aria-label='سحب الصلاحية من هيثم زيدان']", "2")], section=S)
    c.goto("/staff/exam", wait=1800)
    c.shot("sys-locked", "ملف لا تحمل صلاحية إدارته: من يحملها، ومن أين تُمنح", section=S)
    s.logout()
    c.shot("logout", "بعد تسجيل الخروج تعود صفحة الدخول", section=S)
    s.close()
    s = Staff(); c, p = s.c, s.p
    s.login("layla")
    c.goto("/staff/my-files", wait=1800)
    c.shot("myfiles", "ملفاتي التشغيلية: أين أكون ومتى في الموسم", section=S)
    c.scroll_by(650)
    c.shot("myfiles-2", "موقعي: الدور والوصف الوظيفي والمدير المباشر والفريق", section=S)
    s.close()
    s = Staff(); c, p = s.c, s.p
    s.login("tarek")
    c.goto("/staff/season", wait=1800)
    c.shot("locked", "فتح صفحة خارج صلاحياتك", section=S)
    s.close()

# ───────── B. registration.review ─────────
if ONLY in (None, "b"):
    s = Staff(); c, p = s.c, s.p; S = "B"
    s.login("rana")
    c.goto("/staff/reviews", wait=1800)
    c.shot("rev-top", "مراجعة الطلبات: المؤشرات ونتيجة التدقيق الآلي", section=S)
    c.scroll_to("[role=tablist]", 120)
    c.shot("rev-queue", "طابور الطلبات التي تحتاج مراجعة", section=S)
    p.locator("main button:has-text('50211'), main [role=button]:has-text('50211'), main li:has-text('50211')").first.click(); c.settle(1200)
    c.shot("rev-drawer", "تفاصيل الطلب: لماذا يحتاج مراجعة؟", section=S)
    dlg = p.locator("[role=dialog]").first
    dlg.locator("text=الوثائق").first.scroll_into_view_if_needed(); c.settle(500)
    c.shot("rev-drawer-docs", "أفراد الطلب والوثائق ودليل صلة القرابة", section=S)
    dlg.locator("textarea").first.fill("تمت مطابقة اسم الأم مع قيد الشؤون المدنية بعد التواصل مع المكتب.")
    c.settle(300)
    c.shot("rev-decision", "سبب القرار ثم الاعتماد أو الرفض", hl=[("[role=dialog] button:text-is('اعتماد')", "1"), ("[role=dialog] button:text-is('رفض')", "2")], section=S)
    dlg.locator("button:text-is('اعتماد')").first.click(); c.settle(1500)
    s.tab("معتمدة")
    c.scroll_to("[role=tablist]", 420)
    c.shot("rev-approved", "الطلب في تبويب «معتمدة»", section=S)
    s.close()
    # Attaching an accepted application to a group in the office: سعاد الحموي was accepted (her portal seeds it),
    # and the window of «إلحاق الحجاج بالمجموعات» opens with «جرّبها الآن»
    s = Staff(); c, p = s.c, s.p
    c.goto("/login", wait=1800)
    p.locator("main button:has-text('سعاد الحموي')").first.click(); c.settle(3500)
    s.login("rana")
    c.goto("/staff/reviews", wait=1800)
    jump = p.locator("main button:has-text('جرّبها الآن')")
    if jump.count():
        jump.first.click(); c.settle(1500)
    p.get_by_label("الرقم الوطني أو رقم الطلب").fill("01055500730")
    p.locator("main button:has-text('بحث')").first.click(); c.settle(1200)
    grp = p.get_by_label("المجموعة")
    if grp.count():
        grp.first.select_option(index=1); c.settle(400)
        p.locator("main input[type=file]").first.set_input_files({"name": "عقد-سعاد-الحموي.pdf", "mimeType": "application/pdf", "buffer": b"%PDF-1.4"}); c.settle(400)
    c.scroll_to("main h2:has-text('إلحاق الحجاج بالمجموعات')", 110)
    c.shot("rev-attach", "إلحاق طلب مقبول بمجموعة: البحث عنه، والمجموعة وسعتها، والعقد الموقّع", hl=[("main button:has-text('إلحاق الطلب')", "")], section=S)
    s.close()

# ───────── C. season.settings ─────────
if ONLY in (None, "c"):
    s = Staff(); c, p = s.c, s.p; S = "C"
    s.login("suha")
    c.goto("/staff/season", wait=1800)
    c.shot("season-top", "إعدادات الموسم: نوعا الطلب والحصة", section=S)
    inp = p.locator("label:has-text('الأعمار المقبولة مباشرة') input").first
    inp.scroll_into_view_if_needed(); inp.fill("67"); c.settle(600)
    c.shot("season-edit", "تعديل قيمة: تظهر علامة «غير محفوظ» وشريط الحفظ", section=S)
    ref = p.locator("input[placeholder='مرجع قرار اللجنة (اختياري)']").first
    ref.fill("قرار اللجنة 1448/12"); c.settle(300)
    c.shot("season-savebar", "شريط الحفظ: مرجع القرار ثم «حفظ واعتماد»", hl=[("button:has-text('حفظ واعتماد')", "")], section=S)
    s.btn("حفظ واعتماد", 1500)
    c.scroll_to("text=سجل تعديلات الإعدادات", 120)
    c.shot("season-log", "سجل تعديلات الإعدادات بالقيمة قبل وبعد", section=S)
    c.scroll_top()
    s.btn("القيم الافتراضية", 900)
    c.shot("season-reset", "إعادة القيم الافتراضية", section=S)
    s.btn("نعم، أعد الضبط", 1200, scope="body")
    s.close()

# ───────── D. lottery (enter what the broadcast drew → approve and publish) ─────────
if ONLY in (None, "d"):
    s = Staff(); c, p = s.c, s.p; S = "D"
    s.login("kinan")
    c.goto("/staff/lottery", wait=1800)
    c.shot("lot-top", "القبول والقرعة: أربع خطوات، ونتائج 1448 منشورة في بيئة العرض", hl=[("button:has-text('إعادة التجربة')", "")], section=S)
    s.btn("إعادة التجربة", 1500)
    c.scroll_to("text=إعلان الأعمار المقبولة", 120)
    c.shot("lot-ages", "إعلان الأعمار المقبولة: إرسالها للاعتماد", hl=[("main button:has-text('إرسال للاعتماد')", "")], section=S)
    s.btn("إرسال للاعتماد", 1200)
    c.shot("lot-sent", "أُرسلت الأعمار المقبولة للاعتماد", section=S)
    yr = p.locator("button[aria-pressed]:has-text('1972')").first
    yr.scroll_into_view_if_needed(); yr.click(); c.settle(900)
    c.scroll_to("text=2. إحصاء التسجيل الأولي على القرعة", 120)
    c.shot("lot-pool", "إحصاء التسجيل الأولي بسنة ميلاد صاحب الطلب، وأشهر السنة المختارة", hl=[("button[aria-pressed='true']", "")], section=S)
    s.btn("تصدير الإحصاء للجنة تنظيم القرعة", 2500)
    c.shot("lot-export", "صُدّر الإحصاء للجنة تنظيم القرعة", section=S)
    # one line by hand (1961, all its months), the next being set (1972, January to April)
    year = p.locator("label:has-text('سنة الميلاد') select").first
    year.scroll_into_view_if_needed(); year.select_option("1961"); c.settle(300)
    s.btn("إضافة السطر", 700)
    year.select_option("1972"); c.settle(300)
    p.locator("[role=radio]:has-text('أشهر محددة')").first.click(); c.settle(300)
    for m in ("كانون الثاني", "شباط", "آذار", "نيسان"):
        p.locator(f"button[aria-pressed]:text-is('{m}')").first.click(); c.settle(150)
    c.scroll_to("text=3. إدخال نتائج البث", 120)
    c.shot("lot-entry", "إدخال سطر: سنة الميلاد والأشهر المسحوبة منها", hl=[("button:has-text('إضافة السطر')", "")], section=S)
    s.btn("إضافة السطر", 700)
    s.btn("تعبئة ما أُعلن في بث 1448", 900)
    c.scroll_to("text=3. إدخال نتائج البث", 120)
    c.shot("lot-entered", "اكتملت مقاعد القرعة: حفظ وإرسال للاعتماد", hl=[("button:has-text('حفظ وإرسال للاعتماد')", "")], section=S)
    s.btn("حفظ وإرسال للاعتماد", 1500)
    c.scroll_to("text=4. الاعتماد والنشر", 520)
    c.shot("lot-locked-publish", "أُرسلت النتائج، والنشر يحتاج صلاحية الاعتماد", section=S)
    s.logout(); s.login("yousef")
    c.goto("/staff/lottery", wait=1800)
    ap = p.locator("button:has-text('اعتماد وإعلان الأعمار')").first
    ap.scroll_into_view_if_needed(); c.settle(300)
    c.shot("lot-approve-ages", "لجنة الاعتماد: اعتماد وإعلان الأعمار", hl=[("button:has-text('اعتماد وإعلان الأعمار')", "")], section=S)
    ap.click(); c.settle(1500)
    pub = p.locator("button:has-text('اعتماد ونشر النتائج')").first
    pub.scroll_into_view_if_needed(); pub.click(); c.settle(900)
    c.shot("lot-publish-modal", "تأكيد اعتماد ونشر نتائج القرعة", section=S)
    p.locator("[role=dialog] button:has-text('اعتماد ونشر'), div button:text-is('اعتماد ونشر')").first.click(); c.settle(2000)
    c.scroll_to("text=4. الاعتماد والنشر", 520)
    c.shot("lot-published", "نُشرت نتائج القرعة", section=S)
    s.close()
print("DONE stf_a")
