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

# K
S='K'

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
for b_ in p.locator("ol li button[aria-expanded='false']").all():
    b_.click(); c.settle(400)
lessons = p.evaluate("[...new Set([...document.querySelectorAll(\"a[href^='/academy/duas/']\")].map(a => a.getAttribute('href').split('/').pop()))]")
print("lessons:", lessons)
for i, l in enumerate(lessons):
    c.goto(f"/academy/duas/{l}", wait=1500)
    if not p.locator("button:has-text('تحديد الدرس كمكتمل')").count(): continue
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
btn("لنبدأ"); btn("التسجيل على القرعة"); btn("لي أنا"); btn("داخل سوريا"); btn("لا، طلب فردي", wait=1200)
p.wait_for_selector("text=هناك ملاحظات تحتاج إلى تعديل", timeout=20000); c.settle(800)
c.scroll_to("text=عدّل الطلب من هنا مباشرة", 160)
c.shot("sc-mahram", "امرأة دون 44 عاماً: يلزم إضافة محرم", hl=[("button:has-text('أضف محرماً لها')", "")], section=S)
c.close()
print("DONE run4")
