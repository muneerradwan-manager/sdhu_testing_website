# -*- coding: utf-8 -*-
"""Staff guide — part «registration»: the office registration desk (razan, «التسجيل على الحج») and the Hajj
registration file (hiba, «إدارة التسجيل على الحج»).
The desk runs first: razan registers a family in the lottery pre-registration (26 Aug – 10 Sep, reached with
«جرّبها الآن»), and the browser's state is kept, so hiba then finds that application filed under version 1 of the
registration while she changes the registration and publishes version 2.
Usage (from docs/_build-guide): CAP_DIR=<folder> python stf_registration.py"""
from cap import OUTDIR
from stf_common import Staff

STATE_FILE = OUTDIR / "state-registration.json"


def opt_value(select, text):
    """The value of a <select>'s option by its shown text"""
    for o in select.locator("option").all():
        if o.inner_text().strip() == text:
            return o.get_attribute("value")
    raise RuntimeError(f"no option {text!r}")


def wait_toasts(p, ms=6500):
    """Let the toasts of the last action fade before a shot that is not about them"""
    p.wait_for_timeout(ms)


# ═════════════════════ 2. The office desk: razan ═════════════════════
s = Staff(); c, p = s.c, s.p; S = "OFFICE"
s.login("razan")
wait_toasts(p)
c.shot("office-dash-empty", "لوحتي لموظفة إدخال البيانات: «ما سجّلته» فارغ قبل أول طلب", hl=[("main a:has-text('تسجيل حاج جديد')", "1")], section=S)
s.nav("التسجيل على الحج", wait=2000)
c.shot("office-closed", "خارج مدة التسجيل: الصفحة مغلقة، و«جرّبها الآن» في النسخة التجريبية", hl=[("main button:has-text('جرّبها الآن')", "1")], section=S)
s.btn("جرّبها الآن", wait=2500)
p.locator("main button:has-text('01012345412')").first.click(); c.settle(400)
c.shot("office-citizen", "الخطوة 1: الرقم الوطني للمواطن، ثم «بحث» في الشؤون المدنية", hl=[("main input[inputmode=numeric]", "1"), ("main button:has-text('بحث')", "2")], section=S)
s.btn("بحث", wait=2500)
p.locator("main input[type=tel]").first.fill("0944123456"); c.settle(400)
c.scroll_by(260)
c.shot("office-consent", "الخطوة 2: بيانات المواطن من السجل المدني، ورقم هاتفه ليصله رمز الموافقة", hl=[("main input[type=tel]", "1"), ("main button:has-text('إرسال رمز التحقق')", "2")], section=S)
s.btn("إرسال رمز التحقق", wait=1400)
p.locator("main button:text-is('1448')").first.click(); c.settle(500)
c.scroll_by(-150)
c.shot("office-otp", "رمز الموافقة الذي وصل إلى هاتف المواطن، يُدخل أمامه", hl=[("main div[dir=ltr]:has(input)", "1"), ("main button:has-text('تأكيد الموافقة ومتابعة')", "2")], section=S)
s.btn("تأكيد الموافقة ومتابعة", wait=1500)
c.shot("office-members", "الخطوة 3: المرافقون، من دفتر العائلة أو بالرقم الوطني", hl=[("main button:has-text('من دفتر العائلة')", "1"), ("main button:has-text('بالرقم الوطني')", "2")], section=S)
s.btn("من دفتر العائلة", wait=1500)
p.locator("main button:has-text('رقم تجريبي')").first.click(); c.settle(300)
c.shot("office-booklet", "رقم دفتر العائلة (أو تصويره)، ثم «اجلب أفراد الأسرة»", hl=[("main button:has-text('رقم تجريبي')", "1"), ("main button:has-text('اجلب أفراد الأسرة')", "2")], section=S)
s.btn("اجلب أفراد الأسرة", wait=3500)
p.locator("main button:has-text('فاطمة يوسف الحلبي')").first.click(); c.settle(600)
c.shot("office-book-members", "أفراد الدفتر من الشؤون المدنية: اختيار من سيرافقه", hl=[("main button:has-text('فاطمة يوسف الحلبي')", "1"), ("main button:has-text('التالي')", "2")], section=S)
s.btn("التالي", wait=1500)
c.shot("office-members-2", "صاحب الطلب ومرافقته، ثم «افحص الأهلية»", hl=[("main button:has-text('افحص الأهلية')", "1")], section=S)
s.btn("افحص الأهلية", wait=5500)
c.shot("office-elig", "الخطوة 4: فحص الأهلية لكل فرد", section=S)
c.scroll_to("main button:has-text('متابعة')", 520)
c.shot("office-elig-2", "شروط الطلب ككل، ثم «متابعة»", hl=[("main button:has-text('متابعة')", "1")], section=S)
s.btn("متابعة", wait=1600)
c.scroll_to("main h2:has-text('نوع التسجيل والدفع'), main :text('نوع التسجيل والدفع')", 130)
c.shot("office-fee", "الخطوة 5: نوع التسجيل المفتوح في هذا التاريخ، وخطة الدفعات، والمطلوب الآن", hl=[("main button:has-text('التسجيل الأولي على القرعة')", "1")], section=S)
p.locator("main button:has-text('شام كاش')").first.click(); c.settle(900)
p.locator("main button:has-text('رقم عملية تجريبي')").first.click(); c.settle(500)
c.scroll_to("main button:has-text('رقم عملية تجريبي')", 420)
c.shot("office-pay", "الدفع من هاتف المواطن بشام كاش، ورقم العملية، ثم تسجيل الطلب", hl=[("main input[placeholder='رقم العملية في شام كاش']", "1"), ("main button:has-text('تأكيد الدفع وتسجيل الطلب')", "2")], section=S)
p.locator("main button:has-text('تأكيد الدفع وتسجيل الطلب')").first.click(); c.settle(2500)
wait_toasts(p, 4500)
c.scroll_top(); c.scroll_by(200)
c.shot("office-done", "سُجّل الطلب: الإيصال الرقمي باسم المواطن واسم من سجّله", hl=[("main button:has-text('سجّل مواطناً آخر')", "1"), ("main button:has-text('عرض تفاصيل الطلب للتأكد')", "2")], section=S)
s.btn("عرض تفاصيل الطلب للتأكد", wait=2000)
c.scroll_top()
c.shot("office-detail", "تفاصيل الطلب من سجلات المنصة، دون الدخول إلى حساب الحاج", section=S)
c.scroll_to("main :text('الإيصالات والتسديد')", 130)
c.shot("office-detail-2", "الإيصالات والدفعات التي تنتظره، وأفراد الطلب", section=S)
c.scroll_to("aside :text('سجّلتُ')", 200)
c.shot("office-mine", "في جانب الصفحة: ما سجّلتُه، يُفتح كل طلب منه", hl=[("aside button:has-text('عرض التفاصيل')", "1")], section=S)
s.nav("لوحتي", wait=2200)
c.shot("office-dash", "لوحتي: «ما سجّلته» وأين وصل كل طلب", section=S)
c.save_state(str(STATE_FILE))
s.close()


# ═════════════════════ 1. The Hajj registration file: hiba ═════════════════════
s = Staff(storage=STATE_FILE); c, p = s.c, s.p; S = "REG"
s.login("hiba")
wait_toasts(p)
# ── the dashboard ──
c.shot("reg-dash", "لوحة التحكم: «كيف تعمل» في ثلاث خطوات، وأرقام التسجيل", hl=[("aside a[href$='/staff/hajj']", "")], section=S)
c.scroll_by(380)
c.shot("reg-dash-2", "لوحة التحكم: الطلبات حسب حالتها ومسارها ومكتبها، وأين توقف من لم يكمل", section=S)

# ── the registration pages ──
s.nav("صفحات التسجيل", wait=2000)
c.shot("reg-pages", "صفحات التسجيل بترتيبها، وشريط النشر في الأعلى", hl=[("main div.sticky", "1"), ("main a:has-text('إضافة صفحة جديدة')", "2")], section=S)
c.scroll_by(420)
c.shot("reg-pages-2", "الصفحات الأساسية بقفلها، وما تحت كل صفحة من إجراءات", hl=[("main tr:has-text('فحص الأهلية') a:text-is('تعديل')", "")], section=S)
p.locator("main tr:has-text('فحص الأهلية') a:text-is('تعديل')").first.click(); c.settle(2000)
c.shot("reg-page-essential", "صفحة أساسية: تُعدَّل كلماتها ومكانها فقط", hl=[("main p:has-text('صفحة أساسية')", "1")], section=S)
# a new page for those living abroad, with one question
s.nav("إضافة صفحة", wait=2000)
p.locator("input[aria-label='العنوان']").fill("المقيمون خارج سوريا")
p.locator("textarea[aria-label='النص تحت العنوان']").fill("سؤال واحد لمن يقيم خارج سوريا، يساعد مكتبه على التواصل معه.")
c.settle(300)
c.shot("reg-page-new", "إضافة صفحة جديدة: العنوان والسطر تحته", hl=[("input[aria-label='العنوان']", "1"), ("textarea[aria-label='النص تحت العنوان']", "2")], section=S)
s.btn("إضافة سؤال", wait=800)
p.locator("input[placeholder^='مثال: هل يحتاج']").fill("في أي مدينة تقيم؟")
p.locator("button[role=radio]:has-text('نص قصير')").click(); c.settle(400)
c.scroll_to("main h2:has-text('الأسئلة')", 140)
c.shot("reg-page-question", "سؤال جديد: نصه، ونوع الإجابة، وهل هو إلزامي", hl=[("input[placeholder^='مثال: هل يحتاج']", "1"), ("button[role=radio]:has-text('نص قصير')", "2")], section=S)
p.locator("button:has-text('خيارات متقدمة')").click(); c.settle(500)
c.scroll_to("button:has-text('خيارات متقدمة')", 160)
c.shot("reg-page-adv", "خيارات متقدمة: شرط ظهور السؤال، وحدود الإجابة", hl=[("main :text('يظهر السؤال فقط حين')", "1")], section=S)
p.locator("main button:text-is('تم')").first.click(); c.settle(500)
sel = p.locator("aside select").first
sel.select_option(opt_value(sel, "مكان الإقامة والمكتب")); c.settle(300)
p.locator("aside label:has-text('من يقيم خارج سوريا')").click(); c.settle(400)
c.scroll_to("aside section:has-text('مكانها')", 140)
c.shot("reg-page-side", "مكان الصفحة بين الصفحات، ولمن تظهر", hl=[("aside select", "1"), ("aside label:has-text('من يقيم خارج سوريا')", "2")], section=S)
c.scroll_to("main :text('هكذا يراها الحاج')", 140)
c.shot("reg-page-look", "هكذا يراها الحاج، تحت المحرر", section=S)
c.scroll_top()
s.btn("إضافة الصفحة", scope="aside", wait=1200)
wait_toasts(p)
c.shot("reg-page-saved", "حُفظت الصفحة في التعديلات: لا يراها الحجاج قبل النشر", hl=[("main div.sticky", "1")], section=S)
s.nav("صفحات التسجيل", wait=2000)
c.scroll_by(300)
c.shot("reg-pages-new", "الصفحة الجديدة في مكانها، تظهر لمن يقيم خارج سوريا", hl=[("main tr:has-text('المقيمون خارج سوريا')", "")], section=S)

# ── the steps after acceptance ──
s.nav("الخطوات بعد القبول", wait=2000)
c.scroll_top()
c.shot("reg-steps", "الخطوات بعد القبول حتى التأشيرة، بالترتيب", section=S)
p.locator("main tr:has-text('الدفعة الثانية') a:text-is('تعديل')").first.click(); c.settle(2000)
c.shot("reg-step-essential", "خطوة أساسية: تُعدَّل كلماتها فقط", hl=[("main p:has-text('خطوة أساسية')", "1")], section=S)
s.nav("الخطوات بعد القبول", wait=2000)
s.btn("إضافة خطوة", wait=600)
c.shot("reg-step-menu", "إضافة خطوة: إقرار أو أسئلة أو دفعة", hl=[("main a[href*='new=installment']", "1")], section=S)
p.locator("main a[href*='new=installment']").first.click(); c.settle(2000)
p.locator("input[aria-label='العنوان']").fill("الدفعة الثالثة")
p.locator("input[aria-label='السطر القصير']").fill("الدفعة الأخيرة قبل التأشيرة")
c.settle(400)
c.shot("reg-step-new", "خطوة دفعة جديدة: عنوانها وسطرها، ومكانها قبل التأشيرة", hl=[("input[aria-label='العنوان']", "1"), ("aside select", "2"), ("aside button:has-text('إضافة الخطوة')", "3")], section=S)
s.btn("إضافة الخطوة", scope="aside", wait=1500)
wait_toasts(p, 4000)
s.nav("الخطوات بعد القبول", wait=2000)
c.scroll_to("main tr:has-text('الدفعة الثالثة')", 360)
c.shot("reg-steps-new", "الخطوة الجديدة، وتنبيه أنه لا دفعة تستحق فيها بعد", hl=[("main tr:has-text('الدفعة الثالثة')", "")], section=S)

# ── the eligibility rules ──
s.nav("شروط الأهلية", wait=2000)
p.locator("main button:has-text('شروط المنصة الثابتة')").click(); c.settle(500)
c.shot("reg-rules", "شروط الأهلية: ما تضيفه الإدارة، وشروط المنصة الثابتة للاطلاع", hl=[("main a:has-text('إضافة شرط')", "1")], section=S)
p.locator("main a:has-text('إضافة شرط')").first.click(); c.settle(2000)
p.locator("input[aria-label='اسم الشرط']").fill("لا يتجاوز عمر المرافق 75 عاماً")
eds = p.locator("main section").filter(has_text="يُفحص على").first
# ٢. applies to: every member who is not the applicant
eds.locator("button:has-text('إضافة شرط')").nth(0).click(); c.settle(400)
f = eds.locator("select[aria-label='ما يُقرأ']").nth(0); f.select_option(opt_value(f, "الفرد هو صاحب الطلب")); c.settle(300)
v = eds.locator("select[aria-label='القيمة']").nth(0); v.select_option("false"); c.settle(300)
# ٣. and must: the member's age at most 75
eds.locator("button:has-text('إضافة شرط')").nth(1).click(); c.settle(400)
f = eds.locator("select[aria-label='ما يُقرأ']").nth(1); f.select_option(opt_value(f, "عمر الفرد")); c.settle(300)
o = eds.locator("select[aria-label='المقارنة']").nth(1); o.select_option("lte"); c.settle(300)
eds.locator("input[aria-label='القيمة']").first.fill("75"); c.settle(300)
p.locator("textarea[aria-label='الرسالة']").fill("لا يتجاوز عمر المرافق هذا الموسم 75 عاماً. أزل هذا الفرد من الطلب أو اختر مرافقاً آخر.")
c.settle(400)
c.scroll_top(); c.scroll_by(190)
c.shot("reg-rule-new", "شرط جديد: على من يُفحص، ومتى ينطبق، وما يجب، ورسالته", hl=[("main section:has-text('يُفحص على') select[aria-label='المقارنة'] >> nth=1", "1"), ("textarea[aria-label='الرسالة']", "2")], section=S)
p.locator("aside button:has-text('جرّبه على عائلة')").click(); c.settle(500)
c.settle(800)
c.scroll_to("aside section:has-text('إن لم يتحقق')", 140)
c.shot("reg-rule-side", "إن لم يتحقق: يمنع أم ينبّه، والحل المقترح، وتجربته على عائلة", hl=[("aside section:has-text('إن لم يتحقق') label:has-text('يمنع تقديم الطلب')", "1"), ("aside select[aria-label='العائلة']", "2")], section=S)
c.scroll_top()
s.btn("إضافة الشرط", scope="aside", wait=1500)
wait_toasts(p, 4000)
s.nav("شروط الأهلية", wait=2000)
c.shot("reg-rules-new", "الشرط المضاف في القائمة: على من، وإن لم يتحقق، وحالته", hl=[("main tr:has-text('لا يتجاوز عمر المرافق')", "")], section=S)

# ── payments and tracks: three installments ──
s.nav("الدفعات والمسارات", wait=2000)
c.shot("reg-pay", "الدفعات والمسارات: تكلفة الحج ودفعتاها كما نُشرتا", hl=[("select[aria-label='عدد الدفعات']", "1")], section=S)
cnt = p.locator("select[aria-label='عدد الدفعات']"); cnt.select_option("3"); c.settle(600)
# the old amounts kept by mistake: nothing is left for the third
p.locator("input[aria-label='مبلغ الدفعة 1 للفرد']").fill("3500")
p.locator("input[aria-label='مبلغ الدفعة 2 للفرد']").fill("1250")
p.locator("input[placeholder='مثال: عند الانضمام إلى مجموعة']").nth(1).fill("قبل صدور التأشيرة")
c.settle(500)
c.scroll_to("select[aria-label='عدد الدفعات']", 200)
c.shot("reg-pay-three", "ثلاث دفعات: مبلغ كل دفعة، والخطوة التي تُدفع فيها، وموعدها كما يقرؤه الحاج", hl=[("select[aria-label='عدد الدفعات']", "1"), ("input[aria-label='مبلغ الدفعة 1 للفرد']", "2"), ("input[aria-label='مبلغ الدفعة 2 للفرد']", "3")], section=S)
s.btn("حفظ التغييرات", wait=1500)
c.scroll_top()
c.shot("reg-pay-error", "خطأ يمنع النشر: لا يبقى شيء للدفعة الأخيرة", hl=[("main div.sticky button:has-text('ما الذي يجب إصلاحه؟')", "1")], section=S)
s.btn("ما الذي يجب إصلاحه؟", scope="main div.sticky", wait=900)
c.shot("reg-pay-fix", "ما الذي يجب إصلاحه قبل النشر، ورابط «أصلحها»", hl=[("a:has-text('أصلحها')", "")], section=S)
p.locator("a:has-text('أصلحها')").first.click(); c.settle(2000)
p.locator("input[aria-label='مبلغ الدفعة 1 للفرد']").fill("2500"); c.settle(500)
c.scroll_to("select[aria-label='عدد الدفعات']", 200)
c.shot("reg-pay-fixed", "الدفعة الأولى 2,500 $، فتبقى للثالثة 1,000 $", hl=[("input[aria-label='مبلغ الدفعة 1 للفرد']", "1"), ("main span:has-text('الباقي:')", "2")], section=S)
s.btn("حفظ التغييرات", wait=1500)
wait_toasts(p, 3000)
c.scroll_to("main h2:has-text('الدفع')", 140)
c.shot("reg-pay-methods", "طرق الدفع، وخطوة الهدي والسكن الخاص، ومسارا التسجيل", section=S)
c.scroll_to("main :text('مواعيد التسجيل')", 140)
c.shot("reg-pay-dates", "مواعيد التسجيل: مسار القبول المباشر ومسار القرعة", section=S)

# ── preview and publish ──
c.scroll_top()
c.shot("reg-bar", "شريط النشر: التعديلات التي لم تُنشر، ومعاينة، ونشر، وتجاهل", hl=[("main div.sticky a:has-text('معاينة')", "1"), ("main div.sticky button:has-text('نشر التغييرات')", "2"), ("main div.sticky button:has-text('تجاهلها')", "3")], section=S)
p.locator("main div.sticky a:has-text('معاينة')").first.click(); c.settle(2500)
sel = p.locator("main select").first
sel.select_option(opt_value(sel, "نادر العلي — مقيم في تركيا")); c.settle(1500)
c.shot("reg-preview", "المعاينة: التسجيل كما يراه الحاج، بحاج تجريبي تختاره", hl=[("main select", "1"), ("main button:has-text('من البداية')", "2")], section=S)
for t in ["لنبدأ", "التسجيل الأولي على القرعة", "لي أنا", "في تركيا"]:
    b = p.locator(f"main button:has-text('{t}')").filter(visible=True).first
    b.scroll_into_view_if_needed(); b.click(); c.settle(1800)
c.scroll_top()
c.shot("reg-preview-page", "في المعاينة: الصفحة الجديدة تظهر لمن يقيم في تركيا", hl=[("main :text('في أي مدينة تقيم؟')", "1")], section=S)
s.btn("نشر التغييرات", scope="main div.sticky", wait=900)
p.locator("textarea[placeholder^='مثال: إضافة سؤال السكن']").fill("ثلاث دفعات، وصفحة للمقيمين خارج سوريا، وشرط عمر المرافق")
c.settle(400)
c.shot("reg-publish", "نشر التغييرات: ما سيتغيّر عند الحجاج، ومتى، وملاحظة للسجل", hl=[("label:has(input[type=radio]):has-text('الآن')", "1"), ("textarea[placeholder^='مثال: إضافة سؤال السكن']", "2"), ("button:has-text('نشر الآن')", "3")], section=S)
p.locator("button:has-text('نشر الآن')").first.click(); c.settle(1200)
c.shot("reg-published", "نُشرت التغييرات: كل شيء منشور", hl=[("main div.sticky", "1")], section=S)
wait_toasts(p)

# ── the applications: the one filed before keeps its version ──
s.nav("الطلبات", wait=2200)
c.shot("reg-apps", "الطلبات: حالة كل طلب، والمرحلة التي يراها صاحبه، وإصداره", hl=[("main tr:has-text('محمد أحمد الخطيب') td:nth-child(6)", "")], section=S)
p.locator("main tr:has-text('محمد أحمد الخطيب') button").first.click(); c.settle(1500)
c.shot("reg-app-drawer", "تفاصيل الطلب: إصداره، وأفراده، وإجاباته، وشروطه المحفوظة", section=S)
p.keyboard.press("Escape"); c.settle(800)

# ── versions and seasons ──
s.nav("الإصدارات والمواسم", wait=2200)
p.locator("main button:has-text('ما الذي تغيّر')").first.click(); c.settle(700)
c.shot("reg-history", "الإصدارات: الإصدار 2 يظهر الآن، وما الذي تغيّر فيه، والإصدار 1 سابق", hl=[("main button:has-text('إخفاء التغييرات')", ""), ("main tr:has-text('إعدادات موسم 1448') button:has-text('الرجوع إليه')", "")], section=S)
c.scroll_to("main button:has-text('سجل النشاط')", 140)
c.shot("reg-history-log", "سجل النشاط: كل تعديل باسم من قام به ووقته، وإعداد موسم جديد", section=S)
c.scroll_top()
p.locator("main tr:has-text('إعدادات موسم 1448') button:has-text('الرجوع إليه')").first.click(); c.settle(1200)
c.shot("reg-restore", "الرجوع إلى الإصدار 1: يعود إلى التعديلات، ولا يراه الحجاج قبل نشره", hl=[("main div.sticky", "1")], section=S)
wait_toasts(p, 4000)
s.btn("تجاهلها", scope="main div.sticky", wait=900)
c.shot("reg-discard", "تجاهل التعديلات: يعود كل شيء كما يراه الحجاج الآن", hl=[("div[role=dialog] button:text-is('تجاهلها'), .fixed button:text-is('تجاهلها')", "1")], section=S)
p.locator("div[role=dialog] button:text-is('تجاهلها'), .fixed button:text-is('تجاهلها')").last.click(); c.settle(1200)
s.close()
