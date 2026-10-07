# -*- coding: utf-8 -*-
"""Administrator guide — run B: the new group head (مروان الحلبي, passed) has his group formed at the office; then a
group head whose group is in تكتل النور (أحمد سليمان الحمصي) receives its pilgrims and works in the field.
Usage: CAP_DIR=admin python adm_b.py <keep>"""
import sys
from cap import Cap, ROOT, truncate

truncate(int(sys.argv[1]))
c = Cap(storage=str(ROOT / "admin" / "state-passed.json")); p = c.page
def btn(text, wait=900, exact=False):
    p.get_by_role("button", name=text, exact=exact).first.click(); c.settle(wait)
def jump():
    """«جرّبها الآن»: the demo's date moves to the operation's first day and hour"""
    j = p.locator("main button:has-text('جرّبها الآن')")
    if j.count():
        j.first.click(); c.settle(1500)

# ───────── forming the group at the office ─────────
S = "F"
c.goto("/administrator/group", wait=1800)
jump()
c.shot("group-form", "تشكيل المجموعات: تراجع المكتب باسم مجموعتك ورسمها، فيشكّلها الموظف بفئتك", hl=[("button:has-text('محاكاة: راجعتُ المكتب')", "")], section=S)
btn("محاكاة: راجعتُ المكتب فشكّل الموظف مجموعتي", 1800)
c.shot("group-pending", "شُكّلت مجموعتك: من شكّلها، وفئتها، وعدد حجاجها", section=S)
c.goto("/administrator/groups", wait=1800)
c.shot("group-mine", "إدارة المجموعة: مجموعتك، وفريقها الذي يملأ مقاعده رئيس التكتل، ومهامك قبل الموسم", section=S)
c.save_state(str(ROOT / "admin" / "state-group.json"))
c.close()

# ───────── a group head in تكتل النور ─────────
c = Cap(); p = c.page
c.goto("/administrator/login?demo=all", wait=1500)
p.locator("main button:has-text('أحمد سليمان الحمصي —')").first.click(); c.settle(2500)
c.goto("/administrator/cluster", wait=1800)
jump()
c.shot("cluster-member", "دعوة تكتل النور لمجموعتك: قبلتها فدخلت التكتل بحجاجها", section="G")
c.goto("/administrator/groups", wait=1800)
c.shot("group-in-cluster", "مجموعتك في التكتل: فريقها في مقاعدها كما ملأها رئيس التكتل", section="G")

# ───────── group pilgrims ─────────
S = "H"
c.goto("/administrator/requests", wait=1800)
jump()
c.shot("req-list", "حجاج المجموعة: العائلات والتصفية", section=S)
w = p.locator("button:has-text('استلام والترحيب')").first
w.scroll_into_view_if_needed(); c.settle(300)
c.shot("req-family", "بطاقة عائلة وزر «استلام والترحيب»", hl=[("button:has-text('استلام والترحيب')", "")], section=S)
w.click(); c.settle(1200)
c.shot("req-welcomed", "تم الترحيب بالعائلة", section=S)
c.settle(4500)  # let the welcome toast go
p.locator("main article li button").first.click(); c.settle(1200)
c.shot("req-person", "ملف الحاج: بياناته والتواصل، وأين وصل، ووثائقه وملفه الصحي وسكنه، وآخر ما جرى", section=S)
p.get_by_role("button", name="إغلاق").last.click(); c.settle(600)

# ───────── field ─────────
S = "I"
c.goto("/administrator/field", wait=1800)
c.shot("field-top", "الميدان: الإحصاءات والتبويبات", section=S)
c.scroll_to("text=فتح تجمّع جديد", 140)
c.shot("field-muster-new", "فتح تجمّع جديد", section=S)
p.locator("button:has-text('فتح التجمّع')").first.click(); c.settle(1200)
b2 = p.locator("button:has-text('بدء مسح البطاقات')").first
b2.scroll_into_view_if_needed(); c.settle(300)
c.shot("field-muster-open", "التجمّع مفتوح: ابدأ مسح البطاقات", hl=[("button:has-text('بدء مسح البطاقات')", "")], section=S)
b2.click(); c.settle(6000)
c.shot("field-muster-scan", "مسح البطاقات: الحاضرون والغائب", section=S)
sim = p.locator("button:has-text('محاكاة: وصل')").first
if sim.count():
    sim.scroll_into_view_if_needed(); c.settle(300)
    c.shot("field-muster-absent", "حاج متأخر: اتصال أو تنبيه أو إبلاغ", section=S)
    sim.click(); c.settle(1500)
clo = p.locator("button:has-text('إغلاق التجمّع')").first
clo.scroll_into_view_if_needed(); c.settle(300)
c.shot("field-muster-complete", "اكتمل الحضور: أغلق التجمّع وأرسل «انطلقنا»", hl=[("button:has-text('إغلاق التجمّع')", "")], section=S)
clo.click(); c.settle(1800)
c.shot("field-muster-closed", "أُغلق التجمّع وسُجّل في سجل التجمّعات", section=S)
tabs = ["قناة المجموعة", "الحجاج", "بلاغ لغرفة العمليات", "يومي", "تقييماتي"]
for t in tabs:
    c.scroll_top()
    p.get_by_role("tab", name=t).first.click(); c.settle(1200)
    c.scroll_to("[role=tablist]", 110)
    if t == "قناة المجموعة":
        c.shot("field-channel", "قناة المجموعة: إعلان جديد للحجاج", section=S)
        p.locator("textarea").first.fill("تذكير: الدرس اليومي الساعة 20:30 في قاعة الطابق (م) مع الشيخ خالد.")
        c.settle(400)
        c.shot("field-channel-write", "كتابة الإعلان واختيار الفئة ثم النشر", hl=[("button:has-text('نشر إلى')", "")], section=S)
        p.locator("button:has-text('نشر إلى')").first.click(); c.settle(1400)
        c.scroll_to("[role=tablist]", 110)
        c.shot("field-channel-sent", "نُشر الإعلان في قناة المجموعة", section=S)
    elif t == "الحجاج":
        c.shot("field-pilgrims", "قائمة حجاج المجموعة مع البحث", section=S)
    elif t == "بلاغ لغرفة العمليات":
        c.shot("field-report", "بلاغ إلى غرفة العمليات", section=S)
    elif t == "يومي":
        c.shot("field-daily", "يومي والتقرير اليومي", section=S)
        b = p.locator("button:has-text('إرسال التقرير بضغطة زر')").first
        if b.count():
            b.scroll_into_view_if_needed(); b.click(); c.settle(1200)
            c.shot("field-daily-sent", "أُرسل التقرير اليومي", section=S)
    else:
        c.shot("field-ratings", "تقييماتي ودرجة الأداء", section=S)

# ───────── dashboard end ─────────
S = "C"
c.goto("/administrator/dashboard", wait=1800)
c.shot("dash-done", "ملفي بعد إتمام محطات الرحلة", section=S)
c.save_state(str(ROOT / "admin" / "state-field.json"))
c.close()
print("DONE adm_b")
