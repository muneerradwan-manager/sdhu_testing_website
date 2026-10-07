/**
 * Public acceptance results for season 1448 AH (fictional).
 * Only what the public portal is allowed to publish: name, result, campaign, governorate — and the
 * lottery's results, which are a table of drawn birth years and months, not a list of names.
 * Never phone, address, age, reasons or family members in the search result.
 */
import { SEASON, OFFICES } from "../season";
import { OFFICIAL_DRAW, drawTotals, lotteryAccepted, type PublishedDraw } from "../lottery";
import { ageOf, fullName, getPerson, isValidNationalId, type Person } from "../registry";
import { maskNationalId, seeded } from "../utils";

const OFFICIAL = drawTotals(OFFICIAL_DRAW);

export const RESULTS_SUMMARY = {
  /** Accepted directly (oldest first) + lottery applications — the base of the public outcome chart */
  eligible: SEASON.directSeats + OFFICIAL.poolApps,
  lotteryEligible: OFFICIAL.poolApps,
  lotteryRegisteredSeats: OFFICIAL.poolSeats,
  direct: SEASON.directSeats,
  acceptedAge: SEASON.acceptedDirectAge,
  lastUpdate: "15 ربيع الآخر 1448 (26 أيلول) — 21:00",
  directApprovedAt: "13 ربيع الأول 1448 (26 آب) — 10:00",
  lotteryWindow: SEASON.windows.lottery.hijri,
  lotteryAt: "15 ربيع الآخر 1448 (السبت 26 أيلول) — جامعة الفرات، دير الزور",
} as const;

/** Which registration the application was made in: direct acceptance, lottery, or the scholarship campaign */
export type Campaign = "القبول المباشر" | "القرعة" | "المنحة";
export type Outcome = "direct" | "lottery" | "notDrawn" | "none";

export const OUTCOME_LABEL: Record<Outcome, string> = {
  direct: "مقبول مباشرة وفق الأكبر سناً",
  lottery: "مقبول بالقرعة",
  notDrawn: "لم يُقبل في القرعة",
  none: "لم يرد هذا الرقم في طلبات هذا الموسم",
};

// ───────────────────────── Governorate stats (aggregated only) ─────────────────────────

const GOV_WEIGHTS: Record<string, number> = {
  "دمشق": 0.18,
  "ريف دمشق": 0.15,
  "حلب": 0.17,
  "حمص": 0.1,
  "حماة": 0.08,
  "اللاذقية": 0.06,
  "إدلب": 0.06,
  "درعا": 0.05,
  "دير الزور": 0.04,
  // Syrians abroad register at the office of their country of residence
  "تركيا": 0.06,
  "مصر": 0.02,
  "الأردن": 0.03,
};

/** Splits a total across governorates by weight, fixing rounding on the largest one */
function split(total: number, jitterSeed: string) {
  const rnd = seeded(jitterSeed);
  const govs = OFFICES.map((o) => o.governorate);
  const raw = govs.map((g) => GOV_WEIGHTS[g] * (0.92 + rnd() * 0.16));
  const sum = raw.reduce((a, b) => a + b, 0);
  const vals = raw.map((w) => Math.round((w / sum) * total));
  const diff = total - vals.reduce((a, b) => a + b, 0);
  vals[0] += diff;
  return vals;
}

/** Accepted people per governorate: directly, and by the published draw's seats */
export function governorateStats(lotterySeats: number) {
  const govs = OFFICES.map((o) => o.governorate);
  const eligible = split(RESULTS_SUMMARY.eligible, "eligible");
  const direct = split(RESULTS_SUMMARY.direct, "direct");
  const lottery = split(lotterySeats, "lottery");
  return govs.map((g, i) => ({ governorate: g, eligible: eligible[i], direct: direct[i], lottery: lottery[i] }));
}

// ───────────────────────── Search by national number ─────────────────────────

export type SearchResult =
  | { found: false }
  | {
      found: true;
      name: string;
      outcome: Exclude<Outcome, "none">;
      label: string;
      campaign: Campaign;
      governorate: string;
      applicationNo?: string;
    };

/** The guide's example family: application 4512, under Khadija (78), accepted directly */
const FAMILY_4512 = ["01012345412", "01012340078", "01012345413", "01012345414"];

/**
 * A national number's result. Who is 66 or older was accepted directly; most others registered for the
 * lottery, and their application's main applicant is this person — accepted if the published draw holds
 * their birth year (and month). Until the draw is published, lottery registrants have no result yet.
 */
export function searchResult(id: string, draw: PublishedDraw | null): SearchResult {
  if (!isValidNationalId(id)) return { found: false };
  const p = getPerson(id);
  if (!p) return { found: false };
  const base = { name: fullName(p), governorate: p.governorate };

  if (FAMILY_4512.includes(id)) {
    return { ...base, found: true, outcome: "direct", label: `${OUTCOME_LABEL.direct} (طلب عائلي 4512)`, campaign: "القبول المباشر", applicationNo: "4512" };
  }
  if (ageOf(p) >= SEASON.acceptedDirectAge) {
    return { ...base, found: true, outcome: "direct", label: OUTCOME_LABEL.direct, campaign: "القبول المباشر" };
  }
  const roll = seeded(`result:${id}`)();
  if (roll < 0.03) {
    return { ...base, found: true, outcome: "direct", label: "مقبول مباشرة — حملة المنحة", campaign: "المنحة" };
  }
  if (roll < 0.75 && draw) {
    const solo = { members: [{ relation: "self", person: p as Person }] };
    const won = lotteryAccepted(solo, draw.picks);
    return { ...base, found: true, outcome: won ? "lottery" : "notDrawn", label: OUTCOME_LABEL[won ? "lottery" : "notDrawn"], campaign: "القرعة" };
  }
  return { found: false };
}

// ───────────────────────── Public lists ─────────────────────────

export type PublicMember = { maskedId: string; name: string };

export type PublicApplication = {
  applicationNo: string;
  governorate: string;
  office: string;
  campaign: Campaign;
  members: PublicMember[];
};

const GOV_CODES: Record<string, string> = {
  "دمشق": "010",
  "ريف دمشق": "030",
  "حلب": "020",
  "حمص": "060",
  "حماة": "050",
  "اللاذقية": "070",
  "إدلب": "080",
  "درعا": "120",
  "دير الزور": "090",
  // Registry codes of the governorates most residents of each country come from
  "تركيا": "020",
  "مصر": "010",
  "الأردن": "120",
};

const MALE = ["خالد", "بلال", "أنس", "طارق", "مصطفى", "إبراهيم", "علي", "نزار", "وائل", "هشام", "سليم", "زياد", "عبد الرحمن", "حسام", "فراس", "ماهر", "غسان", "عدنان", "رضوان", "منذر"];
const FEMALE = ["سلمى", "رغد", "آلاء", "نور", "ميساء", "لبنى", "دعاء", "رهف", "سمر", "إيمان", "هالة", "بشرى", "وفاء", "نجوى", "سهام", "ابتسام", "رباب", "غادة"];
const FATHERS = ["عبد الكريم", "محمود", "حسن", "عبد الرزاق", "جميل", "ماجد", "فايز", "نبيل", "صالح", "عبد القادر", "ياسر", "رشيد"];
const LASTS = ["الأحمد", "الحموي", "الدمشقي", "السعدي", "العلي", "الحسين", "الشيخ", "الإدلبي", "الحوراني", "المصري", "البيطار", "الساعاتي", "القباني", "الزعبي", "الرفاعي", "العطار", "النحاس", "الشامي", "الجابي", "الكردي"];

let cache: PublicApplication[] | null = null;

function pickGovernorate(r: number) {
  let acc = 0;
  for (const o of OFFICES) {
    acc += GOV_WEIGHTS[o.governorate];
    if (r <= acc) return o;
  }
  return OFFICES[0];
}

/**
 * The direct-acceptance list — applications with their members, ~people count equal to the seats. The
 * lottery publishes no list of names: its results are the table of drawn birth years and months.
 */
export function getDirectList(): PublicApplication[] {
  if (cache) return cache;

  const rnd = seeded("public-list:direct");
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)];
  const rows: PublicApplication[] = [];
  let people = 0;
  let appNo = 1000;
  // Seats taken by the guide's example family, set in by hand below
  const target = SEASON.directSeats - 4;

  while (people < target) {
    appNo += 3 * (1 + Math.floor(rnd() * 2));
    if (appNo === 4512) appNo += 3;
    const govEntry = pickGovernorate(rnd());
    const gov = govEntry.governorate;
    const office = govEntry.office;
    const code = GOV_CODES[gov];
    const campaign: Campaign = rnd() < 0.063 ? "المنحة" : "القبول المباشر";

    // family size: the direct list skews to couples
    const r = rnd();
    let size = r < 0.45 ? 1 : r < 0.9 ? 2 : 3;
    size = Math.min(size, target - people);

    const last = pick(LASTS);
    const headMale = rnd() < 0.72;
    const headFirst = headMale ? pick(MALE) : pick(FEMALE);
    const headFather = pick(FATHERS);
    const id = () => `${code}${String(Math.floor(rnd() * 1e8)).padStart(8, "0")}`;
    const members: PublicMember[] = [{ maskedId: maskNationalId(id()), name: `${headFirst} ${headFather} ${last}` }];
    for (let i = 1; i < size; i++) {
      if (i === 1 && headMale) {
        members.push({ maskedId: maskNationalId(id()), name: `${pick(FEMALE)} ${pick(FATHERS)} ${pick(LASTS)}` });
      } else {
        const male = rnd() < 0.5;
        members.push({ maskedId: maskNationalId(id()), name: `${male ? pick(MALE) : pick(FEMALE)} ${headMale ? headFirst : pick(FATHERS)} ${last}` });
      }
    }
    rows.push({ applicationNo: String(appNo), governorate: gov, office, campaign, members });
    people += size;
  }

  // The guide's example family — application 4512 under Khadija (78), Damascus office
  const idx = rows.findIndex((a) => Number(a.applicationNo) > 4512);
  const khatib: PublicApplication = {
    applicationNo: "4512",
    governorate: "دمشق",
    office: "مكتب دمشق",
    campaign: "القبول المباشر",
    members: [
      { maskedId: maskNationalId("01012340078"), name: "خديجة سعيد الخطيب" },
      { maskedId: maskNationalId("01012345412"), name: "محمد أحمد الخطيب" },
      { maskedId: maskNationalId("01012345413"), name: "فاطمة يوسف الحلبي" },
      { maskedId: maskNationalId("01012345414"), name: "عمر محمد الخطيب" },
    ],
  };
  rows.splice(idx < 0 ? rows.length : idx, 0, khatib);

  cache = rows;
  return rows;
}
