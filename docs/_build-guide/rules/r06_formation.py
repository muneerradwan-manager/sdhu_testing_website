# -*- coding: utf-8 -*-
from .dsl import *

DOMAIN = D("formation", "FRM", "تشكيل المجموعات والتكتلات", [
    "يغطي هذا الفصل ما بعد التأهل: تشكيل المجموعة في المكتب باسمها وفئة رئيسها ومقاعد فريقها ورسمها وعقدها، ثم تشكيل التكتل في المكتب بمستواه ومجموعاته وكادره وتوزيع منسقيه وموجّهاته ومحاسبه، "
    "وشروط اكتماله وشاراته، والتعديل الاستثنائي، والمجموعات الباقية خارج التكتلات، ثم ما يراه الحجاج من التكتلات والمجموعات، وإلحاق الطلب العائلي بمجموعة بعقد في المكتب.",
    "الأعداد (أوزان الفئات، ومقاعد كل فئة وحجاجها في كل مستوى، وتركيب التكتل) تشحنها المنصة في app/administrator/_lib/structure-defaults.ts ويعدّلها صاحب الصلاحية في «إدارة الإداريين» (admins.*) في «القوائم المرجعية». "
    "والرسوم من «إعدادات الموسم». والمواعيد عمليات group-formation وcluster-formation وgroup-joining في lib/operations.ts. "
    "التشكيل كله في المكتب: الموظف صاحب الصلاحية في «إدارة الإداريين» (في البيانات التجريبية مازن الحلبي، مدير المكتب) هو من يُدخل المجموعة والتكتل، والطلبات على المنصة بقايا مسار قديم ما زالت تُراجع.",
], [
    R("FRM-01", "من تُشكَّل له مجموعة",
      "تُشكَّل المجموعة لرئيس مجموعة مؤهل فقط: صفته المتقدَّم بها «رئيس مجموعة» (أو منحته الإدارة «رئيس تكتل» فوقها)، ونجح ونُشرت نتيجته أو جدّد صفته معفى، وليس له مجموعة معتمدة بعد. "
      "لكل رئيس مجموعة مجموعة واحدة في الموسم. ولا تُشكَّل مجموعة إلا ونافذة «تشكيل المجموعات» (group-formation: 1–10 تشرين الثاني 2026 تقديرياً) مفتوحة.",
      src=["app/staff/admins/desk.ts:164", "app/staff/admins/desk.ts:47", "app/staff/admins/_components/groups.tsx:319", "lib/operations.ts:65"],
      data=["admin_groups.head_account_id", "admin_groups.season_year", "operation_windows"],
      cfg="يُدخلها صاحب الصلاحية في «إدارة الإداريين» من «تشكيل المجموعات» ← «تشكيل مجموعة»"),

    R("FRM-02", "اسم المجموعة ورقمها",
      "تُعرف المجموعة باسمها لا برقمها في كل شاشة ونص وسجل («مجموعة اللطيف»). يكتب الموظف الاسم كما اختاره رئيسها: كلمة أو كلمتان دون كلمة «مجموعة»، ولا تحمله مجموعة أخرى في الموسم. "
      "الرقم مفتاح داخلي لا يُعرض: أول رقم حر بعد 26 لم يُعطَ لمجموعة أخرى في الموسم. وإن لم يكتب الرئيس اسماً تقترح المنصة اسماً من قائمتها لذلك الرقم.",
      src=["lib/groups.ts:89", "lib/groups.ts:109", "app/staff/admins/_components/groups.tsx:246", "app/administrator/_lib/capacity.ts:12"],
      data=["admin_groups.name", "admin_groups.number"],
      ex="مجموعة أحمد سليمان الحمصي 01033300871 رقمها 27 واسمها «اللطيف».",
      gap="فحص تفرّد الاسم يقارن بأسماء المجموعات وحدها؛ أما «لا يساوي اسم تكتل» الذي في النموذج فلا يُفحص عند تشكيل المجموعة، بل يُكتشف لاحقاً شرطاً في التكتل (FRM-14)."),

    R("FRM-03", "الفئة تحدد السعة والمقاعد",
      "لا يختار رئيس المجموعة سعتها: فئته تحددها الإدارة (وهي فئة مجموعته) ويثبّتها الموظف عند التشكيل أو الاعتماد. الفئات أربع بأوزان 1 و2 و3 و4. "
      "ومن الفئة ومستوى التكتل يُقرأ عدد الحجاج ومقاعد الفريق (موجّهون، معاونون، مقاعد حرة تأخذ أيّاً منهما)، وقبل دخول تكتل تُقرأ في المستوى الافتراضي «اقتصادي». "
      "أعداد 1448: اقتصادي — الأولى 45 حاجاً بموجّه، الثانية 90 بموجّه ومعاون، الثالثة 135 بموجّه ومعاون ومقعد حر، الرابعة 200 بموجّهين ومعاونَين؛ "
      "اقتصادي محسن — 45، 135، 135، 200 (والرابعة بمقعد حر زائد)؛ خمس نجوم — 30، 60، 90، 120 بلا مقاعد فريق.",
      src=["app/administrator/_lib/structure-defaults.ts:9", "app/administrator/_lib/structure-defaults.ts:21", "app/administrator/_lib/structure.ts:241", "app/staff/admins/_components/groups.tsx:290"],
      data=["group_categories.weight", "category_rules.pilgrims", "category_rules.guides", "category_rules.assistants", "category_rules.free_seats", "admin_groups.capacity", "admin_groups.category_key"],
      cfg="الفئات وأعدادها لكل مستوى في «القوائم المرجعية» لصاحب الصلاحية في «إدارة الإداريين»؛ وفئة كل رئيس في «الكادر الإداري»",
      ex="مجموعة اللطيف في الفئة الثانية: 90 حاجاً في الاقتصادي، بموجّه ومعاون."),

    R("FRM-04", "مقاعد فريق المجموعة",
      "يُجلس الموظف في كل مقعد تعطيه الفئة شخصاً مؤهلاً: مقعد الموجّه لمن تحمل صفته سلوك «يشغل مقعد الموجّه»، ومقعد المعاون لمن تحمل سلوك «يشغل مقعد المعاون»، والمقعد الحر لأيّهما. "
      "لا يُجلس شخص في مقعدين، ولا في مجموعة وهو مُجلس في أخرى، ولا رئيس المجموعة نفسه، ولا من يحجزه تكتل آخر، ولا حساب موقوف أو محذوف. "
      "وإن لم تكن في الفئة مقاعد معاون، فله أن يضيف «معاوناً بعدد» اختيارياً.",
      src=["app/staff/admins/_components/groups.tsx:250", "app/staff/admins/_components/groups.tsx:251", "app/staff/admins/_components/groups.tsx:380", "app/administrator/_lib/formation.ts:289"],
      data=["group_seats.kind", "group_seats.is_free", "group_seats.account_id", "admin_roles.guide_seat", "admin_roles.assistant_seat"]),

    R("FRM-05", "رسم التشكيل والعقد وإنشاء المجموعة",
      "رسم تشكيل المجموعة 200 $ يُسدَّد في المكتب، بإيصال 1448-G-<رقم المجموعة بستة أرقام>. تُنشأ المجموعة فقط إذا اجتمع: رئيس مختار، واسم سليم، وفئة، وتأكيد الرسم، وكل مقاعد الفئة مشغولة، "
      "وصورة العقد الورقي الموقّع مرفوعة، وتأكيد أن الرئيس وفريقه وقّعوه. بالإنشاء تصير المجموعة معتمدة فوراً (approved_at واسم الموظف)، ويراها رئيسها في بوابته.",
      src=["lib/season.ts:51", "app/staff/admins/_components/groups.tsx:258", "app/staff/admins/_components/groups.tsx:300", "app/administrator/_lib/admin.ts:476"],
      data=["season_settings.fee_group_formation", "admin_groups.fee_paid_at", "admin_groups.fee_receipt_no", "admin_groups.contract_file_id", "admin_groups.approved_at", "admin_groups.approved_by_staff_id"],
      cfg="الرسم يضبطه مدير الموسم في «إعدادات الموسم» ← «رسوم الإداريين» (0–2000 $ بخطوة 10)"),

    R("FRM-06", "طلبات تشكيل قديمة على المنصة",
      "طلب تشكيل مجموعة قُدّم على المنصة قبل نقل التشكيل إلى المكتب له حالة محسوبة: «بانتظار رسم التشكيل» إن لم يُدفع، و«تنتظر قرارك» إن دُفع، و«أُعيدت إلى رئيسها» إن أعادها الموظف بملاحظة، و«معتمدة». "
      "يعتمده الموظف بفئة رئيسه (فتُحسب سعته في الاقتصادي، وتُسجَّل الفئة إن غيّرها)، أو يعيده بملاحظة تصل إلى الرئيس في بوابته.",
      src=["app/staff/admins/desk.ts:157", "app/staff/admins/_components/groups.tsx:473", "app/staff/admins/_components/groups.tsx:484"],
      data=["admin_groups.formed_at_office", "admin_groups.returned_at", "admin_groups.return_note"],
      gap="شرط «رئيسها مؤهل» يظهر علامة في قائمة الشروط لكن زر الاعتماد لا يمنعه؛ على المنصة الحقيقية ألا يُعتمد طلب رئيسه غير مؤهل."),

    R("FRM-07", "من يرأس تكتلاً",
      "يُشكَّل التكتل لمن يحمل صفة فيها سلوك «قائد التكتل» (رئيس تكتل) أساسيةً أو موسمية تمنحها الإدارة، وحسابه غير موقوف ولا محذوف، وليس رئيساً لتكتل آخر قائم. "
      "لا ينتخب أحد ولا يتقدم أحد لهذه الصفة. ولا يُشكَّل التكتل إلا في نافذة «تشكيل التكتلات» (cluster-formation: من 12 تشرين الثاني 2026 تقديرياً).",
      src=["app/staff/admins/_components/clusters.tsx:230", "app/administrator/_lib/structure.ts:86", "lib/operations.ts:67"],
      data=["admin_roles.cluster_leader", "cadre_seasonal_roles", "clusters.head_account_id"],
      ex="نبيل الساعاتي 01033300882 رئيس مجموعة منحته الإدارة «رئيس تكتل» موسمية."),

    R("FRM-08", "بدء التكتل في المكتب",
      "يبدأ الموظف التكتل باسم (3 أحرف على الأقل) ومستوى من مستويات الإدارة (اقتصادي، اقتصادي محسن، خمس نجوم)، بحضور رئيسه. "
      "تدخل مجموعة رئيس التكتل معه من البداية بفريقها الذي أُجلس عند تشكيلها، ومعها «معاونها بعدد» إن كان، ولا تُزال من التكتل. ويُختم التكتل بموسم التشكيل، وحالته «قيد التشكيل في المكتب».",
      src=["app/staff/admins/_components/clusters.tsx:266", "app/staff/admins/_components/clusters.tsx:241", "app/staff/admins/_components/clusters.tsx:247", "app/staff/admins/_components/clusters.tsx:447"],
      data=["clusters.name", "clusters.tier_key", "clusters.status", "clusters.created_at_office", "service_tiers"]),

    R("FRM-09", "دخول المجموعات إلى التكتل",
      "تُضاف إلى التكتل مجموعات معتمدة لها فئة، من فروع رئيسه (فرعه وما فتحته له الإدارة)، لا يحجزها تكتل آخر. تدخل كل مجموعة بمقاعدها كما أُجلست عند تشكيلها، "
      "تُعاد مطابقتها لفئتها في مستوى هذا التكتل، ويدخل «معاونها بعدد» إن كان مع معاوني التكتل. وتغيير مستوى التكتل يعيد بناء مقاعد كل مجموعاته بأعداد المستوى الجديد، محتفظاً بمن يشغل مقعداً باقياً.",
      src=["app/staff/admins/_components/clusters.tsx:326", "app/staff/admins/_components/clusters.tsx:347", "app/administrator/_lib/formation.ts:59", "app/administrator/_lib/formation.ts:73", "app/staff/admins/_components/clusters.tsx:428"],
      data=["cluster_groups.group_id", "cluster_groups.status", "group_seats", "cadre_extra_branches"]),

    R("FRM-10", "تركيب التكتل بحسب مستواه",
      "مجموع فئات مجموعات التكتل (الوزن) يجب أن يقع بين حدّي مستواه: اقتصادي 5–24، اقتصادي محسن 5–21، خمس نجوم 5–21. "
      "وعدد معاوني التكتل مضبوط تماماً: 1 في الاقتصادي والمحسن، 0 في الخمس نجوم، ولا يُحتسب «معاون بعدد» منهم. "
      "والمنسقون منسق لكل 6 وحدات (20 في الخمس نجوم)، والموجّهات موجّهة لكل 7 وحدات (100 في الخمس نجوم): العدد = تقريب (الوزن ÷ الحصة)، فإن كان صفراً فلا أحد، "
      "ولا يقل أبداً عن العدد الذي يحمل كل مجموعة ضمن حصته.",
      src=["app/administrator/_lib/structure-defaults.ts:33", "app/administrator/_lib/structure.ts:264", "app/administrator/_lib/distribution.ts:55", "app/administrator/_lib/formation.ts:145"],
      data=["tier_compositions.min_weight", "tier_compositions.max_weight", "tier_compositions.cluster_assistants", "tier_compositions.units_per_coordinator", "tier_compositions.units_per_female_guide"],
      cfg="يعدّلها صاحب الصلاحية في «إدارة الإداريين» في «القوائم المرجعية» ← تركيب التكتلات",
      ex="تكتل النور وزنه 11 في الاقتصادي: معاون تكتل واحد، ومنسقان (11÷6≈2)، وموجّهتان (11÷7≈2). تكتل البيان وزنه 5: منسق واحد وموجّهة واحدة."),

    R("FRM-11", "اختيار كادر التكتل",
      "يختار رئيس التكتل في المكتب معاوني التكتل ومنسقيه وموجّهاته من الكادر المؤهل هذا الموسم، بحسب سلوك صفة كل واحد (ضمن مرشّحي معاوني التكتل، أو المنسقين، أو الموجّهات)، "
      "ومن فروعه، غير محجوز في تكتل آخر ولا في مكان آخر من التكتل نفسه، وغير موقوف ولا محذوف. الصفة المعتبرة هي الموسمية إن مُنحت، وإلا الأساسية، وإلا صفة تقدّمه. "
      "كل من يوضع في المكتب حاضر، فمكانه مقبول فوراً بلا دعوة.",
      src=["app/administrator/_lib/formation.ts:272", "app/administrator/_lib/formation.ts:293", "app/staff/admins/_components/clusters.tsx:333", "app/administrator/_lib/formation.ts:517"],
      data=["cluster_members.pool", "cluster_members.status", "admin_roles.assistant_pool", "admin_roles.coordinator_pool", "admin_roles.guide_pool", "cadre_people.account_status"]),

    R("FRM-12", "منسق بصفة «معاون ومنسق تقني» في كل تكتل",
      "إن احتاج التكتل منسقاً واحداً على الأقل، فلا بد أن يكون أحد منسقيه بصفة تجمع سلوكَي «يشغل مقعد المعاون» و«ضمن مرشّحي منسّقي التكتل» (معاون ومنسق تقني).",
      src=["app/administrator/_lib/formation.ts:156", "app/administrator/_lib/structure.ts:90"],
      data=["admin_roles.assistant_seat", "admin_roles.coordinator_pool"],
      ex="في تكتل النور لؤي العظمة 01033300961، وفي تكتل البيان خلدون الصيرفي 01033300895."),

    R("FRM-13", "توزيع المنسقين والموجّهات على المجموعات",
      "لكل مجموعة منسق واحد وموجّهة واحدة من التكتل. حمل الشخص = مجموع أوزان فئات المجموعات الموزّعة عليه، ولا يتجاوز حصة مستواه (6 للمنسق و7 للموجّهة في الاقتصادي)؛ "
      "يُمنع اختيار شخص لمجموعة تجاوز به حصته، ومن تجاوزها يمنع اكتمال التكتل. «التوزيع التلقائي» يضع الأثقل أولاً على من بقي له أوسع مجال (توزيع متساوٍ)، "
      "فإن بقيت مجموعات بلا أحد جرّب التكديس على من بقي له أضيق مجال يتسع لها، وأخذ ما يترك مجموعات أقل.",
      src=["app/administrator/_lib/distribution.ts:18", "app/administrator/_lib/distribution.ts:43", "app/staff/admins/_components/clusters.tsx:387", "app/administrator/_lib/formation.ts:162"],
      data=["cluster_groups.coordinator_account_id", "cluster_groups.female_guide_account_id", "tier_compositions.units_per_coordinator"],
      ex="سامر نجار 01033300874 موزّع على الخبير (3) واللطيف (2): خمس وحدات من حصته الست."),

    R("FRM-14", "شروط اكتمال التكتل",
      "لا يُنشأ التكتل حتى تتحقق كل الشروط الحاجزة: له اسم؛ ومستواه صالح؛ ومجموعة واحدة على الأقل؛ والوزن ضمن الحدين؛ ولا مجموعة اسمها يطابق اسم التكتل بعد حذف كلمة «تكتل»؛ "
      "ولا مجموعة فيها حجاج أكثر من سعة فئتها في هذا المستوى؛ وكل مقاعد كل مجموعة مشغولة بعدد مستواه؛ ومعاونو التكتل والمنسقون والموجّهات بالعدد المطلوب تماماً؛ "
      "ومنسق «معاون ومنسق تقني»؛ ولا أحد فوق حصته؛ والمحاسب محدد؛ ولا مكان بانتظار تأكيد.",
      src=["app/administrator/_lib/formation.ts:142", "app/administrator/_lib/formation.ts:146", "app/administrator/_lib/formation.ts:148", "app/administrator/_lib/formation.ts:152", "app/administrator/_lib/formation.ts:154"],
      data=["clusters", "cluster_groups", "group_seats", "cluster_members"]),

    R("FRM-15", "محاسب التكتل",
      "للتكتل محاسب واحد، صفة ثانوية يختارها رئيسه من أعضاء التكتل (رئيسه، ورؤساء مجموعاته، ومن في مقاعدها، ومعاونيه ومنسقيه)، ولا يكون من موجّهات التكتل. "
      "الموقع الثانوي لا يُلغي موقعه الأصلي، وقبوله لا يرفض شيئاً آخر.",
      src=["app/administrator/_lib/formation.ts:163", "app/staff/admins/_components/clusters.tsx:337", "app/administrator/_lib/formation.ts:441"],
      data=["cluster_members.pool"],
      ex="مهند السيد 01033300944 معاون في مجموعة أحفاد بني هاشم ومحاسب تكتل النور."),

    R("FRM-16", "متوسط أعمار الكادر",
      "يُحسب متوسط أعمار كادر التكتل (رئيسه ورؤساء مجموعاته ومن في مقاعدها ومعاونيه ومنسقيه وموجّهاته). الموجّهون بدرجات لهم «عمر مثبَّت» يُحتسب بدل أعمارهم: "
      "موجّه ديني أ وموجّهة دينية أ 40، وموجّه ديني ب 45، وموجّهة دينية ب 48، والدرجة ج بعمرها. المتوسط فوق 50 تنبيه يظهر ولا يمنع الإنشاء.",
      src=["app/administrator/_lib/formation.ts:171", "app/administrator/_lib/structure.ts:313", "app/administrator/_lib/structure.ts:91"],
      data=["admin_roles.fixed_age"]),

    R("FRM-17", "شارات التكتل",
      "ثلاث شارات محسوبة لا تُمنح يدوياً: «شارة العمر» إذا كان متوسط أعمار الكادر (بالأعمار المثبّتة) 40 أو أقل؛ و«شارة التميّز في التوجيه الديني» إذا كان في التكتل شخص واحد على الأقل بصفة تمنحها (الدرجة «أ» للموجّه أو الموجّهة)؛ "
      "و«شارة الالتزام بالمواعيد» إذا كان أول إرسال للتكتل (أو إنشاؤه في المكتب) قبل الموعد الأول أو فيه: 19 تشرين الثاني 2026 الساعة 23:59.",
      src=["app/administrator/_lib/structure.ts:333", "app/administrator/_lib/structure.ts:339", "app/administrator/_lib/formation.ts:189", "app/administrator/_lib/structure.ts:151"],
      data=["clusters.first_sent_at", "admin_season_rules.cluster_early_deadline_at", "admin_roles.guidance_badge"],
      cfg="الموعد الأول يضبطه صاحب الصلاحية في «إدارة الإداريين» في صفحة «التكتلات»"),

    R("FRM-18", "رسم التكتل والعقد وإنشاؤه",
      "بعد اكتمال الشروط يُسدَّد رسم التكتل 500 $ في المكتب، وتُرفع صورة العقد الورقي، ويؤكد الموظف أن كل من في التكتل وقّعه. عندها فقط يُنشأ التكتل «معتمداً» لحظة إنشائه، "
      "ويُسجَّل وقت الإرسال والاعتماد واسم الموظف، ويجده رئيسه وكل من فيه في بوابتهم فوراً. وللموظف أن يستبدل صورة العقد بعد ذلك.",
      src=["lib/season.ts:52", "app/staff/admins/_components/clusters.tsx:585", "app/staff/admins/_components/clusters.tsx:601"],
      data=["season_settings.fee_cluster_formation", "clusters.fee_paid_at", "clusters.contract_file_id", "clusters.decided_by_staff_id", "clusters.decided_at"],
      cfg="الرسم يضبطه مدير الموسم في «إعدادات الموسم» ← «رسوم الإداريين» (0–5000 $ بخطوة 10)"),

    R("FRM-19", "شخص في مكان واحد ومجموعة في تكتل واحد",
      "يشغل الشخص مكاناً واحداً في الموسم، وتدخل المجموعة تكتلاً واحداً. في الطلبات القديمة بالدعوات: قبول دعوة إلى مكان يرفض تلقائياً كل دعوة معلّقة أخرى من النوع نفسه (المجموعات مع المجموعات، والأشخاص مع الأشخاص)، "
      "إلا دعوة المحاسب فهي ثانوية. ومن يحجزه طلب تكتل آخر يظهر «محجوزاً» ولا يُختار.",
      src=["app/administrator/_lib/formation.ts:433", "app/administrator/_lib/formation.ts:446", "app/administrator/_lib/formation.ts:279"],
      data=["cluster_members", "cluster_groups"]),

    R("FRM-20", "طلبات التكتل ومواعيدها",
      "حالات طلب التكتل: «قيد التشكيل في المكتب» (draft)، «قيد المراجعة» (pending)، «جاري المراجعة»، «شُكّل في المكتب» (approved)، «مرفوض — بملاحظات». "
      "يعدّل الطلب فقط وهو draft أو pending أو rejected والنافذة مفتوحة. وبعد الموعد النهائي يتحرر من التكتلات كل مجموعة في طلب مرفوض أو مسودة، فتصير «خارج التكتلات».",
      src=["app/administrator/_lib/formation.ts:27", "app/administrator/_lib/formation.ts:248", "app/staff/admins/desk.ts:177"],
      data=["clusters.status", "cluster_status_history"]),

    R("FRM-21", "التعديل الاستثنائي",
      "لصاحب الصلاحية في «إدارة الإداريين» أن يعدّل تكتلاً خارج الضوابط المعتادة: يزيل شخصاً من مكانه، أو يضع شخصاً في مكان شاغر (مقبولاً فوراً)، أو يضيف مجموعة معتمدة غير محجوزة من فروع رئيسه. "
      "كل تعديل يحتاج سبباً من 3 أحرف على الأقل، ويُكتب في سجل التكتل وسجل كل من مسّه، وتُبنى مقاعد المجموعة المضافة بفئتها في مستوى التكتل ليملأها رئيسه.",
      src=["app/staff/admins/_components/clusters.tsx:954", "app/staff/admins/_components/clusters.tsx:1040", "app/administrator/_lib/formation.ts:484"],
      data=["clusters.administration_reason", "cluster_groups.by_administration_reason", "cluster_members.reason"]),

    R("FRM-22", "خطة التكتل التشغيلية",
      "يرفع رئيس التكتل المعتمد خطته التشغيلية: عنوان (3 أحرف على الأقل) وملخص (20 حرفاً على الأقل) وملف. لا يرفعها إن كانت له خطة «مقدَّمة» أو «مقبولة»، "
      "وله أن يعيد رفعها بعد أن تعيدها الإدارة بملاحظة.",
      src=["app/portal/(admin)/cluster/plan.tsx:35", "app/portal/(admin)/cluster/plan.tsx:75"],
      data=["operational_plans.status", "operational_plans.decision_note"]),

    R("FRM-23", "صفحة التكتل العامة وموافقة الإدارة",
      "يكتب برنامج التكتل (السكن والنقل والوجبات والبرامج والصور وأسعار الغرف الخاصة) فريقه بعد اعتماده: رئيسه ومعاونوه ومنسقوه ورؤساء مجموعاته ومعاونوهم، لا موجّهاته. "
      "لا يعدّلون التقييم ولا عدد المراجعات ولا المستوى ولا تاريخ الاعتماد ولا المجموعات. ما يرسلونه ينتظر الإدارة، فتعتمده فيُنشر، أو تعيده بسبب من 5 أحرف على الأقل. ولا يصل شيء إلى الحجاج قبل الاعتماد.",
      src=["app/administrator/_lib/directory.ts:105", "lib/cluster-profile.ts:21", "lib/store.ts:1535", "app/staff/admins/_components/clusters.tsx:1185"],
      data=["cluster_profile_versions.status", "cluster_profile_versions.reject_reason"]),

    R("FRM-24", "صفحة المجموعة العامة",
      "يكتب صفحة المجموعة (صورتها ونبذة عنها ومعرض صورها) رئيسها بعد اعتمادها أو معاونها، ورئيس التكتل لكل مجموعاته. تنتظر موافقة الإدارة كصفحة التكتل، وترفضها الإدارة بسبب من 5 أحرف على الأقل. "
      "وقبل أي نسخة معتمدة تُعرض صورة ومعرض من صور المنصة يختلفان من مجموعة لأخرى، بلا نبذة.",
      src=["app/administrator/_lib/directory.ts:70", "app/administrator/_lib/directory.ts:83", "lib/group-profile.ts:89", "app/staff/admins/_components/clusters.tsx:1353"],
      data=["group_profile_versions.status", "group_profile_versions.reject_reason"]),

    R("FRM-25", "دليل التكتلات والمجموعات للحجاج",
      "يظهر التكتل في الدليل العام فقط إن كان معتمداً غير مؤرشف وله برنامج منشور (من فريق المحتوى أو معتمد من الإدارة). ويُقرأ من طلبه: مستواه، وعدد مجموعاته، "
      "وكل مجموعة برئيسها وسعتها والمقاعد الباقية فيها (السعة − حجاجها، ولا تقل عن صفر)، ومجموعة رئيس التكتل أولاً.",
      src=["lib/cluster-profile.ts:194", "lib/cluster-profile.ts:221", "app/administrator/_lib/directory.ts:39", "app/administrator/_lib/directory.ts:52"],
      data=["clusters.status", "clusters.archived_at", "cluster_profile_versions"]),

    R("FRM-26", "إلحاق الحاج بمجموعة في المكتب",
      "إلحاق الحجاج المقبولين بالمجموعات عملية مستقلة عن التسجيل (group-joining: 12 تشرين الثاني 2026 – 15 كانون الثاني 2027 تقديرياً). لا إلحاق تلقائي، ولا يختار الحاج مجموعته على المنصة، والإداريون لا يلحقون أحداً: "
      "يتفق الحاج مع مجموعة ويوقّع عقده معها في المكتب، فيبحث موظف المكتب عن الطلب ويختار المجموعة ويرفع العقد الموقّع ويلحقه. الإلحاق للطلبات المقبولة وحدها.",
      src=["lib/assignment.ts:5", "lib/assignment.ts:171", "app/staff/reviews/contracts.tsx:212", "lib/operations.ts:66"],
      data=["post_acceptance.group_id", "post_acceptance.group_approved_at", "group_enrollment_contracts.file_id", "post_acceptance.enrolled_by_staff_id"],
      cfg="يقوم به موظف المكتب صاحب الصلاحية في «مراجعة الطلبات والوثائق» (reviews.*) من «مراجعة الطلبات» ← العقود",
      gap="README يقول إن الحاج «يختار المجموعة 27 من الدليل فيسجّله منسقها»، والكود لا يتيح للحاج اختياراً ولا للمنسق إلحاقاً. والنافذة group-joining لا تُفحص عند الإلحاق في contracts.tsx."),

    R("FRM-27", "الطلب العائلي يُلحق كاملاً أو لا يُلحق",
      "يدخل الطلب كله (كل أفراده) في المجموعة دفعة واحدة. يُرفض الإلحاق إن كان الطلب في المجموعة نفسها، أو إن تجاوز (المشغول + عدد أفراد الطلب) سعة المجموعة. "
      "المشغول = السعة − الباقي في الدليل + أفراد الطلبات الملحقة بها فعلاً.",
      src=["app/staff/reviews/contracts.tsx:218", "app/staff/reviews/contracts.tsx:219", "lib/assignment.ts:91"],
      data=["post_acceptance.group_id", "admin_groups.capacity"]),

    R("FRM-28", "نقل عائلة إلى مجموعة أخرى",
      "ينقل موظف المكتب طلباً ملحقاً إلى مجموعة أخرى بعقد جديد، والطلب العائلي ينتقل كاملاً. يُسجَّل النقل (من، إلى، متى)، ويبدأ الملف الصحي للعائلة من جديد مع منسق المجموعة الجديدة، "
      "وتتبع العائلة رحلات مجموعتها الجديدة إن كانت المجموعة على رحلات.",
      src=["lib/assignment.ts:105", "lib/assignment.ts:113", "lib/assignment.ts:115", "lib/assignment.ts:132"],
      data=["application_group_transfers.from_group_id", "application_group_transfers.to_group_id", "group_enrollment_contracts.transfer_from_group_id"]),

    R("FRM-29", "عقود رفعتها المجموعات (مسار قديم)",
      "العقد الذي رفعه طرف المجموعة قبل نقل الإلحاق إلى المكتب ينتظر المكتب: يعتمده فيُلحق الطلب كله بالمجموعة (أو يُنقل إليها إن كان في أخرى)، أو يعيده إلى رافعه بسبب يختاره من قائمة.",
      src=["lib/assignment.ts:139", "lib/assignment.ts:154", "app/staff/reviews/contracts.tsx:54"],
      data=["group_enrollment_contracts.status", "group_enrollment_contracts.return_reason", "group_enrollment_contracts.decided_by_staff_id"]),

    R("FRM-30", "ما يراه الحاج عن مجموعته",
      "يرى الحاج بعد إلحاقه: تكتله ومستواه ومكتبه، ورئيس مجموعته، وسعتها والباقي فيها، وفريقها؛ والمنسق التقني الذي يراه هو منسق التكتل الذي وزّعه رئيس التكتل على مجموعته، "
      "فإن لم يُوزَّع أحد بعد ظهر «يسمّيه رئيس التكتل». ويرى رئيس المجموعة ومنسقها حجاجها بعد إلحاقهم.",
      src=["lib/assignment.ts:41", "lib/assignment.ts:53", "lib/assignment.ts:63"],
      data=["cluster_groups.coordinator_account_id", "post_acceptance.cluster_id"]),
])
