# -*- coding: utf-8 -*-
from .dsl import *

MODULE = M("season", "الحاج في الموسم وبعد العودة: البلاغات والتقييمات والشهادة", [
    "بعد التأشيرة تُفتح صفحات الموسم: «حالتي الآن» يوماً بيوم، أداء المناسك (يسجّله فريق المجموعة)، الوجبات وتقييمها، الدروس والنشاطات، المفقودات، "
    "بلاغاتي، وزر الطوارئ. وبعد العودة: التقييم الشامل (عام، لا يُقيَّم فيه أحد باسمه)، فشهادة أداء الحج.",
    "البلاغات (tickets) مشتركة بين الحاج وفريق المجموعة وغرفة العمليات والفريق الطبي والمواصلات والطيران: من يفتحها ومن يعالجها يختلف، والجدول واحد.",
    "أيام الموسم وأماكنه وأسئلة تقييم مراحله ثابتة في الكود (app/portal/season/_data.ts)، ويوم المحاكاة (day) في النسخة التجريبية أداة عرض لا تُنقل. "
    "صفحتا «الرحلات» و«التجمّعات» صارتا تحوّلان إلى «أداء المناسك»، ورغبة «أريد الذهاب» لم تكن تُحفظ، فلا جداول لهما.",
], [
    T("season_ratings", "تقييمات الحاج أثناء الموسم", "كل نجمة يعطيها الحاج في الموسم: مراحل الرحلة، المشاعر، كل وجبة، وبنود التقييم الشامل بعد العودة.", [
        pk(), ref("application_id", "applications", "الطلب (العائلة)", od="CASCADE"),
        c("rating_key", "VARCHAR(40)", "المفتاح: stage-arrival، stage-hotel، stage-trip، stage-tawaf، stage-makkah-hotel، stage-madinah، stage-return (أسئلة المراحل)؛ "
          "mashaer-camp، mashaer-arafat، mashaer-transport، mashaer-meals، mashaer-guidance، mashaer-elderly (المشاعر)؛ meal-<اليوم>-breakfast|lunch (الوجبات)؛ "
          "eval-registration، eval-payment، eval-travel، eval-transport، eval-makkah، eval-madinah، eval-food، eval-group، eval-programs، eval-support، eval-recommend (التقييم الشامل)"),
        c("value", "TINYINT UNSIGNED", "1–5 (في eval-recommend: 5 = نعم أوصي، 1 = لا)", ck="value BETWEEN 1 AND 5"),
        c("rated_at", "DATETIME(3)", "الوقت", d="CURRENT_TIMESTAMP(3)"),
    ], uq=[("application_id", "rating_key")], src="lib/store.ts:704 InSeason.ratings؛ app/portal/season/_data.ts stageQuestionFor، MASHAER_ITEMS، EVALUATION",
       rules=["تُقيَّم الوجبة بعد بدء موعدها. والتقييم الشامل يُفتح بعد العودة ضمن عملية pilgrim-evaluation."]),

    T("pilgrim_evaluations", "التقييم الشامل بعد العودة", "التقييم العام الاختياري للموسم: أحد عشر بنداً (في season_ratings بمفاتيح eval-*) وملاحظات. لا يدخل في تقييم الإداريين. "
      "الكود لا يحفظ الملاحظات ولا علامة الإرسال؛ هنا تُحفظان.", [
        c("application_id", "BIGINT UNSIGNED", "الطلب", pk=True, fk="applications", od="CASCADE"),
        c("comments", "JSON", "ملاحظات حرة لكل بند {key: text}", null=True),
        c("submitted_at", "DATETIME(3)", "وقت الإرسال", null=True),
    ], new=True, src="app/portal/season/_components/evaluation.tsx"),

    T("ticket_kinds", "أنواع البلاغات", "نوع البلاغ ومهلة الاستجابة والجهة الافتراضية.", [
        c("code", "VARCHAR(20)", "النوع: missing، health، transport، meal، room، lost، complaint", pk=True),
        c("label", "VARCHAR(60)", "الاسم: missing «حاج مفقود»، health «حالة صحية»، transport «نقل / تأخر حافلة»، meal «وجبة / ماء»، room «خيمة / غرفة»، lost «مفقودات»، complaint «شكوى»"),
        c("sla_minutes", "SMALLINT UNSIGNED", "مهلة الاستجابة: missing 0 (فوري)، health 10، transport 30، meal و room و lost 120، complaint 240"),
        c("default_severity", enum("low", "medium", "high", "critical"), "الخطورة الافتراضية"),
        c("default_assignee_label", "VARCHAR(120)", "الجهة الافتراضية: «د. ليلى شمس — الفريق الطبي»، «فادي سلوم — غرفة العمليات»، «هيثم زيدان — فريق المواصلات»، «وسام خوري — مشرف البرج»…", null=True),
        code_ref("handling_permission", "permissions", "الصلاحية التي تعالجه (operations.tickets.PUT، medical.tickets.PUT، transport.tickets.PUT)", null=True, length=80),
    ], src="lib/store.ts:239 TicketKind؛ lib/data/staff-seed.ts:518 SLA_MINUTES، :528 KIND_LABELS"),

    T("tickets", "البلاغات", "بلاغ طوارئ أو شكوى أو مفقودات أو اعتراض: يفتحه الحاج (زر الطوارئ، الشكوى، المفقودات، الاعتراض على المراجعة)، أو فريق المجموعة («بلاغ لغرفة العمليات»)، "
      "أو النظام (تخلّف عن رحلة، تحويل رحلة). تعالجه غرفة العمليات والفريق الطبي والمواصلات.", [
        pk(), season(),
        c("ticket_no", "VARCHAR(16)", "رقم البلاغ المعروض (OR-1207 في البيانات الحالية). من number_sequences: الكود يولّده عشوائياً وقد يتكرر", uq=True),
        code_ref("kind", "ticket_kinds", "النوع", length=20),
        c("severity", enum("low", "medium", "high", "critical"), "الخطورة: low «منخفضة»، medium «متوسطة»، high «عالية»، critical «حرجة» (تُصعَّد إن لم تُغلق خلال 15 دقيقة)"),
        c("status", enum("open", "in_progress", "resolved"), "الحالة: open «مفتوح»، in_progress «قيد المعالجة»، resolved «تم الحل». «مغلق» محسوب: محلول وقيّمه صاحبه", d="'open'"),
        c("source", enum("pilgrim-sos", "pilgrim-complaint", "pilgrim-lost", "review-appeal", "group-team", "flights", "staff"),
          "المصدر: pilgrim-sos زر الطوارئ، pilgrim-complaint شكوى الحاج، pilgrim-lost المفقودات، review-appeal اعتراض على المراجعة، group-team فريق المجموعة، flights الطيران (تخلّف/تحويل)، staff موظف"),
        ref("application_id", "applications", "الطلب الذي رفعه (الحاج أو عن حاج معروف)", null=True),
        account("raised_by_account_id", "صاحب الحساب الذي رفعه (حاج أو إداري)", null=True),
        staff("raised_by_staff_id", "الموظف الذي رفعه"),
        c("subject_name", "VARCHAR(160)", "من يخصه: اسم الحاج، أو «المجموعة كاملة»، أو «حافلة 14 — تكتل العاصي»، أو رقم رحلة"),
        person("subject_national_id", "الحاج المعني إن كان فرداً من طلب", null=True),
        ref("group_id", "admin_groups", "المجموعة", null=True),
        ref("cluster_id", "clusters", "التكتل", null=True),
        ref("flight_id", "flights", "الرحلة (بلاغات الطيران)", null=True),
        c("location", "VARCHAR(300)", "المكان (يُملأ تلقائياً: الفندق والغرفة، الخيمة…)"),
        c("zone", enum("makkah", "mina", "arafat", "muzdalifah", "jamarat", "madinah", "other"), "المنطقة: «مكة — الفندق»، منى، عرفة، مزدلفة، الجمرات… الكود يستنتجها من نص المكان", d="'makkah'"),
        c("text", "TEXT", "الوصف (4 أحرف على الأقل للشكوى)"),
        file_("photo_file_id", "صورة مرفقة (الكود يكتفي بعلامة «مع صورة»)"),
        staff("assignee_staff_id", "الموظف المسند إليه"),
        c("assignee_label", "VARCHAR(160)", "الجهة المسندة كما تُعرض، مثل «الفريق الميداني للتكتل»", null=True),
        c("escalated_at", "DATETIME(3)", "وقت التصعيد للغرفة المركزية", null=True),
        c("resolved_at", "DATETIME(3)", "وقت الحل", null=True),
        c("rating", "TINYINT UNSIGNED", "تقييم صاحب البلاغ للاستجابة 1–5 (يغلقه)", null=True, ck="rating BETWEEN 1 AND 5"),
        c("reopened_count", "TINYINT UNSIGNED", "مرات إعادة الفتح («لا» بعد الحل)", d="0"),
        *stamps(),
    ], idx=[("status", "severity"), ("kind",), ("application_id",), ("group_id",)],
       src="lib/store.ts:240 Ticket؛ app/portal/season/_components/emergency.tsx، meals.tsx، lost.tsx؛ app/staff/operations",
       rules=["الطوارئ: health عالية «خلال 10 دقائق»؛ missing حرجة «فوري»؛ transport متوسطة «خلال 30 دقيقة»؛ وmeal تفتح نموذج الشكوى.",
              "المفقودات: النوع lost والخطورة منخفضة، ويُسأل عن الصاحب والمكان والوصف (3 أحرف لكل منها).",
              "ترتيب قائمة الغرفة: الحالة ثم الخطورة ثم الأحدث. ومهلة الاستجابة من ticket_kinds."]),

    T("ticket_updates", "سجل البلاغ", "الخط الزمني للبلاغ: الإسناد، كل تحديث، كل تغيير حالة، وإعادة الفتح.", [
        pk(), ref("ticket_id", "tickets", "البلاغ", od="CASCADE"),
        c("at", "DATETIME(3)", "الوقت", d="CURRENT_TIMESTAMP(3)"),
        c("author_kind", enum("staff", "account", "system"), "من كتب"),
        staff("author_staff_id", "الموظف"),
        account("author_account_id", "صاحب الحساب", null=True),
        c("author_name", "VARCHAR(160)", "الاسم المعروض (لقطة)"),
        c("text", "VARCHAR(1000)", "النص (3 أحرف على الأقل للتحديث)"),
        c("status_from", "VARCHAR(20)", "الحالة قبل (إن كان تغيير حالة)", null=True),
        c("status_to", "VARCHAR(20)", "الحالة بعد", null=True),
    ], src="Ticket.updates"),

    T("hajj_certificates", "شهادات أداء الحج", "«شهادة أداء فريضة الحج» لكل فرد، تُصدر بعد العودة. الكود يحسبها عند العرض؛ هنا تُصدر وتُخزَّن ليُتحقق منها من صفحة التحقق.", [
        pk(), ref("application_id", "applications", "الطلب"),
        person("national_id", "الحاج"),
        c("certificate_no", "VARCHAR(30)", "الرقم: {season}-C-{رقم الطلب:06}، ويُضاف -{n} للأفراد بعد الأول", uq=True),
        c("issued_at", "DATETIME(3)", "وقت الإصدار", d="CURRENT_TIMESTAMP(3)"),
        file_("file_id", "نسخة PDF إن وُلّدت"),
        c("revoked_at", "DATETIME(3)", "إلغاء الشهادة", null=True),
    ], uq=[("application_id", "national_id")], new=True, src="app/portal/season/_components (الشهادة مشتقة)"),
], flow=[
    "زر الطوارئ والشكوى والمفقودات وبلاغ فريق المجموعة كلها تكتب tickets، وكل معالجة تكتب ticket_updates.",
    "نجوم المراحل والوجبات والمشاعر والتقييم الشامل تكتب season_ratings، وملاحظات التقييم الشامل pilgrim_evaluations.",
    "بعد العودة تُصدر hajj_certificates، وتظهر في «خزنة الوثائق» ويُتحقق منها علناً.",
])
