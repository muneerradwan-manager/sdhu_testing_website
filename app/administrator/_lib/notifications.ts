"use client";

import { useMemo } from "react";
import { groupName } from "@/lib/groups";
import { rangeLabel, useOperation } from "@/lib/operations";
import { useStore } from "@/lib/store";
import { countOf } from "@/lib/utils";
import { positionLabelOf, resultOf, useAdmin } from "./admin";
import { useClusterChannel } from "./channel";
import { groupsLabel, useCoordinatorPost } from "./coordinators";
import { useClusterGroupsOf } from "./formation";
import { useMyHall } from "./halls";
import { unreadReplies, useLetters } from "./letters";
import { lessonRoleOf, useLessons } from "@/lib/lessons";

export type AdminNote = { t: string; who: string; href?: string; urgent?: boolean };

/**
 * What reached this administrator from the administration and from the cluster heads, newest first: what waits
 * for him leads, then what happened to his file this season (his place in a cluster is given at the office).
 */
export function useAdminNotes(): AdminNote[] {
  const admin = useAdmin()!;
  const profile = admin.profile;
  const hall = useMyHall(admin.id, profile);
  const coord = useCoordinatorPost(admin.id, profile);
  const clusterGroups = useClusterGroupsOf(profile).length;
  const regOp = useOperation("admin-registration");
  const telegram = useStore((s) => s.cadre.telegram);
  const letters = useLetters();
  const plans = useStore((s) => s.plans);
  const channel = useClusterChannel(admin.id, profile);
  const lessons = useLessons();
  return useMemo(() => {
    // What the administration sent him: the bot's messages (newest first), replies he has not read, his cluster's plan
    const fromBot = [...telegram]
      .reverse()
      .filter((m) => m.to.includes(admin.id))
      .map((m) => ({ t: `${m.reached.includes(admin.id) ? "✈️ وصلتك على تيليجرام" : "رسالة من الإدارة (لم تصلك على تيليجرام: لم تربطه)"}: ${m.text}`, who: `إدارة الإداريين — ${m.by}`, urgent: true }));
    const replies = letters
      .filter((l) => l.adminId === admin.id && unreadReplies(l))
      .map((l) => ({ t: `ردّت الإدارة على رسالتك «${l.subject}» (${l.number}).`, who: "المراسلات", href: "/portal/letters", urgent: true }));
    const plan = profile?.cluster ? plans[profile.cluster.id] : undefined;
    const planNote = plan?.decision && { t: plan.status === "accepted" ? `قبلت الإدارة الخطة التشغيلية ل${plan.clusterName}.` : `أعادت الإدارة الخطة التشغيلية ل${plan.clusterName} بملاحظات: ${plan.decision.note}`, who: "إدارة الإداريين", href: "/portal/clusters?tab=plan", urgent: plan.status === "returned" };
    const result = resultOf(profile);
    // A guide's next lesson, and how many of his pilgrims said they will come
    const next = lessonRoleOf(profile) ? lessons.filter((l) => l.byId === admin.id && !l.closedAt && !l.cancelledAt && !l.openedAt).sort((a, b) => a.at - b.at)[0] : undefined;
    const lessonNote = next && { t: `درسك القادم «${next.title}» ${new Intl.DateTimeFormat("ar-SY-u-nu-latn", { weekday: "long", day: "numeric", month: "long" }).format(next.at)}: قال ${next.interested.length} من المدعوين إنهم سيحضرون.`, who: "الدروس الدينية", href: "/portal/guide-lessons" };
    const unread = channel?.unread ?? 0;
    const channelNote = unread > 0 && { t: `${countOf(unread, { zero: "", one: "رسالة جديدة", two: "رسالتان جديدتان", few: "رسائل جديدة", many: "رسالة جديدة" })} في قناة ${channel!.clusterName}.`, who: "قناة التكتل", href: "/portal/channel", urgent: true };
    const notes = [
      channelNote,
      lessonNote,
      ...replies,
      ...fromBot,
      planNote,
      coord && { t: coord.role === "tech" ? `شُكّل ${coord.clusterName} في المكتب وأنت منسقه التقني، ووزّعك رئيسه ${coord.headName} على ${groupsLabel(coord.groups.map((g) => g.number))}. تعمل فيها وحدها.` : coord.groups.length && (coord.role === "guide" || coord.role === "assistant") ? `أجلسك المكتب في مقعد ${coord.role === "guide" ? "الموجّه" : "المعاون"} في ${groupsLabel(coord.groups.map((g) => g.number))} من ${coord.clusterName}.` : `شُكّل ${coord.clusterName} في المكتب واختارك رئيسه ${coord.headName} ${coord.role === "guide-f" ? "موجّهةً للتكتل" : "معاوناً للتكتل"}: تعمل للتكتل كله.`, who: "شؤون التكتلات", href: "/portal/groups" },
      profile?.accountantOf && { t: `اختارك رئيس ${profile.accountantOf.clusterName} ${profile.accountantOf.headName} محاسباً للتكتل حين شُكّل في المكتب: صفة ثانوية تسجّل بها مصروفات التكتل المالية.`, who: "شؤون الإداريين", href: "/portal/my-contracts" },
      profile?.cluster && { t: `شُكّل ${profile.cluster.name} في المكتب برئاستك${profile.group ? `، وبقيتَ رئيس ${groupName(profile.group.number)}` : ""}: تدير ${clusterGroups} مجموعات، لكل واحدة رئيسها وفريقها كما دخلت معه.`, who: "شؤون الإداريين", href: "/portal/clusters" },
      !profile?.cluster && profile?.group?.clusterId && { t: `دخلت ${groupName(profile.group.number)} تكتلها حين شُكّل في المكتب، ووقّعتَ عقده: تراه في «العقود».`, who: "شؤون التكتلات", href: "/portal/my-contracts" },
      profile?.group?.approvedAt && { t: `شُكّلت ${groupName(profile.group.number)} لموسم 1448 في المكتب. جلس فيها فريقها بمقاعد فئتها، ووقّعتم عقدها، وحجاجها يلحقهم المكتب بها.`, who: profile.group.approvedBy ?? "إدارة الإداريين", href: "/portal/groups" },
      result.exempt && { t: "جُدّدت صفتك لموسم 1448 دون اختبار، لأنك شغلتها الموسم الماضي بتقييم مستوفٍ. رسم الموسم مسدد.", who: "شؤون الإداريين" },
      // the oral exam after the written one: its booking, then its result
      result.oral?.status === "booked" && { t: "حُجز موعد امتحانك الشفهي أمام لجنة صفتك. احضر قبله بربع ساعة ومعك هويتك.", who: "إدارة الامتحانات", href: "/portal/exam" },
      result.oral && result.oral.status !== "booked" && { t: result.oral.status === "passed" ? `نجحت في الامتحان الشفهي${result.oral.score !== undefined ? ` (${result.oral.score}%)` : ""}، فتأهّلت لصفة ${positionLabelOf(profile?.positions[0] ?? "")} هذا الموسم.` : result.oral.status === "absent" ? "غبت عن موعد امتحانك الشفهي، فلم تتأهل هذا الموسم." : `لم تجتز الامتحان الشفهي هذا الموسم.${result.oral.note ? ` ملاحظة اللجنة: ${result.oral.note}` : ""}`, who: "لجنة الامتحان الشفهي", href: "/portal/exam", urgent: true },
      result.published && result.written && !result.exempt && { t: `تهانينا، اجتزت الاختبار المؤتمت في كل أقسامه (${result.score}%) وبقي امتحانك الشفهي لصفة ${positionLabelOf(profile?.positions[0] ?? "")}. اختر موعدك أمام لجنة صفتك من «الاختبار المؤتمت والشفهي».`, who: "إدارة الامتحانات", href: "/portal/exam" },
      profile?.feePaidAt && !profile.examExempt && { t: `أنت مؤهل للاختبار المؤتمت: ${hall.exam?.name ?? "اختبار صفتك"}، ${hall.session ? `يوم ${hall.session.date} الساعة ${hall.session.time}` : "يُحدَّد موعده"}، في ${hall.center?.name ?? "المركز الامتحاني الذي تُسندك إليه إدارة الامتحانات"}.`, who: "إدارة الامتحانات", href: "/portal/exam" },
      profile?.receipt && { t: `تم استلام طلب مشاركتك في موسم 1448 ورسم التسجيل (الإيصال ${profile.receipt}).`, who: "المنصة", href: "/portal/role" },
      profile?.eligibleAt && { t: `تحققت المنصة من أهليتك لصفة ${positionLabelOf(profile.positions[0] ?? "")} وفق جدول شروط الصفات لموسم 1448${profile.feePaidAt ? "" : ". بقي تسديد رسم التسجيل ليُقدَّم طلبك"}.`, who: "المنصة", href: "/portal/role" },
      { t: `التسجيل كإداري لموسم 1448: ${rangeLabel(regOp.start, regOp.end)}.`, who: "الإدارة", href: "/portal/role" },
    ];
    return notes.filter(Boolean) as AdminNote[];
  }, [profile, clusterGroups, coord, hall.exam, hall.session, hall.center, regOp.start, regOp.end, telegram, letters, plans, admin.id, channel, lessons]);
}
