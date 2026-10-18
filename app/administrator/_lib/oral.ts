"use client";

import { actions, getState, type AdminProfile, type OralState } from "@/lib/store";
import { seeded } from "@/lib/utils";
import { EXAM_CENTERS } from "./halls";
import { adminName, logAdmin } from "./admin";
import { examRoleOf } from "./structure";

/**
 * الامتحان الشفهي — after the written test. The administration opens the oral exams' days for each role a few days
 * after its written test (operation «admin-orals»); whoever passed the written one picks his time among them in his
 * centre, sits before its committee, and passes or fails: only then is he qualified for the season. A renewal
 * exempt from the written test is exempt from the oral one too. A slot holds a few applicants; its committee
 * records the result (in the demo, a simulation on his side, or the staff's page).
 */

export type OralSlot = { id: string; role: string; centerId: string; day: string; time: string; seats: number; committee: string[] };

/** Each role's oral days, after its written test (4 – 8 October): its committee's members, a women's for the female guides */
const DAYS: Record<string, { days: string[]; committee: string[] }> = {
  "guide-m": { days: ["2026-10-12", "2026-10-13"], committee: ["الشيخ محمد الحسني", "الشيخ عبد الرزاق المصري"] },
  "guide-f": { days: ["2026-10-12", "2026-10-13"], committee: ["الداعية هدى الخطيب", "الداعية أمل السباعي"] },
  "group-deputy": { days: ["2026-10-14", "2026-10-15"], committee: ["مازن الحلبي", "رولا الشامي"] },
  "group-head": { days: ["2026-10-17", "2026-10-18"], committee: ["مازن الحلبي", "رولا الشامي", "الشيخ محمد الحسني"] },
  tech: { days: ["2026-10-19", "2026-10-20"], committee: ["رولا الشامي", "باسل العظمة"] },
};
const TIMES = ["09:00", "10:30", "12:00"];
const SEATS = 8;

/** The oral role a position sits before: its written test's (a grade of a guide sits the guides' committee) */
export const oralRoleOf = (p: AdminProfile | undefined) => (p?.positions[0] ? examRoleOf(p.positions[0]) : undefined);

/** Every oral slot of the season, in every centre (built on first use: the halls' module imports this one's importers) */
let slots: OralSlot[] | null = null;
export const oralSlots = (): OralSlot[] =>
  (slots ??= Object.entries(DAYS).flatMap(([role, d]) =>
    EXAM_CENTERS.flatMap((c) => d.days.flatMap((day) => TIMES.map((time) => ({ id: `oral-${role}-${c.id}-${day}-${time.replace(":", "")}`, role, centerId: c.id, day, time, seats: SEATS, committee: d.committee })))),
  ));
export const slotOf = (id: string | undefined) => oralSlots().find((s) => s.id === id);

/** When a slot sits, on the demo's clock */
export const slotAt = (s: OralSlot) => new Date(`${s.day}T${s.time}:00+03:00`).getTime();
export const slotLabel = (s: OralSlot) =>
  `${new Intl.DateTimeFormat("ar-SY-u-nu-latn", { weekday: "long", day: "numeric", month: "long" }).format(slotAt(s))} — الساعة ${s.time}`;

/** The applicants the season already seated in a slot before the demo (its seats are never all free) */
export const seededTaken = (s: OralSlot) => Math.floor(seeded(`${s.id}-taken`)() * (s.seats - 2));

/** Who booked a slot on this device, and how many seats it has left */
export function slotLoad(s: OralSlot, admins: Record<string, AdminProfile>) {
  const booked = Object.values(admins).filter((a) => a.oral?.slotId === s.id);
  return { booked, left: Math.max(0, s.seats - seededTaken(s) - booked.length) };
}

export const ORAL_STATUS: Record<OralState["status"], string> = { booked: "محجوز", passed: "ناجح", failed: "راسب", absent: "غائب" };

export const oralActions = {
  /** Book a time, or move to another before it sits */
  book(id: string, slotId: string) {
    const s = slotOf(slotId);
    if (!s) return;
    const before = slotOf(getState().admins[id]?.oral?.slotId);
    actions.upsertAdmin(id, { oral: { slotId, bookedAt: Date.now(), status: "booked" } });
    logAdmin(id, before ? "تغيير موعد الامتحان الشفهي" : "حجز موعد الامتحان الشفهي", slotLabel(s), EXAM_CENTERS.find((c) => c.id === s.centerId)?.name);
  },
  cancel(id: string) {
    actions.upsertAdmin(id, { oral: undefined });
    logAdmin(id, "إلغاء حجز الامتحان الشفهي");
  },
  /** The committee's result: passed or failed with its mark and its word, or absent */
  record(id: string, status: Exclude<OralState["status"], "booked">, by: string, score?: number, note?: string) {
    const cur = getState().admins[id]?.oral;
    actions.upsertAdmin(id, { oral: { slotId: cur?.slotId ?? "", bookedAt: cur?.bookedAt ?? Date.now(), status, score, note, by, at: Date.now() } });
    actions.logEvent({ actor: by, role: "لجنة الامتحان الشفهي", action: `نتيجة الامتحان الشفهي: ${ORAL_STATUS[status]}`, target: adminName(id), detail: [score !== undefined ? `${score}%` : "", note ?? ""].filter(Boolean).join(" — "), system: "exams", area: "oral", ref: id });
  },
};

/** What each committee asks, as the applicant is told when he books */
export const ORAL_TOPICS: Record<string, string> = {
  "guide-m": "تلاوة من القرآن الكريم وحفظ، وأحكام المناسك، ومسائل يسأل عنها الحجاج، وأسلوب الدرس والتوجيه",
  "guide-f": "تلاوة من القرآن الكريم وحفظ، وأحكام المناسك الخاصة بالمرأة، ومسائل تسأل عنها الحاجّات، وأسلوب الدرس",
  "group-deputy": "متابعة الحجاج في التجمّعات والتنقّل، والطوارئ، ومساندة رئيس المجموعة",
  "group-head": "قيادة المجموعة ومواقفها اليومية، والتواصل مع الحجاج وأسرهم، والأنظمة والتعليمات",
  tech: "منصة الحج وتسجيل الحجاج وملفاتهم الصحية، والأعطال الشائعة وحلولها، وخدمة الحجاج كبار السن",
};

/** A demo administrator's oral exam, passed in his role's first slot in Damascus (the season's story is past it) */
export function demoOral(examRole: string, at: number): OralState {
  const s = oralSlots().find((x) => x.role === examRole && x.centerId === "damascus") ?? oralSlots()[0];
  return { slotId: s.id, bookedAt: at - 3 * 86_400_000, status: "passed", score: 80 + Math.floor(seeded(`${examRole}-oral`)() * 15), by: s.committee[0], at };
}
