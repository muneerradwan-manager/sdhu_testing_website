# -*- coding: utf-8 -*-
from .dsl import *

CHANNEL_ROLE = enum("head", "accountant", "group-head", "cluster-assistant", "tech", "guide-f", "guide", "assistant")
CHANNEL_ROLE_DESC = ("الدور في القناة: head «رئيس التكتل»، accountant «محاسب التكتل»، group-head «رئيس مجموعة»، cluster-assistant «معاون التكتل»، "
                     "tech «منسق تقني»، guide-f «موجّهة دينية»، guide «موجّه ديني»، assistant «معاون مجموعة»")

MODULE = M("cadre", "الكادر والمراسلات وقناة التكتل ومراجع الكادر", [
    "«الكادر» هو سجل الإدارة الدائم لكل إداري عبر المواسم: صفته الأساسية، وصفته الموسمية التي تمنحها الإدارة فوق ما تقدّم له (مثل رئاسة تكتل)، "
    "وفرعه وفروعه الإضافية، وفئته إن كان رئيس مجموعة، وحالة حسابه (موقوف أو محذوف)، ووسائل الوصول إليه (الهاتف، الباركود، رمز الدخول، تيليجرام)، "
    "وأحداث ملفه. وقد تضيف الإدارة إلى الكادر شخصاً بيدها من السجل المدني.",
    "والمراسلات قناة بين الإداري والإدارة: يفتح موضوعاً فيُرد عليه. وقناة التكتل مساحة رسائل لكادر التكتل، يحدد رئيسه من يكتب فيها.",
], [
    T("cadre_people", "سجل الكادر", "سجل الإدارة لكل إداري عبر المواسم. المفتاح الرقم الوطني لأن الإدارة قد تضيف شخصاً لا يملك حساباً بعد.", [
        c("national_id", "CHAR(11)", "الشخص (المفتاح الأساسي)", pk=True, fk="civil_persons.national_id"),
        account("account_id", "حسابه إن وُجد", null=True, uq=True),
        code_ref("primary_role_key", "admin_roles", "«الصفة الأساسية» الدائمة (NULL = صفة تقدّمه)", null=True, col="role_key"),
        ref("branch_id", "branches", "الفرع (الافتراضي دمشق)", null=True),
        code_ref("category_key", "group_categories", "فئة رئيس المجموعة، وهي فئة مجموعته", null=True, col="category_key", length=20),
        c("added_manually", "TINYINT(1)", "أُضيف بيد الإدارة («إضافة فرد إلى الكادر»)", d="0"),
        c("added_reason", "VARCHAR(500)", "سبب الإضافة (3 أحرف على الأقل)", null=True),
        staff("added_by_staff_id", "من أضافه"),
        c("account_status", enum("active", "disabled", "deleted"), "الحالة: active «فعّال»، disabled «موقوف» («حسابك موقوف من الإدارة»)، deleted «محذوف» («حسابك محذوف من الكادر»). لا يُحذف من في تكتل معتمد", d="'active'"),
        c("status_reason", "VARCHAR(500)", "سبب الإيقاف أو الحذف (3 أحرف على الأقل)", null=True),
        staff("status_by_staff_id", "من غيّر الحالة"),
        c("status_at", "DATETIME(3)", "وقت التغيير", null=True),
        c("contact_phone", "VARCHAR(20)", "هاتف التواصل كما تحفظه الإدارة", null=True),
        c("contact_birth_date", "DATE", "تاريخ الميلاد كما تحفظه الإدارة", null=True),
        c("barcode", "VARCHAR(20)", "رقم الباركود (أرقام فقط)", null=True, uq=True),
        c("login_pin_hash", "VARCHAR(255)", "بصمة رمز الدخول (4 أرقام). الكود يعرّف الحقل ولا شاشة لتوليده", null=True),
        c("telegram_handle", "VARCHAR(60)", "معرّف تيليجرام", null=True),
        c("telegram_chat_id", "VARCHAR(40)", "معرّف المحادثة مع البوت: موجود = «مربوط»، فارغ = «غير مربوط» («فك ربط تيليجرام» يفرغه)", null=True),
        *stamps(),
    ], src="lib/store.ts:807 State.cadre (primary، branches، category، added، status، contact)؛ app/staff/admins/_components/cadre.tsx",
       rules=["الصفة النافذة في الموسم = الصفة الموسمية (cadre_seasonal_roles) إن وُجدت، وإلا الأساسية، وإلا صفة تقدّمه.",
              "الموقوف والمحذوف لا يدخلان البوابة الإدارية ولا يظهران في قوائم الاختيار للتشكيل."]),

    T("cadre_extra_branches", "الفروع الإضافية", "فروع إضافية للإداري غير فرعه الأساسي (يُختار كادر التكتل من فروع رئيسه).", [
        c("national_id", "CHAR(11)", "الإداري", fk="cadre_people.national_id", od="CASCADE"),
        ref("branch_id", "branches", "الفرع"),
    ], uq=[("national_id", "branch_id")], src="cadre.branches.extra"),

    T("cadre_seasonal_roles", "الصفات الموسمية", "صفة تمنحها الإدارة لإداري في موسم فوق ما تقدّم له، بتسمية اختيارية وسبب. سحبها يُبقي السجل.", [
        pk(),
        c("national_id", "CHAR(11)", "الإداري", fk="cadre_people.national_id", od="CASCADE"),
        season(),
        code_ref("role_key", "admin_roles", "الصفة الممنوحة (مثل cluster-head)", col="role_key"),
        ref("label_id", "admin_role_labels", "التسمية الموسمية", null=True),
        c("reason", "VARCHAR(500)", "السبب (3 أحرف على الأقل)"),
        staff("granted_by_staff_id", "من منحها", null=False),
        c("granted_at", "DATETIME(3)", "الوقت", d="CURRENT_TIMESTAMP(3)"),
        c("revoked_at", "DATETIME(3)", "سُحبت («← بلا صفة موسمية»)", null=True),
        staff("revoked_by_staff_id", "من سحبها"),
    ], idx=[("national_id", "season_year")], src="cadre.seasonal؛ structure.ts:127 SeasonalRole"),

    T("cadre_events", "أحداث ملف الكادر", "ما جرى على ملف كل إداري: انضمام إلى تكتل، تعديل استثنائي، تغيير صفة أو فرع أو فئة، إضافة، إيقاف، حذف، وملاحظات تُكتب باليد.", [
        pk(),
        c("national_id", "CHAR(11)", "الإداري", fk="cadre_people.national_id", od="CASCADE"),
        c("event_type", enum("joined", "exceptional", "role", "seasonal", "branch", "category", "added", "status", "deleted", "note"),
          "النوع: joined «انضمام إلى تكتل»، exceptional «تعديل استثنائي على التشكيل»، role «تغيير الصفة»، seasonal «تغيير الصفة الموسمية»، branch «تغيير الفرع»، category «تغيير الفئة»، "
          "added «إضافة كادر جديد»، status «إيقاف الحساب أو تفعيله»، deleted «حذف كادر نهائياً»، note «حدث عام / ملاحظة»"),
        season(null=True, desc="الموسم (NULL «بلا موسم»)"),
        c("event_date", "DATE", "تاريخ الحدث"),
        c("change_text", "VARCHAR(300)", "التغيير «قديم ← جديد»", null=True),
        c("note", "VARCHAR(1000)", "الملاحظة أو السبب", null=True),
        staff("by_staff_id", "من سجّله", null=False),
        c("at", "DATETIME(3)", "وقت التسجيل", d="CURRENT_TIMESTAMP(3)"),
    ], idx=[("national_id", "at")], src="lib/store.ts:602 CadreEvent، :601 CadreEventType",
       rules=["أحداث الانضمام إلى التكتلات تُشتق من التشكيل ولا تُكتب يدوياً. الحدث اليدوي يحتاج تغييراً أو ملاحظة."]),

    T("telegram_messages", "رسائل تيليجرام إلى الكادر", "رسالة يرسلها موظف «إدارة الإداريين» عبر البوت إلى القائمة المعروضة من الكادر (بعد تصفيتها). تصل لمن ربط حسابه.", [
        pk(),
        c("text", "TEXT", "النص (3 أحرف على الأقل)"),
        c("filter_description", "VARCHAR(300)", "وصف التصفية التي حددت المستلمين", null=True),
        staff("sent_by_staff_id", "المرسل", null=False),
        c("sent_at", "DATETIME(3)", "الوقت", d="CURRENT_TIMESTAMP(3)"),
    ], src="lib/store.ts:624 TelegramMessage؛ actions.addTelegram",
       rules=["المستلمون = الكادر المعروض بعد التصفية عدا الموقوفين والمحذوفين. وتظهر الرسالة للإداري في إشعاراته."]),

    T("telegram_message_recipients", "مستلمو رسالة تيليجرام", "كل مستلم، وهل وصلته (له chat_id).", [
        ref("message_id", "telegram_messages", "الرسالة", od="CASCADE"),
        c("national_id", "CHAR(11)", "المستلم", fk="cadre_people.national_id"),
        c("reached", "TINYINT(1)", "وصلته (حسابه مربوط بالبوت)", d="0"),
        c("delivered_at", "DATETIME(3)", "وقت الإيصال من البوت", null=True),
    ], uq=[("message_id", "national_id")]),

    T("letters", "المراسلات", "موضوع مراسلة يفتحه الإداري مع الإدارة.", [
        pk(), season(),
        c("number", "VARCHAR(20)", "الرقم م-{season}-{n:04}", uq=True),
        account("account_id", "الإداري صاحب المراسلة"),
        c("subject", "VARCHAR(200)", "الموضوع (3 أحرف على الأقل)"),
        c("kind", enum("inquiry", "request", "complaint", "suggestion", "problem"), "النوع: inquiry «استفسار»، request «طلب»، complaint «شكوى»، suggestion «اقتراح»، problem «إبلاغ عن مشكلة»"),
        c("opened_at", "DATETIME(3)", "وقت الفتح", d="CURRENT_TIMESTAMP(3)"),
        c("staff_read_at", "DATETIME(3)", "آخر فتح من الموظف", null=True),
        c("admin_read_at", "DATETIME(3)", "آخر فتح من الإداري", null=True),
        c("closed_at", "DATETIME(3)", "أُغلقت (لا رد بعد الإغلاق إلا بإعادة فتحها)", null=True),
        staff("closed_by_staff_id", "من أغلقها"),
    ], src="lib/store.ts:628 Letter؛ app/administrator/_lib/letters.ts؛ app/staff/admins/_components/letters.tsx",
       rules=["الحالة محسوبة: closed «مغلقة»، answered «تم الرد» (آخر رسالة من الموظف)، unread «غير مقروءة»، waiting «بدون رد»."]),

    T("letter_messages", "رسائل المراسلة", "الرسائل داخل الموضوع.", [
        pk(), ref("letter_id", "letters", "المراسلة", od="CASCADE"),
        c("author_kind", enum("admin", "staff"), "من الإداري أو من الموظف"),
        account("author_account_id", "الإداري", null=True),
        staff("author_staff_id", "الموظف"),
        c("author_name", "VARCHAR(160)", "الاسم المعروض"),
        c("text", "TEXT", "النص (5 أحرف للرسالة الأولى، 2 للرد)"),
        file_("file_id", "مرفق (الكود يحفظ اسمه فقط)"),
        c("at", "DATETIME(3)", "الوقت", d="CURRENT_TIMESTAMP(3)"),
    ], src="lib/store.ts:627 LetterMessage",
       checks=["(author_kind = 'admin') = (author_account_id IS NOT NULL)"]),

    T("cluster_channel_writer_roles", "من يكتب في قناة التكتل", "الأدوار المسموح لها بالكتابة. الافتراضي رئيس التكتل وحده، ورئيس التكتل يكتب دائماً.", [
        ref("cluster_id", "clusters", "التكتل", od="CASCADE"),
        c("channel_role", CHANNEL_ROLE, CHANNEL_ROLE_DESC),
    ], uq=[("cluster_id", "channel_role")], src="ClusterChannel.writers؛ app/administrator/_lib/channel.ts WRITER_PRESETS",
       rules=["القوالب الجاهزة: الرئيس وحده؛ الرؤساء (الرئيس، المحاسب، رؤساء المجموعات)؛ الجميع. الجميع يقرأ."]),

    T("channel_messages", "رسائل قناة التكتل", "رسائل كادر التكتل، مع الرد والتثبيت والحذف المنطقي.", [
        pk(), ref("cluster_id", "clusters", "التكتل", od="CASCADE"),
        account("author_account_id", "الكاتب"),
        c("author_role", CHANNEL_ROLE, "دوره وقت الكتابة (أعلى أدواره في التكتل)"),
        c("text", "TEXT", "النص (1000 حرف حداً)"),
        ref("reply_to_id", "channel_messages", "الرسالة التي يرد عليها", null=True),
        c("pinned_at", "DATETIME(3)", "ثبّتها الرئيس", null=True),
        c("removed_at", "DATETIME(3)", "حُذفت (يحذف الكاتب رسالته، والرئيس أي رسالة)", null=True),
        account("removed_by_account_id", "من حذفها", null=True),
        c("at", "DATETIME(3)", "الوقت", d="CURRENT_TIMESTAMP(3)"),
    ], idx=[("cluster_id", "at")], src="lib/store.ts:404 ChannelMessage"),

    T("channel_mutes", "الكتم في قناة التكتل", "يكتم الرئيس عضواً (لا يُكتم الرئيس نفسه).", [
        pk(), ref("cluster_id", "clusters", "التكتل", od="CASCADE"),
        account("account_id", "المكتوم"),
        account("muted_by_account_id", "من كتمه"),
        c("reason", "VARCHAR(300)", "السبب (اختياري)", null=True),
        c("muted_at", "DATETIME(3)", "الوقت", d="CURRENT_TIMESTAMP(3)"),
        c("lifted_at", "DATETIME(3)", "رُفع الكتم", null=True),
    ], src="ClusterChannel.muted"),

    T("channel_reads", "آخر قراءة في القناة", "لحساب الرسائل غير المقروءة لكل عضو.", [
        ref("cluster_id", "clusters", "التكتل", od="CASCADE"),
        account("account_id", "العضو", od="CASCADE"),
        c("last_read_at", "DATETIME(3)", "آخر قراءة"),
    ], uq=[("cluster_id", "account_id")], src="ClusterChannel.reads"),

    T("admin_job_descriptions", "التوصيف الوظيفي", "توصيف كل صفة ومهامها في «مراجع الكادر».", [
        c("role_key", "VARCHAR(40)", "الصفة (أو cluster-accountant لمحاسب التكتل)", pk=True),
        c("summary", "TEXT", "الملخص"),
        c("duties", "JSON", "المهام سطراً سطراً"),
        c("hidden", "TINYINT(1)", "مخفي عن الإداريين", d="0"),
        c("sort_order", "SMALLINT", "الترتيب", d="0"),
        staff("updated_by_staff_id", "آخر من عدّل"),
        updated(),
    ], src="lib/store.ts:662 AdminRefs.jobs، jobOrder"),

    T("admin_system_sections", "النظام الإداري", "أقسام وثيقة النظام الإداري (من «القسم الأول: المقدمة والأهداف» إلى «الخاتمة»). النص بترميز بسيط: سطر فارغ يفصل الفقرات، «- » يبدأ بنداً، **غامق**.", [
        pk(),
        c("title", "VARCHAR(200)", "العنوان"),
        c("body", "MEDIUMTEXT", "النص"),
        c("sort_order", "SMALLINT", "الترتيب", d="0"),
        staff("updated_by_staff_id", "آخر من عدّل"),
        updated(),
    ], src="AdminRefs.system"),

    T("admin_decisions", "المقررات الإدارية", "المقررات المنشورة للكادر مع ملفاتها.", [
        pk(),
        c("title", "VARCHAR(200)", "العنوان (3 أحرف على الأقل)"),
        c("year", "SMALLINT UNSIGNED", "السنة الهجرية (1448)"),
        c("description", "TEXT", "الوصف"),
        file_("file_id", "الملف", null=False),
        c("sort_order", "SMALLINT", "الترتيب", d="0"),
        *stamps(),
    ], src="AdminRefs.decisions"),

    T("admin_contract_templates", "العقود المرجعية", "نماذج العقود: «عقد الحاج مع المجموعة»، «عقد التكليف الإداري»، «تعهّد رئيس التكتل»، «عقد خدمات التكتل».", [
        pk(),
        c("title", "VARCHAR(200)", "العنوان"),
        c("party", "VARCHAR(160)", "الطرف"),
        c("description", "TEXT", "الوصف"),
        file_("file_id", "الملف", null=False),
        c("sort_order", "SMALLINT", "الترتيب", d="0"),
        *stamps(),
    ], src="AdminRefs.contracts"),
], flow=[
    "كل إداري يدخل الكادر بحسابه، أو تضيفه الإدارة يدوياً (cadre_people)، وتُكتب كل تغييراته في cadre_events.",
    "تمنح الإدارة الصفات الموسمية (cadre_seasonal_roles)، وترسل رسائل تيليجرام (telegram_messages + recipients).",
    "يراسل الإداري الإدارة (letters + letter_messages)، ويتحدث كادر التكتل في قناته (channel_messages)، ويقرأ الجميع مراجع الكادر.",
])
