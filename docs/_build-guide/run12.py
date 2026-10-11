"""The pilgrim guide's special cases, re-captured on the season's dates (replaces run9.py, the academy's last shot of
run5.py, and the special cases of run6.py/run8.py):
  F  track2-*                 the follow-up of حسن الطباع's direct-acceptance application, with his wife هيام (12 Aug)
  K  academy-certificate-saved every lesson of «الأدعية والأذكار» done, the certificate saved (state-final.json)
  L  sc-direct-age … sc-lottery-not-drawn   غسان البيطار: direct acceptance on 12 Aug, turned to the lottery,
                                            paid and submitted on 26 Aug, not drawn (results shot on 26 Sep)
     sc-lottery-summary-solo … sc-lottery-won  وائل الدقر: a solo lottery application on 26 Aug, drawn
     sc-mahram                                 ريم النجار on 26 Aug
Appends to manifest.json; a rerun first removes this script's own keys (entries and files), nothing else.
Usage: python run12.py [track2|academy|ghassan|wael|reem ...]   (no argument = all)
"""
import json, os, sys, time
from playwright.sync_api import BrowserType

# Cap launches the installed Chrome; where it is missing, Playwright's own Chromium
# (`python -m playwright install chromium`) takes its place — the same engine
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
_launch = BrowserType.launch
def _launch_any(self, *a, **kw):
    if kw.get("channel") == "chrome" and sys.platform == "darwin" and not os.path.exists(CHROME):
        kw.pop("channel")
    return _launch(self, *a, **kw)
BrowserType.launch = _launch_any

from cap import Cap, ROOT, MANIFEST, SHOTS

PARTS = {
    "track2": ["track2-submitted", "track2-checking", "track2-eligible", "track2-direct", "track2-accepted"],
    "academy": ["academy-certificate-saved"],
    "ghassan": ["sc-direct-age", "sc-direct-age-fix", "sc-switched-lottery", "sc-lottery-summary", "sc-lottery-summary2", "sc-lottery-not-drawn"],
    "wael": ["sc-lottery-summary-solo", "sc-lottery-submitted", "sc-lottery-eligible", "sc-lottery-live", "sc-lottery-won"],
    "reem": ["sc-mahram"],
}
run = sys.argv[1:] or list(PARTS)

# The browser must start before anything is removed (Cap uses the installed Chrome)
from playwright.sync_api import sync_playwright
with sync_playwright() as _pw:
    _pw.chromium.launch(channel="chrome", headless=True).close()

# Drop only this script's own earlier shots of the parts being run
mine ={k for part in run for k in PARTS[part]}
man = json.loads(MANIFEST.read_text("utf-8")) if MANIFEST.exists() else []
for e in man:
    if e["key"] in mine:
        f = SHOTS / e["file"]
        if f.exists(): f.unlink()
MANIFEST.write_text(json.dumps([e for e in man if e["key"] not in mine], ensure_ascii=False, indent=1), "utf-8")


def session(storage=None):
    c = Cap(storage=storage)
    p = c.page
    def btn(text, wait=900, exact=False):
        p.get_by_role("button", name=text, exact=exact).first.click(); c.settle(wait)
    def login(name):
        c.goto("/login", wait=1200)
        p.locator(f"button:has-text('{name}')").first.click(); c.settle(2500)
    def setdate(d):
        # The season runs on its dates (the date bar at the foot of the screen)
        p.evaluate("""(d) => { const k = 'sdhu-demo-v1'; const s = JSON.parse(localStorage.getItem(k) || '{}');
          s.clock = { ...(s.clock || {}), today: d, time: undefined }; localStorage.setItem(k, JSON.stringify(s)); }""", d)
    def consents():
        for _ in range(3):
            b_ = p.locator("button:has-text('محاكاة: واف')").first
            if b_.count(): b_.click(); c.settle(400)
        if p.get_by_role("button", name="وافق الجميع").count(): btn("وافق الجميع", wait=1200)
    def pay_and_submit():
        btn("إلى الدفع", wait=1000)
        btn("شام كاش", wait=700)
        p.locator("button:has-text('رقم عملية تجريبي')").click(); c.settle(300)
        btn("تأكيد الدفع", wait=500)
        p.wait_for_selector("text=تقديم الطلب نهائياً", timeout=15000); c.settle(600)
        btn("تقديم الطلب نهائياً", wait=200)
        t0 = time.time(); c.wait_splash()
        def at(sec):
            d = t0 + sec - time.time()
            if d > 0: p.wait_for_timeout(int(d * 1000))
        return at
    return c, p, btn, login, setdate, consents, pay_and_submit


# ── F: متابعة طلب حسن الطباع (القبول المباشر) ──
if "track2" in run:
    S = "F"
    c, p, btn, login, setdate, consents, pay_and_submit = session()
    login("حسن الطباع"); setdate("2026-08-12")
    c.goto("/portal/apply", wait=1500)
    btn("لنبدأ"); btn("التسجيل على القبول المباشر"); btn("لي أنا"); btn("داخل سوريا")
    # Hassan is 69: he needs a named companion in the application — his wife هيام from the family book
    btn("نعم"); btn("من دفتر العائلة")
    c.type_pad("99900440")
    btn("اجلب أفراد الأسرة", wait=500)
    p.wait_for_selector("text=من سيسافر معك؟", timeout=20000); c.settle(900)
    p.get_by_role("button", name="هيام").first.click(); c.settle(500)
    p.locator("button:has-text('التالي (')").click(); c.settle(1200)
    btn("الأفراد صحيحون", wait=1500)
    p.wait_for_selector("text=من سيرافقه؟", timeout=15000)
    p.get_by_role("button", name="هيام").first.click(); c.settle(1200)
    btn("التحقق من الأهلية", wait=1000)
    p.wait_for_selector("text=جميع أفراد الطلب مستوفون للشروط", timeout=25000); c.settle(800)
    btn("متابعة", wait=1500)
    consents()
    at = pay_and_submit()
    at(1.3); c.shot("track2-submitted", "استلمنا طلبك", section=S, wait=0)
    at(3.8); c.shot("track2-checking", "تدقيق البيانات: مطابقة الشؤون المدنية وشروط الموسم", section=S, wait=0)
    at(5.6); c.shot("track2-eligible", "جميع أفراد الطلب مؤهلون", section=S, wait=0)
    # The ages chart: scrolled to show it whole, with the line at the accepted age and the application's place
    # (on the stage's own badge, not a fixed time: this stage is short)
    # The stage's badge is in the page ~1 s before its chart has drawn, and the stage fades ~1.8 s after it
    p.wait_for_selector("text=طلبك ضمن القبول المباشر", state="attached", timeout=15000)
    c.page.evaluate("window.scrollBy({top: 350, behavior: 'instant'})"); p.wait_for_timeout(1150)
    c.shot("track2-direct", "اعتماد القبول المباشر وفق الأكبر سناً", section=S, wait=0)
    p.wait_for_selector("text=مبارك! تم قبول طلبك", timeout=15000)
    c.page.evaluate("window.scrollTo({top: 0, behavior: 'instant'})"); p.wait_for_timeout(1800)
    c.shot("track2-accepted", "مبارك! تم قبول طلبك", section=S, wait=0)
    c.close()

# ── K: حفظ شهادة المسار ──
if "academy" in run:
    S = "K"
    c, p, btn, *_ = session(storage=str(ROOT / "state-final.json"))
    c.goto("/academy/duas", wait=1500)
    # Every level open, then every lesson of the track done: the certificate opens at 7/7
    for b_ in p.locator("button[aria-expanded='false']").all():
        if "المستوى" in b_.inner_text(): b_.click(); c.settle(500)
    lessons = []
    for h in p.locator("a[href^='/academy/duas/']").evaluate_all("els => els.map(e => e.getAttribute('href'))"):
        slug = h.split("/")[-1].split("#")[0]
        if slug and slug not in lessons: lessons.append(slug)
    for l in lessons:
        c.goto(f"/academy/duas/{l}", wait=1500)
        if p.get_by_role("button", name="تحديد الدرس كمكتمل").count():
            c.scroll_to("button:has-text('تحديد الدرس كمكتمل')", 300)
            btn("تحديد الدرس كمكتمل", wait=1200)
    c.goto("/academy/duas", wait=1500)
    c.scroll_to("#certificate", 100)
    # The unlocked certificate, beside the manifest (the guide's «academy-certificate» shows it locked at 4/7)
    extra = ROOT / "extra"; extra.mkdir(exist_ok=True)
    c.page.screenshot(path=str(extra / "academy-certificate-unlocked.png"))
    btn("حفظ في خزنة الوثائق", wait=900)
    c.shot("academy-certificate-saved", "حُفظت الشهادة في خزنة الوثائق", section=S)
    c.close()

# ── L: غسان البيطار — دون عمر القبول المباشر ──
if "ghassan" in run:
    S = "L"
    c, p, btn, login, setdate, consents, pay_and_submit = session()
    login("غسان البيطار"); setdate("2026-08-12")
    c.goto("/portal/apply", wait=1200)
    btn("لنبدأ"); btn("التسجيل على القبول المباشر"); btn("لي أنا"); btn("داخل سوريا"); btn("نعم"); btn("من دفتر العائلة")
    c.type_pad("66600620")
    btn("اجلب أفراد الأسرة", wait=500)
    p.wait_for_selector("text=من سيسافر معك؟", timeout=20000); c.settle(900)
    p.get_by_role("button", name="نهى").first.click(); c.settle(500)
    p.locator("button:has-text('التالي (')").click(); c.settle(900)
    btn("الأفراد صحيحون", wait=1000)
    p.wait_for_selector("text=هناك ملاحظات تحتاج إلى تعديل", timeout=20000); c.settle(800)
    c.scroll_by(320)  # the heading and the failed «عمر القبول المباشر» check together
    c.shot("sc-direct-age", "غسان (60 عاماً) اختار القبول المباشر: تنبيه قبل أي دفع", section=S)
    c.scroll_to("text=عدّل الطلب من هنا مباشرة", 160)
    c.shot("sc-direct-age-fix", "الحل: التسجيل الأولي على القرعة بدلاً من ذلك", hl=[("button:has-text('التسجيل الأولي على القرعة بدلاً من ذلك')", "")], section=S)
    btn("التسجيل الأولي على القرعة بدلاً من ذلك", wait=300)
    c.scroll_top()
    p.wait_for_selector("text=جميع أفراد الطلب مستوفون للشروط", timeout=25000); c.settle(800)
    c.shot("sc-switched-lottery", "حُوّل الطلب إلى القرعة بالأفراد أنفسهم", section=S)
    btn("متابعة", wait=1500)
    consents()
    # The lottery's registration opens 26 August: the application is kept, its payment is made then
    setdate("2026-08-26")
    c.goto("/portal/apply", wait=1800)
    p.wait_for_selector("text=ملخص طلبك قبل الدفع", timeout=15000); c.settle(5500)  # the «تابعنا طلبك» notice gone
    c.shot("sc-lottery-summary", "ملخص طلب القرعة: رسم التسجيل فقط الآن", section=S)
    c.scroll_to("text=المجموع الآن", 330)
    c.shot("sc-lottery-summary2", "الدفعة الأولى عند تثبيت التسجيل إن قُبل الطلب في القرعة", section=S)
    at = pay_and_submit()
    # Ghassan was born in April 1966, a year the draw did not take
    p.wait_for_selector("text=لم يُقبل طلبك في قرعة هذا الموسم", timeout=40000); c.settle(1500)
    # After the results are published: the draw day, 26 September
    setdate("2026-09-26")
    c.goto("/portal/application", wait=1800)
    p.wait_for_selector("text=لم يُقبل طلبك في قرعة هذا الموسم", timeout=20000); c.settle(1200)
    c.shot("sc-lottery-not-drawn", "لم تُسحب سنة ميلاد صاحب الطلب: لم يُقبل في قرعة هذا الموسم", hl=[("a:has-text('جدول نتائج القرعة')", "")], section=S)
    c.close()

# ── L: وائل الدقر — طلب فردي على القرعة من البداية ──
if "wael" in run:
    S = "L"
    c, p, btn, login, setdate, consents, pay_and_submit = session()
    login("وائل الدقر"); setdate("2026-08-26")
    c.goto("/portal/apply", wait=1500)
    if p.get_by_role("button", name="سحب الطلب والبدء من جديد").count():
        btn("سحب الطلب والبدء من جديد", wait=1500)
    btn("لنبدأ"); btn("التسجيل الأولي على القرعة"); btn("لي أنا"); btn("داخل سوريا"); btn("لا، طلب فردي", wait=1200)
    p.wait_for_selector("text=جميع أفراد الطلب مستوفون للشروط", timeout=25000); c.settle(800)
    btn("متابعة", wait=1200)
    consents()
    p.wait_for_selector("text=ملخص طلبك قبل الدفع", timeout=15000); c.settle(600)
    c.shot("sc-lottery-summary-solo", "طلب فردي على القرعة: رسم التسجيل فقط الآن", section=S)
    at = pay_and_submit()
    at(1.3); c.shot("sc-lottery-submitted", "طلب القرعة: مُقدَّم", section=S, wait=0)
    at(5.6); c.shot("sc-lottery-eligible", "طلب القرعة: مؤهل بانتظار السحب", section=S, wait=0)
    # The live board scrolled into view, the applicant's year 1980 lit
    at(7.0); c.scroll_by(420)
    at(8.4); c.shot("sc-lottery-live", "القرعة العلنية ببث مباشر: تتوالى سنوات الميلاد المسحوبة", section=S, wait=0)
    at(11.0); c.scroll_top()
    at(12.8); c.shot("sc-lottery-won", "قُبلت بالقرعة: سُحبت مواليد 1980 كاملة", section=S, wait=0)
    c.close()

# ── L: ريم النجار — امرأة دون 44 عاماً ──
if "reem" in run:
    S = "L"
    c, p, btn, login, setdate, *_ = session()
    login("ريم النجار"); setdate("2026-08-26")
    c.goto("/portal/apply", wait=1200)
    if p.get_by_role("button", name="سحب الطلب والبدء من جديد").count():
        btn("سحب الطلب والبدء من جديد", wait=1500)
    btn("لنبدأ"); btn("التسجيل الأولي على القرعة"); btn("لي أنا"); btn("داخل سوريا"); btn("لا، طلب فردي", wait=1200)
    p.wait_for_selector("text=هناك ملاحظات تحتاج إلى تعديل", timeout=20000); c.settle(800)
    c.scroll_to("text=عدّل الطلب من هنا مباشرة", 520)
    c.shot("sc-mahram", "امرأة دون 44 عاماً: يلزم إضافة محرم", hl=[("button:has-text('أضف محرماً لها')", "")], section=S)
    c.close()

print("DONE run12")
