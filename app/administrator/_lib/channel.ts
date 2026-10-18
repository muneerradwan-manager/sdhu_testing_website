"use client";

import { useMemo } from "react";
import { actions, getState, useStore, type AdminProfile, type ChannelMessage, type ClusterChannel, type ClusterRecord, type State } from "@/lib/store";
import { getPerson } from "@/lib/registry";
import { nowMs } from "@/lib/utils";
import { logAdmin } from "./admin";
import { SEED_CLUSTERS, acceptedGroups, headRecordOf } from "./cluster";

/**
 * «قناة التكتل»: one channel for everyone who works in a cluster — its head and the accountant, the
 * heads of its groups and their assistants and guides, its coordinators, female guides and assistants. All of
 * them read it. Who writes is by role, as the head sets it (by default the head alone: a channel of
 * announcements); he may open it to the group heads or to everyone, stop one member from writing, pin a
 * message on top, and take any message down. Each writer may take his own down.
 */

export type ChannelRole = "head" | "accountant" | "group-head" | "cluster-assistant" | "tech" | "guide-f" | "guide" | "assistant";

/** The roles of a cluster, in its order: one name each in the channel */
export const CHANNEL_ROLES: { key: ChannelRole; label: string; plural: string }[] = [
  { key: "head", label: "رئيس التكتل", plural: "رئيس التكتل" },
  { key: "accountant", label: "محاسب التكتل", plural: "محاسب التكتل" },
  { key: "group-head", label: "رئيس مجموعة", plural: "رؤساء المجموعات" },
  { key: "cluster-assistant", label: "معاون التكتل", plural: "معاونو التكتل" },
  { key: "tech", label: "منسق تقني", plural: "المنسقون التقنيون" },
  { key: "guide-f", label: "موجّهة دينية", plural: "الموجّهات الدينيات" },
  { key: "guide", label: "موجّه ديني", plural: "الموجّهون الدينيون" },
  { key: "assistant", label: "معاون مجموعة", plural: "معاونو المجموعات" },
];
export const roleLabel = (r: string) => CHANNEL_ROLES.find((x) => x.key === r)?.label ?? r;

/** Who writes, ready-made: the head picks one, or ticks the roles one by one */
export const WRITER_PRESETS: { key: string; label: string; hint: string; roles: ChannelRole[] }[] = [
  { key: "head", label: "رئيس التكتل وحده", hint: "قناة إعلانات من رئيس التكتل", roles: ["head"] },
  { key: "heads", label: "القيادة ورؤساء المجموعات", hint: "رئيس التكتل ومحاسبه ورؤساء المجموعات", roles: ["head", "accountant", "group-head"] },
  { key: "all", label: "كل أعضاء التكتل", hint: "الجميع يكتب ويردّ", roles: CHANNEL_ROLES.map((r) => r.key) },
];
const DEFAULT_WRITERS: ChannelRole[] = ["head"];

export type ChannelMember = { id: string; name: string; role: ChannelRole; groups: number[] };

/**
 * Everyone who accepted a place in the cluster, once each, by his highest role there (the head heads a group
 * too; the accountant may hold an assistant's seat): the head first, then the cluster's order
 */
export function channelMembers(c: ClusterRecord, headId: string, headName: string): ChannelMember[] {
  const out = new Map<string, ChannelMember>();
  const put = (id: string, name: string, role: ChannelRole, group?: number) => {
    const had = out.get(id);
    if (!had) out.set(id, { id, name, role, groups: group ? [group] : [] });
    else if (group && !had.groups.includes(group)) had.groups.push(group);
  };
  put(headId, headName, "head");
  if (c.accountant?.status === "accepted") put(c.accountant.id, c.accountant.name, "accountant");
  for (const g of acceptedGroups(c)) put(g.id, g.name, "group-head", g.number);
  for (const x of c.assistants) if (x.status === "accepted") put(x.id, x.name, "cluster-assistant");
  for (const x of c.coordinators) if (x.status === "accepted") put(x.id, x.name, "tech");
  for (const x of c.femaleGuides) if (x.status === "accepted") put(x.id, x.name, "guide-f");
  for (const [n, seats] of Object.entries(c.seats))
    for (const seat of seats) if (seat.who?.status === "accepted") put(seat.who.id, seat.who.name, seat.kind === "guide" ? "guide" : "assistant", Number(n));
  const order = (r: ChannelRole) => CHANNEL_ROLES.findIndex((x) => x.key === r);
  return [...out.values()].sort((a, b) => order(a.role) - order(b.role));
}

type Found = { headId: string; headName: string; cluster: ClusterRecord };

/** A head's name as the season's records write it (first and last), else as the civil registry has it */
function nameOf(id: string) {
  const seed = SEED_CLUSTERS.find((x) => x.headId === id);
  if (seed) return seed.headName;
  const p = getPerson(id);
  return p ? `${p.firstName} ${p.lastName}` : id;
}

/** The cluster an administrator works in: his own, the one he serves as accountant or team, or his group's */
export function clusterOfMember(id: string, p: AdminProfile | undefined, s: Pick<State, "admins" | "formation">): Found | null {
  const rec = headRecordOf(p, s.admins, s.formation.overrides);
  if (rec) return { headId: rec.headId, headName: nameOf(rec.headId), cluster: rec.cluster };
  const cid = p?.group?.clusterId;
  if (!cid) return null;
  const live = Object.entries(s.admins).find(([, a]) => a.cluster?.id === cid);
  if (live) return { headId: live[0], headName: nameOf(live[0]), cluster: live[1].cluster! };
  const made = s.formation.created.find((x) => x.cluster.id === cid);
  if (made) return { headId: made.headId, headName: made.headName, cluster: made.cluster };
  const seed = SEED_CLUSTERS.find((x) => x.cluster.id === cid);
  return seed ? { headId: seed.headId, headName: seed.headName, cluster: s.formation.overrides[cid] ?? seed.cluster } : null;
}

/**
 * تكتل النور's channel as the season left it: the head opened it to the group heads, and they used it over the
 * last two days. Dated back from the demo's day, so a message written now always comes after them.
 */
function seeds(today: string | undefined): Record<string, ClusterChannel> {
  const base = today ? new Date(`${today}T00:00:00`) : new Date(new Date().setHours(0, 0, 0, 0));
  const at = (daysAgo: number, h: number, m = 0) => base.getTime() - daysAgo * 86_400_000 + (h * 60 + m) * 60_000;
  return {
    "al-nour": {
      writers: ["head", "accountant", "group-head"],
      messages: [
        { id: "n1", by: "01033300881", name: "عبد الرحمن العلي", role: "head", text: "السلام عليكم. هذه قناة تكتل النور لكل كادره: الإعلانات من القيادة، ويكتب فيها رؤساء المجموعات. الأسئلة الخاصة بمجموعة واحدة تبقى مع رئيسها.", at: at(2, 10), pinned: true },
        { id: "n2", by: "01033300881", name: "عبد الرحمن العلي", role: "head", text: "اجتماع رؤساء المجموعات والمنسقين يوم الخميس القادم الساعة 18:00 في مكتب دمشق: توزيع المنسقين والموجّهات، وخطة التفويج.", at: at(2, 12) },
        { id: "n3", by: "01033300871", name: "أحمد سليمان الحمصي", role: "group-head", text: "حاضرون إن شاء الله. هل نحضر قوائم الحجاج المطبوعة أم تكفي على المنصة؟", at: at(2, 13, 15), replyTo: "n2" },
        { id: "n4", by: "01033300883", name: "بسام درويش", role: "group-head", text: "تكفي على المنصة. أحضروا فقط أرقام هواتف معاونيكم.", at: at(2, 13, 40), replyTo: "n3" },
        { id: "n5", by: "01033300944", name: "مهند السيد", role: "accountant", text: "تذكير: رسوم خدمات التكتل تُسدَّد قبل آخر الشهر، والإيصالات ترفع إليّ.", at: at(1, 9, 5) },
      ],
    },
  };
}
/** A cluster's channel before anyone touched it on this device */
export const channelSeed = (clusterId: string, today = getState().clock.today): ClusterChannel => seeds(today)[clusterId] ?? {};

export type ClusterChannelView = {
  clusterId: string;
  clusterName: string;
  members: ChannelMember[];
  me: ChannelMember;
  channel: ClusterChannel;
  writers: ChannelRole[];
  messages: ChannelMessage[];
  /** Only the head runs the channel */
  manager: boolean;
  canWrite: boolean;
  /** Why he cannot write, when he cannot */
  readOnly?: string;
  unread: number;
};

/** The channel of the cluster this administrator works in, or null when he works in none */
export function useClusterChannel(id: string | undefined, p: AdminProfile | undefined): ClusterChannelView | null {
  const admins = useStore((s) => s.admins);
  const formation = useStore((s) => s.formation);
  const channels = useStore((s) => s.channels);
  const today = useStore((s) => s.clock.today);
  return useMemo(() => {
    if (!id) return null;
    const found = clusterOfMember(id, p, { admins, formation });
    if (!found) return null;
    const members = channelMembers(found.cluster, found.headId, found.headName);
    const me = members.find((m) => m.id === id);
    if (!me) return null;
    const channel = channels[found.cluster.id] ?? channelSeed(found.cluster.id, today);
    const writers = (channel.writers as ChannelRole[] | undefined) ?? DEFAULT_WRITERS;
    const manager = me.role === "head";
    const muted = channel.muted?.[id];
    const canWrite = manager || (!muted && writers.includes(me.role));
    // In the order they were written on the demo's dates
    const messages = [...(channel.messages ?? [])].sort((a, b) => a.at - b.at);
    const read = channel.reads?.[id] ?? 0;
    return {
      clusterId: found.cluster.id,
      clusterName: found.cluster.name,
      members,
      me,
      channel,
      writers,
      messages,
      manager,
      canWrite,
      readOnly: canWrite ? undefined : muted ? "أوقف رئيس التكتل كتابتك في القناة. تقرأ كل ما يُنشر فيها." : `الكتابة في القناة لـ${writers.map((r) => CHANNEL_ROLES.find((x) => x.key === r)!.plural).join(" و")}، كما حدّدها رئيس التكتل. تقرأ كل ما يُنشر فيها.`,
      unread: messages.filter((m) => m.at > read && m.by !== id && !m.removed).length,
    };
  }, [id, p, admins, formation, channels, today]);
}

// ───────────────────────── what members do ─────────────────────────

const pad = (n: number) => String(n).padStart(2, "0");
/** Now on the demo's day, as the tester may have moved it (at the hour he set, else the real one) */
function demoNow() {
  const { today, time } = getState().clock;
  const d = new Date();
  if (!today) return d.getTime();
  return new Date(`${today}T${time ?? `${pad(d.getHours())}:${pad(d.getMinutes())}`}:${pad(d.getSeconds())}`).getTime();
}

const change = (v: ClusterChannelView, fn: (c: ClusterChannel) => ClusterChannel) => actions.setChannel(v.clusterId, channelSeed(v.clusterId), fn);

export function postMessage(v: ClusterChannelView, text: string, replyTo?: string) {
  if (!v.canWrite || !text.trim()) return;
  const m: ChannelMessage = { id: `${nowMs().toString(36)}${Math.random().toString(36).slice(2, 5)}`, by: v.me.id, name: v.me.name, role: v.me.role, text: text.trim(), at: demoNow(), replyTo };
  change(v, (c) => ({ ...c, messages: [...(c.messages ?? []), m], reads: { ...c.reads, [v.me.id]: Math.max(m.at, c.reads?.[v.me.id] ?? 0) } }));
  logAdmin(v.me.id, "رسالة في قناة التكتل", v.clusterName, m.text.slice(0, 120));
}

/** Taken down by its writer or the head: it stays in its place, marked removed */
export function removeMessage(v: ClusterChannelView, m: ChannelMessage) {
  if (m.by !== v.me.id && !v.manager) return;
  change(v, (c) => ({ ...c, messages: (c.messages ?? []).map((x) => (x.id === m.id ? { ...x, pinned: false, removed: { by: v.me.name, at: demoNow() } } : x)) }));
  logAdmin(v.me.id, "حذف رسالة من قناة التكتل", v.clusterName, `${m.name}: ${m.text.slice(0, 80)}`);
}

export function togglePin(v: ClusterChannelView, m: ChannelMessage) {
  if (!v.manager) return;
  change(v, (c) => ({ ...c, messages: (c.messages ?? []).map((x) => (x.id === m.id ? { ...x, pinned: !x.pinned } : x)) }));
  logAdmin(v.me.id, m.pinned ? "إلغاء تثبيت رسالة في قناة التكتل" : "تثبيت رسالة في قناة التكتل", v.clusterName, m.text.slice(0, 80));
}

export function setWriters(v: ClusterChannelView, roles: ChannelRole[]) {
  if (!v.manager) return;
  const next = roles.includes("head") ? roles : ["head" as ChannelRole, ...roles];
  change(v, (c) => ({ ...c, writers: next }));
  logAdmin(v.me.id, "تعديل من يكتب في قناة التكتل", v.clusterName, `${v.writers.map(roleLabel).join("، ")} ← ${next.map(roleLabel).join("، ")}`);
}

export function setMuted(v: ClusterChannelView, member: ChannelMember, mute: boolean, reason?: string) {
  if (!v.manager || member.role === "head") return;
  change(v, (c) => {
    const muted = { ...c.muted };
    if (mute) muted[member.id] = { by: v.me.name, at: demoNow(), reason: reason?.trim() || undefined };
    else delete muted[member.id];
    return { ...c, muted };
  });
  logAdmin(v.me.id, mute ? "إيقاف كتابة عضو في قناة التكتل" : "إعادة كتابة عضو في قناة التكتل", v.clusterName, `${member.name}${reason ? ` — ${reason}` : ""}`);
}

export function markRead(v: ClusterChannelView) {
  const last = Math.max(0, ...v.messages.map((m) => m.at));
  if ((v.channel.reads?.[v.me.id] ?? 0) >= last) return;
  change(v, (c) => ({ ...c, reads: { ...c.reads, [v.me.id]: last } }));
}
