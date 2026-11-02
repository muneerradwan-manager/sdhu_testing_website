# testdata — البيانات التجريبية

كل بيانات العرض التجريبي للمنصة هنا، ملفات JSON فقط، كأنها ما يعيده الباك اند. لا يكتب أي ملف آخر في الموقع بيانات تجريبية: الصفحات والوحدات تقرأ من هنا.

## القواعد

1. **ملف لكل كيان** (جدول أو نقطة API): مصفوفة سجلات، أو كائن مفاتيحه المعرّفات حين يكون الشكل في الكود `Record`.
2. **بيانات فقط**: لا قيم مشتقة (الأعمار، الأسماء الكاملة، العدادات، الترتيب) — تُحسب في الكود من البيانات.
3. **الشخص يُكتب مرة واحدة**: اسمه وهاتفه وبياناته المدنية في `people/citizens.json` وحده. أي سجل آخر (إداري، متقدم، عضو طلب، منسق، موجّه…) يحمل **رقمه الوطني فقط**، ويأخذ الكود الاسم والهاتف من السجل المدني (`lib/registry.ts`: `personName(id)`، `phoneOf(id)`، `getPerson(id)`).
4. **المعرّفات مراجع** كما في قاعدة بيانات: `headId`، `personId`، `coordinatorIds`… تشير إلى سجلات في ملفات أخرى.
5. **التواريخ**: ما كان تاريخاً فقط يُكتب `YYYY-MM-DD`، وما كان لحظة يُكتب كما يقرؤه الكود (ميلي ثانية منذ 1970 أو نص ISO)، ويُذكر ذلك في وصف الملف أدناه.

## الربط مع الباك اند

كل ملف هنا يُستورد في موضع واحد في الكود (المذكور في الجداول أدناه)، وذلك الموضع يحوّله إلى أنواع TypeScript التي تستعملها الصفحات. عند الربط:

- يُستبدل الاستيراد `import X from "@/testdata/…json"` في ذلك الموضع بما يعيده الطلب إلى نقطة الـAPI المقابلة، بالشكل نفسه.
- لا يتغيّر شيء في الصفحات: هي لا تعرف مصدر البيانات.
- البيانات التي تُحسب من ساعة العرض (أحداث «قبل يومين»، توليد الموسم) مذكورة في قسم «ما بقي في الكود» مع سببها.

## الملفات

### people — السجل المدني

| الملف | الكيان | يقرؤه | ما يقابله في الباك اند |
|---|---|---|---|
| `people/citizens.json` | كل مواطن يعرفه العرض: الحجاج والإداريون والمتقدمون — الاسم الرباعي واللقب («الشيخ»)، الجنس، الميلاد، القيد، الحالة الاجتماعية، دفتر العائلة، صلات القرابة، الهاتف | `lib/registry.ts` | خدمة الشؤون المدنية، والهاتف من الحساب |
| `people/family-books.json` | دفاتر العائلة الموصوفة: رقم الدفتر ورب الأسرة ومكان القيد وتاريخ الإصدار | `lib/registry.ts` | خدمة الشؤون المدنية |
| `people/demo-scenarios.json` | حالات صفحة الدخول التجريبية: رقم وطني، وعنوان الحالة دون الاسم (`headline`)، وشرحها، وما يُهيَّأ للحساب | `lib/registry.ts` | — (للعرض فقط) |

أي رقم وطني آخر من 11 رقماً يولّد له السجل مواطناً ثابتاً (`generate` في `lib/registry.ts`)، ليصلح أي رقم يُكتب في نماذج التسجيل.

### admins — بوابة الإداريين

| الملف | ما فيه | يقرؤه |
|---|---|---|
| `admins/admin-calendar.json` | مواعيد مسار الإداري في الموسم (إنشاء الحساب، التسجيل، الرسم، الاختبار…) | `app/administrator/_lib/admin.ts` |
| `admins/cadre-events.json` | أحداث ملفات الكادر قبل العرض (نقل فرع، ترقية، ملاحظة): الشخص برقمه، والمسجِّل بحسابه | `app/administrator/_lib/cadre.ts` |
| `admins/channel-messages.json` | رسائل قناة التكتل الأولى؛ أوقاتها إزاحات عن يوم العرض {daysAgo, h, m} | `app/administrator/_lib/channel.ts` |
| `admins/channel-templates.json` | رسائل جاهزة يرسلها رئيس المجموعة إلى قناة مجموعته؛ الأشخاص فيها بأرقامهم («{short:ID}») | `app/portal/(admin)/field/field.tsx` |
| `admins/clusters.json` | تكتلات القصة الأربعة: رئيسها ومجموعاتها وكادرها ومقاعدها وفرز منسقيها، كلهم بأرقامهم | `app/administrator/_lib/cluster.ts` |
| `admins/coordinator-work.json` | حالات عمل المنسق التقني الجاهزة للعرض | `app/administrator/_lib/coordinator.ts` |
| `admins/demo-admins.json` | الإداريون التجريبيون في صفحة الدخول: الرقم الوطني، الصفة، الحال، العنوان دون الاسم، الشرح | `app/administrator/_lib/admin.ts` |
| `admins/demo-listed.json` | من يظهر من الإداريين في قائمة الدخول التجريبية | `app/administrator/_lib/admin.ts` |
| `admins/group-requests.json` | طلبات التحاق جاهزة بمجموعة: صاحب الطلب وأعضاؤه بأرقامهم | `app/administrator/_lib/group.ts` |
| `admins/heads-pool.json` | رؤساء مجموعات الموسم غير المسجّلين على هذا الجهاز (معرّفات seed-xx، وأسماؤهم هنا وحدها) | `app/administrator/_lib/people.ts` |
| `admins/histories.json` | مواسم كل إداري السابقة وصفته وتقييمه | `app/administrator/_lib/admin.ts` |
| `admins/letters.json` | مراسلات الإداريين مع الإدارة قبل العرض | `app/administrator/_lib/letters.ts` |
| `admins/ready-groups.json` | مجموعات رؤساء المجموعات الجاهزين | `app/administrator/_lib/admin.ts` |
| `admins/roster.json` | المؤهلون للموسم في صفات التكتل (رقم، صفة، فرع، درجة، مهارات) — الأسماء والأعمار من السجل المدني | `app/administrator/_lib/people.ts` |
| `admins/season-clusters.json` | تكتلات الموسم الأخرى المولَّدة | `app/administrator/_lib/season-seed.ts` |
| `admins/season-heads.json` | رؤساء المجموعات المولَّدون للموسم | `app/administrator/_lib/season-seed.ts` |
| `admins/season-people.json` | بيانات أشخاص الموسم المولَّدين (الفئة والفرع والصفة الموسمية) | `app/administrator/_lib/season-seed.ts` |
| `admins/season-roster.json` | المؤهلون المولَّدون للموسم | `app/administrator/_lib/season-seed.ts` |
| `admins/story-people.json` | فئة رؤساء القصة وفروعهم وصفاتهم الموسمية | `app/administrator/_lib/people.ts` |

### clusters — التكتلات العامة والوثائق

| الملف | ما فيه | يقرؤه |
|---|---|---|
| `clusters/covers.json` | صورة غلاف كل تكتل | `lib/data/clusters.ts` |
| `clusters/documents.json` | الإيصالات والشهادات القابلة للتحقق؛ صاحبها برقمه ويُعرض مقنّعاً | `lib/data/clusters.ts` |
| `clusters/galleries.json` | معرض صور كل تكتل | `lib/data/clusters.ts` |
| `clusters/hotel-locations.json` | موقع فندقي مكة والمدينة لكل تكتل | `lib/data/clusters.ts` |
| `clusters/programmes.json` | برامج التكتلات العامة | `lib/data/clusters.ts` |
| `clusters/unapproved.json` | جهات غير معتمدة تظهر في التحقق | `lib/data/clusters.ts` |

### content — محتوى الموقع العام

| الملف | ما فيه | يقرؤه |
|---|---|---|
| `content/academy-clips.json` | مقاطع الأكاديمية القصيرة | `lib/data/academy.ts` |
| `content/academy-lecturers.json` | محاضرو الأكاديمية | `lib/data/academy.ts` |
| `content/academy-stats.json` | عدد متعلمي الأكاديمية | `lib/data/academy.ts` |
| `content/academy-tracks.json` | مسارات الأكاديمية بدروسها واختباراتها | `lib/data/academy.ts` |
| `content/adhkar.json` | الأذكار | `lib/data/quran.ts` |
| `content/faq.json` | الأسئلة الشائعة | `lib/data/faq.ts` |
| `content/guide-days.json` | أيام المناسك في دليل الحاج | `lib/data/guide.ts` |
| `content/guide-duas.json` | بطاقات الأدعية (دعاء الصفا مرجع إلى guide-sai) | `lib/data/guide.ts` |
| `content/guide-en.json` | الترجمة الإنجليزية لنصوص الدليل الثابتة (الأنساك، المحظورات، الطواف والسعي، الحقيبة، النصائح الصحية) بترتيبها ومعرّفاتها | `app/guide/_components/guide-en.ts` |
| `content/guide-haram.json` | موقع المسجد الحرام | `lib/data/guide.ts` |
| `content/guide-health-tips.json` | نصائح صحية | `lib/data/guide.ts` |
| `content/guide-heatstroke-signs.json` | علامات ضربة الشمس | `lib/data/guide.ts` |
| `content/guide-nusuk-comparison.json` | جدول مقارنة الأنساك | `lib/data/guide.ts` |
| `content/guide-nusuk.json` | أنواع النسك | `lib/data/guide.ts` |
| `content/guide-packing.json` | قائمة الحقيبة | `lib/data/guide.ts` |
| `content/guide-prohibitions.json` | محظورات الإحرام | `lib/data/guide.ts` |
| `content/guide-sai.json` | أشواط السعي ودعاء الصفا | `lib/data/guide.ts` |
| `content/guide-tawaf.json` | أشواط الطواف | `lib/data/guide.ts` |
| `content/nawawi-hadiths.json` | الأربعون النووية | `lib/data/quran.ts` |
| `content/news.json` | الأخبار (زمن القراءة يُحسب) | `lib/data/news.ts` |
| `content/quran-surahs.json` | السور وصفحة بدئها | `lib/data/quran.ts` |
| `content/tour-3d-models.json` | نماذج الجولة ثلاثية الأبعاد | `lib/data/tour-3d.ts` |

### demo — اختصارات العرض

| الملف | ما فيه | يقرؤه |
|---|---|---|
| `demo/apply-shortcuts.json` | اختصارات نموذج تقديم الطلب (دفاتر وأشخاص واقتراحات) بأرقامهم | `app/portal/apply/_components/flow.tsx` |
| `demo/defaults.json` | معرّفات العرض الثابتة: الحاج المثال، رئيس المجموعة، المنسق، رئيس التكتل… | `app/portal/season/_components/meals.tsx`، `app/portal/application/_components/post/model.ts`، `app/administrator/_lib/group.ts`، `app/administrator/_lib/admin.ts`، `app/staff/hajj/_components/pages.tsx`، `app/staff/operations/shared.tsx`، `app/login/login-flow.tsx`، `components/app/tour.tsx` |
| `demo/desk-shortcuts.json` | أرقام جاهزة لمكتب التسجيل | `app/portal/(admin)/pilgrims/pilgrims.tsx` |
| `demo/login-members.json` | بطاقات «الأعضاء» في صفحة الدخول | `app/login/login-flow.tsx` |
| `demo/result-lookups.json` | أرقام جاهزة لصفحة النتائج | `app/results/_components/result-search.tsx` |
| `demo/rule-families.json` | عائلات مختبر الشروط | `app/staff/hajj/_components/rules.tsx` |
| `demo/scenarios-en.json` | شرح حالات الدخول بالإنجليزية | `app/login/login-flow.tsx` |
| `demo/signups.json` | بطاقات إنشاء الحسابات التجريبية | `lib/demo-signup.ts` |

### exams — الامتحانات

| الملف | ما فيه | يقرؤه |
|---|---|---|
| `exams/blueprints.json` | تركيب اختبار كل صفة | `lib/data/admin-exam.ts` |
| `exams/centers.json` | المراكز الامتحانية: المحافظات التي يخدمها كل مركز، وقاعته وموقعه وسعته | `app/administrator/_lib/halls.ts` |
| `exams/hall-pins.json` | رمز التأكيد الأول لمشرف القاعة التجريبي، بحسابه | `app/administrator/_lib/halls.ts` |
| `exams/sessions.json` | موعد الاختبار الرئيسي لكل صفة (اليوم والتاريخ الهجري والساعة) | `app/administrator/_lib/halls.ts` |
| `exams/questions.json` | بنك الأسئلة | `lib/data/admin-exam.ts` |

### flights — الطيران

| الملف | ما فيه | يقرؤه |
|---|---|---|
| `flights/airports.json` | المطارات | `lib/flights.ts` |
| `flights/allotments.json` | مقاعد كل تكتل على كل رحلة | `lib/flights.ts` |
| `flights/carriers.json` | الناقلون | `lib/flights.ts` |
| `flights/flights.json` | الرحلات (أوقات مكة «YYYY-MM-DDTHH:mm») | `lib/flights.ts` |
| `flights/group-plan.json` | المجموعات الأولى على رحلات كل تكتل | `lib/flights.ts` |
| `flights/home-yards.json` | ساحة عودة كل مطار | `lib/flights.ts` |
| `flights/name-pools.json` | أسماء العائلات والفرق المولَّدة على الرحلات | `lib/flights.ts` |
| `flights/staff-parties.json` | الموظفون في الطلائع والمؤخرة (معرّفات الموظفين) | `lib/flights.ts` |

### grading — التصنيف

| الملف | ما فيه | يقرؤه |
|---|---|---|
| `grading/clusters.json` | تكتلات التصنيف وعلاماتها | `lib/data/grading-demo.ts` |
| `grading/groups.json` | مجموعات التصنيف وعلاماتها | `lib/data/grading-demo.ts` |

### journey — رحلة الحاج المثال

| الملف | ما فيه | يقرؤه |
|---|---|---|
| `journey/cluster.json` | تكتل الحاج المثال | `lib/journey.ts` |
| `journey/flights.json` | رحلتا الحاج المثال | `lib/journey.ts` |
| `journey/group.json` | مجموعة 27 وفريقها بأرقامهم | `lib/journey.ts`، `lib/flights.ts` |
| `journey/hotel-menus.json` | قوائم طعام فندقَي مكة والمدينة بالتناوب (الفطور والغداء) ما لم يكتب المنسق قائمته | `app/portal/season/_data.ts` |
| `journey/itinerary.json` | برنامج رحلة الحاج | `lib/journey.ts` |
| `journey/places.json` | أماكن المناسك | `lib/journey.ts` |
| `journey/trips.json` | رحلات المجموعة في الموسم: الموعد والتجمّع والمقاعد والمحجوز وأيام ظهورها؛ المشرفون بأرقامهم («{first:ID}»، «{title:ID}»)، و«{group:N}» اسم مجموعة | `app/portal/season/_data.ts` |

### ops — الملفات التشغيلية والبيانات المرجعية

| الملف | ما فيه | يقرؤه |
|---|---|---|
| `ops/camps.json` | مخيمات منى وعرفات | `lib/data/ops-seed.ts` |
| `ops/centers.json` | مراكز المشاعر | `lib/data/ops-seed.ts` |
| `ops/drivers.json` | أسماء سائقي الحافلات التي توزَّع على وحدات النقل المخططة | `lib/rite-lists.ts` |
| `ops/files.json` | الملفات التشغيلية وإسناداتها (الموظفون بمعرّفاتهم، والمنشئ بحسابه) | `lib/data/ops-seed.ts` |
| `ops/hotels.json` | الفنادق | `lib/data/ops-seed.ts` |
| `ops/sectors.json` | قطاعات مكة | `lib/data/ops-seed.ts` |

### pilgrims — الحجاج

| الملف | ما فيه | يقرؤه |
|---|---|---|
| `pilgrims/application-numbers.json` | أرقام طلبات ثابتة | `lib/journey.ts` |
| `pilgrims/histories.json` | مواسم الحجاج السابقة وشهاداتهم | `app/portal/season/_components/evaluation.tsx`، `lib/account.ts` |
| `pilgrims/scenario-applications.json` | طلبات حالات الدخول الجاهزة | `lib/demo-scenarios.ts` |

### registration — التسجيل على الحج

| الملف | ما فيه | يقرؤه |
|---|---|---|
| `registration/direct-acceptance.json` | القبول المباشر: المؤهلون والمقاعد وشرائح الأعمار | `lib/data/staff-seed.ts` |
| `registration/public-results.json` | إعلان النتائج العام | `lib/data/public-results.ts` |
| `registration/seed-applications.json` | طلبات تنتظر المراجعة بأعضائها بأرقامهم | `lib/data/staff-seed.ts` |
| `registration/seasons.json` | مواسم التسجيل (1447 المؤرشف و1448 الفعّال)؛ `createdAt` نص وقت محلي «YYYY-MM-DDTHH:mm»، والمنشئ بحسابه | `lib/registration/defaults.ts` |
| `registration/stats.json` | أرقام التسجيل | `lib/data/staff-seed.ts` |
| `registration/versions.json` | النسخ المنشورة من إعدادات التسجيل: `preset` «1447» تُبنى من إعدادات الموسم السابق بنص البداية `intro`، و«default» هي الإعدادات الافتراضية؛ `publishedAt` وقت محلي، والناشر بحسابه | `lib/registration/defaults.ts` |

### religious — الدروس والنشاطات

| الملف | ما فيه | يقرؤه |
|---|---|---|
| `religious/activities.json` | النشاطات الدينية | `lib/religious.ts` |
| `religious/lessons.json` | الدروس الدينية | `lib/lessons.ts` |

### staff — بوابة الموظفين

| الملف | ما فيه | يقرؤه |
|---|---|---|
| `staff/accounts.json` | حسابات بوابة الموظفين وأنماط صلاحياتها (الاسم من سجل الموظفين) | `lib/staff.ts` |
| `staff/arafat-reports.json` | تقارير المجموعات يوم عرفة: الحاضرون في عرفة من العدد ووقت التقرير | `app/staff/stats/sections.tsx` |
| `staff/audit-events.json` | سجل الأحداث السابق (الفاعل بحسابه) | `lib/data/staff-seed.ts` |
| `staff/circulars.json` | القرارات والتعميمات (المُصدر بحسابه) | `lib/circulars.ts` |
| `staff/employees.json` | سجل الموظفين: الاسم واللقب والكنية والمسمى والمواسم — مصدر أسماء الموظفين الوحيد | `lib/staff.ts`، `lib/data/employees-seed.ts` |
| `staff/executive.json` | أرقام نهاية الموسم في لوحة الإدارة العليا، ومنها التقييم العام للحجاج (`rating`) | `lib/data/staff-seed.ts` |
| `staff/incidents.json` | بلاغات غرفة العمليات | `lib/data/staff-seed.ts` |
| `staff/seed-admins.json` | المتقدمون لصفات الإداريين واختباراتهم (الاسم والهاتف من السجل المدني) | `lib/data/staff-seed.ts` |
| `staff/tasks.json` | مهام غرفة العمليات | `lib/data/staff-seed.ts` |

### settings — إعدادات الموسم الافتراضية

ما تضبطه الإدارة لكل موسم ويعدّله الموظفون من البوابة. الكود يقرأ هذه القيم أولاً، ثم يضع فوقها ما عدّله الموظف (المخزن). عند الربط تأتي من إعدادات الموسم في الخادم.

| الملف | ما فيه | يقرؤه |
|---|---|---|
| `settings/meals.json` | مواعيد الفطور والغداء في فندقَي مكة والمدينة قبل أن يضبطها منسق التكتل | `lib/season-live.ts` |
| `settings/offices.json` | مكاتب التسجيل: مكتب لكل محافظة داخل سوريا ومكتب لكل بلد في الخارج | `lib/season.ts` |
| `settings/operations.json` | عمليات الموسم ومواعيدها الافتراضية (`estimate`: لم تُعلَن بعد) | `lib/operations.ts` |
| `settings/season.json` | إعدادات موسم 1448: الحصة والمقاعد، شروط الأعمار، الرسوم والدفعات، نوافذ التسجيل، التصنيف، الوثائق الطبية، تقويم الحاج | `lib/season.ts` |
| `settings/structure.json` | هيكلية الإدارة: الفروع، مستويات التكتل والمستوى الافتراضي، الموعد المبكر، فئات المجموعات ومقاعدها، وتركيب التكتل لكل مستوى | `app/administrator/_lib/structure-defaults.ts` |

## مراجع الموظفين

من فعل شيئاً من جهة الموظفين (`by`، `createdBy`، `actor`…) يُكتب بحسابه: `"@mazen"`. يضع `withStaffNames` في `lib/staff.ts` الاسم مكانه عند التحميل، من `staff/employees.json`، وفي الكود `staffName("mazen")`.

## ما بقي في الكود، ولماذا

- **ما يُحسب من ساعة العرض:** أوقات «قبل يومين» في الحالات الجاهزة (`lib/demo-scenarios.ts`)، وأحداث القناة تُبنى من إزاحاتها في JSON.
- **المولّدات التي تأخذ مدخلاً:** فرق المجموعات وعائلاتها على الرحلات، وقوائم حجاج المجموعة (`app/administrator/_lib/group.ts`)، وأي رقم وطني غير معروف (`lib/registry.ts` generate).
- **إعدادات المنصة وتسمياتها، وهي ليست بيانات تجريبية:** الصفات وشروطها، وأنواع البلاغات، وتسميات الحالات، وأقسام الاختبار، والمستندات المطلوبة، ومراحل نموذج التسجيل الافتراضية (`lib/registration/defaults.ts`)، وقائمة المناسك والزيارات (`lib/musters.ts`)، ومدن مواقيت الصلاة (`lib/prayer.ts`). أما قيم الموسم التي يعدّلها الموظفون فهي في `settings/`.
- **سيناريو «حالتي الآن» في موسم الحاج المثال** (`app/portal/season/_data.ts`): أحداث كل يوم وإشعاراته وحافلاته نص مكتوب ليوم العرض، فيه حساب من اليوم ورقم الطلب؛ الأشخاص فيه يُسمَّون من السجل المدني.
- **محتوى الموقع الافتراضي** في `lib/cms` (نصوص الصفحات العامة وفريق «من نحن»): يعدّله موظف المحتوى من البوابة، وهو محتوى لا بيانات اختبار.
