# -*- coding: utf-8 -*-
"""Administrator guide — run D: الرحلات. The cluster head puts group 27 on his cluster's days (outbound and
return at once) and one of its pilgrims alone on the Latakia return; then the group head sees the result.
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
c.close()
print("DONE adm_d")
