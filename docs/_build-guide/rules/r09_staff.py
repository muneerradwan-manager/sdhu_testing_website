# -*- coding: utf-8 -*-
from .dsl import *

DOMAIN = D("staff", "STF", "الموظفون والصلاحيات والمواسم", [
    "يغطي هذا الفصل بوابة الموظفين وحوكمتها: الدخول، والصلاحيات (فعل على مورد في نظام، بلا أدوار ولا إسناد لنظام، وبعضها لنطاق بعينه)، ومن يمنحها، "
    "ومشرف القاعة ومندوب المطار صلاحيتين بنطاق، وسجل الأحداث، وإعدادات الموسم وتدقيق تعديلها، ودورة حياة الموسم في إعدادات التسجيل "
    "(موسم قيد الإعداد ونشط ومؤرشف، ومسودة تُنشر إصدارات لا تتغير)، وبدء موسم تشكيل جديد، ونشر محتوى الموقع، "
    "وصفحات «الإحصائيات» و«لوحة الإدارة العليا» وترتيب القائمة.",
    "القيم مأخوذة من lib/permissions.ts (كتالوج الصلاحيات) وlib/staff.ts وlib/systems.ts وapp/staff (الحراسة والشاشات)، وlib/store.ts (سجل الأحداث وإعدادات الموسم)، "
    "وlib/season.ts وlib/season-live.ts، وlib/registration (المواسم والإصدارات)، وlib/cms (المحتوى). "
    "الحسابات في النسخة التجريبية ثابتة وكلمة مرورها واحدة؛ ما يجب أن يختلف في المنصة الحقيقية مذكور في «الفجوة».",
], [
    # ───────────── الدخول ─────────────
    R("STF-01", "لا ينشئ الموظف حسابه بنفسه",
      "حساب بوابة الموظفين لا يُنشأ ذاتياً. يدخل الموظف باسم المستخدم وكلمة المرور؛ يُقارن اسم المستخدم بعد حذف المسافات وتحويله إلى أحرف صغيرة. "
      "الخطأ في أيهما يعطي رسالة واحدة: «اسم المستخدم أو كلمة المرور غير صحيحة».",
      src=["app/staff/_components/login.tsx:44", "app/staff/_components/login.tsx:45", "lib/staff.ts:2"],
      data=["staff_users.username", "staff_users.password_hash"],
      gap="في التجربة الحسابات قائمة ثابتة وكلمة المرور واحدة للجميع (1448، lib/staff.ts:70). المنصة الحقيقية: حساب ينشئه «إدارة الموظفين» بالرقم الوطني والهاتف، "
          "وكلمة مرور مؤقتة تُرسل إلى الهاتف ويُلزم تغييرها عند أول دخول (must_change_password)، وتخزين مشفّر لكلمة المرور."),
    R("STF-02", "تسجيل الدخول والخروج",
      "كل دخول إلى بوابة الموظفين وكل خروج منها حدث في سجل الأحداث باسم الموظف وصفته.",
      src=["app/staff/_components/login.tsx:37", "app/staff/_components/frame.tsx:306"],
      data=["audit_events.actor_staff_id", "auth_sessions.staff_user_id"]),
    R("STF-03", "الصفحة الأولى بعد الدخول",
      "يصل الموظف إلى: «لوحة الإدارة العليا» إن ملك عرضها؛ وإلا «صلاحيات الموظفين» إن ملك عرض شيء فيها؛ وإلا لوحة أول ملف إدارة يملك عرض لوحته، أو أول عملية فيه يملك عرض ما فيها؛ "
      "وإلا أول «الإحصائيات» يملكها بترتيب القائمة (الأرقام قبل العمل)، وإلا أول صفحة نظام آخر يملك فيها شيئاً بترتيب القائمة؛ "
      "وإلا «قاعتي الامتحانية» إن ملك «قاعة الامتحان» لمركز؛ وإلا «رحلات مطاري» إن ملك «رحلات المطار» لمطار؛ وإلا «ملفاتي التشغيلية».",
      src=["app/staff/_components/kit.tsx:75", "app/staff/_components/kit.tsx:76", "app/staff/_components/kit.tsx:77", "app/staff/_components/kit.tsx:78",
           "app/staff/_components/kit.tsx:84", "app/staff/_components/kit.tsx:85", "app/staff/_components/kit.tsx:88", "app/staff/_components/kit.tsx:67"],
      data=["staff_user_permissions", "staff_user_permission_scopes"],
      ex="نور الأعرج وطارق مصطفى يصلان إلى «لوحة الإدارة العليا»؛ ولبنى الشهابي إلى إحصائيات «إعدادات الموسم»؛ ورنا حداد إلى إحصائيات «مراجعة الطلبات والوثائق»؛ وكنان الأحمد إلى إحصائيات القرعة؛ "
         "ووسام خوري، ولا يملك إلا «تقييم الإداريين بعد الموسم»، إلى «ملفاتي التشغيلية»."),
    R("STF-04", "«ملفاتي التشغيلية» ظاهرة دائماً",
      "يظهر بند «ملفاتي التشغيلية» في قائمة كل موظف دون أي صلاحية، ويعرض رحلتيه إن سافر مع البعثة ومواقعه في الملفات التشغيلية. "
      "وكل بند آخر يظهر لمن يملك صلاحية عرض واحدة على الأقل مما يفتحه، وبند «الإحصائيات» لمن يملك صلاحيتها.",
      src=["app/staff/_components/frame.tsx:158", "app/staff/_components/frame.tsx:183", "app/staff/_components/frame.tsx:301"],
      data=["op_file_assignments.employee_id", "flight_assignments.employee_id"]),

    # ───────────── الصلاحيات ─────────────
    R("STF-05", "الصلاحية فعل على مورد في نظام",
      "في بوابة الموظفين 21 نظاماً، لكل نظام موارده (143 مورداً)، ولكل مورد أفعاله: العرض (GET) والإضافة (POST) والتعديل (PUT) والحذف (DELETE)، "
      "وأفعال بأسمائها حيث لا تكفي (اعتماد، نشر، إقفال، تصدير، إرجاع إلى الأصل…). كل صلاحية مفتاح ‹النظام›.‹المورد›.‹الفعل›، والمجموع 409. "
      "والعرض نفسه صلاحية، و18 مورداً حساساً (الرقم الوطني، الهواتف، الأجوبة الصحيحة، الكشوف…) تُمنح وحدها.",
      src=["lib/permissions.ts:48", "lib/permissions.ts:29", "lib/permissions.ts:383"],
      cfg="lib/permissions.ts CATALOG",
      data=["permission_systems.code", "permission_resources.sensitive", "permissions.code", "permissions.kind"],
      ex="flights.flights.GET عرض الرحلات؛ flights.flights.lock إقفالها وإصدار كشفها؛ lottery.draw.publish اعتماد نتائج القرعة ونشرها."),
    R("STF-06", "مدير الموسم",
      "مدير الموسم يفتتح الموسم بالصلاحيات كاملة في صلاحيات الموظفين والتسجيل في المكتب والمراجعة وإعدادات الموسم والقرعة وغرفة العمليات وسجل الأحداث ولوحة الإدارة العليا "
      "والمحتوى والطبي والمواصلات والملفات التشغيلية والبيانات المرجعية، ولا صلاحية له في ملفات الإدارة الخمسة: يتابع حالها، ويمنح صلاحياتها لمن يديرها.",
      src=["lib/staff.ts:42"],
      data=["staff_user_permissions.permission_code"],
      ex="نور الأعرج، مدير الموسم."),
    R("STF-07", "لكل حساب تجريبي عمله",
      "يفتتح كل حساب تجريبي الموسم بالصلاحيات التي يحتاجها عمل صفته (lib/staff.ts STAFF)، ليُرى أثرها بالدخول باسمه: نظام كامل لصاحب الملف، "
      "وبعض الأفعال لمن يحتاج بعضها (كنان يُدخل نتائج القرعة، ويوسف يعتمدها)، ونطاقاً لمن يعمل في مكان (نسرين لقاعة دمشق، وعمر لمطار دمشق).",
      src=["lib/staff.ts:26", "lib/staff.ts:36", "lib/staff.ts:37", "lib/staff.ts:67"],
      data=["staff_user_permissions", "staff_user_permission_scopes"]),
    R("STF-08", "حراسة الصفحات والأزرار",
      "تظهر الصفحة لمن يملك عرض واحد على الأقل مما فيها، وإلا ظهرت «خارج صلاحياتك» مع اسم الصلاحية المطلوبة. وفي الصفحة يُخفى كل زر أو يُعطَّل بلا صلاحية فعله، "
      "وتُقنَّع البيانات الحساسة بلا عرضها، وكل تبويب يظهر بعرض مورده.",
      src=["app/staff/_components/kit.tsx:309", "app/staff/season/view.tsx:163", "app/staff/audit/view.tsx:20", "app/staff/access/view.tsx:33",
           "app/staff/content/view.tsx:32", "app/staff/operations/view.tsx:27", "app/staff/operational-files/view.tsx:52", "app/staff/reference/view.tsx:41",
           "app/staff/executive/view.tsx:42", "app/staff/flights/flight-screen.tsx:90", "app/staff/exam/_components/bank.tsx:164"],
      data=["permissions.code", "staff_user_permissions"],
      gap="الحراسة في الواجهة فقط (إلا خدمة التسجيل على الحج)؛ على المنصة الحقيقية فحص الصلاحية ونطاقها في الخادم مع كل طلب."),
    R("STF-09", "صفحات ملف الإدارة",
      "لوحة ملف الإدارة تفتح لمن يملك ‹الملف›.summary.GET، وكل عملية فيه لمن يملك واحدة من صلاحيات العرض التي تفتحها (perms). لغيره تظهر «… ليست لك» مع الصلاحية المطلوبة.",
      src=["app/staff/_components/system.tsx:49", "lib/systems.ts:143", "lib/systems.ts:18"],
      data=["management_operation_permissions.permission_code"]),
    R("STF-10", "منح الصلاحيات وسحبها",
      "يمنح من يملك «تعديل — صلاحيات الموظفين» (access.permissions.PUT) أي موظف صلاحيات من الكتالوج ويسحبها، من مصفوفته في «صلاحيات الموظفين»، ويعاين الفرق قبل الحفظ. "
      "لا أدوار: كل صلاحية للموظف مباشرة، ويحفظ المنح من منح ومتى. و«نسخ من موظف آخر» (access.permissions.copy) يملأ المسودة مرة واحدة. "
      "كل نظام تغيّر حدث مهم يذكر ما مُنح وما سُحب وما تغيّر نطاقه. ولا يسحب أحد من نفسه access.permissions.PUT.",
      src=["app/staff/access/view.tsx:335", "app/staff/access/view.tsx:339", "app/staff/access/view.tsx:290", "app/staff/access/view.tsx:302", "lib/store.ts:1568"],
      data=["staff_user_permissions.granted_by_staff_id", "staff_user_permissions.granted_at", "audit_events.important"],
      gap="السحب يحذف الصلاحية ولا يبقى تاريخها إلا في سجل الأحداث؛ يكفي ذلك ما دام السجل لا يُحذف."),
    R("STF-11", "العرض مع كل فعل",
      "كل فعل على مورد يحتاج عرضه: منح الإضافة أو التعديل أو الحذف أو فعل خاص يمنح عرض المورد معه، وسحب العرض يسحب كل ما على المورد.",
      src=["app/staff/access/view.tsx:310"],
      data=["staff_user_permissions"]),
    R("STF-12", "الصلاحية لنطاق بعينه",
      "بعض الصلاحيات تُمنح لمعرّفات بعينها: قاعة الامتحان لمركز، ورحلات المطار لمطار، ومواعيد العمليات لعملية، وعناصر مجموعات المحتوى لمجموعة، والتسجيل في المكتب لمكتب، "
      "والملفات التشغيلية لنوع ملف. بلا نطاق تسري في كل مكان. يفتح الصفحةَ امتلاكها في أي مكان، ويُفحص كل فعل لمعرّف ما يقع عليه.",
      src=["lib/permissions.ts:427", "lib/permissions.ts:421", "lib/operations.ts:238", "app/staff/airport/view.tsx:112"],
      data=["staff_user_permission_scopes.scope_id", "permission_resources.scope_kind"],
      gap="نطاق المكتب معرّف ولا يُفحص في التجربة: حسابات الموظفين لا تحمل مكتباً."),
    R("STF-13", "مشرف القاعة ومندوب المطار صلاحيتان بنطاق",
      "مشرف القاعة الامتحانية من يملك «قاعة الامتحان» (hall.*) لمركزها، ومندوب المطار من يملك «رحلات المطار» (airport.*) لمطاره؛ لا يُسندان من شاشة القاعات ولا المطارات، "
      "وتعرضهما تلك الشاشات للقراءة. وموظف البرج أو المخيم يقيّم بعد الموسم بصلاحية في «تقييم الإداريين بعد الموسم» ونطاقها مواقعه في الملفات التشغيلية.",
      src=["app/administrator/_lib/halls.ts:219", "app/administrator/_lib/halls.ts:244", "lib/flights.ts:552", "app/staff/hall/view.tsx:93"],
      data=["staff_user_permission_scopes", "exam_centers", "airports", "op_file_assignments"]),
    R("STF-14", "رفع أمر إلى المدير",
      "يرفع من يعمل في ملف إدارة إلى مدير الموسم ما لا يحسمه وحده، بنص لا يقل عن 5 أحرف. يصل حدثاً مهماً يراه في «صلاحيات الموظفين» ← «ملفات الإدارة» من يملك access.escalations.GET.",
      src=["app/staff/_components/system.tsx:120", "app/staff/access/overview.tsx:76"],
      data=["escalations.text", "escalations.raised_by_staff_id"]),
    R("STF-15", "متابعة الأحداث المهمة",
      "يعدّ شعار «صلاحيات الموظفين» الأحداث المهمة لكل ملف إدارة التي وقعت بعد آخر اطلاع على ذلك الملف، ويُحفظ وقت الاطلاع عند فتح «ملفات الإدارة». "
      "ويرى الأحداث من يملك access.important-events.GET.",
      src=["app/staff/_components/system.tsx:39", "lib/systems.ts:151", "app/staff/access/overview.tsx:73"],
      data=["system_seen.seen_at", "audit_events.important"]),

    # ───────────── سجل الأحداث ─────────────
    R("STF-16", "كل إجراء باسم فاعله",
      "كل إجراء يغيّر شيئاً في بوابة الموظفين يمر بتسجيل حدث يحمل اسم الموظف وصفته، والإجراء، وما وقع عليه، والقيمة قبل وبعد إن وُجدتا، والملف والجزء والسجل المعني.",
      src=["app/staff/_components/kit.tsx:125", "app/staff/_components/kit.tsx:126", "lib/store.ts:109"],
      data=["audit_events.actor_name", "audit_events.before_value", "audit_events.after_value", "audit_events.system_code", "audit_events.area", "audit_events.ref_id"]),
    R("STF-17", "سجل الأحداث لا يُعدَّل ولا يُحذف",
      "سجل الأحداث للإضافة فقط: يُضاف الحدث بمعرّف ووقت، ولا توجد عملية تعدّل حدثاً أو تحذفه.",
      src=["lib/store.ts:108", "lib/store.ts:1389", "lib/store.ts:1390"],
      data=["audit_events"],
      gap="في التجربة يعيش السجل في متصفح الزائر ويُمحى بإعادة ضبط العرض. على المنصة الحقيقية جدول بلا UPDATE ولا DELETE لحسابات التطبيق."),
    R("STF-18", "قراءة السجل وتصديره",
      "يقرأ سجل الأحداث من يملك audit.events.GET وحده، ويصفّيه، ويصدّره CSV من يملك audit.events.export. التصدير نفسه حدث يُسجَّل بعدد الأحداث وبالتصفية المستعملة.",
      src=["app/staff/audit/view.tsx:19", "app/staff/audit/view.tsx:83", "app/staff/audit/view.tsx:93"],
      data=["audit_events"]),
    R("STF-19", "محاولة غير مصرح بها",
      "كل محاولة لتعديل إعدادات التسجيل ممن لا يحمل «إدارة التسجيل على الحج» تُرفض، وتُسجَّل حدثاً مهماً «محاولة تعديل غير مصرح بها» باسم صاحبها.",
      src=["lib/registration/service.ts:355", "lib/registration/service.ts:359", "lib/registration/service.ts:366", "lib/registration/service.ts:367"],
      data=["audit_events.important"]),

    # ───────────── إعدادات الموسم ─────────────
    R("STF-20", "من يعدّل إعدادات الموسم",
      "يعدّل قيم الموسم من يملك season.values.PUT : الحصة والأعمار المقبولة مباشرة، وشروط سنوات الميلاد، وحدود المرافقين، والرسوم والتكاليف، ورسوم الإداريين، "
      "وصلاحية وثائق الإداري، وتقييم الاستمرار في الصفة، ونسب التصنيف. ولا تحدد الإدارة مواعيد الوجبات: يضبطها المنسق التقني لتكتله. القيم تُحفظ مرة واحدة للنموذج كله، وتُطبَّق على الطلبات التالية فوراً.",
      src=["app/staff/season/view.tsx:162", "app/staff/season/view.tsx:230", "app/staff/season/view.tsx:234", "lib/store.ts:1426"],
      data=["season_settings", "season_settings.updated_by_staff_id"],
      gap="الحفظ نافذ فوراً على الطلبات التالية دون مسودة ولا اعتماد ثانٍ، بخلاف إعدادات التسجيل التي تُنشر إصدارات. إن أرادت الإدارة اعتماداً قبل السريان فهو إضافة."),
    R("STF-21", "تدقيق كل تعديل في الإعدادات",
      "كل قيمة تغيّرت تُسجَّل حدثاً مستقلاً «تعديل إعدادات الموسم» بالقيمة قبل وبعد، ومعه مرجع القرار إن كُتب. "
      "والإعادة إلى القيم الافتراضية حدث واحد يذكر كل القيم المعدّلة قبلها.",
      src=["app/staff/season/view.tsx:237", "app/staff/season/view.tsx:241", "app/staff/season/view.tsx:249", "app/staff/season/view.tsx:251"],
      data=["season_settings.decision_ref", "audit_events.before_value", "audit_events.after_value"],
      gap="مرجع القرار اختياري في الكود؛ الأفضل إلزامه في المنصة الحقيقية."),
    R("STF-22", "حدود قيم الإعدادات",
      "لا يُحفظ النموذج وفيه قيمة خارج حدودها. منها: الحصة 1000–60000 بخطوة 100، والأعمار المقبولة مباشرة 40–90، والمرافقون 0–8، "
      "ورسم التسجيل 0–200 دولار، وتكلفة الحج 1000–15000 بخطوة 50، وصلاحية شهادة الإسعافات 1–6 مواسم، وتقييم الاستمرار 0–5 بخطوة 0.1، "
      "ونسبتا الترقية والتخفيض 0–60%.",
      src=["app/staff/season/view.tsx:224", "app/staff/season/view.tsx:34", "app/staff/season/view.tsx:35", "app/staff/season/view.tsx:50",
           "app/staff/season/view.tsx:57", "app/staff/season/view.tsx:58", "app/staff/season/view.tsx:73", "app/staff/season/view.tsx:80",
           "app/staff/season/view.tsx:85", "app/staff/season/view.tsx:387"],
      data=["season_settings.quota", "season_settings.accepted_direct_age", "season_settings.hajj_cost"],
      gap="الحدود في الشاشة فقط؛ actions.setSeason يقبل أي قيمة. ونسبة القبول المباشر (directShare) لها تسمية في الصفحة لكنها ليست في النموذج، فلا تُعدَّل."),
    R("STF-23", "القيم المشتقة من الإعدادات",
      "مقاعد القبول المباشر = تقريب (الحصة × نسبة القبول المباشر)، ومقاعد القرعة = الحصة − مقاعد القبول المباشر. "
      "الدفعة الأولى تأتي من الإصدار المنشور لإعدادات التسجيل إن وُجد، وإلا الأقل من القيمة المضبوطة وتكلفة الحج. وكل ما لم يُعدَّل يأخذ قيمة الموسم الافتراضية.",
      src=["lib/season-live.ts:59", "lib/season-live.ts:62", "lib/season-live.ts:75"],
      data=["season_settings.direct_share", "season_settings.first_installment"],
      ex="الحصة 22500 بنسبة 65%: 14625 مقعداً مباشراً و7875 للقرعة."),
    R("STF-24", "الطلب المقدَّم لا يتغير بتغير الإعدادات",
      "عند تقديم الطلب تُجمَّد معه شروط الموسم ورسومه ودفعاته، فلا يغيّر تعديلٌ لاحق في الإعدادات ما على طلب سبق تقديمه أو ما يعنيه.",
      src=["lib/registration/types.ts:251", "lib/registration/types.ts:254"],
      data=["applications"]),

    # ───────────── مواسم التسجيل وإصداراته ─────────────
    R("STF-25", "حالات موسم التسجيل",
      "للموسم ثلاث حالات: «قيد الإعداد» (يُجهَّز)، و«نشط» (يقدّم فيه الحجاج)، و«مؤرشف» (محفوظ للاطلاع فقط). "
      "في البيانات الأولى موسم 1447 مؤرشف وفيه 18940 طلباً، وموسم 1448 نشط منسوخ من الإصدار 1447-v2.",
      src=["lib/registration/types.ts:210", "lib/registration/defaults.ts:102", "lib/registration/defaults.ts:103"],
      data=["seasons.status", "seasons.archived_applications", "seasons.copied_from_version_id"],
      gap="لا يوجد في الكود انتقال بين الحالات (تفعيل موسم أو أرشفته)، ولا قيد يمنع وجود موسمين نشطين؛ الموسم الذي يقدّم فيه الحجاج ثابت ACTIVE_SEASON = 1448. المنصة الحقيقية تحتاج انتقالاً موثّقاً وقيد «موسم نشط واحد»."),
    R("STF-26", "إنشاء موسم بنسخ إعدادات",
      "ينشئ من يملك registration.seasons.POST موسماً جديداً: سنته عدد صحيح لا يقل عن الموسم النشط ولا يكون موجوداً، ويُنسخ من إصدار منشور. "
      "يبدأ «قيد الإعداد»، ومسودته نسخة من ذلك الإصدار بلا إصدار أساس، ويُنشر وحده. الإنشاء حدث مهم.",
      src=["lib/registration/service.ts:464", "lib/registration/service.ts:465", "lib/registration/service.ts:467", "lib/registration/service.ts:468", "lib/registration/service.ts:469"],
      data=["seasons.status", "seasons.copied_from_version_id", "reg_config_drafts.base_version_id"]),
    R("STF-27", "الموسم المؤرشف للقراءة فقط",
      "لا تُعدَّل مسودة موسم مؤرشف، ولا يُنشر له إصدار، ولا يُستعاد إليه إصدار سابق.",
      src=["lib/registration/service.ts:384", "lib/registration/service.ts:409", "lib/registration/service.ts:424"],
      data=["seasons.status"]),
    R("STF-28", "مسودة واحدة لكل موسم",
      "لكل موسم مسودة عمل واحدة. إن لم تُعدَّل بعد فهي نسخة من الإصدار الساري. تعديل المسودة لا يمس الإصدارات المنشورة ولا أي طلب، "
      "ويُسجَّل كل تعديل حدثاً. ويمكن التراجع عن كل تعديلات المسودة فتعود إلى الإصدار الساري.",
      src=["lib/registration/engine.ts:61", "lib/registration/engine.ts:64", "lib/registration/service.ts:387", "lib/registration/service.ts:388", "lib/registration/service.ts:397"],
      data=["reg_config_drafts.config", "reg_config_drafts.updated_by_staff_id"]),
    R("STF-29", "نشر إصدار",
      "يُنشر الإصدار من المسودة بشروط: لا خطأ في التحقق من الإعدادات؛ وفيه تغيير عن الإصدار الساري (إلا إن كان هناك إصدار مجدول)؛ ونص يشرح ما يغيّره. "
      "رقمه = أكبر رقم في الموسم + 1، ويسري من الموعد المختار أو من الآن إن كان الموعد ماضياً. الإصدار لا يتغير بعد نشره، والنشر حدث مهم.",
      src=["lib/registration/service.ts:429", "lib/registration/service.ts:432", "lib/registration/service.ts:433", "lib/registration/service.ts:434", "lib/registration/service.ts:435", "lib/registration/service.ts:451"],
      data=["reg_config_versions.version_no", "reg_config_versions.effective_from", "reg_config_versions.note", "reg_config_versions.published_by_staff_id"]),
    R("STF-30", "الإصدار الساري والطلبات القائمة",
      "الإصدار الساري هو أحدث إصدار حلّ موعد سريانه؛ وقبل أن يحل أي موعد، أقدم إصدار. الإصدار المنشور الذي لم يحل موعده «مجدول». "
      "كل طلب يبقى على الإصدار الذي بدأ عليه، والطلبات الجديدة تبدأ على الساري.",
      src=["lib/registration/engine.ts:51", "lib/registration/engine.ts:56", "lib/registration/types.ts:16"],
      data=["reg_config_versions.effective_from"]),
    R("STF-31", "استعادة إصدار سابق",
      "استعادة إصدار سابق تضع إعداداته في المسودة فقط، فلا تتغير الإعدادات السارية حتى تُنشر المسودة إصداراً جديداً.",
      src=["lib/registration/service.ts:410", "lib/registration/service.ts:411"],
      data=["reg_config_drafts", "reg_config_versions.based_on_version_id"]),
    R("STF-32", "بدء موسم تشكيل جديد",
      "يبدأ من يملك admins.directory.season-start موسم تشكيل جديد بكتابة رقم الموسم التالي حرفياً وسبب لا يقل عن 3 أحرف. "
      "تُؤرشف تشكيلات الموسم الجاري المعتمدة وتبقى بموسمها، وتُختم الطلبات الجديدة بالموسم التالي، وما لم يُعتمد يبقى كما هو. "
      "يمكن التراجع فتعود التشكيلات من الأرشيف. كلاهما حدث مهم.",
      src=["app/staff/admins/_components/directory.tsx:277", "app/staff/admins/_components/directory.tsx:281", "app/staff/admins/_components/directory.tsx:283",
           "app/staff/admins/_components/directory.tsx:291", "app/staff/admins/_components/directory.tsx:324"],
      data=["season_rollovers.reason", "season_rollovers.archived_cluster_ids", "season_rollovers.undone_at", "clusters.archived_at"]),

    # ───────────── الموظفون ─────────────
    R("STF-33", "المشارك في الموسم",
      "الموظف مشارك في الموسم إذا كان الموسم في قائمة مواسمه. الموظف غير المشارك أو الموقوف لا يُرشَّح لمنصب في ملف تشغيلي ولا يُوضع على رحلة.",
      src=["lib/ops.ts:115", "app/staff/operational-files/picker.tsx:82", "app/staff/flights/staff-picker.tsx:42"],
      data=["employee_seasons.season_year", "employees.suspended"]),
    R("STF-34", "ربط الحساب بسجل الموظف",
      "يُربط حساب البوابة بسجل موظف واحد ويُفك ربطه، وكل ذلك حدث. لا تُرسل كلمة مرور مؤقتة إلا إلى هاتف سوريا في سجل صاحب الحساب إذا كان 10 أرقام فأكثر، "
      "والإرسال حدث يذكر الرقم.",
      src=["app/staff/employees/accounts.tsx:29", "app/staff/employees/accounts.tsx:37", "app/staff/employees/accounts.tsx:43", "app/staff/employees/accounts.tsx:47"],
      data=["employees.staff_user_id", "employees.phone_sy", "staff_users.must_change_password"],
      gap="الإرسال محاكاة: لا رسالة ولا تغيير لكلمة المرور."),

    # ───────────── المحتوى ─────────────
    R("STF-35", "المحتوى مسودة ثم نشر",
      "يحرر محتوى الموقع من يملك content.pages.PUT، وينشره من يملك content.pages.publish، فيُفصل المحرر عن الناشر. كل تعديل يذهب إلى المسودة ولا يراه الزوار. النشر ينقل المسودة إلى المحتوى المنشور "
      "ويحفظ قبلها نسخة من المنشور السابق. وضع المعاينة يعرض المسودة للمحرر. والتراجع يحذف المسودة كلها.",
      src=["app/staff/content/view.tsx:30", "lib/cms/store.ts:455", "lib/cms/store.ts:457", "lib/cms/store.ts:462", "lib/cms/store.ts:177", "lib/cms/store.ts:475"],
      data=["cms_field_values.version", "cms_pages.has_draft_changes", "cms_pages.published_at", "cms_revisions.snapshot"],
      gap="لا اعتماد بين التحرير والنشر: من يحرر ينشر. إن أرادت الإدارة موافقة قبل النشر فهي إضافة (cms_staff_roles)."),
    R("STF-36", "حالات الصفحة",
      "الصفحة منشورة أو مسودة (مخفية عن الزوار) أو مؤرشفة. أقسام الصفحة المؤرشفة لا تظهر. نشر صفحة مسودة أو مؤرشفة يجعلها منشورة. "
      "كل تغيير حالة يحفظ نسخة قبله. الصفحات الإلزامية (الرئيسية والإعدادات العامة) لا تُؤرشف، والأقسام الإلزامية لا تُخفى ولا تُؤرشف.",
      src=["lib/cms/store.ts:195", "lib/cms/store.ts:461", "lib/cms/store.ts:482", "app/staff/content/_components/editor.tsx:395", "app/staff/content/_components/editor.tsx:249"],
      data=["cms_pages.status", "cms_pages.is_required", "cms_pages.archived_at"]),
    R("STF-37", "النسخ السابقة",
      "يُحفظ لكل صفحة حتى 20 نسخة سابقة، تُحذف أقدمها عند الزيادة. استعادة نسخة تضعها في المسودة لتُراجع قبل النشر، ولا تنشرها. "
      "وإرجاع الصفحة إلى محتواها الأصلي يُنشر مباشرة بعد حفظ نسخة.",
      src=["lib/cms/store.ts:29", "lib/cms/store.ts:374", "lib/cms/store.ts:498", "lib/cms/store.ts:508"],
      data=["cms_revisions.created_at", "cms_revisions.note"],
      gap="يمكن حذف أي نسخة سابقة من السجل دون تسجيل حدث (lib/cms/store.ts:503، revisions.tsx:86). على المنصة الحقيقية لا تُحذف النسخ أو يُسجَّل حذفها."),
    R("STF-38", "عناصر جديدة في خانات محجوزة",
      "المقالات والأسئلة الشائعة والأدعية الجديدة تُنشأ في خانات محجوزة يكون رقمها رابط العنصر: 12 مقالاً و10 أسئلة و8 أدعية. "
      "المسودة هي المرجع حتى لا يتقاسم عنصران خانة واحدة، وحين تنفد الخانات لا يُنشأ عنصر.",
      src=["lib/cms/collections.ts:59", "lib/cms/collections.ts:111", "lib/cms/collections.ts:194", "lib/cms/store.ts:300", "lib/cms/store.ts:593"],
      data=["news_articles.slug", "cms_collection_settings.can_create"],
      gap="حدّ الخانات قيد النسخة التجريبية (روابط ثابتة)؛ المنصة الحقيقية تولّد المعرّف ولا تحتاج حداً."),

    # ───────────── الإحصائيات والقائمة ─────────────
    R("STF-39", "الإحصائيات صلاحية مستقلة لا تفتح صفحات النظام",
      "لأحد عشر نظاماً صفحة «الإحصائيات» خاصة بها (/staff/stats/‹النظام›): مراجعة الطلبات والوثائق، والتسجيل في المكتب، والقبول المباشر والقرعة، وإعدادات الموسم، "
      "وغرفة العمليات، والفريق الطبي، والمواصلات، والملفات التشغيلية، والبيانات المرجعية، وسجل الأحداث، ومحتوى الموقع. تعرض أرقام النظام و«ما ينتظر هنا»، ولا يُعدَّل منها شيء: "
      "كل رقم يُدار من صفحة النظام نفسها. تفتحها صلاحية واحدة ‹النظام›.stats.GET «الإحصائيات»، وليست من صلاحيات عرض النظام: من يملكها وحدها يرى الأرقام "
      "ولا تُفتح له صفحات النظام، ومن يملك عرض صفحاته دونها لا يرى إحصائياته. ولملفات الإدارة «لوحة التحكم» مكانها (‹الملف›.summary.GET)، "
      "و«الإحصائيات» في «إدارة الامتحانات» إحدى عمليات الملف لا صفحة من هذه الصفحات. وحلّت هذه الصفحات محل «لوحتي» التي كانت تجمع ما ينتظر الموظف في كل نظام يملك فيه شيئاً.",
      src=["lib/permissions.ts:390", "lib/permissions.ts:396", "lib/permissions.ts:400", "lib/permissions.ts:102",
           "app/staff/stats/[system]/page.tsx:9", "app/staff/stats/view.tsx:12", "app/staff/stats/sections.tsx:550"],
      data=["permission_resources.resource_key", "permissions.code", "staff_user_permissions.permission_code"],
      ex="lottery.stats.GET وحدها تفتح «/staff/stats/lottery» ولا تفتح «/staff/lottery»؛ وكنان الأحمد يملكها مع خطوات القرعة فيرى الاثنين."),
    R("STF-40", "«لوحة الإدارة العليا» تجمع أرقام الأنظمة كلها",
      "تفتح «لوحة الإدارة العليا» لمن يملك executive.dashboard.GET، بصف واحد من الأزرار: «الموسم الآن» (أرقام الأنظمة العشرة جنباً إلى جنب، كل رقم مرة واحدة، دون رسومها البيانية)، "
      "ثم «لوحة التحكم» لكل ملف من ملفات الإدارة الخمسة بأرقامها كما يراها صاحبه دون عنوان صفحته ولا «كيف تعمل»، ثم «تقرير نهاية الموسم»؛ يراها كلها صاحب اللوحة أياً كانت صلاحياته الأخرى. "
      "وطباعة التقرير لمن يملك executive.dashboard.print، وهي حدث في سجل الأحداث. واللوحة أول بند في قائمة من يملكها، وصفحته الأولى بعد الدخول.",
      src=["app/staff/executive/view.tsx:54", "app/staff/executive/view.tsx:92", "app/staff/executive/view.tsx:93", "app/staff/stats/sections.tsx:230",
           "app/staff/executive/view.tsx:75", "app/staff/_components/frame.tsx:160", "app/staff/_components/kit.tsx:76"],
      data=["permissions.code", "audit_events"],
      ex="لبنى الشهابي تملك «إعدادات الموسم» و«لوحة الإدارة العليا»: ترى لوحات ملفات الإدارة الخمسة وإحصائيات الأنظمة العشرة، ولا تفتح من صفحاتها إلا «إعدادات الموسم»."),
    R("STF-41", "ترتيب القائمة و«ملفاتي التشغيلية» آخرها",
      "ترتيب القائمة الجانبية: «لوحة الإدارة العليا»، ثم «صلاحيات الموظفين»، ثم ملفات الإدارة الخمسة (لكل ملف «لوحة التحكم» ثم عملياته تحت اسمه)، "
      "ثم المواقع الميدانية («قاعتي الامتحانية»، «رحلات مطاري»، «تقييم الإداريين»)، ثم الأنظمة الأخرى بترتيب العمل في الموسم، لكل منها «الإحصائيات» ثم صفحته، "
      "تحت اسم النظام إن ظهر البندان معاً. ولا يظهر بند إلا لمن يملك ما يفتحه. وفي آخر القائمة دائماً، بعد فاصل، «ملفاتي التشغيلية» ثم «تسجيل الخروج» تحتها.",
      src=["app/staff/_components/frame.tsx:158", "app/staff/_components/frame.tsx:161", "app/staff/_components/frame.tsx:163", "app/staff/_components/frame.tsx:165",
           "app/staff/_components/frame.tsx:154", "app/staff/_components/frame.tsx:168", "app/staff/_components/frame.tsx:183", "app/staff/_components/frame.tsx:450",
           "app/staff/_components/frame.tsx:452"],
      data=["permission_systems.sort_order", "management_systems.sort_order"]),
])
