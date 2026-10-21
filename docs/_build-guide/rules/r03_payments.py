# -*- coding: utf-8 -*-
from .dsl import *

DOMAIN = D("payments", "PAY", "الرسوم والدفعات", [
    "يغطي هذا الفصل كل مبلغ يدفعه الحاج أو الإداري: رسم التسجيل، وتكلفة الحج بدفعاتها، والهدي، والسكن الخاص، "
    "ورسوم الإداريين والمجموعات والتكتلات، وطرق الدفع، والإيصالات، والرصيد والرد، وما يحدث لدفعة متأخرة.",
    "تأتي القيم من ثلاثة مصادر. الأول ثوابت الموسم الافتراضية في lib/season.ts. الثاني «إعدادات الموسم» التي تضبطها مديرة الموسم "
    "(رسم التسجيل، تكلفة الحج، الهدي، رسوم الإداريين)، وتُدمج فوق الثوابت في mergeSeason. الثالث إصدار إعدادات التسجيل المنشور "
    "(عدد الدفعات ومبالغها ومواعيدها وطرق الدفع وخطوة الهدي والسكن)، ويضبطه حامل صلاحية «إدارة التسجيل على الحج» من «الدفعات والمسارات».",
    "كل طلب يجمّد عند تقديمه الشروط المالية السارية لحظتها، فلا يغيّر تعديلٌ لاحق ما يدين به طلب مقدَّم.",
], [
    R("PAY-01", "القيم المالية للموسم",
      "قيم الموسم 1448 الافتراضية: رسم التسجيل 25 $ للفرد، وتكلفة الحج 4,750 $ للفرد، والدفعة الأولى 3,500 $ للفرد، "
      "ودفعتان، والهدي 180 $ للفرد، ورسم تسجيل الإداري 30 $، ورسم تشكيل المجموعة 200 $، ورسم تشكيل التكتل 500 $. "
      "كل قيمة غيّرتها مديرة الموسم تحل محل الافتراضية، وما لم تغيّره يبقى على الافتراضي. العملة الدولار الأمريكي.",
      src=["lib/season.ts:48", "lib/season-live.ts:53", "app/staff/season/view.tsx:57"],
      data=["season_settings.fee_registration_per_person", "season_settings.hajj_cost", "season_settings.first_installment",
            "season_settings.installment_count", "season_settings.hady", "season_settings.fee_admin_registration",
            "season_settings.fee_group_formation", "season_settings.fee_cluster_formation"],
      cfg="تضبطها مديرة الموسم (صلاحية season.settings) من «إعدادات الموسم» ← «الرسوم والتكاليف» و«رسوم الإداريين». حدود الإدخال: رسم التسجيل 0–200 $، تكلفة الحج 1,000–15,000 $ بخطوة 50، الهدي 0–1,000 $."),

    R("PAY-02", "جدول الدفعات من الإصدار المنشور",
      "عدد دفعات تكلفة الحج ومبالغها ومواعيدها لا تأتي من إعدادات الموسم، بل من قسم payments في إصدار إعدادات التسجيل. "
      "لكل دفعة: مفتاح، واسم يراه الحاج، ومبلغ للفرد أو «باقي التكلفة»، ونص موعد يُعرض على الحاج، والخطوة التي تستحق عندها. "
      "حين يوجد جدول: الدفعة الأولى هي أول سطر فيه، وتُعدّ الخطة «دفعة واحدة» إن كان سطراً واحداً و«دفعات» إن كان أكثر. "
      "وحين لا يوجد جدول (حساب خارج الصفحات) تبقى الدفعتان الافتراضيتان من إعدادات الموسم.",
      src=["lib/registration/types.ts:142", "lib/season-live.ts:56", "lib/season-live.ts:59", "lib/season-live.ts:60", "lib/installments.ts:25"],
      data=["reg_config_versions.config", "season_settings.installment_count"],
      cfg="يضبطه حامل صلاحية «إدارة التسجيل على الحج» من «الدفعات والمسارات» في المسودة، ولا يسري إلا بنشر إصدار جديد.",
      ex="الإصدار 1448-v1: «الدفعة الأولى» 3,500 $ عند التسجيل، و«الدفعة الثانية» باقي التكلفة في خطوة payment. الموسم 1447 كان دفعة واحدة «تكلفة الحج كاملة»."),

    R("PAY-03", "حساب مبلغ كل دفعة",
      "مبلغ الدفعة المحددة هو مبلغها، على ألا يتجاوز تكلفة الحج. ومبلغ دفعة «باقي التكلفة» هو تكلفة الحج ناقص مجموع الدفعات المحددة، ولا يقل عن صفر. "
      "لذلك إن تغيّرت تكلفة الحج تتغيّر الدفعة الأخيرة وحدها ويبقى المجموع مساوياً للتكلفة.",
      src=["lib/registration/engine.ts:251", "lib/registration/engine.ts:253"],
      data=["season_settings.hajj_cost", "reg_config_versions.config"],
      ex="تكلفة 4,750 $ ودفعة أولى 3,500 $: الدفعة الثانية 1,250 $ للفرد."),

    R("PAY-04", "شروط جدول الدفعات قبل النشر",
      "لا يُنشر إصدار وفي جدول دفعاته أي خطأ مما يلي: لا دفعات؛ أكثر من 4 دفعات؛ مفتاحان متكرران؛ للدفعة الأولى خطوة استحقاق (فهي تُدفع مع التسجيل المباشر أو عند تثبيت القبول بالقرعة)؛ "
      "الدفعة الأخيرة ليست «باقي التكلفة»؛ «باقي التكلفة» في غير الأخيرة؛ مبلغ صفر أو أقل؛ مجموع المبالغ المحددة يبلغ التكلفة أو يتجاوزها مع أكثر من دفعة؛ دفعة بلا اسم أو بلا نص موعد؛ "
      "دفعة لاحقة تستحق في خطوة غير موجودة أو معطّلة أو لا تأخذ دفعاً؛ دفعة تستحق في خطوة قبل خطوة الدفعة التي تسبقها؛ لا طريقة دفع مفعّلة؛ "
      "خطوة الهدي والسكن ليست خطوة دفع مفعّلة؛ مجموع الدفعات لا يساوي تكلفة الحج. وتنبيه غير مانع إن استحقت دفعة لاحقة قبل خطوة «الإلحاق بمجموعة».",
      src=["lib/registration/validate.ts:262", "lib/registration/validate.ts:263", "lib/registration/validate.ts:266", "lib/registration/validate.ts:267",
           "lib/registration/validate.ts:271", "lib/registration/validate.ts:277", "lib/registration/validate.ts:279", "lib/registration/validate.ts:280",
           "lib/registration/validate.ts:283", "lib/registration/validate.ts:285", "lib/registration/validate.ts:287", "lib/registration/service.ts:429"],
      data=["reg_config_versions.config", "reg_config_drafts.config"],
      cfg="شاشة «الدفعات والمسارات»: اختيار العدد من 1 إلى 4 يوزّع التكلفة بالتساوي مقرّبة إلى 50 $ والأخيرة الباقي، ثم يعدّلها الموظف."),

    R("PAY-05", "تغيّر تكلفة الحج بعد نشر الجدول",
      "تكلفة الحج تُغيَّر من «إعدادات الموسم» والجدول من إصدار التسجيل. إن خفّضت مديرة الموسم التكلفة تحت مجموع الدفعات المحددة في الإصدار المعمول به، "
      "يظهر لإدارة التسجيل تنبيه عالي الأهمية «الإصدار المعمول به لم يعد يوافق تكلفة الحج» حتى تعدّل الدفعات وتنشر إصداراً جديداً. "
      "الطلبات المقدَّمة تبقى على شروطها المجمّدة.",
      src=["app/staff/hajj/desk.tsx:38", "app/staff/hajj/desk.tsx:52"],
      data=["season_settings.hajj_cost", "reg_config_versions.config", "applications.policy_snapshot"],
      gap="الشاشتان منفصلتان ولا يمنع حفظُ التكلفة الجديدة التعارضَ؛ يجب أن تمنع المنصة الحقيقية حفظ تكلفة تُبطل الإصدار الساري أو تفرض نشر إصدار معها."),

    R("PAY-06", "طرق الدفع",
      "طريقتا الدفع في المنصة كلها: شام كاش، أو المصرف المعتمد مع رفع إشعار الدفع. لا دفع بالبطاقة المصرفية، والقيمة card تبقى لقراءة طلبات قديمة فقط. "
      "يعرض كل نموذج دفع للحاج الطرق المفعّلة في إصدار طلبه فقط، ويجب أن تبقى طريقة واحدة مفعّلة على الأقل.",
      src=["components/payment/methods.tsx:15", "app/portal/apply/_components/flow.tsx:443", "app/portal/application/_components/post/step-payment.tsx:38", "lib/registration/validate.ts:283"],
      data=["payments.method", "reg_config_versions.config"],
      cfg="حامل «إدارة التسجيل على الحج» من «الدفعات والمسارات» ← «الدفع» (شام كاش / المصرف المعتمد).",
      gap="نموذج دفع رسم تسجيل الإداري لا يقرأ الطرق المفعّلة ويعرض الطريقتين دائماً (app/portal/(admin)/role/apply.tsx:290)."),

    R("PAY-07", "الدفع عبر شام كاش",
      "يحوّل الدافع المبلغ إلى حساب المنصة SDHU-1448 بمسح رمز QR أو يدوياً، ويكتب في الملاحظة الرقم المرجعي (رقم الإيصال)، "
      "ثم يُدخل رقم العملية من التطبيق: أرقام فقط، من 6 إلى 12 رقماً. لا يُفعَّل زر التأكيد بأقل من 6 أرقام.",
      src=["components/payment/methods.tsx:17", "components/payment/methods.tsx:46", "components/payment/methods.tsx:63", "components/payment/methods.tsx:71"],
      data=["payments.provider_tx_no", "payments.status", "payments.confirmed_at"],
      gap="النسخة التجريبية لا تتحقق من رقم العملية لدى شام كاش ولا تحفظه، وتعدّ الدفع مؤكداً بعد مهلة محاكاة. المنصة الحقيقية تؤكد العملية من مزوّد الدفع وتحفظ رقمها، والدفعة pending حتى التأكيد."),

    R("PAY-08", "الدفع في المصرف المعتمد وإشعاره",
      "يراجع الدافع فرع المصرف المعتمد ويُبرز الرقم المرجعي المصرفي، ويدفع المبلغ، ثم يرفع صورة إشعار الدفع المختوم (صورة أو PDF). "
      "لا يُرسل الطلب للمطابقة قبل رفع الإشعار. يطابق موظف المالية الإشعار مع كشف المصرف. "
      "الرقم المرجعي المصرفي هو رقم الإيصال وفيه BANK مكان R أو P (مثل 1448-BANK-004512-2).",
      src=["components/payment/methods.tsx:79", "components/payment/methods.tsx:109", "app/portal/apply/_components/finalize.tsx:244", "app/portal/application/_components/post/step-payment.tsx:215"],
      data=["payments.bank_reference", "payments.bank_slip_file_id", "payments.confirmed_by_staff_id", "payments.status"],
      gap="لا شاشة لموظف المالية: النسخة التجريبية تعرض «يطابق موظف المالية الإشعار» ثم تؤكد الدفع بعد ثوانٍ، ولا تحفظ الإشعار، ولا مسار لرفضه. "
          "المنصة الحقيقية تحتاج قائمة إشعارات بانتظار المطابقة، وقرار مطابقة أو رفض بسبب، وإبقاء الدفعة pending حتى القرار وإشعار الدافع بالنتيجة."),

    R("PAY-09", "الدفعة سجلٌ مؤكد لا يُستعمل مرتين",
      "كل دفعة سجل في دفتر المدفوعات بمبلغ موجب أكبر من صفر. إن طُلب تسجيل دفعة لنفس الحساب ولنفس الغرض وبالمبلغ نفسه وما زالت سابقتها غير مستعملة، "
      "تعود الدفعة السابقة نفسها، فلا يتكرر الخصم بنقرتين أو بإعادة الطلب. وكل دفعة تُعلَّم بما استُعملت له (رقم الطلب أو بنود الدفع) ولا تُستعمل لغيره.",
      src=["lib/registration/service.ts:115", "lib/registration/service.ts:117", "lib/registration/service.ts:247"],
      data=["payments.amount", "payments.purpose", "payments.used_at"]),

    R("PAY-10", "رسم التسجيل",
      "رسم التسجيل يُدفع عن كل فرد في الطلب (صاحب الطلب والمرافقون) عند تقديم الطلب، في المسارين: القبول المباشر والتسجيل الأولي على القرعة. "
      "المبلغ = عدد الأفراد × رسم التسجيل للفرد.",
      src=["lib/registration/service.ts:70", "app/portal/apply/_components/flow.tsx:431"],
      data=["season_settings.fee_registration_per_person", "payment_items.line_key"],
      cfg="مديرة الموسم من «إعدادات الموسم».",
      ex="طلب عائلي من 4 أفراد: 4 × 25 = 100 $، إيصاله 1448-R-004512."),

    R("PAY-11", "المستحق عند تقديم الطلب حسب المسار",
      "في القبول المباشر يُدفع مع التقديم رسم التسجيل والدفعة الأولى معاً: الدفعة الأولى = عدد الأفراد × مبلغ أول سطر في الجدول (أو الدفعة الأولى في إعدادات الموسم إن لم يوجد جدول). "
      "وإن كان الجدول دفعة واحدة فهي التكلفة كاملة. في التسجيل الأولي على القرعة يُدفع رسم التسجيل وحده، والدفعة الأولى عند تثبيت القبول (PAY-18).",
      src=["lib/registration/service.ts:71", "lib/registration/service.ts:72", "app/portal/apply/_components/flow.tsx:435"],
      data=["payments.amount", "payment_items.line_key", "applications.track"],
      ex="مباشر بـ4 أفراد: 100 $ + 4 × 3,500 = 14,100 $. قرعة بـ4 أفراد: 100 $ فقط."),

    R("PAY-12", "لا طلب دون دفعة مطابقة",
      "يُرفض تقديم الطلب ما لم توجد دفعة مؤكدة: لنفس الحساب، وغرضها «التسجيل»، وغير مستعملة لطلب آخر، ومبلغها يساوي بالضبط المستحق الذي يحسبه الخادم (PAY-11). "
      "عند القبول تُعلَّم الدفعة مستعملة برقم الطلب، ويُحفظ مرجعها في الطلب.",
      src=["lib/registration/service.ts:208", "lib/registration/service.ts:209", "lib/registration/service.ts:210", "lib/registration/service.ts:243"],
      data=["payments.purpose", "payments.used_at", "payments.application_id", "applications.total_paid"]),

    R("PAY-13", "تجميد الشروط المالية مع الطلب",
      "عند التقديم يُحفظ مع الطلب: رسم التسجيل للفرد، وتكلفة الحج، والهدي، والدفعة الأولى، وعدد الدفعات، وجدول الدفعات، وخطوة الهدي والسكن، كما كانت سارية حينها. "
      "كل حساب لاحق (كشف التكاليف، الدفعة الأولى بالقرعة، دفعات ما بعد القبول) يقرأ هذه الشروط المجمّدة، ولا يقرأ إعدادات الموسم الحالية إلا لطلب قديم بلا شروط محفوظة.",
      src=["lib/registration/service.ts:51", "lib/registration/service.ts:240", "lib/registration/post.ts:74", "lib/registration/service.ts:342"],
      data=["applications.policy_snapshot", "applications.config_version_id"]),

    R("PAY-14", "ما يُسجَّل في الطلب من الدفع",
      "يُسجَّل في الطلب: المبلغ المدفوع كله (الرسم والدفعة الأولى إن وُجدت)، وطريقة الدفع، وخطة الدفع (عدد الدفعات) للمسار المباشر، "
      "والدفعة الأولى بمبلغها ووقتها وإيصالها. طلب القرعة يبقى بلا خطة ولا دفعة أولى حتى يثبّت قبوله، إلا إن جاء برصيد (PAY-16).",
      src=["lib/registration/service.ts:233", "lib/registration/service.ts:234", "lib/registration/service.ts:235", "lib/registration/service.ts:236"],
      data=["applications.total_paid", "applications.installment_plan", "payments.method"]),

    R("PAY-15", "ترقيم الإيصالات",
      "لكل بند إيصال مستقل يُتحقق منه برمز QR: رسم التسجيل 1448-R-{رقم الطلب بستة أرقام}؛ دفعات تكلفة الحج 1448-P-{رقم الطلب}-{ترتيب الدفعة} (الأولى -1)؛ "
      "الهدي 1448-P-{رقم الطلب}-H؛ السكن الخاص 1448-P-{رقم الطلب}-R؛ رسم الإداري 1448-A-{آخر 3 أرقام من رقمه الوطني بستة أرقام}؛ رسم المجموعة 1448-G-{رقم المجموعة بستة أرقام}.",
      src=["lib/registration/service.ts:232", "lib/installments.ts:46", "lib/registration/post.ts:92", "lib/registration/post.ts:94", "app/administrator/_lib/admin.ts:476"],
      data=["payment_items.receipt_no", "applications.registration_receipt_no"],
      gap="البادئة 1448 مكتوبة في الكود لا مأخوذة من سنة الموسم. وبيانات صفحة «التحقق من وثيقة» التجريبية ترقّم إيصال الهدي -2 والسكن -3 بخلاف الكود (-H و-R)، "
          "وتقرأ قائمة ثابتة (lib/data/clusters.ts:361) لا دفتر المدفوعات. ورقم الإداري من آخر 3 أرقام قد يتكرر بين إداريين؛ يجب رقم تسلسلي فريد."),

    R("PAY-16", "رصيد الدفعة الأولى عند الانتقال إلى القرعة",
      "من دفع الدفعة الأولى مع طلب القبول المباشر ولم يُقبل، يسجّل على القرعة بطلب جديد، ويدفع رسم التسجيل وحده. "
      "تنتقل دفعته الأولى إلى الطلب الجديد رصيداً (مع رقم الطلب الذي جاءت منه) ومعها خطة الدفع، فلا يدفعها مرة أخرى إن قُبل، ويُرفض أي طلب لدفعها ثانية.",
      src=["lib/registration/service.ts:147", "lib/registration/service.ts:218", "lib/registration/service.ts:234", "lib/registration/service.ts:235", "lib/registration/service.ts:339"],
      data=["applications.credit_from_application_id", "applications.previous_application_id", "applications.installment_plan"],
      gap="مبلغ الرصيد يُنقل كما هو ولا يُعاد حسابه إن اختلف عدد أفراد طلب القرعة عن الطلب المباشر؛ يجب أن تطابق المنصة الرصيد مع المستحق وتطالب بالفرق أو ترده."),

    R("PAY-17", "رد المبالغ",
      "تقول المنصة للحاج: الدفعة الأولى المحفوظة من طلب القبول المباشر تُعاد إليه إن لم يسجّل على القرعة أو لم تسحبه القرعة. "
      "ورسم التسجيل رسم إداري لدراسة الطلب.",
      src=["app/portal/application/_components/stages.tsx:246", "app/portal/application/_components/stages.tsx:274", "lib/data/faq.ts:73"],
      data=["refunds", "refunds.reason", "refunds.status"],
      gap="لا يوجد في النسخة التجريبية أي تنفيذ للرد: لا طلب رد ولا قرار ولا تسجيل. المنصة الحقيقية تحتاج دورة رد كاملة (requested ← approved ← paid أو rejected) "
          "للأسباب: لم يُقبل مباشرة ولم ينتقل، لم تسحبه القرعة، سقط قبوله، انسحب. وتحسم الإدارة كتابةً أن رسم التسجيل لا يُسترد (الأسئلة الشائعة لا تقولها صراحة، وجدول refunds يفترضها)."),

    R("PAY-18", "تثبيت المقبول بالقرعة بالدفعة الأولى",
      "المقبول بالقرعة يؤكد قبوله أولاً، ثم يدفع الدفعة الأولى (أو التكلفة كاملة إن كان الجدول دفعة واحدة). يُرفض الدفع إن لم يكن الطلب مقبولاً، أو أوقفته المراجعة، "
      "أو لم يؤكَّد القبول بعد، أو كانت الدفعة الأولى مدفوعة. المبلغ = عدد الأفراد × أول سطر في جدول الطلب المجمّد، يحسبه الخادم لا الصفحة. "
      "إيصاله 1448-P-{رقم الطلب}-1، وتُسجَّل خطة الدفع في الطلب ويُضاف المبلغ إلى مجموع المدفوع. موعده المعلن 11 – 27 تشرين الأول.",
      src=["lib/registration/service.ts:339", "lib/registration/service.ts:340", "lib/registration/service.ts:343", "lib/registration/service.ts:344", "lib/registration/service.ts:347", "lib/season.ts:32"],
      data=["payments.purpose", "applications.installment_plan", "applications.total_paid", "application_payment_lines.paid_at"],
      ex="4 أفراد قُبلوا بالقرعة: 4 × 3,500 = 14,000 $."),

    R("PAY-19", "المهلة وسقوط القبول",
      "المعلن للحاج: من لا يؤكد قبوله أو لا يدفع ما عليه في المهلة يسقط قبوله ويعود مقعده إلى الإدارة. مهلة التأكيد والدفعة الأولى للقرعة حتى 27 تشرين الأول 2026.",
      src=["app/portal/application/_components/post/step-confirm.tsx:42", "app/portal/application/_components/post/step-confirm.tsx:102", "lib/season.ts:32", "lib/lottery.ts:8"],
      data=["applications.status", "operation_windows"],
      gap="لا شيء في الكود يفرض المهلة: confirmTo معرّف ولا يُقرأ، وحقل deadline في الدفعة (lib/registration/types.ts:142) لا يُستعمل، ومواعيد الدفع تُفتح بالمحاكاة. "
          "المنصة الحقيقية تحتاج موعداً نهائياً لكل دفعة، ومهمة تُسقط القبول بعده وتحرر المقعد وتُشعر الحاج وتفتح الرد إن لزم، وإشعارات تذكير قبل الموعد."),

    R("PAY-20", "كشف التكاليف بعد القبول",
      "كشف تكاليف الطلب بالترتيب: دفعات تكلفة الحج حسب جدول الطلب، كل منها = عدد الأفراد × مبلغ الفرد؛ ثم الهدي؛ ثم السكن الخاص إن اختير. "
      "الدفعة الأولى بلا خطوة استحقاق (مدفوعة عند التسجيل أو عند القبول بالقرعة)، وكل دفعة لاحقة تستحق في خطوتها (payment إن لم تُحدَّد)، "
      "والهدي والسكن في خطوة الهدي والسكن (payment افتراضياً)، ونص موعدهما نص موعد آخر دفعة.",
      src=["lib/registration/post.ts:73", "lib/registration/post.ts:89", "lib/registration/post.ts:91", "lib/registration/post.ts:92"],
      data=["application_payment_lines", "application_payment_lines.due_step", "application_payment_lines.due_label"]),

    R("PAY-21", "الدفعة الثانية بعد الإلحاق بمجموعة",
      "لا يُقبل دفع بند بعد القبول إلا إن: كان البند في كشف التكاليف؛ ولم يكن الدفعة الأولى؛ ولم يُدفع قبل ذلك؛ وكانت خطوة استحقاقه قد فُتحت (كل الخطوات قبلها مكتملة)؛ "
      "وكان مستحقاً في تلك الخطوة أو قبلها. في الإعداد الافتراضي تأتي خطوة «الدفعة الثانية» بعد «الإلحاق بمجموعة»، فلا تُدفع الثانية قبل اعتماد العقد مع المجموعة.",
      src=["lib/registration/service.ts:320", "lib/registration/service.ts:322", "lib/registration/service.ts:324", "lib/registration/service.ts:325", "lib/registration/validate.ts:34"],
      data=["application_payment_lines.paid_at", "payments.purpose"]),

    R("PAY-22", "ما تأخذه خطوة الدفع ومتى تكتمل",
      "خطوة الدفع تعرض كل بند يستحق فيها أو في خطوة قبلها، وبند بلا خطوة معروفة يُعرض في كل خطوة دفع. تكتمل الخطوة حين تُدفع كل هذه البنود. "
      "ويجوز للإدارة إضافة خطوات دفع (installment) لدفعة ثالثة أو رابعة، وتكتمل كل منها بالقاعدة نفسها.",
      src=["lib/registration/post.ts:109", "lib/registration/post.ts:137", "lib/registration/post.ts:139", "lib/registration/validate.ts:256"],
      data=["application_payment_lines.due_step", "application_payment_lines.paid_at"],
      cfg="حامل «إدارة التسجيل على الحج» يضيف خطوة دفع من محرر الخطوات بعد القبول ويربط بها دفعة من «الدفعات والمسارات»."),

    R("PAY-23", "دفع بند أو المتبقي كله",
      "يدفع الحاج بنداً واحداً بزر «ادفع» أمامه، أو كل المتبقي معاً بزر «ادفع المتبقي» إن بقي أكثر من بند. "
      "الدفعة الواحدة تُسجَّل في دفتر المدفوعات بغرض post ومبلغها مجموع البنود، ولكل بند فيها إيصاله المستقل ووقت دفعه.",
      src=["app/portal/application/_components/post/step-payment.tsx:114", "lib/registration/service.ts:328", "lib/registration/service.ts:330"],
      data=["payments", "payment_items", "payment_items.receipt_no", "application_payment_lines.payment_item_id"]),

    R("PAY-24", "الهدي",
      "الهدي بند إلزامي في كشف كل طلب: عدد الأفراد × قيمة الهدي للفرد، ويُدفع في خطوة الهدي والسكن (خطوة «الدفعة الثانية» في الإعداد الافتراضي). إيصاله 1448-P-{رقم الطلب}-H.",
      src=["lib/registration/post.ts:92", "lib/season.ts:60"],
      data=["season_settings.hady", "application_payment_lines.line_key"],
      cfg="القيمة من «إعدادات الموسم»، والخطوة من «الدفعات والمسارات».",
      ex="4 أفراد: 4 × 180 = 720 $."),

    R("PAY-25", "السكن الخاص وكلفته",
      "يختار الطلب نوع سكنه في خطوة الهدي والسكن قبل الدفع: السكن العام (الرجال وحدهم والنساء وحدهن) دون كلفة، أو غرف خاصة للطلب وحده. "
      "في الغرف الخاصة يجب أن يساوي عدد الأسرّة عدد الأفراد تماماً، ولا يُحفظ توزيع لا يحقق ذلك. أنواع الغرف: مفردة، بسريرين، بثلاثة، بأربعة أسرّة، "
      "ولكل نوع سعر للفرد يحدده التكتل. الكلفة = مجموع (أسرّة كل نوع × سعر الفرد فيه). احتياجات السكن الصحية (كرسي متحرك، صعوبة المشي، قرب المصعد، أكسجين ليلي) تُراعى دون كلفة. "
      "يثبت الاختيار ولا يتغير بعد دفع بند السكن، أو بعد دفع الهدي إن كان السكن عاماً. إيصاله 1448-P-{رقم الطلب}-R.",
      src=["lib/rooms.ts:81", "app/portal/application/_components/post/step-group.tsx:195", "app/portal/application/_components/post/step-group.tsx:222",
           "app/portal/application/_components/post/model.ts:111", "lib/registration/post.ts:94"],
      data=["application_accommodation", "application_accommodation.settled_at", "application_accommodation_rooms.price_per_person", "cluster_profile_versions.fields"],
      cfg="أسعار الغرف يكتبها رئيس التكتل في صفحة تكتله وتعتمدها الإدارة قبل أن تصل الحجاج.",
      ex="4 أفراد في غرفة بأربعة أسرّة بسعر 50 $: 4 × 50 = 200 $.",
      gap="خدمة payPostLines تأخذ كلفة السكن ممّا تمرره الصفحة (lib/registration/service.ts:314)، لا مما حُفظ؛ يجب أن يحسبها الخادم من اختيار الطلب المحفوظ وأسعار تكتله المعتمدة. "
          "ولا معالجة لكلفة سكن مدفوعة إن انتقلت العائلة بعدها إلى تكتل آخر بأسعار مختلفة."),

    R("PAY-26", "موعد فتح كل دفعة",
      "في الموسم الفعلي تفتح الإدارة موعد كل دفعة في تاريخها ويصل الحاجَ إشعار، ولا يدفع قبله. يظهر للحاج قبل الموعد «لم يحن موعد … بعد» مع نص الموعد.",
      src=["app/portal/application/_components/post/pay-window.tsx:12", "app/portal/application/_components/post/step-payment.tsx:64", "app/portal/application/_components/post/step-confirm.tsx:226"],
      data=["application_payment_lines.due_label", "operation_windows"],
      gap="النسخة التجريبية تفتح الموعد بزر محاكاة، والخادم لا يتحقق من أي تاريخ. المنصة الحقيقية تربط كل دفعة بنافذة زمنية يفرضها الخادم وترسل الإشعار عند فتحها."),

    R("PAY-27", "لا دفع لطلب غير مقبول أو موقوف",
      "كل دفع بعد القبول (الدفعة الأولى بالقرعة وبنود ما بعد القبول) يُرفض إن لم يكن الطلب مقبولاً بحسب عمر القبول المباشر المعلن أو نتيجة القرعة المنشورة، "
      "أو كان قرار المراجعة عليه «مرفوض».",
      src=["lib/registration/service.ts:272", "lib/registration/service.ts:273", "lib/registration/service.ts:274"],
      data=["application_reviews.decision", "applications.status"]),

    R("PAY-28", "الإيصالات الرسمية والدفع لجهة معتمدة",
      "لا يدفع الحاج أي مبلغ لجهة غير معتمدة، والإيصالات الرسمية تصدر من المنصة وحدها. حين يسجّل منسق أو موظف مكتب مواطناً، يدفع المواطن بنفسه عبر شام كاش أو المصرف، "
      "ولا يقبض المكتب ولا المنسق نقداً، ويصدر الإيصال باسم المواطن.",
      src=["app/portal/application/_components/post/step-confirm.tsx:60", "app/portal/(admin)/pilgrims/pilgrims.tsx:613"],
      data=["payments.payer_account_id", "payments.collected_by_staff_id"]),

    R("PAY-29", "رسم تسجيل الإداري",
      "الإداري يدفع رسم التسجيل الموسمي (30 $) بعد أن تتحقق المنصة من أهليته لصفته، وبه يُقدَّم طلبه للموسم. "
      "لا يدخل الاختبار ما لم تثبت أهليته ويُدفع الرسم. إيصاله 1448-A-….",
      src=["app/portal/(admin)/role/apply.tsx:108", "app/portal/(admin)/role/apply.tsx:171", "app/portal/(admin)/exam/exam.tsx:100", "app/administrator/_lib/admin.ts:476"],
      data=["season_settings.fee_admin_registration", "admin_season_files.fee_paid_at", "admin_season_files.receipt_no", "admin_season_files.fee_payment_id"],
      cfg="مديرة الموسم من «إعدادات الموسم» ← «رسوم الإداريين».",
      gap="الدفع لا يمر بدفتر المدفوعات ولا بخدمة على الخادم: الصفحة تكتب feePaidAt مباشرة. يجب تسجيله دفعة admin-registration مؤكدة كبقية المدفوعات."),

    R("PAY-30", "رسم تشكيل المجموعة",
      "يُدفع رسم تشكيل المجموعة (200 $) في المكتب حين يشكّل موظف إدارة الإداريين المجموعة بحضور رئيسها، ولا تُنشأ المجموعة دون تأكيد الموظف أن الرسم سُدّد "
      "(مع اكتمال المقاعد ورفع العقد الموقّع). إيصاله 1448-G-{رقم المجموعة}. ولا يُعاد الرسم المسدَّد لطلب مجموعة أُعيد إلى رئيسه.",
      src=["app/staff/admins/_components/groups.tsx:258", "app/staff/admins/_components/groups.tsx:399", "app/staff/admins/_components/groups.tsx:576"],
      data=["season_settings.fee_group_formation", "admin_groups.fee_paid_at", "admin_groups.fee_receipt_no", "admin_groups.fee_payment_id"],
      cfg="مديرة الموسم من «إعدادات الموسم» ← «رسوم الإداريين».",
      gap="التأكيد خانة يضعها الموظف ولا يُنشئ سجل دفعة؛ يجب تسجيل دفعة group-formation بطريقة office واسم الموظف المستلم."),

    R("PAY-31", "رسم تشكيل التكتل",
      "يدفع رئيس التكتل رسم التكتل (500 $) في المكتب، ولا يُنشأ التكتل إلا إن اكتمل طلبه وأكّد الموظف دفع الرسم وتوقيع الجميع ورُفع العقد.",
      src=["app/staff/admins/_components/clusters.tsx:585", "app/staff/admins/_components/clusters.tsx:616"],
      data=["season_settings.fee_cluster_formation", "clusters.fee_paid_at", "clusters.fee_payment_id"],
      cfg="مديرة الموسم من «إعدادات الموسم» ← «رسوم الإداريين».",
      gap="لا إيصال لرسم التكتل ولا سجل دفعة؛ خانة تأكيد فقط. يجب سجل cluster-formation بطريقة office وإيصال مرقّم."),
])
