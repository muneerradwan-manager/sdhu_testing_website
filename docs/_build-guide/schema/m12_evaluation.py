# -*- coding: utf-8 -*-
from .dsl import *

SCORE = "TINYINT UNSIGNED"

MODULE = M("evaluation", "التقييم بعد الموسم والتصنيف ولوحة الشرف", [
    "بعد عودة الحجاج ثلاث نوافذ: «التقييم الذاتي للإداريين»، ثم «تقييم الموظفين للإداريين والمجموعات والتكتلات»، ثم «الاعتراض على التقييم». "
    "التقييم المعتمد جزءان متجاوران لا يُدمجان في رقم واحد: تقييم الإداري لنفسه، وتقييم الموظفين له. والإداريون لا يقيّم بعضهم بعضاً.",
    "يقيّم الموظفون المرابطون في برج أو مخيم سكنه التكتل: التكتل كله، وكل مجموعة، وكل إداري فيه، مرحلةً مرحلة من 1 إلى 5 (ملاحظة إلزامية تحت 3). "
    "ويقيّم مكتب «إدارة الإداريين» كل إداري مؤهل بالمراحل نفسها مع دليل اختياري. ثم تُنشر نتائج التصنيف: ترقية فئة، أو بقاء، أو تخفيض، أو إنذار، وتُكرَّم الصفوة.",
], [
    T("self_evaluations", "التقييم الذاتي", "تقييم الإداري لنفسه: قسم لكل مرحلة من مراحل التقييم بأسئلتها بحسب صفته (ثلاثة أسئلة لكل مرحلة)، ثم «خلاصة موسمك» كتابة. يُحفظ أولاً بأول ويُرسل مرة واحدة. متوسط كل مرحلة محسوب من بنودها.", [
        pk(), ref("admin_season_file_id", "admin_season_files", "الملف الموسمي", od="CASCADE", uq=True),
        c("self_role", enum("group-head", "cluster-head", "guide-m", "guide-f"), "صفة التقييم: «رئيس مجموعة»، «رئيس تكتل»، «موجّه ديني»، «موجّهة دينية» (المنسقون والمعاونون بلا تقييم ذاتي)"),
        c("saved_at", "DATETIME(3)", "آخر حفظ", d="CURRENT_TIMESTAMP(3)"),
        c("submitted_at", "DATETIME(3)", "الإرسال (لا تعديل بعده)", null=True),
        c("note", "VARCHAR(1000)", "ملاحظة", null=True),
    ], src="lib/store.ts:713 SelfEvaluation؛ app/administrator/_lib/evaluation.ts؛ actions.saveSelfEvaluation",
       rules=["نافذة self-evaluation (ويبقى المرسَل للقراءة بعدها).",
              "الإرسال يحتاج: كل بنود كل المراحل مقيَّمة، وملاحظة لكل درجة دون 3، وإجابة واحدة على الأقل في «خلاصة موسمك».",
              "تسميات axes وrole وsupport في شاشة الموظفين بقايا قديمة لا أقسام فعلية."]),

    T("self_evaluation_scores", "بنود التقييم الذاتي", "درجة كل سؤال في كل مرحلة (البند <stage>:<n> في الكود).", [
        ref("self_evaluation_id", "self_evaluations", "التقييم", od="CASCADE"),
        c("stage_key", "VARCHAR(40)", "المرحلة (evaluation_stages.stage_key)"),
        c("item_no", "TINYINT UNSIGNED", "رقم السؤال في المرحلة (ثلاثة أسئلة لكل مرحلة لكل صفة)"),
        c("score", SCORE, "1–5", ck="score BETWEEN 1 AND 5"),
        c("note", "VARCHAR(500)", "ملاحظة (إلزامية تحت 3)", null=True),
    ], uq=[("self_evaluation_id", "stage_key", "item_no")], src="app/administrator/_lib/evaluation.ts:199 selfSections؛ SelfEvaluation.sections", checks=["score >= 3 OR note IS NOT NULL"]),

    T("self_evaluation_answers", "خلاصة الموسم", "الإجابات المكتوبة في «خلاصة موسمك».", [
        ref("self_evaluation_id", "self_evaluations", "التقييم", od="CASCADE"),
        c("question_key", enum("achieved", "hardest", "needs", "suggest"), "السؤال: ما أنجزته، أصعب ما واجهته، ما تحتاجه، اقتراحك"),
        c("answer", "TEXT", "الإجابة"),
    ], uq=[("self_evaluation_id", "question_key")]),

    T("staff_evaluations", "تقييم مكتب إدارة الإداريين", "تقييم الإدارة لكل إداري مؤهل، مرحلةً مرحلة، والمتوسط.", [
        pk(), ref("admin_season_file_id", "admin_season_files", "الملف الموسمي", od="CASCADE", uq=True),
        c("average", "DECIMAL(2,1)", "المتوسط على المراحل الحالية (منزلة عشرية واحدة)", null=True),
        staff("evaluated_by_staff_id", "آخر من قيّم", null=False),
        updated(),
    ], src="State.evaluations؛ app/staff/admins/_components/evaluation.tsx",
       rules=["التقييم «المتطرف» (أكثر من مرحلة كلها 5 أو كلها 1 بلا ملاحظة) يُعلَّم للمراجعة في السجل."]),

    T("staff_evaluation_scores", "درجات تقييم الإدارة", "درجة كل مرحلة ودليلها.", [
        ref("staff_evaluation_id", "staff_evaluations", "التقييم", od="CASCADE"),
        c("stage_key", "VARCHAR(40)", "المرحلة"),
        c("score", SCORE, "1–5", ck="score BETWEEN 1 AND 5"),
        c("note", "VARCHAR(500)", "ملاحظة (إلزامية تحت 3)", null=True),
        file_("evidence_file_id", "دليل (الكود يضع اسماً وهمياً)"),
    ], uq=[("staff_evaluation_id", "stage_key")], checks=["score >= 3 OR note IS NOT NULL"]),

    T("peer_evaluations", "تقييم موظفي الأبراج والمخيمات", "يقيّم الموظف المرابط في برج أو مخيم سكنه تكتلٌ معتمد: التكتل، وكل مجموعة فيه، وكل إداري. يمكن تعديله ما دامت النافذة مفتوحة.", [
        pk(), season(),
        c("target_kind", enum("cluster", "group", "admin"), "المقيَّم: cluster «التكتل»، group «مجموعاته»، admin «إداريوه»"),
        ref("cluster_id", "clusters", "التكتل المقيَّم", null=True),
        ref("group_id", "admin_groups", "المجموعة المقيَّمة", null=True),
        ref("admin_season_file_id", "admin_season_files", "الإداري المقيَّم", null=True),
        staff("evaluator_staff_id", "الموظف المقيِّم", null=False),
        c("evaluator_role", "VARCHAR(120)", "مسماه وقت التقييم"),
        c("place_label", "VARCHAR(160)", "البرج أو المخيم الذي رابط فيه", null=True),
        c("note", "VARCHAR(1000)", "ملاحظة عامة", null=True),
        updated(),
    ], src="lib/store.ts:722 PeerEvaluation؛ State.peerEvaluations؛ app/staff/evaluate/view.tsx",
       rules=["نافذة peer-evaluation. المقيِّمون يُشتقون من الملفات التشغيلية: من في عقدة فيها التكتل.",
              "صف واحد لكل مقيِّم ومقيَّم (يُفرض في التطبيق لأن المقيَّم عمود من ثلاثة)."],
       checks=["target_kind <> 'cluster' OR cluster_id IS NOT NULL", "target_kind <> 'group' OR group_id IS NOT NULL",
               "target_kind <> 'admin' OR admin_season_file_id IS NOT NULL"]),

    T("peer_evaluation_scores", "درجات تقييم الموظفين", "درجة كل مرحلة.", [
        ref("peer_evaluation_id", "peer_evaluations", "التقييم", od="CASCADE"),
        c("stage_key", "VARCHAR(40)", "المرحلة"),
        c("score", SCORE, "1–5", ck="score BETWEEN 1 AND 5"),
        c("note", "VARCHAR(500)", "ملاحظة (إلزامية تحت 3)", null=True),
    ], uq=[("peer_evaluation_id", "stage_key")], checks=["score >= 3 OR note IS NOT NULL"]),

    T("evaluation_objections", "الاعتراض على التقييم", "اعتراض الإداري على تقييم الموظفين له في مراحل بعينها، وقرار الإدارة. اعتراض واحد لكل إداري في الموسم.", [
        pk(), ref("admin_season_file_id", "admin_season_files", "الملف الموسمي", od="CASCADE", uq=True),
        c("stage_keys", "JSON", "المراحل المعترض عليها (مما قيّمه الموظفون)"),
        c("reason", "TEXT", "السبب (10 أحرف على الأقل)"),
        c("submitted_at", "DATETIME(3)", "الوقت", d="CURRENT_TIMESTAMP(3)"),
        c("status", enum("pending", "accepted", "rejected"), "pending «عند إدارة الإداريين»، accepted «قُبل — يُعاد التقييم»، rejected «رُفض»", d="'pending'"),
        c("reply", "VARCHAR(1000)", "رد الإدارة (5 أحرف على الأقل)", null=True),
        staff("decided_by_staff_id", "من قرر"),
        c("decided_at", "DATETIME(3)", "الوقت", null=True),
    ], src="lib/store.ts:719 EvaluationObjection؛ actions.objectToEvaluation، decideObjection",
       rules=["نافذة evaluation-objection. القبول لا يعدّل الدرجات وحده: يعيد الموظف تقييم المراحل المعترض عليها."]),

    T("grading_publications", "نشر التصنيف", "نشر نتائج تصنيف المجموعات والتكتلات آخر الموسم. إعادة النشر صف جديد.", [
        pk(), season(),
        staff("published_by_staff_id", "من نشر", null=False),
        c("published_at", "DATETIME(3)", "الوقت", d="CURRENT_TIMESTAMP(3)"),
        c("weights", "JSON", "أوزان مكونات الدرجة وقت النشر: تقييم الحجاج 0.4، تقييم الموظفين 0.25، الالتزام بالمراحل التسع 0.25، البلاغات والمخالفات 0.1"),
        c("is_current", "TINYINT(1)", "النشر الساري", d="1"),
    ], src="State.grading؛ lib/grading.ts؛ grading-live.ts",
       rules=["يُنبَّه «قديم» إن وُجد تقييم بعد آخر نشر. الكود لا يحفظ النتائج؛ هنا تُحفظ لحظة النشر."]),

    T("grading_results", "نتائج التصنيف", "ترتيب كل مجموعة وتكتل داخل فئته ومآله.", [
        pk(), ref("publication_id", "grading_publications", "النشر", od="CASCADE"),
        c("scope", enum("group", "cluster"), "مجموعة أو تكتل"),
        ref("group_id", "admin_groups", "المجموعة", null=True),
        ref("cluster_id", "clusters", "التكتل", null=True),
        c("tier_label", "VARCHAR(60)", "الفئة التي رُتّب فيها"),
        c("score", "DECIMAL(5,2)", "الدرجة 0–100"),
        c("parts", "JSON", "مكونات الدرجة [{label, weight, value}]"),
        c("rank_in_tier", "SMALLINT UNSIGNED", "الترتيب"),
        c("outcome", enum("promote", "ceiling", "hold", "demote", "warned"), "promote «ترقية فئة»، ceiling «يبقى في الفئة العليا»، hold «يبقى في فئته»، demote «تخفيض فئة»، warned «إنذار — لا فئة أدنى»"),
        c("honored", "TINYINT(1)", "من المكرَّمين", d="0"),
    ], new=True, checks=["(scope = 'group') = (group_id IS NOT NULL)", "(scope = 'cluster') = (cluster_id IS NOT NULL)"],
       rules=["داخل كل فئة: الأعلى round(n × promote_share) يرقّى، والأدنى round(n × demote_share) يخفَّض دون تداخل، وأعلى honor_top يُكرَّمون."]),

    T("honours_awards", "لوحة الشرف", "جوائز الموسم ونجومه: أفضل منسق تقني، أفضل موجّه ديني، أفضل موجّهة دينية، أفضل معاون — الثلاثة الأوائل بالتقييم ثم المواسم. "
      "الكود يحسبها عند العرض (app/honours)؛ هنا تُحفظ عند النشر.", [
        pk(), season(),
        c("award_key", enum("tech", "guide", "guide-f", "deputy", "head", "cluster"), "الجائزة: tech «أفضل منسق تقني»، guide «أفضل موجّه ديني»، guide-f «أفضل موجّهة دينية»، deputy «أفضل معاون»، head رؤساء المجموعات المكرَّمون، cluster التكتلات"),
        c("rank_no", "TINYINT UNSIGNED", "المرتبة"),
        account("account_id", "الإداري", null=True),
        ref("cluster_id", "clusters", "التكتل (لجوائز التكتلات)", null=True),
        c("rating", "DECIMAL(2,1)", "التقييم"),
        c("seasons_served", "TINYINT UNSIGNED", "مواسم الخدمة (للترجيح)", null=True),
        ref("publication_id", "grading_publications", "النشر الذي ثبّتها", null=True),
    ], uq=[("season_year", "award_key", "rank_no")], new=True, src="app/honours/_lib/roll.ts honourRolls، AWARDS"),
], flow=[
    "يكتب الإداري self_evaluations (بنودها وخلاصتها) ويرسله في نافذته.",
    "يقيّم موظفو الأبراج والمخيمات peer_evaluations، ويقيّم المكتب staff_evaluations؛ ويُعرض للإداري جزءاه متجاورين مع الفجوات (فرق ≥ 1).",
    "يعترض الإداري evaluation_objections فتقرر الإدارة. ثم يُنشر grading_publications بنتائجه grading_results وجوائزه honours_awards.",
])
