"use client";

import { useMemo } from "react";
import { fullName, getPerson } from "./registry";
import { actions, getState, useStore, type AdminProfile, type MusterReply } from "./store";

/**
 * التجمّعات: whoever works in a group — its head, the coordinator sorted to it, any of its team — gathers its
 * pilgrims from «الميدان» (an Umrah, the travel, the rites, a visit), and ticks who came. The pilgrims see every
 * gathering of their group and say beforehand who of the family will come; whoever will not says why — optional,
 * but required for a required gathering. The organiser sees those replies beside his list.
 */

export type Muster = AdminProfile["musters"][number];
export type GroupMuster = Muster & { by: string; byId: string };

/** Every gathering of a group, from whoever opened it, newest first */
export function useGroupMusters(groupNumber: number | undefined): GroupMuster[] {
  const admins = useStore((s) => s.admins);
  return useMemo(() => {
    if (groupNumber === undefined) return [];
    return Object.entries(admins)
      .flatMap(([id, a]) => (a.musters ?? []).filter((m) => (m.groupNumber ?? a.group?.number) === groupNumber).map((m) => { const who = getPerson(id); return { ...m, byId: id, by: who ? fullName(who) : id }; }))
      .sort((a, b) => b.at - a.at);
  }, [admins, groupNumber]);
}

/** Who said what about one gathering, by national number, across the families of the demo */
export function useMusterReplies(musterId: string | undefined): Record<string, MusterReply> {
  const post = useStore((s) => s.post);
  return useMemo(() => {
    if (!musterId) return {};
    return Object.values(post).reduce<Record<string, MusterReply>>((all, p) => ({ ...all, ...(p.musterReplies?.[musterId] ?? {}) }), {});
  }, [post, musterId]);
}

/** A family member's reply, written to his application and its log */
export function replyToMuster(sid: string, musterId: string, title: string, personId: string, reply: MusterReply) {
  const { applications, post } = getState();
  const app = applications[sid];
  const p = post[sid];
  if (!app || !p) return;
  const replies = { ...p.musterReplies, [musterId]: { ...p.musterReplies?.[musterId], [personId]: reply } };
  actions.setPost(sid, { musterReplies: replies });
  const member = app.members.find((m) => m.person.id === personId);
  const self = app.members.find((m) => m.relation === "self") ?? app.members[0];
  actions.logEvent({
    actor: fullName(self.person),
    role: "حاج",
    action: reply.going ? `سيحضر تجمّع «${title}»` : `اعتذار عن تجمّع «${title}»`,
    target: `طلب ${app.number}`,
    detail: `${member ? fullName(member.person) : personId}${reply.reason ? ` — ${reply.reason}` : ""}`,
  });
}
