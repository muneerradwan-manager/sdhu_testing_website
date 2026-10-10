import type { Assignment, Camp, Center, Employee, Hotel, InnerNode, Mashaer, OpFile, OuterNode, Sector } from "../ops";
import { seeded } from "../utils";
import { EMPLOYEES_SEED, NAMED_EMPLOYEES } from "./employees-seed";

/**
 * Reference data and the operational files for two seasons, so the demo shows what changes from one
 * year to the next: 1447 (ended) and 1448 (drafts still being staffed, with a few posts left empty).
 * Files: Makkah housing (sectors → towers), Mina camps and Arafat camps (centres → camps).
 * The seven cluster hotels match lib/data/clusters.ts and camp 42 in Mina matches lib/journey.ts;
 * every other name is invented.
 */

type H = [name: string, area: string, distance: string, capacity: number, floors: number];

const MAKKAH_1448: H[] = [
  ["فندق أبراج النور", "العزيزية الشمالية", "3.4 كم", 700, 18],
  ["فندق سنابل حوران", "العزيزية الجنوبية", "3.9 كم", 520, 12],
  ["فندق نسيم العزيزية", "العزيزية", "3.6 كم", 480, 10],
  ["فندق ضيوف المشاعر", "العزيزية الجنوبية", "4.2 كم", 600, 14],
  ["فندق إطلالة الصفا", "الشبيكة", "450 م", 450, 16],
  ["فندق بوابة الملك عبد العزيز", "جبل عمر", "350 م", 360, 20],
  ["فندق دار المقام", "المسفلة", "900 م", 420, 11],
  ["فندق منازل اليقين", "العوالي", "6.2 كم", 900, 15],
  ["فندق روابي كدي", "كدي", "2.8 كم", 500, 9],
  ["فندق مكارم العوالي", "العوالي", "6.8 كم", 650, 13],
  ["فندق قمم الشهباء", "ششة", "4.1 كم", 760, 17],
  ["فندق ضيافة العاصي", "النسيم", "5.5 كم", 560, 12],
  ["فندق أنسام ششة", "ششة", "4.4 كم", 480, 10],
  ["فندق ربى الرصيفة", "الرصيفة", "7.5 كم", 600, 12],
  ["فندق منارة بطحاء قريش", "بطحاء قريش", "5.9 كم", 540, 11],
  ["فندق وفود الرحمن", "الرصيفة", "7.9 كم", 450, 9],
  ["فندق لؤلؤة الهجرة", "الهجرة", "5.1 كم", 400, 8],
  ["فندق جوهرة جرول", "جرول", "1.9 كم", 380, 10],
];

const MAKKAH_1447: H[] = [
  ["فندق أبراج النور", "العزيزية الشمالية", "3.4 كم", 650, 18],
  ["فندق ضيوف الرحمن", "العزيزية", "3.8 كم", 520, 11],
  ["فندق نسيم العزيزية", "العزيزية", "3.6 كم", 480, 10],
  ["فندق إطلالة الصفا", "الشبيكة", "450 م", 450, 16],
  ["فندق بوابة الملك عبد العزيز", "جبل عمر", "350 م", 340, 20],
  ["فندق نجمة المسفلة", "المسفلة", "1.2 كم", 400, 9],
  ["فندق منازل اليقين", "العوالي", "6.2 كم", 850, 15],
  ["فندق قصر الضيافة", "العوالي", "6.5 كم", 560, 12],
  ["فندق روابي كدي", "كدي", "2.8 كم", 500, 9],
  ["فندق قمم الشهباء", "ششة", "4.1 كم", 700, 17],
  ["فندق ضيافة العاصي", "النسيم", "5.5 كم", 520, 12],
  ["فندق منارة ششة", "ششة", "4.6 كم", 460, 10],
  ["فندق دار السلام", "النسيم", "5.2 كم", 420, 9],
  ["فندق ربى الرصيفة", "الرصيفة", "7.5 كم", 600, 12],
];

const MADINAH_1448: H[] = [
  ["فندق روضة طيبة", "المنطقة المركزية", "300 م", 650, 14],
  ["فندق دار الهجرة", "المنطقة المركزية الشمالية", "150 م", 420, 12],
  ["فندق نسائم المدينة", "طريق الملك فيصل", "900 م", 820, 13],
  ["فندق أنوار الحرم", "المنطقة المركزية الغربية", "400 م", 720, 15],
  ["فندق السكينة", "حي بني خدرة", "1.1 كم", 520, 10],
  ["فندق قباب المدينة", "المنطقة المركزية", "100 م", 320, 16],
  ["فندق ريحانة طيبة", "المنطقة المركزية الجنوبية", "500 م", 460, 12],
];

const MADINAH_1447: H[] = MADINAH_1448.slice(0, 5);

function hotels(season: number, city: Hotel["city"], list: H[]): Hotel[] {
  const prefix = `${city === "makkah" ? "mk" : "md"}${season % 100}`;
  return list.map(([name, area, distance, capacity, floors], i) => ({
    id: `${prefix}-${String(i + 1).padStart(2, "0")}`,
    season,
    name,
    city,
    area,
    distance,
    capacity,
    floors,
    licence: String(10_000_000 + ((season * 7919 + i * 104_729 + (city === "makkah" ? 0 : 55_001)) % 12_999_999)).slice(0, 8),
  }));
}

export const HOTELS_SEED: Hotel[] = [
  ...hotels(1447, "makkah", MAKKAH_1447),
  ...hotels(1447, "madinah", MADINAH_1447),
  ...hotels(1448, "makkah", MAKKAH_1448),
  ...hotels(1448, "madinah", MADINAH_1448),
];

const ORDINAL = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن"];

export const SECTORS_SEED: Sector[] = [
  ...["العزيزية", "المنطقة المركزية: الشبيكة وجبل عمر والمسفلة", "العوالي وكدي", "ششة والنسيم والرصيفة"].map((zone, i) => ({
    id: `sc47-${i + 1}`,
    season: 1447,
    name: `القطاع ${ORDINAL[i]}`,
    zone,
    order: i + 1,
  })),
  ...["العزيزية الشمالية والجنوبية", "المنطقة المركزية: الشبيكة وجبل عمر والمسفلة", "العوالي وكدي", "ششة والنسيم", "الرصيفة وبطحاء قريش"].map((zone, i) => ({
    id: `sc48-${i + 1}`,
    season: 1448,
    name: `القطاع ${ORDINAL[i]}`,
    zone,
    order: i + 1,
  })),
];

// ───────────────────────── Files ─────────────────────────

const hotelId = (season: number, name: string) => HOTELS_SEED.find((h) => h.season === season && h.city === "makkah" && h.name === name)!.id;

type TowerSpec = {
  hotel: string;
  pilgrims: number;
  clusters?: string[];
  supervisor?: string | null;
  deputies?: number;
  members?: number;
};
type SectorSpec = {
  head?: string | null;
  deputy?: boolean;
  housedAt: string;
  towers: TowerSpec[];
};

const byHandle = (handle: string) => NAMED_EMPLOYEES[handle];
/** The people the demo names hold only the posts it gives them: never drawn at random */
const NAMED_IDS = new Set(Object.values(NAMED_EMPLOYEES));

/**
 * Staffs a file from the people who travelled that season. Heads and supervisors come from the
 * permanent administrative staff with the most seasons; members are a mix of every mission.
 * `null` leaves a required post empty on purpose, so the draft shows what is still missing.
 */
function buildHousing(season: number, spec: SectorSpec[], sectorIds: string[], fixed: Record<string, string>): OuterNode[] {
  const rnd = seeded(`housing-${season}`);
  const used = new Set<string>(Object.values(fixed));
  const pool = EMPLOYEES_SEED.filter((e) => e.seasons.includes(season) && !e.suspended && !NAMED_IDS.has(e.id))
    .map((e) => ({ e, r: rnd() }))
    .sort((a, b) => a.r - b.r)
    .map((x) => x.e);
  const senior = (e: Employee) => e.kind === "permanent" && e.mission === "البعثة الإدارية" && e.seasons.filter((y) => y < season).length >= 2;
  const take = (want: (e: Employee) => boolean) => {
    const found = pool.find((e) => !used.has(e.id) && want(e)) ?? pool.find((e) => !used.has(e.id));
    if (!found) throw new Error("employee pool exhausted");
    used.add(found.id);
    return found.id;
  };
  const missions = ["البعثة الدينية", "البعثة الصحية", "البعثة الإدارية", "البعثة الإدارية", "البعثة الإعلامية"];

  return spec.map((s, si) => {
    const housing = hotelId(season, s.housedAt);
    const members: Assignment[] = [];
    if (s.head !== null)
      members.push({
        role: "sector-head",
        employeeId: s.head ? fixed[s.head] : take((e) => senior(e) && e.gender === "male"),
        housingHotelId: housing,
      });
    if (s.deputy !== false)
      members.push({
        role: "sector-deputy",
        employeeId: take(senior),
        housingHotelId: housing,
      });
    return {
      id: `s${season % 100}-${si + 1}`,
      refId: sectorIds[si],
      members,
      children: s.towers.map((t, ti) => {
        const tm: Assignment[] = [];
        if (t.supervisor !== null)
          tm.push({
            role: "tower-supervisor",
            employeeId: t.supervisor ? fixed[t.supervisor] : take((e) => senior(e) && e.gender === "male"),
          });
        for (let d = 0; d < (t.deputies ?? 1); d++)
          tm.push({
            role: "tower-deputy",
            employeeId: take((e) => e.mission === "البعثة الإدارية"),
          });
        for (let m = 0; m < (t.members ?? 2); m++) {
          const mission = missions[(ti + m + si) % missions.length];
          tm.push({
            role: "mission-member",
            employeeId: take((e) => e.mission === mission),
          });
        }
        return {
          id: `t${season % 100}-${si + 1}-${ti + 1}`,
          refId: hotelId(season, t.hotel),
          pilgrims: t.pilgrims,
          clusters: t.clusters ?? [],
          members: tm,
        };
      }),
    };
  });
}

const SPEC_1447: SectorSpec[] = [
  {
    head: "nader",
    housedAt: "فندق أبراج النور",
    towers: [
      {
        hotel: "فندق أبراج النور",
        pilgrims: 600,
        clusters: ["al-nour"],
        supervisor: "wissam",
        deputies: 2,
        members: 3,
      },
      {
        hotel: "فندق ضيوف الرحمن",
        pilgrims: 480,
        clusters: ["hawran"],
        members: 2,
      },
      { hotel: "فندق نسيم العزيزية", pilgrims: 440, members: 2 },
    ],
  },
  {
    housedAt: "فندق إطلالة الصفا",
    towers: [
      {
        hotel: "فندق إطلالة الصفا",
        pilgrims: 400,
        clusters: ["al-safa"],
        members: 2,
      },
      {
        hotel: "فندق بوابة الملك عبد العزيز",
        pilgrims: 300,
        clusters: ["bawabat-al-haramain"],
        members: 2,
      },
      { hotel: "فندق نجمة المسفلة", pilgrims: 360, members: 2 },
    ],
  },
  {
    housedAt: "فندق منازل اليقين",
    towers: [
      {
        hotel: "فندق منازل اليقين",
        pilgrims: 800,
        clusters: ["al-yaqeen"],
        deputies: 2,
        members: 3,
      },
      { hotel: "فندق قصر الضيافة", pilgrims: 520, members: 2 },
      { hotel: "فندق روابي كدي", pilgrims: 450, members: 2 },
    ],
  },
  {
    housedAt: "فندق قمم الشهباء",
    towers: [
      {
        hotel: "فندق قمم الشهباء",
        pilgrims: 700,
        clusters: ["al-shahba"],
        deputies: 2,
        members: 3,
      },
      {
        hotel: "فندق ضيافة العاصي",
        pilgrims: 500,
        clusters: ["al-asi"],
        members: 2,
      },
      { hotel: "فندق منارة ششة", pilgrims: 420, members: 2 },
      { hotel: "فندق دار السلام", pilgrims: 380, members: 2 },
      { hotel: "فندق ربى الرصيفة", pilgrims: 540, members: 2 },
    ],
  },
];

const SPEC_1448: SectorSpec[] = [
  {
    head: "nader",
    housedAt: "فندق أبراج النور",
    towers: [
      {
        hotel: "فندق أبراج النور",
        pilgrims: 600,
        clusters: ["al-nour"],
        supervisor: "wissam",
        deputies: 2,
        members: 3,
      },
      {
        hotel: "فندق سنابل حوران",
        pilgrims: 450,
        clusters: ["hawran"],
        members: 2,
      },
      { hotel: "فندق نسيم العزيزية", pilgrims: 440, members: 2 },
      { hotel: "فندق ضيوف المشاعر", pilgrims: 560, members: 2 },
    ],
  },
  {
    housedAt: "فندق إطلالة الصفا",
    towers: [
      {
        hotel: "فندق إطلالة الصفا",
        pilgrims: 400,
        clusters: ["al-safa"],
        members: 2,
      },
      {
        hotel: "فندق بوابة الملك عبد العزيز",
        pilgrims: 300,
        clusters: ["bawabat-al-haramain"],
        members: 2,
      },
      { hotel: "فندق دار المقام", pilgrims: 380, members: 2 },
    ],
  },
  {
    housedAt: "فندق منازل اليقين",
    towers: [
      {
        hotel: "فندق منازل اليقين",
        pilgrims: 800,
        clusters: ["al-yaqeen"],
        deputies: 2,
        members: 3,
      },
      { hotel: "فندق روابي كدي", pilgrims: 460, members: 2 },
      { hotel: "فندق مكارم العوالي", pilgrims: 600, members: 1 },
    ],
  },
  {
    housedAt: "فندق قمم الشهباء",
    towers: [
      {
        hotel: "فندق قمم الشهباء",
        pilgrims: 700,
        clusters: ["al-shahba"],
        deputies: 2,
        members: 3,
      },
      {
        hotel: "فندق ضيافة العاصي",
        pilgrims: 500,
        clusters: ["al-asi"],
        members: 2,
      },
      { hotel: "فندق أنسام ششة", pilgrims: 440, members: 1 },
    ],
  },
  {
    // The fifth sector is new this season: no head chosen yet and two towers without a supervisor
    head: null,
    deputy: true,
    housedAt: "فندق ربى الرصيفة",
    towers: [
      { hotel: "فندق ربى الرصيفة", pilgrims: 560, members: 2 },
      {
        hotel: "فندق منارة بطحاء قريش",
        pilgrims: 500,
        supervisor: null,
        deputies: 1,
        members: 1,
      },
      {
        hotel: "فندق وفود الرحمن",
        pilgrims: 420,
        supervisor: null,
        deputies: 0,
        members: 0,
      },
    ],
  },
];

const FIXED = { nader: byHandle("nader"), wissam: byHandle("wissam") };

const HOUSING_FILES: OpFile[] = [
  {
    id: "f47-housing",
    type: "makkah-housing",
    season: 1447,
    decisionNumber: "3142",
    startsOn: "2026-04-19",
    endsOn: "2026-06-10",
    startNote: "استلام الفنادق من الشركات المشغّلة بمحاضر رسمية قبل وصول أول فوج بثلاثة أيام.",
    endNote: "سُلّمت الفنادق كلها بعد ترحيل آخر فوج إلى المدينة المنورة في 24 ذو الحجة.",
    reportCadence: "daily",
    status: "active",
    activatedAt: Date.UTC(2026, 3, 12, 9, 30),
    activatedBy: "غسان العمر",
    createdAt: Date.UTC(2026, 2, 28, 10, 0),
    createdBy: "غسان العمر",
    members: [],
    nodes: buildHousing(1447, SPEC_1447, ["sc47-1", "sc47-2", "sc47-3", "sc47-4"], FIXED),
  },
  {
    id: "f48-housing",
    type: "makkah-housing",
    season: 1448,
    decisionNumber: "",
    startsOn: "2027-04-08",
    endsOn: "2027-05-31",
    startNote: "تصل طلائع البعثة قبل أول فوج بخمسة أيام لاستلام الفنادق وتجهيز الغرف.",
    reportCadence: "daily",
    status: "draft",
    createdAt: Date.UTC(2026, 8, 20, 11, 15),
    createdBy: "غسان العمر",
    members: [],
    nodes: buildHousing(1448, SPEC_1448, ["sc48-1", "sc48-2", "sc48-3", "sc48-4", "sc48-5"], FIXED),
  },
];

// ───────────────────────── Mina & Arafat: centres and camps ─────────────────────────

const COMPANIES = ["شركة ركب الحجيج", "شركة ضيوف البيت", "شركة أنوار المشاعر"];

type CampSpec = [number: number, capacity: number, location: string];
type CenterSpec = { no: number; camps: CampSpec[] };

const MINA_1448: CenterSpec[] = [
  {
    no: 10,
    camps: [
      [41, 520, "منى — المعيصم، المربع 6"],
      [42, 650, "منى — المعيصم، المربع 7"],
      [43, 480, "منى — المعيصم، المربع 7"],
    ],
  },
  {
    no: 11,
    camps: [
      [44, 450, "منى — شارع سوق العرب"],
      [45, 380, "منى — شارع سوق العرب"],
    ],
  },
  {
    no: 12,
    camps: [
      [46, 850, "منى — شارع الجوهرة"],
      [47, 420, "منى — شارع الجوهرة"],
      [48, 400, "منى — قرب جسر الجمرات"],
    ],
  },
  {
    no: 14,
    camps: [
      [51, 760, "منى — طريق الملك فهد"],
      [52, 460, "منى — طريق الملك فهد"],
    ],
  },
  {
    no: 15,
    camps: [
      [53, 560, "منى — شارع الملك عبد العزيز"],
      [54, 420, "منى — شارع الملك عبد العزيز"],
    ],
  },
  {
    no: 16,
    camps: [
      [55, 500, "منى — المنطقة الجنوبية"],
      [56, 440, "منى — المنطقة الجنوبية"],
    ],
  },
];
const MINA_1447: CenterSpec[] = [
  {
    no: 10,
    camps: [
      [41, 500, "منى — المعيصم، المربع 6"],
      [42, 650, "منى — المعيصم، المربع 7"],
      [43, 480, "منى — المعيصم، المربع 7"],
    ],
  },
  {
    no: 11,
    camps: [
      [44, 450, "منى — شارع سوق العرب"],
      [45, 380, "منى — شارع سوق العرب"],
    ],
  },
  {
    no: 12,
    camps: [
      [46, 820, "منى — شارع الجوهرة"],
      [47, 420, "منى — شارع الجوهرة"],
    ],
  },
  {
    no: 14,
    camps: [
      [49, 720, "منى — طريق الملك فهد"],
      [50, 520, "منى — طريق الملك فهد"],
    ],
  },
  {
    no: 15,
    camps: [
      [53, 540, "منى — شارع الملك عبد العزيز"],
      [54, 420, "منى — شارع الملك عبد العزيز"],
    ],
  },
];
const ARAFAT_1448: CenterSpec[] = [
  {
    no: 10,
    camps: [
      [110, 650, "عرفات — شرق مسجد نمرة"],
      [111, 480, "عرفات — شرق مسجد نمرة"],
    ],
  },
  {
    no: 11,
    camps: [
      [112, 450, "عرفات — الطريق 6"],
      [113, 380, "عرفات — الطريق 6"],
    ],
  },
  {
    no: 12,
    camps: [
      [114, 850, "عرفات — الطريق 8"],
      [115, 420, "عرفات — الطريق 8"],
      [116, 400, "عرفات — الطريق 9"],
    ],
  },
  {
    no: 14,
    camps: [
      [118, 760, "عرفات — قرب جبل الرحمة"],
      [119, 460, "عرفات — قرب جبل الرحمة"],
    ],
  },
  {
    no: 15,
    camps: [
      [120, 560, "عرفات — المربع 3"],
      [121, 420, "عرفات — المربع 3"],
    ],
  },
  {
    no: 16,
    camps: [
      [122, 500, "عرفات — المربع 5"],
      [123, 440, "عرفات — المربع 5"],
    ],
  },
];
const ARAFAT_1447: CenterSpec[] = [
  {
    no: 10,
    camps: [
      [110, 650, "عرفات — شرق مسجد نمرة"],
      [111, 480, "عرفات — شرق مسجد نمرة"],
    ],
  },
  {
    no: 11,
    camps: [
      [112, 450, "عرفات — الطريق 6"],
      [113, 380, "عرفات — الطريق 6"],
    ],
  },
  {
    no: 12,
    camps: [
      [114, 820, "عرفات — الطريق 8"],
      [115, 420, "عرفات — الطريق 8"],
    ],
  },
  {
    no: 14,
    camps: [
      [117, 720, "عرفات — قرب جبل الرحمة"],
      [118, 520, "عرفات — قرب جبل الرحمة"],
    ],
  },
  {
    no: 15,
    camps: [
      [120, 540, "عرفات — المربع 3"],
      [121, 420, "عرفات — المربع 3"],
    ],
  },
];

const LAYOUT: [season: number, mashaer: Mashaer, spec: CenterSpec[]][] = [
  [1447, "mina", MINA_1447],
  [1447, "arafat", ARAFAT_1447],
  [1448, "mina", MINA_1448],
  [1448, "arafat", ARAFAT_1448],
];

const centerId = (season: number, m: Mashaer, no: number) => `ce${season % 100}-${m}-${no}`;
const campId = (season: number, m: Mashaer, no: number) => `cp${season % 100}-${m}-${no}`;

export const CENTERS_SEED: Center[] = LAYOUT.flatMap(([season, mashaer, spec]) =>
  spec.map((c, i) => ({
    id: centerId(season, mashaer, c.no),
    season,
    name: `مركز ${c.no}`,
    mashaer,
    order: c.no,
    company: COMPANIES[i % COMPANIES.length],
  })),
);

export const CAMPS_SEED: Camp[] = LAYOUT.flatMap(([season, mashaer, spec]) =>
  spec.flatMap((c) =>
    c.camps.map(([no, capacity, location]) => ({
      id: campId(season, mashaer, no),
      season,
      number: String(no),
      mashaer,
      capacity,
      location,
    })),
  ),
);

/** Which cluster lives in which camp (the same camps in both seasons, where the camp still exists) */
const CLUSTER_CAMPS: Record<Mashaer, Record<number, [string, number]>> = {
  mina: {
    42: ["al-nour", 600],
    43: ["hawran", 450],
    44: ["al-safa", 400],
    45: ["bawabat-al-haramain", 300],
    46: ["al-yaqeen", 800],
    51: ["al-shahba", 700],
    53: ["al-asi", 500],
  },
  arafat: {
    110: ["al-nour", 600],
    111: ["hawran", 450],
    112: ["al-safa", 400],
    113: ["bawabat-al-haramain", 300],
    114: ["al-yaqeen", 800],
    118: ["al-shahba", 700],
    120: ["al-asi", 500],
  },
};

const BODIES: Record<number, string> = {
  42: "الإدارة الصحية — عيادة المخيم",
  46: "مكتب الإرشاد الديني",
  110: "الإدارة الصحية — عيادة المخيم",
  114: "أعضاء اللجنة الاعتبارية",
};

/**
 * Staffs a camps file: a supervisor for each centre (two for the centres with three camps), members in
 * every camp by its size, and — for Mina — the coaster team on the file. `emptyCenters` / `emptyCamps`
 * leave required posts vacant on purpose so the draft has something left to do.
 */
function buildCamps(season: number, mashaer: Mashaer, spec: CenterSpec[], opts: { emptyCenters?: number[]; emptyCamps?: number[]; coasters?: number }) {
  const rnd = seeded(`camps-${mashaer}-${season}`);
  const used = new Set<string>();
  const pool = EMPLOYEES_SEED.filter((e) => e.seasons.includes(season) && !e.suspended && !NAMED_IDS.has(e.id))
    .map((e) => ({ e, r: rnd() }))
    .sort((a, b) => a.r - b.r)
    .map((x) => x.e);
  const take = (want: (e: Employee) => boolean) => {
    const found = pool.find((e) => !used.has(e.id) && want(e)) ?? pool.find((e) => !used.has(e.id));
    if (!found) throw new Error("employee pool exhausted");
    used.add(found.id);
    return found.id;
  };
  const senior = (e: Employee) => e.kind === "permanent" && e.gender === "male" && e.mission === "البعثة الإدارية" && e.seasons.filter((y) => y < season).length >= 2;

  const nodes: OuterNode[] = spec.map((c) => {
    const members: Assignment[] = [];
    if (!opts.emptyCenters?.includes(c.no)) {
      members.push({ role: "center-supervisor", employeeId: take(senior) });
      if (c.camps.length >= 3) members.push({ role: "center-supervisor", employeeId: take(senior) });
    }
    const children: InnerNode[] = c.camps.map(([no, capacity], i) => {
      const [cluster, pilgrims] = CLUSTER_CAMPS[mashaer][no] ?? [undefined, Math.round((capacity * (0.75 + rnd() * 0.2)) / 10) * 10];
      const staff = opts.emptyCamps?.includes(no) ? 0 : capacity >= 700 ? 3 : 2;
      const cm: Assignment[] = [];
      for (let k = 0; k < staff; k++)
        cm.push({
          role: "camp-member",
          employeeId: take((e) => (k === 0 ? e.mission === "البعثة الإدارية" : k === 1 ? e.mission !== "البعثة الإدارية" : true)),
        });
      return {
        id: `n${season % 100}-${mashaer}-${no}`,
        refId: campId(season, mashaer, no),
        pilgrims,
        clusters: cluster ? [cluster] : [],
        tent: no === 42 ? "الخيمة 12 (نقطة التجمّع)" : `الخيمة ${10 + ((no * 7 + i) % 30)}`,
        bodies: BODIES[no],
        members: cm,
      };
    });
    return {
      id: `o${season % 100}-${mashaer}-${c.no}`,
      refId: centerId(season, mashaer, c.no),
      members,
      children,
    };
  });

  const members: Assignment[] = [];
  if (opts.coasters) {
    members.push({ role: "coaster-lead", employeeId: take(senior) });
    for (let k = 0; k < opts.coasters; k++)
      members.push({
        role: "coaster-member",
        employeeId: take((e) => e.jobTitle === "سائق" || e.jobTitle === "مسؤول لوجستي"),
      });
  }
  return { members, nodes };
}

function campFile(id: string, type: OpFile["type"], season: number, dates: [string, string], built: ReturnType<typeof buildCamps>, extra: Partial<OpFile>): OpFile {
  return {
    id,
    type,
    season,
    decisionNumber: "",
    startsOn: dates[0],
    endsOn: dates[1],
    reportCadence: "daily",
    status: "draft",
    createdAt: season === 1447 ? Date.UTC(2026, 3, 30, 9, 0) : Date.UTC(2026, 8, 22, 9, 0),
    createdBy: "غسان العمر",
    ...built,
    ...extra,
  };
}

const CAMP_FILES: OpFile[] = [
  campFile("f47-mina", "mina-camps", 1447, ["2026-05-23", "2026-05-30"], buildCamps(1447, "mina", MINA_1447, { coasters: 4 }), {
    decisionNumber: "3173",
    status: "active",
    activatedAt: Date.UTC(2026, 4, 10, 10, 0),
    activatedBy: "غسان العمر",
    startNote: "أُدير المركزان 10 و12 بمشرفَين لكل منهما لكثرة مخيماتهما.",
    endNote: "غادر آخر حاج منى في 13 ذو الحجة بعد رمي الجمرات.",
  }),
  campFile("f47-arafat", "arafat-camps", 1447, ["2026-05-24", "2026-05-26"], buildCamps(1447, "arafat", ARAFAT_1447, {}), {
    decisionNumber: "3172",
    status: "active",
    activatedAt: Date.UTC(2026, 4, 10, 10, 30),
    activatedBy: "غسان العمر",
    endNote: "اكتمل الدفع إلى مزدلفة بعد الغروب دون حالات تأخر.",
  }),
  campFile(
    "f48-mina",
    "mina-camps",
    1448,
    ["2027-05-12", "2027-05-19"],
    buildCamps(1448, "mina", MINA_1448, {
      coasters: 4,
      emptyCenters: [16],
      emptyCamps: [55, 56],
    }),
    {
      startNote: "المركز 16 جديد هذا الموسم، ولم يُسمَّ مشرفه بعد.",
    },
  ),
  campFile("f48-arafat", "arafat-camps", 1448, ["2027-05-13", "2027-05-15"], buildCamps(1448, "arafat", ARAFAT_1448, { emptyCamps: [123] }), {}),
];

/**
 * The people the demo names, in the camps: the tower supervisor of أبراج النور and the doctor go with
 * تكتل النور to its camps (42 in Mina, 110 in Arafat), the sector head supervises centre 10, and the
 * transport lead runs the coaster team. The doctor and the transport lead sign in to the demo and see
 * their posts on their own page.
 */
function place(file: OpFile, at: { center?: number; camp?: number; file?: true }, role: string, handle: string, replace = false) {
  const seat = { role, employeeId: byHandle(handle) };
  const put = (ms: Assignment[]) => {
    const last = ms.map((m) => m.role).lastIndexOf(role);
    return replace && last >= 0 ? ms.map((m, i) => (i === last ? seat : m)) : [...ms, seat];
  };
  const no = (refId: string) => Number(refId.split("-").pop());
  if (at.file) file.members = put(file.members);
  for (const o of file.nodes) {
    if (at.center !== undefined && no(o.refId) === at.center) o.members = put(o.members);
    for (const c of o.children) if (at.camp !== undefined && no(c.refId) === at.camp) c.members = put(c.members);
  }
}

for (const f of CAMP_FILES) {
  const camp = f.type === "mina-camps" ? 42 : 110;
  place(f, { camp }, "camp-member", "wissam");
  if (f.season === 1448) {
    place(f, { camp }, "camp-member", "layla");
    place(f, { center: 10 }, "center-supervisor", "nader", f.type === "mina-camps");
    if (f.type === "mina-camps") place(f, { file: true }, "coaster-lead", "bassel", true);
  }
}

export const FILES_SEED: OpFile[] = [...HOUSING_FILES, ...CAMP_FILES];
