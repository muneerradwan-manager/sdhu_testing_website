"use client";

/**
 * Operational files (الملفات التشغيلية) — the structure of the season's field work, taken from the
 * operations app (hajjoperations_app, "modules"): a file TYPE defines the tree and the roles, and the
 * administration opens one FILE of each type per season, choosing its places from the season's
 * reference data (البيانات المرجعية) and assigning employees to every role.
 *
 * Every type is a two-level tree plus, optionally, a team held on the whole file:
 *   - Makkah housing: القطاع → البرج/الفندق (sector head and deputy; tower supervisor, deputies, members)
 *   - Mina camps:     المركز → المخيم, and فريق الكوسترات on the file (the buses serve every centre)
 *   - Arafat camps:   المركز → المخيم
 * Everything changes from one season to the next — the hotels, the sectors, the people — so hotels and
 * sectors are season-scoped lists and a new season's file can be built from last season's.
 *
 * Seeds live in lib/data/employees-seed.ts and lib/data/ops-seed.ts; what the staff change is kept in
 * store.ops (a list replaces its seed as soon as it is edited once).
 */

import { EMPLOYEES_SEED } from "./data/employees-seed";
import { CAMPS_SEED, CENTERS_SEED, FILES_SEED, HOTELS_SEED, SECTORS_SEED } from "./data/ops-seed";
import { SEASON } from "./season";
import { useMemo } from "react";
import { setState, useStore } from "./store";

export const CURRENT_SEASON: number = SEASON.hijriYear;

// ───────────────────────── Employees ─────────────────────────

export const MISSIONS = ["البعثة الإدارية", "البعثة الدينية", "البعثة الصحية", "البعثة الإعلامية"] as const;
export type Mission = (typeof MISSIONS)[number];

export const JOB_TITLES = [
  "مدير إدارة",
  "مدير مكتب",
  "رئيس قسم",
  "مساعد إداري",
  "أمين سر",
  "محاسب",
  "أمين صندوق",
  "مدقق حسابات",
  "مسؤول موارد بشرية",
  "مهندس معلوماتية",
  "فني دعم تقني",
  "مسؤول لوجستي",
  "مسؤول مخازن",
  "سائق",
  "مسؤول صيانة",
  "مستشار قانوني",
  "مسؤول إعلام وعلاقات عامة",
  "مصور",
  "أمين أرشيف ووثائق",
  "مدخل بيانات",
  "مسؤول تخطيط ومتابعة",
  "مسؤول جودة",
  "مسؤول مشتريات وتموين",
  "موظف خدمة جمهور",
  "مترجم",
  "طبيب",
  "ممرض",
  "صيدلاني",
  "مرشد ديني",
  "مسؤول أمن وسلامة",
] as const;

export const GOVERNORATES = ["دمشق", "ريف دمشق", "حلب", "حمص", "حماة", "اللاذقية", "طرطوس", "إدلب", "درعا", "السويداء", "القنيطرة", "دير الزور", "الرقة", "الحسكة"] as const;

export type Employee = {
  id: string;
  /** The staff-portal account of this employee, when he has one (lib/staff.ts) */
  staffId?: string;
  firstName: string;
  fatherName: string;
  surname: string;
  gender: "male" | "female";
  birthYear: number;
  nationalId: string;
  /** Governorate he comes from */
  city: string;
  jobTitle: string;
  mission: Mission;
  /** permanent = the directorate's own staff; external = delegated by another body for the season */
  kind: "permanent" | "external";
  organization?: string;
  phoneSy: string;
  phoneSa?: string;
  email?: string;
  languages: string[];
  /** Seasons he took part in — the current one included once he is registered for it */
  seasons: number[];
  suspended?: boolean;
  notes?: string;
};

export const fullName = (e: Pick<Employee, "firstName" | "fatherName" | "surname">) => `${e.firstName} ${e.fatherName} ${e.surname}`;
export const shortName = (e: Pick<Employee, "firstName" | "surname">) => `${e.firstName} ${e.surname}`;
export const inSeason = (e: Employee, season = CURRENT_SEASON) => e.seasons.includes(season);

// ───────────────────────── Search ─────────────────────────

/**
 * Arabic-aware folding so a search finds a name however it was typed: hamza forms, taa marbuta,
 * alef maqsura, diacritics and tatweel are ignored, and Arabic-Indic digits read as Western ones.
 */
export function fold(text: string) {
  return text
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

/** Every word of the query must appear somewhere in the fields, in any order ("أحمد الخطيب" finds أحمد محمد الخطيب) */
export function matches(query: string, fields: (string | number | undefined | null)[]) {
  const words = fold(query).split(" ").filter(Boolean);
  if (!words.length) return true;
  const hay = fold(fields.filter((f) => f !== undefined && f !== null).join(" "));
  const digits = hay.replace(/[^0-9]/g, "");
  return words.every((w) => hay.includes(w) || (/^\d{3,}$/.test(w) && digits.includes(w)));
}

export function employeeHaystack(e: Employee) {
  return [fullName(e), e.jobTitle, e.city, e.mission, e.organization, e.phoneSy, e.phoneSa, e.email, e.nationalId, e.id, e.languages.join(" ")];
}

// ───────────────────────── Reference data ─────────────────────────

export type City = "makkah" | "madinah";
export const CITY_LABEL: Record<City, string> = {
  makkah: "مكة المكرمة",
  madinah: "المدينة المنورة",
};

export type Mashaer = "mina" | "arafat";
export const MASHAER_LABEL: Record<Mashaer, string> = {
  mina: "منى",
  arafat: "عرفات",
};

export type Hotel = {
  id: string;
  season: number;
  name: string;
  city: City;
  area: string;
  /** Walking/driving distance to the Haram, as the contract states it */
  distance: string;
  /** Beds contracted for this season */
  capacity: number;
  licence: string;
  floors?: number;
  mapUrl?: string;
  archived?: boolean;
};

export type Sector = {
  id: string;
  season: number;
  name: string;
  /** The districts the sector covers */
  zone: string;
  order: number;
  archived?: boolean;
};

/** A service centre in Mina or Arafat (مركز 10، مركز 11…) — the camps are distributed under them */
export type Center = {
  id: string;
  season: number;
  name: string;
  mashaer: Mashaer;
  order: number;
  /** The company that runs the centre's services this season */
  company?: string;
  archived?: boolean;
};

/** A camp in Mina or Arafat, contracted afresh every season with its capacity */
export type Camp = {
  id: string;
  season: number;
  number: string;
  mashaer: Mashaer;
  capacity: number;
  location: string;
  mapUrl?: string;
  archived?: boolean;
};

export const campName = (c: Pick<Camp, "number">) => `مخيم ${c.number}`;

export type Refs = {
  hotels: Hotel[];
  sectors: Sector[];
  centers: Center[];
  camps: Camp[];
};
export type RefKind = "sector" | "center" | "hotel" | "camp";

/** Any reference entry, as a file shows it */
export type Place = {
  id: string;
  kind: RefKind;
  season: number;
  name: string;
  sub: string;
  capacity?: number;
  order: number;
  /** The city (hotels) or the mashaer (centres, camps) */
  group?: string;
  archived?: boolean;
  /** Same entry in another season = same key (used to rebuild a file for the next season) */
  key: string;
};

const placeCache = new WeakMap<object, Map<string, Place>>();

export function placeIndex(refs: Refs): Map<string, Place> {
  const cached = placeCache.get(refs);
  if (cached) return cached;
  const m = new Map<string, Place>();
  const put = (p: Omit<Place, "key">) => m.set(p.id, { ...p, key: `${p.kind}:${p.group ?? ""}:${p.name}` });
  refs.sectors.forEach((s) =>
    put({
      id: s.id,
      kind: "sector",
      season: s.season,
      name: s.name,
      sub: s.zone,
      order: s.order,
      archived: s.archived,
    }),
  );
  refs.centers.forEach((c) =>
    put({
      id: c.id,
      kind: "center",
      season: c.season,
      name: c.name,
      sub: c.company ?? MASHAER_LABEL[c.mashaer],
      order: c.order,
      group: c.mashaer,
      archived: c.archived,
    }),
  );
  refs.hotels.forEach((h) =>
    put({
      id: h.id,
      kind: "hotel",
      season: h.season,
      name: h.name,
      sub: `${h.area} · ${h.distance}`,
      capacity: h.capacity,
      order: 0,
      group: h.city,
      archived: h.archived,
    }),
  );
  refs.camps.forEach((c) =>
    put({
      id: c.id,
      kind: "camp",
      season: c.season,
      name: campName(c),
      sub: c.location,
      capacity: c.capacity,
      order: Number(c.number) || 0,
      group: c.mashaer,
      archived: c.archived,
    }),
  );
  placeCache.set(refs, m);
  return m;
}

// ───────────────────────── File types ─────────────────────────

export type Level = "file" | "outer" | "inner";

export type Role = {
  code: string;
  level: Level;
  name: string;
  /** Plural used in lists of several holders */
  plural?: string;
  required: boolean;
  multiple: boolean;
  /** Upper bound for a multi-holder role */
  max?: number;
  /** The role this one reports to (the holder is shown as the direct manager) */
  reportsTo?: string;
  description: string;
};

export type FileTypeCode = "makkah-housing" | "mina-camps" | "arafat-camps";

export type FileType = {
  code: FileTypeCode;
  name: string;
  short: string;
  /** Where the work happens, for chips and titles */
  where: string;
  description: string;
  startCondition: string;
  endCondition: string;
  outer: { name: string; plural: string; ref: "sectors" | "centers" };
  inner: { name: string; plural: string; ref: "hotels" | "camps" };
  /** Camp files offer the centres and camps of this mashaer only */
  mashaer?: Mashaer;
  /** Outer roles choose the hotel they sleep in (housing file) */
  housing?: boolean;
  /** Camps carry a tent number and the bodies allotted to them */
  campFields?: boolean;
  /** Title of the file-level roles (a team that belongs to no centre) */
  team?: string;
  roles: Role[];
  /** Default working dates per season (ISO) */
  dates: Record<number, { startsOn: string; endsOn: string }>;
};

const HOUSING: FileType = {
  code: "makkah-housing",
  name: "التسكين في مكة المكرمة — قطاعات وأبراج حجاج سوريا",
  short: "التسكين في مكة المكرمة",
  where: "مكة المكرمة",
  description: "يحدد قطاعات مكة المكرمة، والفنادق (الأبراج) التابعة لكل قطاع، ومن يديرها من موظفي الإدارة: رئيس القطاع ومعاونه، ومشرف كل برج ومعاونيه، وأعضاء البعثة الساكنين فيه.",
  startCondition: "يبدأ العمل بوصول طلائع البعثة إلى مكة المكرمة لاستلام الفنادق وتجهيزها قبل وصول أول فوج.",
  endCondition: "ينتهي العمل بترحيل آخر حاج إلى المدينة المنورة.",
  outer: { name: "القطاع", plural: "القطاعات", ref: "sectors" },
  inner: { name: "البرج / الفندق", plural: "الأبراج", ref: "hotels" },
  housing: true,
  roles: [
    {
      code: "sector-head",
      level: "outer",
      name: "رئيس القطاع",
      required: true,
      multiple: false,
      description:
        "قيادة القطاع وإدارته كاملاً: التخطيط المسبق، والإشراف على الأبراج والتسكين، ومتابعة أداء الفرق، والتنسيق بين الإدارات الخدمية والصحية والدينية، ومعالجة المشكلات الميدانية، وضمان جودة الخدمة والالتزام بالتعليمات، وتدقيق البيانات، وإعداد التقارير والتقييمات النهائية.",
    },
    {
      code: "sector-deputy",
      reportsTo: "sector-head",
      level: "outer",
      name: "معاون رئيس القطاع",
      required: false,
      multiple: false,
      description: "مساندة رئيس القطاع في المهام التنفيذية كلها: المتابعة الميدانية للأعمال، ودعم التنسيق بين الفرق، والمساهمة في حل المشكلات، وضمان تنفيذ الخطط والتعليمات بكفاءة.",
    },
    {
      code: "tower-supervisor",
      reportsTo: "sector-head",
      level: "inner",
      name: "مشرف البرج",
      required: true,
      multiple: false,
      description:
        "الإشراف المباشر على إدارة البرج وتشغيله: من تجهيز الفندق وتنظيم التسكين، إلى استقبال الحجاج ومتابعة راحتهم وخدماتهم (الإعاشة والنظافة والنقل)، وانتهاءً بالتفويج والترحيل، مع معالجة المشكلات اليومية ورفع التقارير إلى رئيس القطاع.",
    },
    {
      code: "tower-deputy",
      reportsTo: "tower-supervisor",
      level: "inner",
      name: "معاون مشرف البرج",
      plural: "معاونو مشرف البرج",
      required: false,
      multiple: true,
      description: "دعم مشرف البرج في التنفيذ الميداني اليومي: متابعة التسكين والخدمات، ومراقبة الالتزام داخل البرج، والمساهمة في التفويج والترحيل.",
    },
    {
      code: "mission-member",
      reportsTo: "tower-supervisor",
      level: "inner",
      name: "عضو بعثة",
      plural: "أعضاء البعثة الساكنون في البرج",
      required: false,
      multiple: true,
      description: "أعضاء البعثات (الإدارية والدينية والصحية والإعلامية) الذين يسكنون في البرج ويخدمون حجاجه من داخله، ويتبعون مشرف البرج في شؤون السكن والدوام.",
    },
  ],
  dates: {
    1447: { startsOn: "2026-04-19", endsOn: "2026-06-10" },
    1448: { startsOn: "2027-04-08", endsOn: "2027-05-31" },
  },
};

const centerSupervisor = (where: string): Role => ({
  code: "center-supervisor",
  level: "outer",
  name: "مشرف المركز",
  plural: "مشرفو المركز",
  required: true,
  multiple: true,
  max: 2,
  description: `الإشراف على مخيمات المركز في ${where} ومتابعة أعضائها، والتأكد من أن التوزيع قائم على الطاقة الاستيعابية لكل مخيم. قد يكون للمركز مشرفان حين يُدار مركزان متجاوران معاً.`,
});

const campMember = (duty: string): Role => ({
  code: "camp-member",
  reportsTo: "center-supervisor",
  level: "inner",
  name: "عضو المخيم",
  plural: "أعضاء المخيم",
  required: true,
  multiple: true,
  description: duty,
});

const MINA: FileType = {
  code: "mina-camps",
  name: "توزيع أعضاء مكاتب البعثة على مخيمات منى",
  short: "مخيمات منى",
  where: "منى",
  description:
    "يوزّع أعضاء مكاتب البعثة على مخيمات مشعر منى وفق الطاقة الاستيعابية لكل مخيم: يُقسم إلى مراكز، لكل مركز مشرفه وعدة مخيمات، ولكل مخيم أعضاؤه، ومعه فريق الكوسترات على مستوى الملف لأن الحافلات تتنقل بين المراكز كلها.",
  startCondition: "يبدأ العمل باعتماد توزيع المخيمات على المراكز قبل التوجه إلى منى.",
  endCondition: "ينتهي العمل بمغادرة آخر حاج من منى بعد أيام التشريق.",
  outer: { name: "المركز", plural: "المراكز", ref: "centers" },
  inner: { name: "المخيم", plural: "المخيمات", ref: "camps" },
  mashaer: "mina",
  campFields: true,
  team: "فريق الكوسترات",
  roles: [
    centerSupervisor("منى"),
    campMember("العمل مع حجاج المخيم في منى يوم التروية وأيام التشريق حتى النفير: الاستقبال والتسكين في الخيام، ومتابعة الإعاشة والنظافة، والتفويج إلى الجمرات."),
    {
      code: "coaster-lead",
      level: "file",
      name: "مشرف فريق الكوسترات",
      required: true,
      multiple: false,
      description: "الإشراف على فريق الكوسترات في منى: توزيع الحافلات على المراكز ومتابعة حركتها بين المخيمات والمشاعر، ومعالجة ما يطرأ عليها.",
    },
    {
      code: "coaster-member",
      reportsTo: "coaster-lead",
      level: "file",
      name: "عضو فريق الكوسترات",
      plural: "أعضاء فريق الكوسترات",
      required: false,
      multiple: true,
      description: "متابعة حافلات الكوسترات ميدانياً في منى ونقل الحجاج بين مواقعها.",
    },
  ],
  dates: {
    1447: { startsOn: "2026-05-23", endsOn: "2026-05-30" },
    1448: { startsOn: "2027-05-12", endsOn: "2027-05-19" },
  },
};

const ARAFAT: FileType = {
  code: "arafat-camps",
  name: "توزيع أعضاء مكاتب البعثة على مخيمات عرفات",
  short: "مخيمات عرفات",
  where: "عرفات",
  description: "يوزّع أعضاء مكاتب البعثة على مخيمات عرفات وفق الطاقة الاستيعابية لكل مخيم: يُقسم إلى مراكز، لكل مركز مشرفه وعدة مخيمات، ولكل مخيم أعضاؤه.",
  startCondition: "يبدأ العمل باعتماد توزيع المخيمات على المراكز قبل يوم عرفة.",
  endCondition: "ينتهي العمل بمغادرة آخر حاج من عرفات إلى مزدلفة.",
  outer: { name: "المركز", plural: "المراكز", ref: "centers" },
  inner: { name: "المخيم", plural: "المخيمات", ref: "camps" },
  mashaer: "arafat",
  campFields: true,
  roles: [
    centerSupervisor("عرفات"),
    campMember("العمل مع حجاج المخيم في عرفات يوم الوقوف حتى الدفع إلى مزدلفة: الاستقبال في الخيام، والإعاشة والماء، ورعاية كبار السن، وتنظيم الانطلاق إلى مزدلفة بعد الغروب."),
  ],
  dates: {
    1447: { startsOn: "2026-05-24", endsOn: "2026-05-26" },
    1448: { startsOn: "2027-05-13", endsOn: "2027-05-15" },
  },
};

export const FILE_TYPES: FileType[] = [HOUSING, MINA, ARAFAT];
export const HOUSING_TYPE = HOUSING;
export const fileTypeOf = (code: FileTypeCode) => FILE_TYPES.find((t) => t.code === code)!;
export const rolesAt = (type: FileType, level: Level) => type.roles.filter((r) => r.level === level);
export const roleIn = (type: FileType, code: string) => type.roles.find((r) => r.code === code)!;

/** The reference entries a file of this type may use in a season */
export function optionsFor(type: FileType, season: number, refs: Refs) {
  const idx = placeIndex(refs);
  const live = (ids: string[]) => ids.map((id) => idx.get(id)!).filter((p) => !p.archived);
  const outer =
    type.outer.ref === "sectors" ? refs.sectors.filter((s) => s.season === season).map((s) => s.id) : refs.centers.filter((c) => c.season === season && c.mashaer === type.mashaer).map((c) => c.id);
  const inner =
    type.inner.ref === "hotels"
      ? refs.hotels.filter((h) => h.season === season && h.city === "makkah").map((h) => h.id)
      : refs.camps.filter((c) => c.season === season && c.mashaer === type.mashaer).map((c) => c.id);
  return {
    outer: live(outer).sort((a, b) => a.order - b.order),
    inner: live(inner).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "ar")),
  };
}

// ───────────────────────── Files ─────────────────────────

export type Assignment = {
  role: string;
  employeeId: string;
  /** Housing file, outer roles only: the hotel he sleeps in. Inner roles live in their own tower. */
  housingHotelId?: string;
};

export type InnerNode = {
  id: string;
  /** Hotel or camp */
  refId: string;
  /** Pilgrims housed in the tower / camp this season */
  pilgrims: number;
  /** Clusters housed here (slugs of lib/data/clusters.ts) */
  clusters: string[];
  note?: string;
  /** Camps: the tent numbers the mission uses */
  tent?: string;
  /** Camps: bodies allotted a place in the camp (الإدارة الصحية…) */
  bodies?: string;
  members: Assignment[];
};

export type OuterNode = {
  id: string;
  /** Sector or centre */
  refId: string;
  members: Assignment[];
  children: InnerNode[];
};

export type ReportCadence = "none" | "daily" | "weekly";
export const CADENCE_LABEL: Record<ReportCadence, string> = {
  none: "بلا تقرير دوري",
  daily: "تقرير يومي",
  weekly: "تقرير أسبوعي",
};

export type OpFile = {
  id: string;
  type: FileTypeCode;
  season: number;
  decisionNumber: string;
  /** ISO dates (Gregorian); shown in Hijri */
  startsOn: string;
  endsOn: string;
  startNote?: string;
  endNote?: string;
  reportCadence: ReportCadence;
  status: "draft" | "active";
  activatedAt?: number;
  activatedBy?: string;
  createdAt: number;
  createdBy: string;
  /** File-level roles (a team that belongs to no centre) */
  members: Assignment[];
  nodes: OuterNode[];
};

export type FileState = "draft" | "active" | "ended";
export function fileState(f: OpFile, now = Date.now()): FileState {
  if (f.season < CURRENT_SEASON || new Date(f.endsOn).getTime() + 86_400_000 < now) return "ended";
  return f.status;
}
export const FILE_STATE_LABEL: Record<FileState, string> = {
  draft: "مسودة",
  active: "مفعّل",
  ended: "منتهٍ",
};

/** Files saved by the first version (sector → tower) are read into the general shape */
type LegacyFile = Omit<OpFile, "nodes" | "members"> & {
  sectors?: {
    id: string;
    sectorId: string;
    members: Assignment[];
    towers: {
      id: string;
      hotelId: string;
      pilgrims: number;
      clusters: string[];
      note?: string;
      members: Assignment[];
    }[];
  }[];
  nodes?: OuterNode[];
  members?: Assignment[];
};
const fileCache = new WeakMap<object, OpFile[]>();
function normalizeFiles(list: LegacyFile[]): OpFile[] {
  const cached = fileCache.get(list);
  if (cached) return cached;
  const out = list.map((f) =>
    f.nodes
      ? (f as OpFile)
      : ({
          ...f,
          members: f.members ?? [],
          nodes: (f.sectors ?? []).map((s) => ({
            id: s.id,
            refId: s.sectorId,
            members: s.members,
            children: s.towers.map((t) => ({
              id: t.id,
              refId: t.hotelId,
              pilgrims: t.pilgrims,
              clusters: t.clusters,
              note: t.note,
              members: t.members,
            })),
          })),
        } as OpFile),
  );
  fileCache.set(list, out);
  return out;
}

/**
 * The files as the staff see them: what they saved, plus every seed file they have not replaced
 * (same type and season) or deleted. Without this, data saved before a new file type existed would
 * hide that type's demo files.
 */
const mergedCache = new WeakMap<object, { deleted?: string[]; out: OpFile[] }>();
function liveFiles(saved: LegacyFile[] | undefined, deleted: string[] | undefined): OpFile[] {
  if (!saved) return FILES_SEED;
  const hit = mergedCache.get(saved);
  if (hit && hit.deleted === deleted) return hit.out;
  const own = normalizeFiles(saved);
  const taken = new Set(own.map((f) => `${f.type}:${f.season}`));
  const out = [...own, ...FILES_SEED.filter((f) => !taken.has(`${f.type}:${f.season}`) && !deleted?.includes(f.id))];
  mergedCache.set(saved, { deleted, out });
  return out;
}

// ───────────────────────── Live data (seed + what the staff changed) ─────────────────────────

export type OpsState = {
  employees?: Employee[];
  hotels?: Hotel[];
  sectors?: Sector[];
  centers?: Center[];
  camps?: Camp[];
  files?: OpFile[];
  /** Seed files the staff deleted, so they do not come back */
  deletedFiles?: string[];
};

const SEEDS = {
  employees: EMPLOYEES_SEED,
  hotels: HOTELS_SEED,
  sectors: SECTORS_SEED,
  centers: CENTERS_SEED,
  camps: CAMPS_SEED,
  files: FILES_SEED,
};

export const useEmployees = () => useStore((s) => s.ops.employees) ?? EMPLOYEES_SEED;
export const useHotels = () => useStore((s) => s.ops.hotels) ?? HOTELS_SEED;
export const useSectors = () => useStore((s) => s.ops.sectors) ?? SECTORS_SEED;
export const useCenters = () => useStore((s) => s.ops.centers) ?? CENTERS_SEED;
export const useCamps = () => useStore((s) => s.ops.camps) ?? CAMPS_SEED;
export function useOpFiles() {
  const saved = useStore((s) => s.ops.files) as LegacyFile[] | undefined;
  const deleted = useStore((s) => s.ops.deletedFiles);
  return liveFiles(saved, deleted);
}

/** All four reference lists as one stable object */
export function useRefs(): Refs {
  const hotels = useHotels();
  const sectors = useSectors();
  const centers = useCenters();
  const camps = useCamps();
  return useMemo(() => ({ hotels, sectors, centers, camps }), [hotels, sectors, centers, camps]);
}

export const usePlaces = () => placeIndex(useRefs());

function patch<K extends keyof OpsState>(key: K, fn: (list: NonNullable<OpsState[K]>) => NonNullable<OpsState[K]>) {
  setState((s) => {
    const current = key === "files" ? liveFiles(s.ops.files as LegacyFile[] | undefined, s.ops.deletedFiles) : (s.ops[key] ?? SEEDS[key as keyof typeof SEEDS]);
    return {
      ...s,
      ops: { ...s.ops, [key]: fn(current as NonNullable<OpsState[K]>) },
    };
  });
}

function upsert<T extends { id: string }>(list: T[], item: T) {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
}

export const opsActions = {
  saveEmployee: (e: Employee) => patch("employees", (l) => upsert(l, e)),
  saveHotel: (h: Hotel) => patch("hotels", (l) => upsert(l, h)),
  saveHotels: (hs: Hotel[]) => patch("hotels", (l) => hs.reduce(upsert, l)),
  saveSector: (x: Sector) => patch("sectors", (l) => upsert(l, x)),
  saveSectors: (xs: Sector[]) => patch("sectors", (l) => xs.reduce(upsert, l)),
  saveCenter: (x: Center) => patch("centers", (l) => upsert(l, x)),
  saveCenters: (xs: Center[]) => patch("centers", (l) => xs.reduce(upsert, l)),
  saveCamp: (x: Camp) => patch("camps", (l) => upsert(l, x)),
  saveCamps: (xs: Camp[]) => patch("camps", (l) => xs.reduce(upsert, l)),
  saveFile: (f: OpFile) => patch("files", (l) => upsert(l, f)),
  deleteFile: (id: string) => {
    patch("files", (l) => l.filter((f) => f.id !== id));
    if (FILES_SEED.some((f) => f.id === id)) setState((s) => ({ ...s, ops: { ...s.ops, deletedFiles: [...(s.ops.deletedFiles ?? []), id] } }));
  },
  /** Back to the demo's original data */
  reset: () => setState((s) => ({ ...s, ops: {} })),
};

export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

// ───────────────────────── Queries ─────────────────────────

export type Posting = {
  file: OpFile;
  type: FileType;
  role: Role;
  outer?: Place;
  inner?: Place;
  /** Housing file: where he sleeps */
  housing?: Place;
};

/** Every post a person holds in the given files */
export function postingsOf(employeeId: string, files: OpFile[], places: Map<string, Place>): Posting[] {
  const out: Posting[] = [];
  for (const file of files) {
    const type = fileTypeOf(file.type);
    const push = (m: Assignment, outer?: string, inner?: string) => {
      if (m.employeeId !== employeeId) return;
      const housing = type.housing ? places.get(inner ?? m.housingHotelId ?? "") : undefined;
      out.push({
        file,
        type,
        role: roleIn(type, m.role),
        outer: outer ? places.get(outer) : undefined,
        inner: inner ? places.get(inner) : undefined,
        housing,
      });
    };
    file.members.forEach((m) => push(m));
    for (const o of file.nodes) {
      o.members.forEach((m) => push(m, o.refId));
      o.children.forEach((c) => c.members.forEach((m) => push(m, o.refId, c.refId)));
    }
  }
  return out;
}

export function postingLabel(p: Posting, withFile = false) {
  const where = p.inner?.name ?? p.outer?.name ?? p.type.team ?? p.type.short;
  return withFile ? `${p.role.name} — ${where} (${p.type.where})` : `${p.role.name} — ${where}`;
}

export type Seat = { role: string; outerId?: string; innerId?: string };

/** Employee id → his posts in one file, for pickers and tables */
export function postingIndex(file: OpFile | undefined) {
  const idx = new Map<string, Seat[]>();
  if (!file) return idx;
  const add = (id: string, v: Seat) => idx.set(id, [...(idx.get(id) ?? []), v]);
  file.members.forEach((m) => add(m.employeeId, { role: m.role }));
  for (const o of file.nodes) {
    o.members.forEach((m) => add(m.employeeId, { role: m.role, outerId: o.refId }));
    o.children.forEach((c) => c.members.forEach((m) => add(m.employeeId, { role: m.role, outerId: o.refId, innerId: c.refId })));
  }
  return idx;
}

/** Mission staff in a tower / camp: its own people, plus (housing file) outer roles who sleep there */
export function staffIn(file: OpFile, innerRefId: string) {
  let n = 0;
  for (const o of file.nodes) {
    n += o.members.filter((m) => m.housingHotelId === innerRefId).length;
    const c = o.children.find((x) => x.refId === innerRefId);
    if (c) n += c.members.length;
  }
  return n;
}

export type Gap = { role: Role; outerId?: string; innerId?: string };

/** Required posts nobody holds yet — these block activation */
export function gapsOf(file: OpFile): Gap[] {
  const type = fileTypeOf(file.type);
  const gaps: Gap[] = [];
  const need = (level: Level, ms: Assignment[], at: Omit<Gap, "role">) =>
    rolesAt(type, level)
      .filter((r) => r.required && !ms.some((m) => m.role === r.code))
      .forEach((role) => gaps.push({ role, ...at }));
  need("file", file.members, {});
  for (const o of file.nodes) {
    need("outer", o.members, { outerId: o.refId });
    o.children.forEach((c) => need("inner", c.members, { outerId: o.refId, innerId: c.refId }));
  }
  return gaps;
}

export function fileStats(file: OpFile) {
  const inner = file.nodes.flatMap((o) => o.children);
  const people = new Set<string>(file.members.map((m) => m.employeeId));
  file.nodes.forEach((o) => {
    o.members.forEach((m) => people.add(m.employeeId));
    o.children.forEach((c) => c.members.forEach((m) => people.add(m.employeeId)));
  });
  return {
    outer: file.nodes.length,
    inner: inner.length,
    people: people.size,
    pilgrims: inner.reduce((a, c) => a + c.pilgrims, 0),
    gaps: gapsOf(file).length,
  };
}

/**
 * A new season's file from last season's: the same centres/sectors and camps/towers wherever this
 * season's reference lists still have them (same name, same mashaer or city), optionally with the same
 * people when they are registered for this season. What no longer exists is reported, not dropped silently.
 */
export function copyFile(
  from: OpFile,
  opts: {
    season: number;
    withPeople: boolean;
    refs: Refs;
    employees: Employee[];
    by: string;
  },
) {
  const places = placeIndex(opts.refs);
  const type = fileTypeOf(from.type);
  const bySeason = new Map<string, string>();
  places.forEach((p) => p.season === opts.season && !p.archived && bySeason.set(p.key, p.id));
  const carry = (id?: string) => (id ? bySeason.get(places.get(id)?.key ?? "") : undefined);
  const participating = new Set(opts.employees.filter((e) => inSeason(e, opts.season) && !e.suspended).map((e) => e.id));
  let dropped = 0;
  const keep = (ms: Assignment[]) => {
    const kept = opts.withPeople ? ms.filter((m) => participating.has(m.employeeId)) : [];
    if (opts.withPeople) dropped += ms.length - kept.length;
    return kept;
  };
  const missing: string[] = [];

  const nodes: OuterNode[] = [];
  for (const o of from.nodes) {
    const refId = carry(o.refId);
    if (!refId) {
      missing.push(places.get(o.refId)?.name ?? type.outer.name);
      continue;
    }
    const children: InnerNode[] = [];
    for (const c of o.children) {
      const inner = carry(c.refId);
      if (!inner) {
        missing.push(places.get(c.refId)?.name ?? type.inner.name);
        continue;
      }
      // Last season's clusters and pilgrim count are a starting point; the office corrects them for this year
      children.push({
        ...c,
        id: newId("n"),
        refId: inner,
        members: keep(c.members),
      });
    }
    nodes.push({
      id: newId("o"),
      refId,
      members: keep(o.members).map((m) => ({
        ...m,
        housingHotelId: carry(m.housingHotelId),
      })),
      children,
    });
  }

  const dates = type.dates[opts.season] ?? {
    startsOn: from.startsOn,
    endsOn: from.endsOn,
  };
  const file: OpFile = {
    id: newId("f"),
    type: from.type,
    season: opts.season,
    decisionNumber: "",
    ...dates,
    reportCadence: from.reportCadence,
    status: "draft",
    createdAt: Date.now(),
    createdBy: opts.by,
    members: keep(from.members),
    nodes,
  };
  return { file, missing, dropped };
}
