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
import time
c.goto("/portal", wait=800)
btn("تسجيل الخروج", wait=1200)
c.goto("/login", wait=1000)
p.locator("button:has-text('وائل الدقر')").click(); c.settle(2500)
c.goto("/portal/apply", wait=1500)
btn("سحب الطلب والبدء من جديد", wait=1500)
btn("لنبدأ"); btn("التسجيل على القرعة"); btn("لي أنا"); btn("داخل سوريا"); btn("لا، طلب فردي", wait=1200)
p.wait_for_selector("text=جميع أفراد الطلب مستوفون للشروط", timeout=25000); c.settle(800)
btn("متابعة", wait=1200)
c.shot("sc-lottery-summary-solo", "طلب فردي على القرعة: رسم التسجيل فقط الآن", section=S)
btn("إلى الدفع", wait=1000)
btn("شام كاش", wait=700)
p.locator("button:has-text('رقم عملية تجريبي')").click(); c.settle(300)
btn("تأكيد الدفع", wait=500)
p.wait_for_selector("text=تقديم الطلب نهائياً", timeout=15000); c.settle(600)
btn("تقديم الطلب نهائياً", wait=200)
t0 = time.time()
c.wait_splash()
def at(sec):
    d = t0 + sec - time.time()
    if d > 0: p.wait_for_timeout(int(d*1000))
at(1.2); c.shot("sc-lottery-submitted", "طلب القرعة: مُقدَّم", section=S, wait=0)
at(5.0); c.shot("sc-lottery-eligible", "طلب القرعة: مؤهل بانتظار السحب", section=S, wait=0)
at(8.3); c.shot("sc-lottery-live", "القرعة الإلكترونية ببث مباشر", section=S, wait=0)
at(11.8); c.shot("sc-lottery-won", "تم اختيارك بالقرعة", section=S, wait=0)
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
