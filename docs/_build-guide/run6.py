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

# L
S='L'

S = "L"
c.goto("/portal", wait=1000)
btn("تسجيل الخروج", wait=1500)
c.goto("/login", wait=1000)
p.locator("button:has-text('غسان البيطار')").click(); c.settle(2500)
c.goto("/portal/apply", wait=1200)
btn("لنبدأ"); btn("التسجيل على القبول المباشر"); btn("لي أنا"); btn("داخل سوريا"); btn("نعم"); btn("من دفتر العائلة")
c.type_pad("66600620")
btn("اجلب أفراد الأسرة", wait=500)
p.wait_for_selector("text=من سيسافر معك؟", timeout=20000); c.settle(900)
p.get_by_role("button", name="نهى").first.click(); c.settle(500)
p.locator("button:has-text('التالي (')").click(); c.settle(900)
btn("الأفراد صحيحون", wait=1000)
p.wait_for_selector("text=هناك ملاحظات تحتاج إلى تعديل", timeout=20000); c.settle(800)
c.shot("sc-direct-age", "غسان (60 عاماً) اختار القبول المباشر: تنبيه قبل أي دفع", section=S)
c.scroll_to("text=عدّل الطلب من هنا مباشرة", 160)
c.shot("sc-direct-age-fix", "الحل: التسجيل الأولي على القرعة بدلاً من ذلك", hl=[("button:has-text('التسجيل الأولي على القرعة بدلاً من ذلك')", "")], section=S)
btn("التسجيل الأولي على القرعة بدلاً من ذلك", wait=1500)
p.wait_for_selector("text=جميع أفراد الطلب مستوفون للشروط", timeout=25000); c.settle(800)
c.shot("sc-switched-lottery", "حُوّل الطلب إلى القرعة بالأفراد أنفسهم", section=S)
btn("متابعة", wait=1500)
for _ in range(2):
    b_ = p.locator("button:has-text('محاكاة: واف')").first
    if b_.count(): b_.click(); c.settle(400)
c.settle(400)
btn("وافق الجميع", wait=1200)
c.shot("sc-lottery-summary", "ملخص طلب القرعة: رسم التسجيل فقط الآن", section=S)
c.scroll_by(600)
c.shot("sc-lottery-summary2", "الدفعة الأولى عند تثبيت التسجيل إن قُبل الطلب في القرعة", section=S)
# Ghassan was born in April 1966, a year the draw did not take
btn("إلى الدفع", wait=1000)
btn("شام كاش", wait=700)
p.locator("button:has-text('رقم عملية تجريبي')").click(); c.settle(300)
btn("تأكيد الدفع", wait=500)
p.wait_for_selector("text=تقديم الطلب نهائياً", timeout=15000); c.settle(600)
btn("تقديم الطلب نهائياً", wait=200)
c.wait_splash()
p.wait_for_selector("text=لم يُقبل طلبك في قرعة هذا الموسم", timeout=40000); c.settle(1200)
c.scroll_to("text=لم يُقبل طلبك في قرعة هذا الموسم", 260)
c.shot("sc-lottery-not-drawn", "لم تُسحب سنة ميلاد صاحب الطلب: لم يُقبل في قرعة هذا الموسم", hl=[("a:has-text('جدول نتائج القرعة')", "")], section=S)
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
at(9.4); c.shot("sc-lottery-live", "القرعة العلنية ببث مباشر: تتوالى سنوات الميلاد المسحوبة", section=S, wait=0)
at(11.5); c.shot("sc-lottery-won", "قُبلت بالقرعة: سُحبت مواليد 1980 كاملة", section=S, wait=0)
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
