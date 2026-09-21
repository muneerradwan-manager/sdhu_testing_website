"use client";

/**
 * Demo pilgrims that open on a later stage: an application already submitted a while ago, so the
 * tracking timeline has reached its result. "notAccepted" shows the one-tap move to the lottery;
 * "accepted" opens straight on the steps after acceptance.
 */
import { firstPayment, seasonPlan } from "./installments";
import { applicationNumberFor } from "./journey";
import { DEMO_SCENARIOS, getPerson, type Person } from "./registry";
import type { Member } from "./rules";
import { SEASON, officeFor } from "./season";
import { actions, type StoreState } from "./store";

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
};

export function seedPilgrimScenario(id: string, state: Pick<StoreState, "applications">, now: number) {
  const scenario = DEMO_SCENARIOS.find((s) => s.id === id);
  const family = FAMILIES[id];
  if (!scenario?.seed || !family || state.applications[id]) return;
  const people = family.map((f) => ({ ...f, person: getPerson(f.id) }));
  if (people.some((p) => !p.person)) return;
  // companionOf = the elderly member this person accompanies
  const members = people.map((p) => {
    const escort = people.find((o) => o.companionOf === p.id);
    return member(p.person!, p.relation, escort ? { companionId: escort.id } : {});
  });
  const number = applicationNumberFor(id);
  // Direct acceptance: the fee and the first installment (two-installment plan) were paid with the registration.
  // Lottery: the fee only — the first installment is due now that the name came out in the draw.
  const lottery = scenario.seed === "lotteryAccepted";
  const first = lottery ? 0 : firstPayment(seasonPlan(), members.length);
  const governorate = members[0].person.governorate;
  // Submitted a minute ago: the demo timeline (seconds) has already reached the result
  const at = now - 60_000;
  actions.saveApplication({
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
  });
}
