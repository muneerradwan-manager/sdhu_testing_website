"use client";

import { useSyncExternalStore } from "react";
import type { Member } from "./rules";
import type { DrawPick } from "./lottery";
import type { Accommodation } from "./rooms";
import type { Answers, AppPolicy, RegState } from "./registration/types";
import { SEASON } from "./season";

/** What an account does in a season: registers on the Hajj, or serves as an administrator — never both in one season */
export type SeasonPath = "pilgrim" | "admin";

/**
 * One account per person on the platform, with no type: whoever creates it may only learn in the Academy, and
 * each season chooses what to do with it — apply for the Hajj, or apply for an administrative role (whose file,
 * `admins[id]`, opens on this account the first time). Next season he may choose otherwise; nothing he did in an
 * earlier season is ever removed.
 */
export type Account = {
  nationalId: string;
  phone: string;
  email?: string;
  password: string;
  createdAt: number;
  emergencyName?: string;
  emergencyPhone?: string;
  altPhone?: string;
  rating?: number;
  /** Details the pilgrim says the civil registry got wrong: «غير مؤكدة» until a registration officer decides */
  civil?: CivilClaim;
  /** What he chose to do in each Hijri season (lib/account.ts infers it from what he did when he chose nothing) */
  seasons?: Record<number, { path: SeasonPath; chosenAt: number }>;
};

/**
 * A correction of the civil record, asked when the account is created: each field with what the registry
 * holds and what the pilgrim says is right, and the document that proves it. The officer of «مراجعة الطلبات»
 * approves or rejects it with a reason the pilgrim reads.
 */
export type CivilClaim = {
  fields: { key: string; label: string; registry: string; claimed: string }[];
  doc: { kind: string; name: string };
  note?: string;
  at: number;
  status: "pending" | "approved" | "rejected";
  decision?: { note: string; by: string; at: number };
};

export type Application = {
  number: string;
  applicantId: string;
  createdAt: number;
  /** Tracking timeline is computed from this timestamp so reloads keep their place */
  submittedAt: number;
  mode: "booklet" | "national" | "solo";
  forWhom: "me" | "other";
  members: Member[];
  /** Derived, never chosen: the applicant's governorate (or the coordinator's) and its single office */
  governorate: string;
  office: string;
  /** Receipt of the registration fee */
  receipt: string;
  /** Everything paid when registering: the fee, plus the first installment on direct acceptance */
  paid: number;
  /** Hajj cost plan in force when the application was filed — set by the administration for the season, not chosen */
  plan?: 1 | 2;
  /**
   * First installment paid at registration (direct acceptance) or at the lottery result. When a pilgrim
   * not accepted directly moves to the lottery, it carries over as a credit — refunded if not drawn.
   */
  firstPaid?: { amount: number; at: number; receipt: string; creditFrom?: string };
  /** ShamCash or the approved bank (with an uploaded payment slip). "card" only in applications saved before ShamCash */
  payMethod: "shamcash" | "bank" | "card";
  ratings: Record<string, number>;
  /**
   * Which registration this application was made in. The two are separate: direct acceptance (oldest
   * first, 65%) opens first; the lottery (35%) opens afterwards as its own application. Missing = "direct"
   * (applications saved before the two were separated).
   */
  track?: "direct" | "lottery";
  /** A direct-acceptance application that was not accepted, kept for the record when registering for the lottery */
  /** The demo's simulated conditions («<member id>:<key>»): treated as met at registration, and in the result */
  simulated?: string[];
  /** The direct-acceptance age announced for this application's round, when it is not the season's (the seats ran out above it) */
  announcedDirectAge?: number;
  previous?: { number: string; track: "direct"; submittedAt: number; closedAt: number };
  /**
   * Filed by an authorised administrator on the citizen's behalf (the technical coordinator at a branch
   * office). Absent when the pilgrim filed it himself. This is a plain registration: it does NOT put the
   * pilgrims in the coordinator's group — groups are joined only in the assignment window.
   */
  submittedBy?: { id: string; name: string; position: string };
  /** The Hijri season it was filed in (1448 when absent: applications from before seasons were kept) */
  season?: number;
  /** The registration version it was started on (lib/registration): its stages, questions and steps */
  configVersion?: string;
  /** The season's terms frozen at submission: what it owes and what decided it never move afterwards */
  policy?: AppPolicy;
  /** Answers to the version's own questions, by question key; per member by national id */
  answers?: Answers;
  memberAnswers?: Record<string, Answers>;
  /** The confirmed payment it was submitted against (lib/registration: the ledger) */
  paymentRef?: string;
};

// ───────────── Staff, administrators, operations (phase 2) ─────────────

/** Append-only audit trail (سجل الأحداث) — nothing is ever edited or removed */
export type AuditEvent = {
  id: string;
  at: number;
  actor: string;
  role: string;
  action: string;
  target?: string;
  detail?: string;
  before?: string;
  after?: string;
  /** The system the event belongs to (lib/systems.ts), so its owner and the director can follow it */
  system?: string;
  /** Worth the director's attention: it reaches «صلاحيات الإدارة», not only the system's own records */
  important?: boolean;
  /** The part of the system it concerns (a tab of its management page), where its record is shown */
  area?: string;
  /** The record it concerns — a centre's, an exam's or an applicant's id — for that record's own history */
  ref?: string;
};

/** Registration staff decision on an application that needed human review */
export type Review = { status: "approved" | "rejected"; note: string; by: string; at: number };

/** Season settings edited by the season director; merged over SEASON by useSeason() */
/**
 * What the administration changed this season in the administrators rules: the exam, its question
 * bank, the list of roles, the commitments and the calendar. Empty means the season runs on the
 * defaults the platform ships with.
 */
export type AdminRules = {
  /** Each role's test as it was built before tests were kept whole in examHalls.exams (read into them) */
  blueprints?: Record<string, import("./data/admin-exam").ExamBlueprint>;
  /** Questions the administration wrote this season, of any type */
  questionsAdded?: import("./data/admin-exam").ExamQuestion[];
  /** Questions taken out of the bank this season */
  questionsOff?: number[];
  /** Questions whose wording, options, answer or explanation the administration edited */
  questionEdits?: Record<number, { text?: string; options?: string[]; answer?: number; explanation?: string; points?: number }>;
  /** Questions moved to other roles' exams: question id -> the roles whose exam includes it */
  questionRoles?: Record<number, string[]>;
  /**
   * The season's structure as the holder of «إدارة الإداريين» left it (app/administrator/_lib/structure):
   * the roles and their behaviors, the ready seasonal labels, the branches, the clusters' tiers, the groups'
   * categories, each category's seats and pilgrims under each tier, each tier's cluster composition, and the
   * early deadline of the cluster requests. A missing one is the platform's.
   */
  roles?: import("../app/administrator/_lib/structure").RoleDef[];
  roleLabels?: import("../app/administrator/_lib/structure").RoleLabel[];
  branches?: import("../app/administrator/_lib/structure").Branch[];
  tiers?: import("../app/administrator/_lib/structure").Tier[];
  categories?: import("../app/administrator/_lib/structure").Category[];
  categoryRules?: Record<string, Record<string, import("../app/administrator/_lib/structure").CategoryRule>>;
  composition?: Record<string, import("../app/administrator/_lib/structure").Composition>;
  earlyDeadline?: string;
  /** Its hour on that day ("HH:MM"); the day's end when absent */
  earlyTime?: string;
  /** Commitments dropped this season, and edited wording */
  commitmentsOff?: string[];
  commitmentEdits?: Record<string, { label?: string; detail?: string }>;
  /**
   * Which roles hold each of the administrators' permissions («التسجيل على الحج»، «إلحاق الحجاج بالمجموعة»),
   * once the administration changed the table: permission -> role keys (app/administrator/_lib/permissions)
   */
  rolePermissions?: Partial<Record<string, string[]>>;
  /** The administrators calendar, once the administration edits a row */
  calendar?: { hijri: string; title: string; detail: string }[];
  /** The stages an administrator is evaluated through, once the administration edits them */
  stages?: { key: string; label: string; hint: string }[];
  /**
   * The season's table of role requirements, once the administration edits it: its rows (conditions)
   * and, per role, the value each condition takes. An administrator applies only for a role he meets.
   */
  requirements?: { rows: string[]; cells: Record<string, Record<string, number | string | boolean>> };
  /** Certificates the administration added to the list this season (the platform's own list is in the administrator lib) */
  docTypes?: { key: string; label: string; hint: string; validSeasons: number }[];
  /**
   * The lists an administrator's file is built from, as the holder of «إدارة الإداريين» left them: the
   * platform's own documents reworded or set aside this season, and skills and languages added or set aside.
   * An added skill's key is its name, so it reads right wherever the file is shown.
   */
  docEdits?: Record<string, { label?: string; hint?: string; validSeasons?: number }>;
  docsOff?: string[];
  skillsAdded?: { key: string; label: string; emoji: string }[];
  skillsOff?: string[];
  languagesAdded?: string[];
  languagesOff?: string[];
};

export type SeasonOverrides = Partial<{
  applicantMaxBirthYear: number;
  companionMaxBirthYear: number;
  womanNeedsMahramMinBirthYear: number;
  elderlyNeedsCompanionMaxBirthYear: number;
  maxCompanions: number;
  maxCompanionsFamily: number;
  quota: number;
  directShare: number;
  acceptedDirectAge: number;
  registrationPerPerson: number;
  hajjCost: number;
  firstInstallment: number;
  /** Hajj cost in 1 payment or 2 installments — the administration decides for the season */
  installmentCount: number;
  /** Administrators: rating needed to keep last season's role (the clusters' numbers are the structure's: app/administrator/_lib/structure) */
  keepRoleMinRating: number;
  /** The administrator's own fees: the seasonal registration, forming a group, forming a cluster */
  administratorRegistration: number;
  groupFormation: number;
  clusterFormation: number;
  /** How many seasons each administrator document stays valid (0 = never expires) */
  firstAidValidSeasons: number;
  recordValidSeasons: number;
  recommendationValidSeasons: number;
  /** Classification: the share of each tier promoted, the share demoted, and how many are honoured */
  promoteShare: number;
  demoteShare: number;
  honorTop: number;
  hady: number;
}>;

/** A cluster's meals: the time of each («06:00 – 09:00») and, optionally, its menu, for the Makkah hotel and the Madinah hotel */
export type ClusterMeals = {
  makkah: { breakfast: string; lunch: string };
  madinah: { breakfast: string; lunch: string };
  menus?: { makkah: { breakfast?: string; lunch?: string }; madinah: { breakfast?: string; lunch?: string } };
  at: number;
  by: string;
};

export type TicketKind = "health" | "missing" | "transport" | "meal" | "room" | "lost" | "complaint";
export type Ticket = {
  id: string;
  at: number;
  /** Pilgrim account (session id) that raised it, if any */
  applicantId?: string;
  name: string;
  kind: TicketKind;
  severity: "low" | "medium" | "high" | "critical";
  location: string;
  text: string;
  status: "open" | "in_progress" | "resolved";
  assignee: string;
  updates: { at: number; by: string; text: string }[];
  rating?: number;
};

export type DocStatus = "missing" | "uploaded" | "rejected" | "approved";

/** One pilgrim's health file, taken by the group's coordinator after acceptance */
export type HealthRecord = {
  conditions: string[];
  needs: string[];
  medications: string;

};

export type HealthFile = {
  by: { id: string; name: string };
  at: number;
  members: Record<string, HealthRecord>;
  /** The pilgrim checked what the coordinator recorded */
  confirmedAt?: number;
};

/** The pilgrim–group contract as it was uploaded, and the office's decision on it */
export type PilgrimContract = {
  groupNumber: number;
  clusterId?: string;
  status: "pending" | "approved" | "returned";
  uploadedBy: { id: string; name: string; role: string };
  uploadedAt: number;
  file: { name: string; size: number };
  decidedBy?: string;
  decidedAt?: number;
  /** Why the office sent it back, for the uploader to fix */
  reason?: string;
  /** The group the family is in now, when this contract moves it */
  transferFrom?: number;
};

/** Interactive steps after acceptance (المرحلة 6 – 9), keyed by pilgrim session id */
export type PostAcceptance = {
  confirmedAt?: number;
  /** key: `${nationalId}-${doc}` where doc is photo | passport | covid | meningitis | flu */
  documents: Record<string, DocStatus>;
  /** Documents already sent back once by the reviewer (the expired-passport case) */
  rejectedOnce?: string[];
  /**
   * Attaching the pilgrim to a group is its own operation, after and apart from registering on the Hajj:
   * the pilgrim does not choose a group on the platform. He agrees with a group, and whoever holds
   * «إلحاق الحجاج بالمجموعة» in it (its head, or the coordinator or assistant its cluster's head assigned
   * to it) uploads the signed contract; office staff approve it, and only then is the whole application in
   * the group (a family moves together or not at all).
   */
  contract?: PilgrimContract;
  clusterId?: string;
  groupNumber?: number;
  /** Who uploaded the contract that put the family in the group */
  enrolledBy?: { id: string; name: string };
  /** Membership is active from this moment */
  groupApprovedAt?: number;
  /** Earlier groups, when the family moved (the whole application at once) */
  transfers?: { from: number; to: number; at: number }[];
  /** Health information the group's coordinator records after enrollment */
  health?: HealthFile;
  /** Medical documents — asked only after the full amount is paid. key: `${nationalId}-${doc}` */
  medical?: Record<string, DocStatus>;
  /** Why the medical team sent a document back, by the same key, for the pilgrim to fix and upload again */
  medicalNotes?: Record<string, string>;
  /**
   * Where the request sleeps: the shared accommodation (men and women apart, no extra cost), or one private
   * room for the whole request with as many beds as people, priced per person by the group's cluster
   */
  accommodation?: Accommodation;
  /** Paid moments, by line key: i1..i3 (installments), hady, room */
  payments: Partial<Record<string, number>>;
  contractSignedAt?: number;
  /** When the last member's visa was added: the visa step is done */
  visaAt?: number;
  /**
   * Each member's visa as his group's head added it, by national number: the Saudi foreign ministry emails the
   * head each pilgrim's visa, and he uploads it here (a picture or a PDF), with its number
   */
  visas?: Record<string, PilgrimVisa>;
  /**
   * Each member's health documents, by national number, as the administration added them from the
   * administrators' platform: the Ministry of Health certificate (fit and vaccinated, or a condition named), and
   * any prescription or condition report the group's head or its coordinator added after.
   */
  healthDocs?: Record<string, HealthDoc[]>;
  ratings: Record<string, number>;
  /** Steps the administration added (an acknowledgement, questions): when done, and what was answered */
  custom?: Record<string, { at: number; answers?: Answers; memberAnswers?: Record<string, Answers> }>;
  /** The payment windows the demo's tester opened by simulation («first», «final»…), each when */
  windowsOpened?: Record<string, number>;
};

/** Seasonal administrator journey (الجزء الثاني), keyed by national id */
/**
 * A certificate or document in the administrator's permanent vault. The account is permanent, so a
 * document stays in the file from season to season; what changes is whether it is STILL VALID under
 * the validity the administration sets for its type (see DOCUMENTS in the administrator lib).
 */
export type VaultDoc = {
  id: string;
  /** A key from the administration's document list, or "custom" for a certificate the administrator added himself */
  key: string;
  label: string;
  file: string;
  /** The Hijri season the document was issued in — the validity rule is applied to it every season */
  issuedSeason: number;
  addedAt: number;
  updatedAt?: number;
};

/**
 * The administrator's permanent file. It survives the season: every new season's application starts
 * from it, and the administrator may add to it, update an entry, or delete one — he already has a record.
 */
export type AdminRecord = {
  documents: VaultDoc[];
  languages: string[];
  /** Keys from the skills list, plus any free-text skill the administrator added himself */
  skills: string[];
  updatedAt: number;
};

/** One person's individual invitation from a cluster head: he accepts or declines it himself */
export type ClusterInvite = { id: string; name: string; at: number; status: "pending" | "accepted" | "declined"; reason?: string };
/**
 * A group invited into a cluster: its head answers for it, and it comes with the pilgrims it already has.
 * Its category is its head's; its seats and its pilgrims' number follow the cluster's tier.
 */
export type GroupInvite = ClusterInvite & { number: number; branch: string; category: string; pilgrims: number; /** Put in the cluster by the administration's exceptional edit, not by invitation */ byAdministration?: { by: string; reason: string } };
/** One seat of a group in its cluster: a religious guide's or an assistant's; a free seat takes either, as its head chooses */
export type Seat = { kind: "guide" | "assistant"; free?: boolean; who?: ClusterInvite };
/**
 * Where someone serves in a cluster: a group's guide seat or assistant seat, among the cluster's
 * coordinators, its female guides, or its assistants («معاون التكتل»)
 */
export type TeamPool = "guide" | "assistant" | "tech" | "guide-f" | "cluster-assistant";
/** A cluster request: a draft, sent (قيد المراجعة), under review (جاري المراجعة), approved, or sent back (مرفوض) with notes */
export type ClusterStatus = "draft" | "pending" | "reviewing" | "approved" | "rejected";
/**
 * The cluster formed at the office — with the administration's structure (app/administrator/_lib/structure):
 * its name and tier, its groups (each with its seats, filled by the category under the tier), its cluster
 * assistants, coordinators and female guides by the sum of the groups' categories, and its accountant (one of its
 * people). Everyone in it is placed there in person, and signs its contract.
 */
/**
 * «قناة التكتل»: the channel of a cluster's administrators. Everyone in the cluster reads it; who writes is
 * by role, as its head sets it (app/administrator/_lib/channel.ts), and he may stop one member from writing.
 * A message can be pinned by the head, and taken down by its writer or the head (it stays, marked removed).
 */
export type ChannelMessage = {
  id: string;
  by: string;
  name: string;
  role: string;
  text: string;
  at: number;
  /** The message it answers */
  replyTo?: string;
  pinned?: boolean;
  removed?: { by: string; at: number };
};
export type ClusterChannel = {
  /** The roles that write; absent = the channel's default (the head) */
  writers?: string[];
  /** Members the head stopped from writing, whatever their role */
  muted?: Record<string, { by: string; at: number; reason?: string }>;
  messages?: ChannelMessage[];
  /** When each member last read the channel */
  reads?: Record<string, number>;
};

/** An administrator's oral exam: the slot he booked (app/administrator/_lib/oral.ts), then its committee's result */
export type OralState = { slotId: string; bookedAt: number; status: "booked" | "passed" | "failed" | "absent"; score?: number; note?: string; by?: string; at?: number };

/** A pilgrim's visa as his group's head uploaded it from the email of the Saudi foreign ministry */
export type PilgrimVisa = { number: string; ref?: string; name?: string; type?: string; at: number; by: string };

/** A post to a group's channel: who of the group it is for (the whole group, its men, its women, the elderly and their companions) */
export type GroupPost = { id: string; text: string; audience: string; at: number; groupNumber: number };

/** What a health document is: the Ministry of Health's certificate, a prescription, or a report of a condition */
export type HealthDocKind = "certificate" | "prescription" | "condition";

/**
 * A pilgrim's health document. The certificate says he is fit (vaccines done) or names his condition; any
 * document may carry the file it came as (a picture or a PDF in the media library).
 */
export type HealthDoc = {
  id: string;
  kind: HealthDocKind;
  /** The certificate: fit for Hajj with every vaccine, or with a condition (named in the note) */
  fit?: boolean;
  /** A prescription's medicines, or what a condition is */
  note?: string;
  ref?: string;
  name?: string;
  type?: string;
  at: number;
  by: { id: string; name: string; role: string };
};

/** A paper contract signed at the office, as the employee uploaded it (a picture or a file in the media library) */
export type SignedContract = { ref: string; name: string; type: string; at: number; by: string };

export type ClusterRecord = {
  id: string;
  name: string;
  /** Filed: from then he is its head */
  createdAt: number;
  tier?: string;
  status: ClusterStatus;
  /** The Hijri season it was filed in (the current one when absent) */
  season?: number;
  /** Sent for review (the last time), and the first time — before the early deadline it earns the timeliness badge */
  sentAt?: number;
  firstSentAt?: number;
  /** «جاري المراجعة»: who opened it */
  review?: { at: number; by: string };
  /** The administration's decision: approved, or sent back with notes for its head to fix and send again */
  decision?: { status: "approved" | "rejected"; at: number; by: string; note?: string };
  /** Opened again for its head's edits after its approval, keeping everything */
  reopened?: { at: number; by: string };
  /** Created or edited by the administration on its head's behalf */
  byAdministration?: { by: string; reason: string; at: number };
  /** The cluster formation fee, paid at the office */
  feePaidAt?: number;
  /** The paper contract everyone in the cluster signed at the office, as the employee uploaded it */
  contract?: SignedContract;
  accountant?: ClusterInvite;
  /** Every group invited, by number */
  groups: Record<number, GroupInvite>;
  /** Each group's seats, by its number */
  seats: Record<number, Seat[]>;
  assistants: ClusterInvite[];
  coordinators: ClusterInvite[];
  femaleGuides: ClusterInvite[];
  /** Which coordinator works in each group: group number -> his id. One coordinator takes several groups */
  sorting: Record<number, string>;
  /** Which female guide or murshida serves each group, the same way (each within her quota of units) */
  guideSorting?: Record<number, string>;
};

export type AdminProfile = {
  nationalId: string;
  createdAt: number;
  /** The Hijri season his seasonal fields (role, exam, group, cluster…) belong to; 1448 when absent */
  season?: number;
  phone: string;
  email?: string;
  /** Set at registration, as for a pilgrim; profiles from before passwords have none */
  password?: string;
  /** One role per season (older profiles may hold more; the first one counts) */
  positions: string[];
  /** How this season's application relates to the last season served */
  renewal?: "keep" | "change" | "first";
  /** The permanent file (documents, languages, skills) that carries across seasons */
  record?: AdminRecord;
  /** Same role, rating met: exams waived by the season's rules */
  examExempt?: boolean;
  languages: string[];
  skills: string[];
  documents: string[];
  commitmentsAt?: number;
  feePaidAt?: number;
  receipt?: string;
  eligibleAt?: number;
  /**
   * His attempt at his role's test (الاختبار المؤتمت), in the hall of his centre (`hall`, see examHalls). The
   * supervisor approves his device's entry (`ready`, «مقترن — لم يبدأ»); the test starts (`active`) — his time
   * from his own entry; he sends it (`submitted`, «بانتظار التأكيد») and the supervisor confirms it with his PIN on
   * the device or from his panel (`confirmed`), or does not (`unconfirmed`: the administration decides —
   * `decision`); a paired attempt never started is `voided` when the sitting ends. `paper` is what he was served
   * section by section, `answers` an option's index; at sending `tally` keeps each section's points and `score`
   * his share of all of them (%). Passing is passing every section at its pass mark.
   */
  exam?: Attempt;
  /**
   * The papers of the other exams a role sits when it sits more than one («معاون ومنسق تقني»: the assistant's),
   * by the exam's role; `exam` stays the paper of the role's own exam (its `examAs`)
   */
  exams?: Record<string, NonNullable<AdminProfile["exam"]>>;
  /**
   * His oral exam after the written one: the time he booked among the administration's oral days, then its
   * committee's result. Qualified only once he passed both (a renewal exempt from the written one is exempt from both)
   */
  oral?: OralState;
  resultPublishedAt?: number;
  /** Formed alone, without a team and without a cluster: a cluster takes it later, and its head assigns its team */
  group?: {
    /** The platform's internal key — never shown: a group is known by its name */
    number: number;
    /** The name its head gave it in the formation request («اللطيف»), shown as «مجموعة اللطيف» */
    name?: string;
    /** The cluster whose invitation its head accepted (or whose head he is), or that the distribution gave it */
    clusterId?: string;
    /** Given on approval by the category the head falls in, never typed by him (0 until then) */
    capacity: number;
    /** That category's name, as it read when the group was approved */
    capacityTier?: string;
    requestedAt: number;
    feePaidAt?: number;
    approvedAt?: number;
    approvedBy?: string;
    /** Sent back to the head by the holder of «إدارة الإداريين», with what to fix; cleared when he sends it again */
    returned?: { at: number; by: string; note: string };
    /** Its seats as the office filled them when it formed the group (its guide, its assistant), carried into its cluster */
    seats?: Seat[];
    /** «معاون بعدد» the office added to a group whose category has no assistant seat: he adds pilgrims to its cluster */
    countAssistant?: ClusterInvite;
    /** The paper contract its head and its team signed at the office */
    contract?: SignedContract;
  };
  /**
   * The cluster he asked to form. Nobody is elected: whoever holds a role that leads a cluster this season
   * (granted by the administration) files the request, and is its head from then on. He sends it for review
   * once it is complete; the administration approves it or sends it back with notes.
   */
  cluster?: ClusterRecord;
  /** The cluster's accountant («محاسب التكتل»), a secondary role given to one of its people who accepted */
  accountantOf?: { clusterId: string; clusterName: string; headId: string; headName: string };
  /**
   * A technical coordinator's post: the cluster whose head invited him, and the groups assigned to him.
   * He works in those groups only.
   */
  coordinatorIn?: { clusterId: string; clusterName: string; headId: string; headName: string; groups: number[] };
  /**
   * A guide's or an assistant's seat in a group of a cluster (`groups` holds it), or a female guide's or a
   * cluster assistant's post for the whole cluster (`groups` empty)
   */
  servesIn?: { clusterId: string; clusterName: string; headId: string; headName: string; role: Exclude<TeamPool, "tech">; groups: number[] };
  /**
   * Families enrolled in this group that the leader has received and welcomed: pilgrim session id -> "accepted".
   * Membership itself comes from the coordinator's enrollment; this only records the leader's acknowledgement.
   */
  joinDecisions: Record<string, "accepted" | "rejected">;
  musters: { id: string; title: string; at: number; present: string[]; closedAt?: number; /** The flight this muster boards, when it is the one to the airport */ flightId?: string; /** The group it gathers (one kept before groups were picked is his own group's) */ groupNumber?: number; /** Why it gathers (field.tsx MUSTER_KINDS: «umrah»…) and where */ kind?: string; place?: string; /** A required muster (the travel, the rites): everyone not there has a reason */ required?: boolean; /** Why each pilgrim not ticked was not there, by his id */ absent?: Record<string, string>; /** «أداء المناسك»: when the rite was done (recorded after it) */ doneAt?: number; /** What each did where a rite has degrees (lib/musters.ts): Muzdalifah's degree, the Jamarat thrown, Mina's nights */ detail?: Record<string, string[]> }[];
  /** What he posted to the channel of a group he works in («قناة المجموعة» in «الميدان»): its families read it in their portal */
  groupPosts?: GroupPost[];
};

/**
 * One event in a person's career file («أحداث الكادر»), as on the administration's platform: he joined a cluster,
 * an exceptional edit touched him, his role, seasonal role, branch or category changed, he was added, his account
 * was stopped or deleted, or a general note. The derived ones (joining an approved cluster, a granted seasonal role)
 * are read from the season itself; whatever the staff do or write by hand is kept here.
 */
export type CadreEventType = "joined" | "exceptional" | "role" | "seasonal" | "branch" | "category" | "added" | "status" | "deleted" | "note";
export type CadreEvent = {
  id: string;
  personId: string;
  name: string;
  type: CadreEventType;
  /** The Hijri season it belongs to; null for one outside every season */
  season: number | null;
  /** The day it happened (YYYY-MM-DD), which may be before it was written down */
  date: string;
  change?: string;
  note?: string;
  by: string;
  at: number;
};

/** Someone the administration added to the cadre by hand, outside every season's application */
export type CadrePerson = { id: string; name: string; gender: "M" | "F"; role: string; branch: string; phone: string; birth?: string; at: number; by: string };

/** How the administration reaches him and how he signs in: phone, birth date, card barcode, login PIN, Telegram */
export type CadreContact = { phone?: string; birth?: string; barcode?: string; pin?: string; telegram?: string; chatId?: string };

/** A message the staff sent through the Telegram bot: who it was for, and who has the bot linked to receive it */
export type TelegramMessage = { id: string; at: number; by: string; text: string; to: string[]; reached: string[] };

/** A letter between an administrator and the administration («المراسلات»): its thread, read and closed by the staff */
export type LetterMessage = { id: string; from: "admin" | "staff"; name: string; text: string; at: number; file?: string };
export type Letter = {
  id: string;
  number: string;
  adminId: string;
  adminName: string;
  subject: string;
  kind: string;
  at: number;
  messages: LetterMessage[];
  /** When the staff last opened it, and when its writer last read the replies */
  readAt?: number;
  adminReadAt?: number;
  closed?: { at: number; by: string };
};

/** A cluster's operational plan («الخطة التشغيلية»), filed by its head and accepted or sent back by the administration */
export type OperationalPlan = {
  clusterId: string;
  clusterName: string;
  headId: string;
  headName: string;
  title: string;
  summary: string;
  file: string;
  at: number;
  status: "submitted" | "accepted" | "returned";
  decision?: { by: string; at: number; note?: string };
};

/**
 * The administration's references for its cadre, as the holder of «إدارة الإداريين» edits them: each role's job
 * description (and which are shown, in what order), the administrative system's sections, the books of decisions,
 * and the contract forms. A missing one is the platform's own (app/administrator/_lib/references).
 */
export type AdminRefs = {
  jobs?: Record<string, { summary?: string; duties?: string[]; hidden?: boolean }>;
  jobOrder?: string[];
  system?: { id: string; title: string; body: string }[];
  decisions?: { id: string; title: string; year: string; desc: string; file: string }[];
  contracts?: { id: string; title: string; desc: string; file: string; party: string }[];
};

/** One companion's approval to be added to an application — it stays open until they answer */
export type Consent = {
  status: "pending" | "approved" | "declined";
  sentAt: number;
  respondedAt?: number;
  /** Invitation inside the app (has an account) or a code by text message */
  via: "app" | "sms";
};

/**
 * An application that is not submitted yet, saved at every step on the applicant's account (keyed by
 * session id). The applicant can leave — e.g. while companions approve — and continue later from the
 * same place. In production this is a server table with the same fields.
 */
export type ApplyDraft = {
  updatedAt: number;
  history: string[];
  track: "direct" | "lottery";
  members: Member[];
  book: { no: string } | null;
  residence: string;
  plan?: 1 | 2;
  maxPhase: number;
  /** key: companion national id */
  consents: Record<string, Consent>;
  /** The registration version this application was started on: it keeps it until it is submitted */
  configVersion?: string;
  answers?: Answers;
  memberAnswers?: Record<string, Answers>;
  /** Filing for someone else: his consent by the code sent to his phone, as the service recorded it */
  applicantConsent?: { personId: string; at: number; via: "sms" };
};

/** Simulated in-season position for the pilgrim "حالتي الآن" mode */
export type InSeason = { day: number; ratings: Record<string, number>; lostReports: number };

/** A score out of 5 for each evaluation stage that was scored, with a note when there is one */
export type StageScores = Record<string, { score: number; note?: string }>;

/**
 * An administrator's self-evaluation, in its sections (app/administrator/_lib/evaluation SELF_SECTIONS): the season's
 * stages, then the other scored sections by key, and the written answers of «خلاصة موسمك»
 */
export type SelfEvaluation = { stages: StageScores; sections?: Record<string, StageScores>; answers?: Record<string, string>; savedAt: number; submittedAt?: number; note?: string };

/** A piece of evidence an objection or a reply carries: a photo, a recording, a video or a document (its media-library reference) */
export type Evidence = { name: string; ref: string; type: string };

/**
 * An administrator's objection to the staff's evaluation: the stages he objects to, why, and the evidence he holds. The
 * staff who rated him answer it, each with his own words and evidence (`replies`, unnamed to the administrator); the
 * evaluation committee reads both sides, knowing who is who, and decides (`EvaluationDecision`).
 */
export type EvaluationObjection = { stages: string[]; reason: string; evidence?: Evidence[]; at: number; replies?: Record<string, EvaluationReply> };

/**
 * Who rated: kept with his rating and with his reply, and read by the evaluation committee alone — so that, if it summons him, it
 * can reach him. The administrator and the administration never see it.
 */
export type Rater = { id: string; name: string; title: string; place: string };

/** What one of the staff who rated him answers to the objection, with his own evidence */
export type EvaluationReply = { by: Rater; text: string; evidence?: Evidence[]; at: number };

/**
 * The committee's decision on the stages he objected to: for each, his own score, the staff's, or a third score of the
 * committee's own, and why. It is the committee's, not a member's: no one is named.
 */
export type EvaluationDecision = { stages: Record<string, { pick: "self" | "staff" | "own"; score: number; note?: string }>; at: number };

/**
 * One staff member's scores of an administrator (the group's head stands for his group, the cluster's head for his
 * cluster), stage by stage, with the questions of the administrator's role under each stage. Who rated (`by`) is kept
 * with it and shown to the evaluation committee only: the administrator and the administration see how many rated, never who.
 */
export type PeerEvaluation = { by: Rater; stages: StageScores; sections?: Record<string, StageScores>; note?: string; at: number };

/**
 * «يومي»: the day's report. Whoever works in a group sends his group's to the head of its cluster; the cluster's
 * head sends the cluster's to the administration, where the operations room reads it. Each is read by whom it is for.
 */
export type DailyReport = {
  id: string;
  at: number;
  /** The day it is the report of (YYYY-MM-DD, the demo's day) */
  day: string;
  byId: string;
  by: string;
  role: string;
  to: "cluster" | "administration";
  clusterId?: string;
  clusterName?: string;
  groupNumber?: number;
  general: string;
  health: string;
  complaints: string;
  notes?: string;
  readAt?: number;
  readBy?: string;
};

/** A comment an account wrote under a news post: its writer may take it down (it goes) */
export type NewsComment = { id: string; by: string; name: string; text: string; at: number };

export type State = {
  accounts: Record<string, Account>;
  /** The comments under each news post, by the post's slug, oldest first */
  newsComments: Record<string, NewsComment[]>;
  /** The day's reports, from the groups to their cluster's head and from the clusters to the administration */
  dailyReports: DailyReport[];
  sessionId: string | null;
  applications: Record<string, Application>;
  /** Visitor's zoom on top of the automatic one (renamed from textScale so values saved before auto-zoom are dropped) */
  displayScale: number;
  academy: Record<string, true>;

  staffSessionId: string | null;
  adminSessionId: string | null;
  admins: Record<string, AdminProfile>;
  events: AuditEvent[];
  reviews: Record<string, Review>;
  season: SeasonOverrides;
  tickets: Ticket[];
  post: Record<string, PostAcceptance>;
  /** Applications being filled in, saved at every step (keyed by applicant session id) */
  drafts: Record<string, ApplyDraft>;
  inSeason: Record<string, InSeason>;
  /**
   * The lottery's results as the desk keeps them: what the broadcast drew, entered line by line (birth
   * year, all months or some), sent for approval, then published — only the published draw decides who
   * is accepted. The demo starts after the 1448 results were published; `cleared` takes that back.
   */
  lottery: {
    entry?: { picks: DrawPick[]; by: string; at: number };
    sent?: { by: string; at: number };
    published?: { picks: DrawPick[]; by: string; at: number };
    cleared?: boolean;
  };
  /**
   * The season's cluster requests filed by heads who are not on this device, as the administration's review
   * and exceptional edits left them (by cluster id); a missing one is the season's story as seeded
   */
  formation: {
    overrides: Record<string, ClusterRecord>;
    /** Requests the administration created on a leader's behalf («إنشاء تشكيل نيابة عن قائد») */
    created: { headId: string; headName: string; headGroup?: number; cluster: ClusterRecord }[];
    /** Approved formations set aside in the archive, with the season they belonged to */
    archived: Record<string, { season: number; at: number; by: string }>;
    /** The administration's free note on a cluster (`c:<id>`) or a group (`g:<number>`) in the directory */
    notes: Record<string, string>;
    /** The season new formations are stamped with, once the administration began a new one */
    season?: number;
    seasonStarted?: { from: number; to: number; at: number; by: string; archived: string[] };
  };
  /**
   * The cadre as the administration keeps it, whether on this device or not: a seasonal role over the one he
   * applied for (null = taken back), a group head's category, his branch and extra branches — and, across the
   * seasons, his base role, the people it added by hand, the accounts it stopped or deleted, how it reaches each
   * one (phone, barcode, PIN, Telegram), the events of each person's file, and what it sent through the bot.
   */
  cadre: {
    seasonal: Record<string, import("../app/administrator/_lib/structure").SeasonalRole | null>;
    category: Record<string, string>;
    branches: Record<string, { branch: string; extra: string[] }>;
    primary: Record<string, string>;
    added: Record<string, CadrePerson>;
    status: Record<string, { state: "disabled" | "deleted"; reason: string; by: string; at: number }>;
    contact: Record<string, CadreContact>;
    events: CadreEvent[];
    telegram: TelegramMessage[];
  };
  /** When each administrator was last seen on the platform (a heartbeat while his portal is open) */
  presence: Record<string, number>;
  /** The letters between the administrators and the administration */
  letters: Letter[];
  /** Each cluster's channel as its members left it, by cluster id; a missing one is the season's story as seeded */
  channels: Record<string, ClusterChannel>;
  /** Each cluster's operational plan, by cluster id */
  plans: Record<string, OperationalPlan>;
  /** The administration's references for its cadre */
  adminRefs: AdminRefs;
  /**
   * The demo's "today" (YYYY-MM-DD) and, when set, its hour ("HH:MM"; else the real one): every operation opens
   * and closes by them (lib/operations.ts). `allOpen` tries everything together instead: every operation open
   * whatever its dates.
   */
  clock: { today?: string; time?: string; allOpen?: boolean };
  /** Each operation's state and dates as the staff who control it left them; a missing one follows its defaults */
  operations: Partial<Record<import("./operations").OperationKey, import("./operations").OperationOverride>>;
  /** End-of-season classification of the groups and the clusters, once the administration publishes it */
  grading: { publishedAt?: number; publishedBy?: string };
  /** The administrators rules the administration changed this season */
  adminRules: AdminRules;
  /**
   * The public programme of each cluster as its head wrote it. The page carries the administrations
   * approval, so a change waits in pending until the administration approves or sends it back.
   */
  clusterProfiles: Record<string, import("./cluster-profile").ClusterProfileState>;
  /**
   * The meals of each cluster's hotels, by the cluster's id: the technical coordinator times them, breakfast and
   * lunch at the Makkah hotel and at the Madinah hotel, and the cluster's pilgrims read them (lib/season-live)
   */
  clusterMeals: Record<string, ClusterMeals>;
  /** Each group's public page (its picture, a word, its gallery), by the group's number — lib/group-profile */
  groupProfiles: Record<string, import("./group-profile").GroupProfileState>;
  /**
   * The season's evaluation after the pilgrims are home (app/administrator/_lib/evaluation.ts). Each administrator's
   * self-evaluation, stage by stage — saved as he goes, sent once.
   */
  selfEvaluations: Record<string, SelfEvaluation>;
  /**
   * What the staff gave each administrator (the group's head, the cluster's head, a guide) after the season, stage by
   * stage: by his id, then by a key per rater. Who rated is hidden from the administrator and from the administration, and
   * known to the evaluation committee alone. Administrators do not rate one another, and the administration does not
   * rate them either: its staff do.
   */
  peerEvaluations: Record<string, Record<string, PeerEvaluation>>;
  /** An administrator's objection to the staff's evaluation of him, with the evidence and the raters' answers */
  evaluationObjections: Record<string, EvaluationObjection>;
  /** The evaluation committee's decision on what he objected to */
  evaluationDecisions: Record<string, EvaluationDecision>;
  /** Employees, reference data and operational files as the staff edited them (lib/ops.ts); a missing list means the seed */
  ops: import("./ops").OpsState;
  /** Airports, carriers, flights and seat assignments (lib/flights.ts); a missing list means the seed */
  flights: import("./flights").FlightsState;
  /** Before each rite: the cluster's buses and Rawdah slots the staff gave, and who is seated on each (lib/rite-lists.ts) */
  riteLists: import("./rite-lists").ListsState;
  /** Visas of the demo's generated families (not applications of this device), by the pilgrim's id (lib/visas.ts) */
  groupVisas: Record<string, PilgrimVisa>;
  /** The religious guides' lessons to their groups, and who came (lib/lessons.ts); a missing list means the seed */
  lessons: import("./lessons").LessonsState;
  /** Their activities followed pilgrim by pilgrim: Quran, hadith, supplications, a shared reading (lib/religious.ts) */
  activities: import("./religious").ActivitiesState;
  /** The written exam's halls: who supervises each centre, who sits where, and each sitting as its supervisor runs it */
  examHalls: ExamHalls;
  /**
   * When the director last looked at each system's important events (lib/systems.ts). `grants` is the former
   * management-file assignment, read once into `staffPermissions` and no longer written.
   */
  systems: { grants?: Record<string, { staffId: string; at?: number; by?: string }[]>; seen?: Record<string, number> };
  /**
   * Each staff account's permissions, one by one (lib/permissions.ts), once the holder of «صلاحيات الموظفين»
   * changed them; a missing account keeps those it opened with (lib/staff.ts STAFF).
   */
  staffPermissions?: Record<string, import("./permissions").PermGrant[]>;
  /**
   * The Hajj registration as configuration (lib/registration): the seasons, each one's working draft, the
   * versions published, and the payments the providers confirmed
   */
  registration: RegState;
  tourSeen: boolean;
};

/**
 * One sitting of a role's exam in one centre, keyed `${role}@${centre}`. Its supervisor opens the hall,
 * confirms each applicant who opened his account there (`joined` → `present`), starts the exam for all
 * of them at once, ends it (every paper is sent) and closes the hall; whoever never came is absent.
 */
export type HallRun = {
  openedAt?: number;
  openedBy?: string;
  /** Opened outside its time (an hour before it until the end of its day): why */
  openedReason?: string;
  startedAt?: number;
  /** Kept from before a sitting ended and closed in one step */
  endedAt?: number;
  closedAt?: number;
  /** Kept from before devices paired: an account opened in the hall */
  joined: Record<string, number>;
  /** Checked in by the supervisor, by his barcode or his national id */
  present: Record<string, number>;
  /** Entry requests from applicants' devices: when, the pairing code on his screen, and what flags it */
  requests?: Record<string, { at: number; code: string; offNetwork?: boolean; resume?: boolean }>;
  /** Devices whose entry was approved (or let in automatically) */
  paired?: Record<string, number>;
  /** The hall's network as recorded when it was opened, and whether phones' mobile data is let in (emergency) */
  network?: string;
  mobileData?: boolean;
};

/** Where an attempt stands (the administration's exam platform's statuses) */
export type AttemptStatus = "ready" | "active" | "submitted" | "confirmed" | "unconfirmed" | "voided";

/** What the platform noticed on the device during the test: signals for the supervisor's decision, not proof */
export type AttemptAlerts = { focusLost?: number; reentries?: number; screenshots?: number; ipChanged?: boolean; deviceChanged?: boolean; disconnected?: boolean };

export type Attempt = {
  status?: AttemptStatus;
  /** When his time began: the test's start, or his own entry after it */
  startedAt?: number;
  submittedAt?: number;
  hall?: string;
  /** The test's duration when his attempt began, so a change to the test does not move his clock */
  minutes?: number;
  paper?: import("./data/admin-exam").PaperSection[];
  answers: Record<number, number | string>;
  tally?: import("./data/admin-exam").Tally;
  score?: number;
  /** Whether the test shows him his result once confirmed */
  showResult?: boolean;
  pairedAt?: number;
  /** Sent by the platform when the supervisor ended the sitting with him still answering */
  autoSubmitted?: boolean;
  confirmedAt?: number;
  confirmedBy?: string;
  confirmVia?: "pin" | "panel" | "batch" | "auto" | "decision";
  /** «لا أؤكد»: why the supervisor did not confirm it */
  unconfirmedReason?: string;
  /** The administration's decision on an attempt referred to it: approved (اعتماد إداري) or voided (إلغاء إداري) */
  decision?: { kind: "approve" | "void"; by: string; at: number; note: string };
  alerts?: AttemptAlerts;
  /** Wrong PINs typed on his device, and until when it is locked after too many */
  pinTries?: number;
  pinLockedUntil?: number;
};

export type ExamHalls = {
  /** The centres as the exam system's owner left them; the platform's list until the first change */
  centers?: import("./data/admin-exam").ExamCenter[];
  /** Exams the owner edited or created, in full, by id (the five main exams are keyed by their role) */
  exams?: Record<string, import("./data/admin-exam").ExamDef>;
  /** Legacy: centre id -> the hall's supervisor, before supervising a hall became the `hall.*` permission for it (read nowhere) */
  supervisors?: Record<string, string>;
  /** applicants the exam desk moved to another centre than their governorate's: national id -> centre id */
  moved?: Record<string, string>;
  /** each role's main exam date, as changed before exams were kept whole in `exams` (read into them) */
  sessions?: Record<string, { date: string; time: string }>;
  runs: Record<string, HallRun>;
  /** Each supervisor's own confirmation PIN, typed on applicants' devices: staff id -> PIN */
  pins?: Record<string, string>;
};

export type StoreState = State;

/** The cadre's lists kept by person (the events and the bot's messages are lists of their own) */
export type CadreKey = "seasonal" | "category" | "branches" | "primary" | "added" | "status" | "contact";

const KEY = "sdhu-demo-v1";
const initial: State = {
  accounts: {},
  newsComments: {},
  dailyReports: [],
  sessionId: null,
  applications: {},
  displayScale: 1,
  academy: {},
  staffSessionId: null,
  adminSessionId: null,
  admins: {},
  events: [],
  reviews: {},
  season: {},
  tickets: [],
  post: {},
  drafts: {},
  inSeason: {},
  lottery: {},
  formation: { overrides: {}, created: [], archived: {}, notes: {} },
  cadre: { seasonal: {}, category: {}, branches: {}, primary: {}, added: {}, status: {}, contact: {}, events: [], telegram: [] },
  presence: {},
  letters: [],
  channels: {},
  plans: {},
  adminRefs: {},
  clock: {},
  operations: {},
  grading: {},
  adminRules: {},
  clusterProfiles: {},
  clusterMeals: {},
  groupProfiles: {
    "27": {
      approved: {
        fields: {
          cover: "/images/mina-tents.jpg",
          about: "مجموعة من دمشق تخدم الحجاج منذ 1442هـ، وفريقها من المواسم السابقة. لكل يوم في مكة درس بعد العصر، ومرافقة إلى الحرم لكبار السن.",
          gallery: ["/images/mina-tents.jpg", "/images/haram-2022.jpg", "/images/jabal-rahmah.jpg", "/images/muzdalifah.jpg", "/images/nabawi.jpg"],
        },
        at: Date.UTC(2026, 10, 20, 9),
        by: "رئيس المجموعة",
        approvedAt: Date.UTC(2026, 10, 21, 10),
        approvedBy: "إدارة الإداريين",
      },
    },
  },
  selfEvaluations: {},
  peerEvaluations: {},
  evaluationObjections: {},
  evaluationDecisions: {},
  ops: {},
  flights: {},
  riteLists: {},
  groupVisas: {},
  lessons: {},
  activities: {},
  examHalls: { runs: {} },
  systems: {},
  registration: { drafts: {}, versions: [], ledger: {} },
  tourSeen: false,
};

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** The season the platform lives in: the one the administration began last, else the demo's */
export const seasonNow = (s: Pick<State, "formation">) => s.formation?.season ?? SEASON.hijriYear;

/** An account's progress in the Academy is kept under its own national number: `${id}:${track}/${lesson}` */
export const academyKey = (id: string, lessonKey: string) => `${id}:${lessonKey}`;

/** The account a file needs: one opened with the administrator's own phone and password, when he has none yet */
function withAccount(s: State, id: string, from: { phone?: string; email?: string; password?: string; createdAt?: number }): State["accounts"] {
  if (s.accounts[id]) return s.accounts;
  return { ...s.accounts, [id]: { nationalId: id, phone: from.phone ?? "", email: from.email, password: from.password ?? "hajj1448", createdAt: from.createdAt ?? Date.now() } };
}

let state: State = initial;
let loaded = false;
const listeners = new Set<() => void>();

/**
 * A browser may hold state saved by an older build under the same keys in another shape (an earlier take
 * on cluster formation saved its own `formation`): the slices read here are made whole before use.
 */
/** The cluster's deputy is no post any more: a record saved with one (or a profile that was one) drops it */
function withoutDeputy(c: ClusterRecord): ClusterRecord {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { deputy: _gone, ...rest } = c as ClusterRecord & { deputy?: unknown };
  return rest;
}
function noDeputy(p: AdminProfile): AdminProfile {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { deputyOf: _gone, ...rest } = p as AdminProfile & { deputyOf?: unknown };
  return rest;
}

function normalize(s: State): State {
  const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
  const f = obj(s.formation);
  const c = obj(s.cadre);
  const list = (v: unknown) => (Array.isArray(v) ? v : []);
  // A cluster saved by an earlier build (an elected head's, or one with team pools instead of seats) is set
  // aside with whatever pointed at it: its head files it again under the administration's structure
  const current = (x: unknown) => !!x && typeof x === "object" && "seats" in (x as object) && "status" in (x as object);
  const stale = new Set(Object.values(obj(s.admins)).flatMap((a) => ((a as AdminProfile).cluster && !current((a as AdminProfile).cluster) ? [(a as AdminProfile).cluster!.id] : [])));
  const admins = Object.fromEntries(
    Object.entries(obj(s.admins)).map(([id, a]) => {
      const p = a as AdminProfile;
      if (!p.cluster || !current(p.cluster)) {
        const gone = (x?: { clusterId: string }) => !!x && stale.has(x.clusterId);
        return [id, { ...noDeputy(p), cluster: undefined, coordinatorIn: gone(p.coordinatorIn) ? undefined : p.coordinatorIn, servesIn: gone(p.servesIn) ? undefined : p.servesIn }];
      }
      const k = withoutDeputy(p.cluster);
      return [id, { ...noDeputy(p), cluster: { ...k, groups: obj(k.groups), seats: obj(k.seats), assistants: list(k.assistants), coordinators: list(k.coordinators), femaleGuides: list(k.femaleGuides), sorting: obj(k.sorting), guideSorting: obj(k.guideSorting) } as ClusterRecord }];
    }),
  ) as State["admins"];
  // One account per person: an administrator's file opened before accounts were one gets the account it lacked
  let accounts = obj(s.accounts) as State["accounts"];
  for (const a of Object.values(admins)) accounts = withAccount({ ...s, accounts }, a.nationalId, a);
  // The Academy's progress saved before it was kept per account belongs to whoever is signed in, else to nobody
  const academy = Object.fromEntries(
    Object.entries(obj(s.academy)).flatMap(([k, v]) => (k.includes(":") ? [[k, v]] : s.sessionId ? [[academyKey(s.sessionId, k), v]] : [])),
  ) as State["academy"];
  return {
    ...s,
    accounts,
    academy,
    newsComments: obj(s.newsComments) as State["newsComments"],
    clusterMeals: obj(s.clusterMeals) as State["clusterMeals"],
    evaluationDecisions: obj(s.evaluationDecisions) as State["evaluationDecisions"],
    dailyReports: list(s.dailyReports) as DailyReport[],
    // One session for the account, whichever door he came in by
    adminSessionId: s.sessionId ?? null,
    admins,
    formation: {
      overrides: Object.fromEntries(Object.entries(obj(f.overrides)).map(([k, v]) => [k, withoutDeputy(v as ClusterRecord)])) as State["formation"]["overrides"],
      created: (list(f.created) as State["formation"]["created"]).map((x) => ({ ...x, cluster: withoutDeputy(x.cluster) })),
      archived: obj(f.archived) as State["formation"]["archived"],
      notes: obj(f.notes) as State["formation"]["notes"],
      season: typeof f.season === "number" ? f.season : undefined,
      seasonStarted: f.seasonStarted as State["formation"]["seasonStarted"],
    },
    // Rules an earlier build kept (capacity and coordinator tiers by rating, roles opened by key) are the structure's now
    adminRules: Object.fromEntries(Object.entries(obj(s.adminRules)).filter(([k]) => !["capacityTiers", "coordinatorTiers", "rolesOff", "roleDesc"].includes(k))) as AdminRules,
    cadre: {
      seasonal: obj(c.seasonal) as State["cadre"]["seasonal"],
      category: obj(c.category) as State["cadre"]["category"],
      branches: obj(c.branches) as State["cadre"]["branches"],
      primary: obj(c.primary) as State["cadre"]["primary"],
      added: obj(c.added) as State["cadre"]["added"],
      status: obj(c.status) as State["cadre"]["status"],
      contact: obj(c.contact) as State["cadre"]["contact"],
      events: list(c.events) as CadreEvent[],
      telegram: list(c.telegram) as TelegramMessage[],
    },
    presence: obj(s.presence) as State["presence"],
    letters: list(s.letters) as Letter[],
    channels: obj(s.channels) as State["channels"],
    plans: obj(s.plans) as State["plans"],
    adminRefs: obj(s.adminRefs) as AdminRefs,
    clock: obj(s.clock) as State["clock"],
    operations: obj(s.operations) as State["operations"],
    registration: {
      seasons: Array.isArray(obj(s.registration).seasons) ? (obj(s.registration).seasons as RegState["seasons"]) : undefined,
      drafts: obj(obj(s.registration).drafts) as RegState["drafts"],
      versions: list(obj(s.registration).versions) as RegState["versions"],
      ledger: obj(obj(s.registration).ledger) as RegState["ledger"],
    },
  };
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = normalize({ ...initial, ...JSON.parse(raw) });
  } catch {
    // Private mode or blocked storage — the demo still works in memory
  }
  applyScale(state.displayScale);
}

/**
 * Display size chosen by the visitor. It multiplies the automatic zoom for the screen width (globals.css),
 * scaling everything like the browser's Ctrl +/-. Browsers without CSS zoom scale the root font instead.
 */
function applyScale(scale: number) {
  const root = document.documentElement;
  root.style.setProperty(CSS.supports("zoom", "1") ? "--user-zoom" : "--text-scale", String(scale));
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

/** The name a head gave his group in this browser's demo, for lib/groups (which names every group) */
export function storedGroupName(number: number) {
  load();
  for (const a of Object.values(state.admins)) if (a.group?.number === number && a.group.name) return a.group.name;
  return undefined;
}

/** The state now, outside React (labels written into logs and notices) */
export function getState(): State {
  load();
  return state;
}

export function setState(updater: (s: State) => State) {
  load();
  state = updater(state);
  persist();
  applyScale(state.displayScale);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    loaded = false;
    load();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return selector(state);
    },
    () => selector(initial),
  );
}

/** false during SSR and the hydration pass, true afterwards */
export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

// ───────────────────────── Actions ─────────────────────────

export const actions = {
  register(account: Account) {
    setState((s) => ({ ...s, accounts: { ...s.accounts, [account.nationalId]: account }, sessionId: account.nationalId, adminSessionId: account.nationalId }));
  },
  /**
   * What the account does this season (or another): register on the Hajj, or serve as an administrator. Choosing
   * the administrators' way opens his administrative file on the account when he has none. null takes the choice
   * back (only while nothing was started on it — the screens offer it only then).
   */
  chooseSeasonPath(id: string, season: number, path: SeasonPath | null) {
    setState((s) => {
      const a = s.accounts[id];
      if (!a) return s;
      const seasons = { ...a.seasons };
      if (path) seasons[season] = { path, chosenAt: Date.now() };
      else delete seasons[season];
      const admins =
        path === "admin" && !s.admins[id]
          ? { ...s.admins, [id]: { nationalId: id, createdAt: Date.now(), season, phone: a.phone, email: a.email, password: a.password, positions: [], languages: [], skills: [], documents: [], joinDecisions: {}, musters: [] } }
          : s.admins;
      return { ...s, admins, accounts: { ...s.accounts, [id]: { ...a, seasons } } };
    });
  },
  /**
   * Creates a pilgrim account without signing that pilgrim in — the technical coordinator opens
   * accounts for citizens from his own session, and must stay signed in as himself.
   */
  createAccountFor(account: Account) {
    setState((s) => (s.accounts[account.nationalId] ? s : { ...s, accounts: { ...s.accounts, [account.nationalId]: account } }));
  },
  /** The registration officer's decision on a civil correction, with the reason the pilgrim reads */
  decideCivil(id: string, status: "approved" | "rejected", decision: { note: string; by: string; at: number }) {
    setState((s) => {
      const a = s.accounts[id];
      if (!a?.civil) return s;
      return { ...s, accounts: { ...s.accounts, [id]: { ...a, civil: { ...a.civil, status, decision } } } };
    });
  },
  updateAccount(id: string, patch: Partial<Account>) {
    setState((s) => ({ ...s, accounts: { ...s.accounts, [id]: { ...s.accounts[id], ...patch } } }));
  },
  /** One session for the account, whichever door he came in by (the pilgrims' or the administrators') */
  login(id: string) {
    setState((s) => ({ ...s, sessionId: id, adminSessionId: id }));
  },
  logout() {
    setState((s) => ({ ...s, sessionId: null, adminSessionId: null }));
  },
  saveApplication(app: Application) {
    setState((s) => ({ ...s, applications: { ...s.applications, [app.applicantId]: app } }));
  },
  rate(applicantId: string, key: string, stars: number) {
    setState((s) => {
      const app = s.applications[applicantId];
      if (!app) return s;
      return { ...s, applications: { ...s.applications, [applicantId]: { ...app, ratings: { ...app.ratings, [key]: stars } } } };
    });
  },
  restartTracking(applicantId: string) {
    setState((s) => {
      const app = s.applications[applicantId];
      if (!app) return s;
      return { ...s, applications: { ...s.applications, [applicantId]: { ...app, submittedAt: Date.now() } } };
    });
  },
  /** Autosave of the application being filled in. Approvals are kept as they are: companions answer from outside the page */
  saveDraft(sessionId: string, draft: Omit<ApplyDraft, "updatedAt" | "consents" | "applicantConsent">, at: number) {
    // The approvals are the service's to record: what the page sends never touches them
    setState((s) => {
      const prev = s.drafts[sessionId];
      // Starting an application is choosing the Hajj for the season, if he had not chosen yet
      const acc = s.accounts[sessionId];
      const season = seasonNow(s);
      const accounts = acc && !acc.seasons?.[season] ? { ...s.accounts, [sessionId]: { ...acc, seasons: { ...acc.seasons, [season]: { path: "pilgrim" as const, chosenAt: at } } } } : s.accounts;
      return { ...s, accounts, drafts: { ...s.drafts, [sessionId]: { ...draft, consents: prev?.consents ?? {}, applicantConsent: prev?.applicantConsent, configVersion: prev?.configVersion ?? draft.configVersion, updatedAt: at } } };
    });
  },
  /** Send (or resend, or withdraw with null) one companion's approval request */
  setConsent(ownerId: string, personId: string, consent: Consent | null) {
    setState((s) => {
      const d = s.drafts[ownerId];
      if (!d) return s;
      const consents = { ...d.consents };
      if (consent) consents[personId] = consent;
      else delete consents[personId];
      return { ...s, drafts: { ...s.drafts, [ownerId]: { ...d, consents } } };
    });
  },
  clearDraft(sessionId: string) {
    setState((s) => ({ ...s, drafts: Object.fromEntries(Object.entries(s.drafts).filter(([id]) => id !== sessionId)) }));
  },
  /** A companion answers from his own account (or by the text-message code) */
  respondConsent(ownerId: string, personId: string, status: "approved" | "declined", at: number) {
    setState((s) => {
      const d = s.drafts[ownerId];
      const c = d?.consents[personId];
      if (!d || !c) return s;
      return { ...s, drafts: { ...s.drafts, [ownerId]: { ...d, updatedAt: at, consents: { ...d.consents, [personId]: { ...c, status, respondedAt: at } } } } };
    });
  },
  /**
   * The demo: take a person out of the other application of the season that holds him, so the one being filled can
   * hold him. Whoever applied takes his application with him: it goes whole. Returns that application's number.
   */
  releaseFromApplication(personId: string, except: string): { number: string; whole: boolean } | null {
    const hit = Object.entries(getState().applications).find(([owner, a]) => owner !== except && a.members.some((m) => m.person.id === personId));
    if (!hit) return null;
    const [owner, app] = hit;
    const whole = app.members.length === 1 || (app.members.find((m) => m.relation === "self") ?? app.members[0]).person.id === personId;
    setState((s) => ({
      ...s,
      applications: whole ? Object.fromEntries(Object.entries(s.applications).filter(([id]) => id !== owner)) : { ...s.applications, [owner]: { ...app, members: app.members.filter((m) => m.person.id !== personId) } },
    }));
    return { number: app.number, whole };
  },
  deleteApplication(applicantId: string) {
    setState((s) => {
      const rest = Object.fromEntries(Object.entries(s.applications).filter(([id]) => id !== applicantId));
      return { ...s, applications: rest };
    });
  },
  /** Visitor's display size on top of the automatic one; 0.7 shrinks further, 1.4 helps elderly pilgrims */
  setDisplayScale(scale: number) {
    setState((s) => ({ ...s, displayScale: Math.min(1.4, Math.max(0.7, Math.round(scale * 100) / 100)) }));
  },
  sendDailyReport(r: Omit<DailyReport, "id" | "at">) {
    setState((s) => ({ ...s, dailyReports: [...s.dailyReports, { ...r, id: uid(), at: Date.now() }] }));
  },
  /** Whom it is for opened it: its sender sees it was read */
  readDailyReport(id: string, by: string) {
    setState((s) => ({ ...s, dailyReports: s.dailyReports.map((r) => (r.id === id && !r.readAt ? { ...r, readAt: Date.now(), readBy: by } : r)) }));
  },
  /** Any account may comment under a news post, pilgrim, administrator or a member who chose nothing yet */
  addNewsComment(slug: string, c: Omit<NewsComment, "id" | "at">) {
    setState((s) => ({ ...s, newsComments: { ...s.newsComments, [slug]: [...(s.newsComments[slug] ?? []), { ...c, id: uid(), at: Date.now() }] } }));
  },
  /** Its writer takes his comment down */
  removeNewsComment(slug: string, id: string) {
    setState((s) => ({ ...s, newsComments: { ...s.newsComments, [slug]: (s.newsComments[slug] ?? []).filter((c) => c.id !== id) } }));
  },
  /** A lesson done, kept on the account for good: the Academy is not a season's, and is the pilgrim's and the administrator's alike */
  completeLesson(id: string, key: string) {
    setState((s) => ({ ...s, academy: { ...s.academy, [academyKey(id, key)]: true } }));
  },
  resetDemo() {
    setState(() => initial);
  },
  /** One demo pilgrim gone from this device — his account, his application and its steps, his season — so the demo can open it afresh */
  forgetPilgrim(id: string) {
    setState((s) => {
      const drop = <T,>(r: Record<string, T>) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== id));
      const out = s.sessionId === id;
      return { ...s, accounts: drop(s.accounts), applications: drop(s.applications), post: drop(s.post), inSeason: drop(s.inSeason), drafts: drop(s.drafts), sessionId: out ? null : s.sessionId, adminSessionId: out ? null : s.adminSessionId };
    });
  },

  // ── phase 2 ──
  logEvent(e: Omit<AuditEvent, "id" | "at">) {
    setState((s) => ({ ...s, events: [...s.events, { ...e, id: uid(), at: Date.now() }] }));
  },
  staffLogin(id: string) {
    setState((s) => ({ ...s, staffSessionId: id }));
  },
  staffLogout() {
    setState((s) => ({ ...s, staffSessionId: null }));
  },
  /** The same session as login(): the administrators' door opens the same account */
  adminLogin(id: string) {
    setState((s) => ({ ...s, sessionId: id, adminSessionId: id }));
  },
  adminLogout() {
    setState((s) => ({ ...s, sessionId: null, adminSessionId: null }));
  },
  /** His administrative file, on his account (opened with the file's phone and password when he had none) */
  upsertAdmin(id: string, patch: Partial<AdminProfile>) {
    setState((s) => {
      const base: AdminProfile = s.admins[id] ?? {
        nationalId: id,
        createdAt: Date.now(),
        phone: "",
        positions: [],
        languages: [],
        skills: [],
        documents: [],
        joinDecisions: {},
        musters: [],
      };
      const next = { ...base, ...patch };
      return { ...s, accounts: withAccount(s, id, next), admins: { ...s.admins, [id]: next } };
    });
  },
  setReview(applicantId: string, review: Review) {
    setState((s) => ({ ...s, reviews: { ...s.reviews, [applicantId]: review } }));
  },
  setSeason(patch: SeasonOverrides) {
    setState((s) => ({ ...s, season: { ...s.season, ...patch } }));
  },
  /** A cluster's meals as its technical coordinator timed them */
  setClusterMeals(clusterId: string, meals: ClusterMeals) {
    setState((s) => ({ ...s, clusterMeals: { ...s.clusterMeals, [clusterId]: meals } }));
  },
  resetSeason() {
    setState((s) => ({ ...s, season: {} }));
  },
  addTicket(t: Omit<Ticket, "id" | "at" | "updates" | "status"> & Partial<Pick<Ticket, "status">>) {
    const id = String(48200 + Math.floor(Math.random() * 800));
    setState((s) => ({ ...s, tickets: [{ status: "open", ...t, id, at: Date.now(), updates: [] }, ...s.tickets] }));
    return id;
  },
  updateTicket(id: string, patch: Partial<Ticket>, update?: { by: string; text: string }) {
    setState((s) => ({
      ...s,
      tickets: s.tickets.map((t) =>
        t.id === id ? { ...t, ...patch, updates: update ? [...t.updates, { ...update, at: Date.now() }] : t.updates } : t,
      ),
    }));
  },
  setPost(applicantId: string, patch: Partial<PostAcceptance>) {
    setState((s) => {
      const base: PostAcceptance = s.post[applicantId] ?? { documents: {}, payments: {}, ratings: {} };
      return { ...s, post: { ...s.post, [applicantId]: { ...base, ...patch } } };
    });
  },
  setInSeason(applicantId: string, patch: Partial<InSeason>) {
    setState((s) => {
      const base: InSeason = s.inSeason[applicantId] ?? { day: 0, ratings: {}, lostReports: 0 };
      return { ...s, inSeason: { ...s.inSeason, [applicantId]: { ...base, ...patch } } };
    });
  },
  setLottery(patch: State["lottery"]) {
    setState((s) => ({ ...s, lottery: { ...s.lottery, ...patch } }));
  },
  /** A seeded cluster request as the administration's review or edit left it; undefined goes back to the story */
  setClusterOverride(id: string, cluster: ClusterRecord | undefined) {
    setState((s) => {
      const overrides = { ...s.formation.overrides };
      if (cluster) overrides[id] = cluster;
      else delete overrides[id];
      return { ...s, formation: { ...s.formation, overrides } };
    });
  },
  /** What the administration set on one person (seasonal role, category, branches, base role, contact…) */
  setCadre<K extends CadreKey>(key: K, id: string, value: State["cadre"][K][string] | undefined) {
    setState((s) => {
      const next = { ...s.cadre[key] } as State["cadre"][K];
      if (value === undefined) delete next[id];
      else next[id] = value as State["cadre"][K][string];
      return { ...s, cadre: { ...s.cadre, [key]: next } };
    });
  },
  /** One event written into a person's file */
  addCadreEvent(e: Omit<CadreEvent, "id" | "at">) {
    setState((s) => ({ ...s, cadre: { ...s.cadre, events: [...s.cadre.events, { ...e, id: uid(), at: Date.now() }] } }));
  },
  /** A message through the Telegram bot, and to whom it reached */
  addTelegram(m: Omit<TelegramMessage, "id" | "at">) {
    setState((s) => ({ ...s, cadre: { ...s.cadre, telegram: [...s.cadre.telegram, { ...m, id: uid(), at: Date.now() }] } }));
  },
  /** The heartbeat of an open portal: «متصل الآن» on the staff's roster */
  seen(id: string, at: number) {
    setState((s) => (at - (s.presence[id] ?? 0) < 30_000 ? s : { ...s, presence: { ...s.presence, [id]: at } }));
  },
  addLetter(letter: Letter) {
    setState((s) => ({ ...s, letters: [...s.letters, letter] }));
  },
  updateLetter(id: string, fn: (l: Letter) => Letter) {
    setState((s) => ({ ...s, letters: s.letters.map((l) => (l.id === id ? fn(l) : l)) }));
  },
  /** A cluster's channel changed: `seed` is how it reads before anyone touched it on this device */
  setChannel(clusterId: string, seed: ClusterChannel, fn: (c: ClusterChannel) => ClusterChannel) {
    setState((s) => ({ ...s, channels: { ...s.channels, [clusterId]: fn(s.channels[clusterId] ?? seed) } }));
  },
  setPlan(clusterId: string, plan: OperationalPlan | undefined) {
    setState((s) => {
      const plans = { ...s.plans };
      if (plan) plans[clusterId] = plan;
      else delete plans[clusterId];
      return { ...s, plans };
    });
  },
  /** The formations' archive, their notes, the requests created on a leader's behalf, the current season */
  setFormation(fn: (f: State["formation"]) => State["formation"]) {
    setState((s) => ({ ...s, formation: fn(s.formation) }));
  },
  setAdminRefs(patch: AdminRefs) {
    setState((s) => ({ ...s, adminRefs: { ...s.adminRefs, ...patch } }));
  },
  /** Moves the demo's "today"; undefined goes back to the season's first day */
  setToday(today: string | undefined, time?: string) {
    setState((s) => ({ ...s, clock: { ...s.clock, today, time } }));
  },
  /** The demo's hour on its day; undefined follows the real clock */
  setClockTime(time: string | undefined) {
    setState((s) => ({ ...s, clock: { ...s.clock, time } }));
  },
  /** Everything open at once, or back to the dates */
  setAllOpen(allOpen: boolean) {
    setState((s) => ({ ...s, clock: { ...s.clock, allOpen: allOpen || undefined } }));
  },
  setOperation(key: import("./operations").OperationKey, patch: import("./operations").OperationOverride | undefined) {
    setState((s) => ({ ...s, operations: { ...s.operations, [key]: patch && { ...s.operations[key], ...patch } } }));
  },
  /** The cluster head submits his programme for approval */
  submitClusterProfile(slug: string, change: import("./cluster-profile").ClusterProfileChange) {
    setState((s) => ({ ...s, clusterProfiles: { ...s.clusterProfiles, [slug]: { ...s.clusterProfiles[slug], pending: change, rejected: undefined } } }));
  },
  /** The administration approves it onto the public page, or sends it back with a reason */
  decideClusterProfile(slug: string, decision: "approved" | "rejected", by: string, reason?: string) {
    setState((s) => {
      const cur = s.clusterProfiles[slug];
      if (!cur?.pending) return s;
      const next =
        decision === "approved"
          ? { approved: { ...cur.pending, approvedAt: Date.now(), approvedBy: by }, pending: undefined, rejected: undefined }
          : { ...cur, pending: undefined, rejected: { at: Date.now(), by, reason: reason ?? "", fields: cur.pending.fields } };
      return { ...s, clusterProfiles: { ...s.clusterProfiles, [slug]: { ...cur, ...next } } };
    });
  },
  /** A group's head (or his assistant) submits its public page for approval */
  submitGroupProfile(no: number, change: import("./group-profile").GroupProfileChange) {
    setState((s) => ({ ...s, groupProfiles: { ...s.groupProfiles, [String(no)]: { ...s.groupProfiles[String(no)], pending: change, rejected: undefined } } }));
  },
  /** The administration approves it onto the group's card and window, or sends it back with a reason */
  decideGroupProfile(no: number, decision: "approved" | "rejected", by: string, reason?: string) {
    setState((s) => {
      const cur = s.groupProfiles[String(no)];
      if (!cur?.pending) return s;
      const next =
        decision === "approved"
          ? { approved: { ...cur.pending, approvedAt: Date.now(), approvedBy: by }, pending: undefined, rejected: undefined }
          : { ...cur, pending: undefined, rejected: { at: Date.now(), by, reason: reason ?? "", fields: cur.pending.fields } };
      return { ...s, groupProfiles: { ...s.groupProfiles, [String(no)]: { ...cur, ...next } } };
    });
  },
  /** One employee's permissions replaced as a whole (the access screen saves them together) */
  setStaffPermissions(staffId: string, grants: import("./permissions").PermGrant[]) {
    setState((s) => ({ ...s, staffPermissions: { ...s.staffPermissions, [staffId]: grants } }));
  },
  setAdminRules(patch: AdminRules) {
    setState((s) => ({ ...s, adminRules: { ...s.adminRules, ...patch } }));
  },
  /** Back to the platform's defaults, except the rules named in `keep` (another page owns them) */
  resetAdminRules(keep: readonly (keyof AdminRules)[] = []) {
    setState((s) => ({ ...s, adminRules: Object.fromEntries(keep.map((k) => [k, s.adminRules[k]])) as AdminRules }));
  },
  saveSelfEvaluation(id: string, value: Pick<SelfEvaluation, "stages" | "sections" | "answers">, opts: { submit?: boolean } = {}) {
    setState((s) => {
      if (s.selfEvaluations[id]?.submittedAt) return s;
      const at = Date.now();
      return { ...s, selfEvaluations: { ...s.selfEvaluations, [id]: { ...value, savedAt: at, ...(opts.submit ? { submittedAt: at } : {}) } } };
    });
  },
  /** One rater's scores of an administrator, under his opaque key (lib/evaluation raterKey) */
  setPeerEvaluation(adminId: string, rater: string, value: PeerEvaluation) {
    setState((s) => ({ ...s, peerEvaluations: { ...s.peerEvaluations, [adminId]: { ...s.peerEvaluations[adminId], [rater]: value } } }));
  },
  objectToEvaluation(id: string, value: Pick<EvaluationObjection, "stages" | "reason" | "evidence">) {
    setState((s) => (s.evaluationObjections[id] ? s : { ...s, evaluationObjections: { ...s.evaluationObjections, [id]: { ...value, at: Date.now() } } }));
  },
  /** A rater's answer to the objection, under his opaque key */
  replyToObjection(id: string, rater: string, reply: EvaluationReply) {
    setState((s) => {
      const o = s.evaluationObjections[id];
      return o ? { ...s, evaluationObjections: { ...s.evaluationObjections, [id]: { ...o, replies: { ...o.replies, [rater]: reply } } } } : s;
    });
  },
  /** The committee's decision on some of the stages he objected to: a stage decided stays decided until it is decided again */
  decideEvaluation(id: string, stages: EvaluationDecision["stages"]) {
    setState((s) => ({ ...s, evaluationDecisions: { ...s.evaluationDecisions, [id]: { stages: { ...s.evaluationDecisions[id]?.stages, ...stages }, at: Date.now() } } }));
  },
  setGrading(patch: State["grading"]) {
    setState((s) => ({ ...s, grading: { ...s.grading, ...patch } }));
  },
  markTourSeen() {
    setState((s) => ({ ...s, tourSeen: true }));
  },
};
