"use client";

import { useMemo } from "react";
import { groupName } from "@/lib/groups";
import { dayOf } from "@/lib/operations";
import { getPerson } from "@/lib/registry";
import { actions, getState, useStore, type CadreContact, type CadreEvent, type CadreEventType, type CadrePerson, type ClusterRecord, type State } from "@/lib/store";
import { DEMO_ADMINS } from "./admin";
import { HEADS_POOL, PEOPLE } from "./people";
import { acceptedGroups } from "./cluster";
import { ACCOUNTANT_TITLE, DEPUTY_TITLE, SEASON_FORMED, useClusterRequests, type ClusterRequest } from "./formation";
import { ageOfId, roleName, structureNow } from "./structure";

/**
 * The cadre across the seasons, as the administration's platform keeps it («إدارة الكادر الإداري» and «سجل
 * الأحداث» there): each person's base role and this season's, his post in his cluster, his branch and category,
 * how he is reached and signs in (phone, card barcode, PIN, Telegram), whether his account works, and the events
 * of his file. The staff change it from «الكادر الإداري»; the administrator sees his own PIN and links Telegram.
 */

// ───────────────────────── The events of a person's file ─────────────────────────

export const EVENT_TYPES: Record<CadreEventType, { label: string; icon: string }> = {
  joined: { label: "انضمام إلى تكتل", icon: "🟢" },
  exceptional: { label: "تعديل استثنائي على التشكيل", icon: "⚠️" },
  role: { label: "تغيير الصفة", icon: "🔄" },
  seasonal: { label: "تغيير الصفة الموسمية", icon: "🗓️" },
  branch: { label: "تغيير الفرع", icon: "🏢" },
  category: { label: "تغيير الفئة", icon: "🏷️" },
  added: { label: "إضافة كادر جديد", icon: "🆕" },
  status: { label: "إيقاف الحساب أو تفعيله", icon: "⛔" },
  deleted: { label: "حذف كادر نهائياً", icon: "🗑️" },
  note: { label: "حدث عام / ملاحظة", icon: "📝" },
};

/** «🟢 انضمام إلى تكتل» */
export const eventLabel = (t: CadreEventType) => `${EVENT_TYPES[t].icon} ${EVENT_TYPES[t].label}`;

/** What the season's own records hold from before this demo (season 1447 and the start of 1448), all invented */
const SEED_EVENTS: CadreEvent[] = [
  { id: "se-1", personId: "01033300941", name: "عماد الشامي", type: "branch", season: 1447, date: "2025-11-03", change: "حمص ← دمشق", note: "انتقل سكنه إلى دمشق — بطلبه", by: "مازن الحلبي", at: Date.UTC(2025, 10, 3, 9) },
  { id: "se-2", personId: "seed-02", name: "فراس البيطار", type: "category", season: 1447, date: "2025-11-20", change: "الفئة الأولى ← الفئة الثانية", note: "تقييم الموسم 1446 فوق 4.2", by: "رهف الخطيب", at: Date.UTC(2025, 10, 20, 10) },
  { id: "se-3", personId: "01033300953", name: "الشيخ وائل الحافظ", type: "role", season: 1447, date: "2025-10-28", change: "موجّه ديني ب ← موجّه ديني أ", note: "أربعة مواسم بتقييم 4.8 — ترقية بقرار لجنة الشؤون الدينية", by: "مازن الحلبي", at: Date.UTC(2025, 9, 28, 11) },
  { id: "se-4", personId: "01033300976", name: "هاني الطويل", type: "added", season: 1447, date: "2025-10-15", change: "معاون بعدد — فرع حماة", note: "أُضيف بكتاب فرع حماة", by: "ماهر عيسى", at: Date.UTC(2025, 9, 15, 12) },
  { id: "se-5", personId: "seed-05", name: "صالح العلي", type: "note", season: 1447, date: "2026-01-12", note: "شكر من بعثة المدينة على تنظيم تفويج مجموعته", by: "رهف الخطيب", at: Date.UTC(2026, 0, 12, 13) },
  { id: "se-6", personId: "01033300958", name: "الشيخ يوسف المحمد", type: "exceptional", season: 1447, date: "2025-12-02", change: "نُقل من مقعد الموجّه في مجموعة إلى المقعد الحر في أخرى", note: "اتحاد مجموعتين في تكتل الساحل", by: "مازن الحلبي", at: Date.UTC(2025, 11, 2, 9) },
  { id: "se-7", personId: "01033300964", name: "سيف الدين حلاق", type: "note", season: 1447, date: "2026-02-08", note: "تأخر عن موعد التجمّع في مطار دمشق — تنبيه أول", by: "ماهر عيسى", at: Date.UTC(2026, 1, 8, 15) },
  { id: "se-8", personId: "seed-01", name: "عبد الرحمن القباني", type: "role", season: 1448, date: "2026-09-02", change: "رئيس مجموعة ← رئيس تكتل", note: "أربعة مواسم رئيس مجموعة بتقييم 4.7: ثبّتته الإدارة رئيس تكتل صفةً أساسية", by: "مازن الحلبي", at: Date.UTC(2026, 8, 2, 10) },
  { id: "se-9", personId: "seed-04", name: "حسام الساعاتي", type: "role", season: 1448, date: "2026-09-02", change: "رئيس مجموعة ← رئيس تكتل", note: "خمسة مواسم بتقييم 4.6: ثبّتته الإدارة رئيس تكتل صفةً أساسية", by: "مازن الحلبي", at: Date.UTC(2026, 8, 2, 10, 5) },
];

/** Where each person serves in an approved cluster, in the platform's words: «رئيس المجموعة»، «محاسب التكتل، منسق تقني بالتكتل» */
export type Place = { clusterId: string; clusterName: string; posts: string[]; group?: number; season: number; decidedAt?: number; decidedBy?: string };

export function placesOf(req: Pick<ClusterRequest, "headId" | "season">, c: ClusterRecord): Map<string, Place> {
  const out = new Map<string, Place>();
  const yes = (s?: string) => s === "accepted";
  const put = (id: string, post: string, group?: number) => {
    const cur = out.get(id) ?? { clusterId: c.id, clusterName: c.name, posts: [], season: req.season, decidedAt: c.decision?.at, decidedBy: c.decision?.by };
    if (!cur.posts.includes(post)) cur.posts.push(post);
    if (group !== undefined && cur.group === undefined) cur.group = group;
    out.set(id, cur);
  };
  put(req.headId, "رئيس التكتل");
  for (const g of acceptedGroups(c)) {
    put(g.id, "رئيس المجموعة", g.number);
    for (const seat of c.seats[g.number] ?? []) if (seat.who && yes(seat.who.status)) put(seat.who.id, seat.kind === "guide" ? "موجّه أو مرشد" : "معاون", g.number);
  }
  for (const x of c.assistants) if (yes(x.status)) put(x.id, "معاون التكتل");
  for (const x of c.coordinators) if (yes(x.status)) put(x.id, "منسق تقني بالتكتل");
  for (const x of c.femaleGuides) if (yes(x.status)) put(x.id, "موجّهة دينية بالتكتل");
  if (c.deputy && yes(c.deputy.status)) put(c.deputy.id, DEPUTY_TITLE);
  if (c.accountant && yes(c.accountant.status)) put(c.accountant.id, ACCOUNTANT_TITLE);
  return out;
}

/** Each person's place in the season's approved clusters (an archived one stays in his file, not in his post) */
export function useCadrePlaces() {
  const requests = useClusterRequests();
  return useMemo(() => {
    const map = new Map<string, Place>();
    for (const r of requests) if (r.status === "approved" && !r.archived) for (const [id, p] of placesOf(r, r.cluster)) map.set(id, p);
    return map;
  }, [requests]);
}

/**
 * Every event of the cadre, newest first: joining an approved cluster (read from the cluster, so it is never
 * written twice), the seasonal roles of the season's story, the records from before the demo, and everything
 * the staff did or wrote since.
 */
export function useCadreEvents(): CadreEvent[] {
  const requests = useClusterRequests();
  const stored = useStore((s) => s.cadre.events);
  const seasonal = useStore((s) => s.cadre.seasonal);
  return useMemo(() => {
    const joined: CadreEvent[] = requests
      .filter((r) => r.status === "approved" && r.cluster.decision)
      .flatMap((r) =>
        [...placesOf(r, r.cluster)].map(([id, p]) => ({
          id: `j-${r.cluster.id}-${id}`,
          personId: id,
          name: nameOf(id, r),
          type: "joined" as const,
          season: r.season,
          date: dayOf(new Date(r.cluster.decision!.at)),
          change: `${r.cluster.name} — ${p.posts.join("، ")}${p.group !== undefined ? ` (${groupName(p.group)})` : ""}`,
          note: "باعتماد طلب التكتل",
          by: r.cluster.decision!.by,
          at: r.cluster.decision!.at,
        })),
      );
    // The seasonal roles the season's story granted, unless the staff have since changed them (their own event is stored)
    const granted: CadreEvent[] = Object.entries(PEOPLE)
      .filter(([id, x]) => x.seasonal && seasonal[id] === undefined)
      .map(([id, x]) => ({ id: `g-${id}`, personId: id, name: nameOf(id), type: "seasonal" as const, season: SEASON_FORMED, date: dayOf(new Date(x.seasonal!.at)), change: `منح صفة «${roleName(x.seasonal!.role, structureNow())}» الموسمية`, note: x.seasonal!.reason, by: x.seasonal!.by, at: x.seasonal!.at }));
    return [...stored, ...joined, ...granted, ...SEED_EVENTS].sort((a, b) => b.at - a.at);
  }, [requests, stored, seasonal]);
}

/** A person's name wherever the season knows him: added by hand, a demo account, the roster, a group's head, a request */
export function nameOf(id: string, req?: Pick<ClusterRequest, "cluster" | "headId" | "headName">) {
  const added = getState().cadre.added[id];
  if (added) return added.name;
  const demo = DEMO_ADMINS.find((d) => d.id === id);
  if (demo) return demo.title.split(" — ")[0];
  const head = HEADS_POOL.find((h) => h.id === id);
  if (head) return head.name;
  if (req) {
    if (req.headId === id) return req.headName;
    const c = req.cluster;
    const all = [...Object.values(c.groups), ...Object.values(c.seats).flat().flatMap((x) => (x.who ? [x.who] : [])), ...c.assistants, ...c.coordinators, ...c.femaleGuides, c.deputy, c.accountant];
    const hit = all.find((x) => x?.id === id);
    if (hit) return hit.name;
  }
  return getPerson(id)?.firstName ? `${getPerson(id)!.firstName} ${getPerson(id)!.lastName}` : id;
}

/** Writes one event into a person's file, in the season it belongs to */
export function logCadre(personId: string, name: string, type: CadreEventType, by: string, e: { change?: string; note?: string; date?: string; season?: number | null } = {}) {
  actions.addCadreEvent({ personId, name, type, by, change: e.change, note: e.note, date: e.date ?? dayOf(new Date()), season: e.season === undefined ? (getState().formation.season ?? SEASON_FORMED) : e.season });
}

// ───────────────────────── How he is reached and signs in ─────────────────────────

const hash = (id: string) => {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
};

/**
 * What the season's records hold of someone the staff did not edit: his phone, birth date, the barcode of his
 * card and his login PIN, and — for most of the cadre, never the demo accounts, who link it themselves — the
 * Telegram bot he started. All invented, and the same on every device.
 */
function seedContact(id: string): CadreContact {
  const h = hash(id);
  const demo = DEMO_ADMINS.find((d) => d.id === id);
  const added = getState().cadre.added[id];
  const person = getPerson(id);
  const age = ageOfId(id);
  const birth = person?.birthDate ?? added?.birth ?? (age ? `${2026 - age}-${String(1 + (h % 12)).padStart(2, "0")}-${String(1 + (h % 27)).padStart(2, "0")}` : undefined);
  return {
    phone: demo?.phone ?? added?.phone ?? `09${3 + (h % 7)}${String(h % 10_000_000).padStart(7, "0")}`,
    birth,
    barcode: `48${String(h % 1_000_000).padStart(6, "0")}`,
    pin: String(1000 + (h % 9000)),
    chatId: demo || added || h % 5 > 2 ? undefined : String(5_000_000_000 + (h % 900_000_000)),
  };
}

/** His contact as the staff left it, over the season's records */
export function contactOf(id: string, cadre: State["cadre"] = getState().cadre): CadreContact {
  const c = { ...seedContact(id), ...cadre.contact[id] };
  // An empty chat id is a bot he unlinked
  return { ...c, chatId: c.chatId || undefined };
}

/** Is his account stopped or deleted? */
export function statusOf(id: string, cadre: State["cadre"] = getState().cadre) {
  return cadre.status[id];
}

/** «● متصل الآن»، «آخر ظهور: …»، «غير متصل» — a heartbeat within two minutes is online */
export function presenceOf(id: string, presence: Record<string, number>, now: number): { online: boolean; at?: number } {
  const at = presence[id];
  return { online: !!at && now - at < 120_000, at };
}

/** A fresh PIN for him, which reaches him by the bot or by the office */
export function newPin(seed: number) {
  return String(1000 + (seed % 9000));
}

export type { CadrePerson };
