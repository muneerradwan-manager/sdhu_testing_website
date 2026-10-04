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
c.shot("season-top", "حالتي الآن — شريط الأيام والأزرار السريعة", section=S)
c.scroll_to("text=أنت في:", 130)
c.shot("season-now", "بطاقة «أنت في» — المكان والتنقل والوجبة التالية وإشعارات اليوم", section=S)
# move to day 3 in Makkah (26 ذو القعدة) so meals, trips and lessons are all there
c.scroll_top()
for _ in range(2):
    p.locator("button[aria-label='اليوم التالي']").click(); c.settle(700)
c.shot("season-day3", "الانتقال بين الأيام: اليوم الثالث في مكة", hl=[("button[aria-label='اليوم التالي']", "1"), ("button[aria-label='اليوم السابق']", "2")], section=S)
c.scroll_to("#meals", 120)
c.shot("season-meals", "وجبات اليوم", section=S)
c.scroll_to("#trips", 120)
c.shot("season-trips", "الحافلات والرحلات", section=S)
# join a trip
b = p.locator("button:has-text('أريد الذهاب')").first
if b.count():
    b.click(); c.settle(900)
    c.shot("season-trip-joined", "بعد تأكيد الرغبة في رحلة", section=S)
c.scroll_to("#lessons", 120)
c.shot("season-lessons", "الدروس اليومية وسؤال شرعي خاص", section=S)
if p.locator("button:has-text('سأحضر')").count():
    btn("سأحضر", wait=800)
btn("سؤال شرعي خاص", wait=800)
c.shot("season-ask", "إرسال سؤال إلى الموجّه الديني", section=S)
btn("إرسال السؤال", wait=800)
c.scroll_to("#lost", 120)
c.shot("season-lost", "قسم المفقودات", section=S)
btn("فقدتُ شيئاً", wait=800)
c.shot("season-lost-form", "نموذج بلاغ المفقودات", hl=[("button:has-text('إرسال البلاغ')", "")], section=S)
btn("إرسال البلاغ", wait=1200)
c.shot("season-lost-ticket", "تذكرة المفقودات ومتابعتها", section=S)
# day scrubber: Arafah
c.scroll_top()
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
c.scroll_to("#tickets", 120)
c.shot("season-tickets", "بلاغاتي وتذاكري", section=S)
# complaint
c.scroll_top()
btn("شكوى", wait=800)
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
c.scroll_top()
btn("العودة", wait=1200)
c.shot("return-day", "يوم العودة: مطار المدينة ثم الهبوط في دمشق", section=S)
# second moment (home)
mm = p.locator("button:has-text('17:10')")
if mm.count():
    mm.first.click(); c.settle(1500)
c.shot("return-home", "حمداً لله على السلامة", section=S)
c.scroll_to("#evaluation", 120)
c.shot("eval-form", "التقييم الشامل للرحلة (13 بنداً)", section=S)
# rate all: star ratings buttons
stars = p.locator("#evaluation li")
n = stars.count()
for i in range(n):
    li = stars.nth(i)
    yes = li.locator("button:has-text('نعم')")
    if yes.count():
        yes.click()
    else:
        li.locator("button").nth(4).click()
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
lessons = ["travel-duas", "talbiyah", "tawaf-duas", "zamzam-maqam"]
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
btn("حفظ في خزنة الوثائق", wait=900)
c.shot("academy-certificate-saved", "حُفظت الشهادة في خزنة الوثائق", section=S)
c.save_state(str(ROOT / "state-final.json"))

# ───────── L. سيناريوهات أخرى ─────────
S = "L"
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
