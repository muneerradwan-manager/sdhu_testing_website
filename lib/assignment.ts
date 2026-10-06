/**
 * التفويج: انضمام الحجاج المقبولين إلى المجموعات.
 *
 * - لا تفويج تلقائي، ولا تضع الإدارة الحاج في مجموعة، ولا يضعه فيها تسجيلُ المنسق لطلبه.
 * - حين تُفتح مرحلة التفويج يتصفّح الحاج دليل المجموعات المعروض على المنصة، ويتواصل مع مجموعة.
 * - المنسق التقني للتكتل لا للمجموعة: يفرز رئيس التكتل مجموعاته على منسقيه، ولكل مجموعة منسق واحد.
 *   منسق المجموعة المفروز لها هو من يسجّل الحاج فيها، ويوقّعان عقد الحاج مع المجموعة، ولا يسجّل
 *   أحد في مجموعة لم تُفرز له.
 * - الانتقال بين المجموعات ممكن: يسجّله منسق المجموعة الجديدة، والطلب العائلي ينتقل كاملاً أو لا ينتقل.
 */
import { clustersNow } from "./cms/content";
import { syncFamily } from "./flights";
import { GROUP } from "./journey";
import { fullName } from "./registry";
import { officeFor } from "./season";
import { actions, type Application, type PostAcceptance } from "./store";

export type GroupRef = { clusterId: string; number: number };

export type GroupInfo = GroupRef & {
  clusterName: string;
  level: string;
  area: string;
  office: string;
  leader: string;
  capacity: number;
  remaining: number;
  team: { role: string; name: string; phone: string; note: string }[];
};

/** Coordinators of the directory's clusters: each cluster's head sorts its groups among them */
const COORDINATORS = ["لؤي الكيلاني", "هيثم الأحمد", "مهند الفرات", "نور الدين حجار", "أيمن الخطيب", "قصي الزعبي", "رامز العطار", "باسل الشيخ", "مجد القباني", "أنس الحمصي", "طلال الأيوبي", "زاهر النحاس"];

/** تكتل النور's two coordinators in the demo, and how its head sorted its groups among them */
const NOUR_COORDINATOR_NAMES: Record<string, { name: string; phone: string }> = {
  "01033300874": { name: "سامر نجار", phone: "0944 274 449" },
  "01033300961": { name: "لؤي العظمة", phone: "0944 961 449" },
};
const NOUR_SORTING: Record<number, string> = { 31: "01033300874", 27: "01033300874", 5: "01033300874", 18: "01033300961", 33: "01033300961", 47: "01033300961" };

/** The cluster's coordinator sorted to a group: in the directory's clusters, every three groups share one */
function clusterCoordinator(slug: string, groups: { no: number }[], no: number, phone: string) {
  const known = slug === "al-nour" ? NOUR_COORDINATOR_NAMES[NOUR_SORTING[no] ?? ""] : undefined;
  if (known) return known;
  const seed = [...slug].reduce((n, ch) => n + ch.charCodeAt(0), 0);
  const share = Math.floor(Math.max(0, groups.findIndex((g) => g.no === no)) / 3);
  return { name: COORDINATORS[(seed + share) % COORDINATORS.length], phone };
}

/** Everything the pilgrim sees about a group: cluster, office and the team, with the coordinator to contact */
export function groupInfo(clusterId: string | undefined, number: number | undefined): GroupInfo {
  const no = number ?? GROUP.number;
  const clusters = clustersNow();
  const cluster = clusters.find((c) => c.slug === clusterId) ?? clusters.find((c) => c.groups.some((g) => g.no === no)) ?? clusters[0];
  const group = cluster.groups.find((g) => g.no === no);
  const leader = group?.leader ?? GROUP.team[0].name;
  const phone = (k: number) => `0944 ${String(no).padStart(2, "0")}${k} 449`;
  // The coordinator is the cluster's, sorted to this group by the cluster's head
  const coordinator = clusterCoordinator(cluster.slug, cluster.groups, no, phone(4));
  const coordinatorEntry = { role: "المنسق التقني", name: coordinator.name, phone: coordinator.phone, note: `منسق ${cluster.name} المفروز لهذه المجموعة: يسجّلك فيها ويوقّع معك العقد، ويأخذ معلوماتك الصحية` };
  const team =
    no === GROUP.number && cluster.slug === "al-nour"
      ? [...GROUP.team.filter((t) => t.role !== "المنسق التقني"), coordinatorEntry]
      : [{ role: "رئيس المجموعة", name: leader, phone: phone(0), note: "يتابع العقد والتجمّعات" }, coordinatorEntry];
  return {
    clusterId: cluster.slug,
    number: no,
    clusterName: cluster.name,
    level: cluster.level,
    area: cluster.governorate,
    office: officeFor(cluster.governorate),
    leader,
    capacity: group?.capacity ?? GROUP.capacity,
    remaining: group?.remaining ?? 0,
    team,
  };
}

/** The cluster's coordinator sorted to the group — the only person who enrolls pilgrims into it */
export function coordinatorOf(info: GroupInfo) {
  return info.team.find((t) => t.role === "المنسق التقني") ?? info.team[0];
}

/**
 * The coordinator enrolls a whole application into his own group, and the pilgrim–group contract is
 * signed (the pilgrim confirms with a code on his phone). Coming from another group, the family moves
 * as one: every member of the application, or nobody.
 */
export function enrollFamily(opts: {
  sessionId: string;
  app: Application;
  post: PostAcceptance | undefined;
  group: GroupRef;
  coordinator: { id: string; name: string };
  at: number;
}) {
  const { sessionId, app, post, group, coordinator, at } = opts;
  const from = post?.groupNumber && post.groupApprovedAt && post.groupNumber !== group.number ? post.groupNumber : undefined;
  const info = groupInfo(group.clusterId, group.number);
  actions.setPost(sessionId, {
    clusterId: group.clusterId,
    groupNumber: group.number,
    enrolledBy: coordinator,
    groupApprovedAt: at,
    contractSignedAt: at,
    transfers: from ? [...(post?.transfers ?? []), { from, to: group.number, at }] : post?.transfers,
    // A family that moves starts its health file again with the new group's coordinator
    ...(from ? { health: undefined } : {}),
  });
  const applicant = app.members.find((m) => m.relation === "self")?.person;
  actions.logEvent({
    actor: coordinator.name,
    role: "منسق تقني",
    action: from ? `نقل طلب عائلي من المجموعة ${from} إلى المجموعة ${group.number}` : `تسجيل حاج في المجموعة ${group.number}`,
    target: `طلب ${app.number}${applicant ? ` — ${fullName(applicant)}` : ""}`,
    detail: `${app.members.length} أفراد معاً — ${info.clusterName} — عقد الحاج مع المجموعة موقّع بموافقة الحاج برمز تحقق`,
  });
  // everyone registered in a group travels with it: if the group is already on its flights, so is the family
  syncFamily(sessionId, app, { clusterId: group.clusterId, groupNumber: group.number });
}
