# -*- coding: utf-8 -*-
"""Administrator guide — run D: الرحلات. The cluster head puts group 27 on his cluster's days (outbound and
return at once) and one of its pilgrims alone on the Latakia return; then the group head sees the result.
Then the group head's visas (a family the pilgrims' portal attached), the guides' religious lessons and activities.
Usage: CAP_DIR=admin python adm_d.py <keep>"""
import sys
from cap import Cap, truncate

truncate(int(sys.argv[1]))
c = Cap(); p = c.page
S = "N"
DLG = "[role=dialog]"
DAY = lambda no: f"main [data-day='{no}']"

def admin(name, path="/administrator/flights"):
    c.goto("/administrator/login?demo=all", wait=1500)
    card = p.locator(f"main button:has-text('{name} —')").first
    card.scroll_into_view_if_needed(); card.click(); c.settle(2500)
    c.goto(path, wait=2200)

# ───────── cluster head: his days, his groups, a pilgrim alone ─────────
admin("عبد الرحمن العلي")
c.shot("cfl-top", "رحلات التكتل: الأعداد، وكيف تعمل الأيام والإسناد", hl=[("nav a[href*='/administrator/flights']", "1"), ("main p:has-text('أيام رحلاته')", "2")], section=S)
c.scroll_to("text=أيام رحلات التكتل", 110)
c.shot("cfl-days", "أيام رحلات التكتل: الذهاب والعودة، ومقاعد التكتل على كل رحلة", hl=[(DAY("RB 507"), "")], section=S)

b = p.locator(f"{DAY('RB 507')} button:has-text('إسناد مجموعات')").first
b.scroll_into_view_if_needed(); b.click(); c.settle(1000)
p.locator(f"{DLG} button[aria-pressed]:has-text('مجموعة اللطيف')").first.click(); c.settle(500)
c.shot("cfl-assign", "إسناد مجموعات: المجموعة كاملة، وعودتها من أيام التكتل مختارة سلفاً", hl=[(f"{DLG} select", "1"), (f"{DLG} button:has-text('إسناد') >> nth=-1", "2")], section=S)
p.locator(f"{DLG} button:has-text('إسناد')").last.click(); c.settle(1600)

b = p.locator(f"{DAY('RB 538')} button:has-text('إضافة حجاج')").first
b.scroll_into_view_if_needed(); b.click(); c.settle(1000)
p.locator(f"{DLG} select[aria-label='المجموعة']").select_option("27"); c.settle(700)
p.locator(f"{DLG} button[aria-pressed]:not([disabled])").first.click(); c.settle(400)
c.shot("cfl-pilgrims", "إضافة حجاج فرادى: من يسافر وحده يُنقل من رحلة مجموعته", hl=[(f"{DLG} button[aria-pressed='true']", "1"), (f"{DLG} button:has-text('إضافة') >> nth=-1", "2")], section=S)
p.locator(f"{DLG} button:has-text('إضافة')").last.click(); c.settle(1600)
c.scroll_to(DAY("RB 538"), 160)
c.shot("cfl-apart", "على الرحلة فرادى خارج رحلة مجموعتهم، ولكل مجموعة وفرد زر الإزالة", hl=[(f"{DAY('RB 538')} div:has-text('فرادى خارج رحلة مجموعتهم') >> nth=-1", "")], section=S)
c.scroll_to("text=مجموعات تكتلي ورحلاتها", 110)
c.shot("cfl-table", "مجموعات تكتلي ورحلاتها ذهاباً وعودة", hl=[("main tr:has-text('مجموعة اللطيف')", "")], section=S)

# ───────── group head ─────────
admin("أحمد سليمان الحمصي")
c.shot("gfl-top", "رحلات المجموعة: رحلة الذهاب ورحلة العودة", hl=[("nav a[href*='/administrator/flights']", "")], section=S)
c.scroll_to("text=كشف المجموعة", 110)
c.shot("gfl-list", "كشف المجموعة: رحلة كل فرد وحالته", hl=[("main button:has-text('طباعة')", "")], section=S)
c.goto("/administrator/field", wait=2200)
c.scroll_to("[role=tablist]", 110)
op = p.locator("main button:has-text('فتح التجمّع'), main button:has-text('فتح تجمّع')").first
op.scroll_into_view_if_needed(); op.click(); c.settle(1500)
c.scroll_to("text=مرتبط بالرحلة", 260)
c.shot("gfl-muster", "تجمّع المطار مرتبط برحلة المجموعة: من تحدّده حاضراً يُسجَّل صعوده", hl=[("text=مرتبط بالرحلة", "")], section=S)

# ───────── the group head's visas: a family of his, as the pilgrims' portal attached it ─────────
S = "V"
c.goto("/login", wait=1200)
p.locator("button:has-text('يوسف القطان')").first.click(); c.settle(2500)
admin("أحمد سليمان الحمصي", "/administrator/visas")
c.shot("visas-list", "التأشيرات: كل عائلة ألحقها المكتب بمجموعتك، وتأشيرة كل فرد", hl=[("nav a[href*='/administrator/visas']", "1")], section=S)
fam = p.locator("main [data-family]").first
fam.locator("button[aria-label^='حذف تأشيرة']").first.click(); c.settle(900)
fam.locator("input[aria-label^='رقم تأشيرة']").first.fill("HV-1448-7731-2"); c.settle(300)
c.shot("visas-add", "إضافة تأشيرة حاج: رقمها من بريد الخارجية، ثم ملفها", hl=[("main [data-family] input[aria-label^='رقم تأشيرة'] >> nth=0", "1"), ("main [data-family] label:has-text('رفع التأشيرة') >> nth=0", "2")], section=S)
fam.locator("button:has-text('محاكاة: وصل بريد الخارجية')").first.click(); c.settle(1500)
c.shot("visas-done", "اكتملت تأشيرات العائلة: صدرت خطوتها في بوابتها", hl=[("main [data-family] >> nth=0", "")], section=S)

# ───────── religious lessons ─────────
S = "R"
admin("الشيخ خالد الرفاعي", "/administrator/lessons")
c.shot("lessons-guide", "الدروس الدينية: دروس الموجّه القادمة والمنتهية", hl=[("nav a[href*='/administrator/lessons']", "1"), ("main button:has-text('درس جديد')", "2")], section=S)
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
c.goto("/administrator/activities", wait=2000)
c.shot("act-list", "النشاطات الدينية: حلقات التحفيظ ومتوسط إنجاز كل منها", hl=[("nav a[href*='/administrator/activities']", "1"), ("main button:has-text('نشاط جديد')", "2")], section=S)
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
admin("هالة الدقر", "/administrator/lessons")
p.locator("main button:has-text('درس جديد')").first.click(); c.settle(900)
c.shot("lessons-female", "درس الموجّهة: للنساء وحدهن، ولمجموعاتها", hl=[(f"{DLG} [role=radiogroup][aria-label='لمن الدرس']", "")], section=S)
p.keyboard.press("Escape"); c.settle(600)
c.goto("/administrator/activities", wait=2000)
b = p.locator("main [data-activity='ac-f-khatma'] button:has-text('المتابعة')").first
b.scroll_into_view_if_needed(); b.click(); c.settle(1200)
c.shot("act-khatma", "الختمة الجماعية: الأجزاء الثلاثون ومن قرأ كل جزء", section=S)
p.keyboard.press("Escape"); c.settle(600)

# ───────── the group's head follows them ─────────
admin("أحمد سليمان الحمصي", "/administrator/lessons")
c.shot("lessons-head", "رئيس المجموعة يتابع دروس مجموعته", section=S)
c.close()
print("DONE adm_d")
