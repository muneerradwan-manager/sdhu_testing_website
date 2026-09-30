# -*- coding: utf-8 -*-
"""Administrator guide — run D: الرحلات, read-only. The flight officer puts group 27 on its flights first
(no shots), then the cluster head and the group head see the result.
Usage: CAP_DIR=admin python adm_d.py <keep>"""
import sys
from cap import Cap, truncate

truncate(int(sys.argv[1]))
c = Cap(); p = c.page
S = "N"

def admin(name, path="/administrator/flights"):
    c.goto("/administrator/login", wait=1500)
    card = p.locator(f"main button:has-text('{name} —')").first
    card.scroll_into_view_if_needed(); card.click(); c.settle(2500)
    c.goto(path, wait=2200)

# the officer places group 27 on its cluster's flights (the staff guide shows how)
c.goto("/staff", wait=1500)
p.locator("label:has-text('اسم المستخدم') input").first.fill("haitham")
p.locator("label:has-text('كلمة المرور') input").first.fill("1448")
p.locator("button[type=submit]").first.click(); c.settle(2000)
c.goto("/staff/flights", wait=2200)
p.get_by_role("tab", name="لوحة التفويج").click(); c.settle(1500)
p.locator("main tr:has-text('المجموعة 27') button:has-text('إسناد')").first.click(); c.settle(900)
p.locator("[role=dialog] button:has-text('إسناد المجموعة')").click(); c.settle(1500)

# ───────── cluster head ─────────
admin("عبد الرحمن العلي")
c.shot("cfl-top", "رحلات التكتل: الأعداد، ومن يضع المجموعات على الرحلات", hl=[("nav a[href*='/administrator/flights']", "1"), ("main p:has-text('تنسّق معه مباشرة')", "2")], section=S)
c.scroll_to("text=مجموعات تكتلي ورحلاتها", 110)
c.shot("cfl-table", "مجموعات تكتلي ورحلاتها ذهاباً وعودة", hl=[("main tr:has-text('المجموعة 47')", "")], section=S)
c.scroll_to("main div.rounded-3xl:has-text('رحلة الذهاب')", 130)
c.shot("cfl-cards", "بطاقات رحلات التكتل: الموعد والتجمّع ومجموعاتك عليها", section=S)

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
c.shot("gfl-muster", "تجمّع «ساحة المزة ← المطار» مرتبط برحلة المجموعة: المسح يسجّل الصعود", hl=[("text=مرتبط بالرحلة", "")], section=S)
c.close()
print("DONE adm_d")
