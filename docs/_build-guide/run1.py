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

# ───────── A. البوابة العامة ─────────
c.goto("/")
c.shot("home-hero", "الصفحة الرئيسية للمنصة", hl=[("header a[href='/register']", "1"), ("header a[href='/login']", "2")], section="A")
c.scroll_to("#services", 100)
c.shot("home-services", "بطاقات الخدمات في الصفحة الرئيسية", section="A")
c.scroll_to("section:has-text('تقويم الموسم')", 90)
c.shot("home-calendar", "تقويم الموسم في الصفحة الرئيسية", section="A")
c.scroll_top()
# display scale control
c.shot("home-scale", "التحكم بحجم العرض في الشريط العلوي", hl=[("div[aria-label='حجم العرض']", "تكبير/تصغير")], section="A")
# more menu
p.hover("header button:has-text('المزيد')")
c.settle(600)
c.shot("home-more-menu", "قائمة «المزيد» في شريط التنقل", hl=[("header button:has-text('المزيد')", "")], section="A")
p.mouse.move(10, 400)
# guided tour
c.click("button[aria-label='جولة تعريفية']", wait=2500)
c.shot("tour-1", "الجولة التعريفية — الخطوة الأولى", section="A")
c.click("button:has-text('التالي')", wait=2600)
c.shot("tour-2", "الجولة التعريفية — البوابة العامة", section="A")
c.click("button[aria-label='إنهاء الجولة']", wait=600)
c.scroll_top()

# conditions
c.goto("/conditions")
c.shot("conditions-top", "صفحة شروط التسجيل والتكاليف", section="A")
c.scroll_to("#precheck", 90)
c.shot("conditions-precheck", "فحص الأهلية المبدئي", section="A")
# news
c.goto("/news")
c.shot("news", "صفحة الأخبار", section="A")
# prayer
c.goto("/prayer-times")
c.settle(800)
c.shot("prayer", "مواقيت الصلاة واتجاه القبلة", section="A")
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
c.scroll_to("#search", 90)
c.shot("results-search", "البحث عن النتيجة بالرقم الوطني", section="A")
# verify
c.goto("/verify")
c.scroll_to("div[role='tablist']", 110)
c.shot("verify-entity", "التحقق من جهة معتمدة", section="A")
c.click("button#tab-document")
c.shot("verify-document", "التحقق من إيصال أو شهادة", section="A")
c.click("button#tab-directory")
c.shot("verify-directory", "دليل الخدمات المعتمد", section="A")
# about, umrah
c.goto("/about")
c.shot("about", "صفحة من نحن", section="A")
c.goto("/umrah")
c.shot("umrah", "صفحة العمرة (قريباً)", section="A")
# academy guest
c.goto("/academy")
c.shot("academy-guest", "الأكاديمية للزائر دون حساب", section="A")

# ───────── B. إنشاء حساب ─────────
c.goto("/register")
c.shot("reg-1-empty", "إنشاء حساب — البيانات الأساسية", hl=[("input[placeholder='01012345412']", "1"), ("input[placeholder='09xxxxxxxx']", "2"), ("input[type='email']", "3"), ("input[type='password']", "4"), ("button[type='submit']", "5")], section="B")
# validation errors
c.click("button[type='submit']")
c.shot("reg-1-errors", "رسائل التحقق عند ترك الحقول فارغة", section="B")
c.fill("input[placeholder='01012345412']", "01012345412")
c.fill("input[placeholder='09xxxxxxxx']", "0944345412")
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
c.click("button:has-text('نعم، بياناتي صحيحة')", wait=900)
c.shot("reg-4-extra", "معلومات إضافية اختيارية", section="B")
c.fill("input[placeholder='مثال: سارة (ابنتي)']", "سارة (ابنتي)")
p.locator("label:has-text('هاتف جهة الطوارئ') input").fill("0933000412")
c.settle(300)
c.shot("reg-4-extra-filled", "بعد إدخال جهة الاتصال للطوارئ", hl=[("button:has-text('إنشاء الحساب')", "")], section="B")
c.click("button:has-text('إنشاء الحساب')", wait=1800)
c.shot("reg-5-done", "تم إنشاء الحساب", hl=[("button:has-text('تقديم طلب حج الآن')", "1"), ("button:has-text('ملفي')", "2")], section="B")

# ───────── D. الملف الشخصي (first look) ─────────
c.click("button:has-text('ملفي')", wait=1500)
c.shot("portal-home", "ملفي — الصفحة الرئيسية لحساب الحاج", section="D")
c.scroll_by(500)
c.shot("portal-home-2", "ملفي — سجل المواسم والإشعارات وروابط سريعة", hl=[("button:has-text('تسجيل الخروج')", "1"), ("button:has-text('إعادة ضبط التجربة')", "2")], section="D")

# ───────── C. تسجيل الخروج ثم الدخول ─────────
c.click("button:has-text('تسجيل الخروج')", wait=1500)
c.wait_splash()
c.shot("logout-home", "بعد تسجيل الخروج تظهر صفحة دخول الحجاج", hl=[("header a[href='/register']", "")], section="C")
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
