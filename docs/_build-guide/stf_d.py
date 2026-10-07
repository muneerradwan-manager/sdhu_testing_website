# -*- coding: utf-8 -*-
"""Staff guide — run D: «إدارة الطيران» (haitham holds the file). The officer does everything: airports, carriers and
their representatives, flights one way or round trip, employees one or many, whole groups of pilgrims, dispatch.
The representative of an airport (omar, no permission) records take-off and landing on «رحلات مطاري».
Usage: CAP_DIR=staff python stf_d.py <keep>"""
import sys
from cap import truncate
from stf_a import Staff

truncate(int(sys.argv[1]))
s = Staff(); c, p = s.c, s.p
S = "N"
D = "[role=dialog]"
TABS = "nav[aria-label='تبويبات إدارة الطيران']"
ROW = lambda no: f"main table tbody tr:has-text('{no}')"

def open_flight(no, wait=1300):
    p.locator(ROW(no)).first.scroll_into_view_if_needed()
    p.locator(ROW(no)).first.click(); c.settle(wait)

def close(n=1):
    for _ in range(n):
        p.keyboard.press("Escape"); c.settle(600)

def dbtn(text, wait=1000):
    b = p.locator(f"{D} button:has-text('{text}')").filter(visible=True).last
    b.scroll_into_view_if_needed(); b.click(); c.settle(wait)

s.login("haitham")
c.goto("/staff/flights", wait=2300)
c.shot("fl-top", "ملخص الطيران: أرقام الموسم، وما ينتظرك الآن", hl=[("aside a[href$='/staff/flights']", "1"), ("aside a[href$='/staff/flights/manage']", "2")], section=S)
c.scroll_to("text=الرحلات القادمة", 120)
c.shot("fl-summary", "المطارات ومندوبوها، والرحلات القادمة، والتكتلات على رحلاتها", section=S)

# ── the first tab: airports, carriers, and each airport's representative
c.goto("/staff/flights/manage", wait=2000)
c.shot("fl-refs", "إدارة الطيران: ثلاثة تبويبات بترتيب العمل، وأولها المطارات والناقلون", hl=[(TABS, "")], section=S)
rep = p.locator("select[aria-label='مندوب مطار الملك عبد العزيز — صالة الحجاج']").first
c.scroll_to("text=مندوبو المطارات", 120)
rep.select_option("omar"); c.settle(5000)  # its toast fades first
c.shot("fl-reps", "مندوبو المطارات: مندوب لكل مطار يسجل الإقلاع منه والهبوط فيه", hl=[("select[aria-label='مندوب مطار الملك عبد العزيز — صالة الحجاج']", "")], section=S)

# ── the flights
s.page_tab("الرحلات", 1800)
c.scroll_to("main table", 330)
c.shot("fl-list", "قائمة الرحلات: المقاعد، والمجموعات على كل رحلة، والحالة", section=S)

# ── a round trip for employees
c.scroll_top()
s.btn("رحلة جديدة", 1200)
m = p.locator(D).last
m.locator("select").first.select_option("staff"); c.settle(300)
m.locator("[role=radio]:has-text('ذهاب وعودة')").click(); c.settle(300)
fn = m.locator("input[placeholder='RB 513']")
fn.nth(0).fill("RB 415"); fn.nth(1).fill("RB 416")
m.locator("input[type=number]").first.fill("6"); c.settle(300)
c.shot("fl-new", "رحلة جديدة: لمن الرحلة، ونوعها (ذهاب فقط، عودة فقط، ذهاب وعودة)، والسعة", hl=[(f"{D} [role=radiogroup]", "1"), (f"{D} select >> nth=0", "2")], section=S)
m.locator("h3:has-text('رحلة العودة')").first.evaluate("el => el.scrollIntoView({block: 'start'})"); c.settle(500)
c.shot("fl-new-return", "في «ذهاب وعودة» تُملأ رحلة العودة تحت رحلة الذهاب، ثم «حفظ الرحلتين»", hl=[(f"{D} button:has-text('حفظ الرحلتين')", "")], section=S)
dbtn("حفظ الرحلتين", 1500)
c.shot("fl-draft", "المسودة: الرحلة المقابلة مرتبطة بها، و«نشر الرحلتين»", hl=[(f"{D} button:has-text('نشر الرحلتين')", "")], section=S)
dbtn("نشر الرحلتين", 1200)
s.tab("الموظفون", 700)
dbtn("إسناد موظفين", 1300)
pk = p.locator(D).last
for i in range(4):
    pk.locator("ul li button:not([disabled])").nth(i).click(); c.settle(150)
c.shot("fl-picker", "اختيار الموظفين: واحد أو أكثر، بلا حد إلا مقاعد الرحلة", section=S)
sel = pk.locator("label:has-text('أيضاً') select").first
sel.scroll_into_view_if_needed(); c.settle(400)
c.shot("fl-picker-return", "رحلة العودة المقابلة مختارة سلفاً: يُسند الموظفون ذهاباً وعودة معاً", hl=[(f"{D} label:has-text('أيضاً') select", "1"), (f"{D} button:has-text('إسناد 4')", "2")], section=S)
pk.locator("button:has-text('إسناد 4')").first.click(); c.settle(1500)
c.shot("fl-staff-done", "الموظفون الأربعة على الرحلة", section=S)
close()

# ── whole groups on a pilgrims' flight
open_flight("RB 507")
c.shot("fl-drawer", "رحلة حجاج: المجموعات عليها، ثم الحجاج مرتبون بالمجموعة والعائلة", hl=[(f"{D} button:has-text('إضافة مجموعات')", "")], section=S)
dbtn("إضافة مجموعات", 1300)
gp = p.locator(D).last
gp.locator("select").first.select_option("al-nour"); c.settle(500)
gp.locator("button[aria-label^='مجموعة اللطيف —']").click(); c.settle(200)
gp.locator("button[aria-label^='مجموعة أحفاد بني هاشم —']").click(); c.settle(300)
c.shot("fl-groups", "إضافة مجموعات: تُختار المجموعة كاملة، والعدد والمتبقي في الأسفل", section=S)
g_sel = gp.locator("label:has-text('أيضاً') select").first
g_sel.scroll_into_view_if_needed(); c.settle(400)
c.shot("fl-groups-return", "وإسنادها إلى رحلة العودة المقابلة في الخطوة نفسها", hl=[(f"{D} label:has-text('أيضاً') select", "1"), (f"{D} button:has-text('إسناد 2 مجموعات')", "2")], section=S)
gp.locator("button:has-text('إسناد 2 مجموعات')").click(); c.settle(1500)
c.scroll_top()
c.shot("fl-groups-done", "المجموعتان على الرحلة مع أفرادهما وفريقيهما", hl=[(f"{D} li:has-text('مجموعة اللطيف')", "")], section=S)
p.locator(f"{D} li:has-text('مجموعة أحفاد بني هاشم') button:has-text('إزالة')").first.click(); c.settle(700)
c.shot("fl-group-remove", "إزالة مجموعة من الرحلة: تعود مقاعدها متاحة", hl=[(f"{D} button:has-text('تنفيذ')", "")], section=S)
dbtn("تنفيذ", 1300)

# ── lock and manifest
c.shot("fl-lock", "إقفال الرحلة وإصدار كشف الركاب", hl=[(f"{D} button:has-text('إقفال وإصدار الكشف')", "")], section=S)
dbtn("إقفال وإصدار الكشف", 1300)
s.tab("كشف الركاب", 700)
c.shot("fl-manifest", "كشف الركاب: الإصدار، والتصدير إلى نسك مسار والناقل", hl=[(f"{D} button:has-text('تصدير إلى نسك مسار')", "1"), (f"{D} button:has-text('تصدير للناقل')", "2")], section=S)
p.locator(f"{D} summary:has-text('عرض الصفوف')").first.click(); c.settle(500)
c.shot("fl-manifest-rows", "صفوف الكشف: الاسم والصفة والمجموعة والاحتياجات", section=S)
s.tab("الحجاج", 600)
boxes = p.locator(f"{D} input[type=checkbox]")
boxes.nth(0).check(); boxes.nth(1).check(); c.settle(400)
c.shot("fl-select", "اختيار أفراد على رحلة مقفلة: إلغاء الإسناد أو النقل", hl=[(f"{D} button:has-text('نقل إلى رحلة أخرى')", "")], section=S)
dbtn("نقل إلى رحلة أخرى", 900)
p.locator(f"{D} textarea").last.fill("ظرف طبي — بطلب رئيس التكتل هاتفياً"); c.settle(300)
c.shot("fl-move", "النقل بعد الإقفال: الرحلة الجديدة والسبب الإلزامي", hl=[(f"{D} button:has-text('تنفيذ')", "")], section=S)
dbtn("تنفيذ", 1500)
c.shot("fl-reissue", "تغيّرت الإسنادات بعد الكشف: أصدر كشفاً جديداً", hl=[(f"{D} button:has-text('كشف بإصدار جديد')", "")], section=S)
dbtn("كشف بإصدار جديد", 1000)
close()

# ── exceptions
open_flight("SV 3421")
dbtn("تأجيل", 800)
p.locator(f"{D} textarea").last.fill("إغلاق الأجواء"); c.settle(300)
c.shot("fl-postpone", "تأجيل رحلة: السبب، والإسنادات تبقى", hl=[(f"{D} button:has-text('تنفيذ')", "")], section=S)
dbtn("تنفيذ", 1300)
c.shot("fl-postponed", "الرحلة مؤجلة: حدّد الموعد الجديد أو ألغها", hl=[(f"{D} button:has-text('تحديد الموعد الجديد')", "")], section=S)
dbtn("تحديد الموعد الجديد", 800)
ins = p.locator(D).last.locator("input")
ins.nth(0).fill("2027-04-26"); ins.nth(1).fill("09:00"); ins.nth(2).fill("2027-04-26"); ins.nth(3).fill("11:30"); c.settle(300)
c.shot("fl-reschedule", "الموعد الجديد: تاريخ ووقت المغادرة والوصول", hl=[(f"{D} button:has-text('تنفيذ')", "")], section=S)
dbtn("تنفيذ", 1300)
close()
open_flight("RB 522")
dbtn("تحويل الوجهة", 800)
m = p.locator(D).last
m.locator("select").select_option("ap-amm"); m.locator("input[type=number]").fill("3")
m.locator("input:not([type=number])").last.fill("الحافلات عند صالة الوصول"); c.settle(300)
c.shot("fl-divert", "تحويل الوجهة: المطار البديل وعدد الحافلات", hl=[(f"{D} button:has-text('تنفيذ')", "")], section=S)
dbtn("تنفيذ", 1300)
c.shot("fl-diverted", "الرحلة محوّلة: المرحلة الأرضية بالحافلات", hl=[(f"{D} p:has-text('مرحلة أرضية')", "")], section=S)
close()
open_flight("XY 2214")
dbtn("إلغاء الرحلة", 800)
p.locator(f"{D} textarea").last.fill("ألغى الناقل الرحلة"); c.settle(300)
c.shot("fl-cancel", "إلغاء رحلة: المسافرون يصيرون «بحاجة إلى رحلة»", hl=[(f"{D} button:has-text('تنفيذ')", "")], section=S)
dbtn("تنفيذ", 1500)
close()
c.scroll_to("text=سجل الرحلات", 120)
c.shot("fl-records", "سجل الرحلات: كل ما تغيّر في الرحلات، ومن غيّره ومتى", section=S)

# ── dispatch
c.scroll_top()
s.page_tab("التفويج", 1800)
c.scroll_to("text=التكتلات والمجموعات", 110)
c.shot("fl-board", "التفويج: كل مجموعة ورحلتاها، وزر «إسناد» لمن ليس على رحلة", hl=[("main tr:has-text('مجموعة الإيمان') button:has-text('إسناد')", "")], section=S)
p.locator("main tr:has-text('مجموعة الإيمان') button:has-text('إسناد')").first.click(); c.settle(900)
c.shot("fl-board-assign", "إسناد مجموعة من التفويج: رحلة الذهاب ورحلة العودة مقترحتان", hl=[(f"{D} button:has-text('إسناد المجموعة')", "")], section=S)
dbtn("إسناد المجموعة", 1500)
c.scroll_to("section:has(h2:has-text('بحاجة إلى رحلة'))", 110)
c.shot("fl-board-lists", "بحاجة إلى رحلة، وموظفون بلا رحلة، والتنبيهات", section=S)
p.locator("section:has(h2:has-text('بحاجة إلى رحلة')) li button:has-text('إسناد')").first.click(); c.settle(800)
m = p.locator(D).last
m.locator("select").select_option(index=1); m.locator("input").last.fill("إعادة إسناد بعد إلغاء الرحلة"); c.settle(300)
c.shot("fl-assign-one", "إسناد فردي لمن فقد مقعده", hl=[(f"{D} button:has-text('إسناد') >> nth=-1", "")], section=S)
m.locator("button:has-text('إسناد')").last.click(); c.settle(1200)
c.goto("/staff/my-files", wait=2000)
c.shot("fl-my", "رحلاتي: رحلة الموظف ذهاباً وعودة في «ملفاتي التشغيلية»", hl=[("section:has(h2:has-text('رحلاتي'))", "")], section=S)

# ── the airport's representative: take-off from Damascus, landing in Jeddah
s.login("omar")
c.goto("/staff/airport", wait=2300)
dep = p.locator("main div.rounded-2xl:has(span[dir=ltr]:text-is('RB 507')) button:has-text('تسجيل الإقلاع')").first
dep.scroll_into_view_if_needed(); c.settle(300)
c.shot("fl-airport", "رحلات مطاري: المغادرة من مطار المندوب والوصول إليه", hl=[("aside a[href$='/staff/airport']", "1"), ("main div.rounded-2xl:has(span[dir=ltr]:text-is('RB 507')) button:has-text('تسجيل الإقلاع')", "2")], section=S)
dep.click(); c.settle(900)
p.locator(D).last.locator("input[type=checkbox]").nth(2).check(); c.settle(300)
c.shot("fl-depart", "تسجيل الإقلاع: علّم من تخلّف فقط", hl=[(f"{D} button:has-text('تسجيل الإقلاع')", "")], section=S)
dbtn("تسجيل الإقلاع", 1500)
c.shot("fl-departed", "أقلعت: صعد الجميع إلا من عُلّم متخلفاً", hl=[("main div.rounded-2xl:has(span[dir=ltr]:text-is('RB 507'))", "")], section=S)
p.locator("[role=radiogroup][aria-label='المطار'] [role=radio]:has-text('جدة')").first.click(); c.settle(1000)
land = p.locator("main div.rounded-2xl:has(span[dir=ltr]:text-is('RB 507')) button:has-text('تسجيل الهبوط')").first
land.scroll_into_view_if_needed(); land.click(); c.settle(600)
c.shot("fl-land", "تسجيل الهبوط في مطار الوصول: «تأكيد الهبوط»", hl=[("main button:has-text('تأكيد الهبوط')", "")], section=S)
p.locator("main button:has-text('تأكيد الهبوط')").first.click(); c.settle(1300)
c.shot("fl-arrived", "هبطت الرحلة", hl=[("main div.rounded-2xl:has(span[dir=ltr]:text-is('RB 507'))", "")], section=S)
c.save_state("staff/state-flights.json")
s.close()
print("DONE stf_d")
