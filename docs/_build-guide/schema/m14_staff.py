# -*- coding: utf-8 -*-
from .dsl import *

MODULE = M("staff", "الموظفون والصلاحيات والملفات التشغيلية", [
    "بوابة الموظفين لموظفي الإدارة والبعثة، وفيها 21 نظاماً. لا يُسند موظف إلى نظام: تُمنح له الصلاحيات واحدة واحدة، لكل مورد في كل نظام "
    "عرضه (GET) وإضافته (POST) وتعديله (PUT) وحذفه (DELETE) وأفعال بأسمائها (اعتماد، نشر، تصدير…)، ومفتاحها ‹النظام›.‹المورد›.‹الفعل› مثل flights.flights.lock. "
    "والعرض نفسه صلاحية: لا يظهر نظام في قائمة موظف لا يملك فيه عرض شيء. وأرقام كل نظام من أحد عشر نظاماً ليست ملفات إدارة صلاحية مستقلة ‹النظام›.stats.GET «الإحصائيات» لا تفتح صفحاته. وبعض الصلاحيات تُمنح لنطاق بعينه: مشرف القاعة من يملك hall.* لمركزها، "
    "ومندوب المطار من يملك airport.* لمطاره، ومواعيد العمليات season.windows لعمليات بعينها. يمنحها ويسحبها من يملك access.permissions.PUT، وكل منح وسحب حدث مهم.",
    "«سجل الموظفين» يحفظ موظفي البعثة (دائمين ومنتدبين) ومواسم مشاركتهم. و«البيانات المرجعية» أماكن كل موسم: فنادق مكة والمدينة، قطاعات مكة، مراكز منى وعرفات، مخيماتها. "
    "و«الملفات التشغيلية» ملف لكل نوع في كل موسم (التسكين في مكة، التسكين في المدينة، مخيمات منى، مخيمات عرفات): شجرة أماكن يُسند فيها الموظفون إلى أدوار، وتُوزَّع عليها التكتلات.",
    "في النسخة التجريبية حسابات الموظفين ثابتة في الكود بكلمة مرور مشتركة (1448). هنا جدول حسابات بكلمات مرور فردية وتغيير إلزامي عند أول دخول.",
], [
    T("permission_systems", "أنظمة بوابة الموظفين", "الأنظمة الواحد والعشرون التي تُمنح عليها الصلاحيات، بترتيب القائمة.", [
        c("code", "VARCHAR(20)", "المفتاح: access، staff، registration، reviews، office، lottery، admins، exams، hall، flights، airport، season، operations، medical، transport، opfiles، reference، audit، executive، content، evaluate", pk=True),
        c("label", "VARCHAR(80)", "الاسم: «صلاحيات الموظفين»، «إدارة الموظفين»، «إدارة التسجيل على الحج»، «مراجعة الطلبات والوثائق»، «التسجيل في المكتب»، «القبول المباشر والقرعة»، «إدارة الإداريين»، «إدارة الامتحانات»، «قاعة الامتحان»، «إدارة الطيران»، «رحلات المطار»، «إعدادات الموسم»، «غرفة العمليات»، «الفريق الطبي»، «المواصلات»، «الملفات التشغيلية»، «البيانات المرجعية»، «سجل الأحداث»، «لوحة الإدارة العليا»، «محتوى الموقع»، «تقييم الإداريين بعد الموسم»"),
        c("description", "VARCHAR(300)", "الشرح"),
        c("href", "VARCHAR(120)", "رابط النظام في البوابة"),
        c("scope_kind", enum("center", "airport", "operation", "collection", "office", "opfileType", "posting"), "نطاق صلاحيات النظام كله إن وُجد: center للقاعة، airport للمطار، office للمكتب، opfileType لنوع الملف التشغيلي، posting لمواقع الموظف في الملفات التشغيلية", null=True),
        c("sort_order", "TINYINT", "الترتيب", d="0"),
    ], src="lib/permissions.ts:48 CATALOG", seed="21 نظاماً."),

    T("permission_resources", "موارد كل نظام", "ما يُمنح عليه في كل نظام: الرحلات، الكشوف، بنك الأسئلة، الكادر… مع علامة الحساس والنطاق.", [
        pk(), code_ref("system_code", "permission_systems", "النظام", length=20, od="CASCADE"),
        c("resource_key", "VARCHAR(40)", "مفتاح المورد في النظام (flights، manifests، questions-answers، stats…)"),
        c("label", "VARCHAR(120)", "الاسم المعروض"),
        c("sensitive", "TINYINT(1)", "بيانات شخصية أو سرية تُمنح وحدها (الرقم الوطني، الهواتف، الأجوبة الصحيحة، الكشوف…)", d="0"),
        c("scope_kind", enum("center", "airport", "operation", "collection", "office", "opfileType", "posting"), "نطاق المورد إن كان له نطاق غير نطاق نظامه: operation لمواعيد العمليات، collection لعناصر مجموعات المحتوى", null=True),
        c("note", "VARCHAR(200)", "قاعدة تُفرض في الكود («من أدخل النتائج لا يعتمدها»)", null=True),
        c("sort_order", "TINYINT", "الترتيب", d="0"),
    ], uq=[("system_code", "resource_key")], src="lib/permissions.ts:29 ResourceDef؛ lib/permissions.ts:396 STATS_SYSTEMS", seed="144 مورداً، منها 18 حساساً، و10 موارد «الإحصائيات» (stats).",
       rules=["المورد stats «الإحصائيات» في أحد عشر نظاماً (reviews، office، lottery، season، operations، medical، transport، opfiles، reference، audit، content): عرضه يفتح صفحة أرقام النظام (/staff/stats/‹النظام›) وحدها، "
              "ولا يُعد من صلاحيات عرض النظام، فلا يفتح صفحاته. وفي exams مورد stats آخر هو عملية «الإحصائيات» في الملف، يُعد من صلاحيات عرضه."]),

    T("permissions", "الصلاحيات", "كل صلاحية تُمنح على حدة: فعل على مورد في نظام.", [
        c("code", "VARCHAR(80)", "المفتاح ‹النظام›.‹المورد›.‹الفعل›: flights.flights.GET، flights.flights.lock، lottery.draw.publish…", pk=True),
        ref("resource_id", "permission_resources", "المورد", od="CASCADE"),
        c("verb", "VARCHAR(30)", "الفعل: GET، POST، PUT، DELETE، أو اسم فعل خاص (approve، publish، export، lock…)"),
        c("kind", enum("verb", "special"), "verb أحد الأفعال الأربعة؛ special فعل خاص بالاسم"),
        c("label", "VARCHAR(120)", "الاسم: «عرض»، «إضافة»، «تعديل»، «حذف»، أو اسم الفعل الخاص («إقفال وإصدار الكشف»)"),
    ], uq=[("resource_id", "verb")], src="lib/permissions.ts:382 keysOf، ALL_KEYS", seed="413 صلاحية.",
       rules=["كل فعل على مورد يحتاج عرضه: من يُمنح POST أو PUT أو DELETE أو فعلاً خاصاً يُمنح GET المورد نفسه معه، ومن يُسحب منه GET يُسحب منه كل ما على المورد."]),

    T("staff_users", "حسابات الموظفين", "حساب الدخول إلى بوابة الموظفين. ينشئه قسم الموارد البشرية من الرقم الوطني والهاتف، وتُرسل كلمة مرور مؤقتة تُغيَّر عند أول دخول.", [
        pk(),
        c("username", "VARCHAR(40)", "اسم الدخول (أحرف صغيرة)", uq=True),
        person("national_id", "الرقم الوطني للموظف", null=True, uq=True),
        c("name", "VARCHAR(120)", "الاسم المعروض (يظهر فاعلاً في سجل الأحداث)"),
        c("title", "VARCHAR(160)", "المسمى في البوابة («مدير الموسم»، «مسؤول الطيران»، «مشرفة قاعة امتحانية — مركز دمشق»)"),
        c("initials", "VARCHAR(4)", "حرف الصورة الرمزية"),
        c("travels", "TINYINT(1)", "مسافر مع البعثة («مسافر مع البعثة»)", d="0"),
        c("password_hash", "VARCHAR(255)", "بصمة كلمة المرور"),
        c("must_change_password", "TINYINT(1)", "كلمة مؤقتة تُغيَّر عند أول دخول", d="1"),
        c("status", enum("active", "disabled"), "الحالة", d="'active'"),
        c("last_login_at", "DATETIME(3)", "آخر دخول", null=True),
        *stamps(),
    ], src="lib/staff.ts:33 StaffUser، STAFF، STAFF_PASSWORD", seed="21 حساباً (نور الأعرج مدير الموسم، هبة القدسي، رنا حداد، مازن الحلبي، هيثم زيدان…)."),

    T("staff_user_permissions", "صلاحيات كل موظف", "الصلاحيات الممنوحة لكل حساب مباشرة، بلا أدوار وبلا إسناد لنظام. يمنحها ويسحبها من يملك access.permissions.PUT من «صلاحيات الموظفين».", [
        pk(), ref("staff_user_id", "staff_users", "الحساب", od="CASCADE"),
        code_ref("permission_code", "permissions", "الصلاحية", length=80),
        staff("granted_by_staff_id", "من منحها (فارغ لما فُتح به الموسم)"),
        c("granted_at", "DATETIME(3)", "وقت المنح", d="CURRENT_TIMESTAMP(3)"),
    ], uq=[("staff_user_id", "permission_code")], src="lib/permissions.ts:421 PermGrant؛ StaffUser.grants؛ State.staffPermissions؛ actions.setStaffPermissions",
       seed="صلاحيات الحسابات الواحد والعشرين كما فُتح بها الموسم (lib/staff.ts STAFF): مدير الموسم access.* وexecutive.* وحدهما، مسؤولة إعدادات الموسم season.*، مسؤولة البيانات المرجعية reference.*، مسؤول الطيران flights.*، مندوب مطار دمشق airport.* لمطار دمشق، مشرفة قاعة دمشق hall.* لمركز دمشق…",
       rules=["السحب حذف للسطر، والمنح إضافة له؛ ويُكتب كل منهما في audit_events حدثاً مهماً (system_code = access) بما مُنح وما سُحب وما تغيّر نطاقه.",
              "لا يسحب أحد من نفسه access.permissions.PUT: يسحبها منه غيره ممن يملكها."]),

    T("staff_user_permission_scopes", "نطاق كل صلاحية ممنوحة", "حين تُمنح صلاحية لنطاق بعينه: المراكز أو المطارات أو العمليات أو المجموعات التي تقتصر عليها. بلا أسطر هنا تسري الصلاحية في كل مكان.", [
        ref("staff_user_permission_id", "staff_user_permissions", "الصلاحية الممنوحة", od="CASCADE"),
        c("scope_id", "VARCHAR(40)", "معرّف ما تقتصر عليه، بحسب scope_kind لمورده أو نظامه: معرّف المركز (exam_centers)، أو المطار (airports)، أو مفتاح العملية (operations)، أو المجموعة (cms_collections)، أو المكتب، أو نوع الملف التشغيلي"),
    ], uq=[("staff_user_permission_id", "scope_id")], src="PermGrant.scope؛ lib/permissions.ts:427 can(user, key, scopeId)",
       rules=["مشرف القاعة من يملك hall.sittings.GET لمركزها، ومندوب المطار من يملك airport.flights.GET لمطاره: لا جدول إسناد لهما.",
              "مواعيد عملية تتغير بيد من يملك season.windows.PUT لها."]),

    T("management_systems", "ملفات الإدارة", "الملفات الخمسة، لكل ملف لوحة تحكم وعمليات في القائمة الجانبية.", [
        c("code", "VARCHAR(20)", "المفتاح: staff، registration، admins، exams، flights (الترتيب يحدد القائمة وصفحة الدخول)", pk=True),
        c("label", "VARCHAR(80)", "الاسم: «إدارة الموظفين»، «إدارة التسجيل على الحج»، «إدارة الإداريين»، «إدارة الامتحانات»، «إدارة الطيران»"),
        c("description", "TEXT", "الشرح"),
        c("summary_href", "VARCHAR(120)", "رابط «الإحصائيات والسجل»"),
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

    T("management_operation_permissions", "ما يفتح كل عملية", "صلاحيات العرض التي يكفي أحدها لتظهر العملية في قائمة الموظف وتُفتح صفحتها.", [
        code_ref("system_code", "management_systems", "الملف", length=20),
        c("area", "VARCHAR(30)", "العملية"),
        code_ref("permission_code", "permissions", "صلاحية عرض تفتحها", length=80),
    ], uq=[("system_code", "area", "permission_code")], src="SystemOperation.perms؛ canOperation",
       rules=["(system_code، area) يشير إلى عملية في management_system_operations."]),

    T("system_seen", "آخر اطلاع على أحداث الملفات", "متى اطلع المدير آخر مرة على الأحداث المهمة لكل ملف (لعدّ الجديد منها).", [
        ref("staff_user_id", "staff_users", "الموظف", od="CASCADE"),
        code_ref("system_code", "management_systems", "الملف", length=20),
        c("seen_at", "DATETIME(3)", "الوقت"),
    ], uq=[("staff_user_id", "system_code")], src="State.systems.seen"),

    T("escalations", "رفع أمر إلى المدير", "طلب يرفعه من يعمل في ملف إدارة إلى مدير الموسم، ويراه من يملك access.escalations.GET. الكود يحفظه حدثاً في السجل فقط بلا رد.", [
        pk(), code_ref("system_code", "management_systems", "الملف", length=20),
        staff("raised_by_staff_id", "من رفعه", null=False),
        c("text", "TEXT", "النص (5 أحرف على الأقل)"),
        c("raised_at", "DATETIME(3)", "الوقت", d="CURRENT_TIMESTAMP(3)"),
        c("reply", "TEXT", "رد المدير", null=True),
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
       checks=["kind = 'permanent' OR organization IS NOT NULL"], seed="153 موظفاً، منهم 113 يسافرون في 1448، ولكل حساب من حسابات البوابة الواحد والعشرين سجل."),

    T("employee_seasons", "مواسم مشاركة الموظف", "المواسم التي شارك فيها الموظف.", [
        ref("employee_id", "employees", "الموظف", od="CASCADE"),
        season(),
    ], uq=[("employee_id", "season_year")], src="Employee.seasons؛ app/staff/my-files/view.tsx:24",
       rules=["سطر هنا للموسم يعني أن الموظف يسافر مع البعثة فيه: له في «ملفاتي التشغيلية» رحلتا ذهاب وعودة (flight_assignments) ومواقعه في الملفات التشغيلية. "
              "ومن لا سطر له للموسم يعمل من مكتبه في سوريا: لا رحلة له ولا موقع، ويرى «لا تسافر مع البعثة»."]),

    T("staff_circulars", "القرارات والتعميمات", "ما تصدره الإدارة إلى موظفيها: قرار أو تعميم برقمه وتاريخه ونصه. مسودة لا يراها أحد، ثم منشور يصل إلى جمهوره، ثم مؤرشف. لا يُعدَّل نص المنشور.", [
        pk(),
        c("kind", enum("decision", "circular"), "decision «قرار»، circular «تعميم»"),
        c("number", "VARCHAR(30)", "الرقم (مثل 14/1448)"),
        c("title", "VARCHAR(200)", "العنوان (5 أحرف على الأقل)"),
        c("body", "TEXT", "النص، كل سطر فقرة (20 حرفاً على الأقل)"),
        c("issued_on", "DATE", "تاريخ الإصدار"),
        c("audience", enum("all", "files", "staff"), "all كل الموظفين، files موظفو ملفات تشغيلية، staff موظفون بأسمائهم"),
        c("status", enum("draft", "published", "archived"), "الحال", d="'draft'"),
        staff("created_by_staff_id", "من كتبه", null=False),
        staff("published_by_staff_id", "من نشره"),
        c("published_at", "DATETIME(3)", "وقت النشر", null=True),
    ], new=True, src="lib/circulars.ts Circular؛ app/staff/employees/circulars.tsx",
       rules=["يُنشر بصلاحية staff.circulars.publish. مرفقاته في staff_circular_files، وجمهوره في staff_circular_audience حين لا يكون «الكل»."]),

    T("staff_circular_audience", "جمهور القرار أو التعميم", "حين لا يُوجَّه إلى كل الموظفين: نوع ملف تشغيلي (فيصل إلى من أُسند فيه في الموسم الجاري) أو حساب موظف بعينه.", [
        ref("circular_id", "staff_circulars", "القرار أو التعميم", od="CASCADE"),
        c("file_type_code", "VARCHAR(40)", "نوع الملف التشغيلي (op_file_types.code)", null=True),
        staff("staff_user_id", "موظف بعينه"),
    ], new=True, checks=["(file_type_code IS NULL) <> (staff_user_id IS NULL)"]),

    T("staff_circular_files", "مرفقات القرار أو التعميم", "صورة أو مستند يُرفق به.", [
        ref("circular_id", "staff_circulars", "القرار أو التعميم", od="CASCADE"),
        file_("file_id", "الملف"),
    ], new=True),

    T("staff_circular_reads", "الاطّلاع على القرارات والتعميمات", "كل موظف ضغط «اطّلعت عليه»، بوقته.", [
        ref("circular_id", "staff_circulars", "القرار أو التعميم", od="CASCADE"),
        staff("staff_user_id", "الموظف", null=False),
        c("read_at", "DATETIME(3)", "وقت الاطّلاع", d="CURRENT_TIMESTAMP(3)"),
    ], uq=[("circular_id", "staff_user_id")], new=True, src="Circular.reads؛ circularActions.read"),

    T("employee_languages", "لغات الموظف", "اللغات (العربية افتراضياً).", [
        ref("employee_id", "employees", "الموظف", od="CASCADE"),
        ref("language_id", "languages", "اللغة"),
    ], uq=[("employee_id", "language_id")], src="Employee.languages"),

    T("hotels", "الفنادق", "فنادق مكة والمدينة المتعاقد معها في الموسم، وكل ما يقرؤه الحاج عن الفندق (النجوم والغرف والمزايا والموقع) يدخله الموظفون هنا، ويختارها رؤساء التكتلات من قائمة منسدلة.", [
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
        c("stars", "TINYINT UNSIGNED", "عدد النجوم (1–5) في صفحة التكتل", null=True, ck="stars BETWEEN 1 AND 5"),
        c("rooms", "VARCHAR(120)", "نوع الغرف («غرف ثلاثية ورباعية») في صفحة التكتل", null=True),
        c("features", "JSON", "مزايا الفندق، سطر لكل ميزة، في صفحة التكتل", null=True),
        c("lat", "DECIMAL(9,6)", "خط عرض الفندق على الخريطة؛ تُحسب منه المسافة", null=True),
        c("lng", "DECIMAL(9,6)", "خط طول الفندق على الخريطة", null=True),
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

    T("op_file_types", "أنواع الملفات التشغيلية", "التسكين في مكة (قطاعات ← أبراج)، التسكين في المدينة (فنادق المدينة وحدها)، مخيمات منى (مراكز ← مخيمات)، مخيمات عرفات، الطيران ولجنة التقييم (فريقان على الملف نفسه، بلا أماكن).", [
        c("code", "VARCHAR(30)", "المفتاح: makkah-housing، madinah-housing، mina-camps، arafat-camps، flights، evaluation-committee", pk=True),
        c("name", "VARCHAR(200)", "الاسم («التسكين في مكة المكرمة — قطاعات وأبراج حجاج سوريا»…)"),
        c("short_name", "VARCHAR(80)", "الاسم المختصر"),
        c("description", "TEXT", "الشرح وشروط البدء والانتهاء"),
        c("outer_label", "VARCHAR(40)", "اسم المستوى الخارجي (القطاع / المركز / الفندق في ملف المدينة)؛ فارغ في ملفي الطيران ولجنة التقييم", null=True),
        c("outer_ref", enum("sectors", "centers", "hotels"), "مرجع المستوى الخارجي", null=True),
        c("inner_label", "VARCHAR(40)", "اسم المستوى الداخلي (البرج / الفندق، المخيم)", null=True),
        c("inner_ref", enum("hotels", "camps"), "مرجع المستوى الداخلي (فارغ في ملف المدينة: لا مستوى داخلي)", null=True),
        c("mashaer", enum("mina", "arafat"), "المشعر لملفات المخيمات", null=True),
        c("has_housing", "TINYINT(1)", "ملف تسكين (للأدوار الخارجية فندق يسكنه صاحبها)", d="0"),
        c("evaluates_stages", "JSON", "مراحل التقييم التي يراها موظفو الملف فيقيّمون فيها (مكة: makkah، المدينة: madinah، منى وعرفات: mashaer، الطيران: airport وtravel)", null=True),
        c("evaluates_all", "TINYINT(1)", "فريق يقيّم كل التكتلات لا ما سكن عنده (مشرفو الطيران)", d="0"),
        c("decides", "TINYINT(1)", "أعضاء الملف يبتّون في الاعتراضات على التقييم (لجنة التقييم)", d="0"),
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

], flow=[
    "تنشئ الموارد البشرية staff_users وتربطها بـemployees، ويمنح صاحب «صلاحيات الموظفين» كل حساب staff_user_permissions واحدة واحدة، بنطاقها في staff_user_permission_scopes إن كان لها نطاق.",
    "يجهز مدير شؤون البعثة hotels وsectors وmashaer_centers وcamps للموسم، ثم operational_files بعقدها وتكتلاتها وإسناداتها، ويفعّلها بقرار.",
    "تدير غرفة العمليات البلاغات (tickets) وinternal_tasks وops_decisions، وتقرأ التقارير اليومية للتكتلات.",
])
