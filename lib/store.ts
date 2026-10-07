"use client";

import { useSyncExternalStore } from "react";
import type { Member } from "./rules";
import type { DrawPick } from "./lottery";
import type { Accommodation } from "./rooms";

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
  previous?: { number: string; track: "direct"; submittedAt: number; closedAt: number };
  /**
   * Filed by an authorised administrator on the citizen's behalf (the technical coordinator at a branch
   * office). Absent when the pilgrim filed it himself. This is a plain registration: it does NOT put the
   * pilgrims in the coordinator's group — groups are joined only in the assignment window.
   */
  submittedBy?: { id: string; name: string; position: string };
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
  exam?: Partial<{ passMark: number; writtenMin: number; writtenWeight: number }>;
  /** The oral's days are the operation «الامتحان الشفهي»; here, what each day holds: its seats, its hours, its place */
  oral?: Partial<{ perDay: number; time: string; place: string; fridays: boolean }>;
  /** Each role's exam as the administration built it: its duration and its weighted sections (lib/data/admin-exam) */
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
  /**
   * Where the request sleeps: the shared accommodation (men and women apart, no extra cost), or one private
   * room for the whole request with as many beds as people, priced per person by the group's cluster
   */
  accommodation?: Accommodation;
  /** Paid moments, by line key: i1..i3 (installments), hady, room */
  payments: Partial<Record<string, number>>;
  contractSignedAt?: number;
  visaAt?: number;
  ratings: Record<string, number>;
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
 * The cluster its head asked to form — with the administration's structure (app/administrator/_lib/structure):
 * its name and tier, its groups (each with its seats, filled by the category under the tier), its cluster
 * assistants, coordinators and female guides by the sum of the groups' categories, its deputy (one of its
 * group heads) and its accountant (one of its people). Everyone picked answers his own invitation.
 */
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
  feePaidAt?: number;
  deputy?: ClusterInvite;
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
};

export type AdminProfile = {
  nationalId: string;
  createdAt: number;
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
   * The written exam, sat in the hall of his centre (`hall`, see examHalls). `paper` is what he was served,
   * section by section; `answers` an option's index, or a written answer's text. At sending, `tally` keeps
   * the automated points and `toGrade` the written answers a grader marks (`marks`). `score` is the
   * written mark once nothing is left to grade; until then `provisional` counts the ungraded as 0.
   */
  exam?: {
    startedAt: number;
    submittedAt?: number;
    hall?: string;
    /** The role's duration when the hall started, so a change to the exam does not move his clock */
    minutes?: number;
    paper?: import("./data/admin-exam").PaperSection[];
    answers: Record<number, number | string>;
    tally?: import("./data/admin-exam").Tally;
    toGrade?: number[];
    marks?: Record<number, number>;
    gradedBy?: string;
    gradedAt?: number;
    provisional?: number;
    score?: number;
  };
  /**
   * The papers of the other exams a role sits when it sits more than one («معاون ومنسق تقني»: the assistant's),
   * by the exam's role; `exam` stays the paper of the role's own exam (its `examAs`)
   */
  exams?: Record<string, NonNullable<AdminProfile["exam"]>>;
  /** The final is never stored: it follows the season's exam rules (resultOf) */
  oral?: { score: number; by: string; at: number; note?: string };
  /** The oral's day he booked himself after passing the written, from the days the exams' staff set */
  oralBooking?: { day: string; at: number };
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
  };
  /**
   * The cluster's deputy head («نائب رئيس التكتل»), who accepted its head's invitation. Like the head, his
   * role for the season becomes a cluster role: he sees the cluster's groups and its information.
   */
  deputyOf?: { clusterId: string; clusterName: string; headId: string; headName: string; headGroup: number };
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
  musters: { id: string; title: string; at: number; present: string[]; closedAt?: number; /** The flight this muster boards, when it is the one to the airport */ flightId?: string }[];
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
};

/** Simulated in-season position for the pilgrim "حالتي الآن" mode */
export type InSeason = { day: number; ratings: Record<string, number>; lostReports: number };

export type State = {
  accounts: Record<string, Account>;
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
  /** What the staff scored each administrator at the end of the season, by national id */
  evaluations: Record<string, { avg: number; at: number; by: string; stages: Record<string, { score: number; note?: string; file?: string }> }>;
  /** Employees, reference data and operational files as the staff edited them (lib/ops.ts); a missing list means the seed */
  ops: import("./ops").OpsState;
  /** Airports, carriers, flights and seat assignments (lib/flights.ts); a missing list means the seed */
  flights: import("./flights").FlightsState;
  /** The written exam's halls: who supervises each centre, who sits where, and each sitting as its supervisor runs it */
  examHalls: ExamHalls;
  /**
   * Who holds each file's management permission (lib/systems.ts) once the director granted or took one back,
   * and when she last looked at each file's important events. A missing list means the accounts as opened.
   */
  systems: { grants?: Record<string, { staffId: string; at?: number; by?: string }[]>; seen?: Record<string, number> };
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
  startedAt?: number;
  endedAt?: number;
  closedAt?: number;
  joined: Record<string, number>;
  present: Record<string, number>;
};

export type ExamHalls = {
  /** The centres as the exam system's owner left them; the platform's list until the first change */
  centers?: import("./data/admin-exam").ExamCenter[];
  /** Exams the owner edited or created, in full, by id (the five main exams are keyed by their role) */
  exams?: Record<string, import("./data/admin-exam").ExamDef>;
  /** centre id -> the staff account supervising its hall (an empty string takes the default away) */
  supervisors?: Record<string, string>;
  /** applicants the exam desk moved to another centre than their governorate's: national id -> centre id */
  moved?: Record<string, string>;
  /** each role's main exam date, as changed before exams were kept whole in `exams` (read into them) */
  sessions?: Record<string, { date: string; time: string }>;
  runs: Record<string, HallRun>;
};

export type StoreState = State;

/** The cadre's lists kept by person (the events and the bot's messages are lists of their own) */
export type CadreKey = "seasonal" | "category" | "branches" | "primary" | "added" | "status" | "contact";

const KEY = "sdhu-demo-v1";
const initial: State = {
  accounts: {},
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
  plans: {},
  adminRefs: {},
  clock: {},
  operations: {},
  grading: {},
  adminRules: {},
  clusterProfiles: {},
  evaluations: {},
  ops: {},
  flights: {},
  examHalls: { runs: {} },
  systems: {},
  tourSeen: false,
};

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

let state: State = initial;
let loaded = false;
const listeners = new Set<() => void>();

/**
 * A browser may hold state saved by an older build under the same keys in another shape (an earlier take
 * on cluster formation saved its own `formation`): the slices read here are made whole before use.
 */
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
        return [id, { ...p, cluster: undefined, deputyOf: gone(p.deputyOf) ? undefined : p.deputyOf, coordinatorIn: gone(p.coordinatorIn) ? undefined : p.coordinatorIn, servesIn: gone(p.servesIn) ? undefined : p.servesIn }];
      }
      const k = p.cluster;
      return [id, { ...p, cluster: { ...k, groups: obj(k.groups), seats: obj(k.seats), assistants: list(k.assistants), coordinators: list(k.coordinators), femaleGuides: list(k.femaleGuides), sorting: obj(k.sorting) } as ClusterRecord }];
    }),
  ) as State["admins"];
  return {
    ...s,
    admins,
    formation: {
      overrides: obj(f.overrides) as State["formation"]["overrides"],
      created: list(f.created) as State["formation"]["created"],
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
    plans: obj(s.plans) as State["plans"],
    adminRefs: obj(s.adminRefs) as AdminRefs,
    clock: obj(s.clock) as State["clock"],
    operations: obj(s.operations) as State["operations"],
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
    setState((s) => ({ ...s, accounts: { ...s.accounts, [account.nationalId]: account }, sessionId: account.nationalId }));
  },
  /**
   * Creates a pilgrim account without signing that pilgrim in — the technical coordinator opens
   * accounts for citizens from his own session, and must stay signed in as himself.
   */
  createAccountFor(account: Account) {
    setState((s) => (s.accounts[account.nationalId] ? s : { ...s, accounts: { ...s.accounts, [account.nationalId]: account } }));
  },
  updateAccount(id: string, patch: Partial<Account>) {
    setState((s) => ({ ...s, accounts: { ...s.accounts, [id]: { ...s.accounts[id], ...patch } } }));
  },
  login(id: string) {
    setState((s) => ({ ...s, sessionId: id }));
  },
  logout() {
    setState((s) => ({ ...s, sessionId: null }));
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
  saveDraft(sessionId: string, draft: Omit<ApplyDraft, "updatedAt" | "consents">, at: number) {
    setState((s) => ({ ...s, drafts: { ...s.drafts, [sessionId]: { ...draft, consents: s.drafts[sessionId]?.consents ?? {}, updatedAt: at } } }));
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
  completeLesson(key: string) {
    setState((s) => ({ ...s, academy: { ...s.academy, [key]: true } }));
  },
  resetDemo() {
    setState(() => initial);
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
  adminLogin(id: string) {
    setState((s) => ({ ...s, adminSessionId: id }));
  },
  adminLogout() {
    setState((s) => ({ ...s, adminSessionId: null }));
  },
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
      return { ...s, admins: { ...s.admins, [id]: { ...base, ...patch } } };
    });
  },
  setReview(applicantId: string, review: Review) {
    setState((s) => ({ ...s, reviews: { ...s.reviews, [applicantId]: review } }));
  },
  setSeason(patch: SeasonOverrides) {
    setState((s) => ({ ...s, season: { ...s.season, ...patch } }));
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
  setAdminRules(patch: AdminRules) {
    setState((s) => ({ ...s, adminRules: { ...s.adminRules, ...patch } }));
  },
  /** Back to the platform's defaults, except the rules named in `keep` (another page owns them) */
  resetAdminRules(keep: readonly (keyof AdminRules)[] = []) {
    setState((s) => ({ ...s, adminRules: Object.fromEntries(keep.map((k) => [k, s.adminRules[k]])) as AdminRules }));
  },
  setEvaluation(id: string, value: State["evaluations"][string]) {
    setState((s) => ({ ...s, evaluations: { ...s.evaluations, [id]: value } }));
  },
  setGrading(patch: State["grading"]) {
    setState((s) => ({ ...s, grading: { ...s.grading, ...patch } }));
  },
  markTourSeen() {
    setState((s) => ({ ...s, tourSeen: true }));
  },
};
