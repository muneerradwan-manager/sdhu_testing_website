# Prepare a store where group 40 is submitted and paid but NOT approved yet (for the staff guide).
from cap import Cap, ROOT
c = Cap(storage=str(ROOT / "admin" / "state-passed.json")); p = c.page
c.goto("/administrator/group", wait=1800)
p.locator("label:has-text('رقم المجموعة') input").first.fill("40")
p.locator("label:has-text('اسم تعريفي') input").first.fill("مجموعة الشام")
for i in range(3):
    br = p.locator("button:has-text('تصفّح الناجحين')").first
    br.scroll_into_view_if_needed(); br.click(); c.settle(900)
    p.locator("button:has-text('دعوة فردية')").first.click(); c.settle(3500)
sb = p.locator("button:has-text('إرسال طلب التشكيل')").first
sb.scroll_into_view_if_needed(); sb.click(); c.settle(1500)
p.get_by_role("button", name="شام كاش").first.click(); c.settle(700)
p.get_by_text("رقم عملية تجريبي").first.click(); c.settle(300)
pay = p.locator("button:has-text('تأكيد الدفع')").first
pay.scroll_into_view_if_needed(); pay.click(); c.settle(3200)
print("receipt visible:", p.locator("button:has-text('متابعة الاعتماد')").count())
c.goto("/", wait=800)
c.save_state(str(ROOT / "staff" / "state-group-submitted.json"))
c.close(); print("DONE prep")
