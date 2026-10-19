"use client";

/**
 * Demo pilgrims that open on a later stage: an application already submitted a while ago, so the
 * tracking timeline has reached its result. "notAccepted" shows the one-tap move to the lottery;
 * "accepted" opens straight on the steps after acceptance; "complete" has done every one of them — in his
 * group by contract, everything paid, passports and medical file approved, visa and flight — so the season
 * itself is all that is left to try.
 */
import { firstPayment, seasonPlan } from "./installments";
import { applicationNumberFor } from "./journey";
import { DEMO_SCENARIOS, getPerson, type Person } from "./registry";
import type { Member } from "./rules";
import { SEASON, officeFor } from "./season";
import { attachByStaff, DEMO_ATTACHER, demoContractFile } from "./assignment";
import { costLines, docKey, medicalDocsFor, medicalKey } from "./registration/post";
import { simulateGroupFlights } from "./flights";
import { actions, getState, type Application, type StoreState } from "./store";
import { COORDINATOR_ID, demoHealth, recordHealth } from "@/app/portal/application/_components/post/model";
import { demoVisaNumber } from "@/lib/visas";

const member = (p: Person, relation: Member["relation"], extra: Partial<Member> = {}): Member => ({ person: p, relation, relationVerified: true, needs: [], ...extra });

/** Members of each seeded family, applicant first */
const FAMILIES: Record<string, { id: string; relation: Member["relation"]; companionOf?: string }[]> = {
  "01066600620": [
    { id: "01066600620", relation: "self" },
    { id: "01066600621", relation: "spouse" },
  ],
  "01088800910": [
    { id: "01088800910", relation: "self" },
    { id: "01088800911", relation: "spouse" },
  ],
  "01055500730": [
    { id: "01055500730", relation: "self" },
    { id: "01055500731", relation: "child", companionOf: "01055500730" },
  ],
  "01044400750": [
    { id: "01044400750", relation: "self" },
    { id: "01044400751", relation: "spouse" },
  ],
  "01058100960": [
    { id: "01058100960", relation: "self" },
    { id: "01058100961", relation: "spouse" },
  ],
  "01058200970": [
    { id: "01058200970", relation: "self" },
    { id: "01058200971", relation: "spouse" },
  ],
};

/** «complete»'s group: مجموعة اللطيف in تكتل النور, whose team the demo administrators are */
const COMPLETE_GROUP = { clusterId: "al-nour", number: 27 };

export function seedPilgrimScenario(id: string, state: Pick<StoreState, "applications">, now: number) {
  const scenario = DEMO_SCENARIOS.find((s) => s.id === id);
  const family = FAMILIES[id];
  // A «complete» family already here (a browser that tried it before): on its group's flights, if it is not yet
  if (scenario?.seed === "complete" && state.applications[id]) {
    const st = getState();
    if (st.post[id]?.visaAt) simulateGroupFlights(id, st.applications[id], st.post[id], st.admins, st.post, st.applications);
    return;
  }
  if (!scenario?.seed || !family || state.applications[id]) return;
  const notDrawn = scenario.seed === "notDrawn";
  const people = family.map((f) => ({ ...f, person: getPerson(f.id) }));
  if (people.some((p) => !p.person)) return;
  // companionOf = the elderly member this person accompanies
  const members = people.map((p) => {
    const escort = people.find((o) => o.companionOf === p.id);
    return member(p.person!, p.relation, escort ? { companionId: escort.id } : {});
  });
  // «notDrawn» registered on direct acceptance first: that application closed, and this one is the lottery's
  const number = applicationNumberFor(notDrawn ? `${id}-L` : id);
  // Direct acceptance: the fee and the first installment (two-installment plan) were paid with the registration.
  // Lottery: the fee only — the first installment confirms the registration, now that the main applicant's birth
  // year (1980) was drawn.
  const lottery = scenario.seed === "lotteryAccepted" || notDrawn;
  const complete = scenario.seed === "complete";
  const first = lottery ? 0 : firstPayment(seasonPlan(), members.length);
  const governorate = members[0].person.governorate;
  // Submitted a minute ago: the demo timeline (seconds) has already reached the result; a «complete» one months ago
  const at = complete ? now - 90 * 86_400_000 : now - 60_000;
  const app: Application = {
    number,
    applicantId: id,
    createdAt: at,
    submittedAt: at,
    mode: members.length === 1 ? "solo" : "booklet",
    track: lottery ? "lottery" : "direct",
    forWhom: "me",
    members,
    governorate,
    office: officeFor(governorate),
    receipt: `1448-R-${number.padStart(6, "0")}`,
    paid: members.length * SEASON.fees.registrationPerPerson + first,
    plan: lottery ? undefined : seasonPlan(),
    firstPaid: lottery ? undefined : { amount: first, at, receipt: `1448-P-${number.padStart(6, "0")}-1` },
    payMethod: "shamcash",
    ratings: {},
    // Not accepted on direct registration: the direct seats ran out at 69, above those born in 1958
    ...((scenario.seed === "notAccepted" || notDrawn) && { announcedDirectAge: 69 }),
    ...(notDrawn && { previous: { number: applicationNumberFor(id), track: "direct" as const, submittedAt: at - 40 * 86_400_000, closedAt: at - 30 * 86_400_000 } }),
  };
  actions.saveApplication(app);
  if (complete) completeSteps(id, app, now);
}

/**
 * Every step after acceptance done, each on its day in the past: acceptance confirmed, the photos approved, the
 * family attached to its group by its contract at the office, the coordinator's health file confirmed and the
 * medical documents approved, everything paid in the shared accommodation, the passports approved, and the visa
 * issued — which puts the family on its group's outbound and return flights
 */
function completeSteps(id: string, app: Application, now: number) {
  const day = 86_400_000;
  const docs = Object.fromEntries(app.members.flatMap((m) => (["photo", "passport"] as const).map((d) => [docKey(m, d), "approved" as const])));
  actions.setPost(id, { confirmedAt: now - 80 * day, documents: docs, accommodation: { kind: "general" }, ratings: {}, payments: {} });
  attachByStaff({ sessionId: id, app, post: undefined, group: COMPLETE_GROUP, staff: DEMO_ATTACHER, file: demoContractFile(app, COMPLETE_GROUP.number), at: now - 60 * day });
  const health = { ...demoHealth(app.members, { id: COORDINATOR_ID, name: "سامر نجار" }, now - 50 * day), confirmedAt: now - 49 * day };
  recordHealth(id, app, health);
  const medical = Object.fromEntries(app.members.flatMap((m) => medicalDocsFor(m, health).map((d) => [medicalKey(m, d), "approved" as const])));
  const lines = costLines(app, { hajjCost: SEASON.fees.hajjCost, firstInstallment: SEASON.fees.firstInstallment, hady: SEASON.fees.hady });
  const payments = Object.fromEntries(lines.filter((l) => l.key !== "i1").map((l) => [l.key, now - 40 * day]));
  // the group's head added each member's visa as it reached him from the Saudi foreign ministry
  const visas = Object.fromEntries(app.members.map((m, i) => [m.person.id, { number: demoVisaNumber(app.number, i), at: now - 10 * day, by: "رئيس المجموعة" }]));
  actions.setPost(id, { medical, payments, visaAt: now - 10 * day, visas });
  // With the last visa the family goes on its group's flights, as its cluster's head put the group on them
  const st = getState();
  if (st.post[id]) simulateGroupFlights(id, app, st.post[id], st.admins, st.post, st.applications);
}
