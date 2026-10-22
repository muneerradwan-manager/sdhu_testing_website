# -*- coding: utf-8 -*-
"""Staff guide — part «exam»: the «إدارة الامتحانات» file (munir) and the hall supervisor (nisreen).
A whole sitting is run on the group heads' exam day (7 October, 08:30 — half an hour before its 09:00) in مركز دمشق
for مروان, the eligible administrator of admin/state-eligible.json: open the hall, check him in, his device asks to
enter, approve, start, he submits, she confirms with her PIN on his device, end. The review, results and statistics
pages are then shot on that real sitting.
Usage: CAP_DIR=<folder> python stf_exam.py"""
from stf_common import Staff, STATE

D = "[role=dialog]"
EX, HALL = "EX", "HALL"


def esc(c, p, n=1):
    for _ in range(n):
        p.keyboard.press("Escape"); c.settle(700)


def box(p, c, title):
    """Open a closed box (Box / RecordsBox) by its title"""
    b = p.locator(f"main button[aria-expanded=false]:has-text('{title}')").first
    b.scroll_into_view_if_needed(); b.click(); c.settle(800)


def marwan_id(p):
    return p.evaluate("() => JSON.parse(localStorage.getItem('sdhu-demo-v1') || '{}').adminSessionId")


s = Staff(storage=STATE / "state-eligible.json"); c, p = s.c, s.p
c.goto("/staff", wait=800)
s.clock("2026-10-07", "08:30")
NID = marwan_id(p)
print("candidate:", NID)

# ═════════════ «إدارة الامتحانات» before the sitting (munir) ═════════════
s.login("munir")
c.goto("/staff/exam", wait=2200)
c.shot("ex-dash", "لوحة التحكم: أرقام ملف الامتحانات، و«كيف تعمل» بخطواته الأربع", hl=[("aside a[href$='/staff/exam']", "1"), ("main a:has-text('إدارة الامتحانات')", "2")], section=EX)
c.scroll_to("main h2:has-text('ما ينتظرك الآن'), main :text-is('ما ينتظرك الآن')", 110)
c.shot("ex-dash-todo", "ما ينتظرك الآن، والآن في القاعات، والمحاولات والجلسات والنتائج حسب الحالة", hl=[("main a:has-text('راجعها'), main button:has-text('راجعها')", "")], section=EX)
c.scroll_to("main :text-is('القاعات')", 110)
c.shot("ex-dash-tables", "جدولا القاعات والاختبارات: لكل قاعة ولكل اختبار أرقامه", section=EX)
c.scroll_top()
s.btn("رفع أمر إلى المدير", 900)
p.locator(f"{D} textarea[aria-label='الأمر المرفوع']").first.fill("مديرية أوقاف حمص لا تتيح القاعة يوم الاختبار، ونحتاج قاعة بديلة لـ 40 متقدماً."); c.settle(300)
c.shot("ex-escalate", "رفع أمر إلى المدير: ما لا تحسمه وحدك يصل إلى مدير الموسم", hl=[(f"{D} button:has-text('إرسال')", "")], section=EX)
esc(c, p)

# the halls
s.nav("القاعات والمحافظات", 1800)
c.shot("ex-halls", "القاعات والمحافظات: قائمة القاعات، وتحت اسم كل قاعة أفعالها", hl=[("main a:has-text('إضافة قاعة') >> nth=-1", "1"), ("main tr:has-text('مركز دمشق') a:text-is('مركز دمشق')", "2")], section=EX)
p.locator("main tr:has-text('مركز دمشق') a:text-is('تعديل')").first.click(); c.settle(2200)
c.shot("ex-hall-edit", "تعديل قاعة: اسمها ومكانها ومحافظاتها في الوسط، والحفظ والمشرف (للاطلاع) والشاشة في الجانب", hl=[("main section:has(> button:has-text('مشرف القاعة'))", "1"), ("button:has-text('حفظ القاعة')", "2")], section=EX)
c.scroll_to("main h2:has-text('موقع القاعة على الخريطة')", 110); c.settle(2000)
c.shot("ex-hall-map", "موقع القاعة على الخريطة، وتحتها إحداثياته؛ وفي الجانب رقم الشاشة والمقاعد وسجلّ القاعة", hl=[("main [role=application]", "")], section=EX)
s.nav("إضافة قاعة", 1800)
p.locator("input[aria-label='اسم القاعة']").first.fill("مركز طرطوس"); c.settle(300)
c.shot("ex-hall-new", "إضافة قاعة: الشاشة نفسها فارغة، ويُقترح لها أول رقم شاشة غير مستعمل", hl=[("input[aria-label='اسم القاعة']", "1"), ("button:has-text('إضافة القاعة')", "2")], section=EX)
s.nav("القاعات والمحافظات", 1800)
box(p, c, "شاشات القاعات ورابط المتقدمين")
box(p, c, "المحافظات والقاعة التي تخدم كلاً منها")
c.scroll_to("main button:has-text('شاشات القاعات ورابط المتقدمين')", 110)
c.shot("ex-hall-screens", "شاشات القاعات ورابط دخول المتقدمين، والمحافظات والقاعة التي تخدم كلاً منها", hl=[("main button:has-text('نسخ رابط شاشة كل القاعات')", "1"), ("main button:has-text('نسخ الرابط')", "2")], section=EX)
c.scroll_top()
p.locator("main tr:has-text('مركز دير الزور') button:text-is('تعطيل')").first.click(); c.settle(900)
c.shot("ex-hall-off", "تعطيل قاعة: يُقال قبل التنفيذ من يبقى بلا قاعة", hl=[(f"{D} button:text-is('تراجع')", "")], section=EX)
p.locator(f"{D} button:text-is('تراجع')").first.click(); c.settle(700)

# the exams
s.nav("الاختبارات", 1800)
c.shot("ex-exams", "الاختبارات: اختبار مؤتمت لكل صفة، وموعده وأسئلته وقاعاته وحالته", hl=[("main a:has-text('إضافة اختبار')", "1"), ("main tr:has-text('رئيس مجموعة') a:has-text('الاختبار المؤتمت')", "2")], section=EX)
box(p, c, "مواعيد فتح الاختبار للإداريين")
c.scroll_to("main button:has-text('مواعيد فتح الاختبار للإداريين')", 110)
c.shot("ex-exams-window", "مواعيد فتح الاختبار للإداريين: مدة الاختبارات وتفعيلها", section=EX)
c.scroll_top()
p.locator("main tr:has-text('رئيس مجموعة') a:text-is('تعديل')").first.click(); c.settle(2000)
c.shot("ex-exam-edit", "تعديل اختبار: عنوانه وأقسامه في الوسط، وحالته وموعده ومدته في الجانب", hl=[("button:has-text('حفظ الاختبار')", "1")], section=EX)
c.scroll_to("main h2:text-is('الأقسام')", 110)
c.shot("ex-exam-sections", "أقسام الاختبار: لكل قسم فئاته وما يُسحب منه ونسبة النجاح فيه وترتيب أسئلته", hl=[("input[aria-label^='ما يُسحب من']", "1"), ("input[aria-label^='نسبة النجاح في']", "2")], section=EX)
c.scroll_to("main button[aria-expanded]:text-is('القاعات')", 120)
c.shot("ex-exam-entry", "في الجانب: القاعات التي يُعقد فيها، ووضع الدخول، وشبكة القاعة، وظهور النتيجة", hl=[("main select:has(option:text-is('موافقة يدوية'))", "")], section=EX)

# the question bank
s.nav("بنك الأسئلة", 1800)
c.shot("ex-bank", "بنك الأسئلة: البحث والتصفية، والأسئلة الفعّالة والمعطّلة، وتحت كل سؤال أفعاله", hl=[("main button:has-text('إضافة سؤال')", "1")], section=EX)
s.btn("إضافة سؤال", 1000)
p.locator(f"{D} textarea[aria-label='نص السؤال']").first.fill("متى يبدأ وقت رمي جمرة العقبة يوم النحر؟"); c.settle(200)
for i, t in enumerate(["بعد طلوع الشمس", "بعد الزوال", "بعد العصر"]):
    f = p.locator(f"{D} input[aria-label^='الخيار']").nth(i)
    if f.count(): f.fill(t)
c.settle(400)
c.shot("ex-bank-new", "سؤال جديد: نوعه وفئته وصفاته، ونصه وخياراته والإجابة الصحيحة وشرحها", hl=[(f"{D} button:has-text('إضافة السؤال')", "")], section=EX)
esc(c, p)
used = p.locator("main tr:has-text('ظهر في') a:text-is('عرض'), main tr:has-text('ظهر في') button:text-is('عرض')").first
used.scroll_into_view_if_needed(); used.click(); c.settle(1000)
c.shot("ex-bank-used", "سؤال ظهر في محاولات: يُقرأ ولا يُعدَّل، ويُنشأ بديل منه", hl=[(f"{D} button:has-text('إنشاء بديل')", "")], section=EX)
esc(c, p)

# the applicants
s.nav("المتقدمون", 1800)
p.locator("main input[aria-label^='تحديد مروان']").first.check(); c.settle(300)
p.locator("main select[aria-label='القاعة التي يُنقلون إليها']").first.select_option(label="مركز ريف دمشق"); c.settle(400)
c.scroll_to("main select[aria-label='القاعة التي يُنقلون إليها']", 170)
c.shot("ex-people", "المتقدمون: قاعة كل متقدم وجلسته وحاله؛ ولنقل متقدمين حدّدهم واختر القاعة", hl=[("main input[aria-label^='تحديد مروان']", "1"), ("main select[aria-label='القاعة التي يُنقلون إليها']", "2"), ("main button:has-text('نقل إليها')", "3")], section=EX)
p.locator("main input[aria-label^='تحديد مروان']").first.uncheck(); c.settle(300)
p.locator("main tr:has-text('مروان') button:has-text('التفاصيل والنقل')").first.click(); c.settle(1000)
c.shot("ex-people-sheet", "تفاصيل متقدم: باركوده وقاعة محافظته وجلسته وموعدها، ونقله وحده", hl=[(f"{D} select[aria-label^='قاعة ']", "")], section=EX)
esc(c, p)

# the sittings
s.nav("جلسات الاختبار", 1800)
c.scroll_to("main tr:has-text('رئيس مجموعة'):has-text('مركز دمشق')", 420)
c.shot("ex-sittings", "جلسات الاختبار: لكل اختبار جلسة في كل قاعة، بموعدها ومشرفها وحالتها", hl=[("main tr:has-text('رئيس مجموعة'):has-text('مركز دمشق') button:text-is('عرض')", "")], section=EX)
p.locator("main tr:has-text('رئيس مجموعة'):has-text('مركز دمشق') button:text-is('عرض')").first.click(); c.settle(1200)
c.shot("ex-sitting", "جلسة: موعدها ومشرفها ووضع دخولها، ومتقدموها ومحاولاتها — للاطلاع فقط", section=EX)
esc(c, p)

# ═════════════ «مشرف القاعة الامتحانية» (nisreen) ═════════════
s.login("nisreen")
c.goto("/staff/hall", wait=1800)
c.shot("hall-list", "قاعتي الامتحانية: جلساتي في قاعتي، وما يمكن فتحه الآن أولاً", hl=[("aside a[href$='/staff/hall']", "1"), ("main tr:has-text('رئيس مجموعة') button:has-text('الاختبار المؤتمت')", "2")], section=HALL)
box(p, c, "PIN التأكيد")
c.scroll_to("main button:has-text('PIN التأكيد')", 200)
c.shot("hall-pin", "PIN التأكيد: رمزك السري الذي تكتبه على جهاز المتقدم", hl=[("main button:has-text('تغيير الـ PIN')", "")], section=HALL)
s.btn("تغيير الـ PIN", 900)
c.shot("hall-pin-change", "تغيير الـPIN: من 4 إلى 10 أرقام، يُكتب مرتين", section=HALL)
esc(c, p)
p.locator("main tr:has-text('رئيس مجموعة') button:text-is('إدارة الجلسة')").first.click(); c.settle(1500)
c.shot("hall-idle", "الجلسة: مراحلها الأربع وما تفعله الآن، وفي الجانب الجلسة والشبكة والروابط والـPIN", hl=[("main button:has-text('فتح القاعة')", "")], section=HALL)
s.btn("فتح القاعة", 900)
c.shot("hall-open", "فتح القاعة: تُسجَّل شبكتك شبكةً للقاعة", hl=[(f"{D} button:has-text('فتح القاعة')", "")], section=HALL)
p.locator(f"{D} button:has-text('فتح القاعة')").last.click(); c.settle(1800)
c.goto("/exam-display/1", wait=2500)
c.shot("hall-display-open", "شاشة القاعة بعد الفتح: خطوات الدخول ورمز QR كبير", section=HALL)
c.goto("/staff/hall", wait=1800)
s.btn("محاكاة: يمرر المتقدم التالي بطاقته على القارئ", 600)
c.scroll_to("main input[aria-label='الباركود أو الرقم الوطني']", 260)
c.shot("hall-checkin", "تسجيل الحضور: مسح باركود البطاقة أو كتابة الرقم الوطني", hl=[("main input[aria-label='الباركود أو الرقم الوطني']", "1"), ("main button[type=submit]:has-text('تسجيل')", "2")], section=HALL)
p.locator("main button[type=submit]:has-text('تسجيل')").first.click(); c.settle(1300)
c.shot("hall-present", "سُجّل حضوره: «حاضر» في قائمة المدرجين", section=HALL)

# مروان on his device: the applicants' entry link, his national id
c.goto("/portal/exam", wait=2500)
f = p.locator("input[aria-label='الرقم الوطني']").first
f.fill(NID); c.settle(300)
c.scroll_to("input[aria-label='الرقم الوطني']", 520)
c.shot("hall-device-id", "على جهاز المتقدم: يكتب رقمه الوطني ويضغط «دخول»", hl=[("main button[type=submit]:has-text('دخول')", "")], section=HALL)
p.locator("main button[type=submit]:has-text('دخول')").first.click(); c.settle(1800)
c.scroll_to("main :text-is('رمز الاقتران')", 380)
c.shot("hall-device-code", "على جهاز المتقدم: رمز الاقتران الذي يطابقه المشرف", hl=[("main p.font-mono[dir=ltr]", "")], section=HALL)
c.goto("/staff/hall", wait=1800)
s.btn("طلبات الدخول", 900)
c.shot("hall-requests", "طلبات الدخول: طابق الرمز على شاشة المتقدم ثم وافق", hl=[("main button:has-text('موافقة')", "")], section=HALL)
s.btn("موافقة", 5000)
c.scroll_top()
s.btn("بدء الاختبار", 900)
c.shot("hall-start", "بدء الاختبار: المدرجون والحاضرون ومن دخلوا والطلبات المعلّقة", hl=[(f"{D} button:has-text('بدء الاختبار')", "")], section=HALL)
p.locator(f"{D} button:has-text('بدء الاختبار')").last.click(); c.settle(5000)
c.scroll_top()
c.shot("hall-running", "الاختبار جارٍ: الوقت المتبقي، وزر إنهاء الاختبار", hl=[("main button:has-text('إنهاء الاختبار وإغلاق القاعة')", "")], section=HALL)
c.goto("/exam-display/1", wait=2500)
c.shot("hall-display", "شاشة القاعة أثناء الاختبار: الوقت المتبقي والتعليمات، ورمز الدخول في الزاوية", section=HALL)

# the exams' owner follows it live
s.login("munir")
c.goto("/staff/exam/manage/live", wait=2000)
c.shot("ex-live", "الجلسات الفعالة: متابعة فقط، والإدارة من لوحة المشرف", section=EX)

# مروان answers and submits
c.goto("/portal/exam", wait=2500)
p.locator("button:has-text('محاكاة: إجابات ناجحة')").first.click(); c.settle(1000)
p.locator("button:has-text('نعم، سلّم')").first.click(); c.settle(2000)
s.login("nisreen")
c.goto("/staff/hall", wait=1800)
s.btn("المراقبة والتأكيد", 900)
c.shot("hall-monitor", "المراقبة والتأكيد: سلّم — بانتظار التأكيد", hl=[("main tr:has-text('مروان') button:has-text('تأكيد')", "1"), ("main tr:has-text('مروان') button:has-text('لا أؤكد')", "2")], section=HALL)
c.goto("/portal/exam", wait=2500)
p.locator("input#pin").first.fill("1448"); c.settle(300)
c.shot("hall-pin-device", "على جهاز المتقدم: تكتب رمزك فيتأكد تسليمه", hl=[("input#pin", "1"), ("main button[type=submit]:has-text('تأكيد')", "2")], section=HALL)
p.locator("main button[type=submit]:has-text('تأكيد')").first.click(); c.settle(2200)
c.shot("hall-device-done", "تأكّد التسليم على جهاز المتقدم، ونتيجته إن كان الاختبار يعرضها", section=HALL)
c.goto("/staff/hall", wait=1800)
s.btn("إنهاء الاختبار وإغلاق القاعة", 900)
c.shot("hall-end", "إنهاء الاختبار وإغلاق القاعة: لا رجعة فيه", hl=[(f"{D} button:has-text('إنهاء الجلسة نهائياً')", "")], section=HALL)
p.locator(f"{D} button:has-text('إنهاء الجلسة نهائياً')").last.click(); c.settle(5000)
c.scroll_top()
c.shot("hall-ended", "انتهت الجلسة: الحصيلة", section=HALL)

# ═════════════ after the sitting: review, results, statistics, records (munir) ═════════════
s.login("munir")
c.goto("/staff/exam/manage/review", wait=2000)
c.shot("ex-review", "المراجعة والتقارير — تحتاج قراراً: اعتماد إداري أو إلغاء إداري", hl=[("main a:has-text('اعتماد إداري'), main button:has-text('اعتماد إداري')", "")], section=EX)
p.locator("main button:has-text('اعتماد إداري')").first.click(); c.settle(900)
p.locator(f"{D} textarea").first.fill("تحقق المشرف من هويته بعد الجلسة، والتنبيه من انقطاع شبكة القاعة."); c.settle(300)
c.shot("ex-decide", "قرار إداري: ملاحظة القرار إلزامية", hl=[(f"{D} button:has-text('اعتماد')", "")], section=EX)
esc(c, p)
s.btn("الحضور والغياب", 1000)
c.shot("ex-attendance", "الحضور والغياب في كل جلسة عُقدت", hl=[("main tr:has-text('رئيس مجموعة'):has-text('مركز دمشق') button:text-is('الأسماء')", "")], section=EX)
p.locator("main tr:has-text('رئيس مجموعة'):has-text('مركز دمشق') button:text-is('الأسماء')").first.click(); c.settle(1000)
c.shot("ex-attendance-names", "أسماء جلسة: الحاضرون والغائبون", section=EX)
esc(c, p)
s.btn("الحالات المشتبه بها", 1000)
c.shot("ex-suspicious", "الحالات المشتبه بها: محاولات عليها تنبيهات من الجهاز", section=EX)
s.nav("النتائج", 1800)
c.shot("ex-results", "النتائج: المحاولات المؤكَّدة قسماً قسماً، والناجح من نجح في كل الأقسام", hl=[("main tr:has-text('مروان') button:has-text('مراجعة الإجابات')", "")], section=EX)
p.locator("main tr:has-text('مروان') button:has-text('مراجعة الإجابات')").first.click(); c.settle(1200)
c.shot("ex-answers", "إجابات محاولة سؤالاً سؤالاً تحت أقسامها", section=EX)
esc(c, p)
# the oral exam after it: the applicants who passed, their booked times, one result recorded
s.nav("الامتحان الشفهي", 1800)
c.shot("ex-oral", "الامتحان الشفهي: مواعيد الناجحين في المؤتمت أمام لجان صفاتهم، ونتائجهم", hl=[("aside a[href$='/staff/exam/manage/oral']", "1"), ("main [role=radiogroup][aria-label='حال الامتحان الشفهي']", "2")], section=EX)
rec = p.locator("main button:has-text('تسجيل النتيجة')").first
if rec.count():
    rec.click(); c.settle(900)
    p.locator(f"{D} textarea").first.fill("يعرف مجموعته ويحسن التصرف في مواقفها، ويحتاج مراجعة تعليمات التفويج."); c.settle(300)
    c.shot("ex-oral-record", "تسجيل نتيجة الامتحان الشفهي: النتيجة والعلامة وملاحظة اللجنة", hl=[(f"{D} button:has-text('حفظ النتيجة')", "")], section=EX)
    p.locator(f"{D} button:has-text('حفظ النتيجة')").last.click(); c.settle(1200)
s.nav("الإحصائيات", 1800)
p.locator("main select[aria-label='الاختبار']").first.select_option("group-head"); c.settle(1300)
c.shot("ex-stats", "الإحصائيات: المؤدّون والناجحون والمتوسط والوسيط ونسبة النجاح لاختبار واحد", hl=[("main select[aria-label='الاختبار']", "")], section=EX)
c.scroll_to("main h2:has-text('حسب القسم'), main :text-is('حسب القسم')", 110)
c.shot("ex-stats-tables", "حسب القسم والجلسة والمحافظة والسؤال", section=EX)
s.nav("جلسات الاختبار", 1800)
box(p, c, "سجل الجلسات")
c.scroll_to("main button:has-text('سجل الجلسات')", 110)
c.shot("ex-records", "سجل الجلسات: كل فتح وحضور ودخول وتأكيد، ومن أجراه ومتى", section=EX)
s.close()
