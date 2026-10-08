"""The lottery-accepted pilgrim's first steps (chapter L): the seeded demo account وائل الدقر."""
from cap import Cap
c = Cap(); p = c.page; S = "L"
def btn(text, wait=900):
    p.get_by_role("button", name=text).first.click(); c.settle(wait)
c.goto("/login", wait=1200)
p.locator("button:has-text('وائل الدقر')").first.click(); c.settle(2500)
c.goto("/portal/application", wait=2500)
c.scroll_to("#steps", 100)
c.shot("sc-lottery-steps", "المقبول بالقرعة: التأكيد ثم الدفعة الأولى", section=S)
c.scroll_by(250)
p.locator("div.max-h-80.overflow-y-auto").evaluate("el => { el.scrollTop = el.scrollHeight; el.dispatchEvent(new Event('scroll')); }")
c.settle(600)
p.locator("button:has-text('قرأت التعليمات')").click(); c.settle(300)
btn("أؤكد وأوقّع إلكترونياً", wait=2200)
c.settle(3000)
c.scroll_to("#steps", 100)
c.shot("sc-lottery-first-installment", "المقبول بالقرعة يدفع الدفعة الأولى بعد التأكيد", section=S)
c.close()
print("DONE run11")
