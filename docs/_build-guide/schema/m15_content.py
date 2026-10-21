# -*- coding: utf-8 -*-
from .dsl import *

PUB = enum("draft", "published", "archived")
PUB_DESC = "حالة النشر: draft «مسودة»، published «منشورة»، archived «مؤرشفة» (لا يُحذف شيء من الموقع نهائياً)"


def publishing():
    return [c("status", PUB, PUB_DESC, d="'draft'"),
            c("pending_changes", "JSON", "تعديلات تنتظر النشر على عنصر منشور: يبقى المنشور ظاهراً حتى «نشر»، فتُطبَّق ويُفرَّغ العمود", null=True),
            c("pending_sort_order", "INT", "ترتيب جديد ينتظر النشر", null=True),
            staff("created_by_staff_id", "من أنشأه (للعناصر التي ينشئها المحررون)"),
            c("published_at", "DATETIME(3)", "وقت النشر", null=True),
            staff("published_by_staff_id", "من نشر"),
            c("sort_order", "INT", "الترتيب في القوائم", d="0"),
            staff("updated_by_staff_id", "آخر من عدّل"),
            *stamps()]


MODULE = M("content", "المحتوى العام والأكاديمية: الأخبار والأسئلة ودليل المناسك والدروس", [
    "هذه أنواع المحتوى التي لها شكل ثابت وعلاقات: الأخبار (ولها تعليقات من أصحاب الحسابات)، الأسئلة الشائعة، أيام دليل المناسك وأدعيته، "
    "مسارات الأكاديمية ومستوياتها ودروسها واختباراتها (ولكل حساب تقدّمه وشهاداته)، مدن مواقيت الصلاة، نماذج الجولة ثلاثية الأبعاد، وقوائم صفحة التحقق.",
    "في النسخة التجريبية بعضها «مجموعات» في نظام المحتوى (الأخبار، الأسئلة، أيام الدليل، الأدعية، المسارات، الدروس، التكتلات) تُحرَّر من «إدارة محتوى الموقع»، "
    "وبعضها مكتوب في الكود لا يُحرَّر (المحاضرون، أسئلة الاختبارات، أجزاء من دليل المناسك، المدن، النماذج). هنا كلها جداول تُحرَّر، "
    "وتمر بالنشر نفسه (مسودة ← منشور ← مؤرشف)، وتُحفظ نسخها السابقة في cms_revisions، وترجماتها في content_translations.",
], [
    T("content_translations", "ترجمات المحتوى", "النص الإنجليزي (ولغات أخرى لاحقاً) لأي حقل في أي جدول محتوى. العربي في الجدول نفسه، والترجمة هنا حقلاً حقلاً. "
      "في النسخة التجريبية الإنجليزية مكتوبة في الكود (lib/cms/en) فلا يحررها الموظفون، وتبقى قديمة حين يتغير العربي.", [
        pk(),
        c("entity_type", "VARCHAR(40)", "الجدول: news_articles، faqs، guide_days، academy_lessons، cms_field_values…"),
        c("entity_id", "VARCHAR(64)", "معرّف الصف"),
        c("field", "VARCHAR(60)", "الحقل"),
        c("locale", "VARCHAR(5)", "اللغة (en)", d="'en'"),
        c("value", "MEDIUMTEXT", "النص المترجم (أو JSON للحقول المركبة)"),
        c("source_hash", "CHAR(64)", "بصمة النص العربي وقت الترجمة: إن تغيّر العربي تُعلَّم الترجمة قديمة", null=True),
        staff("updated_by_staff_id", "آخر من عدّل"),
        updated(),
    ], uq=[("entity_type", "entity_id", "field", "locale")], new=True, src="lib/cms/en/*؛ store.ts inEnglish (المفاتيح <key>@en لا تكتبها أي واجهة)"),

    T("news_categories", "تصنيفات الأخبار", "تصنيف كل خبر ولونه.", [
        c("code", "VARCHAR(30)", "المفتاح", pk=True),
        c("label", "VARCHAR(60)", "الاسم: «إعلانات رسمية»، «قرارات»، «تعاميم»، «أخبار الموسم»، «توعية»", uq=True),
        c("tone", enum("green", "gold", "maroon"), "اللون"),
        c("sort_order", "TINYINT", "الترتيب", d="0"),
    ], src="lib/data/news.ts:6 CATEGORIES، :619 CATEGORY_TONE"),

    T("news_articles", "الأخبار والإعلانات", "مقال في «الأخبار والإعلانات»، يظهر منه آخر الأخبار في الرئيسية وشريط العاجل.", [
        pk(),
        c("slug", "VARCHAR(120)", "رابط المقال /news/<slug>", uq=True),
        c("title", "VARCHAR(300)", "العنوان"),
        code_ref("category_code", "news_categories", "التصنيف", length=30),
        file_("image_file_id", "الصورة"),
        c("excerpt", "TEXT", "المقتطف"),
        c("published_on", "DATE", "تاريخ الخبر (يُرتَّب به تنازلياً)"),
        c("hijri_label", "VARCHAR(60)", "التاريخ الهجري المعروض", null=True),
        c("gregorian_label", "VARCHAR(60)", "التاريخ الميلادي المعروض", null=True),
        c("author", "VARCHAR(120)", "الكاتب", null=True),
        c("department", "VARCHAR(120)", "الجهة المصدِرة", null=True),
        c("views", "INT UNSIGNED", "عدد القراءات (عدّاد فعلي؛ الكود يكتبه يدوياً)", d="0"),
        c("pinned", "TINYINT(1)", "مثبّت", d="0"),
        c("ticker_text", "VARCHAR(300)", "نص الشريط العاجل", null=True),
        c("body", "JSON", "جسم المقال كتلاً: p «فقرة» {text}، h «عنوان فرعي» {text}، list «قائمة» {items[], ordered}، callout «تنبيه» {title, text, tone: gold|maroon|green}، table «جدول» {caption, head[], rows[][]}، quote «اقتباس» {text, by}"),
        *publishing(),
    ], idx=[("status", "published_on")], src="lib/data/news.ts ARTICLES؛ lib/cms/collections.ts:45 news؛ app/staff/content/_components/blocks.tsx",
       rules=["مدة القراءة محسوبة = max(2, round(الكلمات ÷ 130)). والأخبار ذات الصلة: نفس التصنيف 3 نقاط + نقطة لكل وسم مشترك. والأكثر قراءة بالعدّاد."]),

    T("news_tags", "الوسوم", "وسوم الأخبار.", [
        pk(), c("name", "VARCHAR(60)", "الوسم", uq=True),
    ], src="Article.tags"),

    T("news_article_tags", "وسوم كل خبر", "ربط الأخبار بوسومها.", [
        ref("article_id", "news_articles", "الخبر", od="CASCADE"),
        ref("tag_id", "news_tags", "الوسم", od="CASCADE"),
    ], uq=[("article_id", "tag_id")]),

    T("news_comments", "التعليقات على الأخبار", "يعلّق أي صاحب حساب (حاج، أو إداري، أو عضو لم يختر مساراً) تحت الخبر، ويحذف تعليقه بنفسه.", [
        pk(), ref("article_id", "news_articles", "الخبر", od="CASCADE"),
        account("account_id", "الكاتب"),
        c("author_name", "VARCHAR(120)", "الاسم وقت الكتابة (الأول والكنية)"),
        c("text", "VARCHAR(500)", "النص (500 حرف حداً)"),
        c("status", enum("visible", "hidden", "removed"), "visible ظاهر، hidden أخفاه مشرف المحتوى، removed حذفه كاتبه", d="'visible'"),
        staff("moderated_by_staff_id", "مشرف المحتوى الذي أخفاه (مقترح: لا إشراف في الكود)"),
        created(),
    ], idx=[("article_id", "created_at")], src="lib/store.ts:749 NewsComment؛ app/news/_components/article-comments.tsx"),

    T("news_feedback", "«هل كان هذا مفيداً؟»", "تقييم القارئ للخبر. الكود يعرضه ولا يحفظه.", [
        pk(), ref("article_id", "news_articles", "الخبر", od="CASCADE"),
        account("account_id", "القارئ إن كان داخلاً", null=True),
        c("helpful", "TINYINT(1)", "مفيد"),
        created(),
    ], new=True),

    T("faq_categories", "تصنيفات الأسئلة الشائعة", "تصنيفات صفحة الأسئلة الشائعة.", [
        c("code", "VARCHAR(30)", "المفتاح", pk=True),
        c("label", "VARCHAR(60)", "الاسم: «التسجيل»، «الشروط»، «القبول والقرعة»، «التكاليف والدفع»، «الخدمات والتحقق»", uq=True),
        c("sort_order", "TINYINT", "الترتيب", d="0"),
    ], src="lib/data/faq.ts FAQ_CATEGORIES"),

    T("faqs", "الأسئلة الشائعة", "سؤال وجوابه.", [
        pk(), code_ref("category_code", "faq_categories", "التصنيف", length=30),
        c("question", "TEXT", "السؤال"),
        c("answer", "TEXT", "الجواب"),
        *publishing(),
    ], src="lib/data/faq.ts FAQS؛ collections.ts:99 faq"),

    T("guide_days", "أيام دليل المناسك", "أيام الحج الخمسة في «دليل المناسك»: التروية، عرفة، مزدلفة، النحر، التشريق.", [
        pk(),
        c("slug", "VARCHAR(40)", "المفتاح: tarwiyah، arafah، muzdalifah، nahr، tashreeq", uq=True),
        c("name", "VARCHAR(80)", "الاسم"),
        c("day_label", "VARCHAR(20)", "رقم اليوم"),
        c("hijri_label", "VARCHAR(40)", "التاريخ الهجري"),
        file_("image_file_id", "الصورة"),
        c("intro", "TEXT", "المقدمة"),
        c("place_label", "VARCHAR(120)", "المكان"),
        c("place_lat", "DECIMAL(9,6)", "خط العرض"),
        c("place_lng", "DECIMAL(9,6)", "خط الطول"),
        c("place_zoom", "TINYINT UNSIGNED", "تقريب الخريطة", null=True),
        c("dua_title", "VARCHAR(160)", "عنوان دعاء اليوم", null=True),
        c("dua_text", "TEXT", "نص الدعاء", null=True),
        ref("lesson_id", "academy_lessons", "درس الأكاديمية المرتبط («تريد فهماً أعمق؟»)", null=True),
        *publishing(),
    ], src="lib/data/guide.ts DAYS؛ collections.ts:122 guideDays"),

    T("guide_day_tasks", "أعمال اليوم", "قائمة أعمال كل يوم.", [
        pk(), ref("day_id", "guide_days", "اليوم", od="CASCADE"),
        c("sort_order", "TINYINT", "الترتيب"),
        c("text", "TEXT", "العمل"),
    ]),

    T("guide_day_times", "مواقيت اليوم", "مواقيت كل يوم.", [
        pk(), ref("day_id", "guide_days", "اليوم", od="CASCADE"),
        c("sort_order", "TINYINT", "الترتيب"),
        c("time_label", "VARCHAR(10)", "الوقت («08:00»)"),
        c("label", "VARCHAR(160)", "الحدث"),
    ]),

    T("guide_duas", "أدعية دليل المناسك", "أدعية المناسك ومتى تقال ومصدرها.", [
        pk(),
        c("title", "VARCHAR(160)", "العنوان"),
        c("when_said", "VARCHAR(160)", "متى يُقال؟"),
        c("text", "TEXT", "الدعاء"),
        c("source", "VARCHAR(160)", "المصدر", null=True),
        *publishing(),
    ], src="lib/data/guide.ts:224 GUIDE_DUAS"),

    T("guide_items", "قوائم دليل المناسك الأخرى", "قوائم الدليل المكتوبة في الكود اليوم، صفاً لكل عنصر بنوع قائمته وبياناته: المقارنة بين الأنساك، محظورات الإحرام، أشواط الطواف وأدعيتها، أشواط السعي، حقيبة الحاج، النصائح الصحية، علامات ضربة الشمس.", [
        pk(),
        c("list_key", enum("nusuk", "nusuk_rows", "prohibitions", "tawaf_rounds", "sai_laps", "packing", "health_tips", "heatstroke_signs", "haram_point"),
          "القائمة: nusuk الأنساك الثلاثة (تمتع، قران، إفراد)، nusuk_rows صفوف المقارنة، prohibitions «محظورات الإحرام» (لمن: الجميع/الرجال/النساء)، tawaf_rounds الأشواط السبعة، sai_laps أشواط السعي، packing «حقيبة الحاج» بمجموعاتها، health_tips النصائح الصحية، heatstroke_signs علامات ضربة الشمس، haram_point نقطة الحرم على الخريطة"),
        c("data", "JSON", "بيانات العنصر بحسب القائمة، مثل {icon, title, body, who} للمحظورات أو {id, label, note, group} للحقيبة"),
        *publishing(),
    ], new=True, src="lib/data/guide.ts NUSUK، NUSUK_ROWS، PROHIBITIONS، TAWAF_ROUNDS، SAI_LAPS، PACKING، HEALTH_TIPS، HEATSTROKE_SIGNS"),

    T("academy_lecturers", "محاضرو الأكاديمية", "المحاضرون السبعة.", [
        c("code", "VARCHAR(20)", "المفتاح: abdulrahman، khaled، huda، nour، ahmad، samer، reem", pk=True),
        c("name", "VARCHAR(80)", "الاسم: «الشيخ عبد الرحمن»، «الشيخ خالد»، «د. هدى»، «أ. نور»، «الشيخ أحمد»، «د. سامر»، «م. ريم»"),
        c("role", "VARCHAR(160)", "الصفة"),
        c("bio", "TEXT", "النبذة"),
        c("initials", "VARCHAR(4)", "الحرف الرمزي"),
        file_("photo_file_id", "الصورة"),
    ], src="lib/data/academy.ts:66 Lecturer"),

    T("academy_tracks", "مسارات الأكاديمية", "المسارات الستة: فقه الحج، فقه العمرة، آداب الرحلة، المدينة المنورة، الأدعية، الاستعداد.", [
        pk(),
        c("slug", "VARCHAR(40)", "الرابط /academy/<slug>: hajj-fiqh، umrah-fiqh، journey-ethics، madinah، duas، preparation", uq=True),
        c("title", "VARCHAR(120)", "العنوان"),
        c("short", "TEXT", "الوصف المختصر"),
        c("description", "TEXT", "الوصف"),
        file_("image_file_id", "الصورة"),
        c("icon", enum("kaaba", "umrah", "heart", "madinah", "dua", "bag"), "الأيقونة: الكعبة، العمرة، القلب، المدينة، الدعاء، الحقيبة"),
        c("tone", enum("green", "gold", "maroon"), "اللون"),
        c("gallery_file_ids", "JSON", "معرض الصور", null=True),
        *publishing(),
    ], src="lib/data/academy.ts:1517 TRACKS؛ collections.ts:302 academyTracks"),

    T("academy_levels", "مستويات المسار", "مستويات كل مسار (13 مستوى في المجموع)، ولكل مستوى اختبار قصير.", [
        pk(), ref("track_id", "academy_tracks", "المسار", od="CASCADE"),
        c("level_no", "TINYINT UNSIGNED", "رقم المستوى"),
        c("title", "VARCHAR(120)", "العنوان"),
        c("subtitle", "VARCHAR(200)", "العنوان الفرعي", null=True),
    ], uq=[("track_id", "level_no")], src="academy.ts Level"),

    T("academy_lessons", "دروس الأكاديمية", "الدرس بمحاضره ومدته ووسائطه وملخصه ونقاطه وأسئلته وأدعيته (48 درساً).", [
        pk(), ref("track_id", "academy_tracks", "المسار"),
        ref("level_id", "academy_levels", "المستوى"),
        c("slug", "VARCHAR(80)", "الرابط /academy/<track>/<lesson>"),
        c("title", "VARCHAR(200)", "العنوان"),
        c("minutes", "SMALLINT UNSIGNED", "المدة (1–180)"),
        code_ref("lecturer_code", "academy_lecturers", "المحاضر", length=20),
        file_("poster_file_id", "صورة الدرس"),
        c("media_kind", enum("video", "audio"), "الوسيط", d="'video'"),
        file_("video_file_id", "ملف الفيديو"),
        c("narration_audio_url", "VARCHAR(300)", "الملخص المسموع (/audio/lessons/<track>/<lesson>.mp3) مع توقيت الجمل", null=True),
        c("narration_timings_url", "VARCHAR(300)", "ملف توقيت الجمل (.json)", null=True),
        c("summary", "JSON", "«الملخص المكتوب» فقرات"),
        c("points", "JSON", "«النقاط الرئيسية»"),
        c("tags", "JSON", "الوسوم"),
        c("gallery_file_ids", "JSON", "صور الدرس", null=True),
        *publishing(),
    ], uq=[("track_id", "slug")], src="academy.ts:11 Lesson؛ collections.ts:392 academyLessons"),

    T("academy_lesson_faqs", "«الأسئلة المعتمدة» للدرس", "أسئلة حول الدرس وأجوبتها.", [
        pk(), ref("lesson_id", "academy_lessons", "الدرس", od="CASCADE"),
        c("sort_order", "TINYINT", "الترتيب"),
        c("question", "TEXT", "السؤال"),
        c("answer", "TEXT", "الجواب"),
    ]),

    T("academy_lesson_duas", "أدعية الدرس", "الأدعية المرفقة بالدرس.", [
        pk(), ref("lesson_id", "academy_lessons", "الدرس", od="CASCADE"),
        c("sort_order", "TINYINT", "الترتيب"),
        c("title", "VARCHAR(160)", "العنوان"),
        c("text", "TEXT", "النص"),
        c("source", "VARCHAR(160)", "المصدر", null=True),
    ]),

    T("academy_quiz_questions", "أسئلة اختبارات المستويات", "اختبار قصير للمراجعة لكل مستوى (64 سؤالاً). «لا يؤثر في أي طلب».", [
        pk(), ref("level_id", "academy_levels", "المستوى", od="CASCADE"),
        c("sort_order", "TINYINT", "الترتيب"),
        c("question", "TEXT", "السؤال"),
        c("options", "JSON", "أربعة خيارات"),
        c("correct_index", "TINYINT UNSIGNED", "رقم الخيار الصحيح (من 0)"),
        c("explanation", "TEXT", "الشرح"),
    ], src="academy.ts:1421 QUIZ"),

    T("academy_clips", "المقاطع القصيرة", "مقاطع قصيرة تشير إلى درس.", [
        pk(),
        c("slug", "VARCHAR(80)", "المعرّف", uq=True),
        c("title", "VARCHAR(200)", "العنوان"),
        c("seconds", "SMALLINT UNSIGNED", "المدة بالثواني"),
        ref("lesson_id", "academy_lessons", "الدرس"),
        c("tags", "JSON", "الوسوم"),
        file_("video_file_id", "الفيديو"),
    ], src="academy.ts:1607 Clip"),

    T("academy_lesson_completions", "إتمام الدروس", "الدروس التي أتمّها كل صاحب حساب. التقدم للحساب لا للموسم، حاجاً كان أو إدارياً.", [
        account("account_id", "صاحب الحساب", od="CASCADE"),
        ref("lesson_id", "academy_lessons", "الدرس", od="CASCADE"),
        c("completed_at", "DATETIME(3)", "وقت الإتمام (الكود لا يحفظ الوقت)", d="CURRENT_TIMESTAMP(3)"),
    ], uq=[("account_id", "lesson_id")], src="State.academy (المفتاح <national_id>:<track>/<lesson>)؛ actions.completeLesson",
       rules=["النسبة في «ملفي» وفتح شهادة المسار (عند إتمام كل دروسه) محسوبان."]),

    T("academy_quiz_attempts", "محاولات اختبارات المستويات", "نتيجة كل اختبار مستوى. الكود يعرضها ولا يحفظها.", [
        pk(), account("account_id", "صاحب الحساب", od="CASCADE"),
        ref("level_id", "academy_levels", "المستوى"),
        c("score", "TINYINT UNSIGNED", "الصحيحة"),
        c("total", "TINYINT UNSIGNED", "عدد الأسئلة"),
        c("answers", "JSON", "الإجابات", null=True),
        created(),
    ], new=True),

    T("academy_lesson_ratings", "تقييم الدروس", "نجوم الدرس. الكود يعرض رسالة فقط.", [
        account("account_id", "صاحب الحساب", od="CASCADE"),
        ref("lesson_id", "academy_lessons", "الدرس", od="CASCADE"),
        c("rating", "TINYINT UNSIGNED", "1–5", ck="rating BETWEEN 1 AND 5"),
        updated(),
    ], uq=[("account_id", "lesson_id")], new=True),

    T("academy_lecturer_questions", "«اسأل المحاضر»", "سؤال صاحب الحساب للمحاضر عن درس، وجوابه. الكود يعرض رسالة فقط ولا يوصله.", [
        pk(), account("account_id", "السائل", od="CASCADE"),
        ref("lesson_id", "academy_lessons", "الدرس"),
        c("question", "TEXT", "السؤال"),
        c("answer", "TEXT", "الجواب", null=True),
        staff("answered_by_staff_id", "من أجاب"),
        c("answered_at", "DATETIME(3)", "وقت الجواب", null=True),
        c("published", "TINYINT(1)", "نُشر ضمن «الأسئلة المعتمدة»", d="0"),
        created(),
    ], new=True),

    T("academy_certificates", "شهادات المسارات", "شهادة إتمام المسار. الكود يحسبها عند العرض، ورقمها من بذرة، وتاريخها يوم العرض، و«حفظ في خزنة الوثائق» لا يحفظ شيئاً. هنا تُصدر مرة وتُحفظ ويُتحقق منها.", [
        pk(), account("account_id", "صاحب الحساب", od="CASCADE"),
        ref("track_id", "academy_tracks", "المسار"),
        c("certificate_no", "VARCHAR(24)", "الرقم ACD-<أول 3 أحرف من المسار>-<6 أرقام>", uq=True),
        c("issued_at", "DATETIME(3)", "وقت الإصدار", d="CURRENT_TIMESTAMP(3)"),
        c("saved_to_vault_at", "DATETIME(3)", "حفظها في خزنة الوثائق", null=True),
    ], uq=[("account_id", "track_id")], new=True, src="app/academy/_components/certificate.tsx"),

    T("prayer_cities", "مدن مواقيت الصلاة", "المدن وطريقة الحساب. المواقيت تُحسب ولا تُخزَّن (الفجر 18°/18.5°، العشاء 17°، العصر شافعي)، ومعها اتجاه القبلة.", [
        pk(),
        c("slug", "VARCHAR(40)", "المعرّف", uq=True),
        c("name", "VARCHAR(60)", "الاسم"),
        c("country", "VARCHAR(40)", "البلد"),
        c("lat", "DECIMAL(9,6)", "خط العرض"),
        c("lng", "DECIMAL(9,6)", "خط الطول"),
        c("timezone", "VARCHAR(40)", "المنطقة الزمنية (Asia/Damascus، Asia/Riyadh)"),
        c("method", enum("mwl", "ummalqura"), "طريقة الحساب: mwl رابطة العالم الإسلامي (المدن السورية)، ummalqura أم القرى (مكة والمدينة)"),
        c("sort_order", "TINYINT", "الترتيب", d="0"),
    ], src="lib/prayer.ts City، PRAYERS", seed="10 مدن."),

    T("tour_models", "نماذج الجولة ثلاثية الأبعاد", "نماذج «جولة ثلاثية الأبعاد»: المسجد الحرام، المسجد النبوي، جبل عرفات، جسر الجمرات، مسجد عائشة، مسجد قباء.", [
        pk(),
        c("sketchfab_uid", "VARCHAR(64)", "معرّف النموذج في Sketchfab", uq=True),
        c("title", "VARCHAR(160)", "العنوان"),
        c("place", "VARCHAR(120)", "المكان"),
        c("author", "VARCHAR(120)", "صاحب النموذج"),
        c("source_url", "VARCHAR(300)", "رابط المصدر"),
        c("heavy", "TINYINT(1)", "نموذج ثقيل (تحذير قبل التحميل)", d="0"),
        c("size_label", "VARCHAR(20)", "الحجم المعروض"),
        file_("image_file_id", "الصورة"),
        c("focus", "VARCHAR(60)", "نقطة التركيز", null=True),
        c("photo_credit", "VARCHAR(160)", "حقوق الصورة", null=True),
        c("when_label", "VARCHAR(120)", "متى يُزار"),
        c("about", "TEXT", "النبذة"),
        c("points", "JSON", "نقاط الشرح"),
        *publishing(),
    ], src="lib/data/tour-3d.ts Model3D"),

    T("cluster_directory_entries", "بطاقات التكتلات في الدليل", "ما يحرره موظفو المحتوى مباشرة في بطاقة التكتل العامة (مجموعة «التكتلات والحملات المعتمدة»): اللون، سنة التأسيس، تاريخ الاعتماد، المحافظة، المكتب، التقييم وعدد المراجعات. أما برنامج التكتل (الفنادق والنقل والإعاشة والسكن الخاص والصور) فيكتبه فريقه ويُعتمد في cluster_profile_versions.", [
        pk(), ref("cluster_id", "clusters", "التكتل", od="CASCADE", uq=True),
        c("tone", enum("green", "gold", "maroon"), "لون البطاقة"),
        c("since_year", "SMALLINT UNSIGNED", "سنة التأسيس الهجرية (1300–1500)", null=True),
        c("approved_on_label", "VARCHAR(60)", "تاريخ الاعتماد المعروض", null=True),
        code_ref("governorate_code", "governorates", "المحافظة", null=True, length=20),
        ref("office_id", "offices", "المكتب", null=True),
        c("rating", "DECIMAL(2,1)", "التقييم 0–5 (يُنصح بحسابه من تقييمات الحجاج بعد العودة)", null=True, ck="rating BETWEEN 0 AND 5"),
        c("reviews_count", "INT UNSIGNED", "عدد المراجعات", d="0"),
        *publishing(),
    ], src="lib/cms/collections.ts:206 clusters (tone، since، approvedOn، governorate، office، rating، reviews)"),

    T("unapproved_entities", "جهات غير معتمدة", "حملات أو جهات تدّعي التنظيم دون اعتماد، تعرضها صفحة «التحقق من جهة».", [
        pk(),
        c("name", "VARCHAR(160)", "الاسم"),
        c("claims", "JSON", "ادعاءاتها («مقعد مضمون»…)"),
        c("reports_count", "INT UNSIGNED", "عدد البلاغات عنها", d="0"),
        *publishing(),
    ], src="lib/data/clusters.ts:301 UNAPPROVED"),

    T("fraud_reports", "الإبلاغ عن جهة", "«أبلغ عن هذه الجهة» من صفحة التحقق. الكود يعرض رقم بلاغ ولا يحفظ شيئاً.", [
        pk(),
        c("report_no", "VARCHAR(20)", "رقم البلاغ BL-{season}-{n:05}", uq=True),
        c("entity_name", "VARCHAR(160)", "اسم الجهة المبلَّغ عنها"),
        ref("unapproved_entity_id", "unapproved_entities", "الجهة إن كانت معروفة", null=True),
        c("source", enum("whatsapp", "facebook", "phone", "office-sign", "middleman", "other"), "كيف وصلته: واتساب، فيسبوك، اتصال هاتفي، مكتب أو لافتة، شخص وسيط، أخرى"),
        c("details", "TEXT", "التفاصيل", null=True),
        account("reporter_account_id", "المبلِّغ إن كان داخلاً", null=True),
        c("status", enum("new", "reviewing", "closed"), "الحالة", d="'new'"),
        created(),
    ], new=True, src="app/verify/_components/entity-check.tsx"),

    T("contact_messages", "رسائل نموذج التواصل", "رسالة من نموذج التواصل في «من نحن». الكود يعرض رقم تذكرة ولا يحفظ شيئاً.", [
        pk(),
        c("ticket_no", "VARCHAR(20)", "رقم التذكرة SDH-{season}-{n:05}", uq=True),
        c("name", "VARCHAR(120)", "الاسم"),
        c("phone", "VARCHAR(20)", "الهاتف"),
        c("email", "VARCHAR(160)", "البريد (اختياري)", null=True),
        c("subject", "VARCHAR(120)", "الموضوع (من مواضيع النموذج)"),
        c("branch_slug", "VARCHAR(40)", "الفرع (من دليل الفروع)", null=True),
        c("message", "TEXT", "الرسالة (20 حرفاً على الأقل)"),
        c("status", enum("new", "in_progress", "answered", "closed"), "الحالة", d="'new'"),
        staff("handled_by_staff_id", "من تابعها"),
        created(),
    ], new=True, src="app/about/_components/contact-form.tsx"),

    T("umrah_notify_subscriptions", "التنبيه عند إطلاق العمرة", "هاتف من طلب التنبيه حين تُطلق خدمات العمرة. الكود يحفظه في المتصفح فقط.", [
        pk(),
        c("phone", "VARCHAR(20)", "الهاتف", uq=True),
        created(),
        c("notified_at", "DATETIME(3)", "أُرسل التنبيه", null=True),
    ], new=True, src="app/umrah/notify-form.tsx"),
], flow=[
    "يكتب محرر المحتوى خبراً (news_articles بوسومه) أو سؤالاً (faqs) أو يعدّل الدليل والأكاديمية، فيبقى مسودة حتى ينشره.",
    "يعلّق أصحاب الحسابات (news_comments)، ويتمّون الدروس (academy_lesson_completions)، فتُصدر لهم academy_certificates عند إتمام المسار.",
    "الزوار يتحققون من الجهات (unapproved_entities) ويبلّغون (fraud_reports)، ويراسلون (contact_messages).",
])
