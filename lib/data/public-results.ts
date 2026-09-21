/**
 * Public acceptance results for season 1448 AH (fictional).
 * Only what the public portal is allowed to publish: name, result, reserve rank, campaign, governorate.
 * Never phone, address, age, reasons or family members in the search result.
 */
import { SEASON, OFFICES } from "../season";
import { ageOf, fullName, getPerson, isValidNationalId } from "../registry";
import { maskNationalId, seeded } from "../utils";

/** Eligible applications registered in the lottery window (16 – 25 Rajab) — a separate registration from direct acceptance */
const LOTTERY_ELIGIBLE = 53_955;

export const RESULTS_SUMMARY = {
  /** Accepted directly (oldest first) + eligible lottery applications — the base of the public outcome chart */
  eligible: SEASON.directSeats + LOTTERY_ELIGIBLE,
  lotteryEligible: LOTTERY_ELIGIBLE,
  direct: SEASON.directSeats,
  lottery: SEASON.lotterySeats,
  reserve: SEASON.reserve,
  notAccepted: LOTTERY_ELIGIBLE - SEASON.lotterySeats - SEASON.reserve,
  acceptedAge: SEASON.acceptedDirectAge,
  lastUpdate: "2 شعبان 1448 — 09:05",
  directApprovedAt: "15 رجب 1448 — 10:00",
  lotteryWindow: SEASON.windows.lottery.hijri,
  lotteryAt: "1 شعبان 1448 — 20:00",
  familyApplicationsInLottery: 4_020,
} as const;

/** Which registration the application was made in: direct acceptance, lottery, or the scholarship campaign */
export type Campaign = "القبول المباشر" | "القرعة" | "المنحة";
export type Outcome = "direct" | "lottery" | "reserve" | "none";

export const OUTCOME_LABEL: Record<Outcome, string> = {
  direct: "مقبول مباشرة وفق الأكبر سناً",
  lottery: "مقبول بالقرعة",
  reserve: "احتياط",
  none: "لم يرد هذا الرقم ضمن المقبولين أو الاحتياط",
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

export const GOVERNORATE_STATS = (() => {
  const govs = OFFICES.map((o) => o.governorate);
  const eligible = split(RESULTS_SUMMARY.eligible, "eligible");
  const direct = split(RESULTS_SUMMARY.direct, "direct");
  const lottery = split(RESULTS_SUMMARY.lottery, "lottery");
  const reserve = split(RESULTS_SUMMARY.reserve, "reserve");
  return govs.map((g, i) => ({ governorate: g, eligible: eligible[i], direct: direct[i], lottery: lottery[i], reserve: reserve[i] }));
})();

// ───────────────────────── Search by national number ─────────────────────────

export type SearchResult =
  | { found: false }
  | {
      found: true;
      name: string;
      outcome: Exclude<Outcome, "none">;
      label: string;
      rank?: number;
      campaign: Campaign;
      governorate: string;
      applicationNo?: string;
    };

const FAMILY_4512 = ["01012345412", "01012340078", "01012345413", "01012345414"];

export function searchResult(id: string): SearchResult {
  if (!isValidNationalId(id)) return { found: false };
  const p = getPerson(id);
  if (!p) return { found: false };
  const base = { name: fullName(p), governorate: p.governorate };

  if (FAMILY_4512.includes(id)) {
    return { ...base, found: true, outcome: "lottery", label: `${OUTCOME_LABEL.lottery} (طلب عائلي 4512)`, campaign: "القرعة", applicationNo: "4512" };
  }
  if (id === "01011100208") {
    return { ...base, found: true, outcome: "reserve", label: "احتياط — الترتيب 1,208", rank: 1208, campaign: "القرعة" };
  }
  if (ageOf(p) >= SEASON.acceptedDirectAge) {
    return { ...base, found: true, outcome: "direct", label: OUTCOME_LABEL.direct, campaign: "القبول المباشر" };
  }
  const rnd = seeded(`result:${id}`);
  const roll = rnd();
  if (roll < 0.03) {
    return { ...base, found: true, outcome: "direct", label: "مقبول مباشرة — حملة المنحة", campaign: "المنحة" };
  }
  if (roll < 0.33) {
    return { ...base, found: true, outcome: "lottery", label: OUTCOME_LABEL.lottery, campaign: "القرعة" };
  }
  if (roll < 0.43) {
    const rank = 1 + Math.floor(rnd() * 1490);
    return { ...base, found: true, outcome: "reserve", label: `احتياط — الترتيب ${rank.toLocaleString("en-US")}`, rank, campaign: "القرعة" };
  }
  return { found: false };
}

// ───────────────────────── Public lists ─────────────────────────

export type ListKind = "direct" | "lottery" | "reserve";

export type PublicMember = { maskedId: string; name: string };

export type PublicApplication = {
  applicationNo: string;
  governorate: string;
  office: string;
  campaign: Campaign;
  rank?: number;
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

const LIST_SIZES: Record<ListKind, number> = {
  direct: SEASON.directSeats,
  lottery: SEASON.lotterySeats,
  reserve: SEASON.reserve,
};

const cache = new Map<ListKind, PublicApplication[]>();

function pickGovernorate(r: number) {
  let acc = 0;
  for (const o of OFFICES) {
    acc += GOV_WEIGHTS[o.governorate];
    if (r <= acc) return o;
  }
  return OFFICES[0];
}

/** Deterministic public list — applications with their members, ~people count equal to the seats */
export function getPublicList(kind: ListKind): PublicApplication[] {
  const cached = cache.get(kind);
  if (cached) return cached;

  const rnd = seeded(`public-list:${kind}`);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)];
  const rows: PublicApplication[] = [];
  let people = 0;
  // Each list uses its own residue mod 3, so application numbers never repeat across lists
  let appNo = kind === "direct" ? 1000 : kind === "lottery" ? 1001 : 1002;
  // Reserve the seats taken by the hand-written example applications below
  const target = LIST_SIZES[kind] - (kind === "lottery" ? 4 : kind === "reserve" ? 1 : 0);

  while (people < target) {
    appNo += 3 * (1 + Math.floor(rnd() * 2));
    if (appNo === 4512 || appNo === 3981) appNo += 3;
    const govEntry = pickGovernorate(rnd());
    const gov = govEntry.governorate;
    const office = govEntry.office;
    const code = GOV_CODES[gov];
    const campaign: Campaign = kind !== "direct" ? "القرعة" : rnd() < 0.063 ? "المنحة" : "القبول المباشر";

    // family size: direct list skews to couples, lottery to families
    const r = rnd();
    let size = kind === "direct" ? (r < 0.45 ? 1 : r < 0.9 ? 2 : 3) : r < 0.38 ? 1 : r < 0.62 ? 2 : r < 0.8 ? 3 : r < 0.95 ? 4 : 5;
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

  if (kind === "lottery") {
    // The example family — application 4512, Damascus, Mazzeh office
    const idx = rows.findIndex((a) => Number(a.applicationNo) > 4512);
    const khatib: PublicApplication = {
      applicationNo: "4512",
      governorate: "دمشق",
      office: "مكتب دمشق",
      campaign: "القرعة",
      members: [
        { maskedId: maskNationalId("01012345412"), name: "محمد أحمد الخطيب" },
        { maskedId: maskNationalId("01012345413"), name: "فاطمة يوسف الحلبي" },
        { maskedId: maskNationalId("01012345414"), name: "عمر محمد الخطيب" },
        { maskedId: maskNationalId("01012340078"), name: "خديجة سعيد الخطيب" },
      ],
    };
    rows.splice(idx < 0 ? rows.length : idx, 0, khatib);
  }

  if (kind === "reserve") {
    // Reserve is ranked; ياسين holds rank 1,208
    for (let i = rows.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [rows[i], rows[j]] = [rows[j], rows[i]];
    }
    const yasin: PublicApplication = {
      applicationNo: "3981",
      governorate: "دمشق",
      office: "مكتب دمشق",
      campaign: "القرعة",
      members: [{ maskedId: maskNationalId("01011100208"), name: "ياسين خليل العمر" }],
    };
    rows.splice(Math.min(1207, rows.length), 0, yasin);
    rows.forEach((row, i) => (row.rank = i + 1));
  }

  cache.set(kind, rows);
  return rows;
}
