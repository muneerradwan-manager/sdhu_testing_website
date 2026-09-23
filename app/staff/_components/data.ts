"use client";

import { useMemo, useState } from "react";
import {
  SEED_ADMINS,
  SEED_APPLICATIONS,
  SEED_EVENTS,
  SEED_INCIDENTS,
  type ReviewDoc,
  type ReviewFlag,
  type Zone,
} from "@/lib/data/staff-seed";
import { fullName, getPerson } from "@/lib/registry";
import { evaluate, type EligibilityResult, type Member } from "@/lib/rules";
import { useSeason } from "@/lib/season-live";
import { setState, useStore, type AdminProfile, type AuditEvent, type Review, type Ticket } from "@/lib/store";
import { positionLabelOf } from "@/app/administrator/_lib/admin";

// ───────────────────────── Reviews ─────────────────────────

export type ReviewItem = {
  key: string;
  number: string;
  name: string;
  office: string;
  governorate: string;
  submittedAt: number;
  members: Member[];
  result: EligibilityResult;
  flags: ReviewFlag[];
  documents: ReviewDoc[];
  evidence: string;
  caseLabel: string;
  source: "real" | "seed";
  mode: string;
  review?: Review;
};

const MODE_LABEL: Record<string, string> = { booklet: "وثيقة العائلة", national: "الرقم الوطني", solo: "طلب فردي", manual: "إدخال يدوي" };

/** Real pilgrim applications that need a human decision, plus seeded cases from the operating document */
export function useReviewQueue() {
  const applications = useStore((s) => s.applications);
  const reviews = useStore((s) => s.reviews);
  const { rules } = useSeason();

  return useMemo(() => {
    const real: ReviewItem[] = [];
    for (const app of Object.values(applications)) {
      const result = evaluate(app.members, rules);
      const flags: ReviewFlag[] = [];
      app.members.forEach((m) => {
        if (m.relation !== "self" && !m.relationVerified) {
          flags.push({ title: `صلة غير مؤكدة: ${m.person.firstName}`, detail: "الصلة مصرّح بها من المتقدم ولم تؤكدها الشؤون المدنية آلياً.", tone: "gold" });
        }
      });
      result.members.forEach((mr) =>
        mr.checks.forEach((c) => {
          if (c.key === "relation") return;
          if (c.status === "warn") flags.push({ title: `${c.label} — ${mr.name.split(" ")[0]}`, detail: c.detail, tone: "gold" });
          if (c.status === "fail") flags.push({ title: `${c.label} — ${mr.name.split(" ")[0]}`, detail: c.detail, tone: "maroon" });
        }),
      );
      result.general.forEach((c) => c.status === "fail" && flags.push({ title: c.label, detail: c.detail, tone: "maroon" }));
      if (!flags.length) continue;
      const self = app.members.find((m) => m.relation === "self") ?? app.members[0];
      real.push({
        key: app.applicantId,
        number: app.number,
        name: self ? fullName(self.person) : app.applicantId,
        office: app.office,
        governorate: app.governorate,
        submittedAt: app.submittedAt,
        members: app.members,
        result,
        flags,
        documents: [
          { name: "صورة الهوية الوطنية", status: "ok" },
          { name: "جواز السفر", status: "ok" },
          { name: "إيصال رسم التسجيل", status: "ok", note: app.receipt },
        ],
        evidence:
          app.mode === "booklet"
            ? "أُضيف الأفراد من وثيقة العائلة المصوّرة — من هم خارج الوثيقة صلتهم مصرّح بها."
            : "أُضيف الأفراد بالرقم الوطني وموافقة كل فرد برمز على هاتفه.",
        caseLabel: flags[0].title,
        source: "real",
        mode: MODE_LABEL[app.mode] ?? app.mode,
        review: reviews[app.applicantId],
      });
    }
    const seeds: ReviewItem[] = SEED_APPLICATIONS.map((a) => {
      const self = a.members.find((m) => m.relation === "self")!;
      return {
        key: a.id,
        number: a.number,
        name: fullName(self.person),
        office: a.office,
        governorate: a.governorate,
        submittedAt: a.submittedAt,
        members: a.members,
        result: evaluate(a.members, rules),
        flags: a.flags,
        documents: a.documents,
        evidence: a.evidence,
        caseLabel: a.caseLabel,
        source: "seed",
        mode: MODE_LABEL[a.mode],
        review: reviews[a.id],
      };
    });
    return [...real.sort((a, b) => b.submittedAt - a.submittedAt), ...seeds];
  }, [applications, reviews, rules]);
}

// ───────────────────────── Tickets ─────────────────────────

export type QueueTicket = Ticket & { zone: Zone; seed: boolean; fromPilgrim: boolean };

export function zoneOf(location: string): Zone {
  if (location.includes("عرف")) return "arafat";
  if (location.includes("الجمرات")) return "jamarat";
  if (location.includes("منى")) return "mina";
  if (location.includes("مزدلف")) return "muzdalifah";
  return "makkah";
}

/** Seeded incidents are copied into the store the first time a staff member acts on them */
export function ensureTicket(t: Ticket) {
  setState((s) => (s.tickets.some((x) => x.id === t.id) ? s : { ...s, tickets: [...s.tickets, t] }));
}

export function toTicket(q: QueueTicket): Ticket {
  return {
    id: q.id,
    at: q.at,
    applicantId: q.applicantId,
    name: q.name,
    kind: q.kind,
    severity: q.severity,
    location: q.location,
    text: q.text,
    status: q.status,
    assignee: q.assignee,
    updates: q.updates,
    rating: q.rating,
  };
}

export function useTicketQueue() {
  const tickets = useStore((s) => s.tickets);
  const [base] = useState(() => Date.now());
  return useMemo(() => {
    const ids = new Set(tickets.map((t) => t.id));
    const seeds = SEED_INCIDENTS.filter((s) => !ids.has(s.id)).map<QueueTicket>(({ minutesAgo, zone, ...s }) => {
      const at = base - minutesAgo * 60_000;
      return { ...s, at, zone, seed: true, fromPilgrim: false, updates: s.updates.map((u, i) => ({ ...u, at: at + (i + 1) * 90_000 })) };
    });
    const seedZones = new Map(SEED_INCIDENTS.map((s) => [s.id, s.zone]));
    const stored = tickets.map<QueueTicket>((t) => ({
      ...t,
      zone: seedZones.get(t.id) ?? zoneOf(t.location),
      seed: seedZones.has(t.id),
      fromPilgrim: !!t.applicantId,
    }));
    const rank = { open: 0, in_progress: 1, resolved: 2 } as const;
    const sev = { critical: 0, high: 1, medium: 2, low: 3 } as const;
    return [...stored, ...seeds].sort((a, b) => rank[a.status] - rank[b.status] || sev[a.severity] - sev[b.severity] || b.at - a.at);
  }, [tickets, base]);
}

// ───────────────────────── Administrators ─────────────────────────

export type AdminRow = { id: string; name: string; position: string; profile: AdminProfile; seed: boolean; previous?: string };

export function useAdminRows() {
  const admins = useStore((s) => s.admins);
  return useMemo(() => {
    const seedById = new Map(SEED_ADMINS.map((s) => [s.profile.nationalId, s]));
    const real = Object.values(admins).map<AdminRow>((p) => {
      const seed = seedById.get(p.nationalId);
      const person = getPerson(p.nationalId);
      return {
        id: p.nationalId,
        name: seed?.name ?? (person ? fullName(person) : p.nationalId),
        // The portal stores a role key; the seeded rows carry an Arabic label — show a label either way
        position: p.positions[0] ? positionLabelOf(p.positions[0]) : (seed?.position ?? "إداري"),
        profile: seed ? { ...seed.profile, ...p } : p,
        seed: false,
        previous: seed?.previous,
      };
    });
    const realIds = new Set(real.map((r) => r.id));
    const seeds = SEED_ADMINS.filter((s) => !realIds.has(s.profile.nationalId)).map<AdminRow>((s) => ({
      id: s.profile.nationalId,
      name: s.name,
      position: s.position,
      profile: s.profile,
      seed: true,
      previous: s.previous,
    }));
    return [...real, ...seeds];
  }, [admins]);
}

/** Patch an administrator; seeded candidates are written to the store in full the first time */
export function patchAdmin(row: AdminRow, patch: Partial<AdminProfile>, upsert: (id: string, p: Partial<AdminProfile>) => void) {
  upsert(row.id, row.seed ? { ...row.profile, ...patch } : patch);
}

// ───────────────────────── Events ─────────────────────────

/** Newest real (this demo) events first, then the seeded season archive */
export function useAllEvents() {
  const events = useStore((s) => s.events);
  return useMemo(() => {
    const live = [...events].reverse().map((e) => ({ ...e, live: true }));
    const archive = [...SEED_EVENTS].sort((a, b) => b.at - a.at).map((e) => ({ ...e, live: false }));
    return [...live, ...archive] as (AuditEvent & { live: boolean })[];
  }, [events]);
}

export function lastEvent(events: AuditEvent[], match: (e: AuditEvent) => boolean) {
  for (let i = events.length - 1; i >= 0; i--) if (match(events[i])) return events[i];
  return undefined;
}
