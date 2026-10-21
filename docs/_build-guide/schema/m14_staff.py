# -*- coding: utf-8 -*-
from .dsl import *

MODULE = M("staff", "الموظفون والصلاحيات والملفات التشغيلية", [
    "بوابة الموظفين لموظفي الإدارة والبعثة. لكل حساب صلاحيات مهام ثابتة (غرفة العمليات، الفريق الطبي، المواصلات، المراجعة، المحتوى…)، "
    "وتمنح مديرة الموسم صلاحيات إدارة الملفات الخمسة (الموظفون، التسجيل على الحج، الإداريون، الامتحانات، الطيران) لمن تشاء وتسحبها. "
    "وبعض المواقع تأتي من البيانات لا من الصلاحيات: مشرف القاعة، مندوب المطار، والموظف المرابط في برج أو مخيم يقيّم من سكنه.",
    "«سجل الموظفين» يحفظ موظفي البعثة (دائمين ومنتدبين) ومواسم مشاركتهم. و«البيانات المرجعية» أماكن كل موسم: فنادق مكة والمدينة، قطاعات مكة، مراكز منى وعرفات، مخيماتها. "
    "و«الملفات التشغيلية» ملف لكل نوع في كل موسم (التسكين في مكة، مخيمات منى، مخيمات عرفات): شجرة أماكن يُسند فيها الموظفون إلى أدوار، وتُوزَّع عليها التكتلات.",
    "في النسخة التجريبية حسابات الموظفين ثابتة في الكود بكلمة مرور مشتركة (1448). هنا جدول حسابات بكلمات مرور فردية وتغيير إلزامي عند أول دخول.",
], [
    T("permissions", "الصلاحيات", "صلاحيات الموظفين: مهام ثابتة لكل حساب، وإدارة ملفات تُمنح وتُسحب.", [
        c("code", "VARCHAR(40)", "المفتاح", pk=True),
        c("label", "VARCHAR(120)", "الاسم: systems.assign «منح صلاحيات الإدارة ومتابعتها»، staff.manage «إدارة الموظفين»، registration.manage «إدارة التسجيل على الحج»، admins.manage «إدارة الإداريين»، "
          "exams.manage «إدارة الامتحانات»، flights.manage «إدارة الطيران»، pilgrims.register «التسجيل على الحج»، registration.review «مراجعة الطلبات والوثائق»، season.settings «إعدادات الموسم»، "
          "lottery.import «إدخال نتائج القرعة»، lottery.approve «اعتماد ونشر النتائج»، operations.room «غرفة العمليات»، audit.read «سجل الأحداث»، content.manage «إدارة محتوى الموقع»، "
          "medical «الفريق الطبي»، transport «المواصلات»، ops.files «الملفات التشغيلية والبيانات المرجعية»"),
        c("kind", enum("task", "management"), "task صلاحية مهمة ثابتة؛ management إدارة ملف تُمنح عبر system_grants"),
        c("sort_order", "TINYINT", "الترتيب", d="0"),
    ], src="lib/staff.ts:14 Permission، PERMISSION_LABELS، MANAGEMENT_PERMISSIONS", seed="17 صلاحية."),

    T("staff_users", "حسابات الموظفين", "حساب الدخول إلى بوابة الموظفين. ينشئه قسم الموارد البشرية من الرقم الوطني والهاتف، وتُرسل كلمة مرور مؤقتة تُغيَّر عند أول دخول.", [
        pk(),
        c("username", "VARCHAR(40)", "اسم الدخول (أحرف صغيرة)", uq=True),
        person("national_id", "الرقم الوطني للموظف", null=True, uq=True),
        c("name", "VARCHAR(120)", "الاسم المعروض (يظهر فاعلاً في سجل الأحداث)"),
        c("title", "VARCHAR(160)", "المسمى في البوابة («مديرة الموسم»، «مسؤول الطيران»، «مشرفة قاعة امتحانية — مركز دمشق»)"),
        c("initials", "VARCHAR(4)", "حرف الصورة الرمزية"),
        c("travels", "TINYINT(1)", "مسافر مع البعثة («مسافر مع البعثة»)", d="0"),
        c("password_hash", "VARCHAR(255)", "بصمة كلمة المرور"),
        c("must_change_password", "TINYINT(1)", "كلمة مؤقتة تُغيَّر عند أول دخول", d="1"),
        c("status", enum("active", "disabled"), "الحالة", d="'active'"),
        c("last_login_at", "DATETIME(3)", "آخر دخول", null=True),
        *stamps(),
    ], src="lib/staff.ts:33 StaffUser، STAFF، STAFF_PASSWORD", seed="20 حساباً (سهى مراد مديرة الموسم، هبة القدسي، رنا حداد، مازن الحلبي، هيثم زيدان…)."),

    T("staff_user_permissions", "صلاحيات المهام للحساب", "صلاحيات المهام الثابتة لكل حساب. مديرة الموسم تحمل كل صلاحيات المهام.", [
        ref("staff_user_id", "staff_users", "الحساب", od="CASCADE"),
        code_ref("permission_code", "permissions", "الصلاحية"),
    ], uq=[("staff_user_id", "permission_code")], src="StaffUser.permissions"),

    T("management_systems", "ملفات الإدارة", "الملفات الخمسة، لكل ملف لوحة تحكم وعمليات في القائمة الجانبية.", [
        c("code", "VARCHAR(20)", "المفتاح: staff، registration، admins، exams، flights (الترتيب يحدد القائمة وصفحة الدخول)", pk=True),
        c("label", "VARCHAR(80)", "الاسم: «إدارة الموظفين»، «إدارة التسجيل على الحج»، «إدارة الإداريين»، «إدارة الامتحانات»، «إدارة الطيران»"),
        code_ref("permission_code", "permissions", "صلاحية الإدارة المقابلة"),
        c("description", "TEXT", "الشرح"),
        c("summary_href", "VARCHAR(120)", "رابط «لوحة التحكم»"),
        c("manage_href", "VARCHAR(120)", "رابط الإدارة"),
        c("opened_at", "DATETIME(3)", "متى فُتح الملف في الموسم", null=True),
        c("sort_order", "TINYINT", "الترتيب", d="0"),
    ], src="lib/systems.ts:15 SystemKey، :24 SYSTEMS، OPENED"),

    T("management_system_operations", "عمليات كل ملف", "التبويبات في القائمة الجانبية لكل ملف (المنطقة area تُكتب في سجل الأحداث).", [
        code_ref("system_code", "management_systems", "الملف", length=20, od="CASCADE"),
        c("area", "VARCHAR(30)", "المنطقة: register، add، accounts، season (الموظفون)؛ stages، add، steps، rules، payments، applications، seasons (التسجيل)؛ rules، reference، references، cadre، applicants، groups، clusters، directory، letters، evaluation، grading (الإداريون)؛ centers، exams، bank، people، sittings، live، review، results، oral، stats (الامتحانات)؛ refs، carriers، flights، allotments، dispatch (الطيران)"),
        c("label", "VARCHAR(80)", "الاسم المعروض"),
        c("href", "VARCHAR(160)", "الرابط"),
        c("description", "VARCHAR(300)", "الشرح", null=True),
        c("sort_order", "TINYINT", "الترتيب", d="0"),
    ], uq=[("system_code", "area")], src="systems.ts SystemOperation"),

    T("system_grants", "منح صلاحيات إدارة الملفات", "من يدير كل ملف. تمنحها وتسحبها مديرة الموسم (صلاحية systems.assign)، وكل منح وسحب حدث مهم.", [
        pk(), code_ref("system_code", "management_systems", "الملف", length=20),
        ref("staff_user_id", "staff_users", "الموظف الممنوح", od="CASCADE"),
        staff("granted_by_staff_id", "من منح", null=False),
        c("granted_at", "DATETIME(3)", "الوقت", d="CURRENT_TIMESTAMP(3)"),
        c("revoked_at", "DATETIME(3)", "سُحبت", null=True),
        staff("revoked_by_staff_id", "من سحب"),
    ], idx=[("system_code", "staff_user_id")], src="lib/systems.ts:114 Grant؛ DEFAULT_GRANTS؛ systemActions.grant، revoke",
       rules=["الصلاحيات الفعلية = صلاحيات المهام + إدارة الملفات الممنوحة غير المسحوبة. تُنبَّه المديرة حين يبقى ملف بلا من يديره."]),

    T("system_seen", "آخر اطلاع على أحداث الملفات", "متى اطلعت المديرة آخر مرة على الأحداث المهمة لكل ملف (لعدّ الجديد منها).", [
        ref("staff_user_id", "staff_users", "الموظف", od="CASCADE"),
        code_ref("system_code", "management_systems", "الملف", length=20),
        c("seen_at", "DATETIME(3)", "الوقت"),
    ], uq=[("staff_user_id", "system_code")], src="State.systems.seen"),

    T("escalations", "رفع أمر إلى المدير", "طلب يرفعه صاحب ملف إدارة إلى مديرة الموسم. الكود يحفظه حدثاً في السجل فقط بلا رد.", [
        pk(), code_ref("system_code", "management_systems", "الملف", length=20),
        staff("raised_by_staff_id", "من رفعه", null=False),
        c("text", "TEXT", "النص (5 أحرف على الأقل)"),
        c("raised_at", "DATETIME(3)", "الوقت", d="CURRENT_TIMESTAMP(3)"),
        c("reply", "TEXT", "رد المديرة", null=True),
        staff("resolved_by_staff_id", "من أغلقه"),
        c("resolved_at", "DATETIME(3)", "الإغلاق", null=True),
    ], new=True, src="app/staff/_components/system.tsx:99"),

    T("job_titles", "المسميات الوظيفية", "المسميات في سجل الموظفين (30 مسمى).", [
        pk(), c("title", "VARCHAR(80)", "المسمى: مدير إدارة، مدير مكتب، رئيس قسم، مساعد إداري، أمين سر، محاسب، … طبيب، ممرض، صيدلاني، مرشد ديني، مسؤول أمن وسلامة", uq=True),
        c("sort_order", "TINYINT", "الترتيب", d="0"),
    ], src="lib/ops.ts:33 JOB_TITLES"),

    T("employees", "سجل الموظفين", "موظفو البعثة: دائمون في الإدارة أو منتدبون من جهات أخرى.", [
        pk(),
        c("employee_no", "VARCHAR(12)", "رقم الموظف E-001…", uq=True),
        person("national_id", "الرقم الوطني (11 رقماً، فريد بين الموظفين)", uq=True),
        c("first_name", "VARCHAR(60)", "الاسم"),
        c("father_name", "VARCHAR(60)", "اسم الأب"),
        c("surname", "VARCHAR(60)", "الكنية"),
        c("gender", enum("male", "female"), "ذكر / أنثى"),
        c("birth_year", "SMALLINT UNSIGNED", "سنة الميلاد (1950–2005)"),
        code_ref("governorate_code", "governorates", "المحافظة", length=20),
        ref("job_title_id", "job_titles", "المسمى الوظيفي"),
        c("mission", enum("administrative", "religious", "medical", "media"), "البعثة: «البعثة الإدارية»، «البعثة الدينية»، «البعثة الصحية»، «البعثة الإعلامية»"),
        c("kind", enum("permanent", "external"), "permanent «موظف دائم في الإدارة»، external «منتدب من جهة أخرى»", d="'permanent'"),
        c("organization", "VARCHAR(120)", "الجهة المنتدِبة (إلزامية للمنتدب): وزارة الأوقاف، وزارة الصحة، الهلال الأحمر العربي السوري…", null=True),
        c("phone_sy", "VARCHAR(20)", "هاتف سوريا (10 أرقام على الأقل)"),
        c("phone_sa", "VARCHAR(20)", "هاتف السعودية بعد الوصول", null=True),
        c("email", "VARCHAR(160)", "البريد", null=True),
        staff("staff_user_id", "حساب البوابة المرتبط (فريد)"),
        c("suspended", "TINYINT(1)", "موقوف", d="0"),
        c("notes", "TEXT", "ملاحظات", null=True),
        *stamps(),
    ], uq=[("staff_user_id",)], src="lib/ops.ts:86 Employee؛ lib/data/employees-seed.ts؛ app/staff/employees",
       rules=["لا يُحذف موظف. ولا تُلغى مشاركته في الموسم وهو مُسند في ملف تشغيلي للموسم.",
              "السجل الناقص: هاتف سوريا أقل من 10 أرقام، أو رقم وطني غير صالح، أو منتدب بلا جهة."],
       checks=["kind = 'permanent' OR organization IS NOT NULL"], seed="152 موظفاً."),

    T("employee_seasons", "مواسم مشاركة الموظف", "المواسم التي شارك فيها الموظف.", [
        ref("employee_id", "employees", "الموظف", od="CASCADE"),
        season(),
    ], uq=[("employee_id", "season_year")], src="Employee.seasons"),

    T("employee_languages", "لغات الموظف", "اللغات (العربية افتراضياً).", [
        ref("employee_id", "employees", "الموظف", od="CASCADE"),
        ref("language_id", "languages", "اللغة"),
    ], uq=[("employee_id", "language_id")], src="Employee.languages"),

    T("hotels", "الفنادق", "فنادق مكة والمدينة المتعاقد معها في الموسم.", [
        pk(), season(),
        c("place_key", "VARCHAR(160)", "مفتاح ثابت عبر المواسم hotel:<المدينة>:<الاسم> لنقل البيانات من موسم إلى آخر"),
        c("name", "VARCHAR(120)", "الاسم («فندق أبراج النور»)"),
        c("city", enum("makkah", "madinah"), "«مكة المكرمة» / «المدينة المنورة»"),
        c("area", "VARCHAR(80)", "الحي («العزيزية الشمالية»)"),
        c("distance", "VARCHAR(30)", "المسافة كما في العقد («3.4 كم»، «450 م»)"),
        c("capacity", "SMALLINT UNSIGNED", "الأسرّة المتعاقد عليها", ck="capacity > 0"),
        c("licence_no", "VARCHAR(20)", "رقم الترخيص"),
        c("floors", "TINYINT UNSIGNED", "الطوابق", null=True),
        c("map_url", "VARCHAR(300)", "رابط الخريطة", null=True),
        c("archived", "TINYINT(1)", "مؤرشف (لا يُؤرشف ما يستعمله ملف تشغيلي)", d="0"),
    ], uq=[("season_year", "name")], src="lib/ops.ts:164 Hotel؛ ops-seed.ts", seed="1448: 18 فندقاً في مكة و7 في المدينة."),

    T("sectors", "قطاعات مكة", "قطاعات التسكين في مكة.", [
        pk(), season(),
        c("place_key", "VARCHAR(160)", "مفتاح ثابت عبر المواسم"),
        c("name", "VARCHAR(60)", "الاسم («القطاع الأول» … «القطاع الخامس»)"),
        c("zone", "VARCHAR(200)", "الأحياء («العزيزية الشمالية والجنوبية»…)"),
        c("sort_order", "TINYINT", "الترتيب", d="0"),
        c("archived", "TINYINT(1)", "مؤرشف", d="0"),
    ], uq=[("season_year", "name")], src="lib/ops.ts:180 Sector"),

    T("mashaer_centers", "مراكز منى وعرفات", "مراكز الخدمة في المشاعر وشركاتها.", [
        pk(), season(),
        c("place_key", "VARCHAR(160)", "مفتاح ثابت عبر المواسم"),
        c("mashaer", enum("mina", "arafat"), "«منى» / «عرفات»"),
        c("number", "SMALLINT UNSIGNED", "رقم المركز (الاسم «مركز <n>»)"),
        c("company", "VARCHAR(120)", "شركة الخدمة (شركة ركب الحجيج، شركة ضيوف البيت، شركة أنوار المشاعر)", null=True),
        c("archived", "TINYINT(1)", "مؤرشف", d="0"),
    ], uq=[("season_year", "mashaer", "number")], src="lib/ops.ts:191 Center"),

    T("camps", "المخيمات", "مخيمات منى وعرفات. توضع تحت مركز داخل الملف التشغيلي.", [
        pk(), season(),
        c("place_key", "VARCHAR(160)", "مفتاح ثابت عبر المواسم"),
        c("mashaer", enum("mina", "arafat"), "منى أو عرفات"),
        c("number", "VARCHAR(10)", "رقم المخيم (الاسم «مخيم <n>»)"),
        c("capacity", "SMALLINT UNSIGNED", "السعة", ck="capacity > 0"),
        c("location", "VARCHAR(200)", "الموقع («منى — المعيصم، المربع 7»)"),
        c("map_url", "VARCHAR(300)", "رابط الخريطة", null=True),
        c("archived", "TINYINT(1)", "مؤرشف", d="0"),
    ], uq=[("season_year", "mashaer", "number")], src="lib/ops.ts:203 Camp"),

    T("op_file_types", "أنواع الملفات التشغيلية", "التسكين في مكة (قطاعات ← أبراج)، مخيمات منى (مراكز ← مخيمات)، مخيمات عرفات.", [
        c("code", "VARCHAR(30)", "المفتاح: makkah-housing، mina-camps، arafat-camps", pk=True),
        c("name", "VARCHAR(200)", "الاسم («التسكين في مكة المكرمة — قطاعات وأبراج حجاج سوريا»…)"),
        c("short_name", "VARCHAR(80)", "الاسم المختصر"),
        c("description", "TEXT", "الشرح وشروط البدء والانتهاء"),
        c("outer_label", "VARCHAR(40)", "اسم المستوى الخارجي (القطاع / المركز)"),
        c("outer_ref", enum("sectors", "centers"), "مرجع المستوى الخارجي"),
        c("inner_label", "VARCHAR(40)", "اسم المستوى الداخلي (البرج / الفندق، المخيم)"),
        c("inner_ref", enum("hotels", "camps"), "مرجع المستوى الداخلي"),
        c("mashaer", enum("mina", "arafat"), "المشعر لملفات المخيمات", null=True),
        c("has_housing", "TINYINT(1)", "ملف تسكين (للأدوار الخارجية فندق يسكنه صاحبها)", d="0"),
        c("has_camp_fields", "TINYINT(1)", "حقول الخيمة والجهات المخصصة", d="0"),
        c("team_label", "VARCHAR(60)", "فريق على مستوى الملف («فريق الكوسترات» في منى)", null=True),
    ], src="lib/ops.ts:300 FileType"),

    T("op_file_type_dates", "مواعيد الملفات التشغيلية الافتراضية", "مدة كل نوع في كل موسم.", [
        code_ref("file_type_code", "op_file_types", "النوع", length=30),
        season(),
        c("starts_on", "DATE", "البداية"),
        c("ends_on", "DATE", "النهاية"),
    ], uq=[("file_type_code", "season_year")], seed="1448: التسكين 2027-04-08 → 05-31؛ منى 05-12 → 05-19؛ عرفات 05-13 → 05-15."),

    T("op_file_roles", "أدوار الملفات التشغيلية", "الأدوار في كل نوع ومستواها وتسلسلها.", [
        code_ref("file_type_code", "op_file_types", "النوع", length=30, od="CASCADE"),
        c("role_code", "VARCHAR(30)", "الدور: sector-head، sector-deputy، tower-supervisor، tower-deputy، mission-member؛ center-supervisor، camp-member، coaster-lead، coaster-member"),
        c("level", enum("file", "outer", "inner"), "المستوى"),
        c("name", "VARCHAR(80)", "الاسم: «رئيس القطاع»، «معاون رئيس القطاع»، «مشرف البرج»، «معاون مشرف البرج»، «عضو بعثة»، «مشرف المركز»، «عضو المخيم»، «مشرف فريق الكوسترات»، «عضو فريق الكوسترات»"),
        c("plural_name", "VARCHAR(80)", "الجمع", null=True),
        c("required", "TINYINT(1)", "إلزامي (نقصه «فجوة» تمنع التفعيل)", d="0"),
        c("multiple", "TINYINT(1)", "يقبل أكثر من شاغل", d="0"),
        c("max_holders", "TINYINT UNSIGNED", "الحد الأعلى (مشرفو المركز 2)", null=True),
        c("reports_to_role_code", "VARCHAR(30)", "الدور الذي يتبعه", null=True),
        c("description", "TEXT", "المهام"),
    ], uq=[("file_type_code", "role_code")], src="lib/ops.ts:304 Role"),

    T("operational_files", "الملفات التشغيلية", "ملف واحد لكل نوع في كل موسم: مسودة ثم مفعّل بقرار إداري.", [
        pk(), code_ref("file_type_code", "op_file_types", "النوع", length=30), season(),
        c("decision_no", "VARCHAR(30)", "رقم القرار الإداري (إلزامي للتفعيل)", null=True),
        c("starts_on", "DATE", "البداية"),
        c("ends_on", "DATE", "النهاية (≥ البداية)"),
        c("start_note", "VARCHAR(300)", "ملاحظة البداية", null=True),
        c("end_note", "VARCHAR(300)", "ملاحظة النهاية", null=True),
        c("report_cadence", enum("none", "daily", "weekly"), "none «بلا تقرير دوري»، daily «تقرير يومي»، weekly «تقرير أسبوعي»", d="'daily'"),
        c("status", enum("draft", "active"), "draft «مسودة» («إسناد مبدئي» في ملفاتي)، active «مفعّل» («نافذ»). «منتهٍ» محسوب بعد النهاية", d="'draft'"),
        c("activated_at", "DATETIME(3)", "التفعيل", null=True),
        staff("activated_by_staff_id", "من فعّله"),
        ref("copied_from_file_id", "operational_files", "الملف الذي نُسخ منه من الموسم السابق", null=True),
        staff("created_by_staff_id", "من أنشأه", null=False),
        *stamps(),
    ], uq=[("file_type_code", "season_year")], src="lib/ops.ts:560 OpFile؛ app/staff/operational-files",
       rules=["التفعيل يحتاج رقم القرار ولا فجوة (كل دور إلزامي مشغول). والإيقاف يعيده مسودة. وتُحذف المسودة فقط.",
              "النسخ من الموسم السابق يطابق الأماكن بمفتاحها place_key، وقد يحمل المشاركين غير الموقوفين، ويبدأ مسودة بلا رقم قرار."],
       checks=["ends_on >= starts_on"]),

    T("op_file_outer_nodes", "المستوى الخارجي في الملف", "قطاع (للتسكين) أو مركز (للمخيمات).", [
        pk(), ref("file_id", "operational_files", "الملف", od="CASCADE"),
        ref("sector_id", "sectors", "القطاع", null=True),
        ref("center_id", "mashaer_centers", "المركز", null=True),
        c("sort_order", "SMALLINT", "الترتيب", d="0"),
    ], src="OuterNode", checks=["(sector_id IS NULL) <> (center_id IS NULL)"]),

    T("op_file_inner_nodes", "المستوى الداخلي في الملف", "برج (فندق في مكة) أو مخيم، بعدد حجاجه.", [
        pk(), ref("outer_node_id", "op_file_outer_nodes", "العقدة الخارجية", od="CASCADE"),
        ref("hotel_id", "hotels", "الفندق (مكة فقط)", null=True),
        ref("camp_id", "camps", "المخيم", null=True),
        c("pilgrims", "INT UNSIGNED", "عدد الحجاج (يُحسب من التكتلات ويُعدَّل يدوياً)", d="0"),
        c("note", "VARCHAR(300)", "ملاحظة", null=True),
        c("tent_no", "VARCHAR(20)", "رقم الخيمة (المخيمات)", null=True),
        c("assigned_bodies", "VARCHAR(300)", "جهات مخصّصة («الإدارة الصحية — عيادة المخيم»)", null=True),
        c("sort_order", "SMALLINT", "الترتيب", d="0"),
    ], src="InnerNode", checks=["(hotel_id IS NULL) <> (camp_id IS NULL)"],
       rules=["الإشغال محسوب: الحجاج + الموظفون الساكنون مقابل السعة."]),

    T("op_inner_node_clusters", "التكتلات في البرج أو المخيم", "التكتلات الساكنة في كل عقدة. التكتل في عقدة داخلية واحدة في الملف.", [
        ref("inner_node_id", "op_file_inner_nodes", "العقدة", od="CASCADE"),
        ref("file_id", "operational_files", "الملف (مكرر لفرض الفرادة)", od="CASCADE"),
        ref("cluster_id", "clusters", "التكتل"),
    ], uq=[("file_id", "cluster_id")], src="InnerNode.clusters",
       rules=["منها يُشتق من يقيّم التكتل بعد الموسم (peer_evaluations): موظفو العقدة الداخلية ومن فوقهم في العقدة الخارجية."]),

    T("op_file_assignments", "إسناد الموظفين في الملفات", "موظف في دور، على مستوى الملف أو قطاع/مركز أو برج/مخيم.", [
        pk(), ref("file_id", "operational_files", "الملف", od="CASCADE"),
        ref("outer_node_id", "op_file_outer_nodes", "العقدة الخارجية", null=True, od="CASCADE"),
        ref("inner_node_id", "op_file_inner_nodes", "العقدة الداخلية", null=True, od="CASCADE"),
        c("role_code", "VARCHAR(30)", "الدور (من أدوار نوع الملف)"),
        ref("employee_id", "employees", "الموظف (مشارك في الموسم وغير موقوف)"),
        ref("housing_hotel_id", "hotels", "للأدوار الخارجية في التسكين: الفندق الذي يسكنه", null=True),
        staff("assigned_by_staff_id", "من أسنده"),
        c("assigned_at", "DATETIME(3)", "الوقت", d="CURRENT_TIMESTAMP(3)"),
    ], uq=[("file_id", "employee_id", "role_code", "outer_node_id", "inner_node_id")], src="lib/ops.ts:522 Assignment",
       rules=["الدور الفردي يُستبدل شاغله، والمتعدد يُضاف إليه حتى حده. «نقل» الموظف يزيله من كل موقع آخر في الملف نفسه، ويجوز أن يكون في ملفات مختلفة.",
              "«ملفاتي التشغيلية» لكل موظف تُقرأ من هذا الجدول عبر employees.staff_user_id."]),

    T("internal_tasks", "المهام الداخلية لغرفة العمليات", "مهام الغرفة بأعمدتها. الكود يعيد بناءها من سجل الأحداث؛ هنا جدول.", [
        pk(), season(),
        c("task_no", "VARCHAR(12)", "رقم المهمة T-…", uq=True),
        c("title", "VARCHAR(300)", "العنوان (5 أحرف على الأقل)"),
        staff("created_by_staff_id", "من أنشأها", null=False),
        c("assigned_to_label", "VARCHAR(120)", "إلى («غرفة العمليات» افتراضياً)"),
        c("column_key", enum("todo", "doing", "done", "verified"), "todo «جديدة»، doing «قيد التنفيذ»، done «منجزة»، verified «تم التحقق»", d="'todo'"),
        c("evidence", "VARCHAR(200)", "الإثبات المطلوب", null=True),
        c("due_label", "VARCHAR(60)", "الموعد («اليوم 18:00»، «فوري»)", null=True),
        *stamps(),
    ], new=True, src="app/staff/operations/tasks.tsx (من الأحداث)"),

    T("internal_task_moves", "حركة المهام بين الأعمدة", "كل نقل خطوة إلى الأمام أو الخلف.", [
        pk(), ref("task_id", "internal_tasks", "المهمة", od="CASCADE"),
        c("from_column", "VARCHAR(10)", "من"),
        c("to_column", "VARCHAR(10)", "إلى"),
        staff("moved_by_staff_id", "من نقلها", null=False),
        c("moved_at", "DATETIME(3)", "الوقت", d="CURRENT_TIMESTAMP(3)"),
    ], new=True),

    T("ops_decisions", "قرارات الغرفة التشغيلية", "قرارات مثل اعتماد حافلة إضافية لمزدلفة («8 حافلات — 400 مقعد» ← «9 حافلات — 450 مقعداً»). الكود يحفظها حدثاً فقط.", [
        pk(), season(),
        c("kind", "VARCHAR(40)", "نوع القرار (extra-bus…)"),
        c("subject", "VARCHAR(200)", "الموضوع"),
        c("before_value", "VARCHAR(200)", "قبل", null=True),
        c("after_value", "VARCHAR(200)", "بعد", null=True),
        staff("decided_by_staff_id", "من قرر", null=False),
        c("decided_at", "DATETIME(3)", "الوقت", d="CURRENT_TIMESTAMP(3)"),
    ], new=True, src="app/staff/operations/view.tsx BusNotice"),

    T("season_meals", "مواعيد الوجبات وقوائمها", "الفطور والغداء في فنادق مكة والمدينة لكل موسم.", [
        season(),
        c("city", enum("makkah", "madinah"), "المدينة"),
        c("meal", enum("breakfast", "lunch"), "الوجبة"),
        c("time_from", "TIME", "من"),
        c("time_to", "TIME", "إلى"),
        c("menu", "TEXT", "القائمة (فارغة = «قائمة الفندق اليومية»)", null=True),
        staff("updated_by_staff_id", "آخر من عدّل"),
        updated(),
    ], uq=[("season_year", "city", "meal")], src="SeasonOverrides.meal*، menu*؛ lib/season-live.ts:47 DEFAULT_MEALS",
       seed="مكة 06:00–09:00 و13:00–15:00؛ المدينة 05:30–08:30 و13:00–15:00."),
], flow=[
    "تنشئ الموارد البشرية staff_users وتربطها بـemployees، وتمنح المديرة system_grants لإدارة الملفات.",
    "يجهز مدير شؤون البعثة hotels وsectors وmashaer_centers وcamps للموسم، ثم operational_files بعقدها وتكتلاتها وإسناداتها، ويفعّلها بقرار.",
    "تدير غرفة العمليات البلاغات (tickets) وinternal_tasks وops_decisions، وتقرأ التقارير اليومية للتكتلات.",
])
