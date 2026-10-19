"use client";

import { useMemo } from "react";
import { familiesOfGroup, groupsOfCluster, teamOfGroup, type GroupRef, type Traveler } from "./flights";
import { actions, getState, setState, useStore } from "./store";
import { seeded } from "./utils";

/**
 * القوائم: before each rite, who of a cluster goes, and on which of its buses. The Hajj and Umrah staff (فريق
 * المواصلات) give each cluster its buses for every list — a number, a plate, a driver and seats; the technical
 * coordinator seats on them the pilgrims and the administrators of the groups sorted to him, as he puts groups on
 * flights. The Rawdah has no buses: two lists, of the men and of the women who go. The cluster's head, its assistant and its accountant follow the lists; each
 * pilgrim sees his own bus in his portal.
 */
export type ListKind = "tarwiya" | "arafat" | "mina" | "madinah" | "rawdah";

export const LIST_KINDS: { key: ListKind; label: string; desc: string; when: string; unit: string }[] = [
  { key: "tarwiya", label: "التروية", desc: "من الفندق في مكة إلى مخيم المجموعة في منى، يوم الثامن.", when: "8 ذو الحجة — بعد صلاة الفجر", unit: "حافلة" },
  { key: "arafat", label: "عرفة", desc: "من منى إلى عرفات يوم التاسع، ومنها إلى مزدلفة بعد المغرب.", when: "9 ذو الحجة — بعد شروق الشمس", unit: "حافلة" },
  { key: "mina", label: "منى أيام التشريق", desc: "من مزدلفة إلى منى، والتنقل بين المخيم والجمرات والحرم أيام التشريق.", when: "10 – 13 ذو الحجة", unit: "حافلة" },
  { key: "madinah", label: "الذهاب إلى المدينة المنورة", desc: "من الفندق في مكة إلى الفندق في المدينة المنورة.", when: "18 ذو الحجة — بعد صلاة الظهر", unit: "حافلة" },
  { key: "rawdah", label: "حجز الروضة الشريفة", desc: "من يذهب إلى الروضة الشريفة: قائمة للرجال، وقائمة للنساء.", when: "في المدينة المنورة", unit: "قائمة" },
];
export const listKind = (k: ListKind) => LIST_KINDS.find((x) => x.key === k)!;

/** What the staff give a cluster for one list: a bus — or, for the Rawdah, its list of the men or of the women */
export type ListUnit = {
  id: string;
  clusterId: string;
  kind: ListKind;
  label: string;
  /** A bus's plate and driver, or a slot's gate */
  plate?: string;
  driver?: string;
  driverPhone?: string;
  when: string;
  seats: number;
  /** The Rawdah's list is of the men or of the women */
  gender?: "M" | "F";
  by: string;
};

/** A coordinator's request for one more bus, when his groups do not fit on the buses the cluster was given */
export type BusRequest = {
  id: string;
  clusterId: string;
  kind: ListKind;
  /** How many of his groups are left without a seat */
  count: number;
  note?: string;
  by: string;
  byId: string;
  at: number;
  status: "pending" | "approved" | "rejected";
  decidedBy?: string;
  decidedAt?: number;
  /** Why it was refused */
  reason?: string;
  /** The bus given for it */
  unitId?: string;
};

export type ListsState = {
  /** The coordinators' requests for more buses, newest first */
  requests?: BusRequest[];
  /** Units the staff added beyond the season's plan */
  units?: ListUnit[];
  /** Planned units the staff took back */
  removed?: string[];
  /** Who is seated on each unit, by his id */
  seats?: Record<string, string[]>;
};

const DRIVERS = ["عبد الله الغامدي", "سعيد الزهراني", "فهد القحطاني", "ماجد الحربي", "خالد العتيبي", "ناصر الشهري", "تركي المطيري", "بندر الدوسري"];

/** The cluster's travellers: every pilgrim and administrator of its groups */
export function clusterTravellers(clusterId: string, post = getState().post, applications = getState().applications, admins = getState().admins) {
  return groupsOfCluster(clusterId).map((g) => ({ g, people: [...familiesOfGroup(g, post, applications).flatMap((f) => f.members), ...teamOfGroup(g, admins)] }));
}

/** The season's plan for a cluster: as many buses of 49 seats as its people need, and the Rawdah's two lists */
export function plannedUnits(clusterId: string): ListUnit[] {
  const groups = groupsOfCluster(clusterId);
  const people = groups.reduce((n, g) => n + g.pilgrims + 4, 0);
  if (!people) return [];
  const rnd = seeded(`buses-${clusterId}`);
  const buses = Math.ceil(people / 49);
  const out: ListUnit[] = [];
  for (const k of LIST_KINDS.filter((x) => x.key !== "rawdah")) {
    for (let i = 0; i < buses; i++) {
      const d = DRIVERS[Math.floor(rnd() * DRIVERS.length)];
      out.push({ id: `${clusterId}-${k.key}-${i + 1}`, clusterId, kind: k.key, label: `حافلة ${i + 1}`, plate: `${1000 + Math.floor(rnd() * 8999)} ح ج ع`, driver: d, driverPhone: `+9665${String(10000000 + Math.floor(rnd() * 89999999))}`, when: k.when, seats: 49, by: "فريق المواصلات" });
    }
  }
  // Not a bus: everyone of the cluster may be on it
  for (const g of ["M", "F"] as const) out.push({ id: `${clusterId}-rawdah-${g}`, clusterId, kind: "rawdah", label: g === "M" ? "الروضة الشريفة — الرجال" : "الروضة الشريفة — النساء", when: "في المدينة المنورة", seats: people, gender: g, by: "" });
  return out;
}

export function useLists(): Required<ListsState> {
  const s = useStore((x) => x.riteLists);
  return useMemo(() => ({ units: s?.units ?? [], removed: s?.removed ?? [], seats: s?.seats ?? {}, requests: s?.requests ?? [] }), [s]);
}

/** A cluster's units for one list (or all), the planned ones the staff kept and those they added */
export function useClusterUnits(clusterId: string | undefined, kind?: ListKind) {
  const lists = useLists();
  return useMemo(() => {
    if (!clusterId) return [];
    const all = [...plannedUnits(clusterId).filter((u) => !lists.removed.includes(u.id)), ...lists.units.filter((u) => u.clusterId === clusterId)];
    return kind ? all.filter((u) => u.kind === kind) : all;
  }, [clusterId, kind, lists]);
}

export function useClusterTravellers(clusterId: string | undefined) {
  const post = useStore((s) => s.post);
  const applications = useStore((s) => s.applications);
  const admins = useStore((s) => s.admins);
  return useMemo(() => (clusterId ? clusterTravellers(clusterId, post, applications, admins) : []), [clusterId, post, applications, admins]);
}

const write = (patch: (l: Required<ListsState>) => Partial<ListsState>) =>
  setState((s) => {
    const l = { units: s.riteLists?.units ?? [], removed: s.riteLists?.removed ?? [], seats: s.riteLists?.seats ?? {}, requests: s.riteLists?.requests ?? [] };
    return { ...s, riteLists: { ...l, ...patch(l) } };
  });

type Actor = { name: string; role: string };

export const listsActions = {
  /** Seat people on a unit, as many as it has seats left; whoever is on another unit of the same list moves */
  seat(unit: ListUnit, ids: string[], actor: Actor, others: ListUnit[], names: Record<string, string>) {
    const seats = getState().riteLists?.seats ?? {};
    const free = unit.seats - (seats[unit.id]?.length ?? 0);
    const add = ids.filter((id) => !seats[unit.id]?.includes(id)).slice(0, Math.max(0, free));
    if (!add.length) return 0;
    write((l) => {
      const next = { ...l.seats };
      for (const o of others) if (o.id !== unit.id && next[o.id]) next[o.id] = next[o.id].filter((x) => !add.includes(x));
      next[unit.id] = [...(next[unit.id] ?? []), ...add];
      return { seats: next };
    });
    actions.logEvent({ actor: actor.name, role: actor.role, action: `إسناد إلى ${unit.label} — قائمة ${listKind(unit.kind).label}`, target: unit.clusterId, detail: add.length > 3 ? `${add.length} أشخاص` : add.map((x) => names[x] ?? x).join("، "), system: "transport" });
    return add.length;
  },
  unseat(unit: ListUnit, id: string, actor: Actor, name: string) {
    write((l) => ({ seats: { ...l.seats, [unit.id]: (l.seats[unit.id] ?? []).filter((x) => x !== id) } }));
    actions.logEvent({ actor: actor.name, role: actor.role, action: `إزالة عن ${unit.label} — قائمة ${listKind(unit.kind).label}`, target: unit.clusterId, detail: name, system: "transport" });
  },
  /** The staff: a bus more for a cluster's list */
  addUnit(u: Omit<ListUnit, "id">) {
    const id = `${u.clusterId}-${u.kind}-x${Date.now().toString(36)}`;
    write((l) => ({ units: [...l.units, { ...u, id }] }));
    actions.logEvent({ actor: u.by, role: "فريق المواصلات", action: `إسناد ${u.label} إلى قائمة ${listKind(u.kind).label}`, target: u.clusterId, detail: `${u.seats} مقعداً${u.plate ? ` — ${u.plate}` : ""}`, system: "transport" });
    return id;
  },
  /** The coordinator: his groups do not fit on the cluster's buses for a list, so he asks the staff for one more */
  requestBus(r: Omit<BusRequest, "id" | "at" | "status">) {
    const at = Date.now();
    write((l) => ({ requests: [{ ...r, id: `br-${at.toString(36)}`, at, status: "pending" }, ...l.requests] }));
    actions.logEvent({ actor: r.by, role: "المنسق التقني", action: `طلب حافلة إضافية — قائمة ${listKind(r.kind).label}`, target: r.clusterId, detail: `${r.count} بلا مقعد${r.note ? ` — ${r.note}` : ""}`, system: "transport" });
  },
  /** The staff approve it: a bus of 49 seats is given to the cluster for that list */
  approveBus(r: BusRequest, by: string, unit: { label: string; plate?: string; driver?: string; seats: number }) {
    const unitId = listsActions.addUnit({ clusterId: r.clusterId, kind: r.kind, when: listKind(r.kind).when, by, ...unit });
    write((l) => ({ requests: l.requests.map((x) => (x.id === r.id ? { ...x, status: "approved", decidedBy: by, decidedAt: Date.now(), unitId } : x)) }));
  },
  rejectBus(r: BusRequest, by: string, reason: string) {
    write((l) => ({ requests: l.requests.map((x) => (x.id === r.id ? { ...x, status: "rejected", decidedBy: by, decidedAt: Date.now(), reason } : x)) }));
    actions.logEvent({ actor: by, role: "فريق المواصلات", action: `رفض طلب حافلة إضافية — قائمة ${listKind(r.kind).label}`, target: r.clusterId, detail: reason, system: "transport" });
  },
  /** The staff take a unit back: whoever was on it is unseated */
  removeUnit(u: ListUnit, by: string) {
    write((l) => {
      const seats = { ...l.seats };
      delete seats[u.id];
      return u.id.includes("-x") ? { units: l.units.filter((x) => x.id !== u.id), seats } : { removed: [...l.removed, u.id], seats };
    });
    actions.logEvent({ actor: by, role: "فريق المواصلات", action: `سحب ${u.label} من قائمة ${listKind(u.kind).label}`, target: u.clusterId, system: "transport" });
  },
};

/** Where a person is seated on each list: his bus or his slot */
export function useMyLists(personIds: string[]) {
  const lists = useLists();
  const key = personIds.join(",");
  return useMemo(() => {
    const ids = key ? key.split(",") : [];
    const out: { personId: string; unitId: string }[] = [];
    for (const [unitId, seated] of Object.entries(lists.seats)) for (const id of seated) if (ids.includes(id)) out.push({ personId: id, unitId });
    return out;
  }, [lists, key]);
}

/** A unit by its id, among the planned and the added */
export function unitById(id: string, units: ListUnit[] = getState().riteLists?.units ?? []): ListUnit | undefined {
  const added = units.find((u) => u.id === id);
  if (added) return added;
  const clusterId = groupsClusterOf(id);
  return clusterId ? plannedUnits(clusterId).find((u) => u.id === id) : undefined;
}
const groupsClusterOf = (unitId: string) => {
  const m = unitId.match(/^(.*)-(tarwiya|arafat|mina|madinah|rawdah)-/);
  return m?.[1];
};

export type { GroupRef, Traveler };
