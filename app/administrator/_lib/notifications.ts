"use client";

import { useMemo } from "react";
import { groupName } from "@/lib/groups";
import { rangeLabel, useOperation } from "@/lib/operations";
import { useStore } from "@/lib/store";
import { positionLabelOf, resultOf, useAdmin } from "./admin";
import { useExamRules } from "./admin-rules";
import { clusterGroupsOf } from "./cluster";
import { groupsLabel, useCoordinatorPost } from "./coordinators";
import { DEPUTY_TITLE, POOLS, useMyInvitations } from "./formation";
import { useMyHall } from "./halls";

export type AdminNote = { t: string; who: string; href?: string; urgent?: boolean };

/**
 * What reached this administrator from the administration and from the cluster heads, newest first: the
 * invitations waiting for his answer lead, then what happened to his file this season.
 */
export function useAdminNotes(): AdminNote[] {
  const admin = useAdmin()!;
  const profile = admin.profile;
  const rules = useExamRules();
  const hall = useMyHall(admin.id, profile);
  const coord = useCoordinatorPost(admin.id, profile);
  const admins = useStore((s) => s.admins);
  const inbox = useMyInvitations(admin.id);
  const regOp = useOperation("admin-registration");
  return useMemo(() => {
    const result = resultOf(profile, rules);
    const clusterGroups = clusterGroupsOf(profile, admin.name, admins).length;
    const pending = inbox
      .filter((x) => x.invite.status === "pending")
      .map((x) => ({
        t: `دعاك رئيس ${x.req.cluster.name} ${x.req.headName} ${x.kind === "group" ? `إلى ضم ${x.number !== undefined ? groupName(x.number) : "مجموعتك"} بحجاجها` : x.kind === "deputy" ? `${DEPUTY_TITLE}` : `${POOLS[x.kind].one} في تكتله`}. ردّ على الدعوة في «تشكيل التكتلات».`,
        who: "تشكيل التكتلات",
        href: "/administrator/cluster",
        urgent: true,
      }));
    const notes = [
      ...pending,
      coord && { t: `دعاك رئيس ${coord.clusterName} ${coord.headName} إلى تكتله فقبلت، وأسند إليك ${groupsLabel(coord.groups.map((g) => g.number))}. تعمل فيها وحدها.`, who: "شؤون التكتلات", href: "/administrator/groups" },
      profile?.deputyOf && { t: `دعاك رئيس ${profile.deputyOf.clusterName} ${profile.deputyOf.headName} نائباً له فقبلت، فصارت صفتك لهذا الموسم نائب رئيس تكتل: ترى مجموعات التكتل كلها ومعلوماته، وتنوب عن الرئيس في متابعتها.`, who: "شؤون الإداريين", href: "/administrator/clusters" },
      profile?.cluster && { t: `قدّمت طلب تشكيل ${profile.cluster.name}، فبقيتَ رئيس ${profile.group ? groupName(profile.group.number) : "مجموعتك"} وارتفعت مهامك إلى مستوى التكتل: تدير ${clusterGroups} مجموعات، لكل واحدة رئيسها والفريق الذي أسندته إليها. نائبك ${profile.cluster.deputy?.status === "accepted" ? profile.cluster.deputy.name : "لم يقبل بعد"}.`, who: "شؤون الإداريين", href: "/administrator/cluster" },
      !profile?.cluster && profile?.group?.clusterId && { t: `قبلتَ دعوة تكتل ل${groupName(profile.group.number)}، فدخلته بحجاجها.`, who: "شؤون التكتلات", href: "/administrator/groups" },
      profile?.group?.approvedAt && { t: `اعتُمدت ${groupName(profile.group.number)} لموسم 1448. فريقها يسنده رئيس التكتل الذي تدخله.`, who: "مدير المكتب", href: "/administrator/groups" },
      result.exempt && { t: "جُدّدت صفتك لموسم 1448 دون امتحان، لأنك شغلتها الموسم الماضي بتقييم مستوفٍ. رسم الموسم مسدد.", who: "شؤون الإداريين" },
      result.published && result.passed && !result.exempt && { t: `تهانينا، اجتزت التأهيل بنتيجة ${result.final} وصرت مؤهلاً لصفتك. وإن كنت رئيس مجموعة فقدّم طلب تشكيل مجموعتك في مدة تشكيل المجموعات.`, who: "إدارة الامتحانات", href: "/administrator/exam" },
      profile?.feePaidAt && !profile.examExempt && { t: `أنت مؤهل للامتحان الكتابي: ${hall.exam?.name ?? "امتحان صفتك"}، ${hall.session ? `يوم ${hall.session.date} الساعة ${hall.session.time}` : "يُحدَّد موعده"}، في ${hall.center?.name ?? "المركز الامتحاني الذي تُسندك إليه إدارة الامتحانات"}.`, who: "إدارة الامتحانات", href: "/administrator/exam" },
      profile?.receipt && { t: `تم استلام طلب مشاركتك في موسم 1448 ورسم التسجيل (الإيصال ${profile.receipt}).`, who: "المنصة", href: "/administrator/apply" },
      profile?.eligibleAt && { t: `تحققت المنصة من أهليتك لصفة ${positionLabelOf(profile.positions[0] ?? "")} وفق جدول شروط الصفات لموسم 1448${profile.feePaidAt ? "" : ". بقي تسديد رسم التسجيل ليُقدَّم طلبك"}.`, who: "المنصة", href: "/administrator/apply" },
      { t: `التسجيل كإداري لموسم 1448: ${rangeLabel(regOp.start, regOp.end)}.`, who: "الإدارة", href: "/administrator/apply" },
    ];
    return notes.filter(Boolean) as AdminNote[];
  }, [profile, rules, admin.name, admins, inbox, coord, hall.exam, hall.session, hall.center, regOp.start, regOp.end]);
}
