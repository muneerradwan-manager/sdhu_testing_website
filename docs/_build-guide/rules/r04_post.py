# -*- coding: utf-8 -*-
from .dsl import *

DOMAIN = D("post", "POST", "ما بعد القبول", [
    "يغطي هذا الفصل رحلة الحاج من لحظة قبول طلبه حتى عودته: تأكيد القبول، والصورة الشخصية، والإلحاق بمجموعة بعقد، والدفعة الثانية، "
    "وجواز السفر، والملف الطبي واللقاحات، والتأشيرة، والرحلة كما يراها الحاج، وتقييم الخطوات، والتقييم الشامل وشهادة الحج.",
    "الخطوات وترتيبها وعناوينها من إصدار إعدادات التسجيل الذي بدأ عليه الطلب، والإعداد الافتراضي سبع خطوات. منطق كل خطوة أساسية في الخدمات "
    "(lib/registration/post.ts وservice.ts وlib/assignment.ts وlib/visas.ts)، واكتمالها يُقرأ مما سجّلته الخدمات لا من الصفحة. "
    "المبالغ وقواعد الدفع في فصل «الرسوم والدفعات» (PAY).",
    "ثوابت الكود: مواصفات الوثائق، وقائمة الوثائق الطبية، ومهلة صلاحية الجواز. القابل للضبط: الخطوات وترتيبها ونصوصها (إدارة التسجيل على الحج)، "
    "ومواعيد العمليات مثل الإلحاق بالمجموعات (إعدادات الموسم).",
], [
    R("POST-01", "من يدخل مرحلة ما بعد القبول",
      "لا تُفتح خطوات ما بعد القبول ولا تُقبل أي عملية فيها إلا لطلب مقبول: في القبول المباشر بعمر صاحب الطلب مقابل العمر المعلن، وفي القرعة بسنة ميلاده وشهره في النتيجة المنشورة. "
      "وتُرفض كل عملية إن كان قرار المراجعة على الطلب «مرفوض» («الطلب موقوف بقرار المراجعة»).",
      src=["lib/registration/service.ts:272", "lib/registration/service.ts:273", "lib/registration/service.ts:274"],
      data=["applications.status", "applications.acceptance_basis", "application_reviews.decision"]),

    R("POST-02", "الخطوات من إصدار الطلب",
      "الخطوات بعد القبول وترتيبها ونصوصها وأسئلة تقييمها من إصدار إعدادات التسجيل الذي بدأ عليه الطلب، لا من الإصدار الساري اليوم، وتظهر المفعّلة منها فقط. "
      "الإعداد الافتراضي سبع خطوات: تأكيد القبول، الصورة الشخصية، الإلحاق بمجموعة، الدفعة الثانية، جواز السفر، الملف الطبي، التأشيرة والرحلة.",
      src=["lib/registration/defaults.ts:63", "lib/registration/service.ts:280", "lib/registration/service.ts:281"],
      data=["applications.config_version_id", "reg_config_versions.config"],
      cfg="صاحب الصلاحية في «إدارة التسجيل على الحج» يعدّل الخطوات في المسودة وينشرها إصداراً؛ الطلبات المقدَّمة تبقى على إصدارها."),

    R("POST-03", "قيود ترتيب الخطوات الأساسية",
      "لا يُنشر إصدار يحذف خطوة أساسية من السبع أو يعطّلها أو يكررها، أو فيه معرّفان متكرران. وترتيبها ملزم: الصورة بعد التأكيد، والإلحاق بعد الصورة، "
      "والدفعة الثانية بعد الإلحاق، والجواز بعد الدفعة الثانية، والملف الطبي بعد الإلحاق، والتأشيرة بعد الجواز والملف الطبي. "
      "وأول خطوة مفعّلة تأكيد القبول، وآخرها التأشيرة والرحلة.",
      src=["lib/registration/validate.ts:31", "lib/registration/validate.ts:236", "lib/registration/validate.ts:238", "lib/registration/validate.ts:243",
           "lib/registration/validate.ts:245", "lib/registration/validate.ts:247"],
      data=["reg_config_versions.config"]),

    R("POST-04", "كل خطوة تُفتح بعد اكتمال ما قبلها",
      "الخطوة التي يعمل عليها الحاج هي أول خطوة غير مكتملة، وكل ما بعدها مقفل. لا تُسجَّل عملية في خطوة (دفع، إقرار، أسئلة) ما لم تكن كل الخطوات قبلها مكتملة، "
      "ويُرد «أكمل الخطوات التي قبلها أولاً». ويستطيع الحاج فتح الخطوات المكتملة لمراجعتها.",
      src=["lib/registration/post.ts:146", "lib/registration/post.ts:153", "lib/registration/service.ts:296", "app/portal/application/_components/post/checklist.tsx:64"],
      data=["post_acceptance"]),

    R("POST-05", "متى تُعدّ الخطوة مكتملة",
      "تأكيد القبول: سُجّل التأكيد ودُفعت الدفعة الأولى. الصورة: سُجّل التأكيد واعتُمدت صورة كل فرد. الإلحاق: اعتُمد الإلحاق ووُقّع العقد. "
      "الدفع: دُفع كل بند مستحق حتى الخطوة. الجواز: اعتُمد جواز كل فرد. الملف الطبي: كما في POST-23. التأشيرة: اكتملت تأشيرات كل الأفراد. "
      "الخطوة التي أضافتها الإدارة (إقرار أو أسئلة): سجّلت الخدمة إكمالها.",
      src=["lib/registration/post.ts:126", "lib/registration/post.ts:127", "lib/registration/post.ts:128", "lib/registration/post.ts:129",
           "lib/registration/post.ts:130", "lib/registration/post.ts:131", "lib/registration/post.ts:132", "lib/registration/post.ts:140"],
      data=["post_acceptance.confirmed_at", "post_acceptance.group_approved_at", "post_acceptance.contract_signed_at", "post_acceptance.visa_completed_at",
            "member_documents.status", "post_custom_step_completions"]),

    R("POST-06", "خطوات تضيفها الإدارة",
      "يجوز للإدارة إضافة خطوات بين الخطوات الأساسية: «إقرار» يقرأ فيه الحاج نصاً ويوافق عليه (لا يُنشر إقرار بلا نص)، و«أسئلة» بحقول تُتحقق إجاباتها كأسئلة الطلب "
      "(لا تُنشر خطوة أسئلة بلا أسئلة)، و«دفع» تستحق فيها دفعة. لا يُسجَّل إكمال إقرار إلا بموافقة صريحة، ولا إكمال أسئلة فيها خطأ، ويُحفظ وقت الإكمال والإجابات.",
      src=["lib/registration/service.ts:295", "lib/registration/service.ts:297", "lib/registration/service.ts:301", "lib/registration/service.ts:304",
           "lib/registration/validate.ts:251", "lib/registration/validate.ts:252"],
      data=["post_custom_step_completions", "post_custom_step_completions.answers"],
      cfg="صاحب الصلاحية في «إدارة التسجيل على الحج» من محرر الخطوات بعد القبول."),

    R("POST-07", "لا وثائق عند التسجيل",
      "لا يُطلب عند التسجيل أي وثيقة: لا صورة ولا جواز ولا وثيقة طبية. عند تأكيد القبول تُنشأ لكل فرد حالة الصورة والجواز «لم تُرفع».",
      src=["lib/registration/defaults.ts:41", "app/portal/application/_components/post/model.ts:101", "app/portal/application/_components/post/step-confirm.tsx:87"],
      data=["member_documents.status"]),

    R("POST-08", "تأكيد القبول والتوقيع على التعليمات",
      "يقرأ الحاج «التعليمات والشروط الرسمية» حتى نهايتها (98% من التمرير على الأقل)، ثم يضع علامة «قرأت التعليمات وأوافق عليها، وأؤكد قبول الحج لجميع أفراد الطلب» بأسماء الأفراد، "
      "ثم يوقّع إلكترونياً. لا يُفعَّل الزر قبل القراءة والموافقة. التأكيد واحد للطلب كله ويُسجَّل وقته. "
      "سطر التكلفة في التعليمات يُكتب من جدول دفعات الطلب نفسه (دفعة واحدة أو دفعتان أو أكثر).",
      src=["app/portal/application/_components/post/step-confirm.tsx:79", "app/portal/application/_components/post/step-confirm.tsx:171",
           "app/portal/application/_components/post/step-confirm.tsx:87", "app/portal/application/_components/post/step-confirm.tsx:128"],
      data=["post_acceptance.confirmed_at"],
      gap="التأكيد يُكتب من الصفحة مباشرة لا عبر خدمة على الخادم، فلا يُتحقق من أن الطلب مقبول ولا من المهلة (27 تشرين الأول)؛ ولا يُحفظ نص التعليمات الذي وُقّع عليه. "
          "المنصة الحقيقية تسجّله بخدمة تتحقق من القبول والمهلة وتحفظ نسخة النص الموقَّع."),

    R("POST-09", "المقبول بالقرعة: التأكيد ثم الدفعة الأولى",
      "المقبول بالقرعة بلا رصيد سابق يبقى في خطوة التأكيد بعد أن يؤكد، حتى يدفع الدفعة الأولى (PAY-18)؛ فخطوة التأكيد لا تكتمل إلا بالأمرين. "
      "المقبول مباشرة دفعها مع التسجيل، فتكتمل خطوته بالتأكيد وحده.",
      src=["app/portal/application/_components/post/step-confirm.tsx:82", "lib/registration/post.ts:126", "lib/registration/service.ts:340"],
      data=["post_acceptance.confirmed_at", "applications.total_paid"]),

    R("POST-10", "الصورة الشخصية",
      "بعد التأكيد والدفعة الأولى تُطلب الصورة الشخصية وحدها لكل فرد: خلفية بيضاء، حديثة، دون نظارات. تمر كل صورة بحالات: لم تُرفع ← مرفوعة ← معتمدة أو مُعادة؛ "
      "المُعادة تُرفع من جديد. يراجعها موظف إدارة التسجيل. تكتمل الخطوة حين تُعتمد صورة كل فرد.",
      src=["lib/registration/post.ts:22", "lib/registration/post.ts:28", "lib/registration/post.ts:127", "app/portal/application/_components/post/step-documents.tsx:39"],
      data=["member_documents", "member_documents.doc_key", "member_documents.status", "member_documents.reject_reason"],
      gap="لا شاشة لمراجعة الصورة والجواز عند الموظفين: المراجعة محاكاة بمؤقت في متصفح الحاج تعتمد كل وثيقة بعد ثوانٍ (step-documents.tsx:67)، ولا يُحفظ الملف. "
          "وقائمة «المراجعات» تعرض لكل طلب «جواز السفر: سليم» ثابتاً (app/staff/_components/data.ts:96) مع أن الجواز لا يُطلب عند التسجيل. "
          "المنصة الحقيقية تحتاج قائمة مراجعة للموظف باعتماد أو إعادة بسبب، وحفظ الملف."),

    R("POST-11", "دليل التكتلات والمجموعات",
      "يطّلع الحاج على التكتلات المعتمدة وفرقها ومجموعاتها برؤسائها في صفحة «التكتلات والمجموعات» العامة، ليتفق مع مجموعة تناسبه. "
      "المجموعة تُعرف باسمها لا برقمها، والرقم مفتاح داخلي لا يُعرض. وصفحة المجموعة يكتبها رئيسها بعد اعتمادها، ولا يصل منها شيء للحجاج قبل أن تعتمده الإدارة.",
      src=["app/portal/application/_components/post/step-group.tsx:98", "lib/groups.ts:4", "lib/group-profile.ts:7"],
      data=["admin_groups.name", "group_profile_versions.status", "cluster_profile_versions.status"]),

    R("POST-12", "الإلحاق بمجموعة بعقد في المكتب",
      "لا يختار الحاج مجموعته على المنصة. يتفق مع مجموعة (رئيسها أو منسقها)، ويوقّع عقده معها في المكتب، فيُلحق موظف المكتب الطلب بها ويرفع العقد الموقّع. "
      "يُسجَّل العقد معتمداً باسم الموظف ووقته. رئيس المجموعة ومنسقها يرون حجاجهم بعد الإلحاق ولا يُلحقون أحداً.",
      src=["lib/assignment.ts:171", "lib/assignment.ts:174", "lib/assignment.ts:175", "app/staff/reviews/contracts.tsx:220"],
      data=["group_enrollment_contracts", "group_enrollment_contracts.status", "group_enrollment_contracts.file_id", "post_acceptance.enrolled_by_staff_id"],
      cfg="يُلحق الموظف الحامل لصلاحية «مراجعة الطلبات والوثائق» (reviews.*) من «المراجعات» ← العقود في بوابة الموظفين.",
      gap="README (السطر 40) يصف أن الحاج «يختار المجموعة 27 من الدليل فيسجّله منسقها ويوقّعان العقد»؛ الكود يُلحقه موظف المكتب، والمجموعة لا تُعرف برقمها. الكود هو المعتمد."),

    R("POST-13", "نافذة الإلحاق بالمجموعات",
      "الإلحاق عملية مستقلة عن التسجيل على الحج، ولها نافذة: 12 تشرين الثاني 2026 – 15 كانون الثاني 2027 (موعد تقديري)، تبدأ مع تشكيل التكتلات وتستمر بعده. "
      "خارجها لا يظهر للموظف إلحاق ولا نقل، ويرى الحاج «يبدأ الإلحاق بالمجموعات …» أو «انتهت مدة الإلحاق».",
      src=["lib/operations.ts:66", "app/staff/reviews/contracts.tsx:109", "app/portal/application/_components/post/step-group.tsx:96"],
      data=["operation_windows", "operations"],
      cfg="مدير الموسم (season.values.PUT) يضبط مواعيد العملية من «إعدادات الموسم» ← المواعيد."),

    R("POST-14", "الطلب كله في المجموعة نفسها وضمن سعتها",
      "يُلحق الطلب بكل أفراده معاً بالمجموعة نفسها، أو لا يُلحق. لا يُلحق إلا طلب مقبول. ويُرفض الإلحاق إن تجاوز عدد حجاج المجموعة بعده سعتها "
      "(المحجوز + أفراد الطلب > السعة)، أو كان الطلب فيها أصلاً.",
      src=["app/staff/reviews/contracts.tsx:212", "app/staff/reviews/contracts.tsx:218", "app/staff/reviews/contracts.tsx:219"],
      data=["admin_groups.capacity", "post_acceptance.group_id"],
      gap="الفحص في شاشة الموظف فقط، وattachByStaff لا يعيد الفحص. ولا يُتحقق من أن الحاج أكّد قبوله ودفع الأولى ورفع الصور قبل إلحاقه؛ يجب أن يفرض الخادم السعة وترتيب الخطوات."),

    R("POST-15", "من سجّل الحاج لا يضعه في مجموعة",
      "إن قدّم الطلبَ منسقٌ أو موظفٌ نيابة عن الحاج، فهذا تسجيل على الحج فقط ولا يضع الحاج في مجموعة المسجِّل ولا في أي مجموعة. الإلحاق بعقد مستقل، ويُذكَّر الحاج بذلك.",
      src=["lib/store.ts:89", "app/portal/application/_components/post/step-group.tsx:61"],
      data=["applications.submitted_by_account_id", "applications.submitted_by_staff_id"]),

    R("POST-16", "عقد ترفعه المجموعة ويعتمده المكتب",
      "ما زال المسار السابق قائماً: ترفع المجموعة العقد الموقّع مع الحاج فيبقى «بانتظار اعتماد المكتب». يعتمده موظف المكتب فيُلحق الطلب، أو يعيده إلى رافعه بسبب مكتوب يراه الحاج.",
      src=["lib/assignment.ts:142", "lib/assignment.ts:157", "lib/assignment.ts:159", "lib/assignment.ts:164"],
      data=["group_enrollment_contracts.status", "group_enrollment_contracts.return_reason", "group_enrollment_contracts.decided_by_staff_id"]),

    R("POST-17", "ما يترتب على الإلحاق",
      "عند الإلحاق يُسجَّل في الطلب التكتل والمجموعة ومن ألحقه، ووقت الإلحاق ووقت العقد معاً، فتكتمل خطوة الإلحاق وتُفتح صفحة «مجموعتي» بفريقها وعقدها. "
      "وإن كانت المجموعة قد وُضعت على رحلاتها، تأخذ العائلة مقاعد عليها تلقائياً (POST-27).",
      src=["lib/assignment.ts:107", "lib/assignment.ts:111", "lib/assignment.ts:132", "app/portal/application/_components/application-view.tsx:221"],
      data=["post_acceptance.cluster_id", "post_acceptance.group_id", "post_acceptance.group_approved_at", "post_acceptance.contract_signed_at"]),

    R("POST-18", "الانتقال إلى مجموعة أخرى",
      "تنتقل العائلة بعقد جديد مع المجموعة الجديدة يُلحقها به موظف المكتب، وينتقل الطلب كله أو لا ينتقل. يُسجَّل الانتقال (من، إلى، متى)، "
      "ويُمسح الملف الصحي ليسجّله منسق المجموعة الجديدة، وتُلغى مقاعدها على رحلات المجموعة القديمة (المحجوزة أو المقفلة) وتنتقل إلى رحلات الجديدة إن كانت مفتوحة.",
      src=["lib/assignment.ts:105", "lib/assignment.ts:113", "lib/assignment.ts:115", "lib/flights.ts:1211"],
      data=["application_group_transfers", "group_enrollment_contracts.transfer_from_group_id", "flight_assignments.status"]),

    R("POST-19", "جواز السفر",
      "يُطلب جواز السفر لكل فرد بعد اكتمال الدفعة الثانية حصراً: صفحة البيانات كاملة وواضحة، والجواز سارٍ 6 أشهر على الأقل بعد موعد العودة (23 ذو الحجة 1448). "
      "الجواز الذي تقل صلاحيته يُعاد ليُجدَّد ويُرفع الجديد. تكتمل الخطوة حين يُعتمد جواز كل فرد.",
      src=["lib/registration/validate.ts:35", "lib/registration/post.ts:23", "lib/registration/post.ts:130", "app/portal/application/_components/post/step-confirm.tsx:49"],
      data=["member_documents.passport_no", "member_documents.passport_expiry", "member_documents.status", "member_documents.reject_reason"],
      gap="لا يُقرأ تاريخ انتهاء الجواز ولا يُقارن بموعد العودة: النسخة التجريبية تعيد جواز أكبر الأفراد سناً مرة واحدة بالمحاكاة (step-documents.tsx:80). "
          "المنصة الحقيقية تحفظ رقم الجواز وتاريخ انتهائه وترفض آلياً ما يقل عن 6 أشهر بعد العودة."),

    R("POST-20", "متى تُطلب الوثائق الطبية",
      "لا تُطلب أي وثيقة طبية، ولا اللقاحات، قبل الإلحاق بمجموعة. شرط الإصدار أن تأتي خطوة الملف الطبي بعد الإلحاق، وفي الإعداد الافتراضي تأتي بعد الجواز (أي بعد الدفعة الثانية).",
      src=["lib/registration/validate.ts:36", "lib/registration/defaults.ts:69", "lib/season.ts:126"],
      data=["medical_document_types"],
      gap="تعليقات الكود (lib/store.ts «asked only after the full amount is paid» وstep-medical.tsx) ونص التعليمات تقول إنها بعد الدفع، "
          "لكن قيد النشر يشترط الإلحاق وحده؛ فإصدار يضع الملف الطبي قبل الدفعة الثانية يُقبل. تحسم الإدارة القاعدة ويُفرض قيدها."),

    R("POST-21", "قائمة الوثائق الطبية لكل فرد",
      "يرفع الحاج لكل فرد: شهادة لقاح كورونا بالجرعات المعتمدة، وشهادة لقاح الحمى الشوكية السارية خلال 3 سنوات، والتقرير الطبي العام من طبيب معتمد. "
      "وشهادة لقاح الإنفلونزا الموسمية لمن بلغ 60 عاماً فقط، والوصفة الطبية للأدوية الدائمة (تكفي 35 يوماً) فقط لمن سجّل له المنسق دواءً دائماً.",
      src=["lib/season.ts:129", "lib/season.ts:132", "lib/season.ts:134", "lib/registration/post.ts:45"],
      data=["medical_document_types", "medical_document_types.min_age", "medical_document_types.only_if_medications"],
      gap="القائمة ثابتة في الكود مع أن النص يقول «تحددها الإدارة»؛ لا شاشة لتعديلها. يجب أن تكون قائمة موسمية تضبطها الإدارة."),

    R("POST-22", "المعلومات الصحية يسجّلها المنسق",
      "منسق التكتل المفروز لمجموعة الحاج يتصل به ويسجّل لكل فرد الأمراض المزمنة والاحتياجات الخاصة والأدوية الدائمة. "
      "تنتقل الأمراض والاحتياجات إلى أفراد الطلب، فتراعيها الغرف والوجبات والكشوف. ثم يؤكد الحاج صحة المعلومات أو يطلب تصحيحها من المنسق.",
      src=["app/portal/application/_components/post/model.ts:132", "app/portal/application/_components/post/model.ts:134",
           "app/portal/application/_components/post/step-medical.tsx:128", "app/portal/application/_components/post/step-medical.tsx:138"],
      data=["health_files", "health_records", "health_files.confirmed_at", "health_files.correction_requested_at", "application_members.needs"],
      gap="طلب التصحيح يُكتب في السجل فقط ولا يصل المنسق مهمةً ولا يعيد الملف إلى حالة «بانتظار التعديل»."),

    R("POST-23", "مراجعة الفريق الطبي واكتمال الملف",
      "يعتمد الفريق الطبي كل وثيقة طبية مرفوعة أو يعيدها بسبب يراه الحاج، فيرفعها من جديد. تكتمل خطوة الملف الطبي حين: أكّد الحاج المعلومات الصحية، "
      "ولكل فرد سجل صحي، واعتُمدت كل وثيقة مطلوبة لكل فرد.",
      src=["app/staff/medical/view.tsx:126", "lib/registration/post.ts:53", "lib/registration/post.ts:54", "app/portal/application/_components/post/step-medical.tsx:51"],
      data=["member_medical_documents.status", "member_medical_documents.reject_note", "member_medical_documents.reviewed_by_staff_id"],
      cfg="المراجعة لحامل صلاحيات «الفريق الطبي» (medical) من «الفريق الطبي» في بوابة الموظفين.",
      gap="في بوابة الحاج تعتمد محاكاةٌ كل وثيقة مرفوعة بعد 3.5 ثانية (step-medical.tsx:36)، ولا يُحفظ الملف."),

    R("POST-24", "الوثائق الصحية من وزارة الصحة",
      "تضيف الإدارة للحاج من منصة الإداريين (رئيس مجموعته، أو المنسق المفروز لمجموعته؛ ورئيس التكتل يطّلع ولا يضيف) وثائقه الصحية: الشهادة الصحية من وزارة الصحة "
      "(سليم ولقاحاته مكتملة، أو حالة صحية مسمّاة)، والوصفات وتقارير الحالة. للحاج شهادة صحية واحدة: الجديدة تحل محل القديمة. "
      "تُحذف الوثيقة الخاطئة، وكل إضافة وحذف في سجل الطلب، وتظهر في «خزنة الوثائق». لا تؤثر في اكتمال أي خطوة.",
      src=["lib/health-docs.ts:17", "lib/health-docs.ts:24", "lib/health-docs.ts:32", "app/administrator/_lib/scope.ts:34"],
      data=["member_health_docs", "member_health_docs.kind", "member_health_docs.fit", "member_health_docs.removed_at"]),

    R("POST-25", "التأشيرة",
      "تصدر وزارة الخارجية السعودية تأشيرة كل فرد وتصل بالبريد إلى مجموعته. يضيفها المنسق التقني المفروز للمجموعة من منصة الإداريين: ملفها (صورة أو PDF) ورقمها. "
      "رئيس المجموعة ومعاونه ورئيس التكتل يرونها ولا يضيفونها. تكتمل خطوة التأشيرة حين يكون لكل فرد تأشيرته، ويُسجَّل وقت الاكتمال مرة واحدة. "
      "حذف تأشيرة (ملف خاطئ) يعيد فتح الخطوة حتى تُضاف من جديد.",
      src=["lib/visas.ts:17", "lib/visas.ts:18", "lib/visas.ts:34", "app/portal/(admin)/visas/visas.tsx:92"],
      data=["member_visas", "member_visas.visa_no", "member_visas.removed_at", "post_acceptance.visa_completed_at"],
      gap="إضافة التأشيرة لا تشترط جوازاً معتمداً ولا ملفاً طبياً مكتملاً (الشاشة تنبّه فقط، visas.tsx:176)؛ يجب أن يرفضها الخادم قبل ذلك."),

    R("POST-26", "ما تفتحه التأشيرات",
      "قبل اكتمال التأشيرات تبقى مقفلة: «الطيران والمشاعر»، و«الفنادق والسكن»، وكل صفحات «في الموسم» (حالتي الآن، المناسك، الوجبات، البلاغات، المفقودات). "
      "عند اكتمالها تُفتح، وتصير بطاقتا رحلة الذهاب والعودة جاهزتين في «خزنة الوثائق» إن كانت العائلة على رحلات.",
      src=["app/portal/_components/account-sidebar.tsx:128", "app/portal/season/_components/season-shell.tsx:42",
           "app/portal/application/_components/application-view.tsx:221", "app/portal/application/_components/application-view.tsx:241"],
      data=["post_acceptance.visa_completed_at", "flight_assignments"]),

    R("POST-27", "الرحلة كما يراها الحاج",
      "يسافر الحاج مع مجموعته على الرحلات التي وضعها عليها رئيس تكتلها، وأفراد الطلب على الرحلة نفسها. العائلة التي تنضم إلى مجموعة بعد وضعها على رحلاتها تأخذ مقاعد عليها تلقائياً "
      "إن كانت الرحلة مفتوحة للتخصيص، وإلا بقيت بلا مقعد وظهرت في قائمة «تحتاج رحلة» لمسؤول الطيران. "
      "في بطاقة الرحلة: موعد الصعود قبل الإقلاع بـ45 دقيقة، والحضور إلى المطار قبله بـ3.5 ساعات، وحقيبة 23 كغ وحقيبة يد 7 كغ، وفي العودة ماء زمزم 5 لترات يُسلَّم مغلّفاً.",
      src=["lib/flights.ts:1218", "lib/flights.ts:1281", "lib/flights.ts:1282", "lib/flights.ts:1284"],
      data=["flight_assignments", "group_flight_legs", "flights.gate", "flights.gathering"],
      gap="في النسخة التجريبية تضع إضافةُ آخر تأشيرة المجموعةَ على رحلات بالمحاكاة إن لم يضعها رئيس التكتل (lib/visas.ts:22، lib/flights.ts:1311)؛ هذا للعرض فقط."),

    R("POST-28", "تقييم كل خطوة",
      "حين تكتمل خطوة يُسأل الحاج سؤال تقييمها (من إصدار الطلب) بنجوم من 1 إلى 5. التقييم اختياري ويمكن تغييره، ويُحفظ لكل خطوة بمعرّفها، ويظهر في لوحة الجودة وتقرير الموسم.",
      src=["app/portal/application/_components/post/shared.tsx:58", "lib/registration/defaults.ts:64"],
      data=["post_step_ratings", "post_step_ratings.rating"]),

    R("POST-29", "التقييم الشامل بعد العودة",
      "بعد العودة يقيّم الحاج رحلته في 11 بنداً: 10 بنود بالنجوم (التسجيل والقرعة، الدفع والوثائق، السفر والطيران، النقل الداخلي، فندق مكة، فندق المدينة، الطعام، المجموعة والتنظيم، "
      "البرامج الدينية، الدعم والطوارئ) وسؤال «هل توصي بتكتلك؟» بنعم أو لا. لا يُرسل قبل الإجابة عن كل البنود، ويُرسل مرة واحدة مع تعليقات اختيارية. "
      "التقييم عام للرحلة والمجموعة والتكتل: لا يقيّم أشخاصاً بأسمائهم، ولا يدخل في تقييم الإداريين. نافذته المعلنة 22 أيار – 15 حزيران 2027.",
      src=["app/portal/season/_data.ts:286", "app/portal/season/_components/evaluation.tsx:47", "app/portal/season/_components/evaluation.tsx:125", "lib/operations.ts:71"],
      data=["pilgrim_evaluations", "season_ratings", "operation_windows"],
      gap="بوابة الحاج لا تتحقق من نافذة عملية «تقييم الحجاج بعد العودة»."),

    R("POST-30", "شهادة أداء فريضة الحج",
      "بعد العودة تصدر لكل فرد في الطلب بطاقة «شهادة أداء فريضة الحج» برقم 1448-C-{رقم الطلب بستة أرقام}، يُتحقق منها من صفحة «التحقق من وثيقة». "
      "في النسخة التجريبية تظهر الشهادات بعد الإجابة عن كل بنود التقييم الشامل أو إرساله.",
      src=["app/portal/season/_components/evaluation.tsx:141", "app/portal/season/_components/evaluation.tsx:147", "lib/data/clusters.ts:367"],
      data=["hajj_certificates", "hajj_certificates.certificate_no", "hajj_certificates.national_id"],
      gap="ربط الشهادة بإكمال التقييم يناقض أن التقييم اختياري (lib/operations.ts:71). والرقم واحد لكل أفراد الطلب، بينما الجدول شهادة لكل فرد برقمه؛ "
          "والشهادة لا تُحفظ ولا يُشترط لها أداء الحج فعلاً (العودة مسجّلة). المنصة الحقيقية تصدرها لكل فرد عاد، بلا شرط التقييم، برقم فريد."),

    R("POST-31", "العمرة",
      "لا خدمة عمرة مستقلة في هذا الموسم: صفحة العمرة «قريباً» بنموذج لطلب الإشعار، بلا برنامج ولا سعر ولا موعد. "
      "والعمرة الأولى للحاج جزء من برنامج الحج نفسه ليلة الوصول إلى مكة، يجتمع لها في بهو الفندق.",
      src=["app/umrah/page.tsx:13", "lib/journey.ts:141"],
      data=[]),
])
