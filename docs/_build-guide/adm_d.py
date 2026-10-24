# -*- coding: utf-8 -*-
"""Administrator guide — run D: القوائم. Its first tab «الطيران»: the technical coordinator (سامر نبيل نجار) puts group 27
on his cluster's days (outbound and return at once) and one of its pilgrims alone on the Latakia return; then the
lists before the rites — a bus filled from its checkbox panel, the Rawdah's lists of the men and the women. The
cluster's head follows them (view only), the group head sees his group's flights.
Then the coordinator's visas (a family the pilgrims' portal attached), the guides' religious lessons and activities.
Usage: CAP_DIR=admin python adm_d.py <keep>"""
import sys
from cap import Cap, truncate

truncate(int(sys.argv[1]))
c = Cap(); p = c.page
S = "N"
DLG = "[role=dialog]"
DAY = lambda no: f"main [data-day='{no}']"
NAV_LISTS = "nav a[href*='/portal/lists']"
TAB = lambda name: f"main [role=tab]:has-text('{name}')"
UNIT = lambda label: f"main [data-unit='{label}']"
VIEW_ONLY = "main p:has-text('للاطلاع فقط')"

def admin(name, path="/portal/lists"):
    c.goto("/login?demo=all", wait=1500)
    card = p.locator(f"main button:has-text('{name} —')").first
    card.scroll_into_view_if_needed(); card.click(); c.settle(2500)
    c.goto(path, wait=2200)

# ───────── the technical coordinator: «القوائم» opens on «الطيران» — the cluster's days, his groups, a pilgrim alone ─────────
admin("سامر نبيل نجار")
c.shot("cfl-top", "القوائم ← الطيران: رحلات مجموعات المنسق، وكيف تعمل الأيام والإسناد", hl=[(NAV_LISTS, "1"), (TAB("الطيران"), "2")], section=S)
c.scroll_to("text=أيام رحلات التكتل", 110)
c.shot("cfl-days", "أيام رحلات التكتل: الذهاب والعودة، ومقاعد التكتل على كل رحلة", hl=[(DAY("RB 507"), "")], section=S)

# One button on each day, «إضافة مسافرين»: the groups as tabs, «الكل» for a whole group (put on the flight as a group)
b = p.locator(f"{DAY('RB 507')} button:has-text('إضافة مسافرين')").first
b.scroll_into_view_if_needed(); b.click(); c.settle(1000)
p.locator(f"{DLG} [role=tab]:has-text('مجموعة اللطيف')").first.click(); c.settle(500)
p.locator(f"{DLG} label:has-text('الكل في') input").first.check(); c.settle(500)
c.shot("cfl-assign", "إضافة مسافرين: المجموعات تبويبات، و«الكل» يأخذ المجموعة كاملة، وعودتها مختارة سلفاً", hl=[(f"{DLG} [role=tablist]", "1"), (f"{DLG} label:has-text('الكل في')", "2"), (f"{DLG} select", "3")], section=S)
p.locator(f"{DLG} button:has-text('إضافة إلى الرحلة')").last.click(); c.settle(1600)

# …or some of a group: whoever travels apart, moved from his group's flight
b = p.locator(f"{DAY('RB 538')} button:has-text('إضافة مسافرين')").first
b.scroll_into_view_if_needed(); b.click(); c.settle(1000)
p.locator(f"{DLG} [role=tab]:has-text('مجموعة اللطيف')").first.click(); c.settle(500)
p.locator(f"{DLG} label:not(:has-text('الكل في')) input[type=checkbox]:not([disabled])").first.check(); c.settle(400)
c.shot("cfl-pilgrims", "إضافة مسافرين فرادى: تعلّم من يسافر وحده، فيُنقل من رحلة مجموعته", hl=[(f"{DLG} label:has(input:checked) >> nth=0", "1"), (f"{DLG} button:has-text('إضافة إلى الرحلة')", "2")], section=S)
p.locator(f"{DLG} button:has-text('إضافة إلى الرحلة')").last.click(); c.settle(1600)
c.scroll_to(DAY("RB 538"), 160)
c.shot("cfl-apart", "على الرحلة فرادى خارج رحلة مجموعتهم، ولكل مجموعة وفرد زر الإزالة", hl=[(f"{DAY('RB 538')} div:has-text('فرادى خارج رحلة مجموعتهم') >> nth=-1", "")], section=S)
c.scroll_to("text=مجموعاتي ورحلاتها", 110)
c.shot("cfl-table", "مجموعاتي ورحلاتها ذهاباً وعودة", hl=[("main tr:has-text('مجموعة اللطيف')", "")], section=S)

# ───────── the lists before the rites: a bus filled from its checkbox panel, then the Rawdah ─────────
c.scroll_top()
p.locator(TAB("التروية")).first.click(); c.settle(1500)
c.shot("lists-page", "قائمة التروية: أرقامها وطباعتها، وحافلات التكتل بمن عليها", hl=[(TAB("التروية"), "1"), ("main button:has-text('طباعة قائمة')", "2")], section=S)
bus = p.locator("main [data-unit]").first
label = bus.get_attribute("data-unit")
def fill_from_picker(confirm):
    """The picker of «القوائم»: «الكل» in the first group, then untick down to the seats left"""
    p.locator(f"{DLG} label:has-text('الكل في') input").first.check(); c.settle(400)
    btn = p.locator(f"{DLG} button:has-text('{confirm}')").last
    boxes = p.locator(f"{DLG} label:not(:has-text('الكل في')) input[type=checkbox]:checked")
    while not btn.is_enabled() and boxes.count():
        boxes.last.uncheck(); c.settle(40)
    return btn
bus.locator("button:has-text('أضف إلى')").click(); c.settle(900)
add = fill_from_picker(f"أضف إلى {label}")
c.shot("lists-add", "أضف إلى الحافلة: المجموعات تبويبات، «الكل» ثم إزالة من لا يذهب", hl=[(f"{DLG} [role=tablist]", "1"), (f"{DLG} label:has-text('الكل في')", "2")], section=S)
add.click(); c.settle(1600)
c.scroll_to(UNIT(label), 120)
c.shot("lists-bus", "الحافلة بركابها: × لإزالة أحدهم، ورمز الطابعة يطبعها وحدها", hl=[(f"{UNIT(label)} button[aria-label^='طباعة']", "")], section=S)
c.settle(3000)  # the toast goes
c.scroll_top()
p.locator(TAB("حجز الروضة الشريفة")).first.click(); c.settle(1500)
for g in ["الروضة الشريفة — الرجال", "الروضة الشريفة — النساء"]:
    u = p.locator(UNIT(g)).first
    if u.count() and u.locator("button:has-text('أضف إلى')").count():
        u.locator("button:has-text('أضف إلى')").click(); c.settle(800)
        fill_from_picker(f"أضف إلى {g}").click(); c.settle(1500)
c.settle(3000)
c.scroll_to("main [data-unit] >> nth=0", 220)
c.shot("lists-rawdah", "حجز الروضة الشريفة: قائمة للرجال وقائمة للنساء، بلا حافلات ولا حد للمقاعد", hl=[(UNIT("الروضة الشريفة — الرجال"), "")], section=S)

# ───────── the cluster's head follows them, and does none ─────────
admin("عبد الرحمن العلي")
c.shot("cfl-viewonly", "رئيس التكتل في «الطيران»: رحلات مجموعات التكتل كلها للاطلاع", hl=[(VIEW_ONLY, "")], section=S)
p.locator(TAB("التروية")).first.click(); c.settle(1500)
c.shot("lists-viewonly", "رئيس التكتل في القوائم: للاطلاع فقط، دون «أضف إلى» ولا إزالة", hl=[(VIEW_ONLY, "")], section=S)

# ───────── group head: his group's two flights and its list for the airport ─────────
admin("أحمد سليمان الحمصي")
c.shot("gfl-top", "رحلات المجموعة: رحلة الذهاب ورحلة العودة", hl=[(NAV_LISTS, "")], section=S)
c.scroll_to("text=كشف المجموعة", 110)
c.shot("gfl-list", "كشف المجموعة: رحلة كل فرد وحالته", hl=[("main button:has-text('طباعة')", "")], section=S)

# ───────── the coordinator's visas: يوسف القطان's family in مجموعة اللطيف, as the pilgrims' portal attached it ─────────
S = "V"
c.goto("/login", wait=1200)
p.locator("button:has-text('يوسف القطان')").first.click(); c.settle(2500)
admin("سامر نبيل نجار", "/portal/visas")
p.locator("main button[aria-pressed]:has-text('اللطيف')").first.click(); c.settle(1200)
c.shot("visas-list", "التأشيرات: كل عائلة ألحقها المكتب بمجموعتك، وتأشيرة كل فرد", hl=[("nav a[href*='/portal/visas']", "1")], section=S)
fam = p.locator("main [data-family]").first
fam.locator("button[aria-label^='حذف تأشيرة']").first.click(); c.settle(900)
fam.locator("input[aria-label^='رقم تأشيرة']").first.fill("HV-1448-7731-2"); c.settle(300)
c.shot("visas-add", "إضافة تأشيرة حاج: رقمها من بريد الخارجية، ثم ملفها", hl=[("main [data-family] input[aria-label^='رقم تأشيرة'] >> nth=0", "1"), ("main [data-family] label:has-text('رفع التأشيرة') >> nth=0", "2")], section=S)
fam.locator("button:has-text('محاكاة: وصل بريد الخارجية')").first.click(); c.settle(1500)
c.shot("visas-done", "اكتملت تأشيرات العائلة: صدرت خطوتها في بوابتها", hl=[("main [data-family] >> nth=0", "")], section=S)

# ───────── the coordinator's meals: the times of his cluster's two hotels, which its pilgrims read ─────────
S = "V"
admin("سامر نبيل نجار", "/portal/meals")
c.shot("meals-top", "الوجبات: الفطور والغداء في فندق مكة وفندق المدينة", hl=[("nav a[href*='/portal/meals']", "1")], section=S)
p.locator("main input[aria-label='الفطور — فندق مكة']").first.fill("06:30 – 09:30"); c.settle(300)
p.locator("main textarea[aria-label='قائمة الفطور — فندق مكة']").first.fill("فول، بيض، جبن، زيتون، خبز، فواكه، شاي وقهوة"); c.settle(300)
c.shot("meals-edit", "موعد الفطور وقائمته في فندق مكة، ثم «حفظ مواعيد الوجبات»", hl=[("main input[aria-label='الفطور — فندق مكة']", "1"), ("main button:has-text('حفظ مواعيد الوجبات')", "2")], section=S)
p.locator("main button:has-text('حفظ مواعيد الوجبات')").first.click(); c.settle(1200)

# ───────── religious lessons ─────────
S = "R"
admin("الشيخ خالد الرفاعي", "/portal/guide-lessons")
c.shot("lessons-guide", "الدروس الدينية: دروس الموجّه القادمة والمنتهية", hl=[("nav a[href*='/portal/guide-lessons']", "1"), ("main button:has-text('درس جديد')", "2")], section=S)
p.locator("main button:has-text('درس جديد')").first.click(); c.settle(900)
d = p.locator(DLG).last
d.locator("input[placeholder^='مثل: أحكام الإحرام']").fill("آداب الإقامة في مكة وصلاة الجماعة في الحرم")
d.locator("input[type=date]").fill("2027-05-05")
d.locator("input[type=time]").fill("20:30")
d.locator("input[placeholder^='مثل: فندق']").fill("فندق روضة طيبة — قاعة الطابق (م)")
d.locator("[role=radio]:has-text('للجميع')").click(); c.settle(300)
c.shot("lessons-new", "درس جديد: الموضوع والموعد والمكان، ولمن الدرس", hl=[(f"{DLG} [role=radiogroup][aria-label='لمن الدرس']", "1"), (f"{DLG} button:has-text('إضافة الدرس')", "2")], section=S)
d.locator("button:has-text('إضافة الدرس')").click(); c.settle(1400)
b = p.locator("main [data-lesson] button:has-text('تسجيل الحضور')").first
b.scroll_into_view_if_needed(); b.click(); c.settle(1000)
rows = p.locator(f"{DLG} ul li button[aria-pressed]")
for i in range(min(6, rows.count())):
    rows.nth(i).click(); c.settle(120)
c.shot("lessons-roll", "تسجيل الحضور: المدعوون وحدهم، ومن قال سيحضر", hl=[(f"{DLG} button:has-text('إنهاء الدرس وحفظ الحضور')", "")], section=S)
p.locator(f"{DLG} button:has-text('إنهاء الدرس وحفظ الحضور')").click(); c.settle(1200)
p.locator("main [role=tab]:has-text('المنتهية')").click(); c.settle(800)
c.shot("lessons-done", "الدروس المنتهية: من حضر من المدعوين", section=S)

# ───────── religious activities ─────────
c.goto("/portal/activities", wait=2000)
c.shot("act-list", "النشاطات الدينية: حلقات التحفيظ ومتوسط إنجاز كل منها", hl=[("nav a[href*='/portal/activities']", "1"), ("main button:has-text('نشاط جديد')", "2")], section=S)
p.locator("main button:has-text('نشاط جديد')").first.click(); c.settle(900)
d = p.locator(DLG).last
d.locator("input[placeholder^='مثل: الأحد']").fill("بعد صلاة الفجر يومياً")
d.locator("input[type=date]").fill("2027-05-03")
d.locator("input[placeholder='مثل: قاعة الفندق']").fill("فندق روضة طيبة — قاعة الطابق (م)")
c.shot("act-new", "نشاط جديد: النوع وما يغطيه، والموعد والمكان", section=S)
p.keyboard.press("Escape"); c.settle(600)
b = p.locator("main [data-activity='ac-27-quran'] button:has-text('المتابعة')").first
b.scroll_into_view_if_needed(); b.click(); c.settle(1200)
c.shot("act-tracker", "متابعة النشاط: إنجاز كل حاج، وآخر ما سمّعه، والتالي", section=S)
p.locator(f"{DLG} tbody button:has-text('تسميع')").first.click(); c.settle(800)
p.locator(f"{DLG} [role=radio]:has-text('ممتاز')").click(); c.settle(300)
c.shot("act-record", "تسجيل التسميع: من الصفحة إلى الصفحة، والتقدير", hl=[(f"{DLG} [role=radiogroup][aria-label='التقدير']", "")], section=S)
p.locator(f"{DLG} button:has-text('حفظ')").last.click(); c.settle(1000)
p.keyboard.press("Escape"); c.settle(600)

# ───────── the female guide: her lessons for the women, her shared reading ─────────
admin("هالة الدقر", "/portal/guide-lessons")
p.locator("main button:has-text('درس جديد')").first.click(); c.settle(900)
c.shot("lessons-female", "درس الموجّهة: للنساء وحدهن، ولمجموعاتها", hl=[(f"{DLG} [role=radiogroup][aria-label='لمن الدرس']", "")], section=S)
p.keyboard.press("Escape"); c.settle(600)
c.goto("/portal/activities", wait=2000)
b = p.locator("main [data-activity='ac-f-khatma'] button:has-text('المتابعة')").first
b.scroll_into_view_if_needed(); b.click(); c.settle(1200)
c.shot("act-khatma", "الختمة الجماعية: الأجزاء الثلاثون ومن قرأ كل جزء", section=S)
p.keyboard.press("Escape"); c.settle(600)

# ───────── the group's head follows them ─────────
admin("أحمد سليمان الحمصي", "/portal/guide-lessons")
c.shot("lessons-head", "رئيس المجموعة يتابع دروس مجموعته", section=S)
c.close()
print("DONE adm_d")
