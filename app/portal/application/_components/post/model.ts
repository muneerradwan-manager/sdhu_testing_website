/**
 * Pure helpers for the interactive "after acceptance" checklist (spec phases 5 – 9).
 * Everything is derived from `PostAcceptance` and the application in the store, so reloads keep their place.
 *
 * Nothing about documents or health is asked at registration. After acceptance:
 * 1) the pilgrim confirms — a lottery winner also chooses the payment plan and pays the first installment
 *    (direct acceptance paid it with the registration);
 * 2) uploads a personal photo for every member — the photo alone: the passport waits for the second payment, and no
 *    medical document comes before the group;
 * 3) in the assignment window, reads the group directory and contacts a group: that group's coordinator
 *    enrolls the whole family and both sign the pilgrim–group contract;
 * 4) pays the rest of the Hajj cost by the chosen plan, with the sacrifice and any private rooms;
 *    then, only once that second payment is in, uploads the passport of every member;
 * 5) only after joining a group: the medical file — vaccination certificates and the other medical
 *    documents (the list the administration sets), and the health information the group's coordinator records; 6) visa.
 *
 * The steps themselves, their order and their words are the published registration version's
 * (lib/registration); what decides that a step is complete is lib/registration/post.ts, shared with the
 * services that record it.
 */
import { ageOf, fullName } from "@/lib/registry";
import type { Member } from "@/lib/rules";
import { useClusterDirectory } from "@/lib/cluster-profile";
import { accommodationCost } from "@/lib/rooms";
import { DEFAULT_POST_STEPS } from "@/lib/registration/defaults";
import { DOCS, docKey } from "@/lib/registration/post";
import { actions, type AdminProfile, type Application, type DocStatus, type HealthFile, type PostAcceptance } from "@/lib/store";

export {
  DOCS,
  STEP_DOCS,
  costLines,
  docKey,
  docStatus,
  medicalDocsFor,
  medicalDone,
  medicalKey,
  memberDocsDone,
  paidAt,
  receiptBase,
  stepsDone,
  type CostLine,
  type DocKey,
  type MedicalDoc,
} from "@/lib/registration/post";

/** The leader of مجموعة اللطيف (key 27) in the administrator portal (lib/registry: أحمد سليمان الحمصي) */
export const LEADER_ID = "01033300871";
/** The technical coordinator of مجموعة اللطيف (key 27) — he enrolls pilgrims into the group and takes their health files (lib/registry: سامر نبيل نجار) */
export const COORDINATOR_ID = "01033300874";

/** Restarting the demo: drop the group leader's "received" mark and the needs the health file wrote into the application */
export function clearJoinDecisions(sessionId: string, admins: Record<string, AdminProfile>, app?: Application) {
  for (const [id, a] of Object.entries(admins)) {
    if (!a.joinDecisions?.[sessionId]) continue;
    const rest = Object.fromEntries(Object.entries(a.joinDecisions).filter(([sid]) => sid !== sessionId));
    actions.upsertAdmin(id, { joinDecisions: rest });
  }
  if (app) actions.saveApplication({ ...app, members: app.members.map((m) => ({ ...m, needs: [] })) });
}

export const EMPTY_POST: PostAcceptance = { documents: {}, payments: {}, ratings: {} };

/** Everything cleared — merged over the stored record by actions.setPost */
export const RESET_POST: Partial<PostAcceptance> = {
  confirmedAt: undefined,
  documents: {},
  rejectedOnce: [],
  clusterId: undefined,
  groupNumber: undefined,
  enrolledBy: undefined,
  groupApprovedAt: undefined,
  transfers: [],
  health: undefined,
  healthDocs: undefined,
  medical: {},
  payments: {},
  contractSignedAt: undefined,
  visaAt: undefined,
  ratings: {},
  custom: {},
};

export type StepKey = "confirm" | "documents" | "group" | "payment" | "passport" | "medical" | "visa";

/** The platform's seven steps as shipped; what a pilgrim sees is his application's version (useApplicationSteps) */
export const STEPS = DEFAULT_POST_STEPS.map((s) => ({ key: s.system as StepKey, title: s.title, short: s.short, emoji: s.emoji, question: s.question }));

/** 69+ need a dedicated companion — the oldest one gets the spec's expired-passport case */
export function elderlyMembers(members: Member[]) {
  return members.filter((m) => ageOf(m.person) >= 69).sort((a, b) => ageOf(b.person) - ageOf(a.person));
}

export function passportCaseMember(members: Member[]) {
  return elderlyMembers(members)[0] ?? null;
}

/** Statuses written the moment the pilgrim confirms: nothing was uploaded at registration */
export function initialDocuments(members: Member[]): Record<string, DocStatus> {
  const out: Record<string, DocStatus> = {};
  for (const m of members) for (const d of DOCS) out[docKey(m, d.key)] = "missing";
  return out;
}

// ───────────────────────── Health file ─────────────────────────

export const CONDITIONS = ["سكري", "ضغط الدم", "أمراض القلب", "ربو أو أمراض تنفسية", "أمراض الكلى", "حساسية دوائية"] as const;
export const NEEDS = ["كرسي متحرك", "صعوبة في المشي", "وجبة خاصة", "غرفة قريبة من المصعد", "ضعف السمع أو البصر", "أكسجين ليلي"] as const;

/** Needs the placement takes into account (a room near the lift, the ground floor), at no extra cost */
export const ROOM_NEEDS: string[] = ["كرسي متحرك", "صعوبة في المشي", "غرفة قريبة من المصعد", "أكسجين ليلي"];

/** The private rooms this request asked for, at its cluster's prices as the pilgrims see them; null for the shared accommodation */
export function useRoomCost(app: Application | null | undefined, post: PostAcceptance | null | undefined) {
  const clusters = useClusterDirectory();
  const cluster = clusters.find((c) => c.slug === post?.clusterId);
  return app && cluster ? accommodationCost(post?.accommodation, cluster.rooms) : null;
}

/** Needs recorded in the health file flow back into the application (rooms, meals, costs, roster) */
export function membersWithHealth(members: Member[], health: HealthFile): Member[] {
  return members.map((m) => {
    const rec = health.members[m.person.id];
    return rec ? { ...m, needs: [...rec.conditions, ...rec.needs] } : m;
  });
}

/**
 * The coordinator saves a family's health file: stored on the pilgrim's post-acceptance record, and the
 * needs flow into the application so rooms, meals, costs and the group roster follow them.
 */
export function recordHealth(sessionId: string, app: Application, health: HealthFile, actorRole = "منسق تقني") {
  actions.setPost(sessionId, { health });
  actions.saveApplication({ ...app, members: membersWithHealth(app.members, health) });
  const needs = Object.values(health.members).flatMap((r) => [...r.conditions, ...r.needs]);
  actions.logEvent({
    actor: health.by.name,
    role: actorRole,
    action: "تسجيل الملف الصحي بعد القبول",
    target: `طلب ${app.number}`,
    detail: `${app.members.length} أفراد — ${needs.length ? `حالات مسجّلة: ${[...new Set(needs)].join("، ")}` : "لا حالات خاصة"}`,
  });
}

/** Demo record the simulated coordinator writes: the family's real profile from the operating document */
export function demoHealth(members: Member[], by: { id: string; name: string }, at: number): HealthFile {
  const recs: HealthFile["members"] = {};
  for (const m of members) {
    const age = ageOf(m.person);
    recs[m.person.id] =
      age >= 75
        ? { conditions: ["ضغط الدم", "سكري"], needs: ["كرسي متحرك", "غرفة قريبة من المصعد"], medications: "أملوديبين 5 ملغ صباحاً، ميتفورمين 500 ملغ مرتين" }
        : age >= 55
          ? { conditions: ["ضغط الدم"], needs: [], medications: "حبة ضغط صباحاً" }
          : { conditions: [], needs: [], medications: "" };
  }
  return { by, at, members: recs };
}

/** The person each elderly member leans on (the spec's transfer warning) */
export function companionOf(members: Member[], m: Member) {
  return members.filter((e) => e.companionId === m.person.id);
}

export function nameOf(m: Member) {
  return fullName(m.person);
}
