# -*- coding: utf-8 -*-
from .dsl import *

DOMAIN = D("staff", "STF", "الموظفون والصلاحيات والمواسم", [
    "يغطي هذا الفصل بوابة الموظفين وحوكمتها: الدخول، والصلاحيات بنوعيها (صلاحيات المهام وصلاحيات إدارة الملفات)، ومن يمنح ماذا، "
    "والمواقع الميدانية التي تفتح صفحة دون صلاحية، وسجل الأحداث، وإعدادات الموسم وتدقيق تعديلها، ودورة حياة الموسم في إعدادات التسجيل "
    "(موسم قيد الإعداد ونشط ومؤرشف، ومسودة تُنشر إصدارات لا تتغير)، وبدء موسم تشكيل جديد، ونشر محتوى الموقع.",
    "القيم مأخوذة من lib/staff.ts وlib/systems.ts وapp/staff (الحراسة والشاشات)، وlib/store.ts (سجل الأحداث وإعدادات الموسم)، "
    "وlib/season.ts وlib/season-live.ts، وlib/registration (المواسم والإصدارات)، وlib/cms (المحتوى). "
    "الحسابات في النسخة التجريبية ثابتة وكلمة مرورها واحدة؛ ما يجب أن يختلف في المنصة الحقيقية مذكور في «الفجوة».",
], [
    # ───────────── الدخول ─────────────
    R("STF-01", "لا ينشئ الموظف حسابه بنفسه",
      "حساب بوابة الموظفين لا يُنشأ ذاتياً. يدخل الموظف باسم المستخدم وكلمة المرور؛ يُقارن اسم المستخدم بعد حذف المسافات وتحويله إلى أحرف صغيرة. "
      "الخطأ في أيهما يعطي رسالة واحدة: «اسم المستخدم أو كلمة المرور غير صحيحة».",
      src=["app/staff/_components/login.tsx:53", "app/staff/_components/login.tsx:54", "lib/staff.ts:2"],
      data=["staff_users.username", "staff_users.password_hash"],
      gap="في التجربة الحسابات قائمة ثابتة وكلمة المرور واحدة للجميع (1448، lib/staff.ts:98). المنصة الحقيقية: حساب ينشئه «إدارة الموظفين» بالرقم الوطني والهاتف، "
          "وكلمة مرور مؤقتة تُرسل إلى الهاتف ويُلزم تغييرها عند أول دخول (must_change_password)، وتخزين مشفّر لكلمة المرور."),
    R("STF-02", "تسجيل الدخول والخروج",
      "كل دخول إلى بوابة الموظفين وكل خروج منها حدث في سجل الأحداث باسم الموظف وصفته.",
      src=["app/staff/_components/login.tsx:45", "app/staff/_components/login.tsx:46", "app/staff/_components/frame.tsx:300"],
      data=["audit_events.actor_staff_id", "auth_sessions.staff_user_id"]),
    R("STF-03", "الصفحة الأولى بعد الدخول",
      "يصل الموظف إلى: لوحة أول ملف إدارة يملكه؛ وإلا «لوحتي» إن كانت له صلاحية مهمة؛ وإلا صفحة القاعة إن كان مشرف قاعة امتحانية؛ "
      "وإلا «رحلات مطاري» إن كان مندوب مطار؛ وإلا «ملفاتي التشغيلية».",
      src=["app/staff/_components/kit.tsx:33", "app/staff/_components/kit.tsx:34", "app/staff/_components/kit.tsx:35", "app/staff/_components/kit.tsx:36", "app/staff/_components/kit.tsx:37"],
      data=["system_grants", "staff_user_permissions", "airport_representatives"]),
    R("STF-04", "«ملفاتي التشغيلية» ظاهرة دائماً",
      "يظهر بند «ملفاتي التشغيلية» في قائمة كل موظف دون أي صلاحية، ويعرض مواقعه في الملفات التشغيلية. بقية البنود تظهر بصلاحيتها أو بالموقع الميداني أو بملكية الملف.",
      src=["app/staff/_components/frame.tsx:160", "app/staff/_components/frame.tsx:296", "app/staff/_components/kit.tsx:58"],
      data=["op_file_assignments.employee_id"]),

    # ───────────── الصلاحيات ─────────────
    R("STF-05", "نوعا الصلاحيات",
      "الصلاحيات سبع عشرة. خمس منها إدارة ملف كامل: «إدارة الموظفين»، «إدارة التسجيل على الحج»، «إدارة الإداريين»، «إدارة الامتحانات»، «إدارة الطيران»؛ "
      "من يحمل إحداها يدير الملف كله من لوحته وصفحات عملياته. والبقية صلاحيات مهام، تفتح كل منها مهمة واحدة "
      "(منح صلاحيات الإدارة، التسجيل على الحج، مراجعة الطلبات، إعدادات الموسم، إدخال نتائج القرعة، اعتمادها ونشرها، غرفة العمليات، سجل الأحداث، "
      "محتوى الموقع، الفريق الطبي، المواصلات، الملفات التشغيلية والبيانات المرجعية).",
      src=["lib/staff.ts:14", "lib/staff.ts:44", "lib/staff.ts:68"],
      data=["permissions.kind", "management_systems.permission_code"]),
    R("STF-06", "مدير الموسم",
      "مدير الموسم يحمل كل صلاحيات المهام، ومنها «منح صلاحيات الإدارة ومتابعتها»، ولا يحمل صلاحيات إدارة الملفات: هو من يمنحها.",
      src=["lib/staff.ts:71", "lib/staff.ts:121", "lib/staff.ts:122"],
      data=["staff_user_permissions.permission_code"],
      ex="سهى مراد، مديرة الموسم."),
    R("STF-07", "صلاحية واحدة لكل حساب في التجربة",
      "في النسخة التجريبية يحمل كل حساب صلاحية واحدة، ليُرى أثر كل صلاحية بالدخول باسم حاملها. المنصة الحقيقية تسمح لحساب بأكثر من صلاحية.",
      src=["lib/staff.ts:8", "lib/staff.ts:9"],
      data=["staff_user_permissions"],
      gap="تعليق lib/staff.ts يقول «لا يحمل حسابان الصلاحية نفسها»، لكن مديرة الموسم تحمل كل صلاحيات المهام فتشارك فيها كل حساب آخر (مثل «مراجعة الطلبات» مع رنا حداد)."),
    R("STF-08", "حراسة الصفحات",
      "كل صفحة مهمة تفتح لمن يحمل واحدة على الأقل من صلاحياتها، وإلا ظهرت «خارج صلاحياتك» مع اسم الصلاحية المطلوبة. "
      "أمثلة: «إعدادات الموسم» لـ season.settings، و«سجل الأحداث» لـ audit.read، و«صلاحيات الإدارة» لـ systems.assign، و«المحتوى» لـ content.manage، "
      "و«غرفة العمليات» لـ operations.room، والملفات التشغيلية لـ ops.files أو operations.room (والتعديل لـ ops.files وحدها)، والبيانات المرجعية لـ ops.files، "
      "ولوحة المدير التنفيذية لـ season.settings أو audit.read.",
      src=["app/staff/_components/kit.tsx:246", "app/staff/_components/kit.tsx:248", "app/staff/season/view.tsx:162", "app/staff/audit/view.tsx:19",
           "app/staff/systems/view.tsx:34", "app/staff/content/view.tsx:30", "app/staff/operations/view.tsx:26", "app/staff/operational-files/view.tsx:51",
           "app/staff/operational-files/view.tsx:348", "app/staff/reference/view.tsx:40", "app/staff/executive/view.tsx:35"],
      data=["permissions.code", "staff_user_permissions"],
      gap="الحراسة في الواجهة فقط؛ على المنصة الحقيقية فحص الصلاحية في الخادم مع كل طلب."),
    R("STF-09", "ملف الإدارة لمالكه وحده",
      "صفحات ملف الإدارة (لوحته وعملياته) تفتح لمن مُنح صلاحية إدارته فقط، ولا تكفي صلاحية مدير الموسم. لغيره تظهر أسماء حامليها وأن المدير يمنحها.",
      src=["app/staff/_components/system.tsx:44", "app/staff/_components/system.tsx:46", "app/staff/_components/system.tsx:48", "lib/systems.ts:165"],
      data=["system_grants.staff_user_id", "system_grants.system_code"]),
    R("STF-10", "منح صلاحية الإدارة وسحبها",
      "يمنح حامل «منح صلاحيات الإدارة» إدارة ملف لأي موظف ليس من حامليها، ويسحبها من أي حامل بعد تأكيد. يمكن أن يحمل الملفَ أكثر من موظف، "
      "ويمكن أن يبقى بلا أحد. المنح المكرر لا يضيف شيئاً. كل منح وكل سحب حدث مهم يذكر الموظف والملف ومن فعل ومتى. "
      "لا يحتاج حامل الملف أي صلاحية أخرى ليديره.",
      src=["lib/systems.ts:183", "lib/systems.ts:184", "lib/systems.ts:185", "lib/systems.ts:187", "lib/systems.ts:189"],
      data=["system_grants.granted_by_staff_id", "system_grants.revoked_at", "system_grants.revoked_by_staff_id", "audit_events.important"],
      gap="الكود يحذف المنح عند السحب؛ في الجدول يُحفظ الصف مع revoked_at ليبقى تاريخ الحمل."),
    R("STF-11", "الصلاحيات الفعلية للحساب",
      "صلاحيات إدارة الملفات للحساب تُحسب من سجل المنح لا من الحساب: تُحذف من صلاحياته الأصلية ثم يُضاف ما يحمله اليوم. "
      "عند افتتاح الموسم يُعدّ صاحب كل صلاحية إدارة في البيانات الأولى ممنوحاً من مديرة الموسم في تاريخ افتتاح ملفه.",
      src=["lib/systems.ts:126", "lib/systems.ts:127", "lib/systems.ts:145", "lib/systems.ts:146"],
      data=["system_grants.granted_at", "management_systems.opened_at"]),
    R("STF-12", "صلاحيات المهام ثابتة في التجربة",
      "لا توجد في النسخة التجريبية شاشة تمنح صلاحية مهمة أو تسحبها؛ الحسابات وصلاحيات مهامها ثابتة، وتعرض «حسابات البوابة» ما يفتحه كل حساب.",
      src=["app/staff/employees/accounts.tsx:57", "lib/staff.ts:70"],
      data=["staff_user_permissions"],
      gap="رسالة «خارج صلاحياتك» تقول إن الصلاحيات تمنحها الموارد البشرية ويُسجَّل منحها؛ هذا غير موجود. المنصة الحقيقية تحتاج منح صلاحيات المهام وسحبها في «إدارة الموظفين» مع تسجيلهما."),
    R("STF-13", "المواقع الميدانية تفتح صفحة بلا صلاحية",
      "ثلاثة مواقع تفتح صفحة دون أي صلاحية: مشرف القاعة الامتحانية (يعيّنه حامل «إدارة الامتحانات»)، ومندوب المطار (يعيّنه حامل «إدارة الطيران»)، "
      "وموظف البرج أو المخيم في الملفات التشغيلية (تفتح له «التقييم» بعد الموسم إن كانت للبرج تكتلات). الموقع يفتح صفحته وحدها.",
      src=["lib/staff.ts:82", "lib/staff.ts:92", "lib/staff.ts:93", "app/staff/_components/frame.tsx:296"],
      data=["airport_representatives", "exam_centers", "op_file_assignments"]),
    R("STF-14", "رفع أمر إلى المدير",
      "يرفع صاحب ملف الإدارة إلى مدير الموسم ما لا يحسمه وحده، بنص لا يقل عن 5 أحرف. يصل حدثاً مهماً يظهر عند المدير في «صلاحيات الإدارة».",
      src=["app/staff/_components/system.tsx:111", "app/staff/_components/system.tsx:112"],
      data=["escalations.text", "escalations.raised_by_staff_id"]),
    R("STF-15", "متابعة الأحداث المهمة",
      "يعدّ شعار «صلاحيات الإدارة» عند المدير الأحداث المهمة لكل ملف التي وقعت بعد آخر اطلاع له على ذلك الملف، ويُحفظ وقت الاطلاع عند فتحه.",
      src=["app/staff/_components/system.tsx:41", "lib/systems.ts:191", "lib/systems.ts:192"],
      data=["system_seen.seen_at", "audit_events.important"]),

    # ───────────── سجل الأحداث ─────────────
    R("STF-16", "كل إجراء باسم فاعله",
      "كل إجراء يغيّر شيئاً في بوابة الموظفين يمر بتسجيل حدث يحمل اسم الموظف وصفته، والإجراء، وما وقع عليه، والقيمة قبل وبعد إن وُجدتا، والملف والجزء والسجل المعني.",
      src=["app/staff/_components/kit.tsx:62", "app/staff/_components/kit.tsx:63", "lib/store.ts:109"],
      data=["audit_events.actor_name", "audit_events.before_value", "audit_events.after_value", "audit_events.system_code", "audit_events.area", "audit_events.ref_id"]),
    R("STF-17", "سجل الأحداث لا يُعدَّل ولا يُحذف",
      "سجل الأحداث للإضافة فقط: يُضاف الحدث بمعرّف ووقت، ولا توجد عملية تعدّل حدثاً أو تحذفه.",
      src=["lib/store.ts:108", "lib/store.ts:1389", "lib/store.ts:1390"],
      data=["audit_events"],
      gap="في التجربة يعيش السجل في متصفح الزائر ويُمحى بإعادة ضبط العرض. على المنصة الحقيقية جدول بلا UPDATE ولا DELETE لحسابات التطبيق."),
    R("STF-18", "قراءة السجل وتصديره",
      "يقرأ سجل الأحداث حامل «سجل الأحداث» وحده، ويصفّيه ويصدّره CSV. التصدير نفسه حدث يُسجَّل بعدد الأحداث وبالتصفية المستعملة.",
      src=["app/staff/audit/view.tsx:19", "app/staff/audit/view.tsx:83", "app/staff/audit/view.tsx:93"],
      data=["audit_events"]),
    R("STF-19", "محاولة غير مصرح بها",
      "كل محاولة لتعديل إعدادات التسجيل ممن لا يحمل «إدارة التسجيل على الحج» تُرفض، وتُسجَّل حدثاً مهماً «محاولة تعديل غير مصرح بها» باسم صاحبها.",
      src=["lib/registration/service.ts:355", "lib/registration/service.ts:359", "lib/registration/service.ts:366", "lib/registration/service.ts:367"],
      data=["audit_events.important"]),

    # ───────────── إعدادات الموسم ─────────────
    R("STF-20", "من يعدّل إعدادات الموسم",
      "يعدّل قيم الموسم حامل «إعدادات الموسم»: الحصة والأعمار المقبولة مباشرة، وشروط سنوات الميلاد، وحدود المرافقين، والرسوم والتكاليف، ورسوم الإداريين، "
      "وصلاحية وثائق الإداري، وتقييم الاستمرار في الصفة، ونسب التصنيف، ومواعيد الوجبات. القيم تُحفظ مرة واحدة للنموذج كله، وتُطبَّق على الطلبات التالية فوراً.",
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
      "ونسبتا الترقية والتخفيض 0–60%. ومواعيد الوجبات بصيغة «HH:MM – HH:MM».",
      src=["app/staff/season/view.tsx:224", "app/staff/season/view.tsx:34", "app/staff/season/view.tsx:35", "app/staff/season/view.tsx:50",
           "app/staff/season/view.tsx:57", "app/staff/season/view.tsx:58", "app/staff/season/view.tsx:73", "app/staff/season/view.tsx:80",
           "app/staff/season/view.tsx:85", "app/staff/season/view.tsx:387"],
      data=["season_settings.quota", "season_settings.accepted_direct_age", "season_settings.hajj_cost", "season_meals.time_from"],
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
      "ينشئ حامل «إدارة التسجيل على الحج» موسماً جديداً: سنته عدد صحيح لا يقل عن الموسم النشط ولا يكون موجوداً، ويُنسخ من إصدار منشور. "
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
      "يبدأ حامل «إدارة الإداريين» موسم تشكيل جديد بكتابة رقم الموسم التالي حرفياً وسبب لا يقل عن 3 أحرف. "
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
      "يحرر محتوى الموقع حامل «إدارة محتوى الموقع». كل تعديل يذهب إلى المسودة ولا يراه الزوار. النشر ينقل المسودة إلى المحتوى المنشور "
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
])
