# -*- coding: utf-8 -*-
"""Administrator guide — run A: a NEW administrator (مروان الحلبي, first season) from the landing page to the result of his automated test.
Usage: CAP_DIR=admin python adm_a.py [keep]"""
import json, sys, time
from cap import Cap, ROOT, truncate

KEEP = int(sys.argv[1]) if len(sys.argv) > 1 else 0
truncate(KEEP)
c = Cap(); p = c.page
ANS = {q["text"]: q["answer"] for q in json.load(open(ROOT / "exam_answers.json", encoding="utf-8"))}
ID = "01033300885"

def btn(text, wait=900, exact=False):
    p.get_by_role("button", name=text, exact=exact).first.click(); c.settle(wait)
def jump():
    """«جرّبها الآن»: an operation outside today's date opens by moving the demo's date to its first day"""
    j = p.locator("main button:has-text('جرّبها الآن')")
    if j.count():
        j.first.click(); c.settle(1500)
def link(text, wait=1200):
    p.get_by_role("link", name=text).first.click(); c.settle(wait)
def field(label):
    return p.locator(f"label:has-text('{label}') input").first

# ───────── landing ─────────
S = "A"
c.goto("/administrator", wait=1500)
c.shot("landing", "بوابة الإداريين: الصفحة الأولى", hl=[("a:has-text('أنشئ حسابك الإداري')", "1"), ("a:has-text('تسجيل الدخول')", "2")], section=S)

# ───────── register ─────────
S = "B"
c.goto("/administrator/register", wait=1500)
c.shot("reg-basic", "إنشاء حساب إداري: البيانات الأساسية", section=S)
field("الرقم الوطني").fill(ID); field("رقم الهاتف").fill("0944300885"); field("كلمة المرور").fill("Admin@1448"); c.settle(300)
c.scroll_to("button:has-text('إرسال رمز التحقق')", 640)
c.shot("reg-basic-filled", "بعد إدخال الرقم الوطني ورقم الهاتف وكلمة المرور", hl=[("button:has-text('إرسال رمز التحقق')", "")], section=S)
btn("إرسال رمز التحقق", wait=1500)
c.otp("1448")
c.shot("reg-otp", "رمز التحقق", hl=[("button:has-text('تحقق')", "")], section=S)
btn("تحقق", wait=800)
p.wait_for_selector("text=بياناتك كما وردت من الشؤون المدنية", timeout=20000); c.settle(1200)
c.shot("reg-civil", "بياناتك من الشؤون المدنية وسجلك الموسمي", hl=[("button:has-text('نعم، أنشئ ملفي الإداري')", "")], section=S)
btn("نعم، أنشئ ملفي الإداري", wait=1800)
c.scroll_top(); c.shot("reg-done", "ملفك الإداري جاهز", hl=[("button:has-text('تقديم طلب المشاركة'), a:has-text('تقديم طلب المشاركة')", "1")], section=S)

# ───────── dashboard (new) ─────────
S = "C"
c.goto("/administrator/dashboard", wait=1800)
c.shot("dash-new", "ملفي كإداري: الخطوة التالية وتقدّم الرحلة", section=S)
c.scroll_by(650)
c.shot("dash-new-2", "رحلتي — من الاختبار إلى الميدان", section=S)

# ───────── logout / login ─────────
S = "B"
c.scroll_top()
lo = p.locator("button:has-text('تسجيل الخروج')").first
lo.scroll_into_view_if_needed(); c.settle(400)
c.shot("dash-logout", "زر تسجيل الخروج في ملفك", hl=[("button:has-text('تسجيل الخروج')", "")], section=S)
lo.click(); c.settle(1800); c.wait_splash()
c.goto("/administrator/login", wait=1500)
c.shot("login", "دخول الإداريين: الرقم الوطني وكلمة المرور", section=S)
field("الرقم الوطني").fill("01099999999"); btn("متابعة", wait=900)
c.shot("login-unknown", "رقم ليس له حساب إداري", section=S)
field("الرقم الوطني").fill(ID); field("كلمة المرور").fill("Admin@1448"); btn("متابعة", wait=1200)
c.otp("1448")
c.shot("login-otp", "رمز التحقق عند الدخول", hl=[("main button:text-is('دخول')", "")], section=S)
btn("دخول", wait=2200, exact=True)
c.save_state(str(ROOT / "admin" / "state-registered.json"))

# ───────── apply ─────────
# The file comes first and opens the roles: the record and the degree open group head and deputy;
# the technical coordinator and the guides stay locked with what they miss.
S = "D"
def upload(label):
    b = p.locator("main li", has_text=label).first.locator("button:text-is('رفع')")
    b.scroll_into_view_if_needed(); b.click(); c.settle(2300)
c.goto("/administrator/apply", wait=1800)
jump()
c.shot("apply-docs", "طلب المشاركة — الخطوة 1: وثائقك وشهاداتك، وبجانب كل وثيقة الصفات التي تفتحها", hl=[("main li:has-text('لا حكم عليه') button:text-is('رفع')", "1")], section=S)
for label in ["لا حكم عليه", "الشهادة الجامعية", "إسعافات أولية"]:
    upload(label)
c.scroll_top(); c.shot("apply-docs-done", "بعد رفع «لا حكم عليه» والشهادة الجامعية ودورة الإسعافات الأولية", section=S)
btn("التالي", wait=1200)
c.scroll_top(); c.shot("apply-skills", "الخطوة 2: لغاتك ومهاراتك، وتحت المهارة الصفات التي تطلبها", section=S)
for label in ["إسعافات أولية", "رعاية كبار السن"]:
    p.locator("main li", has_text=label).first.get_by_role("radio", name="نعم").click(); c.settle(250)
c.scroll_top(); c.shot("apply-skills-set", "تحديد المهارات بنعم أو لا", section=S)
btn("التالي", wait=1200)
c.scroll_to("text=الصفات المتاحة لموسم 1448", 110)
c.shot("apply-role", "الخطوة 3: الصفات التي فتحتها وثائقك، والمقفلة مع ما ينقصها", section=S)
p.locator("button[aria-pressed]:has-text('رئيس مجموعة')").first.click(); c.settle(600)
c.shot("apply-role-picked", "اختيار صفة «رئيس مجموعة»", hl=[("button[aria-pressed='true']", "")], section=S)
btn("التالي", wait=1200)
c.scroll_top(); c.shot("apply-commit", "الخطوة 4: التزامات الإداري", section=S)
p.get_by_text("أوافق على جميع الالتزامات").first.click(); c.settle(500)
c.scroll_top(); c.shot("apply-commit-ok", "الموافقة على جميع الالتزامات", hl=[("button:has-text('تحقق من أهليتي')", "")], section=S)
btn("تحقق من أهليتي", wait=1500)
c.scroll_top(); c.shot("apply-checking", "الخطوة 5: التحقق من الأهلية قبل الدفع", section=S)
p.wait_for_selector("text=ثبتت أهليتك", timeout=30000); c.settle(4000)
c.scroll_to("text=ثبتت أهليتك", 620)
c.shot("apply-eligible", "مستوفٍ لجميع الشروط — ثبتت الأهلية قبل الدفع", hl=[("button:has-text('إلى رسم التسجيل')", "")], section=S)
btn("إلى رسم التسجيل", wait=1200)
c.scroll_top(); c.shot("apply-fee", "الخطوة 6: رسم تسجيل الإداري بعد ثبوت الأهلية", section=S)
btn("شام كاش", wait=700)
p.get_by_text("رقم عملية تجريبي").first.click(); c.settle(400)
p.locator("button:has-text('ادفع وقدّم الطلب')").first.scroll_into_view_if_needed(); c.settle(300); c.shot("apply-fee-sham", "الدفع عبر شام كاش ثم تقديم الطلب", hl=[("button:has-text('ادفع وقدّم الطلب')", "")], section=S)
btn("ادفع وقدّم الطلب", wait=3500)
c.scroll_top(); c.shot("apply-receipt", "تم استلام طلب مشاركتك", hl=[("main button:text-is('متابعة')", "")], section=S)
btn("متابعة", wait=1800, exact=True)
c.scroll_top(); c.shot("apply-summary", "طلبك مقدَّم — مؤهل للاختبار المؤتمت", section=S)
c.save_state(str(ROOT / "admin" / "state-eligible.json"))

# ───────── the automated test: in the hall of his centre ─────────
S = "E"
c.goto("/administrator/exam", wait=1800)
jump()  # the tests' period
jump()  # his sitting's day, half an hour before it
c.scroll_to("main ol:has(li:has-text('يفتح المشرف القاعة'))", 330)
c.shot("exam-hall", "قاعتي وموعدي: القاعة والموعد والمشرف، وأقسام اختبار صفتي ونسبة النجاح في كل قسم", hl=[("button:has-text('محاكاة: يفتح المشرف القاعة')", "")], section=S)
btn("محاكاة: يفتح المشرف القاعة", wait=1600)
c.shot("exam-checkin", "القاعة مفتوحة: سجّل حضورك عند الباب ببطاقتك", hl=[("button:has-text('محاكاة: يمسح المشرف بطاقتك')", "")], section=S)
btn("محاكاة: يمسح المشرف بطاقتك", wait=1400)
p.locator("input[aria-label='الرقم الوطني']").first.fill(ID); c.settle(400)
c.shot("exam-device", "الاختبار الإلكتروني: رقمك الوطني للدخول إلى الاختبار", hl=[("main button[type=submit]:has-text('دخول')", "")], section=S)
p.locator("main button[type=submit]:has-text('دخول')").first.click(); c.settle(1400)
c.shot("exam-pairing", "ابقَ في مقعدك: رمز الاقتران، بانتظار موافقة المشرف", hl=[("button:has-text('محاكاة: يوافق المشرف على دخولك')", "")], section=S)
btn("محاكاة: يوافق المشرف على دخولك", wait=1400)
c.shot("exam-ready", "تمت الموافقة على دخولك: أنت جاهز — لا تغلق هذه الصفحة", hl=[("button:has-text('محاكاة: يبدأ المشرف الاختبار')", "")], section=S)
btn("محاكاة: يبدأ المشرف الاختبار", wait=2000)
c.shot("exam-q1", "شاشة الاختبار: الأقسام في صفحة واحدة، والخيارات بالأحرف، والوقت و«إنهاء وتسليم»", section=S)
# Every question on one page: answer each block, the right option when the answer key knows it
blocks = p.locator("[id^='question-']")
for i in range(blocks.count()):
    b = blocks.nth(i)
    text = b.inner_text()
    ans = next((a for t, a in ANS.items() if t in text), None)
    o = b.locator(f"[role=radio]:has-text('{ans[:40]}')") if ans else None
    if o is not None and o.count():
        o.first.click()
    elif b.locator("[role=radio]").count():
        b.locator("[role=radio]").first.click()
    c.settle(120)
    if i == 2:
        c.shot("exam-answered", "قائمة الأسئلة مقسومة على الأقسام، و«أجبت عن … من …» لكل قسم", section=S)
p.locator("main button:has-text('إنهاء وتسليم'), [aria-label='الاختبار المؤتمت'] button:has-text('إنهاء وتسليم')").last.click(); c.settle(900)
c.shot("exam-confirm", "تأكيد التسليم: بعد التسليم لا يمكنك العودة", section=S)
btn("نعم، سلّم", wait=1800)
c.scroll_top()
pin = p.locator("input#pin").first
pin.fill("0000"); c.settle(300)
p.locator("main button[type=submit]:has-text('تأكيد')").first.click(); c.settle(900)
c.shot("exam-pin-wrong", "رمز خاطئ: عدد المحاولات الباقية", section=S)
pin.fill("1448"); c.settle(300)
c.shot("exam-submitted", "انتهى الاختبار: ارفع يدك، ويكتب المشرف رمزه السري ليؤكد تسليمك", hl=[("main button[type=submit]:has-text('تأكيد')", "")], section=S)
p.locator("main button[type=submit]:has-text('تأكيد')").first.click(); c.settle(6000)  # the toast gone
c.scroll_top()
c.shot("exam-verdict", "تهانينا، اجتزت الاختبار المؤتمت — والخطوة التالية", section=S)
c.scroll_to("main p:has-text('نتيجتك')", 140)
c.shot("exam-result", "تم تأكيد تسليمك — نتيجتك قسماً قسماً: الدرجة والنسبة والمطلوب", section=S)
c.save_state(str(ROOT / "admin" / "state-passed.json"))
c.close()
print("DONE adm_a")
