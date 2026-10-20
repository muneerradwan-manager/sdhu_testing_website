"""Chapter A: public portal — Chapter B: create account — Chapter C: login/logout — Chapter D: profile."""
from cap import Cap, ROOT
import json
from pathlib import Path

# fresh start: wipe manifest & shots
for f in (ROOT / "shots").glob("*.png"):
    f.unlink()
if (ROOT / "manifest.json").exists():
    (ROOT / "manifest.json").unlink()

c = Cap()
p = c.page


def day(d):
    """The demo's date (None: the real one again); returns the one it replaced. Takes effect on the next page."""
    return p.evaluate("""(d) => { const k = 'sdhu-demo-v1'; const s = JSON.parse(localStorage.getItem(k) || '{}'); const was = s.clock?.today ?? null;
  s.clock = { ...(s.clock || {}), today: d ?? undefined, time: undefined }; localStorage.setItem(k, JSON.stringify(s)); return was; }""", d)


# ───────── A. البوابة العامة ─────────
c.goto("/")
# the opening while the Hajj registration is open (12 August): «ابدأ طلب الحج»; and «تسجيل الدخول» in the bar
was_day = day("2026-08-12")
c.goto("/")
c.shot("home-hero", "الصفحة الرئيسية للمنصة", hl=[("main a[href='/register']", "1"), ("header a:has-text('تسجيل الدخول')", "2")], section="A")
# no registration open (15 September): «تسجيل الدخول» in the opening, in place of the registrations' buttons
day("2026-09-15")
c.goto("/")
c.shot("home-hero-closed", "حين لا يكون التسجيل مفتوحاً: «تسجيل الدخول» في الواجهة مكان زرّي التسجيل، ولا يتكرر في الشريط", hl=[("main a:has-text('تسجيل الدخول')", "")], section="A")
# both registrations over (15 October): the bar's «زائر» says account creation is over for this season
day("2026-10-15")
c.goto("/")
c.click("header button[title='تتصفح زائراً']")
c.shot("home-visitor", "«زائر» في الشريط: إنشاء الحساب متاح دائماً، والتسجيل انتهى لهذا الموسم", hl=[("header button[title='تتصفح زائراً']", "1"), ("header [role=dialog]", "2")], section="A")
p.keyboard.press("Escape"); c.settle(300)
day(was_day)
c.goto("/")
# the live stream from the Two Holy Mosques (YouTube needs a few seconds to start)
p.locator("section button[aria-pressed]:has-text('مباشر من الحرم')").click(); c.settle(12000)
c.shot("home-live", "مباشر من الحرمين: البث الرسمي من المسجد الحرام أو المسجد النبوي", hl=[("[role=dialog][aria-label^='بث مباشر']", "")], section="A")
p.get_by_role("button", name="إغلاق البث", exact=True).click(); c.settle(600)
c.scroll_to("#honours", 100); c.settle(2500)
c.shot("home-honours", "نجوم الموسم: لوحة شرف الموسم الماضي، وسطر الموسم الجاري", hl=[("#honours a:has-text('لوحة الشرف كاملة')", "1")], section="A")
c.scroll_to("#tutorials", 100)
c.shot("home-tutorials", "الفيديوهات التعليمية: تبويب «زائر ثم حاج» وتبويب «إداري»", hl=[("#tutorials [role=tablist]", "")], section="A")
c.scroll_to("#directory", 100)
c.shot("home-directory", "لمحة من التكتلات والمجموعات، و«عرض كل التكتلات والمجموعات»", hl=[("#directory a[href='/clusters']", "")], section="A")
c.scroll_to("section:has-text('تقويم الموسم')", 90)
c.shot("home-calendar", "تقويم الموسم في الصفحة الرئيسية", section="A")
c.scroll_top()
# display scale control
c.shot("home-scale", "التحكم بحجم العرض في الشريط العلوي", hl=[("div[aria-label='حجم العرض']", "تكبير/تصغير")], section="A")
# dark theme: the moon turns the whole platform dark, then the sun brings it back
p.locator("header button[aria-label='الوضع الداكن']").first.click(); c.settle(700)
c.shot("home-theme", "الوضع الداكن: زر الهلال في الشريط العلوي يحوّل المنصة إلى ألوان داكنة", hl=[("header button[aria-label='الوضع الفاتح']", "")], section="A")
p.locator("header button[aria-label='الوضع الفاتح']").first.click(); c.settle(700)
# more menu
p.hover("header button:has-text('المزيد')")
c.settle(600)
c.shot("home-more-menu", "قائمة «المزيد» في شريط التنقل", hl=[("header button:has-text('المزيد')", "")], section="A")
p.mouse.move(10, 400)
# guided tour
c.click("button[aria-label='جولة تعريفية']", wait=2500)
c.shot("tour-1", "الجولة التعريفية — الخطوة الأولى", section="A")
c.click("button:has-text('التالي')", wait=2600)
c.shot("tour-2", "الجولة التعريفية — نجوم الموسم", section="A")
c.click("button[aria-label='إنهاء الجولة']", wait=600)
c.scroll_top()

# conditions
c.goto("/conditions")
c.shot("conditions-top", "صفحة شروط التسجيل والتكاليف", section="A")
# the age ruler on a day after the draw (its switch shows from the direct registration until the confirming
# ends): «القرعة» chosen by itself, 1972 drawn for four months only, March one of them
was = p.evaluate("""() => { const k = 'sdhu-demo-v1'; const s = JSON.parse(localStorage.getItem(k) || '{}'); const was = s.clock?.today ?? null;
  s.clock = { ...(s.clock || {}), today: '2026-10-14', time: undefined }; localStorage.setItem(k, JSON.stringify(s)); return was; }""")
c.goto("/conditions")
c.scroll_to("#ages [role=radiogroup][aria-label='طريقة القبول']", 270)
p.locator("#ages input[type=range]").fill("1972"); c.settle(500)
p.locator("[role=radiogroup][aria-label='شهر الميلاد'] button:has-text('آذار')").click(); c.settle(600)
c.shot("conditions-ruler", "المسطرة التفاعلية: القبول المباشر والقرعة", hl=[("[role=radiogroup][aria-label='طريقة القبول']", "1"), ("#ages input[type=range]", "2"), ("[role=radiogroup][aria-label='شهر الميلاد']", "3")], section="A")
p.evaluate("""(was) => { const k = 'sdhu-demo-v1'; const s = JSON.parse(localStorage.getItem(k) || '{}');
  s.clock = { ...(s.clock || {}), today: was ?? undefined }; localStorage.setItem(k, JSON.stringify(s)); }""", was)
c.goto("/conditions")
c.scroll_to("#precheck", 90)
c.shot("conditions-precheck", "فحص الأهلية المبدئي", section="A")
# the FAQ, a page of its own (from «المزيد»)
c.goto("/faq")
c.shot("faq-page", "صفحة الأسئلة الشائعة", hl=[("main input[placeholder^='ابحث في الأسئلة']", "1"), ("main button:has-text('القبول والقرعة')", "2")], section="A")
# news
c.goto("/news")
c.shot("news", "صفحة الأخبار", section="A")
# prayer
c.goto("/prayer-times")
c.settle(800)
c.shot("prayer", "مواقيت الصلاة واتجاه القبلة، و«مواقيت موقعي» بين المدن", hl=[("main button:has-text('مواقيت موقعي')", "")], section="A")
# guide
c.goto("/guide")
c.shot("guide-top", "دليل المناسك — أقسام الدليل", section="A")
c.scroll_to("#counter", 90)
c.shot("guide-counter", "عدّاد الطواف والسعي", section="A")
c.scroll_to("#bag", 90)
c.shot("guide-bag", "حقيبة الحاج والصحة", section="A")
# results
c.goto("/results")
c.shot("results-top", "صفحة نتائج القبول", section="A")
c.scroll_to("#lists", 90)
c.shot("results-draw", "جدول نتائج القرعة: سنوات الميلاد وأشهرها المسحوبة", hl=[("#lists table", "")], section="A")
c.scroll_to("#search", 90)
c.shot("results-search", "البحث عن النتيجة بالرقم الوطني", section="A")
# verify
c.goto("/verify")
c.scroll_to("div[role='tablist']", 110)
c.shot("verify-entity", "التحقق من جهة معتمدة", section="A")
c.click("button#tab-document")
c.shot("verify-document", "التحقق من إيصال أو شهادة", section="A")
# the services directory: a page of its own in the top bar
c.goto("/clusters")
c.scroll_to("main article", 140)
c.shot("verify-directory", "التكتلات والمجموعات: التكتلات المعتمدة برؤسائها وفرقها ومجموعاتها", hl=[("header a[href='/clusters']", "")], section="A")
# about, umrah
c.goto("/about")
c.shot("about", "صفحة من نحن", section="A")
c.goto("/umrah")
c.shot("umrah", "صفحة العمرة (قريباً)", section="A")
c.goto("/3d")
c.scroll_to("[role=tablist]", 110)
c.shot("tour-3d", "جولة ثلاثية الأبعاد: اختر المكان ثم اضغط «عرض المجسم ثلاثي الأبعاد»", hl=[("button:has-text('عرض المجسم ثلاثي الأبعاد')", "")], section="A")
# academy guest
c.goto("/academy")
c.shot("academy-guest", "الأكاديمية للزائر دون حساب", section="A")

# ───────── B. إنشاء حساب ─────────
c.goto("/register")
c.shot("reg-1-empty", "إنشاء حساب — البيانات الأساسية", hl=[("input[placeholder='01012345412']", "1"), ("input[autocomplete='given-name']", "2"), ("input[type='tel']", "3"), ("input[type='email']", "4"), ("input[type='password']", "5"), ("button[type='submit']", "6")], section="B")
# the demo's ready-made people under the card, one for each situation
c.scroll_to("section[aria-labelledby='demo-accounts']", 110)
c.shot("reg-demo", "بيانات تجريبية لإنشاء حساب: الحالات الست، وأشخاص للحج، وأشخاص للصفات الإدارية", hl=[("section[aria-labelledby='demo-accounts'] h2", "")], section="B")
c.scroll_top()
# validation errors
c.click("button[type='submit']")
c.shot("reg-1-errors", "رسائل التحقق عند ترك الحقول فارغة", section="B")
c.fill("input[placeholder='01012345412']", "01012345412")
c.fill("input[autocomplete='given-name']", "محمد")
c.fill("input[type='tel']", "944345412")
c.fill("input[type='email']", "mohammad@example.com")
c.fill("input[type='password']", "Hajj@1448")
c.shot("reg-1-filled", "البيانات الأساسية بعد التعبئة", hl=[("button[type='submit']", "اضغط هنا")], section="B")
c.click("button[type='submit']", wait=1600)
c.shot("reg-2-otp", "رمز التحقق — الرسالة النصية تظهر في الأعلى", hl=[("input[aria-label='الرقم 1']", "")], section="B")
c.otp("1448")
c.shot("reg-2-otp-filled", "بعد إدخال الرمز", hl=[("button:has-text('تحقق')", "")], section="B")
c.click("button:has-text('تحقق')", wait=1500)
c.shot("reg-3-fetching", "جلب البيانات من الشؤون المدنية", section="B")
p.wait_for_selector("text=هذه بياناتك كما وردت من الشؤون المدنية", timeout=15000)
c.settle(1200)
c.shot("reg-3-data", "بياناتك كما وردت من الشؤون المدنية", hl=[("button:has-text('نعم، بياناتي صحيحة')", "1"), ("button:has-text('البيانات غير صحيحة')", "2")], section="B")
# the correction form, then back: the guide's account keeps the registry's details
c.click("button:has-text('البيانات غير صحيحة')", wait=900)
p.locator("li:has-text('اسم الأم') input[type=checkbox]").first.check()
c.fill("input[aria-label='اسم الأم الصحيح']", "خديجة سعيد")
c.shot("reg-3-correction", "تصحيح البيانات المدنية: الحقل الخاطئ وقيمته الصحيحة، والوثيقة", hl=[("li:has-text('اسم الأم')", "1"), ("label:has-text('نوع الوثيقة')", "2"), ("button:has-text('إرسال للمراجعة ومتابعة')", "3")], full=True, section="B")
c.click("button:has-text('رجوع: بياناتي صحيحة')", wait=900)
c.click("button:has-text('نعم، بياناتي صحيحة')", wait=900)
c.shot("reg-4-extra", "معلومات إضافية اختيارية", section="B")
c.fill("input[placeholder='مثال: سارة (ابنتي)']", "سارة (ابنتي)")
p.locator("label:has-text('هاتف جهة الطوارئ') input").fill("0933000412")
c.settle(300)
c.shot("reg-4-extra-filled", "بعد إدخال جهة الاتصال للطوارئ", hl=[("button:has-text('إنشاء الحساب')", "")], section="B")
c.click("button:has-text('إنشاء الحساب')", wait=1800)
c.shot("reg-5-done", "تم إنشاء الحساب: الحج أو صفة إدارية أو ملفي", hl=[("button:has-text('تقديم طلب حج')", "1"), ("button:has-text('التقدّم لصفة إدارية')", "2"), ("button:has-text('ملفي')", "3")], section="B")

# ───────── D. الملف الشخصي (first look) ─────────
c.click("button:has-text('ملفي')", wait=1500)
c.shot("portal-home", "ملفي — بطاقتك وبطاقة الموسم", section="D")
# before choosing: a member of the platform — its services, and the two ways into the season
c.shot("portal-member", "قبل أن تختار: قائمة العضو في المنصة", hl=[("aside nav", "")], section="D")
# the season's question: محمد took part in 1446, so it asks how he goes on
c.scroll_to("[data-season-choice]", 110)
c.shot("portal-season-choice", "ما تفعله هذا الموسم: أتابع كحاج، أو أفتح ملفاً إدارياً جديداً", hl=[("[data-path='pilgrim']", "1"), ("[data-path='admin']", "2")], section="D")
# the administrators' way, then taken back (nothing was started on it): the guide goes on with the Hajj
c.click("[data-path='admin']", wait=2500)
c.goto("/portal", wait=1500)
c.shot("portal-season-admin", "بعد اختيار المسار الإداري: بطاقته، و«منصة الإداريين» في القائمة", hl=[("button:has-text('غيّرت رأيي')", "")], section="D")
c.click("button:has-text('غيّرت رأيي')", wait=1000)
# a member comments under a news post (the guide's first chapter shows it)
c.goto("/news/academy-launch", wait=2000)
c.scroll_to("#comments-title", 140)
c.fill("section[aria-labelledby='comments-title'] textarea", "جزاكم الله خيراً، بدأت بمسار فقه الحج.")
c.click("button:has-text('نشر التعليق')", wait=900)
c.shot("news-comments", "التعليقات تحت الخبر: تعليقك باسمك، وزر حذفه", hl=[("section[aria-labelledby='comments-title']", "")], section="A")
c.goto("/portal", wait=1500)
c.scroll_top()
c.scroll_by(500)
c.shot("portal-home-2", "ملفي — أسفل بطاقة بياناتك", hl=[("button:has-text('تسجيل الخروج')", "1"), ("button:has-text('إعادة ضبط التجربة')", "2")], section="D")
# his seasons, each opening on what he was in it
c.goto("/portal/history", wait=1500)
p.locator("li button", has_text="موسم 1446").first.click(); c.settle(700)
c.shot("portal-history", "صفحة سجل المواسم: موسم 1446 مفتوحاً", hl=[("nav a[href='/portal/history']", "")], section="D")
c.goto("/portal", wait=1500)
c.scroll_by(500)

# ───────── C. تسجيل الخروج ثم الدخول ─────────
c.click("button:has-text('تسجيل الخروج')", wait=1500)
c.wait_splash()
c.shot("logout-home", "بعد تسجيل الخروج تظهر صفحة تسجيل الدخول", hl=[("header a[href='/register']", "")], section="C")
c.goto("/login")
c.shot("login-empty", "صفحة تسجيل الدخول", hl=[("label:has-text('الرقم الوطني') input", "1"), ("label:has-text('كلمة المرور') input", "2"), ("button[type='submit']", "3")], section="C")
c.fill("label:has-text('الرقم الوطني') input", "01012345412")
c.fill("label:has-text('كلمة المرور') input", "wrong")
c.click("button[type='submit']", wait=700)
c.shot("login-error", "كلمة مرور غير صحيحة", section="C")
c.fill("label:has-text('كلمة المرور') input", "Hajj@1448")
c.click("button[type='submit']", wait=1400)
c.shot("login-otp", "رمز التحقق عند الدخول", section="C")
c.otp("1448")
c.click("main button:text-is('دخول')", wait=1800)
c.shot("login-done", "بعد الدخول: العودة إلى ملفي", hl=[("header a[href='/portal']", "اسمك في الأعلى")], section="C")
# demo panel
c.goto("/login")
c.scroll_to("section[aria-labelledby='demo-accounts']", 110)
c.shot("login-demo", "حسابات تجريبية تحت بطاقة الدخول (للعرض)", hl=[("section[aria-labelledby='demo-accounts'] h2", "")], section="C")

c.save_state(str(ROOT / "state-registered.json"))
c.close()
print("DONE run1")
