/**
 * The Hajj lottery as the Syrian draw runs it: no names are drawn. In a live broadcast the lottery
 * committee draws BIRTH YEARS, and for some years only certain BIRTH MONTHS ("1965 — مواليد كانون
 * الثاني"), until the lottery's seats are filled. A lottery application is accepted when its main
 * applicant (صاحب الطلب, the oldest member) was born in a drawn year — and, when the year was drawn by
 * months, in one of its drawn months. The whole application goes with its main applicant: accepted
 * together or not at all. There is no reserve list. The accepted then confirm their registration by
 * paying the first installment before the deadline, or the acceptance lapses.
 */
import type { Person } from "./registry";
import { SEASON } from "./season";
import { useStore, type State } from "./store";
import { seeded } from "./utils";

export const MONTHS = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"] as const;

/** One line of the results: a birth year, all of it or some of its months (1–12) */
export type DrawPick = { year: number; months: "all" | number[] };

export type PublishedDraw = { picks: DrawPick[]; by: string; at?: number; label: string };

/** The results the committee announced for 1448 (2026), as published */
export const OFFICIAL_DRAW: DrawPick[] = [
  { year: 1961, months: "all" },
  { year: 1965, months: [1] },
  { year: 1970, months: "all" },
  { year: 1972, months: [1, 2, 3, 4] },
  { year: 1980, months: "all" },
  { year: 1987, months: "all" },
  { year: 1989, months: "all" },
  { year: 1990, months: [1] },
];

/** As published before this demo begins: entered by the lottery desk, approved and published */
export const OFFICIAL_PUBLISHED: PublishedDraw = { picks: OFFICIAL_DRAW, by: "يوسف الزعبي", label: "15 ربيع الآخر 1448 (26 أيلول) — 21:00" };

/** The draw that decides: what the desk published, else the 1448 results (unless the demo cleared them) */
export function publishedDraw(s: Pick<State, "lottery">): PublishedDraw | null {
  const p = s.lottery.published;
  if (p) {
    // One object per publication: the store's subscribers compare by reference
    let d = asDraw.get(p);
    if (!d) asDraw.set(p, (d = { picks: p.picks, by: p.by, at: p.at, label: "" }));
    return d;
  }
  return s.lottery.cleared ? null : OFFICIAL_PUBLISHED;
}

const asDraw = new WeakMap<NonNullable<State["lottery"]["published"]>, PublishedDraw>();

export function usePublishedDraw() {
  return useStore(publishedDraw);
}

/** "جميع الأشهر" or "مواليد كانون الثاني، شباط، آذار، نيسان" */
export function describePick(p: DrawPick) {
  return p.months === "all" ? "جميع الأشهر" : `مواليد ${p.months.map((m) => MONTHS[m - 1]).join("، ")}`;
}

/** The picks in the order of the results table: by year, months in calendar order */
export function sortPicks(picks: DrawPick[]): DrawPick[] {
  return [...picks]
    .map((p) => ({ year: p.year, months: p.months === "all" ? ("all" as const) : [...p.months].sort((a, b) => a - b) }))
    .sort((a, b) => a.year - b.year);
}

/** Year and month of a birth date ("YYYY-MM-DD") */
export function birthOf(person: Pick<Person, "birthDate">) {
  return { year: Number(person.birthDate.slice(0, 4)), month: Number(person.birthDate.slice(5, 7)) };
}

/** The line of the results a birth date falls in, if any */
export function matchingPick(person: Pick<Person, "birthDate">, picks: DrawPick[]) {
  const b = birthOf(person);
  return picks.find((p) => p.year === b.year && (p.months === "all" || p.months.includes(b.month))) ?? null;
}

type HasMembers = { members: { relation: string; person: Person }[] };

/** The member whose birth date the draw is matched against: the main applicant */
export function mainApplicant(app: HasMembers) {
  return (app.members.find((m) => m.relation === "self") ?? app.members[0])?.person;
}

/** A lottery application is accepted when its main applicant's birth year (and month) was drawn */
export function lotteryAccepted(app: HasMembers, picks: DrawPick[]) {
  const p = mainApplicant(app);
  return !!p && !!matchingPick(p, picks);
}

// ───────────────────────── Who registered for the lottery, by birth year and month ─────────────────────────
//
// What the committee needs to know before the broadcast: how many seats (people) and applications
// each birth year and month holds, so drawing stops when the lottery's seats are filled. The figures
// are made up but stable, and calibrated so that the 1448 results fill exactly the lottery's seats.
// Many older Syrians are registered as born in January, hence the heavier first month.

export const POOL_YEARS = { from: SEASON.referenceYear - SEASON.acceptedDirectAge + 1, to: SEASON.rules.applicantMaxBirthYear };

export type PoolCell = { year: number; month: number; seats: number; apps: number };

const LOTTERY_APPS = 53_955;

function buildPool(): PoolCell[] {
  const r = seeded("lottery-pool-1448");
  const raw: { year: number; month: number; w: number; size: number }[] = [];
  for (let year = POOL_YEARS.from; year <= POOL_YEARS.to; year++) {
    const age = SEASON.referenceYear - year;
    const yearW = Math.exp(-(((year - 1969) / 13) ** 2)) + 0.18;
    const size = 1.25 + Math.min(0.75, Math.max(0, (age - 28) / 40));
    for (let month = 1; month <= 12; month++) {
      const jan = month === 1 ? 1.6 + Math.max(0, (age - 40) / 40) : 1;
      raw.push({ year, month, w: yearW * jan * (0.85 + r() * 0.3), size });
    }
  }
  const official = (c: { year: number; month: number }) => OFFICIAL_DRAW.some((p) => p.year === c.year && (p.months === "all" || p.months.includes(c.month)));
  // Seats: the official picks hold exactly the lottery's seats
  const k = SEASON.lotterySeats / raw.filter(official).reduce((a, c) => a + c.w, 0);
  const cells = raw.map((c) => ({ year: c.year, month: c.month, seats: Math.max(1, Math.round(c.w * k)), apps: 0, size: c.size }));
  const officialCells = cells.filter(official);
  officialCells[officialCells.length - 1].seats += SEASON.lotterySeats - officialCells.reduce((a, c) => a + c.seats, 0);
  // Applications: seats over the usual size of an application at that age, scaled to the season's total
  const a = LOTTERY_APPS / cells.reduce((s, c) => s + c.seats / c.size, 0);
  for (const c of cells) c.apps = Math.max(1, Math.round((c.seats / c.size) * a));
  cells[cells.length - 1].apps += LOTTERY_APPS - cells.reduce((s, c) => s + c.apps, 0);
  return cells.map(({ year, month, seats, apps }) => ({ year, month, seats, apps }));
}

export const POOL: PoolCell[] = buildPool();

const inPicks = (c: PoolCell, picks: DrawPick[]) => picks.some((p) => p.year === c.year && (p.months === "all" || p.months.includes(c.month)));

/** Seats and applications a set of picks accepts, and what the whole pool holds */
export function drawTotals(picks: DrawPick[]) {
  const hit = POOL.filter((c) => inPicks(c, picks));
  const seats = hit.reduce((a, c) => a + c.seats, 0);
  const apps = hit.reduce((a, c) => a + c.apps, 0);
  const poolSeats = POOL.reduce((a, c) => a + c.seats, 0);
  const poolApps = POOL.reduce((a, c) => a + c.apps, 0);
  return { seats, apps, poolSeats, poolApps, notAcceptedApps: poolApps - apps, notAcceptedSeats: poolSeats - seats };
}

/** One birth year: its months' seats, and the year's total */
export function poolYear(year: number) {
  const cells = POOL.filter((c) => c.year === year);
  return { year, cells, seats: cells.reduce((a, c) => a + c.seats, 0), apps: cells.reduce((a, c) => a + c.apps, 0) };
}

/** Seats one pick accepts */
export function pickSeats(p: DrawPick) {
  return drawTotals([p]).seats;
}
