# -*- coding: utf-8 -*-
"""Administrator guide — run B: the new group head forms group 28 (its number given by the platform), joins a cluster, receives pilgrims, works in the field.
Usage: CAP_DIR=admin python adm_b.py <keep>"""
import sys
from cap import Cap, ROOT, truncate

truncate(int(sys.argv[1]))
c = Cap(storage=str(ROOT / "admin" / "state-passed.json")); p = c.page
def btn(text, wait=900, exact=False):
    p.get_by_role("button", name=text, exact=exact).first.click(); c.settle(wait)
def field(label):
    return p.locator(f"label:has-text('{label}') input").first

# ───────── group formation ─────────
S = "F"
c.goto("/administrator/group", wait=1800)
c.shot("group-form", "طلب تشكيل مجموعة: الرقم تلقائي، والسعة تحددها الإدارة عند الاعتماد", section=S)
field("اسم تعريفي").fill("مجموعة الشام"); c.settle(300)
sb = p.locator("button:has-text('إرسال طلب التشكيل')").first
sb.scroll_into_view_if_needed(); c.settle(300)
c.shot("group-submit", "إرسال طلب التشكيل: الفريق يُدعى بعد الاعتماد", hl=[("button:has-text('إرسال طلب التشكيل')", "")], section=S)
sb.click(); c.settle(1500); c.scroll_top()
c.shot("group-fee", "رسم تشكيل المجموعة", section=S)
btn("شام كاش", wait=700)
p.get_by_text("رقم عملية تجريبي").first.click(); c.settle(300)
pay = p.locator("button:has-text('تأكيد الدفع')").first
pay.scroll_into_view_if_needed(); c.settle(200)
pay.click(); c.settle(3200); c.scroll_top()
c.shot("group-fee-receipt", "تم تسديد رسم التشكيل", hl=[("button:has-text('متابعة الاعتماد')", "")], section=S)
btn("متابعة الاعتماد", wait=1500); c.scroll_top()
c.shot("group-pending", "الطلب ينتظر قرار إدارة الإداريين", section=S)
# approved: the team is invited now, one person per role
p.wait_for_selector("text=اعتماد الفريق والانتقال إلى الميثاق", timeout=40000); c.settle(1500); c.scroll_top()
c.shot("group-team", "اعتُمدت المجموعة: ادعُ فريقك كما حددته الإدارة، لكل صفة شخصاً واحداً", section=S)
# as many roles as the head's category gave the group
for i in range(p.locator("button:has-text('تصفّح الناجحين')").count()):
    br = p.locator("button:has-text('تصفّح الناجحين')").first
    br.scroll_into_view_if_needed(); br.click(); c.settle(900)
    if i == 0:
        c.shot("group-browse", "قائمة الناجحين في التأهيل مع زر «دعوة فردية»", section=S)
    p.locator("button:has-text('دعوة فردية')").first.click(); c.settle(700)
    if i == 0:
        c.shot("group-invited", "الدعوة بانتظار موافقة المدعو", section=S)
    c.settle(3200)
ok = p.locator("button:has-text('اعتماد الفريق والانتقال إلى الميثاق')").first
ok.scroll_into_view_if_needed(); c.settle(300)
c.shot("group-team-ok", "وافق المدعوون: اعتماد الفريق", hl=[("button:has-text('اعتماد الفريق والانتقال إلى الميثاق')", "")], section=S)
ok.click(); c.settle(1500)
p.wait_for_selector("text=قرأت الميثاق وأوافق على بنوده.", timeout=20000); c.settle(800); c.scroll_top()
c.shot("group-charter", "اعتُمدت المجموعة: توقيع ميثاق الفريق", section=S)
p.get_by_text("قرأت الميثاق وأوافق على بنوده.").first.click(); c.settle(300)
cv = p.locator("canvas").last
cv.scroll_into_view_if_needed(); c.settle(300)
bb = cv.bounding_box()
x0, y0 = bb["x"] + bb["width"] * 0.25, bb["y"] + bb["height"] * 0.55
p.mouse.move(x0, y0); p.mouse.down()
for k in range(1, 30):
    p.mouse.move(x0 + k * bb["width"] * 0.017, y0 - 18 * ((k % 6) - 3) / 3, steps=2)
p.mouse.up(); c.settle(400)
c.shot("group-charter-signed", "التوقيع باليد على لوحة التوقيع", hl=[("button:has-text('توقيع الميثاق')", "")], section=S)
btn("توقيع الميثاق", wait=3500); c.scroll_top()
c.shot("group-mine", "مجموعتي: المجموعة بعد الاعتماد والتوقيع", section=S)
c.scroll_by(700)
c.shot("group-mine-2", "فريق المجموعة ومهامك قبل الموسم", section=S)
c.save_state(str(ROOT / "admin" / "state-group.json"))

# ───────── cluster: election then join ─────────
S = "G"
c.goto("/administrator/cluster", wait=1800)
c.shot("cluster-wait", "التكتلات: بانتظار إعلان الإدارة فتح الترشيح", section=S)
op = p.locator("button:has-text('محاكاة: الإدارة تفتح الترشيح')").first
op.scroll_into_view_if_needed(); op.click(); c.settle(1500); c.scroll_top()
c.shot("cluster-vote", "الترشح والتصويت لرؤساء التكتلات", section=S)
v = p.locator("button:text-is('صوّت')").first
v.scroll_into_view_if_needed(); v.click(); c.settle(900)
c.shot("cluster-voted", "صوتك لمرشح واحد", section=S)
cl = p.locator("button:has-text('محاكاة: إغلاق التصويت وإعلان النتيجة')").first
cl.scroll_into_view_if_needed(); cl.click(); c.settle(1800); c.scroll_top()
c.shot("cluster-join", "بعد إعلان الرؤساء: اختر تكتلاً لمجموعتك", section=S)
jr = p.locator("button:has-text('طلب الانضمام')").first
jr.scroll_into_view_if_needed(); c.settle(300)
c.shot("cluster-join-card", "بطاقة التكتل وزر «طلب الانضمام»", hl=[("button:has-text('طلب الانضمام')", "")], section=S)
jr.click(); c.settle(1200)
c.shot("cluster-join-pending", "الطلب بانتظار قرار رئيس التكتل", section=S)
ac = p.locator("button:has-text('محاكاة: قبِل')").first
ac.scroll_into_view_if_needed(); ac.click(); c.settle(1500); c.scroll_top()
c.shot("cluster-contract", "قبل رئيس التكتل: عقد المجموعة مع التكتل", section=S)
p.get_by_text("رمز تجريبي").first.click(); c.settle(300)
sg = p.locator("button:has-text('أوقّع العقد إلكترونياً')").first
sg.scroll_into_view_if_needed(); sg.click(); c.settle(2500); c.scroll_top()
c.shot("cluster-member", "مجموعتك الآن ضمن التكتل", section=S)

# ───────── group pilgrims ─────────
S = "H"
c.goto("/administrator/requests", wait=1800)
c.shot("req-list", "حجاج المجموعة: العائلات والتصفية", section=S)
w = p.locator("button:has-text('استلام والترحيب')").first
w.scroll_into_view_if_needed(); c.settle(300)
c.shot("req-family", "بطاقة عائلة وزر «استلام والترحيب»", hl=[("button:has-text('استلام والترحيب')", "")], section=S)
w.click(); c.settle(1200)
c.shot("req-welcomed", "تم الترحيب بالعائلة", section=S)

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
