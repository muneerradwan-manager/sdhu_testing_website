# -*- coding: utf-8 -*-
from .dsl import *

SCORE = "TINYINT UNSIGNED"

MODULE = M("evaluation", "التقييم بعد الموسم والتصنيف ولوحة الشرف", [
    "بعد عودة الحجاج ثلاث مراحل: «التقييم الذاتي للإداريين» وبالتوازي معه «تقييم الموظفين للإداريين»، ثم «الاعتراض على التقييم» بالأدلة وبرد المقيِّمين، ثم «قرار لجنة التقييم». "
    "يُقيَّم رئيس التكتل (تقييمه تقييم للتكتل) ورؤساء المجموعات (لمجموعاتهم) والموجّهون والموجّهات فقط، بأسئلة صفاتهم، من موظفي البعثة الذين كانوا معهم في ملفاتهم: فندق مكة (مرحلة مكة) وفندق المدينة (المدينة) والمخيمات (المشاعر) ومشرفو الطيران (المطار والسفر). "
    "هوية المقيِّم محفوظة مع تقييمه ومخفية عن الإداري والإدارة، وتعرفها لجنة التقييم وحدها. بلا اعتراض تُعتمد درجة الموظفين، ومعه تقرّر اللجنة. ثم تُنشر نتائج التصنيف: ترقية فئة، أو بقاء، أو تخفيض، أو إنذار، وتُكرَّم الصفوة. ولا تقيّم الإدارة ولا يقيّم الإداريون بعضهم بعضاً.",
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

    T("peer_evaluations", "تقييم موظفي البعثة للإداريين", "يقيّم الموظف رئيس التكتل ورؤساء المجموعات والموجّهين الذين كانوا معه في ملفه التشغيلي (أو لمشرف الطيران كل التكتلات)، بأسئلة صفة كل منهم، في المراحل التي رآها. تقييم رئيس المجموعة تقييم لمجموعته، ورئيس التكتل لتكتله. يمكن تعديله ما دامت النافذة مفتوحة.", [
        pk(), season(),
        ref("admin_season_file_id", "admin_season_files", "الإداري المقيَّم: رئيس تكتل أو رئيس مجموعة أو موجّه أو موجّهة"),
        c("self_role", enum("group-head", "cluster-head", "guide-m", "guide-f"), "الصفة التي قُيّم بها (تحدد الأسئلة)"),
        staff("rater_staff_id", "الموظف المقيِّم: يُحفظ مع تقييمه لتعرفه لجنة التقييم وحدها (يخفى عن الإداري وعن الإدارة)", null=False),
        c("rater_title", "VARCHAR(120)", "مسماه وقت التقييم (للجنة وحدها)"),
        c("rater_place", "VARCHAR(160)", "الفندق أو المخيم أو الملف الذي كان فيه (للجنة وحدها)"),
        c("note", "VARCHAR(1000)", "ملاحظة عامة", null=True),
        updated(),
    ], src="lib/store.ts PeerEvaluation؛ State.peerEvaluations؛ app/staff/evaluate/view.tsx",
       rules=["نافذة peer-evaluation، بالتوازي مع التقييم الذاتي. المقيِّمون يُشتقون من الملفات التشغيلية: التسكين في مكة (مرحلة مكة)، التسكين في المدينة (المدينة)، منى وعرفات (المشاعر)، الطيران (المطار والسفر لكل التكتلات).",
              "صف واحد لكل مقيِّم ومقيَّم. لا يعرض أي نظام اسم المقيِّم للإداري أو لإدارة الإداريين: الاسم لشاشة لجنة التقييم، ويُكتب الحدث في سجل الأحداث دون اسمه."],
       uq=[("admin_season_file_id", "rater_staff_id")]),

    T("peer_evaluation_scores", "درجات تقييم الموظفين", "درجة كل سؤال في كل مرحلة، ومتوسط المرحلة.", [
        ref("peer_evaluation_id", "peer_evaluations", "التقييم", od="CASCADE"),
        c("stage_key", "VARCHAR(40)", "المرحلة"),
        c("question_key", "VARCHAR(50)", "البند <المرحلة>:<n>، أو فارغ لدرجة المرحلة (متوسط بنودها)", null=True),
        c("score", "DECIMAL(2,1)", "1–5", ck="score BETWEEN 1 AND 5"),
        c("note", "VARCHAR(500)", "ملاحظة (إلزامية تحت 3)", null=True),
    ], uq=[("peer_evaluation_id", "stage_key", "question_key")], checks=["score >= 3 OR note IS NOT NULL"]),

    T("evaluation_objections", "الاعتراض على التقييم", "اعتراض الإداري على تقييم الموظفين له في مراحل بعينها، بسببه وأدلته. اعتراض واحد لكل إداري في الموسم. تبتّ فيه لجنة التقييم (لا الإدارة).", [
        pk(), ref("admin_season_file_id", "admin_season_files", "الملف الموسمي", od="CASCADE", uq=True),
        c("stage_keys", "JSON", "المراحل المعترض عليها (مما قيّمه الموظفون)"),
        c("reason", "TEXT", "السبب (10 أحرف على الأقل)"),
        c("submitted_at", "DATETIME(3)", "الوقت", d="CURRENT_TIMESTAMP(3)"),
    ], src="lib/store.ts EvaluationObjection؛ actions.objectToEvaluation",
       rules=["نافذة evaluation-objection. الأدلة في evaluation_evidence، وردود المقيِّمين في evaluation_replies."]),

    T("evaluation_evidence", "أدلة الاعتراض والردود", "صورة أو تسجيل صوتي أو فيديو أو مستند يرفقه الإداري باعتراضه أو المقيِّم بردّه (حتى 12 ميغابايت للملف).", [
        pk(), ref("objection_id", "evaluation_objections", "الاعتراض", od="CASCADE"),
        c("owner", enum("administrator", "rater"), "من أرفقه: الإداري أو المقيِّم"),
        staff("rater_staff_id", "إن كان المقيِّم: هو (للجنة وحدها)"),
        file_("file_id", "الملف (بمرجعه ev:<id> في الكود، يُحفظ في IndexedDB لا في مكتبة الوسائط)"),
        c("kind", enum("image", "audio", "video", "file"), "نوعه"),
    ], src="lib/evidence.ts؛ app/administrator/_components/evidence.tsx"),

    T("evaluation_replies", "ردود المقيِّمين", "ردّ كل موظف مقيِّم على الاعتراض بكلماته وأدلته. لا يُعرف للإداري، وتعرفه لجنة التقييم.", [
        pk(), ref("objection_id", "evaluation_objections", "الاعتراض", od="CASCADE"),
        staff("rater_staff_id", "الموظف المقيِّم", null=False),
        c("text", "TEXT", "الرد (10 أحرف على الأقل)"),
        c("replied_at", "DATETIME(3)", "الوقت", d="CURRENT_TIMESTAMP(3)"),
    ], uq=[("objection_id", "rater_staff_id")], src="lib/store.ts EvaluationReply؛ actions.replyToObjection"),

    T("evaluation_decisions", "قرارات لجنة التقييم", "قرار اللجنة في كل مرحلة معترض عليها: درجة الإداري، أو درجة الموظفين، أو درجة ثالثة منها. قرار جماعي لا يُنسب إلى عضو. بلا اعتراض تُعتمد درجة الموظفين.", [
        pk(), ref("objection_id", "evaluation_objections", "الاعتراض", od="CASCADE"),
        c("stage_key", "VARCHAR(40)", "المرحلة"),
        c("pick", enum("self", "staff", "own"), "self «درجة الإداري»، staff «درجة الموظفين»، own «درجة ثالثة من اللجنة»"),
        c("score", "DECIMAL(2,1)", "الدرجة المعتمدة (1–5 بنصف درجة)", ck="score BETWEEN 1 AND 5"),
        c("note", "VARCHAR(500)", "التعليل (إلزامي للدرجة الثالثة)", null=True),
        c("decided_at", "DATETIME(3)", "الوقت", d="CURRENT_TIMESTAMP(3)"),
    ], uq=[("objection_id", "stage_key")], src="lib/store.ts EvaluationDecision؛ app/staff/committee/view.tsx",
       rules=["نافذة evaluation-committee. لا يقرّر إلا من أُسند على ملف «لجنة التقييم» وملك «قرارات لجنة التقييم — تعديل»."]),

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
