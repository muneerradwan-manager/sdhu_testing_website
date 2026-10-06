# -*- coding: utf-8 -*-
"""Administrator guide — run A: a NEW administrator (مروان الحلبي, first season) from the landing page to the exam result.
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
c.shot("dash-new-2", "رحلتي — من الامتحان إلى الميدان (13 محطة)", section=S)

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
c.scroll_top(); c.shot("apply-summary", "طلبك مقدَّم — مؤهل للامتحان الكتابي", section=S)
c.save_state(str(ROOT / "admin" / "state-eligible.json"))

# ───────── exam: in the hall of his centre ─────────
S = "E"
c.goto("/administrator/exam", wait=1800)
c.shot("exam-hall", "قاعتي وموعدي: المركز والقاعة والاتجاهات إليها والموعد وهيكل امتحان صفتي", hl=[("button:has-text('محاكاة: يفتح المشرف القاعة')", "")], section=S)
btn("محاكاة: يفتح المشرف القاعة", wait=1800)
c.shot("exam-joined", "دخلت حسابي في القاعة: بانتظار تأكيد المشرف لحضوري", hl=[("button:has-text('محاكاة: يؤكد المشرف حضورك')", "")], section=S)
btn("محاكاة: يؤكد المشرف حضورك", wait=1400)
c.shot("exam-present", "حضوري مؤكد: يبدأ الامتحان للجميع معاً", hl=[("button:has-text('محاكاة: يبدأ المشرف الامتحان')", "")], section=S)
btn("محاكاة: يبدأ المشرف الامتحان", wait=2000)
c.shot("exam-q1", "شاشة الامتحان: القسم ونوع السؤال والوقت", section=S)
seen = set()
for i in range(40):
    text = p.locator("[role=application]").first.inner_text()
    ans = next((a for t, a in ANS.items() if t in text), None)
    box = p.locator("textarea[aria-label='الإجابة التحريرية']")
    if box.count():
        box.first.fill(ans or "أبلغ رئيس المجموعة وغرفة العمليات، وأتابع حتى يُحل الأمر."); c.settle(900)
        if "written" not in seen:
            seen.add("written"); c.shot("exam-writtenq", "سؤال تحريري: أكتب إجابتي ويصححها مصحح", section=S)
    else:
        o = p.locator(f"[role=radio]:has-text('{ans[:40]}')") if ans else None
        if o is not None and o.count(): o.first.click()
        elif p.locator("[role=radio]").count(): p.locator("[role=radio]").first.click()
        c.settle(250)
        if p.locator("[role=radiogroup][aria-label='صح أو خطأ']").count() and "tf" not in seen:
            seen.add("tf"); c.shot("exam-truefalse", "سؤال صح أو خطأ", section=S)
    if i == 1:
        c.shot("exam-answered", "الإجابة وشبكة الأسئلة مقسومة على الأقسام", section=S)
    fin = p.locator("button:has-text('مراجعة وإرسال')")
    if fin.count() and fin.first.is_visible():
        break
    # let the question that leaves finish its exit, or its options are clicked as they vanish
    p.locator("button:text-is('التالي')").last.click(); c.settle(700)
btn("مراجعة وإرسال", wait=900)
c.shot("exam-confirm", "تأكيد إرسال الامتحان نهائياً", section=S)
btn("نعم، أرسل الامتحان", wait=800)
c.shot("exam-grading", "التصحيح التلقائي", section=S)
c.settle(3500)
grade = p.locator("button:has-text('محاكاة: يصحح المصحح الإجابات التحريرية')")
grade.first.scroll_into_view_if_needed(); c.settle(300)
c.shot("exam-provisional", "النتيجة المبدئية: التحريري بانتظار المصحح، ودرجات كل قسم", hl=[("button:has-text('محاكاة: يصحح المصحح الإجابات التحريرية')", "")], section=S)
grade.first.click(); c.settle(1800)
c.scroll_top()
c.shot("exam-written", "نتيجة الامتحان الكتابي بعد التصحيح — بانتظار الشفهي", section=S)
sim = p.locator("button:has-text('محاكاة: نتيجة شفهي ناجحة')")
sim.first.scroll_into_view_if_needed(); c.settle(300)
c.shot("exam-oral-wait", "الامتحان الشفهي بانتظار نتيجة اللجنة", hl=[("button:has-text('محاكاة: نتيجة شفهي ناجحة')", "")], section=S)
sim.first.click(); c.settle(2500)
c.scroll_top()
c.shot("exam-final", "النتيجة النهائية: تهانينا، اجتزت التأهيل", section=S)
c.scroll_by(600)
c.shot("exam-final-2", "تفاصيل النتيجة والخطوة التالية", section=S)
c.save_state(str(ROOT / "admin" / "state-passed.json"))
c.close()
print("DONE adm_a")
