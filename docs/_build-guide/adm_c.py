# -*- coding: utf-8 -*-
"""Administrator guide — run C: the other roles through their ready demo accounts (one clean browser each).
Usage: CAP_DIR=admin python adm_c.py <keep> [part]"""
import sys
from cap import Cap, ROOT, truncate

truncate(int(sys.argv[1]))
ONLY = sys.argv[2] if len(sys.argv) > 2 else None

NAMES = {"01033300881": "عبد الرحمن العلي", "01033300882": "نبيل الساعاتي", "01033300883": "بسام درويش", "01033300884": "وليد القصاب",
         "01033300871": "أحمد سليمان الحمصي", "01033300872": "ياسر عبد الله", "01033300873": "الشيخ خالد الرفاعي", "01033300874": "سامر نبيل نجار"}
def session(demo_id, path="/administrator/dashboard"):
    c = Cap(); p = c.page
    c.goto("/administrator/login", wait=1500)
    card = p.locator(f"main button:has-text('{NAMES[demo_id]} —')").first
    card.scroll_into_view_if_needed(); card.click(); c.settle(2500)
    if path: c.goto(path, wait=1800)
    return c, p

def btn(p, c, text, wait=900):
    b = p.get_by_role("button", name=text).first
    b.scroll_into_view_if_needed(); b.click(); c.settle(wait)

# ───────── returning administrator: keep the role ─────────
if ONLY in (None, "ret"):
    c = Cap(); p = c.page
    c.goto("/administrator/login", wait=1500)
    p.locator("main button:has-text('نبيل الساعاتي —')").first.scroll_into_view_if_needed(); c.settle(400)
    c.shot("quick-login", "الدخول الفوري بحساب تجريبي من صفحة الدخول", hl=[("main button:has-text('نبيل الساعاتي —')", "")], section="B")
    p.locator("main button:has-text('نبيل الساعاتي —')").first.click(); c.settle(2500)
    c.goto("/administrator/apply", wait=1800)
    c.shot("ret-docs", "إداري عائد: ملفه الدائم أول الطلب، ووثيقة منتهية الصلاحية تحتاج تحديثاً", section="D")
    up = p.locator("button:has-text('حدّثها الآن')")
    if up.count():
        up.first.scroll_into_view_if_needed(); c.settle(300)
        c.shot("ret-docs-expired", "زر «حدّثها الآن» للوثيقة المنتهية", hl=[("button:has-text('حدّثها الآن')", "")], section="D")
        up.first.click(); c.settle(2600)
    btn(p, c, "التالي", 1200); btn(p, c, "التالي", 1200); c.scroll_top()
    c.shot("ret-role", "إداري عائد: آخر موسم شارك فيه وخيار الاستمرار في الصفة نفسها", section="D")
    p.locator("button[aria-pressed]").first.click(); c.settle(600)
    c.scroll_to("text=الاستمرار في الصفة نفسها", 150)
    c.shot("ret-role-keep", "الاستمرار في الصفة نفسها: معفى من الامتحانين", section="D")
    c.close()
    c, p = session("01033300884", "/administrator/apply")
    up = p.locator("button:has-text('حدّثها الآن')")
    if up.count():
        up.first.click(); c.settle(2600)
    btn(p, c, "التالي", 1200); btn(p, c, "التالي", 1200)
    c.scroll_to("text=الاستمرار في الصفة نفسها", 150)
    c.shot("ret-role-unavailable", "تقييم الموسم السابق دون الحد: الاستمرار غير متاح والتقدم بالامتحانين", section="D")
    c.close()

# ───────── cluster head ─────────
if ONLY in (None, "head"):
    c, p = session("01033300881")
    S = "J"
    c.shot("head-dash", "رئيس التكتل: ملفي والصفة بالانتخاب", section=S)
    c.goto("/administrator/group", wait=1800)
    c.shot("head-groups", "مجموعات تكتلي: كل مجموعات التكتل", section=S)
    row = p.locator("button:has-text('المجموعة')").nth(1)
    try:
        row.click(); c.settle(900)
        c.shot("head-groups-open", "تفاصيل مجموعة داخل التكتل", section=S)
    except Exception:
        pass
    c.goto("/administrator/cluster", wait=1800)
    c.shot("head-cluster", "إدارة التكتل: بطاقة التكتل وطلبات الانضمام", section=S)
    c.scroll_to("text=طلبات الانضمام إلى تكتلك", 130)
    c.shot("head-requests", "طلبات انضمام المجموعات: قبول أو رفض", section=S)
    p.locator("button:text-is('قبول')").first.click(); c.settle(1200)
    c.shot("head-accepted", "بعد قبول طلب مجموعة", section=S)
    rj = p.locator("button:text-is('رفض')").first
    rj.scroll_into_view_if_needed(); rj.click(); c.settle(900)
    c.shot("head-reject", "رفض طلب مع ذكر السبب", section=S)
    p.locator("[role=dialog] button, [role=dialog] label").filter(has_text="السعة").first.click() if p.locator("[role=dialog] :text('السعة')").count() else None
    c.settle(300)
    btn(p, c, "تأكيد الرفض", 1200)
    c.scroll_to("text=في دليل الخدمات", 130)
    c.shot("head-profile", "صفحة التكتل العامة في دليل الخدمات: التعديل", section=S)
    ta = p.locator("textarea").first
    if ta.count():
        ta.fill(ta.input_value() + " ونوفّر حافلة خاصة لكبار السن إلى الحرم.")
        c.settle(300)
    note = p.locator("input[placeholder*='ملاحظة'], textarea[placeholder*='ملاحظة']").first
    sb = p.locator("button:has-text('أرسل للاعتماد')").first
    sb.scroll_into_view_if_needed(); c.settle(300)
    c.shot("head-profile-send", "إرسال التعديل لاعتماد الإدارة", hl=[("button:has-text('أرسل للاعتماد')", "")], section=S)
    sb.click(); c.settle(1500)
    c.shot("head-profile-pending", "تعديلك عند الإدارة للاعتماد", section=S)
    c.save_state(str(ROOT / "admin" / "state-head-profile.json"))
    c.close()

# ───────── cluster deputy ─────────
if ONLY in (None, "deputy"):
    c, p = session("01033300883")
    S = "K"
    c.shot("cdep-dash", "معاون رئيس التكتل: ملفي", section=S)
    c.goto("/administrator/cluster", wait=1800)
    c.shot("cdep-cluster", "معلومات التكتل للمعاون (عرض)", section=S)
    c.goto("/administrator/group", wait=1800)
    c.shot("cdep-groups", "مجموعات التكتل كما يراها المعاون", section=S)
    c.close()

# ───────── technical coordinator ─────────
if ONLY in (None, "tech"):
    c, p = session("01033300874")
    S = "L"
    c.shot("tech-dash", "المنسق التقني: ملفي", section=S)
    c.goto("/administrator/pilgrims", wait=1800)
    c.shot("tech-reg", "تسجيل الحجاج: البحث عن المواطن في الشؤون المدنية", section=S)
    p.locator("label:has-text('الرقم الوطني') input").first.fill("01012340078"); c.settle(200)
    btn(p, c, "بحث", 2500)
    c.shot("tech-reg-found", "بيانات المواطن وطلب موافقته", section=S)
    c.otp("1448")
    c.scroll_to("text=رمز الموافقة", 250)
    c.shot("tech-reg-otp", "إدخال رمز موافقة المواطن", hl=[("button:has-text('تأكيد الموافقة ومتابعة')", "")], section=S)
    btn(p, c, "تأكيد الموافقة ومتابعة", 1500); c.scroll_top()
    c.shot("tech-reg-members", "من سيحج مع المواطن؟", section=S)
    btn(p, c, "افحص الأهلية", 1500)
    p.wait_for_timeout(6000); c.scroll_top()
    c.shot("tech-reg-elig", "فحص الأهلية", section=S)
    c.close()
    # the full coordinator registration is long; the rest is shown with the family already filed by سامر
    c, p = session("01033300874", "/administrator/pilgrims")
    det = p.locator("text=عرض التفاصيل").first
    if det.count():
        det.click(); c.settle(1800); c.scroll_top()
        c.shot("tech-detail", "تفاصيل طلب سجّله المنسق", section=S)
    c.goto("/administrator/requests", wait=1800)
    c.shot("tech-requests", "حجاج المجموعة عند المنسق التقني", section=S)
    pan = p.locator("text=تسجيل حاج في مجموعتي").first
    if pan.count():
        pan.scroll_into_view_if_needed(); c.settle(400)
        c.shot("tech-enroll", "تسجيل حاج في مجموعتي (بعد اتفاقه مع المنسق)", section=S)
    c.close()

# ───────── group deputy + religious guide ─────────
if ONLY in (None, "members"):
    for demo, key, cap in [("01033300872", "gdep", "معاون رئيس المجموعة"), ("01033300873", "guide", "الموجّه الديني")]:
        c, p = session(demo)
        S = "M"
        c.shot(f"{key}-dash", f"{cap}: ملفي", section=S)
        c.goto("/administrator/requests", wait=1800)
        c.shot(f"{key}-requests", f"{cap}: حجاج المجموعة", section=S)
        c.goto("/administrator/field", wait=1800)
        c.shot(f"{key}-field", f"{cap}: الميدان", section=S)
        c.close()
print("DONE adm_c")
