/**
 * One account per person, and what it does season by season (lib/account.ts): the path chosen or inferred, the
 * rule of one path per season, the record of every season, and the Academy kept on the account. Run: npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canChangePath, currentSeasonOf, lastParticipation, participations, seasonPathOf } from "../lib/account";
import { getPerson } from "../lib/registry";
import { academyKey, getState, type AdminProfile, type Application, type State } from "../lib/store";

const OWNER = "01012345412"; // محمد الخطيب: تقدّم في 1446 ولم يُقبل
const RENEWING = "01033300899"; // معتصم العرقسوسي: رئيس مجموعة في 1447 بتقييم 4.4
const FRESH = "09099912345";

function base(over: Partial<State> = {}): State {
  return { ...structuredClone(getState()), ...over };
}
const account = (id: string) => ({ nationalId: id, phone: "0944000000", password: "x", createdAt: 0 });
const admin = (id: string, patch: Partial<AdminProfile> = {}): AdminProfile => ({ nationalId: id, createdAt: 0, phone: "", positions: [], languages: [], skills: [], documents: [], joinDecisions: {}, musters: [], ...patch });
const app = (owner: string, members: string[] = [owner]): Application => ({
  number: "1448-000001",
  applicantId: owner,
  createdAt: 0,
  submittedAt: 0,
  mode: "solo",
  forWhom: "me",
  members: members.map((m, i) => ({ person: getPerson(m)!, relation: i ? "spouse" : "self", relationVerified: true, needs: [] })) as Application["members"],
  governorate: "دمشق",
  office: "مكتب دمشق",
  receipt: "R",
  paid: 25,
  payMethod: "shamcash",
  ratings: {},
  season: 1448,
});

describe("seasonPathOf", () => {
  it("is nothing for an account that only learns", () => {
    const s = base({ accounts: { [FRESH]: account(FRESH) } });
    assert.equal(currentSeasonOf(s), 1448);
    assert.equal(seasonPathOf(s, FRESH), null);
  });

  it("follows the choice, then what he did", () => {
    const chosen = base({ accounts: { [FRESH]: { ...account(FRESH), seasons: { 1448: { path: "admin", chosenAt: 1 } } } } });
    assert.equal(seasonPathOf(chosen, FRESH), "admin");
    const applied = base({ accounts: { [OWNER]: account(OWNER) }, applications: { [OWNER]: app(OWNER) } });
    assert.equal(seasonPathOf(applied, OWNER), "pilgrim");
    const drafting = base({ accounts: { [OWNER]: account(OWNER) }, drafts: { [OWNER]: { updatedAt: 0, history: [], track: "direct", members: [], book: null, residence: "سوريا", maxPhase: 0, consents: {} } } });
    assert.equal(seasonPathOf(drafting, OWNER), "pilgrim");
    const serving = base({ accounts: { [RENEWING]: account(RENEWING) }, admins: { [RENEWING]: admin(RENEWING, { positions: ["group-head"] }) } });
    assert.equal(seasonPathOf(serving, RENEWING), "admin");
  });

  it("counts a companion in someone else's application as a pilgrim of the season", () => {
    const wife = "01012345413";
    const s = base({ accounts: { [wife]: account(wife) }, applications: { [OWNER]: app(OWNER, [OWNER, wife]) } });
    assert.equal(seasonPathOf(s, wife), "pilgrim");
  });

  it("lets a choice be taken back only while nothing was started on it", () => {
    const chose = base({ accounts: { [FRESH]: { ...account(FRESH), seasons: { 1448: { path: "admin", chosenAt: 1 } } } }, admins: { [FRESH]: admin(FRESH) } });
    assert.equal(canChangePath(chose, FRESH), true);
    const applied = base({ ...chose, admins: { [FRESH]: admin(FRESH, { positions: ["tech"], eligibleAt: 1 }) } });
    assert.equal(canChangePath(applied, FRESH), false);
  });

  it("asks again in a new season, the old one kept as it was", () => {
    const s = base({ accounts: { [RENEWING]: account(RENEWING) }, admins: { [RENEWING]: admin(RENEWING, { positions: ["group-head"] }) } });
    s.formation = { ...s.formation, season: 1449 };
    assert.equal(seasonPathOf(s, RENEWING, 1449), null);
    assert.equal(seasonPathOf(s, RENEWING, 1448), "admin");
  });
});

describe("participations", () => {
  it("joins the pilgrim's and the administrator's seasons, oldest first, with this one last", () => {
    const rows = participations(base({ accounts: { [RENEWING]: account(RENEWING) } }), RENEWING);
    assert.deepEqual(rows.map((r) => r.season), [1446, 1447, 1448]);
    assert.equal(rows[1].kind, "admin");
    assert.equal(rows[1].rating, 4.4);
    assert.equal(rows.at(-1)!.current, true);
    assert.equal(rows.at(-1)!.kind, "none");
  });

  it("finds the last season he took part in, to ask him how he goes on", () => {
    const s = base({ accounts: { [OWNER]: account(OWNER), [RENEWING]: account(RENEWING), [FRESH]: account(FRESH) } });
    assert.equal(lastParticipation(s, OWNER)?.kind, "pilgrim");
    assert.equal(lastParticipation(s, RENEWING)?.kind, "admin");
    assert.equal(lastParticipation(s, FRESH), null);
  });
});

describe("the Academy", () => {
  it("keeps each account's lessons under its own number", () => {
    assert.equal(academyKey(OWNER, "hajj-fiqh/tawaf-steps"), `${OWNER}:hajj-fiqh/tawaf-steps`);
  });
});
