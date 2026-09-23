"use client";

import { useSyncExternalStore } from "react";
import type { Member } from "./rules";

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
   * first, 35%) opens first; the lottery (65%) opens afterwards as its own application. Missing = "direct"
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
};

/** Registration staff decision on an application that needed human review */
export type Review = { status: "approved" | "rejected"; note: string; by: string; at: number };

/** Season settings edited by the season director; merged over SEASON by useSeason() */
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
  /** Administrators: rating needed to keep last season's role; seasons of seniority for a cluster head */
  keepRoleMinRating: number;
  /** Clusters this season, and consecutive seasons as group head needed to stand for cluster head */
  clusterCount: number;
  clusterHeadSeasons: number;
  clusterHeadMinRating: number;
  deputySeasons: number;
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

/** Interactive steps after acceptance (المرحلة 6 – 9), keyed by pilgrim session id */
export type PostAcceptance = {
  confirmedAt?: number;
  /** key: `${nationalId}-${doc}` where doc is photo | passport | covid | meningitis | flu */
  documents: Record<string, DocStatus>;
  /** Documents already sent back once by the reviewer (the expired-passport case) */
  rejectedOnce?: string[];
  /**
   * التفويج: when the assignment window opens, the pilgrim reads the group directory and contacts a
   * group; that group's coordinator enrolls the whole application (a family moves together or not at
   * all) and both sign the pilgrim–group contract. A coordinator enrolls only into his own group.
   */
  clusterId?: string;
  groupNumber?: number;
  /** The coordinator who enrolled the family */
  enrolledBy?: { id: string; name: string };
  /** Membership is active from this moment */
  groupApprovedAt?: number;
  /** Earlier groups, when the family moved (the whole application at once) */
  transfers?: { from: number; to: number; at: number }[];
  /** Health information the group's coordinator records after enrollment */
  health?: HealthFile;
  /** Medical documents — asked only after the full amount is paid. key: `${nationalId}-${doc}` */
  medical?: Record<string, DocStatus>;
  /** Paid moments, by line key: i1..i3 (installments), hady, room */
  payments: Partial<Record<string, number>>;
  contractSignedAt?: number;
  visaAt?: number;
  ratings: Record<string, number>;
};

/** Seasonal administrator journey (الجزء الثاني), keyed by national id */
export type AdminProfile = {
  nationalId: string;
  createdAt: number;
  phone: string;
  /** One role per season (older profiles may hold more; the first one counts) */
  positions: string[];
  /** How this season's application relates to the last season served */
  renewal?: "keep" | "change" | "first";
  /** Same role, rating met: exams waived by the season's rules */
  examExempt?: boolean;
  languages: string[];
  skills: string[];
  documents: string[];
  commitmentsAt?: number;
  feePaidAt?: number;
  receipt?: string;
  eligibleAt?: number;
  exam?: { startedAt: number; submittedAt?: number; answers: Record<number, number>; score?: number };
  oral?: { score: number; by: string; at: number; note?: string };
  finalScore?: number;
  resultPublishedAt?: number;
  /** Formed without a cluster: clusters exist only after all groups are formed and their heads elected */
  group?: {
    number: number;
    /** Set once a cluster accepted the group (or the head was elected and created his own) */
    clusterId?: string;
    capacity: number;
    requestedAt: number;
    feePaidAt?: number;
    approvedAt?: number;
    approvedBy?: string;
    /** Team charter (deputy, guide, coordinator) */
    contractSignedAt?: number;
  };
  /** Stood for cluster head this season */
  candidate?: { at: number; statement: string };
  /** The candidate this group head voted for (admin id) */
  vote?: string;
  /** The cluster this elected head created — he manages it fully and chooses its deputy */
  cluster?: {
    id: string;
    name: string;
    deputyId?: string;
    deputyName?: string;
    capacityGroups: number;
    createdAt: number;
    feePaidAt?: number;
    /** Group heads' requests to join: admin id -> decision */
    decisions: Record<string, { status: "accepted" | "declined"; at: number; reason?: string }>;
  };
  /** This group's request to join a cluster: never forced, the cluster head decides, then both sign */
  clusterRequest?: { clusterId: string; at: number; status: "pending" | "accepted" | "declined"; reason?: string; contractSignedAt?: number };
  /**
   * Families enrolled in this group that the leader has received and welcomed: pilgrim session id -> "accepted".
   * Membership itself comes from the coordinator's enrollment; this only records the leader's acknowledgement.
   */
  joinDecisions: Record<string, "accepted" | "rejected">;
  musters: { id: string; title: string; at: number; present: string[]; closedAt?: number }[];
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

type State = {
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
  lottery: { importedAt?: number; importedBy?: string; publishedAt?: number; publishedBy?: string };
  /** Election of the cluster heads by the group heads, run once per season by the administration */
  election: { openedAt?: number; closedAt?: number; elected?: string[] };
  tourSeen: boolean;
};

export type StoreState = State;

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
  election: {},
  tourSeen: false,
};

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

let state: State = initial;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...initial, ...JSON.parse(raw) };
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
  setElection(patch: State["election"]) {
    setState((s) => ({ ...s, election: { ...s.election, ...patch } }));
  },
  markTourSeen() {
    setState((s) => ({ ...s, tourSeen: true }));
  },
};
