# -*- coding: utf-8 -*-
from .dsl import *

DOMAIN = D("operations", "OPS", "العمليات الميدانية: الطيران والسكن والتجمعات", [
    "يغطي هذا الفصل ما يجري في الموسم بعد تشكيل المجموعات: ملف الطيران (الرحلات ومقاعدها، وأيام التكتلات، وإسناد المجموعات والأفراد، "
    "والإقفال وكشف الركاب، والإقلاع والهبوط، والتأجيل والتحويل والإلغاء)، والسكن الذي يختاره الطلب، وتسجيل أداء المناسك والمزارات ومحطات السفر، "
    "وقوائم الحافلات قبل كل منسك، والملفات التشغيلية التي توزّع موظفي البعثة على القطاعات والأبراج والمخيمات، وغرفة العمليات وبلاغاتها، "
    "ومواعيد عمليات الموسم.",
    "القيم مأخوذة من الكود: منطق الطيران في lib/flights.ts وشاشاته في app/staff/flights وapp/portal/(admin)/flights، "
    "والسكن في lib/rooms.ts، والمناسك في lib/musters.ts وapp/portal/(admin)/field، والقوائم في lib/rite-lists.ts، "
    "والملفات التشغيلية في lib/ops.ts وapp/staff/operational-files، وغرفة العمليات في app/staff/operations، والمواعيد في lib/operations.ts. "
    "ما يقوله تعليق في الكود ويخالفه السلوك مذكور في «الفجوة».",
], [
    # ───────────── الرحلات ─────────────
    R("OPS-01", "حالات الرحلة",
      "للرحلة اتجاه واحد (ذهاب أو عودة) وجمهور واحد (رحلة حجاج أو رحلة موظفين)، وتمر بحالات ثمانية: مسودة، منشورة، مكتملة، مقفلة، أقلعت، وصلت، مؤجلة، ملغاة. "
      "تُنشأ مسودة، ولا يُسند إليها أحد قبل نشرها.",
      src=["lib/flights.ts:48", "lib/flights.ts:50", "lib/flights.ts:51", "lib/flights.ts:689"],
      data=["flights.status", "flights.direction", "flights.audience"]),
    R("OPS-02", "شروط إنشاء الرحلة",
      "لا تُحفظ الرحلة إلا إذا: كُتب رقمها؛ واختلف مطار المغادرة عن مطار الوصول؛ وكان الذهاب من مطار في البلد ليس للوصول فقط إلى مطار سعودي (جدة أو المدينة)، "
      "والعودة من مطار سعودي إلى مطار خارج السعودية؛ وكان الوصول بعد المغادرة؛ وفي «ذهاب وعودة» تقلع العودة بعد وصول الذهاب؛ "
      "والسعة 1 فأكثر؛ وحجز الموظفين في رحلة الحجاج أقل من السعة. رحلة الموظفين حجزها 0 والطائرة كلها لهم. "
      "المطارات والناقلون المؤرشفون لا يظهرون في الاختيار.",
      src=["app/staff/flights/flight-form.tsx:82", "app/staff/flights/flight-form.tsx:83", "app/staff/flights/flight-form.tsx:86",
           "app/staff/flights/flight-form.tsx:87", "app/staff/flights/flight-form.tsx:88", "app/staff/flights/flight-form.tsx:97",
           "app/staff/flights/flight-form.tsx:98", "app/staff/flights/flight-form.tsx:99", "app/staff/flights/flight-form.tsx:68",
           "app/staff/flights/flight-form.tsx:111"],
      data=["flights.capacity", "flights.staff_reserve", "airports.arrivals_only", "airports.archived", "carriers.archived"],
      cfg="ينشئ الرحلات صاحب الصلاحية في «إدارة الطيران» من «الرحلات».",
      gap="هذه الشروط في نموذج الشاشة وحده؛ flightsActions.saveFlight لا يتحقق منها. على المنصة الحقيقية فرضها في الخادم."),
    R("OPS-03", "لا تُنقص السعة تحت من عليها",
      "عند تعديل رحلة لا تقل مقاعد الحجاج (السعة ناقص حجز الموظفين) عن الحجاج المسندين إليها، ولا عن مجموع المقاعد المعطاة للتكتلات عليها، "
      "ولا تقل مقاعد الموظفين عن الموظفين المسندين.",
      src=["app/staff/flights/flight-form.tsx:101", "app/staff/flights/flight-form.tsx:102", "app/staff/flights/flight-form.tsx:104"],
      data=["flights.capacity", "flights.staff_reserve", "cluster_flight_allotments.seats"]),
    R("OPS-04", "الذهاب والعودة معاً",
      "يمكن إنشاء رحلة ذهاب ورحلة عودتها معاً، فتشير كل منهما إلى الأخرى. الاقتران قيمة افتراضية لا قيد: المسافر يُقرن ذهابه بعودته في سجله هو. "
      "نشر إحداهما ينشر الأخرى معها إن كانت ما تزال مسودة. حذف مسودة يفك إشارة قرينتها إليها.",
      src=["lib/flights.ts:862", "lib/flights.ts:863", "lib/flights.ts:882", "lib/flights.ts:872"],
      data=["flights.paired_flight_id"]),
    R("OPS-05", "المسودة والنشر والتعديل",
      "لا تُنشر إلا رحلة في حالة «مسودة»، ولا تُحذف إلا مسودة. تعديل رحلة سبق نشرها حدث مهم يصل إلى مدير الموسم، وتعديل المسودة عمل مسؤول الطيران وحده. "
      "يُسجَّل في سجل الأحداث كل إنشاء ونشر وتعديل (التاريخ والساعة والسعة قبل وبعد).",
      src=["lib/flights.ts:880", "lib/flights.ts:872", "lib/flights.ts:867"],
      data=["flights.published_at", "audit_events.important"]),
    R("OPS-06", "مقاعد الحجاج ومقاعد الموظفين",
      "في رحلة الحجاج: مقاعد الحجاج = السعة − حجز الموظفين، ومقاعد الموظفين = حجز الموظفين. في رحلة الموظفين: مقاعد الحجاج 0 ومقاعد الموظفين = السعة. "
      "الموظف (travelerKind = employee) يُحسب من حجز الموظفين، وكل من عداه — الحاج والإداري من فريق المجموعة — يُحسب من مقاعد الحجاج.",
      src=["lib/flights.ts:680", "lib/flights.ts:681", "lib/flights.ts:684", "lib/flights.ts:685"],
      data=["flights.capacity", "flights.staff_reserve", "flight_assignments.traveler_kind"],
      ex="RB 501 سعتها 340 وحجز موظفيها 10: للحجاج والإداريين 330 مقعداً.",
      gap="تعليق teamOfGroup (lib/flights.ts:379) يقول إن فريق المجموعة يُحسب «مرافقين»، لكن seatStats يحسبه من مقاعد الحجاج لا من حجز الموظفين. يجب حسم ذلك."),
    R("OPS-07", "المقعد النشط",
      "المقعد نشط في الحالات: مسند، مثبت، صعد، وصل. ولا يُحسب في المقاعد ولا يمنع إسناداً جديداً في الحالات: تخلّف، ملغى، منقول. "
      "لا يُحذف مقعد أبداً: الإلغاء والنقل يغيّران حالته ويبقى أثره.",
      src=["lib/flights.ts:168", "lib/flights.ts:1105", "lib/flights.ts:1125"],
      data=["flight_assignments.status", "flight_assignments.active_marker"]),
    R("OPS-08", "رحلة واحدة لكل اتجاه",
      "لا يكون للمسافر أكثر من مقعد نشط واحد في كل اتجاه. إسناده إلى ذهاب ثانٍ يُرفض حتى يُلغى إسناده القديم أو يُنقل.",
      src=["lib/flights.ts:813", "lib/flights.ts:814"],
      data=["flight_assignments.direction", "flight_assignments.national_id"]),
    R("OPS-09", "قاعدة الذهاب والعودة",
      "للحاج والإداري (لا للموظف): تقلع العودة بعد وصول الذهاب، وتهبط في مطار يسمح به مطار إقلاعه في الذهاب. "
      "دمشق تعود إلى دمشق أو اللاذقية، وحلب إلى حلب أو اللاذقية، واللاذقية للوصول فقط ولا يقلع منها ذهاب. أي مطار بلا قائمة عودة يعود إليه نفسه. "
      "يُطبَّق الشرط في كل طريق إسناد: الفردي والمجموعة والنقل.",
      src=["lib/flights.ts:631", "lib/flights.ts:638", "lib/flights.ts:641", "lib/flights.ts:623", "lib/flights.ts:218", "lib/flights.ts:220", "lib/flights.ts:815"],
      data=["airport_return_targets", "airports.arrivals_only", "flights.depart_at", "flights.arrive_at"],
      cfg="قائمة مطارات العودة لكل مطار يضبطها صاحب الصلاحية في «إدارة الطيران» في «المطارات ومندوبوها»."),
    R("OPS-10", "متى تقبل الرحلة إسناداً",
      "يُسند إلى الرحلة المنشورة أو المكتملة. ويُسند إلى المقفلة بسبب مكتوب فقط، ويأخذ المقعد الجديد حالة «مثبت» ويلزمه كشف بإصدار جديد. "
      "لا يُسند إلى مسودة أو رحلة أقلعت أو وصلت أو أُجّلت أو أُلغيت. رحلة الموظفين لا تقبل إلا موظفين.",
      src=["lib/flights.ts:689", "lib/flights.ts:691", "lib/flights.ts:805", "lib/flights.ts:811", "lib/flights.ts:812", "lib/flights.ts:839"],
      data=["flights.status", "flight_assignments.reason"]),
    R("OPS-11", "حد المقاعد عند الإسناد",
      "يُرفض الإسناد إذا زاد الموظفون المختارون على مقاعد الموظفين الباقية، أو زاد الباقون على مقاعد الحجاج الباقية. الإسناد كله أو لا شيء.",
      src=["lib/flights.ts:820", "lib/flights.ts:821"],
      data=["flight_assignments", "flights.capacity"]),
    R("OPS-12", "الاكتمال التلقائي",
      "رحلة الحجاج المنشورة تصير «مكتملة» حين لا يبقى فيها مقعد حجاج. وتعود «منشورة» حين يتحرر مقعد بإلغاء أو إزالة أو نقل. رحلة الموظفين لا تصير مكتملة.",
      src=["lib/flights.ts:847", "lib/flights.ts:854"],
      data=["flights.status"]),

    # ───────────── أيام التكتلات ─────────────
    R("OPS-13", "إعطاء تكتل يوم رحلة",
      "يعطي مسؤول الطيران التكتلَ رحلةً من رحلات الحجاج فقط، لم تُقلع ولم تصل ولم تُلغَ، بعدد مقاعد أو بالرحلة كلها. "
      "الرحلة كلها لا تُعطى إذا كان عليها تكتل آخر، ولا يُعطى تكتل آخر رحلةً كلها لتكتل. المقاعد عدد صحيح 1 فأكثر، ولا تقل عن أفراد التكتل المسندين إليها. "
      "مجموع مقاعد هذا التكتل ومقاعد التكتلات الأخرى ومن جلس عليها من تكتلات بلا يوم فيها لا يتجاوز مقاعد الحجاج.",
      src=["lib/flights.ts:1158", "lib/flights.ts:1159", "lib/flights.ts:1163", "lib/flights.ts:1164", "lib/flights.ts:1165", "lib/flights.ts:1167", "lib/flights.ts:1170"],
      data=["cluster_flight_allotments.seats", "cluster_flight_allotments.cluster_id", "cluster_flight_allotments.flight_id"],
      cfg="من «أيام التكتلات» في «إدارة الطيران».",
      ex="SV 3427 مشتركة: 150 مقعداً للياسمين و142 للبيان، من 292 مقعد حجاج."),
    R("OPS-14", "سحب يوم من تكتل",
      "لا يُسحب يوم رحلة من تكتل ما دام عليها أحد من أفراده؛ يُزالون أولاً.",
      src=["lib/flights.ts:1188"],
      data=["cluster_flight_allotments"]),
    R("OPS-15", "حدود التكتل في الإسناد",
      "من يسند باسم التكتل لا يضع إلا أفراد تكتله، وعلى أيامه فقط، وعلى رحلة منشورة أو مكتملة؛ الرحلة المقفلة وما بعدها عند مسؤول الطيران وحده. "
      "وما يبقى للتكتل على الرحلة = الأقل من (مقاعده − أفراده عليها) ومن مقاعد الحجاج الباقية في الرحلة كلها. التكتل الذي ليس طلبه معتمداً لا مجموعات له على الرحلات.",
      src=["lib/flights.ts:794", "lib/flights.ts:795", "lib/flights.ts:809", "lib/flights.ts:662", "lib/flights.ts:824", "lib/flights.ts:307"],
      data=["cluster_flight_allotments.seats", "clusters.status"],
      gap="تعليق lib/flights.ts يقول إن رئيس التكتل يضع مجموعاته، لكن بوابة الإداريين تجعل الإسناد للمنسق التقني وحده (head = scope.kind === \"tech\"، app/portal/(admin)/flights/flights.tsx:155)، ورئيس التكتل ومعاونه ومحاسبه للاطلاع فقط."),
    R("OPS-16", "إسناد المجموعة كاملة",
      "تُوضع المجموعة على رحلة في اتجاه كاملةً: عائلاتها وفريقها. تُرفض إن كانت على رحلة أخرى في الاتجاه نفسه. من له مقعد فردي في هذا الاتجاه يبقى عليه. "
      "يُكتب كل شيء أو لا شيء إن لم تتسع المقاعد. ويُسجَّل للمجموعة «وضع على رحلة» نشط يُنهى بسبب عند إزالتها أو إلغاء الرحلة.",
      src=["lib/flights.ts:1042", "lib/flights.ts:1043", "lib/flights.ts:1045", "lib/flights.ts:1047", "lib/flights.ts:1049"],
      data=["group_flight_legs.active_marker", "group_flight_legs.end_reason"]),
    R("OPS-17", "العائلة الملتحقة بعد الإسناد",
      "العائلة التي تلتحق بمجموعة سبق وضعها على رحلاتها تأخذ مقاعد على رحلتي المجموعة تلقائياً، إن كانت الرحلة منشورة أو مكتملة وفيها مقاعد. "
      "وإلا بقيت بلا مقعد وظهرت لمسؤول الطيران في «بحاجة إلى رحلة». والعائلة المنتقلة من مجموعة أخرى تُلغى مقاعدها «مسند» و«مثبت» على رحلات مجموعتها القديمة أولاً.",
      src=["lib/flights.ts:1214", "lib/flights.ts:1221", "lib/flights.ts:1223"],
      data=["flight_assignments.status", "group_flight_legs"]),
    R("OPS-18", "الإلغاء والإزالة",
      "قبل الإقفال يلغي مسؤول الطيران أو من يسند باسم التكتل مقعداً أو يزيل مجموعة بحرية. بعد الإقفال لا يكون ذلك إلا بسبب مكتوب. "
      "إزالة المجموعة تلغي مقاعد أفرادها النشطة على تلك الرحلة وتُنهي وضعها عليها.",
      src=["lib/flights.ts:1067", "lib/flights.ts:1071", "lib/flights.ts:1103", "lib/flights.ts:1105"],
      data=["flight_assignments.cancelled_at", "flight_assignments.reason", "group_flight_legs.ended_at"]),
    R("OPS-19", "النقل إلى رحلة أخرى",
      "يُنقل المسافر إلى رحلة في الاتجاه نفسه فقط. يبقى مقعده القديم بحالة «منقول» ويشير إلى المقعد الجديد. "
      "النقل من رحلة مقفلة يحتاج سبباً، ومن يسند باسم التكتل لا ينقل من رحلة غير مفتوحة. والرحلة الجديدة تُفحص كأي إسناد جديد.",
      src=["lib/flights.ts:1120", "lib/flights.ts:1123", "lib/flights.ts:1124", "lib/flights.ts:1125", "lib/flights.ts:1130"],
      data=["flight_assignments.moved_to_assignment_id", "flight_assignments.status"]),
    R("OPS-20", "السفر بوسيلة أخرى",
      "يقرر مسؤول الطيران أن مسافراً يسافر بغير رحلات البعثة، بسبب مكتوب، فيخرج من قوائم «بلا رحلة»، ويمكن أن تكون له عودة بلا ذهاب دون تنبيه.",
      src=["lib/flights.ts:1142", "lib/flights.ts:730", "lib/flights.ts:764"],
      data=["other_means_travelers.reason"]),

    # ───────────── الإقفال والكشف ─────────────
    R("OPS-21", "الإقفال وكشف الركاب",
      "تُقفل الرحلة المنشورة أو المكتملة فقط. الإقفال يصدر كشفاً جديداً برقم إصدار يزيد 1، فيه لقطة من كل المقاعد النشطة مرتبة بالتكتل ثم المجموعة ثم العائلة، "
      "ويحوّل المقاعد «مسند» إلى «مثبت».",
      src=["lib/flights.ts:896", "lib/flights.ts:897", "lib/flights.ts:903", "lib/flights.ts:1235"],
      data=["flight_manifests.version_no", "flight_manifest_rows", "flights.locked_at"]),
    R("OPS-22", "إعادة إصدار الكشف وتصديره",
      "بعد أي تغيير على رحلة مقفلة يصدر كشف بإصدار جديد (للرحلة المقفلة وحدها). ويُسجَّل كل تصدير لإصدار الكشف إلى «نسك مسار» أو إلى الناقل، بمن صدّره ومتى.",
      src=["lib/flights.ts:913", "lib/flights.ts:914", "lib/flights.ts:927"],
      data=["flight_manifests", "flight_manifest_exports.target"]),

    # ───────────── يوم السفر ─────────────
    R("OPS-23", "تسجيل الإقلاع",
      "يُسجَّل الإقلاع للرحلة المقفلة فقط. من صعد يصير «صعد»، ومن لم يصعد يصير «تخلّف». لكل متخلّف يُفتح بلاغ نقل بأهمية «عالية» يطلب إعادة إسناده. "
      "الإقلاع حدث مهم.",
      src=["lib/flights.ts:936", "lib/flights.ts:939", "lib/flights.ts:941", "lib/flights.ts:944"],
      data=["flight_assignments.boarded_at", "flights.departed_at", "tickets.kind", "tickets.severity"]),
    R("OPS-24", "الصعود من التجمع",
      "يمكن أن يُسجَّل الصعود قبل الإقلاع من تجمع المجموعة: البطاقات الممسوحة تحوّل المقاعد «مسند» و«مثبت» إلى «صعد».",
      src=["lib/flights.ts:967", "lib/flights.ts:970"],
      data=["flight_assignments.boarded_at"]),
    R("OPS-25", "تسجيل الهبوط",
      "يُسجَّل الهبوط للرحلة التي أقلعت فقط، في مطار الوصول أو المطار المحوَّل إليه. كل «صعد» يصير «وصل»، ويبقى المتخلّف متخلّفاً.",
      src=["lib/flights.ts:954", "lib/flights.ts:956"],
      data=["flights.arrived_at", "flight_assignments.status"]),
    R("OPS-26", "مندوب المطار",
      "مندوب المطار من يملك «رحلات المطار» (airport.flights.GET) لذلك المطار، ولا يُسند من شاشة المطارات التي تعرضه للقراءة؛ وقد يكون للمطار أكثر من مندوب. "
      "يرى المندوب رحلات المغادرة من مطاره والوصول إليه، ويسجّل الإقلاع للمقفلة (airport.flights.depart لمطار المغادرة) والهبوط للتي أقلعت (airport.flights.arrive لمطار الوصول). "
      "وهذه الصلاحية وحدها تفتح له صفحة «رحلات مطاري».",
      src=["lib/flights.ts:552", "app/staff/airport/view.tsx:43", "app/staff/airport/view.tsx:112", "app/staff/airport/view.tsx:113", "lib/flights.ts:943"],
      data=["staff_user_permissions.permission_code", "staff_user_permission_scopes.scope_id"],
      ex="عمر الشامي مندوب مطار دمشق في البيانات التجريبية."),
    R("OPS-27", "بطاقة الصعود للحاج",
      "تعرض بطاقة الحاج: موعد الصعود قبل الإقلاع بـ45 دقيقة، والحضور إلى المطار قبله بـ3.5 ساعات، والأمتعة حقيبة 23 كغ وحقيبة يد 7 كغ "
      "(حقيبة الإحرام في اليد ذهاباً، وماء زمزم 5 لترات مغلّفاً عودةً)، ومكان التجمع والبوابة كما كتبهما مسؤول الطيران.",
      src=["lib/flights.ts:1285", "lib/flights.ts:1286", "lib/flights.ts:1288"],
      data=["flights.gate", "flights.gathering"]),

    # ───────────── التغيير والطوارئ ─────────────
    R("OPS-28", "التأجيل وإعادة الجدولة",
      "تُؤجَّل الرحلة المنشورة أو المكتملة أو المقفلة بسبب مكتوب، وتُحفظ حالتها قبل التأجيل. إعادة الجدولة ممكنة لأي رحلة لم تُقلع ولم تصل ولم تُلغَ، "
      "وتعيد المؤجلة إلى حالتها السابقة (منشورة إن لم تُعرف). كلاهما حدث مهم يذكر عدد المسافرين الذين يُبلَّغون.",
      src=["lib/flights.ts:978", "lib/flights.ts:981", "lib/flights.ts:990", "lib/flights.ts:993"],
      data=["flights.postpone_reason", "flights.status_before_postpone"],
      gap="الكود يسجّل أن المسافرين «يُبلَّغون» ولا يرسل إليهم إشعاراً."),
    R("OPS-29", "تحويل الوجهة",
      "تُحوَّل الرحلة إلى مطار آخر ما لم تكن مسودة أو وصلت أو أُلغيت. يُضاف نقل بري بالحافلات من المطار البديل إلى الوجهة الأصلية، يبدأ بعد الوصول المجدول بساعتين، "
      "ويُفتح بلاغ نقل «حرج» يطلب عدد الحافلات (35–40 راكباً للحافلة).",
      src=["lib/flights.ts:1003", "lib/flights.ts:1007", "lib/flights.ts:1009", "lib/flights.ts:1010"],
      data=["flights.diverted_to_airport_id", "flight_ground_legs.buses", "tickets.severity"]),
    R("OPS-30", "إلغاء الرحلة",
      "لا تُلغى رحلة أقلعت أو وصلت أو أُلغيت. الإلغاء بسبب مكتوب، ويلغي كل المقاعد النشطة عليها بالسبب نفسه، ويُنهي وضع كل مجموعة عليها، فيصير أفرادها بحاجة إلى رحلة.",
      src=["lib/flights.ts:1019", "lib/flights.ts:1024", "lib/flights.ts:1025"],
      data=["flights.cancel_reason", "flight_assignments.cancelled_at", "group_flight_legs.ended_at"]),
    R("OPS-31", "تنبيهات مسؤول الطيران",
      "تُنبّه الرحلة إذا: جلس عليها أفراد تكتل ليست من أيامه؛ أو زاد تكتل على مقاعده؛ أو كان على الرحلة حجاج مجموعة بلا إداري من فريقها ولا أي موظف؛ "
      "أو كان على رحلة عودة من لا ذهاب له ولا وسيلة أخرى. ويظهر في «بحاجة إلى رحلة» كل من أُلغي مقعده أو تخلّف ولا مقعد نشط له في ذلك الاتجاه، "
      "إلا المجموعة المزالة عمداً.",
      src=["lib/flights.ts:753", "lib/flights.ts:754", "lib/flights.ts:760", "lib/flights.ts:765", "app/staff/flights/desk.ts:84"],
      data=["flight_assignments", "cluster_flight_allotments"]),
    R("OPS-32", "حالة سفر المسافر",
      "تُحسب حالته بهذا الترتيب: عاد (العودة «وصل»)، في السعودية (الذهاب «وصل»)، سافر (الذهاب «صعد»)، ذهاب وعودة، ذهاب فقط، وسيلة أخرى، عودة فقط، لم يُسند.",
      src=["lib/flights.ts:725", "lib/flights.ts:731"],
      data=["flight_assignments.status", "other_means_travelers"]),

    # ───────────── السكن ─────────────
    R("OPS-33", "السكن العام والسكن الخاص",
      "السكن الافتراضي هو السكن العام: الرجال وحدهم والنساء وحدهن، دون كلفة. ويمكن للطلب أن يختار غرفاً خاصة بأسرّة 1 (بحمّامها) أو 2 أو 3 أو 4، "
      "بشرط أن تساوي أسرّتها عدد أفراد الطلب بالضبط. التوزيع المقترح أقل عدد من الغرف: غرف رباعية ثم غرفة واحدة للباقي.",
      src=["lib/rooms.ts:70", "lib/rooms.ts:45", "app/portal/application/_components/post/step-group.tsx:199", "app/portal/application/_components/post/step-group.tsx:222"],
      data=["application_accommodation.kind", "application_accommodation_rooms.beds", "application_accommodation_rooms.rooms"],
      ex="ستة أفراد: غرفة بأربعة أسرّة وغرفة بسريرين."),
    R("OPS-34", "كلفة الغرف وتثبيت الاختيار",
      "كلفة السكن الخاص = مجموع (الأسرّة × عدد الغرف × سعر الفرد لذلك النوع) بأسعار تكتل الطلب، وتُضاف إلى الدفعة الأخيرة. السكن العام لا يضيف شيئاً. "
      "يثبت الاختيار ولا يتغير بعد دفع بند الغرف، أو بعد دفع الهدي لمن اختار السكن العام.",
      src=["lib/rooms.ts:77", "lib/rooms.ts:81", "app/portal/application/_components/post/step-group.tsx:195", "app/portal/application/_components/post/step-group.tsx:205"],
      data=["application_accommodation_rooms.price_per_person", "application_accommodation.settled_at"],
      cfg="أسعار الأنواع الأربعة يضعها كل تكتل في صفحته العامة.",
      ex="بأسعار المثال (مفردة 300، سريران 175، ثلاثة 100، أربعة 50 دولاراً): 4 أفراد في غرفتين بسريرين = 4 × 175 = 700 دولار."),

    # ───────────── المناسك والقوائم ─────────────
    R("OPS-35", "من يسجّل أداء المناسك",
      "يسجّل المناسك والمزارات ومحطات السفر المنسق التقني في المجموعات المفروزة له، ورئيس المجموعة ومعاونه في مجموعتهما. "
      "رئيس التكتل ومعاونه ومحاسبه يطّلعون ولا يسجّلون، والموجّهون لا يرونها عملاً لهم. يُحفظ السجل باسم من سجّله.",
      src=["app/administrator/_lib/scope.ts:34", "app/administrator/_lib/scope.ts:37", "app/administrator/_lib/scope.ts:40"],
      data=["field_records.recorded_by_account_id", "field_records.recorded_by_role"]),
    R("OPS-36", "شروط تسجيل المنسك",
      "يُسجَّل المنسك بعد وقوعه: لا يُقبل وقت أداء بعد الآن بأكثر من دقيقة، ولا سجل بلا مكان. في المناسك ومحطات السفر يلزم سبب لكل حاج لم يؤدِّ، "
      "إلا العمرات بعد عمرة التمتع فهي اختيارية. في المزارات لا يلزم سبب. المبيت في مزدلفة بدرجة (لم يحقق، حتى منتصف الليل، حتى الفجر)، "
      "ورمي يوم النحر للعقبة وحدها وأيام التشريق للثلاث، والمبيت في منى بالليالي 11 و12 و13.",
      src=["app/portal/(admin)/field/field.tsx:347", "app/portal/(admin)/field/field.tsx:348", "app/portal/(admin)/field/field.tsx:312",
           "lib/musters.ts:89", "lib/musters.ts:102", "lib/musters.ts:108", "lib/musters.ts:115"],
      data=["field_records.done_at", "field_records.place", "field_record_persons.absence_reason", "field_record_persons.detail", "field_record_kinds.absence_reason_required"]),
    R("OPS-37", "حذف سجل منسك",
      "لا يحذف السجل إلا من سجّله، وبعد الحذف لا يظهر لحجاج المجموعة. الحذف يُسجَّل في سجل الإداري.",
      src=["app/portal/(admin)/field/field.tsx:563", "app/portal/(admin)/field/field.tsx:515"],
      data=["field_records.deleted_at"],
      gap="الكود يحذف السجل فعلياً من ملف من سجّله؛ على المنصة الحقيقية حذف منطقي (deleted_at) يحفظ الأثر."),
    R("OPS-38", "قوائم الحافلات قبل المناسك",
      "لكل تكتل في كل قائمة (التروية، عرفة، منى أيام التشريق، الذهاب إلى المدينة) حافلات بعدد ⌈(حجاج مجموعاته + 4 لكل مجموعة) ÷ 49⌉، كل حافلة 49 مقعداً. "
      "والروضة الشريفة قائمتان بلا حافلات، للرجال وللنساء. لا يُجلس على وحدة أكثر من مقاعدها الباقية، والشخص في وحدة واحدة من القائمة نفسها: "
      "إجلاسه في أخرى ينقله إليها.",
      src=["lib/rite-lists.ts:84", "lib/rite-lists.ts:87", "lib/rite-lists.ts:96", "lib/rite-lists.ts:134", "lib/rite-lists.ts:139"],
      data=["rite_list_units.seats", "rite_list_units.gender", "rite_list_seats"]),
    R("OPS-39", "الحافلة الإضافية",
      "إن لم تتسع حافلات التكتل لمجموعات المنسق في قائمة، يطلب حافلة إضافية بعدد من بلا مقعد. يوافق فريق المواصلات فتُضاف وحدة للتكتل في تلك القائمة، "
      "أو يرفض بسبب مكتوب. وسحب وحدة يُنزل كل من عليها.",
      src=["lib/rite-lists.ts:158", "lib/rite-lists.ts:164", "lib/rite-lists.ts:173"],
      data=["bus_requests.status", "bus_requests.reason", "rite_list_units.removed_at"]),

    # ───────────── الملفات التشغيلية ─────────────
    R("OPS-40", "ملف واحد لكل نوع في كل موسم",
      "أنواع الملفات ثلاثة: التسكين في مكة (قطاع ← برج)، ومخيمات منى (مركز ← مخيم، وفريق الكوسترات على مستوى الملف)، ومخيمات عرفات (مركز ← مخيم). "
      "لكل نوع ملف واحد في الموسم. لا يُنشأ ملف إلا للموسم الجاري، ولا ينشئه إلا صاحب الصلاحية في «الملفات التشغيلية».",
      src=["lib/ops.ts:498", "lib/ops.ts:650", "lib/ops.ts:651", "app/staff/operational-files/view.tsx:125"],
      data=["operational_files.file_type_code", "operational_files.season_year", "op_file_types"]),
    R("OPS-41", "أماكن الملف من البيانات المرجعية",
      "لا يختار الملف إلا من قوائم موسمه غير المؤرشفة: القطاعات وفنادق مكة لملف التسكين، ومراكز ومخيمات منى لملف منى، ومراكز ومخيمات عرفات لملف عرفات.",
      src=["lib/ops.ts:507", "lib/ops.ts:509", "lib/ops.ts:512", "lib/ops.ts:513"],
      data=["hotels.season_year", "hotels.archived", "camps.mashaer", "mashaer_centers.mashaer", "sectors.archived"]),
    R("OPS-42", "أدوار الملف وشغلها",
      "لكل دور مستوى (الملف أو الخارجي أو الداخلي)، وهو إلزامي أو اختياري، لشخص واحد أو لعدة أشخاص بحد أعلى إن وُجد. "
      "مشرفو المركز حتى 2. الدور الفردي يُستبدل صاحبه عند اختيار غيره، والمتعدد يُضاف إليه. "
      "في ملف التسكين يختار رئيس القطاع ومعاونه البرج الذي ينامان فيه، وافتراضه أول برج في القطاع.",
      src=["lib/ops.ts:419", "app/staff/operational-files/model.ts:58", "app/staff/operational-files/model.ts:56"],
      data=["op_file_roles.required", "op_file_roles.multiple", "op_file_roles.max_holders", "op_file_assignments.housing_hotel_id"]),
    R("OPS-43", "من يُرشَّح لمنصب",
      "لا يُعرض في الاختيار إلا موظف مسجّل في موسم الملف وغير موقوف. ويمكن نقل من له منصب في الملف إلى المنصب الجديد (يُزال من القديم)، "
      "أو إضافته مع بقاء منصبه الآخر.",
      src=["app/staff/operational-files/picker.tsx:82", "app/staff/operational-files/model.ts:52"],
      data=["employee_seasons", "employees.suspended"]),
    R("OPS-44", "تفعيل الملف",
      "يُفعَّل الملف بقرار إداري: لا يُفعَّل قبل إدخال رقم القرار، ولا قبل شغل كل دور إلزامي في كل مستوى. عند التفعيل تُحفظ «مفعّل» ومن فعّله ومتى، "
      "ويصل إلى كل موظف في الملف إشعار بموقعه. ويمكن إعادته إلى مسودة. ولا تُحذف إلا المسودة.",
      src=["app/staff/operational-files/view.tsx:438", "app/staff/operational-files/view.tsx:448", "app/staff/operational-files/view.tsx:459",
           "app/staff/operational-files/view.tsx:476", "lib/ops.ts:812"],
      data=["operational_files.decision_no", "operational_files.status", "operational_files.activated_at"],
      gap="الكود يعرض رسالة «أُشعر N موظفاً» ولا يرسل إشعاراً."),
    R("OPS-45", "انتهاء الملف",
      "يصير الملف «منتهياً» إذا كان لموسم سابق، أو مضى يوم كامل بعد تاريخ نهايته. الملف المنتهي للاطلاع فقط. "
      "ويرى الموظف موقعه في «ملفاتي التشغيلية»: «إسناد مبدئي» في المسودة، و«نافذ» في المفعّل.",
      src=["lib/ops.ts:583", "app/staff/operational-files/view.tsx:348", "app/staff/my-files/my-files.tsx:57", "app/staff/my-files/my-files.tsx:58"],
      data=["operational_files.ends_on", "operational_files.status"]),
    R("OPS-46", "بناء ملف الموسم من ملف الموسم السابق",
      "يُنقل كل قطاع أو مركز وكل برج أو مخيم إلى ما يطابقه في قوائم الموسم الجديد (النوع والمدينة أو المشعر والاسم)، ويُبلَّغ عمّا لم يعد موجوداً ولا يُنقل. "
      "وإن اختير نقل الموظفين فلا يُنقل إلا المشارك في الموسم الجديد غير الموقوف، ويُبلَّغ بعدد من لم يُنقل. "
      "يأخذ الملف الجديد مواعيد النوع الافتراضية للموسم، وحالة «مسودة»، ورقم قرار فارغاً. أعداد الحجاج والتكتلات تُنسخ نقطةَ بداية يصححها المكتب.",
      src=["lib/ops.ts:246", "lib/ops.ts:857", "lib/ops.ts:858", "lib/ops.ts:861", "lib/ops.ts:900", "lib/ops.ts:908", "lib/ops.ts:911"],
      data=["hotels.place_key", "operational_files.copied_from_file_id", "op_file_type_dates"]),
    R("OPS-47", "الطاقة الاستيعابية للبرج والمخيم",
      "يُقارن مجموع حجاج البرج أو المخيم وموظفي البعثة فيه (ومعهم من ينام فيه من رؤساء القطاعات) بطاقته المتعاقد عليها، ويُنبَّه بالزيادة. التنبيه لا يمنع الحفظ.",
      src=["app/staff/operational-files/inner.tsx:101", "app/staff/operational-files/inner.tsx:103", "lib/ops.ts:797"],
      data=["hotels.capacity", "camps.capacity", "op_file_inner_nodes.pilgrims"],
      gap="لا يمنع الكود تجاوز الطاقة؛ إن أرادت الإدارة منعه فهو قرار يُضاف."),
    R("OPS-48", "البيانات المرجعية",
      "الفنادق والقطاعات والمراكز والمخيمات قوائم موسمية تُؤرشف ولا تُحذف. لا يُؤرشف عنصر مستعمل في ملف تشغيلي للموسم حتى يُزال منه. "
      "ويُستورد من الموسم السابق ما ليس في الموسم الجاري بالمفتاح نفسه، بمعرّف جديد.",
      src=["app/staff/reference/view.tsx:175", "app/staff/reference/view.tsx:774", "app/staff/reference/view.tsx:40"],
      data=["hotels.archived", "camps.archived", "sectors.place_key"]),
    R("OPS-49", "النطاق الميداني من الملفات",
      "الموقع في الملفات التشغيلية يحدد نطاق الموظف: يقيّم بعد الموسم التكتلات التي سكنت برجه أو مخيمه (وصاحب المستوى الخارجي كل أبراج قطاعه أو مخيمات مركزه). "
      "وكل موظف مشارك غير موقوف له موقع في ملفات الموسم ولا ذهاب له يظهر لمسؤول الطيران في «موظفون بلا رحلة».",
      src=["app/administrator/_lib/evaluation.ts:260", "app/administrator/_lib/evaluation.ts:266", "app/staff/flights/desk.ts:95"],
      data=["op_file_assignments.employee_id", "op_inner_node_clusters.cluster_id"],
      gap="staffPlacesOf لا يفرّق بين الملف المسودة والمفعّل؛ المنطقي أن النطاق يقوم على الملف المفعّل."),

    # ───────────── غرفة العمليات ─────────────
    R("OPS-50", "مهلة الاستجابة للبلاغ",
      "لكل نوع بلاغ مهلة بالدقائق: مفقود 0 (فوري)، صحي 10، نقل 30، وجبة 120، سكن 120، مفقودات 120، شكوى 240. "
      "يُعدّ البلاغ متأخراً إذا مضت مهلته ولم يُغلق، و«قريباً من التأخر» إذا بقي أقل من 30% منها.",
      src=["lib/data/staff-seed.ts:518", "app/staff/operations/shared.tsx:43", "app/staff/operations/shared.tsx:45", "app/staff/operations/shared.tsx:48"],
      data=["ticket_kinds.sla_minutes"]),
    R("OPS-51", "تصعيد البلاغ الحرج",
      "البلاغ الحرج الذي لم يُغلق خلال 15 دقيقة من فتحه يُعدّ مصعّداً إلى الغرفة المركزية ويُميَّز في القائمة.",
      src=["app/staff/operations/shared.tsx:52"],
      data=["tickets.escalated_at", "tickets.severity"],
      gap="التصعيد يُحسب عند العرض فقط؛ على المنصة الحقيقية تثبيت وقته في escalated_at وإشعار الغرفة."),
    R("OPS-52", "حالات البلاغ وإسناده",
      "البلاغ مفتوح ثم قيد المعالجة ثم مغلق. إسناد بلاغ مفتوح إلى جهة ينقله إلى «قيد المعالجة». كل تغيير حالة وإسناد وتحديث يُكتب في خط البلاغ الزمني باسم فاعله، "
      "ويُسجَّل في سجل الأحداث بالحالة قبل وبعد. الغرفة لصاحب الصلاحية في «غرفة العمليات».",
      src=["app/staff/operations/shared.tsx:60", "app/staff/operations/shared.tsx:63", "app/staff/operations/shared.tsx:64", "app/staff/operations/view.tsx:287", "app/staff/operations/view.tsx:26"],
      data=["tickets.status", "ticket_updates.status_from", "ticket_updates.status_to"]),

    # ───────────── مواعيد العمليات ─────────────
    R("OPS-53", "حالة العملية الموسمية",
      "لكل عملية (التسجيل المباشر، القرعة، تسجيل الإداريين، الاختبارات، التشكيل، الإلحاق، التقييم…) وضع: «تلقائي بالتواريخ» أو «فعال» أو «غير فعال». "
      "في التلقائي تُفتح من ساعة بدايتها في يومها الأول (00:00 إن لم تُحدَّد) وتُغلق بعد ساعة نهايتها في يومها الأخير (23:59 إن لم تُحدَّد)، والعملية بلا تواريخ دائمة. "
      "«فعال» و«غير فعال» يغلبان التواريخ.",
      src=["lib/operations.ts:151", "lib/operations.ts:152", "lib/operations.ts:153"],
      data=["operation_windows.mode", "operation_windows.starts_on", "operation_windows.end_time", "operations.permanent"]),
    R("OPS-54", "من يضبط مواعيد العملية",
      "يرى العملية من يملك season.windows.GET لها، ويغيّر وضعها وتواريخها من يملك season.windows.PUT لها (النطاق مفتاح العملية)؛ "
      "ومن يملكها بلا نطاق يضبط العمليات كلها. يفتتح الموسم صاحب كل ملف بمواعيد عملياته (التسجيل لإدارة التسجيل، والتشكيل والتقييم لإدارة الإداريين، والاختبارات لإدارة الامتحانات)، "
      "ومدير الموسم بها كلها. وكل تغيير حدث مهم يحمل القيمة قبل وبعد ومن غيّرها ومتى.",
      src=["lib/operations.ts:238", "lib/operations.ts:239", "app/staff/_components/operations.tsx:35", "app/staff/_components/operations.tsx:40", "app/staff/_components/operations.tsx:71", "lib/permissions.ts:487"],
      data=["staff_user_permission_scopes.scope_id", "operation_windows.updated_by_staff_id"],
      gap="لا يتحقق الكود أن تاريخ البداية قبل تاريخ النهاية."),
    R("OPS-55", "مواعيد موسم 1448",
      "التسجيل المباشر 12–25 آب 2026، والقرعة 26 آب – 10 أيلول، وتسجيل الإداريين 20–24 أيلول، والقرعة العلنية 26 أيلول، وتثبيت المقبولين 11–27 تشرين الأول. "
      "وما لم تعلنه الإدارة بعد يُعلَّم «تقديري» على نمط الموسم السابق. ومدد الملفات التشغيلية الافتراضية لموسم 1448: التسكين في مكة 8 نيسان – 31 أيار 2027، "
      "ومنى 12–19 أيار، وعرفات 13–15 أيار.",
      src=["lib/operations.ts:60", "lib/operations.ts:62", "lib/operations.ts:50", "lib/season.ts:146", "lib/season.ts:147", "lib/ops.ts:408", "lib/ops.ts:472", "lib/ops.ts:494"],
      data=["season_calendar", "operation_windows.is_estimate", "op_file_type_dates"],
      cfg="مواعيد العمليات من «إعدادات الموسم ← مواعيد العمليات»؛ تقويم الجمهور ومدد الملفات ثابتة في الكود."),

    # ───────────── سفر الموظف مع البعثة ─────────────
    R("OPS-56", "للمسافر مع البعثة رحلتان، ولغيره لا رحلة",
      "يسافر الموظف مع البعثة في موسم إذا كان الموسم في قائمة مواسمه. للمسافر في «ملفاتي التشغيلية» «رحلاتي» برحلة ذهاب ورحلة عودة، ومواقعه في ملفات الموسم، "
      "وإن لم يُسند بعد إلى برج أو مخيم ظهر «تسافر مع البعثة … دون موقع في برج أو مخيم». ومن لا يسافر في الموسم لا تظهر له رحلة ولا موقع، بل «لا تسافر مع البعثة في موسم 1448»: "
      "عمله من مكتبه في سوريا. وفي البيانات التجريبية كل حساب يسافر في 1448 على رحلتين: الطليعة (وسام وليلى وغسان وباسل وفرق الإسكان والمخيمات) تذهب على رحلة الموظفين RB 401، "
      "وفادي وهيثم مع أول رحلة حجاج RB 501، ويعودون جميعاً على RB 402.",
      src=["app/staff/my-files/view.tsx:24", "app/staff/my-files/view.tsx:25", "app/staff/my-files/my-files.tsx:77", "app/staff/my-files/my-files.tsx:86",
           "app/staff/my-files/my-flights.tsx:15", "lib/flights.ts:489", "lib/flights.ts:490", "lib/flights.ts:527",
           "lib/flights.ts:258", "lib/flights.ts:260", "lib/flights.ts:290",
           "lib/data/ops-seed.ts:803", "lib/data/ops-seed.ts:805", "lib/data/ops-seed.ts:806", "lib/data/employees-seed.ts:53"],
      data=["employee_seasons.season_year", "flight_assignments.employee_id", "flight_assignments.direction", "op_file_assignments.employee_id"],
      ex="في تسكين مكة 1448: ليلى شمس وباسل النوري عضوا بعثة في أبراج النور، وفادي سلوم في سنابل حوران، وغسان العمر رئيس القطاع الأول، وهيثم زيدان بلا موقع لأن عمله بين المطارات؛ "
         "ورزان الحسن لا تسافر، فترى «لا تسافر مع البعثة».",
      gap="لا يفرض الكود أن لكل مسافر رحلتين: في البيانات التجريبية 113 موظفاً يسافرون في 1448، منهم 17 على رحلتين (الحسابات المسافرة وأعضاء الطليعة) و96 بلا رحلة تعرض لهم «لم تُحدد بعد». "
          "على المنصة الحقيقية تنبيه «مسافر بلا رحلة» في «إدارة الطيران» قبل إقفال الرحلات."),
])
