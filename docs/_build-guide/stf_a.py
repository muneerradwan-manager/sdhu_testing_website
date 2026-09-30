# -*- coding: utf-8 -*-
"""Staff guide — run A: login/logout, dashboard, my files, locked page, reviews, season settings, lottery.
Usage: CAP_DIR=staff python stf_a.py <keep> [part]"""
import sys
from cap import Cap, ROOT, truncate

truncate(int(sys.argv[1]))
ONLY = sys.argv[2] if len(sys.argv) > 2 else None

class Staff:
    def __init__(self, storage=None):
        self.c = Cap(storage=storage); self.p = self.c.page
    def login(self, user, shots=False, S="A"):
        c, p = self.c, self.p
        c.goto("/staff", wait=1500)
        p.locator("label:has-text('اسم المستخدم') input").first.fill(user)
        p.locator("label:has-text('كلمة المرور') input").first.fill("1448"); c.settle(300)
        if shots:
            c.shot("login-filled", "إدخال اسم المستخدم وكلمة المرور", hl=[("button[type=submit]:has-text('دخول'), main button:text-is('دخول')", "")], section=S)
        p.locator("main button:text-is('دخول')").first.click(); c.settle(2500)
        p.wait_for_url("**/staff/dashboard**", timeout=20000); c.settle(1500)
    def logout(self):
        b = self.p.locator("button:has-text('تسجيل الخروج')").filter(visible=True).first
        b.scroll_into_view_if_needed(); b.click(); self.c.settle(1500)
    def btn(self, text, wait=900, scope="main"):
        b = self.p.locator(f"{scope} button:has-text('{text}')").filter(visible=True).first
        b.scroll_into_view_if_needed(); b.click(); self.c.settle(wait)
    def tab(self, name, wait=900):
        self.p.get_by_role("tab", name=name).first.click(); self.c.settle(wait)
    def close(self):
        self.c.close()

# ───────── A. login, dashboard, my files, locked page ─────────
if ONLY in (None, "a"):
    s = Staff(); c, p = s.c, s.p; S = "A"
    c.goto("/staff", wait=1600)
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
    s.logout()
    c.shot("logout", "بعد تسجيل الخروج تعود صفحة الدخول", section=S)
    s.close()
    s = Staff(); c, p = s.c, s.p
    s.login("wissam")
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

# ───────── D. lottery (import → approve) ─────────
if ONLY in (None, "d"):
    s = Staff(); c, p = s.c, s.p; S = "D"
    s.login("rana")
    c.goto("/staff/lottery", wait=1800)
    c.shot("lot-top", "القبول والقرعة: أربع خطوات", section=S)
    s.btn("إرسال للاعتماد", 1200)
    c.shot("lot-sent", "إرسال الأعمار المقبولة للاعتماد (صلاحية الاستيراد)", section=S)
    b = p.locator("button:has-text('تصدير قائمة طلبات القرعة المؤهلة')").first
    b.scroll_into_view_if_needed(); b.click(); c.settle(2500)
    c.shot("lot-export", "تصدير قائمة طلبات القرعة المؤهلة", section=S)
    smp = p.locator("button:has-text('استخدم الملف التجريبي')").first
    smp.scroll_into_view_if_needed(); c.settle(300)
    c.shot("lot-import", "استيراد ملف نتائج القرعة المعتمد", section=S)
    smp.click(); c.settle(4500)
    c.shot("lot-check", "فحص الملف: صفوف لم تُطابق", section=S)
    for _ in range(10):
        w = p.locator("button[aria-label='تعبئة الاقتراح']").first
        if not w.count(): break
        w.scroll_into_view_if_needed(); w.click(); c.settle(250)
        fx = p.locator("button:text-is('تصحيح')").first
        if fx.count(): fx.click(); c.settle(350)
    sv = p.locator("button:has-text('حفظ الاستيراد')").first
    sv.scroll_into_view_if_needed(); c.settle(300)
    c.shot("lot-fixed", "تصحيح كل صف بسبب واضح ثم حفظ الاستيراد", hl=[("button:has-text('حفظ الاستيراد')", "")], section=S)
    sv.click(); c.settle(1500)
    c.scroll_to("text=4. الاعتماد والنشر", 520)
    c.shot("lot-locked-publish", "النشر يحتاج صلاحية الاعتماد", section=S)
    s.logout(); s.login("suha")
    c.goto("/staff/lottery", wait=1800)
    ap = p.locator("button:has-text('اعتماد وإعلان الأعمار')").first
    ap.scroll_into_view_if_needed(); c.settle(300)
    c.shot("lot-approve-ages", "مديرة الموسم: اعتماد وإعلان الأعمار", hl=[("button:has-text('اعتماد وإعلان الأعمار')", "")], section=S)
    ap.click(); c.settle(1500)
    pub = p.locator("button:has-text('اعتماد ونشر النتائج')").first
    pub.scroll_into_view_if_needed(); pub.click(); c.settle(900)
    c.shot("lot-publish-modal", "تأكيد اعتماد ونشر نتائج القرعة", section=S)
    p.locator("[role=dialog] button:has-text('اعتماد ونشر'), div button:text-is('اعتماد ونشر')").first.click(); c.settle(2000)
    c.scroll_to("text=4. الاعتماد والنشر", 520)
    c.shot("lot-published", "نُشرت النتائج", section=S)
    s.close()
print("DONE stf_a")
