# -*- coding: utf-8 -*-
from .dsl import *

MODULE = M("identity", "الهوية والحسابات: من السجل المدني إلى الحساب ومسار الموسم", [
    "تبدأ رحلة كل مستخدم من هنا. الشخص موجود أصلاً في السجل المدني (الشؤون المدنية) برقمه الوطني، والمنصة لا تنشئ أشخاصاً: "
    "تقرأ بياناتهم وتحتفظ بنسخة منها. الحساب يُنشأ فوق الشخص، حساب واحد لكل رقم وطني، حاجاً كان صاحبه أو إدارياً.",
    "الحساب بلا نوع. في كل موسم يختار صاحبه ما يفعله به: التسجيل على الحج، أو التقدّم لصفة إدارية، ولا يجمع بينهما في الموسم نفسه. "
    "هذا الاختيار هو account_season_paths، ومنه يتفرع كل شيء بعده.",
    "ملاحظة على النسخة التجريبية: كلمات المرور مخزّنة نصاً صريحاً، والحساب الذي يفتحه المنسق لمواطن كلمة مروره فارغة فيقبلها الدخول. "
    "هنا تُخزَّن بصمة كلمة المرور وحدها، والحساب المفتوح عن مواطن يُفعَّل برمز يصل إلى هاتفه.",
], [
    T("civil_persons", "الأشخاص في السجل المدني", "نسخة محلية مما يرد من السجل المدني عن كل شخص تتعامل معه المنصة: صاحب حساب، أو فرد في طلب، أو موظف. "
      "المصدر الحقيقي خارجي، والمنصة تحدّث النسخة عند كل استعلام. المفتاح هو الرقم الوطني، وتشير إليه كل الجداول التي تتعامل مع أشخاص قد لا يملكون حساباً.", [
        c("national_id", "CHAR(11)", "الرقم الوطني: 11 رقماً بالضبط. يُعرض مقنّعاً 010-•••••412", pk=True, ck="national_id REGEXP '^[0-9]{11}$'"),
        c("first_name", "VARCHAR(60)", "الاسم الأول"),
        c("father_name", "VARCHAR(60)", "اسم الأب"),
        c("mother_name", "VARCHAR(60)", "اسم الأم"),
        c("last_name", "VARCHAR(60)", "الكنية"),
        c("gender", enum("M", "F"), "الجنس: M «ذكر»، F «أنثى»"),
        c("birth_date", "DATE", "تاريخ الميلاد"),
        c("birth_place", "VARCHAR(80)", "مكان الولادة"),
        code_ref("governorate_code", "governorates", "المحافظة", length=20),
        c("registry_place", "VARCHAR(120)", "مكان القيد، مثل «المزة 1122»"),
        c("marital_status", "VARCHAR(20)", "الحالة المدنية كما يردها السجل: متزوج، متزوجة، عازب، عزباء، أرمل، أرملة، مطلق، مطلقة"),
        c("religion", "VARCHAR(20)", "الديانة", d="'مسلم'"),
        c("nationality", "VARCHAR(30)", "الجنسية", d="'سورية'"),
        c("family_book_no", "VARCHAR(12)", "رقم دفتر العائلة الذي هو قيده فيه", null=True, fk="family_books.book_no", od="SET NULL"),
        person("father_id", "الأب في السجل", null=True),
        person("mother_id", "الأم في السجل", null=True),
        c("phone_tail", "CHAR(3)", "آخر 3 أرقام من هاتفه في السجل، تُعرض في «رمز موافقة إلى الهاتف المنتهي بـ…»", null=True),
        c("fetched_at", "DATETIME(3)", "آخر مرة جُلبت فيها البيانات من السجل", d="CURRENT_TIMESTAMP(3)"),
    ], src="lib/registry.ts:11 Person؛ PEOPLE؛ lookupPerson",
       rules=["لا تُعدَّل هذه البيانات من المنصة. تصحيح الخطأ يمر بطلب civil_claims، والقيمة المعتمدة تُطبَّق بالأولوية على قيمة السجل عند العرض (انظر civil_claim_fields.applied_at).",
              "الحقلان hajjBefore وotherApplication في الكود ليسا من السجل المدني: الأول يُشتق من سجل مواسم المنصة (account_season_history)، والثاني من طلبات الموسم.",
              "الاسم الكامل = الأول + الأب + الكنية، والعمر = سنة المرجع للموسم − سنة الميلاد: كلاهما يُحسب ولا يُخزَّن."],
       idx=[("family_book_no",), ("last_name", "first_name")]),

    T("family_books", "دفاتر العائلة", "دفتر العائلة كما يرد من السجل. يُستعمل في التقديم «من دفتر العائلة» لجلب أفراد الأسرة دفعة واحدة.", [
        c("book_no", "VARCHAR(12)", "رقم الدفتر (8 أرقام في البيانات الحالية)", pk=True),
        person("head_national_id", "ربّ الأسرة", null=True),
        code_ref("governorate_code", "governorates", "المحافظة", length=20),
        c("registry_place", "VARCHAR(120)", "مكان القيد"),
        c("issued_on", "DATE", "تاريخ الإصدار", null=True),
        c("fetched_at", "DATETIME(3)", "آخر جلب من السجل", d="CURRENT_TIMESTAMP(3)"),
    ], src="lib/registry.ts:160 FAMILY_BOOKS؛ :302 familyBook()",
       rules=["أفراد الدفتر = من يحمل family_book_no نفسه، ومعهم الأبناء الذين انتقلوا بزواجهم إلى دفتر خاص (يُعرض لهم «انتقل إلى الدفتر …»)."]),

    T("person_spouses", "الأزواج في السجل", "علاقة الزواج كما يردها السجل (متعددة إلى متعددة، ومتناظرة).", [
        person("national_id", "الشخص", od="CASCADE"),
        person("spouse_national_id", "زوجه أو زوجته", od="CASCADE"),
    ], uq=[("national_id", "spouse_national_id")], src="lib/registry.ts Person.spouseIds",
       rules=["تُخزَّن العلاقة باتجاهيها (صفّان) ليسهل الاستعلام. منها ومن father_id/mother_id تُشتق «صلة القرابة» بين فردين في الطلب."]),

    T("accounts", "حسابات المنصة", "حساب واحد لكل رقم وطني، يدخل به صاحبه بوابة الحاج والبوابة الإدارية معاً. يُنشأ من صفحة «إنشاء حساب» بخطواتها الخمس "
      "(البيانات الأساسية، رمز التحقق، الشؤون المدنية، معلومات إضافية، الحساب جاهز)، أو يفتحه موظف المكتب أو المنسق التقني عن مواطن.", [
        pk(),
        person("national_id", "صاحب الحساب. فريد: لا يكون لرقم وطني أكثر من حساب", uq=True),
        c("phone", "VARCHAR(20)", "الهاتف بالصيغة الدولية E.164 (+963944123456). يُختار البلد من قائمة دول العالم ويُتحقق بمكتبة libphonenumber"),
        c("phone_verified_at", "DATETIME(3)", "وقت التحقق من الهاتف برمز", null=True),
        c("email", "VARCHAR(160)", "البريد الإلكتروني، اختياري («للإشعارات والإيصالات إن رغبت»)", null=True),
        c("password_hash", "VARCHAR(255)", "بصمة كلمة المرور (bcrypt أو argon2). الحد الأدنى 6 أحرف. NULL لحساب فتحه المكتب ولم يُفعّله صاحبه بعد", null=True),
        c("created_via", enum("self", "office", "coordinator", "admin-profile"), "كيف أُنشئ: self صاحبه، office موظف التسجيل في المكتب، coordinator المنسق التقني أو من يملك صلاحية التسجيل، admin-profile فُتح مع الملف الإداري", d="'self'"),
        staff("created_by_staff_id", "موظف المكتب الذي فتحه"),
        account("created_by_account_id", "المنسق الذي فتحه", null=True),
        c("alt_phone", "VARCHAR(20)", "رقم هاتف بديل (اختياري، الخطوة الرابعة)", null=True),
        c("emergency_name", "VARCHAR(120)", "جهة اتصال للطوارئ: شخص يبقى في سوريا ويُبلَّغ بمحطات الرحلة، مثل «سارة (ابنتي)»", null=True),
        c("emergency_phone", "VARCHAR(20)", "هاتف جهة الطوارئ", null=True),
        file_("photo_file_id", "الصورة الشخصية المختارة عند إنشاء الحساب (النسخة التجريبية لا تحفظها)"),
        c("signup_rating", "TINYINT UNSIGNED", "تقييم تجربة إنشاء الحساب 1–5 («كيف كانت تجربة إنشاء الحساب؟»)", null=True, ck="signup_rating BETWEEN 1 AND 5"),
        c("preferred_language", enum("ar", "en"), "لغة العرض المفضلة (البوابات عربية فقط)", d="'ar'"),
        c("display_scale", "DECIMAL(3,2)", "تكبير العرض الذي اختاره (0.70–1.40). في النسخة التجريبية يُحفظ على الجهاز", d="1.00"),
        c("tour_seen_at", "DATETIME(3)", "متى أنهى الجولة التعريفية", null=True),
        c("last_seen_at", "DATETIME(3)", "آخر ظهور (للإداريين: «● متصل الآن» خلال دقيقتين)", null=True),
        c("status", enum("active", "disabled"), "حالة الحساب. إيقاف الإداري من الكادر يُخزَّن في cadre_people.account_status", d="'active'"),
        *stamps(),
    ], src="lib/store.ts:19 Account؛ app/register/register-flow.tsx؛ actions.register، createAccountFor",
       rules=["قبل إنشاء الحساب لا يُكشف أي شيء عن الرقم الوطني (ولا أن له حساباً) حتى يطابق الاسم الأول ما في السجل، وبحد 5 محاولات (identity_attempts).",
              "التحقق برمز إلى الهاتف عند الإنشاء وعند كل دخول (otp_challenges).",
              "رفض الإنشاء إن وُجد حساب للرقم نفسه: «لهذا الرقم حساب في المنصة بالفعل، حاجاً كان صاحبه أو إدارياً.»",
              "الملف الإداري (admin_season_files) ينشأ على الحساب نفسه؛ نسخ الهاتف والبريد وكلمة المرور إلى الملف الإداري في الكود تكرار يُلغى هنا."]),

    T("account_season_paths", "مسار الحساب في كل موسم", "ما اختاره صاحب الحساب لهذا الموسم: الحج أو الصفة الإدارية. السؤال «ماذا تريد أن تفعل هذا الموسم؟» "
      "أو «كيف تتابع هذا الموسم؟» لمن شارك قبلاً.", [
        account("account_id", "الحساب", od="CASCADE"),
        season(),
        c("path", enum("pilgrim", "admin"), "المسار: pilgrim «التسجيل على الحج / أتابع كحاج / أفتح ملف حاج لهذا الموسم»، admin «التقدّم لصفة إدارية / أتابع كإداري / أفتح ملفاً إدارياً جديداً»"),
        c("chosen_at", "DATETIME(3)", "وقت الاختيار", d="CURRENT_TIMESTAMP(3)"),
        c("chosen_via", enum("season-card", "apply-page", "draft", "role-page", "home", "register"), "من أين اختير: بطاقة الموسم في «ملفي»، فتح «تقديم طلب حج»، حفظ مسودة طلب، صفحة «التسجيل كإداري»، الواجهة الرئيسية، أو بعد إنشاء الحساب مباشرة"),
    ], uq=[("account_id", "season_year")], src="lib/store.ts:11 SeasonPath، Account.seasons؛ actions.chooseSeasonPath؛ lib/account.ts seasonPathOf، canChangePath",
       rules=["مسار واحد في الموسم: من اختار المسار الإداري لا يسجّل على الحج في الموسم نفسه، والعكس. وتُرفض الطلبات التي فيها فرد إداري في الموسم (رمز الخطأ admin-season).",
              "يمكن التراجع عن الاختيار («غيّرت رأيي: أختار من جديد») ما دام لم يبدأ شيء: لا مسودة ولا طلب للحاج، ولا ملف إداري نشط للإداري. التراجع يحذف الصف.",
              "اختيار المسار الإداري يفتح ملفاً إدارياً للموسم (admin_season_files). وحفظ أول مسودة طلب يسجّل المسار pilgrim تلقائياً."]),

    T("civil_claims", "طلبات تصحيح البيانات المدنية", "حين يرى صاحب الحساب أن بياناته في السجل غير صحيحة («البيانات غير صحيحة» في الخطوة الثالثة)، "
      "يُنشأ الحساب على أي حال ويُرفع طلب تصحيح مع وثيقة، ويقرره موظف «مراجعة الطلبات والوثائق».", [
        pk(),
        account("account_id", "الحساب صاحب الطلب", od="CASCADE"),
        c("doc_kind", enum("civil-statement", "id-card", "family-book"), "الوثيقة المرفقة: civil-statement «بيان قيد مدني» (الافتراضي)، id-card «صورة البطاقة الشخصية»، family-book «دفتر العائلة»"),
        file_("doc_file_id", "ملف الوثيقة (صورة أو PDF). النسخة التجريبية تحفظ اسم الملف وحده", null=False),
        c("note", "VARCHAR(500)", "ملاحظة للموظف (اختيارية)", null=True),
        c("status", enum("pending", "approved", "rejected"), "الحالة: pending «غير مؤكدة — بانتظار القرار»، approved «صُحّحت»، rejected «رُفض التصحيح»", d="'pending'"),
        c("decision_note", "VARCHAR(1000)", "سبب القرار، يظهر لصاحب الحساب. 8 أحرف على الأقل", null=True),
        staff("decided_by_staff_id", "الموظف الذي قرر (صلاحية registration.review)"),
        c("decided_at", "DATETIME(3)", "وقت القرار", null=True),
        created(),
    ], src="lib/store.ts:40 CivilClaim؛ app/register/civil-correction.tsx؛ app/staff/reviews/civil.tsx؛ actions.decideCivil",
       rules=["القرار الجديد يحل محل السابق، ويبقى الاثنان في audit_events («اعتماد تصحيح بيانات مدنية» / «رفض تصحيح بيانات مدنية»).",
              "في النسخة التجريبية التصحيح المعتمد لا يُطبَّق على البيانات المعروضة. هنا يُطبَّق: الحقول المعتمدة تتقدّم على قيم السجل."],
       checks=["status = 'pending' OR (decision_note IS NOT NULL AND CHAR_LENGTH(decision_note) >= 8)"]),

    T("civil_claim_fields", "الحقول المطلوب تصحيحها", "كل حقل يختلف فيه ما كتبه صاحب الحساب عما في السجل. الرقم الوطني والاسم الأول لا يُصحَّحان (طُوبقا للتو).", [
        pk(), ref("claim_id", "civil_claims", "طلب التصحيح", od="CASCADE"),
        c("field_key", enum("father_name", "mother_name", "last_name", "birth_date", "birth_place", "marital_status"),
          "الحقل: father_name «اسم الأب»، mother_name «اسم الأم»، last_name «الكنية»، birth_date «تاريخ الميلاد»، birth_place «مكان الولادة»، marital_status «الحالة المدنية»"),
        c("registry_value", "VARCHAR(120)", "القيمة في السجل وقت الطلب"),
        c("claimed_value", "VARCHAR(120)", "القيمة التي يقول إنها الصحيحة"),
        c("applied_at", "DATETIME(3)", "وقت تطبيق القيمة بعد الاعتماد", null=True),
    ], uq=[("claim_id", "field_key")], src="lib/store.ts:40 CivilClaim.fields"),

    T("account_season_history", "سجل المواسم المؤرشف", "مشاركات صاحب الحساب في المواسم السابقة لما قبل المنصة أو المنقولة من أنظمة قديمة: أدّى الحج، تقدّم ولم يُقبل، "
      "خدم إدارياً بصفة وتقييم. المواسم من 1448 فصاعداً تُبنى من الطلبات والملفات الإدارية نفسها، وهذا الجدول للماضي. «لا يُحذف منه شيء».", [
        pk(),
        person("national_id", "الشخص (قد لا يملك حساباً بعد)"),
        season(),
        c("kind", enum("pilgrim", "admin", "none"), "نوع المشاركة: pilgrim حاج، admin إداري، none «لم يشارك»"),
        c("label", "VARCHAR(160)", "الوصف المعروض: «أدّى الحج»، «تقدّم على الحج ولم يُقبل»، «رئيس مجموعة»…"),
        code_ref("role_key", "admin_roles", "الصفة الإدارية إن كان إدارياً", null=True, col="role_key"),
        c("detail", "VARCHAR(200)", "المجموعة أو التكتل", null=True),
        c("group_numbers", "VARCHAR(100)", "أرقام المجموعات التي خدم فيها، مفصولة بفواصل", null=True),
        c("rating", "DECIMAL(2,1)", "تقييم الموسم من 5 (أساس تجديد الصفة بلا اختبار)", null=True),
        c("source", "VARCHAR(60)", "مصدر السجل (ترحيل، إدخال يدوي…)", null=True),
        created(),
    ], uq=[("national_id", "season_year")], src="app/administrator/_lib/admin.ts:387 HISTORY؛ lib/account.ts:57 PILGRIM_HISTORY؛ Person.hajjBefore",
       rules=["«سجل المواسم» في بوابة الحاج يجمع هذا الجدول مع الطلبات (applications) والملفات الإدارية (admin_season_files) للمواسم الحالية.",
              "منه يُشتق شرط «لم يؤدِّ فريضة الحج سابقاً»، وخيار «تجديد الصفة نفسها» للإداري ومدة خبرته."]),
], flow=[
    "يكتب الزائر رقمه الوطني واسمه الأول؛ تُطابَق مع civil_persons (المجلوبة من السجل) وتُعدّ المحاولة في identity_attempts.",
    "يصل رمز إلى هاتفه (otp_challenges)، ثم يرى بياناته المدنية: يؤكدها، أو يرفع civil_claims بحقول civil_claim_fields.",
    "يُنشأ accounts، ويدخل «ملفي». يسأله الموسم عن مساره فيُكتب account_season_paths: pilgrim يفتح «تقديم طلب حج»، وadmin يفتح الملف الإداري.",
])
