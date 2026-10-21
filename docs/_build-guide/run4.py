"""Chapter I: حالتي الآن — Chapter J: return & evaluation — Chapter K: academy — Chapter L: other scenarios."""
import json, sys
from cap import Cap, ROOT

KEEP = int(sys.argv[1]) if len(sys.argv) > 1 else 125
man = json.loads((ROOT/"manifest.json").read_text("utf-8"))
for e in man[KEEP:]:
    f = ROOT/"shots"/e["file"]
    if f.exists(): f.unlink()
(ROOT/"manifest.json").write_text(json.dumps(man[:KEEP], ensure_ascii=False, indent=1), "utf-8")

c = Cap(storage=str(ROOT / "state-accepted.json"))
p = c.page
def btn(text, wait=900, exact=False):
    p.get_by_role("button", name=text, exact=exact).first.click(); c.settle(wait)

# ───────── I. حالتي الآن ─────────
S = "I"
c.goto("/portal", wait=1500)
c.shot("portal-accepted", "ملفي بعد القبول: حالة الطلب في الأعلى", section=S)
c.goto("/portal/application", wait=1500)
c.shot("app-emergency-btn", "زر الطوارئ الثابت في صفحة الطلب بعد صدور التأشيرة", hl=[("button:has-text('طوارئ')", "")], section=S)
c.goto("/portal/season", wait=2000)
c.shot("season-top", "حالتي الآن — شريط الأيام وبطاقة «أنت في»", section=S)
c.scroll_to("text=أنت في:", 130)
c.shot("season-now", "بطاقة «أنت في» — المكان والتنقل والوجبة التالية", section=S)
# move to day 3 in Makkah (26 ذو القعدة) so meals, trips and lessons are all there
c.scroll_top()
for _ in range(2):
    p.locator("button[aria-label='اليوم التالي']").click(); c.settle(700)
c.shot("season-day3", "الانتقال بين الأيام: اليوم الثالث في مكة", hl=[("button[aria-label='اليوم التالي']", "1"), ("button[aria-label='اليوم السابق']", "2")], section=S)
c.goto("/portal/season/rites", wait=1800)
# no team in the demo's field: its simulation records the Umrah of tamattu' the family made
b = p.locator("main button:has-text('محاكاة: يسجّل فريق مجموعتك')")
if b.count():
    b.first.click(); c.settle(1500)
c.scroll_top()
c.shot("season-rites", "أداء المناسك: مناسك حجّك، وما أدّاه كل فرد من عائلتك كما سجّله فريق المجموعة", hl=[("nav[aria-label='أقسام حساب الحاج'] a[href='/portal/season/rites']", "")], section=S)
c.scroll_to("main article", 140)
c.shot("season-rites-log", "سجل أداء المناسك: متى أُدّي المنسك وأين ومن سجّله، وما فعله كل فرد", hl=[("main article >> nth=0", "")], section=S)
# the notifications after it: the rite just recorded heads them
c.goto("/portal/notifications", wait=1800)
c.shot("portal-notifications", "الإشعارات: ما سُجّل في أداء المناسك، وإشعارات اليوم، وما جرى على طلبك، وإعلانات الإدارة", hl=[("nav[aria-label='أقسام حساب الحاج'] a[href='/portal/notifications']", "")], section=S)
c.goto("/portal/season/meals", wait=1800)
c.shot("season-meals", "الوجبات: وجبات اليوم", section=S)
c.goto("/portal/lessons", wait=1800)
c.scroll_to("#lessons", 120)
c.shot("season-lessons", "دروس اليوم وغداً وسؤال شرعي خاص، في أعلى دروس المجموعة", section=S)
if p.locator("#lessons button:has-text('سنحضر')").count():
    p.locator("#lessons button:has-text('سنحضر')").first.click(); c.settle(800)
btn("سؤال شرعي خاص", wait=800)
c.shot("season-ask", "إرسال سؤال إلى الموجّه الديني", section=S)
btn("إرسال السؤال", wait=800)
# the group's lessons and activities, each its page
c.scroll_to("text=دروس قادمة لعائلتك", 160)
c.shot("lessons-page", "دروس المجموعة الدينية: مراحلها، والقادمة لعائلتك ومن يُدعى إليها", hl=[("main button:has-text('سنحضر') >> nth=0", "")], section=S)
c.scroll_to("#record", 120)
c.shot("lessons-record", "سجل حضور العائلة: ما حضره كل فرد من دروسه", section=S)
c.scroll_to("text=الدروس السابقة", 120)
c.shot("lessons-past", "الدروس السابقة: من حضر من عائلتك", section=S)
c.goto("/portal/religious", wait=1800)
p.locator("main details summary").first.click() if p.locator("main details summary").count() else None
c.settle(400)
c.shot("religious-page", "النشاطات الدينية: ما حفظه كل فرد، والتالي، وسجل تسميعه", hl=[("main button:has-text('انضمام') >> nth=0", "")], section=S)
c.goto("/portal/academy", wait=1800)
c.shot("portal-academy", "الأكاديمية في حسابك: تقدّمك في كل مسار والدرس التالي", hl=[("nav[aria-label='أقسام حساب الحاج'] a[href='/portal/academy']", "")], section=S)
c.goto("/portal/season/lost", wait=1800)
c.shot("season-lost", "المفقودات", section=S)
btn("فقدتُ شيئاً", wait=800)
c.shot("season-lost-form", "نموذج بلاغ المفقودات", hl=[("button:has-text('إرسال البلاغ')", "")], section=S)
btn("إرسال البلاغ", wait=1200)
c.shot("season-lost-ticket", "تذكرة المفقودات ومتابعتها", section=S)
# day scrubber: Arafah
c.goto("/portal/season", wait=1800)
btn("عرفة", wait=1500)
c.shot("season-arafah", "يوم عرفة: تنبيهات الحرارة والمكان", section=S)
c.scroll_to("text=أنت في:", 130)
c.shot("season-arafah-now", "بطاقة اليوم في عرفات مع إشعارات الحرارة والازدحام", section=S)
c.scroll_by(700)
c.shot("season-stage-rating", "سؤال قصير لتقييم المرحلة", section=S)
# Eid
c.scroll_top()
btn("العيد", wait=1500)
c.scroll_to("text=أنت في:", 130)
c.shot("season-eid", "يوم النحر: مسار الرمي والهدي", section=S)
# emergency
c.scroll_top()
p.locator("button:has-text('طوارئ')").first.click(); c.settle(900)
c.shot("sos-types", "بلاغ طوارئ: اختر نوع الحالة", section=S)
p.locator("div[role='dialog'] button:has-text('حالة صحية')").click(); c.settle(800)
c.shot("sos-who", "لمن الحالة؟", section=S)
p.locator("div[role='dialog'] button:has-text('خديجة')").first.click(); c.settle(800)
c.shot("sos-location", "الموقع يُرسل تلقائياً", hl=[("button:has-text('أرسل البلاغ الآن')", "")], section=S)
btn("أرسل البلاغ الآن", wait=1500)
c.shot("sos-sent", "البلاغ قيد الاستجابة — الجهات التي وصلها", section=S)
c.settle(11000)
c.shot("sos-onway", "الطبيبة في الطريق — التحديثات لحظياً", section=S)
btn("إغلاق النافذة", wait=800)
c.goto("/portal/season/reports", wait=1800)
c.shot("season-tickets", "بلاغاتي: الطوارئ والشكوى، والبلاغات المفتوحة والمغلقة", hl=[("nav[aria-label='أقسام حساب الحاج'] a[href='/portal/season/reports']", "")], section=S)
# complaint, from «بلاغاتي»
p.locator("main button:has-text('شكوى')").first.click(); c.settle(800)
c.shot("complaint-types", "تقديم شكوى: أنواعها", section=S)
p.locator("div[role='dialog'] button:has-text('الغرفة أو النظافة')").click(); c.settle(700)
p.locator("div[role='dialog'] textarea").fill("التكييف في الغرفة لا يعمل منذ الصباح.")
c.settle(300)
c.shot("complaint-form", "بيانات الشكوى تُعبّأ تلقائياً", hl=[("button:has-text('إرسال الشكوى')", "")], section=S)
btn("إرسال الشكوى", wait=1200)
c.shot("complaint-ticket", "وصلت شكواك — تابعها من التذكرة", section=S)
btn("إغلاق", wait=600)
# ───────── J. العودة والتقييم ─────────
S = "J"
c.goto("/portal/season", wait=1800)
btn("العودة", wait=1200)
c.shot("return-day", "يوم العودة: مطار المدينة ثم الهبوط في دمشق", section=S)
# second moment (home)
mm = p.locator("button:has-text('17:10')")
if mm.count():
    mm.first.click(); c.settle(1500)
c.shot("return-home", "حمداً لله على السلامة", section=S)
c.scroll_to("#evaluation", 120)
c.shot("eval-form", "التقييم الشامل للرحلة (11 بنداً)", section=S)
# rate all: star ratings buttons
stars = p.locator("#evaluation li")
n = stars.count()
for i in range(n):
    li = stars.nth(i)
    yes = li.locator("button:has-text('نعم')")
    # through the page: the demo's date bar at the bottom sits over the lower rows
    if yes.count():
        yes.first.evaluate("b => b.click()")
    else:
        li.locator("button").nth(4).evaluate("b => b.click()")
    p.wait_for_timeout(120)
c.settle(600)
c.scroll_to("#evaluation", 120)
c.shot("eval-filled", "بعد تعبئة جميع البنود", section=S)
c.scroll_to("button:has-text('إرسال التقييم الشامل')", 500)
btn("إرسال التقييم الشامل", wait=2000)
c.scroll_to("text=شهادة أداء الحج", 120)
c.shot("certificates", "شهادة أداء فريضة الحج لكل فرد", section=S)
c.scroll_by(500)
c.shot("permanent-file", "ملفك الدائم — سجل المواسم", section=S)

# ───────── K. الأكاديمية (مسجّل الدخول) ─────────
S = "K"
c.goto("/academy", wait=1500)
c.scroll_to("#search", 100)
p.locator("#search input").first.fill("تغطية الرأس")
c.settle(1200)
c.shot("academy-search", "البحث في كل الدروس", section=S)
c.scroll_to("text=مسارات لرحلة مطمئنة", 100)
c.shot("academy-tracks", "المسارات مع نسبة تقدمك", section=S)
c.goto("/academy/duas", wait=1500)
c.shot("track-top", "صفحة المسار", section=S)
c.scroll_to("text=المستويات والدروس", 100)
c.shot("track-levels", "المستويات والدروس واختبار المستوى", section=S)
# Every lesson of the track, as its page lists them (the certificate opens once all are done)
lessons = []
for h in p.locator("a[href^='/academy/duas/']").evaluate_all("els => els.map(e => e.getAttribute('href'))"):
    slug = h.split("/")[-1].split("#")[0]
    if slug and slug not in lessons:
        lessons.append(slug)
print("lessons:", lessons)
for i, l in enumerate(lessons):
    c.goto(f"/academy/duas/{l}", wait=1500)
    if i == 0:
        c.shot("lesson-top", "صفحة الدرس: المشغّل والشرح المسموع", section=S)
        c.scroll_to("button:has-text('تحديد الدرس كمكتمل')", 300)
        c.shot("lesson-actions", "تحديد الدرس كمكتمل وتقييمه", hl=[("button:has-text('تحديد الدرس كمكتمل')", "")], section=S)
    else:
        c.scroll_to("button:has-text('تحديد الدرس كمكتمل')", 300)
    btn("تحديد الدرس كمكتمل", wait=1200)
    if i == 0:
        c.shot("lesson-done", "أتممت هذا الدرس", section=S)
        c.scroll_by(500)
        c.shot("lesson-tabs", "الملخص والنقاط والأسئلة والأدعية", section=S)
c.goto("/academy/duas", wait=1500)
c.scroll_to("text=المستويات والدروس", 100)
c.shot("track-complete", "المسار مكتمل", section=S)
btn("ابدأ اختبار المستوى", wait=900)
c.shot("quiz-q1", "اختبار المستوى: سؤال من خمسة", section=S)
for q in range(5):
    p.locator("div[role='dialog'] [role='radio']").first.click(); c.settle(500)
    if q == 0:
        c.shot("quiz-feedback", "التغذية الراجعة بعد كل إجابة", section=S)
    nxt = p.locator("div[role='dialog'] button:has-text('السؤال التالي'), div[role='dialog'] button:has-text('عرض النتيجة')")
    nxt.first.click(); c.settle(600)
c.shot("quiz-result", "نتيجة الاختبار", section=S)
btn("إنهاء", wait=600)
c.scroll_to("#certificate", 100)
c.shot("academy-certificate", "شهادة إتمام المسار", hl=[("button:has-text('حفظ في خزنة الوثائق')", "1"), ("button:has-text('طباعة')", "2")], section=S)
# The certificate opens once every level of the track is done; this run takes its first level only
if p.get_by_role("button", name="حفظ في خزنة الوثائق").count():
    btn("حفظ في خزنة الوثائق", wait=900)
    c.shot("academy-certificate-saved", "حُفظت الشهادة في خزنة الوثائق", section=S)
c.save_state(str(ROOT / "state-final.json"))

# ───────── L. سيناريوهات أخرى ─────────
S = "L"
# The season runs on its dates: these cases happen in the lottery's registration, 26 August (the date bar)
c.goto("/portal", wait=800)
p.evaluate("""() => { const k = 'sdhu-demo-v1'; const s = JSON.parse(localStorage.getItem(k) || '{}');
  s.clock = { ...(s.clock || {}), today: '2026-08-26', time: undefined }; localStorage.setItem(k, JSON.stringify(s)); }""")
c.goto("/portal", wait=1000)
btn("تسجيل الخروج", wait=1500)
c.goto("/login", wait=1000)
p.locator("button:has-text('غسان البيطار')").click(); c.settle(2500)
c.shot("sc-notaccepted-apply", "لم يُقبل في القبول المباشر: التسجيل على القرعة بضغطة واحدة", section=S)
c.goto("/portal/application", wait=1500)
c.shot("sc-notaccepted-track", "صفحة الطلب: لم يُقبل مباشرة والدفعة الأولى محفوظة", section=S)
c.scroll_by(350)
c.shot("sc-notaccepted-track2", "زر «سجّل على القرعة بالأفراد أنفسهم»", section=S)
c.goto("/portal/apply", wait=1500)
btn("سجّلني على القرعة", wait=1500)
c.shot("sc-lottery-summary", "ملخص طلب القرعة مع الرصيد المحفوظ", section=S)
c.scroll_by(500)
c.shot("sc-lottery-summary2", "تدفع رسم التسجيل فقط", section=S)
# Wael — lottery accepted
c.goto("/portal", wait=800)
btn("تسجيل الخروج", wait=1200)
c.goto("/login", wait=1000)
p.locator("button:has-text('وائل الدقر')").click(); c.settle(2500)
import time
btn("إعادة المحاكاة", wait=100)
t0 = time.time()
def at(sec):
    d = t0 + sec - time.time()
    if d > 0: p.wait_for_timeout(int(d*1000))
at(5.2); c.shot("sc-lottery-eligible", "طلب القرعة: مؤهل بانتظار السحب", section=S, wait=0)
at(7.8); c.shot("sc-lottery-live", "القرعة الإلكترونية ببث مباشر", section=S, wait=0)
at(11.5); c.shot("sc-lottery-won", "تم اختيارك بالقرعة", section=S, wait=0)
c.settle(1500)
c.scroll_to("#steps", 100)
c.shot("sc-lottery-steps", "المقبول بالقرعة: التأكيد ثم الدفعة الأولى", section=S)
c.scroll_by(250)
p.locator("div.max-h-80.overflow-y-auto").evaluate("el => { el.scrollTop = el.scrollHeight; el.dispatchEvent(new Event('scroll')); }")
c.settle(600)
p.locator("button:has-text('قرأت التعليمات')").click(); c.settle(300)
btn("أؤكد وأوقّع إلكترونياً", wait=2200)
c.scroll_to("#steps", 100)
c.shot("sc-lottery-first-installment", "المقبول بالقرعة يدفع الدفعة الأولى بعد التأكيد", section=S)
# Reem — needs mahram
c.goto("/portal", wait=800)
btn("تسجيل الخروج", wait=1200)
c.goto("/login", wait=1000)
p.locator("button:has-text('ريم النجار')").click(); c.settle(2500)
c.goto("/portal/apply", wait=1200)
btn("لنبدأ"); btn("التسجيل الأولي على القرعة"); btn("لي أنا"); btn("داخل سوريا"); btn("لا، طلب فردي", wait=1200)
p.wait_for_selector("text=هناك ملاحظات تحتاج إلى تعديل", timeout=20000); c.settle(800)
c.scroll_to("text=عدّل الطلب من هنا مباشرة", 160)
c.shot("sc-mahram", "امرأة دون 44 عاماً: يلزم إضافة محرم", hl=[("button:has-text('أضف محرماً لها')", "")], section=S)
c.close()
print("DONE run4")
