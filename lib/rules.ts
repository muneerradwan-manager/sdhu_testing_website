/**
 * Eligibility engine for a Hajj application.
 * Fixed rules: مسلم، سوري، لم يحج سابقاً (إلا محرماً لأمه أو زوجته)، غير مصاب بمرض عضال.
 * Season rules (by birth year): applicant ≥ 29, companion ≥ 17, woman < 44 needs a mahram,
 * 69+ needs a dedicated companion. Limits: applicant + 3 (or + 5 for a man with wife & children),
 * one application per person per season.
 */
import { SEASON } from "./season";
import { ageOf, birthYear, fullName, registryRelation, type Person, type Relation } from "./registry";

export type Member = {
  person: Person;
  /** What this member is to the applicant */
  relation: Relation;
  /** true when the civil registry confirms the declared relation */
  relationVerified: boolean;
  terminalIllness?: boolean;
  needs: string[];
  /** For 69+: id of the member who accompanies them */
  companionId?: string;
};

export type CheckStatus = "pass" | "fail" | "warn" | "na";

export type RuleCheck = {
  key: string;
  label: string;
  status: CheckStatus;
  detail: string;
};

export type MemberResult = {
  id: string;
  name: string;
  checks: RuleCheck[];
  eligible: boolean;
};

export type EligibilityResult = {
  members: MemberResult[];
  general: RuleCheck[];
  eligible: boolean;
};

const MAHRAM: Relation[] = ["spouse", "parent", "child", "sibling", "grandparent", "grandchild"];

const INVERSE: Record<Relation, Relation> = {
  self: "self",
  spouse: "spouse",
  parent: "child",
  child: "parent",
  sibling: "sibling",
  grandparent: "grandchild",
  grandchild: "grandparent",
  other: "other",
};

/** What `b` is to `a` — registry first, then inferred through the relations declared to the applicant */
export function relationBetween(a: Member, b: Member): Relation {
  const fromRegistry = registryRelation(a.person, b.person);
  if (fromRegistry) return fromRegistry;
  if (a.relation === "self") return b.relation;
  if (b.relation === "self") return INVERSE[a.relation];
  const pair = `${a.relation}>${b.relation}`;
  switch (pair) {
    case "child>child":
    case "sibling>self":
      return "sibling";
    case "child>spouse":
      return "parent";
    case "spouse>child":
      return "child";
    case "child>parent":
      return "grandparent";
    case "parent>child":
      return "grandchild";
    default:
      return "other";
  }
}

export type SeasonRules = { -readonly [K in keyof typeof SEASON.rules]: number };

export function evaluate(members: Member[], rules: SeasonRules = SEASON.rules): EligibilityResult {
  const r = rules;
  const applicant = members.find((m) => m.relation === "self");
  const results: MemberResult[] = [];

  for (const m of members) {
    const p = m.person;
    const by = birthYear(p);
    const age = ageOf(p);
    const isApplicant = m.relation === "self";
    const first = p.firstName;
    const checks: RuleCheck[] = [];

    checks.push({
      key: "muslim",
      label: "مسلم",
      status: p.religion === "مسلم" ? "pass" : "fail",
      detail: p.religion === "مسلم" ? "وفق سجل الشؤون المدنية" : "شرط الديانة غير مستوفى وفق السجل المدني",
    });

    checks.push({
      key: "syrian",
      label: "يحمل الجنسية السورية",
      status: p.nationality === "سورية" ? "pass" : "fail",
      detail: p.nationality === "سورية" ? "وفق سجل الشؤون المدنية" : "يُشترط أن يكون المتقدم سورياً",
    });

    if (isApplicant) {
      const ok = by <= r.applicantMaxBirthYear;
      checks.push({
        key: "applicant-age",
        label: "عمر صاحب الطلب",
        status: ok ? "pass" : "fail",
        detail: ok
          ? `مواليد ${by} — يُشترط مواليد ${r.applicantMaxBirthYear} فما قبل`
          : `مواليد ${by}: صاحب الطلب يجب أن يكون من مواليد ${r.applicantMaxBirthYear} فما قبل (29 عاماً فأكثر)`,
      });
    } else {
      const ok = by <= r.companionMaxBirthYear;
      checks.push({
        key: "companion-age",
        label: "عمر المرافق",
        status: ok ? "pass" : "fail",
        detail: ok
          ? `مواليد ${by} — يُشترط مواليد ${r.companionMaxBirthYear} فما قبل`
          : `${first} من مواليد ${by} (${age} عاماً): المرافق يجب أن يكون 17 عاماً فأكثر`,
      });
    }

    // Woman under 44 → mahram in the same application
    if (p.gender === "F" && by >= r.womanNeedsMahramMinBirthYear) {
      const mahram = members.find(
        (o) =>
          o.person.id !== p.id &&
          o.person.gender === "M" &&
          birthYear(o.person) <= r.companionMaxBirthYear &&
          MAHRAM.includes(relationBetween(m, o)),
      );
      checks.push({
        key: "mahram",
        label: "وجود محرم (للمرأة دون 44 عاماً)",
        status: mahram ? "pass" : "fail",
        detail: mahram
          ? `محرمها في الطلب: ${mahram.person.firstName} (${labelFor(relationBetween(m, mahram), mahram.person.gender)})`
          : `${first} من مواليد ${by} (دون 44 عاماً) وتحتاج محرماً في الطلب نفسه: زوج، أب، ابن، أخ، جد أو حفيد`,
      });
    } else if (p.gender === "F") {
      checks.push({ key: "mahram", label: "وجود محرم", status: "na", detail: `لا تحتاج محرماً (${age} عاماً)` });
    }

    // 69+ → dedicated companion
    if (by <= r.elderlyNeedsCompanionMaxBirthYear) {
      const companion = members.find((o) => o.person.id === m.companionId);
      const companionAge = companion ? ageOf(companion.person) : 0;
      const sharedWith = companion
        ? members.find((o) => o.person.id !== p.id && o.companionId === companion.person.id)
        : undefined;
      let status: CheckStatus = "pass";
      let detail = "";
      if (!companion) {
        status = "fail";
        detail = `${first} عمره ${age} عاماً (مواليد ${by} فما قبل ${r.elderlyNeedsCompanionMaxBirthYear + 1}) ويحتاج مرافقاً مسمّى في الطلب`;
      } else if (birthYear(companion.person) <= r.elderlyNeedsCompanionMaxBirthYear) {
        status = "fail";
        detail = `المرافق ${companion.person.firstName} نفسه يحتاج مرافقاً، اختر مرافقاً أصغر سناً`;
      } else if (companionAge < 17) {
        status = "fail";
        detail = `المرافق ${companion.person.firstName} دون 17 عاماً`;
      } else if (sharedWith) {
        status = "fail";
        detail = `${companion.person.firstName} مرافق مسجّل لـ ${sharedWith.person.firstName} أيضاً — لكل كبير سن مرافق خاص`;
      } else {
        detail = `مرافقه الرسمي: ${companion.person.firstName} (${companionAge} عاماً)`;
      }
      checks.push({ key: "elderly-companion", label: "مرافق لمن بلغ 69 عاماً", status, detail });
    }

    // Previously performed Hajj — allowed only as mahram of mother or wife
    if (p.hajjBefore) {
      const escorts = p.gender === "M" && members.find((o) => {
        if (o.person.id === p.id || o.person.gender !== "F") return false;
        const rel = relationBetween(m, o);
        return rel === "spouse" || rel === "parent";
      });
      checks.push({
        key: "hajj-before",
        label: "لم يؤدِّ فريضة الحج سابقاً",
        status: escorts ? "warn" : "fail",
        detail: escorts
          ? `أدى الحج في موسم ${p.hajjBefore}، ويُستثنى لأنه محرم لـ${relationBetween(m, escorts) === "spouse" ? "زوجته" : "والدته"} ${escorts.person.firstName}`
          : `أدى فريضة الحج في موسم ${p.hajjBefore} وفق سجل المنصة — الاستثناء فقط لمن يرافق أمه أو زوجته محرماً`,
      });
    } else {
      checks.push({ key: "hajj-before", label: "لم يؤدِّ فريضة الحج سابقاً", status: "pass", detail: "لا يوجد حج سابق في سجل المنصة" });
    }

    checks.push({
      key: "terminal",
      label: "غير مصاب بمرض عضال",
      status: m.terminalIllness ? "fail" : "pass",
      detail: m.terminalIllness
        ? "وفق الإقرار الصحي: الإصابة بمرض عضال تمنع التسجيل حفاظاً على سلامة الحاج"
        : m.needs.length
          ? `إقرار صحي — احتياجات مسجّلة: ${m.needs.join("، ")}`
          : "وفق الإقرار الصحي",
    });

    checks.push({
      key: "single-application",
      label: "طلب واحد فقط في الموسم",
      status: p.otherApplication ? "fail" : "pass",
      detail: p.otherApplication
        ? `${first} مدرج في الطلب رقم ${p.otherApplication} لهذا الموسم، ولا يظهر اسم شخص في طلبين`
        : "غير مدرج في أي طلب آخر",
    });

    if (!isApplicant) {
      checks.push({
        key: "relation",
        label: "صلة القرابة",
        status: m.relationVerified ? "pass" : "warn",
        detail: m.relationVerified
          ? `${labelFor(m.relation, p.gender)} — مؤكدة من الشؤون المدنية`
          : "صلة مصرّح بها — تُراجع من موظف التسجيل قبل الاعتماد",
      });
    }

    results.push({
      id: p.id,
      name: fullName(p),
      checks,
      eligible: checks.every((c) => c.status !== "fail"),
    });
  }

  // ── Application-level checks ──
  const general: RuleCheck[] = [];
  const companions = members.filter((m) => m.relation !== "self");
  const nuclearFamily =
    applicant?.person.gender === "M" &&
    companions.length > 0 &&
    companions.every((c) => c.relation === "spouse" || c.relation === "child");
  const limit = nuclearFamily ? r.maxCompanionsFamily : r.maxCompanions;
  general.push({
    key: "limit",
    label: "عدد أفراد الطلب",
    status: companions.length <= limit ? "pass" : "fail",
    detail:
      companions.length <= limit
        ? `صاحب الطلب + ${companions.length} ${nuclearFamily ? `(الحد ${r.maxCompanionsFamily} لرجل مع زوجته وأولاده)` : `(الحد ${r.maxCompanions})`}`
        : `صاحب الطلب ومعه حتى ${r.maxCompanions} أشخاص، وترتفع إلى ${r.maxCompanionsFamily} فقط إذا كان المتقدم رجلاً مع زوجته وأولاده`,
  });

  const ids = members.map((m) => m.person.id);
  const dup = ids.find((id, i) => ids.indexOf(id) !== i);
  general.push({
    key: "duplicates",
    label: "عدم تكرار الأشخاص",
    status: dup ? "fail" : "pass",
    detail: dup ? "الشخص نفسه مضاف مرتين" : "لا يوجد تكرار",
  });

  return {
    members: results,
    general,
    eligible: results.every((m) => m.eligible) && general.every((g) => g.status !== "fail"),
  };
}

function labelFor(rel: Relation, gender: "M" | "F") {
  const f = gender === "F";
  const map: Record<Relation, string> = {
    self: "صاحب الطلب",
    spouse: f ? "زوجة" : "زوج",
    parent: f ? "أم" : "أب",
    child: f ? "ابنة" : "ابن",
    sibling: f ? "أخت" : "أخ",
    grandparent: f ? "جدة" : "جد",
    grandchild: f ? "حفيدة" : "حفيد",
    other: "مرافق",
  };
  return map[rel];
}

/** Quick public pre-check (no data saved) — used on the conditions page */
export function precheck(
  input: { birthYear: number; gender: "M" | "F"; role: "applicant" | "companion"; hajjBefore: boolean; escortingMotherOrWife: boolean; terminal: boolean },
  rules: SeasonRules = SEASON.rules,
) {
  const r = rules;
  const notes: { ok: boolean; text: string }[] = [];
  if (input.role === "applicant") {
    notes.push({ ok: input.birthYear <= r.applicantMaxBirthYear, text: `صاحب الطلب من مواليد ${r.applicantMaxBirthYear} فما قبل` });
  } else {
    notes.push({ ok: input.birthYear <= r.companionMaxBirthYear, text: `المرافق من مواليد ${r.companionMaxBirthYear} فما قبل` });
  }
  if (input.gender === "F" && input.birthYear >= r.womanNeedsMahramMinBirthYear) {
    notes.push({ ok: true, text: "تحتاجين إلى محرم في الطلب نفسه (مواليد 1982 فما بعد)" });
  }
  if (input.birthYear <= r.elderlyNeedsCompanionMaxBirthYear) {
    notes.push({ ok: true, text: "يلزم وجود مرافق في الطلب (مواليد 1957 فما قبل)" });
  }
  notes.push({
    ok: !input.hajjBefore || (input.gender === "M" && input.escortingMotherOrWife),
    text: input.hajjBefore ? "أدّى الحج سابقاً — يُقبل فقط محرماً لأمه أو زوجته" : "لم يؤدِّ الحج سابقاً",
  });
  notes.push({ ok: !input.terminal, text: "غير مصاب بمرض عضال" });
  return { ok: notes.every((n) => n.ok), notes };
}
