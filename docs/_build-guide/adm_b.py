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
c.goto("/portal/group", wait=1800)
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
c.goto("/portal/group", wait=1800)
c.shot("group-formed", "شُكّلت مجموعتك في المكتب ووقّعتم عقدها: تراه في «العقود»", section=S)
c.goto("/portal/groups", wait=1800)
c.shot("group-mine", "إدارة المجموعة: مجموعتك وفئتها وسعتها، وفريقها، ومهامك قبل الموسم", section=S)
c.goto("/portal/cluster", wait=1800)
c.shot("cluster-office", "تشكيل التكتلات: يُشكَّل التكتل في المكتب بحضور رئيسه وكل من فيه", section="G")
c.save_state(str(ROOT / "admin" / "state-group.json"))
c.close()

# ───────── a group head in تكتل النور ─────────
c = Cap(); p = c.page
c.goto("/login?demo=all", wait=1500)
p.locator("main button:has-text('أحمد سليمان الحمصي —')").first.click(); c.settle(2500)
c.goto("/portal/groups", wait=1800)
c.shot("group-in-cluster", "مجموعتك في التكتل: فريقها في مقاعدها كما أجلسه المكتب، ومنسقها وموجّهتها", section="G")
# his contracts: his group's and his cluster's, as the employee uploaded them
c.goto("/portal/my-contracts", wait=2000)
c.shot("my-contracts", "العقود: عقد مجموعتك يراه من فيها، وعقد التكتل يراه كل من فيه", hl=[("main button:has-text('فتح العقد') >> nth=0", "")], section="G")
p.locator("main button:has-text('فتح العقد')").first.click(); c.settle(1500)
c.shot("contract-open", "العقد مفتوحاً كبيراً، و«تنزيل» لحفظه", hl=[("[role=dialog] a:has-text('تنزيل')", "")], section="G")
p.keyboard.press("Escape"); c.settle(700)

# ───────── group pilgrims ─────────
S = "H"
c.goto("/portal/requests", wait=1800)
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
c.goto("/portal/field", wait=1800)
c.shot("field-top", "الميدان: الإحصاءات، وتبويبات أداء المناسك والمزارات والسفر", hl=[("[role=tablist]", "")], section=S)
# «أداء المناسك»: a rite is recorded after the group did it — the Umrah of tamattu' first (the first tab)
RITE = lambda name: f"main button[aria-pressed]:has-text('{name}')"
SAVE = "main button:has-text('في سجل أداء المناسك')"
c.scroll_to("main h2:has-text('تسجيل منسك أُدّي')", 120)
c.shot("field-rites", "تسجيل منسك أُدّي: المنسك، ومتى أُدّي ومكانه", hl=[(f"{RITE('الوقوف بعرفة')} >> xpath=..", "1"), ("main input[aria-label='تاريخ الأداء وساعته']", "2")], section=S)
p.locator("main button:has-text('الكل أدّاه')").first.click(); c.settle(500)
done = p.locator("main input[type=checkbox][aria-label$=' أدّاه']")
done.nth(1).uncheck(); done.nth(3).uncheck(); c.settle(500)
why = p.locator("main select[aria-label^='لماذا لم يؤدّه؟']")
why.nth(0).select_option(index=1); why.nth(1).select_option(index=3); c.settle(500)
why.first.scroll_into_view_if_needed(); c.settle(300)
c.shot("field-rites-reason", "من أدّاه ومن لم يؤدّه: لكل من لم يؤدّه سببه", hl=[("main select[aria-label^='لماذا لم يؤدّه؟'] >> nth=0", "")], section=S)
p.locator(SAVE).first.click(); c.settle(4500)  # the toast goes
# the night at Muzdalifah: three degrees for each pilgrim
c.scroll_to("main h2:has-text('تسجيل منسك أُدّي')", 120)
p.locator(RITE("المبيت في مزدلفة")).first.click(); c.settle(600)
p.locator("main button:has-text('الكل حتى الفجر')").first.click(); c.settle(500)
nights = p.locator("main [role=radiogroup][aria-label^='مبيت ']")
nights.nth(1).locator("[role=radio]:has-text('حقق المبيت حتى منتصف الليل')").click(); c.settle(300)
nights.nth(2).locator("[role=radio]:has-text('لم يحقق المبيت')").click(); c.settle(400)
p.locator("main select[aria-label^='لماذا لم يؤدّه؟']").first.select_option(index=1); c.settle(400)
nights.nth(0).scroll_into_view_if_needed(); c.scroll_by(-160)
c.shot("field-rites-muzdalifa", "المبيت في مزدلفة: لم يحقق المبيت، أو حتى منتصف الليل، أو حتى صلاة الفجر", hl=[("main [role=radiogroup][aria-label^='مبيت '] >> nth=1", "")], section=S)
p.locator(SAVE).first.click(); c.settle(4500)
# the record, and one rite of it opened
c.scroll_to("main h3:has-text('سجل أداء المناسك')", 120)
c.shot("field-rites-log", "سجل أداء المناسك: كل منسك بعدد من أدّاه، ومتى أُدّي ومن سجّله", hl=[("main h3:has-text('سجل أداء المناسك') >> xpath=..", "")], section=S)
p.locator("main li > button:has-text('المبيت في مزدلفة')").first.click(); c.settle(1000)
c.shot("field-rites-record", "تفصيل منسك: ما فعله كل حاج، و«سُجّل خطأً؟ احذفه من السجل»", hl=[("[role=dialog] button:has-text('سُجّل خطأً')", "")], section=S)
p.keyboard.press("Escape"); c.settle(600)
# the throwing of the Jamarat: a day, then the stones each one threw (shown, not saved)
c.scroll_to("main h2:has-text('تسجيل منسك أُدّي')", 120)
p.locator(RITE("رمي الجمرات")).first.click(); c.settle(600)
p.locator("main select[aria-label='يوم الرمي']").select_option("11"); c.settle(400)
p.locator("main button:has-text('الكل رمى')").first.click(); c.settle(500)
p.locator("main label:has(input[aria-label$=': الجمرة العقبة'])").nth(1).click(); c.settle(400)
c.scroll_to("main select[aria-label='يوم الرمي']", 160)
c.shot("field-rites-jamarat", "رمي الجمرات: يوم الرمي، والجمرات التي رماها كل حاج", hl=[("main select[aria-label='يوم الرمي']", "")], section=S)
# «المزارات»: a visit recorded the same way, after it — whoever did not go needs no reason
c.scroll_top()
p.get_by_role("tab", name="المزارات").first.click(); c.settle(1000)
p.locator(RITE("مسجد قباء")).first.click(); c.settle(500)
p.locator("main button:has-text('الكل زاره')").first.click(); c.settle(400)
p.locator("main input[type=checkbox][aria-label$=' زاره']").nth(2).uncheck(); c.settle(400)
c.scroll_to("main h2:has-text('تسجيل مزار زارته المجموعة')", 120)
c.shot("field-visits", "المزارات: المزار، ومتى زارته المجموعة، ومن ذهب — دون سبب لمن لم يذهب", hl=[(f"{RITE('مسجد قباء')} >> xpath=..", "1"), ("main button:has-text('في سجل المزارات')", "2")], section=S)
p.locator("main button:has-text('في سجل المزارات')").first.click(); c.settle(4500)
# «السفر»: each leg of the journey, with the reason of whoever was not with the group
c.scroll_top()
p.get_by_role("tab", name="السفر").first.click(); c.settle(1000)
p.locator(RITE("الوصول إلى فندق مكة")).first.click(); c.settle(500)
p.locator("main button:has-text('الكل مع المجموعة')").first.click(); c.settle(400)
p.locator("main input[type=checkbox][aria-label$=' مع المجموعة']").nth(1).uncheck(); c.settle(400)
p.locator("main select[aria-label^='لماذا لم يكن مع المجموعة؟']").first.select_option(index=2); c.settle(400)
c.scroll_to("main h2:has-text('تسجيل محطة من السفر')", 120)
c.shot("field-travel", "السفر: المحطة، ومن كان مع المجموعة فيها، وسبب من لم يكن معها", hl=[(f"{RITE('الوصول إلى فندق مكة')} >> xpath=..", "1"), ("main select[aria-label^='لماذا لم يكن مع المجموعة؟'] >> nth=0", "2")], section=S)
p.locator("main button:has-text('في سجل السفر')").first.click(); c.settle(4500)
c.scroll_to("main h3:has-text('سجل السفر')", 120)
c.shot("field-travel-log", "سجل السفر", hl=[("main h3:has-text('سجل السفر') >> xpath=..", "")], section=S)

# The group's day, each a page of its own in the menu: its channel, a report to the operations room, his day
c.goto("/portal/group-channel", wait=1800)
c.shot("field-channel", "قناة المجموعة: إعلان جديد للحجاج", hl=[("aside nav a[href='/portal/group-channel']", "")], section=S)
p.locator("textarea").first.fill("تذكير: الدرس اليومي الساعة 20:30 في قاعة الطابق (م) مع الشيخ خالد.")
c.settle(400)
c.shot("field-channel-write", "كتابة الإعلان واختيار الفئة ثم النشر", hl=[("button:has-text('نشر إلى')", "")], section=S)
p.locator("button:has-text('نشر إلى')").first.click(); c.settle(1400)
c.scroll_top()
c.shot("field-channel-sent", "نُشر الإعلان في قناة المجموعة", section=S)
c.goto("/portal/report", wait=1800)
c.shot("field-report", "بلاغ إلى غرفة العمليات", hl=[("aside nav a[href='/portal/report']", "")], section=S)
c.goto("/portal/my-day", wait=1800)
c.shot("field-daily", "يومي والتقرير اليومي", hl=[("aside nav a[href='/portal/my-day']", "")], section=S)
b = p.locator("button:has-text('إرسال التقرير إلى رئيس التكتل')").first
if b.count():
    b.scroll_into_view_if_needed(); b.click(); c.settle(1200)
    c.shot("field-daily-sent", "أُرسل التقرير اليومي", section=S)

# ───────── dashboard end ─────────
S = "C"
c.goto("/portal", wait=1800)
c.shot("dash-done", "ملفي بعد إتمام محطات الرحلة", section=S)
c.save_state(str(ROOT / "admin" / "state-field.json"))
c.close()
print("DONE adm_b")
