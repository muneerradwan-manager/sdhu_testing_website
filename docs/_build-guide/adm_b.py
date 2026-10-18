# -*- coding: utf-8 -*-
"""Administrator guide — run B: the new group head (مروان الحلبي, passed) has his group formed at the office — the
employee forms it from the staff portal in the same browser, as at the office; then a group head whose group is in
تكتل النور (أحمد سليمان الحمصي) sees his contracts, receives its pilgrims and works in the field.
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
CONTRACTS = ROOT.parent.parent / "public" / "images" / "contracts"
c.goto("/administrator/group", wait=1800)
c.shot("group-office", "تشكيل المجموعات: تُشكَّل المجموعة في المكتب بحضور رئيسها وفريقها", section=S)
# At the office: the employee (مازن الحلبي) forms it from the staff portal — his guide shows these screens
c.goto("/staff/login", wait=1500)
p.locator("label:has-text('اسم المستخدم') input").first.fill("mazen")
p.locator("label:has-text('كلمة المرور') input").first.fill("1448")
p.locator("main button:text-is('دخول')").first.click(); c.settle(3000)
c.goto("/staff/admins/manage/groups", wait=2000)
p.locator("main button:has-text('تشكيل مجموعة')").first.click(); c.settle(1200)
dlg = p.locator("[role=dialog]").last
j = dlg.locator("button:has-text('جرّبها الآن')")
if j.count():
    j.first.click(); c.settle(1800)
    dlg = p.locator("[role=dialog]").last
head = dlg.locator("select").first
head.select_option(value=head.locator("option", has_text="مروان").first.get_attribute("value")); c.settle(800)
cat = dlg.locator("select").nth(1)
if not cat.input_value():
    cat.select_option(index=2); c.settle(600)
for lab in ["الموجّه الديني", "المعاون"]:
    seats = dlg.locator(f"select[aria-label='{lab}']")
    for i in range(seats.count()):
        if seats.nth(i).locator("option").count() > 1:
            seats.nth(i).select_option(index=1); c.settle(400)
dlg.locator("label:has-text('سدّد رسم التشكيل') input").first.check(); c.settle(300)
dlg.locator("input[type=file][aria-label='عقد المجموعة']").set_input_files(str(CONTRACTS / "group-contract.svg")); c.settle(1800)
dlg.locator("label:has-text('وقّع العقدَ') input").first.check(); c.settle(300)
dlg.locator("button:has-text('تشكيل مجموعة')").last.click(); c.settle(2000)
# back in his portal
c.goto("/administrator/group", wait=1800)
c.shot("group-formed", "شُكّلت مجموعتك في المكتب ووقّعتم عقدها: تراه في «العقود»", section=S)
c.goto("/administrator/groups", wait=1800)
c.shot("group-mine", "إدارة المجموعة: مجموعتك وفئتها وسعتها، وفريقها، ومهامك قبل الموسم", section=S)
c.goto("/administrator/cluster", wait=1800)
c.shot("cluster-office", "تشكيل التكتلات: يُشكَّل التكتل في المكتب بحضور رئيسه وكل من فيه", section="G")
c.save_state(str(ROOT / "admin" / "state-group.json"))
c.close()

# ───────── a group head in تكتل النور ─────────
c = Cap(); p = c.page
c.goto("/administrator/login?demo=all", wait=1500)
p.locator("main button:has-text('أحمد سليمان الحمصي —')").first.click(); c.settle(2500)
c.goto("/administrator/groups", wait=1800)
c.shot("group-in-cluster", "مجموعتك في التكتل: فريقها في مقاعدها كما أجلسه المكتب، ومنسقها وموجّهتها", section="G")
# his contracts: his group's and his cluster's, as the employee uploaded them
c.goto("/administrator/my-contracts", wait=2000)
c.shot("my-contracts", "العقود: عقد مجموعتك يراه من فيها، وعقد التكتل يراه كل من فيه", hl=[("main button:has-text('فتح العقد') >> nth=0", "")], section="G")
p.locator("main button:has-text('فتح العقد')").first.click(); c.settle(1500)
c.shot("contract-open", "العقد مفتوحاً كبيراً، و«تنزيل» لحفظه", hl=[("[role=dialog] a:has-text('تنزيل')", "")], section="G")
p.keyboard.press("Escape"); c.settle(700)

# ───────── group pilgrims ─────────
S = "H"
c.goto("/administrator/requests", wait=1800)
jump()
c.shot("req-list", "حجاج المجموعة: عددهم من سعتها، ولوحة يُفتح منها ملف كل حاج", section=S)
c.scroll_to("main h3:has-text('كل حجاج')", 120)
c.shot("req-all", "كل حجاج المجموعة بأسمائهم: البحث والتصفية، ويُفتح ملف كل حاج بالضغط عليه", section=S)
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
# no cards: the group's list, each one ticked as he comes (the Umrah of tamattu' is a required muster)
everyone = p.locator("button:has-text('الكل حاضر')").first
everyone.scroll_into_view_if_needed(); c.settle(300)
c.shot("field-muster-open", "التجمّع مفتوح: قائمة حجاج المجموعة، وتحدّد كل من حضر", hl=[("button:has-text('الكل حاضر')", "")], section=S)
everyone.click(); c.settle(600)
boxes = p.locator("main li input[type=checkbox]")
boxes.nth(1).uncheck(); boxes.nth(3).uncheck(); c.settle(500)
c.shot("field-muster-scan", "الحاضرون ومن لم يحضر", section=S)
clo = p.locator("button:has-text('إغلاق التجمّع')").first
clo.scroll_into_view_if_needed(); clo.click(); c.settle(600)
reasons = p.locator("main li select")
reasons.first.scroll_into_view_if_needed(); c.settle(300)
c.shot("field-muster-absent", "تجمّع ضروري: سبب غياب كل من لم يحضر قبل الإغلاق", hl=[("main li select >> nth=0", "")], section=S)
reasons.nth(0).select_option(index=1); reasons.nth(1).select_option(index=2); c.settle(500)
clo.scroll_into_view_if_needed(); c.settle(300)
c.shot("field-muster-complete", "لكل من لم يحضر سببه: أغلق التجمّع وأرسل «انطلقنا»", hl=[("button:has-text('إغلاق التجمّع')", "")], section=S)
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
