-- ═══════════════════════════════════════════════════════════════════════════
-- هيكلية قاعدة البيانات — الجداول والعلاقات للمنصة الوطنية للحج
-- المنصة الوطنية للحج — إدارة الحج والعمرة السورية
-- MySQL 8.0.16+ / MariaDB 10.6+   |   246 جدولاً   |   مولَّد من docs/_build-guide/schema في 2026-10-21
-- لا تعدّل هذا الملف يدوياً: عدّل النموذج ثم شغّل build_schema.py
-- ═══════════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ───────────────────────────────────────────────────────────────
-- المرجعيات العامة: المواسم والمكاتب والمواعيد والملفات والسجل
-- ───────────────────────────────────────────────────────────────

CREATE TABLE `seasons` (
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'السنة الهجرية للموسم، مثل 1448. المفتاح الأساسي',
  `gregorian_year` SMALLINT UNSIGNED NOT NULL COMMENT 'السنة الميلادية التي يقع فيها الحج، مثل 2027',
  `reference_year` SMALLINT UNSIGNED NOT NULL COMMENT 'السنة التي تُحسب عليها الأعمار في شروط التسجيل (2026 لموسم 1448): العمر = reference_year − سنة الميلاد',
  `label` VARCHAR(60) NOT NULL COMMENT 'الاسم المعروض، مثل «موسم 1448هـ»',
  `status` ENUM('preparing','active','archived') NOT NULL DEFAULT 'preparing' COMMENT 'حالة الموسم: preparing «قيد الإعداد»، active «الجاري»، archived «مؤرشف» (للقراءة فقط). موسم واحد active في الوقت نفسه',
  `copied_from_version_id` BIGINT UNSIGNED NULL COMMENT 'إصدار إعدادات التسجيل الذي نُسخ منه هذا الموسم عند إنشائه',
  `archived_applications` INT UNSIGNED NULL COMMENT 'عدد الطلبات المؤرشفة عند إغلاق الموسم (للعرض فقط)',
  `created_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'الموظف الذي أنشأ الموسم',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`season_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='المواسم — موسم حج واحد لكل سنة هجرية. المفتاح هو السنة نفسها، لأن الكود كله يتعامل بها (1447، 1448).';

CREATE TABLE `season_settings` (
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `quota` INT UNSIGNED NOT NULL DEFAULT 22500 COMMENT 'الحصة الإجمالية للموسم (22,500). المدى في الواجهة 1000–60000',
  `direct_share` DECIMAL(4,3) NOT NULL DEFAULT 0.650 COMMENT 'نسبة القبول المباشر كسر عشري (0.650). المقاعد المباشرة = round(quota × direct_share) والباقي للقرعة',
  `accepted_direct_age` TINYINT UNSIGNED NOT NULL DEFAULT 68 COMMENT 'العمر المقبول مباشرة (68): من بلغه فأكثر يُقبل مباشرة. تكتبه أيضاً لجنة اعتماد الأعمار من القرعة',
  `scholarship_seats` INT UNSIGNED NOT NULL DEFAULT 500 COMMENT 'مقاعد المنحة (500). تظهر في النتائج العامة فقط حالياً',
  `applicant_max_birth_year` SMALLINT UNSIGNED NOT NULL DEFAULT 1997 COMMENT 'صاحب الطلب من مواليد هذه السنة فما قبل (1997 = 29 عاماً فأكثر)',
  `companion_max_birth_year` SMALLINT UNSIGNED NOT NULL DEFAULT 2009 COMMENT 'المرافق من مواليد هذه السنة فما قبل (2009 = 17 عاماً فأكثر)',
  `woman_needs_mahram_min_birth_year` SMALLINT UNSIGNED NOT NULL DEFAULT 1982 COMMENT 'المرأة من مواليد هذه السنة فما بعد تحتاج محرماً (1982 = دون 44 عاماً)',
  `elderly_needs_companion_max_birth_year` SMALLINT UNSIGNED NOT NULL DEFAULT 1957 COMMENT 'من مواليد هذه السنة فما قبل يحتاج مرافقاً مسمّى (1957 = 69 عاماً فأكثر)',
  `max_companions` TINYINT UNSIGNED NOT NULL DEFAULT 3 COMMENT 'عدد المرافقين المسموح (3)',
  `max_companions_family` TINYINT UNSIGNED NOT NULL DEFAULT 5 COMMENT 'عدد المرافقين لرجل مع زوجته وأولاده (5)',
  `fee_registration_per_person` DECIMAL(12,2) NOT NULL DEFAULT 25.00 COMMENT 'رسم التسجيل على الحج للفرد بالدولار (25)',
  `hajj_cost` DECIMAL(12,2) NOT NULL DEFAULT 4750.00 COMMENT 'تكلفة الحج الكاملة للفرد بالدولار (4,750)',
  `first_installment` DECIMAL(12,2) NOT NULL DEFAULT 3500.00 COMMENT 'الدفعة الأولى للفرد (3,500) — يحل محلها جدول الدفعات في إصدار إعدادات التسجيل حين يُنشر',
  `installment_count` TINYINT UNSIGNED NOT NULL DEFAULT 2 COMMENT 'عدد دفعات تكلفة الحج (2) — يُعمل به حين لا يكون في الإصدار المنشور جدول دفعات',
  `hady` DECIMAL(12,2) NOT NULL DEFAULT 180.00 COMMENT 'الهدي للفرد (180)',
  `fee_admin_registration` DECIMAL(12,2) NOT NULL DEFAULT 30.00 COMMENT 'رسم التسجيل كإداري (30)',
  `fee_group_formation` DECIMAL(12,2) NOT NULL DEFAULT 200.00 COMMENT 'رسم تشكيل مجموعة (200)',
  `fee_cluster_formation` DECIMAL(12,2) NOT NULL DEFAULT 500.00 COMMENT 'رسم تشكيل تكتل (500)',
  `first_aid_valid_seasons` TINYINT UNSIGNED NOT NULL DEFAULT 3 COMMENT 'عدد المواسم التي تبقى فيها شهادة الإسعافات الأولية سارية (3)',
  `record_valid_seasons` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'صلاحية وثيقة «لا حكم عليه» بالمواسم (1)',
  `recommendation_valid_seasons` TINYINT UNSIGNED NOT NULL DEFAULT 2 COMMENT 'صلاحية التزكية بالمواسم (2)',
  `keep_role_min_rating` DECIMAL(2,1) NOT NULL DEFAULT 3.5 COMMENT 'أدنى تقييم في الموسم السابق ليُجدَّد للإداري صفته نفسها دون اختبار (3.5)',
  `keep_role_max_gap_seasons` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'أقصى فجوة بالمواسم بين آخر مشاركة والتجديد بلا اختبار (1)',
  `promote_share` DECIMAL(4,3) NOT NULL DEFAULT 0.300 COMMENT 'نسبة المرقّين في التصنيف آخر الموسم داخل كل فئة (0.300). الكود يخزنها نسبة مئوية 30: وُحّدت هنا كسراً',
  `demote_share` DECIMAL(4,3) NOT NULL DEFAULT 0.200 COMMENT 'نسبة المخفَّضين (0.200)',
  `honor_top` TINYINT UNSIGNED NOT NULL DEFAULT 3 COMMENT 'عدد المكرَّمين في كل فئة (3)',
  `decision_ref` VARCHAR(120) NULL COMMENT 'مرجع قرار اللجنة الذي عُدّلت بموجبه الإعدادات آخر مرة (اختياري)',
  `updated_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'آخر موظف عدّل الإعدادات',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`season_year`),
  CONSTRAINT `ck_season_settings_1` CHECK (installment_count BETWEEN 1 AND 4),
  CONSTRAINT `ck_season_settings_2` CHECK (direct_share BETWEEN 0.100 AND 0.900),
  CONSTRAINT `ck_season_settings_3` CHECK (promote_share BETWEEN 0 AND 1),
  CONSTRAINT `ck_season_settings_4` CHECK (demote_share BETWEEN 0 AND 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='إعدادات الموسم — القيم العددية التي يضبطها مدير الموسم من «إعدادات الموسم»: الحصة ونسبها، شروط الأعمار، الرسوم، صلاحية الوثائق، حدود التقييم. صف واحد لكل موسم، وكل تعديل يُسجَّل في audit_events بالقيمة قبل وبعد.';

CREATE TABLE `season_calendar` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `starts_on` DATE NOT NULL COMMENT 'تاريخ البداية',
  `ends_on` DATE NULL COMMENT 'تاريخ النهاية (يساوي البداية لحدث يوم واحد)',
  `title` VARCHAR(300) NOT NULL COMMENT 'الحدث، مثل «التسجيل على الحج — القبول المباشر لمواليد 1958 فما قبل ومرافقيهم»',
  `hijri_label` VARCHAR(120) NOT NULL COMMENT 'التاريخ الهجري كما يُعرض',
  `gregorian_label` VARCHAR(120) NOT NULL COMMENT 'التاريخ الميلادي كما يُعرض',
  `audience` VARCHAR(120) NOT NULL COMMENT 'لمن: «الحاج أو من يسجّله»، «الجميع»، «رؤساء المجموعات والتكتلات»…',
  `sort_order` SMALLINT NOT NULL DEFAULT 0 COMMENT 'الترتيب',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='تقويم الموسم العام — المواعيد التي تُعرض للجمهور في صفحة الشروط وبطاقة الموسم (SEASON.dates).';

CREATE TABLE `governorates` (
  `code` VARCHAR(20) NOT NULL COMMENT 'رمز ثابت بالإنجليزية (damascus، rif-damascus، aleppo…)',
  `name` VARCHAR(40) NOT NULL COMMENT 'الاسم: دمشق، ريف دمشق، حلب، حمص، حماة، اللاذقية، طرطوس، إدلب، درعا، السويداء، القنيطرة، دير الزور، الرقة، الحسكة',
  `national_id_prefix` CHAR(3) NULL COMMENT 'بادئة الرقم الوطني لمواليدها (010 دمشق، 020 حلب، 030 ريف دمشق…)',
  `sort_order` TINYINT NOT NULL DEFAULT 0 COMMENT 'الترتيب',
  PRIMARY KEY (`code`),
  UNIQUE KEY `uq_governorates_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='المحافظات السورية — قائمة المحافظات الأربع عشرة، تُستعمل في السجل المدني والمكاتب ومراكز الامتحان والموظفين.';

CREATE TABLE `offices` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `area` VARCHAR(60) NOT NULL COMMENT 'المنطقة كما تُكتب في الطلب: اسم المحافظة، أو «تركيا — إسطنبول»، «تركيا — غازي عنتاب»، «مصر»، «الأردن»',
  `name` VARCHAR(80) NOT NULL COMMENT 'اسم المكتب: «مكتب دمشق»، «مكتب تركيا — إسطنبول»…',
  `is_abroad` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = مكتب خارج سوريا (يظهر خياراً في سؤال الإقامة)',
  `country` VARCHAR(40) NOT NULL COMMENT 'البلد: سوريا، تركيا، مصر، الأردن',
  `governorate_code` VARCHAR(20) NULL COMMENT 'المحافظة لمكاتب الداخل',
  `address` VARCHAR(300) NULL COMMENT 'العنوان',
  `phone` VARCHAR(30) NULL COMMENT 'هاتف المكتب',
  `active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'فعّال',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_offices_area` (`area`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مكاتب التسجيل — المكتب الذي يتبع له الطلب. لا يختاره الحاج: داخل سوريا يتبع محافظة قيد صاحب الطلب، وخارجها بلد الإقامة.';

CREATE TABLE `operations` (
  `code` VARCHAR(40) NOT NULL COMMENT 'مفتاح العملية: hajj-direct، hajj-lottery، admin-registration، admin-exams، admin-orals، group-formation، group-joining، cluster-formation، group-management، cluster-management، pilgrim-evaluation، self-evaluation، peer-evaluation، evaluation-objection',
  `label` VARCHAR(120) NOT NULL COMMENT 'الاسم، مثل «التسجيل على الحج — القبول المباشر»',
  `description` TEXT NOT NULL COMMENT 'الشرح المعروض للموظف',
  `control_permission` VARCHAR(40) NOT NULL COMMENT 'الصلاحية التي تتحكم بها (registration.manage، admins.manage، exams.manage، season.settings). وصاحب season.settings يتحكم بكل عملية',
  `permanent` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = عملية دائمة بلا مواعيد (group-management، cluster-management)',
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='العمليات الموسمية ومواعيدها — كل عملية في المنصة تُفتح وتُغلق بمواعيد: التسجيل بنوعيه، التسجيل كإداري، الاختبارات، التشكيل، الإلحاق، التقييمات. التعريف ثابت (المفتاح والاسم وصاحب الصلاحية)، والمواعيد لكل موسم في operation_windows.';

CREATE TABLE `operation_windows` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `operation_code` VARCHAR(40) NOT NULL COMMENT 'العملية',
  `mode` ENUM('auto','on','off') NOT NULL DEFAULT 'auto' COMMENT 'الوضع: auto «تلقائي بالتواريخ»، on «فعال» (فتحتها الإدارة)، off «غير فعال» (أوقفتها الإدارة)',
  `starts_on` DATE NULL COMMENT 'يوم البداية',
  `ends_on` DATE NULL COMMENT 'يوم النهاية (شامل)',
  `start_time` TIME NULL COMMENT 'ساعة البداية (الافتراضي 00:00)',
  `end_time` TIME NULL COMMENT 'ساعة النهاية (الافتراضي 23:59)',
  `is_estimate` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = موعد تقديري يُعلَن لاحقاً',
  `updated_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'آخر من عدّل',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_operation_windows_season_year_operation_code` (`season_year`, `operation_code`),
  CONSTRAINT `ck_operation_windows_1` CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مواعيد العمليات في الموسم — موعد كل عملية في موسم بعينه ووضعها: تلقائي بالتواريخ، أو فتحتها الإدارة، أو أوقفتها.';

CREATE TABLE `number_sequences` (
  `scope` VARCHAR(40) NOT NULL COMMENT 'نوع الرقم: application، receipt-R، receipt-P، receipt-A، receipt-G، receipt-C، certificate، ticket، letter، visa…',
  `season_year` SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'الموسم (0 للعدّادات غير الموسمية)',
  `next_value` BIGINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'القيمة التالية',
  `pattern` VARCHAR(60) NULL COMMENT 'صيغة الرقم، مثل {season}-R-{n:06} للإيصال 1448-R-004512',
  PRIMARY KEY (`scope`, `season_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='عدّادات الأرقام العامة — MySQL لا يملك SEQUENCE (MariaDB يملكه)، فتُولَّد الأرقام التي يراها الناس من هذا الجدول داخل المعاملة نفسها (SELECT … FOR UPDATE ثم زيادة). في النسخة التجريبية تُشتق أرقام الطلبات من الرقم الوطني بدالة عشوائية وقد تتكرر، وأرقام البلاغات عشوائية.';

CREATE TABLE `files` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `storage_key` VARCHAR(255) NOT NULL COMMENT 'مفتاح الملف في التخزين',
  `original_name` VARCHAR(255) NOT NULL COMMENT 'اسم الملف كما رفعه صاحبه',
  `mime_type` VARCHAR(100) NOT NULL COMMENT 'نوع المحتوى: image/jpeg، image/png، application/pdf، video/mp4…',
  `size_bytes` INT UNSIGNED NOT NULL COMMENT 'الحجم بالبايت. الحد 12 ميغابايت قبل المعالجة (MAX_UPLOAD_BYTES)',
  `width` SMALLINT UNSIGNED NULL COMMENT 'عرض الصورة بالبكسل (تُصغَّر الصور إلى 1920 بكسل للضلع الأطول)',
  `height` SMALLINT UNSIGNED NULL COMMENT 'ارتفاع الصورة',
  `sha256` CHAR(64) NULL COMMENT 'بصمة المحتوى لكشف التكرار والتلاعب',
  `purpose` ENUM('media','document','contract','visa','health','payment-slip','passport','photo','exam','other') NOT NULL COMMENT 'الغرض: media مكتبة المحتوى (صور وفيديو)، document وثيقة PDF أو صورة، contract عقد موقّع، visa تأشيرة، health وثيقة صحية، payment-slip إشعار دفع مصرفي، passport جواز، photo صورة شخصية',
  `alt_ar` VARCHAR(300) NULL COMMENT 'الوصف البديل بالعربية (لصور المحتوى)',
  `alt_en` VARCHAR(300) NULL COMMENT 'الوصف البديل بالإنجليزية',
  `uploaded_by_kind` ENUM('staff','account','system') NOT NULL COMMENT 'من رفعه: موظف، أو صاحب حساب (حاج أو إداري)، أو النظام',
  `uploaded_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'الموظف الرافع',
  `uploaded_by_account_id` BIGINT UNSIGNED NULL COMMENT 'صاحب الحساب الرافع',
  `deleted_at` DATETIME(3) NULL COMMENT 'حذف منطقي: لا يُحذف ملف يشير إليه سجل',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_files_storage_key` (`storage_key`),
  CONSTRAINT `ck_files_1` CHECK ((uploaded_by_kind = 'staff') = (uploaded_by_staff_id IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الملفات المرفوعة — كل ملف يُرفع إلى المنصة: صور شخصية، جوازات، عقود موقّعة، تأشيرات، وثائق صحية، إشعارات مصرفية، صور ومقاطع المحتوى. يُخزَّن الملف نفسه في تخزين خارجي (S3 أو ما يماثله)، وهنا بياناته ومفتاحه. في النسخة التجريبية تُحفظ الملفات في IndexedDB باسم sdhu-cms-media وتُشار إليها بنص cms:<id>.';

CREATE TABLE `audit_events` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الحدث',
  `actor_kind` ENUM('staff','account','system') NOT NULL COMMENT 'نوع الفاعل: موظف، أو صاحب حساب (حاج/إداري)، أو النظام (مثل «المنصة» حين تُلحق عائلة برحلة مجموعتها)',
  `actor_staff_id` BIGINT UNSIGNED NULL COMMENT 'الموظف الفاعل',
  `actor_account_id` BIGINT UNSIGNED NULL COMMENT 'صاحب الحساب الفاعل',
  `actor_name` VARCHAR(160) NOT NULL COMMENT 'اسم الفاعل وقت الحدث (لقطة): الكود يخزّن الاسم وحده، ويبقى هنا للتاريخ',
  `actor_role` VARCHAR(160) NOT NULL COMMENT 'صفته وقت الحدث: المسمى الوظيفي للموظف، أو «حاج»، أو «إداري — رئيس مجموعة»…',
  `action` VARCHAR(200) NOT NULL COMMENT 'الفعل بالعربية كما يُعرض: «تقديم طلب حج — التسجيل على القبول المباشر»، «منح صلاحية»، «اعتماد وثيقة طبية»…',
  `action_code` VARCHAR(60) NULL COMMENT 'رمز ثابت للفعل للبحث والتقارير (مقترح، الكود لا يملكه)',
  `system_code` VARCHAR(20) NULL COMMENT 'ملف الإدارة الذي وقع فيه الحدث: staff، registration، admins، exams، flights (والقيم الأخرى مثل transport تُكتب في area)',
  `area` VARCHAR(40) NULL COMMENT 'تبويب داخل الملف: rules، cadre، groups، clusters، stages، payments، dispatch…',
  `target` VARCHAR(300) NULL COMMENT 'على ماذا وقع، نصاً: «طلب 4512»، اسم شخص، «بلاغ OR-1207»…',
  `ref_type` VARCHAR(40) NULL COMMENT 'نوع السجل المعني (application، account، flight، cluster، group، exam، operation…)',
  `ref_id` VARCHAR(64) NULL COMMENT 'معرّف السجل المعني، لعرض «سجل هذا السجل»',
  `subject_account_id` BIGINT UNSIGNED NULL COMMENT 'صاحب الحساب الذي يخصه الحدث (لعرضه في «سجل نشاطي»)',
  `application_id` BIGINT UNSIGNED NULL COMMENT 'الطلب المعني إن وُجد',
  `detail` TEXT NULL COMMENT 'تفاصيل',
  `before_value` TEXT NULL COMMENT 'القيمة قبل (نص مقروء)',
  `after_value` TEXT NULL COMMENT 'القيمة بعد',
  `important` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = يصل إلى مديرة الموسم في «صلاحيات الإدارة»',
  `ip_address` VARCHAR(45) NULL COMMENT 'عنوان IP (مقترح)',
  PRIMARY KEY (`id`),
  KEY `ix_audit_events_occurred_at` (`occurred_at`),
  KEY `ix_audit_events_system_code_area` (`system_code`, `area`),
  KEY `ix_audit_events_ref_type_ref_id` (`ref_type`, `ref_id`),
  KEY `ix_audit_events_subject_account_id` (`subject_account_id`),
  KEY `ix_audit_events_application_id` (`application_id`),
  CONSTRAINT `ck_audit_events_1` CHECK ((actor_kind = 'staff') = (actor_staff_id IS NOT NULL)),
  CONSTRAINT `ck_audit_events_2` CHECK ((actor_kind = 'account') = (actor_account_id IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='سجل الأحداث — كل فعل له أثر يُسجَّل هنا: من فعله وبأي صفة، وعلى ماذا، والقيمة قبل وبعد. يقرؤه «سجل الأحداث» في بوابة الموظفين، و«سجل نشاطي» للحاج والإداري، وسجل كل سجل (RecordHistory). لا يُعدَّل صف ولا يُحذف.';

CREATE TABLE `notifications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `recipient_kind` ENUM('account','staff') NOT NULL COMMENT 'نوع المستلم',
  `account_id` BIGINT UNSIGNED NULL COMMENT 'المستلم صاحب الحساب',
  `staff_user_id` BIGINT UNSIGNED NULL COMMENT 'المستلم الموظف',
  `category` VARCHAR(40) NOT NULL COMMENT 'الفئة: application (طلبي)، group (مجموعتي وقناتها)، rites (المناسك)، lesson، letter (المراسلات)، exam، formation، telegram، news، system',
  `title` VARCHAR(200) NOT NULL COMMENT 'العنوان',
  `body` TEXT NULL COMMENT 'النص',
  `link` VARCHAR(300) NULL COMMENT 'الرابط داخل المنصة، مثل /portal/application',
  `urgent` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'عاجل',
  `source_type` VARCHAR(40) NULL COMMENT 'مصدره (group_post، channel_message، audit_event، letter_message…)',
  `source_id` BIGINT UNSIGNED NULL COMMENT 'معرّف المصدر',
  `read_at` DATETIME(3) NULL COMMENT 'وقت القراءة',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  PRIMARY KEY (`id`),
  KEY `ix_notifications_recipient_kind_account_id_read_at` (`recipient_kind`, `account_id`, `read_at`),
  KEY `ix_notifications_staff_user_id_read_at` (`staff_user_id`, `read_at`),
  CONSTRAINT `ck_notifications_1` CHECK ((recipient_kind = 'account') = (account_id IS NOT NULL)),
  CONSTRAINT `ck_notifications_2` CHECK ((recipient_kind = 'staff') = (staff_user_id IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الإشعارات — إشعار لصاحب حساب أو لموظف. في النسخة التجريبية الإشعارات تُبنى عند القراءة من مصادر متفرقة (قناة المجموعة، سجل الطلب، الأخبار) ولا تُخزَّن، ولا يُعرف المقروء منها. هذا الجدول يوحّدها ويحفظ حالة القراءة.';

CREATE TABLE `notification_deliveries` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `notification_id` BIGINT UNSIGNED NOT NULL COMMENT 'الإشعار',
  `channel` ENUM('sms','telegram','email','push') NOT NULL COMMENT 'القناة',
  `destination` VARCHAR(160) NOT NULL COMMENT 'الوجهة: رقم الهاتف، معرّف محادثة تيليجرام، البريد',
  `status` ENUM('queued','sent','delivered','failed') NOT NULL DEFAULT 'queued' COMMENT 'الحالة',
  `provider_ref` VARCHAR(120) NULL COMMENT 'مرجع مزوّد الخدمة',
  `error` VARCHAR(300) NULL COMMENT 'سبب الفشل',
  `sent_at` DATETIME(3) NULL COMMENT 'وقت الإرسال',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='قنوات إيصال الإشعار — محاولات إيصال الإشعار عبر رسالة نصية أو تيليجرام أو البريد.';

CREATE TABLE `otp_challenges` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `purpose` ENUM('register','login','companion-consent','applicant-consent','office-consent','password-reset') NOT NULL COMMENT 'الغرض: register إنشاء حساب، login دخول، companion-consent موافقة مرافق، applicant-consent موافقة صاحب طلب يُقدَّم عنه، office-consent موافقة مواطن يسجّله المكتب أو المنسق، password-reset استعادة كلمة المرور',
  `phone` VARCHAR(20) NOT NULL COMMENT 'الهاتف بالصيغة الدولية E.164',
  `national_id` CHAR(11) NULL COMMENT 'الشخص المعني',
  `code_hash` CHAR(64) NOT NULL COMMENT 'بصمة الرمز (SHA-256 مع ملح). لا يُخزَّن الرمز نفسه',
  `expires_at` DATETIME(3) NOT NULL COMMENT 'انتهاء الصلاحية (مثلاً بعد 5 دقائق)',
  `attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'المحاولات الخاطئة',
  `max_attempts` TINYINT UNSIGNED NOT NULL DEFAULT 5 COMMENT 'الحد الأقصى للمحاولات',
  `resend_after` DATETIME(3) NOT NULL COMMENT 'لا يُعاد الإرسال قبل هذا الوقت (60 ثانية في الواجهة)',
  `verified_at` DATETIME(3) NULL COMMENT 'وقت التحقق الناجح',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  PRIMARY KEY (`id`),
  KEY `ix_otp_challenges_phone_purpose_created_at` (`phone`, `purpose`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='رموز التحقق — رمز التحقق المرسل إلى الهاتف عند إنشاء الحساب وعند كل دخول، وعند موافقة مرافق أو صاحب طلب يُقدَّم عنه. في النسخة التجريبية الرمز ثابت 1448 ولا يُخزَّن شيء.';

CREATE TABLE `auth_sessions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `token_hash` CHAR(64) NOT NULL COMMENT 'بصمة رمز الجلسة',
  `subject_kind` ENUM('account','staff') NOT NULL COMMENT 'نوع صاحب الجلسة',
  `account_id` BIGINT UNSIGNED NULL COMMENT 'صاحب الحساب',
  `staff_user_id` BIGINT UNSIGNED NULL COMMENT 'الموظف',
  `user_agent` VARCHAR(300) NULL COMMENT 'المتصفح والجهاز',
  `ip_address` VARCHAR(45) NULL COMMENT 'عنوان IP',
  `last_seen_at` DATETIME(3) NULL COMMENT 'آخر نبضة (يُحدَّث كل 60 ثانية والبوابة مفتوحة؛ منه «متصل الآن» إن كان خلال دقيقتين)',
  `expires_at` DATETIME(3) NOT NULL COMMENT 'انتهاء الجلسة',
  `revoked_at` DATETIME(3) NULL COMMENT 'إنهاء الجلسة (خروج أو إيقاف الحساب)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_auth_sessions_token_hash` (`token_hash`),
  CONSTRAINT `ck_auth_sessions_1` CHECK ((subject_kind = 'account') = (account_id IS NOT NULL)),
  CONSTRAINT `ck_auth_sessions_2` CHECK ((subject_kind = 'staff') = (staff_user_id IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='جلسات الدخول — جلسة دخول لصاحب حساب أو لموظف. الحاج والإداري جلستهما واحدة أياً كان الباب الذي دخلا منه.';

CREATE TABLE `identity_attempts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `national_id` CHAR(11) NOT NULL COMMENT 'الرقم الوطني المحاوَل (لا مفتاح أجنبي: قد يكون غير موجود)',
  `context` ENUM('register','office','coordinator','login') NOT NULL COMMENT 'أين جرت المحاولة',
  `succeeded` TINYINT(1) NOT NULL COMMENT 'نجحت المطابقة',
  `ip_address` VARCHAR(45) NULL COMMENT 'عنوان IP',
  `by_staff_id` BIGINT UNSIGNED NULL COMMENT 'الموظف (في التسجيل بالمكتب)',
  `by_account_id` BIGINT UNSIGNED NULL COMMENT 'المنسق أو الإداري (في التسجيل عن مواطن)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  PRIMARY KEY (`id`),
  KEY `ix_identity_attempts_national_id_created_at` (`national_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='محاولات إثبات الهوية — عند إنشاء الحساب أو التسجيل في المكتب يُطابَق الاسم الأول مع السجل المدني، ويوقَف بعد 5 محاولات خاطئة لكل رقم وطني. النسخة التجريبية تعدّ المحاولات في الشاشة وحدها؛ هنا تُعدّ على الخادم.';

-- ───────────────────────────────────────────────────────────────
-- الهوية والحسابات: من السجل المدني إلى الحساب ومسار الموسم
-- ───────────────────────────────────────────────────────────────

CREATE TABLE `civil_persons` (
  `national_id` CHAR(11) NOT NULL COMMENT 'الرقم الوطني: 11 رقماً بالضبط. يُعرض مقنّعاً 010-•••••412',
  `first_name` VARCHAR(60) NOT NULL COMMENT 'الاسم الأول',
  `father_name` VARCHAR(60) NOT NULL COMMENT 'اسم الأب',
  `mother_name` VARCHAR(60) NOT NULL COMMENT 'اسم الأم',
  `last_name` VARCHAR(60) NOT NULL COMMENT 'الكنية',
  `gender` ENUM('M','F') NOT NULL COMMENT 'الجنس: M «ذكر»، F «أنثى»',
  `birth_date` DATE NOT NULL COMMENT 'تاريخ الميلاد',
  `birth_place` VARCHAR(80) NOT NULL COMMENT 'مكان الولادة',
  `governorate_code` VARCHAR(20) NOT NULL COMMENT 'المحافظة',
  `registry_place` VARCHAR(120) NOT NULL COMMENT 'مكان القيد، مثل «المزة 1122»',
  `marital_status` VARCHAR(20) NOT NULL COMMENT 'الحالة المدنية كما يردها السجل: متزوج، متزوجة، عازب، عزباء، أرمل، أرملة، مطلق، مطلقة',
  `religion` VARCHAR(20) NOT NULL DEFAULT 'مسلم' COMMENT 'الديانة',
  `nationality` VARCHAR(30) NOT NULL DEFAULT 'سورية' COMMENT 'الجنسية',
  `family_book_no` VARCHAR(12) NULL COMMENT 'رقم دفتر العائلة الذي هو قيده فيه',
  `father_id` CHAR(11) NULL COMMENT 'الأب في السجل',
  `mother_id` CHAR(11) NULL COMMENT 'الأم في السجل',
  `phone_tail` CHAR(3) NULL COMMENT 'آخر 3 أرقام من هاتفه في السجل، تُعرض في «رمز موافقة إلى الهاتف المنتهي بـ…»',
  `fetched_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'آخر مرة جُلبت فيها البيانات من السجل',
  PRIMARY KEY (`national_id`),
  KEY `ix_civil_persons_family_book_no` (`family_book_no`),
  KEY `ix_civil_persons_last_name_first_name` (`last_name`, `first_name`),
  CONSTRAINT `ck_civil_persons_1` CHECK (national_id REGEXP '^[0-9]{11}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الأشخاص في السجل المدني — نسخة محلية مما يرد من السجل المدني عن كل شخص تتعامل معه المنصة: صاحب حساب، أو فرد في طلب، أو موظف. المصدر الحقيقي خارجي، والمنصة تحدّث النسخة عند كل استعلام. المفتاح هو الرقم الوطني، وتشير إليه كل الجداول التي تتعامل مع أشخاص قد لا يملكون حساباً.';

CREATE TABLE `family_books` (
  `book_no` VARCHAR(12) NOT NULL COMMENT 'رقم الدفتر (8 أرقام في البيانات الحالية)',
  `head_national_id` CHAR(11) NULL COMMENT 'ربّ الأسرة',
  `governorate_code` VARCHAR(20) NOT NULL COMMENT 'المحافظة',
  `registry_place` VARCHAR(120) NOT NULL COMMENT 'مكان القيد',
  `issued_on` DATE NULL COMMENT 'تاريخ الإصدار',
  `fetched_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'آخر جلب من السجل',
  PRIMARY KEY (`book_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='دفاتر العائلة — دفتر العائلة كما يرد من السجل. يُستعمل في التقديم «من دفتر العائلة» لجلب أفراد الأسرة دفعة واحدة.';

CREATE TABLE `person_spouses` (
  `national_id` CHAR(11) NOT NULL COMMENT 'الشخص',
  `spouse_national_id` CHAR(11) NOT NULL COMMENT 'زوجه أو زوجته',
  PRIMARY KEY (`national_id`, `spouse_national_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الأزواج في السجل — علاقة الزواج كما يردها السجل (متعددة إلى متعددة، ومتناظرة).';

CREATE TABLE `accounts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `national_id` CHAR(11) NOT NULL COMMENT 'صاحب الحساب. فريد: لا يكون لرقم وطني أكثر من حساب',
  `phone` VARCHAR(20) NOT NULL COMMENT 'الهاتف بالصيغة الدولية E.164 (+963944123456). يُختار البلد من قائمة دول العالم ويُتحقق بمكتبة libphonenumber',
  `phone_verified_at` DATETIME(3) NULL COMMENT 'وقت التحقق من الهاتف برمز',
  `email` VARCHAR(160) NULL COMMENT 'البريد الإلكتروني، اختياري («للإشعارات والإيصالات إن رغبت»)',
  `password_hash` VARCHAR(255) NULL COMMENT 'بصمة كلمة المرور (bcrypt أو argon2). الحد الأدنى 6 أحرف. NULL لحساب فتحه المكتب ولم يُفعّله صاحبه بعد',
  `created_via` ENUM('self','office','coordinator','admin-profile') NOT NULL DEFAULT 'self' COMMENT 'كيف أُنشئ: self صاحبه، office موظف التسجيل في المكتب، coordinator المنسق التقني أو من يملك صلاحية التسجيل، admin-profile فُتح مع الملف الإداري',
  `created_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'موظف المكتب الذي فتحه',
  `created_by_account_id` BIGINT UNSIGNED NULL COMMENT 'المنسق الذي فتحه',
  `alt_phone` VARCHAR(20) NULL COMMENT 'رقم هاتف بديل (اختياري، الخطوة الرابعة)',
  `emergency_name` VARCHAR(120) NULL COMMENT 'جهة اتصال للطوارئ: شخص يبقى في سوريا ويُبلَّغ بمحطات الرحلة، مثل «سارة (ابنتي)»',
  `emergency_phone` VARCHAR(20) NULL COMMENT 'هاتف جهة الطوارئ',
  `photo_file_id` BIGINT UNSIGNED NULL COMMENT 'الصورة الشخصية المختارة عند إنشاء الحساب (النسخة التجريبية لا تحفظها)',
  `signup_rating` TINYINT UNSIGNED NULL COMMENT 'تقييم تجربة إنشاء الحساب 1–5 («كيف كانت تجربة إنشاء الحساب؟»)',
  `preferred_language` ENUM('ar','en') NOT NULL DEFAULT 'ar' COMMENT 'لغة العرض المفضلة (البوابات عربية فقط)',
  `display_scale` DECIMAL(3,2) NOT NULL DEFAULT 1.00 COMMENT 'تكبير العرض الذي اختاره (0.70–1.40). في النسخة التجريبية يُحفظ على الجهاز',
  `tour_seen_at` DATETIME(3) NULL COMMENT 'متى أنهى الجولة التعريفية',
  `last_seen_at` DATETIME(3) NULL COMMENT 'آخر ظهور (للإداريين: «● متصل الآن» خلال دقيقتين)',
  `status` ENUM('active','disabled') NOT NULL DEFAULT 'active' COMMENT 'حالة الحساب. إيقاف الإداري من الكادر يُخزَّن في cadre_people.account_status',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_accounts_national_id` (`national_id`),
  CONSTRAINT `ck_accounts_1` CHECK (signup_rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='حسابات المنصة — حساب واحد لكل رقم وطني، يدخل به صاحبه بوابة الحاج والبوابة الإدارية معاً. يُنشأ من صفحة «إنشاء حساب» بخطواتها الخمس (البيانات الأساسية، رمز التحقق، الشؤون المدنية، معلومات إضافية، الحساب جاهز)، أو يفتحه موظف المكتب أو المنسق التقني عن مواطن.';

CREATE TABLE `account_season_paths` (
  `account_id` BIGINT UNSIGNED NOT NULL COMMENT 'الحساب',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `path` ENUM('pilgrim','admin') NOT NULL COMMENT 'المسار: pilgrim «التسجيل على الحج / أتابع كحاج / أفتح ملف حاج لهذا الموسم»، admin «التقدّم لصفة إدارية / أتابع كإداري / أفتح ملفاً إدارياً جديداً»',
  `chosen_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الاختيار',
  `chosen_via` ENUM('season-card','apply-page','draft','role-page','home','register') NOT NULL COMMENT 'من أين اختير: بطاقة الموسم في «ملفي»، فتح «تقديم طلب حج»، حفظ مسودة طلب، صفحة «التسجيل كإداري»، الواجهة الرئيسية، أو بعد إنشاء الحساب مباشرة',
  PRIMARY KEY (`account_id`, `season_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مسار الحساب في كل موسم — ما اختاره صاحب الحساب لهذا الموسم: الحج أو الصفة الإدارية. السؤال «ماذا تريد أن تفعل هذا الموسم؟» أو «كيف تتابع هذا الموسم؟» لمن شارك قبلاً.';

CREATE TABLE `civil_claims` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `account_id` BIGINT UNSIGNED NOT NULL COMMENT 'الحساب صاحب الطلب',
  `doc_kind` ENUM('civil-statement','id-card','family-book') NOT NULL COMMENT 'الوثيقة المرفقة: civil-statement «بيان قيد مدني» (الافتراضي)، id-card «صورة البطاقة الشخصية»، family-book «دفتر العائلة»',
  `doc_file_id` BIGINT UNSIGNED NOT NULL COMMENT 'ملف الوثيقة (صورة أو PDF). النسخة التجريبية تحفظ اسم الملف وحده',
  `note` VARCHAR(500) NULL COMMENT 'ملاحظة للموظف (اختيارية)',
  `status` ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending' COMMENT 'الحالة: pending «غير مؤكدة — بانتظار القرار»، approved «صُحّحت»، rejected «رُفض التصحيح»',
  `decision_note` VARCHAR(1000) NULL COMMENT 'سبب القرار، يظهر لصاحب الحساب. 8 أحرف على الأقل',
  `decided_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'الموظف الذي قرر (صلاحية registration.review)',
  `decided_at` DATETIME(3) NULL COMMENT 'وقت القرار',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  PRIMARY KEY (`id`),
  CONSTRAINT `ck_civil_claims_1` CHECK (status = 'pending' OR (decision_note IS NOT NULL AND CHAR_LENGTH(decision_note) >= 8))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='طلبات تصحيح البيانات المدنية — حين يرى صاحب الحساب أن بياناته في السجل غير صحيحة («البيانات غير صحيحة» في الخطوة الثالثة)، يُنشأ الحساب على أي حال ويُرفع طلب تصحيح مع وثيقة، ويقرره موظف «مراجعة الطلبات والوثائق».';

CREATE TABLE `civil_claim_fields` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `claim_id` BIGINT UNSIGNED NOT NULL COMMENT 'طلب التصحيح',
  `field_key` ENUM('father_name','mother_name','last_name','birth_date','birth_place','marital_status') NOT NULL COMMENT 'الحقل: father_name «اسم الأب»، mother_name «اسم الأم»، last_name «الكنية»، birth_date «تاريخ الميلاد»، birth_place «مكان الولادة»، marital_status «الحالة المدنية»',
  `registry_value` VARCHAR(120) NOT NULL COMMENT 'القيمة في السجل وقت الطلب',
  `claimed_value` VARCHAR(120) NOT NULL COMMENT 'القيمة التي يقول إنها الصحيحة',
  `applied_at` DATETIME(3) NULL COMMENT 'وقت تطبيق القيمة بعد الاعتماد',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_civil_claim_fields_claim_id_field_key` (`claim_id`, `field_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الحقول المطلوب تصحيحها — كل حقل يختلف فيه ما كتبه صاحب الحساب عما في السجل. الرقم الوطني والاسم الأول لا يُصحَّحان (طُوبقا للتو).';

CREATE TABLE `account_season_history` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `national_id` CHAR(11) NOT NULL COMMENT 'الشخص (قد لا يملك حساباً بعد)',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `kind` ENUM('pilgrim','admin','none') NOT NULL COMMENT 'نوع المشاركة: pilgrim حاج، admin إداري، none «لم يشارك»',
  `label` VARCHAR(160) NOT NULL COMMENT 'الوصف المعروض: «أدّى الحج»، «تقدّم على الحج ولم يُقبل»، «رئيس مجموعة»…',
  `role_key` VARCHAR(40) NULL COMMENT 'الصفة الإدارية إن كان إدارياً',
  `detail` VARCHAR(200) NULL COMMENT 'المجموعة أو التكتل',
  `group_numbers` VARCHAR(100) NULL COMMENT 'أرقام المجموعات التي خدم فيها، مفصولة بفواصل',
  `rating` DECIMAL(2,1) NULL COMMENT 'تقييم الموسم من 5 (أساس تجديد الصفة بلا اختبار)',
  `source` VARCHAR(60) NULL COMMENT 'مصدر السجل (ترحيل، إدخال يدوي…)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_account_season_history_national_id_season_year` (`national_id`, `season_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='سجل المواسم المؤرشف — مشاركات صاحب الحساب في المواسم السابقة لما قبل المنصة أو المنقولة من أنظمة قديمة: أدّى الحج، تقدّم ولم يُقبل، خدم إدارياً بصفة وتقييم. المواسم من 1448 فصاعداً تُبنى من الطلبات والملفات الإدارية نفسها، وهذا الجدول للماضي. «لا يُحذف منه شيء».';

-- ───────────────────────────────────────────────────────────────
-- إعدادات التسجيل على الحج: الإصدارات والقرعة واعتماد الأعمار
-- ───────────────────────────────────────────────────────────────

CREATE TABLE `reg_config_versions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `version_no` SMALLINT UNSIGNED NOT NULL COMMENT 'رقم الإصدار داخل الموسم: الأعلى + 1',
  `code` VARCHAR(20) NOT NULL COMMENT 'المعرّف المقروء: {season}-v{n}، مثل 1448-v1',
  `config` JSON NOT NULL COMMENT 'الإعدادات كاملة: stages وtracks وeligibility وpayments وpostSteps وmessages (انظر شرح الشكل بعد الجداول)',
  `effective_from` DATETIME(3) NOT NULL COMMENT 'يبدأ سريانه من هذا الوقت (لا يكون في الماضي عند النشر). الإصدار الساري = آخر إصدار effective_from ≤ الآن',
  `note` VARCHAR(500) NOT NULL COMMENT 'ملاحظة النشر، إلزامية (تُملأ تلقائياً من قائمة التغييرات)',
  `based_on_version_id` BIGINT UNSIGNED NULL COMMENT 'الإصدار الذي بُني عليه',
  `published_by_staff_id` BIGINT UNSIGNED NOT NULL COMMENT 'من نشره (صلاحية registration.manage)',
  `published_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت النشر',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reg_config_versions_code` (`code`),
  UNIQUE KEY `uq_reg_config_versions_season_year_version_no` (`season_year`, `version_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='إصدارات إعدادات التسجيل — إصدار منشور لا يتغير. يظهر للحجاج من وقت سريانه، ويبقى أساساً لكل طلب بدأ عليه.';

CREATE TABLE `reg_config_drafts` (
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `config` JSON NOT NULL COMMENT 'الإعدادات قيد التعديل، بالشكل نفسه',
  `base_version_id` BIGINT UNSIGNED NULL COMMENT 'الإصدار الذي بدأت منه المسودة',
  `updated_by_staff_id` BIGINT UNSIGNED NOT NULL COMMENT 'آخر من عدّل',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`season_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مسودة إعدادات الموسم — المسودة التي تعدّلها إدارة التسجيل قبل النشر. واحدة لكل موسم؛ غيابها يعني نسخة من الإصدار الساري.';

CREATE TABLE `reg_form_fields` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `field_key` VARCHAR(60) NOT NULL COMMENT 'مفتاح الإجابة، مثل q_ab12cd',
  `field_type` ENUM('text','textarea','number','date','radio','select','checkboxes','yesno','consent') NOT NULL COMMENT 'النوع: text «نص قصير»، textarea «نص طويل»، number «رقم»، date «تاريخ»، radio «اختيار واحد»، select «اختيار واحد (قائمة)»، checkboxes «عدة اختيارات»، yesno «نعم / لا»، consent «إقرار بالموافقة»',
  `scope` ENUM('application','member') NOT NULL COMMENT 'النطاق: application سؤال للطلب كله، member «يُسأل لكل فرد في الطلب»',
  `context` ENUM('stage','post-step') NOT NULL COMMENT 'أين يُسأل: صفحة من نموذج التقديم، أو خطوة بعد القبول',
  `label` VARCHAR(300) NOT NULL COMMENT 'نص السؤال في آخر إصدار',
  `first_version_id` BIGINT UNSIGNED NOT NULL COMMENT 'أول إصدار ظهر فيه',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reg_form_fields_season_year_field_key` (`season_year`, `field_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='فهرس مفاتيح الأسئلة — كل سؤال أضافته الإدارة إلى النموذج له مفتاح إجابة ثابت. إذا أُعيد استعمال مفتاح في إصدار لاحق من الموسم نفسه فيجب أن يحتفظ بنوعه ونطاقه، وإلا اختلطت إجابات الطلبات القديمة بالجديدة.';

CREATE TABLE `direct_age_announcements` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `age` TINYINT UNSIGNED NOT NULL COMMENT 'العمر المقبول (68 لموسم 1448): يُحسب بجمع مقاعد الأعمار من الأكبر حتى تبلغ مقاعد القبول المباشر',
  `direct_seats` INT UNSIGNED NOT NULL COMMENT 'مقاعد القبول المباشر وقت الإصدار',
  `buckets` JSON NOT NULL COMMENT 'توزيع الأعمار المعتمد في الحساب: [{age_from, age_to, seats}]',
  `issued_by_staff_id` BIGINT UNSIGNED NOT NULL COMMENT 'من أصدرها (صلاحية lottery.import)',
  `issued_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإصدار والإرسال للاعتماد',
  `approved_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من اعتمدها وأعلنها (صلاحية lottery.approve)',
  `approved_at` DATETIME(3) NULL COMMENT 'وقت الاعتماد',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='اعتماد الأعمار المقبولة مباشرة — الخطوة الأولى في «القرعة»: يُصدر موظف الإدخال العمر المقبول من توزيع أعمار المسجّلين على القبول المباشر، وتعتمده اللجنة فيُكتب في season_settings.accepted_direct_age.';

CREATE TABLE `lottery_draws` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `status` ENUM('entered','sent','published','withdrawn') NOT NULL DEFAULT 'entered' COMMENT 'الحالة: entered أُدخلت، sent «أُرسلت للاعتماد»، published «اعتُمدت ونُشرت»، withdrawn سُحبت',
  `label` VARCHAR(160) NULL COMMENT 'وصف السحب المعروض، مثل «15 ربيع الآخر 1448 (26 أيلول) — 21:00»',
  `venue` VARCHAR(160) NULL COMMENT 'مكان القرعة، مثل «جامعة الفرات، دير الزور»',
  `entered_by_staff_id` BIGINT UNSIGNED NOT NULL COMMENT 'من أدخل النتائج (lottery.import)',
  `entered_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإدخال',
  `sent_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من أرسلها للاعتماد',
  `sent_at` DATETIME(3) NULL COMMENT 'وقت الإرسال',
  `published_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من اعتمدها ونشرها (lottery.approve)',
  `published_at` DATETIME(3) NULL COMMENT 'وقت النشر',
  PRIMARY KEY (`id`),
  CONSTRAINT `ck_lottery_draws_1` CHECK (published_by_staff_id IS NULL OR published_by_staff_id <> entered_by_staff_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='نتائج القرعة — نتيجة القرعة العلنية كما يدخلها مكتب القرعة سطراً سطراً من البث، ثم تُرسَل للاعتماد، ثم تُعتمد وتُنشر. لا يقرر القبول إلا السحب المنشور.';

CREATE TABLE `lottery_draw_picks` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `draw_id` BIGINT UNSIGNED NOT NULL COMMENT 'السحب',
  `birth_year` SMALLINT UNSIGNED NOT NULL COMMENT 'سنة الميلاد المسحوبة',
  `birth_month` TINYINT UNSIGNED NULL COMMENT 'الشهر 1–12 (كانون الثاني … كانون الأول). NULL = «جميع الأشهر»',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_lottery_draw_picks_draw_id_birth_year_birth_month` (`draw_id`, `birth_year`, `birth_month`),
  CONSTRAINT `ck_lottery_draw_picks_1` CHECK (birth_month BETWEEN 1 AND 12)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='السنوات والأشهر المسحوبة — سطر لكل سنة ميلاد مسحوبة: كاملة أو بأشهر محددة.';

-- ───────────────────────────────────────────────────────────────
-- طلب الحج: المسودة والأفراد والموافقات والتقديم والمراجعة والدفع
-- ───────────────────────────────────────────────────────────────

CREATE TABLE `application_drafts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `owner_account_id` BIGINT UNSIGNED NOT NULL COMMENT 'الحساب الذي يملأ المسودة',
  `config_version_id` BIGINT UNSIGNED NOT NULL COMMENT 'الإصدار المثبَّت عند أول حفظ، يبقى حتى التقديم',
  `track` ENUM('direct','lottery') NOT NULL DEFAULT 'direct' COMMENT 'نوع التسجيل: direct «التسجيل على القبول المباشر»، lottery «التسجيل الأولي على القرعة»',
  `for_whom` ENUM('me','other') NOT NULL DEFAULT 'me' COMMENT 'لمن: me «لي أنا»، other «لشخص آخر»',
  `residence` VARCHAR(60) NOT NULL DEFAULT 'سوريا' COMMENT 'مكان الإقامة: «سوريا» أو أحد مكاتب الخارج (تركيا — إسطنبول، تركيا — غازي عنتاب، مصر، الأردن)',
  `family_book_no` VARCHAR(12) NULL COMMENT 'دفتر العائلة الذي جُلب منه الأفراد',
  `screen_history` JSON NOT NULL COMMENT 'مكدس الشاشات للعودة إلى حيث توقف: intro، track، forWhom، residence، companions، method، booklet، count، adder، review، elderly، eligibility، consents، summary، payment، أو stage:<id>',
  `max_phase` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'أبعد مرحلة بلغها في شريط المراحل',
  `answers` JSON NULL COMMENT 'إجابات أسئلة الطلب {field_key: value}',
  `member_answers` JSON NULL COMMENT 'إجابات أسئلة الأفراد {national_id: {field_key: value}}',
  `applicant_consent_at` DATETIME(3) NULL COMMENT 'عند التقديم لشخص آخر: وقت موافقته برمز إلى هاتفه',
  `applicant_consent_otp_id` BIGINT UNSIGNED NULL COMMENT 'رمز موافقة صاحب الطلب',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_application_drafts_owner_account_id_season_year` (`owner_account_id`, `season_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مسودات الطلبات — طلب قيد التعبئة، يُحفظ عند كل خطوة. «في الإنتاج هذا جدول على الخادم بالحقول نفسها» كما يقول الكود.';

CREATE TABLE `application_draft_members` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `draft_id` BIGINT UNSIGNED NOT NULL COMMENT 'المسودة',
  `national_id` CHAR(11) NOT NULL COMMENT 'الفرد',
  `relation` ENUM('self','spouse','parent','child','sibling','grandparent','grandchild','other') NOT NULL COMMENT 'صلة الفرد بصاحب الطلب: self «صاحب الطلب»، spouse «زوج/زوجة»، parent «أب/أم»، child «ابن/ابنة»، sibling «أخ/أخت»، grandparent «جد/جدة»، grandchild «حفيد/حفيدة»، other «قريب / مرافق»',
  `relation_verified` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = أكّد السجل المدني الصلة المصرَّح بها؛ 0 = «صلة مصرّح بها» تذهب إلى المراجعة',
  `companion_national_id` CHAR(11) NULL COMMENT 'لمن بلغ 69 عاماً فأكثر: الفرد الذي يرافقه في الطلب نفسه',
  `sort_order` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'الترتيب',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_application_draft_members_draft_id_national_id` (`draft_id`, `national_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='أفراد المسودة — الأفراد كما أُضيفوا في المسودة، بصلاتهم وتحققها.';

CREATE TABLE `applications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `number` VARCHAR(12) NOT NULL COMMENT 'رقم الطلب، فريد في الموسم، من number_sequences (النسخة التجريبية تشتقه من الرقم الوطني بين 4000 و8999 وقد يتكرر)',
  `owner_account_id` BIGINT UNSIGNED NOT NULL COMMENT 'الحساب الذي قُدّم منه الطلب (صاحب الطلب نفسه، أو من قدّمه لشخص آخر)',
  `applicant_national_id` CHAR(11) NOT NULL COMMENT 'صاحب الطلب: الفرد الأكبر سناً (relation = self)',
  `track` ENUM('direct','lottery') NOT NULL COMMENT 'نوع التسجيل: direct «التسجيل على القبول المباشر»، lottery «التسجيل الأولي على القرعة»',
  `for_whom` ENUM('me','other') NOT NULL COMMENT 'me لصاحب الحساب، other «لشخص آخر» (صاحب الطلب ≠ الحساب)',
  `mode` ENUM('booklet','national','solo','manual') NOT NULL COMMENT 'طريقة إضافة الأفراد: booklet «وثيقة العائلة»، national «الرقم الوطني»، solo «طلب فردي»، manual «إدخال يدوي» (بيانات قديمة)',
  `residence` VARCHAR(60) NOT NULL COMMENT 'مكان الإقامة وقت التقديم',
  `office_id` BIGINT UNSIGNED NOT NULL COMMENT 'المكتب الذي يتبعه الطلب (لا يُختار: محافظة قيد صاحب الطلب، أو بلد الإقامة، أو مكتب من سجّله)',
  `status` ENUM('submitted','checking','eligible','accepted-direct','not-accepted-direct','awaiting-draw','accepted-lottery','not-drawn','confirmed','lapsed','suspended','withdrawn','moved-to-lottery') NOT NULL DEFAULT 'submitted' COMMENT 'الحالة: submitted «مُقدَّم»، checking «تدقيق البيانات»، eligible «مؤهل»، accepted-direct «مقبول مباشرة»، not-accepted-direct «لم يُقبل مباشرة»، awaiting-draw «بانتظار القرعة»، accepted-lottery «مقبول بالقرعة»، not-drawn «لم يُقبل بالقرعة»، confirmed «ثبّت قبوله» (المقبول بالقرعة بعد الدفعة الأولى)، lapsed «سقط قبوله» (لم يثبّت قبل الموعد)، suspended «موقوف بقرار المراجعة»، withdrawn «انسحب»، moved-to-lottery «نُقل أفراده إلى طلب القرعة»',
  `config_version_id` BIGINT UNSIGNED NOT NULL COMMENT 'الإصدار الذي قُدّم عليه',
  `policy_snapshot` JSON NOT NULL COMMENT 'شروط الموسم المجمّدة وقت التقديم: rules (الأعمار والمرافقون)، accepted_direct_age، fees {registrationPerPerson، hajjCost، hady، firstInstallment، installmentCount، schedule[{key، label، perPerson، dueLabel، dueStep}]، extrasStep}. كل حساب لاحق للتكاليف يقرأ منها',
  `announced_direct_age` TINYINT UNSIGNED NULL COMMENT 'العمر المعلَن لجولة هذا الطلب إن اختلف عن الموسم',
  `installment_plan` TINYINT UNSIGNED NULL COMMENT 'عدد دفعات تكلفة الحج المعمول به (1 أو 2…)',
  `registration_receipt_no` VARCHAR(24) NOT NULL COMMENT 'إيصال رسم التسجيل {season}-R-{n:06}',
  `total_paid` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'مجموع المدفوع على الطلب (يُحدَّث مع كل دفعة مؤكدة)',
  `previous_application_id` BIGINT UNSIGNED NULL COMMENT 'طلب القبول المباشر المغلق الذي حلّ محله طلب القرعة هذا',
  `credit_from_application_id` BIGINT UNSIGNED NULL COMMENT 'الطلب الذي انتقلت منه الدفعة الأولى رصيداً',
  `submitted_by_kind` ENUM('self','office','coordinator') NOT NULL DEFAULT 'self' COMMENT 'من قدّمه: self صاحب الحساب، office موظف التسجيل في المكتب، coordinator إداري يملك صلاحية التسجيل',
  `submitted_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'موظف المكتب الذي قدّمه',
  `submitted_by_account_id` BIGINT UNSIGNED NULL COMMENT 'الإداري الذي قدّمه',
  `submitted_by_position` VARCHAR(80) NULL COMMENT 'صفة من قدّمه وقت التقديم (لقطة)',
  `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت التقديم',
  `decided_at` DATETIME(3) NULL COMMENT 'وقت صدور القبول أو عدمه',
  `acceptance_basis` ENUM('direct-age','lottery-draw') NULL COMMENT 'سبب القبول: العمر في القبول المباشر، أو سنة الميلاد في السحب',
  `lottery_draw_id` BIGINT UNSIGNED NULL COMMENT 'السحب الذي قُبل به',
  `closed_at` DATETIME(3) NULL COMMENT 'إغلاق الطلب (لم يُقبل، نُقل، سقط، انسحب)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_applications_registration_receipt_no` (`registration_receipt_no`),
  UNIQUE KEY `uq_applications_season_year_number` (`season_year`, `number`),
  KEY `ix_applications_owner_account_id` (`owner_account_id`),
  KEY `ix_applications_applicant_national_id` (`applicant_national_id`),
  KEY `ix_applications_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='طلبات الحج — الطلب المقدَّم. يحمل نسخة مجمّدة من شروط الموسم وقت التقديم، وحالته الصريحة.';

CREATE TABLE `application_status_history` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `application_id` BIGINT UNSIGNED NOT NULL COMMENT 'الطلب',
  `status` VARCHAR(30) NOT NULL COMMENT 'الحالة الجديدة (القيم نفسها في applications.status)',
  `changed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الانتقال',
  `actor_kind` ENUM('system','staff','account') NOT NULL COMMENT 'من أحدثه',
  `staff_user_id` BIGINT UNSIGNED NULL COMMENT 'الموظف',
  `account_id` BIGINT UNSIGNED NULL COMMENT 'صاحب الحساب',
  `note` VARCHAR(500) NULL COMMENT 'سبب أو ملاحظة',
  PRIMARY KEY (`id`),
  KEY `ix_application_status_history_application_id_changed_at` (`application_id`, `changed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='تاريخ حالات الطلب — كل انتقال في حالة الطلب، ومن أحدثه ولماذا.';

CREATE TABLE `application_members` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `application_id` BIGINT UNSIGNED NOT NULL COMMENT 'الطلب',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم (مكرر من الطلب لفرض «لا يكون الفرد في طلبين في الموسم»)',
  `national_id` CHAR(11) NOT NULL COMMENT 'الفرد',
  `relation` ENUM('self','spouse','parent','child','sibling','grandparent','grandchild','other') NOT NULL COMMENT 'صلة الفرد بصاحب الطلب: self «صاحب الطلب»، spouse «زوج/زوجة»، parent «أب/أم»، child «ابن/ابنة»، sibling «أخ/أخت»، grandparent «جد/جدة»، grandchild «حفيد/حفيدة»، other «قريب / مرافق»',
  `relation_verified` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'تحقق السجل من الصلة',
  `is_applicant` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = صاحب الطلب (relation = self)',
  `companion_national_id` CHAR(11) NULL COMMENT 'مرافق من بلغ 69 عاماً فأكثر (فرد في الطلب نفسه، بالغ 17 عاماً، غير كبير سن، لا يرافق اثنين)',
  `current_marker` TINYINT(1) NULL DEFAULT 1 COMMENT '1 ما دام الطلب قائماً، و NULL بعد إغلاقه. مع المفتاح الفريد (season_year، national_id، current_marker) يمنع وجود الفرد في طلبين قائمين في الموسم',
  `person_snapshot` JSON NOT NULL COMMENT 'بياناته المدنية كما كانت وقت التقديم (الاسم، الجنس، الميلاد، المحافظة، الدفتر)',
  `needs` JSON NULL COMMENT 'احتياجاته بعد القبول [«كرسي متحرك»، «سكري»…]: تُملأ من ملفه الصحي وتقرأها الغرف والوجبات والقوائم',
  `sort_order` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'الترتيب',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_application_members_application_id_national_id` (`application_id`, `national_id`),
  UNIQUE KEY `uq_application_members_season_year_national_id_current_marker` (`season_year`, `national_id`, `current_marker`),
  CONSTRAINT `ck_application_members_1` CHECK (current_marker IS NULL OR current_marker = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='أفراد الطلب — كل فرد في الطلب المقدَّم، مع لقطة من بياناته المدنية وقت التقديم.';

CREATE TABLE `application_answers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `application_id` BIGINT UNSIGNED NOT NULL COMMENT 'الطلب',
  `member_national_id` CHAR(11) NULL COMMENT 'الفرد لسؤال نطاقه member؛ NULL لسؤال الطلب',
  `field_key` VARCHAR(60) NOT NULL COMMENT 'مفتاح السؤال (reg_form_fields.field_key)',
  `value` JSON NOT NULL COMMENT 'الإجابة: نص، أو رقم، أو منطقي، أو مصفوفة نصوص للاختيار المتعدد',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_application_answers_ce972c62` (`application_id`, `member_national_id`, `field_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='إجابات أسئلة الطلب — إجابات الأسئلة التي أضافتها الإدارة إلى النموذج، للطلب كله أو لكل فرد.';

CREATE TABLE `application_consents` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `draft_id` BIGINT UNSIGNED NULL COMMENT 'المسودة وقت الطلب',
  `application_id` BIGINT UNSIGNED NULL COMMENT 'الطلب بعد التقديم',
  `national_id` CHAR(11) NOT NULL COMMENT 'الفرد الموافق',
  `kind` ENUM('companion','applicant') NOT NULL COMMENT 'companion موافقة مرافق، applicant موافقة صاحب طلب يُقدَّم عنه',
  `via` ENUM('app','sms') NOT NULL COMMENT 'app «دعوة داخل التطبيق»، sms «رمز موافقة إلى الهاتف ••• tail»',
  `status` ENUM('pending','approved','declined') NOT NULL DEFAULT 'pending' COMMENT 'pending بانتظار، approved «أوافق على الانضمام»، declined «أعتذر»',
  `sent_at` DATETIME(3) NOT NULL COMMENT 'وقت الإرسال (يتجدد مع «إعادة الإرسال»)',
  `responded_at` DATETIME(3) NULL COMMENT 'وقت الرد',
  `otp_challenge_id` BIGINT UNSIGNED NULL COMMENT 'الرمز المستعمل للموافقة بالرسالة',
  PRIMARY KEY (`id`),
  KEY `ix_application_consents_national_id_status` (`national_id`, `status`),
  CONSTRAINT `ck_application_consents_1` CHECK (draft_id IS NOT NULL OR application_id IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='موافقات أفراد الطلب — كل فرد بلغ 17 عاماً (عدا مقدّم الطلب نفسه) يوافق على انضمامه: بدعوة داخل التطبيق إن كان له حساب، أو برمز إلى هاتفه. وعند التقديم لشخص آخر يوافق صاحب الطلب نفسه برمز.';

CREATE TABLE `application_reviews` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `application_id` BIGINT UNSIGNED NOT NULL COMMENT 'الطلب',
  `decision` ENUM('approved','rejected') NOT NULL COMMENT 'approved «معتمد»، rejected «مرفوض» (يُعرض «موقوف بقرار المراجعة»)',
  `note` VARCHAR(1000) NOT NULL COMMENT 'سبب القرار، 8 أحرف على الأقل، يراه صاحب الطلب',
  `flags` JSON NULL COMMENT 'أسباب دخول القائمة وقت القرار: صلات غير متحققة، تنبيهات الأهلية',
  `decided_by_staff_id` BIGINT UNSIGNED NOT NULL COMMENT 'المراجع (صلاحية registration.review)',
  `decided_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت القرار',
  `is_current` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 للقرار الساري؛ القرار الجديد يجعل السابق 0',
  PRIMARY KEY (`id`),
  KEY `ix_application_reviews_application_id_is_current` (`application_id`, `is_current`),
  CONSTRAINT `ck_application_reviews_1` CHECK (CHAR_LENGTH(note) >= 8)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مراجعة الطلبات — قرار بشري على طلب: يدخل الطلب قائمة المراجعة إذا لم تتحقق صلة قرابة، أو نبّه فحص الأهلية، أو فشل فحص عام. القرار يظهر لصاحب الطلب، والمرفوض يوقف خطوات ما بعد القبول.';

CREATE TABLE `payments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `payment_no` VARCHAR(24) NOT NULL COMMENT 'معرّف الدفعة PAY-…',
  `payer_account_id` BIGINT UNSIGNED NOT NULL COMMENT 'الحساب الدافع',
  `application_id` BIGINT UNSIGNED NULL COMMENT 'الطلب الذي تخصه (للحجاج)',
  `admin_season_file_id` BIGINT UNSIGNED NULL COMMENT 'الملف الإداري الذي تخصه (رسم التسجيل كإداري)',
  `group_id` BIGINT UNSIGNED NULL COMMENT 'المجموعة (رسم التشكيل)',
  `cluster_id` BIGINT UNSIGNED NULL COMMENT 'التكتل (رسم التشكيل)',
  `purpose` ENUM('registration','first-installment','post-lines','admin-registration','group-formation','cluster-formation') NOT NULL COMMENT 'الغرض: registration رسم التسجيل على الحج (ومعه الدفعة الأولى للمباشر)، first-installment الدفعة الأولى للمقبول بالقرعة، post-lines دفعات ما بعد القبول، admin-registration رسم التسجيل كإداري، group-formation رسم تشكيل مجموعة، cluster-formation رسم تشكيل تكتل',
  `method` ENUM('shamcash','bank','office','card') NOT NULL COMMENT 'طريقة الدفع: shamcash «شام كاش» (فوري من التطبيق)، bank «المصرف المعتمد — إشعار مرفوع»، office نقداً في المكتب، card بطاقة (قيمة قديمة لطلبات ما قبل شام كاش، للترحيل فقط)',
  `amount` DECIMAL(12,2) NOT NULL COMMENT 'المبلغ بالدولار، أكبر من صفر',
  `currency` CHAR(3) NOT NULL DEFAULT 'USD' COMMENT 'العملة',
  `provider_tx_no` VARCHAR(40) NULL COMMENT 'رقم العملية في شام كاش (6–12 رقماً في الواجهة)',
  `bank_reference` VARCHAR(40) NULL COMMENT 'الرقم المرجعي للدفع في المصرف ({season}-BANK-…)',
  `bank_slip_file_id` BIGINT UNSIGNED NULL COMMENT 'إشعار الدفع المصرفي المرفوع',
  `status` ENUM('pending','confirmed','failed','refunded') NOT NULL DEFAULT 'pending' COMMENT 'الحالة: pending بانتظار تأكيد المزوّد أو مطابقة الإشعار، confirmed مؤكدة، failed فشلت، refunded رُدّت',
  `confirmed_at` DATETIME(3) NULL COMMENT 'وقت تأكيد المزوّد',
  `confirmed_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'الموظف الذي طابق الإشعار المصرفي (للدفع المصرفي)',
  `used_at` DATETIME(3) NULL COMMENT 'متى استُهلكت في تقديم طلب أو دفع بنود (لا تُستعمل دفعة مرتين)',
  `collected_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'موظف المكتب الذي استلم (للدفع في المكتب)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payments_payment_no` (`payment_no`),
  KEY `ix_payments_payer_account_id` (`payer_account_id`),
  KEY `ix_payments_application_id` (`application_id`),
  KEY `ix_payments_status` (`status`),
  CONSTRAINT `ck_payments_1` CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='المدفوعات — كل دفعة مؤكدة من مزوّدها: رسم التسجيل، الدفعة الأولى، دفعات ما بعد القبول (الدفعة الثانية والهدي والسكن الخاص)، ورسوم الإداريين والمجموعات والتكتلات. الكود يحفظ سجلاً مختصراً (PaymentRecord) ولا يحفظ رقم عملية شام كاش ولا إشعار المصرف؛ هنا يُحفظان.';

CREATE TABLE `payment_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `payment_id` BIGINT UNSIGNED NOT NULL COMMENT 'الدفعة',
  `line_key` VARCHAR(20) NOT NULL COMMENT 'البند: registration (رسم التسجيل)، i1..i4 (دفعات تكلفة الحج)، hady (الهدي)، room (السكن الخاص)، admin-fee، group-fee، cluster-fee',
  `title` VARCHAR(120) NOT NULL COMMENT 'عنوان البند: «الدفعة الأولى»، «الدفعة الثانية»، «الهدي»، «السكن الخاص»…',
  `detail` VARCHAR(200) NULL COMMENT 'التفصيل، مثل «4 × 1,250 $» أو «غرفة بأربعة أسرّة — 4 × 50 $»',
  `amount` DECIMAL(12,2) NOT NULL COMMENT 'المبلغ',
  `receipt_no` VARCHAR(30) NOT NULL COMMENT 'الإيصال: {season}-R-{n:06} للتسجيل؛ {season}-P-{رقم الطلب:06}-{n} للدفعات و-H للهدي و-R للسكن؛ {season}-A-… للإداري؛ {season}-G-… للمجموعة',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payment_items_receipt_no` (`receipt_no`),
  UNIQUE KEY `uq_payment_items_payment_id_line_key` (`payment_id`, `line_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='بنود الدفعة وإيصالاتها — ما غطّته الدفعة بنداً بنداً، ولكل بند إيصال رقمي.';

CREATE TABLE `refunds` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `payment_id` BIGINT UNSIGNED NOT NULL COMMENT 'الدفعة الأصلية',
  `application_id` BIGINT UNSIGNED NULL COMMENT 'الطلب',
  `amount` DECIMAL(12,2) NOT NULL COMMENT 'المبلغ المردود',
  `reason` ENUM('not-accepted-direct','not-drawn','lapsed','withdrawn','other') NOT NULL COMMENT 'السبب: لم يُقبل مباشرة ولم ينتقل، لم تسحبه القرعة، سقط قبوله، انسحب، آخر',
  `status` ENUM('requested','approved','paid','rejected') NOT NULL DEFAULT 'requested' COMMENT 'الحالة',
  `method` ENUM('shamcash','bank','office') NULL COMMENT 'طريقة الرد',
  `reference` VARCHAR(60) NULL COMMENT 'مرجع عملية الرد',
  `decided_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من قرر',
  `decided_at` DATETIME(3) NULL COMMENT 'وقت القرار',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  PRIMARY KEY (`id`),
  CONSTRAINT `ck_refunds_1` CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='المبالغ المردودة — رد مبلغ: الدفعة الأولى لمن لم يُقبل مباشرة ولم ينتقل إلى القرعة، والرصيد لمن لم تسحبه القرعة. الكود يذكرها نصاً ولا يخزّنها.';

-- ───────────────────────────────────────────────────────────────
-- ما بعد القبول: الخطوات السبع والسكن والتأشيرة
-- ───────────────────────────────────────────────────────────────

CREATE TABLE `post_acceptance` (
  `application_id` BIGINT UNSIGNED NOT NULL COMMENT 'الطلب المقبول (المفتاح الأساسي)',
  `confirmed_at` DATETIME(3) NULL COMMENT 'وقّع التعليمات إلكترونياً وأكّد قبوله («قرأت التعليمات» ثم «أؤكد وأوقّع إلكترونياً»)',
  `cluster_id` BIGINT UNSIGNED NULL COMMENT 'التكتل الذي أُلحقت به العائلة',
  `group_id` BIGINT UNSIGNED NULL COMMENT 'المجموعة (تُعرض باسمها لا برقمها)',
  `group_approved_at` DATETIME(3) NULL COMMENT 'بداية العضوية في المجموعة (اعتماد العقد)',
  `contract_signed_at` DATETIME(3) NULL COMMENT 'توقيع عقد المجموعة (يساوي group_approved_at في الإلحاق بالمكتب)',
  `enrolled_by_kind` ENUM('staff','account') NULL COMMENT 'من ألحق العائلة: موظف المكتب، أو إداري المجموعة',
  `enrolled_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'موظف المكتب',
  `enrolled_by_account_id` BIGINT UNSIGNED NULL COMMENT 'الإداري',
  `visa_completed_at` DATETIME(3) NULL COMMENT 'اكتمال تأشيرات كل الأفراد: تُفتح بها الرحلة والفنادق والمشاعر و«قوائمي» وصفحات الموسم وزر الطوارئ والبطاقة الرقمية',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`application_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='سجل ما بعد القبول — صف واحد لكل طلب مقبول، يجمع لحظات المسار الكبرى.';

CREATE TABLE `post_step_ratings` (
  `application_id` BIGINT UNSIGNED NOT NULL COMMENT 'الطلب',
  `step_key` VARCHAR(40) NOT NULL COMMENT 'الخطوة: acceptance، confirm، documents، group، payment، passport، medical، visa، أو معرّف خطوة أضافتها الإدارة',
  `rating` TINYINT UNSIGNED NOT NULL COMMENT 'التقييم 1–5',
  `rated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت التقييم',
  PRIMARY KEY (`application_id`, `step_key`),
  CONSTRAINT `ck_post_step_ratings_1` CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='تقييم الخطوات — بعد اكتمال كل خطوة يُسأل الحاج سؤالها (مثل «كيف تقيّم وضوح شروط الجواز وسرعة مراجعته؟») من 1 إلى 5. ومعها تقييم القبول «كيف تقيّم وضوح طريقتي القبول وشفافية القرعة؟».';

CREATE TABLE `post_custom_step_completions` (
  `application_id` BIGINT UNSIGNED NOT NULL COMMENT 'الطلب',
  `step_key` VARCHAR(40) NOT NULL COMMENT 'معرّف الخطوة في الإصدار المثبَّت',
  `completed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإكمال',
  `answers` JSON NULL COMMENT 'إجابات الطلب',
  `member_answers` JSON NULL COMMENT 'إجابات الأفراد {national_id: {key: value}}',
  PRIMARY KEY (`application_id`, `step_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الخطوات المضافة من الإدارة — إكمال خطوة إقرار أو أسئلة أضافتها إدارة التسجيل بين الخطوات الأساسية.';

CREATE TABLE `member_documents` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `application_id` BIGINT UNSIGNED NOT NULL COMMENT 'الطلب',
  `national_id` CHAR(11) NOT NULL COMMENT 'الفرد',
  `doc_key` ENUM('photo','passport') NOT NULL COMMENT 'الوثيقة: photo «الصورة الشخصية» (خلفية بيضاء، حديثة، دون نظارات)، passport «جواز السفر» (صفحة البيانات كاملة وواضحة)',
  `status` ENUM('missing','uploaded','rejected','approved') NOT NULL DEFAULT 'missing' COMMENT 'الحالة: missing «لم تُرفع»، uploaded «عند المراجعة»، rejected «أُعيدت»، approved «مقبولة»',
  `file_id` BIGINT UNSIGNED NULL COMMENT 'الملف المرفوع',
  `passport_no` VARCHAR(20) NULL COMMENT 'رقم الجواز',
  `passport_expiry` DATE NULL COMMENT 'انتهاء الجواز: يجب أن يبقى سارياً 6 أشهر على الأقل بعد العودة',
  `reject_reason` VARCHAR(500) NULL COMMENT 'سبب الإعادة',
  `rejected_count` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'مرات الإعادة',
  `uploaded_at` DATETIME(3) NULL COMMENT 'وقت الرفع',
  `reviewed_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'المراجع',
  `reviewed_at` DATETIME(3) NULL COMMENT 'وقت المراجعة',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_member_documents_application_id_national_id_doc_key` (`application_id`, `national_id`, `doc_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الصورة الشخصية والجواز — وثيقتا الهوية لكل فرد: الصورة (بعد الدفعة الأولى) والجواز (بعد اكتمال الدفعة الثانية حصراً). تراجعهما «إدارة التسجيل».';

CREATE TABLE `group_enrollment_contracts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `application_id` BIGINT UNSIGNED NOT NULL COMMENT 'الطلب (العائلة كلها تنتقل معاً أو لا تنتقل)',
  `group_id` BIGINT UNSIGNED NOT NULL COMMENT 'المجموعة المطلوبة',
  `cluster_id` BIGINT UNSIGNED NULL COMMENT 'تكتلها',
  `transfer_from_group_id` BIGINT UNSIGNED NULL COMMENT 'المجموعة الحالية للعائلة إن كان العقد ينقلها',
  `status` ENUM('pending','approved','returned') NOT NULL DEFAULT 'pending' COMMENT 'الحالة: pending «عند المكتب»، approved «نافذ»، returned «أُعيد»',
  `file_id` BIGINT UNSIGNED NOT NULL COMMENT 'صورة العقد الموقّع',
  `uploaded_by_kind` ENUM('staff','account') NOT NULL COMMENT 'من رفعه',
  `uploaded_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'موظف المكتب',
  `uploaded_by_account_id` BIGINT UNSIGNED NULL COMMENT 'إداري المجموعة',
  `uploaded_by_role` VARCHAR(80) NOT NULL COMMENT 'صفته وقت الرفع',
  `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الرفع',
  `decided_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'موظف المكتب الذي قرر',
  `decided_at` DATETIME(3) NULL COMMENT 'وقت القرار',
  `return_reason` VARCHAR(500) NULL COMMENT 'سبب الإعادة (إلزامي عند الإعادة)',
  PRIMARY KEY (`id`),
  CONSTRAINT `ck_group_enrollment_contracts_1` CHECK (status <> 'returned' OR return_reason IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='عقود الإلحاق بالمجموعات — الحاج لا يختار مجموعته من المنصة: يوقّع العقد ورقياً في المكتب، فيرفعه موظف المكتب ويُلحق العائلة كاملة. وقد يرفع إداري المجموعة العقد فيقرره المكتب (المسار القديم).';

CREATE TABLE `application_group_transfers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `application_id` BIGINT UNSIGNED NOT NULL COMMENT 'الطلب',
  `from_group_id` BIGINT UNSIGNED NOT NULL COMMENT 'من مجموعة',
  `to_group_id` BIGINT UNSIGNED NOT NULL COMMENT 'إلى مجموعة',
  `contract_id` BIGINT UNSIGNED NULL COMMENT 'العقد الذي نقلها',
  `moved_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الانتقال',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='انتقالات العائلة بين المجموعات — كل انتقال سابق للعائلة كاملة من مجموعة إلى أخرى.';

CREATE TABLE `group_family_acknowledgements` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `group_id` BIGINT UNSIGNED NOT NULL COMMENT 'المجموعة',
  `application_id` BIGINT UNSIGNED NOT NULL COMMENT 'العائلة',
  `decision` ENUM('accepted','rejected') NOT NULL DEFAULT 'accepted' COMMENT 'accepted استُلمت ورُحّب بها',
  `by_account_id` BIGINT UNSIGNED NOT NULL COMMENT 'الإداري الذي استلمها',
  `at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  `referred_needs` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = أُحيل احتياج خاص إلى مشرف البرج («إحالة احتياج خاص إلى مشرف البرج»)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_group_family_acknowledgements_group_id_application_id` (`group_id`, `application_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='استلام العائلة في المجموعة — حين تلتحق عائلة بمجموعة يستلمها فريق المجموعة ويرحّب بها («استلام عائلة … والترحيب بها»). هذا إقرار بالاستلام لا عضوية، والعضوية بالعقد. الكود يحفظه على ملف الإداري؛ هنا على المجموعة فيراه فريقها كله.';

CREATE TABLE `application_accommodation` (
  `application_id` BIGINT UNSIGNED NOT NULL COMMENT 'الطلب',
  `kind` ENUM('general','private') NOT NULL DEFAULT 'general' COMMENT 'general «السكن العام»، private غرف خاصة',
  `settled_at` DATETIME(3) NULL COMMENT 'يُقفل الاختيار بدفع بند السكن، أو بدفع الهدي للسكن العام',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`application_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='السكن: العام أو الغرف الخاصة — اختيار العائلة بعد الإلحاق بمجموعة: السكن العام (الرجال وحدهم والنساء وحدهن دون كلفة) أو غرف خاصة تتوزع عليها.';

CREATE TABLE `application_accommodation_rooms` (
  `application_id` BIGINT UNSIGNED NOT NULL COMMENT 'الطلب',
  `beds` TINYINT UNSIGNED NOT NULL COMMENT 'أسرّة الغرفة: 1 «غرفة مفردة بسرير واحد وحمّامها»، 2 «غرفة بسريرين»، 3 «بثلاثة أسرّة»، 4 «بأربعة أسرّة»',
  `rooms` TINYINT UNSIGNED NOT NULL COMMENT 'عدد الغرف من هذا النوع',
  `price_per_person` DECIMAL(12,2) NOT NULL COMMENT 'سعر الفرد في هذا النوع وقت الاختيار (من أسعار التكتل المعتمدة)',
  PRIMARY KEY (`application_id`, `beds`),
  CONSTRAINT `ck_application_accommodation_rooms_1` CHECK (beds BETWEEN 1 AND 4)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='توزيع الغرف الخاصة — عدد الغرف من كل نوع. مجموع الأسرّة يساوي عدد أفراد الطلب بالضبط.';

CREATE TABLE `application_payment_lines` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `application_id` BIGINT UNSIGNED NOT NULL COMMENT 'الطلب',
  `line_key` VARCHAR(20) NOT NULL COMMENT 'البند: i1..i4، hady، room',
  `title` VARCHAR(120) NOT NULL COMMENT 'العنوان: «الدفعة الأولى»، «الدفعة الثانية»، «تكلفة الحج كاملة»، «الهدي»، «السكن الخاص»',
  `amount` DECIMAL(12,2) NOT NULL COMMENT 'المبلغ للطلب كله',
  `due_step` VARCHAR(40) NULL COMMENT 'الخطوة التي يُدفع فيها (payment للدفعة الثانية والإضافات)',
  `due_label` VARCHAR(200) NULL COMMENT 'نص الاستحقاق المعروض، مثل «عند الانضمام إلى مجموعة»',
  `payment_item_id` BIGINT UNSIGNED NULL COMMENT 'بند الدفعة الذي سدّده',
  `paid_at` DATETIME(3) NULL COMMENT 'وقت السداد',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_application_payment_lines_application_id_line_key` (`application_id`, `line_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='بنود التكاليف بعد القبول — بنود ما يستحق على الطلب بعد القبول ومتى تُدفع: دفعات تكلفة الحج، الهدي، السكن الخاص. تُبنى من policy_snapshot والسكن، وتحفظ هنا لأن حالة الدفع لكل بند يجب أن تُخزَّن.';

CREATE TABLE `health_files` (
  `application_id` BIGINT UNSIGNED NOT NULL COMMENT 'الطلب',
  `recorded_by_account_id` BIGINT UNSIGNED NOT NULL COMMENT 'المنسق الذي سجّله',
  `recorded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت التسجيل',
  `confirmed_at` DATETIME(3) NULL COMMENT 'تأكيد الحاج. كل حفظ جديد من المنسق يلغي التأكيد',
  `correction_requested_at` DATETIME(3) NULL COMMENT 'طلب الحاج تصحيحه',
  `correction_note` VARCHAR(500) NULL COMMENT 'ما يطلب تصحيحه',
  PRIMARY KEY (`application_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الملف الصحي للعائلة — يأخذه المنسق التقني المسند إلى المجموعة من العائلة، ثم يؤكده الحاج («المعلومات صحيحة») أو يطلب تصحيحه.';

CREATE TABLE `health_records` (
  `application_id` BIGINT UNSIGNED NOT NULL COMMENT 'الطلب',
  `national_id` CHAR(11) NOT NULL COMMENT 'الفرد',
  `conditions` JSON NOT NULL COMMENT 'الأمراض المختارة من: «سكري»، «ضغط الدم»، «أمراض القلب»، «ربو أو أمراض تنفسية»، «أمراض الكلى»، «حساسية دوائية»',
  `needs` JSON NOT NULL COMMENT 'الاحتياجات من: «كرسي متحرك»، «صعوبة في المشي»، «وجبة خاصة»، «غرفة قريبة من المصعد»، «ضعف السمع أو البصر»، «أكسجين ليلي»',
  `medications` TEXT NULL COMMENT 'الأدوية الدائمة (نص حر). وجودها يُلزم بوصفة طبية',
  PRIMARY KEY (`application_id`, `national_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الحالة الصحية لكل فرد — الأمراض والاحتياجات والأدوية الدائمة لكل فرد. تُنسخ الاحتياجات إلى application_members.needs فتقرؤها الغرف والوجبات والقوائم.';

CREATE TABLE `medical_document_types` (
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `doc_key` VARCHAR(30) NOT NULL COMMENT 'المفتاح: covid، meningitis، flu، report، prescription',
  `label` VARCHAR(120) NOT NULL COMMENT 'الاسم: «شهادة لقاح كورونا»، «شهادة لقاح الحمى الشوكية»، «شهادة لقاح الإنفلونزا الموسمية»، «التقرير الطبي العام»، «الوصفة الطبية للأدوية الدائمة»',
  `hint` VARCHAR(200) NOT NULL COMMENT 'الشرح: «بالجرعات المعتمدة»، «سارية خلال 3 سنوات»، «لهذا الموسم — لمن بلغ 60 عاماً»…',
  `min_age` TINYINT UNSIGNED NULL COMMENT 'لا تُطلب إلا ممن بلغ هذا العمر (60 للإنفلونزا)',
  `only_if_medications` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'لا تُطلب إلا ممن له أدوية دائمة (الوصفة)',
  `sort_order` TINYINT NOT NULL DEFAULT 0 COMMENT 'الترتيب',
  PRIMARY KEY (`season_year`, `doc_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الوثائق الطبية المطلوبة — قائمة الوثائق التي يرفعها الحاج في الخطوة السادسة، لكل موسم.';

CREATE TABLE `member_medical_documents` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `application_id` BIGINT UNSIGNED NOT NULL COMMENT 'الطلب',
  `national_id` CHAR(11) NOT NULL COMMENT 'الفرد',
  `doc_key` VARCHAR(30) NOT NULL COMMENT 'الوثيقة (medical_document_types.doc_key)',
  `status` ENUM('missing','uploaded','rejected','approved') NOT NULL DEFAULT 'missing' COMMENT 'الحالة: missing «لم تُرفع»، uploaded «عند المراجعة»، rejected «أُعيدت»، approved «مقبولة»',
  `file_id` BIGINT UNSIGNED NULL COMMENT 'الملف',
  `reject_note` VARCHAR(500) NULL COMMENT 'سبب الإعادة (3 أحرف على الأقل)',
  `uploaded_at` DATETIME(3) NULL COMMENT 'وقت الرفع',
  `reviewed_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من الفريق الطبي (صلاحية medical)',
  `reviewed_at` DATETIME(3) NULL COMMENT 'وقت المراجعة',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_member_medical_documents_application_id_national_id_doc_key` (`application_id`, `national_id`, `doc_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الوثائق الطبية لكل فرد — حالة كل وثيقة طبية مطلوبة من كل فرد، يراجعها «الفريق الطبي».';

CREATE TABLE `member_health_docs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `application_id` BIGINT UNSIGNED NOT NULL COMMENT 'الطلب',
  `national_id` CHAR(11) NOT NULL COMMENT 'الفرد',
  `kind` ENUM('certificate','prescription','condition') NOT NULL COMMENT 'النوع: certificate «الشهادة الصحية — وزارة الصحة»، prescription «وصفة طبية»، condition «تقرير حالة صحية»',
  `fit` TINYINT(1) NULL COMMENT 'للشهادة: 1 «سليم ولقاحاته مكتملة»، 0 «لديه حالة صحية»',
  `note` VARCHAR(1000) NULL COMMENT 'الأدوية أو الحالة. إلزامية للوصفة والتقرير وللشهادة غير السليمة',
  `file_id` BIGINT UNSIGNED NULL COMMENT 'الملف (صورة أو PDF حتى 12 ميغابايت)',
  `added_by_account_id` BIGINT UNSIGNED NOT NULL COMMENT 'الإداري الذي أضافها',
  `added_by_role` VARCHAR(80) NOT NULL COMMENT 'صفته',
  `added_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإضافة',
  `removed_at` DATETIME(3) NULL COMMENT 'سحبها (حذف منطقي)',
  PRIMARY KEY (`id`),
  CONSTRAINT `ck_member_health_docs_1` CHECK (kind <> 'certificate' OR fit IS NOT NULL),
  CONSTRAINT `ck_member_health_docs_2` CHECK ((kind = 'certificate' AND fit = 1) OR note IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='وثائق صحية يضيفها فريق المجموعة — الشهادة الصحية من وزارة الصحة، والوصفات، وتقارير الحالات، يضيفها رئيس المجموعة أو رئيس التكتل أو المنسق المسند، وتظهر في «خزنة الوثائق» للحاج. لا تدخل في اكتمال الخطوة الطبية.';

CREATE TABLE `member_visas` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `application_id` BIGINT UNSIGNED NOT NULL COMMENT 'الطلب',
  `national_id` CHAR(11) NOT NULL COMMENT 'الفرد',
  `visa_no` VARCHAR(30) NOT NULL COMMENT 'رقم التأشيرة كما في البريد (الصيغة التجريبية HV-1448-<الطلب>-<n>)',
  `file_id` BIGINT UNSIGNED NULL COMMENT 'ملف التأشيرة',
  `added_by_account_id` BIGINT UNSIGNED NOT NULL COMMENT 'المنسق التقني الذي أضافها',
  `added_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإضافة',
  `removed_at` DATETIME(3) NULL COMMENT 'حُذفت (ملف خطأ). الحذف يعيد فتح خطوة التأشيرة حتى تُضاف من جديد',
  `removed_by_account_id` BIGINT UNSIGNED NULL COMMENT 'من حذفها',
  `current_marker` TINYINT(1) NULL DEFAULT 1 COMMENT '1 للتأشيرة السارية، NULL للمحذوفة: تأشيرة سارية واحدة لكل فرد',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_member_visas_application_id_national_id_current_marker` (`application_id`, `national_id`, `current_marker`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='التأشيرات — تصل تأشيرة كل حاج بالبريد من وزارة الخارجية السعودية إلى مجموعته، فيضيفها المنسق التقني المسند إلى المجموعة: رقمها وملفها.';

-- ───────────────────────────────────────────────────────────────
-- الحاج في الموسم وبعد العودة: البلاغات والتقييمات والشهادة
-- ───────────────────────────────────────────────────────────────

CREATE TABLE `season_ratings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `application_id` BIGINT UNSIGNED NOT NULL COMMENT 'الطلب (العائلة)',
  `rating_key` VARCHAR(40) NOT NULL COMMENT 'المفتاح: stage-arrival، stage-hotel، stage-trip، stage-tawaf، stage-makkah-hotel، stage-madinah، stage-return (أسئلة المراحل)؛ mashaer-camp، mashaer-arafat، mashaer-transport، mashaer-meals، mashaer-guidance، mashaer-elderly (المشاعر)؛ meal-<اليوم>-breakfast|lunch (الوجبات)؛ eval-registration، eval-payment، eval-travel، eval-transport، eval-makkah، eval-madinah، eval-food، eval-group، eval-programs، eval-support، eval-recommend (التقييم الشامل)',
  `value` TINYINT UNSIGNED NOT NULL COMMENT '1–5 (في eval-recommend: 5 = نعم أوصي، 1 = لا)',
  `rated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_season_ratings_application_id_rating_key` (`application_id`, `rating_key`),
  CONSTRAINT `ck_season_ratings_1` CHECK (value BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='تقييمات الحاج أثناء الموسم — كل نجمة يعطيها الحاج في الموسم: مراحل الرحلة، المشاعر، كل وجبة، وبنود التقييم الشامل بعد العودة.';

CREATE TABLE `pilgrim_evaluations` (
  `application_id` BIGINT UNSIGNED NOT NULL COMMENT 'الطلب',
  `comments` JSON NULL COMMENT 'ملاحظات حرة لكل بند {key: text}',
  `submitted_at` DATETIME(3) NULL COMMENT 'وقت الإرسال',
  PRIMARY KEY (`application_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='التقييم الشامل بعد العودة — التقييم العام الاختياري للموسم: أحد عشر بنداً (في season_ratings بمفاتيح eval-*) وملاحظات. لا يدخل في تقييم الإداريين. الكود لا يحفظ الملاحظات ولا علامة الإرسال؛ هنا تُحفظان.';

CREATE TABLE `ticket_kinds` (
  `code` VARCHAR(20) NOT NULL COMMENT 'النوع: missing، health، transport، meal، room، lost، complaint',
  `label` VARCHAR(60) NOT NULL COMMENT 'الاسم: missing «حاج مفقود»، health «حالة صحية»، transport «نقل / تأخر حافلة»، meal «وجبة / ماء»، room «خيمة / غرفة»، lost «مفقودات»، complaint «شكوى»',
  `sla_minutes` SMALLINT UNSIGNED NOT NULL COMMENT 'مهلة الاستجابة: missing 0 (فوري)، health 10، transport 30، meal و room و lost 120، complaint 240',
  `default_severity` ENUM('low','medium','high','critical') NOT NULL COMMENT 'الخطورة الافتراضية',
  `default_assignee_label` VARCHAR(120) NULL COMMENT 'الجهة الافتراضية: «د. ليلى شمس — الفريق الطبي»، «فادي سلوم — غرفة العمليات»، «هيثم زيدان — فريق المواصلات»، «وسام خوري — مشرف البرج»…',
  `handling_permission` VARCHAR(40) NULL COMMENT 'الصلاحية التي تعالجه (operations.room، medical، transport)',
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='أنواع البلاغات — نوع البلاغ ومهلة الاستجابة والجهة الافتراضية.';

CREATE TABLE `tickets` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `ticket_no` VARCHAR(16) NOT NULL COMMENT 'رقم البلاغ المعروض (OR-1207 في البيانات الحالية). من number_sequences: الكود يولّده عشوائياً وقد يتكرر',
  `kind` VARCHAR(20) NOT NULL COMMENT 'النوع',
  `severity` ENUM('low','medium','high','critical') NOT NULL COMMENT 'الخطورة: low «منخفضة»، medium «متوسطة»، high «عالية»، critical «حرجة» (تُصعَّد إن لم تُغلق خلال 15 دقيقة)',
  `status` ENUM('open','in_progress','resolved') NOT NULL DEFAULT 'open' COMMENT 'الحالة: open «مفتوح»، in_progress «قيد المعالجة»، resolved «تم الحل». «مغلق» محسوب: محلول وقيّمه صاحبه',
  `source` ENUM('pilgrim-sos','pilgrim-complaint','pilgrim-lost','review-appeal','group-team','flights','staff') NOT NULL COMMENT 'المصدر: pilgrim-sos زر الطوارئ، pilgrim-complaint شكوى الحاج، pilgrim-lost المفقودات، review-appeal اعتراض على المراجعة، group-team فريق المجموعة، flights الطيران (تخلّف/تحويل)، staff موظف',
  `application_id` BIGINT UNSIGNED NULL COMMENT 'الطلب الذي رفعه (الحاج أو عن حاج معروف)',
  `raised_by_account_id` BIGINT UNSIGNED NULL COMMENT 'صاحب الحساب الذي رفعه (حاج أو إداري)',
  `raised_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'الموظف الذي رفعه',
  `subject_name` VARCHAR(160) NOT NULL COMMENT 'من يخصه: اسم الحاج، أو «المجموعة كاملة»، أو «حافلة 14 — تكتل العاصي»، أو رقم رحلة',
  `subject_national_id` CHAR(11) NULL COMMENT 'الحاج المعني إن كان فرداً من طلب',
  `group_id` BIGINT UNSIGNED NULL COMMENT 'المجموعة',
  `cluster_id` BIGINT UNSIGNED NULL COMMENT 'التكتل',
  `flight_id` BIGINT UNSIGNED NULL COMMENT 'الرحلة (بلاغات الطيران)',
  `location` VARCHAR(300) NOT NULL COMMENT 'المكان (يُملأ تلقائياً: الفندق والغرفة، الخيمة…)',
  `zone` ENUM('makkah','mina','arafat','muzdalifah','jamarat','madinah','other') NOT NULL DEFAULT 'makkah' COMMENT 'المنطقة: «مكة — الفندق»، منى، عرفة، مزدلفة، الجمرات… الكود يستنتجها من نص المكان',
  `text` TEXT NOT NULL COMMENT 'الوصف (4 أحرف على الأقل للشكوى)',
  `photo_file_id` BIGINT UNSIGNED NULL COMMENT 'صورة مرفقة (الكود يكتفي بعلامة «مع صورة»)',
  `assignee_staff_id` BIGINT UNSIGNED NULL COMMENT 'الموظف المسند إليه',
  `assignee_label` VARCHAR(160) NULL COMMENT 'الجهة المسندة كما تُعرض، مثل «الفريق الميداني للتكتل»',
  `escalated_at` DATETIME(3) NULL COMMENT 'وقت التصعيد للغرفة المركزية',
  `resolved_at` DATETIME(3) NULL COMMENT 'وقت الحل',
  `rating` TINYINT UNSIGNED NULL COMMENT 'تقييم صاحب البلاغ للاستجابة 1–5 (يغلقه)',
  `reopened_count` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'مرات إعادة الفتح («لا» بعد الحل)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tickets_ticket_no` (`ticket_no`),
  KEY `ix_tickets_status_severity` (`status`, `severity`),
  KEY `ix_tickets_kind` (`kind`),
  KEY `ix_tickets_application_id` (`application_id`),
  KEY `ix_tickets_group_id` (`group_id`),
  CONSTRAINT `ck_tickets_1` CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='البلاغات — بلاغ طوارئ أو شكوى أو مفقودات أو اعتراض: يفتحه الحاج (زر الطوارئ، الشكوى، المفقودات، الاعتراض على المراجعة)، أو فريق المجموعة («بلاغ لغرفة العمليات»)، أو النظام (تخلّف عن رحلة، تحويل رحلة). تعالجه غرفة العمليات والفريق الطبي والمواصلات.';

CREATE TABLE `ticket_updates` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `ticket_id` BIGINT UNSIGNED NOT NULL COMMENT 'البلاغ',
  `at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  `author_kind` ENUM('staff','account','system') NOT NULL COMMENT 'من كتب',
  `author_staff_id` BIGINT UNSIGNED NULL COMMENT 'الموظف',
  `author_account_id` BIGINT UNSIGNED NULL COMMENT 'صاحب الحساب',
  `author_name` VARCHAR(160) NOT NULL COMMENT 'الاسم المعروض (لقطة)',
  `text` VARCHAR(1000) NOT NULL COMMENT 'النص (3 أحرف على الأقل للتحديث)',
  `status_from` VARCHAR(20) NULL COMMENT 'الحالة قبل (إن كان تغيير حالة)',
  `status_to` VARCHAR(20) NULL COMMENT 'الحالة بعد',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='سجل البلاغ — الخط الزمني للبلاغ: الإسناد، كل تحديث، كل تغيير حالة، وإعادة الفتح.';

CREATE TABLE `hajj_certificates` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `application_id` BIGINT UNSIGNED NOT NULL COMMENT 'الطلب',
  `national_id` CHAR(11) NOT NULL COMMENT 'الحاج',
  `certificate_no` VARCHAR(30) NOT NULL COMMENT 'الرقم: {season}-C-{رقم الطلب:06}، ويُضاف -{n} للأفراد بعد الأول',
  `issued_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإصدار',
  `file_id` BIGINT UNSIGNED NULL COMMENT 'نسخة PDF إن وُلّدت',
  `revoked_at` DATETIME(3) NULL COMMENT 'إلغاء الشهادة',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hajj_certificates_certificate_no` (`certificate_no`),
  UNIQUE KEY `uq_hajj_certificates_application_id_national_id` (`application_id`, `national_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='شهادات أداء الحج — «شهادة أداء فريضة الحج» لكل فرد، تُصدر بعد العودة. الكود يحسبها عند العرض؛ هنا تُصدر وتُخزَّن ليُتحقق منها من صفحة التحقق.';

-- ───────────────────────────────────────────────────────────────
-- الإداريون: البنية المرجعية والملف الدائم والتسجيل الموسمي
-- ───────────────────────────────────────────────────────────────

CREATE TABLE `admin_roles` (
  `role_key` VARCHAR(40) NOT NULL COMMENT 'مفتاح الصفة: cluster-head، group-head، group-deputy، tech، assistant-tech، murshid، guide-m، guide-m-c، murshida، guide-f، guide-f-c، assistant-count، أو role-<…> لما تضيفه الإدارة',
  `name` VARCHAR(80) NOT NULL COMMENT 'الاسم: «رئيس تكتل»، «رئيس مجموعة»، «معاون»، «منسق تقني»، «معاون ومنسق تقني»، «موجّه ديني أ/ب/ج»، «موجّهة دينية أ/ب/ج»، «معاون بعدد»',
  `level` ENUM('cluster','group','shared') NOT NULL COMMENT 'المستوى: cluster «تكتل»، group «مجموعة»، shared «مشترك (تكتل أو مجموعة)»',
  `description` TEXT NULL COMMENT 'الوصف',
  `is_core` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'من الصفات الأصلية',
  `active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'فعّالة: غير الفعالة لا تُعرض للإسناد الجديد وتبقى صالحة لحامليها',
  `applied` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = يُتقدَّم لها في «التسجيل كإداري»؛ 0 = تمنحها الإدارة (رئيس تكتل)',
  `exam_as_role_key` VARCHAR(40) NULL COMMENT 'الصفة التي يأخذ اختبارها وشروطها وصلاحياتها (مثل murshid ← guide-m)',
  `gender` ENUM('M','F') NULL COMMENT 'يقتصر على جنس (الموجّهون ذكور والموجّهات إناث)',
  `guide_seat` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '«يشغل مقعد الموجّه الديني ضمن المجموعة»',
  `assistant_seat` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '«يشغل مقعد المعاون ضمن المجموعة»',
  `assistant_pool` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '«ضمن مرشّحي معاوني التكتل»',
  `coordinator_pool` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '«ضمن مرشّحي منسّقي التكتل»',
  `guide_pool` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '«ضمن مرشّحي موجّهات التكتل»',
  `cluster_leader` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'صفة «قائد التكتل»',
  `group_leader` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'صفة «قائد المجموعة»',
  `guidance_badge` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '«تمنح شارة التميّز في التوجيه الديني» (الدرجة أ)',
  `has_category` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '«تُظهر حقل الفئة» (رئيس المجموعة)',
  `multiplier` SMALLINT UNSIGNED NULL COMMENT 'حجاج يضيفهم حاملها حين يكون معاوناً للتكتل («معاون بعدد»: 20)',
  `fixed_age` TINYINT UNSIGNED NULL COMMENT 'عمر مثبَّت يُحسب به في متوسط أعمار كادر التكتل (الموجّه أ: 40)',
  `exam_name` VARCHAR(80) NULL COMMENT 'اسم الاختبار المعروض («الموجّه الديني»)',
  `sort_order` SMALLINT NOT NULL DEFAULT 0 COMMENT 'الترتيب',
  PRIMARY KEY (`role_key`),
  UNIQUE KEY `uq_admin_roles_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الصفات الإدارية — الصفات التي يتقدّم لها الإداريون أو تمنحها الإدارة، وسلوك كل صفة في التشكيل.';

CREATE TABLE `admin_role_exams` (
  `role_key` VARCHAR(40) NOT NULL COMMENT 'الصفة',
  `exam_role_key` VARCHAR(40) NOT NULL COMMENT 'الصفة التي يُؤخذ اختبارها',
  PRIMARY KEY (`role_key`, `exam_role_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='اختبارات الصفة — صفة تجلس أكثر من اختبار وعليها أن تنجح فيها كلها (معاون ومنسق تقني: اختبار المعاون واختبار المنسق).';

CREATE TABLE `admin_role_labels` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `label` VARCHAR(80) NOT NULL COMMENT 'التسمية',
  `base_role_key` VARCHAR(40) NOT NULL COMMENT 'الصفة التي تُستعمل معها',
  `active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'فعّالة',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_admin_role_labels_label` (`label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='التسميات الموسمية الجاهزة — تسمية تُمنح مع الصفة الموسمية لتوضيحها، مثل «معاون - مكتب سياحي».';

CREATE TABLE `branches` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `name` VARCHAR(60) NOT NULL COMMENT 'اسم الفرع',
  `active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'فعّال',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_branches_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الفروع — فروع الإدارة التي ينتمي إليها الكادر (دمشق، حلب، اسطنبول، مصر…). يختار رئيس التكتل كادره من فروعه.';

CREATE TABLE `service_tiers` (
  `tier_key` VARCHAR(20) NOT NULL COMMENT 'المفتاح: eco، eco-plus، five، أو tier-<…>',
  `name` VARCHAR(60) NOT NULL COMMENT 'الاسم: «اقتصادي»، «اقتصادي محسن»، «خمس نجوم»',
  `is_default` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'المستوى الذي تُقرأ به أعداد المجموعة قبل انضمامها لتكتل (eco)',
  `sort_order` TINYINT NOT NULL DEFAULT 0 COMMENT 'الترتيب',
  PRIMARY KEY (`tier_key`),
  UNIQUE KEY `uq_service_tiers_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مستويات التكتلات — مستوى خدمة التكتل، يحدد أعداد المجموعات ومقاعد فريقها.';

CREATE TABLE `group_categories` (
  `category_key` VARCHAR(20) NOT NULL COMMENT 'المفتاح: c1..c4 أو cat-<…>',
  `name` VARCHAR(60) NOT NULL COMMENT 'الاسم: «الفئة الأولى» … «الفئة الرابعة»',
  `weight` TINYINT UNSIGNED NOT NULL COMMENT 'الوزن (1..4)',
  PRIMARY KEY (`category_key`),
  UNIQUE KEY `uq_group_categories_name` (`name`),
  CONSTRAINT `ck_group_categories_1` CHECK (weight >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='فئات المجموعات — فئة رئيس المجموعة، وهي فئة مجموعته. الوزن يُجمع في وزن التكتل ويُحمَّل على المنسقين والموجّهات.';

CREATE TABLE `category_rules` (
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `tier_key` VARCHAR(20) NOT NULL COMMENT 'المستوى',
  `category_key` VARCHAR(20) NOT NULL COMMENT 'الفئة',
  `guides` TINYINT UNSIGNED NOT NULL COMMENT 'مقاعد الموجّه الديني',
  `assistants` TINYINT UNSIGNED NOT NULL COMMENT 'مقاعد المعاون',
  `free_seats` TINYINT UNSIGNED NOT NULL COMMENT 'مقاعد حرة (موجّه أو معاون)',
  `pilgrims` SMALLINT UNSIGNED NOT NULL COMMENT 'عدد الحجاج',
  `active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'مفعّلة',
  PRIMARY KEY (`season_year`, `tier_key`, `category_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='أعداد كل فئة في كل مستوى — لكل مستوى وفئة: مقاعد الموجّهين والمعاونين والمقاعد الحرة وعدد الحجاج.';

CREATE TABLE `tier_compositions` (
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `tier_key` VARCHAR(20) NOT NULL COMMENT 'المستوى',
  `min_weight` SMALLINT UNSIGNED NOT NULL COMMENT 'أدنى مجموع أوزان الفئات',
  `max_weight` SMALLINT UNSIGNED NOT NULL COMMENT 'أعلاه',
  `cluster_assistants` TINYINT UNSIGNED NOT NULL COMMENT 'معاونو التكتل المطلوبون بالضبط («معاون بعدد» لا يُحسب)',
  `units_per_coordinator` TINYINT UNSIGNED NOT NULL COMMENT 'حد وحدات المنسق التقني (مجموع أوزان مجموعاته)',
  `units_per_female_guide` SMALLINT UNSIGNED NOT NULL COMMENT 'حد وحدات الموجّهة',
  PRIMARY KEY (`season_year`, `tier_key`),
  CONSTRAINT `ck_tier_compositions_1` CHECK (min_weight <= max_weight)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='تركيب التكتل في كل مستوى — حدود وزن التكتل ومعاونيه وطاقة المنسق والموجّهة.';

CREATE TABLE `admin_season_rules` (
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `cluster_early_deadline_at` DATETIME(3) NULL COMMENT 'الموعد الأول لتشكيل التكتلات: من أرسل طلبه قبله ينال شارة الالتزام بالمواعيد (2026-11-19 23:59)',
  `updated_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'آخر من عدّل',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`season_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='قواعد الإداريين في الموسم — قيم موسمية متفرقة لملف الإداريين.';

CREATE TABLE `admin_doc_types` (
  `doc_key` VARCHAR(40) NOT NULL COMMENT 'المفتاح: record، degree، first-aid، sharia، it، leadership، recommendation، أو cert-<…>',
  `label` VARCHAR(160) NOT NULL COMMENT 'الاسم: «وثيقة «لا حكم عليه»»، «صورة عن الشهادة الجامعية»، «شهادة دورة إسعافات أولية»، «شهادة شرعية أو إجازة في العلوم الشرعية»، «شهادة في المعلوماتية (ICDL أو ما يعادلها)»، «شهادة دورة قيادة وإدارة مجموعات»، «تزكية من رئيس تكتل سابق»',
  `hint` VARCHAR(200) NOT NULL COMMENT 'التلميح («صورة واضحة أو PDF»)',
  `valid_seasons` TINYINT UNSIGNED NOT NULL COMMENT 'صلاحيتها بالمواسم شاملة موسم الإصدار: 0 «لا تنتهي»، 1 «تُجدَّد كل موسم»، n «سارية n مواسم». record وfirst-aid وrecommendation تُقرأ من season_settings',
  `is_custom` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'أضافتها الإدارة',
  `active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'مفعّلة (لا يُعطَّل ما يستعمله جدول الشروط)',
  PRIMARY KEY (`doc_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الشهادات والوثائق — الوثائق التي يرفعها الإداري في ملفه الدائم، وصلاحية كل منها بالمواسم.';

CREATE TABLE `skills` (
  `skill_key` VARCHAR(60) NOT NULL COMMENT 'المفتاح: bus، first-aid، computer، sign، elderly، أو اسم المهارة المضافة',
  `label` VARCHAR(80) NOT NULL COMMENT 'الاسم: «قيادة حافلة»، «إسعافات أولية»، «استخدام الحاسوب والتطبيقات»، «لغة الإشارة»، «خبرة في رعاية كبار السن»',
  `emoji` VARCHAR(8) NOT NULL DEFAULT '✨' COMMENT 'الرمز',
  `active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'مفعّلة',
  PRIMARY KEY (`skill_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='المهارات — المهارات التي يختارها الإداري.';

CREATE TABLE `languages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `name` VARCHAR(40) NOT NULL COMMENT 'الاسم: العربية، الإنجليزية، التركية، الفرنسية، الأوردو…',
  `is_fixed` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'العربية لا تُعطَّل',
  `active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'مفعّلة',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_languages_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='اللغات — اللغات التي يختارها الإداري، وتُستعمل في قوائم الموظفين.';

CREATE TABLE `admin_commitments` (
  `commitment_key` VARCHAR(40) NOT NULL COMMENT 'المفتاح: travel، rules، ethics، evaluation',
  `label` VARCHAR(160) NOT NULL COMMENT 'الاسم: «السفر مع الحجاج طوال الموسم»، «الالتزام بالتعليمات ولائحة المكافآت والعقوبات»، «ميثاق الأخلاقيات»، «قبول التقييم»',
  `detail` TEXT NOT NULL COMMENT 'النص الكامل',
  `active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'مفعّل',
  PRIMARY KEY (`commitment_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الالتزامات — ما يوافق عليه الإداري في الخطوة الرابعة.';

CREATE TABLE `role_requirements` (
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `role_key` VARCHAR(40) NOT NULL COMMENT 'الصفة',
  `criterion` VARCHAR(80) NOT NULL COMMENT 'الشرط: age-min «العمر من»، age-max «العمر حتى»، gender «الجنس»، seasons «مواسم خبرة سابقة (حد أدنى)»، doc:<doc_key>، skill:<skill_key>، lang:<الاسم>',
  `value` VARCHAR(20) NOT NULL COMMENT 'القيمة: رقم للعمر والمواسم؛ M أو F للجنس؛ required «مطلوبة» أو preferred «تقوّي الطلب» للوثيقة والمهارة واللغة',
  PRIMARY KEY (`season_year`, `role_key`, `criterion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='شروط الصفات — جدول الشروط: لكل صفة وشرط قيمة. الشرط عمر أدنى وأعلى، أو جنس، أو مواسم خبرة، أو وثيقة أو مهارة أو لغة مطلوبة أو مقوّية للطلب.';

CREATE TABLE `role_requirement_rows` (
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `criterion` VARCHAR(80) NOT NULL COMMENT 'الشرط (age-min، gender، doc:record…)',
  `sort_order` SMALLINT NOT NULL DEFAULT 0 COMMENT 'الترتيب',
  PRIMARY KEY (`season_year`, `criterion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='صفوف جدول الشروط — الشروط المعروضة في الجدول بترتيبها، ولو لم تُملأ لها قيمة بعد (يُضاف الصف ثم تُملأ خلاياه).';

CREATE TABLE `admin_role_permissions` (
  `permission` ENUM('pilgrims.register') NOT NULL COMMENT 'الصلاحية: pilgrims.register «التسجيل على الحج»',
  `role_key` VARCHAR(40) NOT NULL COMMENT 'الصفة (تُقارن بصفة الاختبار لصفة الإداري)',
  PRIMARY KEY (`permission`, `role_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='صلاحيات الصفات في البوابة الإدارية — الصلاحيات التي تمنحها الصفة لحاملها في البوابة الإدارية. الوحيدة الآن «التسجيل على الحج» (تسجيل مواطن على الحج).';

CREATE TABLE `admin_calendar` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `hijri_label` VARCHAR(120) NOT NULL COMMENT 'الموعد كما يُعرض («20 – 24 أيلول 2026»)',
  `title` VARCHAR(160) NOT NULL COMMENT 'الحدث: «إنشاء الحساب الإداري»، «التسجيل كإداري والتحقق من الأهلية»، «الاختبار المؤتمت في القاعات»، «تشكيل المجموعات في المكتب»…',
  `detail` TEXT NULL COMMENT 'التفصيل',
  `sort_order` TINYINT NOT NULL DEFAULT 0 COMMENT 'الترتيب',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='رزنامة الإداريين — مواعيد مسار الإداري المعروضة له.';

CREATE TABLE `evaluation_stages` (
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `stage_key` VARCHAR(40) NOT NULL COMMENT 'المفتاح: pretravel، airport، travel، makkah، madinah، mashaer، أو stage-<…>',
  `label` VARCHAR(80) NOT NULL COMMENT 'الاسم: «مرحلة ما قبل السفر»، «مرحلة المطار»، «مرحلة السفر»، «مرحلة مكة»، «مرحلة المدينة»، «مرحلة المشاعر»',
  `hint` VARCHAR(200) NULL COMMENT 'الشرح',
  `sort_order` TINYINT NOT NULL DEFAULT 0 COMMENT 'الترتيب',
  PRIMARY KEY (`season_year`, `stage_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مراحل التقييم — المراحل التي يُقيَّم بها الإداريون والمجموعات والتكتلات بعد الموسم (من 1 إلى 5).';

CREATE TABLE `admin_vault_documents` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `account_id` BIGINT UNSIGNED NOT NULL COMMENT 'الإداري',
  `doc_key` VARCHAR(40) NULL COMMENT 'نوع الوثيقة؛ NULL لشهادة أضافها الإداري بنفسه (custom)',
  `label` VARCHAR(160) NOT NULL COMMENT 'الاسم (للشهادة المخصصة يكتبه الإداري، ويمكن إعادة تسميتها)',
  `file_id` BIGINT UNSIGNED NOT NULL COMMENT 'الملف',
  `issued_season` SMALLINT UNSIGNED NOT NULL COMMENT 'موسم الإصدار الهجري، تُحسب منه الصلاحية',
  `added_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإضافة',
  `replaced_at` DATETIME(3) NULL COMMENT 'استُبدلت بنسخة أحدث من النوع نفسه',
  `deleted_at` DATETIME(3) NULL COMMENT 'حُذفت',
  PRIMARY KEY (`id`),
  KEY `ix_admin_vault_documents_account_id_doc_key` (`account_id`, `doc_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الملف الدائم: الشهادات — شهادات الإداري في «وثائقي ومهاراتي». تبقى عبر المواسم، وكل تسجيل جديد يبدأ منها.';

CREATE TABLE `account_languages` (
  `account_id` BIGINT UNSIGNED NOT NULL COMMENT 'الإداري',
  `language_id` BIGINT UNSIGNED NOT NULL COMMENT 'اللغة',
  PRIMARY KEY (`account_id`, `language_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الملف الدائم: اللغات — لغات الإداري.';

CREATE TABLE `account_skills` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `account_id` BIGINT UNSIGNED NOT NULL COMMENT 'الإداري',
  `skill_key` VARCHAR(60) NULL COMMENT 'المهارة من القائمة',
  `custom_label` VARCHAR(80) NULL COMMENT 'مهارة مكتوبة بيده',
  PRIMARY KEY (`id`),
  CONSTRAINT `ck_account_skills_1` CHECK (skill_key IS NOT NULL OR custom_label IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الملف الدائم: المهارات — مهارات الإداري: من القائمة، أو مهارة يكتبها بنفسه.';

CREATE TABLE `admin_season_files` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `account_id` BIGINT UNSIGNED NOT NULL COMMENT 'الإداري',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `role_key` VARCHAR(40) NULL COMMENT 'الصفة المتقدَّم لها (واحدة في الموسم)',
  `renewal` ENUM('keep','change','first') NULL COMMENT 'keep «تجديد الصفة نفسها»، change «صفة جديدة»، first «أول موسم»',
  `exam_exempt` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'معفى من الاختبارين: جدّد صفته نفسها وتقييمه السابق ≥ الحد والفجوة ≤ موسم',
  `commitments_at` DATETIME(3) NULL COMMENT 'وقت قبول الالتزامات',
  `eligible_at` DATETIME(3) NULL COMMENT 'ثبتت أهليته بالتحقق الآلي (قبل الدفع)',
  `eligibility_result` JSON NULL COMMENT 'نتيجة التحقق صفاً صفاً (الشروط المطلوبة والمقوّية) وقت الثبوت أو الفشل',
  `documents_snapshot` JSON NULL COMMENT 'مفاتيح الوثائق السارية المستعملة وقت الأهلية',
  `languages_snapshot` JSON NULL COMMENT 'اللغات وقت الأهلية',
  `skills_snapshot` JSON NULL COMMENT 'المهارات وقت الأهلية',
  `fee_payment_id` BIGINT UNSIGNED NULL COMMENT 'دفعة رسم التسجيل كإداري',
  `fee_paid_at` DATETIME(3) NULL COMMENT 'وقت دفع الرسم',
  `receipt_no` VARCHAR(24) NULL COMMENT 'إيصال الرسم {season}-A-{n:06}',
  `result_published_at` DATETIME(3) NULL COMMENT 'نشر النتيجة النهائية (النجاح يعني: معفى، أو نجح في المكتوب بكل أقسامه والشفهي)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_admin_season_files_receipt_no` (`receipt_no`),
  UNIQUE KEY `uq_admin_season_files_account_id_season_year` (`account_id`, `season_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الملف الإداري الموسمي — تقدّم الإداري في موسم: صفته الواحدة، ونوع التجديد، والإعفاء، والالتزامات، والأهلية، والرسم. منه يُشتق موقعه في رحلته: الحساب، التسجيل، الرسم، الاختبار، النتيجة، الشفهي، ثم المجموعة أو الفريق، فالتكتل، فالحجاج، فالميدان.';

CREATE TABLE `admin_commitment_acceptances` (
  `admin_season_file_id` BIGINT UNSIGNED NOT NULL COMMENT 'الملف الموسمي',
  `commitment_key` VARCHAR(40) NOT NULL COMMENT 'الالتزام',
  `text_snapshot` TEXT NOT NULL COMMENT 'نص الالتزام كما قُبل',
  `accepted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت القبول',
  PRIMARY KEY (`admin_season_file_id`, `commitment_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='قبول كل التزام — الكود يحفظ وقت قبول الالتزامات جملة؛ هنا كل التزام بصيغته وقت القبول.';

-- ───────────────────────────────────────────────────────────────
-- الاختبارات: المؤتمت في القاعات والشفهي
-- ───────────────────────────────────────────────────────────────

CREATE TABLE `exam_question_categories` (
  `code` VARCHAR(20) NOT NULL COMMENT 'المفتاح: religious، admin، operational، first-aid، crowd، transport، emergency، tech',
  `label` VARCHAR(40) NOT NULL COMMENT 'الاسم: «ديني»، «إداري»، «تشغيلي»، «إسعافات أولية»، «إدارة الحشود»، «نقل»، «طوارئ»، «تقني»',
  PRIMARY KEY (`code`),
  UNIQUE KEY `uq_exam_question_categories_label` (`label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='فئات الأسئلة — فئة كل سؤال، وتُبنى منها أقسام الاختبار.';

CREATE TABLE `exam_questions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `category_code` VARCHAR(20) NOT NULL COMMENT 'الفئة',
  `type` ENUM('choice','truefalse') NOT NULL DEFAULT 'choice' COMMENT 'النوع: choice «اختيار من متعدد» (2–6 خيارات)، truefalse «صح أو خطأ»',
  `scenario` TEXT NULL COMMENT 'موقف يسبق السؤال (اختياري)',
  `text` TEXT NOT NULL COMMENT 'نص السؤال',
  `correct_option_no` TINYINT UNSIGNED NOT NULL COMMENT 'رقم الخيار الصحيح (من 1)',
  `explanation` TEXT NOT NULL COMMENT 'الشرح بعد الإجابة',
  `active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '0 = معطَّل (questionsOff): لا يُسحب في أوراق جديدة',
  `replaces_question_id` BIGINT UNSIGNED NULL COMMENT 'السؤال الذي حلّ محله («استبدال»: الكود لا يحفظ الربط)',
  `first_used_at` DATETIME(3) NULL COMMENT 'أول ورقة ظهر فيها. السؤال المستعمل لا يُعدَّل نصه: يُستبدل',
  `created_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من أضافه (الأسئلة الأصلية بلا منشئ)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='بنك الأسئلة — أسئلة الاختيار من متعدد أو الصح والخطأ.';

CREATE TABLE `exam_question_options` (
  `question_id` BIGINT UNSIGNED NOT NULL COMMENT 'السؤال',
  `option_no` TINYINT UNSIGNED NOT NULL COMMENT 'رقم الخيار من 1',
  `text` VARCHAR(500) NOT NULL COMMENT 'النص (لا فارغ ولا مكرر). للصح والخطأ: «صح»، «خطأ»',
  PRIMARY KEY (`question_id`, `option_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='خيارات الأسئلة — خيارات كل سؤال بترتيبها الأصلي (تُخلط عند العرض بخلط ثابت لكل متقدم).';

CREATE TABLE `exam_question_roles` (
  `question_id` BIGINT UNSIGNED NOT NULL COMMENT 'السؤال',
  `role_key` VARCHAR(40) NOT NULL COMMENT 'صفة الاختبار: group-head، group-deputy، guide-m، guide-f، tech',
  PRIMARY KEY (`question_id`, `role_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='صفات السؤال — الصفات التي يصلح لها السؤال.';

CREATE TABLE `exam_centers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `code` VARCHAR(30) NOT NULL COMMENT 'المفتاح: damascus، rif، aleppo، homs، hama، latakia، idlib، daraa، deir، أو c-<…>',
  `name` VARCHAR(80) NOT NULL COMMENT 'الاسم: «مركز دمشق»…',
  `hall` VARCHAR(160) NOT NULL COMMENT 'القاعة: «قاعة الامتحانات — …»',
  `lat` DECIMAL(9,6) NULL COMMENT 'خط العرض (إلزامي في الواجهة)',
  `lng` DECIMAL(9,6) NULL COMMENT 'خط الطول',
  `capacity` SMALLINT UNSIGNED NULL COMMENT 'السعة (120 لدمشق…)',
  `display_no` SMALLINT UNSIGNED NOT NULL COMMENT 'رقم شاشة العرض /exam-display/<n> (1–9999)',
  `supervisor_staff_id` BIGINT UNSIGNED NULL COMMENT 'مشرف القاعة (أي موظف، ويمكن أن يشرف على أكثر من قاعة)',
  `active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'فعّال (لا يُعطَّل وفيه جلسة جارية)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_exam_centers_code` (`code`),
  UNIQUE KEY `uq_exam_centers_name` (`name`),
  UNIQUE KEY `uq_exam_centers_display_no` (`display_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مراكز الامتحان — مركز في كل منطقة بقاعته، ومشرفه، ورقم شاشة العرض.';

CREATE TABLE `exam_center_governorates` (
  `center_id` BIGINT UNSIGNED NOT NULL COMMENT 'المركز',
  `governorate_code` VARCHAR(20) NOT NULL COMMENT 'المحافظة',
  PRIMARY KEY (`governorate_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='المحافظات التي يخدمها كل مركز — كل محافظة يخدمها مركز واحد فقط.';

CREATE TABLE `exam_supervisor_pins` (
  `staff_user_id` BIGINT UNSIGNED NOT NULL COMMENT 'المشرف',
  `pin_hash` VARCHAR(255) NOT NULL COMMENT 'بصمة الرمز (الكود يخزّنه نصاً صريحاً)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`staff_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='رموز تأكيد المشرفين — رمز المشرف الذي يكتبه على جهاز المتقدم ليؤكد تسليمه. يُكتب مرتين، 4–10 أرقام.';

CREATE TABLE `exams` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `code` VARCHAR(40) NOT NULL COMMENT 'المعرّف: مفتاح الصفة للاختبار الأساسي، أو x-<…> للاستدراكي',
  `role_key` VARCHAR(40) NOT NULL COMMENT 'صفة الاختبار',
  `kind` ENUM('main','makeup') NOT NULL COMMENT 'main «أساسي»، makeup «استدراكي»',
  `name` VARCHAR(160) NOT NULL COMMENT 'الاسم: «الاختبار المؤتمت لصفة …» (3 أحرف على الأقل)',
  `exam_date` DATE NULL COMMENT 'اليوم',
  `hijri_label` VARCHAR(60) NULL COMMENT 'التاريخ الهجري المعروض («23 ربيع الآخر 1448»)',
  `start_time` TIME NOT NULL COMMENT 'الساعة',
  `minutes` SMALLINT UNSIGNED NOT NULL DEFAULT 25 COMMENT 'المدة بالدقائق (5–480، الافتراضي 25)',
  `status` ENUM('draft','published','archived') NOT NULL DEFAULT 'draft' COMMENT 'draft «مسودة»، published «منشور» (لا يُجلس غيره)، archived «مؤرشف»',
  `show_result` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'يُظهر للمتقدم نتيجته بعد التأكيد',
  `pairing` ENUM('auto_all','auto_clean','manual') NOT NULL DEFAULT 'manual' COMMENT 'الدخول: auto_all «دخول تلقائي للجميع»، auto_clean «تلقائي من شبكة القاعة»، manual «موافقة يدوية»',
  `network_check` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'التحقق من شبكة القاعة',
  `all_centers` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = في كل المراكز الفعالة؛ 0 = المراكز في exam_center_links',
  `instructions` JSON NOT NULL COMMENT 'تعليمات الاختبار سطراً سطراً',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_exams_season_year_code` (`season_year`, `code`),
  CONSTRAINT `ck_exams_1` CHECK (minutes BETWEEN 5 AND 480)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الاختبارات — اختبار صفة في موسم: الأساسي أو الاستدراكي، بموعده ومدته وأقسامه وطريقة الدخول.';

CREATE TABLE `exam_center_links` (
  `exam_id` BIGINT UNSIGNED NOT NULL COMMENT 'الاختبار',
  `center_id` BIGINT UNSIGNED NOT NULL COMMENT 'المركز',
  PRIMARY KEY (`exam_id`, `center_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مراكز الاختبار المحددة — حين لا يكون الاختبار في كل المراكز.';

CREATE TABLE `exam_sections` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `exam_id` BIGINT UNSIGNED NOT NULL COMMENT 'الاختبار',
  `name` VARCHAR(80) NOT NULL COMMENT 'الاسم: «القسم الإداري»، «القسم الشرعي»، «القسم التقني» (فريد في الاختبار)',
  `draw_count` SMALLINT UNSIGNED NOT NULL COMMENT 'عدد الأسئلة في الورقة (1–500)',
  `pass_percent` TINYINT UNSIGNED NOT NULL DEFAULT 50 COMMENT 'نسبة النجاح (0–100، الافتراضي 50)',
  `order_mode` ENUM('random','ordered') NOT NULL DEFAULT 'random' COMMENT 'random «عشوائي»، ordered «مرتّب»',
  `sort_order` TINYINT NOT NULL DEFAULT 0 COMMENT 'الترتيب',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_exam_sections_exam_id_name` (`exam_id`, `name`),
  CONSTRAINT `ck_exam_sections_1` CHECK (draw_count BETWEEN 1 AND 500),
  CONSTRAINT `ck_exam_sections_2` CHECK (pass_percent <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='أقسام الاختبار — كل قسم يُسحب له عدد من الأسئلة من فئاته، وله نسبة نجاح.';

CREATE TABLE `exam_section_categories` (
  `section_id` BIGINT UNSIGNED NOT NULL COMMENT 'القسم',
  `category_code` VARCHAR(20) NOT NULL COMMENT 'الفئة',
  PRIMARY KEY (`section_id`, `category_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='فئات القسم — الفئات التي يُسحب منها القسم.';

CREATE TABLE `exam_center_moves` (
  `admin_season_file_id` BIGINT UNSIGNED NOT NULL COMMENT 'ملف المتقدم',
  `center_id` BIGINT UNSIGNED NOT NULL COMMENT 'المركز الجديد',
  `moved_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من نقله',
  `moved_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  PRIMARY KEY (`admin_season_file_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='نقل متقدم إلى مركز آخر — يجلس المتقدم في مركز محافظة قيده، إلا إذا نقله مكتب الامتحانات.';

CREATE TABLE `exam_sittings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `exam_id` BIGINT UNSIGNED NOT NULL COMMENT 'الاختبار',
  `center_id` BIGINT UNSIGNED NOT NULL COMMENT 'المركز',
  `opened_at` DATETIME(3) NULL COMMENT 'فتح القاعة',
  `opened_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من فتحها',
  `opened_reason` VARCHAR(300) NULL COMMENT 'سبب الفتح خارج وقته (من ساعة قبل الموعد حتى آخر اليوم)، 3 أحرف على الأقل',
  `started_at` DATETIME(3) NULL COMMENT 'بدء الاختبار للجميع',
  `ended_at` DATETIME(3) NULL COMMENT 'إنهاء الاختبار (لا رجعة فيه)',
  `closed_at` DATETIME(3) NULL COMMENT 'إغلاق القاعة',
  `network_cidr` VARCHAR(43) NULL COMMENT 'شبكة القاعة المسجّلة عند الفتح (10.48.12.0/24)',
  `mobile_data_allowed` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'سُمح ببيانات الجوال (طوارئ، لا يُلغى)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_exam_sittings_exam_id_center_id` (`exam_id`, `center_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='جلسات القاعات — جلسة اختبار في مركز: يفتحها المشرف، ويبدأها للجميع، وينهيها.';

CREATE TABLE `exam_sitting_participants` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `sitting_id` BIGINT UNSIGNED NOT NULL COMMENT 'الجلسة',
  `admin_season_file_id` BIGINT UNSIGNED NOT NULL COMMENT 'ملف المتقدم',
  `checked_in_at` DATETIME(3) NULL COMMENT 'سجّل المشرف حضوره',
  `checked_in_via` ENUM('barcode','national_id') NULL COMMENT 'بالباركود (HJ48 + آخر 7 أرقام من الرقم الوطني) أو بالرقم الوطني',
  `request_at` DATETIME(3) NULL COMMENT 'طلب الدخول من جهازه',
  `pairing_code` CHAR(4) NULL COMMENT 'رمز الاقتران الظاهر على شاشته (1000–9999)',
  `request_off_network` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'الطلب من خارج شبكة القاعة',
  `request_resume` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'طلب استئناف (عاد بعد خروج)',
  `paired_at` DATETIME(3) NULL COMMENT 'وافق المشرف على جهازه (أو دخل تلقائياً)',
  `approve_reason` VARCHAR(300) NULL COMMENT 'سبب الموافقة على طلب من خارج الشبكة أو استئناف (3 أحرف على الأقل)',
  `rejected_at` DATETIME(3) NULL COMMENT 'رُفض طلبه',
  `reject_reason` VARCHAR(300) NULL COMMENT 'سبب الرفض (اختياري)',
  `suspicious` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'علّمه المشرف «مشبوه» عند الرفض',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_exam_sitting_participants_sitting_id_admin_season_file_id` (`sitting_id`, `admin_season_file_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='المتقدمون في الجلسة — حضور كل متقدم وطلب دخول جهازه واقترانه.';

CREATE TABLE `exam_attempts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `admin_season_file_id` BIGINT UNSIGNED NOT NULL COMMENT 'ملف المتقدم',
  `exam_id` BIGINT UNSIGNED NOT NULL COMMENT 'الاختبار',
  `exam_role_key` VARCHAR(40) NOT NULL COMMENT 'صفة الاختبار المأخوذ',
  `sitting_id` BIGINT UNSIGNED NULL COMMENT 'الجلسة',
  `status` ENUM('ready','active','submitted','confirmed','unconfirmed','voided') NOT NULL DEFAULT 'ready' COMMENT 'ready «مقترن — لم يبدأ»، active «يختبر»، submitted «سلّم — بانتظار التأكيد»، confirmed «مؤكَّد»، unconfirmed «غير مؤكَّد» (يحتاج قراراً)، voided «ملغى»',
  `started_at` DATETIME(3) NULL COMMENT 'بدء وقته (بدء الاختبار أو دخوله بعده)',
  `minutes` SMALLINT UNSIGNED NULL COMMENT 'المدة المجمّدة عند البدء (لا يحرّك تعديل الاختبار ساعته)',
  `submitted_at` DATETIME(3) NULL COMMENT 'التسليم',
  `auto_submitted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'سلّمته المنصة حين أنهى المشرف الجلسة وهو يجيب',
  `score` DECIMAL(5,1) NULL COMMENT 'النسبة من كل النقاط (سؤال صحيح = نقطة)',
  `passed` TINYINT(1) NULL COMMENT 'نجح في كل الأقسام',
  `show_result` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'يرى نتيجته',
  `confirmed_at` DATETIME(3) NULL COMMENT 'التأكيد',
  `confirmed_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من أكّد',
  `confirm_via` ENUM('pin','panel','batch','auto','decision') NULL COMMENT 'pin «برمزه على جهازك»، panel «من لوحته»، batch «ضمن التأكيد الجماعي»، auto «عند إنهاء الجلسة»، decision «باعتماد الإدارة»',
  `unconfirmed_reason` VARCHAR(300) NULL COMMENT 'سبب «لا أؤكد»',
  `decision_kind` ENUM('approve','void') NULL COMMENT 'قرار الإدارة: approve «اعتماد إداري»، void «إلغاء إداري»',
  `decision_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من قرر',
  `decision_at` DATETIME(3) NULL COMMENT 'وقت القرار',
  `decision_note` VARCHAR(500) NULL COMMENT 'سبب القرار (3 أحرف على الأقل)',
  `alert_focus_lost` SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'مرات فقدان التركيز',
  `alert_reentries` SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'مرات الاستئناف',
  `alert_screenshots` SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'لقطات الشاشة',
  `alert_ip_changed` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'تغيّر IP',
  `alert_device_changed` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'تغيّر الجهاز',
  `alert_disconnected` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'انقطع الاتصال',
  `pin_tries` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'رموز خاطئة على جهازه',
  `pin_locked_until` DATETIME(3) NULL COMMENT 'قُفل جهازه حتى',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  PRIMARY KEY (`id`),
  KEY `ix_exam_attempts_admin_season_file_id` (`admin_season_file_id`),
  KEY `ix_exam_attempts_sitting_id_status` (`sitting_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='محاولات الاختبار — ورقة المتقدم في اختبار صفته (أو أكثر من اختبار لصفة تجلس اختبارين).';

CREATE TABLE `exam_attempt_questions` (
  `attempt_id` BIGINT UNSIGNED NOT NULL COMMENT 'المحاولة',
  `section_id` BIGINT UNSIGNED NOT NULL COMMENT 'القسم',
  `question_id` BIGINT UNSIGNED NOT NULL COMMENT 'السؤال',
  `position` SMALLINT UNSIGNED NOT NULL COMMENT 'الترتيب في الورقة',
  `answer_option_no` TINYINT UNSIGNED NULL COMMENT 'الخيار الذي اختاره (رقمه الأصلي)',
  `answered_at` DATETIME(3) NULL COMMENT 'وقت الإجابة (حفظ تلقائي مع كل نقرة)',
  `is_correct` TINYINT(1) NULL COMMENT 'صحيحة (تُحسب عند التسليم)',
  PRIMARY KEY (`attempt_id`, `question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ورقة المحاولة — الأسئلة التي سُحبت للمتقدم، بأقسامها وترتيبها، وإجابته.';

CREATE TABLE `exam_attempt_section_scores` (
  `attempt_id` BIGINT UNSIGNED NOT NULL COMMENT 'المحاولة',
  `section_id` BIGINT UNSIGNED NOT NULL COMMENT 'القسم',
  `earned` SMALLINT UNSIGNED NOT NULL COMMENT 'المحرز',
  `possible` SMALLINT UNSIGNED NOT NULL COMMENT 'الممكن',
  `passed` TINYINT(1) NOT NULL COMMENT 'النسبة ≥ نسبة نجاح القسم',
  PRIMARY KEY (`attempt_id`, `section_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='نتيجة كل قسم — النقاط المحرزة والممكنة في كل قسم ونجاحه.';

CREATE TABLE `oral_slots` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `role_key` VARCHAR(40) NOT NULL COMMENT 'صفة الاختبار',
  `center_id` BIGINT UNSIGNED NOT NULL COMMENT 'المركز',
  `slot_at` DATETIME(3) NOT NULL COMMENT 'الموعد',
  `seats` TINYINT UNSIGNED NOT NULL DEFAULT 8 COMMENT 'المقاعد',
  `committee` JSON NOT NULL COMMENT 'أعضاء اللجنة بالأسماء (مثل «الشيخ محمد الحسني»، «مازن الحلبي»، «رولا الشامي»)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_oral_slots_role_key_center_id_slot_at` (`role_key`, `center_id`, `slot_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مواعيد الامتحان الشفهي — مواعيد كل صفة في كل مركز بمقاعدها ولجنتها. الكود يولّدها: يومان لكل صفة، الساعات 09:00 و10:30 و12:00، 8 مقاعد.';

CREATE TABLE `oral_bookings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `admin_season_file_id` BIGINT UNSIGNED NOT NULL COMMENT 'ملف المتقدم',
  `slot_id` BIGINT UNSIGNED NOT NULL COMMENT 'الموعد',
  `booked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الحجز',
  `status` ENUM('booked','passed','failed','absent','cancelled') NOT NULL DEFAULT 'booked' COMMENT 'booked «محجوز»، passed «ناجح»، failed «راسب»، absent «غائب»، cancelled ألغاه صاحبه',
  `score` TINYINT UNSIGNED NULL COMMENT 'الدرجة 0–100 (لا درجة للغائب)',
  `note` VARCHAR(500) NULL COMMENT 'ملاحظة اللجنة',
  `recorded_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من سجّل النتيجة',
  `recorded_by_label` VARCHAR(160) NULL COMMENT '«<اسم الموظف> — <عضو اللجنة>»',
  `recorded_at` DATETIME(3) NULL COMMENT 'وقت التسجيل (لا تُعدَّل النتيجة بعده)',
  PRIMARY KEY (`id`),
  CONSTRAINT `ck_oral_bookings_1` CHECK (score <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='حجوزات الشفهي ونتائجه — حجز الناجح في المكتوب موعداً، ونتيجته التي تسجّلها اللجنة.';

-- ───────────────────────────────────────────────────────────────
-- التشكيل: المجموعات والتكتلات وصفحاتها العامة وخططها
-- ───────────────────────────────────────────────────────────────

CREATE TABLE `admin_groups` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `number` SMALLINT UNSIGNED NOT NULL COMMENT 'الرقم الداخلي في الموسم (لا يُعرض). أول رقم حر بعد 26',
  `name` VARCHAR(40) NOT NULL COMMENT 'الاسم كما اختاره رئيسها، كلمة أو كلمتان دون «مجموعة» (يُعرض «مجموعة <الاسم>»). فريد في الموسم، ولا يساوي اسم تكتل',
  `head_account_id` BIGINT UNSIGNED NOT NULL COMMENT 'رئيس المجموعة (مؤهل: نجح ونُشرت نتيجته)',
  `category_key` VARCHAR(20) NOT NULL COMMENT 'الفئة (فئة رئيسها)',
  `capacity` SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'سعة الحجاج بحسب الفئة والمستوى (0 حتى الاعتماد)',
  `category_name_snapshot` VARCHAR(60) NULL COMMENT 'اسم الفئة وقت الاعتماد',
  `cluster_id` BIGINT UNSIGNED NULL COMMENT 'التكتل الذي انضمت إليه',
  `formed_at_office` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'شُكّلت في المكتب (المسار الحالي)؛ 0 = طلب قديم قُدّم على المنصة',
  `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الطلب أو الحضور إلى المكتب',
  `fee_payment_id` BIGINT UNSIGNED NULL COMMENT 'دفعة رسم التشكيل',
  `fee_paid_at` DATETIME(3) NULL COMMENT 'دفع الرسم',
  `fee_receipt_no` VARCHAR(24) NULL COMMENT 'إيصال الرسم {season}-G-{رقم المجموعة:06} (الكود يعرضه ولا يخزّنه)',
  `contract_file_id` BIGINT UNSIGNED NULL COMMENT 'صورة العقد الموقّع من رئيس المجموعة وكل فريقها',
  `approved_at` DATETIME(3) NULL COMMENT 'الاعتماد',
  `approved_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من اعتمدها (صلاحية admins.manage)',
  `returned_at` DATETIME(3) NULL COMMENT 'أُعيدت إلى رئيسها (الطلبات القديمة)',
  `returned_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من أعادها',
  `return_note` VARCHAR(500) NULL COMMENT 'ما ينقصها (5 أحرف على الأقل). الرسم لا يُرد',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_admin_groups_fee_receipt_no` (`fee_receipt_no`),
  UNIQUE KEY `uq_admin_groups_season_year_number` (`season_year`, `number`),
  UNIQUE KEY `uq_admin_groups_season_year_name` (`season_year`, `name`),
  UNIQUE KEY `uq_admin_groups_season_year_head_account_id` (`season_year`, `head_account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='المجموعات — مجموعة واحدة لكل رئيس مجموعة في الموسم.';

CREATE TABLE `group_seats` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `group_id` BIGINT UNSIGNED NOT NULL COMMENT 'المجموعة',
  `seat_no` TINYINT UNSIGNED NOT NULL COMMENT 'رقم المقعد',
  `kind` ENUM('guide','assistant','count-assistant') NOT NULL COMMENT 'guide مقعد «موجّه المجموعة»، assistant «معاون المجموعة»، count-assistant «معاون بعدد» (يضيف حجاجاً إلى التكتل)',
  `is_free` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'مقعد حر يشغله موجّه أو معاون',
  `account_id` BIGINT UNSIGNED NULL COMMENT 'شاغل المقعد',
  `status` ENUM('pending','accepted','declined') NOT NULL DEFAULT 'accepted' COMMENT 'pending بانتظار (مسار الدعوات القديم)، accepted مقبول (التشكيل في المكتب يقبل فوراً)، declined اعتذر',
  `assigned_at` DATETIME(3) NULL COMMENT 'وقت الشغل',
  `decline_reason` VARCHAR(300) NULL COMMENT 'سبب الاعتذار (مسار الدعوات)',
  `by_administration_reason` VARCHAR(300) NULL COMMENT 'إن شغله تعديل استثنائي من الإدارة: السبب («بتعديل استثنائي من الإدارة»)',
  `by_administration_staff_id` BIGINT UNSIGNED NULL COMMENT 'الموظف صاحب التعديل الاستثنائي',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_group_seats_group_id_seat_no` (`group_id`, `seat_no`),
  KEY `ix_group_seats_account_id` (`account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مقاعد فريق المجموعة — مقاعد الموجّه والمعاون والمقاعد الحرة بحسب فئة المجموعة ومستوى تكتلها، ومن يشغلها. ومعها «معاون بعدد» حين لا مقعد معاون في الفئة.';

CREATE TABLE `clusters` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `slug` VARCHAR(60) NOT NULL COMMENT 'المعرّف النصي ورابط الصفحة العامة: al-nour، al-safa… أو cluster-adm-<…> لما يُنشأ في المكتب',
  `name` VARCHAR(80) NOT NULL COMMENT 'الاسم «تكتل …» (3 أحرف على الأقل)',
  `head_account_id` BIGINT UNSIGNED NOT NULL COMMENT 'رئيس التكتل (يُمنح بالصفة الموسمية cluster-head أو الصفة الأساسية)',
  `tier_key` VARCHAR(20) NULL COMMENT 'المستوى',
  `status` ENUM('draft','pending','reviewing','approved','rejected') NOT NULL DEFAULT 'draft' COMMENT 'draft «قيد التشكيل في المكتب»، pending «قيد المراجعة»، reviewing «جاري المراجعة»، approved «شُكّل في المكتب»، rejected «مرفوض — بملاحظات»',
  `sent_at` DATETIME(3) NULL COMMENT 'آخر إرسال',
  `first_sent_at` DATETIME(3) NULL COMMENT 'أول إرسال (أساس شارة الالتزام بالمواعيد)',
  `decision_note` VARCHAR(1000) NULL COMMENT 'ملاحظات القرار عند الرفض',
  `decided_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من قرر',
  `decided_at` DATETIME(3) NULL COMMENT 'وقت القرار',
  `created_at_office` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'أُنشئ في المكتب نيابة عن رئيسه («بدء تشكيل تكتل في المكتب»)',
  `created_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'الموظف الذي بدأه في المكتب',
  `administration_reason` VARCHAR(500) NULL COMMENT 'سبب آخر تصرّف للإدارة نيابة عن رئيسه («شُكّل في المكتب»، أو سبب تعديل استثنائي)',
  `administration_at` DATETIME(3) NULL COMMENT 'وقت ذلك التصرّف',
  `fee_payment_id` BIGINT UNSIGNED NULL COMMENT 'دفعة رسم التكتل',
  `fee_paid_at` DATETIME(3) NULL COMMENT 'دفع الرسم (500 $)',
  `contract_file_id` BIGINT UNSIGNED NULL COMMENT 'عقد التكتل الموقّع من رئيسه وكل من فيه',
  `archived_at` DATETIME(3) NULL COMMENT 'أُرشف (يخرج من الدليل والمنشورات)',
  `archived_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من أرشفه',
  `formation_note` TEXT NULL COMMENT 'ملاحظة الإدارة الحرة على التكتل في الدليل',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_clusters_slug` (`slug`),
  UNIQUE KEY `uq_clusters_season_year_head_account_id` (`season_year`, `head_account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='التكتلات — التكتل برئيسه ومستواه وحالة تشكيله.';

CREATE TABLE `cluster_status_history` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `cluster_id` BIGINT UNSIGNED NOT NULL COMMENT 'التكتل',
  `status` VARCHAR(20) NOT NULL COMMENT 'الحالة الجديدة',
  `event` ENUM('send','resend','review','approve','reject','reopen','office-create','administration-edit','cancel') NOT NULL COMMENT 'الحدث: send إرسال، resend «إعادة إرسال»، review بدء المراجعة، approve اعتماد، reject رفض، reopen إعادة فتح، office-create إنشاء في المكتب، administration-edit تعديل استثنائي من الإدارة (سببه في note)، cancel «إلغاء تشكيل تكتل قبل إنشائه»',
  `at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  `staff_user_id` BIGINT UNSIGNED NULL COMMENT 'الموظف',
  `account_id` BIGINT UNSIGNED NULL COMMENT 'رئيس التكتل',
  `note` VARCHAR(1000) NULL COMMENT 'ملاحظة',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='تاريخ حالات التكتل — الإرسال، المراجعة، الاعتماد، الرفض، إعادة الفتح.';

CREATE TABLE `cluster_groups` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `cluster_id` BIGINT UNSIGNED NOT NULL COMMENT 'التكتل',
  `group_id` BIGINT UNSIGNED NOT NULL COMMENT 'المجموعة (في تكتل واحد فقط)',
  `status` ENUM('pending','accepted','declined') NOT NULL DEFAULT 'accepted' COMMENT 'حالة الانضمام',
  `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الانضمام',
  `decline_reason` VARCHAR(300) NULL COMMENT 'سبب اعتذار رئيس المجموعة (مسار الدعوات)',
  `coordinator_account_id` BIGINT UNSIGNED NULL COMMENT 'المنسق التقني الموزَّع على المجموعة',
  `female_guide_account_id` BIGINT UNSIGNED NULL COMMENT 'الموجّهة الموزَّعة على المجموعة',
  `by_administration_reason` VARCHAR(300) NULL COMMENT 'إضافة بقرار الإدارة (تعديل استثنائي أو مجموعة من خارج التكتلات بعد الموعد): السبب',
  `by_administration_staff_id` BIGINT UNSIGNED NULL COMMENT 'الموظف صاحب القرار',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cluster_groups_group_id` (`group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مجموعات التكتل — المجموعات المنضمة إلى التكتل، ومن يخدمها من المنسقين والموجّهات (التوزيع ضمن حدود الوحدات).';

CREATE TABLE `cluster_members` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `cluster_id` BIGINT UNSIGNED NOT NULL COMMENT 'التكتل',
  `account_id` BIGINT UNSIGNED NOT NULL COMMENT 'العضو',
  `pool` ENUM('assistant','coordinator','female_guide','accountant') NOT NULL COMMENT 'الموقع: assistant «معاون التكتل» (ومعه «معاون بعدد»)، coordinator «منسق تقني بالتكتل»، female_guide «موجّهة دينية بالتكتل»، accountant «محاسب التكتل»',
  `status` ENUM('pending','accepted','declined') NOT NULL DEFAULT 'accepted' COMMENT 'الحالة',
  `reason` VARCHAR(300) NULL COMMENT 'سبب الاعتذار أو سبب التعديل الاستثنائي',
  `by_administration_staff_id` BIGINT UNSIGNED NULL COMMENT 'إن أضافه تعديل استثنائي',
  `at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cluster_members_cluster_id_account_id_pool` (`cluster_id`, `account_id`, `pool`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='أعضاء التكتل — معاونو التكتل ومنسقوه وموجّهاته ومحاسبه.';

CREATE TABLE `formation_notes` (
  `group_id` BIGINT UNSIGNED NOT NULL COMMENT 'المجموعة',
  `note` TEXT NOT NULL COMMENT 'الملاحظة',
  `updated_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'آخر من كتب',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ملاحظات الإدارة على المجموعات — ملاحظة حرة يكتبها موظف «إدارة الإداريين» على مجموعة في الدليل (ملاحظة التكتل في clusters.formation_note).';

CREATE TABLE `season_rollovers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `from_season` SMALLINT UNSIGNED NOT NULL COMMENT 'من موسم',
  `to_season` SMALLINT UNSIGNED NOT NULL COMMENT 'إلى موسم',
  `archived_cluster_ids` JSON NOT NULL COMMENT 'التكتلات التي أُرشفت بهذا الفعل',
  `reason` VARCHAR(500) NOT NULL COMMENT 'السبب (3 أحرف على الأقل)',
  `started_by_staff_id` BIGINT UNSIGNED NOT NULL COMMENT 'من بدأه',
  `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  `undone_at` DATETIME(3) NULL COMMENT 'التراجع',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='بدء موسم تشكيل جديد — حين تبدأ الإدارة موسماً جديداً تُؤرشف التشكيلات المعتمدة للموسم الجاري وتُختم التشكيلات الجديدة بالموسم التالي. يمكن التراجع.';

CREATE TABLE `cluster_profile_versions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `cluster_id` BIGINT UNSIGNED NOT NULL COMMENT 'التكتل',
  `status` ENUM('pending','approved','rejected','superseded') NOT NULL DEFAULT 'pending' COMMENT 'pending «عند الإدارة»، approved «معتمدة»، rejected «أُعيدت إليك»، superseded حلّت محلها نسخة أحدث',
  `fields` JSON NOT NULL COMMENT 'الحقول: specialty «التخصص»، about «نبذة عن التكتل»، makkahHotel، makkahArea، makkahDistance، makkahRooms «نوع الغرف»، makkahFeatures[]، madinahHotel، madinahArea، madinahDistance، makkahAt و madinahAt {lat,lng}، transport[] «النقل»، meals[] «الإعاشة»، programs[] «البرامج»، rooms {1,2,3,4} «السكن الخاص — للفرد بحسب أسرّة الغرفة»، cover، gallery[] (معرّفات files)',
  `note` VARCHAR(500) NULL COMMENT 'ملاحظة المرسل',
  `submitted_by_account_id` BIGINT UNSIGNED NOT NULL COMMENT 'من أرسل (رئيس التكتل أو منسقه أو معاونه أو معاون مجموعة أو رئيس مجموعة معتمدة فيه؛ لا الموجّهون)',
  `submitted_by_label` VARCHAR(160) NOT NULL COMMENT '«<الاسم> — <الموقع>»',
  `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإرسال',
  `decided_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من قرر',
  `decided_at` DATETIME(3) NULL COMMENT 'وقت القرار',
  `reject_reason` VARCHAR(500) NULL COMMENT 'سبب الإعادة (5 أحرف على الأقل)، مثل «الوصف لا يطابق العقد الموقّع مع الفندق»، «المسافة المذكورة غير دقيقة»، «خدمة موصوفة دون تعاقد يثبتها»، «صياغة دعائية لا تصف خدمة»',
  PRIMARY KEY (`id`),
  KEY `ix_cluster_profile_versions_cluster_id_status` (`cluster_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الصفحة العامة للتكتل — برنامج التكتل المنشور في «التكتلات والمجموعات»: يكتبه فريق التكتل ويرسله، فتعتمده «إدارة الإداريين» أو تعيده بسبب. كل إرسال صف، والمنشور آخر صف معتمد.';

CREATE TABLE `group_profile_versions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `group_id` BIGINT UNSIGNED NOT NULL COMMENT 'المجموعة',
  `status` ENUM('pending','approved','rejected','superseded') NOT NULL DEFAULT 'pending' COMMENT 'الحالة',
  `cover_file_id` BIGINT UNSIGNED NULL COMMENT 'صورة المجموعة',
  `about` TEXT NULL COMMENT 'نبذة عن المجموعة',
  `gallery_file_ids` JSON NULL COMMENT 'معرض الصور (حتى 24 صورة)',
  `note` VARCHAR(500) NULL COMMENT 'ملاحظة المرسل',
  `submitted_by_account_id` BIGINT UNSIGNED NOT NULL COMMENT 'رئيس المجموعة المعتمدة أو معاونها (ورئيس التكتل لكل مجموعاته)',
  `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإرسال',
  `decided_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من قرر',
  `decided_at` DATETIME(3) NULL COMMENT 'وقت القرار',
  `reject_reason` VARCHAR(500) NULL COMMENT 'سبب الإعادة، مثل «صورة لا تخص المجموعة أو موسمها»، «صورة تظهر فيها وجوه حجاج دون إذنهم»، «نبذة دعائية لا تصف المجموعة»، «نص أو صورة غير لائقة»',
  PRIMARY KEY (`id`),
  KEY `ix_group_profile_versions_group_id_status` (`group_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الصفحة العامة للمجموعة — صورة المجموعة ونبذتها ومعرض صورها، بالدورة نفسها.';

CREATE TABLE `operational_plans` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `cluster_id` BIGINT UNSIGNED NOT NULL COMMENT 'التكتل',
  `title` VARCHAR(160) NOT NULL COMMENT 'العنوان (3 أحرف على الأقل)',
  `summary` TEXT NOT NULL COMMENT 'الملخص (20 حرفاً على الأقل)',
  `file_id` BIGINT UNSIGNED NOT NULL COMMENT 'ملف الخطة (pdf، doc، docx)',
  `status` ENUM('submitted','accepted','returned') NOT NULL DEFAULT 'submitted' COMMENT 'submitted «تنتظر القرار»، accepted «مقبولة»، returned «أُعيدت بملاحظات»',
  `submitted_by_account_id` BIGINT UNSIGNED NOT NULL COMMENT 'رئيس التكتل',
  `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الرفع',
  `decided_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من قرر',
  `decided_at` DATETIME(3) NULL COMMENT 'وقت القرار',
  `decision_note` VARCHAR(1000) NULL COMMENT 'الملاحظات (5 أحرف على الأقل عند الإعادة)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الخطط التشغيلية للتكتلات — الخطة التشغيلية التي يرفعها رئيس التكتل المعتمد، فتقبلها الإدارة أو تعيدها بملاحظات.';

-- ───────────────────────────────────────────────────────────────
-- الكادر والمراسلات وقناة التكتل ومراجع الكادر
-- ───────────────────────────────────────────────────────────────

CREATE TABLE `cadre_people` (
  `national_id` CHAR(11) NOT NULL COMMENT 'الشخص (المفتاح الأساسي)',
  `account_id` BIGINT UNSIGNED NULL COMMENT 'حسابه إن وُجد',
  `primary_role_key` VARCHAR(40) NULL COMMENT '«الصفة الأساسية» الدائمة (NULL = صفة تقدّمه)',
  `branch_id` BIGINT UNSIGNED NULL COMMENT 'الفرع (الافتراضي دمشق)',
  `category_key` VARCHAR(20) NULL COMMENT 'فئة رئيس المجموعة، وهي فئة مجموعته',
  `added_manually` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'أُضيف بيد الإدارة («إضافة فرد إلى الكادر»)',
  `added_reason` VARCHAR(500) NULL COMMENT 'سبب الإضافة (3 أحرف على الأقل)',
  `added_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من أضافه',
  `account_status` ENUM('active','disabled','deleted') NOT NULL DEFAULT 'active' COMMENT 'الحالة: active «فعّال»، disabled «موقوف» («حسابك موقوف من الإدارة»)، deleted «محذوف» («حسابك محذوف من الكادر»). لا يُحذف من في تكتل معتمد',
  `status_reason` VARCHAR(500) NULL COMMENT 'سبب الإيقاف أو الحذف (3 أحرف على الأقل)',
  `status_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من غيّر الحالة',
  `status_at` DATETIME(3) NULL COMMENT 'وقت التغيير',
  `contact_phone` VARCHAR(20) NULL COMMENT 'هاتف التواصل كما تحفظه الإدارة',
  `contact_birth_date` DATE NULL COMMENT 'تاريخ الميلاد كما تحفظه الإدارة',
  `barcode` VARCHAR(20) NULL COMMENT 'رقم الباركود (أرقام فقط)',
  `login_pin_hash` VARCHAR(255) NULL COMMENT 'بصمة رمز الدخول (4 أرقام). الكود يعرّف الحقل ولا شاشة لتوليده',
  `telegram_handle` VARCHAR(60) NULL COMMENT 'معرّف تيليجرام',
  `telegram_chat_id` VARCHAR(40) NULL COMMENT 'معرّف المحادثة مع البوت: موجود = «مربوط»، فارغ = «غير مربوط» («فك ربط تيليجرام» يفرغه)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`national_id`),
  UNIQUE KEY `uq_cadre_people_account_id` (`account_id`),
  UNIQUE KEY `uq_cadre_people_barcode` (`barcode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='سجل الكادر — سجل الإدارة لكل إداري عبر المواسم. المفتاح الرقم الوطني لأن الإدارة قد تضيف شخصاً لا يملك حساباً بعد.';

CREATE TABLE `cadre_extra_branches` (
  `national_id` CHAR(11) NOT NULL COMMENT 'الإداري',
  `branch_id` BIGINT UNSIGNED NOT NULL COMMENT 'الفرع',
  PRIMARY KEY (`national_id`, `branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الفروع الإضافية — فروع إضافية للإداري غير فرعه الأساسي (يُختار كادر التكتل من فروع رئيسه).';

CREATE TABLE `cadre_seasonal_roles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `national_id` CHAR(11) NOT NULL COMMENT 'الإداري',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `role_key` VARCHAR(40) NOT NULL COMMENT 'الصفة الممنوحة (مثل cluster-head)',
  `label_id` BIGINT UNSIGNED NULL COMMENT 'التسمية الموسمية',
  `reason` VARCHAR(500) NOT NULL COMMENT 'السبب (3 أحرف على الأقل)',
  `granted_by_staff_id` BIGINT UNSIGNED NOT NULL COMMENT 'من منحها',
  `granted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  `revoked_at` DATETIME(3) NULL COMMENT 'سُحبت («← بلا صفة موسمية»)',
  `revoked_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من سحبها',
  PRIMARY KEY (`id`),
  KEY `ix_cadre_seasonal_roles_national_id_season_year` (`national_id`, `season_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الصفات الموسمية — صفة تمنحها الإدارة لإداري في موسم فوق ما تقدّم له، بتسمية اختيارية وسبب. سحبها يُبقي السجل.';

CREATE TABLE `cadre_events` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `national_id` CHAR(11) NOT NULL COMMENT 'الإداري',
  `event_type` ENUM('joined','exceptional','role','seasonal','branch','category','added','status','deleted','note') NOT NULL COMMENT 'النوع: joined «انضمام إلى تكتل»، exceptional «تعديل استثنائي على التشكيل»، role «تغيير الصفة»، seasonal «تغيير الصفة الموسمية»، branch «تغيير الفرع»، category «تغيير الفئة»، added «إضافة كادر جديد»، status «إيقاف الحساب أو تفعيله»، deleted «حذف كادر نهائياً»، note «حدث عام / ملاحظة»',
  `season_year` SMALLINT UNSIGNED NULL COMMENT 'الموسم (NULL «بلا موسم»)',
  `event_date` DATE NOT NULL COMMENT 'تاريخ الحدث',
  `change_text` VARCHAR(300) NULL COMMENT 'التغيير «قديم ← جديد»',
  `note` VARCHAR(1000) NULL COMMENT 'الملاحظة أو السبب',
  `by_staff_id` BIGINT UNSIGNED NOT NULL COMMENT 'من سجّله',
  `at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت التسجيل',
  PRIMARY KEY (`id`),
  KEY `ix_cadre_events_national_id_at` (`national_id`, `at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='أحداث ملف الكادر — ما جرى على ملف كل إداري: انضمام إلى تكتل، تعديل استثنائي، تغيير صفة أو فرع أو فئة، إضافة، إيقاف، حذف، وملاحظات تُكتب باليد.';

CREATE TABLE `telegram_messages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `text` TEXT NOT NULL COMMENT 'النص (3 أحرف على الأقل)',
  `filter_description` VARCHAR(300) NULL COMMENT 'وصف التصفية التي حددت المستلمين',
  `sent_by_staff_id` BIGINT UNSIGNED NOT NULL COMMENT 'المرسل',
  `sent_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='رسائل تيليجرام إلى الكادر — رسالة يرسلها موظف «إدارة الإداريين» عبر البوت إلى القائمة المعروضة من الكادر (بعد تصفيتها). تصل لمن ربط حسابه.';

CREATE TABLE `telegram_message_recipients` (
  `message_id` BIGINT UNSIGNED NOT NULL COMMENT 'الرسالة',
  `national_id` CHAR(11) NOT NULL COMMENT 'المستلم',
  `reached` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'وصلته (حسابه مربوط بالبوت)',
  `delivered_at` DATETIME(3) NULL COMMENT 'وقت الإيصال من البوت',
  PRIMARY KEY (`message_id`, `national_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مستلمو رسالة تيليجرام — كل مستلم، وهل وصلته (له chat_id).';

CREATE TABLE `letters` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `number` VARCHAR(20) NOT NULL COMMENT 'الرقم م-{season}-{n:04}',
  `account_id` BIGINT UNSIGNED NOT NULL COMMENT 'الإداري صاحب المراسلة',
  `subject` VARCHAR(200) NOT NULL COMMENT 'الموضوع (3 أحرف على الأقل)',
  `kind` ENUM('inquiry','request','complaint','suggestion','problem') NOT NULL COMMENT 'النوع: inquiry «استفسار»، request «طلب»، complaint «شكوى»، suggestion «اقتراح»، problem «إبلاغ عن مشكلة»',
  `opened_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الفتح',
  `staff_read_at` DATETIME(3) NULL COMMENT 'آخر فتح من الموظف',
  `admin_read_at` DATETIME(3) NULL COMMENT 'آخر فتح من الإداري',
  `closed_at` DATETIME(3) NULL COMMENT 'أُغلقت (لا رد بعد الإغلاق إلا بإعادة فتحها)',
  `closed_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من أغلقها',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_letters_number` (`number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='المراسلات — موضوع مراسلة يفتحه الإداري مع الإدارة.';

CREATE TABLE `letter_messages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `letter_id` BIGINT UNSIGNED NOT NULL COMMENT 'المراسلة',
  `author_kind` ENUM('admin','staff') NOT NULL COMMENT 'من الإداري أو من الموظف',
  `author_account_id` BIGINT UNSIGNED NULL COMMENT 'الإداري',
  `author_staff_id` BIGINT UNSIGNED NULL COMMENT 'الموظف',
  `author_name` VARCHAR(160) NOT NULL COMMENT 'الاسم المعروض',
  `text` TEXT NOT NULL COMMENT 'النص (5 أحرف للرسالة الأولى، 2 للرد)',
  `file_id` BIGINT UNSIGNED NULL COMMENT 'مرفق (الكود يحفظ اسمه فقط)',
  `at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  PRIMARY KEY (`id`),
  CONSTRAINT `ck_letter_messages_1` CHECK ((author_kind = 'admin') = (author_account_id IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='رسائل المراسلة — الرسائل داخل الموضوع.';

CREATE TABLE `cluster_channel_writer_roles` (
  `cluster_id` BIGINT UNSIGNED NOT NULL COMMENT 'التكتل',
  `channel_role` ENUM('head','accountant','group-head','cluster-assistant','tech','guide-f','guide','assistant') NOT NULL COMMENT 'الدور في القناة: head «رئيس التكتل»، accountant «محاسب التكتل»، group-head «رئيس مجموعة»، cluster-assistant «معاون التكتل»، tech «منسق تقني»، guide-f «موجّهة دينية»، guide «موجّه ديني»، assistant «معاون مجموعة»',
  PRIMARY KEY (`cluster_id`, `channel_role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='من يكتب في قناة التكتل — الأدوار المسموح لها بالكتابة. الافتراضي رئيس التكتل وحده، ورئيس التكتل يكتب دائماً.';

CREATE TABLE `channel_messages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `cluster_id` BIGINT UNSIGNED NOT NULL COMMENT 'التكتل',
  `author_account_id` BIGINT UNSIGNED NOT NULL COMMENT 'الكاتب',
  `author_role` ENUM('head','accountant','group-head','cluster-assistant','tech','guide-f','guide','assistant') NOT NULL COMMENT 'دوره وقت الكتابة (أعلى أدواره في التكتل)',
  `text` TEXT NOT NULL COMMENT 'النص (1000 حرف حداً)',
  `reply_to_id` BIGINT UNSIGNED NULL COMMENT 'الرسالة التي يرد عليها',
  `pinned_at` DATETIME(3) NULL COMMENT 'ثبّتها الرئيس',
  `removed_at` DATETIME(3) NULL COMMENT 'حُذفت (يحذف الكاتب رسالته، والرئيس أي رسالة)',
  `removed_by_account_id` BIGINT UNSIGNED NULL COMMENT 'من حذفها',
  `at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  PRIMARY KEY (`id`),
  KEY `ix_channel_messages_cluster_id_at` (`cluster_id`, `at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='رسائل قناة التكتل — رسائل كادر التكتل، مع الرد والتثبيت والحذف المنطقي.';

CREATE TABLE `channel_mutes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `cluster_id` BIGINT UNSIGNED NOT NULL COMMENT 'التكتل',
  `account_id` BIGINT UNSIGNED NOT NULL COMMENT 'المكتوم',
  `muted_by_account_id` BIGINT UNSIGNED NOT NULL COMMENT 'من كتمه',
  `reason` VARCHAR(300) NULL COMMENT 'السبب (اختياري)',
  `muted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  `lifted_at` DATETIME(3) NULL COMMENT 'رُفع الكتم',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الكتم في قناة التكتل — يكتم الرئيس عضواً (لا يُكتم الرئيس نفسه).';

CREATE TABLE `channel_reads` (
  `cluster_id` BIGINT UNSIGNED NOT NULL COMMENT 'التكتل',
  `account_id` BIGINT UNSIGNED NOT NULL COMMENT 'العضو',
  `last_read_at` DATETIME(3) NOT NULL COMMENT 'آخر قراءة',
  PRIMARY KEY (`cluster_id`, `account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='آخر قراءة في القناة — لحساب الرسائل غير المقروءة لكل عضو.';

CREATE TABLE `admin_job_descriptions` (
  `role_key` VARCHAR(40) NOT NULL COMMENT 'الصفة (أو cluster-accountant لمحاسب التكتل)',
  `summary` TEXT NOT NULL COMMENT 'الملخص',
  `duties` JSON NOT NULL COMMENT 'المهام سطراً سطراً',
  `hidden` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'مخفي عن الإداريين',
  `sort_order` SMALLINT NOT NULL DEFAULT 0 COMMENT 'الترتيب',
  `updated_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'آخر من عدّل',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`role_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='التوصيف الوظيفي — توصيف كل صفة ومهامها في «مراجع الكادر».';

CREATE TABLE `admin_system_sections` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `title` VARCHAR(200) NOT NULL COMMENT 'العنوان',
  `body` MEDIUMTEXT NOT NULL COMMENT 'النص',
  `sort_order` SMALLINT NOT NULL DEFAULT 0 COMMENT 'الترتيب',
  `updated_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'آخر من عدّل',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='النظام الإداري — أقسام وثيقة النظام الإداري (من «القسم الأول: المقدمة والأهداف» إلى «الخاتمة»). النص بترميز بسيط: سطر فارغ يفصل الفقرات، «- » يبدأ بنداً، **غامق**.';

CREATE TABLE `admin_decisions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `title` VARCHAR(200) NOT NULL COMMENT 'العنوان (3 أحرف على الأقل)',
  `year` SMALLINT UNSIGNED NOT NULL COMMENT 'السنة الهجرية (1448)',
  `description` TEXT NOT NULL COMMENT 'الوصف',
  `file_id` BIGINT UNSIGNED NOT NULL COMMENT 'الملف',
  `sort_order` SMALLINT NOT NULL DEFAULT 0 COMMENT 'الترتيب',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='المقررات الإدارية — المقررات المنشورة للكادر مع ملفاتها.';

CREATE TABLE `admin_contract_templates` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `title` VARCHAR(200) NOT NULL COMMENT 'العنوان',
  `party` VARCHAR(160) NOT NULL COMMENT 'الطرف',
  `description` TEXT NOT NULL COMMENT 'الوصف',
  `file_id` BIGINT UNSIGNED NOT NULL COMMENT 'الملف',
  `sort_order` SMALLINT NOT NULL DEFAULT 0 COMMENT 'الترتيب',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='العقود المرجعية — نماذج العقود: «عقد الحاج مع المجموعة»، «عقد التكليف الإداري»، «تعهّد رئيس التكتل»، «عقد خدمات التكتل».';

-- ───────────────────────────────────────────────────────────────
-- العمل الميداني: المناسك والقناة والتقارير والدروس والنشاطات والقوائم
-- ───────────────────────────────────────────────────────────────

CREATE TABLE `field_record_kinds` (
  `code` VARCHAR(30) NOT NULL COMMENT 'المفتاح: المناسك umrah، tarwiya، arafat، muzdalifa، jamarat، ifada، halq، mina، farewell؛ المزارات v-hira … v-mushaf (21)؛ السفر t-gather … t-home (10)',
  `category` ENUM('rites','visits','travel') NOT NULL COMMENT 'الفئة: rites «أداء المناسك»، visits «المزارات»، travel «السفر»',
  `label` VARCHAR(120) NOT NULL COMMENT 'الاسم: «عمرة التمتّع»، «يوم التروية في منى»، «الوقوف بعرفة»، «المبيت في مزدلفة»، «رمي الجمرات»، «طواف الإفاضة والسعي»، «الحلق أو التقصير»، «المبيت في منى أيام التشريق»، «طواف الوداع»…',
  `mode` ENUM('done','muzdalifa','jamarat','mina') NOT NULL DEFAULT 'done' COMMENT 'طريقة التسجيل: done أدّاه أو لا؛ muzdalifa بمستوى المبيت (none «لم يحقق المبيت»، midnight «حتى منتصف الليل»، fajr «حتى صلاة الفجر»)؛ jamarat بالجمرات (sughra، wusta، aqaba) لكل يوم 10–13؛ mina بالليالي 11، 12، 13',
  `city` ENUM('makkah','madinah') NULL COMMENT 'مدينة المزار',
  `absence_reason_required` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'كل من لم يؤدِّه يحتاج سبباً (المناسك والسفر نعم، المزارات لا، والعمرة الثانية فما بعد اختيارية)',
  `sort_order` SMALLINT NOT NULL DEFAULT 0 COMMENT 'الترتيب',
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='أنواع سجلات الميدان — قائمة المناسك والمزارات ومحطات السفر التي تُسجَّل.';

CREATE TABLE `field_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `group_id` BIGINT UNSIGNED NOT NULL COMMENT 'المجموعة',
  `kind_code` VARCHAR(30) NOT NULL COMMENT 'النوع',
  `title` VARCHAR(160) NOT NULL COMMENT 'العنوان المعروض: اسم المنسك، أو «عمرة التمتّع/العمرة الثانية…»، أو «رمي الجمرات — يوم النحر — 10 ذو الحجة»',
  `jamarat_day` TINYINT UNSIGNED NULL COMMENT 'يوم الرمي (10–13) لرمي الجمرات (الكود يضمّنه في العنوان)',
  `umrah_ordinal` TINYINT UNSIGNED NULL COMMENT 'ترتيب العمرة (1 = عمرة التمتّع)',
  `place` VARCHAR(200) NOT NULL COMMENT 'المكان (إلزامي)',
  `done_at` DATETIME(3) NOT NULL COMMENT 'وقت الأداء (لا يُسجَّل قبل وقوعه: ≤ الآن + 60 ثانية)',
  `required` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'سجل إلزامي (يتطلب سبباً لكل من لم يؤدِّه)',
  `recorded_by_account_id` BIGINT UNSIGNED NOT NULL COMMENT 'من سجّله (المنسق أو رئيس المجموعة أو معاونه)',
  `recorded_by_role` VARCHAR(80) NOT NULL COMMENT 'صفته وقت التسجيل',
  `flight_id` BIGINT UNSIGNED NULL COMMENT 'الرحلة لمحطة سفر (الكود يعرّفه ولا يكتبه)',
  `recorded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت التسجيل',
  `deleted_at` DATETIME(3) NULL COMMENT 'حذفه كاتبه',
  PRIMARY KEY (`id`),
  KEY `ix_field_records_group_id_kind_code` (`group_id`, `kind_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='سجلات الميدان — تسجيل منسك أو مزار أو محطة سفر لمجموعة بعد وقوعه، بمكانه ووقته ومن أدّاه.';

CREATE TABLE `field_record_persons` (
  `record_id` BIGINT UNSIGNED NOT NULL COMMENT 'السجل',
  `national_id` CHAR(11) NOT NULL COMMENT 'الحاج',
  `performed` TINYINT(1) NOT NULL COMMENT 'أدّاه',
  `absence_reason` VARCHAR(200) NULL COMMENT 'السبب: «مريض — في العيادة أو في الفندق»، «أدّاه وحده أو مع مجموعة أخرى»، «وكّل غيره (كبار السن والمرضى)»، «مع مرافقه المريض»، «تأخّر عن المجموعة ولحق بها»، «لم يُعثر عليه — أُبلغت غرفة العمليات»، أو نص آخر',
  `detail` JSON NULL COMMENT 'الدرجات بحسب الطريقة: ["fajr"] لمزدلفة، ["sughra","wusta","aqaba"] للجمرات، ["11","12"] لليالي منى',
  PRIMARY KEY (`record_id`, `national_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='من أدّى ومن لم يؤدِّ — لكل حاج في المجموعة: أدّى أو لا، وسبب عدم الأداء، وتفاصيل الدرجات.';

CREATE TABLE `group_posts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `group_id` BIGINT UNSIGNED NOT NULL COMMENT 'المجموعة',
  `author_account_id` BIGINT UNSIGNED NOT NULL COMMENT 'الناشر (رئيس المجموعة أو المنسق أو الموجّه)',
  `text` VARCHAR(280) NOT NULL COMMENT 'النص (280 حرفاً حداً). قوالب جاهزة: درس، تجمّع، وجبات، رحلة',
  `audience` ENUM('all','men','women','elderly') NOT NULL COMMENT 'الجمهور: all «المجموعة كاملة»، men «الرجال»، women «السيدات»، elderly «كبار السن ومرافقوهم» (من بلغ 69 أو له مرافق)',
  `posted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  PRIMARY KEY (`id`),
  KEY `ix_group_posts_group_id_posted_at` (`group_id`, `posted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='قناة المجموعة — إعلان ينشره فريق المجموعة لحجاجها أو فئة منهم.';

CREATE TABLE `daily_reports` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `report_day` DATE NOT NULL COMMENT 'اليوم',
  `author_account_id` BIGINT UNSIGNED NOT NULL COMMENT 'المرسل',
  `author_role` VARCHAR(80) NOT NULL COMMENT 'صفته: رئيس المجموعة، المعاون، الموجّه، المنسق، «رئيس التكتل»، «معاون التكتل»',
  `target` ENUM('cluster','administration') NOT NULL COMMENT 'إلى: cluster رئيس التكتل، administration الإدارة',
  `cluster_id` BIGINT UNSIGNED NOT NULL COMMENT 'التكتل',
  `group_id` BIGINT UNSIGNED NULL COMMENT 'المجموعة (لتقارير المجموعات)',
  `general_status` VARCHAR(500) NOT NULL COMMENT 'الحالة العامة («مستقرة»؛ وفي تقرير التكتل يُضاف «وصل n من m تقريراً من k مجموعات»)',
  `health` VARCHAR(500) NOT NULL COMMENT 'الحالات الصحية',
  `complaints` VARCHAR(500) NOT NULL COMMENT 'الشكاوى',
  `notes` VARCHAR(1000) NULL COMMENT 'ملاحظات',
  `sent_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإرسال',
  `read_at` DATETIME(3) NULL COMMENT 'أول قراءة («قرأه … الساعة …»)',
  `read_by_kind` ENUM('account','staff') NULL COMMENT 'من قرأه: رئيس التكتل أو موظف الإدارة',
  `read_by_account_id` BIGINT UNSIGNED NULL COMMENT 'رئيس التكتل القارئ',
  `read_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'الموظف القارئ',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_daily_reports_report_day_author_account_id_group_id` (`report_day`, `author_account_id`, `group_id`),
  KEY `ix_daily_reports_cluster_id_report_day` (`cluster_id`, `report_day`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='التقارير اليومية — تقرير «يومي»: كل من يعمل في المجموعة يرسل تقريره عنها إلى رئيس التكتل، ورئيس التكتل أو معاونه يرسل تقرير التكتل إلى الإدارة (غرفة العمليات).';

CREATE TABLE `lesson_topics` (
  `code` VARCHAR(40) NOT NULL COMMENT 'المفتاح',
  `label` VARCHAR(120) NOT NULL COMMENT 'الموضوع: «أحكام الإحرام ومحظوراته» … «التوبة وآداب الرحلة»',
  `sort_order` TINYINT NOT NULL DEFAULT 0 COMMENT 'الترتيب',
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='موضوعات الدروس — الموضوعات الإحدى عشرة التي يختار منها الموجّه موضوع درسه.';

CREATE TABLE `group_lessons` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `cluster_id` BIGINT UNSIGNED NULL COMMENT 'التكتل',
  `author_account_id` BIGINT UNSIGNED NOT NULL COMMENT 'الموجّه أو الموجّهة',
  `author_role` ENUM('guide','guide-f') NOT NULL COMMENT 'guide «موجّه المجموعة» (للرجال أو للجميع)، guide-f «موجّهة التكتل» (للنساء)',
  `title` VARCHAR(160) NOT NULL COMMENT 'العنوان',
  `topic_code` VARCHAR(40) NOT NULL COMMENT 'الموضوع',
  `stage` ENUM('pretravel','makkah','mashaer','madinah') NOT NULL COMMENT 'المرحلة: pretravel «قبل السفر»، makkah «في مكة»، mashaer «في المشاعر»، madinah «في المدينة»',
  `starts_at` DATETIME(3) NOT NULL COMMENT 'الموعد',
  `minutes` SMALLINT UNSIGNED NOT NULL COMMENT 'المدة (30، 45، 60، 75، 90، 120)',
  `place` VARCHAR(200) NOT NULL COMMENT 'المكان',
  `audience` ENUM('all','men','women') NOT NULL COMMENT 'all «للجميع»، men «للرجال»، women «للنساء»',
  `summary` TEXT NULL COMMENT 'ملخص بعد الدرس',
  `roll_opened_at` DATETIME(3) NULL COMMENT 'فتح الحضور',
  `roll_closed_at` DATETIME(3) NULL COMMENT 'إغلاق الحضور وتسجيله',
  `audience_size` SMALLINT UNSIGNED NULL COMMENT 'عدد المدعوين وقت الإغلاق',
  `cancelled_at` DATETIME(3) NULL COMMENT 'أُلغي',
  `cancel_reason` VARCHAR(300) NULL COMMENT 'سبب الإلغاء (3 أحرف على الأقل)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الدروس الدينية — درس يعقده الموجّه لمجموعته أو الموجّهة لنساء التكتل، بموعده ومكانه وجمهوره، ثم يُسجَّل حضوره.';

CREATE TABLE `lesson_groups` (
  `lesson_id` BIGINT UNSIGNED NOT NULL COMMENT 'الدرس',
  `group_id` BIGINT UNSIGNED NOT NULL COMMENT 'المجموعة',
  PRIMARY KEY (`lesson_id`, `group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مجموعات الدرس — المجموعات المدعوة إلى الدرس.';

CREATE TABLE `lesson_interest` (
  `lesson_id` BIGINT UNSIGNED NOT NULL COMMENT 'الدرس',
  `national_id` CHAR(11) NOT NULL COMMENT 'الفرد',
  `by_account_id` BIGINT UNSIGNED NOT NULL COMMENT 'الحاج الذي أعلن',
  `at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  PRIMARY KEY (`lesson_id`, `national_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='سنحضر — أفراد العائلة الذين أعلن الحاج حضورهم («سنحضر درس: …»).';

CREATE TABLE `lesson_attendance` (
  `lesson_id` BIGINT UNSIGNED NOT NULL COMMENT 'الدرس',
  `national_id` CHAR(11) NOT NULL COMMENT 'الحاضر',
  `marked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت التسجيل',
  PRIMARY KEY (`lesson_id`, `national_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='حضور الدرس — من حضر فعلاً كما سجّله الموجّه.';

CREATE TABLE `religious_activities` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `cluster_id` BIGINT UNSIGNED NULL COMMENT 'التكتل',
  `author_account_id` BIGINT UNSIGNED NOT NULL COMMENT 'الموجّه أو الموجّهة',
  `author_role` ENUM('guide','guide-f') NOT NULL COMMENT 'الصفة',
  `kind` ENUM('quran','hadith','adhkar','khatma') NOT NULL COMMENT 'quran «تحفيظ القرآن»، hadith «تحفيظ الحديث»، adhkar «حفظ أدعية الحج والعمرة»، khatma «ختمة جماعية»',
  `title` VARCHAR(160) NOT NULL COMMENT 'العنوان («تحفيظ جزء عمّ»، «الأربعون النووية»…)',
  `goal` VARCHAR(300) NOT NULL COMMENT 'الهدف (نص مشتق من الوحدات)',
  `audience` ENUM('all','men','women') NOT NULL COMMENT 'الجمهور',
  `schedule` VARCHAR(160) NOT NULL COMMENT 'المواعيد',
  `place` VARCHAR(200) NOT NULL COMMENT 'المكان',
  `starts_on` DATE NOT NULL COMMENT 'تاريخ البدء',
  `closed_at` DATETIME(3) NULL COMMENT 'أُغلق',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='النشاطات الدينية — نشاط يتابعه الموجّه حاجاً حاجاً: تحفيظ القرآن (صفحات)، تحفيظ الحديث (الأربعون النووية)، حفظ أدعية الحج والعمرة، ختمة جماعية (أجزاء).';

CREATE TABLE `activity_groups` (
  `activity_id` BIGINT UNSIGNED NOT NULL COMMENT 'النشاط',
  `group_id` BIGINT UNSIGNED NOT NULL COMMENT 'المجموعة',
  PRIMARY KEY (`activity_id`, `group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مجموعات النشاط — المجموعات المشاركة.';

CREATE TABLE `activity_units` (
  `activity_id` BIGINT UNSIGNED NOT NULL COMMENT 'النشاط',
  `unit_key` VARCHAR(20) NOT NULL COMMENT 'الوحدة',
  `sort_order` SMALLINT NOT NULL COMMENT 'الترتيب',
  PRIMARY KEY (`activity_id`, `unit_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='وحدات النشاط — ما يُحفظ أو يُقرأ: صفحات القرآن p<n> (1–604)، الأحاديث h<n> (1–42)، الأدعية (safar، talbiya، masjid، tawaf، safa، arafah، takbir، zamzam، ziyarah، sabah)، الأجزاء j1..j30.';

CREATE TABLE `activity_participants` (
  `activity_id` BIGINT UNSIGNED NOT NULL COMMENT 'النشاط',
  `national_id` CHAR(11) NOT NULL COMMENT 'الحاج',
  `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الانضمام',
  `left_at` DATETIME(3) NULL COMMENT 'المغادرة',
  `joined_by_kind` ENUM('pilgrim','guide') NOT NULL COMMENT 'ضمّه الحاج من بوابته أو الموجّه',
  PRIMARY KEY (`activity_id`, `national_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='المشاركون في النشاط — من انضم ومن غادر.';

CREATE TABLE `activity_progress` (
  `activity_id` BIGINT UNSIGNED NOT NULL COMMENT 'النشاط',
  `national_id` CHAR(11) NOT NULL COMMENT 'الحاج',
  `unit_key` VARCHAR(20) NOT NULL COMMENT 'الوحدة',
  `grade` ENUM('excellent','vgood','good','review') NOT NULL COMMENT 'excellent «ممتاز»، vgood «جيد جداً»، good «جيد»، review «يحتاج مراجعة» (الختمة دائماً ممتاز)',
  `at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  PRIMARY KEY (`activity_id`, `national_id`, `unit_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='تقدّم كل حاج — كل وحدة أتمّها الحاج وتقديرها.';

CREATE TABLE `activity_sittings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `activity_id` BIGINT UNSIGNED NOT NULL COMMENT 'النشاط',
  `national_id` CHAR(11) NOT NULL COMMENT 'الحاج',
  `units` JSON NOT NULL COMMENT 'الوحدات المسمَّعة (وحدة واحدة على الأقل)',
  `grade` ENUM('excellent','vgood','good','review') NOT NULL COMMENT 'التقدير',
  `note` VARCHAR(500) NULL COMMENT 'ملاحظة',
  `by_account_id` BIGINT UNSIGNED NOT NULL COMMENT 'الموجّه',
  `at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='جلسات التسميع — جلسة تسميع: ما سمّعه الحاج وتقديره وملاحظة الموجّه.';

CREATE TABLE `rite_list_kinds` (
  `code` VARCHAR(20) NOT NULL COMMENT 'المفتاح: tarwiya، arafat، mina، madinah، rawdah',
  `label` VARCHAR(80) NOT NULL COMMENT 'الاسم: «التروية»، «عرفة»، «منى أيام التشريق»، «الذهاب إلى المدينة المنورة»، «حجز الروضة الشريفة»',
  `description` VARCHAR(300) NOT NULL COMMENT 'الشرح («من الفندق في مكة إلى مخيم المجموعة في منى، يوم الثامن.»…)',
  `when_label` VARCHAR(80) NOT NULL COMMENT 'الموعد («8 ذو الحجة — بعد صلاة الفجر»…)',
  `unit_label` VARCHAR(20) NOT NULL COMMENT 'الوحدة: «حافلة» أو «قائمة»',
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='أنواع القوائم — قوائم ما قبل كل منسك: حافلات أو قوائم الروضة.';

CREATE TABLE `rite_list_units` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `cluster_id` BIGINT UNSIGNED NOT NULL COMMENT 'التكتل',
  `kind_code` VARCHAR(20) NOT NULL COMMENT 'القائمة',
  `label` VARCHAR(80) NOT NULL COMMENT 'الاسم: «حافلة 1»، «الروضة الشريفة — الرجال/النساء»',
  `plate` VARCHAR(30) NULL COMMENT 'لوحة الحافلة (أو مكان الروضة)',
  `driver_name` VARCHAR(80) NULL COMMENT 'السائق',
  `driver_phone` VARCHAR(20) NULL COMMENT 'هاتفه',
  `when_label` VARCHAR(80) NOT NULL COMMENT 'الموعد',
  `seats` SMALLINT UNSIGNED NOT NULL COMMENT 'المقاعد (49 للحافلة)',
  `gender` ENUM('M','F') NULL COMMENT 'لقائمة الروضة: الرجال أو النساء',
  `is_planned` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'من خطة التكتل الأساسية (عدد الحافلات = سقف (الحجاج + 4 لكل مجموعة) ÷ 49)',
  `created_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من أضافها من فريق المواصلات',
  `removed_at` DATETIME(3) NULL COMMENT 'أُزيلت (يُنزل كل من عليها)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  PRIMARY KEY (`id`),
  CONSTRAINT `ck_rite_list_units_1` CHECK (seats > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الحافلات وقوائم الروضة — حافلة لكل 49 مقعداً من حجاج التكتل وفريقه، أو قائمتا الروضة (للرجال وللنساء). يضيفها فريق المواصلات ويزيلها.';

CREATE TABLE `rite_list_seats` (
  `unit_id` BIGINT UNSIGNED NOT NULL COMMENT 'الحافلة أو القائمة',
  `cluster_id` BIGINT UNSIGNED NOT NULL COMMENT 'التكتل (مكرر لفرض الفرادة)',
  `kind_code` VARCHAR(20) NOT NULL COMMENT 'القائمة (مكررة لفرض الفرادة)',
  `national_id` CHAR(11) NOT NULL COMMENT 'الراكب (حاج أو إداري)',
  `seated_by_account_id` BIGINT UNSIGNED NOT NULL COMMENT 'المنسق الذي وزّعه',
  `seated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  PRIMARY KEY (`cluster_id`, `kind_code`, `national_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='من على كل حافلة أو قائمة — يوزّع المنسق التقني حجاج مجموعاته (والإداريين) على الحافلات وقوائم الروضة.';

CREATE TABLE `bus_requests` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `cluster_id` BIGINT UNSIGNED NOT NULL COMMENT 'التكتل',
  `kind_code` VARCHAR(20) NOT NULL COMMENT 'القائمة',
  `people_count` SMALLINT UNSIGNED NOT NULL COMMENT 'عدد من بلا مقعد',
  `note` VARCHAR(500) NULL COMMENT 'ملاحظة',
  `requested_by_account_id` BIGINT UNSIGNED NOT NULL COMMENT 'المنسق',
  `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  `status` ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending' COMMENT 'pending «عند فريق المواصلات»، approved «أُسندت …»، rejected «رُفض: …»',
  `decided_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من قرر (صلاحية transport)',
  `decided_at` DATETIME(3) NULL COMMENT 'الوقت',
  `reason` VARCHAR(300) NULL COMMENT 'سبب الرفض (إلزامي عند الرفض)',
  `unit_id` BIGINT UNSIGNED NULL COMMENT 'الحافلة المنشأة عند الاعتماد',
  PRIMARY KEY (`id`),
  CONSTRAINT `ck_bus_requests_1` CHECK (people_count > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='طلبات الحافلات الإضافية — يطلب المنسق حافلة إضافية حين يبقى حجاج بلا مقعد، فيعتمدها فريق المواصلات (فتُنشأ «حافلة N» بـ49 مقعداً) أو يرفضها بسبب.';

-- ───────────────────────────────────────────────────────────────
-- التقييم بعد الموسم والتصنيف ولوحة الشرف
-- ───────────────────────────────────────────────────────────────

CREATE TABLE `self_evaluations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `admin_season_file_id` BIGINT UNSIGNED NOT NULL COMMENT 'الملف الموسمي',
  `self_role` ENUM('group-head','cluster-head','guide-m','guide-f') NOT NULL COMMENT 'صفة التقييم: «رئيس مجموعة»، «رئيس تكتل»، «موجّه ديني»، «موجّهة دينية» (المنسقون والمعاونون بلا تقييم ذاتي)',
  `saved_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'آخر حفظ',
  `submitted_at` DATETIME(3) NULL COMMENT 'الإرسال (لا تعديل بعده)',
  `note` VARCHAR(1000) NULL COMMENT 'ملاحظة',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_self_evaluations_admin_season_file_id` (`admin_season_file_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='التقييم الذاتي — تقييم الإداري لنفسه: قسم لكل مرحلة من مراحل التقييم بأسئلتها بحسب صفته (ثلاثة أسئلة لكل مرحلة)، ثم «خلاصة موسمك» كتابة. يُحفظ أولاً بأول ويُرسل مرة واحدة. متوسط كل مرحلة محسوب من بنودها.';

CREATE TABLE `self_evaluation_scores` (
  `self_evaluation_id` BIGINT UNSIGNED NOT NULL COMMENT 'التقييم',
  `stage_key` VARCHAR(40) NOT NULL COMMENT 'المرحلة (evaluation_stages.stage_key)',
  `item_no` TINYINT UNSIGNED NOT NULL COMMENT 'رقم السؤال في المرحلة (ثلاثة أسئلة لكل مرحلة لكل صفة)',
  `score` TINYINT UNSIGNED NOT NULL COMMENT '1–5',
  `note` VARCHAR(500) NULL COMMENT 'ملاحظة (إلزامية تحت 3)',
  PRIMARY KEY (`self_evaluation_id`, `stage_key`, `item_no`),
  CONSTRAINT `ck_self_evaluation_scores_1` CHECK (score BETWEEN 1 AND 5),
  CONSTRAINT `ck_self_evaluation_scores_2` CHECK (score >= 3 OR note IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='بنود التقييم الذاتي — درجة كل سؤال في كل مرحلة (البند <stage>:<n> في الكود).';

CREATE TABLE `self_evaluation_answers` (
  `self_evaluation_id` BIGINT UNSIGNED NOT NULL COMMENT 'التقييم',
  `question_key` ENUM('achieved','hardest','needs','suggest') NOT NULL COMMENT 'السؤال: ما أنجزته، أصعب ما واجهته، ما تحتاجه، اقتراحك',
  `answer` TEXT NOT NULL COMMENT 'الإجابة',
  PRIMARY KEY (`self_evaluation_id`, `question_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='خلاصة الموسم — الإجابات المكتوبة في «خلاصة موسمك».';

CREATE TABLE `staff_evaluations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `admin_season_file_id` BIGINT UNSIGNED NOT NULL COMMENT 'الملف الموسمي',
  `average` DECIMAL(2,1) NULL COMMENT 'المتوسط على المراحل الحالية (منزلة عشرية واحدة)',
  `evaluated_by_staff_id` BIGINT UNSIGNED NOT NULL COMMENT 'آخر من قيّم',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_staff_evaluations_admin_season_file_id` (`admin_season_file_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='تقييم مكتب إدارة الإداريين — تقييم الإدارة لكل إداري مؤهل، مرحلةً مرحلة، والمتوسط.';

CREATE TABLE `staff_evaluation_scores` (
  `staff_evaluation_id` BIGINT UNSIGNED NOT NULL COMMENT 'التقييم',
  `stage_key` VARCHAR(40) NOT NULL COMMENT 'المرحلة',
  `score` TINYINT UNSIGNED NOT NULL COMMENT '1–5',
  `note` VARCHAR(500) NULL COMMENT 'ملاحظة (إلزامية تحت 3)',
  `evidence_file_id` BIGINT UNSIGNED NULL COMMENT 'دليل (الكود يضع اسماً وهمياً)',
  PRIMARY KEY (`staff_evaluation_id`, `stage_key`),
  CONSTRAINT `ck_staff_evaluation_scores_1` CHECK (score BETWEEN 1 AND 5),
  CONSTRAINT `ck_staff_evaluation_scores_2` CHECK (score >= 3 OR note IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='درجات تقييم الإدارة — درجة كل مرحلة ودليلها.';

CREATE TABLE `peer_evaluations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `target_kind` ENUM('cluster','group','admin') NOT NULL COMMENT 'المقيَّم: cluster «التكتل»، group «مجموعاته»، admin «إداريوه»',
  `cluster_id` BIGINT UNSIGNED NULL COMMENT 'التكتل المقيَّم',
  `group_id` BIGINT UNSIGNED NULL COMMENT 'المجموعة المقيَّمة',
  `admin_season_file_id` BIGINT UNSIGNED NULL COMMENT 'الإداري المقيَّم',
  `evaluator_staff_id` BIGINT UNSIGNED NOT NULL COMMENT 'الموظف المقيِّم',
  `evaluator_role` VARCHAR(120) NOT NULL COMMENT 'مسماه وقت التقييم',
  `place_label` VARCHAR(160) NULL COMMENT 'البرج أو المخيم الذي رابط فيه',
  `note` VARCHAR(1000) NULL COMMENT 'ملاحظة عامة',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`),
  CONSTRAINT `ck_peer_evaluations_1` CHECK (target_kind <> 'cluster' OR cluster_id IS NOT NULL),
  CONSTRAINT `ck_peer_evaluations_2` CHECK (target_kind <> 'group' OR group_id IS NOT NULL),
  CONSTRAINT `ck_peer_evaluations_3` CHECK (target_kind <> 'admin' OR admin_season_file_id IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='تقييم موظفي الأبراج والمخيمات — يقيّم الموظف المرابط في برج أو مخيم سكنه تكتلٌ معتمد: التكتل، وكل مجموعة فيه، وكل إداري. يمكن تعديله ما دامت النافذة مفتوحة.';

CREATE TABLE `peer_evaluation_scores` (
  `peer_evaluation_id` BIGINT UNSIGNED NOT NULL COMMENT 'التقييم',
  `stage_key` VARCHAR(40) NOT NULL COMMENT 'المرحلة',
  `score` TINYINT UNSIGNED NOT NULL COMMENT '1–5',
  `note` VARCHAR(500) NULL COMMENT 'ملاحظة (إلزامية تحت 3)',
  PRIMARY KEY (`peer_evaluation_id`, `stage_key`),
  CONSTRAINT `ck_peer_evaluation_scores_1` CHECK (score BETWEEN 1 AND 5),
  CONSTRAINT `ck_peer_evaluation_scores_2` CHECK (score >= 3 OR note IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='درجات تقييم الموظفين — درجة كل مرحلة.';

CREATE TABLE `evaluation_objections` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `admin_season_file_id` BIGINT UNSIGNED NOT NULL COMMENT 'الملف الموسمي',
  `stage_keys` JSON NOT NULL COMMENT 'المراحل المعترض عليها (مما قيّمه الموظفون)',
  `reason` TEXT NOT NULL COMMENT 'السبب (10 أحرف على الأقل)',
  `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  `status` ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending' COMMENT 'pending «عند إدارة الإداريين»، accepted «قُبل — يُعاد التقييم»، rejected «رُفض»',
  `reply` VARCHAR(1000) NULL COMMENT 'رد الإدارة (5 أحرف على الأقل)',
  `decided_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من قرر',
  `decided_at` DATETIME(3) NULL COMMENT 'الوقت',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_evaluation_objections_admin_season_file_id` (`admin_season_file_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الاعتراض على التقييم — اعتراض الإداري على تقييم الموظفين له في مراحل بعينها، وقرار الإدارة. اعتراض واحد لكل إداري في الموسم.';

CREATE TABLE `grading_publications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `published_by_staff_id` BIGINT UNSIGNED NOT NULL COMMENT 'من نشر',
  `published_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  `weights` JSON NOT NULL COMMENT 'أوزان مكونات الدرجة وقت النشر: تقييم الحجاج 0.4، تقييم الموظفين 0.25، الالتزام بالمراحل التسع 0.25، البلاغات والمخالفات 0.1',
  `is_current` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'النشر الساري',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='نشر التصنيف — نشر نتائج تصنيف المجموعات والتكتلات آخر الموسم. إعادة النشر صف جديد.';

CREATE TABLE `grading_results` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `publication_id` BIGINT UNSIGNED NOT NULL COMMENT 'النشر',
  `scope` ENUM('group','cluster') NOT NULL COMMENT 'مجموعة أو تكتل',
  `group_id` BIGINT UNSIGNED NULL COMMENT 'المجموعة',
  `cluster_id` BIGINT UNSIGNED NULL COMMENT 'التكتل',
  `tier_label` VARCHAR(60) NOT NULL COMMENT 'الفئة التي رُتّب فيها',
  `score` DECIMAL(5,2) NOT NULL COMMENT 'الدرجة 0–100',
  `parts` JSON NOT NULL COMMENT 'مكونات الدرجة [{label, weight, value}]',
  `rank_in_tier` SMALLINT UNSIGNED NOT NULL COMMENT 'الترتيب',
  `outcome` ENUM('promote','ceiling','hold','demote','warned') NOT NULL COMMENT 'promote «ترقية فئة»، ceiling «يبقى في الفئة العليا»، hold «يبقى في فئته»، demote «تخفيض فئة»، warned «إنذار — لا فئة أدنى»',
  `honored` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'من المكرَّمين',
  PRIMARY KEY (`id`),
  CONSTRAINT `ck_grading_results_1` CHECK ((scope = 'group') = (group_id IS NOT NULL)),
  CONSTRAINT `ck_grading_results_2` CHECK ((scope = 'cluster') = (cluster_id IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='نتائج التصنيف — ترتيب كل مجموعة وتكتل داخل فئته ومآله.';

CREATE TABLE `honours_awards` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `award_key` ENUM('tech','guide','guide-f','deputy','head','cluster') NOT NULL COMMENT 'الجائزة: tech «أفضل منسق تقني»، guide «أفضل موجّه ديني»، guide-f «أفضل موجّهة دينية»، deputy «أفضل معاون»، head رؤساء المجموعات المكرَّمون، cluster التكتلات',
  `rank_no` TINYINT UNSIGNED NOT NULL COMMENT 'المرتبة',
  `account_id` BIGINT UNSIGNED NULL COMMENT 'الإداري',
  `cluster_id` BIGINT UNSIGNED NULL COMMENT 'التكتل (لجوائز التكتلات)',
  `rating` DECIMAL(2,1) NOT NULL COMMENT 'التقييم',
  `seasons_served` TINYINT UNSIGNED NULL COMMENT 'مواسم الخدمة (للترجيح)',
  `publication_id` BIGINT UNSIGNED NULL COMMENT 'النشر الذي ثبّتها',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_honours_awards_season_year_award_key_rank_no` (`season_year`, `award_key`, `rank_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='لوحة الشرف — جوائز الموسم ونجومه: أفضل منسق تقني، أفضل موجّه ديني، أفضل موجّهة دينية، أفضل معاون — الثلاثة الأوائل بالتقييم ثم المواسم. الكود يحسبها عند العرض (app/honours)؛ هنا تُحفظ عند النشر.';

-- ───────────────────────────────────────────────────────────────
-- الطيران: المطارات والرحلات وأيام التكتلات والمقاعد والكشوف
-- ───────────────────────────────────────────────────────────────

CREATE TABLE `airports` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `iata_code` CHAR(3) NOT NULL COMMENT 'رمز IATA (يُكتب بأحرف كبيرة): DAM، ALP، LTK، IST، GZT، CAI، JED، MED، AMM',
  `name` VARCHAR(120) NOT NULL COMMENT 'الاسم: «مطار دمشق الدولي»، «مطار الملك عبد العزيز — صالة الحجاج»…',
  `city` VARCHAR(60) NOT NULL COMMENT 'المدينة',
  `country` VARCHAR(40) NOT NULL COMMENT 'الدولة. «السعودية» تعني مطار الحرمين',
  `serves_city` VARCHAR(60) NULL COMMENT 'للمطار السعودي: المدينة التي يخدمها (جدة ← مكة المكرمة)',
  `arrivals_only` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '«تهبط فيه رحلات العودة فقط، ولا يقلع منه ذهاب» (اللاذقية)',
  `home_yard` VARCHAR(120) NULL COMMENT 'ساحة الوصول للحافلات بعد العودة: «ساحة المزة»، «ساحة الجامعة في حلب»، «ساحة اليمن في اللاذقية»',
  `archived` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'مؤرشف (لا يُؤرشف مطار تستعمله رحلة)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_airports_iata_code` (`iata_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='المطارات — مطارات المغادرة في البلد ومطارات الوصول في السعودية.';

CREATE TABLE `airport_return_targets` (
  `airport_id` BIGINT UNSIGNED NOT NULL COMMENT 'مطار المغادرة',
  `return_airport_id` BIGINT UNSIGNED NOT NULL COMMENT 'مطار العودة المسموح',
  PRIMARY KEY (`airport_id`, `return_airport_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مطارات العودة المسموحة — من يقلع من مطار يعود إلى أحد هذه المطارات (الافتراضي المطار نفسه).';

CREATE TABLE `airport_representatives` (
  `airport_id` BIGINT UNSIGNED NOT NULL COMMENT 'المطار',
  `staff_user_id` BIGINT UNSIGNED NOT NULL COMMENT 'المندوب',
  `assigned_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من أسنده',
  `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  PRIMARY KEY (`airport_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مندوبو المطارات — موظف يسجّل إقلاع رحلات مطاره وهبوطها من «رحلات مطاري». مندوب واحد لكل مطار، وقد يمثل الموظف أكثر من مطار.';

CREATE TABLE `carriers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `code` VARCHAR(4) NOT NULL COMMENT 'الرمز: RB، SV، XY',
  `name` VARCHAR(80) NOT NULL COMMENT 'الاسم: «السورية للطيران»، «الخطوط السعودية»، «طيران ناس»',
  `coordination_phone` VARCHAR(30) NULL COMMENT 'هاتف التنسيق',
  `archived` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'مؤرشف (لا يُؤرشف ناقل تستعمله رحلة)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_carriers_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الناقلون — شركات الطيران.';

CREATE TABLE `flights` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `direction` ENUM('outbound','return') NOT NULL COMMENT 'outbound «ذهاب» (من مطار البلد إلى جدة أو المدينة)، return «عودة» (منهما إلى مطار البلد). لا يتغير بعد الإنشاء',
  `audience` ENUM('pilgrims','staff') NOT NULL COMMENT 'pilgrims «رحلة حجاج»، staff «رحلة موظفين» (لا يركبها إلا الموظفون)',
  `flight_no` VARCHAR(12) NOT NULL COMMENT 'رقم الرحلة («RB 501»)',
  `carrier_id` BIGINT UNSIGNED NOT NULL COMMENT 'الناقل',
  `from_airport_id` BIGINT UNSIGNED NOT NULL COMMENT 'من',
  `to_airport_id` BIGINT UNSIGNED NOT NULL COMMENT 'إلى (مختلف عن المغادرة)',
  `depart_at` DATETIME(3) NOT NULL COMMENT 'المغادرة',
  `arrive_at` DATETIME(3) NOT NULL COMMENT 'الوصول (بعد المغادرة)',
  `capacity` SMALLINT UNSIGNED NOT NULL COMMENT 'مقاعد الطائرة (الافتراضي 300 للحجاج و40 للموظفين)',
  `staff_reserve` SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'مقاعد محجوزة للموظفين المرافقين في رحلة الحجاج (أقل من السعة؛ صفر لرحلة الموظفين). النموذج يقترح 8 لرحلة الحجاج',
  `status` ENUM('draft','published','full','locked','departed','arrived','postponed','cancelled') NOT NULL DEFAULT 'draft' COMMENT 'draft «مسودة»، published «منشورة»، full «مكتملة» (تلقائياً حين تنفد المقاعد)، locked «مقفلة» (صدر كشفها)، departed «أقلعت»، arrived «وصلت»، postponed «مؤجلة»، cancelled «ملغاة»',
  `paired_flight_id` BIGINT UNSIGNED NULL COMMENT 'النصف الآخر لرحلة «ذهاب وعودة» (اقتراح لا قيد)',
  `diverted_to_airport_id` BIGINT UNSIGNED NULL COMMENT 'المطار الذي هبطت فيه بعد تحويلها',
  `gate` VARCHAR(40) NULL COMMENT 'البوابة («البوابة 3»، «صالة الحجاج»)',
  `gathering` VARCHAR(200) NULL COMMENT 'مكان التجمّع وموعده («ساحة المزة — الحافلات 01:30»)',
  `notes` VARCHAR(500) NULL COMMENT 'ملاحظات للمسؤول وغرفة العمليات',
  `published_at` DATETIME(3) NULL COMMENT 'النشر',
  `locked_at` DATETIME(3) NULL COMMENT 'الإقفال',
  `departed_at` DATETIME(3) NULL COMMENT 'الإقلاع الفعلي',
  `arrived_at` DATETIME(3) NULL COMMENT 'الهبوط الفعلي',
  `postponed_at` DATETIME(3) NULL COMMENT 'التأجيل',
  `postpone_reason` VARCHAR(300) NULL COMMENT 'سبب التأجيل («ظروف طارئة»)',
  `status_before_postpone` VARCHAR(20) NULL COMMENT 'الحالة التي تعود إليها عند تحديد الموعد الجديد',
  `cancelled_at` DATETIME(3) NULL COMMENT 'الإلغاء',
  `cancel_reason` VARCHAR(300) NULL COMMENT 'سبب الإلغاء («إلغاء من الناقل»)',
  `created_by_staff_id` BIGINT UNSIGNED NOT NULL COMMENT 'من أنشأها',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`),
  KEY `ix_flights_season_year_direction_depart_at` (`season_year`, `direction`, `depart_at`),
  CONSTRAINT `ck_flights_1` CHECK (capacity >= 1),
  CONSTRAINT `ck_flights_2` CHECK (arrive_at > depart_at),
  CONSTRAINT `ck_flights_3` CHECK (from_airport_id <> to_airport_id),
  CONSTRAINT `ck_flights_4` CHECK (audience = 'pilgrims' OR staff_reserve = 0),
  CONSTRAINT `ck_flights_5` CHECK (staff_reserve < capacity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الرحلات — رحلة ذهاب أو عودة، للحجاج أو للموظفين.';

CREATE TABLE `flight_ground_legs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `flight_id` BIGINT UNSIGNED NOT NULL COMMENT 'الرحلة',
  `from_city` VARCHAR(60) NOT NULL COMMENT 'من مدينة',
  `to_city` VARCHAR(60) NOT NULL COMMENT 'إلى مدينة',
  `buses` SMALLINT UNSIGNED NOT NULL COMMENT 'عدد الحافلات',
  `note` VARCHAR(300) NULL COMMENT 'ملاحظة',
  `depart_at` DATETIME(3) NOT NULL COMMENT 'الانطلاق (افتراضياً بعد ساعتين من الوصول)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='النقل البري بعد التحويل — حين تُحوَّل رحلة إلى مطار آخر تنقل حافلات التكتل الركاب برّاً (35–40 راكباً للحافلة)، ويُفتح بلاغ نقل حرج.';

CREATE TABLE `cluster_flight_allotments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `cluster_id` BIGINT UNSIGNED NOT NULL COMMENT 'التكتل',
  `flight_id` BIGINT UNSIGNED NOT NULL COMMENT 'الرحلة',
  `seats` SMALLINT UNSIGNED NULL COMMENT 'المقاعد؛ NULL = الرحلة كلها',
  `allotted_by_staff_id` BIGINT UNSIGNED NOT NULL COMMENT 'من أعطاها',
  `allotted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cluster_flight_allotments_cluster_id_flight_id` (`cluster_id`, `flight_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='أيام التكتلات — رحلة أُعطيت لتكتل: كاملة، أو بعدد مقاعد إن تشاركها أكثر من تكتل.';

CREATE TABLE `group_flight_legs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `flight_id` BIGINT UNSIGNED NOT NULL COMMENT 'الرحلة',
  `group_id` BIGINT UNSIGNED NOT NULL COMMENT 'المجموعة',
  `direction` ENUM('outbound','return') NOT NULL COMMENT 'الاتجاه (من الرحلة، مكرر لفرض «رجل نشطة واحدة لكل مجموعة واتجاه»)',
  `placed_by_account_id` BIGINT UNSIGNED NULL COMMENT 'المنسق التقني الذي وضعها',
  `placed_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'أو مسؤول الطيران',
  `placed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  `active_marker` TINYINT(1) NULL DEFAULT 1 COMMENT '1 للنشطة، NULL بعد إنهائها',
  `ended_at` DATETIME(3) NULL COMMENT 'أُنهيت',
  `end_reason` VARCHAR(300) NULL COMMENT 'السبب: «إزالة من رئيس التكتل»، «إزالة من مسؤول الطيران»، «إلغاء الرحلة: …»',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_group_flight_legs_group_id_direction_active_marker` (`group_id`, `direction`, `active_marker`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='المجموعات على الرحلات — وضع مجموعة كاملة على رحلة في اتجاه. العائلات التي تلتحق بالمجموعة بعدها تُوضع على رحلتها تلقائياً.';

CREATE TABLE `flight_assignments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `flight_id` BIGINT UNSIGNED NOT NULL COMMENT 'الرحلة',
  `direction` ENUM('outbound','return') NOT NULL COMMENT 'الاتجاه (مكرر من الرحلة لفرض «مقعد نشط واحد للمسافر في كل اتجاه»)',
  `traveler_kind` ENUM('pilgrim','administrator','employee') NOT NULL COMMENT 'pilgrim «حاج»، administrator «إداري» (يرافق مجموعته في مقاعد الحجاج)، employee «موظف»',
  `national_id` CHAR(11) NULL COMMENT 'الحاج أو الإداري',
  `employee_id` BIGINT UNSIGNED NULL COMMENT 'الموظف',
  `application_id` BIGINT UNSIGNED NULL COMMENT 'عائلة الحاج',
  `group_id` BIGINT UNSIGNED NULL COMMENT 'المجموعة وقت الإسناد',
  `cluster_id` BIGINT UNSIGNED NULL COMMENT 'التكتل وقت الإسناد',
  `traveler_name` VARCHAR(160) NOT NULL COMMENT 'الاسم وقت الإسناد (لقطة للكشف)',
  `gender` ENUM('M','F') NULL COMMENT 'الجنس',
  `age` TINYINT UNSIGNED NULL COMMENT 'العمر وقت الإسناد',
  `needs` JSON NULL COMMENT 'الاحتياجات: «مرافقة كبير سن»، «كرسي متحرك»، «سكري»…',
  `status` ENUM('assigned','locked','boarded','arrived','noShow','cancelled','moved') NOT NULL DEFAULT 'assigned' COMMENT 'assigned «مسند»، locked «مثبت»، boarded «صعد»، arrived «وصل»، noShow «تخلّف»، cancelled «ملغى»، moved «منقول»',
  `active_marker` TINYINT(1) NULL DEFAULT 1 COMMENT '1 للنشط (مسند/مثبت/صعد/وصل)، NULL لغيره',
  `seat_no` VARCHAR(6) NULL COMMENT 'رقم المقعد (لا يُسند في النسخة التجريبية)',
  `assigned_by_kind` ENUM('staff','account','system') NOT NULL COMMENT 'من أسنده: مسؤول الطيران، أو المنسق التقني، أو «المنصة» (مع مجموعته تلقائياً)',
  `assigned_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'الموظف',
  `assigned_by_account_id` BIGINT UNSIGNED NULL COMMENT 'المنسق',
  `assigned_by_role` VARCHAR(80) NOT NULL COMMENT 'الصفة المعروضة («المنسق التقني»، «مع مجموعته تلقائياً»)',
  `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  `moved_to_assignment_id` BIGINT UNSIGNED NULL COMMENT 'المقعد الجديد بعد النقل',
  `reason` VARCHAR(300) NULL COMMENT 'السبب (إلزامي لتعديل رحلة مقفلة)',
  `boarded_at` DATETIME(3) NULL COMMENT 'الصعود',
  `cancelled_at` DATETIME(3) NULL COMMENT 'الإلغاء',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_flight_assignments_national_id_direction_active_marker` (`national_id`, `direction`, `active_marker`),
  UNIQUE KEY `uq_flight_assignments_employee_id_direction_active_marker` (`employee_id`, `direction`, `active_marker`),
  KEY `ix_flight_assignments_flight_id_status` (`flight_id`, `status`),
  CONSTRAINT `ck_flight_assignments_1` CHECK ((traveler_kind = 'employee') = (employee_id IS NOT NULL)),
  CONSTRAINT `ck_flight_assignments_2` CHECK ((traveler_kind <> 'employee') = (national_id IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='المقاعد — مسافر على رحلة. لا يُحذف صف: النقل يترك الصف القديم بحالة «منقول».';

CREATE TABLE `other_means_travelers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `national_id` CHAR(11) NULL COMMENT 'الحاج أو الإداري',
  `employee_id` BIGINT UNSIGNED NULL COMMENT 'الموظف',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `reason` VARCHAR(300) NOT NULL COMMENT 'السبب («بقرار مسؤول الطيران»)',
  `decided_by_staff_id` BIGINT UNSIGNED NOT NULL COMMENT 'من قرر',
  `decided_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  PRIMARY KEY (`id`),
  CONSTRAINT `ck_other_means_travelers_1` CHECK (national_id IS NOT NULL OR employee_id IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='المسافرون بوسيلة أخرى — من قرر مسؤول الطيران أنه يسافر بغير رحلات البعثة، فيخرج من قوائم «بلا رحلة».';

CREATE TABLE `flight_manifests` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `flight_id` BIGINT UNSIGNED NOT NULL COMMENT 'الرحلة',
  `version_no` SMALLINT UNSIGNED NOT NULL COMMENT 'رقم الإصدار 1، 2…',
  `issued_by_staff_id` BIGINT UNSIGNED NOT NULL COMMENT 'من أصدره',
  `issued_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_flight_manifests_flight_id_version_no` (`flight_id`, `version_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='كشوف الركاب — كشف يصدر عند إقفال الرحلة، ويُعاد إصداره إذا تغيّر الإسناد بعده.';

CREATE TABLE `flight_manifest_rows` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `manifest_id` BIGINT UNSIGNED NOT NULL COMMENT 'الكشف',
  `assignment_id` BIGINT UNSIGNED NOT NULL COMMENT 'المقعد',
  `row_no` SMALLINT UNSIGNED NOT NULL COMMENT 'الترتيب',
  `traveler_name` VARCHAR(160) NOT NULL COMMENT 'الاسم',
  `traveler_ref` VARCHAR(20) NOT NULL COMMENT 'الرقم الوطني أو رقم الموظف',
  `traveler_kind` VARCHAR(20) NOT NULL COMMENT 'الصفة',
  `gender` CHAR(1) NULL COMMENT 'الجنس',
  `age` TINYINT UNSIGNED NULL COMMENT 'العمر',
  `cluster_name` VARCHAR(80) NULL COMMENT 'التكتل',
  `group_name` VARCHAR(80) NULL COMMENT 'المجموعة',
  `needs` VARCHAR(300) NULL COMMENT 'الاحتياجات',
  `seat_no` VARCHAR(6) NULL COMMENT 'المقعد',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='صفوف الكشف — لقطة من المقاعد النشطة وقت الإصدار، مرتبة بالتكتل فالمجموعة فالعائلة.';

CREATE TABLE `flight_manifest_exports` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `manifest_id` BIGINT UNSIGNED NOT NULL COMMENT 'الكشف',
  `target` ENUM('masar','carrier') NOT NULL COMMENT 'masar «نسك مسار»، carrier «الناقل»',
  `exported_by_staff_id` BIGINT UNSIGNED NOT NULL COMMENT 'من صدّره',
  `exported_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='تصدير الكشوف — كل تنزيل لملف الكشف إلى «نسك مسار» أو إلى الناقل.';

-- ───────────────────────────────────────────────────────────────
-- الموظفون والصلاحيات والملفات التشغيلية
-- ───────────────────────────────────────────────────────────────

CREATE TABLE `permissions` (
  `code` VARCHAR(40) NOT NULL COMMENT 'المفتاح',
  `label` VARCHAR(120) NOT NULL COMMENT 'الاسم: systems.assign «منح صلاحيات الإدارة ومتابعتها»، staff.manage «إدارة الموظفين»، registration.manage «إدارة التسجيل على الحج»، admins.manage «إدارة الإداريين»، exams.manage «إدارة الامتحانات»، flights.manage «إدارة الطيران»، pilgrims.register «التسجيل على الحج»، registration.review «مراجعة الطلبات والوثائق»، season.settings «إعدادات الموسم»، lottery.import «إدخال نتائج القرعة»، lottery.approve «اعتماد ونشر النتائج»، operations.room «غرفة العمليات»، audit.read «سجل الأحداث»، content.manage «إدارة محتوى الموقع»، medical «الفريق الطبي»، transport «المواصلات»، ops.files «الملفات التشغيلية والبيانات المرجعية»',
  `kind` ENUM('task','management') NOT NULL COMMENT 'task صلاحية مهمة ثابتة؛ management إدارة ملف تُمنح عبر system_grants',
  `sort_order` TINYINT NOT NULL DEFAULT 0 COMMENT 'الترتيب',
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الصلاحيات — صلاحيات الموظفين: مهام ثابتة لكل حساب، وإدارة ملفات تُمنح وتُسحب.';

CREATE TABLE `staff_users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `username` VARCHAR(40) NOT NULL COMMENT 'اسم الدخول (أحرف صغيرة)',
  `national_id` CHAR(11) NULL COMMENT 'الرقم الوطني للموظف',
  `name` VARCHAR(120) NOT NULL COMMENT 'الاسم المعروض (يظهر فاعلاً في سجل الأحداث)',
  `title` VARCHAR(160) NOT NULL COMMENT 'المسمى في البوابة («مديرة الموسم»، «مسؤول الطيران»، «مشرفة قاعة امتحانية — مركز دمشق»)',
  `initials` VARCHAR(4) NOT NULL COMMENT 'حرف الصورة الرمزية',
  `travels` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'مسافر مع البعثة («مسافر مع البعثة»)',
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'بصمة كلمة المرور',
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'كلمة مؤقتة تُغيَّر عند أول دخول',
  `status` ENUM('active','disabled') NOT NULL DEFAULT 'active' COMMENT 'الحالة',
  `last_login_at` DATETIME(3) NULL COMMENT 'آخر دخول',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_staff_users_username` (`username`),
  UNIQUE KEY `uq_staff_users_national_id` (`national_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='حسابات الموظفين — حساب الدخول إلى بوابة الموظفين. ينشئه قسم الموارد البشرية من الرقم الوطني والهاتف، وتُرسل كلمة مرور مؤقتة تُغيَّر عند أول دخول.';

CREATE TABLE `staff_user_permissions` (
  `staff_user_id` BIGINT UNSIGNED NOT NULL COMMENT 'الحساب',
  `permission_code` VARCHAR(40) NOT NULL COMMENT 'الصلاحية',
  PRIMARY KEY (`staff_user_id`, `permission_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='صلاحيات المهام للحساب — صلاحيات المهام الثابتة لكل حساب. مديرة الموسم تحمل كل صلاحيات المهام.';

CREATE TABLE `management_systems` (
  `code` VARCHAR(20) NOT NULL COMMENT 'المفتاح: staff، registration، admins، exams، flights (الترتيب يحدد القائمة وصفحة الدخول)',
  `label` VARCHAR(80) NOT NULL COMMENT 'الاسم: «إدارة الموظفين»، «إدارة التسجيل على الحج»، «إدارة الإداريين»، «إدارة الامتحانات»، «إدارة الطيران»',
  `permission_code` VARCHAR(40) NOT NULL COMMENT 'صلاحية الإدارة المقابلة',
  `description` TEXT NOT NULL COMMENT 'الشرح',
  `summary_href` VARCHAR(120) NOT NULL COMMENT 'رابط «لوحة التحكم»',
  `manage_href` VARCHAR(120) NOT NULL COMMENT 'رابط الإدارة',
  `opened_at` DATETIME(3) NULL COMMENT 'متى فُتح الملف في الموسم',
  `sort_order` TINYINT NOT NULL DEFAULT 0 COMMENT 'الترتيب',
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ملفات الإدارة — الملفات الخمسة، لكل ملف لوحة تحكم وعمليات في القائمة الجانبية.';

CREATE TABLE `management_system_operations` (
  `system_code` VARCHAR(20) NOT NULL COMMENT 'الملف',
  `area` VARCHAR(30) NOT NULL COMMENT 'المنطقة: register، add، accounts، season (الموظفون)؛ stages، add، steps، rules، payments، applications، seasons (التسجيل)؛ rules، reference، references، cadre، applicants، groups، clusters، directory، letters، evaluation، grading (الإداريون)؛ centers، exams، bank، people، sittings، live، review، results، oral، stats (الامتحانات)؛ refs، carriers، flights، allotments، dispatch (الطيران)',
  `label` VARCHAR(80) NOT NULL COMMENT 'الاسم المعروض',
  `href` VARCHAR(160) NOT NULL COMMENT 'الرابط',
  `description` VARCHAR(300) NULL COMMENT 'الشرح',
  `sort_order` TINYINT NOT NULL DEFAULT 0 COMMENT 'الترتيب',
  PRIMARY KEY (`system_code`, `area`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='عمليات كل ملف — التبويبات في القائمة الجانبية لكل ملف (المنطقة area تُكتب في سجل الأحداث).';

CREATE TABLE `system_grants` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `system_code` VARCHAR(20) NOT NULL COMMENT 'الملف',
  `staff_user_id` BIGINT UNSIGNED NOT NULL COMMENT 'الموظف الممنوح',
  `granted_by_staff_id` BIGINT UNSIGNED NOT NULL COMMENT 'من منح',
  `granted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  `revoked_at` DATETIME(3) NULL COMMENT 'سُحبت',
  `revoked_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من سحب',
  PRIMARY KEY (`id`),
  KEY `ix_system_grants_system_code_staff_user_id` (`system_code`, `staff_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='منح صلاحيات إدارة الملفات — من يدير كل ملف. تمنحها وتسحبها مديرة الموسم (صلاحية systems.assign)، وكل منح وسحب حدث مهم.';

CREATE TABLE `system_seen` (
  `staff_user_id` BIGINT UNSIGNED NOT NULL COMMENT 'الموظف',
  `system_code` VARCHAR(20) NOT NULL COMMENT 'الملف',
  `seen_at` DATETIME(3) NOT NULL COMMENT 'الوقت',
  PRIMARY KEY (`staff_user_id`, `system_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='آخر اطلاع على أحداث الملفات — متى اطلعت المديرة آخر مرة على الأحداث المهمة لكل ملف (لعدّ الجديد منها).';

CREATE TABLE `escalations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `system_code` VARCHAR(20) NOT NULL COMMENT 'الملف',
  `raised_by_staff_id` BIGINT UNSIGNED NOT NULL COMMENT 'من رفعه',
  `text` TEXT NOT NULL COMMENT 'النص (5 أحرف على الأقل)',
  `raised_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  `reply` TEXT NULL COMMENT 'رد المديرة',
  `resolved_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من أغلقه',
  `resolved_at` DATETIME(3) NULL COMMENT 'الإغلاق',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='رفع أمر إلى المدير — طلب يرفعه صاحب ملف إدارة إلى مديرة الموسم. الكود يحفظه حدثاً في السجل فقط بلا رد.';

CREATE TABLE `job_titles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `title` VARCHAR(80) NOT NULL COMMENT 'المسمى: مدير إدارة، مدير مكتب، رئيس قسم، مساعد إداري، أمين سر، محاسب، … طبيب، ممرض، صيدلاني، مرشد ديني، مسؤول أمن وسلامة',
  `sort_order` TINYINT NOT NULL DEFAULT 0 COMMENT 'الترتيب',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_job_titles_title` (`title`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='المسميات الوظيفية — المسميات في سجل الموظفين (30 مسمى).';

CREATE TABLE `employees` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `employee_no` VARCHAR(12) NOT NULL COMMENT 'رقم الموظف E-001…',
  `national_id` CHAR(11) NOT NULL COMMENT 'الرقم الوطني (11 رقماً، فريد بين الموظفين)',
  `first_name` VARCHAR(60) NOT NULL COMMENT 'الاسم',
  `father_name` VARCHAR(60) NOT NULL COMMENT 'اسم الأب',
  `surname` VARCHAR(60) NOT NULL COMMENT 'الكنية',
  `gender` ENUM('male','female') NOT NULL COMMENT 'ذكر / أنثى',
  `birth_year` SMALLINT UNSIGNED NOT NULL COMMENT 'سنة الميلاد (1950–2005)',
  `governorate_code` VARCHAR(20) NOT NULL COMMENT 'المحافظة',
  `job_title_id` BIGINT UNSIGNED NOT NULL COMMENT 'المسمى الوظيفي',
  `mission` ENUM('administrative','religious','medical','media') NOT NULL COMMENT 'البعثة: «البعثة الإدارية»، «البعثة الدينية»، «البعثة الصحية»، «البعثة الإعلامية»',
  `kind` ENUM('permanent','external') NOT NULL DEFAULT 'permanent' COMMENT 'permanent «موظف دائم في الإدارة»، external «منتدب من جهة أخرى»',
  `organization` VARCHAR(120) NULL COMMENT 'الجهة المنتدِبة (إلزامية للمنتدب): وزارة الأوقاف، وزارة الصحة، الهلال الأحمر العربي السوري…',
  `phone_sy` VARCHAR(20) NOT NULL COMMENT 'هاتف سوريا (10 أرقام على الأقل)',
  `phone_sa` VARCHAR(20) NULL COMMENT 'هاتف السعودية بعد الوصول',
  `email` VARCHAR(160) NULL COMMENT 'البريد',
  `staff_user_id` BIGINT UNSIGNED NULL COMMENT 'حساب البوابة المرتبط (فريد)',
  `suspended` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'موقوف',
  `notes` TEXT NULL COMMENT 'ملاحظات',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_employees_employee_no` (`employee_no`),
  UNIQUE KEY `uq_employees_national_id` (`national_id`),
  UNIQUE KEY `uq_employees_staff_user_id` (`staff_user_id`),
  CONSTRAINT `ck_employees_1` CHECK (kind = 'permanent' OR organization IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='سجل الموظفين — موظفو البعثة: دائمون في الإدارة أو منتدبون من جهات أخرى.';

CREATE TABLE `employee_seasons` (
  `employee_id` BIGINT UNSIGNED NOT NULL COMMENT 'الموظف',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  PRIMARY KEY (`employee_id`, `season_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مواسم مشاركة الموظف — المواسم التي شارك فيها الموظف.';

CREATE TABLE `employee_languages` (
  `employee_id` BIGINT UNSIGNED NOT NULL COMMENT 'الموظف',
  `language_id` BIGINT UNSIGNED NOT NULL COMMENT 'اللغة',
  PRIMARY KEY (`employee_id`, `language_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='لغات الموظف — اللغات (العربية افتراضياً).';

CREATE TABLE `hotels` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `place_key` VARCHAR(160) NOT NULL COMMENT 'مفتاح ثابت عبر المواسم hotel:<المدينة>:<الاسم> لنقل البيانات من موسم إلى آخر',
  `name` VARCHAR(120) NOT NULL COMMENT 'الاسم («فندق أبراج النور»)',
  `city` ENUM('makkah','madinah') NOT NULL COMMENT '«مكة المكرمة» / «المدينة المنورة»',
  `area` VARCHAR(80) NOT NULL COMMENT 'الحي («العزيزية الشمالية»)',
  `distance` VARCHAR(30) NOT NULL COMMENT 'المسافة كما في العقد («3.4 كم»، «450 م»)',
  `capacity` SMALLINT UNSIGNED NOT NULL COMMENT 'الأسرّة المتعاقد عليها',
  `licence_no` VARCHAR(20) NOT NULL COMMENT 'رقم الترخيص',
  `floors` TINYINT UNSIGNED NULL COMMENT 'الطوابق',
  `map_url` VARCHAR(300) NULL COMMENT 'رابط الخريطة',
  `archived` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'مؤرشف (لا يُؤرشف ما يستعمله ملف تشغيلي)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hotels_season_year_name` (`season_year`, `name`),
  CONSTRAINT `ck_hotels_1` CHECK (capacity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الفنادق — فنادق مكة والمدينة المتعاقد معها في الموسم.';

CREATE TABLE `sectors` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `place_key` VARCHAR(160) NOT NULL COMMENT 'مفتاح ثابت عبر المواسم',
  `name` VARCHAR(60) NOT NULL COMMENT 'الاسم («القطاع الأول» … «القطاع الخامس»)',
  `zone` VARCHAR(200) NOT NULL COMMENT 'الأحياء («العزيزية الشمالية والجنوبية»…)',
  `sort_order` TINYINT NOT NULL DEFAULT 0 COMMENT 'الترتيب',
  `archived` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'مؤرشف',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sectors_season_year_name` (`season_year`, `name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='قطاعات مكة — قطاعات التسكين في مكة.';

CREATE TABLE `mashaer_centers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `place_key` VARCHAR(160) NOT NULL COMMENT 'مفتاح ثابت عبر المواسم',
  `mashaer` ENUM('mina','arafat') NOT NULL COMMENT '«منى» / «عرفات»',
  `number` SMALLINT UNSIGNED NOT NULL COMMENT 'رقم المركز (الاسم «مركز <n>»)',
  `company` VARCHAR(120) NULL COMMENT 'شركة الخدمة (شركة ركب الحجيج، شركة ضيوف البيت، شركة أنوار المشاعر)',
  `archived` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'مؤرشف',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_mashaer_centers_season_year_mashaer_number` (`season_year`, `mashaer`, `number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مراكز منى وعرفات — مراكز الخدمة في المشاعر وشركاتها.';

CREATE TABLE `camps` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `place_key` VARCHAR(160) NOT NULL COMMENT 'مفتاح ثابت عبر المواسم',
  `mashaer` ENUM('mina','arafat') NOT NULL COMMENT 'منى أو عرفات',
  `number` VARCHAR(10) NOT NULL COMMENT 'رقم المخيم (الاسم «مخيم <n>»)',
  `capacity` SMALLINT UNSIGNED NOT NULL COMMENT 'السعة',
  `location` VARCHAR(200) NOT NULL COMMENT 'الموقع («منى — المعيصم، المربع 7»)',
  `map_url` VARCHAR(300) NULL COMMENT 'رابط الخريطة',
  `archived` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'مؤرشف',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_camps_season_year_mashaer_number` (`season_year`, `mashaer`, `number`),
  CONSTRAINT `ck_camps_1` CHECK (capacity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='المخيمات — مخيمات منى وعرفات. توضع تحت مركز داخل الملف التشغيلي.';

CREATE TABLE `op_file_types` (
  `code` VARCHAR(30) NOT NULL COMMENT 'المفتاح: makkah-housing، mina-camps، arafat-camps',
  `name` VARCHAR(200) NOT NULL COMMENT 'الاسم («التسكين في مكة المكرمة — قطاعات وأبراج حجاج سوريا»…)',
  `short_name` VARCHAR(80) NOT NULL COMMENT 'الاسم المختصر',
  `description` TEXT NOT NULL COMMENT 'الشرح وشروط البدء والانتهاء',
  `outer_label` VARCHAR(40) NOT NULL COMMENT 'اسم المستوى الخارجي (القطاع / المركز)',
  `outer_ref` ENUM('sectors','centers') NOT NULL COMMENT 'مرجع المستوى الخارجي',
  `inner_label` VARCHAR(40) NOT NULL COMMENT 'اسم المستوى الداخلي (البرج / الفندق، المخيم)',
  `inner_ref` ENUM('hotels','camps') NOT NULL COMMENT 'مرجع المستوى الداخلي',
  `mashaer` ENUM('mina','arafat') NULL COMMENT 'المشعر لملفات المخيمات',
  `has_housing` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'ملف تسكين (للأدوار الخارجية فندق يسكنه صاحبها)',
  `has_camp_fields` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'حقول الخيمة والجهات المخصصة',
  `team_label` VARCHAR(60) NULL COMMENT 'فريق على مستوى الملف («فريق الكوسترات» في منى)',
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='أنواع الملفات التشغيلية — التسكين في مكة (قطاعات ← أبراج)، مخيمات منى (مراكز ← مخيمات)، مخيمات عرفات.';

CREATE TABLE `op_file_type_dates` (
  `file_type_code` VARCHAR(30) NOT NULL COMMENT 'النوع',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `starts_on` DATE NOT NULL COMMENT 'البداية',
  `ends_on` DATE NOT NULL COMMENT 'النهاية',
  PRIMARY KEY (`file_type_code`, `season_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مواعيد الملفات التشغيلية الافتراضية — مدة كل نوع في كل موسم.';

CREATE TABLE `op_file_roles` (
  `file_type_code` VARCHAR(30) NOT NULL COMMENT 'النوع',
  `role_code` VARCHAR(30) NOT NULL COMMENT 'الدور: sector-head، sector-deputy، tower-supervisor، tower-deputy، mission-member؛ center-supervisor، camp-member، coaster-lead، coaster-member',
  `level` ENUM('file','outer','inner') NOT NULL COMMENT 'المستوى',
  `name` VARCHAR(80) NOT NULL COMMENT 'الاسم: «رئيس القطاع»، «معاون رئيس القطاع»، «مشرف البرج»، «معاون مشرف البرج»، «عضو بعثة»، «مشرف المركز»، «عضو المخيم»، «مشرف فريق الكوسترات»، «عضو فريق الكوسترات»',
  `plural_name` VARCHAR(80) NULL COMMENT 'الجمع',
  `required` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'إلزامي (نقصه «فجوة» تمنع التفعيل)',
  `multiple` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'يقبل أكثر من شاغل',
  `max_holders` TINYINT UNSIGNED NULL COMMENT 'الحد الأعلى (مشرفو المركز 2)',
  `reports_to_role_code` VARCHAR(30) NULL COMMENT 'الدور الذي يتبعه',
  `description` TEXT NOT NULL COMMENT 'المهام',
  PRIMARY KEY (`file_type_code`, `role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='أدوار الملفات التشغيلية — الأدوار في كل نوع ومستواها وتسلسلها.';

CREATE TABLE `operational_files` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `file_type_code` VARCHAR(30) NOT NULL COMMENT 'النوع',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `decision_no` VARCHAR(30) NULL COMMENT 'رقم القرار الإداري (إلزامي للتفعيل)',
  `starts_on` DATE NOT NULL COMMENT 'البداية',
  `ends_on` DATE NOT NULL COMMENT 'النهاية (≥ البداية)',
  `start_note` VARCHAR(300) NULL COMMENT 'ملاحظة البداية',
  `end_note` VARCHAR(300) NULL COMMENT 'ملاحظة النهاية',
  `report_cadence` ENUM('none','daily','weekly') NOT NULL DEFAULT 'daily' COMMENT 'none «بلا تقرير دوري»، daily «تقرير يومي»، weekly «تقرير أسبوعي»',
  `status` ENUM('draft','active') NOT NULL DEFAULT 'draft' COMMENT 'draft «مسودة» («إسناد مبدئي» في ملفاتي)، active «مفعّل» («نافذ»). «منتهٍ» محسوب بعد النهاية',
  `activated_at` DATETIME(3) NULL COMMENT 'التفعيل',
  `activated_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من فعّله',
  `copied_from_file_id` BIGINT UNSIGNED NULL COMMENT 'الملف الذي نُسخ منه من الموسم السابق',
  `created_by_staff_id` BIGINT UNSIGNED NOT NULL COMMENT 'من أنشأه',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_operational_files_file_type_code_season_year` (`file_type_code`, `season_year`),
  CONSTRAINT `ck_operational_files_1` CHECK (ends_on >= starts_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الملفات التشغيلية — ملف واحد لكل نوع في كل موسم: مسودة ثم مفعّل بقرار إداري.';

CREATE TABLE `op_file_outer_nodes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `file_id` BIGINT UNSIGNED NOT NULL COMMENT 'الملف',
  `sector_id` BIGINT UNSIGNED NULL COMMENT 'القطاع',
  `center_id` BIGINT UNSIGNED NULL COMMENT 'المركز',
  `sort_order` SMALLINT NOT NULL DEFAULT 0 COMMENT 'الترتيب',
  PRIMARY KEY (`id`),
  CONSTRAINT `ck_op_file_outer_nodes_1` CHECK ((sector_id IS NULL) <> (center_id IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='المستوى الخارجي في الملف — قطاع (للتسكين) أو مركز (للمخيمات).';

CREATE TABLE `op_file_inner_nodes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `outer_node_id` BIGINT UNSIGNED NOT NULL COMMENT 'العقدة الخارجية',
  `hotel_id` BIGINT UNSIGNED NULL COMMENT 'الفندق (مكة فقط)',
  `camp_id` BIGINT UNSIGNED NULL COMMENT 'المخيم',
  `pilgrims` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'عدد الحجاج (يُحسب من التكتلات ويُعدَّل يدوياً)',
  `note` VARCHAR(300) NULL COMMENT 'ملاحظة',
  `tent_no` VARCHAR(20) NULL COMMENT 'رقم الخيمة (المخيمات)',
  `assigned_bodies` VARCHAR(300) NULL COMMENT 'جهات مخصّصة («الإدارة الصحية — عيادة المخيم»)',
  `sort_order` SMALLINT NOT NULL DEFAULT 0 COMMENT 'الترتيب',
  PRIMARY KEY (`id`),
  CONSTRAINT `ck_op_file_inner_nodes_1` CHECK ((hotel_id IS NULL) <> (camp_id IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='المستوى الداخلي في الملف — برج (فندق في مكة) أو مخيم، بعدد حجاجه.';

CREATE TABLE `op_inner_node_clusters` (
  `inner_node_id` BIGINT UNSIGNED NOT NULL COMMENT 'العقدة',
  `file_id` BIGINT UNSIGNED NOT NULL COMMENT 'الملف (مكرر لفرض الفرادة)',
  `cluster_id` BIGINT UNSIGNED NOT NULL COMMENT 'التكتل',
  PRIMARY KEY (`file_id`, `cluster_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='التكتلات في البرج أو المخيم — التكتلات الساكنة في كل عقدة. التكتل في عقدة داخلية واحدة في الملف.';

CREATE TABLE `op_file_assignments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `file_id` BIGINT UNSIGNED NOT NULL COMMENT 'الملف',
  `outer_node_id` BIGINT UNSIGNED NULL COMMENT 'العقدة الخارجية',
  `inner_node_id` BIGINT UNSIGNED NULL COMMENT 'العقدة الداخلية',
  `role_code` VARCHAR(30) NOT NULL COMMENT 'الدور (من أدوار نوع الملف)',
  `employee_id` BIGINT UNSIGNED NOT NULL COMMENT 'الموظف (مشارك في الموسم وغير موقوف)',
  `housing_hotel_id` BIGINT UNSIGNED NULL COMMENT 'للأدوار الخارجية في التسكين: الفندق الذي يسكنه',
  `assigned_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من أسنده',
  `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_op_file_assignments_88e52624` (`file_id`, `employee_id`, `role_code`, `outer_node_id`, `inner_node_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='إسناد الموظفين في الملفات — موظف في دور، على مستوى الملف أو قطاع/مركز أو برج/مخيم.';

CREATE TABLE `internal_tasks` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `task_no` VARCHAR(12) NOT NULL COMMENT 'رقم المهمة T-…',
  `title` VARCHAR(300) NOT NULL COMMENT 'العنوان (5 أحرف على الأقل)',
  `created_by_staff_id` BIGINT UNSIGNED NOT NULL COMMENT 'من أنشأها',
  `assigned_to_label` VARCHAR(120) NOT NULL COMMENT 'إلى («غرفة العمليات» افتراضياً)',
  `column_key` ENUM('todo','doing','done','verified') NOT NULL DEFAULT 'todo' COMMENT 'todo «جديدة»، doing «قيد التنفيذ»، done «منجزة»، verified «تم التحقق»',
  `evidence` VARCHAR(200) NULL COMMENT 'الإثبات المطلوب',
  `due_label` VARCHAR(60) NULL COMMENT 'الموعد («اليوم 18:00»، «فوري»)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_internal_tasks_task_no` (`task_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='المهام الداخلية لغرفة العمليات — مهام الغرفة بأعمدتها. الكود يعيد بناءها من سجل الأحداث؛ هنا جدول.';

CREATE TABLE `internal_task_moves` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `task_id` BIGINT UNSIGNED NOT NULL COMMENT 'المهمة',
  `from_column` VARCHAR(10) NOT NULL COMMENT 'من',
  `to_column` VARCHAR(10) NOT NULL COMMENT 'إلى',
  `moved_by_staff_id` BIGINT UNSIGNED NOT NULL COMMENT 'من نقلها',
  `moved_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='حركة المهام بين الأعمدة — كل نقل خطوة إلى الأمام أو الخلف.';

CREATE TABLE `ops_decisions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `kind` VARCHAR(40) NOT NULL COMMENT 'نوع القرار (extra-bus…)',
  `subject` VARCHAR(200) NOT NULL COMMENT 'الموضوع',
  `before_value` VARCHAR(200) NULL COMMENT 'قبل',
  `after_value` VARCHAR(200) NULL COMMENT 'بعد',
  `decided_by_staff_id` BIGINT UNSIGNED NOT NULL COMMENT 'من قرر',
  `decided_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'الوقت',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='قرارات الغرفة التشغيلية — قرارات مثل اعتماد حافلة إضافية لمزدلفة («8 حافلات — 400 مقعد» ← «9 حافلات — 450 مقعداً»). الكود يحفظها حدثاً فقط.';

CREATE TABLE `season_meals` (
  `season_year` SMALLINT UNSIGNED NOT NULL COMMENT 'الموسم الهجري (مثل 1448)',
  `city` ENUM('makkah','madinah') NOT NULL COMMENT 'المدينة',
  `meal` ENUM('breakfast','lunch') NOT NULL COMMENT 'الوجبة',
  `time_from` TIME NOT NULL COMMENT 'من',
  `time_to` TIME NOT NULL COMMENT 'إلى',
  `menu` TEXT NULL COMMENT 'القائمة (فارغة = «قائمة الفندق اليومية»)',
  `updated_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'آخر من عدّل',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`season_year`, `city`, `meal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مواعيد الوجبات وقوائمها — الفطور والغداء في فنادق مكة والمدينة لكل موسم.';

-- ───────────────────────────────────────────────────────────────
-- المحتوى العام والأكاديمية: الأخبار والأسئلة ودليل المناسك والدروس
-- ───────────────────────────────────────────────────────────────

CREATE TABLE `content_translations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `entity_type` VARCHAR(40) NOT NULL COMMENT 'الجدول: news_articles، faqs، guide_days، academy_lessons، cms_field_values…',
  `entity_id` VARCHAR(64) NOT NULL COMMENT 'معرّف الصف',
  `field` VARCHAR(60) NOT NULL COMMENT 'الحقل',
  `locale` VARCHAR(5) NOT NULL DEFAULT 'en' COMMENT 'اللغة (en)',
  `value` MEDIUMTEXT NOT NULL COMMENT 'النص المترجم (أو JSON للحقول المركبة)',
  `source_hash` CHAR(64) NULL COMMENT 'بصمة النص العربي وقت الترجمة: إن تغيّر العربي تُعلَّم الترجمة قديمة',
  `updated_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'آخر من عدّل',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_content_translations_entity_type_entity_id_field_locale` (`entity_type`, `entity_id`, `field`, `locale`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ترجمات المحتوى — النص الإنجليزي (ولغات أخرى لاحقاً) لأي حقل في أي جدول محتوى. العربي في الجدول نفسه، والترجمة هنا حقلاً حقلاً. في النسخة التجريبية الإنجليزية مكتوبة في الكود (lib/cms/en) فلا يحررها الموظفون، وتبقى قديمة حين يتغير العربي.';

CREATE TABLE `news_categories` (
  `code` VARCHAR(30) NOT NULL COMMENT 'المفتاح',
  `label` VARCHAR(60) NOT NULL COMMENT 'الاسم: «إعلانات رسمية»، «قرارات»، «تعاميم»، «أخبار الموسم»، «توعية»',
  `tone` ENUM('green','gold','maroon') NOT NULL COMMENT 'اللون',
  `sort_order` TINYINT NOT NULL DEFAULT 0 COMMENT 'الترتيب',
  PRIMARY KEY (`code`),
  UNIQUE KEY `uq_news_categories_label` (`label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='تصنيفات الأخبار — تصنيف كل خبر ولونه.';

CREATE TABLE `news_articles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `slug` VARCHAR(120) NOT NULL COMMENT 'رابط المقال /news/<slug>',
  `title` VARCHAR(300) NOT NULL COMMENT 'العنوان',
  `category_code` VARCHAR(30) NOT NULL COMMENT 'التصنيف',
  `image_file_id` BIGINT UNSIGNED NULL COMMENT 'الصورة',
  `excerpt` TEXT NOT NULL COMMENT 'المقتطف',
  `published_on` DATE NOT NULL COMMENT 'تاريخ الخبر (يُرتَّب به تنازلياً)',
  `hijri_label` VARCHAR(60) NULL COMMENT 'التاريخ الهجري المعروض',
  `gregorian_label` VARCHAR(60) NULL COMMENT 'التاريخ الميلادي المعروض',
  `author` VARCHAR(120) NULL COMMENT 'الكاتب',
  `department` VARCHAR(120) NULL COMMENT 'الجهة المصدِرة',
  `views` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'عدد القراءات (عدّاد فعلي؛ الكود يكتبه يدوياً)',
  `pinned` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'مثبّت',
  `ticker_text` VARCHAR(300) NULL COMMENT 'نص الشريط العاجل',
  `body` JSON NOT NULL COMMENT 'جسم المقال كتلاً: p «فقرة» {text}، h «عنوان فرعي» {text}، list «قائمة» {items[], ordered}، callout «تنبيه» {title, text, tone: gold|maroon|green}، table «جدول» {caption, head[], rows[][]}، quote «اقتباس» {text, by}',
  `status` ENUM('draft','published','archived') NOT NULL DEFAULT 'draft' COMMENT 'حالة النشر: draft «مسودة»، published «منشورة»، archived «مؤرشفة» (لا يُحذف شيء من الموقع نهائياً)',
  `pending_changes` JSON NULL COMMENT 'تعديلات تنتظر النشر على عنصر منشور: يبقى المنشور ظاهراً حتى «نشر»، فتُطبَّق ويُفرَّغ العمود',
  `pending_sort_order` INT NULL COMMENT 'ترتيب جديد ينتظر النشر',
  `created_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من أنشأه (للعناصر التي ينشئها المحررون)',
  `published_at` DATETIME(3) NULL COMMENT 'وقت النشر',
  `published_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من نشر',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT 'الترتيب في القوائم',
  `updated_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'آخر من عدّل',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_news_articles_slug` (`slug`),
  KEY `ix_news_articles_status_published_on` (`status`, `published_on`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الأخبار والإعلانات — مقال في «الأخبار والإعلانات»، يظهر منه آخر الأخبار في الرئيسية وشريط العاجل.';

CREATE TABLE `news_tags` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `name` VARCHAR(60) NOT NULL COMMENT 'الوسم',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_news_tags_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الوسوم — وسوم الأخبار.';

CREATE TABLE `news_article_tags` (
  `article_id` BIGINT UNSIGNED NOT NULL COMMENT 'الخبر',
  `tag_id` BIGINT UNSIGNED NOT NULL COMMENT 'الوسم',
  PRIMARY KEY (`article_id`, `tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='وسوم كل خبر — ربط الأخبار بوسومها.';

CREATE TABLE `news_comments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `article_id` BIGINT UNSIGNED NOT NULL COMMENT 'الخبر',
  `account_id` BIGINT UNSIGNED NOT NULL COMMENT 'الكاتب',
  `author_name` VARCHAR(120) NOT NULL COMMENT 'الاسم وقت الكتابة (الأول والكنية)',
  `text` VARCHAR(500) NOT NULL COMMENT 'النص (500 حرف حداً)',
  `status` ENUM('visible','hidden','removed') NOT NULL DEFAULT 'visible' COMMENT 'visible ظاهر، hidden أخفاه مشرف المحتوى، removed حذفه كاتبه',
  `moderated_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'مشرف المحتوى الذي أخفاه (مقترح: لا إشراف في الكود)',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  PRIMARY KEY (`id`),
  KEY `ix_news_comments_article_id_created_at` (`article_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='التعليقات على الأخبار — يعلّق أي صاحب حساب (حاج، أو إداري، أو عضو لم يختر مساراً) تحت الخبر، ويحذف تعليقه بنفسه.';

CREATE TABLE `news_feedback` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `article_id` BIGINT UNSIGNED NOT NULL COMMENT 'الخبر',
  `account_id` BIGINT UNSIGNED NULL COMMENT 'القارئ إن كان داخلاً',
  `helpful` TINYINT(1) NOT NULL COMMENT 'مفيد',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='«هل كان هذا مفيداً؟» — تقييم القارئ للخبر. الكود يعرضه ولا يحفظه.';

CREATE TABLE `faq_categories` (
  `code` VARCHAR(30) NOT NULL COMMENT 'المفتاح',
  `label` VARCHAR(60) NOT NULL COMMENT 'الاسم: «التسجيل»، «الشروط»، «القبول والقرعة»، «التكاليف والدفع»، «الخدمات والتحقق»',
  `sort_order` TINYINT NOT NULL DEFAULT 0 COMMENT 'الترتيب',
  PRIMARY KEY (`code`),
  UNIQUE KEY `uq_faq_categories_label` (`label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='تصنيفات الأسئلة الشائعة — تصنيفات صفحة الأسئلة الشائعة.';

CREATE TABLE `faqs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `category_code` VARCHAR(30) NOT NULL COMMENT 'التصنيف',
  `question` TEXT NOT NULL COMMENT 'السؤال',
  `answer` TEXT NOT NULL COMMENT 'الجواب',
  `status` ENUM('draft','published','archived') NOT NULL DEFAULT 'draft' COMMENT 'حالة النشر: draft «مسودة»، published «منشورة»، archived «مؤرشفة» (لا يُحذف شيء من الموقع نهائياً)',
  `pending_changes` JSON NULL COMMENT 'تعديلات تنتظر النشر على عنصر منشور: يبقى المنشور ظاهراً حتى «نشر»، فتُطبَّق ويُفرَّغ العمود',
  `pending_sort_order` INT NULL COMMENT 'ترتيب جديد ينتظر النشر',
  `created_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من أنشأه (للعناصر التي ينشئها المحررون)',
  `published_at` DATETIME(3) NULL COMMENT 'وقت النشر',
  `published_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من نشر',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT 'الترتيب في القوائم',
  `updated_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'آخر من عدّل',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الأسئلة الشائعة — سؤال وجوابه.';

CREATE TABLE `guide_days` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `slug` VARCHAR(40) NOT NULL COMMENT 'المفتاح: tarwiyah، arafah، muzdalifah، nahr، tashreeq',
  `name` VARCHAR(80) NOT NULL COMMENT 'الاسم',
  `day_label` VARCHAR(20) NOT NULL COMMENT 'رقم اليوم',
  `hijri_label` VARCHAR(40) NOT NULL COMMENT 'التاريخ الهجري',
  `image_file_id` BIGINT UNSIGNED NULL COMMENT 'الصورة',
  `intro` TEXT NOT NULL COMMENT 'المقدمة',
  `place_label` VARCHAR(120) NOT NULL COMMENT 'المكان',
  `place_lat` DECIMAL(9,6) NOT NULL COMMENT 'خط العرض',
  `place_lng` DECIMAL(9,6) NOT NULL COMMENT 'خط الطول',
  `place_zoom` TINYINT UNSIGNED NULL COMMENT 'تقريب الخريطة',
  `dua_title` VARCHAR(160) NULL COMMENT 'عنوان دعاء اليوم',
  `dua_text` TEXT NULL COMMENT 'نص الدعاء',
  `lesson_id` BIGINT UNSIGNED NULL COMMENT 'درس الأكاديمية المرتبط («تريد فهماً أعمق؟»)',
  `status` ENUM('draft','published','archived') NOT NULL DEFAULT 'draft' COMMENT 'حالة النشر: draft «مسودة»، published «منشورة»، archived «مؤرشفة» (لا يُحذف شيء من الموقع نهائياً)',
  `pending_changes` JSON NULL COMMENT 'تعديلات تنتظر النشر على عنصر منشور: يبقى المنشور ظاهراً حتى «نشر»، فتُطبَّق ويُفرَّغ العمود',
  `pending_sort_order` INT NULL COMMENT 'ترتيب جديد ينتظر النشر',
  `created_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من أنشأه (للعناصر التي ينشئها المحررون)',
  `published_at` DATETIME(3) NULL COMMENT 'وقت النشر',
  `published_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من نشر',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT 'الترتيب في القوائم',
  `updated_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'آخر من عدّل',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_guide_days_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='أيام دليل المناسك — أيام الحج الخمسة في «دليل المناسك»: التروية، عرفة، مزدلفة، النحر، التشريق.';

CREATE TABLE `guide_day_tasks` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `day_id` BIGINT UNSIGNED NOT NULL COMMENT 'اليوم',
  `sort_order` TINYINT NOT NULL COMMENT 'الترتيب',
  `text` TEXT NOT NULL COMMENT 'العمل',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='أعمال اليوم — قائمة أعمال كل يوم.';

CREATE TABLE `guide_day_times` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `day_id` BIGINT UNSIGNED NOT NULL COMMENT 'اليوم',
  `sort_order` TINYINT NOT NULL COMMENT 'الترتيب',
  `time_label` VARCHAR(10) NOT NULL COMMENT 'الوقت («08:00»)',
  `label` VARCHAR(160) NOT NULL COMMENT 'الحدث',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مواقيت اليوم — مواقيت كل يوم.';

CREATE TABLE `guide_duas` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `title` VARCHAR(160) NOT NULL COMMENT 'العنوان',
  `when_said` VARCHAR(160) NOT NULL COMMENT 'متى يُقال؟',
  `text` TEXT NOT NULL COMMENT 'الدعاء',
  `source` VARCHAR(160) NULL COMMENT 'المصدر',
  `status` ENUM('draft','published','archived') NOT NULL DEFAULT 'draft' COMMENT 'حالة النشر: draft «مسودة»، published «منشورة»، archived «مؤرشفة» (لا يُحذف شيء من الموقع نهائياً)',
  `pending_changes` JSON NULL COMMENT 'تعديلات تنتظر النشر على عنصر منشور: يبقى المنشور ظاهراً حتى «نشر»، فتُطبَّق ويُفرَّغ العمود',
  `pending_sort_order` INT NULL COMMENT 'ترتيب جديد ينتظر النشر',
  `created_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من أنشأه (للعناصر التي ينشئها المحررون)',
  `published_at` DATETIME(3) NULL COMMENT 'وقت النشر',
  `published_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من نشر',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT 'الترتيب في القوائم',
  `updated_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'آخر من عدّل',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='أدعية دليل المناسك — أدعية المناسك ومتى تقال ومصدرها.';

CREATE TABLE `guide_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `list_key` ENUM('nusuk','nusuk_rows','prohibitions','tawaf_rounds','sai_laps','packing','health_tips','heatstroke_signs','haram_point') NOT NULL COMMENT 'القائمة: nusuk الأنساك الثلاثة (تمتع، قران، إفراد)، nusuk_rows صفوف المقارنة، prohibitions «محظورات الإحرام» (لمن: الجميع/الرجال/النساء)، tawaf_rounds الأشواط السبعة، sai_laps أشواط السعي، packing «حقيبة الحاج» بمجموعاتها، health_tips النصائح الصحية، heatstroke_signs علامات ضربة الشمس، haram_point نقطة الحرم على الخريطة',
  `data` JSON NOT NULL COMMENT 'بيانات العنصر بحسب القائمة، مثل {icon, title, body, who} للمحظورات أو {id, label, note, group} للحقيبة',
  `status` ENUM('draft','published','archived') NOT NULL DEFAULT 'draft' COMMENT 'حالة النشر: draft «مسودة»، published «منشورة»، archived «مؤرشفة» (لا يُحذف شيء من الموقع نهائياً)',
  `pending_changes` JSON NULL COMMENT 'تعديلات تنتظر النشر على عنصر منشور: يبقى المنشور ظاهراً حتى «نشر»، فتُطبَّق ويُفرَّغ العمود',
  `pending_sort_order` INT NULL COMMENT 'ترتيب جديد ينتظر النشر',
  `created_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من أنشأه (للعناصر التي ينشئها المحررون)',
  `published_at` DATETIME(3) NULL COMMENT 'وقت النشر',
  `published_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من نشر',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT 'الترتيب في القوائم',
  `updated_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'آخر من عدّل',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='قوائم دليل المناسك الأخرى — قوائم الدليل المكتوبة في الكود اليوم، صفاً لكل عنصر بنوع قائمته وبياناته: المقارنة بين الأنساك، محظورات الإحرام، أشواط الطواف وأدعيتها، أشواط السعي، حقيبة الحاج، النصائح الصحية، علامات ضربة الشمس.';

CREATE TABLE `academy_lecturers` (
  `code` VARCHAR(20) NOT NULL COMMENT 'المفتاح: abdulrahman، khaled، huda، nour، ahmad، samer، reem',
  `name` VARCHAR(80) NOT NULL COMMENT 'الاسم: «الشيخ عبد الرحمن»، «الشيخ خالد»، «د. هدى»، «أ. نور»، «الشيخ أحمد»، «د. سامر»، «م. ريم»',
  `role` VARCHAR(160) NOT NULL COMMENT 'الصفة',
  `bio` TEXT NOT NULL COMMENT 'النبذة',
  `initials` VARCHAR(4) NOT NULL COMMENT 'الحرف الرمزي',
  `photo_file_id` BIGINT UNSIGNED NULL COMMENT 'الصورة',
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='محاضرو الأكاديمية — المحاضرون السبعة.';

CREATE TABLE `academy_tracks` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `slug` VARCHAR(40) NOT NULL COMMENT 'الرابط /academy/<slug>: hajj-fiqh، umrah-fiqh، journey-ethics، madinah، duas، preparation',
  `title` VARCHAR(120) NOT NULL COMMENT 'العنوان',
  `short` TEXT NOT NULL COMMENT 'الوصف المختصر',
  `description` TEXT NOT NULL COMMENT 'الوصف',
  `image_file_id` BIGINT UNSIGNED NULL COMMENT 'الصورة',
  `icon` ENUM('kaaba','umrah','heart','madinah','dua','bag') NOT NULL COMMENT 'الأيقونة: الكعبة، العمرة، القلب، المدينة، الدعاء، الحقيبة',
  `tone` ENUM('green','gold','maroon') NOT NULL COMMENT 'اللون',
  `gallery_file_ids` JSON NULL COMMENT 'معرض الصور',
  `status` ENUM('draft','published','archived') NOT NULL DEFAULT 'draft' COMMENT 'حالة النشر: draft «مسودة»، published «منشورة»، archived «مؤرشفة» (لا يُحذف شيء من الموقع نهائياً)',
  `pending_changes` JSON NULL COMMENT 'تعديلات تنتظر النشر على عنصر منشور: يبقى المنشور ظاهراً حتى «نشر»، فتُطبَّق ويُفرَّغ العمود',
  `pending_sort_order` INT NULL COMMENT 'ترتيب جديد ينتظر النشر',
  `created_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من أنشأه (للعناصر التي ينشئها المحررون)',
  `published_at` DATETIME(3) NULL COMMENT 'وقت النشر',
  `published_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من نشر',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT 'الترتيب في القوائم',
  `updated_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'آخر من عدّل',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_academy_tracks_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مسارات الأكاديمية — المسارات الستة: فقه الحج، فقه العمرة، آداب الرحلة، المدينة المنورة، الأدعية، الاستعداد.';

CREATE TABLE `academy_levels` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `track_id` BIGINT UNSIGNED NOT NULL COMMENT 'المسار',
  `level_no` TINYINT UNSIGNED NOT NULL COMMENT 'رقم المستوى',
  `title` VARCHAR(120) NOT NULL COMMENT 'العنوان',
  `subtitle` VARCHAR(200) NULL COMMENT 'العنوان الفرعي',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_academy_levels_track_id_level_no` (`track_id`, `level_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مستويات المسار — مستويات كل مسار (13 مستوى في المجموع)، ولكل مستوى اختبار قصير.';

CREATE TABLE `academy_lessons` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `track_id` BIGINT UNSIGNED NOT NULL COMMENT 'المسار',
  `level_id` BIGINT UNSIGNED NOT NULL COMMENT 'المستوى',
  `slug` VARCHAR(80) NOT NULL COMMENT 'الرابط /academy/<track>/<lesson>',
  `title` VARCHAR(200) NOT NULL COMMENT 'العنوان',
  `minutes` SMALLINT UNSIGNED NOT NULL COMMENT 'المدة (1–180)',
  `lecturer_code` VARCHAR(20) NOT NULL COMMENT 'المحاضر',
  `poster_file_id` BIGINT UNSIGNED NULL COMMENT 'صورة الدرس',
  `media_kind` ENUM('video','audio') NOT NULL DEFAULT 'video' COMMENT 'الوسيط',
  `video_file_id` BIGINT UNSIGNED NULL COMMENT 'ملف الفيديو',
  `narration_audio_url` VARCHAR(300) NULL COMMENT 'الملخص المسموع (/audio/lessons/<track>/<lesson>.mp3) مع توقيت الجمل',
  `narration_timings_url` VARCHAR(300) NULL COMMENT 'ملف توقيت الجمل (.json)',
  `summary` JSON NOT NULL COMMENT '«الملخص المكتوب» فقرات',
  `points` JSON NOT NULL COMMENT '«النقاط الرئيسية»',
  `tags` JSON NOT NULL COMMENT 'الوسوم',
  `gallery_file_ids` JSON NULL COMMENT 'صور الدرس',
  `status` ENUM('draft','published','archived') NOT NULL DEFAULT 'draft' COMMENT 'حالة النشر: draft «مسودة»، published «منشورة»، archived «مؤرشفة» (لا يُحذف شيء من الموقع نهائياً)',
  `pending_changes` JSON NULL COMMENT 'تعديلات تنتظر النشر على عنصر منشور: يبقى المنشور ظاهراً حتى «نشر»، فتُطبَّق ويُفرَّغ العمود',
  `pending_sort_order` INT NULL COMMENT 'ترتيب جديد ينتظر النشر',
  `created_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من أنشأه (للعناصر التي ينشئها المحررون)',
  `published_at` DATETIME(3) NULL COMMENT 'وقت النشر',
  `published_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من نشر',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT 'الترتيب في القوائم',
  `updated_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'آخر من عدّل',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_academy_lessons_track_id_slug` (`track_id`, `slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='دروس الأكاديمية — الدرس بمحاضره ومدته ووسائطه وملخصه ونقاطه وأسئلته وأدعيته (48 درساً).';

CREATE TABLE `academy_lesson_faqs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `lesson_id` BIGINT UNSIGNED NOT NULL COMMENT 'الدرس',
  `sort_order` TINYINT NOT NULL COMMENT 'الترتيب',
  `question` TEXT NOT NULL COMMENT 'السؤال',
  `answer` TEXT NOT NULL COMMENT 'الجواب',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='«الأسئلة المعتمدة» للدرس — أسئلة حول الدرس وأجوبتها.';

CREATE TABLE `academy_lesson_duas` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `lesson_id` BIGINT UNSIGNED NOT NULL COMMENT 'الدرس',
  `sort_order` TINYINT NOT NULL COMMENT 'الترتيب',
  `title` VARCHAR(160) NOT NULL COMMENT 'العنوان',
  `text` TEXT NOT NULL COMMENT 'النص',
  `source` VARCHAR(160) NULL COMMENT 'المصدر',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='أدعية الدرس — الأدعية المرفقة بالدرس.';

CREATE TABLE `academy_quiz_questions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `level_id` BIGINT UNSIGNED NOT NULL COMMENT 'المستوى',
  `sort_order` TINYINT NOT NULL COMMENT 'الترتيب',
  `question` TEXT NOT NULL COMMENT 'السؤال',
  `options` JSON NOT NULL COMMENT 'أربعة خيارات',
  `correct_index` TINYINT UNSIGNED NOT NULL COMMENT 'رقم الخيار الصحيح (من 0)',
  `explanation` TEXT NOT NULL COMMENT 'الشرح',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='أسئلة اختبارات المستويات — اختبار قصير للمراجعة لكل مستوى (64 سؤالاً). «لا يؤثر في أي طلب».';

CREATE TABLE `academy_clips` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `slug` VARCHAR(80) NOT NULL COMMENT 'المعرّف',
  `title` VARCHAR(200) NOT NULL COMMENT 'العنوان',
  `seconds` SMALLINT UNSIGNED NOT NULL COMMENT 'المدة بالثواني',
  `lesson_id` BIGINT UNSIGNED NOT NULL COMMENT 'الدرس',
  `tags` JSON NOT NULL COMMENT 'الوسوم',
  `video_file_id` BIGINT UNSIGNED NULL COMMENT 'الفيديو',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_academy_clips_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='المقاطع القصيرة — مقاطع قصيرة تشير إلى درس.';

CREATE TABLE `academy_lesson_completions` (
  `account_id` BIGINT UNSIGNED NOT NULL COMMENT 'صاحب الحساب',
  `lesson_id` BIGINT UNSIGNED NOT NULL COMMENT 'الدرس',
  `completed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإتمام (الكود لا يحفظ الوقت)',
  PRIMARY KEY (`account_id`, `lesson_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='إتمام الدروس — الدروس التي أتمّها كل صاحب حساب. التقدم للحساب لا للموسم، حاجاً كان أو إدارياً.';

CREATE TABLE `academy_quiz_attempts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `account_id` BIGINT UNSIGNED NOT NULL COMMENT 'صاحب الحساب',
  `level_id` BIGINT UNSIGNED NOT NULL COMMENT 'المستوى',
  `score` TINYINT UNSIGNED NOT NULL COMMENT 'الصحيحة',
  `total` TINYINT UNSIGNED NOT NULL COMMENT 'عدد الأسئلة',
  `answers` JSON NULL COMMENT 'الإجابات',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='محاولات اختبارات المستويات — نتيجة كل اختبار مستوى. الكود يعرضها ولا يحفظها.';

CREATE TABLE `academy_lesson_ratings` (
  `account_id` BIGINT UNSIGNED NOT NULL COMMENT 'صاحب الحساب',
  `lesson_id` BIGINT UNSIGNED NOT NULL COMMENT 'الدرس',
  `rating` TINYINT UNSIGNED NOT NULL COMMENT '1–5',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`account_id`, `lesson_id`),
  CONSTRAINT `ck_academy_lesson_ratings_1` CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='تقييم الدروس — نجوم الدرس. الكود يعرض رسالة فقط.';

CREATE TABLE `academy_lecturer_questions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `account_id` BIGINT UNSIGNED NOT NULL COMMENT 'السائل',
  `lesson_id` BIGINT UNSIGNED NOT NULL COMMENT 'الدرس',
  `question` TEXT NOT NULL COMMENT 'السؤال',
  `answer` TEXT NULL COMMENT 'الجواب',
  `answered_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من أجاب',
  `answered_at` DATETIME(3) NULL COMMENT 'وقت الجواب',
  `published` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'نُشر ضمن «الأسئلة المعتمدة»',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='«اسأل المحاضر» — سؤال صاحب الحساب للمحاضر عن درس، وجوابه. الكود يعرض رسالة فقط ولا يوصله.';

CREATE TABLE `academy_certificates` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `account_id` BIGINT UNSIGNED NOT NULL COMMENT 'صاحب الحساب',
  `track_id` BIGINT UNSIGNED NOT NULL COMMENT 'المسار',
  `certificate_no` VARCHAR(24) NOT NULL COMMENT 'الرقم ACD-<أول 3 أحرف من المسار>-<6 أرقام>',
  `issued_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإصدار',
  `saved_to_vault_at` DATETIME(3) NULL COMMENT 'حفظها في خزنة الوثائق',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_academy_certificates_certificate_no` (`certificate_no`),
  UNIQUE KEY `uq_academy_certificates_account_id_track_id` (`account_id`, `track_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='شهادات المسارات — شهادة إتمام المسار. الكود يحسبها عند العرض، ورقمها من بذرة، وتاريخها يوم العرض، و«حفظ في خزنة الوثائق» لا يحفظ شيئاً. هنا تُصدر مرة وتُحفظ ويُتحقق منها.';

CREATE TABLE `prayer_cities` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `slug` VARCHAR(40) NOT NULL COMMENT 'المعرّف',
  `name` VARCHAR(60) NOT NULL COMMENT 'الاسم',
  `country` VARCHAR(40) NOT NULL COMMENT 'البلد',
  `lat` DECIMAL(9,6) NOT NULL COMMENT 'خط العرض',
  `lng` DECIMAL(9,6) NOT NULL COMMENT 'خط الطول',
  `timezone` VARCHAR(40) NOT NULL COMMENT 'المنطقة الزمنية (Asia/Damascus، Asia/Riyadh)',
  `method` ENUM('mwl','ummalqura') NOT NULL COMMENT 'طريقة الحساب: mwl رابطة العالم الإسلامي (المدن السورية)، ummalqura أم القرى (مكة والمدينة)',
  `sort_order` TINYINT NOT NULL DEFAULT 0 COMMENT 'الترتيب',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_prayer_cities_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مدن مواقيت الصلاة — المدن وطريقة الحساب. المواقيت تُحسب ولا تُخزَّن (الفجر 18°/18.5°، العشاء 17°، العصر شافعي)، ومعها اتجاه القبلة.';

CREATE TABLE `tour_models` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `sketchfab_uid` VARCHAR(64) NOT NULL COMMENT 'معرّف النموذج في Sketchfab',
  `title` VARCHAR(160) NOT NULL COMMENT 'العنوان',
  `place` VARCHAR(120) NOT NULL COMMENT 'المكان',
  `author` VARCHAR(120) NOT NULL COMMENT 'صاحب النموذج',
  `source_url` VARCHAR(300) NOT NULL COMMENT 'رابط المصدر',
  `heavy` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'نموذج ثقيل (تحذير قبل التحميل)',
  `size_label` VARCHAR(20) NOT NULL COMMENT 'الحجم المعروض',
  `image_file_id` BIGINT UNSIGNED NULL COMMENT 'الصورة',
  `focus` VARCHAR(60) NULL COMMENT 'نقطة التركيز',
  `photo_credit` VARCHAR(160) NULL COMMENT 'حقوق الصورة',
  `when_label` VARCHAR(120) NOT NULL COMMENT 'متى يُزار',
  `about` TEXT NOT NULL COMMENT 'النبذة',
  `points` JSON NOT NULL COMMENT 'نقاط الشرح',
  `status` ENUM('draft','published','archived') NOT NULL DEFAULT 'draft' COMMENT 'حالة النشر: draft «مسودة»، published «منشورة»، archived «مؤرشفة» (لا يُحذف شيء من الموقع نهائياً)',
  `pending_changes` JSON NULL COMMENT 'تعديلات تنتظر النشر على عنصر منشور: يبقى المنشور ظاهراً حتى «نشر»، فتُطبَّق ويُفرَّغ العمود',
  `pending_sort_order` INT NULL COMMENT 'ترتيب جديد ينتظر النشر',
  `created_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من أنشأه (للعناصر التي ينشئها المحررون)',
  `published_at` DATETIME(3) NULL COMMENT 'وقت النشر',
  `published_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من نشر',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT 'الترتيب في القوائم',
  `updated_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'آخر من عدّل',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tour_models_sketchfab_uid` (`sketchfab_uid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='نماذج الجولة ثلاثية الأبعاد — نماذج «جولة ثلاثية الأبعاد»: المسجد الحرام، المسجد النبوي، جبل عرفات، جسر الجمرات، مسجد عائشة، مسجد قباء.';

CREATE TABLE `cluster_directory_entries` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `cluster_id` BIGINT UNSIGNED NOT NULL COMMENT 'التكتل',
  `tone` ENUM('green','gold','maroon') NOT NULL COMMENT 'لون البطاقة',
  `since_year` SMALLINT UNSIGNED NULL COMMENT 'سنة التأسيس الهجرية (1300–1500)',
  `approved_on_label` VARCHAR(60) NULL COMMENT 'تاريخ الاعتماد المعروض',
  `governorate_code` VARCHAR(20) NULL COMMENT 'المحافظة',
  `office_id` BIGINT UNSIGNED NULL COMMENT 'المكتب',
  `rating` DECIMAL(2,1) NULL COMMENT 'التقييم 0–5 (يُنصح بحسابه من تقييمات الحجاج بعد العودة)',
  `reviews_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'عدد المراجعات',
  `status` ENUM('draft','published','archived') NOT NULL DEFAULT 'draft' COMMENT 'حالة النشر: draft «مسودة»، published «منشورة»، archived «مؤرشفة» (لا يُحذف شيء من الموقع نهائياً)',
  `pending_changes` JSON NULL COMMENT 'تعديلات تنتظر النشر على عنصر منشور: يبقى المنشور ظاهراً حتى «نشر»، فتُطبَّق ويُفرَّغ العمود',
  `pending_sort_order` INT NULL COMMENT 'ترتيب جديد ينتظر النشر',
  `created_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من أنشأه (للعناصر التي ينشئها المحررون)',
  `published_at` DATETIME(3) NULL COMMENT 'وقت النشر',
  `published_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من نشر',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT 'الترتيب في القوائم',
  `updated_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'آخر من عدّل',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cluster_directory_entries_cluster_id` (`cluster_id`),
  CONSTRAINT `ck_cluster_directory_entries_1` CHECK (rating BETWEEN 0 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='بطاقات التكتلات في الدليل — ما يحرره موظفو المحتوى مباشرة في بطاقة التكتل العامة (مجموعة «التكتلات والحملات المعتمدة»): اللون، سنة التأسيس، تاريخ الاعتماد، المحافظة، المكتب، التقييم وعدد المراجعات. أما برنامج التكتل (الفنادق والنقل والإعاشة والسكن الخاص والصور) فيكتبه فريقه ويُعتمد في cluster_profile_versions.';

CREATE TABLE `unapproved_entities` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `name` VARCHAR(160) NOT NULL COMMENT 'الاسم',
  `claims` JSON NOT NULL COMMENT 'ادعاءاتها («مقعد مضمون»…)',
  `reports_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'عدد البلاغات عنها',
  `status` ENUM('draft','published','archived') NOT NULL DEFAULT 'draft' COMMENT 'حالة النشر: draft «مسودة»، published «منشورة»، archived «مؤرشفة» (لا يُحذف شيء من الموقع نهائياً)',
  `pending_changes` JSON NULL COMMENT 'تعديلات تنتظر النشر على عنصر منشور: يبقى المنشور ظاهراً حتى «نشر»، فتُطبَّق ويُفرَّغ العمود',
  `pending_sort_order` INT NULL COMMENT 'ترتيب جديد ينتظر النشر',
  `created_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من أنشأه (للعناصر التي ينشئها المحررون)',
  `published_at` DATETIME(3) NULL COMMENT 'وقت النشر',
  `published_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من نشر',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT 'الترتيب في القوائم',
  `updated_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'آخر من عدّل',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='جهات غير معتمدة — حملات أو جهات تدّعي التنظيم دون اعتماد، تعرضها صفحة «التحقق من جهة».';

CREATE TABLE `fraud_reports` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `report_no` VARCHAR(20) NOT NULL COMMENT 'رقم البلاغ BL-{season}-{n:05}',
  `entity_name` VARCHAR(160) NOT NULL COMMENT 'اسم الجهة المبلَّغ عنها',
  `unapproved_entity_id` BIGINT UNSIGNED NULL COMMENT 'الجهة إن كانت معروفة',
  `source` ENUM('whatsapp','facebook','phone','office-sign','middleman','other') NOT NULL COMMENT 'كيف وصلته: واتساب، فيسبوك، اتصال هاتفي، مكتب أو لافتة، شخص وسيط، أخرى',
  `details` TEXT NULL COMMENT 'التفاصيل',
  `reporter_account_id` BIGINT UNSIGNED NULL COMMENT 'المبلِّغ إن كان داخلاً',
  `status` ENUM('new','reviewing','closed') NOT NULL DEFAULT 'new' COMMENT 'الحالة',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fraud_reports_report_no` (`report_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الإبلاغ عن جهة — «أبلغ عن هذه الجهة» من صفحة التحقق. الكود يعرض رقم بلاغ ولا يحفظ شيئاً.';

CREATE TABLE `contact_messages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `ticket_no` VARCHAR(20) NOT NULL COMMENT 'رقم التذكرة SDH-{season}-{n:05}',
  `name` VARCHAR(120) NOT NULL COMMENT 'الاسم',
  `phone` VARCHAR(20) NOT NULL COMMENT 'الهاتف',
  `email` VARCHAR(160) NULL COMMENT 'البريد (اختياري)',
  `subject` VARCHAR(120) NOT NULL COMMENT 'الموضوع (من مواضيع النموذج)',
  `branch_slug` VARCHAR(40) NULL COMMENT 'الفرع (من دليل الفروع)',
  `message` TEXT NOT NULL COMMENT 'الرسالة (20 حرفاً على الأقل)',
  `status` ENUM('new','in_progress','answered','closed') NOT NULL DEFAULT 'new' COMMENT 'الحالة',
  `handled_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من تابعها',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_contact_messages_ticket_no` (`ticket_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='رسائل نموذج التواصل — رسالة من نموذج التواصل في «من نحن». الكود يعرض رقم تذكرة ولا يحفظ شيئاً.';

CREATE TABLE `umrah_notify_subscriptions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `phone` VARCHAR(20) NOT NULL COMMENT 'الهاتف',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  `notified_at` DATETIME(3) NULL COMMENT 'أُرسل التنبيه',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_umrah_notify_subscriptions_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='التنبيه عند إطلاق العمرة — هاتف من طلب التنبيه حين تُطلق خدمات العمرة. الكود يحفظه في المتصفح فقط.';

-- ───────────────────────────────────────────────────────────────
-- إدارة محتوى الصفحات: تغيير المحتوى بالكامل
-- ───────────────────────────────────────────────────────────────

CREATE TABLE `cms_section_types` (
  `type_key` VARCHAR(60) NOT NULL COMMENT 'المفتاح: home.hero، home.ticker، about.branches… للأقسام الحالية؛ وللعامة مثل generic.hero، generic.rich-text، generic.cards، generic.stats، generic.timeline، generic.people، generic.gallery، generic.video، generic.cta، generic.faq-feed، generic.news-feed',
  `label` VARCHAR(120) NOT NULL COMMENT 'الاسم المعروض للمحرر',
  `icon` VARCHAR(40) NOT NULL COMMENT 'أيقونة lucide (من سجل CMS_ICONS)',
  `note` VARCHAR(300) NULL COMMENT 'شرح للمحرر',
  `renderer` VARCHAR(120) NOT NULL COMMENT 'مكوّن الواجهة الذي يرسمه (مثل app/_home/hero)',
  `built_in` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'نوع خاص بقسم موجود (لا يُستعمل إلا في صفحته)',
  `reusable` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'يمكن إضافته إلى أي صفحة',
  PRIMARY KEY (`type_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='مكتبة أنواع الأقسام — كل نوع قسم يمكن وضعه في صفحة، بحقوله ومكوّن العرض الذي يرسمه. الأقسام الحالية أنواع خاصة (built_in)، وتُضاف أنواع عامة قابلة لإعادة الاستعمال.';

CREATE TABLE `cms_section_type_fields` (
  `type_key` VARCHAR(60) NOT NULL COMMENT 'نوع القسم',
  `field_key` VARCHAR(60) NOT NULL COMMENT 'مفتاح الحقل',
  `label` VARCHAR(160) NOT NULL COMMENT 'الاسم المعروض («العنوان»، «الكلمة المميّزة بالذهبي»، «صورة الخلفية»…)',
  `kind` ENUM('text','textarea','rich','number','boolean','image','video','url','select','icon','color','list','blocks') NOT NULL COMMENT 'النوع: text نص سطر، textarea نص طويل، rich نص منسّق، number رقم، boolean نعم/لا، image صورة، video فيديو، url رابط، select اختيار، icon أيقونة، color لون، list قائمة متكررة، blocks كتل (جسم المقال)',
  `hint` VARCHAR(300) NULL COMMENT 'تلميح',
  `placeholder` VARCHAR(160) NULL COMMENT 'نص إرشادي',
  `default_value` JSON NULL COMMENT 'القيمة الافتراضية',
  `options` JSON NULL COMMENT 'خيارات الاختيار [{value, label}]',
  `item_schema` JSON NULL COMMENT 'لحقل القائمة: حقول الصف الواحد بالشكل نفسه، واسم الصف ومفتاح عنوانه',
  `max_items` SMALLINT UNSIGNED NULL COMMENT 'أقصى عدد صفوف للقائمة',
  `min_value` DECIMAL(12,4) NULL COMMENT 'أدنى قيمة للرقم',
  `max_value` DECIMAL(12,4) NULL COMMENT 'أعلى قيمة',
  `step` DECIMAL(12,4) NULL COMMENT 'الخطوة',
  `translatable` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'له ترجمة إنجليزية',
  `sort_order` SMALLINT NOT NULL DEFAULT 0 COMMENT 'الترتيب في النموذج',
  PRIMARY KEY (`type_key`, `field_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='حقول كل نوع قسم — تعريف الحقول: نوعها وقيمتها الافتراضية وحدودها. القيمة الافتراضية هي محتوى الموقع عند الإطلاق، فالحقل الذي لم يُعدَّل يعرضها.';

CREATE TABLE `cms_pages` (
  `page_key` VARCHAR(60) NOT NULL COMMENT 'المفتاح: home، about، umrah، conditions، faq، guide، academy، news، prayer-times، results، verify، services، pilgrim-journey، global، أو مفتاح صفحة جديدة',
  `label` VARCHAR(120) NOT NULL COMMENT 'الاسم: «الصفحة الرئيسية»، «من نحن»، «العمرة»…',
  `path` VARCHAR(200) NULL COMMENT 'الرابط في الموقع (/، /about، /portal/journey…). NULL للعناصر المشتركة (global)',
  `group_label` VARCHAR(80) NOT NULL COMMENT 'القسم في قائمة المحرر: «الموقع العام»، «حساب الحاج»، «عناصر تظهر في كل الصفحات»',
  `icon` VARCHAR(40) NOT NULL COMMENT 'الأيقونة',
  `description` VARCHAR(300) NULL COMMENT 'الشرح',
  `is_required` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'لا تُؤرشف (الرئيسية، العناصر المشتركة)',
  `is_custom` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'صفحة أنشأها المحرر',
  `status` ENUM('draft','published','archived') NOT NULL DEFAULT 'published' COMMENT 'draft «مسودة» (لا تظهر للزوار)، published «منشورة»، archived «مؤرشفة». الكود يحفظ الحالة ولا يطبّقها على الصفحة كلها؛ هنا تُطبَّق',
  `seo_title` VARCHAR(160) NULL COMMENT 'عنوان الصفحة في المتصفح ومحركات البحث',
  `seo_description` VARCHAR(300) NULL COMMENT 'الوصف لمحركات البحث',
  `has_draft_changes` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'في المسودة ما لم يُنشر («فيها مسودة غير منشورة»)',
  `published_at` DATETIME(3) NULL COMMENT 'آخر نشر',
  `published_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من نشر',
  `archived_at` DATETIME(3) NULL COMMENT 'الأرشفة',
  `updated_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'آخر من عدّل',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`page_key`),
  UNIQUE KEY `uq_cms_pages_path` (`path`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='الصفحات — الصفحات القابلة للتحرير وحالتها. الصفحات الحالية الأربع عشرة، ويمكن إنشاء صفحات جديدة برابط جديد.';

CREATE TABLE `cms_page_sections` (
  `page_key` VARCHAR(60) NOT NULL COMMENT 'الصفحة',
  `version` ENUM('draft','published') NOT NULL COMMENT 'النسخة: draft المسودة التي يحررها الموظف، published ما يراه الزوار. «نشر» ينسخ المسودة فوق المنشور في معاملة واحدة',
  `section_key` VARCHAR(60) NOT NULL COMMENT 'مفتاح القسم في الصفحة: hero، ticker، honours، tutorials، directory، numbers، academy، verse، news، calendar… أو مفتاح قسم مضاف',
  `type_key` VARCHAR(60) NOT NULL COMMENT 'نوع القسم',
  `sort_order` SMALLINT NOT NULL COMMENT 'الترتيب في الصفحة',
  `hidden` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'مخفي عن الزوار',
  `archived_at` DATETIME(3) NULL COMMENT 'مؤرشف (يُستعاد من «الأرشيف»)',
  `is_required` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'لا يُخفى ولا يُؤرشف (الواجهة الرئيسية، الهوية، القائمة، التذييل)',
  PRIMARY KEY (`page_key`, `version`, `section_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='أقسام كل صفحة — الأقسام في الصفحة بترتيبها وظهورها، في المسودة وفي المنشور. ترتيب sort_order يُطبَّق في الموقع (الكود يحفظه ولا يطبّقه).';

CREATE TABLE `cms_field_values` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `page_key` VARCHAR(60) NOT NULL COMMENT 'الصفحة',
  `version` ENUM('draft','published') NOT NULL COMMENT 'النسخة: draft المسودة التي يحررها الموظف، published ما يراه الزوار. «نشر» ينسخ المسودة فوق المنشور في معاملة واحدة',
  `section_key` VARCHAR(60) NOT NULL COMMENT 'القسم',
  `field_key` VARCHAR(60) NOT NULL COMMENT 'الحقل',
  `locale` ENUM('ar','en') NOT NULL DEFAULT 'ar' COMMENT 'اللغة',
  `value` JSON NOT NULL COMMENT 'القيمة: نص، رقم، منطقي، معرّف ملف (file:<id>) أو مسار، مصفوفة صفوف للقائمة، أو كتل',
  `source_hash` CHAR(64) NULL COMMENT 'للإنجليزية: بصمة العربي وقت الترجمة (لكشف الترجمة القديمة)',
  `updated_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'آخر من عدّل (حفظ تلقائي أثناء الكتابة)',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'وقت آخر تعديل (UTC)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cms_field_values_120a4963` (`page_key`, `version`, `section_key`, `field_key`, `locale`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='قيم الحقول — القيمة المعدّلة لكل حقل، في المسودة أو المنشور، بكل لغة. الحقل بلا صف هنا يعرض قيمته الافتراضية، و«إرجاع» يحذف الصف.';

CREATE TABLE `cms_collection_settings` (
  `collection_key` VARCHAR(40) NOT NULL COMMENT 'المفتاح: news، faq، guideDays، guideDuas، clusters، academyTracks، academyLessons',
  `label` VARCHAR(120) NOT NULL COMMENT 'الاسم: «مقالات الأخبار والإعلانات»، «الأسئلة الشائعة»، «أيام دليل المناسك»، «أدعية دليل المناسك»، «التكتلات والحملات المعتمدة»، «مسارات الأكاديمية»، «دروس الأكاديمية»',
  `table_name` VARCHAR(60) NOT NULL COMMENT 'الجدول: news_articles، faqs، guide_days، guide_duas، cluster_directory_entries (مع البرنامج المعتمد من cluster_profile_versions)، academy_tracks، academy_lessons',
  `item_name` VARCHAR(40) NOT NULL COMMENT 'اسم العنصر («مقال»، «سؤال»…)',
  `path` VARCHAR(120) NOT NULL COMMENT 'رابط القائمة',
  `can_create` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'يسمح بإنشاء عناصر جديدة',
  `sort_order` TINYINT NOT NULL DEFAULT 0 COMMENT 'الترتيب',
  PRIMARY KEY (`collection_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='إعدادات مجموعات المحتوى — الأنواع المحررة من «مجموعات المحتوى» وجداولها. في النسخة التجريبية المجموعة تعيش في JSON والعناصر الجديدة توضع في روابط محجوزة مسبقاً (post-1…post-12) لأن الموقع يُصدَّر ثابتاً؛ هنا كل نوع جدول حقيقي بمفاتيح حقيقية.';

CREATE TABLE `cms_revisions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `scope` ENUM('page','collection','entity') NOT NULL COMMENT 'page صفحة كاملة (بنيتها وقيمها)، collection مجموعة محتوى كاملة بعناصرها وترتيبها (تُستعاد معاً)، entity عنصر واحد من جداول المحتوى (خبر، سؤال، درس…)',
  `collection_key` VARCHAR(40) NULL COMMENT 'المجموعة (للنطاق collection)',
  `page_key` VARCHAR(60) NULL COMMENT 'الصفحة',
  `entity_type` VARCHAR(40) NULL COMMENT 'جدول العنصر',
  `entity_id` BIGINT UNSIGNED NULL COMMENT 'معرّف العنصر',
  `note` VARCHAR(300) NOT NULL COMMENT 'وصف («نشر محتوى صفحة»، «إرجاع صفحة إلى المحتوى الأصلي»…)',
  `snapshot` JSON NOT NULL COMMENT 'اللقطة: للصفحة {status، sections[{key، type، sort، hidden، archived}]، values[{section، field، locale، value}]}؛ للمجموعة {items[{id، row}]، order[]}؛ للعنصر صفّه كاملاً',
  `created_by_staff_id` BIGINT UNSIGNED NOT NULL COMMENT 'من أحدثها',
  `created_by_title` VARCHAR(160) NOT NULL COMMENT 'مسماه وقتها',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  PRIMARY KEY (`id`),
  KEY `ix_cms_revisions_page_key_created_at` (`page_key`, `created_at`),
  KEY `ix_cms_revisions_entity_type_entity_id` (`entity_type`, `entity_id`),
  CONSTRAINT `ck_cms_revisions_1` CHECK ((scope = 'page') = (page_key IS NOT NULL)),
  CONSTRAINT `ck_cms_revisions_2` CHECK ((scope = 'collection') = (collection_key IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='النسخ السابقة — لقطة كاملة قبل كل نشر، أو تغيير حالة صفحة، أو إرجاعها للأصل، أو نشر عنصر محتوى. «استعادة» تنسخ اللقطة إلى المسودة لتُنشر.';

CREATE TABLE `cms_scheduled_publications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `page_key` VARCHAR(60) NULL COMMENT 'الصفحة',
  `entity_type` VARCHAR(40) NULL COMMENT 'جدول العنصر',
  `entity_id` BIGINT UNSIGNED NULL COMMENT 'معرّف العنصر',
  `publish_at` DATETIME(3) NOT NULL COMMENT 'موعد النشر',
  `snapshot` JSON NOT NULL COMMENT 'المسودة المراد نشرها وقت الجدولة',
  `scheduled_by_staff_id` BIGINT UNSIGNED NOT NULL COMMENT 'من جدول',
  `done_at` DATETIME(3) NULL COMMENT 'نُفّذ',
  `cancelled_at` DATETIME(3) NULL COMMENT 'أُلغي',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='النشر المجدول — نشر صفحة أو عنصر في موعد لاحق. غير موجود في النسخة التجريبية (النشر فوري دائماً).';

CREATE TABLE `cms_staff_roles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'المعرّف الداخلي، يتولّد تلقائياً',
  `staff_user_id` BIGINT UNSIGNED NOT NULL COMMENT 'الموظف',
  `role` ENUM('editor','publisher','admin') NOT NULL COMMENT 'editor يحرر المسودة ويعاين، publisher ينشر ويؤرشف ويستعيد، admin يدير الأنواع والصفحات الجديدة والاستيراد',
  `page_key` VARCHAR(60) NULL COMMENT 'يقتصر على صفحة (NULL = كل الصفحات)',
  `collection_key` VARCHAR(40) NULL COMMENT 'يقتصر على مجموعة (NULL = الكل)',
  `granted_by_staff_id` BIGINT UNSIGNED NULL COMMENT 'من منح',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'وقت الإنشاء (UTC)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='أدوار المحتوى — الكود يملك صلاحية واحدة (content.manage) تسمح بكل شيء: التحرير والنشر والأرشفة والإرجاع واستيراد الحالة كلها وحذف الوسائط. هنا فصل بين المحرر والناشر، ونطاق اختياري.';

-- ───────────────────────────────────────────────────────────────
-- العلاقات (596 مفتاحاً أجنبياً)
-- ───────────────────────────────────────────────────────────────

ALTER TABLE `seasons` ADD CONSTRAINT `fk_seasons_copied_from_version_id` FOREIGN KEY (`copied_from_version_id`) REFERENCES `reg_config_versions` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `seasons` ADD CONSTRAINT `fk_seasons_created_by_staff_id` FOREIGN KEY (`created_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `season_settings` ADD CONSTRAINT `fk_season_settings_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `season_settings` ADD CONSTRAINT `fk_season_settings_updated_by_staff_id` FOREIGN KEY (`updated_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `season_calendar` ADD CONSTRAINT `fk_season_calendar_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `offices` ADD CONSTRAINT `fk_offices_governorate_code` FOREIGN KEY (`governorate_code`) REFERENCES `governorates` (`code`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `operations` ADD CONSTRAINT `fk_operations_control_permission` FOREIGN KEY (`control_permission`) REFERENCES `permissions` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `operation_windows` ADD CONSTRAINT `fk_operation_windows_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `operation_windows` ADD CONSTRAINT `fk_operation_windows_operation_code` FOREIGN KEY (`operation_code`) REFERENCES `operations` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `operation_windows` ADD CONSTRAINT `fk_operation_windows_updated_by_staff_id` FOREIGN KEY (`updated_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `files` ADD CONSTRAINT `fk_files_uploaded_by_staff_id` FOREIGN KEY (`uploaded_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `files` ADD CONSTRAINT `fk_files_uploaded_by_account_id` FOREIGN KEY (`uploaded_by_account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `audit_events` ADD CONSTRAINT `fk_audit_events_actor_staff_id` FOREIGN KEY (`actor_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `audit_events` ADD CONSTRAINT `fk_audit_events_actor_account_id` FOREIGN KEY (`actor_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `audit_events` ADD CONSTRAINT `fk_audit_events_system_code` FOREIGN KEY (`system_code`) REFERENCES `management_systems` (`code`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `audit_events` ADD CONSTRAINT `fk_audit_events_subject_account_id` FOREIGN KEY (`subject_account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `audit_events` ADD CONSTRAINT `fk_audit_events_application_id` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `notifications` ADD CONSTRAINT `fk_notifications_account_id` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `notifications` ADD CONSTRAINT `fk_notifications_staff_user_id` FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `notification_deliveries` ADD CONSTRAINT `fk_notification_deliveries_notification_id` FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `otp_challenges` ADD CONSTRAINT `fk_otp_challenges_national_id` FOREIGN KEY (`national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `auth_sessions` ADD CONSTRAINT `fk_auth_sessions_account_id` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `auth_sessions` ADD CONSTRAINT `fk_auth_sessions_staff_user_id` FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `identity_attempts` ADD CONSTRAINT `fk_identity_attempts_by_staff_id` FOREIGN KEY (`by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `identity_attempts` ADD CONSTRAINT `fk_identity_attempts_by_account_id` FOREIGN KEY (`by_account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `civil_persons` ADD CONSTRAINT `fk_civil_persons_governorate_code` FOREIGN KEY (`governorate_code`) REFERENCES `governorates` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `civil_persons` ADD CONSTRAINT `fk_civil_persons_family_book_no` FOREIGN KEY (`family_book_no`) REFERENCES `family_books` (`book_no`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `civil_persons` ADD CONSTRAINT `fk_civil_persons_father_id` FOREIGN KEY (`father_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `civil_persons` ADD CONSTRAINT `fk_civil_persons_mother_id` FOREIGN KEY (`mother_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `family_books` ADD CONSTRAINT `fk_family_books_head_national_id` FOREIGN KEY (`head_national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `family_books` ADD CONSTRAINT `fk_family_books_governorate_code` FOREIGN KEY (`governorate_code`) REFERENCES `governorates` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `person_spouses` ADD CONSTRAINT `fk_person_spouses_national_id` FOREIGN KEY (`national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `person_spouses` ADD CONSTRAINT `fk_person_spouses_spouse_national_id` FOREIGN KEY (`spouse_national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `accounts` ADD CONSTRAINT `fk_accounts_national_id` FOREIGN KEY (`national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `accounts` ADD CONSTRAINT `fk_accounts_created_by_staff_id` FOREIGN KEY (`created_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `accounts` ADD CONSTRAINT `fk_accounts_created_by_account_id` FOREIGN KEY (`created_by_account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `accounts` ADD CONSTRAINT `fk_accounts_photo_file_id` FOREIGN KEY (`photo_file_id`) REFERENCES `files` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `account_season_paths` ADD CONSTRAINT `fk_account_season_paths_account_id` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `account_season_paths` ADD CONSTRAINT `fk_account_season_paths_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `civil_claims` ADD CONSTRAINT `fk_civil_claims_account_id` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `civil_claims` ADD CONSTRAINT `fk_civil_claims_doc_file_id` FOREIGN KEY (`doc_file_id`) REFERENCES `files` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `civil_claims` ADD CONSTRAINT `fk_civil_claims_decided_by_staff_id` FOREIGN KEY (`decided_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `civil_claim_fields` ADD CONSTRAINT `fk_civil_claim_fields_claim_id` FOREIGN KEY (`claim_id`) REFERENCES `civil_claims` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `account_season_history` ADD CONSTRAINT `fk_account_season_history_national_id` FOREIGN KEY (`national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `account_season_history` ADD CONSTRAINT `fk_account_season_history_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `account_season_history` ADD CONSTRAINT `fk_account_season_history_role_key` FOREIGN KEY (`role_key`) REFERENCES `admin_roles` (`role_key`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `reg_config_versions` ADD CONSTRAINT `fk_reg_config_versions_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `reg_config_versions` ADD CONSTRAINT `fk_reg_config_versions_based_on_version_id` FOREIGN KEY (`based_on_version_id`) REFERENCES `reg_config_versions` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `reg_config_versions` ADD CONSTRAINT `fk_reg_config_versions_published_by_staff_id` FOREIGN KEY (`published_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `reg_config_drafts` ADD CONSTRAINT `fk_reg_config_drafts_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `reg_config_drafts` ADD CONSTRAINT `fk_reg_config_drafts_base_version_id` FOREIGN KEY (`base_version_id`) REFERENCES `reg_config_versions` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `reg_config_drafts` ADD CONSTRAINT `fk_reg_config_drafts_updated_by_staff_id` FOREIGN KEY (`updated_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `reg_form_fields` ADD CONSTRAINT `fk_reg_form_fields_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `reg_form_fields` ADD CONSTRAINT `fk_reg_form_fields_first_version_id` FOREIGN KEY (`first_version_id`) REFERENCES `reg_config_versions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `direct_age_announcements` ADD CONSTRAINT `fk_direct_age_announcements_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `direct_age_announcements` ADD CONSTRAINT `fk_direct_age_announcements_issued_by_staff_id` FOREIGN KEY (`issued_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `direct_age_announcements` ADD CONSTRAINT `fk_direct_age_announcements_approved_by_staff_id` FOREIGN KEY (`approved_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `lottery_draws` ADD CONSTRAINT `fk_lottery_draws_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `lottery_draws` ADD CONSTRAINT `fk_lottery_draws_entered_by_staff_id` FOREIGN KEY (`entered_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `lottery_draws` ADD CONSTRAINT `fk_lottery_draws_sent_by_staff_id` FOREIGN KEY (`sent_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `lottery_draws` ADD CONSTRAINT `fk_lottery_draws_published_by_staff_id` FOREIGN KEY (`published_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `lottery_draw_picks` ADD CONSTRAINT `fk_lottery_draw_picks_draw_id` FOREIGN KEY (`draw_id`) REFERENCES `lottery_draws` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `application_drafts` ADD CONSTRAINT `fk_application_drafts_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `application_drafts` ADD CONSTRAINT `fk_application_drafts_owner_account_id` FOREIGN KEY (`owner_account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `application_drafts` ADD CONSTRAINT `fk_application_drafts_config_version_id` FOREIGN KEY (`config_version_id`) REFERENCES `reg_config_versions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `application_drafts` ADD CONSTRAINT `fk_application_drafts_family_book_no` FOREIGN KEY (`family_book_no`) REFERENCES `family_books` (`book_no`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `application_drafts` ADD CONSTRAINT `fk_application_drafts_applicant_consent_otp_id` FOREIGN KEY (`applicant_consent_otp_id`) REFERENCES `otp_challenges` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `application_draft_members` ADD CONSTRAINT `fk_application_draft_members_draft_id` FOREIGN KEY (`draft_id`) REFERENCES `application_drafts` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `application_draft_members` ADD CONSTRAINT `fk_application_draft_members_national_id` FOREIGN KEY (`national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `application_draft_members` ADD CONSTRAINT `fk_application_draft_members_companion_national_id` FOREIGN KEY (`companion_national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `applications` ADD CONSTRAINT `fk_applications_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `applications` ADD CONSTRAINT `fk_applications_owner_account_id` FOREIGN KEY (`owner_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `applications` ADD CONSTRAINT `fk_applications_applicant_national_id` FOREIGN KEY (`applicant_national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `applications` ADD CONSTRAINT `fk_applications_office_id` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `applications` ADD CONSTRAINT `fk_applications_config_version_id` FOREIGN KEY (`config_version_id`) REFERENCES `reg_config_versions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `applications` ADD CONSTRAINT `fk_applications_previous_application_id` FOREIGN KEY (`previous_application_id`) REFERENCES `applications` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `applications` ADD CONSTRAINT `fk_applications_credit_from_application_id` FOREIGN KEY (`credit_from_application_id`) REFERENCES `applications` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `applications` ADD CONSTRAINT `fk_applications_submitted_by_staff_id` FOREIGN KEY (`submitted_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `applications` ADD CONSTRAINT `fk_applications_submitted_by_account_id` FOREIGN KEY (`submitted_by_account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `applications` ADD CONSTRAINT `fk_applications_lottery_draw_id` FOREIGN KEY (`lottery_draw_id`) REFERENCES `lottery_draws` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `application_status_history` ADD CONSTRAINT `fk_application_status_history_application_id` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `application_status_history` ADD CONSTRAINT `fk_application_status_history_staff_user_id` FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `application_status_history` ADD CONSTRAINT `fk_application_status_history_account_id` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `application_members` ADD CONSTRAINT `fk_application_members_application_id` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `application_members` ADD CONSTRAINT `fk_application_members_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `application_members` ADD CONSTRAINT `fk_application_members_national_id` FOREIGN KEY (`national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `application_members` ADD CONSTRAINT `fk_application_members_companion_national_id` FOREIGN KEY (`companion_national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `application_answers` ADD CONSTRAINT `fk_application_answers_application_id` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `application_answers` ADD CONSTRAINT `fk_application_answers_member_national_id` FOREIGN KEY (`member_national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `application_consents` ADD CONSTRAINT `fk_application_consents_draft_id` FOREIGN KEY (`draft_id`) REFERENCES `application_drafts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `application_consents` ADD CONSTRAINT `fk_application_consents_application_id` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `application_consents` ADD CONSTRAINT `fk_application_consents_national_id` FOREIGN KEY (`national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `application_consents` ADD CONSTRAINT `fk_application_consents_otp_challenge_id` FOREIGN KEY (`otp_challenge_id`) REFERENCES `otp_challenges` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `application_reviews` ADD CONSTRAINT `fk_application_reviews_application_id` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `application_reviews` ADD CONSTRAINT `fk_application_reviews_decided_by_staff_id` FOREIGN KEY (`decided_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `payments` ADD CONSTRAINT `fk_payments_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `payments` ADD CONSTRAINT `fk_payments_payer_account_id` FOREIGN KEY (`payer_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `payments` ADD CONSTRAINT `fk_payments_application_id` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `payments` ADD CONSTRAINT `fk_payments_admin_season_file_id` FOREIGN KEY (`admin_season_file_id`) REFERENCES `admin_season_files` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `payments` ADD CONSTRAINT `fk_payments_group_id` FOREIGN KEY (`group_id`) REFERENCES `admin_groups` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `payments` ADD CONSTRAINT `fk_payments_cluster_id` FOREIGN KEY (`cluster_id`) REFERENCES `clusters` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `payments` ADD CONSTRAINT `fk_payments_bank_slip_file_id` FOREIGN KEY (`bank_slip_file_id`) REFERENCES `files` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `payments` ADD CONSTRAINT `fk_payments_confirmed_by_staff_id` FOREIGN KEY (`confirmed_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `payments` ADD CONSTRAINT `fk_payments_collected_by_staff_id` FOREIGN KEY (`collected_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `payment_items` ADD CONSTRAINT `fk_payment_items_payment_id` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `refunds` ADD CONSTRAINT `fk_refunds_payment_id` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `refunds` ADD CONSTRAINT `fk_refunds_application_id` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `refunds` ADD CONSTRAINT `fk_refunds_decided_by_staff_id` FOREIGN KEY (`decided_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `post_acceptance` ADD CONSTRAINT `fk_post_acceptance_application_id` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `post_acceptance` ADD CONSTRAINT `fk_post_acceptance_cluster_id` FOREIGN KEY (`cluster_id`) REFERENCES `clusters` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `post_acceptance` ADD CONSTRAINT `fk_post_acceptance_group_id` FOREIGN KEY (`group_id`) REFERENCES `admin_groups` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `post_acceptance` ADD CONSTRAINT `fk_post_acceptance_enrolled_by_staff_id` FOREIGN KEY (`enrolled_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `post_acceptance` ADD CONSTRAINT `fk_post_acceptance_enrolled_by_account_id` FOREIGN KEY (`enrolled_by_account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `post_step_ratings` ADD CONSTRAINT `fk_post_step_ratings_application_id` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `post_custom_step_completions` ADD CONSTRAINT `fk_post_custom_step_completions_application_id` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `member_documents` ADD CONSTRAINT `fk_member_documents_application_id` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `member_documents` ADD CONSTRAINT `fk_member_documents_national_id` FOREIGN KEY (`national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `member_documents` ADD CONSTRAINT `fk_member_documents_file_id` FOREIGN KEY (`file_id`) REFERENCES `files` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `member_documents` ADD CONSTRAINT `fk_member_documents_reviewed_by_staff_id` FOREIGN KEY (`reviewed_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `group_enrollment_contracts` ADD CONSTRAINT `fk_group_enrollment_contracts_application_id` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `group_enrollment_contracts` ADD CONSTRAINT `fk_group_enrollment_contracts_group_id` FOREIGN KEY (`group_id`) REFERENCES `admin_groups` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `group_enrollment_contracts` ADD CONSTRAINT `fk_group_enrollment_contracts_cluster_id` FOREIGN KEY (`cluster_id`) REFERENCES `clusters` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `group_enrollment_contracts` ADD CONSTRAINT `fk_group_enrollment_contracts_transfer_from_group_id` FOREIGN KEY (`transfer_from_group_id`) REFERENCES `admin_groups` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `group_enrollment_contracts` ADD CONSTRAINT `fk_group_enrollment_contracts_file_id` FOREIGN KEY (`file_id`) REFERENCES `files` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `group_enrollment_contracts` ADD CONSTRAINT `fk_group_enrollment_contracts_uploaded_by_staff_id` FOREIGN KEY (`uploaded_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `group_enrollment_contracts` ADD CONSTRAINT `fk_group_enrollment_contracts_uploaded_by_account_id` FOREIGN KEY (`uploaded_by_account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `group_enrollment_contracts` ADD CONSTRAINT `fk_group_enrollment_contracts_decided_by_staff_id` FOREIGN KEY (`decided_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `application_group_transfers` ADD CONSTRAINT `fk_application_group_transfers_application_id` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `application_group_transfers` ADD CONSTRAINT `fk_application_group_transfers_from_group_id` FOREIGN KEY (`from_group_id`) REFERENCES `admin_groups` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `application_group_transfers` ADD CONSTRAINT `fk_application_group_transfers_to_group_id` FOREIGN KEY (`to_group_id`) REFERENCES `admin_groups` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `application_group_transfers` ADD CONSTRAINT `fk_application_group_transfers_contract_id` FOREIGN KEY (`contract_id`) REFERENCES `group_enrollment_contracts` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `group_family_acknowledgements` ADD CONSTRAINT `fk_group_family_acknowledgements_group_id` FOREIGN KEY (`group_id`) REFERENCES `admin_groups` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `group_family_acknowledgements` ADD CONSTRAINT `fk_group_family_acknowledgements_application_id` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `group_family_acknowledgements` ADD CONSTRAINT `fk_group_family_acknowledgements_by_account_id` FOREIGN KEY (`by_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `application_accommodation` ADD CONSTRAINT `fk_application_accommodation_application_id` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `application_accommodation_rooms` ADD CONSTRAINT `fk_application_accommodation_rooms_application_id` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `application_payment_lines` ADD CONSTRAINT `fk_application_payment_lines_application_id` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `application_payment_lines` ADD CONSTRAINT `fk_application_payment_lines_payment_item_id` FOREIGN KEY (`payment_item_id`) REFERENCES `payment_items` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `health_files` ADD CONSTRAINT `fk_health_files_application_id` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `health_files` ADD CONSTRAINT `fk_health_files_recorded_by_account_id` FOREIGN KEY (`recorded_by_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `health_records` ADD CONSTRAINT `fk_health_records_application_id` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `health_records` ADD CONSTRAINT `fk_health_records_national_id` FOREIGN KEY (`national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `medical_document_types` ADD CONSTRAINT `fk_medical_document_types_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `member_medical_documents` ADD CONSTRAINT `fk_member_medical_documents_application_id` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `member_medical_documents` ADD CONSTRAINT `fk_member_medical_documents_national_id` FOREIGN KEY (`national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `member_medical_documents` ADD CONSTRAINT `fk_member_medical_documents_file_id` FOREIGN KEY (`file_id`) REFERENCES `files` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `member_medical_documents` ADD CONSTRAINT `fk_member_medical_documents_reviewed_by_staff_id` FOREIGN KEY (`reviewed_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `member_health_docs` ADD CONSTRAINT `fk_member_health_docs_application_id` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `member_health_docs` ADD CONSTRAINT `fk_member_health_docs_national_id` FOREIGN KEY (`national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `member_health_docs` ADD CONSTRAINT `fk_member_health_docs_file_id` FOREIGN KEY (`file_id`) REFERENCES `files` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `member_health_docs` ADD CONSTRAINT `fk_member_health_docs_added_by_account_id` FOREIGN KEY (`added_by_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `member_visas` ADD CONSTRAINT `fk_member_visas_application_id` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `member_visas` ADD CONSTRAINT `fk_member_visas_national_id` FOREIGN KEY (`national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `member_visas` ADD CONSTRAINT `fk_member_visas_file_id` FOREIGN KEY (`file_id`) REFERENCES `files` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `member_visas` ADD CONSTRAINT `fk_member_visas_added_by_account_id` FOREIGN KEY (`added_by_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `member_visas` ADD CONSTRAINT `fk_member_visas_removed_by_account_id` FOREIGN KEY (`removed_by_account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `season_ratings` ADD CONSTRAINT `fk_season_ratings_application_id` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `pilgrim_evaluations` ADD CONSTRAINT `fk_pilgrim_evaluations_application_id` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `ticket_kinds` ADD CONSTRAINT `fk_ticket_kinds_handling_permission` FOREIGN KEY (`handling_permission`) REFERENCES `permissions` (`code`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `tickets` ADD CONSTRAINT `fk_tickets_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `tickets` ADD CONSTRAINT `fk_tickets_kind` FOREIGN KEY (`kind`) REFERENCES `ticket_kinds` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `tickets` ADD CONSTRAINT `fk_tickets_application_id` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `tickets` ADD CONSTRAINT `fk_tickets_raised_by_account_id` FOREIGN KEY (`raised_by_account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `tickets` ADD CONSTRAINT `fk_tickets_raised_by_staff_id` FOREIGN KEY (`raised_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `tickets` ADD CONSTRAINT `fk_tickets_subject_national_id` FOREIGN KEY (`subject_national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `tickets` ADD CONSTRAINT `fk_tickets_group_id` FOREIGN KEY (`group_id`) REFERENCES `admin_groups` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `tickets` ADD CONSTRAINT `fk_tickets_cluster_id` FOREIGN KEY (`cluster_id`) REFERENCES `clusters` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `tickets` ADD CONSTRAINT `fk_tickets_flight_id` FOREIGN KEY (`flight_id`) REFERENCES `flights` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `tickets` ADD CONSTRAINT `fk_tickets_photo_file_id` FOREIGN KEY (`photo_file_id`) REFERENCES `files` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `tickets` ADD CONSTRAINT `fk_tickets_assignee_staff_id` FOREIGN KEY (`assignee_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `ticket_updates` ADD CONSTRAINT `fk_ticket_updates_ticket_id` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `ticket_updates` ADD CONSTRAINT `fk_ticket_updates_author_staff_id` FOREIGN KEY (`author_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `ticket_updates` ADD CONSTRAINT `fk_ticket_updates_author_account_id` FOREIGN KEY (`author_account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `hajj_certificates` ADD CONSTRAINT `fk_hajj_certificates_application_id` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `hajj_certificates` ADD CONSTRAINT `fk_hajj_certificates_national_id` FOREIGN KEY (`national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `hajj_certificates` ADD CONSTRAINT `fk_hajj_certificates_file_id` FOREIGN KEY (`file_id`) REFERENCES `files` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `admin_roles` ADD CONSTRAINT `fk_admin_roles_exam_as_role_key` FOREIGN KEY (`exam_as_role_key`) REFERENCES `admin_roles` (`role_key`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `admin_role_exams` ADD CONSTRAINT `fk_admin_role_exams_role_key` FOREIGN KEY (`role_key`) REFERENCES `admin_roles` (`role_key`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `admin_role_exams` ADD CONSTRAINT `fk_admin_role_exams_exam_role_key` FOREIGN KEY (`exam_role_key`) REFERENCES `admin_roles` (`role_key`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `admin_role_labels` ADD CONSTRAINT `fk_admin_role_labels_base_role_key` FOREIGN KEY (`base_role_key`) REFERENCES `admin_roles` (`role_key`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `category_rules` ADD CONSTRAINT `fk_category_rules_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `category_rules` ADD CONSTRAINT `fk_category_rules_tier_key` FOREIGN KEY (`tier_key`) REFERENCES `service_tiers` (`tier_key`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `category_rules` ADD CONSTRAINT `fk_category_rules_category_key` FOREIGN KEY (`category_key`) REFERENCES `group_categories` (`category_key`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `tier_compositions` ADD CONSTRAINT `fk_tier_compositions_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `tier_compositions` ADD CONSTRAINT `fk_tier_compositions_tier_key` FOREIGN KEY (`tier_key`) REFERENCES `service_tiers` (`tier_key`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `admin_season_rules` ADD CONSTRAINT `fk_admin_season_rules_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `admin_season_rules` ADD CONSTRAINT `fk_admin_season_rules_updated_by_staff_id` FOREIGN KEY (`updated_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `role_requirements` ADD CONSTRAINT `fk_role_requirements_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `role_requirements` ADD CONSTRAINT `fk_role_requirements_role_key` FOREIGN KEY (`role_key`) REFERENCES `admin_roles` (`role_key`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `role_requirement_rows` ADD CONSTRAINT `fk_role_requirement_rows_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `admin_role_permissions` ADD CONSTRAINT `fk_admin_role_permissions_role_key` FOREIGN KEY (`role_key`) REFERENCES `admin_roles` (`role_key`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `admin_calendar` ADD CONSTRAINT `fk_admin_calendar_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `evaluation_stages` ADD CONSTRAINT `fk_evaluation_stages_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `admin_vault_documents` ADD CONSTRAINT `fk_admin_vault_documents_account_id` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `admin_vault_documents` ADD CONSTRAINT `fk_admin_vault_documents_doc_key` FOREIGN KEY (`doc_key`) REFERENCES `admin_doc_types` (`doc_key`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `admin_vault_documents` ADD CONSTRAINT `fk_admin_vault_documents_file_id` FOREIGN KEY (`file_id`) REFERENCES `files` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `account_languages` ADD CONSTRAINT `fk_account_languages_account_id` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `account_languages` ADD CONSTRAINT `fk_account_languages_language_id` FOREIGN KEY (`language_id`) REFERENCES `languages` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `account_skills` ADD CONSTRAINT `fk_account_skills_account_id` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `account_skills` ADD CONSTRAINT `fk_account_skills_skill_key` FOREIGN KEY (`skill_key`) REFERENCES `skills` (`skill_key`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `admin_season_files` ADD CONSTRAINT `fk_admin_season_files_account_id` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `admin_season_files` ADD CONSTRAINT `fk_admin_season_files_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `admin_season_files` ADD CONSTRAINT `fk_admin_season_files_role_key` FOREIGN KEY (`role_key`) REFERENCES `admin_roles` (`role_key`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `admin_season_files` ADD CONSTRAINT `fk_admin_season_files_fee_payment_id` FOREIGN KEY (`fee_payment_id`) REFERENCES `payments` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `admin_commitment_acceptances` ADD CONSTRAINT `fk_admin_commitment_acceptances_admin_season_file_id` FOREIGN KEY (`admin_season_file_id`) REFERENCES `admin_season_files` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `admin_commitment_acceptances` ADD CONSTRAINT `fk_admin_commitment_acceptances_commitment_key` FOREIGN KEY (`commitment_key`) REFERENCES `admin_commitments` (`commitment_key`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `exam_questions` ADD CONSTRAINT `fk_exam_questions_category_code` FOREIGN KEY (`category_code`) REFERENCES `exam_question_categories` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `exam_questions` ADD CONSTRAINT `fk_exam_questions_replaces_question_id` FOREIGN KEY (`replaces_question_id`) REFERENCES `exam_questions` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `exam_questions` ADD CONSTRAINT `fk_exam_questions_created_by_staff_id` FOREIGN KEY (`created_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `exam_question_options` ADD CONSTRAINT `fk_exam_question_options_question_id` FOREIGN KEY (`question_id`) REFERENCES `exam_questions` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `exam_question_roles` ADD CONSTRAINT `fk_exam_question_roles_question_id` FOREIGN KEY (`question_id`) REFERENCES `exam_questions` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `exam_question_roles` ADD CONSTRAINT `fk_exam_question_roles_role_key` FOREIGN KEY (`role_key`) REFERENCES `admin_roles` (`role_key`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `exam_centers` ADD CONSTRAINT `fk_exam_centers_supervisor_staff_id` FOREIGN KEY (`supervisor_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `exam_center_governorates` ADD CONSTRAINT `fk_exam_center_governorates_center_id` FOREIGN KEY (`center_id`) REFERENCES `exam_centers` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `exam_center_governorates` ADD CONSTRAINT `fk_exam_center_governorates_governorate_code` FOREIGN KEY (`governorate_code`) REFERENCES `governorates` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `exam_supervisor_pins` ADD CONSTRAINT `fk_exam_supervisor_pins_staff_user_id` FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `exams` ADD CONSTRAINT `fk_exams_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `exams` ADD CONSTRAINT `fk_exams_role_key` FOREIGN KEY (`role_key`) REFERENCES `admin_roles` (`role_key`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `exam_center_links` ADD CONSTRAINT `fk_exam_center_links_exam_id` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `exam_center_links` ADD CONSTRAINT `fk_exam_center_links_center_id` FOREIGN KEY (`center_id`) REFERENCES `exam_centers` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `exam_sections` ADD CONSTRAINT `fk_exam_sections_exam_id` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `exam_section_categories` ADD CONSTRAINT `fk_exam_section_categories_section_id` FOREIGN KEY (`section_id`) REFERENCES `exam_sections` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `exam_section_categories` ADD CONSTRAINT `fk_exam_section_categories_category_code` FOREIGN KEY (`category_code`) REFERENCES `exam_question_categories` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `exam_center_moves` ADD CONSTRAINT `fk_exam_center_moves_admin_season_file_id` FOREIGN KEY (`admin_season_file_id`) REFERENCES `admin_season_files` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `exam_center_moves` ADD CONSTRAINT `fk_exam_center_moves_center_id` FOREIGN KEY (`center_id`) REFERENCES `exam_centers` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `exam_center_moves` ADD CONSTRAINT `fk_exam_center_moves_moved_by_staff_id` FOREIGN KEY (`moved_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `exam_sittings` ADD CONSTRAINT `fk_exam_sittings_exam_id` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `exam_sittings` ADD CONSTRAINT `fk_exam_sittings_center_id` FOREIGN KEY (`center_id`) REFERENCES `exam_centers` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `exam_sittings` ADD CONSTRAINT `fk_exam_sittings_opened_by_staff_id` FOREIGN KEY (`opened_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `exam_sitting_participants` ADD CONSTRAINT `fk_exam_sitting_participants_sitting_id` FOREIGN KEY (`sitting_id`) REFERENCES `exam_sittings` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `exam_sitting_participants` ADD CONSTRAINT `fk_exam_sitting_participants_admin_season_file_id` FOREIGN KEY (`admin_season_file_id`) REFERENCES `admin_season_files` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `exam_attempts` ADD CONSTRAINT `fk_exam_attempts_admin_season_file_id` FOREIGN KEY (`admin_season_file_id`) REFERENCES `admin_season_files` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `exam_attempts` ADD CONSTRAINT `fk_exam_attempts_exam_id` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `exam_attempts` ADD CONSTRAINT `fk_exam_attempts_exam_role_key` FOREIGN KEY (`exam_role_key`) REFERENCES `admin_roles` (`role_key`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `exam_attempts` ADD CONSTRAINT `fk_exam_attempts_sitting_id` FOREIGN KEY (`sitting_id`) REFERENCES `exam_sittings` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `exam_attempts` ADD CONSTRAINT `fk_exam_attempts_confirmed_by_staff_id` FOREIGN KEY (`confirmed_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `exam_attempts` ADD CONSTRAINT `fk_exam_attempts_decision_by_staff_id` FOREIGN KEY (`decision_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `exam_attempt_questions` ADD CONSTRAINT `fk_exam_attempt_questions_attempt_id` FOREIGN KEY (`attempt_id`) REFERENCES `exam_attempts` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `exam_attempt_questions` ADD CONSTRAINT `fk_exam_attempt_questions_section_id` FOREIGN KEY (`section_id`) REFERENCES `exam_sections` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `exam_attempt_questions` ADD CONSTRAINT `fk_exam_attempt_questions_question_id` FOREIGN KEY (`question_id`) REFERENCES `exam_questions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `exam_attempt_section_scores` ADD CONSTRAINT `fk_exam_attempt_section_scores_attempt_id` FOREIGN KEY (`attempt_id`) REFERENCES `exam_attempts` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `exam_attempt_section_scores` ADD CONSTRAINT `fk_exam_attempt_section_scores_section_id` FOREIGN KEY (`section_id`) REFERENCES `exam_sections` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oral_slots` ADD CONSTRAINT `fk_oral_slots_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oral_slots` ADD CONSTRAINT `fk_oral_slots_role_key` FOREIGN KEY (`role_key`) REFERENCES `admin_roles` (`role_key`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oral_slots` ADD CONSTRAINT `fk_oral_slots_center_id` FOREIGN KEY (`center_id`) REFERENCES `exam_centers` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oral_bookings` ADD CONSTRAINT `fk_oral_bookings_admin_season_file_id` FOREIGN KEY (`admin_season_file_id`) REFERENCES `admin_season_files` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `oral_bookings` ADD CONSTRAINT `fk_oral_bookings_slot_id` FOREIGN KEY (`slot_id`) REFERENCES `oral_slots` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `oral_bookings` ADD CONSTRAINT `fk_oral_bookings_recorded_by_staff_id` FOREIGN KEY (`recorded_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `admin_groups` ADD CONSTRAINT `fk_admin_groups_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `admin_groups` ADD CONSTRAINT `fk_admin_groups_head_account_id` FOREIGN KEY (`head_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `admin_groups` ADD CONSTRAINT `fk_admin_groups_category_key` FOREIGN KEY (`category_key`) REFERENCES `group_categories` (`category_key`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `admin_groups` ADD CONSTRAINT `fk_admin_groups_cluster_id` FOREIGN KEY (`cluster_id`) REFERENCES `clusters` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `admin_groups` ADD CONSTRAINT `fk_admin_groups_fee_payment_id` FOREIGN KEY (`fee_payment_id`) REFERENCES `payments` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `admin_groups` ADD CONSTRAINT `fk_admin_groups_contract_file_id` FOREIGN KEY (`contract_file_id`) REFERENCES `files` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `admin_groups` ADD CONSTRAINT `fk_admin_groups_approved_by_staff_id` FOREIGN KEY (`approved_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `admin_groups` ADD CONSTRAINT `fk_admin_groups_returned_by_staff_id` FOREIGN KEY (`returned_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `group_seats` ADD CONSTRAINT `fk_group_seats_group_id` FOREIGN KEY (`group_id`) REFERENCES `admin_groups` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `group_seats` ADD CONSTRAINT `fk_group_seats_account_id` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `group_seats` ADD CONSTRAINT `fk_group_seats_by_administration_staff_id` FOREIGN KEY (`by_administration_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `clusters` ADD CONSTRAINT `fk_clusters_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `clusters` ADD CONSTRAINT `fk_clusters_head_account_id` FOREIGN KEY (`head_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `clusters` ADD CONSTRAINT `fk_clusters_tier_key` FOREIGN KEY (`tier_key`) REFERENCES `service_tiers` (`tier_key`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `clusters` ADD CONSTRAINT `fk_clusters_decided_by_staff_id` FOREIGN KEY (`decided_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `clusters` ADD CONSTRAINT `fk_clusters_created_by_staff_id` FOREIGN KEY (`created_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `clusters` ADD CONSTRAINT `fk_clusters_fee_payment_id` FOREIGN KEY (`fee_payment_id`) REFERENCES `payments` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `clusters` ADD CONSTRAINT `fk_clusters_contract_file_id` FOREIGN KEY (`contract_file_id`) REFERENCES `files` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `clusters` ADD CONSTRAINT `fk_clusters_archived_by_staff_id` FOREIGN KEY (`archived_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `cluster_status_history` ADD CONSTRAINT `fk_cluster_status_history_cluster_id` FOREIGN KEY (`cluster_id`) REFERENCES `clusters` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `cluster_status_history` ADD CONSTRAINT `fk_cluster_status_history_staff_user_id` FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `cluster_status_history` ADD CONSTRAINT `fk_cluster_status_history_account_id` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `cluster_groups` ADD CONSTRAINT `fk_cluster_groups_cluster_id` FOREIGN KEY (`cluster_id`) REFERENCES `clusters` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `cluster_groups` ADD CONSTRAINT `fk_cluster_groups_group_id` FOREIGN KEY (`group_id`) REFERENCES `admin_groups` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `cluster_groups` ADD CONSTRAINT `fk_cluster_groups_coordinator_account_id` FOREIGN KEY (`coordinator_account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `cluster_groups` ADD CONSTRAINT `fk_cluster_groups_female_guide_account_id` FOREIGN KEY (`female_guide_account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `cluster_groups` ADD CONSTRAINT `fk_cluster_groups_by_administration_staff_id` FOREIGN KEY (`by_administration_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `cluster_members` ADD CONSTRAINT `fk_cluster_members_cluster_id` FOREIGN KEY (`cluster_id`) REFERENCES `clusters` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `cluster_members` ADD CONSTRAINT `fk_cluster_members_account_id` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `cluster_members` ADD CONSTRAINT `fk_cluster_members_by_administration_staff_id` FOREIGN KEY (`by_administration_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `formation_notes` ADD CONSTRAINT `fk_formation_notes_group_id` FOREIGN KEY (`group_id`) REFERENCES `admin_groups` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `formation_notes` ADD CONSTRAINT `fk_formation_notes_updated_by_staff_id` FOREIGN KEY (`updated_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `season_rollovers` ADD CONSTRAINT `fk_season_rollovers_from_season` FOREIGN KEY (`from_season`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `season_rollovers` ADD CONSTRAINT `fk_season_rollovers_to_season` FOREIGN KEY (`to_season`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `season_rollovers` ADD CONSTRAINT `fk_season_rollovers_started_by_staff_id` FOREIGN KEY (`started_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `cluster_profile_versions` ADD CONSTRAINT `fk_cluster_profile_versions_cluster_id` FOREIGN KEY (`cluster_id`) REFERENCES `clusters` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `cluster_profile_versions` ADD CONSTRAINT `fk_cluster_profile_versions_submitted_by_account_id` FOREIGN KEY (`submitted_by_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `cluster_profile_versions` ADD CONSTRAINT `fk_cluster_profile_versions_decided_by_staff_id` FOREIGN KEY (`decided_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `group_profile_versions` ADD CONSTRAINT `fk_group_profile_versions_group_id` FOREIGN KEY (`group_id`) REFERENCES `admin_groups` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `group_profile_versions` ADD CONSTRAINT `fk_group_profile_versions_cover_file_id` FOREIGN KEY (`cover_file_id`) REFERENCES `files` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `group_profile_versions` ADD CONSTRAINT `fk_group_profile_versions_submitted_by_account_id` FOREIGN KEY (`submitted_by_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `group_profile_versions` ADD CONSTRAINT `fk_group_profile_versions_decided_by_staff_id` FOREIGN KEY (`decided_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `operational_plans` ADD CONSTRAINT `fk_operational_plans_cluster_id` FOREIGN KEY (`cluster_id`) REFERENCES `clusters` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `operational_plans` ADD CONSTRAINT `fk_operational_plans_file_id` FOREIGN KEY (`file_id`) REFERENCES `files` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `operational_plans` ADD CONSTRAINT `fk_operational_plans_submitted_by_account_id` FOREIGN KEY (`submitted_by_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `operational_plans` ADD CONSTRAINT `fk_operational_plans_decided_by_staff_id` FOREIGN KEY (`decided_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `cadre_people` ADD CONSTRAINT `fk_cadre_people_national_id` FOREIGN KEY (`national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `cadre_people` ADD CONSTRAINT `fk_cadre_people_account_id` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `cadre_people` ADD CONSTRAINT `fk_cadre_people_primary_role_key` FOREIGN KEY (`primary_role_key`) REFERENCES `admin_roles` (`role_key`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `cadre_people` ADD CONSTRAINT `fk_cadre_people_branch_id` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `cadre_people` ADD CONSTRAINT `fk_cadre_people_category_key` FOREIGN KEY (`category_key`) REFERENCES `group_categories` (`category_key`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `cadre_people` ADD CONSTRAINT `fk_cadre_people_added_by_staff_id` FOREIGN KEY (`added_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `cadre_people` ADD CONSTRAINT `fk_cadre_people_status_by_staff_id` FOREIGN KEY (`status_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `cadre_extra_branches` ADD CONSTRAINT `fk_cadre_extra_branches_national_id` FOREIGN KEY (`national_id`) REFERENCES `cadre_people` (`national_id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `cadre_extra_branches` ADD CONSTRAINT `fk_cadre_extra_branches_branch_id` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `cadre_seasonal_roles` ADD CONSTRAINT `fk_cadre_seasonal_roles_national_id` FOREIGN KEY (`national_id`) REFERENCES `cadre_people` (`national_id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `cadre_seasonal_roles` ADD CONSTRAINT `fk_cadre_seasonal_roles_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `cadre_seasonal_roles` ADD CONSTRAINT `fk_cadre_seasonal_roles_role_key` FOREIGN KEY (`role_key`) REFERENCES `admin_roles` (`role_key`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `cadre_seasonal_roles` ADD CONSTRAINT `fk_cadre_seasonal_roles_label_id` FOREIGN KEY (`label_id`) REFERENCES `admin_role_labels` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `cadre_seasonal_roles` ADD CONSTRAINT `fk_cadre_seasonal_roles_granted_by_staff_id` FOREIGN KEY (`granted_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `cadre_seasonal_roles` ADD CONSTRAINT `fk_cadre_seasonal_roles_revoked_by_staff_id` FOREIGN KEY (`revoked_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `cadre_events` ADD CONSTRAINT `fk_cadre_events_national_id` FOREIGN KEY (`national_id`) REFERENCES `cadre_people` (`national_id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `cadre_events` ADD CONSTRAINT `fk_cadre_events_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `cadre_events` ADD CONSTRAINT `fk_cadre_events_by_staff_id` FOREIGN KEY (`by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `telegram_messages` ADD CONSTRAINT `fk_telegram_messages_sent_by_staff_id` FOREIGN KEY (`sent_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `telegram_message_recipients` ADD CONSTRAINT `fk_telegram_message_recipients_message_id` FOREIGN KEY (`message_id`) REFERENCES `telegram_messages` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `telegram_message_recipients` ADD CONSTRAINT `fk_telegram_message_recipients_national_id` FOREIGN KEY (`national_id`) REFERENCES `cadre_people` (`national_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `letters` ADD CONSTRAINT `fk_letters_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `letters` ADD CONSTRAINT `fk_letters_account_id` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `letters` ADD CONSTRAINT `fk_letters_closed_by_staff_id` FOREIGN KEY (`closed_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `letter_messages` ADD CONSTRAINT `fk_letter_messages_letter_id` FOREIGN KEY (`letter_id`) REFERENCES `letters` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `letter_messages` ADD CONSTRAINT `fk_letter_messages_author_account_id` FOREIGN KEY (`author_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `letter_messages` ADD CONSTRAINT `fk_letter_messages_author_staff_id` FOREIGN KEY (`author_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `letter_messages` ADD CONSTRAINT `fk_letter_messages_file_id` FOREIGN KEY (`file_id`) REFERENCES `files` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `cluster_channel_writer_roles` ADD CONSTRAINT `fk_cluster_channel_writer_roles_cluster_id` FOREIGN KEY (`cluster_id`) REFERENCES `clusters` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `channel_messages` ADD CONSTRAINT `fk_channel_messages_cluster_id` FOREIGN KEY (`cluster_id`) REFERENCES `clusters` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `channel_messages` ADD CONSTRAINT `fk_channel_messages_author_account_id` FOREIGN KEY (`author_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `channel_messages` ADD CONSTRAINT `fk_channel_messages_reply_to_id` FOREIGN KEY (`reply_to_id`) REFERENCES `channel_messages` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `channel_messages` ADD CONSTRAINT `fk_channel_messages_removed_by_account_id` FOREIGN KEY (`removed_by_account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `channel_mutes` ADD CONSTRAINT `fk_channel_mutes_cluster_id` FOREIGN KEY (`cluster_id`) REFERENCES `clusters` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `channel_mutes` ADD CONSTRAINT `fk_channel_mutes_account_id` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `channel_mutes` ADD CONSTRAINT `fk_channel_mutes_muted_by_account_id` FOREIGN KEY (`muted_by_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `channel_reads` ADD CONSTRAINT `fk_channel_reads_cluster_id` FOREIGN KEY (`cluster_id`) REFERENCES `clusters` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `channel_reads` ADD CONSTRAINT `fk_channel_reads_account_id` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `admin_job_descriptions` ADD CONSTRAINT `fk_admin_job_descriptions_updated_by_staff_id` FOREIGN KEY (`updated_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `admin_system_sections` ADD CONSTRAINT `fk_admin_system_sections_updated_by_staff_id` FOREIGN KEY (`updated_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `admin_decisions` ADD CONSTRAINT `fk_admin_decisions_file_id` FOREIGN KEY (`file_id`) REFERENCES `files` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `admin_contract_templates` ADD CONSTRAINT `fk_admin_contract_templates_file_id` FOREIGN KEY (`file_id`) REFERENCES `files` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `field_records` ADD CONSTRAINT `fk_field_records_group_id` FOREIGN KEY (`group_id`) REFERENCES `admin_groups` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `field_records` ADD CONSTRAINT `fk_field_records_kind_code` FOREIGN KEY (`kind_code`) REFERENCES `field_record_kinds` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `field_records` ADD CONSTRAINT `fk_field_records_recorded_by_account_id` FOREIGN KEY (`recorded_by_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `field_records` ADD CONSTRAINT `fk_field_records_flight_id` FOREIGN KEY (`flight_id`) REFERENCES `flights` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `field_record_persons` ADD CONSTRAINT `fk_field_record_persons_record_id` FOREIGN KEY (`record_id`) REFERENCES `field_records` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `field_record_persons` ADD CONSTRAINT `fk_field_record_persons_national_id` FOREIGN KEY (`national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `group_posts` ADD CONSTRAINT `fk_group_posts_group_id` FOREIGN KEY (`group_id`) REFERENCES `admin_groups` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `group_posts` ADD CONSTRAINT `fk_group_posts_author_account_id` FOREIGN KEY (`author_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `daily_reports` ADD CONSTRAINT `fk_daily_reports_author_account_id` FOREIGN KEY (`author_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `daily_reports` ADD CONSTRAINT `fk_daily_reports_cluster_id` FOREIGN KEY (`cluster_id`) REFERENCES `clusters` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `daily_reports` ADD CONSTRAINT `fk_daily_reports_group_id` FOREIGN KEY (`group_id`) REFERENCES `admin_groups` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `daily_reports` ADD CONSTRAINT `fk_daily_reports_read_by_account_id` FOREIGN KEY (`read_by_account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `daily_reports` ADD CONSTRAINT `fk_daily_reports_read_by_staff_id` FOREIGN KEY (`read_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `group_lessons` ADD CONSTRAINT `fk_group_lessons_cluster_id` FOREIGN KEY (`cluster_id`) REFERENCES `clusters` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `group_lessons` ADD CONSTRAINT `fk_group_lessons_author_account_id` FOREIGN KEY (`author_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `group_lessons` ADD CONSTRAINT `fk_group_lessons_topic_code` FOREIGN KEY (`topic_code`) REFERENCES `lesson_topics` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `lesson_groups` ADD CONSTRAINT `fk_lesson_groups_lesson_id` FOREIGN KEY (`lesson_id`) REFERENCES `group_lessons` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `lesson_groups` ADD CONSTRAINT `fk_lesson_groups_group_id` FOREIGN KEY (`group_id`) REFERENCES `admin_groups` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `lesson_interest` ADD CONSTRAINT `fk_lesson_interest_lesson_id` FOREIGN KEY (`lesson_id`) REFERENCES `group_lessons` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `lesson_interest` ADD CONSTRAINT `fk_lesson_interest_national_id` FOREIGN KEY (`national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `lesson_interest` ADD CONSTRAINT `fk_lesson_interest_by_account_id` FOREIGN KEY (`by_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `lesson_attendance` ADD CONSTRAINT `fk_lesson_attendance_lesson_id` FOREIGN KEY (`lesson_id`) REFERENCES `group_lessons` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `lesson_attendance` ADD CONSTRAINT `fk_lesson_attendance_national_id` FOREIGN KEY (`national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `religious_activities` ADD CONSTRAINT `fk_religious_activities_cluster_id` FOREIGN KEY (`cluster_id`) REFERENCES `clusters` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `religious_activities` ADD CONSTRAINT `fk_religious_activities_author_account_id` FOREIGN KEY (`author_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `activity_groups` ADD CONSTRAINT `fk_activity_groups_activity_id` FOREIGN KEY (`activity_id`) REFERENCES `religious_activities` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `activity_groups` ADD CONSTRAINT `fk_activity_groups_group_id` FOREIGN KEY (`group_id`) REFERENCES `admin_groups` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `activity_units` ADD CONSTRAINT `fk_activity_units_activity_id` FOREIGN KEY (`activity_id`) REFERENCES `religious_activities` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `activity_participants` ADD CONSTRAINT `fk_activity_participants_activity_id` FOREIGN KEY (`activity_id`) REFERENCES `religious_activities` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `activity_participants` ADD CONSTRAINT `fk_activity_participants_national_id` FOREIGN KEY (`national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `activity_progress` ADD CONSTRAINT `fk_activity_progress_activity_id` FOREIGN KEY (`activity_id`) REFERENCES `religious_activities` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `activity_progress` ADD CONSTRAINT `fk_activity_progress_national_id` FOREIGN KEY (`national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `activity_sittings` ADD CONSTRAINT `fk_activity_sittings_activity_id` FOREIGN KEY (`activity_id`) REFERENCES `religious_activities` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `activity_sittings` ADD CONSTRAINT `fk_activity_sittings_national_id` FOREIGN KEY (`national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `activity_sittings` ADD CONSTRAINT `fk_activity_sittings_by_account_id` FOREIGN KEY (`by_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `rite_list_units` ADD CONSTRAINT `fk_rite_list_units_cluster_id` FOREIGN KEY (`cluster_id`) REFERENCES `clusters` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `rite_list_units` ADD CONSTRAINT `fk_rite_list_units_kind_code` FOREIGN KEY (`kind_code`) REFERENCES `rite_list_kinds` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `rite_list_units` ADD CONSTRAINT `fk_rite_list_units_created_by_staff_id` FOREIGN KEY (`created_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `rite_list_seats` ADD CONSTRAINT `fk_rite_list_seats_unit_id` FOREIGN KEY (`unit_id`) REFERENCES `rite_list_units` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `rite_list_seats` ADD CONSTRAINT `fk_rite_list_seats_cluster_id` FOREIGN KEY (`cluster_id`) REFERENCES `clusters` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `rite_list_seats` ADD CONSTRAINT `fk_rite_list_seats_kind_code` FOREIGN KEY (`kind_code`) REFERENCES `rite_list_kinds` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `rite_list_seats` ADD CONSTRAINT `fk_rite_list_seats_national_id` FOREIGN KEY (`national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `rite_list_seats` ADD CONSTRAINT `fk_rite_list_seats_seated_by_account_id` FOREIGN KEY (`seated_by_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `bus_requests` ADD CONSTRAINT `fk_bus_requests_cluster_id` FOREIGN KEY (`cluster_id`) REFERENCES `clusters` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `bus_requests` ADD CONSTRAINT `fk_bus_requests_kind_code` FOREIGN KEY (`kind_code`) REFERENCES `rite_list_kinds` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `bus_requests` ADD CONSTRAINT `fk_bus_requests_requested_by_account_id` FOREIGN KEY (`requested_by_account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `bus_requests` ADD CONSTRAINT `fk_bus_requests_decided_by_staff_id` FOREIGN KEY (`decided_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `bus_requests` ADD CONSTRAINT `fk_bus_requests_unit_id` FOREIGN KEY (`unit_id`) REFERENCES `rite_list_units` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `self_evaluations` ADD CONSTRAINT `fk_self_evaluations_admin_season_file_id` FOREIGN KEY (`admin_season_file_id`) REFERENCES `admin_season_files` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `self_evaluation_scores` ADD CONSTRAINT `fk_self_evaluation_scores_self_evaluation_id` FOREIGN KEY (`self_evaluation_id`) REFERENCES `self_evaluations` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `self_evaluation_answers` ADD CONSTRAINT `fk_self_evaluation_answers_self_evaluation_id` FOREIGN KEY (`self_evaluation_id`) REFERENCES `self_evaluations` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `staff_evaluations` ADD CONSTRAINT `fk_staff_evaluations_admin_season_file_id` FOREIGN KEY (`admin_season_file_id`) REFERENCES `admin_season_files` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `staff_evaluations` ADD CONSTRAINT `fk_staff_evaluations_evaluated_by_staff_id` FOREIGN KEY (`evaluated_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `staff_evaluation_scores` ADD CONSTRAINT `fk_staff_evaluation_scores_staff_evaluation_id` FOREIGN KEY (`staff_evaluation_id`) REFERENCES `staff_evaluations` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `staff_evaluation_scores` ADD CONSTRAINT `fk_staff_evaluation_scores_evidence_file_id` FOREIGN KEY (`evidence_file_id`) REFERENCES `files` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `peer_evaluations` ADD CONSTRAINT `fk_peer_evaluations_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `peer_evaluations` ADD CONSTRAINT `fk_peer_evaluations_cluster_id` FOREIGN KEY (`cluster_id`) REFERENCES `clusters` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `peer_evaluations` ADD CONSTRAINT `fk_peer_evaluations_group_id` FOREIGN KEY (`group_id`) REFERENCES `admin_groups` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `peer_evaluations` ADD CONSTRAINT `fk_peer_evaluations_admin_season_file_id` FOREIGN KEY (`admin_season_file_id`) REFERENCES `admin_season_files` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `peer_evaluations` ADD CONSTRAINT `fk_peer_evaluations_evaluator_staff_id` FOREIGN KEY (`evaluator_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `peer_evaluation_scores` ADD CONSTRAINT `fk_peer_evaluation_scores_peer_evaluation_id` FOREIGN KEY (`peer_evaluation_id`) REFERENCES `peer_evaluations` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `evaluation_objections` ADD CONSTRAINT `fk_evaluation_objections_admin_season_file_id` FOREIGN KEY (`admin_season_file_id`) REFERENCES `admin_season_files` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `evaluation_objections` ADD CONSTRAINT `fk_evaluation_objections_decided_by_staff_id` FOREIGN KEY (`decided_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `grading_publications` ADD CONSTRAINT `fk_grading_publications_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `grading_publications` ADD CONSTRAINT `fk_grading_publications_published_by_staff_id` FOREIGN KEY (`published_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `grading_results` ADD CONSTRAINT `fk_grading_results_publication_id` FOREIGN KEY (`publication_id`) REFERENCES `grading_publications` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `grading_results` ADD CONSTRAINT `fk_grading_results_group_id` FOREIGN KEY (`group_id`) REFERENCES `admin_groups` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `grading_results` ADD CONSTRAINT `fk_grading_results_cluster_id` FOREIGN KEY (`cluster_id`) REFERENCES `clusters` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `honours_awards` ADD CONSTRAINT `fk_honours_awards_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `honours_awards` ADD CONSTRAINT `fk_honours_awards_account_id` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `honours_awards` ADD CONSTRAINT `fk_honours_awards_cluster_id` FOREIGN KEY (`cluster_id`) REFERENCES `clusters` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `honours_awards` ADD CONSTRAINT `fk_honours_awards_publication_id` FOREIGN KEY (`publication_id`) REFERENCES `grading_publications` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `airport_return_targets` ADD CONSTRAINT `fk_airport_return_targets_airport_id` FOREIGN KEY (`airport_id`) REFERENCES `airports` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `airport_return_targets` ADD CONSTRAINT `fk_airport_return_targets_return_airport_id` FOREIGN KEY (`return_airport_id`) REFERENCES `airports` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `airport_representatives` ADD CONSTRAINT `fk_airport_representatives_airport_id` FOREIGN KEY (`airport_id`) REFERENCES `airports` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `airport_representatives` ADD CONSTRAINT `fk_airport_representatives_staff_user_id` FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `airport_representatives` ADD CONSTRAINT `fk_airport_representatives_assigned_by_staff_id` FOREIGN KEY (`assigned_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `flights` ADD CONSTRAINT `fk_flights_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `flights` ADD CONSTRAINT `fk_flights_carrier_id` FOREIGN KEY (`carrier_id`) REFERENCES `carriers` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `flights` ADD CONSTRAINT `fk_flights_from_airport_id` FOREIGN KEY (`from_airport_id`) REFERENCES `airports` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `flights` ADD CONSTRAINT `fk_flights_to_airport_id` FOREIGN KEY (`to_airport_id`) REFERENCES `airports` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `flights` ADD CONSTRAINT `fk_flights_paired_flight_id` FOREIGN KEY (`paired_flight_id`) REFERENCES `flights` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `flights` ADD CONSTRAINT `fk_flights_diverted_to_airport_id` FOREIGN KEY (`diverted_to_airport_id`) REFERENCES `airports` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `flights` ADD CONSTRAINT `fk_flights_created_by_staff_id` FOREIGN KEY (`created_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `flight_ground_legs` ADD CONSTRAINT `fk_flight_ground_legs_flight_id` FOREIGN KEY (`flight_id`) REFERENCES `flights` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `cluster_flight_allotments` ADD CONSTRAINT `fk_cluster_flight_allotments_cluster_id` FOREIGN KEY (`cluster_id`) REFERENCES `clusters` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `cluster_flight_allotments` ADD CONSTRAINT `fk_cluster_flight_allotments_flight_id` FOREIGN KEY (`flight_id`) REFERENCES `flights` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `cluster_flight_allotments` ADD CONSTRAINT `fk_cluster_flight_allotments_allotted_by_staff_id` FOREIGN KEY (`allotted_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `group_flight_legs` ADD CONSTRAINT `fk_group_flight_legs_flight_id` FOREIGN KEY (`flight_id`) REFERENCES `flights` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `group_flight_legs` ADD CONSTRAINT `fk_group_flight_legs_group_id` FOREIGN KEY (`group_id`) REFERENCES `admin_groups` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `group_flight_legs` ADD CONSTRAINT `fk_group_flight_legs_placed_by_account_id` FOREIGN KEY (`placed_by_account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `group_flight_legs` ADD CONSTRAINT `fk_group_flight_legs_placed_by_staff_id` FOREIGN KEY (`placed_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `flight_assignments` ADD CONSTRAINT `fk_flight_assignments_flight_id` FOREIGN KEY (`flight_id`) REFERENCES `flights` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `flight_assignments` ADD CONSTRAINT `fk_flight_assignments_national_id` FOREIGN KEY (`national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `flight_assignments` ADD CONSTRAINT `fk_flight_assignments_employee_id` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `flight_assignments` ADD CONSTRAINT `fk_flight_assignments_application_id` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `flight_assignments` ADD CONSTRAINT `fk_flight_assignments_group_id` FOREIGN KEY (`group_id`) REFERENCES `admin_groups` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `flight_assignments` ADD CONSTRAINT `fk_flight_assignments_cluster_id` FOREIGN KEY (`cluster_id`) REFERENCES `clusters` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `flight_assignments` ADD CONSTRAINT `fk_flight_assignments_assigned_by_staff_id` FOREIGN KEY (`assigned_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `flight_assignments` ADD CONSTRAINT `fk_flight_assignments_assigned_by_account_id` FOREIGN KEY (`assigned_by_account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `flight_assignments` ADD CONSTRAINT `fk_flight_assignments_moved_to_assignment_id` FOREIGN KEY (`moved_to_assignment_id`) REFERENCES `flight_assignments` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `other_means_travelers` ADD CONSTRAINT `fk_other_means_travelers_national_id` FOREIGN KEY (`national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `other_means_travelers` ADD CONSTRAINT `fk_other_means_travelers_employee_id` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `other_means_travelers` ADD CONSTRAINT `fk_other_means_travelers_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `other_means_travelers` ADD CONSTRAINT `fk_other_means_travelers_decided_by_staff_id` FOREIGN KEY (`decided_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `flight_manifests` ADD CONSTRAINT `fk_flight_manifests_flight_id` FOREIGN KEY (`flight_id`) REFERENCES `flights` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `flight_manifests` ADD CONSTRAINT `fk_flight_manifests_issued_by_staff_id` FOREIGN KEY (`issued_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `flight_manifest_rows` ADD CONSTRAINT `fk_flight_manifest_rows_manifest_id` FOREIGN KEY (`manifest_id`) REFERENCES `flight_manifests` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `flight_manifest_rows` ADD CONSTRAINT `fk_flight_manifest_rows_assignment_id` FOREIGN KEY (`assignment_id`) REFERENCES `flight_assignments` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `flight_manifest_exports` ADD CONSTRAINT `fk_flight_manifest_exports_manifest_id` FOREIGN KEY (`manifest_id`) REFERENCES `flight_manifests` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `flight_manifest_exports` ADD CONSTRAINT `fk_flight_manifest_exports_exported_by_staff_id` FOREIGN KEY (`exported_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `staff_users` ADD CONSTRAINT `fk_staff_users_national_id` FOREIGN KEY (`national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `staff_user_permissions` ADD CONSTRAINT `fk_staff_user_permissions_staff_user_id` FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `staff_user_permissions` ADD CONSTRAINT `fk_staff_user_permissions_permission_code` FOREIGN KEY (`permission_code`) REFERENCES `permissions` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `management_systems` ADD CONSTRAINT `fk_management_systems_permission_code` FOREIGN KEY (`permission_code`) REFERENCES `permissions` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `management_system_operations` ADD CONSTRAINT `fk_management_system_operations_system_code` FOREIGN KEY (`system_code`) REFERENCES `management_systems` (`code`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `system_grants` ADD CONSTRAINT `fk_system_grants_system_code` FOREIGN KEY (`system_code`) REFERENCES `management_systems` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `system_grants` ADD CONSTRAINT `fk_system_grants_staff_user_id` FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `system_grants` ADD CONSTRAINT `fk_system_grants_granted_by_staff_id` FOREIGN KEY (`granted_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `system_grants` ADD CONSTRAINT `fk_system_grants_revoked_by_staff_id` FOREIGN KEY (`revoked_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `system_seen` ADD CONSTRAINT `fk_system_seen_staff_user_id` FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `system_seen` ADD CONSTRAINT `fk_system_seen_system_code` FOREIGN KEY (`system_code`) REFERENCES `management_systems` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `escalations` ADD CONSTRAINT `fk_escalations_system_code` FOREIGN KEY (`system_code`) REFERENCES `management_systems` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `escalations` ADD CONSTRAINT `fk_escalations_raised_by_staff_id` FOREIGN KEY (`raised_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `escalations` ADD CONSTRAINT `fk_escalations_resolved_by_staff_id` FOREIGN KEY (`resolved_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `employees` ADD CONSTRAINT `fk_employees_national_id` FOREIGN KEY (`national_id`) REFERENCES `civil_persons` (`national_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `employees` ADD CONSTRAINT `fk_employees_governorate_code` FOREIGN KEY (`governorate_code`) REFERENCES `governorates` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `employees` ADD CONSTRAINT `fk_employees_job_title_id` FOREIGN KEY (`job_title_id`) REFERENCES `job_titles` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `employees` ADD CONSTRAINT `fk_employees_staff_user_id` FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `employee_seasons` ADD CONSTRAINT `fk_employee_seasons_employee_id` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `employee_seasons` ADD CONSTRAINT `fk_employee_seasons_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `employee_languages` ADD CONSTRAINT `fk_employee_languages_employee_id` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `employee_languages` ADD CONSTRAINT `fk_employee_languages_language_id` FOREIGN KEY (`language_id`) REFERENCES `languages` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `hotels` ADD CONSTRAINT `fk_hotels_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `sectors` ADD CONSTRAINT `fk_sectors_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `mashaer_centers` ADD CONSTRAINT `fk_mashaer_centers_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `camps` ADD CONSTRAINT `fk_camps_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `op_file_type_dates` ADD CONSTRAINT `fk_op_file_type_dates_file_type_code` FOREIGN KEY (`file_type_code`) REFERENCES `op_file_types` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `op_file_type_dates` ADD CONSTRAINT `fk_op_file_type_dates_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `op_file_roles` ADD CONSTRAINT `fk_op_file_roles_file_type_code` FOREIGN KEY (`file_type_code`) REFERENCES `op_file_types` (`code`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `operational_files` ADD CONSTRAINT `fk_operational_files_file_type_code` FOREIGN KEY (`file_type_code`) REFERENCES `op_file_types` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `operational_files` ADD CONSTRAINT `fk_operational_files_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `operational_files` ADD CONSTRAINT `fk_operational_files_activated_by_staff_id` FOREIGN KEY (`activated_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `operational_files` ADD CONSTRAINT `fk_operational_files_copied_from_file_id` FOREIGN KEY (`copied_from_file_id`) REFERENCES `operational_files` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `operational_files` ADD CONSTRAINT `fk_operational_files_created_by_staff_id` FOREIGN KEY (`created_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `op_file_outer_nodes` ADD CONSTRAINT `fk_op_file_outer_nodes_file_id` FOREIGN KEY (`file_id`) REFERENCES `operational_files` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `op_file_outer_nodes` ADD CONSTRAINT `fk_op_file_outer_nodes_sector_id` FOREIGN KEY (`sector_id`) REFERENCES `sectors` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `op_file_outer_nodes` ADD CONSTRAINT `fk_op_file_outer_nodes_center_id` FOREIGN KEY (`center_id`) REFERENCES `mashaer_centers` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `op_file_inner_nodes` ADD CONSTRAINT `fk_op_file_inner_nodes_outer_node_id` FOREIGN KEY (`outer_node_id`) REFERENCES `op_file_outer_nodes` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `op_file_inner_nodes` ADD CONSTRAINT `fk_op_file_inner_nodes_hotel_id` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `op_file_inner_nodes` ADD CONSTRAINT `fk_op_file_inner_nodes_camp_id` FOREIGN KEY (`camp_id`) REFERENCES `camps` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `op_inner_node_clusters` ADD CONSTRAINT `fk_op_inner_node_clusters_inner_node_id` FOREIGN KEY (`inner_node_id`) REFERENCES `op_file_inner_nodes` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `op_inner_node_clusters` ADD CONSTRAINT `fk_op_inner_node_clusters_file_id` FOREIGN KEY (`file_id`) REFERENCES `operational_files` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `op_inner_node_clusters` ADD CONSTRAINT `fk_op_inner_node_clusters_cluster_id` FOREIGN KEY (`cluster_id`) REFERENCES `clusters` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `op_file_assignments` ADD CONSTRAINT `fk_op_file_assignments_file_id` FOREIGN KEY (`file_id`) REFERENCES `operational_files` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `op_file_assignments` ADD CONSTRAINT `fk_op_file_assignments_outer_node_id` FOREIGN KEY (`outer_node_id`) REFERENCES `op_file_outer_nodes` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `op_file_assignments` ADD CONSTRAINT `fk_op_file_assignments_inner_node_id` FOREIGN KEY (`inner_node_id`) REFERENCES `op_file_inner_nodes` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `op_file_assignments` ADD CONSTRAINT `fk_op_file_assignments_employee_id` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `op_file_assignments` ADD CONSTRAINT `fk_op_file_assignments_housing_hotel_id` FOREIGN KEY (`housing_hotel_id`) REFERENCES `hotels` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `op_file_assignments` ADD CONSTRAINT `fk_op_file_assignments_assigned_by_staff_id` FOREIGN KEY (`assigned_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `internal_tasks` ADD CONSTRAINT `fk_internal_tasks_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `internal_tasks` ADD CONSTRAINT `fk_internal_tasks_created_by_staff_id` FOREIGN KEY (`created_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `internal_task_moves` ADD CONSTRAINT `fk_internal_task_moves_task_id` FOREIGN KEY (`task_id`) REFERENCES `internal_tasks` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `internal_task_moves` ADD CONSTRAINT `fk_internal_task_moves_moved_by_staff_id` FOREIGN KEY (`moved_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `ops_decisions` ADD CONSTRAINT `fk_ops_decisions_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `ops_decisions` ADD CONSTRAINT `fk_ops_decisions_decided_by_staff_id` FOREIGN KEY (`decided_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `season_meals` ADD CONSTRAINT `fk_season_meals_season_year` FOREIGN KEY (`season_year`) REFERENCES `seasons` (`season_year`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `season_meals` ADD CONSTRAINT `fk_season_meals_updated_by_staff_id` FOREIGN KEY (`updated_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `content_translations` ADD CONSTRAINT `fk_content_translations_updated_by_staff_id` FOREIGN KEY (`updated_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `news_articles` ADD CONSTRAINT `fk_news_articles_category_code` FOREIGN KEY (`category_code`) REFERENCES `news_categories` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `news_articles` ADD CONSTRAINT `fk_news_articles_image_file_id` FOREIGN KEY (`image_file_id`) REFERENCES `files` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `news_articles` ADD CONSTRAINT `fk_news_articles_created_by_staff_id` FOREIGN KEY (`created_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `news_articles` ADD CONSTRAINT `fk_news_articles_published_by_staff_id` FOREIGN KEY (`published_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `news_articles` ADD CONSTRAINT `fk_news_articles_updated_by_staff_id` FOREIGN KEY (`updated_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `news_article_tags` ADD CONSTRAINT `fk_news_article_tags_article_id` FOREIGN KEY (`article_id`) REFERENCES `news_articles` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `news_article_tags` ADD CONSTRAINT `fk_news_article_tags_tag_id` FOREIGN KEY (`tag_id`) REFERENCES `news_tags` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `news_comments` ADD CONSTRAINT `fk_news_comments_article_id` FOREIGN KEY (`article_id`) REFERENCES `news_articles` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `news_comments` ADD CONSTRAINT `fk_news_comments_account_id` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `news_comments` ADD CONSTRAINT `fk_news_comments_moderated_by_staff_id` FOREIGN KEY (`moderated_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `news_feedback` ADD CONSTRAINT `fk_news_feedback_article_id` FOREIGN KEY (`article_id`) REFERENCES `news_articles` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `news_feedback` ADD CONSTRAINT `fk_news_feedback_account_id` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `faqs` ADD CONSTRAINT `fk_faqs_category_code` FOREIGN KEY (`category_code`) REFERENCES `faq_categories` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `faqs` ADD CONSTRAINT `fk_faqs_created_by_staff_id` FOREIGN KEY (`created_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `faqs` ADD CONSTRAINT `fk_faqs_published_by_staff_id` FOREIGN KEY (`published_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `faqs` ADD CONSTRAINT `fk_faqs_updated_by_staff_id` FOREIGN KEY (`updated_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `guide_days` ADD CONSTRAINT `fk_guide_days_image_file_id` FOREIGN KEY (`image_file_id`) REFERENCES `files` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `guide_days` ADD CONSTRAINT `fk_guide_days_lesson_id` FOREIGN KEY (`lesson_id`) REFERENCES `academy_lessons` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `guide_days` ADD CONSTRAINT `fk_guide_days_created_by_staff_id` FOREIGN KEY (`created_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `guide_days` ADD CONSTRAINT `fk_guide_days_published_by_staff_id` FOREIGN KEY (`published_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `guide_days` ADD CONSTRAINT `fk_guide_days_updated_by_staff_id` FOREIGN KEY (`updated_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `guide_day_tasks` ADD CONSTRAINT `fk_guide_day_tasks_day_id` FOREIGN KEY (`day_id`) REFERENCES `guide_days` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `guide_day_times` ADD CONSTRAINT `fk_guide_day_times_day_id` FOREIGN KEY (`day_id`) REFERENCES `guide_days` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `guide_duas` ADD CONSTRAINT `fk_guide_duas_created_by_staff_id` FOREIGN KEY (`created_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `guide_duas` ADD CONSTRAINT `fk_guide_duas_published_by_staff_id` FOREIGN KEY (`published_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `guide_duas` ADD CONSTRAINT `fk_guide_duas_updated_by_staff_id` FOREIGN KEY (`updated_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `guide_items` ADD CONSTRAINT `fk_guide_items_created_by_staff_id` FOREIGN KEY (`created_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `guide_items` ADD CONSTRAINT `fk_guide_items_published_by_staff_id` FOREIGN KEY (`published_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `guide_items` ADD CONSTRAINT `fk_guide_items_updated_by_staff_id` FOREIGN KEY (`updated_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `academy_lecturers` ADD CONSTRAINT `fk_academy_lecturers_photo_file_id` FOREIGN KEY (`photo_file_id`) REFERENCES `files` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `academy_tracks` ADD CONSTRAINT `fk_academy_tracks_image_file_id` FOREIGN KEY (`image_file_id`) REFERENCES `files` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `academy_tracks` ADD CONSTRAINT `fk_academy_tracks_created_by_staff_id` FOREIGN KEY (`created_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `academy_tracks` ADD CONSTRAINT `fk_academy_tracks_published_by_staff_id` FOREIGN KEY (`published_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `academy_tracks` ADD CONSTRAINT `fk_academy_tracks_updated_by_staff_id` FOREIGN KEY (`updated_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `academy_levels` ADD CONSTRAINT `fk_academy_levels_track_id` FOREIGN KEY (`track_id`) REFERENCES `academy_tracks` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `academy_lessons` ADD CONSTRAINT `fk_academy_lessons_track_id` FOREIGN KEY (`track_id`) REFERENCES `academy_tracks` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `academy_lessons` ADD CONSTRAINT `fk_academy_lessons_level_id` FOREIGN KEY (`level_id`) REFERENCES `academy_levels` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `academy_lessons` ADD CONSTRAINT `fk_academy_lessons_lecturer_code` FOREIGN KEY (`lecturer_code`) REFERENCES `academy_lecturers` (`code`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `academy_lessons` ADD CONSTRAINT `fk_academy_lessons_poster_file_id` FOREIGN KEY (`poster_file_id`) REFERENCES `files` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `academy_lessons` ADD CONSTRAINT `fk_academy_lessons_video_file_id` FOREIGN KEY (`video_file_id`) REFERENCES `files` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `academy_lessons` ADD CONSTRAINT `fk_academy_lessons_created_by_staff_id` FOREIGN KEY (`created_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `academy_lessons` ADD CONSTRAINT `fk_academy_lessons_published_by_staff_id` FOREIGN KEY (`published_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `academy_lessons` ADD CONSTRAINT `fk_academy_lessons_updated_by_staff_id` FOREIGN KEY (`updated_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `academy_lesson_faqs` ADD CONSTRAINT `fk_academy_lesson_faqs_lesson_id` FOREIGN KEY (`lesson_id`) REFERENCES `academy_lessons` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `academy_lesson_duas` ADD CONSTRAINT `fk_academy_lesson_duas_lesson_id` FOREIGN KEY (`lesson_id`) REFERENCES `academy_lessons` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `academy_quiz_questions` ADD CONSTRAINT `fk_academy_quiz_questions_level_id` FOREIGN KEY (`level_id`) REFERENCES `academy_levels` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `academy_clips` ADD CONSTRAINT `fk_academy_clips_lesson_id` FOREIGN KEY (`lesson_id`) REFERENCES `academy_lessons` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `academy_clips` ADD CONSTRAINT `fk_academy_clips_video_file_id` FOREIGN KEY (`video_file_id`) REFERENCES `files` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `academy_lesson_completions` ADD CONSTRAINT `fk_academy_lesson_completions_account_id` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `academy_lesson_completions` ADD CONSTRAINT `fk_academy_lesson_completions_lesson_id` FOREIGN KEY (`lesson_id`) REFERENCES `academy_lessons` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `academy_quiz_attempts` ADD CONSTRAINT `fk_academy_quiz_attempts_account_id` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `academy_quiz_attempts` ADD CONSTRAINT `fk_academy_quiz_attempts_level_id` FOREIGN KEY (`level_id`) REFERENCES `academy_levels` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `academy_lesson_ratings` ADD CONSTRAINT `fk_academy_lesson_ratings_account_id` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `academy_lesson_ratings` ADD CONSTRAINT `fk_academy_lesson_ratings_lesson_id` FOREIGN KEY (`lesson_id`) REFERENCES `academy_lessons` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `academy_lecturer_questions` ADD CONSTRAINT `fk_academy_lecturer_questions_account_id` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `academy_lecturer_questions` ADD CONSTRAINT `fk_academy_lecturer_questions_lesson_id` FOREIGN KEY (`lesson_id`) REFERENCES `academy_lessons` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `academy_lecturer_questions` ADD CONSTRAINT `fk_academy_lecturer_questions_answered_by_staff_id` FOREIGN KEY (`answered_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `academy_certificates` ADD CONSTRAINT `fk_academy_certificates_account_id` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `academy_certificates` ADD CONSTRAINT `fk_academy_certificates_track_id` FOREIGN KEY (`track_id`) REFERENCES `academy_tracks` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `tour_models` ADD CONSTRAINT `fk_tour_models_image_file_id` FOREIGN KEY (`image_file_id`) REFERENCES `files` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `tour_models` ADD CONSTRAINT `fk_tour_models_created_by_staff_id` FOREIGN KEY (`created_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `tour_models` ADD CONSTRAINT `fk_tour_models_published_by_staff_id` FOREIGN KEY (`published_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `tour_models` ADD CONSTRAINT `fk_tour_models_updated_by_staff_id` FOREIGN KEY (`updated_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `cluster_directory_entries` ADD CONSTRAINT `fk_cluster_directory_entries_cluster_id` FOREIGN KEY (`cluster_id`) REFERENCES `clusters` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `cluster_directory_entries` ADD CONSTRAINT `fk_cluster_directory_entries_governorate_code` FOREIGN KEY (`governorate_code`) REFERENCES `governorates` (`code`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `cluster_directory_entries` ADD CONSTRAINT `fk_cluster_directory_entries_office_id` FOREIGN KEY (`office_id`) REFERENCES `offices` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `cluster_directory_entries` ADD CONSTRAINT `fk_cluster_directory_entries_created_by_staff_id` FOREIGN KEY (`created_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `cluster_directory_entries` ADD CONSTRAINT `fk_cluster_directory_entries_published_by_staff_id` FOREIGN KEY (`published_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `cluster_directory_entries` ADD CONSTRAINT `fk_cluster_directory_entries_updated_by_staff_id` FOREIGN KEY (`updated_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `unapproved_entities` ADD CONSTRAINT `fk_unapproved_entities_created_by_staff_id` FOREIGN KEY (`created_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `unapproved_entities` ADD CONSTRAINT `fk_unapproved_entities_published_by_staff_id` FOREIGN KEY (`published_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `unapproved_entities` ADD CONSTRAINT `fk_unapproved_entities_updated_by_staff_id` FOREIGN KEY (`updated_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `fraud_reports` ADD CONSTRAINT `fk_fraud_reports_unapproved_entity_id` FOREIGN KEY (`unapproved_entity_id`) REFERENCES `unapproved_entities` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `fraud_reports` ADD CONSTRAINT `fk_fraud_reports_reporter_account_id` FOREIGN KEY (`reporter_account_id`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `contact_messages` ADD CONSTRAINT `fk_contact_messages_handled_by_staff_id` FOREIGN KEY (`handled_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `cms_section_type_fields` ADD CONSTRAINT `fk_cms_section_type_fields_type_key` FOREIGN KEY (`type_key`) REFERENCES `cms_section_types` (`type_key`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `cms_pages` ADD CONSTRAINT `fk_cms_pages_published_by_staff_id` FOREIGN KEY (`published_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `cms_pages` ADD CONSTRAINT `fk_cms_pages_updated_by_staff_id` FOREIGN KEY (`updated_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `cms_page_sections` ADD CONSTRAINT `fk_cms_page_sections_page_key` FOREIGN KEY (`page_key`) REFERENCES `cms_pages` (`page_key`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `cms_page_sections` ADD CONSTRAINT `fk_cms_page_sections_type_key` FOREIGN KEY (`type_key`) REFERENCES `cms_section_types` (`type_key`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `cms_field_values` ADD CONSTRAINT `fk_cms_field_values_page_key` FOREIGN KEY (`page_key`) REFERENCES `cms_pages` (`page_key`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `cms_field_values` ADD CONSTRAINT `fk_cms_field_values_updated_by_staff_id` FOREIGN KEY (`updated_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `cms_revisions` ADD CONSTRAINT `fk_cms_revisions_collection_key` FOREIGN KEY (`collection_key`) REFERENCES `cms_collection_settings` (`collection_key`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `cms_revisions` ADD CONSTRAINT `fk_cms_revisions_page_key` FOREIGN KEY (`page_key`) REFERENCES `cms_pages` (`page_key`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `cms_revisions` ADD CONSTRAINT `fk_cms_revisions_created_by_staff_id` FOREIGN KEY (`created_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `cms_scheduled_publications` ADD CONSTRAINT `fk_cms_scheduled_publications_page_key` FOREIGN KEY (`page_key`) REFERENCES `cms_pages` (`page_key`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `cms_scheduled_publications` ADD CONSTRAINT `fk_cms_scheduled_publications_scheduled_by_staff_id` FOREIGN KEY (`scheduled_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `cms_staff_roles` ADD CONSTRAINT `fk_cms_staff_roles_staff_user_id` FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `cms_staff_roles` ADD CONSTRAINT `fk_cms_staff_roles_page_key` FOREIGN KEY (`page_key`) REFERENCES `cms_pages` (`page_key`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `cms_staff_roles` ADD CONSTRAINT `fk_cms_staff_roles_collection_key` FOREIGN KEY (`collection_key`) REFERENCES `cms_collection_settings` (`collection_key`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `cms_staff_roles` ADD CONSTRAINT `fk_cms_staff_roles_granted_by_staff_id` FOREIGN KEY (`granted_by_staff_id`) REFERENCES `staff_users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

SET FOREIGN_KEY_CHECKS = 1;
