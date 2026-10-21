# -*- coding: utf-8 -*-
from .dsl import *

DOC_STATUS = enum("missing", "uploaded", "rejected", "approved")
DOC_STATUS_DESC = "الحالة: missing «لم تُرفع»، uploaded «عند المراجعة»، rejected «أُعيدت»، approved «مقبولة»"

MODULE = M("post", "ما بعد القبول: الخطوات السبع والسكن والتأشيرة", [
    "بعد القبول يفتح الحاج «طلبي وخطواته» ويمر بالخطوات بالترتيب، ولا تُفتح خطوة قبل أن تكتمل التي قبلها: "
    "١ تأكيد القبول (وتثبيت التسجيل بالدفعة الأولى للمقبول بالقرعة)، ٢ الصورة الشخصية، ٣ الإلحاق بمجموعة بعقد يُوقَّع في المكتب، "
    "٤ الدفعة الثانية (ومعها الهدي والسكن الخاص)، ٥ جواز السفر، ٦ الملف الطبي، ٧ التأشيرة والرحلة. وقد تضيف الإدارة خطوات إقرار أو أسئلة أو دفعات بينها.",
    "اكتمال كل خطوة يُحسب من البيانات ولا يُخزَّن: التأكيد = confirmed_at مع الدفعة الأولى؛ الصورة = صور كل الأفراد مقبولة؛ المجموعة = عقد معتمد؛ "
    "الدفعة = كل البنود المستحقة مدفوعة؛ الجواز = جوازات الأفراد مقبولة؛ الطبي = الملف الصحي مؤكَّد وكل وثيقة مطلوبة مقبولة؛ التأشيرة = visa_completed_at.",
    "النسخة التجريبية تخزّن هذا كله في كائن واحد لكل حساب (post[sessionId]) بلا عمود موسم. هنا كل شيء معلّق بالطلب (application_id)، والطلب معلّق بالموسم.",
], [
    T("post_acceptance", "سجل ما بعد القبول", "صف واحد لكل طلب مقبول، يجمع لحظات المسار الكبرى.", [
        c("application_id", "BIGINT UNSIGNED", "الطلب المقبول (المفتاح الأساسي)", pk=True, fk="applications", od="CASCADE"),
        c("confirmed_at", "DATETIME(3)", "وقّع التعليمات إلكترونياً وأكّد قبوله («قرأت التعليمات» ثم «أؤكد وأوقّع إلكترونياً»)", null=True),
        ref("cluster_id", "clusters", "التكتل الذي أُلحقت به العائلة", null=True),
        ref("group_id", "admin_groups", "المجموعة (تُعرض باسمها لا برقمها)", null=True),
        c("group_approved_at", "DATETIME(3)", "بداية العضوية في المجموعة (اعتماد العقد)", null=True),
        c("contract_signed_at", "DATETIME(3)", "توقيع عقد المجموعة (يساوي group_approved_at في الإلحاق بالمكتب)", null=True),
        c("enrolled_by_kind", enum("staff", "account"), "من ألحق العائلة: موظف المكتب، أو إداري المجموعة", null=True),
        staff("enrolled_by_staff_id", "موظف المكتب"),
        account("enrolled_by_account_id", "الإداري", null=True),
        c("visa_completed_at", "DATETIME(3)", "اكتمال تأشيرات كل الأفراد: تُفتح بها الرحلة والفنادق والمشاعر و«قوائمي» وصفحات الموسم وزر الطوارئ والبطاقة الرقمية", null=True),
        updated(),
    ], src="lib/store.ts:291 PostAcceptance؛ lib/registration/post.ts stepsDone، firstOpenStep",
       rules=["لا تُكمَل خطوة ولا تُدفع بنودها إلا إن كان الطلب مقبولاً وغير موقوف بالمراجعة (acceptedApp).",
              "خطوة لاحقة لا تُفتح قبل اكتمال كل ما قبلها (stepReachable)."]),

    T("post_step_ratings", "تقييم الخطوات", "بعد اكتمال كل خطوة يُسأل الحاج سؤالها (مثل «كيف تقيّم وضوح شروط الجواز وسرعة مراجعته؟») من 1 إلى 5. "
      "ومعها تقييم القبول «كيف تقيّم وضوح طريقتي القبول وشفافية القرعة؟».", [
        ref("application_id", "applications", "الطلب", od="CASCADE"),
        c("step_key", "VARCHAR(40)", "الخطوة: acceptance، confirm، documents، group، payment، passport، medical، visa، أو معرّف خطوة أضافتها الإدارة"),
        c("rating", "TINYINT UNSIGNED", "التقييم 1–5", ck="rating BETWEEN 1 AND 5"),
        c("rated_at", "DATETIME(3)", "وقت التقييم", d="CURRENT_TIMESTAMP(3)"),
    ], uq=[("application_id", "step_key")], src="PostAcceptance.ratings؛ Application.ratings.acceptance"),

    T("post_custom_step_completions", "الخطوات المضافة من الإدارة", "إكمال خطوة إقرار أو أسئلة أضافتها إدارة التسجيل بين الخطوات الأساسية.", [
        ref("application_id", "applications", "الطلب", od="CASCADE"),
        c("step_key", "VARCHAR(40)", "معرّف الخطوة في الإصدار المثبَّت"),
        c("completed_at", "DATETIME(3)", "وقت الإكمال", d="CURRENT_TIMESTAMP(3)"),
        c("answers", "JSON", "إجابات الطلب", null=True),
        c("member_answers", "JSON", "إجابات الأفراد {national_id: {key: value}}", null=True),
    ], uq=[("application_id", "step_key")], src="PostAcceptance.custom؛ service.ts completePostStep"),

    T("member_documents", "الصورة الشخصية والجواز", "وثيقتا الهوية لكل فرد: الصورة (بعد الدفعة الأولى) والجواز (بعد اكتمال الدفعة الثانية حصراً). تراجعهما «إدارة التسجيل».", [
        pk(),
        ref("application_id", "applications", "الطلب", od="CASCADE"),
        person("national_id", "الفرد"),
        c("doc_key", enum("photo", "passport"), "الوثيقة: photo «الصورة الشخصية» (خلفية بيضاء، حديثة، دون نظارات)، passport «جواز السفر» (صفحة البيانات كاملة وواضحة)"),
        c("status", DOC_STATUS, DOC_STATUS_DESC, d="'missing'"),
        file_("file_id", "الملف المرفوع"),
        c("passport_no", "VARCHAR(20)", "رقم الجواز", null=True),
        c("passport_expiry", "DATE", "انتهاء الجواز: يجب أن يبقى سارياً 6 أشهر على الأقل بعد العودة", null=True),
        c("reject_reason", "VARCHAR(500)", "سبب الإعادة", null=True),
        c("rejected_count", "TINYINT UNSIGNED", "مرات الإعادة", d="0"),
        c("uploaded_at", "DATETIME(3)", "وقت الرفع", null=True),
        staff("reviewed_by_staff_id", "المراجع"),
        c("reviewed_at", "DATETIME(3)", "وقت المراجعة", null=True),
    ], uq=[("application_id", "national_id", "doc_key")], src="PostAcceptance.documents؛ lib/registration/post.ts:21 DOCS",
       rules=["النسخة التجريبية تحاكي المراجعة بمؤقت (المراجعة رنا حداد) ولا شاشة موظف لها؛ يلزم بناء شاشة مراجعة الصور والجوازات."]),

    T("group_enrollment_contracts", "عقود الإلحاق بالمجموعات", "الحاج لا يختار مجموعته من المنصة: يوقّع العقد ورقياً في المكتب، فيرفعه موظف المكتب ويُلحق العائلة كاملة. "
      "وقد يرفع إداري المجموعة العقد فيقرره المكتب (المسار القديم).", [
        pk(),
        ref("application_id", "applications", "الطلب (العائلة كلها تنتقل معاً أو لا تنتقل)", od="CASCADE"),
        ref("group_id", "admin_groups", "المجموعة المطلوبة"),
        ref("cluster_id", "clusters", "تكتلها", null=True),
        ref("transfer_from_group_id", "admin_groups", "المجموعة الحالية للعائلة إن كان العقد ينقلها", null=True),
        c("status", enum("pending", "approved", "returned"), "الحالة: pending «عند المكتب»، approved «نافذ»، returned «أُعيد»", d="'pending'"),
        file_("file_id", "صورة العقد الموقّع", null=False),
        c("uploaded_by_kind", enum("staff", "account"), "من رفعه"),
        staff("uploaded_by_staff_id", "موظف المكتب"),
        account("uploaded_by_account_id", "إداري المجموعة", null=True),
        c("uploaded_by_role", "VARCHAR(80)", "صفته وقت الرفع"),
        c("uploaded_at", "DATETIME(3)", "وقت الرفع", d="CURRENT_TIMESTAMP(3)"),
        staff("decided_by_staff_id", "موظف المكتب الذي قرر"),
        c("decided_at", "DATETIME(3)", "وقت القرار", null=True),
        c("return_reason", "VARCHAR(500)", "سبب الإعادة (إلزامي عند الإعادة)", null=True),
    ], src="lib/store.ts:275 PilgrimContract؛ lib/assignment.ts submitContract، decideContract، attachByStaff، enrollFamily؛ app/staff/reviews/contracts.tsx",
       rules=["نافذة الإلحاق: عملية group-joining (12 تشرين الثاني – 15 كانون الثاني لموسم 1448).",
              "السعة: الملتحقون + أفراد العائلة ≤ سعة المجموعة، وإلا «الطلب العائلي يُلحق كاملاً أو لا يُلحق».",
              "الاعتماد يكتب post_acceptance (cluster_id، group_id، group_approved_at، contract_signed_at) ويُلحق العائلة برحلات مجموعتها ويلغي مقاعدها على رحلات المجموعة السابقة. والنقل يعيد الملف الصحي ليأخذه منسق المجموعة الجديدة.",
              "تسجيل المنسق للحاج لا يضعه في مجموعته."],
       checks=["status <> 'returned' OR return_reason IS NOT NULL"]),

    T("application_group_transfers", "انتقالات العائلة بين المجموعات", "كل انتقال سابق للعائلة كاملة من مجموعة إلى أخرى.", [
        pk(), ref("application_id", "applications", "الطلب", od="CASCADE"),
        ref("from_group_id", "admin_groups", "من مجموعة"),
        ref("to_group_id", "admin_groups", "إلى مجموعة"),
        ref("contract_id", "group_enrollment_contracts", "العقد الذي نقلها", null=True),
        c("moved_at", "DATETIME(3)", "وقت الانتقال", d="CURRENT_TIMESTAMP(3)"),
    ], src="PostAcceptance.transfers"),

    T("group_family_acknowledgements", "استلام العائلة في المجموعة", "حين تلتحق عائلة بمجموعة يستلمها فريق المجموعة ويرحّب بها («استلام عائلة … والترحيب بها»). "
      "هذا إقرار بالاستلام لا عضوية، والعضوية بالعقد. الكود يحفظه على ملف الإداري؛ هنا على المجموعة فيراه فريقها كله.", [
        pk(), ref("group_id", "admin_groups", "المجموعة", od="CASCADE"),
        ref("application_id", "applications", "العائلة", od="CASCADE"),
        c("decision", enum("accepted", "rejected"), "accepted استُلمت ورُحّب بها", d="'accepted'"),
        account("by_account_id", "الإداري الذي استلمها"),
        c("at", "DATETIME(3)", "الوقت", d="CURRENT_TIMESTAMP(3)"),
        c("referred_needs", "TINYINT(1)", "1 = أُحيل احتياج خاص إلى مشرف البرج («إحالة احتياج خاص إلى مشرف البرج»)", d="0"),
    ], uq=[("group_id", "application_id")], src="AdminProfile.joinDecisions؛ app/portal/(admin)/requests/requests.tsx"),

    T("application_accommodation", "السكن: العام أو الغرف الخاصة", "اختيار العائلة بعد الإلحاق بمجموعة: السكن العام (الرجال وحدهم والنساء وحدهن دون كلفة) أو غرف خاصة تتوزع عليها.", [
        c("application_id", "BIGINT UNSIGNED", "الطلب", pk=True, fk="applications", od="CASCADE"),
        c("kind", enum("general", "private"), "general «السكن العام»، private غرف خاصة", d="'general'"),
        c("settled_at", "DATETIME(3)", "يُقفل الاختيار بدفع بند السكن، أو بدفع الهدي للسكن العام", null=True),
        updated(),
    ], src="lib/rooms.ts:31 Accommodation"),

    T("application_accommodation_rooms", "توزيع الغرف الخاصة", "عدد الغرف من كل نوع. مجموع الأسرّة يساوي عدد أفراد الطلب بالضبط.", [
        ref("application_id", "applications", "الطلب", od="CASCADE"),
        c("beds", "TINYINT UNSIGNED", "أسرّة الغرفة: 1 «غرفة مفردة بسرير واحد وحمّامها»، 2 «غرفة بسريرين»، 3 «بثلاثة أسرّة»، 4 «بأربعة أسرّة»", ck="beds BETWEEN 1 AND 4"),
        c("rooms", "TINYINT UNSIGNED", "عدد الغرف من هذا النوع"),
        c("price_per_person", MONEY, "سعر الفرد في هذا النوع وقت الاختيار (من أسعار التكتل المعتمدة)"),
    ], uq=[("application_id", "beds")], src="lib/rooms.ts RoomCounts، RoomPrices، accommodationCost",
       rules=["كلفة السكن الخاص = Σ (beds × rooms × price_per_person)، وتصير بند room في الدفعات. الغرف التي تراعي الاحتياجات لا تضيف كلفة."]),

    T("application_payment_lines", "بنود التكاليف بعد القبول", "بنود ما يستحق على الطلب بعد القبول ومتى تُدفع: دفعات تكلفة الحج، الهدي، السكن الخاص. "
      "تُبنى من policy_snapshot والسكن، وتحفظ هنا لأن حالة الدفع لكل بند يجب أن تُخزَّن.", [
        pk(), ref("application_id", "applications", "الطلب", od="CASCADE"),
        c("line_key", "VARCHAR(20)", "البند: i1..i4، hady، room"),
        c("title", "VARCHAR(120)", "العنوان: «الدفعة الأولى»، «الدفعة الثانية»، «تكلفة الحج كاملة»، «الهدي»، «السكن الخاص»"),
        c("amount", MONEY, "المبلغ للطلب كله"),
        c("due_step", "VARCHAR(40)", "الخطوة التي يُدفع فيها (payment للدفعة الثانية والإضافات)", null=True),
        c("due_label", "VARCHAR(200)", "نص الاستحقاق المعروض، مثل «عند الانضمام إلى مجموعة»", null=True),
        ref("payment_item_id", "payment_items", "بند الدفعة الذي سدّده", null=True),
        c("paid_at", "DATETIME(3)", "وقت السداد", null=True),
    ], uq=[("application_id", "line_key")], src="lib/registration/post.ts costLines؛ PostAcceptance.payments"),

    T("health_files", "الملف الصحي للعائلة", "يأخذه المنسق التقني المسند إلى المجموعة من العائلة، ثم يؤكده الحاج («المعلومات صحيحة») أو يطلب تصحيحه.", [
        c("application_id", "BIGINT UNSIGNED", "الطلب", pk=True, fk="applications", od="CASCADE"),
        account("recorded_by_account_id", "المنسق الذي سجّله"),
        c("recorded_at", "DATETIME(3)", "وقت التسجيل", d="CURRENT_TIMESTAMP(3)"),
        c("confirmed_at", "DATETIME(3)", "تأكيد الحاج. كل حفظ جديد من المنسق يلغي التأكيد", null=True),
        c("correction_requested_at", "DATETIME(3)", "طلب الحاج تصحيحه", null=True),
        c("correction_note", "VARCHAR(500)", "ما يطلب تصحيحه", null=True),
    ], src="lib/store.ts:266 HealthFile؛ model.ts recordHealth"),

    T("health_records", "الحالة الصحية لكل فرد", "الأمراض والاحتياجات والأدوية الدائمة لكل فرد. تُنسخ الاحتياجات إلى application_members.needs فتقرؤها الغرف والوجبات والقوائم.", [
        ref("application_id", "applications", "الطلب", od="CASCADE"),
        person("national_id", "الفرد"),
        c("conditions", "JSON", "الأمراض المختارة من: «سكري»، «ضغط الدم»، «أمراض القلب»، «ربو أو أمراض تنفسية»، «أمراض الكلى»، «حساسية دوائية»"),
        c("needs", "JSON", "الاحتياجات من: «كرسي متحرك»، «صعوبة في المشي»، «وجبة خاصة»، «غرفة قريبة من المصعد»، «ضعف السمع أو البصر»، «أكسجين ليلي»"),
        c("medications", "TEXT", "الأدوية الدائمة (نص حر). وجودها يُلزم بوصفة طبية", null=True),
    ], uq=[("application_id", "national_id")], src="lib/store.ts:259 HealthRecord؛ model.ts CONDITIONS، NEEDS",
       rules=["احتياجات الغرفة: كرسي متحرك، صعوبة في المشي، غرفة قريبة من المصعد، أكسجين ليلي. احتياجات الوجبة: سكري، ضغط الدم، وجبة خاصة (ومن بلغ 69 عاماً)."]),

    T("medical_document_types", "الوثائق الطبية المطلوبة", "قائمة الوثائق التي يرفعها الحاج في الخطوة السادسة، لكل موسم.", [
        season(),
        c("doc_key", "VARCHAR(30)", "المفتاح: covid، meningitis، flu، report، prescription"),
        c("label", "VARCHAR(120)", "الاسم: «شهادة لقاح كورونا»، «شهادة لقاح الحمى الشوكية»، «شهادة لقاح الإنفلونزا الموسمية»، «التقرير الطبي العام»، «الوصفة الطبية للأدوية الدائمة»"),
        c("hint", "VARCHAR(200)", "الشرح: «بالجرعات المعتمدة»، «سارية خلال 3 سنوات»، «لهذا الموسم — لمن بلغ 60 عاماً»…"),
        c("min_age", "TINYINT UNSIGNED", "لا تُطلب إلا ممن بلغ هذا العمر (60 للإنفلونزا)", null=True),
        c("only_if_medications", "TINYINT(1)", "لا تُطلب إلا ممن له أدوية دائمة (الوصفة)", d="0"),
        c("sort_order", "TINYINT", "الترتيب", d="0"),
    ], uq=[("season_year", "doc_key")], src="lib/season.ts:129 SEASON.medicalDocuments؛ post.ts medicalDocsFor"),

    T("member_medical_documents", "الوثائق الطبية لكل فرد", "حالة كل وثيقة طبية مطلوبة من كل فرد، يراجعها «الفريق الطبي».", [
        pk(), ref("application_id", "applications", "الطلب", od="CASCADE"),
        person("national_id", "الفرد"),
        c("doc_key", "VARCHAR(30)", "الوثيقة (medical_document_types.doc_key)"),
        c("status", DOC_STATUS, DOC_STATUS_DESC, d="'missing'"),
        file_("file_id", "الملف"),
        c("reject_note", "VARCHAR(500)", "سبب الإعادة (3 أحرف على الأقل)", null=True),
        c("uploaded_at", "DATETIME(3)", "وقت الرفع", null=True),
        staff("reviewed_by_staff_id", "من الفريق الطبي (صلاحية medical)"),
        c("reviewed_at", "DATETIME(3)", "وقت المراجعة", null=True),
    ], uq=[("application_id", "national_id", "doc_key")], src="PostAcceptance.medical، medicalNotes؛ app/staff/medical/view.tsx"),

    T("member_health_docs", "وثائق صحية يضيفها فريق المجموعة", "الشهادة الصحية من وزارة الصحة، والوصفات، وتقارير الحالات، يضيفها رئيس المجموعة أو رئيس التكتل أو المنسق المسند، "
      "وتظهر في «خزنة الوثائق» للحاج. لا تدخل في اكتمال الخطوة الطبية.", [
        pk(), ref("application_id", "applications", "الطلب", od="CASCADE"),
        person("national_id", "الفرد"),
        c("kind", enum("certificate", "prescription", "condition"), "النوع: certificate «الشهادة الصحية — وزارة الصحة»، prescription «وصفة طبية»، condition «تقرير حالة صحية»"),
        c("fit", "TINYINT(1)", "للشهادة: 1 «سليم ولقاحاته مكتملة»، 0 «لديه حالة صحية»", null=True),
        c("note", "VARCHAR(1000)", "الأدوية أو الحالة. إلزامية للوصفة والتقرير وللشهادة غير السليمة", null=True),
        file_("file_id", "الملف (صورة أو PDF حتى 12 ميغابايت)"),
        account("added_by_account_id", "الإداري الذي أضافها"),
        c("added_by_role", "VARCHAR(80)", "صفته"),
        c("added_at", "DATETIME(3)", "وقت الإضافة", d="CURRENT_TIMESTAMP(3)"),
        c("removed_at", "DATETIME(3)", "سحبها (حذف منطقي)", null=True),
    ], src="lib/store.ts:442 HealthDoc؛ lib/health-docs.ts؛ app/portal/(admin)/requests/health-docs.tsx",
       rules=["شهادة واحدة لكل فرد: الجديدة تحل محل القديمة. الوصفات والتقارير تتراكم."],
       checks=["kind <> 'certificate' OR fit IS NOT NULL", "(kind = 'certificate' AND fit = 1) OR note IS NOT NULL"]),

    T("member_visas", "التأشيرات", "تصل تأشيرة كل حاج بالبريد من وزارة الخارجية السعودية إلى مجموعته، فيضيفها المنسق التقني المسند إلى المجموعة: رقمها وملفها.", [
        pk(), ref("application_id", "applications", "الطلب", od="CASCADE"),
        person("national_id", "الفرد"),
        c("visa_no", "VARCHAR(30)", "رقم التأشيرة كما في البريد (الصيغة التجريبية HV-1448-<الطلب>-<n>)"),
        file_("file_id", "ملف التأشيرة"),
        account("added_by_account_id", "المنسق التقني الذي أضافها"),
        c("added_at", "DATETIME(3)", "وقت الإضافة", d="CURRENT_TIMESTAMP(3)"),
        c("removed_at", "DATETIME(3)", "حُذفت (ملف خطأ). الحذف يعيد فتح خطوة التأشيرة حتى تُضاف من جديد", null=True),
        account("removed_by_account_id", "من حذفها", null=True),
        c("current_marker", "TINYINT(1)", "1 للتأشيرة السارية، NULL للمحذوفة: تأشيرة سارية واحدة لكل فرد", null=True, d="1"),
    ], uq=[("application_id", "national_id", "current_marker")], src="lib/store.ts:430 PilgrimVisa؛ lib/visas.ts addVisa، removeVisa؛ app/portal/(admin)/visas/visas.tsx",
       rules=["حين يكتمل لكل فرد تأشيرة تُكتب post_acceptance.visa_completed_at وتُلحق المجموعة برحلاتها إن لم تكن.",
              "حذف تأشيرة يمسح visa_completed_at (أُصلح هذا في الموقع في هذا الموسم).",
              "يضيفها المنسق التقني وحده؛ رئيس المجموعة ومعاونه يريانها دون إضافة ولا حذف."]),
], flow=[
    "يؤكد الحاج قبوله (post_acceptance.confirmed_at)، والمقبول بالقرعة يدفع الدفعة الأولى (payments).",
    "يرفع الصورة (member_documents) فتُراجَع، ثم يوقّع عقد المجموعة في المكتب فيُعتمد (group_enrollment_contracts) ويستلمه فريق المجموعة (group_family_acknowledgements).",
    "يختار السكن (application_accommodation) ويدفع البنود (application_payment_lines ← payment_items)، ثم يرفع الجواز.",
    "يأخذ المنسق الملف الصحي (health_files + health_records) ويؤكده الحاج، ويرفع الوثائق الطبية (member_medical_documents) فيراجعها الفريق الطبي.",
    "يضيف المنسق التأشيرات (member_visas)؛ اكتمالها يفتح الرحلة والموسم.",
])
