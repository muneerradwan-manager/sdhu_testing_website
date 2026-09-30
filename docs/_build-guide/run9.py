import time
from cap import Cap
c = Cap(); p = c.page; S = "F"
def btn(text, wait=900):
    p.get_by_role("button", name=text).first.click(); c.settle(wait)
c.goto("/login", wait=1200)
p.locator("button:has-text('حسن الطباع')").click(); c.settle(2500)
c.goto("/portal/apply", wait=1500)
btn("لنبدأ"); btn("التسجيل على القبول المباشر"); btn("لي أنا"); btn("داخل سوريا"); btn("لا، طلب فردي", wait=1200)
p.wait_for_selector("text=جميع أفراد الطلب مستوفون للشروط", timeout=25000); c.settle(800)
btn("متابعة", wait=1200)
btn("إلى الدفع", wait=1000)
btn("شام كاش", wait=700)
p.locator("button:has-text('رقم عملية تجريبي')").click(); c.settle(300)
btn("تأكيد الدفع", wait=500)
p.wait_for_selector("text=تقديم الطلب نهائياً", timeout=15000); c.settle(600)
btn("تقديم الطلب نهائياً", wait=200)
t0 = time.time(); c.wait_splash()
def at(sec):
    d = t0 + sec - time.time()
    if d > 0: p.wait_for_timeout(int(d*1000))
at(1.0); c.shot("track2-submitted", "استلمنا طلبك", section=S, wait=0)
at(3.0); c.shot("track2-checking", "تدقيق البيانات: مطابقة الشؤون المدنية وشروط الموسم", section=S, wait=0)
at(5.0); c.shot("track2-eligible", "جميع أفراد الطلب مؤهلون", section=S, wait=0)
at(7.2); c.shot("track2-direct", "اعتماد القبول المباشر وفق الأكبر سناً", section=S, wait=0)
at(10.0); c.shot("track2-accepted", "مبارك! تم قبول طلبك", section=S, wait=0)
c.close(); print("DONE")
