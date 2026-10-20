"use client";

/**
 * One account per person, and what it does season by season. Creating the account never asks what for: whoever
 * opens one may only learn in the Academy. Each season he chooses — the Hajj, or an administrative role — and the
 * next season he may choose otherwise. What he did in an earlier season stays in his record for good, whatever he
 * chooses after it; and his Academy progress belongs to the account, not to a season.
 */
import { useMemo } from "react";
import { effectiveRole, positionLabelOf, seasonHistory } from "@/app/administrator/_lib/admin";
import { getPerson } from "./registry";
import { academyKey, seasonNow, useStore, type AdminProfile, type SeasonPath, type State } from "./store";

export type { SeasonPath };

type S = Pick<State, "accounts" | "applications" | "drafts" | "admins" | "formation">;

/** The season the platform lives in (the administration's «بدء موسم جديد» moves it) */
export const currentSeasonOf = (s: Pick<State, "formation">) => seasonNow(s);

/** He applied for a role, or holds a place, in his file's season */
function adminActive(p: AdminProfile | undefined) {
  return !!p && (p.positions.length > 0 || !!p.eligibleAt || !!p.feePaidAt || !!p.group || !!p.cluster || !!p.servesIn || !!p.coordinatorIn);
}

/** In an application of that season, his own or as a companion */
function inApplication(s: Pick<S, "applications">, id: string, season: number) {
  return Object.entries(s.applications).some(([owner, a]) => (a.season ?? 1448) === season && (owner === id || a.applicantId === id || a.members.some((m) => m.person.id === id)));
}

/**
 * What the account does in a season: what he chose, else what he did — an application of the season (his own,
 * one he is in, or one he is filling in), or an administrative file of the season with a role applied for.
 */
export function seasonPathOf(s: S, id: string, season = currentSeasonOf(s)): SeasonPath | null {
  const chosen = s.accounts[id]?.seasons?.[season]?.path;
  if (chosen) return chosen;
  if (inApplication(s, id, season) || (season === currentSeasonOf(s) && !!s.drafts[id])) return "pilgrim";
  const p = s.admins[id];
  if (p && (p.season ?? 1448) === season && adminActive(p)) return "admin";
  return null;
}

/**
 * Whether he may still take his choice back: nothing was started on it — no application or draft for the Hajj,
 * no role applied for in his administrative file.
 */
export function canChangePath(s: S, id: string, season = currentSeasonOf(s)) {
  const path = seasonPathOf(s, id, season);
  if (!path) return false;
  if (path === "pilgrim") return !inApplication(s, id, season) && !s.drafts[id];
  const p = s.admins[id];
  return !(p && (p.season ?? 1448) === season && adminActive(p));
}

/** The pilgrims' earlier seasons as the platform keeps them (the demo's) */
const PILGRIM_HISTORY: Record<string, { season: number; label: string }[]> = {
  "01012345412": [{ season: 1446, label: "تقدّم على الحج ولم يُقبل" }],
};

export type Participation = {
  season: number;
  kind: SeasonPath | "none";
  label: string;
  /** His group or cluster, as an administrator */
  detail?: string;
  rating?: number | null;
  /** The season the platform lives in now */
  current?: boolean;
};

/**
 * Every season of the account, oldest first: the Hajj and the administrative roles together, from the platform's
 * records of earlier seasons and from what he did this season. Nothing in it is ever removed.
 */
export function participations(s: S, id: string): Participation[] {
  const now = currentSeasonOf(s);
  const rows = new Map<number, Participation>();
  for (const h of seasonHistory(id)) {
    const season = Number(h.season);
    rows.set(season, h.roleKey ? { season, kind: "admin", label: h.role, detail: h.group || undefined, rating: h.rating } : { season, kind: "none", label: "لم يشارك" });
  }
  for (const h of PILGRIM_HISTORY[id] ?? []) if (rows.get(h.season)?.kind !== "admin") rows.set(h.season, { season: h.season, kind: "pilgrim", label: h.label });
  const hajj = getPerson(id)?.hajjBefore;
  if (hajj && hajj < now && rows.get(hajj)?.kind !== "admin") rows.set(hajj, { season: hajj, kind: "pilgrim", label: "أدّى الحج" });
  // The seasons the platform has lived since (a season the administration began), each as he left it
  for (let season = 1448; season <= now; season++) {
    const path = seasonPathOf(s, id, season);
    const app = s.applications[id];
    const p = s.admins[id];
    const role = p && (p.season ?? 1448) === season ? effectiveRole(p) : "";
    rows.set(season, {
      season,
      current: season === now,
      kind: path ?? "none",
      label:
        path === "pilgrim"
          ? app && (app.season ?? 1448) === season
            ? `طلب حج رقم ${app.number}`
            : inApplication(s, id, season)
              ? "في طلب حج"
              : "اختار الحج — لم يُقدَّم الطلب بعد"
          : path === "admin"
            ? role
              ? positionLabelOf(role)
              : "اختار المسار الإداري — لم يتقدم لصفة بعد"
            : season === now
              ? "لم يختر بعد"
              : "لم يشارك",
    });
  }
  return [...rows.values()].sort((a, b) => a.season - b.season);
}

/** The last season before this one he took part in (the Hajj or a role), for asking him how he goes on */
export function lastParticipation(s: S, id: string, season = currentSeasonOf(s)) {
  return [...participations(s, id)].reverse().find((r) => r.season < season && r.kind !== "none") ?? null;
}

/** The signed-in account and what it does this season */
export function useAccount() {
  const id = useStore((s) => s.sessionId);
  const accounts = useStore((s) => s.accounts);
  const applications = useStore((s) => s.applications);
  const drafts = useStore((s) => s.drafts);
  const admins = useStore((s) => s.admins);
  const formation = useStore((s) => s.formation);
  return useMemo(() => {
    const s = { accounts, applications, drafts, admins, formation };
    const season = currentSeasonOf(s);
    if (!id || !accounts[id]) return null;
    return {
      id,
      season,
      account: accounts[id],
      path: seasonPathOf(s, id, season),
      canChange: canChangePath(s, id, season),
      admin: admins[id],
      history: participations(s, id),
      last: lastParticipation(s, id, season),
    };
  }, [id, accounts, applications, drafts, admins, formation]);
}

/** The signed-in account's Academy progress, by lesson key («track/lesson») */
export function useAcademyProgress(): Record<string, true> {
  const id = useStore((s) => s.sessionId);
  const academy = useStore((s) => s.academy);
  return useMemo(() => {
    if (!id) return {};
    const prefix = academyKey(id, "");
    return Object.fromEntries(Object.keys(academy).filter((k) => k.startsWith(prefix)).map((k) => [k.slice(prefix.length), true as const]));
  }, [id, academy]);
}
