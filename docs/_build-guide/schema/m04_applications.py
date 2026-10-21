# -*- coding: utf-8 -*-
from .dsl import *

RELATION = enum("self", "spouse", "parent", "child", "sibling", "grandparent", "grandchild", "other")
RELATION_DESC = ("صلة الفرد بصاحب الطلب: self «صاحب الطلب»، spouse «زوج/زوجة»، parent «أب/أم»، child «ابن/ابنة»، sibling «أخ/أخت»، "
                 "grandparent «جد/جدة»، grandchild «حفيد/حفيدة»، other «قريب / مرافق»")

MODULE = M("applications", "طلب الحج: المسودة والأفراد والموافقات والتقديم والمراجعة والدفع", [
    "يقدّم الحاج طلبه من «تقديم طلب حج» على صفحات الإصدار الذي بدأ عليه: نوع التسجيل، صاحب الطلب (له أو لشخص آخر)، مكان الإقامة، المرافقون "
    "(من دفتر العائلة أو بالرقم الوطني)، فحص الأهلية، موافقات الأفراد، الملخص، ثم الدفع. كل خطوة تُحفظ في المسودة، فيعود إليها متى شاء.",
    "صاحب الطلب هو أكبر الأفراد سناً دائماً: إضافة فرد أكبر تنقل الطلب إلى اسمه. والحساب الذي قدّم الطلب (owner_account_id) قد لا يكون صاحب الطلب "
    "إذا قُدّم «لشخص آخر»، أو قدّمه موظف المكتب أو المنسق التقني عن مواطن.",
    "في النسخة التجريبية لا توجد حالة مخزّنة للطلب: القبول يُحسب كل مرة من العمر والسحب المنشور والمراجعة. هنا الحالة عمود صريح وتاريخها في جدول، "
    "لأن القرار يجب أن يبقى كما صدر ولو تغيّر العمر المقبول أو أُعيد حساب شيء لاحقاً. وكذلك المدفوعات: صارت كل دفعة صفاً بمزوّدها ورقم عمليتها وإيصالاتها.",
], [
    T("application_drafts", "مسودات الطلبات", "طلب قيد التعبئة، يُحفظ عند كل خطوة. «في الإنتاج هذا جدول على الخادم بالحقول نفسها» كما يقول الكود.", [
        pk(), season(),
        account("owner_account_id", "الحساب الذي يملأ المسودة", od="CASCADE"),
        ref("config_version_id", "reg_config_versions", "الإصدار المثبَّت عند أول حفظ، يبقى حتى التقديم"),
        c("track", enum("direct", "lottery"), "نوع التسجيل: direct «التسجيل على القبول المباشر»، lottery «التسجيل الأولي على القرعة»", d="'direct'"),
        c("for_whom", enum("me", "other"), "لمن: me «لي أنا»، other «لشخص آخر»", d="'me'"),
        c("residence", "VARCHAR(60)", "مكان الإقامة: «سوريا» أو أحد مكاتب الخارج (تركيا — إسطنبول، تركيا — غازي عنتاب، مصر، الأردن)", d="'سوريا'"),
        c("family_book_no", "VARCHAR(12)", "دفتر العائلة الذي جُلب منه الأفراد", null=True, fk="family_books.book_no", od="SET NULL"),
        c("screen_history", "JSON", "مكدس الشاشات للعودة إلى حيث توقف: intro، track، forWhom، residence، companions، method، booklet، count، adder، review، elderly، eligibility، consents، summary، payment، أو stage:<id>"),
        c("max_phase", "TINYINT UNSIGNED", "أبعد مرحلة بلغها في شريط المراحل", d="0"),
        c("answers", "JSON", "إجابات أسئلة الطلب {field_key: value}", null=True),
        c("member_answers", "JSON", "إجابات أسئلة الأفراد {national_id: {field_key: value}}", null=True),
        c("applicant_consent_at", "DATETIME(3)", "عند التقديم لشخص آخر: وقت موافقته برمز إلى هاتفه", null=True),
        ref("applicant_consent_otp_id", "otp_challenges", "رمز موافقة صاحب الطلب", null=True),
        *stamps(),
    ], uq=[("owner_account_id", "season_year")], src="lib/store.ts:684 ApplyDraft؛ actions.saveDraft، clearDraft",
       rules=["مسودة واحدة لكل حساب في الموسم. التقديم يحذفها؛ والموافقات تُنقل إلى الطلب ولا تُحذف (الكود يحذفها مع المسودة، وهذه فجوة تُسد هنا).",
              "«بدء طلب جديد بدلاً منه» يحذف المسودة."]),

    T("application_draft_members", "أفراد المسودة", "الأفراد كما أُضيفوا في المسودة، بصلاتهم وتحققها.", [
        pk(), ref("draft_id", "application_drafts", "المسودة", od="CASCADE"),
        person("national_id", "الفرد"),
        c("relation", RELATION, RELATION_DESC),
        c("relation_verified", "TINYINT(1)", "1 = أكّد السجل المدني الصلة المصرَّح بها؛ 0 = «صلة مصرّح بها» تذهب إلى المراجعة", d="0"),
        person("companion_national_id", "لمن بلغ 69 عاماً فأكثر: الفرد الذي يرافقه في الطلب نفسه", null=True),
        c("sort_order", "TINYINT UNSIGNED", "الترتيب", d="0"),
    ], uq=[("draft_id", "national_id")]),

    T("applications", "طلبات الحج", "الطلب المقدَّم. يحمل نسخة مجمّدة من شروط الموسم وقت التقديم، وحالته الصريحة.", [
        pk(), season(),
        c("number", "VARCHAR(12)", "رقم الطلب، فريد في الموسم، من number_sequences (النسخة التجريبية تشتقه من الرقم الوطني بين 4000 و8999 وقد يتكرر)"),
        account("owner_account_id", "الحساب الذي قُدّم منه الطلب (صاحب الطلب نفسه، أو من قدّمه لشخص آخر)"),
        person("applicant_national_id", "صاحب الطلب: الفرد الأكبر سناً (relation = self)"),
        c("track", enum("direct", "lottery"), "نوع التسجيل: direct «التسجيل على القبول المباشر»، lottery «التسجيل الأولي على القرعة»"),
        c("for_whom", enum("me", "other"), "me لصاحب الحساب، other «لشخص آخر» (صاحب الطلب ≠ الحساب)"),
        c("mode", enum("booklet", "national", "solo", "manual"), "طريقة إضافة الأفراد: booklet «وثيقة العائلة»، national «الرقم الوطني»، solo «طلب فردي»، manual «إدخال يدوي» (بيانات قديمة)"),
        c("residence", "VARCHAR(60)", "مكان الإقامة وقت التقديم"),
        ref("office_id", "offices", "المكتب الذي يتبعه الطلب (لا يُختار: محافظة قيد صاحب الطلب، أو بلد الإقامة، أو مكتب من سجّله)"),
        c("status", enum("submitted", "checking", "eligible", "accepted-direct", "not-accepted-direct", "awaiting-draw", "accepted-lottery",
                         "not-drawn", "confirmed", "lapsed", "suspended", "withdrawn", "moved-to-lottery"),
          "الحالة: submitted «مُقدَّم»، checking «تدقيق البيانات»، eligible «مؤهل»، accepted-direct «مقبول مباشرة»، not-accepted-direct «لم يُقبل مباشرة»، "
          "awaiting-draw «بانتظار القرعة»، accepted-lottery «مقبول بالقرعة»، not-drawn «لم يُقبل بالقرعة»، confirmed «ثبّت قبوله» (المقبول بالقرعة بعد الدفعة الأولى)، "
          "lapsed «سقط قبوله» (لم يثبّت قبل الموعد)، suspended «موقوف بقرار المراجعة»، withdrawn «انسحب»، moved-to-lottery «نُقل أفراده إلى طلب القرعة»", d="'submitted'"),
        ref("config_version_id", "reg_config_versions", "الإصدار الذي قُدّم عليه"),
        c("policy_snapshot", "JSON", "شروط الموسم المجمّدة وقت التقديم: rules (الأعمار والمرافقون)، accepted_direct_age، fees {registrationPerPerson، hajjCost، hady، firstInstallment، installmentCount، schedule[{key، label، perPerson، dueLabel، dueStep}]، extrasStep}. كل حساب لاحق للتكاليف يقرأ منها"),
        c("announced_direct_age", "TINYINT UNSIGNED", "العمر المعلَن لجولة هذا الطلب إن اختلف عن الموسم", null=True),
        c("installment_plan", "TINYINT UNSIGNED", "عدد دفعات تكلفة الحج المعمول به (1 أو 2…)", null=True),
        c("registration_receipt_no", "VARCHAR(24)", "إيصال رسم التسجيل {season}-R-{n:06}", uq=True),
        c("total_paid", MONEY, "مجموع المدفوع على الطلب (يُحدَّث مع كل دفعة مؤكدة)", d="0.00"),
        ref("previous_application_id", "applications", "طلب القبول المباشر المغلق الذي حلّ محله طلب القرعة هذا", null=True),
        ref("credit_from_application_id", "applications", "الطلب الذي انتقلت منه الدفعة الأولى رصيداً", null=True),
        c("submitted_by_kind", enum("self", "office", "coordinator"), "من قدّمه: self صاحب الحساب، office موظف التسجيل في المكتب، coordinator إداري يملك صلاحية التسجيل", d="'self'"),
        staff("submitted_by_staff_id", "موظف المكتب الذي قدّمه"),
        account("submitted_by_account_id", "الإداري الذي قدّمه", null=True),
        c("submitted_by_position", "VARCHAR(80)", "صفة من قدّمه وقت التقديم (لقطة)", null=True),
        c("submitted_at", "DATETIME(3)", "وقت التقديم", d="CURRENT_TIMESTAMP(3)"),
        c("decided_at", "DATETIME(3)", "وقت صدور القبول أو عدمه", null=True),
        c("acceptance_basis", enum("direct-age", "lottery-draw"), "سبب القبول: العمر في القبول المباشر، أو سنة الميلاد في السحب", null=True),
        ref("lottery_draw_id", "lottery_draws", "السحب الذي قُبل به", null=True),
        c("closed_at", "DATETIME(3)", "إغلاق الطلب (لم يُقبل، نُقل، سقط، انسحب)", null=True),
        updated(),
    ], uq=[("season_year", "number")], idx=[("owner_account_id",), ("applicant_national_id",), ("status",)],
       src="lib/store.ts:49 Application؛ lib/registration/service.ts submitApplication؛ lib/journey.ts (الحالة المشتقة)",
       rules=["شروط التقديم (رموز أخطاء submissionErrors): مسودة موجودة؛ الإصدار ساري في الموسم الجاري؛ لا طلب سابق إلا طلب مباشر لم يُقبل وهذا قرعة؛ النوع مفعّل وعمليته مفتوحة؛ "
              "صاحب طلب موجود؛ لا فرد مكرر؛ الإجابات صحيحة؛ الشروط محققة؛ الأهلية؛ لا فرد في طلب آخر هذا الموسم؛ لا فرد إداري هذا الموسم؛ كل الموافقات معتمدة؛ دفعة رسم التسجيل مؤكدة وغير مستعملة وبالمبلغ نفسه.",
              "المبلغ عند التقديم: عدد الأفراد × رسم التسجيل، ويضاف للقبول المباشر عدد الأفراد × الدفعة الأولى (لفردين في 1448: 50 $ للقرعة، و7,050 $ للمباشر).",
              "القبول المباشر: عمر صاحب الطلب ≥ (announced_direct_age أو العمر في policy_snapshot أو season_settings). وطلب القرعة يُقبل بالسحب المنشور.",
              "المقبول بالقرعة يثبّت قبوله بالدفعة الأولى قبل موعد التثبيت (27 تشرين الأول لموسم 1448)، وإلا صار lapsed. النسخة التجريبية لا تفرض الموعد.",
              "الطلب المغلق بعدم القبول المباشر يُستبدل بطلب قرعة جديد بالأفراد أنفسهم (previous_application_id)، وتبقى دفعته الأولى رصيداً (credit_from_application_id) أو تُرد."]),

    T("application_status_history", "تاريخ حالات الطلب", "كل انتقال في حالة الطلب، ومن أحدثه ولماذا.", [
        pk(), ref("application_id", "applications", "الطلب", od="CASCADE"),
        c("status", "VARCHAR(30)", "الحالة الجديدة (القيم نفسها في applications.status)"),
        c("changed_at", "DATETIME(3)", "وقت الانتقال", d="CURRENT_TIMESTAMP(3)"),
        c("actor_kind", enum("system", "staff", "account"), "من أحدثه"),
        staff("staff_user_id", "الموظف"),
        account("account_id", "صاحب الحساب", null=True),
        c("note", "VARCHAR(500)", "سبب أو ملاحظة", null=True),
    ], new=True, idx=[("application_id", "changed_at")]),

    T("application_members", "أفراد الطلب", "كل فرد في الطلب المقدَّم، مع لقطة من بياناته المدنية وقت التقديم.", [
        pk(), ref("application_id", "applications", "الطلب", od="CASCADE"),
        season(desc="الموسم (مكرر من الطلب لفرض «لا يكون الفرد في طلبين في الموسم»)"),
        person("national_id", "الفرد"),
        c("relation", RELATION, RELATION_DESC),
        c("relation_verified", "TINYINT(1)", "تحقق السجل من الصلة", d="0"),
        c("is_applicant", "TINYINT(1)", "1 = صاحب الطلب (relation = self)", d="0"),
        person("companion_national_id", "مرافق من بلغ 69 عاماً فأكثر (فرد في الطلب نفسه، بالغ 17 عاماً، غير كبير سن، لا يرافق اثنين)", null=True),
        c("current_marker", "TINYINT(1)", "1 ما دام الطلب قائماً، و NULL بعد إغلاقه. مع المفتاح الفريد (season_year، national_id، current_marker) يمنع وجود الفرد في طلبين قائمين في الموسم", null=True, d="1"),
        c("person_snapshot", "JSON", "بياناته المدنية كما كانت وقت التقديم (الاسم، الجنس، الميلاد، المحافظة، الدفتر)"),
        c("needs", "JSON", "احتياجاته بعد القبول [«كرسي متحرك»، «سكري»…]: تُملأ من ملفه الصحي وتقرأها الغرف والوجبات والقوائم", null=True),
        c("sort_order", "TINYINT UNSIGNED", "الترتيب", d="0"),
    ], uq=[("application_id", "national_id"), ("season_year", "national_id", "current_marker")],
       src="lib/rules.ts:13 Member؛ withOldestAsApplicant",
       rules=["فرد واحد is_applicant = 1، وهو الأكبر سناً.",
              "حدود العدد: المرافقون ≤ 3، أو ≤ 5 إن كان صاحب الطلب رجلاً وكل مرافقيه زوجة وأولاد.",
              "المرأة دون 44 عاماً تحتاج محرماً ذكراً بالغاً في الطلب (زوج، أب، ابن، أخ، جد، حفيد)."],
       checks=["current_marker IS NULL OR current_marker = 1"]),

    T("application_answers", "إجابات أسئلة الطلب", "إجابات الأسئلة التي أضافتها الإدارة إلى النموذج، للطلب كله أو لكل فرد.", [
        pk(), ref("application_id", "applications", "الطلب", od="CASCADE"),
        person("member_national_id", "الفرد لسؤال نطاقه member؛ NULL لسؤال الطلب", null=True),
        c("field_key", "VARCHAR(60)", "مفتاح السؤال (reg_form_fields.field_key)"),
        c("value", "JSON", "الإجابة: نص، أو رقم، أو منطقي، أو مصفوفة نصوص للاختيار المتعدد"),
    ], uq=[("application_id", "member_national_id", "field_key")], src="Application.answers، memberAnswers؛ prunedAnswers",
       rules=["تُحفظ فقط إجابات الأسئلة الظاهرة وقت التقديم (prunedAnswers)."]),

    T("application_consents", "موافقات أفراد الطلب", "كل فرد بلغ 17 عاماً (عدا مقدّم الطلب نفسه) يوافق على انضمامه: بدعوة داخل التطبيق إن كان له حساب، أو برمز إلى هاتفه. "
      "وعند التقديم لشخص آخر يوافق صاحب الطلب نفسه برمز.", [
        pk(),
        ref("draft_id", "application_drafts", "المسودة وقت الطلب", null=True, od="SET NULL"),
        ref("application_id", "applications", "الطلب بعد التقديم", null=True, od="CASCADE"),
        person("national_id", "الفرد الموافق"),
        c("kind", enum("companion", "applicant"), "companion موافقة مرافق، applicant موافقة صاحب طلب يُقدَّم عنه"),
        c("via", enum("app", "sms"), "app «دعوة داخل التطبيق»، sms «رمز موافقة إلى الهاتف ••• tail»"),
        c("status", enum("pending", "approved", "declined"), "pending بانتظار، approved «أوافق على الانضمام»، declined «أعتذر»", d="'pending'"),
        c("sent_at", "DATETIME(3)", "وقت الإرسال (يتجدد مع «إعادة الإرسال»)"),
        c("responded_at", "DATETIME(3)", "وقت الرد", null=True),
        ref("otp_challenge_id", "otp_challenges", "الرمز المستعمل للموافقة بالرسالة", null=True),
    ], idx=[("national_id", "status")], src="lib/store.ts:671 Consent؛ consentPeople؛ app/portal/page.tsx:225",
       rules=["لا يُقدَّم الطلب إلا وكل موافقة approved ولها responded_at.",
              "المرفوض: يُزال الفرد من الطلب، أو تُطلب موافقته من جديد."],
       checks=["draft_id IS NOT NULL OR application_id IS NOT NULL"]),

    T("application_reviews", "مراجعة الطلبات", "قرار بشري على طلب: يدخل الطلب قائمة المراجعة إذا لم تتحقق صلة قرابة، أو نبّه فحص الأهلية، أو فشل فحص عام. "
      "القرار يظهر لصاحب الطلب، والمرفوض يوقف خطوات ما بعد القبول.", [
        pk(), ref("application_id", "applications", "الطلب", od="CASCADE"),
        c("decision", enum("approved", "rejected"), "approved «معتمد»، rejected «مرفوض» (يُعرض «موقوف بقرار المراجعة»)"),
        c("note", "VARCHAR(1000)", "سبب القرار، 8 أحرف على الأقل، يراه صاحب الطلب", ck="CHAR_LENGTH(note) >= 8"),
        c("flags", "JSON", "أسباب دخول القائمة وقت القرار: صلات غير متحققة، تنبيهات الأهلية", null=True),
        staff("decided_by_staff_id", "المراجع (صلاحية registration.review)", null=False),
        c("decided_at", "DATETIME(3)", "وقت القرار", d="CURRENT_TIMESTAMP(3)"),
        c("is_current", "TINYINT(1)", "1 للقرار الساري؛ القرار الجديد يجعل السابق 0", d="1"),
    ], idx=[("application_id", "is_current")], src="lib/store.ts:130 Review؛ app/staff/reviews/view.tsx؛ actions.setReview",
       rules=["القائمة نفسها مشتقة لا تُخزَّن. الكود يحفظ آخر قرار فقط؛ هنا كل القرارات صفوف.",
              "يعترض صاحب الطلب المرفوض ببلاغ من نوع complaint نصه يبدأ «اعتراض على قرار مراجعة الطلب» (tickets)."]),

    T("payments", "المدفوعات", "كل دفعة مؤكدة من مزوّدها: رسم التسجيل، الدفعة الأولى، دفعات ما بعد القبول (الدفعة الثانية والهدي والسكن الخاص)، "
      "ورسوم الإداريين والمجموعات والتكتلات. الكود يحفظ سجلاً مختصراً (PaymentRecord) ولا يحفظ رقم عملية شام كاش ولا إشعار المصرف؛ هنا يُحفظان.", [
        pk(), season(),
        c("payment_no", "VARCHAR(24)", "معرّف الدفعة PAY-…", uq=True),
        account("payer_account_id", "الحساب الدافع"),
        ref("application_id", "applications", "الطلب الذي تخصه (للحجاج)", null=True),
        ref("admin_season_file_id", "admin_season_files", "الملف الإداري الذي تخصه (رسم التسجيل كإداري)", null=True),
        ref("group_id", "admin_groups", "المجموعة (رسم التشكيل)", null=True),
        ref("cluster_id", "clusters", "التكتل (رسم التشكيل)", null=True),
        c("purpose", enum("registration", "first-installment", "post-lines", "admin-registration", "group-formation", "cluster-formation"),
          "الغرض: registration رسم التسجيل على الحج (ومعه الدفعة الأولى للمباشر)، first-installment الدفعة الأولى للمقبول بالقرعة، post-lines دفعات ما بعد القبول، "
          "admin-registration رسم التسجيل كإداري، group-formation رسم تشكيل مجموعة، cluster-formation رسم تشكيل تكتل"),
        c("method", enum("shamcash", "bank", "office", "card"), "طريقة الدفع: shamcash «شام كاش» (فوري من التطبيق)، bank «المصرف المعتمد — إشعار مرفوع»، office نقداً في المكتب، card بطاقة (قيمة قديمة لطلبات ما قبل شام كاش، للترحيل فقط)"),
        c("amount", MONEY, "المبلغ بالدولار، أكبر من صفر", ck="amount > 0"),
        c("currency", "CHAR(3)", "العملة", d="'USD'"),
        c("provider_tx_no", "VARCHAR(40)", "رقم العملية في شام كاش (6–12 رقماً في الواجهة)", null=True),
        c("bank_reference", "VARCHAR(40)", "الرقم المرجعي للدفع في المصرف ({season}-BANK-…)", null=True),
        file_("bank_slip_file_id", "إشعار الدفع المصرفي المرفوع"),
        c("status", enum("pending", "confirmed", "failed", "refunded"), "الحالة: pending بانتظار تأكيد المزوّد أو مطابقة الإشعار، confirmed مؤكدة، failed فشلت، refunded رُدّت", d="'pending'"),
        c("confirmed_at", "DATETIME(3)", "وقت تأكيد المزوّد", null=True),
        staff("confirmed_by_staff_id", "الموظف الذي طابق الإشعار المصرفي (للدفع المصرفي)"),
        c("used_at", "DATETIME(3)", "متى استُهلكت في تقديم طلب أو دفع بنود (لا تُستعمل دفعة مرتين)", null=True),
        staff("collected_by_staff_id", "موظف المكتب الذي استلم (للدفع في المكتب)"),
        created(),
    ], idx=[("payer_account_id",), ("application_id",), ("status",)],
       src="lib/registration/types.ts:225 PaymentRecord؛ service.ts recordPayment، payPostLines، payFirstInstallment؛ components/payment/methods.tsx",
       rules=["التسجيل يتطلب دفعة registration مؤكدة لنفس الحساب، غير مستعملة، بالمبلغ نفسه، ثم تُعلَّم مستعملة.",
              "حساب شام كاش الثابت SDHU-1448، ورمز QR: shamcash://pay?to=SDHU-1448&amount=…&currency=USD&ref=<الإيصال>.",
              "الدفعة لا تتعلق إلا بطلب واحد أو ملف إداري واحد أو مجموعة أو تكتل."]),

    T("payment_items", "بنود الدفعة وإيصالاتها", "ما غطّته الدفعة بنداً بنداً، ولكل بند إيصال رقمي.", [
        pk(), ref("payment_id", "payments", "الدفعة", od="CASCADE"),
        c("line_key", "VARCHAR(20)", "البند: registration (رسم التسجيل)، i1..i4 (دفعات تكلفة الحج)، hady (الهدي)، room (السكن الخاص)، admin-fee، group-fee، cluster-fee"),
        c("title", "VARCHAR(120)", "عنوان البند: «الدفعة الأولى»، «الدفعة الثانية»، «الهدي»، «السكن الخاص»…"),
        c("detail", "VARCHAR(200)", "التفصيل، مثل «4 × 1,250 $» أو «غرفة بأربعة أسرّة — 4 × 50 $»", null=True),
        c("amount", MONEY, "المبلغ"),
        c("receipt_no", "VARCHAR(30)", "الإيصال: {season}-R-{n:06} للتسجيل؛ {season}-P-{رقم الطلب:06}-{n} للدفعات و-H للهدي و-R للسكن؛ {season}-A-… للإداري؛ {season}-G-… للمجموعة", uq=True),
    ], uq=[("payment_id", "line_key")], src="lib/registration/post.ts:64 CostLine، costLines، receiptBase",
       rules=["التحقق العام من الإيصال (صفحة «التحقق من وثيقة») يقرأ هذا الجدول ويعرض نوعه ومبلغه وتاريخه واسم حامله مقنّعاً فقط."]),

    T("refunds", "المبالغ المردودة", "رد مبلغ: الدفعة الأولى لمن لم يُقبل مباشرة ولم ينتقل إلى القرعة، والرصيد لمن لم تسحبه القرعة. الكود يذكرها نصاً ولا يخزّنها.", [
        pk(), ref("payment_id", "payments", "الدفعة الأصلية"),
        ref("application_id", "applications", "الطلب", null=True),
        c("amount", MONEY, "المبلغ المردود", ck="amount > 0"),
        c("reason", enum("not-accepted-direct", "not-drawn", "lapsed", "withdrawn", "other"), "السبب: لم يُقبل مباشرة ولم ينتقل، لم تسحبه القرعة، سقط قبوله، انسحب، آخر"),
        c("status", enum("requested", "approved", "paid", "rejected"), "الحالة", d="'requested'"),
        c("method", enum("shamcash", "bank", "office"), "طريقة الرد", null=True),
        c("reference", "VARCHAR(60)", "مرجع عملية الرد", null=True),
        staff("decided_by_staff_id", "من قرر"),
        c("decided_at", "DATETIME(3)", "وقت القرار", null=True),
        created(),
    ], new=True, rules=["رسم التسجيل لا يُسترد (نص صفحة الشروط والأسئلة الشائعة)."]),
], flow=[
    "يفتح الحاج «تقديم طلب حج» والعملية مفتوحة؛ تُنشأ application_drafts على الإصدار الساري ويُكتب مساره pilgrim للموسم.",
    "يضيف الأفراد (application_draft_members)، ويُفحص كل منهم بشروط الموسم وقواعد الإدارة، ثم تُرسل الموافقات (application_consents).",
    "يدفع (payments + payment_items)، فيتحول المسودة إلى applications مع application_members وapplication_answers، وتُنقل الموافقات إلى الطلب، وتُحذف المسودة.",
    "تتقدم الحالة: تدقيق، أهلية، ثم قبول مباشر أو انتظار القرعة. كل انتقال في application_status_history، والمراجعة البشرية في application_reviews.",
])
