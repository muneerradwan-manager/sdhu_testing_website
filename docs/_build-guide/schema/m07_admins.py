# -*- coding: utf-8 -*-
from .dsl import *

MODULE = M("admins", "الإداريون: البنية المرجعية والملف الدائم والتسجيل الموسمي", [
    "الإداري الموسمي (رئيس مجموعة، معاون، موجّه ديني، موجّهة دينية، منسق تقني، وغيرهم) يملك حساباً مثل أي مستخدم، ويختار المسار الإداري للموسم. "
    "يمر بـ«التسجيل كإداري» بست خطوات: وثائقي وشهاداتي، لغاتي ومهاراتي، الصفة (صفة واحدة في الموسم)، الالتزامات، التحقق من الأهلية، رسم التسجيل؛ ثم الاختبار المؤتمت فالشفهي.",
    "كل ما يحكم ذلك يضبطه موظفو «إدارة الإداريين»: الصفات وسلوكها، الفئات وأوزانها، مستويات التكتل وأعدادها، الفروع، الشهادات وصلاحيتها، المهارات واللغات، "
    "جدول شروط الصفات، الالتزامات، مراحل التقييم. في النسخة التجريبية هذه كلها تعديلات فوق قيم الكود (adminRules). هنا جداول مرجعية، والأعداد التي تتغير كل موسم معلّقة بالموسم.",
    "وللإداري ملف دائم يبقى عبر المواسم («وثائقي ومهاراتي»: الشهادات واللغات والمهارات)، وملف موسمي لكل موسم يتقدّم فيه (admin_season_files).",
], [
    T("admin_roles", "الصفات الإدارية", "الصفات التي يتقدّم لها الإداريون أو تمنحها الإدارة، وسلوك كل صفة في التشكيل.", [
        c("role_key", "VARCHAR(40)", "مفتاح الصفة: cluster-head، group-head، group-deputy، tech، assistant-tech، murshid، guide-m، guide-m-c، murshida، guide-f، guide-f-c، assistant-count، أو role-<…> لما تضيفه الإدارة", pk=True),
        c("name", "VARCHAR(80)", "الاسم: «رئيس تكتل»، «رئيس مجموعة»، «معاون»، «منسق تقني»، «معاون ومنسق تقني»، «موجّه ديني أ/ب/ج»، «موجّهة دينية أ/ب/ج»، «معاون بعدد»", uq=True),
        c("level", enum("cluster", "group", "shared"), "المستوى: cluster «تكتل»، group «مجموعة»، shared «مشترك (تكتل أو مجموعة)»"),
        c("description", "TEXT", "الوصف", null=True),
        c("is_core", "TINYINT(1)", "من الصفات الأصلية", d="0"),
        c("active", "TINYINT(1)", "فعّالة: غير الفعالة لا تُعرض للإسناد الجديد وتبقى صالحة لحامليها", d="1"),
        c("applied", "TINYINT(1)", "1 = يُتقدَّم لها في «التسجيل كإداري»؛ 0 = تمنحها الإدارة (رئيس تكتل)", d="1"),
        c("exam_as_role_key", "VARCHAR(40)", "الصفة التي يأخذ اختبارها وشروطها وصلاحياتها (مثل murshid ← guide-m)", null=True, fk="admin_roles.role_key", od="SET NULL"),
        c("gender", enum("M", "F"), "يقتصر على جنس (الموجّهون ذكور والموجّهات إناث)", null=True),
        c("guide_seat", "TINYINT(1)", "«يشغل مقعد الموجّه الديني ضمن المجموعة»", d="0"),
        c("assistant_seat", "TINYINT(1)", "«يشغل مقعد المعاون ضمن المجموعة»", d="0"),
        c("assistant_pool", "TINYINT(1)", "«ضمن مرشّحي معاوني التكتل»", d="0"),
        c("coordinator_pool", "TINYINT(1)", "«ضمن مرشّحي منسّقي التكتل»", d="0"),
        c("guide_pool", "TINYINT(1)", "«ضمن مرشّحي موجّهات التكتل»", d="0"),
        c("cluster_leader", "TINYINT(1)", "صفة «قائد التكتل»", d="0"),
        c("group_leader", "TINYINT(1)", "صفة «قائد المجموعة»", d="0"),
        c("guidance_badge", "TINYINT(1)", "«تمنح شارة التميّز في التوجيه الديني» (الدرجة أ)", d="0"),
        c("has_category", "TINYINT(1)", "«تُظهر حقل الفئة» (رئيس المجموعة)", d="0"),
        c("multiplier", "SMALLINT UNSIGNED", "حجاج يضيفهم حاملها حين يكون معاوناً للتكتل («معاون بعدد»: 20)", null=True),
        c("fixed_age", "TINYINT UNSIGNED", "عمر مثبَّت يُحسب به في متوسط أعمار كادر التكتل (الموجّه أ: 40)", null=True),
        c("exam_name", "VARCHAR(80)", "اسم الاختبار المعروض («الموجّه الديني»)", null=True),
        c("sort_order", "SMALLINT", "الترتيب", d="0"),
    ], src="app/administrator/_lib/structure.ts:31 RoleDef، :85 DEFAULT_ROLES؛ adminRules.roles",
       rules=["لا تُحذف صفة يحملها أحد أو تشير إليها صفة أخرى. والصفة الثانوية «محاسب التكتل» ليست صفة موسمية بل موقع في التكتل (cluster_members)."],
       seed="12 صفة: كلها فعالة، وكلها يُتقدَّم لها عدا رئيس التكتل."),

    T("admin_role_exams", "اختبارات الصفة", "صفة تجلس أكثر من اختبار وعليها أن تنجح فيها كلها (معاون ومنسق تقني: اختبار المعاون واختبار المنسق).", [
        code_ref("role_key", "admin_roles", "الصفة", col="role_key", od="CASCADE"),
        code_ref("exam_role_key", "admin_roles", "الصفة التي يُؤخذ اختبارها", col="role_key"),
    ], uq=[("role_key", "exam_role_key")], src="RoleDef.exams"),

    T("admin_role_labels", "التسميات الموسمية الجاهزة", "تسمية تُمنح مع الصفة الموسمية لتوضيحها، مثل «معاون - مكتب سياحي».", [
        pk(), c("label", "VARCHAR(80)", "التسمية", uq=True),
        code_ref("base_role_key", "admin_roles", "الصفة التي تُستعمل معها", col="role_key"),
        c("active", "TINYINT(1)", "فعّالة", d="1"),
    ], src="structure.ts:115 RoleLabel", seed="«معاون - مكتب سياحي»، «موجّه ب»، «معاون متحد»."),

    T("branches", "الفروع", "فروع الإدارة التي ينتمي إليها الكادر (دمشق، حلب، اسطنبول، مصر…). يختار رئيس التكتل كادره من فروعه.", [
        pk(), c("name", "VARCHAR(60)", "اسم الفرع", uq=True),
        c("active", "TINYINT(1)", "فعّال", d="1"),
    ], src="structure.ts Branch", seed="12 فرعاً: إدلب، اسطنبول، الرقة، اللاذقية، حلب، حماة، حمص، درعا، دمشق، دير الزور، غازي عنتاب، مصر."),

    T("service_tiers", "مستويات التكتلات", "مستوى خدمة التكتل، يحدد أعداد المجموعات ومقاعد فريقها.", [
        c("tier_key", "VARCHAR(20)", "المفتاح: eco، eco-plus، five، أو tier-<…>", pk=True),
        c("name", "VARCHAR(60)", "الاسم: «اقتصادي»، «اقتصادي محسن»، «خمس نجوم»", uq=True),
        c("is_default", "TINYINT(1)", "المستوى الذي تُقرأ به أعداد المجموعة قبل انضمامها لتكتل (eco)", d="0"),
        c("sort_order", "TINYINT", "الترتيب", d="0"),
    ], src="structure.ts Tier؛ DEFAULT_TIER"),

    T("group_categories", "فئات المجموعات", "فئة رئيس المجموعة، وهي فئة مجموعته. الوزن يُجمع في وزن التكتل ويُحمَّل على المنسقين والموجّهات.", [
        c("category_key", "VARCHAR(20)", "المفتاح: c1..c4 أو cat-<…>", pk=True),
        c("name", "VARCHAR(60)", "الاسم: «الفئة الأولى» … «الفئة الرابعة»", uq=True),
        c("weight", "TINYINT UNSIGNED", "الوزن (1..4)", ck="weight >= 1"),
    ], src="structure.ts Category"),

    T("category_rules", "أعداد كل فئة في كل مستوى", "لكل مستوى وفئة: مقاعد الموجّهين والمعاونين والمقاعد الحرة وعدد الحجاج.", [
        season(),
        code_ref("tier_key", "service_tiers", "المستوى", col="tier_key", length=20),
        code_ref("category_key", "group_categories", "الفئة", col="category_key", length=20),
        c("guides", "TINYINT UNSIGNED", "مقاعد الموجّه الديني"),
        c("assistants", "TINYINT UNSIGNED", "مقاعد المعاون"),
        c("free_seats", "TINYINT UNSIGNED", "مقاعد حرة (موجّه أو معاون)"),
        c("pilgrims", "SMALLINT UNSIGNED", "عدد الحجاج"),
        c("active", "TINYINT(1)", "مفعّلة", d="1"),
    ], uq=[("season_year", "tier_key", "category_key")], src="structure.ts CategoryRule",
       rules=["أعضاء الفريق مع الرئيس = 1 + guides + assistants + free_seats."],
       seed="اقتصادي: c1 1/0/0 و45 حاجاً؛ c2 1/1/0 و90؛ c3 1/1/1 و135؛ c4 2/2/0 و200. محسن: 45، 135، 135، 200. خمس نجوم: 0/0/0 و30، 60، 90، 120."),

    T("tier_compositions", "تركيب التكتل في كل مستوى", "حدود وزن التكتل ومعاونيه وطاقة المنسق والموجّهة.", [
        season(),
        code_ref("tier_key", "service_tiers", "المستوى", col="tier_key", length=20),
        c("min_weight", "SMALLINT UNSIGNED", "أدنى مجموع أوزان الفئات"),
        c("max_weight", "SMALLINT UNSIGNED", "أعلاه"),
        c("cluster_assistants", "TINYINT UNSIGNED", "معاونو التكتل المطلوبون بالضبط («معاون بعدد» لا يُحسب)"),
        c("units_per_coordinator", "TINYINT UNSIGNED", "حد وحدات المنسق التقني (مجموع أوزان مجموعاته)"),
        c("units_per_female_guide", "SMALLINT UNSIGNED", "حد وحدات الموجّهة"),
    ], uq=[("season_year", "tier_key")], src="structure.ts composition",
       checks=["min_weight <= max_weight"], seed="اقتصادي 5–24، 1، 6، 7؛ محسن 5–21، 1، 6، 7؛ خمس نجوم 5–21، 0، 20، 100."),

    T("admin_season_rules", "قواعد الإداريين في الموسم", "قيم موسمية متفرقة لملف الإداريين.", [
        season(pk=True),
        c("cluster_early_deadline_at", "DATETIME(3)", "الموعد الأول لتشكيل التكتلات: من أرسل طلبه قبله ينال شارة الالتزام بالمواعيد (2026-11-19 23:59)", null=True),
        staff("updated_by_staff_id", "آخر من عدّل"),
        updated(),
    ], src="adminRules.earlyDeadline، earlyTime"),

    T("admin_doc_types", "الشهادات والوثائق", "الوثائق التي يرفعها الإداري في ملفه الدائم، وصلاحية كل منها بالمواسم.", [
        c("doc_key", "VARCHAR(40)", "المفتاح: record، degree، first-aid، sharia، it، leadership، recommendation، أو cert-<…>", pk=True),
        c("label", "VARCHAR(160)", "الاسم: «وثيقة «لا حكم عليه»»، «صورة عن الشهادة الجامعية»، «شهادة دورة إسعافات أولية»، «شهادة شرعية أو إجازة في العلوم الشرعية»، «شهادة في المعلوماتية (ICDL أو ما يعادلها)»، «شهادة دورة قيادة وإدارة مجموعات»، «تزكية من رئيس تكتل سابق»"),
        c("hint", "VARCHAR(200)", "التلميح («صورة واضحة أو PDF»)"),
        c("valid_seasons", "TINYINT UNSIGNED", "صلاحيتها بالمواسم شاملة موسم الإصدار: 0 «لا تنتهي»، 1 «تُجدَّد كل موسم»، n «سارية n مواسم». record وfirst-aid وrecommendation تُقرأ من season_settings"),
        c("is_custom", "TINYINT(1)", "أضافتها الإدارة", d="0"),
        c("active", "TINYINT(1)", "مفعّلة (لا يُعطَّل ما يستعمله جدول الشروط)", d="1"),
    ], src="app/administrator/_lib/admin.ts:134 DOCUMENTS؛ adminRules.docTypes، docEdits، docsOff",
       rules=["حالة الوثيقة محسوبة: سارية حتى موسم issued + valid − 1، و«منتهية منذ موسم … — حدّثها» بعده."]),

    T("skills", "المهارات", "المهارات التي يختارها الإداري.", [
        c("skill_key", "VARCHAR(60)", "المفتاح: bus، first-aid، computer، sign، elderly، أو اسم المهارة المضافة", pk=True),
        c("label", "VARCHAR(80)", "الاسم: «قيادة حافلة»، «إسعافات أولية»، «استخدام الحاسوب والتطبيقات»، «لغة الإشارة»، «خبرة في رعاية كبار السن»"),
        c("emoji", "VARCHAR(8)", "الرمز", d="'✨'"),
        c("active", "TINYINT(1)", "مفعّلة", d="1"),
    ], src="admin.ts SKILLS؛ adminRules.skillsAdded، skillsOff"),

    T("languages", "اللغات", "اللغات التي يختارها الإداري، وتُستعمل في قوائم الموظفين.", [
        pk(), c("name", "VARCHAR(40)", "الاسم: العربية، الإنجليزية، التركية، الفرنسية، الأوردو…", uq=True),
        c("is_fixed", "TINYINT(1)", "العربية لا تُعطَّل", d="0"),
        c("active", "TINYINT(1)", "مفعّلة", d="1"),
    ], src="admin.ts LANGUAGES؛ adminRules.languagesAdded، languagesOff"),

    T("admin_commitments", "الالتزامات", "ما يوافق عليه الإداري في الخطوة الرابعة.", [
        c("commitment_key", "VARCHAR(40)", "المفتاح: travel، rules، ethics، evaluation", pk=True),
        c("label", "VARCHAR(160)", "الاسم: «السفر مع الحجاج طوال الموسم»، «الالتزام بالتعليمات ولائحة المكافآت والعقوبات»، «ميثاق الأخلاقيات»، «قبول التقييم»"),
        c("detail", "TEXT", "النص الكامل"),
        c("active", "TINYINT(1)", "مفعّل", d="1"),
    ], src="admin.ts:144 COMMITMENTS؛ adminRules.commitmentsOff، commitmentEdits"),

    T("role_requirements", "شروط الصفات", "جدول الشروط: لكل صفة وشرط قيمة. الشرط عمر أدنى وأعلى، أو جنس، أو مواسم خبرة، أو وثيقة أو مهارة أو لغة مطلوبة أو مقوّية للطلب.", [
        season(),
        code_ref("role_key", "admin_roles", "الصفة", col="role_key"),
        c("criterion", "VARCHAR(80)", "الشرط: age-min «العمر من»، age-max «العمر حتى»، gender «الجنس»، seasons «مواسم خبرة سابقة (حد أدنى)»، doc:<doc_key>، skill:<skill_key>، lang:<الاسم>"),
        c("value", "VARCHAR(20)", "القيمة: رقم للعمر والمواسم؛ M أو F للجنس؛ required «مطلوبة» أو preferred «تقوّي الطلب» للوثيقة والمهارة واللغة"),
    ], uq=[("season_year", "role_key", "criterion")], src="admin.ts:205 ROLE_REQUIREMENTS؛ adminRules.requirements",
       rules=["الصفة بلا عمود خاص تستعمل شروط صفة اختبارها (exam_as_role_key).",
              "المطلوب يجب أن يتحقق، والمقوّي يقوّي الطلب فقط."],
       seed="رئيس مجموعة: 30–60، لا حكم عليه والشهادة الجامعية مطلوبتان؛ معاون 25–60؛ الموجّه 25–65 ذكر بشهادة شرعية؛ الموجّهة كذلك أنثى؛ المنسق التقني 22–55 بالمعلوماتية."),

    T("role_requirement_rows", "صفوف جدول الشروط", "الشروط المعروضة في الجدول بترتيبها، ولو لم تُملأ لها قيمة بعد (يُضاف الصف ثم تُملأ خلاياه).", [
        season(),
        c("criterion", "VARCHAR(80)", "الشرط (age-min، gender، doc:record…)"),
        c("sort_order", "SMALLINT", "الترتيب", d="0"),
    ], uq=[("season_year", "criterion")], src="adminRules.requirements.rows؛ app/staff/admins/_components/rules.tsx:493",
       rules=["حذف صف يحذف خلاياه من role_requirements."]),

    T("admin_role_permissions", "صلاحيات الصفات في البوابة الإدارية", "الصلاحيات التي تمنحها الصفة لحاملها في البوابة الإدارية. الوحيدة الآن «التسجيل على الحج» (تسجيل مواطن على الحج).", [
        c("permission", enum("pilgrims.register"), "الصلاحية: pilgrims.register «التسجيل على الحج»"),
        code_ref("role_key", "admin_roles", "الصفة (تُقارن بصفة الاختبار لصفة الإداري)", col="role_key", od="CASCADE"),
    ], uq=[("permission", "role_key")], src="app/administrator/_lib/permissions.ts؛ adminRules.rolePermissions", seed="pilgrims.register ← tech."),

    T("admin_calendar", "رزنامة الإداريين", "مواعيد مسار الإداري المعروضة له.", [
        pk(), season(),
        c("hijri_label", "VARCHAR(120)", "الموعد كما يُعرض («20 – 24 أيلول 2026»)"),
        c("title", "VARCHAR(160)", "الحدث: «إنشاء الحساب الإداري»، «التسجيل كإداري والتحقق من الأهلية»، «الاختبار المؤتمت في القاعات»، «تشكيل المجموعات في المكتب»…"),
        c("detail", "TEXT", "التفصيل", null=True),
        c("sort_order", "TINYINT", "الترتيب", d="0"),
    ], src="admin.ts:371 ADMIN_CALENDAR؛ adminRules.calendar"),

    T("evaluation_stages", "مراحل التقييم", "المراحل التي يُقيَّم بها الإداريون والمجموعات والتكتلات بعد الموسم (من 1 إلى 5).", [
        season(),
        c("stage_key", "VARCHAR(40)", "المفتاح: pretravel، airport، travel، makkah، madinah، mashaer، أو stage-<…>"),
        c("label", "VARCHAR(80)", "الاسم: «مرحلة ما قبل السفر»، «مرحلة المطار»، «مرحلة السفر»، «مرحلة مكة»، «مرحلة المدينة»، «مرحلة المشاعر»"),
        c("hint", "VARCHAR(200)", "الشرح", null=True),
        c("sort_order", "TINYINT", "الترتيب", d="0"),
    ], uq=[("season_year", "stage_key")], src="lib/data/staff-seed.ts:408 EVALUATION_STAGES؛ adminRules.stages"),

    T("admin_vault_documents", "الملف الدائم: الشهادات", "شهادات الإداري في «وثائقي ومهاراتي». تبقى عبر المواسم، وكل تسجيل جديد يبدأ منها.", [
        pk(), account("account_id", "الإداري", od="CASCADE"),
        code_ref("doc_key", "admin_doc_types", "نوع الوثيقة؛ NULL لشهادة أضافها الإداري بنفسه (custom)", null=True, col="doc_key"),
        c("label", "VARCHAR(160)", "الاسم (للشهادة المخصصة يكتبه الإداري، ويمكن إعادة تسميتها)"),
        file_("file_id", "الملف", null=False),
        c("issued_season", "SMALLINT UNSIGNED", "موسم الإصدار الهجري، تُحسب منه الصلاحية"),
        c("added_at", "DATETIME(3)", "وقت الإضافة", d="CURRENT_TIMESTAMP(3)"),
        c("replaced_at", "DATETIME(3)", "استُبدلت بنسخة أحدث من النوع نفسه", null=True),
        c("deleted_at", "DATETIME(3)", "حُذفت", null=True),
    ], idx=[("account_id", "doc_key")], src="lib/store.ts:353 VaultDoc، :369 AdminRecord؛ app/portal/(admin)/role/record.tsx",
       rules=["نسخة سارية واحدة لكل نوع: الرفع الجديد يستبدل القديمة (replaced_at). الشهادات المخصصة متعددة.",
              "الملف مقفل للقراءة ما دام الإداري ناجحاً منشوراً في الموسم حتى تُغلق عملية الاعتراض على التقييم."]),

    T("account_languages", "الملف الدائم: اللغات", "لغات الإداري.", [
        account("account_id", "الإداري", od="CASCADE"),
        ref("language_id", "languages", "اللغة"),
    ], uq=[("account_id", "language_id")], src="AdminRecord.languages"),

    T("account_skills", "الملف الدائم: المهارات", "مهارات الإداري: من القائمة، أو مهارة يكتبها بنفسه.", [
        pk(), account("account_id", "الإداري", od="CASCADE"),
        code_ref("skill_key", "skills", "المهارة من القائمة", null=True, length=60, col="skill_key"),
        c("custom_label", "VARCHAR(80)", "مهارة مكتوبة بيده", null=True),
    ], src="AdminRecord.skills", checks=["skill_key IS NOT NULL OR custom_label IS NOT NULL"]),

    T("admin_season_files", "الملف الإداري الموسمي", "تقدّم الإداري في موسم: صفته الواحدة، ونوع التجديد، والإعفاء، والالتزامات، والأهلية، والرسم. "
      "منه يُشتق موقعه في رحلته: الحساب، التسجيل، الرسم، الاختبار، النتيجة، الشفهي، ثم المجموعة أو الفريق، فالتكتل، فالحجاج، فالميدان.", [
        pk(), account("account_id", "الإداري", od="CASCADE"), season(),
        code_ref("role_key", "admin_roles", "الصفة المتقدَّم لها (واحدة في الموسم)", null=True, col="role_key"),
        c("renewal", enum("keep", "change", "first"), "keep «تجديد الصفة نفسها»، change «صفة جديدة»، first «أول موسم»", null=True),
        c("exam_exempt", "TINYINT(1)", "معفى من الاختبارين: جدّد صفته نفسها وتقييمه السابق ≥ الحد والفجوة ≤ موسم", d="0"),
        c("commitments_at", "DATETIME(3)", "وقت قبول الالتزامات", null=True),
        c("eligible_at", "DATETIME(3)", "ثبتت أهليته بالتحقق الآلي (قبل الدفع)", null=True),
        c("eligibility_result", "JSON", "نتيجة التحقق صفاً صفاً (الشروط المطلوبة والمقوّية) وقت الثبوت أو الفشل", null=True),
        c("documents_snapshot", "JSON", "مفاتيح الوثائق السارية المستعملة وقت الأهلية", null=True),
        c("languages_snapshot", "JSON", "اللغات وقت الأهلية", null=True),
        c("skills_snapshot", "JSON", "المهارات وقت الأهلية", null=True),
        ref("fee_payment_id", "payments", "دفعة رسم التسجيل كإداري", null=True),
        c("fee_paid_at", "DATETIME(3)", "وقت دفع الرسم", null=True),
        c("receipt_no", "VARCHAR(24)", "إيصال الرسم {season}-A-{n:06}", null=True, uq=True),
        c("result_published_at", "DATETIME(3)", "نشر النتيجة النهائية (النجاح يعني: معفى، أو نجح في المكتوب بكل أقسامه والشفهي)", null=True),
        *stamps(),
    ], uq=[("account_id", "season_year")], src="lib/store.ts:497 AdminProfile؛ app/portal/(admin)/role/apply.tsx؛ admin.ts resultOf، journeyOf",
       rules=["يُفتح الملف باختيار المسار الإداري للموسم. ونافذة التسجيل عملية admin-registration (20–24 أيلول لموسم 1448).",
              "الرجوع قبل خطوة الأهلية يمسح eligible_at. والرسم بعد الأهلية.",
              "خيار «تجديد الصفة نفسها» يحتاج تقييم الموسم السابق ≥ keep_role_min_rating، والإعفاء يحتاج فجوة ≤ keep_role_max_gap_seasons.",
              "المواقع في التكتل (رئيس، معاون، منسق، موجّهة، محاسب، موجّه مجموعة، معاون مجموعة) لا تُكرَّر هنا: تُقرأ من cluster_members وgroup_seats."]),

    T("admin_commitment_acceptances", "قبول كل التزام", "الكود يحفظ وقت قبول الالتزامات جملة؛ هنا كل التزام بصيغته وقت القبول.", [
        ref("admin_season_file_id", "admin_season_files", "الملف الموسمي", od="CASCADE"),
        code_ref("commitment_key", "admin_commitments", "الالتزام", col="commitment_key"),
        c("text_snapshot", "TEXT", "نص الالتزام كما قُبل"),
        c("accepted_at", "DATETIME(3)", "وقت القبول", d="CURRENT_TIMESTAMP(3)"),
    ], uq=[("admin_season_file_id", "commitment_key")], new=True),
], flow=[
    "يختار الإداري المسار الإداري فيُفتح admin_season_files للموسم. يحدّث ملفه الدائم: admin_vault_documents وaccount_languages وaccount_skills.",
    "يختار صفته (admin_roles)؛ تُقارن شروطها (role_requirements) بملفه وعمره ومواسمه (account_season_history)، فيوافق على الالتزامات (admin_commitment_acceptances).",
    "تثبت أهليته (eligible_at) فيدفع الرسم (payments) فيُكتب الإيصال، ثم ينتقل إلى الاختبار المؤتمت (الفصل التالي) ما لم يكن معفى.",
])
