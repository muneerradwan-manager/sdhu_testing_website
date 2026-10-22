import { useMemo } from "react";
import { requestNow } from "@/app/administrator/_lib/directory";
import { SEED_CLUSTERS, acceptedGroups, asGroup } from "@/app/administrator/_lib/cluster";
import { structureNow } from "@/app/administrator/_lib/structure";
import { CLUSTERS } from "./data/clusters";
import { groupName, groupShort } from "./groups";
import { SEASON } from "./season";
import { actions, getState, setState, useStore, type AdminProfile, type Application, type PostAcceptance } from "./store";
import { fullName, ageOf } from "./registry";
import { seeded } from "./utils";
import { EMPLOYEES_SEED } from "./data/employees-seed";
import { can } from "./permissions";
import { STAFF, withPermissions } from "./staff";

/**
 * ملف الطيران — flights for the employees and for the pilgrims.
 *
 * A flight goes one way (outbound or return) and is a resource with a capacity: some seats are kept for
 * the escorting employees, the rest are the pilgrims'. The flight officer (a staff member) creates the flights
 * (one way, or outbound and return together) and assigns the employees, and gives each cluster its days: the
 * flights its pilgrims travel on, each with the seats it holds there (an allotment). The cluster's head then
 * puts his groups on those flights — every member of a group travels on its flight, including families that
 * join it later — and adds pilgrims one by one for the rare one who travels apart from his group.
 * The outbound takes off from home (Damascus or Aleppo) to Makkah (Jeddah) or Madinah; the return lands where
 * the airport he took off from allows (`returnsTo`: Damascus or Aleppo, or Latakia). Outbound and return are
 * paired in the traveller's record, not in the flight, and every assign path checks the pair.
 * The design is in projects/docs/ملف-الطيران.
 */

export const FLIGHT_SEASON: number = SEASON.hijriYear;

// ───────────────────────── Types ─────────────────────────

export type Airport = {
  id: string;
  code: string;
  name: string;
  city: string;
  country: string;
  /** The holy city a Saudi airport serves: Jeddah's is Makkah */
  serves?: string;
  /** Where a return may land for those who took off from here (absent: here only) */
  returnsTo?: string[];
  /** Returns land here, no outbound takes off from it (Latakia) */
  arrivalsOnly?: boolean;
  archived?: boolean;
};
export type Carrier = { id: string; code: string; name: string; phone?: string; archived?: boolean };

export type Direction = "outbound" | "return";
/** A pilgrims' flight carries escorts in its staff reserve; a staff flight carries employees only */
export type Audience = "pilgrims" | "staff";
export type FlightStatus = "draft" | "published" | "full" | "locked" | "departed" | "arrived" | "postponed" | "cancelled";
export type GroundLeg = { kind: "bus"; from: string; to: string; buses: number; note?: string; at: number };

export type Flight = {
  id: string;
  season: number;
  direction: Direction;
  audience: Audience;
  flightNo: string;
  carrierId: string;
  fromId: string;
  toId: string;
  departAt: number;
  arriveAt: number;
  capacity: number;
  /** Seats kept for the escorting employees on a pilgrims' flight (0 on a staff flight: the whole plane is theirs) */
  staffReserve: number;
  status: FlightStatus;
  /** Where the flight actually lands after a diversion; the buses onward are in groundLegs */
  divertedToId?: string;
  groundLegs: GroundLeg[];
  /** The flight created with this one as its other half (outbound ↔ return); a default, never a constraint */
  pairedFlightId?: string;
  gate?: string;
  gathering?: string;
  notes?: string;
  createdBy: string;
  createdAt: number;
  publishedAt?: number;
  lockedAt?: number;
  departedAt?: number;
  arrivedAt?: number;
  postponedAt?: number;
  postponeReason?: string;
  /** The status the flight was in before it was postponed, restored when the new date is set */
  beforePostpone?: FlightStatus;
  cancelledAt?: number;
  cancelReason?: string;
  manifestVersion?: number;
};

export type TravelerKind = "pilgrim" | "administrator" | "employee";
export type AssignmentStatus = "assigned" | "locked" | "boarded" | "arrived" | "noShow" | "cancelled" | "moved";

export type FlightAssignment = {
  id: string;
  flightId: string;
  travelerKind: TravelerKind;
  travelerId: string;
  name: string;
  gender?: "M" | "F";
  age?: number;
  needs?: string[];
  /** Pilgrims and administrators: the family (application) and the group and cluster at the time of assignment */
  requestId?: string;
  groupNumber?: number;
  clusterId?: string;
  status: AssignmentStatus;
  seat?: string;
  assignedBy: string;
  assignedByRole: string;
  assignedAt: number;
  /** Set when the traveller moved to another flight: the id of the new assignment */
  movedTo?: string;
  reason?: string;
  boardedAt?: number;
  cancelledAt?: number;
};

export type ManifestRow = { name: string; travelerId: string; kind: TravelerKind; gender?: "M" | "F"; age?: number; groupNumber?: number; clusterId?: string; needs: string[]; seat?: string };
export type Manifest = {
  id: string;
  flightId: string;
  version: number;
  issuedAt: number;
  issuedBy: string;
  rows: ManifestRow[];
  exports: { to: "masar" | "carrier"; at: number; by: string }[];
};

/** A whole group placed on a flight by the officer; its members' seats are the assignments with its number */
export type GroupLeg = {
  id: string;
  flightId: string;
  clusterId: string;
  groupNumber: number;
  by: string;
  at: number;
  active: boolean;
  endedAt?: number;
  endReason?: string;
};

/**
 * A flight the officer gave a cluster: one of its days. `seats` is what the cluster holds on it; absent, the
 * whole flight is the cluster's. The cluster's head puts his groups and pilgrims on it, up to those seats.
 */
export type Allotment = { id: string; clusterId: string; flightId: string; seats?: number; by: string; at: number };

export type FlightsState = {
  airports?: Airport[];
  carriers?: Carrier[];
  flights?: Flight[];
  assignments?: FlightAssignment[];
  groups?: GroupLeg[];
  allotments?: Allotment[];
  manifests?: Manifest[];
  /** Travellers who go by other means, so they leave the "no flight" lists (and may take a return without an outbound) */
  otherMeans?: Record<string, { reason: string; at: number; by: string }>;
  /** Legacy: airport id -> its representative, before representing an airport became the `airport.*` permission for it (read nowhere) */
  reps?: Record<string, string>;
};

/** Anyone who can take a seat: a pilgrim from a family, a member of the group's team, or an employee */
export type Traveler = { id: string; name: string; kind: TravelerKind; gender?: "M" | "F"; age?: number; needs?: string[]; requestId?: string; groupNumber?: number; clusterId?: string };
export type Family = { id: string; applicant: string; real: boolean; members: Traveler[] };

export const ACTIVE: AssignmentStatus[] = ["assigned", "locked", "boarded", "arrived"];
export const isActive = (a: FlightAssignment) => ACTIVE.includes(a.status);

export const DIRECTION_LABEL: Record<Direction, string> = { outbound: "ذهاب", return: "عودة" };
export const AUDIENCE_LABEL: Record<Audience, string> = { pilgrims: "رحلة حجاج", staff: "رحلة موظفين" };
export const STATUS_LABEL: Record<FlightStatus, string> = {
  draft: "مسودة",
  published: "منشورة",
  full: "مكتملة",
  locked: "مقفلة",
  departed: "أقلعت",
  arrived: "وصلت",
  postponed: "مؤجلة",
  cancelled: "ملغاة",
};
export const ASSIGNMENT_LABEL: Record<AssignmentStatus, string> = {
  assigned: "مسند",
  locked: "مثبت",
  boarded: "صعد",
  arrived: "وصل",
  noShow: "تخلّف",
  cancelled: "ملغى",
  moved: "منقول",
};
export const KIND_LABEL: Record<TravelerKind, string> = { pilgrim: "حاج", administrator: "إداري", employee: "موظف" };

// ───────────────────────── Dates ─────────────────────────

const DAY = 86_400_000;
const HOUR = 3_600_000;
/** Damascus local time is UTC+3 in the travel months */
const TZ = "+03:00";
export const at = (iso: string, hhmm = "00:00") => new Date(`${iso}T${hhmm}:00${TZ}`).getTime();

export const fmtHijri = (ts: number) => new Intl.DateTimeFormat("ar-SY-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "long", year: "numeric" }).format(ts);
export const fmtHijriShort = (ts: number) => new Intl.DateTimeFormat("ar-SY-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "long" }).format(ts);
export const fmtGreg = (ts: number) => new Intl.DateTimeFormat("ar-SY-u-nu-latn", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(ts);
export const fmtGregShort = (ts: number) => new Intl.DateTimeFormat("ar-SY-u-nu-latn", { day: "numeric", month: "short" }).format(ts);
export const fmtClock = (ts: number) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Damascus" }).format(ts);
export const fmtDuration = (from: number, to: number) => {
  const m = Math.max(0, Math.round((to - from) / 60_000));
  return `${Math.floor(m / 60)}س ${m % 60 ? `${m % 60}د` : ""}`.trim();
};
/** yyyy-mm-dd and hh:mm in Damascus time, for <input type=date|time> */
export const isoDate = (ts: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Damascus", year: "numeric", month: "2-digit", day: "2-digit" }).format(ts);
export const isoTime = (ts: number) => fmtClock(ts);

// ───────────────────────── Seeds ─────────────────────────

export const AIRPORTS_SEED: Airport[] = [
  { id: "ap-dam", code: "DAM", name: "مطار دمشق الدولي", city: "دمشق", country: "سوريا", returnsTo: ["ap-dam", "ap-ltk"] },
  { id: "ap-alp", code: "ALP", name: "مطار حلب الدولي", city: "حلب", country: "سوريا", returnsTo: ["ap-alp", "ap-ltk"] },
  { id: "ap-ltk", code: "LTK", name: "مطار اللاذقية الدولي", city: "اللاذقية", country: "سوريا", arrivalsOnly: true },
  { id: "ap-ist", code: "IST", name: "مطار إسطنبول", city: "إسطنبول", country: "تركيا" },
  { id: "ap-gzt", code: "GZT", name: "مطار غازي عنتاب", city: "غازي عنتاب", country: "تركيا" },
  { id: "ap-cai", code: "CAI", name: "مطار القاهرة الدولي", city: "القاهرة", country: "مصر" },
  { id: "ap-jed", code: "JED", name: "مطار الملك عبد العزيز — صالة الحجاج", city: "جدة", country: "السعودية", serves: "مكة المكرمة" },
  { id: "ap-med", code: "MED", name: "مطار الأمير محمد بن عبد العزيز", city: "المدينة المنورة", country: "السعودية", serves: "المدينة المنورة" },
  { id: "ap-amm", code: "AMM", name: "مطار الملكة علياء الدولي", city: "عمّان", country: "الأردن" },
];

export const CARRIERS_SEED: Carrier[] = [
  { id: "ca-rb", code: "RB", name: "السورية للطيران", phone: "011 2240774" },
  { id: "ca-sv", code: "SV", name: "الخطوط السعودية", phone: "920022222" },
  { id: "ca-xy", code: "XY", name: "طيران ناس", phone: "920001234" },
];

const FLIGHT_SEED_AT = at("2027-04-08", "10:00");
const SEEDER = "هيثم زيدان";

type SeedFlight = Omit<Flight, "season" | "groundLegs" | "createdBy" | "createdAt" | "status"> & { status?: FlightStatus };
const sf = (f: SeedFlight): Flight => ({
  season: FLIGHT_SEASON,
  groundLegs: [],
  createdBy: SEEDER,
  createdAt: FLIGHT_SEED_AT,
  status: "published",
  publishedAt: FLIGHT_SEED_AT + HOUR,
  ...f,
});

/**
 * Season 1448 in the pattern of 1447: departures over two weeks from Damascus and Aleppo (and one from
 * Istanbul) to Jeddah for Makkah, and some to Madinah; returns three weeks later from Madinah, or from Jeddah for
 * those who began in Madinah, to the city they left — and one to Latakia. Each outbound is created with its return.
 */
export const FLIGHTS_SEED: Flight[] = [
  // ── advance party of the mission (staff only)
  sf({ id: "f48-s01", pairedFlightId: "f48-s02", direction: "outbound", audience: "staff", flightNo: "RB 401", carrierId: "ca-rb", fromId: "ap-dam", toId: "ap-jed", departAt: at("2027-04-22", "09:00"), arriveAt: at("2027-04-22", "11:30"), capacity: 60, staffReserve: 0, gate: "البوابة 1", gathering: "مبنى الإدارة — 05:30", notes: "طليعة البعثة: فرق الإسكان والمخيمات" }),
  // ── outbound, Damascus → Jeddah
  sf({ id: "f48-01", direction: "outbound", audience: "pilgrims", flightNo: "RB 501", carrierId: "ca-rb", fromId: "ap-dam", toId: "ap-jed", departAt: at("2027-04-24", "06:00"), arriveAt: at("2027-04-24", "08:30"), capacity: 340, staffReserve: 10, gate: "البوابة 3", gathering: "ساحة المزة — الحافلات 01:30", pairedFlightId: "f48-r01" }),
  sf({ id: "f48-02", direction: "outbound", audience: "pilgrims", flightNo: "SV 3421", carrierId: "ca-sv", fromId: "ap-dam", toId: "ap-jed", departAt: at("2027-04-25", "07:30"), arriveAt: at("2027-04-25", "10:00"), capacity: 300, staffReserve: 8, gate: "البوابة 2", gathering: "ساحة المزة — الحافلات 03:00", pairedFlightId: "f48-r02" }),
  sf({ id: "f48-03", direction: "outbound", audience: "pilgrims", flightNo: "XY 2210", carrierId: "ca-xy", fromId: "ap-dam", toId: "ap-jed", departAt: at("2027-04-27", "05:45"), arriveAt: at("2027-04-27", "08:15"), capacity: 186, staffReserve: 6, gate: "البوابة 4", gathering: "ساحة المزة — الحافلات 01:15", pairedFlightId: "f48-r03" }),
  sf({ id: "f48-07", direction: "outbound", audience: "pilgrims", flightNo: "RB 507", carrierId: "ca-rb", fromId: "ap-dam", toId: "ap-jed", departAt: at("2027-05-01", "06:00"), arriveAt: at("2027-05-01", "08:30"), capacity: 340, staffReserve: 10, gate: "البوابة 3", gathering: "ساحة المزة — الحافلات 01:30", pairedFlightId: "f48-r07" }),
  sf({ id: "f48-08", direction: "outbound", audience: "pilgrims", flightNo: "SV 3427", carrierId: "ca-sv", fromId: "ap-dam", toId: "ap-jed", departAt: at("2027-05-02", "08:00"), arriveAt: at("2027-05-02", "10:30"), capacity: 300, staffReserve: 8, gate: "البوابة 2", gathering: "ساحة المزة — الحافلات 03:30", pairedFlightId: "f48-r08" }),
  sf({ id: "f48-09", pairedFlightId: "f48-r09", direction: "outbound", audience: "pilgrims", flightNo: "RB 511", carrierId: "ca-rb", fromId: "ap-dam", toId: "ap-jed", departAt: at("2027-05-06", "06:00"), arriveAt: at("2027-05-06", "08:30"), capacity: 340, staffReserve: 10, gate: "البوابة 3", gathering: "ساحة المزة — الحافلات 01:30", notes: "لاستكمال النقص وإعادة الإسناد" }),
  // ── outbound, Aleppo → Jeddah
  sf({ id: "f48-04", direction: "outbound", audience: "pilgrims", flightNo: "RB 521", carrierId: "ca-rb", fromId: "ap-alp", toId: "ap-jed", departAt: at("2027-04-26", "06:30"), arriveAt: at("2027-04-26", "09:00"), capacity: 300, staffReserve: 8, gate: "البوابة 1", gathering: "ساحة الجامعة — الحافلات 02:00", pairedFlightId: "f48-r04" }),
  sf({ id: "f48-05", direction: "outbound", audience: "pilgrims", flightNo: "XY 2214", carrierId: "ca-xy", fromId: "ap-alp", toId: "ap-jed", departAt: at("2027-04-29", "07:00"), arriveAt: at("2027-04-29", "09:30"), capacity: 186, staffReserve: 6, gate: "البوابة 2", gathering: "ساحة الجامعة — الحافلات 02:30", pairedFlightId: "f48-r05" }),
  // ── outbound to Madinah: these pilgrims begin with the Prophet's city, and return from Jeddah
  sf({ id: "f48-11", pairedFlightId: "f48-r11", direction: "outbound", audience: "pilgrims", flightNo: "RB 515", carrierId: "ca-rb", fromId: "ap-dam", toId: "ap-med", departAt: at("2027-05-03", "07:00"), arriveAt: at("2027-05-03", "09:40"), capacity: 186, staffReserve: 6, gate: "البوابة 4", gathering: "ساحة المزة — الحافلات 02:30" }),
  sf({ id: "f48-12", pairedFlightId: "f48-r12", direction: "outbound", audience: "pilgrims", flightNo: "XY 2218", carrierId: "ca-xy", fromId: "ap-alp", toId: "ap-med", departAt: at("2027-04-28", "06:30"), arriveAt: at("2027-04-28", "09:20"), capacity: 186, staffReserve: 6, gate: "البوابة 2", gathering: "ساحة الجامعة — الحافلات 02:00" }),
  // ── outbound, Istanbul → Jeddah
  sf({ id: "f48-06", direction: "outbound", audience: "pilgrims", flightNo: "SV 3501", carrierId: "ca-sv", fromId: "ap-ist", toId: "ap-jed", departAt: at("2027-04-30", "10:00"), arriveAt: at("2027-04-30", "14:00"), capacity: 280, staffReserve: 6, gate: "البوابة D4", gathering: "مكتب تركيا — 06:00", notes: "للمقيمين في تركيا" }),
  // ── return, Madinah → Damascus / Aleppo
  sf({ id: "f48-r01", direction: "return", audience: "pilgrims", flightNo: "RB 502", carrierId: "ca-rb", fromId: "ap-med", toId: "ap-dam", departAt: at("2027-05-22", "13:00"), arriveAt: at("2027-05-22", "16:10"), capacity: 340, staffReserve: 10, gate: "صالة الحجاج", gathering: "بهو الفندق — 08:00" , pairedFlightId: "f48-01"}),
  sf({ id: "f48-r02", direction: "return", audience: "pilgrims", flightNo: "SV 3422", carrierId: "ca-sv", fromId: "ap-med", toId: "ap-dam", departAt: at("2027-05-23", "15:00"), arriveAt: at("2027-05-23", "18:10"), capacity: 300, staffReserve: 8, gate: "صالة الحجاج", gathering: "بهو الفندق — 10:00" , pairedFlightId: "f48-02"}),
  sf({ id: "f48-r03", direction: "return", audience: "pilgrims", flightNo: "XY 2211", carrierId: "ca-xy", fromId: "ap-med", toId: "ap-dam", departAt: at("2027-05-25", "12:30"), arriveAt: at("2027-05-25", "15:40"), capacity: 186, staffReserve: 6, gate: "صالة الحجاج", gathering: "بهو الفندق — 07:30" , pairedFlightId: "f48-03"}),
  sf({ id: "f48-r07", direction: "return", audience: "pilgrims", flightNo: "RB 508", carrierId: "ca-rb", fromId: "ap-med", toId: "ap-dam", departAt: at("2027-05-29", "14:00"), arriveAt: at("2027-05-29", "17:10"), capacity: 340, staffReserve: 10, gate: "صالة الحجاج", gathering: "بهو فندق روضة طيبة 08:00 — تسليم الغرف بمسح البطاقة" , pairedFlightId: "f48-07"}),
  sf({ id: "f48-r08", direction: "return", audience: "pilgrims", flightNo: "SV 3428", carrierId: "ca-sv", fromId: "ap-med", toId: "ap-dam", departAt: at("2027-05-30", "16:00"), arriveAt: at("2027-05-30", "19:10"), capacity: 300, staffReserve: 8, gate: "صالة الحجاج", gathering: "بهو الفندق — 11:00" , pairedFlightId: "f48-08"}),
  sf({ id: "f48-r04", direction: "return", audience: "pilgrims", flightNo: "RB 522", carrierId: "ca-rb", fromId: "ap-med", toId: "ap-alp", departAt: at("2027-05-24", "13:30"), arriveAt: at("2027-05-24", "16:50"), capacity: 300, staffReserve: 8, gate: "صالة الحجاج", gathering: "بهو الفندق — 08:30" , pairedFlightId: "f48-04"}),
  sf({ id: "f48-r05", direction: "return", audience: "pilgrims", flightNo: "XY 2215", carrierId: "ca-xy", fromId: "ap-med", toId: "ap-alp", departAt: at("2027-05-27", "12:00"), arriveAt: at("2027-05-27", "15:20"), capacity: 186, staffReserve: 6, gate: "صالة الحجاج", gathering: "بهو الفندق — 07:00" , pairedFlightId: "f48-05"}),
  // ── return, Jeddah → Damascus / Aleppo (for those who began in Madinah), and Madinah → Latakia
  sf({ id: "f48-r11", pairedFlightId: "f48-11", direction: "return", audience: "pilgrims", flightNo: "RB 516", carrierId: "ca-rb", fromId: "ap-jed", toId: "ap-dam", departAt: at("2027-05-31", "13:00"), arriveAt: at("2027-05-31", "15:50"), capacity: 186, staffReserve: 6, gate: "صالة الحجاج", gathering: "بهو الفندق في مكة — 06:00" }),
  sf({ id: "f48-r12", pairedFlightId: "f48-12", direction: "return", audience: "pilgrims", flightNo: "XY 2219", carrierId: "ca-xy", fromId: "ap-jed", toId: "ap-alp", departAt: at("2027-05-26", "12:00"), arriveAt: at("2027-05-26", "15:00"), capacity: 186, staffReserve: 6, gate: "صالة الحجاج", gathering: "بهو الفندق في مكة — 05:30" }),
  sf({ id: "f48-r13", direction: "return", audience: "pilgrims", flightNo: "RB 538", carrierId: "ca-rb", fromId: "ap-med", toId: "ap-ltk", departAt: at("2027-05-29", "16:00"), arriveAt: at("2027-05-29", "19:00"), capacity: 186, staffReserve: 6, gate: "صالة الحجاج", gathering: "بهو الفندق — 10:00", notes: "عودة لأهل الساحل ممن أقلعوا من دمشق أو حلب" }),
  sf({ id: "f48-r09", pairedFlightId: "f48-09", direction: "return", audience: "pilgrims", flightNo: "RB 512", carrierId: "ca-rb", fromId: "ap-med", toId: "ap-dam", departAt: at("2027-06-03", "14:00"), arriveAt: at("2027-06-03", "17:10"), capacity: 340, staffReserve: 10, gate: "صالة الحجاج", gathering: "بهو الفندق — 09:00", notes: "آخر رحلات العودة" }),
  // ── a draft the officer has not published yet
  sf({ id: "f48-10", direction: "outbound", audience: "pilgrims", flightNo: "RB 531", carrierId: "ca-rb", fromId: "ap-gzt", toId: "ap-jed", departAt: at("2027-05-03", "11:00"), arriveAt: at("2027-05-03", "14:30"), capacity: 180, staffReserve: 4, status: "draft", publishedAt: undefined, notes: "للمقيمين في جنوب تركيا — بانتظار تأكيد الناقل" }),
  // ── rear party (staff only)
  sf({ id: "f48-s02", pairedFlightId: "f48-s01", direction: "return", audience: "staff", flightNo: "RB 402", carrierId: "ca-rb", fromId: "ap-med", toId: "ap-dam", departAt: at("2027-06-06", "10:00"), arriveAt: at("2027-06-06", "13:10"), capacity: 60, staffReserve: 0, gate: "صالة الحجاج", gathering: "بهو الفندق — 06:00", notes: "الفريق المتأخر: غرفة العمليات والمواصلات" }),
];

// ───────────────────────── Groups and families ─────────────────────────

/** `headId`: its head's id in the cluster's request, when the request names him */
export type GroupRef = { clusterId: string; clusterName: string; number: number; head: string; headId?: string; pilgrims: number; capacity: number };

export function clusterName(clusterId: string) {
  return CLUSTERS.find((c) => c.slug === clusterId)?.name ?? requestNow(clusterId)?.cluster.name ?? clusterId;
}

/**
 * A cluster's groups as its approved request in the administrators' platform holds them (the head's own first):
 * their heads, their pilgrims and their capacity under the cluster's tier — the same groups as the services
 * directory and the administrators' screens. A cluster whose request is not approved has no group on a flight.
 */
export function groupsOfCluster(clusterId: string): GroupRef[] {
  const r = requestNow(clusterId);
  if (r?.cluster.status !== "approved") return [];
  const s = structureNow();
  const name = clusterName(clusterId);
  return acceptedGroups(r.cluster)
    .map((g) => asGroup(s, r.cluster, g, g.number === r.headGroup))
    .sort((a, b) => Number(b.own) - Number(a.own))
    .map((g) => ({ clusterId, clusterName: name, number: g.number, head: g.head, headId: g.headId, pilgrims: g.pilgrims, capacity: g.capacity }));
}

/** Every cluster the office formed (its request approved), on this device or in the season's seed */
export function allClusterIds(): string[] {
  const { admins, formation } = getState();
  const ids = [...Object.values(admins).flatMap((a) => (a.cluster ? [a.cluster.id] : [])), ...SEED_CLUSTERS.map((x) => x.cluster.id), ...formation.created.map((x) => x.cluster.id)];
  return [...new Set(ids)].filter((id) => requestNow(id)?.cluster.status === "approved");
}
/** Two digits for a cluster in the generated pilgrims' ids: the directory's order, or a stable number past it */
const clusterDigits = (clusterId: string) => {
  const i = CLUSTERS.findIndex((c) => c.slug === clusterId);
  if (i >= 0) return String(i).padStart(2, "0");
  let h = 0;
  for (const ch of clusterId) h = (h * 31 + ch.charCodeAt(0)) % 89;
  return String(10 + h);
};
export const allGroups = () => allClusterIds().flatMap(groupsOfCluster);

const MEN = ["خالد", "بلال", "أنس", "طارق", "مصطفى", "إبراهيم", "علي", "نزار", "وائل", "هشام", "زياد", "عماد", "فراس", "ماهر", "عدنان", "رياض", "محمود", "سامر", "أحمد", "يوسف"];
const WOMEN = ["سلمى", "رغد", "نور", "ميساء", "لبنى", "دعاء", "سمر", "إيمان", "هالة", "بشرى", "وفاء", "منى", "ريم", "سوسن", "فاطمة", "خديجة", "عائشة", "مريم"];
const LASTS = ["الأحمد", "الحموي", "الدمشقي", "السعدي", "العلي", "الحسين", "الشيخ", "الإدلبي", "الحوراني", "المصري", "القباني", "الطباع", "الخياط", "النحاس", "الحلبي", "الشامي"];

/**
 * The families of a group: the real ones the coordinator enrolled (by application), then stable generated
 * ones up to the group's size. Every generated member has an 11-digit id of its own so it can be assigned,
 * boarded and listed like a real pilgrim.
 */
export function familiesOfGroup(g: GroupRef, post: Record<string, PostAcceptance>, applications: Record<string, Application>): Family[] {
  const out: Family[] = [];
  let count = 0;
  for (const [sid, p] of Object.entries(post)) {
    if (p.groupNumber !== g.number || p.clusterId !== g.clusterId || !p.groupApprovedAt || !applications[sid]) continue;
    const app = applications[sid];
    const applicant = app.members.find((m) => m.relation === "self")?.person ?? app.members[0]?.person;
    out.push({
      id: sid,
      real: true,
      applicant: applicant ? fullName(applicant) : sid,
      members: app.members.map((m) => ({ id: m.person.id, name: fullName(m.person), kind: "pilgrim", gender: m.person.gender, age: ageOf(m.person), needs: m.needs, requestId: sid, groupNumber: g.number, clusterId: g.clusterId })),
    });
    count += app.members.length;
  }
  const rnd = seeded(`flights-${g.clusterId}-${g.number}`);
  let i = 0;
  while (count < g.pilgrims) {
    const size = Math.min(g.pilgrims - count, 1 + Math.floor(rnd() * 4));
    const last = LASTS[Math.floor(rnd() * LASTS.length)];
    const fid = `fam-${g.clusterId}-${g.number}-${i}`;
    const members: Traveler[] = [];
    for (let j = 0; j < size; j++) {
      const woman = j === 0 ? rnd() < 0.35 : rnd() < 0.5;
      const first = woman ? WOMEN[Math.floor(rnd() * WOMEN.length)] : MEN[Math.floor(rnd() * MEN.length)];
      const age = j === 0 ? 58 + Math.floor(rnd() * 18) : 22 + Math.floor(rnd() * 40);
      const needs = age >= 72 ? ["مرافقة كبير سن"] : rnd() < 0.08 ? ["كرسي متحرك"] : rnd() < 0.15 ? ["سكري"] : [];
      // cluster + group + family + member: the same group number exists in more than one cluster
      const id = `02${clusterDigits(g.clusterId)}${String(g.number).padStart(3, "0")}${String(i).padStart(2, "0")}${String(j).padStart(2, "0")}`;
      members.push({ id, name: `${first} ${last}`, kind: "pilgrim", gender: woman ? "F" : "M", age, needs, requestId: fid, groupNumber: g.number, clusterId: g.clusterId });
    }
    out.push({ id: fid, real: false, applicant: members[0].name, members });
    count += size;
    i++;
  }
  return out;
}

/** The group's team travels with it: its head, the people in its seats and its coordinator, counted as escorts on the flight */
export function teamOfGroup(g: GroupRef, admins: Record<string, AdminProfile>): Traveler[] {
  const base = (id: string, name: string): Traveler => ({ id, name, kind: "administrator", gender: "M", needs: [], requestId: `team-${g.clusterId}-${g.number}`, groupNumber: g.number, clusterId: g.clusterId });
  // the demo group: the four administrators of the guide
  if (g.clusterId === "al-nour" && g.number === 27) {
    return [base("01033300871", "أحمد سليمان الحمصي"), base("01033300872", "ياسر عبد الله"), base("01033300873", "الشيخ خالد الرفاعي"), base("01033300874", "سامر نبيل نجار")];
  }
  // its head, and the team its cluster's head assigned to it: from a cluster formed live, else the cluster's request
  const head = Object.entries(admins).find(([, p]) => p.group?.number === g.number);
  const cluster =
    Object.values(admins).find((p) => p.cluster && Object.values(p.cluster.groups).some((x) => x.number === g.number && x.status === "accepted"))?.cluster ??
    (() => {
      const c = requestNow(g.clusterId)?.cluster;
      return c && Object.values(c.groups).some((x) => x.number === g.number && x.status === "accepted") ? c : undefined;
    })();
  if (head || cluster) {
    // The people in its seats, and the coordinator its cluster's head sorted to it
    const team = cluster
      ? [
          ...(cluster.seats[g.number] ?? []).flatMap((x) => (x.who?.status === "accepted" ? [base(x.who.id, x.who.name)] : [])),
          ...cluster.coordinators.filter((m) => m.status === "accepted" && m.id === cluster.sorting[g.number]).map((m) => base(m.id, m.name)),
        ]
      : [];
    return [base(head?.[0] ?? g.headId ?? `adm-${g.clusterId}-${g.number}-h`, g.head), ...team];
  }
  // a group no request holds (a cluster the content team added): a stable generated team, the same whoever is signed in
  const rnd = seeded(`team-${g.clusterId}-${g.number}`);
  const pick = () => `${MEN[Math.floor(rnd() * MEN.length)]} ${LASTS[Math.floor(rnd() * LASTS.length)]}`;
  return [base(`adm-${g.clusterId}-${g.number}-h`, g.head), base(`adm-${g.clusterId}-${g.number}-d`, pick()), base(`adm-${g.clusterId}-${g.number}-g`, pick()), base(`adm-${g.clusterId}-${g.number}-t`, pick())];
}

/** Everyone registered in a group now: its families, then its team */
export function membersOfGroup(g: GroupRef, post: Record<string, PostAcceptance>, applications: Record<string, Application>, admins: Record<string, AdminProfile>): Traveler[] {
  return [...familiesOfGroup(g, post, applications).flatMap((f) => f.members), ...teamOfGroup(g, admins)];
}

// ───────────────────────── Seed assignments ─────────────────────────

const SEED_ROLE = "فريق المواصلات";

function seatsFor(flight: Flight, travelers: Traveler[], atTs: number, by = SEEDER, byRole = SEED_ROLE): FlightAssignment[] {
  return travelers.map((t, i) => ({
    id: `sa-${flight.id}-${t.id}`,
    flightId: flight.id,
    travelerKind: t.kind,
    travelerId: t.id,
    name: t.name,
    gender: t.gender,
    age: t.age,
    needs: t.needs ?? [],
    requestId: t.requestId,
    groupNumber: t.groupNumber,
    clusterId: t.clusterId,
    status: "assigned",
    assignedBy: by,
    assignedByRole: byRole,
    assignedAt: atTs + i,
  }));
}

/**
 * The days the officer gave the clusters: whole flights, and two shared by several clusters, each its seats (SV 3427
 * and its return, and Latakia's return). The makeup RB 511 and its return are given to no one yet, nor are the
 * clusters without days: the demo's work (the staff guide gives them to سهل حوران).
 */
const SEED_ALLOT: { clusterId: string; flightId: string; seats?: number }[] = [
  { clusterId: "al-nour", flightId: "f48-07" },
  { clusterId: "al-nour", flightId: "f48-11" },
  { clusterId: "al-nour", flightId: "f48-r07" },
  { clusterId: "al-nour", flightId: "f48-r11" },
  { clusterId: "al-nour", flightId: "f48-r13", seats: 60 },
  { clusterId: "al-safa", flightId: "f48-01" },
  { clusterId: "al-safa", flightId: "f48-r01" },
  { clusterId: "al-yaqeen", flightId: "f48-02" },
  { clusterId: "al-yaqeen", flightId: "f48-r02" },
  { clusterId: "bawabat-al-haramain", flightId: "f48-03" },
  { clusterId: "bawabat-al-haramain", flightId: "f48-r03" },
  { clusterId: "al-shahba", flightId: "f48-04" },
  { clusterId: "al-shahba", flightId: "f48-r04" },
  { clusterId: "al-asi", flightId: "f48-05" },
  { clusterId: "al-asi", flightId: "f48-r05" },
  { clusterId: "ibn-al-walid", flightId: "f48-12" },
  { clusterId: "ibn-al-walid", flightId: "f48-r12" },
  { clusterId: "ibn-al-walid", flightId: "f48-r13", seats: 60 },
  { clusterId: "al-yasmin", flightId: "f48-08", seats: 150 },
  { clusterId: "al-yasmin", flightId: "f48-r08", seats: 150 },
  { clusterId: "al-bayan", flightId: "f48-08", seats: 142 },
  { clusterId: "al-bayan", flightId: "f48-r08", seats: 142 },
  { clusterId: "al-bayan", flightId: "f48-r13", seats: 50 },
];
export const ALLOTMENTS_SEED: Allotment[] = SEED_ALLOT.map((x, i) => ({ id: `al-${x.clusterId}-${x.flightId}`, ...x, by: SEEDER, at: FLIGHT_SEED_AT + DAY + i }));

/** Groups the demo starts with on their flights: their clusters' heads put them there (the rest are the demo's work) */
/** «first2»: its first two groups that fit the flight, the head's own first */
const SEED_PLAN: { clusterId: string; groups: number[] | "first2"; out: string; back: string }[] = [
  { clusterId: "al-nour", groups: [31, 18, 33], out: "f48-07", back: "f48-r07" },
  { clusterId: "al-safa", groups: "first2", out: "f48-01", back: "f48-r01" },
  { clusterId: "al-yaqeen", groups: "first2", out: "f48-02", back: "f48-r02" },
  { clusterId: "al-shahba", groups: "first2", out: "f48-04", back: "f48-r04" },
  { clusterId: "al-asi", groups: "first2", out: "f48-05", back: "f48-r05" },
  { clusterId: "bawabat-al-haramain", groups: "first2", out: "f48-03", back: "f48-r03" },
];

/** wissam, nader, ghassan, layla, samira and a dozen housing/camp members go ahead; fadi and haitham fly back last */
const ADVANCE_PARTY = ["E-018", "E-019", "E-021", "E-006", "E-017", "E-030", "E-031", "E-032", "E-033", "E-034", "E-035", "E-036", "E-037", "E-038"];
const REAR_PARTY = ["E-005", "E-007"];

let seedCache: { assignments: FlightAssignment[]; groups: GroupLeg[] } | null = null;
function seeds() {
  if (seedCache) return seedCache;
  const assignments: FlightAssignment[] = [];
  const groups: GroupLeg[] = [];
  const t0 = at("2027-04-10", "09:00");
  const byId = (id: string) => FLIGHTS_SEED.find((f) => f.id === id)!;
  for (const plan of SEED_PLAN) {
    const head = requestNow(plan.clusterId)?.headName ?? SEEDER;
    const role = `رئيس ${clusterName(plan.clusterId)}`;
    const all = groupsOfCluster(plan.clusterId).map((g) => ({ g, travelers: [...familiesOfGroup(g, {}, {}).flatMap((f) => f.members), ...teamOfGroup(g, {})] }));
    let room = Math.min(...[plan.out, plan.back].map((fid) => byId(fid).capacity - byId(fid).staffReserve));
    const chosen: typeof all = [];
    if (plan.groups === "first2") {
      for (const x of all) {
        if (chosen.length === 2) break;
        if (x.travelers.length > room) continue;
        chosen.push(x);
        room -= x.travelers.length;
      }
    } else chosen.push(...all.filter((x) => (plan.groups as number[]).includes(x.g.number)));
    chosen.forEach(({ g, travelers }, gi) => {
      for (const [fid, dt] of [[plan.out, 0], [plan.back, 10 * 60_000]] as const) {
        const when = t0 + gi * HOUR + dt;
        assignments.push(...seatsFor(byId(fid), travelers, when, head, role));
        groups.push({ id: `sg-${fid}-${g.clusterId}-${g.number}`, flightId: fid, clusterId: g.clusterId, groupNumber: g.number, by: head, at: when, active: true });
      }
    });
  }
  const empName = (id: string) => {
    const e = EMPLOYEES_SEED.find((x) => x.id === id);
    return e ? `${e.firstName} ${e.surname}` : id;
  };
  const emp = (ids: string[], fid: string): FlightAssignment[] =>
    ids.map((id, i) => ({ id: `sa-${fid}-${id}`, flightId: fid, travelerKind: "employee", travelerId: id, name: empName(id), status: "assigned", assignedBy: SEEDER, assignedByRole: SEED_ROLE, assignedAt: t0 - DAY + i }));
  assignments.push(...emp(ADVANCE_PARTY, "f48-s01"), ...emp(REAR_PARTY, "f48-s02"));
  seedCache = { assignments, groups };
  return seedCache;
}
export const assignmentsSeed = () => seeds().assignments;
export const groupLegsSeed = () => seeds().groups;

// ───────────────────────── Store access ─────────────────────────

const EMPTY_MANIFESTS: Manifest[] = [];
const EMPTY_OTHER: Record<string, { reason: string; at: number; by: string }> = {};
export const useAirports = () => useStore((s) => s.flights.airports) ?? AIRPORTS_SEED;
export const useCarriers = () => useStore((s) => s.flights.carriers) ?? CARRIERS_SEED;
export const useFlights = () => useStore((s) => s.flights.flights) ?? FLIGHTS_SEED;
export const useAssignments = () => useStore((s) => s.flights.assignments) ?? assignmentsSeed();
export const useGroupLegs = () => useStore((s) => s.flights.groups) ?? groupLegsSeed();
export const useAllotments = () => useStore((s) => s.flights.allotments) ?? ALLOTMENTS_SEED;
export const useManifests = () => useStore((s) => s.flights.manifests) ?? EMPTY_MANIFESTS;
export const useOtherMeans = () => useStore((s) => s.flights.otherMeans) ?? EMPTY_OTHER;

/**
 * Each airport's representative: whoever holds «رحلات المطار» (`airport.flights.GET`) for it. He records the
 * take-offs from his airport (who boarded, who did not) and the landings at it. Nobody assigns him on the
 * airports' screen any more: the permission is granted at «صلاحيات الموظفين» for that airport.
 */
export function useAirportReps() {
  const stored = useStore((s) => s.staffPermissions);
  const airports = useAirports();
  return useMemo(() => {
    const accounts = STAFF.map((u) => withPermissions(u, stored));
    const repsOf = (airportId: string) => accounts.filter((u) => can(u, "airport.flights.GET", airportId));
    /** airport id -> its first representative, for the screens that name one */
    const reps: Record<string, string> = Object.fromEntries(airports.flatMap((a) => repsOf(a.id).slice(0, 1).map((u) => [a.id, u.id])));
    return {
      reps,
      repsOf,
      airportsOf: (staffId: string) => {
        const u = accounts.find((a) => a.id === staffId);
        return u?.grants.some((g) => g.key === "airport.flights.GET") ? airports.filter((a) => can(u, "airport.flights.GET", a.id)).map((a) => a.id) : [];
      },
    };
  }, [stored, airports]);
}

/** Everything a flights page needs, memoised as one object */
export function useFlightsData() {
  const airports = useAirports();
  const carriers = useCarriers();
  const flights = useFlights();
  const assignments = useAssignments();
  const groups = useGroupLegs();
  const allotments = useAllotments();
  const manifests = useManifests();
  const otherMeans = useOtherMeans();
  return useMemo(() => ({ airports, carriers, flights, assignments, groups, allotments, manifests, otherMeans }), [airports, carriers, flights, assignments, groups, allotments, manifests, otherMeans]);
}
export type FlightsData = ReturnType<typeof useFlightsData>;

function current(s: { flights: FlightsState }) {
  return {
    airports: s.flights.airports ?? AIRPORTS_SEED,
    carriers: s.flights.carriers ?? CARRIERS_SEED,
    flights: s.flights.flights ?? FLIGHTS_SEED,
    assignments: s.flights.assignments ?? assignmentsSeed(),
    groups: s.flights.groups ?? groupLegsSeed(),
    allotments: s.flights.allotments ?? ALLOTMENTS_SEED,
    manifests: s.flights.manifests ?? [],
    otherMeans: s.flights.otherMeans ?? {},
  };
}

type Full = ReturnType<typeof current>;

/**
 * Side effects that write to other store slices (the audit log, operations tickets) must not run inside the
 * flights update: the outer setState would overwrite what they wrote. They wait here until it is written.
 */
let depth = 0;
const afterPatch: (() => void)[] = [];
const later = (fn: () => void) => (depth ? afterPatch.push(fn) : fn());

function patch(fn: (d: Full) => Partial<Full>) {
  depth++;
  try {
    setState((s) => ({ ...s, flights: { ...current(s), ...fn(current(s)) } }));
  } finally {
    depth--;
  }
  if (!depth) afterPatch.splice(0).forEach((f) => f());
}
const upsert = <T extends { id: string }>(list: T[], item: T) => (list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]);
export const newFlightId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export const airportOf = (d: Pick<FlightsData, "airports">, id: string | undefined) => d.airports.find((a) => a.id === id);
export const carrierOf = (d: Pick<FlightsData, "carriers">, id: string | undefined) => d.carriers.find((c) => c.id === id);
export const routeLabel = (d: Pick<FlightsData, "airports">, f: Flight) => `${airportOf(d, f.fromId)?.city ?? "?"} ← ${airportOf(d, f.divertedToId ?? f.toId)?.city ?? "?"}`;

/** The Saudi airports: where an outbound of pilgrims lands and their return takes off */
export const isHoly = (a: Airport | undefined) => a?.country === "السعودية";
/** An airport as the pilgrims know it: Jeddah is «جدة (مكة المكرمة)» */
export const placeOf = (a: Airport | undefined) => (!a ? "?" : a.serves && a.serves !== a.city ? `${a.city} (${a.serves})` : a.city);
/** A flight's route for the pilgrims, by the holy city it goes to or comes from */
export const tripLabel = (d: Pick<FlightsData, "airports">, f: Flight) => `${placeOf(airportOf(d, f.fromId))} ← ${placeOf(airportOf(d, f.divertedToId ?? f.toId))}`;

/** Where a return may land for someone whose outbound took off from `fromId` */
export function returnAirportsFor(d: Pick<FlightsData, "airports">, fromId: string): string[] {
  const a = airportOf(d, fromId);
  return a?.returnsTo?.length ? a.returnsTo : [fromId];
}

/**
 * Why a pilgrim or administrator cannot take this flight with the other half of his trip: the return takes off
 * after the outbound lands, and lands where the airport he took off from allows. Null when he can.
 */
export function tripProblem(t: Pick<Traveler, "id" | "name" | "kind">, f: Flight, d: Pick<FlightsData, "flights" | "assignments" | "airports">): string | null {
  if (t.kind === "employee") return null;
  const other = d.assignments
    .filter((a) => a.travelerId === t.id && isActive(a))
    .map((a) => d.flights.find((x) => x.id === a.flightId))
    .find((x) => x && x.direction !== f.direction);
  if (!other) return null;
  const [out, back] = f.direction === "outbound" ? [f, other] : [other, f];
  if (back.departAt <= out.arriveAt) return `${t.name}: العودة ${back.flightNo} قبل وصول الذهاب ${out.flightNo}`;
  const allowed = returnAirportsFor(d, out.fromId);
  const city = (id: string) => airportOf(d, id)?.city ?? id;
  if (!allowed.includes(back.toId)) return `${t.name}: أقلع من ${city(out.fromId)}، فتهبط عودته في ${allowed.map(city).join(" أو ")} لا في ${city(back.toId)}`;
  return null;
}

// ───────────────────────── The clusters' days ─────────────────────────

/** A cluster's days: the flights the officer gave it, in date order */
export function allotmentsOf(clusterId: string, d: Pick<FlightsData, "allotments" | "flights">) {
  return d.allotments
    .filter((a) => a.clusterId === clusterId)
    .map((a) => ({ a, f: d.flights.find((x) => x.id === a.flightId) }))
    .filter((x): x is { a: Allotment; f: Flight } => !!x.f)
    .sort((x, y) => x.f.departAt - y.f.departAt);
}

/** What a cluster holds on a flight: its seats there, how many of them are taken, and how many it can still fill */
export function clusterSeats(f: Flight, clusterId: string, d: Pick<FlightsData, "allotments" | "assignments">) {
  const a = d.allotments.find((x) => x.flightId === f.id && x.clusterId === clusterId);
  const s = seatStats(f, d.assignments);
  const quota = a ? (a.seats ?? s.pilgrimSeats) : 0;
  const used = s.byCluster[clusterId] ?? 0;
  return { allotted: !!a, whole: !!a && a.seats === undefined, quota, used, remaining: Math.max(0, Math.min(quota - used, s.remaining)) };
}

// ───────────────────────── Seats ─────────────────────────

export type SeatStats = {
  capacity: number;
  staffReserve: number;
  pilgrimSeats: number;
  assignedPilgrims: number;
  assignedStaff: number;
  remaining: number;
  remainingStaff: number;
  byCluster: Record<string, number>;
};

export function seatStats(f: Flight, assignments: FlightAssignment[]): SeatStats {
  const mine = assignments.filter((a) => a.flightId === f.id && isActive(a));
  const staff = mine.filter((a) => a.travelerKind === "employee").length;
  const pilgrims = mine.length - staff;
  const byCluster: Record<string, number> = {};
  for (const a of mine) if (a.travelerKind !== "employee" && a.clusterId) byCluster[a.clusterId] = (byCluster[a.clusterId] ?? 0) + 1;
  const pilgrimSeats = f.audience === "staff" ? 0 : f.capacity - f.staffReserve;
  const staffSeats = f.audience === "staff" ? f.capacity : f.staffReserve;
  return { capacity: f.capacity, staffReserve: f.staffReserve, pilgrimSeats, assignedPilgrims: pilgrims, assignedStaff: staff, remaining: pilgrimSeats - pilgrims, remainingStaff: staffSeats - staff, byCluster };
}

export const isOpenForAssignment = (f: Flight) => f.status === "published" || f.status === "full";
/** The officer may still seat people on a locked flight, with a reason and a new manifest */
export const acceptsAssignment = (f: Flight) => isOpenForAssignment(f) || f.status === "locked";

/** Groups on a flight (active), in cluster then number order */
export const groupsOnFlight = (flightId: string, groups: GroupLeg[]) =>
  groups.filter((g) => g.flightId === flightId && g.active).sort((a, b) => a.clusterId.localeCompare(b.clusterId) || a.groupNumber - b.groupNumber);

/** The flight a group is on in one direction, if any */
export function flightOfGroup(clusterId: string, groupNumber: number, dir: Direction, d: Pick<FlightsData, "flights" | "groups">) {
  const leg = d.groups.find((g) => g.active && g.clusterId === clusterId && g.groupNumber === groupNumber && d.flights.find((f) => f.id === g.flightId)?.direction === dir);
  return leg ? d.flights.find((f) => f.id === leg.flightId) : undefined;
}

// ───────────────────────── Itinerary ─────────────────────────

export type TravelStatus = "none" | "outboundOnly" | "returnOnly" | "complete" | "departed" | "inKsa" | "returned" | "otherMeans";
export const TRAVEL_LABEL: Record<TravelStatus, string> = {
  none: "لم يُسند",
  outboundOnly: "ذهاب فقط",
  returnOnly: "عودة فقط",
  complete: "ذهاب وعودة",
  departed: "سافر",
  inKsa: "في السعودية",
  returned: "عاد",
  otherMeans: "وسيلة أخرى",
};

export type Itinerary = { outbound?: FlightAssignment; return?: FlightAssignment; status: TravelStatus };

export function itineraryOf(travelerId: string, d: Pick<FlightsData, "flights" | "assignments" | "otherMeans">): Itinerary {
  const mine = d.assignments.filter((a) => a.travelerId === travelerId && isActive(a));
  const dir = (x: Direction) => mine.find((a) => d.flights.find((f) => f.id === a.flightId)?.direction === x);
  const out = dir("outbound");
  const back = dir("return");
  let status: TravelStatus = "none";
  if (back?.status === "arrived") status = "returned";
  else if (out?.status === "arrived") status = "inKsa";
  else if (out?.status === "boarded") status = "departed";
  else if (out && back) status = "complete";
  else if (out) status = "outboundOnly";
  else if (d.otherMeans[travelerId]) status = "otherMeans";
  else if (back) status = "returnOnly";
  return { outbound: out, return: back, status };
}

/** Group by request: the families (and the group's team) on a flight, in a stable order */
export function familiesOnFlight(flightId: string, assignments: FlightAssignment[]) {
  const mine = assignments.filter((a) => a.flightId === flightId && isActive(a) && a.travelerKind !== "employee");
  const map = new Map<string, FlightAssignment[]>();
  for (const a of mine) {
    const k = a.requestId ?? a.travelerId;
    map.set(k, [...(map.get(k) ?? []), a]);
  }
  return [...map.entries()].map(([id, members]) => ({ id, members })).sort((x, y) => (x.members[0].clusterId ?? "").localeCompare(y.members[0].clusterId ?? "") || (x.members[0].groupNumber ?? 0) - (y.members[0].groupNumber ?? 0));
}

/** Warnings the officer should see about a flight */
export function flightWarnings(f: Flight, d: Pick<FlightsData, "assignments" | "flights" | "otherMeans" | "allotments">) {
  const out: string[] = [];
  const mine = d.assignments.filter((a) => a.flightId === f.id && isActive(a));
  // the clusters on it: each within the seats the officer gave it
  for (const [cid, n] of Object.entries(seatStats(f, d.assignments).byCluster)) {
    const a = d.allotments.find((x) => x.flightId === f.id && x.clusterId === cid);
    if (!a) out.push(`${n} من ${clusterName(cid)} على رحلة ليست من أيام تكتلهم`);
    else if (a.seats !== undefined && n > a.seats) out.push(`${clusterName(cid)} فوق حصته: ${n} من ${a.seats}`);
  }
  const groups = new Set(mine.filter((a) => a.groupNumber !== undefined).map((a) => `${a.clusterId}:${a.groupNumber}`));
  for (const key of groups) {
    const [cid, num] = key.split(":");
    const ofGroup = mine.filter((a) => a.clusterId === cid && a.groupNumber === Number(num));
    if (!ofGroup.some((a) => a.travelerKind === "administrator") && !mine.some((a) => a.travelerKind === "employee"))
      out.push(`${ofGroup.length} حاجاً من ${groupName(Number(num))} (${clusterName(cid)}) دون مرافق من فريقها ولا موظف`);
  }
  if (f.direction === "return") {
    const noOut = mine.filter((a) => a.travelerKind !== "employee" && !d.assignments.some((b) => b.travelerId === a.travelerId && isActive(b) && d.flights.find((x) => x.id === b.flightId)?.direction === "outbound") && !d.otherMeans[a.travelerId]);
    if (noOut.length) out.push(`${noOut.length} مسافراً على العودة دون رحلة ذهاب`);
  }
  return out;
}

// ───────────────────────── Actions ─────────────────────────

export type Actor = { name: string; role: string };
export type Result = { ok: true } | { ok: false; error: string };
const fail = (error: string): Result => ({ ok: false, error });
const OK: Result = { ok: true };

/** Where an event shows: the management tab it belongs to, the flight it concerns, and whether the director sees it */
type Meta = { area: "flights" | "dispatch" | "allotments"; ref?: string; important?: boolean };

function log(actor: Actor, action: string, target: string | undefined, detail: string | undefined, extra: { before?: string; after?: string } | undefined, meta: Meta) {
  later(() => actions.logEvent({ actor: actor.name, role: actor.role, action, target, detail, ...extra, system: "flights", ...meta }));
}

const groupLabel = (g: { clusterId: string; groupNumber: number }) => `${groupName(g.groupNumber)} (${clusterName(g.clusterId)})`;

/**
 * Who assigns: the officer (no scope), or a cluster's head (`asCluster`), who places only his cluster's people,
 * only on its days, within its seats there, and only before the officer locks the flight.
 */
export type Scope = { asCluster?: string };

/** Why a cluster's head cannot change this flight for his cluster, if he cannot */
function clusterBlock(d: Full, f: Flight, clusterId: string): string | null {
  if (!d.allotments.some((a) => a.flightId === f.id && a.clusterId === clusterId)) return "هذه الرحلة ليست من أيام تكتلك";
  if (!isOpenForAssignment(f)) return `الرحلة ${STATUS_LABEL[f.status]}: التعديل عليها عند مسؤول الطيران`;
  return null;
}

/** One set of travellers on one flight, checked and written together. Used by every assign path. */
function seatTravelers(d: Full, flightId: string, travelers: Traveler[], actor: Actor, reason?: string, scope: Scope = {}): { error: string } | { flights: Flight[]; assignments: FlightAssignment[]; flight: Flight; added: FlightAssignment[] } {
  const f = d.flights.find((x) => x.id === flightId);
  if (!f) return { error: "الرحلة غير موجودة" };
  if (!travelers.length) return { error: "لم يُختر أحد" };
  const staffOnly = travelers.every((t) => t.kind === "employee");
  if (f.audience === "staff" && !staffOnly) return { error: "هذه رحلة موظفين فقط" };
  if (scope.asCluster) {
    const block = clusterBlock(d, f, scope.asCluster);
    if (block) return { error: block };
    if (travelers.some((t) => t.clusterId !== scope.asCluster)) return { error: "من بين المختارين من ليس في تكتلك" };
  }
  if (!acceptsAssignment(f)) return { error: `الرحلة ${STATUS_LABEL[f.status]} — لا يُسند إليها` };
  if (f.status === "locked" && !reason) return { error: "الرحلة مقفلة: الإسناد إليها يحتاج سبباً، ثم كشفاً بإصدار جديد" };
  const dup = travelers.filter((t) => d.assignments.some((a) => a.travelerId === t.id && isActive(a) && d.flights.find((x) => x.id === a.flightId)?.direction === f.direction));
  if (dup.length) return { error: `${dup.length === 1 ? dup[0].name : `${dup.length} مسافرين`} على رحلة ${DIRECTION_LABEL[f.direction]} أخرى — ألغِ الإسناد القديم أولاً` };
  const trip = travelers.map((t) => tripProblem(t, f, d)).filter((x): x is string => !!x);
  if (trip.length) return { error: trip.length === 1 ? trip[0] : `${trip[0]} — و${trip.length - 1} غيره` };
  const s = seatStats(f, d.assignments);
  const nStaff = travelers.filter((t) => t.kind === "employee").length;
  const nPil = travelers.length - nStaff;
  if (nStaff > s.remainingStaff) return { error: `مقاعد الموظفين المتبقية ${s.remainingStaff} والمختارون ${nStaff}` };
  if (nPil > s.remaining) return { error: `المقاعد المتبقية ${s.remaining} وعدد المسافرين ${nPil}` };
  if (scope.asCluster) {
    const c = clusterSeats(f, scope.asCluster, d);
    if (nPil > c.remaining) return { error: `بقي من مقاعد تكتلك على ${f.flightNo} ${c.remaining} والمختارون ${nPil}` };
  }
  const now = Date.now();
  const added: FlightAssignment[] = travelers.map((t, i) => ({
    id: newFlightId("as"),
    flightId,
    travelerKind: t.kind,
    travelerId: t.id,
    name: t.name,
    gender: t.gender,
    age: t.age,
    needs: t.needs ?? [],
    requestId: t.requestId,
    groupNumber: t.groupNumber,
    clusterId: t.clusterId,
    status: f.status === "locked" ? "locked" : "assigned",
    assignedBy: actor.name,
    assignedByRole: actor.role,
    assignedAt: now + i,
    reason,
  }));
  const assignments = [...d.assignments, ...added];
  const after = seatStats(f, assignments);
  const status: FlightStatus = f.status === "published" && after.remaining <= 0 && f.audience === "pilgrims" ? "full" : f.status;
  const flight = { ...f, status };
  return { flights: upsert(d.flights, flight), assignments, flight, added };
}

function refreshFull(f: Flight, assignments: FlightAssignment[]): Flight {
  const after = seatStats(f, assignments);
  return f.status === "full" && after.remaining > 0 ? { ...f, status: "published" } : f;
}

export const flightsActions = {
  saveAirport: (a: Airport) => patch((d) => ({ airports: upsert(d.airports, a) })),
  saveCarrier: (c: Carrier) => patch((d) => ({ carriers: upsert(d.carriers, c) })),

  /** A new flight, or an outbound and its return created together (they point at each other) */
  saveFlight(f: Flight, actor: Actor, before?: Flight, returnLeg?: Flight) {
    const out = returnLeg ? { ...f, pairedFlightId: returnLeg.id } : f;
    const back = returnLeg ? { ...returnLeg, pairedFlightId: f.id } : undefined;
    patch((d) => ({ flights: back ? upsert(upsert(d.flights, out), back) : upsert(d.flights, out) }));
    // a published flight changed reaches the director; a draft is the officer's own work
    if (before) log(actor, "تعديل رحلة", f.flightNo, undefined, { before: `${isoDate(before.departAt)} ${isoTime(before.departAt)} — ${before.capacity}`, after: `${isoDate(f.departAt)} ${isoTime(f.departAt)} — ${f.capacity}` }, { area: "flights", ref: f.id, important: before.status !== "draft" });
    else if (back) log(actor, "إنشاء رحلة ذهاب وعودة", `${f.flightNo} / ${back.flightNo}`, `${f.capacity} مقعداً ذهاباً و${back.capacity} عودة`, undefined, { area: "flights", ref: f.id });
    else log(actor, "إنشاء رحلة", f.flightNo, `${DIRECTION_LABEL[f.direction]} — ${f.capacity} مقعداً`, undefined, { area: "flights", ref: f.id });
  },
  deleteDraft(id: string, actor: Actor) {
    patch((d) => ({ flights: d.flights.filter((f) => f.id !== id || f.status !== "draft").map((f) => (f.pairedFlightId === id ? { ...f, pairedFlightId: undefined } : f)) }));
    log(actor, "حذف مسودة رحلة", id, undefined, undefined, { area: "flights", ref: id });
  },

  publish(id: string, actor: Actor): Result {
    let r: Result = OK;
    patch((d) => {
      const f = d.flights.find((x) => x.id === id);
      if (!f || f.status !== "draft") return (r = fail("الرحلة ليست مسودة")), {};
      // a round trip is published whole: its other half goes out with it if it is still a draft
      const pair = d.flights.find((x) => x.id === f.pairedFlightId && x.status === "draft");
      const now = Date.now();
      log(actor, pair ? "نشر رحلة ذهاب وعودة" : "نشر رحلة", pair ? `${f.flightNo} / ${pair.flightNo}` : f.flightNo, `${f.capacity} مقعداً`, undefined, { area: "flights", ref: f.id, important: true });
      const flights = upsert(d.flights, { ...f, status: "published", publishedAt: now });
      return { flights: pair ? upsert(flights, { ...pair, status: "published", publishedAt: now }) : flights };
    });
    return r;
  },

  /** Freeze the seats and issue the passenger manifest; any later change needs a reason and a new manifest */
  lock(id: string, actor: Actor): Result {
    let r: Result = OK;
    patch((d) => {
      const f = d.flights.find((x) => x.id === id);
      if (!f || !isOpenForAssignment(f)) return (r = fail("تُقفل الرحلة المنشورة أو المكتملة فقط")), {};
      const version = (f.manifestVersion ?? 0) + 1;
      const rows = manifestRows(f, d.assignments);
      const manifest: Manifest = { id: `mf-${f.id}-${version}`, flightId: f.id, version, issuedAt: Date.now(), issuedBy: actor.name, rows, exports: [] };
      log(actor, "إقفال رحلة وإصدار كشف الركاب", f.flightNo, `${rows.length} مسافراً — الإصدار ${version}`, undefined, { area: "flights", ref: f.id });
      return {
        flights: upsert(d.flights, { ...f, status: "locked", lockedAt: Date.now(), manifestVersion: version }),
        assignments: d.assignments.map((a) => (a.flightId === id && a.status === "assigned" ? { ...a, status: "locked" } : a)),
        manifests: [...d.manifests, manifest],
      };
    });
    return r;
  },

  reissueManifest(id: string, actor: Actor) {
    patch((d) => {
      const f = d.flights.find((x) => x.id === id);
      if (!f || f.status !== "locked") return {};
      const version = (f.manifestVersion ?? 0) + 1;
      const rows = manifestRows(f, d.assignments);
      log(actor, "إصدار كشف ركاب جديد", f.flightNo, `الإصدار ${version} — ${rows.length} مسافراً`, undefined, { area: "flights", ref: f.id });
      return { flights: upsert(d.flights, { ...f, manifestVersion: version }), manifests: [...d.manifests, { id: `mf-${f.id}-${version}`, flightId: f.id, version, issuedAt: Date.now(), issuedBy: actor.name, rows, exports: [] }] };
    });
  },

  exportManifest(manifestId: string, to: "masar" | "carrier", actor: Actor) {
    patch((d) => {
      const m = d.manifests.find((x) => x.id === manifestId);
      if (!m) return {};
      const f = d.flights.find((x) => x.id === m.flightId);
      log(actor, to === "masar" ? "تصدير كشف الركاب إلى نسك مسار" : "تصدير كشف الركاب إلى الناقل", f?.flightNo, `الإصدار ${m.version} — ${m.rows.length} مسافراً`, undefined, { area: "flights", ref: m.flightId });
      return { manifests: upsert(d.manifests, { ...m, exports: [...m.exports, { to, at: Date.now(), by: actor.name }] }) };
    });
  },

  /** Take-off: who boarded stays, who did not becomes a no-show */
  depart(id: string, actor: Actor, boardedIds?: string[]): Result {
    let r: Result = OK;
    patch((d) => {
      const f = d.flights.find((x) => x.id === id);
      if (!f || f.status !== "locked") return (r = fail("يُسجَّل الإقلاع للرحلة المقفلة فقط")), {};
      const mine = d.assignments.filter((a) => a.flightId === id && isActive(a));
      const boarded = new Set(boardedIds ?? mine.map((a) => a.travelerId));
      const noShow = mine.filter((a) => !boarded.has(a.travelerId));
      log(actor, "تسجيل إقلاع", f.flightNo, `صعد ${mine.length - noShow.length}${noShow.length ? ` — تخلّف ${noShow.length}: ${noShow.map((a) => a.name).join("، ")}` : ""}`, undefined, { area: "flights", ref: f.id, important: true });
      for (const a of noShow) later(() => actions.addTicket({ name: a.name, kind: "transport", severity: "high", location: `الرحلة ${f.flightNo}`, text: `تخلّف ${a.name} عن الرحلة ${f.flightNo}. يحتاج إعادة إسناد إلى رحلة أخرى.`, assignee: "فريق المواصلات — هيثم زيدان" }));
      return {
        flights: upsert(d.flights, { ...f, status: "departed", departedAt: Date.now() }),
        assignments: d.assignments.map((a) => (a.flightId === id && isActive(a) ? { ...a, status: boarded.has(a.travelerId) ? "boarded" : "noShow", boardedAt: boarded.has(a.travelerId) ? (a.boardedAt ?? Date.now()) : a.boardedAt } : a)),
      };
    });
    return r;
  },

  arrive(id: string, actor: Actor): Result {
    let r: Result = OK;
    patch((d) => {
      const f = d.flights.find((x) => x.id === id);
      if (!f || f.status !== "departed") return (r = fail("يُسجَّل الهبوط للرحلة التي أقلعت فقط")), {};
      log(actor, "تسجيل هبوط", f.flightNo, airportOf(d, f.divertedToId ?? f.toId)?.name, undefined, { area: "flights", ref: f.id, important: true });
      return { flights: upsert(d.flights, { ...f, status: "arrived", arrivedAt: Date.now() }), assignments: d.assignments.map((a) => (a.flightId === id && a.status === "boarded" ? { ...a, status: "arrived" } : a)) };
    });
    return r;
  },

  /** Boarding from the group's muster: scanned cards become "boarded" ahead of the take-off record */
  markBoarded(flightId: string, travelerIds: string[], actor: Actor) {
    patch((d) => {
      const f = d.flights.find((x) => x.id === flightId);
      if (!f) return {};
      const set = new Set(travelerIds);
      const hit = (a: FlightAssignment) => a.flightId === flightId && set.has(a.travelerId) && (a.status === "assigned" || a.status === "locked");
      const n = d.assignments.filter(hit).length;
      if (n) log(actor, "تسجيل صعود من التجمّع", f.flightNo, `${n} مسافراً`, undefined, { area: "flights", ref: f.id });
      return { assignments: d.assignments.map((a) => (hit(a) ? { ...a, status: "boarded", boardedAt: Date.now() } : a)) };
    });
  },

  postpone(id: string, reason: string, actor: Actor): Result {
    let r: Result = OK;
    patch((d) => {
      const f = d.flights.find((x) => x.id === id);
      if (!f || !["published", "full", "locked"].includes(f.status)) return (r = fail("تُؤجَّل الرحلة المنشورة أو المقفلة فقط")), {};
      const n = d.assignments.filter((a) => a.flightId === id && isActive(a)).length;
      log(actor, "تأجيل رحلة", f.flightNo, `${reason} — ${n} مسافراً سيُبلَّغون بالموعد الجديد`, undefined, { area: "flights", ref: f.id, important: true });
      return { flights: upsert(d.flights, { ...f, status: "postponed", beforePostpone: f.status, postponedAt: Date.now(), postponeReason: reason }) };
    });
    return r;
  },

  reschedule(id: string, departAt: number, arriveAt: number, actor: Actor): Result {
    let r: Result = OK;
    patch((d) => {
      const f = d.flights.find((x) => x.id === id);
      if (!f || ["departed", "arrived", "cancelled"].includes(f.status)) return (r = fail("لا يُعاد جدولة رحلة أقلعت أو أُلغيت")), {};
      const n = d.assignments.filter((a) => a.flightId === id && isActive(a)).length;
      log(actor, "موعد جديد للرحلة", f.flightNo, `${n} مسافراً يُبلَّغون`, { before: `${isoDate(f.departAt)} ${isoTime(f.departAt)}`, after: `${isoDate(departAt)} ${isoTime(departAt)}` }, { area: "flights", ref: f.id, important: true });
      const status: FlightStatus = f.status === "postponed" ? (f.beforePostpone ?? "published") : f.status;
      return { flights: upsert(d.flights, { ...f, departAt, arriveAt, status, beforePostpone: undefined, postponeReason: undefined }) };
    });
    return r;
  },

  divert(id: string, toAirportId: string, buses: number, note: string, actor: Actor): Result {
    let r: Result = OK;
    patch((d) => {
      const f = d.flights.find((x) => x.id === id);
      if (!f || ["arrived", "cancelled", "draft"].includes(f.status)) return (r = fail("لا تُحوَّل هذه الرحلة")), {};
      const alt = airportOf(d, toAirportId);
      const dest = airportOf(d, f.toId);
      const n = d.assignments.filter((a) => a.flightId === id && isActive(a)).length;
      const leg: GroundLeg = { kind: "bus", from: alt?.city ?? "?", to: dest?.city ?? "?", buses, note, at: f.arriveAt + 2 * HOUR };
      log(actor, "تحويل وجهة رحلة", f.flightNo, `إلى ${alt?.name} ثم ${buses} حافلات إلى ${dest?.city} — ${n} مسافراً يُبلَّغون`, { before: dest?.code, after: alt?.code }, { area: "flights", ref: f.id, important: true });
      later(() => actions.addTicket({ name: `الرحلة ${f.flightNo}`, kind: "transport", severity: "critical", location: alt?.name ?? "", text: `حُوّلت الرحلة ${f.flightNo} إلى ${alt?.name}. مطلوب ${buses} حافلات (35 – 40 راكباً) إلى ${dest?.city}. ${note}`.trim(), assignee: "فريق المواصلات — هيثم زيدان" }));
      return { flights: upsert(d.flights, { ...f, divertedToId: toAirportId, groundLegs: [...f.groundLegs, leg] }) };
    });
    return r;
  },

  cancel(id: string, reason: string, actor: Actor): Result {
    let r: Result = OK;
    patch((d) => {
      const f = d.flights.find((x) => x.id === id);
      if (!f || ["departed", "arrived", "cancelled"].includes(f.status)) return (r = fail("لا تُلغى رحلة أقلعت")), {};
      const n = d.assignments.filter((a) => a.flightId === id && isActive(a)).length;
      log(actor, "إلغاء رحلة", f.flightNo, `${reason} — ${n} مسافراً صاروا بحاجة إلى رحلة`, undefined, { area: "flights", ref: f.id, important: true });
      return {
        flights: upsert(d.flights, { ...f, status: "cancelled", cancelledAt: Date.now(), cancelReason: reason }),
        assignments: d.assignments.map((a) => (a.flightId === id && isActive(a) ? { ...a, status: "cancelled", cancelledAt: Date.now(), reason: `إلغاء الرحلة: ${reason}` } : a)),
        groups: d.groups.map((g) => (g.flightId === id && g.active ? { ...g, active: false, endedAt: Date.now(), endReason: `إلغاء الرحلة: ${reason}` } : g)),
      };
    });
    return r;
  },

  /**
   * Put whole groups on a flight: every member the group has now (its families and its team) takes a seat,
   * and families that join the group later follow it on its own (syncFamily). All or nothing: if the groups
   * do not fit, nothing is written.
   */
  assignGroups(flightId: string, groups: { ref: GroupRef; members: Traveler[] }[], actor: Actor, reason?: string, scope: Scope = {}): Result {
    let r: Result = OK;
    patch((d) => {
      const f = d.flights.find((x) => x.id === flightId);
      if (!f) return (r = fail("الرحلة غير موجودة")), {};
      if (scope.asCluster && groups.some((g) => g.ref.clusterId !== scope.asCluster)) return (r = fail("المجموعة ليست من تكتلك")), {};
      const taken = groups.filter((g) => flightOfGroup(g.ref.clusterId, g.ref.number, f.direction, d));
      if (taken.length) return (r = fail(`${taken.map((g) => groupLabel({ clusterId: g.ref.clusterId, groupNumber: g.ref.number })).join("، ")} على رحلة ${DIRECTION_LABEL[f.direction]} أخرى — أزلها منها أولاً`)), {};
      // members already seated individually this way (a moved pilgrim) keep their own seat
      const members = groups.flatMap((g) => g.members).filter((t) => !d.assignments.some((a) => a.travelerId === t.id && isActive(a) && d.flights.find((x) => x.id === a.flightId)?.direction === f.direction));
      const res = seatTravelers(d, flightId, members, actor, reason, scope);
      if ("error" in res) return (r = fail(res.error)), {};
      const now = Date.now();
      const legs: GroupLeg[] = groups.map((g, i) => ({ id: newFlightId("gl"), flightId, clusterId: g.ref.clusterId, groupNumber: g.ref.number, by: actor.name, at: now + i, active: true }));
      log(actor, `إسناد ${groups.length === 1 ? "مجموعة" : `${groups.length} مجموعات`} إلى رحلة`, f.flightNo, `${groups.map((g) => groupLabel({ clusterId: g.ref.clusterId, groupNumber: g.ref.number })).join("، ")} — ${members.length} مسافراً — المتبقي ${seatStats(res.flight, res.assignments).remaining}${reason ? ` — ${reason}` : ""}`, undefined, { area: "dispatch", ref: f.id });
      return { flights: res.flights, assignments: res.assignments, groups: [...d.groups, ...legs] };
    });
    return r;
  },

  /** Take a whole group off a flight: its members' seats are freed and the group needs a flight again */
  unassignGroup(legId: string, actor: Actor, reason?: string, scope: Scope = {}): Result {
    let r: Result = OK;
    patch((d) => {
      const leg = d.groups.find((g) => g.id === legId && g.active);
      if (!leg) return (r = fail("المجموعة ليست على هذه الرحلة")), {};
      const f = d.flights.find((x) => x.id === leg.flightId)!;
      if (scope.asCluster) {
        const block = leg.clusterId !== scope.asCluster ? "المجموعة ليست من تكتلك" : clusterBlock(d, f, scope.asCluster);
        if (block) return (r = fail(block)), {};
      }
      if (!isOpenForAssignment(f) && !reason) return (r = fail("الرحلة مقفلة: الإزالة تحتاج سبباً")), {};
      const now = Date.now();
      const hit = (a: FlightAssignment) => a.flightId === leg.flightId && a.clusterId === leg.clusterId && a.groupNumber === leg.groupNumber && isActive(a);
      const n = d.assignments.filter(hit).length;
      const assignments = d.assignments.map((a) => (hit(a) ? { ...a, status: "cancelled" as const, cancelledAt: now, reason: `إزالة المجموعة من الرحلة${reason ? ` — ${reason}` : ""}` } : a));
      log(actor, "إزالة مجموعة من رحلة", f.flightNo, `${groupLabel(leg)} — ${n} مقعداً عادت متاحة${reason ? ` — ${reason}` : ""}`, undefined, { area: "dispatch", ref: f.id });
      return { flights: upsert(d.flights, refreshFull(f, assignments)), assignments, groups: d.groups.map((g) => (g.id === legId ? { ...g, active: false, endedAt: now, endReason: reason ?? (scope.asCluster ? "إزالة من رئيس التكتل" : "إزالة من مسؤول الطيران") } : g)) };
    });
    return r;
  },

  /** Seat a set of travellers (employees, or one pilgrim who lost his seat) on a flight */
  assign(flightId: string, travelers: Traveler[], actor: Actor, reason?: string, scope: Scope = {}): Result {
    let r: Result = OK;
    patch((d) => {
      const res = seatTravelers(d, flightId, travelers, actor, reason, scope);
      if ("error" in res) return (r = fail(res.error)), {};
      const nStaff = travelers.filter((t) => t.kind === "employee").length;
      const nPil = travelers.length - nStaff;
      log(actor, `إسناد ${nPil ? `${nPil} ${nPil === 1 ? "مسافر" : "مسافرين"}` : ""}${nStaff ? `${nPil ? " و" : ""}${nStaff} ${nStaff === 1 ? "موظف" : "موظفين"}` : ""} إلى رحلة`, res.flight.flightNo, `المتبقي ${seatStats(res.flight, res.assignments).remaining}${reason ? ` — ${reason}` : ""}`, undefined, { area: "dispatch", ref: res.flight.id });
      return { flights: res.flights, assignments: res.assignments };
    });
    return r;
  },

  /** Cancel individual assignments (before the lock freely; after it with a reason) */
  unassign(ids: string[], actor: Actor, reason?: string, scope: Scope = {}): Result {
    let r: Result = OK;
    patch((d) => {
      const targets = d.assignments.filter((a) => ids.includes(a.id) && isActive(a));
      if (!targets.length) return (r = fail("لا إسناد نشطاً")), {};
      const f = d.flights.find((x) => x.id === targets[0].flightId)!;
      if (scope.asCluster) {
        const block = targets.some((a) => a.clusterId !== scope.asCluster) ? "من بين المختارين من ليس في تكتلك" : clusterBlock(d, f, scope.asCluster);
        if (block) return (r = fail(block)), {};
      }
      if (!isOpenForAssignment(f) && !reason) return (r = fail("الرحلة مقفلة: الإلغاء يحتاج سبباً")), {};
      const now = Date.now();
      const assignments = d.assignments.map((a) => (ids.includes(a.id) && isActive(a) ? { ...a, status: "cancelled" as const, cancelledAt: now, reason } : a));
      log(actor, `إلغاء إسناد ${targets.length} ${targets.length === 1 ? "مسافر" : "مسافرين"}`, f.flightNo, `${targets.slice(0, 3).map((a) => a.name).join("، ")}${targets.length > 3 ? "…" : ""}${reason ? ` — ${reason}` : ""}`, undefined, { area: "dispatch", ref: f.id });
      return { flights: upsert(d.flights, refreshFull(f, assignments)), assignments };
    });
    return r;
  },

  /** Move travellers to another flight the same way: the old assignment stays, marked moved, pointing at the new one */
  move(ids: string[], toFlightId: string, actor: Actor, reason?: string, scope: Scope = {}): Result {
    let r: Result = OK;
    patch((d) => {
      const targets = d.assignments.filter((a) => ids.includes(a.id) && isActive(a));
      if (!targets.length) return (r = fail("لا إسناد نشطاً")), {};
      const from = d.flights.find((x) => x.id === targets[0].flightId)!;
      const to = d.flights.find((x) => x.id === toFlightId);
      if (!to || to.direction !== from.direction) return (r = fail("النقل إلى رحلة في الاتجاه نفسه فقط")), {};
      // his head moves only his cluster's people, off a flight still open (seatTravelers checks the new one)
      if (scope.asCluster && targets.some((a) => a.clusterId !== scope.asCluster)) return (r = fail("من بين المختارين من ليس في تكتلك")), {};
      if (scope.asCluster && !isOpenForAssignment(from)) return (r = fail(`رحلته ${from.flightNo} ${STATUS_LABEL[from.status]}: النقل منها عند مسؤول الطيران`)), {};
      if (!isOpenForAssignment(from) && !reason) return (r = fail("الرحلة مقفلة: النقل يحتاج سبباً")), {};
      const freed = d.assignments.map((a) => (ids.includes(a.id) && isActive(a) ? { ...a, status: "moved" as const, reason } : a));
      const travelers: Traveler[] = targets.map((a) => ({ id: a.travelerId, name: a.name, kind: a.travelerKind, gender: a.gender, age: a.age, needs: a.needs, requestId: a.requestId, groupNumber: a.groupNumber, clusterId: a.clusterId }));
      const res = seatTravelers({ ...d, assignments: freed }, toFlightId, travelers, actor, reason ?? (to.status === "locked" ? `نقل من ${from.flightNo}` : undefined), scope);
      if ("error" in res) return (r = fail(res.error)), {};
      const byTraveler = new Map(res.added.map((a) => [a.travelerId, a.id]));
      const assignments = res.assignments.map((a) => (ids.includes(a.id) && a.status === "moved" ? { ...a, movedTo: byTraveler.get(a.travelerId) } : a));
      log(actor, `نقل ${targets.length} ${targets.length === 1 ? "مسافر" : "مسافرين"} إلى رحلة أخرى`, from.flightNo, `إلى ${to.flightNo}${reason ? ` — ${reason}` : ""}`, undefined, { area: "dispatch", ref: from.id });
      return { flights: upsert(res.flights, refreshFull(from, assignments)), assignments };
    });
    return r;
  },



  setOtherMeans(travelerId: string, name: string, reason: string, actor: Actor) {
    patch((d) => {
      log(actor, "سفر بوسيلة أخرى", name, reason, undefined, { area: "dispatch", ref: travelerId });
      return { otherMeans: { ...d.otherMeans, [travelerId]: { reason, at: Date.now(), by: actor.name } } };
    });
  },

  /**
   * Give a cluster a flight among its days, with the seats it holds there (absent: the whole flight), or change
   * its seats. The seats never fall under the cluster's people already on it, and the clusters' seats on a
   * flight never pass its pilgrims' seats.
   */
  allot(clusterId: string, flightId: string, seats: number | undefined, actor: Actor): Result {
    let r: Result = OK;
    patch((d) => {
      const f = d.flights.find((x) => x.id === flightId);
      if (!f || f.audience !== "pilgrims") return (r = fail("تُعطى التكتلاتِ رحلاتُ الحجاج فقط")), {};
      if (["departed", "arrived", "cancelled"].includes(f.status)) return (r = fail(`الرحلة ${STATUS_LABEL[f.status]}`)), {};
      const s = seatStats(f, d.assignments);
      const others = d.allotments.filter((a) => a.flightId === flightId && a.clusterId !== clusterId);
      const whole = others.find((a) => a.seats === undefined);
      if (whole) return (r = fail(`الرحلة كلها لـ${clusterName(whole.clusterId)}: حدّد مقاعده عليها أولاً`)), {};
      if (seats === undefined && others.length) return (r = fail("على الرحلة تكتلات أخرى: حدّد عدد مقاعد هذا التكتل")), {};
      if (seats !== undefined && seats < 1) return (r = fail("عدد المقاعد رقم أكبر من صفر")), {};
      const used = s.byCluster[clusterId] ?? 0;
      if (seats !== undefined && seats < used) return (r = fail(`على الرحلة ${used} من التكتل: لا تقلّ مقاعده عنهم`)), {};
      // the others' seats, and the people of clusters seated here without a day of their own
      const held = others.reduce((n, a) => n + (a.seats ?? 0), 0) + Object.entries(s.byCluster).filter(([c]) => c !== clusterId && !others.some((a) => a.clusterId === c)).reduce((n, [, k]) => n + k, 0);
      if ((seats ?? s.pilgrimSeats) + held > s.pilgrimSeats) return (r = fail(`مقاعد الحجاج على الرحلة ${s.pilgrimSeats}، والمحجوز لغير هذا التكتل ${held}: يبقى له ${Math.max(0, s.pilgrimSeats - held)}`)), {};
      const before = d.allotments.find((a) => a.flightId === flightId && a.clusterId === clusterId);
      const item: Allotment = { id: before?.id ?? newFlightId("al"), clusterId, flightId, seats, by: actor.name, at: Date.now() };
      const n = (x: Allotment | undefined) => (x ? (x.seats === undefined ? "الرحلة كلها" : `${x.seats} مقعداً`) : "—");
      log(actor, before ? "تعديل مقاعد تكتل على رحلة" : "إعطاء تكتل يوم رحلة", f.flightNo, `${clusterName(clusterId)} — ${DIRECTION_LABEL[f.direction]} ${fmtHijriShort(f.departAt)}`, { before: before ? n(before) : undefined, after: n(item) }, { area: "allotments", ref: f.id });
      return { allotments: upsert(d.allotments, item) };
    });
    return r;
  },

  /** Take a day back from a cluster: only when none of its people is on that flight */
  unallot(clusterId: string, flightId: string, actor: Actor): Result {
    let r: Result = OK;
    patch((d) => {
      const f = d.flights.find((x) => x.id === flightId);
      const a = d.allotments.find((x) => x.flightId === flightId && x.clusterId === clusterId);
      if (!f || !a) return (r = fail("الرحلة ليست من أيام هذا التكتل")), {};
      const used = seatStats(f, d.assignments).byCluster[clusterId] ?? 0;
      if (used) return (r = fail(`على الرحلة ${used} من ${clusterName(clusterId)}: يُزالون عنها أولاً`)), {};
      log(actor, "سحب يوم رحلة من تكتل", f.flightNo, `${clusterName(clusterId)} — ${DIRECTION_LABEL[f.direction]} ${fmtHijriShort(f.departAt)}`, undefined, { area: "allotments", ref: f.id });
      return { allotments: d.allotments.filter((x) => x.id !== a.id) };
    });
    return r;
  },

  /** Back to the seed */
  reset: () => setState((s) => ({ ...s, flights: {} })),
};

/**
 * A family that joins a group after the group was put on its flights takes seats on those flights too:
 * everyone registered in the group travels with it. If a flight is full, locked or has already left, the
 * family stays without a seat that way and shows in the officer's "needs a flight" list.
 */
export function syncFamily(sid: string, app: Application, post: Pick<PostAcceptance, "clusterId" | "groupNumber">) {
  if (!post.clusterId || post.groupNumber === undefined) return;
  const clusterId = post.clusterId;
  const groupNumber = post.groupNumber;
  const travelers: Traveler[] = app.members.map((m) => ({ id: m.person.id, name: fullName(m.person), kind: "pilgrim", gender: m.person.gender, age: ageOf(m.person), needs: m.needs, requestId: sid, groupNumber, clusterId }));
  const actor: Actor = { name: "المنصة", role: "مع مجموعته تلقائياً" };
  patch((d) => {
    // a family that moved from another group leaves that group's flights first
    const ids = new Set(travelers.map((t) => t.id));
    let assignments = d.assignments.map((a) =>
      ids.has(a.travelerId) && isActive(a) && (a.clusterId !== clusterId || a.groupNumber !== groupNumber) && (a.status === "assigned" || a.status === "locked")
        ? { ...a, status: "cancelled" as const, cancelledAt: Date.now(), reason: "انتقلت العائلة إلى مجموعة أخرى" }
        : a,
    );
    let flights = d.flights;
    for (const dir of ["outbound", "return"] as Direction[]) {
      const f = flightOfGroup(clusterId, groupNumber, dir, { flights, groups: d.groups });
      if (!f || !isOpenForAssignment(f)) continue;
      const res = seatTravelers({ ...d, flights, assignments }, f.id, travelers, actor);
      if ("error" in res) continue;
      flights = res.flights;
      assignments = res.assignments;
      log(actor, `انضمام عائلة إلى رحلة مجموعتها`, f.flightNo, `${travelers.length} أفراد — ${groupLabel({ clusterId, groupNumber })}`, undefined, { area: "dispatch", ref: f.id });
    }
    return { flights, assignments };
  });
}

export function manifestRows(f: Flight, assignments: FlightAssignment[]): ManifestRow[] {
  return assignments
    .filter((a) => a.flightId === f.id && isActive(a))
    .sort((x, y) => (x.clusterId ?? "").localeCompare(y.clusterId ?? "") || (x.groupNumber ?? 0) - (y.groupNumber ?? 0) || (x.requestId ?? "").localeCompare(y.requestId ?? ""))
    .map((a) => ({ name: a.name, travelerId: a.travelerId, kind: a.travelerKind, gender: a.gender, age: a.age, groupNumber: a.groupNumber, clusterId: a.clusterId, needs: a.needs ?? [], seat: a.seat }));
}

/** CSV of a manifest, in the columns نسك مسار asks for (a demo approximation) */
export function manifestCsv(m: Manifest, f: Flight, d: Pick<FlightsData, "airports" | "carriers">) {
  const head = ["الاسم", "الرقم الوطني", "الصفة", "الجنس", "العمر", "التكتل", "المجموعة", "الاحتياجات", "رقم الرحلة", "الناقل", "من", "إلى", "المغادرة", "الوصول"];
  const rows = m.rows.map((r) => [r.name, r.travelerId, KIND_LABEL[r.kind], r.gender === "F" ? "أنثى" : "ذكر", r.age ?? "", r.clusterId ? clusterName(r.clusterId) : "", r.groupNumber !== undefined ? groupShort(r.groupNumber) : "", r.needs.join(" / "), f.flightNo, carrierOf(d, f.carrierId)?.name ?? "", airportOf(d, f.fromId)?.code ?? "", airportOf(d, f.divertedToId ?? f.toId)?.code ?? "", `${isoDate(f.departAt)} ${isoTime(f.departAt)}`, `${isoDate(f.arriveAt)} ${isoTime(f.arriveAt)}`]);
  return "﻿" + [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

// ───────────────────────── Pilgrim-facing cards ─────────────────────────

/** Where the cluster's buses leave the pilgrims back home, by the airport the return lands at */
const HOME_YARD: Record<string, string> = { "ap-dam": "ساحة المزة", "ap-alp": "ساحة الجامعة في حلب", "ap-ltk": "ساحة اليمن في اللاذقية" };

/** The shape the boarding-pass card in the pilgrim portal draws */
export type PassCard = {
  code: string;
  carrier: string;
  from: { code: string; city: string; airport: string };
  to: { code: string; city: string; airport: string };
  hijri: string;
  gregorian: string;
  departure: string;
  arrival: string;
  duration: string;
  gate: string;
  boardingAt: string;
  airportAt: string;
  gathering: string;
  baggage: string;
  afterLanding: string;
};

export function passCardOf(f: Flight, d: Pick<FlightsData, "airports" | "carriers">): PassCard {
  const from = airportOf(d, f.fromId);
  const to = airportOf(d, f.divertedToId ?? f.toId);
  const outbound = f.direction === "outbound";
  return {
    code: f.flightNo,
    carrier: carrierOf(d, f.carrierId)?.name ?? "",
    from: { code: from?.code ?? "", city: from?.city ?? "", airport: from?.name ?? "" },
    to: { code: to?.code ?? "", city: to?.city ?? "", airport: to?.name ?? "" },
    hijri: fmtHijri(f.departAt),
    gregorian: fmtGreg(f.departAt),
    departure: fmtClock(f.departAt),
    arrival: fmtClock(f.arriveAt),
    duration: fmtDuration(f.departAt, f.arriveAt),
    gate: f.gate ?? "—",
    boardingAt: fmtClock(f.departAt - 45 * 60_000),
    airportAt: fmtClock(f.departAt - 3.5 * HOUR),
    gathering: f.gathering ?? "—",
    baggage: outbound ? "حقيبة 23 كغ + حقيبة يد 7 كغ — حقيبة الإحرام معك في اليد" : "حقيبة 23 كغ + حقيبة يد 7 كغ — ماء زمزم (5 لتر) يُسلَّم مغلّفاً في المطار",
    afterLanding: f.divertedToId
      ? `حُوّلت الرحلة إلى ${to?.city}: حافلات التكتل تنقلكم إلى ${airportOf(d, f.toId)?.city}`
      : outbound
        ? "حافلة التكتل في ساحة المطار — مهيأة للكرسي المتحرك — إلى الفندق مباشرة"
        : `حافلة التكتل من المطار إلى ${HOME_YARD[f.toId] ?? "نقطة تجمع التكتل"}`,
  };
}

/**
 * The demo pilgrim's family, at the visa step: if its cluster's head already put its group on flights the family
 * follows the group (syncFamily); if not, his work is simulated — the whole group goes on the first of its
 * cluster's days that can take it, outbound then the return its outbound allows.
 */
export function simulateGroupFlights(sid: string, app: Application, post: PostAcceptance, admins: Record<string, AdminProfile>, allPost: Record<string, PostAcceptance>, applications: Record<string, Application>) {
  if (!post.clusterId || post.groupNumber === undefined) return;
  const ref = allGroups().find((g) => g.clusterId === post.clusterId && g.number === post.groupNumber) ?? { clusterId: post.clusterId, clusterName: clusterName(post.clusterId), number: post.groupNumber, head: "", pilgrims: app.members.length, capacity: 50 };
  const members = membersOfGroup(ref, allPost, applications, admins);
  const actor: Actor = { name: `${requestNow(ref.clusterId)?.headName ?? SEEDER} (محاكاة)`, role: `رئيس ${clusterName(ref.clusterId)}` };
  for (const dir of ["outbound", "return"] as Direction[]) {
    const now = current(getState());
    if (flightOfGroup(ref.clusterId, ref.number, dir, now)) continue;
    const out = dir === "return" ? flightOfGroup(ref.clusterId, ref.number, "outbound", now) : undefined;
    const f = allotmentsOf(ref.clusterId, now)
      .map((x) => x.f)
      .filter((x) => x.direction === dir && isOpenForAssignment(x) && clusterSeats(x, ref.clusterId, now).remaining >= members.length)
      .find((x) => !out || (returnAirportsFor(now, out.fromId).includes(x.toId) && x.departAt > out.arriveAt));
    if (f) flightsActions.assignGroups(f.id, [{ ref, members }], actor, undefined, { asCluster: ref.clusterId });
  }
  syncFamily(sid, app, post);
}
