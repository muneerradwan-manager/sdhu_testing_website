# -*- coding: utf-8 -*-
from .dsl import *

W = [3.2, 3.0, 10.8]

MODULE = M("regconfig", "إعدادات التسجيل على الحج: الإصدارات والقرعة واعتماد الأعمار", [
    "نموذج التقديم على الحج ليس ثابتاً في الكود: تبنيه «إدارة التسجيل على الحج» صفحةً صفحة (الصفحات والأسئلة وشروط الأهلية الإضافية ونوعا التسجيل "
    "وجدول الدفعات وطرق الدفع وخطوات ما بعد القبول والنصوص العامة)، ثم تنشره إصداراً لا يتغير. كل طلب يبقى على الإصدار الذي بدأ به حتى يُقدَّم.",
    "الكود يعامل الإعدادات كتلةً واحدة ثابتة لكل إصدار (RegConfig)، ولهذا تُخزَّن هنا عموداً من نوع JSON في reg_config_versions، "
    "ويُشرح شكلها في الجدول بعد الجداول. يبقى جدول reg_form_fields فهرساً لمفاتيح الأسئلة يضمن ثباتها بين الإصدارات.",
    "والقرعة تمر بأربع خطوات يتقاسمها شخصان على الأقل: اعتماد الأعمار المقبولة مباشرة، ثم إدخال سنوات الميلاد المسحوبة من البث، ثم إرسالها للاعتماد، "
    "ثم اعتمادها ونشرها. الفصل بين الإدخال والاعتماد يمنع أن يقرر شخص واحد النتيجة.",
], [
    T("reg_config_versions", "إصدارات إعدادات التسجيل", "إصدار منشور لا يتغير. يظهر للحجاج من وقت سريانه، ويبقى أساساً لكل طلب بدأ عليه.", [
        pk(), season(),
        c("version_no", "SMALLINT UNSIGNED", "رقم الإصدار داخل الموسم: الأعلى + 1"),
        c("code", "VARCHAR(20)", "المعرّف المقروء: {season}-v{n}، مثل 1448-v1", uq=True),
        c("config", "JSON", "الإعدادات كاملة: stages وtracks وeligibility وpayments وpostSteps وmessages (انظر شرح الشكل بعد الجداول)"),
        c("effective_from", "DATETIME(3)", "يبدأ سريانه من هذا الوقت (لا يكون في الماضي عند النشر). الإصدار الساري = آخر إصدار effective_from ≤ الآن"),
        c("note", "VARCHAR(500)", "ملاحظة النشر، إلزامية (تُملأ تلقائياً من قائمة التغييرات)"),
        ref("based_on_version_id", "reg_config_versions", "الإصدار الذي بُني عليه", null=True),
        staff("published_by_staff_id", "من نشره (صلاحية registration.manage)", null=False),
        c("published_at", "DATETIME(3)", "وقت النشر", d="CURRENT_TIMESTAMP(3)"),
    ], uq=[("season_year", "version_no")], src="lib/registration/types.ts:192 RegVersion، :182 RegConfig؛ lib/registration/service.ts publishDraft",
       rules=["لا يُعدَّل إصدار بعد نشره. «الرجوع إليه» ينسخه إلى المسودة لتُنشر من جديد إصداراً آخر.",
              "النشر مرفوض إن كان في الإعدادات خطأ واحد (validateConfig): الكتل الإلزامية (track، applicant، eligibility، consents، summary، payment) موجودة مرة واحدة ومفعّلة وبترتيبها، "
              "والدفع آخر صفحة، والخطوات السبع بعد القبول كلها موجودة وأولها confirm وآخرها visa، ومجموع الدفعات يساوي تكلفة الحج.",
              "حالة الإصدار محسوبة: «يظهر الآن» (الساري)، «مجدول» (effective_from في المستقبل)، «سابق»."],
       seed="1447-v1، 1447-v2، 1448-v1 (هبة القدسي)."),

    T("reg_config_drafts", "مسودة إعدادات الموسم", "المسودة التي تعدّلها إدارة التسجيل قبل النشر. واحدة لكل موسم؛ غيابها يعني نسخة من الإصدار الساري.", [
        season(pk=True),
        c("config", "JSON", "الإعدادات قيد التعديل، بالشكل نفسه"),
        ref("base_version_id", "reg_config_versions", "الإصدار الذي بدأت منه المسودة", null=True),
        staff("updated_by_staff_id", "آخر من عدّل", null=False),
        updated(),
    ], src="lib/registration/types.ts:219 RegDraft؛ editDraft، discardDraft",
       rules=["المفتاح الأساسي season_year (مسودة واحدة لكل موسم). لا تُعدَّل مسودة موسم مؤرشف.",
              "كل تعديل حدث في audit_events بمنطقته: stages، rules، payments، steps، publish، seasons."]),

    T("reg_form_fields", "فهرس مفاتيح الأسئلة", "كل سؤال أضافته الإدارة إلى النموذج له مفتاح إجابة ثابت. إذا أُعيد استعمال مفتاح في إصدار لاحق من الموسم نفسه "
      "فيجب أن يحتفظ بنوعه ونطاقه، وإلا اختلطت إجابات الطلبات القديمة بالجديدة.", [
        pk(), season(),
        c("field_key", "VARCHAR(60)", "مفتاح الإجابة، مثل q_ab12cd"),
        c("field_type", enum("text", "textarea", "number", "date", "radio", "select", "checkboxes", "yesno", "consent"),
          "النوع: text «نص قصير»، textarea «نص طويل»، number «رقم»، date «تاريخ»، radio «اختيار واحد»، select «اختيار واحد (قائمة)»، checkboxes «عدة اختيارات»، yesno «نعم / لا»، consent «إقرار بالموافقة»"),
        c("scope", enum("application", "member"), "النطاق: application سؤال للطلب كله، member «يُسأل لكل فرد في الطلب»"),
        c("context", enum("stage", "post-step"), "أين يُسأل: صفحة من نموذج التقديم، أو خطوة بعد القبول"),
        c("label", "VARCHAR(300)", "نص السؤال في آخر إصدار"),
        ref("first_version_id", "reg_config_versions", "أول إصدار ظهر فيه"),
    ], uq=[("season_year", "field_key")], new=True, src="lib/registration/validate.ts (مفتاح ثابت بنوعه ونطاقه)"),

    T("direct_age_announcements", "اعتماد الأعمار المقبولة مباشرة", "الخطوة الأولى في «القرعة»: يُصدر موظف الإدخال العمر المقبول من توزيع أعمار المسجّلين على القبول المباشر، "
      "وتعتمده اللجنة فيُكتب في season_settings.accepted_direct_age.", [
        pk(), season(),
        c("age", "TINYINT UNSIGNED", "العمر المقبول (68 لموسم 1448): يُحسب بجمع مقاعد الأعمار من الأكبر حتى تبلغ مقاعد القبول المباشر"),
        c("direct_seats", "INT UNSIGNED", "مقاعد القبول المباشر وقت الإصدار"),
        c("buckets", "JSON", "توزيع الأعمار المعتمد في الحساب: [{age_from, age_to, seats}]"),
        staff("issued_by_staff_id", "من أصدرها (صلاحية lottery.import)", null=False),
        c("issued_at", "DATETIME(3)", "وقت الإصدار والإرسال للاعتماد", d="CURRENT_TIMESTAMP(3)"),
        staff("approved_by_staff_id", "من اعتمدها وأعلنها (صلاحية lottery.approve)"),
        c("approved_at", "DATETIME(3)", "وقت الاعتماد", null=True),
    ], new=True, src="app/staff/lottery (الخطوة ages)؛ lib/lottery.ts AGE_BUCKETS، cutAge",
       rules=["في النسخة التجريبية هذه الخطوة تُعرف من سجل الأحداث وحده («إصدار الأعمار المقبولة»، «اعتماد الأعمار المقبولة»)."]),

    T("lottery_draws", "نتائج القرعة", "نتيجة القرعة العلنية كما يدخلها مكتب القرعة سطراً سطراً من البث، ثم تُرسَل للاعتماد، ثم تُعتمد وتُنشر. لا يقرر القبول إلا السحب المنشور.", [
        pk(), season(),
        c("status", enum("entered", "sent", "published", "withdrawn"), "الحالة: entered أُدخلت، sent «أُرسلت للاعتماد»، published «اعتُمدت ونُشرت»، withdrawn سُحبت", d="'entered'"),
        c("label", "VARCHAR(160)", "وصف السحب المعروض، مثل «15 ربيع الآخر 1448 (26 أيلول) — 21:00»", null=True),
        c("venue", "VARCHAR(160)", "مكان القرعة، مثل «جامعة الفرات، دير الزور»", null=True),
        staff("entered_by_staff_id", "من أدخل النتائج (lottery.import)", null=False),
        c("entered_at", "DATETIME(3)", "وقت الإدخال", d="CURRENT_TIMESTAMP(3)"),
        staff("sent_by_staff_id", "من أرسلها للاعتماد"),
        c("sent_at", "DATETIME(3)", "وقت الإرسال", null=True),
        staff("published_by_staff_id", "من اعتمدها ونشرها (lottery.approve)"),
        c("published_at", "DATETIME(3)", "وقت النشر", null=True),
    ], src="lib/store.ts:779 State.lottery؛ lib/lottery.ts؛ app/staff/lottery",
       rules=["سحب منشور واحد فقط لكل موسم (يُفرض في التطبيق، أو بعمود مولَّد فريد).",
              "يُقبل طلب القرعة إذا وُلد صاحبه (relation = self) في سنة مسحوبة، وفي أحد الأشهر المذكورة إن ذُكرت أشهر. يُقبل الطلب كله معاً، ولا قائمة احتياط.",
              "من أدخل لا يعتمد: published_by_staff_id ≠ entered_by_staff_id."],
       checks=["published_by_staff_id IS NULL OR published_by_staff_id <> entered_by_staff_id"]),

    T("lottery_draw_picks", "السنوات والأشهر المسحوبة", "سطر لكل سنة ميلاد مسحوبة: كاملة أو بأشهر محددة.", [
        pk(), ref("draw_id", "lottery_draws", "السحب", od="CASCADE"),
        c("birth_year", "SMALLINT UNSIGNED", "سنة الميلاد المسحوبة"),
        c("birth_month", "TINYINT UNSIGNED", "الشهر 1–12 (كانون الثاني … كانون الأول). NULL = «جميع الأشهر»", null=True, ck="birth_month BETWEEN 1 AND 12"),
    ], uq=[("draw_id", "birth_year", "birth_month")], src="lib/lottery.ts:18 DrawPick",
       seed="السحب الرسمي 1448: 1961 كاملة؛ 1965 [كانون الثاني]؛ 1970 كاملة؛ 1972 [1–4]؛ 1980 كاملة؛ 1987 كاملة؛ 1989 كاملة؛ 1990 [كانون الثاني]."),
], flow=[
    "تعدّل إدارة التسجيل reg_config_drafts (صفحات وأسئلة وقواعد ودفعات وخطوات)، وتجربه في «المعاينة»، ثم تنشره reg_config_versions «الآن» أو في موعد تحدده.",
    "كل مسودة طلب (application_drafts) تثبَّت على الإصدار الساري يوم بدأت، وتبقى عليه حتى التقديم، فتُحفظ نسخة شروطها في الطلب.",
    "بعد إغلاق القبول المباشر يُعتمد العمر (direct_age_announcements) فيُكتب في season_settings؛ وبعد القرعة تُدخل lottery_draws وlottery_draw_picks ثم تُنشر، فيتحدد المقبولون بالقرعة.",
], blocks=[
    ("h", "شكل عمود config في الإصدار والمسودة"),
    ("p", "هذا ما يحمله عمود JSON. كل عنصر بمعرّفه، والترتيب ترتيب المصفوفة. المصدر: lib/registration/types.ts."),
    ("table", ["المفتاح", "النوع", "المحتوى"], [
        ["stages[]", "StageDef", "صفحات نموذج التقديم بالترتيب: id، kind (content «تعليمات» | form «أسئلة» | system «أساسية»)، system (track، applicant، residence، members، eligibility، consents، summary، payment)، name، title (يقبل رموز {firstName} {applicantName} {fee} {directAge} {maxCompanions} {maxCompanionsFamily} {members})، hint، phase، blocks[]، fields[]، enabled، window {from,to}، showIf، gates[]، nextLabel"],
        ["stages[].blocks[]", "ContentBlock", "paragraph {text} | notice {tone: info|warn, text} | cards {items[{id, emoji, title, text}]} | checklist {items[{id, text}]}"],
        ["stages[].fields[]", "FieldDef", "id، key (مفتاح الإجابة، ثابت)، label، help، type (انظر reg_form_fields)، required، scope (application|member)، options[{id, value, label}]، min، max، minLength، maxLength، pattern، patternMessage، showIf"],
        ["…showIf / gates[].when", "Condition", "شجرة شروط: {all:[…]} | {any:[…]} | {not:…} | {fact, op, value}. op: eq، neq، gt، gte، lt، lte، in، nin، set، unset. الحقائق: track، forWhom، abroad، residence، membersCount، companionsCount، applicantAge، applicantBirthYear، applicantGender، hasElderly، member.age، member.birthYear، member.gender، member.relation، member.isApplicant، member.hajjBefore، answer:<key>، manswer:<key>"],
        ["stages[].gates[]", "Gate", "{id, when, message}: لا تُترك الصفحة ما دام الشرط غير محقق"],
        ["tracks[]", "TrackDef", "{key: direct|lottery, label, description, icon, enabled}. منطق النوعين للمنصة، والإعداد لطريقة عرضهما وتفعيلهما فقط"],
        ["eligibility[]", "EligibilityRule", "قواعد الإدارة الإضافية: id، label، scope (member «كل فرد في الطلب» | application «الطلب كله»)، when، require، severity (fail «يمنع تقديم الطلب» | warn «تنبيه فقط»)، message، fix (none | remove «إزالة الفرد» | addPerson «إضافة شخص» | lottery «التسجيل على القرعة بدلاً من ذلك»)، enabled"],
        ["payments", "PaymentsConfig", "installments[] {key i1..i4, label, amount (NULL = باقي تكلفة الحج), dueStep, dueLabel}، methods {shamcash, bank}، extrasStep (الخطوة التي يُدفع فيها الهدي والسكن الخاص)"],
        ["postSteps[]", "PostStepDef", "خطوات ما بعد القبول: id، kind (system «أساسية» | acknowledge «إقرار» | form «أسئلة» | installment «دفعة»)، system (confirm، documents، group، payment، passport، medical، visa)، title، short، emoji، instructions، ackText، question (سؤال التقييم)، enabled، fields[]"],
        ["messages", "Messages", "postHeader، helpLine («اتصل على 011 000 1448 أو زر أقرب مكتب تسجيل.»)، savedLater"],
    ], W),
])
