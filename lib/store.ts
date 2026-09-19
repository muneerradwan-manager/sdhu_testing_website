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
  governorate: string;
  office: string;
  receipt: string;
  paid: number;
  payMethod: "card" | "bank";
  ratings: Record<string, number>;
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

/** Interactive steps after acceptance (المرحلة 6 – 9), keyed by pilgrim session id */
export type PostAcceptance = {
  confirmedAt?: number;
  /** key: `${nationalId}-${doc}` where doc is passport | meningitis | flu | medical */
  documents: Record<string, DocStatus>;
  clusterId?: string;
  groupNumber?: number;
  groupRequestedAt?: number;
  groupApprovedAt?: number;
  payments: Partial<Record<"hajj" | "hady" | "room", number>>;
  contractSignedAt?: number;
  visaAt?: number;
  ratings: Record<string, number>;
};

/** Seasonal administrator journey (الجزء الثاني), keyed by national id */
export type AdminProfile = {
  nationalId: string;
  createdAt: number;
  phone: string;
  positions: string[];
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
  group?: {
    number: number;
    clusterId: string;
    capacity: number;
    requestedAt: number;
    feePaidAt?: number;
    approvedAt?: number;
    approvedBy?: string;
    contractSignedAt?: number;
  };
  /** Decisions on pilgrims' join requests: pilgrim session id -> decision */
  joinDecisions: Record<string, "accepted" | "rejected">;
  musters: { id: string; title: string; at: number; present: string[]; closedAt?: number }[];
};

/** Simulated in-season position for the pilgrim "حالتي الآن" mode */
export type InSeason = { day: number; ratings: Record<string, number>; lostReports: number };

type State = {
  accounts: Record<string, Account>;
  sessionId: string | null;
  applications: Record<string, Application>;
  textScale: number;
  academy: Record<string, true>;

  staffSessionId: string | null;
  adminSessionId: string | null;
  admins: Record<string, AdminProfile>;
  events: AuditEvent[];
  reviews: Record<string, Review>;
  season: SeasonOverrides;
  tickets: Ticket[];
  post: Record<string, PostAcceptance>;
  inSeason: Record<string, InSeason>;
  lottery: { importedAt?: number; importedBy?: string; publishedAt?: number; publishedBy?: string };
  tourSeen: boolean;
};

export type StoreState = State;

const KEY = "sdhu-demo-v1";
const initial: State = {
  accounts: {},
  sessionId: null,
  applications: {},
  textScale: 1,
  academy: {},
  staffSessionId: null,
  adminSessionId: null,
  admins: {},
  events: [],
  reviews: {},
  season: {},
  tickets: [],
  post: {},
  inSeason: {},
  lottery: {},
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
  applyScale(state.textScale);
}

/**
 * Display size. Real zoom (like the browser's Ctrl +/-) scales everything — text, spacing, images, video —
 * so a 43" screen at 80% looks like a laptop. Browsers without CSS zoom fall back to scaling the root font.
 */
function applyScale(scale: number) {
  const root = document.documentElement;
  if (CSS.supports("zoom", "1")) {
    root.style.zoom = String(scale);
    root.style.setProperty("--text-scale", "1");
  } else {
    root.style.setProperty("--text-scale", String(scale));
  }
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
  applyScale(state.textScale);
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
  deleteApplication(applicantId: string) {
    setState((s) => {
      const rest = Object.fromEntries(Object.entries(s.applications).filter(([id]) => id !== applicantId));
      return { ...s, applications: rest };
    });
  },
  /** Whole-interface size (root font size); 0.7 suits very large screens, 1.4 helps elderly pilgrims */
  setTextScale(scale: number) {
    setState((s) => ({ ...s, textScale: Math.min(1.4, Math.max(0.7, Math.round(scale * 100) / 100)) }));
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
  markTourSeen() {
    setState((s) => ({ ...s, tourSeen: true }));
  },
};
