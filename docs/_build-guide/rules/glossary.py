# -*- coding: utf-8 -*-
"""مسرد المصطلحات: كل مصطلح كما تكتبه المنصة، ومعناه فيها، واسمه في الكود، والجدول الذي يحفظه في نموذج البيانات.
يُقرأ مع قواعد العمل (rules/) ونموذج البيانات (schema/). build_rules.py يتحقق من كل مرجع قبل البناء."""
from .dsl import *

TERMS = [
    # ───────────────────────── الحاج والحساب والهوية ─────────────────────────
    G("الحاج", "pilgrim",
      "من يسجّل على الحج في الموسم الحالي من حساب المنصة، سواء قدّم الطلب بنفسه أو قُدّم عنه. يشمل صاحب الطلب ومرافقيه، "
      "ويُسمّى كذلك في الرحلات (traveler kind: 'pilgrim' «حاج») والبلاغات والتقييم.",
      code=["lib/store.ts:11", "lib/flights.ts:192"],
      data=["applications", "application_members", "account_season_paths.path"],
      see=["حساب المنصة", "مسار الموسم", "صاحب الطلب", "المرافق"]),

    G("حساب المنصة", "Account",
      "حساب واحد لكل شخص، بلا نوع ثابت، مربوط برقمه الوطني وهاتفه. يُنشأ للتعلّم في الأكاديمية، ثم يختار صاحبه في كل موسم ما يفعله به: "
      "التسجيل على الحج أو التقدّم لصفة إدارية. ما فعله في مواسم سابقة لا يُحذف.",
      code=["lib/store.ts:19"],
      data=["accounts", "account_season_history"],
      see=["مسار الموسم", "الرقم الوطني", "الإداري", "الحاج"]),

    G("مسار الموسم", "SeasonPath: 'pilgrim' | 'admin'",
      "ما يختاره صاحب الحساب لكل موسم هجري: حاج (pilgrim) أو إداري (admin)، ولا يجمع بينهما في موسم واحد. يظهر في الشاشات بعبارات مثل «التسجيل على الحج / أتابع كحاج» "
      "و«التقدّم لصفة إدارية / أتابع كإداري». إن لم يختر استنتجته المنصة مما فعله.",
      code=["lib/store.ts:11", "lib/account.ts:35"],
      data=["account_season_paths", "account_season_paths.path"],
      see=["حساب المنصة", "مسار التسجيل", "الإداري"]),

    G("الرقم الوطني", "nationalId",
      "رقم من 11 خانة في السجل المدني السوري. هو مفتاح الشخص في المنصة: به يُنشأ الحساب ويُضاف أفراد الطلب، ولا تظهر بيانات صاحبه إلا بعد مطابقة اسمه الأول.",
      code=["lib/registry.ts:239", "lib/store.ts:20"],
      data=["civil_persons.national_id", "accounts.national_id", "application_members.national_id"],
      see=["الشؤون المدنية", "التحقق بالاسم الأول", "دفتر العائلة"]),

    G("الشؤون المدنية", "registry (lib/registry.ts)",
      "مصدر بيانات الأشخاص (الاسم والميلاد والجنس والمحافظة والقيد وصلات القرابة). البيانات تُقرأ منه ولا تُدخل يدوياً. "
      "في النسخة التجريبية سجل محاكى. تكتبه الشاشات مرة «الشؤون المدنية» ومرة «السجل المدني» والمعنى واحد.",
      code=["lib/registry.ts:11", "lib/registry.ts:283"],
      data=["civil_persons", "family_books", "person_spouses"],
      see=["الرقم الوطني", "دفتر العائلة", "تصحيح البيانات المدنية"]),

    G("التحقق بالاسم الأول", "firstNameMatches",
      "إثبات أن من كتب رقماً وطنياً يحمله: يكتب الاسم الأول كما في الهوية، فيجيب السجل «مطابق» أو «غير مطابق» فقط ولا يكشف الاسم. "
      "يُطلب حيثما رُبط رقم وطني بحساب أو طلب، ويتوقف النموذج بعد 5 محاولات خاطئة.",
      code=["lib/registry.ts:262", "lib/registry.ts:268"],
      data=["identity_attempts"],
      see=["الرقم الوطني", "رمز التحقق"]),

    G("رمز التحقق", "OTP",
      "رمز يصل برسالة إلى الهاتف لتأكيد الحساب أو موافقة شخص على طلب يُقدَّم باسمه، أو لتأكيد التسجيل الذي يجريه موظف أو منسق عن مواطن. "
      "تسمّيه الشاشات «رمز التحقق» عند إنشاء الحساب و«رمز الموافقة» عند موافقة فرد، وتستعمل «رمز التحقق» أيضاً لرمز QR المطبوع على الإيصالات والعقود. في النسخة التجريبية الرمز ثابت (1448).",
      code=["lib/registration/service.ts:33", "lib/registration/service.ts:103"],
      data=["otp_challenges", "application_consents.otp_challenge_id"],
      see=["موافقة المرافق", "التحقق بالاسم الأول"]),

    G("تصحيح البيانات المدنية", "CivilClaim",
      "طلب يقدّمه صاحب الحساب حين يرى أن السجل أخطأ في حقل من بياناته، مع وثيقة تثبت الصحيح. تبقى الحقول «غير مؤكدة» حتى يقرر موظف «مراجعة الطلبات والوثائق». "
      "القيم: pending «غير مؤكدة — بانتظار القرار»، approved «صُحّحت»، rejected «رُفض التصحيح».",
      code=["lib/store.ts:40"],
      data=["civil_claims", "civil_claim_fields"],
      see=["الشؤون المدنية", "مراجعة الطلبات والوثائق"]),

    G("دفتر العائلة", "familyBook / mode: 'booklet'",
      "قيد العائلة في السجل المدني برقمه: يفتحه صاحب الطلب فيضيف منه أفراده، فتكون صلة القرابة مؤكدة آلياً. يبقى فيه الأبناء الذين تزوّجوا وانتقلوا إلى دفتر آخر، مع رقم الدفتر الذي انتقلوا إليه. "
      "تسمّيه شاشات الموظفين «وثيقة العائلة» (MODE_LABEL)، ويرد في البيانات التجريبية «بيان عائلي» للوثيقة الورقية.",
      code=["lib/registry.ts:160", "lib/registry.ts:302"],
      data=["family_books", "applications.mode", "civil_persons.family_book_no"],
      see=["الطلب العائلي", "صلة القرابة", "الشؤون المدنية"]),

    # ───────────────────────── الطلب وأفراده ─────────────────────────
    G("الطلب", "Application",
      "طلب الحج في موسم واحد: صاحب الطلب ومرافقوه، ومساره (القبول المباشر أو القرعة)، ومكتبه، وما دُفع، والإصدار الذي بدأ عليه وشروط الموسم المجمّدة. "
      "لكل شخص طلب واحد في الموسم، ورقمه (number) يظهر في الإيصالات والمتابعة. وما بدأه صاحبه ولم يرسله يُحفظ مسودةً (ApplyDraft) ليكمله لاحقاً.",
      code=["lib/store.ts:49", "lib/store.ts:684"],
      data=["applications", "application_members", "application_drafts", "application_draft_members"],
      see=["صاحب الطلب", "المرافق", "مسار التسجيل", "حالة الطلب", "الطلب العائلي"]),

    G("صاحب الطلب", "relation: 'self' / is_applicant",
      "الفرد الذي يُبنى عليه الطلب وتُحسب به النتيجة: عمره في القبول المباشر، وسنة ميلاده وشهره في القرعة. يجب أن يكون من مواليد 1997 فما قبل (29 عاماً فأكثر)، "
      "وإن كان في الطلب من هو أكبر منه نُقل الأكبر ليكون صاحب الطلب. قد يختلف عن صاحب الحساب حين يُقدَّم الطلب «لشخص آخر».",
      code=["lib/season.ts:37", "lib/rules.ts:90"],
      data=["application_members.is_applicant", "applications.applicant_national_id", "season_settings.applicant_max_birth_year"],
      see=["الطلب", "المرافق", "لشخص آخر"]),

    G("المرافق", "companion",
      "كل فرد في الطلب غير صاحبه. يجب أن يكون من مواليد 2009 فما قبل (17 عاماً فأكثر). الحد 3 مرافقين، أو 5 لرجل معه زوجته وأولاده. "
      "يوافق كل مرافق على انضمامه بنفسه قبل إرسال الطلب.",
      code=["lib/season.ts:39", "lib/season.ts:44"],
      data=["application_members", "season_settings.companion_max_birth_year", "season_settings.max_companions", "season_settings.max_companions_family"],
      see=["صاحب الطلب", "موافقة المرافق", "المحرم", "مرافق كبير السن"]),

    G("المحرم", "mahram",
      "رجل من محارم المرأة في الطلب نفسه: الزوج أو الأب أو الابن أو الأخ أو الجد أو الحفيد. تحتاجه كل امرأة من مواليد 1982 فما بعد (دون 44 عاماً)، "
      "ومن سبق له الحج لا يُقبل إلا محرماً لأمه أو زوجته (يظهر الشرط تحذيراً لا رفضاً).",
      code=["lib/rules.ts:47", "lib/season.ts:41"],
      data=["season_settings.woman_needs_mahram_min_birth_year", "application_members.relation"],
      see=["المرافق", "صلة القرابة", "شروط الأهلية"]),

    G("مرافق كبير السن", "companionId / elderly-companion",
      "من بلغ 69 عاماً فأكثر (مواليد 1957 فما قبل) لا يُقبل إلا ومعه في الطلب مرافق مخصّص له، يُحفظ معرّفه على سجل الكبير.",
      code=["lib/season.ts:43", "lib/rules.ts:22"],
      data=["application_members.companion_national_id", "season_settings.elderly_needs_companion_max_birth_year"],
      see=["المرافق", "شروط الأهلية"]),

    G("صلة القرابة", "Relation",
      "ما يكونه الفرد لصاحب الطلب. القيم: self صاحب الطلب، spouse، parent، child، sibling، grandparent، grandchild، other «قريب آخر». "
      "تُستخرج من السجل أولاً؛ فإن لم يؤكدها السجل بقيت «مصرّحاً بها» (relationVerified = false) وتنبّه المراجعة إليها.",
      code=["lib/registry.ts:314", "lib/rules.ts:13"],
      data=["application_members.relation", "application_members.relation_verified"],
      see=["المحرم", "دفتر العائلة"]),

    G("الطلب العائلي", "mode: 'booklet' | 'national'",
      "طلب فيه صاحب الطلب ومرافقون من أهله، يُضافون من دفتر العائلة أو برقم كل واحد الوطني. يُعامل كله وحدة واحدة: يُقبل معاً، ويُلحق بمجموعة واحدة كاملاً. وما لا مرافقين فيه «طلب فردي». "
      "قيم طريقة الإضافة: booklet «وثيقة العائلة»، national «الرقم الوطني»، solo «طلب فردي»، manual «إدخال يدوي» (بيانات قديمة).",
      code=["lib/store.ts:55", "app/staff/_components/data.ts:56"],
      data=["applications.mode"],
      see=["دفتر العائلة", "الإلحاق بمجموعة", "الطلب"]),

    G("لشخص آخر", "forWhom: 'other'",
      "طلب يقدّمه صاحب الحساب عن غيره (أب أو أم مثلاً)، فيكون صاحب الطلب غير صاحب الحساب ويوافق برمز تحقق. القيمة الأخرى me «لي أنا».",
      code=["lib/store.ts:56"],
      data=["applications.for_whom", "application_consents.kind"],
      see=["صاحب الطلب", "موافقة المرافق"]),

    G("موافقة المرافق", "Consent",
      "موافقة كل فرد يُضاف إلى طلب غيره، عبر التطبيق أو برسالة (via: app | sms). القيم: pending بانتظار، approved «أوافق على الانضمام»، declined «أعتذر». "
      "لا يُرسل الطلب قبل اكتمالها.",
      code=["lib/store.ts:671"],
      data=["application_consents"],
      see=["المرافق", "رمز التحقق", "لشخص آخر"]),

    G("المكتب", "OFFICES / office",
      "مكتب التسجيل الذي يتبعه الطلب: مكتب محافظة صاحب الطلب في السجل المدني داخل سوريا، أو مكتب بلد الإقامة في الخارج، أو مكتب من سجّله. لا يُختار من قائمة؛ "
      "السؤال الوحيد هو «مكان الإقامة» (Residence): «سوريا» أو أحد مكاتب الخارج (تركيا — إسطنبول، تركيا — غازي عنتاب، مصر، الأردن). "
      "في المكتب يُوقَّع عقد الإلحاق وتُشكَّل المجموعات والتكتلات.",
      code=["lib/season.ts:163", "lib/season.ts:183"],
      data=["offices", "applications.office_id", "applications.residence"],
      see=["الفرع", "التشكيل في المكتب", "الشؤون المدنية"]),

    G("الفرع", "Branch",
      "من قوائم إدارة الإداريين المرجعية: الفرع الذي ينتمي إليه الإداري في الكادر، ومنه يختار رئيس التكتل مجموعاته وأفراده. "
      "قائمة مستقلة عن قائمة المكاتب وتتداخل معها (فرع «اسطنبول» ومكتب «تركيا — إسطنبول»، وفي الفروع «الرقة» وليست في المكاتب).",
      code=["app/administrator/_lib/structure.ts:131", "app/administrator/_lib/structure.ts:134"],
      data=["branches", "cadre_people.branch_id", "cadre_extra_branches"],
      see=["المكتب", "الكادر الإداري", "القوائم المرجعية"]),

    G("شروط الأهلية", "evaluate / EligibilityRule",
      "فحص كل فرد قبل الدفع: شروط ثابتة في المنصة (مسلم، سوري، العمر، المحرم، مرافق الكبير، عدم الحج سابقاً، طلب واحد، حد المرافقين) "
      "وشروط تضيفها الإدارة للموسم في «شروط الأهلية» وتُفرض ثانية عند الإرسال. نتيجة كل شرط: pass، fail، warn، na.",
      code=["lib/rules.ts:126", "lib/registration/types.ts:122"],
      data=["reg_config_versions.config", "season_settings"],
      see=["المحرم", "مرافق كبير السن", "إصدار إعدادات التسجيل"]),

    # ───────────────────────── المسارات والقبول ─────────────────────────
    G("مسار التسجيل", "TrackKey: 'direct' | 'lottery'",
      "التسجيلان المنفصلان على الحج في الموسم: القبول المباشر أولاً، ثم التسجيل الأولي على القرعة بطلب مستقل. لا ينتقل أحد من أحدهما إلى الآخر تلقائياً. "
      "تنبيه: كلمة «مسار» تُستعمل في المنصة أيضاً لمسار الموسم (حاج/إداري) ولمسارات الأكاديمية.",
      code=["lib/registration/types.ts:112", "lib/store.ts:80"],
      data=["applications.track", "application_drafts.track"],
      see=["القبول المباشر", "القرعة", "مسار الموسم"]),

    G("القبول المباشر", "track: 'direct'",
      "التسجيل الأول في الموسم (12 – 25 آب): يُقبل الأكبر سناً أولاً حتى تكتمل 65% من الحصة. العمر المعلن لموسم 1448 هو 68 عاماً فأكثر (مواليد 1958 فما قبل). "
      "يُدفع مع الطلب رسم التسجيل والدفعة الأولى معاً.",
      code=["lib/season.ts:14", "lib/season.ts:19"],
      data=["season_settings.direct_share", "season_settings.accepted_direct_age", "applications.acceptance_basis"],
      see=["إعلان الأعمار المقبولة", "الحصة", "القرعة", "الدفعة"]),

    G("إعلان الأعمار المقبولة", "announcedDirectAge",
      "العمر الأدنى الذي تعتمده الإدارة للقبول المباشر بعد إغلاق تسجيله. إن نفدت المقاعد فوقه أُعلن عمر أعلى، وإن خلت مقاعد (من لم يثبّت) أُعلنت أعمار جديدة، "
      "ويحفظ كل طلب العمر المعلن لجولته.",
      code=["lib/store.ts:84", "lib/journey.ts:169"],
      data=["direct_age_announcements", "applications.announced_direct_age"],
      see=["القبول المباشر"]),

    G("القرعة", "track: 'lottery' / DrawPick",
      "التسجيل الأولي على القرعة (26 آب – 10 أيلول) برسم التسجيل فقط، ثم سحب علني ببث مباشر يوم 26 أيلول على 35% من الحصة. "
      "تُسحب سنوات ميلاد كاملة، أو أشهر من سنة (months: 'all' أو أرقام الأشهر)، ويُقبل الطلب إذا سُحب ميلاد صاحبه. "
      "يُدخل النتائج صاحب «إدخال نتائج القرعة»، ويعتمدها وينشرها صاحب «اعتماد ونشر النتائج».",
      code=["lib/lottery.ts:18", "lib/lottery.ts:86"],
      data=["lottery_draws", "lottery_draw_picks", "applications.lottery_draw_id"],
      see=["مسار التسجيل", "الحصة", "تأكيد القبول", "الصلاحية"]),

    G("الحصة", "quota",
      "عدد حجاج سوريا في الموسم (22,500 لموسم 1448)، تقسم بين القبول المباشر 65% (14,625) والقرعة 35% (7,875). "
      "تنبيه: الكلمة نفسها تُستعمل في الشاشات لحد الموجّهة أو المنسق من الوحدات («ضمن حصتها»)، وهذا معنى آخر.",
      code=["lib/season.ts:12", "lib/season.ts:16"],
      data=["season_settings.quota", "season_settings.direct_share"],
      see=["القبول المباشر", "القرعة", "المنحة"]),

    G("المنحة", "scholarshipSeats / campaign: 'المنحة'",
      "حملة لأسر الشهداء: 500 مقعد بقبول مباشر خارج ترتيب الأعمار. تظهر في صفحة «نتائج القبول» بنتيجة «مقبول مباشرة — حملة المنحة».",
      code=["lib/season.ts:20", "lib/data/public-results.ts:28"],
      data=["season_settings.scholarship_seats"],
      see=["الحصة", "نتائج القبول"]),

    G("حالة الطلب", "TrackKey (journey) / applications.status",
      "مراحل متابعة الطلب كما يعرضها الكود (journey.ts): submitted «مُقدَّم»، checking «تدقيق البيانات»، eligible «مؤهل»، direct «اعتماد القبول المباشر»، lottery «القرعة العلنية»، "
      "accepted «مقبول مباشرة» أو «مقبول بالقرعة»، notAccepted «لم يُقبل مباشرة» أو «لم يُقبل بالقرعة». في النسخة التجريبية تُحسب المرحلة من وقت التقديم والقرعة المنشورة ولا تُخزَّن؛ "
      "نموذج البيانات يخزّنها في applications.status بقيم أوسع: awaiting-draw «بانتظار القرعة»، confirmed «ثبّت قبوله»، lapsed «سقط قبوله»، suspended، withdrawn، moved-to-lottery.",
      code=["lib/journey.ts:154", "lib/journey.ts:182"],
      data=["applications.status", "application_status_history"],
      see=["الطلب", "تأكيد القبول", "القبول المباشر", "القرعة"]),

    G("تأكيد القبول", "PostSystemStep: 'confirm'",
      "أول خطوة بعد القبول: يقرأ الحاج التعليمات ويوقّع عليها، وللمقبول بالقرعة يدفع معها الدفعة الأولى (11 – 27 تشرين الأول). من لا يؤكد في المهلة «يسقط قبوله» ويعود مقعده. "
      "تسمّيه صفحات القرعة والأخبار «تثبيت التسجيل» والمعنى واحد.",
      code=["lib/registration/validate.ts:51", "lib/season.ts:32"],
      data=["post_acceptance.confirmed_at", "applications.status"],
      see=["الخطوات بعد القبول", "القرعة", "الدفعة"]),

    # ───────────────────────── المال ─────────────────────────
    G("رسم التسجيل", "fees.registrationPerPerson",
      "مبلغ يُدفع عن كل فرد عند تقديم الطلب (25 $ لموسم 1448) في المسارين، وإيصاله يُحفظ على الطلب. غير رسم تسجيل الإداري (30 $) ورسمَي تشكيل المجموعة (200 $) والتكتل (500 $).",
      code=["lib/season.ts:49", "lib/store.ts:62"],
      data=["season_settings.fee_registration_per_person", "applications.registration_receipt_no", "season_settings.fee_admin_registration"],
      see=["الدفعة", "الإيصال"]),

    G("تكلفة الحج", "fees.hajjCost",
      "الكلفة الكاملة للحاج الواحد (4,750 $)، تُدفع على دفعات تحددها الإدارة للموسم كله لا الحاج.",
      code=["lib/season.ts:54"],
      data=["season_settings.hajj_cost", "season_settings.installment_count"],
      see=["الدفعة", "الهدي"]),

    G("الدفعة", "InstallmentDef / Installment",
      "قسط من تكلفة الحج عن كل فرد. لموسم 1448 دفعتان: الأولى (3,500 $) مع التسجيل في القبول المباشر أو عند تثبيت المقبول بالقرعة، والثانية (الباقي) بعد اعتماد عقد الإلحاق بمجموعة. "
      "amount: null تعني «باقي التكلفة». تنبيه: نموذج البيانات يسمّي العملية المالية الواحدة «دفعة» أيضاً (payments)، فـ«الدفعة» في الشاشة قسط وفي الجدول عملية دفع.",
      code=["lib/registration/types.ts:142", "lib/installments.ts:43"],
      data=["season_settings.first_installment", "season_settings.installment_count", "application_payment_lines", "payments"],
      see=["تكلفة الحج", "رسم التسجيل", "شام كاش", "إشعار الدفع"]),

    G("الهدي", "hady",
      "ثمن ذبيحة الهدي عن كل حاج (180 $)، يُدفع مع الغرف الخاصة في الخطوة التي تحددها إعدادات التسجيل (extrasStep).",
      code=["lib/season.ts:60", "lib/registration/types.ts:149"],
      data=["season_settings.hady", "application_payment_lines"],
      see=["الدفعة", "السكن العام"]),

    G("شام كاش", "method: 'shamcash'",
      "وسيلة الدفع الإلكتروني المعتمدة، يؤكد مزوّدها الدفعة مباشرة. الوسيلتان الأخريان: bank (المصرف المعتمد مع رفع إشعار الدفع) وoffice (في المكتب). "
      "يُقبل الطلب فقط مقابل دفعة مؤكدة بالمبلغ الذي حسبته المنصة، تُستعمل مرة واحدة.",
      code=["lib/registration/types.ts:225", "lib/registration/types.ts:230"],
      data=["payments.method", "payments.provider_tx_no"],
      see=["إشعار الدفع", "الدفعة"]),

    G("إشعار الدفع", "method: 'bank' / bank slip",
      "صورة إيصال المصرف التي يرفعها من دفع في المصرف المعتمد، فيطابقها موظف المالية مع كشف المصرف قبل تأكيد الدفعة. "
      "تنبيه: «إشعار» في المنصة يعني أيضاً تنبيهات الحساب («الإشعارات»).",
      code=["lib/store.ts:73"],
      data=["payments.bank_slip_file_id", "payments.bank_reference", "payments.status"],
      see=["شام كاش", "الإيصال", "الإشعارات"]),

    G("الإيصال", "receipt",
      "رقم يثبت دفعة مؤكدة: إيصال رسم التسجيل على الطلب، وإيصال كل دفعة. يمكن التحقق منه في صفحة «التحقق من الجهات والوثائق».",
      code=["lib/store.ts:62", "lib/installments.ts:43"],
      data=["payment_items.receipt_no", "applications.registration_receipt_no"],
      see=["رسم التسجيل", "التحقق من الجهات والوثائق"]),

    G("شروط الطلب المجمّدة", "AppPolicy",
      "نسخة من شروط الموسم وتكاليفه وجدول دفعاته تُحفظ مع الطلب لحظة تقديمه. أي تعديل لاحق في إعدادات الموسم لا يغيّر ما على طلب مقدَّم ولا ما قُبل به.",
      code=["lib/registration/types.ts:254", "lib/store.ts:98"],
      data=["applications.policy_snapshot"],
      see=["إعدادات الموسم", "إصدار إعدادات التسجيل"]),

    # ───────────────────────── إعدادات التسجيل والموسم ─────────────────────────
    G("إصدار إعدادات التسجيل", "RegVersion",
      "نسخة منشورة لا تتغير من إعدادات التسجيل (الصفحات والأسئلة وشروط الأهلية والدفعات والخطوات بعد القبول)، برقم وتاريخ سريان. "
      "كل طلب يبقى على الإصدار الذي بدأ عليه. يعدّل صاحب «إدارة التسجيل على الحج» مسودة واحدة لكل موسم (RegDraft) مأخوذة من إصدار سابق، فتُفحص وتُعايَن ثم تُنشر إصداراً جديداً، "
      "ويمكن الرجوع إلى إصدار سابق من «الإصدارات والمواسم».",
      code=["lib/registration/types.ts:192", "lib/registration/types.ts:219"],
      data=["reg_config_versions", "reg_config_drafts", "applications.config_version_id"],
      see=["صفحات التسجيل", "الخطوات بعد القبول", "شروط الطلب المجمّدة"]),

    G("صفحات التسجيل", "StageDef",
      "الصفحات التي يمر بها الحاج حين يقدّم طلبه، بترتيبها. ثلاثة أنواع: content صفحة نص، form صفحة أسئلة، system جزء موثوق من المنصة "
      "(track «نوع التسجيل»، applicant «صاحب الطلب»، residence «مكان الإقامة»، members «المرافقون»، eligibility «فحص الأهلية»، consents «الموافقات»، summary «الملخص»، payment «الدفع»). "
      "لكل سؤال (FieldDef) مفتاح key لا يتغير بعد النشر، وبه تُحفظ الإجابات، ويُسأل مرة للطلب أو لكل فرد (scope).",
      code=["lib/registration/types.ts:90", "lib/registration/types.ts:57"],
      data=["reg_config_versions.config", "reg_form_fields", "application_answers"],
      see=["إصدار إعدادات التسجيل", "الخطوات بعد القبول"]),

    G("الخطوات بعد القبول", "PostStepDef / PostSystemStep",
      "ما يفعله الحاج بعد قبوله حتى التأشيرة. الخطوات الموثوقة: confirm «تأكيد القبول»، documents «الصورة الشخصية»، group «الإلحاق بمجموعة»، payment «الدفعة الثانية»، "
      "passport «جواز السفر»، medical «الملف الطبي»، visa «التأشيرة والرحلة». وتضيف الإدارة خطوات من نوع acknowledge (قراءة وموافقة) أو form أو installment. يُقيّم الحاج كل خطوة بعد إتمامها.",
      code=["lib/registration/types.ts:153", "lib/registration/types.ts:155"],
      data=["post_acceptance", "post_step_ratings", "post_custom_step_completions"],
      see=["تأكيد القبول", "الإلحاق بمجموعة", "الملف الطبي", "التأشيرة"]),

    G("الموسم", "RegSeason / season",
      "الموسم الهجري (1448 = حج أيار 2027). حالاته: preparing «قيد الإعداد»، active الموسم الجاري الذي يُسجَّل فيه (واحد فقط)، archived «مؤرشف» للقراءة فقط.",
      code=["lib/registration/types.ts:206", "lib/season.ts:7"],
      data=["seasons", "seasons.status", "season_calendar"],
      see=["إعدادات الموسم", "العمليات الموسمية"]),

    G("إعدادات الموسم", "SEASON / season",
      "أرقام الموسم التي يقرأها كل حساب: الحصة ونسبها، والعمر المقبول مباشرة، وحدود الأعمار، والرسوم والدفعات، وقواعد الإداريين والتصنيف. "
      "يعدّلها من يملك season.values.PUT في «إعدادات الموسم».",
      code=["lib/season.ts:6", "lib/permissions.ts:262"],
      data=["season_settings"],
      see=["الموسم", "الحصة", "شروط الطلب المجمّدة", "إصدار إعدادات التسجيل"]),

    G("العمليات الموسمية", "OperationKey / OPERATIONS",
      "عمليات الموسم، تُفتح وتُغلق كل منها وحدها: hajj-direct، hajj-lottery، admin-registration «التسجيل كإداري»، admin-exams «الاختبارات»، admin-orals «الامتحانات الشفهية»، "
      "group-formation «تشكيل المجموعات»، group-joining «إلحاق الحجاج بالمجموعات»، cluster-formation «تشكيل التكتلات»، وعمليات التقييم بعد الموسم. "
      "لكل عملية وضع: auto «تلقائي بالتواريخ»، on «فعال»، off «غير فعال»، وصلاحية تتحكم بها.",
      code=["lib/operations.ts:22", "lib/operations.ts:79"],
      data=["operations", "operation_windows"],
      see=["الموسم", "التسجيل كإداري", "التشكيل في المكتب"]),

    G("المحاكاة", "simulated / (محاكاة)",
      "أدوات النسخة التجريبية لا المنصة الحقيقية: اعتبار شرط محققاً للتجربة («محاكاة: اعتُبر الشرط محققاً»)، وتقديم ساعة العرض، وأفعال تُنسب إلى أشخاص «(محاكاة)»، و«إعادة ضبط التجربة». "
      "لا تُبنى في المنصة الحقيقية.",
      code=["lib/store.ts:83", "lib/rules.ts:115"],
      see=[]),

    # ───────────────────────── ما بعد القبول ─────────────────────────
    G("الإلحاق بمجموعة", "PostSystemStep: 'group' / PilgrimContract",
      "عملية مستقلة عن التسجيل: لا يختار الحاج مجموعة في المنصة، بل يتفق مع مجموعة ويوقّع عقده معها في المكتب، فيرفع الموظف العقد ويلحق العائلة كاملة بها. "
      "حالات العقد: pending «عند المكتب»، approved «نافذ»، returned «أُعيد». والعقد نفسه ينقل العائلة من مجموعة إلى أخرى (transferFrom).",
      code=["lib/store.ts:275", "lib/operations.ts:66"],
      data=["group_enrollment_contracts", "post_acceptance.group_id", "application_group_transfers"],
      see=["المجموعة", "الطلب العائلي", "الدفعة"]),

    G("السكن العام", "Accommodation: { kind: 'general' }",
      "السكن الافتراضي بلا كلفة إضافية: الرجال وحدهم والنساء وحدهن. البديل «الغرف الخاصة» (kind: 'private'): غرف تختارها العائلة بعدد أسرّتها (مفردة، سريران، ثلاثة، أربعة) "
      "بسعر للفرد يحدده كل تكتل، وتُدفع مع الهدي في الخطوة المحددة.",
      code=["lib/rooms.ts:28", "lib/rooms.ts:31"],
      data=["application_accommodation", "application_accommodation_rooms"],
      see=["الهدي", "التكتل"]),

    G("الملف الطبي", "PostSystemStep: 'medical'",
      "خطوة بعد القبول، لا تُفتح قبل اكتمال الدفع، تجمع شيئين: الملف الصحي الذي يسجله المنسق ويؤكده الحاج، والوثائق الطبية التي يرفعها الحاج لكل فرد. "
      "تكتمل حين يعتمدها الفريق الطبي.",
      code=["lib/registration/validate.ts:57", "app/portal/application/_components/post/step-medical.tsx:20"],
      data=["health_files", "member_medical_documents"],
      see=["الملف الصحي", "الوثائق الطبية", "الوثائق الصحية"]),

    G("الملف الصحي", "HealthFile / HealthRecord",
      "أمراض كل فرد المزمنة وأدويته واحتياجاته، يسجلها المنسق التقني المفروز على المجموعة بعد الإلحاق، ثم يؤكدها الحاج. لا يُسأل الحاج عن صحته عند التسجيل.",
      code=["lib/store.ts:259", "lib/store.ts:266"],
      data=["health_files", "health_records"],
      see=["الملف الطبي", "منسق تقني"]),

    G("الوثائق الطبية", "SEASON.medicalDocuments",
      "شهادات اللقاح والتقرير الطبي والوصفة الدائمة التي يرفعها الحاج لكل فرد في خطوة الملف الطبي، وبعضها لفئة فقط (الإنفلونزا لمن بلغ 60، والوصفة لمن يتناول دواءً دائماً).",
      code=["lib/season.ts:129"],
      data=["medical_document_types", "member_medical_documents"],
      see=["الملف الطبي", "حالة الوثيقة"]),

    G("الوثائق الصحية", "HealthDoc / HealthDocKind",
      "وثائق يضيفها فريق المجموعة لكل حاج: certificate «الشهادة الصحية — وزارة الصحة»، prescription «وصفة طبية»، condition «تقرير حالة صحية». "
      "تظهر للحاج في «خزنة الوثائق». غير «الوثائق الطبية» التي يرفعها الحاج.",
      code=["lib/store.ts:436", "lib/health-docs.ts:11"],
      data=["member_health_docs"],
      see=["الوثائق الطبية", "خزنة الوثائق"]),

    G("حالة الوثيقة", "DocStatus",
      "حالة كل وثيقة يرفعها الحاج (الصورة، الجواز، الوثائق الطبية): missing «لم تُرفع»، uploaded «عند المراجعة»، rejected «أُعيدت»، approved «مقبولة».",
      code=["lib/store.ts:256"],
      data=["member_documents.status", "member_medical_documents.status"],
      see=["مراجعة الطلبات والوثائق", "الوثائق الطبية"]),

    G("التأشيرة", "PilgrimVisa / PostSystemStep: 'visa'",
      "تأشيرة كل فرد، يرفعها فريق المجموعة برقمها وملفها. حين تكتمل تأشيرات العائلة تكتمل خطوة «التأشيرة والرحلة» وتُفتح صفحات الرحلة والسكن.",
      code=["lib/store.ts:430", "lib/visas.ts:11"],
      data=["member_visas", "post_acceptance.visa_completed_at"],
      see=["الخطوات بعد القبول", "الرحلة"]),

    G("خزنة الوثائق", "/portal/application/documents",
      "صفحة الحاج التي تجمع وثائق طلبه: الإيصالات والعقد والتأشيرات والوثائق الصحية والشهادة. تُفتح بعد تأكيد القبول. "
      "الملف الدائم للإداري (شهاداته ولغاته ومهاراته) شيء آخر تسمّيه بوابته «وثائقي ومهاراتي».",
      code=["app/portal/_components/account-sidebar.tsx:132"],
      data=["member_documents", "member_health_docs", "member_visas", "hajj_certificates"],
      see=["الوثائق الصحية", "الملف الدائم", "الإيصال"]),

    G("البطاقة الرقمية", "card",
      "بطاقة الحاج في التطبيق، تعمل دون إنترنت ويُظهرها عند الحاجة (مثل التيه). تتبع حسابه، فتُعرض أو تُطبع من المنصة إن ضاع الهاتف. يتابعها المنسق التقني.",
      code=["lib/data/guide.ts:242", "lib/journey.ts:31"],
      see=["منسق تقني"]),

    G("البلاغ", "Ticket",
      "ما يرفعه الحاج أو فريقه أثناء الموسم إلى غرفة العمليات. الأنواع: health، missing، transport، meal، room، lost، complaint؛ الخطورة: low، medium، high، critical؛ "
      "الحالة: open، in_progress، resolved. تنبيه: تسمّيه الشاشات «بلاغ» و«تذكرة» معاً، وresolved تظهر للحاج «تم الحل» وفي غرفة العمليات «مغلق»، "
      "وأسماء الأنواع تختلف بين الجهتين (مثلاً «غرفة» و«خيمة / غرفة»).",
      code=["lib/store.ts:239", "app/portal/season/_components/tickets.tsx:10"],
      data=["tickets", "ticket_kinds", "ticket_updates"],
      see=["غرفة العمليات"]),

    G("غرفة العمليات", "operations.room",
      "صلاحية فريق الموسم في مكة الذي يستقبل البلاغات ويتابعها، ويدير المهام الداخلية في أعمدة (todo، doing، done، verified) ويسجّل قرارات الغرفة.",
      code=["lib/staff.ts:26", "lib/data/staff-seed.ts:538"],
      data=["tickets", "internal_tasks", "ops_decisions"],
      see=["البلاغ", "الصلاحية"]),

    G("تقييم الحاج", "ratings / pilgrim-evaluation",
      "تقييمات يعطيها الحاج: لكل خطوة بعد القبول، وأثناء الموسم، ثم تقييم اختياري شامل بعد العودة لرحلته ومجموعته وتكتله عموماً، لا لأشخاص بأسمائهم، ولا يدخل في تقييم الإداريين.",
      code=["lib/store.ts:74", "lib/operations.ts:71"],
      data=["post_step_ratings", "season_ratings", "pilgrim_evaluations"],
      see=["التقييم الذاتي", "تقييم الموظفين"]),

    G("شهادة أداء الحج", "hajj certificate",
      "شهادة «أداء فريضة الحج» تصدر للحاج بعد الموسم وتُحفظ في خزنة الوثائق، ويمكن التحقق منها برقمها أو رمز QR.",
      code=["app/portal/season/_components/evaluation.tsx:162"],
      data=["hajj_certificates"],
      see=["خزنة الوثائق", "التحقق من الجهات والوثائق"]),

    # ───────────────────────── الإداريون والصفات ─────────────────────────
    G("الإداري", "admin / ADMIN_ROLE",
      "صاحب حساب اختار في موسم أن يخدم الحجاج بصفة إدارية واحدة، فيُفتح له ملف إداري لذلك الموسم. المشاركة تتجدد كل موسم بطلب ورسم جديدين، "
      "ولهذا تُسمّى بوابته «الإداري الموسمي» وإن كان حسابه دائماً.",
      code=["app/administrator/_lib/admin.ts:15", "app/administrator/layout.tsx:3"],
      data=["admin_season_files", "cadre_people"],
      see=["الصفة", "الملف الإداري", "الكادر الإداري", "مسار الموسم"]),

    G("الصفة", "RoleDef / role_key",
      "الدور الإداري في الموسم، وللإداري صفة واحدة كل موسم. لكل صفة مستوى (cluster «تكتل»، group «مجموعة»، shared «مشترك») وسلوكيات مستقلة (مقعد الموجّه، مقعد المعاون، مرشّحو منسّقي التكتل…). "
      "صفة applied يُتقدَّم لها بشروط واختبار، وغيرها تمنحه الإدارة. تحرّر القائمة في «القوائم المرجعية».",
      code=["app/administrator/_lib/structure.ts:31", "app/administrator/_lib/structure.ts:85"],
      data=["admin_roles", "role_requirements", "admin_role_permissions"],
      see=["الصفة الأساسية", "الصفة الموسمية", "القوائم المرجعية", "رئيس تكتل", "رئيس مجموعة"]),

    G("الصفة الأساسية", "primary role",
      "الصفة الثابتة للفرد في الكادر عبر المواسم (ما تقدّم له وثبت فيه، أو ما منحته الإدارة دائماً).",
      code=["app/administrator/_lib/structure.ts:303"],
      data=["cadre_people.primary_role_key"],
      see=["الصفة", "الصفة الموسمية", "الكادر الإداري"]),

    G("الصفة الموسمية", "SeasonalRole",
      "صفة تمنحها الإدارة لشخص لموسم واحد فوق صفته الأساسية، مع سببها ومن منحها: رئيس مجموعة يصير «رئيس تكتل» لزيادة الأعداد، أو رئيس مجموعة دمج مجموعته فيخدم «معاوناً». "
      "يمكن أن تحمل تسمية من «التسميات الموسمية الجاهزة».",
      code=["app/administrator/_lib/structure.ts:127"],
      data=["cadre_seasonal_roles"],
      see=["الصفة الأساسية", "التسميات الموسمية الجاهزة"]),

    G("التسميات الموسمية الجاهزة", "RoleLabel",
      "أسماء جاهزة تُعطى للصفة الموسمية، كل منها مقترح لصفة: «معاون - مكتب سياحي»، «موجّه ب»، «معاون متحد».",
      code=["app/administrator/_lib/structure.ts:115"],
      data=["admin_role_labels", "cadre_seasonal_roles.label_id"],
      see=["الصفة الموسمية"]),

    G("رئيس تكتل", "role: 'cluster-head'",
      "صفة لا يُتقدَّم لها: تمنحها الإدارة أساسيةً أو موسمية. صاحبها يُشكَّل به تكتل في المكتب، فيختار مجموعاته وكادره ويوزّعه، ويدير التكتل بعد اعتماده، ويضع مجموعاته على الرحلات. "
      "سلوكه في الكود «قائد التكتل» (clusterLeader).",
      code=["app/administrator/_lib/structure.ts:86", "app/administrator/_lib/structure.ts:73"],
      data=["admin_roles", "clusters.head_account_id"],
      see=["التكتل", "الصفة", "رئيس مجموعة"]),

    G("رئيس مجموعة", "role: 'group-head'",
      "يتقدّم لها الإداري ويشكّل مجموعته ويقودها. له فئة تحددها الإدارة هي فئة مجموعته. "
      "تنبيه: تسمّيه نصوص الأكاديمية «قائد المجموعة»، وهو في الكود اسم سلوك الصفة (groupLeader) لا اسمها.",
      code=["app/administrator/_lib/structure.ts:87", "app/administrator/_lib/structure.ts:74"],
      data=["admin_roles", "admin_groups.head_account_id"],
      see=["المجموعة", "فئة المجموعة", "رئيس تكتل"]),

    G("معاون", "role: 'group-deputy'",
      "يشغل مقعد المعاون في مجموعة، أو يكون معاون التكتل: الحضور والتجمّع والمطارات والمستلزمات.",
      code=["app/administrator/_lib/structure.ts:88"],
      data=["admin_roles", "group_seats.kind"],
      see=["معاون التكتل", "معاون بعدد", "مقاعد المجموعة"]),

    G("معاون التكتل", "TeamPool: 'cluster-assistant' / pool: 'assistant'",
      "معاون يخدم التكتل كله لا مجموعة واحدة، عددهم محدد في تركيب مستوى التكتل (واحد في الاقتصادي).",
      code=["lib/store.ts:390", "app/administrator/_lib/structure-defaults.ts:32"],
      data=["cluster_members.pool", "tier_compositions.cluster_assistants"],
      see=["معاون", "معاون بعدد", "مستوى التكتل"]),

    G("معاون بعدد", "role: 'assistant-count'",
      "معاون يُختار من معاوني التكتل بلا حد أقصى، ويضيف كل واحد 20 حاجاً إلى عدد حجاج التكتل (multiplier). يمتحن امتحان المعاون.",
      code=["app/administrator/_lib/structure.ts:97"],
      data=["admin_roles.multiplier", "cluster_members.pool"],
      see=["معاون", "معاون التكتل"]),

    G("منسق تقني", "role: 'tech'",
      "صفة للتكتل لا للمجموعة: يفرزه رئيس التكتل على مجموعات (حسب حده من الوحدات)، فيسجّل حجاجها في المكتب، ويأخذ ملفاتهم الصحية، ويضعهم على الحافلات. "
      "يملك افتراضياً صلاحية «التسجيل على الحج». تسمّيه شاشات الحاج «منسق مجموعتك» مع أنه منسق التكتل المفروز على المجموعة.",
      code=["app/administrator/_lib/structure.ts:89", "app/administrator/_lib/coordinators.ts:17"],
      data=["admin_roles", "cluster_members.pool", "cluster_groups.coordinator_account_id"],
      see=["الفرز", "معاون ومنسق تقني", "الملف الصحي", "الوحدات"]),

    G("معاون ومنسق تقني", "role: 'assistant-tech'",
      "صفة تجمع الاثنتين: يمتحن امتحانَي المعاون والمنسق التقني ويلزمه اجتيازهما، ويشغل مقعد معاون أو يكون من منسقي التكتل. لا بد أن يكون أحد منسقي كل تكتل بهذه الصفة.",
      code=["app/administrator/_lib/structure.ts:90"],
      data=["admin_roles"],
      see=["منسق تقني", "معاون"]),

    G("موجّه ديني", "role: 'murshid' | 'guide-m' | 'guide-m-c'",
      "يشغل مقعد الموجّه في مجموعة: الدروس والمناسك والأسئلة الشرعية. ثلاث درجات، كل درجة صفة: «موجّه ديني أ» (murshid، يمنح التكتل شارة التميّز في التوجيه الديني ويُحتسب عمره 40)، "
      "«ب» (guide-m، عمره 45)، «ج» (guide-m-c، بعمره). الأسماء القديمة «مرشد ديني» و«موجّه ديني» ما زالت تُقرأ في سجلات سابقة.",
      code=["app/administrator/_lib/structure.ts:91", "app/administrator/_lib/structure.ts:101"],
      data=["admin_roles", "admin_roles.fixed_age"],
      see=["موجّهة دينية", "الشارات", "مقاعد المجموعة"]),

    G("موجّهة دينية", "role: 'murshida' | 'guide-f' | 'guide-f-c'",
      "للتكتل لا للمجموعة: التوجيه الديني لحاجّات التكتل، وعددها بمجموع فئات مجموعاته، ويفرزها رئيس التكتل على المجموعات. ثلاث درجات: أ (murshida، تمنح شارة التميّز، عمرها 40)، "
      "ب (guide-f، عمرها 48)، ج (guide-f-c، بعمرها).",
      code=["app/administrator/_lib/structure.ts:94"],
      data=["admin_roles", "cluster_members.pool", "cluster_groups.female_guide_account_id"],
      see=["موجّه ديني", "الوحدات", "الفرز"]),

    G("محاسب التكتل", "SECONDARY 'cluster-accountant'",
      "صفة ثانوية يعطيها رئيس التكتل لأحد أفراده، وليست صفة موسمية لأحد. يتابع قوائم الحافلات مع رئيس التكتل ومعاونه.",
      code=["app/administrator/_lib/structure.ts:110"],
      data=["cluster_members.pool"],
      see=["التكتل"]),

    G("الملف الإداري", "AdminProfile",
      "ملف الإداري في موسم واحد: صفته، ووضع تجديده، والتزاماته، ورسمه وإيصاله، ونتيجة أهليته واختباره، ومجموعته وتكتله. تسمّيه بوابته «طلبي الإداري». "
      "تنبيه: «ملف» في المنصة يعني أيضاً ملف الإدارة (للموظف) والملف التشغيلي والملف الصحي وملف الطيران.",
      code=["lib/store.ts:497"],
      data=["admin_season_files"],
      see=["الإداري", "الملف الدائم", "تجديد الصفة", "ملف الإدارة", "الملف التشغيلي"]),

    G("الملف الدائم", "AdminRecord",
      "ما يبقى للإداري عبر المواسم: شهاداته ووثائقه (لكل منها موسم إصدار ومدة صلاحية)، ولغاته، ومهاراته. يبدأ منه كل طلب موسمي جديد. "
      "تسمّيه بوابة الإداري «وثائقي ومهاراتي» وشاشة الموظفين «الملف الدائم».",
      code=["lib/store.ts:369", "lib/store.ts:353"],
      data=["admin_vault_documents", "account_languages", "account_skills"],
      see=["الملف الإداري", "خزنة الوثائق"]),

    G("تجديد الصفة", "renewal: 'keep' | 'change' | 'first'",
      "علاقة طلب الإداري بآخر موسم خدم فيه: keep «تجديد الصفة نفسها»، change صفة أخرى، first أول مرة. من جدّد صفته وتقييمه 3.5 فأكثر ولم ينقطع أكثر من موسم واحد "
      "يُعفى من الاختبارين (examExempt).",
      code=["lib/store.ts:509", "lib/season.ts:84"],
      data=["admin_season_files.renewal", "admin_season_files.exam_exempt", "season_settings.keep_role_min_rating"],
      see=["الملف الإداري", "الاختبار المؤتمت"]),

    G("الالتزامات", "COMMITMENTS",
      "تعهدات يقبلها الإداري واحداً واحداً قبل التقدم: السفر مع الحجاج طوال الموسم، والالتزام بالتعليمات ولائحة المكافآت والعقوبات، وميثاق الأخلاقيات، وقبول التقييم.",
      code=["app/administrator/_lib/admin.ts:144"],
      data=["admin_commitments", "admin_commitment_acceptances"],
      see=["الملف الإداري"]),

    G("التسجيل كإداري", "operation: 'admin-registration'",
      "عملية الموسم التي يتقدم فيها الإداري لصفة واحدة من الصفات المفتوحة للتقدم، بشروطها ووثائقها ورسمها (30 $). تسمّيها بوابة الحساب «التقدّم لصفة إدارية».",
      code=["lib/operations.ts:62", "lib/season.ts:50"],
      data=["admin_season_files", "operation_windows"],
      see=["الملف الإداري", "الصفة", "العمليات الموسمية"]),

    G("الكادر الإداري", "cadre / CadrePerson",
      "سجل كل من خدم إدارياً عبر المواسم كما تديره «إدارة الإداريين»: صفته الأساسية وفرعه وفئته وحسابه وحالته، وأحداث ملفه (انضمام، صفة موسمية، تغيير فرع أو فئة، إيقاف…). "
      "ومنه ترسل الإدارة رسائل تيليجرام إلى أفراد الكادر.",
      code=["lib/store.ts:618", "lib/store.ts:624"],
      data=["cadre_people", "cadre_events", "telegram_messages"],
      see=["الصفة الأساسية", "الفرع", "الإداري"]),

    G("الاختبار المؤتمت", "Attempt / AttemptStatus",
      "اختبار الصفة المكتوب على جهاز في قاعة مركز امتحاني بإشراف مشرف القاعة. حالات المحاولة: ready «مقترن — لم يبدأ»، active «يختبر»، submitted «سلّم — بانتظار التأكيد»، "
      "confirmed «مؤكَّد»، unconfirmed «غير مؤكَّد»، voided «ملغى». تنبيه: المنصة تقول «اختبار» للمكتوب و«امتحان» للشفهي ولملف «إدارة الامتحانات» كله.",
      code=["lib/store.ts:918", "app/administrator/_lib/halls.ts:120"],
      data=["exams", "exam_attempts", "exam_sittings"],
      see=["المركز الامتحاني", "الامتحان الشفهي", "تجديد الصفة"]),

    G("المركز الامتحاني", "ExamCenter",
      "مركز في محافظة فيه قاعة الاختبار، يخدم محافظات محددة، ولقاعته مشرف (موظف بلا صلاحية يُسند إلى المركز) يفتح الجلسة ويؤكد المحاولات برمزه.",
      code=["app/administrator/_lib/halls.ts:28"],
      data=["exam_centers", "exam_center_governorates", "exam_supervisor_pins"],
      see=["الاختبار المؤتمت"]),

    G("الامتحان الشفهي", "OralState",
      "بعد النجاح في الاختبار المؤتمت يحجز الإداري موعداً أمام لجنة صفته في مركزه فتسجّل نتيجته. القيم: booked «محجوز»، passed «ناجح»، failed «راسب»، absent «غائب». "
      "لا يتأهل إلا بنجاحه في الاثنين.",
      code=["lib/store.ts:427", "lib/operations.ts:64"],
      data=["oral_slots", "oral_bookings"],
      see=["الاختبار المؤتمت"]),

    # ───────────────────────── المجموعات والتكتلات ─────────────────────────
    G("المجموعة", "group / admin_groups",
      "وحدة الحجاج الأساسية: رئيس مجموعة وفريقه (موجّه ومعاون حسب فئتها) وحجاجها، باسم ورقم. تُشكَّل في المكتب، وتدخل تكتلاً واحداً، ويُلحق بها الحجاج بعقود.",
      code=["lib/journey.ts:22", "lib/groups.ts:89"],
      data=["admin_groups", "group_seats"],
      see=["رئيس مجموعة", "فئة المجموعة", "التكتل", "الإلحاق بمجموعة"]),

    G("فئة المجموعة", "Category (c1…c4)",
      "فئة رئيس المجموعة التي تحددها الإدارة، وهي فئة مجموعته: «الفئة الأولى» حتى «الرابعة»، ولكل منها وزن (1–4) يحدد مع مستوى التكتل عدد حجاجها ومقاعد فريقها. "
      "تنبيه: التصنيف في نهاية الموسم يسمّي درجاته أيضاً «الفئة الأولى/الثانية/الثالثة» (SEASON.grading.tiers) ويقرنها بأسماء مستويات الخدمة، وهو مفهوم آخر.",
      code=["app/administrator/_lib/structure-defaults.ts:8", "app/administrator/_lib/structure-defaults.ts:17"],
      data=["group_categories", "category_rules", "admin_groups.category_key"],
      see=["المجموعة", "مستوى التكتل", "الوحدات", "التصنيف"]),

    G("التكتل", "ClusterRecord / cluster",
      "تجمّع مجموعات تحت رئيس تكتل، بكادر مشترك (معاوني التكتل ومنسقيه وموجّهاته ومحاسبه)، ومستوى خدمة، وصفحة عامة. يُشكَّل في المكتب ويُرفع عقده الموقّع. "
      "حالات الطلب: draft «قيد التشكيل في المكتب»، pending «قيد المراجعة»، reviewing «جاري المراجعة»، approved، rejected «مرفوض — بملاحظات».",
      code=["lib/store.ts:459", "lib/store.ts:392"],
      data=["clusters", "cluster_groups", "cluster_members", "cluster_status_history"],
      see=["رئيس تكتل", "مستوى التكتل", "المجموعة", "التشكيل في المكتب", "الصفحة العامة للتكتل"]),

    G("مستوى التكتل", "Tier: 'eco' | 'eco-plus' | 'five'",
      "مستوى الخدمة الذي يُشكَّل عليه التكتل: «اقتصادي»، «اقتصادي محسن»، «خمس نجوم». يحدد حجاج كل فئة ومقاعدها، وتركيب كادر التكتل.",
      code=["app/administrator/_lib/structure.ts:137", "app/administrator/_lib/structure.ts:138"],
      data=["service_tiers", "clusters.tier_key", "tier_compositions"],
      see=["فئة المجموعة", "التكتل", "الوحدات"]),

    G("مقاعد المجموعة", "Seat: { kind: 'guide' | 'assistant', free }",
      "مقاعد فريق المجموعة كما تحددها فئتها تحت مستوى التكتل: مقاعد الموجّه، ومقاعد المعاون، ومقاعد حرة يملؤها رئيس التكتل بأي منهما.",
      code=["lib/store.ts:385", "app/administrator/_lib/structure-defaults.ts:21"],
      data=["group_seats", "category_rules"],
      see=["فئة المجموعة", "معاون", "موجّه ديني"]),

    G("الوحدات", "units / Composition",
      "مجموع أوزان فئات مجموعات التكتل. يجب أن يقع بين حدّي مستواه، ومنه يُحسب عدد المنسقين (منسق لكل 6 وحدات في الاقتصادي) والموجّهات (واحدة لكل 7).",
      code=["app/administrator/_lib/structure-defaults.ts:32", "app/administrator/_lib/structure.ts:264"],
      data=["tier_compositions"],
      see=["فئة المجموعة", "منسق تقني", "موجّهة دينية"]),

    G("الفرز", "sorting / guideSorting",
      "توزيع رئيس التكتل منسقيه وموجّهاته على مجموعات التكتل، كلٌّ ضمن حدّه من الوحدات. المنسق لا يعمل إلا في المجموعات المفروزة له.",
      code=["lib/store.ts:492"],
      data=["cluster_groups.coordinator_account_id", "cluster_groups.female_guide_account_id"],
      see=["منسق تقني", "موجّهة دينية", "الوحدات"]),

    G("الشارات", "BADGES",
      "شارات يكسبها التكتل وتظهر في صفحته: «شارة العمر» (متوسط أعمار الكادر 40 أو أقل، بالأعمار المثبّتة للموجّهين)، «شارة التميّز في التوجيه الديني» (موجّه أو موجّهة من الدرجة أ)، "
      "«شارة الالتزام بالمواعيد» (أُرسل الطلب قبل الموعد الأول).",
      code=["app/administrator/_lib/structure.ts:339", "app/administrator/_lib/structure.ts:333"],
      data=["clusters.first_sent_at", "admin_roles.guidance_badge", "admin_roles.fixed_age"],
      see=["التكتل", "موجّه ديني"]),

    G("التشكيل في المكتب", "group-formation / cluster-formation",
      "تُشكَّل المجموعات ثم التكتلات في المكتب بحضور أصحابها: يُدخلها موظف «إدارة الإداريين»، ويقبض رسمها، ويرفع عقدها الموقّع، فتُنشأ معتمدة.",
      code=["lib/operations.ts:65", "lib/operations.ts:67"],
      data=["admin_groups.formed_at_office", "clusters.created_at_office"],
      see=["المجموعة", "التكتل", "المكتب"]),

    G("قناة التكتل", "ClusterChannel",
      "قناة رسائل إداريي التكتل: يقرؤها كل من في التكتل، ويكتب فيها أصحاب الصفات التي يحددها رئيسه (افتراضياً هو وحده)، وله أن يمنع فرداً من الكتابة ويثبّت رسالة.",
      code=["lib/store.ts:416"],
      data=["channel_messages", "cluster_channel_writer_roles", "channel_mutes"],
      see=["قناة المجموعة", "التكتل"]),

    G("قناة المجموعة", "GroupPost",
      "رسائل فريق المجموعة إلى حجاجها، موجّهة إلى جمهور: «المجموعة كاملة»، «الرجال»، «السيدات»، «كبار السن ومرافقوهم».",
      code=["lib/store.ts:433", "lib/group-channel.ts:15"],
      data=["group_posts"],
      see=["قناة التكتل", "المجموعة"]),

    G("المراسلات", "Letter",
      "محادثات الإداري مع إدارة الإداريين: استفسار، طلب، شكوى، اقتراح، إبلاغ عن مشكلة. تقرؤها الإدارة وتردّ عليها.",
      code=["lib/store.ts:628"],
      data=["letters", "letter_messages"],
      see=["الإداري"]),

    G("الخطة التشغيلية", "OperationalPlan",
      "خطة يقدّمها رئيس التكتل للإدارة. الحالات: submitted «تنتظر القرار»، accepted «مقبولة»، returned «أُعيدت بملاحظات».",
      code=["lib/store.ts:644"],
      data=["operational_plans"],
      see=["رئيس تكتل", "مراجع الكادر"]),

    G("مراجع الكادر", "references",
      "ما تنشره الإدارة للكادر: التوصيف الوظيفي لكل صفة، والنظام الإداري، والمقررات الإدارية، والعقود المرجعية. "
      "تسمّيه بوابة الإداري «مراجع الكادر» وملف إدارة الإداريين «المراجع الإدارية».",
      code=["app/portal/_components/account-sidebar.tsx:111", "lib/systems.ts:64"],
      data=["admin_job_descriptions", "admin_system_sections", "admin_decisions", "admin_contract_templates"],
      see=["القوائم المرجعية", "الخطة التشغيلية"]),

    G("القوائم المرجعية", "Structure",
      "قوائم «إدارة الإداريين» التي تقرؤها كل الشاشات: الصفات وسلوكياتها، والفروع، ومستويات التكتلات، وفئات المجموعات وأعدادها، والتسميات الموسمية. "
      "غير «البيانات المرجعية» في الملفات التشغيلية (الفنادق والقطاعات والمخيمات).",
      code=["app/administrator/_lib/structure.ts:156", "lib/systems.ts:63"],
      data=["admin_roles", "branches", "service_tiers", "group_categories", "category_rules", "admin_role_labels"],
      see=["الصفة", "الفرع", "مستوى التكتل", "فئة المجموعة", "البيانات المرجعية"]),

    # ───────────────────────── الميدان ─────────────────────────
    G("الميدان", "/portal/field",
      "شاشة من يدير عمليات المجموعة في الموسم (منسقها أو رئيسها أو معاونها): منها يسجّل أداء المناسك والمزارات والسفر، ويرفع البلاغات.",
      code=["lib/musters.ts:8"],
      data=["field_records"],
      see=["أداء المناسك", "التجمّع", "البلاغ"]),

    G("أداء المناسك", "Muster / FieldRecordKind",
      "سجل يُكتب بعد أداء كل نسك (عمرة التمتع، الوقوف بعرفة، المبيت بمزدلفة ودرجته، رمي الجمرات، ليالي منى): متى أُدّي، ومن أدّاه من المجموعة، وسبب من لم يؤدِّه. "
      "ومثله «المزارات» و«السفر». يصل إلى الحاج في «أداء المناسك» من بوابته. الكود يحفظه باسمه القديم musters.",
      code=["lib/musters.ts:17", "lib/musters.ts:80"],
      data=["field_records", "field_record_kinds", "field_record_persons"],
      see=["الميدان", "التجمّع"]),

    G("التجمّع", "musters (اسم قديم)",
      "كان سجل الميدان أول الأمر «تجمّعاً» يُنادى إليه الحجاج ويُعلَّم الحاضرون، ثم صار «أداء المناسك» بعد الأداء. بقي الاسم في الكود (AdminProfile.musters) "
      "وفي نصوص برنامج الموسم بمعنى نقطة اللقاء («التجمّع والانطلاق إلى المطار»).",
      code=["lib/store.ts:590", "lib/musters.ts:14"],
      data=["field_records", "flights.gathering"],
      see=["أداء المناسك", "الميدان"]),

    G("القوائم", "ListKind",
      "قوائم ما قبل كل نسك: من من التكتل يذهب وعلى أي حافلة. الأنواع: tarwiya «التروية»، arafat «عرفة»، mina «منى أيام التشريق»، madinah «الذهاب إلى المدينة المنورة»، "
      "rawdah «حجز الروضة الشريفة» (قائمة للرجال وقائمة للنساء بلا حافلات). يعطي «فريق المواصلات» (صلاحية transport) كل تكتل حافلاته برقم ولوحة وسائق ومقاعد، "
      "ويقرر في طلبات الحافلات الإضافية، ويُجلس المنسق الحجاج عليها.",
      code=["lib/rite-lists.ts:15", "lib/rite-lists.ts:17"],
      data=["rite_list_kinds", "rite_list_units", "rite_list_seats", "bus_requests"],
      see=["منسق تقني", "الصلاحية"]),

    G("الدروس الدينية", "GroupLesson",
      "دروس يعلنها موجّه المجموعة (للرجال أو للجميع) أو موجّهة التكتل (للنساء)، بموضوع ومرحلة (قبل السفر، في مكة، في المشاعر، في المدينة)، ويسجّل حضورها. "
      "يرى الحاج «سنحضر» ليعلن حضوره.",
      code=["lib/lessons.ts:19", "lib/lessons.ts:83"],
      data=["group_lessons", "lesson_interest", "lesson_attendance", "lesson_topics"],
      see=["النشاطات الدينية", "موجّه ديني"]),

    G("النشاطات الدينية", "Activity / ActivityKind",
      "برامج حفظ يتابع فيها الموجّه تقدّم كل حاج بجلسات تسميع وتقدير: quran «تحفيظ القرآن»، hadith «تحفيظ الحديث»، adhkar «حفظ أدعية الحج والعمرة»، khatma «ختمة جماعية».",
      code=["lib/religious.ts:15", "lib/religious.ts:21"],
      data=["religious_activities", "activity_progress", "activity_sittings"],
      see=["الدروس الدينية"]),

    G("التقرير اليومي", "DailyReport",
      "تقرير يرسله الإداري كل يوم من الموسم («يومي») إلى التكتل أو إلى الإدارة: الحال العامة والصحة والشكاوى والملاحظات.",
      code=["lib/store.ts:728"],
      data=["daily_reports"],
      see=["الإداري"]),

    # ───────────────────────── التقييم والتصنيف ─────────────────────────
    G("التقييم الذاتي", "SelfEvaluation",
      "بعد هبوط آخر رحلات العودة يقيّم كل إداري نفسه في كل مرحلة من مراحل الموسم ويرسل تقييمه مرة واحدة.",
      code=["lib/store.ts:713", "lib/operations.ts:72"],
      data=["self_evaluations", "self_evaluation_scores", "evaluation_stages"],
      see=["تقييم الموظفين", "الاعتراض على التقييم", "التصنيف"]),

    G("تقييم الموظفين", "PeerEvaluation (kind: 'staff')",
      "تقييم موظفي البعثة المفروزين على البرج أو المخيم للتكتلات التي سكنت فيه: كل تكتل، وكل مجموعة، وكل إداري، مرحلة مرحلة. الإداريون لا يقيّم بعضهم بعضاً.",
      code=["lib/store.ts:722", "lib/operations.ts:73"],
      data=["peer_evaluations", "peer_evaluation_scores", "staff_evaluations"],
      see=["التقييم الذاتي", "الاعتراض على التقييم"]),

    G("الاعتراض على التقييم", "EvaluationObjection",
      "يعترض الإداري على تقييم الموظفين له في مراحل يحددها مع سببه. القيم: pending «عند إدارة الإداريين»، accepted «قُبل — يُعاد التقييم»، rejected «رُفض».",
      code=["lib/store.ts:719", "lib/operations.ts:74"],
      data=["evaluation_objections"],
      see=["تقييم الموظفين"]),

    G("التصنيف", "Graded / Outcome",
      "ترتيب المجموعات والتكتلات في نهاية الموسم داخل كل درجة وعبر كل المكاتب: أعلى 30% ترتقي درجة، وأدنى 20% تنزل، والباقون يبقون؛ وأول 3 في كل درجة يُكرَّمون. "
      "نتائج الصف: promote، hold، demote، ceiling، warned. رئيس المجموعة الجديد يبدأ من الدرجة الأولى.",
      code=["lib/grading.ts:29", "lib/season.ts:102"],
      data=["grading_publications", "grading_results", "season_settings.promote_share", "season_settings.demote_share"],
      see=["فئة المجموعة", "لوحة الشرف"]),

    G("لوحة الشرف", "honourRolls / AWARDS",
      "صفحة عامة بالإداريين المكرّمين في كل موسم: رؤساء المجموعات، وأفضل منسق تقني وموجّه ديني وموجّهة دينية ومعاون، وأفضل التكتلات، من سجلات المنصة نفسها.",
      code=["app/honours/_lib/roll.ts:11", "app/honours/_lib/roll.ts:45"],
      data=["honours_awards"],
      see=["نجوم الموسم", "التصنيف"]),

    G("نجوم الموسم", "home section 'honours'",
      "قسم الصفحة الرئيسية الذي يعرض لمحة من لوحة الشرف لموسمين: الموسم الماضي بنتائجه، والجاري الذي تُعلن لوحته بعد العودة، مع رابط «لوحة الشرف كاملة».",
      code=["app/_home/honours-teaser.tsx:15", "lib/cms/schema.ts:176"],
      data=["honours_awards", "cms_page_sections"],
      see=["لوحة الشرف"]),

    # ───────────────────────── الموظفون وبوابتهم ─────────────────────────
    G("الموظف", "StaffUser / Employee",
      "موظف البعثة. مفهومان في الكود: حساب بوابة الموظفين (StaffUser، لا يُنشئه صاحبه بل يُمنح صلاحيات) وسجل الموظف الدائم أو المنتدب (Employee) الذي قد لا يكون له حساب.",
      code=["lib/staff.ts:33", "lib/ops.ts:86"],
      data=["staff_users", "employees", "employee_seasons"],
      see=["الصلاحية", "البعثة", "الملف التشغيلي"]),

    G("الصلاحية", "Permission / PermGrant",
      "ما يحق لحساب الموظف فعله: فعل على مورد في نظام، ومفتاحها ‹النظام›.‹المورد›.‹الفعل› (مثل flights.flights.lock). الأفعال الأربعة GET «عرض» وPOST «إضافة» وPUT «تعديل» وDELETE «حذف»، "
      "وأفعال بأسمائها (اعتماد، نشر، تصدير…). في البوابة 21 نظاماً و409 صلاحيات، تُمنح للموظف واحدة واحدة بلا أدوار، وبعضها لنطاق بعينه (مركز، مطار، عملية…). "
      "والعرض نفسه صلاحية. وللإداري صلاحية واحدة تُعطى لصفات (pilgrims.register «التسجيل على الحج»، افتراضياً للمنسق التقني)، وهي غير صلاحيات الموظفين.",
      code=["lib/permissions.ts:48", "lib/permissions.ts:421", "lib/staff.ts:20"],
      data=["permissions", "staff_user_permissions", "staff_user_permission_scopes", "admin_role_permissions"],
      see=["ملف الإدارة", "صلاحيات الموظفين", "الإحصائيات", "مراجعة الطلبات والوثائق"]),

    G("ملف الإدارة", "SystemKey / system",
      "خمسة أنظمة كبيرة لها في القائمة لوحة تحكم ثم كل عملية مدخلاً مستقلاً: staff «إدارة الموظفين»، registration «إدارة التسجيل على الحج»، admins «إدارة الإداريين»، exams «إدارة الامتحانات»، flights «إدارة الطيران». "
      "لا يُسند ملف لموظف: تظهر لوحته لمن يملك ‹الملف›.summary.GET، وكل عملية لمن يملك عرض ما فيها. الكود يسمّيه system، والواجهة «ملف».",
      code=["lib/systems.ts:15", "lib/systems.ts:24"],
      data=["management_systems", "management_system_operations", "management_operation_permissions"],
      see=["الصلاحية", "صلاحيات الموظفين", "الملف التشغيلي"]),

    G("صلاحيات الموظفين", "access",
      "النظام الذي تُمنح منه الصلاحيات وتُسحب (access.permissions.PUT): مصفوفة لكل موظف، ومعاينة الفرق قبل الحفظ، ونسخ صلاحيات موظف إلى آخر، و«من يملك ماذا». "
      "ومنه متابعة ملفات الإدارة وأحداثها المهمة وما يرفعه العاملون فيها إلى المدير. حل محل «صلاحيات الإدارة» التي كانت تسند ملفاً كاملاً.",
      code=["app/staff/access/view.tsx:31", "lib/permissions.ts:50"],
      data=["staff_user_permissions", "system_seen", "escalations"],
      see=["الصلاحية", "ملف الإدارة", "مدير الموسم"]),

    G("مدير الموسم", "nour.a",
      "الحساب الذي يفتتح الموسم بصلاحيات «صلاحيات الموظفين» كاملة، فيمنح غيره، ومعها أنظمة الموسم العامة (الإعدادات والقرعة والمراجعة والعمليات والمحتوى…)، "
      "ولا صلاحية له في ملفات الإدارة الخمسة. تضبط مواعيد كل العمليات لأنها تملك season.windows.PUT بلا نطاق.",
      code=["lib/staff.ts:42"],
      data=["staff_user_permissions"],
      see=["صلاحيات الموظفين", "الصلاحية"]),

    G("مراجعة الطلبات والوثائق", "reviews",
      "صلاحية موظف التسجيل: يراجع الطلبات التي تحتاج قراراً بشرياً، والصور والجوازات، وتصحيحات البيانات المدنية. "
      "تنبيه: لقب صاحبها في البيانات التجريبية «إدارة التسجيل»، وهو قريب جداً من «إدارة التسجيل على الحج» (registration) وشيء آخر.",
      code=["lib/permissions.ts:97", "lib/store.ts:130"],
      data=["application_reviews", "member_documents", "civil_claims"],
      see=["الصلاحية", "تصحيح البيانات المدنية", "حالة الوثيقة"]),

    G("الإحصائيات", "statsKey / STATS_SYSTEMS",
      "صفحة أرقام نظام ليس ملف إدارة (/staff/stats/‹النظام›) و«ما ينتظر هنا» فيه، لا يُعدَّل منها شيء. لعشرة أنظمة، وتفتحها صلاحية واحدة ‹النظام›.stats.GET "
      "ليست من صلاحيات عرض النظام: لا تفتح صفحاته، ولا تفتحها صلاحيات صفحاته. تجمعها كلها «لوحة الإدارة العليا». حلّت محل «لوحتي» التي كانت تجمع ما ينتظر الموظف في كل نظام يملك فيه شيئاً. "
      "وفي «إدارة الامتحانات» «الإحصائيات» عملية من عمليات الملف، لا من هذه الصفحات.",
      code=["lib/permissions.ts:396", "lib/permissions.ts:400", "lib/permissions.ts:390", "app/staff/stats/view.tsx:12"],
      data=["permission_resources.resource_key", "permissions.code"],
      see=["الصلاحية", "لوحة الإدارة العليا", "ملف الإدارة"]),

    G("لوحة الإدارة العليا", "executive",
      "صفحة من يملك executive.dashboard.GET، بصف واحد من الأزرار: «الموسم الآن» بأرقام الأنظمة العشرة، ولوحة تحكم كل ملف إدارة، يراها كلها أياً كانت صلاحياته الأخرى؛ "
      "و«تقرير نهاية الموسم» من التقديم إلى أداء الفريضة ورضا الحجاج، وطباعته. أول بند في قائمة من يملكها وصفحته الأولى بعد الدخول.",
      code=["app/staff/executive/view.tsx:54", "app/staff/executive/view.tsx:92", "lib/permissions.ts:349"],
      data=["permission_systems", "audit_events"],
      see=["الإحصائيات", "ملف الإدارة", "الصلاحية"]),

    G("الملف التشغيلي", "OpFile",
      "هيكل العمل الميداني لموسم من نوع واحد، بقرار ومدة: سكن مكة (القطاع ← البرج/الفندق)، مخيمات منى (المركز ← المخيم، وفريق الكوسترات على الملف)، مخيمات عرفات (المركز ← المخيم)، "
      "ولكل مستوى أدوار يُسند إليها موظفون. الحالات: draft «مسودة»، active «مفعّل»، ومحسوبة ended «منتهٍ».",
      code=["lib/ops.ts:560", "lib/ops.ts:586"],
      data=["operational_files", "op_file_types", "op_file_outer_nodes", "op_file_inner_nodes", "op_file_assignments"],
      see=["ملفاتي التشغيلية", "البيانات المرجعية", "ملف الإدارة"]),

    G("ملفاتي التشغيلية", "postingsOf",
      "صفحة كل موظف في البوابة: رحلتاه ذهاباً وعودة إن سافر مع البعثة في الموسم، والمواقع التي أُسند إليها في الملفات التشغيلية؛ "
      "ومن لا يسافر في الموسم يرى «لا تسافر مع البعثة» بلا رحلة ولا موقع. ظاهرة دائماً لكل موظف، آخر القائمة قبل «تسجيل الخروج».",
      code=["lib/ops.ts:737", "lib/ops.ts:748", "app/staff/my-files/view.tsx:24", "app/staff/_components/frame.tsx:183"],
      data=["op_file_assignments", "flight_assignments", "employee_seasons"],
      see=["الملف التشغيلي", "البعثة"]),

    G("البيانات المرجعية", "Refs",
      "قوائم موسمية يختار منها الملف التشغيلي مواقعه: الفنادق، وقطاعات مكة، ومراكز منى وعرفات، والمخيمات. تتغير كل موسم.",
      code=["lib/ops.ts:216", "lib/ops.ts:222"],
      data=["hotels", "sectors", "mashaer_centers", "camps"],
      see=["الملف التشغيلي", "القوائم المرجعية", "المشاعر"]),

    G("البعثة", "Mission",
      "الجهة التي يعمل فيها الموظف في الموسم: «البعثة الإدارية»، «البعثة الدينية»، «البعثة الصحية»، «البعثة الإعلامية». ونوعه permanent «موظف دائم في الإدارة» أو external «منتدب من جهة أخرى».",
      code=["lib/ops.ts:30", "lib/ops.ts:101"],
      data=["employees.mission", "employees.kind"],
      see=["الموظف"]),

    G("المشاعر", "Mashaer: 'mina' | 'arafat'",
      "منى وعرفات ومزدلفة، أيام 8 – 12 ذو الحجة. في الملفات التشغيلية تعني منى وعرفات بمراكزهما ومخيماتهما، وفي بوابة الحاج «الطيران والمشاعر».",
      code=["lib/ops.ts:158", "lib/season.ts:152"],
      data=["mashaer_centers", "camps"],
      see=["البيانات المرجعية", "القوائم"]),

    G("سجل الأحداث", "AuditEvent",
      "سجل لا يُعدَّل ولا يُحذف منه شيء: من فعل ماذا ومتى، وما كان قبل وبعد، ولأي ملف وأي سجل. الحدث المهم في ملفات الإدارة يصل إلى «صلاحيات الموظفين» ← «ملفات الإدارة».",
      code=["lib/store.ts:109"],
      data=["audit_events"],
      see=["صلاحيات الموظفين"]),

    # ───────────────────────── الطيران ─────────────────────────
    G("الرحلة", "Flight / FlightStatus",
      "رحلة طيران باتجاه واحد (outbound «ذهاب» أو return «عودة») للحجاج أو للموظفين، بسعة يُحجز منها مقاعد للموظفين المرافقين. "
      "الحالات: draft «مسودة»، published «منشورة»، full «مكتملة»، locked «مقفلة» (صدر كشف ركابها)، departed «أقلعت»، arrived «وصلت»، postponed «مؤجلة»، cancelled «ملغاة».",
      code=["lib/flights.ts:54", "lib/flights.ts:173"],
      data=["flights", "flights.status", "carriers", "flight_manifests"],
      see=["الإسناد إلى رحلة", "أيام التكتلات", "ملف الطيران"]),

    G("الإسناد إلى رحلة", "FlightAssignment / AssignmentStatus",
      "مقعد مسافر (حاج أو إداري أو موظف) على رحلة. الحالات: assigned «مسند»، locked «مثبت»، boarded «صعد»، arrived «وصل»، noShow «تخلّف»، cancelled «ملغى»، moved «منقول». "
      "المجموعة تسافر كلها على رحلتها، ويضعها رئيس التكتل. ومن لا يسافر على رحلات البعثة يُسجَّل «وسيلة أخرى» (otherMeans) فيخرج من قوائم «بلا رحلة».",
      code=["lib/flights.ts:93", "lib/flights.ts:183"],
      data=["flight_assignments", "group_flight_legs", "other_means_travelers"],
      see=["الرحلة", "أيام التكتلات"]),

    G("أيام التكتلات", "Allotment",
      "ما يعطيه مسؤول الطيران لكل تكتل: الرحلات التي يسافر عليها حجاجه وعدد مقاعده على كل منها («مقاعد التكتل»).",
      code=["lib/flights.ts:148"],
      data=["cluster_flight_allotments"],
      see=["الرحلة", "التكتل"]),

    G("مندوب المطار", "airport representative",
      "من يملك «رحلات المطار» (airport.*) لمطار بعينه، فيسجّل منه الإقلاع والهبوط وصعود الركاب. لا يُسند من شاشة المطارات.",
      code=["lib/flights.ts:552", "lib/permissions.ts:254"],
      data=["staff_user_permission_scopes"],
      see=["الرحلة", "ملف الطيران"]),

    G("ملف الطيران", "flights system",
      "ملف «إدارة الطيران»: الرحلات وأيام التكتلات وإسناد الموظفين حتى الإقلاع والهبوط، ويسجّلهما معه مندوبو المطارات. ويُطلق الاسم نفسه على وثيقة تصميمه.",
      code=["lib/flights.ts:14", "lib/permissions.ts:224"],
      data=["flights", "management_systems"],
      see=["ملف الإدارة", "الرحلة", "مندوب المطار"]),

    # ───────────────────────── الموقع العام والمحتوى ─────────────────────────
    G("الأكاديمية", "academy / Track",
      "التعلّم المفتوح لكل حساب: مسارات (الحج، العمرة…) في مستويات، لكل مستوى دروس واختبار، وشهادة لكل مسار، ومقاطع قصيرة، و«اسأل المحاضر».",
      code=["lib/data/academy.ts:43", "lib/data/academy.ts:34"],
      data=["academy_tracks", "academy_levels", "academy_lessons", "academy_certificates"],
      see=["حساب المنصة"]),

    G("مواقيت الصلاة", "CITIES / PRAYERS",
      "صفحة الصلاة القادمة والمواقيت اليومية والجدول الشهري لكل المدن السورية ولمكة والمدينة، وبوصلة القبلة، وزر «مواقيت موقعي».",
      code=["lib/prayer.ts:17", "lib/prayer.ts:46"],
      data=["prayer_cities"],
      see=["المواقيت"]),

    G("المواقيت", "—",
      "كلمة بمعنيين في المنصة: اختصار «مواقيت الصلاة» (اسم الصفحة في التطبيق)، و«المواقيت المكانية» حيث يُحرم الحاج في دروس الأكاديمية.",
      code=["app/manifest.ts:29", "lib/data/academy.ts:212"],
      see=["مواقيت الصلاة", "الأكاديمية"]),

    G("دليل المناسك", "guide / GuideDay",
      "صفحة عامة تشرح أيام الحج يوماً يوماً بأعمالها ومواقيتها وأدعيتها، وقوائم أخرى (ما يحمله الحاج…).",
      code=["lib/data/guide.ts:5", "lib/data/guide.ts:19"],
      data=["guide_days", "guide_day_tasks", "guide_duas", "guide_items"],
      see=["الأكاديمية"]),

    G("الجولة التعريفية", "tourSeen",
      "جولة قصيرة يفتحها زر البوصلة الذهبي، تقف بالزائر عند أهم الصفحات خطوة خطوة. غير «جولة ثلاثية الأبعاد».",
      code=["lib/store.ts:887"],
      data=["accounts.tour_seen_at"],
      see=["الجولة ثلاثية الأبعاد", "نجوم الموسم"]),

    G("الجولة ثلاثية الأبعاد", "MODELS_3D",
      "مجسمات للمسجد الحرام والمسجد النبوي وجبل عرفات وجسر الجمرات وغيرها، للتعرّف على المكان قبل الوصول.",
      code=["lib/data/tour-3d.ts:7", "lib/data/tour-3d.ts:30"],
      data=["tour_models"],
      see=["الجولة التعريفية"]),

    G("الأخبار", "Article",
      "أخبار وإعلانات الإدارة بتصنيفاتها: «إعلانات رسمية»، «قرارات»، «تعاميم»، «أخبار الموسم»، «توعية»، مع التعليقات و«هل كان هذا مفيداً؟».",
      code=["lib/data/news.ts:6", "lib/data/news.ts:17"],
      data=["news_articles", "news_categories", "news_comments", "news_feedback"],
      see=["إدارة محتوى الموقع"]),

    G("إدارة محتوى الموقع", "content.manage / CMS",
      "صلاحية محرر المحتوى: صفحات الموقع العام وأقسامها وحقولها، ومجموعات المحتوى (الأخبار، الأكاديمية، الدليل…)، بحالات draft «مسودة»، published «منشورة»، archived «مؤرشفة»، مع النسخ السابقة والنشر المجدول.",
      code=["lib/cms/types.ts:121", "lib/cms/types.ts:123"],
      data=["cms_pages", "cms_page_sections", "cms_revisions", "cms_scheduled_publications"],
      see=["الأخبار", "الصلاحية"]),

    G("الصفحة العامة للتكتل", "ClusterProfileFields",
      "صفحة التكتل في صفحة «التكتلات والمجموعات» العامة: يحرّرها رئيسه وتعتمدها الإدارة قبل ظهورها (pending، approved، rejected، superseded). ومثلها صفحة المجموعة العامة.",
      code=["lib/cluster-profile.ts:24", "lib/group-profile.ts:61"],
      data=["cluster_profile_versions", "group_profile_versions", "cluster_directory_entries"],
      see=["التكتل", "الشارات"]),

    G("نتائج القبول", "public results / Campaign",
      "صفحة عامة يبحث فيها المواطن عن نتيجته، وجدول القرعة المنشور. الحملات: «القبول المباشر»، «القرعة»، «المنحة».",
      code=["lib/data/public-results.ts:28", "lib/data/public-results.ts:31"],
      data=["lottery_draws", "applications.status"],
      see=["القرعة", "المنحة", "القبول المباشر"]),

    G("التحقق من الجهات والوثائق", "/verify",
      "صفحة عامة يتحقق فيها الزائر من اعتماد تكتل أو حملة، ومن صحة إيصال أو شهادة حج برقمها أو رمز QR، ويبلّغ عن جهة غير معتمدة.",
      code=["app/verify/page.tsx:7", "app/verify/_components/entity-check.tsx:49"],
      data=["unapproved_entities", "fraud_reports", "hajj_certificates"],
      see=["الإيصال", "شهادة أداء الحج"]),

    G("الإشعارات", "notifications",
      "تنبيهات الحساب في البوابة (وصول قرار، اكتمال خطوة، رسالة). تنبيه: غير «إشعار الدفع» الذي هو إيصال المصرف.",
      code=["app/portal/_components/account-sidebar.tsx:104"],
      data=["notifications", "notification_deliveries"],
      see=["إشعار الدفع"]),
]

# Words the site does not use the same way everywhere: one thing with two names, or one name for two things.
# Each is (the issue, what to do about it, [where it shows]). The real platform should settle on one term
# per concept, and the guides follow it.
ISSUES = [
    ("دفتر العائلة / وثيقة العائلة / بيان عائلي",
     "اسم واحد لشيء واحد: شاشات الحاج والأدلة تقول «دفتر العائلة»، وطابور المراجعة عند الموظف يقول «وثيقة العائلة»، والبيانات التجريبية «بيان عائلي». يُعتمد «دفتر العائلة».",
     ["app/staff/_components/data.ts:56", "lib/data/staff-seed.ts:167"]),
    ("الشؤون المدنية / السجل المدني",
     "مصدر واحد للبيانات الشخصية باسمين في شاشات التقديم نفسها. يُعتمد اسم واحد.",
     ["app/portal/apply/_components/booklet.tsx:138", "app/portal/apply/_components/flow.tsx:921"]),
    ("بلاغ / تذكرة، و«تم الحل» / «مغلق»",
     "البلاغ الميداني يُسمى «بلاغاً» و«تذكرة»، وحالته resolved تظهر للحاج «تم الحل» ولغرفة العمليات «مغلق». وأنواع البلاغ معرَّفة مرتين بتسميات مختلفة. تُوحَّد التسمية وقائمة الأنواع في مصدر واحد.",
     ["app/portal/season/_components/tickets.tsx:27", "app/staff/operations/shared.tsx:30"]),
    ("الفئة",
     "كلمة لمعنيين: فئة المجموعة (الأولى إلى الرابعة) وفئة التصنيف آخر الموسم (الأولى إلى الثالثة، وتحمل أسماء مستويات التكتل). يُعطى أحدهما اسماً آخر، مثل «درجة التصنيف».",
     ["lib/season.ts:104"]),
    ("ملف",
     "نحو ستة معانٍ: ملف الإدارة (system)، والملف التشغيلي، والملف الإداري الموسمي («طلبي الإداري»)، والملف الدائم («وثائقي ومهاراتي» في بوابة الإداري)، والملف الطبي أو الصحي، وملف الطيران. تُذكر الكلمة دائماً مع وصفها، ولا تُستعمل وحدها في الشاشات.",
     ["app/staff/admins/_components/applicants.tsx:173", "app/portal/(admin)/role/record.tsx:351"]),
    ("مراجع الكادر / المراجع الإدارية",
     "الشيء نفسه باسمين: بوابة الإداري تقول «مراجع الكادر»، ورسائل خطة التكتل تقول «المراجع الإدارية».",
     ["app/portal/_components/account-sidebar.tsx:111", "app/portal/(admin)/cluster/plan.tsx:39"]),
    ("تأكيد القبول / تثبيت التسجيل",
     "فعل واحد باسمين: اسم الخطوة «تأكيد القبول»، وصفحات القرعة والأخبار تقول «تثبيت التسجيل».",
     ["app/portal/apply/_components/flow.tsx:1257"]),
    ("الملف الطبي / الملف الصحي / الوثائق الطبية / الوثائق الصحية",
     "أربعة أشياء مختلفة بأسماء متقاربة جداً: خطوة ما بعد القبول، وما يسجله المنسق، وما يرفعه الحاج، وما يضيفه فريق المجموعة. يحتاج كل منها اسماً لا يُخلط بغيره، أو تُدمج إن كانت شيئاً واحداً.",
     []),
    ("مسار، المواقيت، الجولة، إشعار، رمز التحقق، الحصة",
     "كلمات لكل منها معنيان أو ثلاثة: المسار (مسار التسجيل، مسار الموسم، مسارات الأكاديمية)، والمواقيت (مواقيت الصلاة ومواقيت الإحرام)، والجولة (الجولة التعريفية والجولة ثلاثية الأبعاد)، والإشعار (تنبيه الحساب وإشعار الدفع المصرفي)، ورمز التحقق (رمز SMS ورمز QR على الإيصالات)، والحصة (حصة الموسم الوطنية وحصة المنسق من الوحدات). يكفي في أغلبها أن تُذكر الكلمة مع وصفها.",
     []),
    ("الدفعة",
     "في الشاشات «دفعة» تعني قسطاً من تكلفة الحج، وفي هيكلية قاعدة البيانات جدول payments يعني كل عملية دفع. يُسمى الجدول «عمليات الدفع» في الوثائق.",
     []),
    ("رئيس المجموعة / قائد المجموعة",
     "الصفة «رئيس مجموعة»، ونصوص الأكاديمية تقول «قائد المجموعة».",
     ["lib/data/academy.ts:492"]),
    ("الفروع / المكاتب",
     "قائمتان متداخلتان: الفروع (DEFAULT_BRANCHES) والمكاتب (OFFICES)، وتختلف كتابة «اسطنبول / إسطنبول»، وفي كل قائمة ما ليس في الأخرى (الرقة فرع بلا مكتب، وريف دمشق والأردن مكتبان ليسا فرعين). يُحسم إن كانتا شيئاً واحداً.",
     ["app/administrator/_lib/structure.ts:134", "lib/season.ts:163"]),
    ("اختبار / امتحان",
     "«اختبار» للاختبار الكتابي الآلي و«امتحان» للمقابلة الشفهية ولملف «إدارة الامتحانات» كله.",
     []),
    ("أداء المناسك / musters",
     "الشاشات تقول «أداء المناسك»، والكود ما زال يسميها musters على اسمها القديم «التجمّع». يُعاد تسميتها في المنصة الحقيقية.",
     []),
]
