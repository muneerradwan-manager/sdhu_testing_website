"use client";

import { useMemo } from "react";
import { ageOf, fullName, getPerson } from "./registry";
import type { Member } from "./rules";
import { useStore, type GroupPost } from "./store";

/**
 * قناة المجموعة: what the group's team posts from «الميدان» — its head, its coordinator, its guide — to the whole
 * group or a part of it, read by its families in their portal («مجموعتي», «الإشعارات»).
 */

export type ChannelPost = GroupPost & { by: string };

export const AUDIENCES = ["المجموعة كاملة", "الرجال", "السيدات", "كبار السن ومرافقوهم"] as const;

/** Every post to a group's channel, from whoever of its team wrote it, newest first */
export function useGroupPosts(groupNumber: number | undefined): ChannelPost[] {
  const admins = useStore((s) => s.admins);
  return useMemo(() => {
    if (groupNumber === undefined) return [];
    return Object.entries(admins)
      .flatMap(([id, a]) => (a.groupPosts ?? []).filter((p) => p.groupNumber === groupNumber).map((p) => {
        const who = getPerson(id);
        return { ...p, by: who ? fullName(who) : id };
      }))
      .sort((a, b) => b.at - a.at);
  }, [admins, groupNumber]);
}

/** Whether a post is for this family: the whole group, or a part of it some member belongs to */
export function forFamily(p: GroupPost, members: Member[]) {
  if (p.audience === "الرجال") return members.some((m) => m.person.gender === "M");
  if (p.audience === "السيدات") return members.some((m) => m.person.gender === "F");
  if (p.audience === "كبار السن ومرافقوهم") return members.some((m) => ageOf(m.person) >= 69 || !!m.companionId);
  return true;
}
