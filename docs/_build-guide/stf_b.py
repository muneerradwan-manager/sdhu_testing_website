# -*- coding: utf-8 -*-
"""Staff guide — run B: «إدارة الامتحانات» and the hall (E), «إدارة الإداريين» (F, G), audit and the executive board (H).
Usage: CAP_DIR=staff python stf_b.py <keep> [part]"""
import sys
from cap import Cap, ROOT, truncate
from stf_a import Staff

truncate(int(sys.argv[1]))
ONLY = sys.argv[2] if len(sys.argv) > 2 else None
D = "[role=dialog]"

def esc(c, p, n=1):
    for _ in range(n):
        p.keyboard.press("Escape"); c.settle(600)

# ───────── E. «إدارة الامتحانات» (munir), and a sitting in the hall of مركز دمشق (nisreen) ─────────
if ONLY in (None, "e"):
    # مروان (eligible, from the administrator run) waits for his exam in مركز دمشق
    s = Staff(storage=str(ROOT / "admin" / "state-eligible.json")); c, p = s.c, s.p; S = "E"
    s.login("munir")
    c.goto("/staff/exam", wait=2000)
    c.shot("ex-top", "ملخص الامتحانات: أرقام الامتحان، وما ينتظرك الآن", hl=[("aside a[href$='/staff/exam']", "1"), ("aside a[href$='/staff/exam/manage']", "2")], section=S)
    c.scroll_to("main h2:has-text('المراكز')", 120)
    c.shot("ex-summary", "المراكز ومشرفو قاعاتها، والامتحانات وحال كل منها", section=S)
    c.goto("/staff/exam/manage", wait=1800)
    c.shot("ex-centers", "المراكز الامتحانية: أولى عمليات إدارة الامتحانات في القائمة الجانبية", hl=[("aside a[href$='/staff/exam/manage']", "")], section=S)
    p.locator("main li:has-text('مركز دمشق') button:has-text('تعديل')").first.click(); c.settle(1200)
    mp = p.locator(f"{D} [role=application]").first
    mp.scroll_into_view_if_needed(); c.settle(2500)
    c.shot("ex-center", "تعديل مركز: قاعته وموقعها على الخريطة، والمحافظات التي يخدمها، ومقاعده ومشرف قاعته", hl=[(f"{D} [role=application]", "")], section=S)
    esc(c, p)
    c.goto("/staff/exam/manage/exams", wait=1800)
    c.shot("ex-exams", "الامتحانات: لكل صفة امتحانها الأساسي بموعده ومدته وأسئلته ومراكزه", section=S)
    p.locator("main li button:has-text('تعديل')").first.click(); c.settle(1200)
    c.shot("ex-exam", "تعديل امتحان: اسمه وموعده ومدته ومراكزه", section=S)
    p.locator(f"{D} input[aria-label='اسم القسم']").first.scroll_into_view_if_needed(); c.settle(500)
    c.shot("ex-exam-sections", "أقسام الامتحان: وزن كل قسم، والتصنيفات التي يُسحب منها، وعدد أسئلته من كل نوع", section=S)
    esc(c, p)
    c.goto("/staff/exam/manage/bank", wait=1800)
    c.shot("ex-bank", "بنك الأسئلة: اختيار من متعدد وصح وخطأ، والتصفية بالصفة والتصنيف والنوع", hl=[("main button:has-text('سؤال جديد')", "")], section=S)
    s.btn("سؤال جديد", 900)
    c.scroll_to("main h3:has-text('سؤال جديد'), main :text-is('سؤال جديد')", 120)
    c.shot("ex-bank-new", "سؤال جديد: نوعه وتصنيفه والصفات التي يدخل امتحانها، ونصه وإجابته", section=S)
    c.goto("/staff/exam/manage/people", wait=1800)
    c.shot("ex-people", "المتقدمون: مركز كل متقدم وحاله، والنقل إلى مركز آخر", section=S)
    # the hall
    s.login("nisreen")
    c.goto("/staff/hall", wait=1800)
    c.shot("hall-idle", "قاعتي الامتحانية: امتحانات المركز ومؤشرات الجلسة وفتح القاعة", hl=[("main button:has-text('فتح القاعة')", "")], section=S)
    s.btn("فتح القاعة", 1200)
    c.goto("/administrator/exam", wait=2200)
    c.goto("/staff/hall", wait=1800)
    b = p.locator("main button:has-text('تأكيد الحضور')").first
    b.scroll_into_view_if_needed(); c.settle(300)
    c.shot("hall-joined", "متقدم فتح حسابه في القاعة: مطابقة الهوية وتأكيد الحضور", hl=[("main button:has-text('تأكيد الحضور')", "")], section=S)
    b.click(); c.settle(900)
    s.btn("بدء الامتحان", 1500)
    c.goto("/administrator/exam", wait=2200)
    for i in range(40):
        box = p.locator("textarea[aria-label='الإجابة التحريرية']")
        if box.count():
            box.first.fill("أهدّئ الحاج، وأبحث معه في الغرفة والفندق، وأبلغ المعاون وغرفة العمليات عبر المنصة، وأنسّق مع البعثة لوثيقة بديلة.")
            c.settle(800)
        elif p.locator("[role=application] [role=radio]").count():
            p.locator("[role=application] [role=radio]").first.click(timeout=5000); c.settle(200)
        nxt = p.locator("button:text-is('التالي')")
        if i >= 9 or not nxt.count():
            break
        # let the question that leaves finish its exit, or its options are clicked as they vanish
        nxt.last.click(); c.settle(700)
    c.goto("/staff/hall", wait=1800)
    c.scroll_top()
    c.shot("hall-running", "الامتحان جارٍ: العدّاد واحد للقاعة، وتقدّم كل متقدم", hl=[("main button:has-text('إنهاء الامتحان')", "")], section=S)
    s.btn("إنهاء الامتحان", 600)
    s.btn("تأكيد الإنهاء", 1500)
    c.shot("hall-ended", "انتهى الامتحان: أُرسلت الأوراق وصُحّحت المؤتمتة", hl=[("main button:has-text('إغلاق القاعة')", "")], section=S)
    s.btn("إغلاق القاعة", 1500)
    c.shot("hall-closed", "أُغلقت القاعة: الحاضرون والغائبون", section=S)
    # the results
    s.login("munir")
    c.goto("/staff/exam/manage/results", wait=2000)
    c.shot("ex-results", "النتائج والشفهي: قواعد النجاح، وما ينتظر الشفهي والإعلان", section=S)
    c.scroll_to("main h2:has-text('أيام الامتحان الشفهي')", 120)
    c.shot("ex-oral-days", "أيام الامتحان الشفهي: مقاعد كل يوم وساعته ومكانه، ومن حجز فيه", section=S)
    c.scroll_top()
    p.locator("main [role=radio]:has-text('بانتظار الشفهي')").first.click(); c.settle(900)
    b = p.locator("main button:has-text('إدخال الشفهي')").first
    b.scroll_into_view_if_needed(); c.settle(300)
    c.shot("ex-oral-row", "متقدّم بانتظار نتيجة الشفهي", hl=[("main button:has-text('إدخال الشفهي')", "")], section=S)
    b.click(); c.settle(900)
    dlg = p.locator(D).last
    dlg.locator("input[aria-label='درجة الشفهي رقماً']").first.fill("82"); c.settle(400)
    c.shot("ex-oral", "إدخال درجة الشفهي واللجنة والملاحظات", section=S)
    dlg.locator("button:has-text('حفظ النتيجة')").first.click(); c.settle(1200)
    p.locator("main [role=radio]:has-text('جاهزة للإعلان')").first.click(); c.settle(900)
    an = p.locator("main button:text-is('إعلان')").first
    an.scroll_into_view_if_needed(); c.settle(300)
    c.shot("ex-announce", "إعلان النتيجة النهائية للمتقدّم", hl=[("main button:text-is('إعلان')", "")], section=S)
    # the announcement's toast leaves before the rules are shown
    an.click(); c.settle(5800)
    c.scroll_top()
    s.btn("تعديل القواعد", 1000)
    c.shot("ex-rules", "قواعد النجاح: علامة النجاح، وحد الكتابي، ووزنا الكتابي والشفهي", section=S)
    esc(c, p)
    c.scroll_to("main h2:has-text('سجل النتائج')", 120)
    c.shot("ex-records", "سجل النتائج: كل تغيير في هذا الجزء، ومن أجراه ومتى", section=S)
    s.close()

# ───────── F. «إدارة الإداريين» (maher): the summary, the rules, the reference lists and references, the cadre, the applicants, evaluation, grading ─────────
if ONLY in (None, "f"):
    s = Staff(); c, p = s.c, s.p; S = "F"
    s.login("maher")
    c.goto("/staff/admins", wait=2000)
    c.shot("adm-top", "ملخص الإداريين: أرقامهم، وما ينتظرك الآن، وعمليات الملف في القائمة الجانبية", hl=[("aside a[href$='/staff/admins']", "1"), ("aside a[href$='/staff/admins/manage/cadre']", "2")], section=S)
    c.scroll_to("main h2:has-text('الكادر الإداري والمراجع')", 120)
    c.shot("adm-summary", "حال كل جزء من الملف: القواعد، والكادر والمراجع، والمتقدمون، والمجموعات والتكتلات", section=S)
    c.goto("/staff/admins/manage", wait=1800)
    c.shot("adm-rules", "قواعد الإداريين: عملياتهم بمواعيدها وساعاتها، ثم قواعد الموسم", hl=[("main h2:has-text('عمليات الإداريين')", "")], section=S)
    for t, key, cap in [
        ("الصفات والالتزامات", "rules-roles", "الصفات المتاحة والتزامات الإداري"),
        ("الشهادات والمهارات واللغات", "rules-catalog", "الشهادات والمهارات واللغات: القوائم التي يُبنى منها ملف الإداري"),
        ("شروط الصفات", "rules-requirements", "شروط الصفات: جدول الموسم — لكل صفة شهاداتها، مطلوبة أو تقوّي الطلب"),
        ("مراحل التقييم", "rules-stages", "مراحل تقييم الإداري"),
        ("الرزنامة", "rules-calendar", "رزنامة الإداريين"),
    ]:
        s.tab(t, 1200)
        c.scroll_to("main [role=tablist]", 110)
        c.shot(key, cap, section=S)
    # the reference lists: the twelve roles with the guides' grades
    c.goto("/staff/admins/manage/reference", wait=1800)
    c.shot("ref-roles", "القوائم المرجعية — الصفات: اثنتا عشرة صفة، ومنها درجات الموجّهين أ وب وج", section=S)
    c.scroll_to("main li:has-text('موجّه ديني أ')", 140)
    c.shot("ref-grades", "درجات الموجّهين: العمر المثبَّت لكل درجة، وشارة التميّز في التوجيه الديني للدرجة «أ»", hl=[("main li:has-text('موجّه ديني أ')", "")], section=S)
    p.locator("button[aria-label='تعديل موجّه ديني أ']").first.click(); c.settle(1000)
    c.shot("ref-role-form", "تعديل صفة: مستواها وسلوكها، وعمرها المثبَّت، واسم امتحانها", section=S)
    esc(c, p)
    for t, key, cap in [
        ("الفئات والأعداد", "ref-categories", "الفئات والأعداد: لكل مستوى تركيبة التكتل وحجاج كل فئة ومقاعدها"),
        ("الفروع", "ref-branches", "الفروع: داخل سوريا وخارجها، وعدد المرتبطين بكل فرع"),
        ("التسميات الموسمية", "ref-labels", "التسميات الموسمية الجاهزة: اقتراحات تُمنح مع الصفة الموسمية"),
    ]:
        s.tab(t, 1200)
        c.shot(key, cap, section=S)
    # the administrative references published to the cadre
    c.goto("/staff/admins/manage/references", wait=1800)
    c.shot("refs-jobs", "المراجع الإدارية — التوصيف الوظيفي: بطاقة لكل صفة، تُرتَّب وتُخفى وتُعدَّل", hl=[("main a:has-text('الصفحة العامة')", "")], section=S)
    p.locator("button[aria-label='تعديل رئيس تكتل']").first.click(); c.settle(1000)
    c.shot("refs-job-form", "تعديل توصيف صفة: خلاصتها ومهامها، مهمة في كل سطر", section=S)
    esc(c, p)
    s.tab("النظام الإداري", 1200)
    c.shot("refs-system", "النظام الإداري: أقسامه السبعة وخاتمته، تُرتَّب وتُعدَّل وتُحذف ويُضاف إليها", section=S)
    p.locator("main ol li button:has-text('القسم الخامس')").first.click(); c.settle(1000)
    c.shot("refs-system-form", "تحرير قسم: نصه بفقرات وبنود، وإلى جانبه كما يظهر في الصفحة العامة", section=S)
    esc(c, p)
    s.tab("المقررات الإدارية", 1200)
    c.shot("refs-decisions", "المقررات الإدارية: كل مقرر بموسمه وملفه", hl=[("main button:has-text('مقرر جديد')", "")], section=S)
    s.tab("العقود", 1200)
    c.shot("refs-contracts", "نماذج العقود: طرفا كل عقد، وملفه", section=S)
    s.close()
    # the cadre across the seasons
    s = Staff(); c, p = s.c, s.p
    s.login("maher")
    c.goto("/staff/admins/manage/cadre", wait=2400)
    c.shot("cadre-roster", "الكادر الإداري: كل فرد بصفته الأساسية ومكانه في تكتله وفرعه وهاتفه وتيليجرامه وحضوره", hl=[("main button:has-text('إضافة كادر')", "1"), ("main button:has-text('الأعمدة')", "2")], section=S)
    s.btn("الأعمدة", 700)
    for lab in ["رمز الدخول (PIN)", "رقم الباركود", "تاريخ الميلاد"]:
        p.locator(f"{D} label:has-text('{lab}') input").first.check(); c.settle(150)
    c.shot("cadre-columns", "الأعمدة: تختار ما يظهر في الجدول وما يُصدَّر إلى Excel", section=S)
    p.locator(f"{D} button:text-is('تم')").first.click(); c.settle(700)
    p.get_by_label("بحث في الكادر").fill("هالة"); c.settle(700)
    p.locator("main tbody tr").first.click(); c.settle(1400)
    c.shot("cadre-person", "ملف الفرد: بياناته، ورمز دخوله وتيليجرامه، وإيقاف حسابه أو حذفه", section=S)
    s.tab("الصفة والفئة والفروع", 900)
    c.shot("cadre-person-role", "صفته الأساسية والموسمية وفئته وفروعه: كل تعديل بسببه", section=S)
    s.tab("البيانات والدخول", 700)
    s.btn("إيقاف الحساب", 700, scope=D)
    p.locator(f"{D} textarea[aria-label='السبب']").last.fill("لم يحضر تدريب الكادر الإلزامي، بكتاب الفرع"); c.settle(300)
    c.shot("cadre-stop", "إيقاف حساب: لا يدخل المنصة ولا يُدعى إلى تكتل حتى يُفعَّل", section=S)
    p.locator(f"{D} button:text-is('تنفيذ')").last.click(); c.settle(1200)
    s.tab("أحداث ملفه", 900)
    c.shot("cadre-person-events", "أحداث ملفه: انضمامه إلى تكتل، وكل تعديل عليه، وما يُكتب بيدك", section=S)
    esc(c, p)
    p.get_by_label("بحث في الكادر").fill(""); c.settle(500)
    s.btn("إضافة كادر", 700)
    dlg = p.locator(D).last
    dlg.locator("input").first.fill("02055500123"); c.settle(500)
    dlg.locator("input[placeholder='09XXXXXXXX']").fill("0933111222")
    dlg.locator("textarea").fill("بكتاب فرع حلب رقم 112"); c.settle(300)
    c.shot("cadre-add", "إضافة كادر: من السجل المدني بالرقم الوطني، بصفته وفرعه وسبب إضافته", section=S)
    dlg.locator("button:has-text('إضافة')").last.click(); c.settle(1400)
    esc(c, p)
    s.tab("أحداث الكادر", 1400)
    c.shot("cadre-events", "أحداث الكادر: ملفات الأفراد كلهم بنوع كل حدث وموسمه وتغييره ومن سجّله", hl=[("main button:has-text('إضافة حدث')", "")], section=S)
    s.tab("الكادر", 900)
    s.btn("إرسال تيليجرام", 700)
    p.locator(f"{D} textarea").last.fill("تذكير: اجتماع الكادر الخميس الساعة 10 في مبنى الإدارة"); c.settle(300)
    c.shot("cadre-telegram", "إرسال تيليجرام إلى من في القائمة المعروضة: يصل المربوطين بالبوت", section=S)
    p.locator(f"{D} button:has-text('إرسال')").last.click(); c.settle(1000)
    # the applicants, the evaluation, the classification
    c.goto("/staff/admins/manage/applicants", wait=1800)
    c.scroll_to("main h2:has-text('المتقدمون صفةً صفة')", 120)
    c.shot("adm-applicants", "المتقدمون صفةً صفة: من تقدّم ومن ثبتت أهليته وسدد ونجح وتأهّل", section=S)
    c.scroll_to("main h2:has-text('الملفات الدائمة')", 120)
    c.shot("adm-files", "الملفات الدائمة للإداريين: الوثائق وصلاحيتها وما ينقص كل ملف", section=S)
    c.goto("/staff/admins/manage/evaluation", wait=1800)
    c.shot("adm-eval-list", "التقييم مرحلةً مرحلة: من قُيّم في كل مرحلة", section=S)
    p.locator("main button:has-text('ياسر')").first.click(); c.settle(1200)
    dlg = p.locator(D).last
    dlg.locator("[role=radiogroup] [role=radio]:has-text('4')").first.click(); c.settle(400)
    c.shot("adm-eval", "تقييم الإداري: درجة من 1 إلى 5 لكل مرحلة، وملاحظة ودليل", hl=[(f"{D} button:has-text('حفظ التقييم')", "")], section=S)
    dlg.locator("button:has-text('حفظ التقييم')").first.click(); c.settle(1200)
    esc(c, p)
    c.goto("/staff/admins/manage/grading", wait=1800)
    c.shot("grade-top", "تصنيف المجموعات والتكتلات ونشره", hl=[("main button:has-text('اعتماد النتائج ونشرها')", "")], section=S)
    c.scroll_by(600)
    c.shot("grade-tier", "الترتيب داخل كل فئة: مرقّاة وثابتة ومخفّضة", section=S)
    c.scroll_top()
    s.btn("اعتماد النتائج ونشرها", 1500)
    c.shot("grade-published", "اعتُمدت نتائج التصنيف ونُشرت", section=S)
    c.scroll_to("main h2:has-text('سجل التصنيف')", 120)
    c.shot("adm-records", "سجل التصنيف: كل تغيير في هذا الجزء، ومن أجراه ومتى", section=S)
    s.close()

# ───────── G. «إدارة الإداريين» (mazen): forming groups at the office, the cluster requests, the directory, the letters ─────────
if ONLY in (None, "g"):
    s = Staff(); c, p = s.c, s.p; S = "G"
    s.login("mazen")
    c.goto("/staff/admins/manage/groups", wait=1800)
    jump = p.locator("main button:has-text('جرّبها الآن')")
    if jump.count():
        jump.first.click(); c.settle(1500)
    sel = p.get_by_label("رئيس المجموعة").first
    sel.select_option(index=1); c.settle(600)
    p.locator("label:has-text('سدّد رسم التشكيل') input").first.check(); c.settle(400)
    c.scroll_to("main h2:has-text('تشكيل مجموعة في المكتب')", 110)
    c.shot("grp-card", "تشكيل مجموعة في المكتب: رئيسها المؤهل، واسمها، وفئته، ورسم التشكيل", section=S)
    c.shot("grp-approve", "تشكيل المجموعة", hl=[("main button:has-text('تشكيل مجموعة')", "")], section=S)
    p.locator("main button:has-text('تشكيل مجموعة')").last.click(); c.settle(1500)
    c.shot("grp-approved", "شُكّلت المجموعة", section=S)
    c.scroll_to("main h2:has-text('مجموعات الموسم المعتمدة')", 120)
    c.shot("grp-list", "مجموعات الموسم المعتمدة: رئيس كل مجموعة وفئتها وحجاجها وتكتلها", section=S)
    # the cluster requests
    c.goto("/staff/admins/manage/clusters", wait=2000)
    c.shot("cl-window", "مواعيد الاستقبال: البدء والموعد الأول والموعد النهائي باليوم والساعة", section=S)
    c.scroll_to("main h2:has-text('التكتلات المُرسلة')", 110)
    c.shot("cl-requests", "التكتلات المُرسلة: النشطة والمؤرشفة، والمستوى، والحالات", hl=[("main button:has-text('إنشاء تشكيل نيابة عن قائد')", "")], section=S)
    p.locator("main button:has-text('تكتل الوفاء')").first.click(); c.settle(1500)
    c.shot("cl-sheet", "طلب جاري المراجعة: الاعتماد أو الرفض مع ملاحظات، والطباعة وExcel، وشروطه", section=S)
    p.locator(f"{D} p:has-text('تعديل استثنائي')").first.scroll_into_view_if_needed(); c.settle(500)
    c.shot("cl-exceptional", "التعديل الاستثنائي: إضافة مجموعة أو فرد إلى مكان أو إزالته، بسبب يُكتب في ملفه", section=S)
    esc(c, p)
    s.btn("إنشاء تشكيل نيابة عن قائد", 800)
    dlg = p.locator(D).last
    dlg.get_by_label("القائد").select_option(index=1); c.settle(300)
    dlg.get_by_label("السبب").fill("القائد خارج البلاد، وفوّض الإدارة بكتاب"); c.settle(300)
    c.shot("cl-onbehalf", "إنشاء تشكيل نيابة عن قائد: القائد واسم التكتل ومستواه والسبب", section=S)
    dlg.locator("button:has-text('إنشاء المسودة')").first.click(); c.settle(1800)
    c.shot("cl-onbehalf-sheet", "المسودة باسم قائدها وشارة «أُنشئ من الإدارة»: تُملأ بالتعديل الاستثنائي ثم تُرسل نيابة عنه", section=S)
    esc(c, p)
    p.locator("main button:has-text('تكتل الأمانة')").first.click(); c.settle(1500)
    s.btn("أرشفة", 1200, scope=D)
    esc(c, p)
    p.locator("main button:has-text('المؤرشفة')").first.click(); c.settle(900)
    c.scroll_to("main h2:has-text('التكتلات المُرسلة')", 110)
    c.shot("cl-archived", "المؤرشفة: التكتلات المعتمدة التي خرجت من عمل الموسم، بموسمها", section=S)
    # the directory and the season
    c.goto("/staff/admins/manage/directory", wait=2000)
    c.shot("dir-clusters", "التكتلات والمجموعات: كل تكتل معتمد بموسمه وأرقامه وملاحظة الإدارة عليه", section=S)
    p.locator("main tbody tr").first.locator("button").last.click(); c.settle(1200)
    c.shot("dir-members", "أعضاء تكتل: كل فرد بصفته في التكتل ومجموعته", section=S)
    esc(c, p)
    s.tab("المجموعات", 1200)
    c.shot("dir-groups", "المجموعات: رئيس كل مجموعة وتكتلها وموسمها وفئته وحجاجها", section=S)
    c.scroll_to("main h2:has-text('الموسم الحالي')", 110)
    s.btn("بدء موسم جديد", 700)
    p.get_by_label("رقم الموسم الجديد").fill("1449"); p.get_by_label("السبب").fill("انتهاء موسم 1448 وتصنيفه"); c.settle(300)
    c.shot("dir-season", "بدء موسم جديد: تُؤرشف تشكيلات الموسم المعتمدة، وتُختم الطلبات بعده بالموسم التالي", section=S)
    esc(c, p)
    # the letters
    c.goto("/staff/admins/manage/letters", wait=1800)
    c.shot("let-list", "المراسلات: غير مقروءة، وبدون رد، وتم الرد، ومغلقة", section=S)
    p.locator("main button:has-text('لم يصلني رمز الدخول')").first.click(); c.settle(1400)
    p.get_by_label("الرد").fill("أُعيد إرسال رمزك عبر البوت، وإن لم يصل فخذه من فرع حمص."); c.settle(300)
    c.shot("let-thread", "مراسلة: سياقها ومرفقاتها، والرد والإغلاق والطباعة", hl=[(f"{D} button:has-text('إرسال الرد')", "")], section=S)
    s.btn("إرسال الرد", 1000, scope=D)
    esc(c, p)
    s.close()
    # The head of تكتل النور sent his programme and his operational plan (administrator run «head»)
    s = Staff(storage=str(ROOT / "admin" / "state-head-profile.json")); c, p = s.c, s.p
    s.login("mazen")
    c.goto("/staff/admins/manage/clusters", wait=1800)
    c.scroll_to("main h2:has-text('برامج تنتظر اعتمادك')", 120)
    c.shot("prof-diff", "برنامج تكتل ينتظر اعتمادك: قبل وبعد لكل حقل عدّله رئيس التكتل", hl=[("main button:has-text('اعتماد ونشر')", "1"), ("main button:has-text('إعادة مع السبب')", "2")], section=S)
    s.btn("اعتماد ونشر", 1500)
    c.scroll_to("main h2:has-text('البرامج المنشورة')", 120)
    c.shot("prof-published", "اعتُمد البرنامج ونُشر في دليل الخدمات", section=S)
    c.goto("/staff/admins/manage/references?tab=plans", wait=1800)
    c.shot("refs-plans", "الخطط التشغيلية: ما قدّمه رؤساء التكتلات، تُقبل أو تُعاد بملاحظات", hl=[("main button:has-text('قبول')", "")], section=S)
    s.close()

# ───────── H. audit + the executive board ─────────
if ONLY in (None, "h"):
    s = Staff(); c, p = s.c, s.p; S = "H"
    s.login("tarek")
    c.goto("/staff/audit", wait=1800)
    c.shot("audit-top", "سجل الأحداث: للإضافة فقط", section=S)
    s.btn("تتبّع الطلب 51877", 1200)
    c.shot("audit-trace", "تتبّع طلب عند الاعتراض", section=S)
    c.scroll_to("input[aria-label='بحث في السجل']", 160)
    c.shot("audit-filters", "البحث والتصفية حسب الموظف والصفة والإجراء", section=S)
    c.goto("/staff/executive", wait=1800)
    c.shot("exec-top", "لوحة الإدارة العليا", section=S)
    c.scroll_by(800)
    c.shot("exec-2", "رضا الحجاج والشكاوى وترتيب التكتلات", section=S)
    s.close()
print("DONE stf_b")
