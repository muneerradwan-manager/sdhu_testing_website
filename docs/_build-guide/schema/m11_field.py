# -*- coding: utf-8 -*-
from .dsl import *

AUDIENCE3 = enum("all", "men", "women")

MODULE = M("field", "العمل الميداني: المناسك والقناة والتقارير والدروس والنشاطات والقوائم", [
    "في الموسم يعمل فريق كل مجموعة على حجاجها: يسجّل المنسق التقني أو رئيس المجموعة أو معاونه أداء المناسك والمزارات ومحطات السفر بعد وقوعها، "
    "وينشر في قناة المجموعة، ويرسل كل فرد من الفريق تقريره اليومي إلى رئيس التكتل، ويرسل رئيس التكتل تقرير التكتل إلى الإدارة.",
    "والموجّه الديني والموجّهة يعقدان الدروس ويسجّلان الحضور، ويتابعان النشاطات (التحفيظ والأدعية والختمة) حاجاً حاجاً. "
    "ويوزّع المنسق التقني حجاج مجموعاته على حافلات المناسك وقوائم الروضة الشريفة، ويطلب حافلة إضافية من فريق المواصلات.",
    "رئيس التكتل ومعاونه ومحاسبه يطّلعون ولا يسجّلون. والحاج يرى ما يخصه: أداء المناسك في «أداء المناسك»، والدروس والنشاطات، و«قوائمي».",
], [
    T("field_record_kinds", "أنواع سجلات الميدان", "قائمة المناسك والمزارات ومحطات السفر التي تُسجَّل.", [
        c("code", "VARCHAR(30)", "المفتاح: المناسك umrah، tarwiya، arafat، muzdalifa، jamarat، ifada، halq، mina، farewell؛ المزارات v-hira … v-mushaf (21)؛ السفر t-gather … t-home (10)", pk=True),
        c("category", enum("rites", "visits", "travel"), "الفئة: rites «أداء المناسك»، visits «المزارات»، travel «السفر»"),
        c("label", "VARCHAR(120)", "الاسم: «عمرة التمتّع»، «يوم التروية في منى»، «الوقوف بعرفة»، «المبيت في مزدلفة»، «رمي الجمرات»، «طواف الإفاضة والسعي»، «الحلق أو التقصير»، «المبيت في منى أيام التشريق»، «طواف الوداع»…"),
        c("mode", enum("done", "muzdalifa", "jamarat", "mina"), "طريقة التسجيل: done أدّاه أو لا؛ muzdalifa بمستوى المبيت (none «لم يحقق المبيت»، midnight «حتى منتصف الليل»، fajr «حتى صلاة الفجر»)؛ jamarat بالجمرات (sughra، wusta، aqaba) لكل يوم 10–13؛ mina بالليالي 11، 12، 13", d="'done'"),
        c("city", enum("makkah", "madinah"), "مدينة المزار", null=True),
        c("absence_reason_required", "TINYINT(1)", "كل من لم يؤدِّه يحتاج سبباً (المناسك والسفر نعم، المزارات لا، والعمرة الثانية فما بعد اختيارية)", d="1"),
        c("sort_order", "SMALLINT", "الترتيب", d="0"),
    ], src="lib/musters.ts RITES، VISITS، TRAVEL، MUZDALIFA_LEVELS، JAMARAT، JAMARAT_DAYS، MINA_NIGHTS"),

    T("field_records", "سجلات الميدان", "تسجيل منسك أو مزار أو محطة سفر لمجموعة بعد وقوعه، بمكانه ووقته ومن أدّاه.", [
        pk(), ref("group_id", "admin_groups", "المجموعة"),
        code_ref("kind_code", "field_record_kinds", "النوع", length=30),
        c("title", "VARCHAR(160)", "العنوان المعروض: اسم المنسك، أو «عمرة التمتّع/العمرة الثانية…»، أو «رمي الجمرات — يوم النحر — 10 ذو الحجة»"),
        c("jamarat_day", "TINYINT UNSIGNED", "يوم الرمي (10–13) لرمي الجمرات (الكود يضمّنه في العنوان)", null=True),
        c("umrah_ordinal", "TINYINT UNSIGNED", "ترتيب العمرة (1 = عمرة التمتّع)", null=True),
        c("place", "VARCHAR(200)", "المكان (إلزامي)"),
        c("done_at", "DATETIME(3)", "وقت الأداء (لا يُسجَّل قبل وقوعه: ≤ الآن + 60 ثانية)"),
        c("required", "TINYINT(1)", "سجل إلزامي (يتطلب سبباً لكل من لم يؤدِّه)", d="1"),
        account("recorded_by_account_id", "من سجّله (المنسق أو رئيس المجموعة أو معاونه)"),
        c("recorded_by_role", "VARCHAR(80)", "صفته وقت التسجيل"),
        ref("flight_id", "flights", "الرحلة لمحطة سفر (الكود يعرّفه ولا يكتبه)", null=True),
        c("recorded_at", "DATETIME(3)", "وقت التسجيل", d="CURRENT_TIMESTAMP(3)"),
        c("deleted_at", "DATETIME(3)", "حذفه كاتبه", null=True),
    ], idx=[("group_id", "kind_code")], src="AdminProfile.musters (lib/store.ts:590)؛ app/portal/(admin)/field/field.tsx RiteTool",
       rules=["في الكود يُحفظ السجل على ملف كاتبه؛ هنا على المجموعة فيراه فريقها كله والحجاج.",
              "يحذفه كاتبه فقط، وهو قادر على العمل في المجموعة."]),

    T("field_record_persons", "من أدّى ومن لم يؤدِّ", "لكل حاج في المجموعة: أدّى أو لا، وسبب عدم الأداء، وتفاصيل الدرجات.", [
        ref("record_id", "field_records", "السجل", od="CASCADE"),
        person("national_id", "الحاج"),
        c("performed", "TINYINT(1)", "أدّاه"),
        c("absence_reason", "VARCHAR(200)", "السبب: «مريض — في العيادة أو في الفندق»، «أدّاه وحده أو مع مجموعة أخرى»، «وكّل غيره (كبار السن والمرضى)»، «مع مرافقه المريض»، «تأخّر عن المجموعة ولحق بها»، «لم يُعثر عليه — أُبلغت غرفة العمليات»، أو نص آخر", null=True),
        c("detail", "JSON", "الدرجات بحسب الطريقة: [\"fajr\"] لمزدلفة، [\"sughra\",\"wusta\",\"aqaba\"] للجمرات، [\"11\",\"12\"] لليالي منى", null=True),
    ], uq=[("record_id", "national_id")], src="Muster.present، absent، detail"),

    T("group_posts", "قناة المجموعة", "إعلان ينشره فريق المجموعة لحجاجها أو فئة منهم.", [
        pk(), ref("group_id", "admin_groups", "المجموعة", od="CASCADE"),
        account("author_account_id", "الناشر (رئيس المجموعة أو المنسق أو الموجّه)"),
        c("text", "VARCHAR(280)", "النص (280 حرفاً حداً). قوالب جاهزة: درس، تجمّع، وجبات، رحلة"),
        c("audience", enum("all", "men", "women", "elderly"), "الجمهور: all «المجموعة كاملة»، men «الرجال»، women «السيدات»، elderly «كبار السن ومرافقوهم» (من بلغ 69 أو له مرافق)"),
        c("posted_at", "DATETIME(3)", "الوقت", d="CURRENT_TIMESTAMP(3)"),
    ], idx=[("group_id", "posted_at")], src="lib/store.ts:433 GroupPost؛ lib/group-channel.ts forFamily",
       rules=["تُعرض للعائلة إن كان فيها من يطابق الجمهور. تظهر في «مجموعتي» وفي الإشعارات."]),

    T("daily_reports", "التقارير اليومية", "تقرير «يومي»: كل من يعمل في المجموعة يرسل تقريره عنها إلى رئيس التكتل، ورئيس التكتل أو معاونه يرسل تقرير التكتل إلى الإدارة (غرفة العمليات).", [
        pk(),
        c("report_day", "DATE", "اليوم"),
        account("author_account_id", "المرسل"),
        c("author_role", "VARCHAR(80)", "صفته: رئيس المجموعة، المعاون، الموجّه، المنسق، «رئيس التكتل»، «معاون التكتل»"),
        c("target", enum("cluster", "administration"), "إلى: cluster رئيس التكتل، administration الإدارة"),
        ref("cluster_id", "clusters", "التكتل"),
        ref("group_id", "admin_groups", "المجموعة (لتقارير المجموعات)", null=True),
        c("general_status", "VARCHAR(500)", "الحالة العامة («مستقرة»؛ وفي تقرير التكتل يُضاف «وصل n من m تقريراً من k مجموعات»)"),
        c("health", "VARCHAR(500)", "الحالات الصحية"),
        c("complaints", "VARCHAR(500)", "الشكاوى"),
        c("notes", "VARCHAR(1000)", "ملاحظات", null=True),
        c("sent_at", "DATETIME(3)", "وقت الإرسال", d="CURRENT_TIMESTAMP(3)"),
        c("read_at", "DATETIME(3)", "أول قراءة («قرأه … الساعة …»)", null=True),
        c("read_by_kind", enum("account", "staff"), "من قرأه: رئيس التكتل أو موظف الإدارة", null=True),
        account("read_by_account_id", "رئيس التكتل القارئ", null=True),
        staff("read_by_staff_id", "الموظف القارئ"),
    ], uq=[("report_day", "author_account_id", "group_id")], idx=[("cluster_id", "report_day")],
       src="lib/store.ts:728 DailyReport؛ lib/daily-reports.ts؛ field.tsx DayPlan، ClusterDay",
       rules=["تقرير واحد لكل مرسل ومجموعة ويوم؛ وتقرير واحد للتكتل في اليوم أياً كان مرسله.",
              "حين يُترك الصحي أو الشكاوى فارغاً في تقرير التكتل يُملأ من تقارير المجموعات."]),

    T("lesson_topics", "موضوعات الدروس", "الموضوعات الإحدى عشرة التي يختار منها الموجّه موضوع درسه.", [
        c("code", "VARCHAR(40)", "المفتاح", pk=True),
        c("label", "VARCHAR(120)", "الموضوع: «أحكام الإحرام ومحظوراته» … «التوبة وآداب الرحلة»"),
        c("sort_order", "TINYINT", "الترتيب", d="0"),
    ], src="lib/lessons.ts TOPICS"),

    T("group_lessons", "الدروس الدينية", "درس يعقده الموجّه لمجموعته أو الموجّهة لنساء التكتل، بموعده ومكانه وجمهوره، ثم يُسجَّل حضوره.", [
        pk(), ref("cluster_id", "clusters", "التكتل", null=True),
        account("author_account_id", "الموجّه أو الموجّهة"),
        c("author_role", enum("guide", "guide-f"), "guide «موجّه المجموعة» (للرجال أو للجميع)، guide-f «موجّهة التكتل» (للنساء)"),
        c("title", "VARCHAR(160)", "العنوان"),
        code_ref("topic_code", "lesson_topics", "الموضوع"),
        c("stage", enum("pretravel", "makkah", "mashaer", "madinah"), "المرحلة: pretravel «قبل السفر»، makkah «في مكة»، mashaer «في المشاعر»، madinah «في المدينة»"),
        c("starts_at", "DATETIME(3)", "الموعد"),
        c("minutes", "SMALLINT UNSIGNED", "المدة (30، 45، 60، 75، 90، 120)"),
        c("place", "VARCHAR(200)", "المكان"),
        c("audience", AUDIENCE3, "all «للجميع»، men «للرجال»، women «للنساء»"),
        c("summary", "TEXT", "ملخص بعد الدرس", null=True),
        c("roll_opened_at", "DATETIME(3)", "فتح الحضور", null=True),
        c("roll_closed_at", "DATETIME(3)", "إغلاق الحضور وتسجيله", null=True),
        c("audience_size", "SMALLINT UNSIGNED", "عدد المدعوين وقت الإغلاق", null=True),
        c("cancelled_at", "DATETIME(3)", "أُلغي", null=True),
        c("cancel_reason", "VARCHAR(300)", "سبب الإلغاء (3 أحرف على الأقل)", null=True),
        *stamps(),
    ], src="lib/lessons.ts GroupLesson، lessonsActions؛ app/portal/(admin)/guide-lessons",
       rules=["الحالة محسوبة: upcoming «قادم»، open «الحضور مفتوح»، unrecorded «لم يُسجَّل حضوره»، done «انتهى»، cancelled «ملغى».",
              "يعدّله كاتبه فقط، وهو قادم أو لم يُسجَّل حضوره. ويراه الحاج بعد التحاقه بالمجموعة."]),

    T("lesson_groups", "مجموعات الدرس", "المجموعات المدعوة إلى الدرس.", [
        ref("lesson_id", "group_lessons", "الدرس", od="CASCADE"),
        ref("group_id", "admin_groups", "المجموعة"),
    ], uq=[("lesson_id", "group_id")]),

    T("lesson_interest", "سنحضر", "أفراد العائلة الذين أعلن الحاج حضورهم («سنحضر درس: …»).", [
        ref("lesson_id", "group_lessons", "الدرس", od="CASCADE"),
        person("national_id", "الفرد"),
        account("by_account_id", "الحاج الذي أعلن"),
        c("at", "DATETIME(3)", "الوقت", d="CURRENT_TIMESTAMP(3)"),
    ], uq=[("lesson_id", "national_id")], src="GroupLesson.interested"),

    T("lesson_attendance", "حضور الدرس", "من حضر فعلاً كما سجّله الموجّه.", [
        ref("lesson_id", "group_lessons", "الدرس", od="CASCADE"),
        person("national_id", "الحاضر"),
        c("marked_at", "DATETIME(3)", "وقت التسجيل", d="CURRENT_TIMESTAMP(3)"),
    ], uq=[("lesson_id", "national_id")], src="GroupLesson.present"),

    T("religious_activities", "النشاطات الدينية", "نشاط يتابعه الموجّه حاجاً حاجاً: تحفيظ القرآن (صفحات)، تحفيظ الحديث (الأربعون النووية)، حفظ أدعية الحج والعمرة، ختمة جماعية (أجزاء).", [
        pk(), ref("cluster_id", "clusters", "التكتل", null=True),
        account("author_account_id", "الموجّه أو الموجّهة"),
        c("author_role", enum("guide", "guide-f"), "الصفة"),
        c("kind", enum("quran", "hadith", "adhkar", "khatma"), "quran «تحفيظ القرآن»، hadith «تحفيظ الحديث»، adhkar «حفظ أدعية الحج والعمرة»، khatma «ختمة جماعية»"),
        c("title", "VARCHAR(160)", "العنوان («تحفيظ جزء عمّ»، «الأربعون النووية»…)"),
        c("goal", "VARCHAR(300)", "الهدف (نص مشتق من الوحدات)"),
        c("audience", AUDIENCE3, "الجمهور"),
        c("schedule", "VARCHAR(160)", "المواعيد"),
        c("place", "VARCHAR(200)", "المكان"),
        c("starts_on", "DATE", "تاريخ البدء"),
        c("closed_at", "DATETIME(3)", "أُغلق", null=True),
        created(),
    ], src="lib/religious.ts Activity، activitiesActions"),

    T("activity_groups", "مجموعات النشاط", "المجموعات المشاركة.", [
        ref("activity_id", "religious_activities", "النشاط", od="CASCADE"),
        ref("group_id", "admin_groups", "المجموعة"),
    ], uq=[("activity_id", "group_id")]),

    T("activity_units", "وحدات النشاط", "ما يُحفظ أو يُقرأ: صفحات القرآن p<n> (1–604)، الأحاديث h<n> (1–42)، الأدعية (safar، talbiya، masjid، tawaf، safa، arafah، takbir، zamzam، ziyarah، sabah)، الأجزاء j1..j30.", [
        ref("activity_id", "religious_activities", "النشاط", od="CASCADE"),
        c("unit_key", "VARCHAR(20)", "الوحدة"),
        c("sort_order", "SMALLINT", "الترتيب"),
    ], uq=[("activity_id", "unit_key")], src="Activity.units؛ lib/data/quran.ts"),

    T("activity_participants", "المشاركون في النشاط", "من انضم ومن غادر.", [
        ref("activity_id", "religious_activities", "النشاط", od="CASCADE"),
        person("national_id", "الحاج"),
        c("joined_at", "DATETIME(3)", "الانضمام", d="CURRENT_TIMESTAMP(3)"),
        c("left_at", "DATETIME(3)", "المغادرة", null=True),
        c("joined_by_kind", enum("pilgrim", "guide"), "ضمّه الحاج من بوابته أو الموجّه"),
    ], uq=[("activity_id", "national_id")], src="Activity.joined، left"),

    T("activity_progress", "تقدّم كل حاج", "كل وحدة أتمّها الحاج وتقديرها.", [
        ref("activity_id", "religious_activities", "النشاط", od="CASCADE"),
        person("national_id", "الحاج"),
        c("unit_key", "VARCHAR(20)", "الوحدة"),
        c("grade", enum("excellent", "vgood", "good", "review"), "excellent «ممتاز»، vgood «جيد جداً»، good «جيد»، review «يحتاج مراجعة» (الختمة دائماً ممتاز)"),
        c("at", "DATETIME(3)", "الوقت", d="CURRENT_TIMESTAMP(3)"),
    ], uq=[("activity_id", "national_id", "unit_key")], src="Activity.progress"),

    T("activity_sittings", "جلسات التسميع", "جلسة تسميع: ما سمّعه الحاج وتقديره وملاحظة الموجّه.", [
        pk(), ref("activity_id", "religious_activities", "النشاط", od="CASCADE"),
        person("national_id", "الحاج"),
        c("units", "JSON", "الوحدات المسمَّعة (وحدة واحدة على الأقل)"),
        c("grade", enum("excellent", "vgood", "good", "review"), "التقدير"),
        c("note", "VARCHAR(500)", "ملاحظة", null=True),
        account("by_account_id", "الموجّه"),
        c("at", "DATETIME(3)", "الوقت", d="CURRENT_TIMESTAMP(3)"),
    ], src="Activity.sittings"),

    T("rite_list_kinds", "أنواع القوائم", "قوائم ما قبل كل منسك: حافلات أو قوائم الروضة.", [
        c("code", "VARCHAR(20)", "المفتاح: tarwiya، arafat، mina، madinah، rawdah", pk=True),
        c("label", "VARCHAR(80)", "الاسم: «التروية»، «عرفة»، «منى أيام التشريق»، «الذهاب إلى المدينة المنورة»، «حجز الروضة الشريفة»"),
        c("description", "VARCHAR(300)", "الشرح («من الفندق في مكة إلى مخيم المجموعة في منى، يوم الثامن.»…)"),
        c("when_label", "VARCHAR(80)", "الموعد («8 ذو الحجة — بعد صلاة الفجر»…)"),
        c("unit_label", "VARCHAR(20)", "الوحدة: «حافلة» أو «قائمة»"),
    ], src="lib/rite-lists.ts:15 ListKind"),

    T("rite_list_units", "الحافلات وقوائم الروضة", "حافلة لكل 49 مقعداً من حجاج التكتل وفريقه، أو قائمتا الروضة (للرجال وللنساء). يضيفها فريق المواصلات ويزيلها.", [
        pk(), ref("cluster_id", "clusters", "التكتل", od="CASCADE"),
        code_ref("kind_code", "rite_list_kinds", "القائمة", length=20),
        c("label", "VARCHAR(80)", "الاسم: «حافلة 1»، «الروضة الشريفة — الرجال/النساء»"),
        c("plate", "VARCHAR(30)", "لوحة الحافلة (أو مكان الروضة)", null=True),
        c("driver_name", "VARCHAR(80)", "السائق", null=True),
        c("driver_phone", "VARCHAR(20)", "هاتفه", null=True),
        c("when_label", "VARCHAR(80)", "الموعد"),
        c("seats", "SMALLINT UNSIGNED", "المقاعد (49 للحافلة)", ck="seats > 0"),
        c("gender", enum("M", "F"), "لقائمة الروضة: الرجال أو النساء", null=True),
        c("is_planned", "TINYINT(1)", "من خطة التكتل الأساسية (عدد الحافلات = سقف (الحجاج + 4 لكل مجموعة) ÷ 49)", d="1"),
        staff("created_by_staff_id", "من أضافها من فريق المواصلات"),
        c("removed_at", "DATETIME(3)", "أُزيلت (يُنزل كل من عليها)", null=True),
        created(),
    ], src="lib/rite-lists.ts ListUnit، plannedUnits؛ app/staff/transport/buses.tsx"),

    T("rite_list_seats", "من على كل حافلة أو قائمة", "يوزّع المنسق التقني حجاج مجموعاته (والإداريين) على الحافلات وقوائم الروضة.", [
        ref("unit_id", "rite_list_units", "الحافلة أو القائمة", od="CASCADE"),
        ref("cluster_id", "clusters", "التكتل (مكرر لفرض الفرادة)"),
        code_ref("kind_code", "rite_list_kinds", "القائمة (مكررة لفرض الفرادة)", length=20),
        person("national_id", "الراكب (حاج أو إداري)"),
        account("seated_by_account_id", "المنسق الذي وزّعه"),
        c("seated_at", "DATETIME(3)", "الوقت", d="CURRENT_TIMESTAMP(3)"),
    ], uq=[("cluster_id", "kind_code", "national_id")], src="ListsState.seats؛ listsActions.seat",
       rules=["الشخص على وحدة واحدة في كل قائمة: وضعه على حافلة ينزله عن غيرها في القائمة نفسها. والعدد لا يتجاوز المقاعد، وقائمة الروضة بجنسها."]),

    T("bus_requests", "طلبات الحافلات الإضافية", "يطلب المنسق حافلة إضافية حين يبقى حجاج بلا مقعد، فيعتمدها فريق المواصلات (فتُنشأ «حافلة N» بـ49 مقعداً) أو يرفضها بسبب.", [
        pk(), ref("cluster_id", "clusters", "التكتل"),
        code_ref("kind_code", "rite_list_kinds", "القائمة", length=20),
        c("people_count", "SMALLINT UNSIGNED", "عدد من بلا مقعد", ck="people_count > 0"),
        c("note", "VARCHAR(500)", "ملاحظة", null=True),
        account("requested_by_account_id", "المنسق"),
        c("requested_at", "DATETIME(3)", "الوقت", d="CURRENT_TIMESTAMP(3)"),
        c("status", enum("pending", "approved", "rejected"), "pending «عند فريق المواصلات»، approved «أُسندت …»، rejected «رُفض: …»", d="'pending'"),
        staff("decided_by_staff_id", "من قرر (صلاحية transport)"),
        c("decided_at", "DATETIME(3)", "الوقت", null=True),
        c("reason", "VARCHAR(300)", "سبب الرفض (إلزامي عند الرفض)", null=True),
        ref("unit_id", "rite_list_units", "الحافلة المنشأة عند الاعتماد", null=True),
    ], src="lib/rite-lists.ts:44 BusRequest؛ approveBus، rejectBus",
       rules=["لا يطلب المنسق وله طلب معلّق في القائمة نفسها."]),
], flow=[
    "يسجّل فريق المجموعة كل منسك أو مزار أو محطة (field_records + field_record_persons)؛ يقرؤها الحاج في «أداء المناسك» وتغذي التقييم «الالتزام بالمراحل».",
    "ينشر الفريق في group_posts، ويرسل daily_reports يومياً إلى رئيس التكتل، وهذا إلى الإدارة.",
    "يعقد الموجّه group_lessons (المدعوون lesson_groups، والمعلنون lesson_interest، والحاضرون lesson_attendance)، ويتابع religious_activities.",
    "يوزّع المنسق الركاب على rite_list_units عبر rite_list_seats، ويطلب bus_requests عند النقص.",
])
