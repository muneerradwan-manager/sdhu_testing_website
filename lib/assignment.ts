/**
 * إلحاق الحجاج المقبولين بالمجموعات — عملية مستقلة عن التسجيل على الحج.
 *
 * - لا إلحاق تلقائي، ولا تضع الإدارة الحاج في مجموعة، ولا يضعه فيها من سجّله على الحج.
 * - لا يختار الحاج مجموعته على المنصة: يتفق مع مجموعة خارجها، فيرفع العقد الموقّع من يملك صلاحية
 *   «إلحاق الحجاج بالمجموعة» فيها — رئيسها، أو المنسق أو المعاون الذي أسنده إليها رئيس التكتل.
 * - يعتمد موظف المكتب العقد، فيصير الطلب كله في المجموعة ويرى الحاج مجموعته وعقده. وإن أعاده
 *   بسبب، يرفعه صاحبه من جديد.
 * - الانتقال إلى مجموعة أخرى بعقد جديد ترفعه المجموعة الجديدة، والطلب العائلي ينتقل كاملاً أو لا ينتقل.
 */
import { clustersNow } from "./cms/content";
import { syncFamily } from "./flights";
import { GROUP } from "./journey";
import { fullName } from "./registry";
import { officeFor } from "./season";
import { actions, type Application, type PilgrimContract, type PostAcceptance } from "./store";

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
  const coordinatorEntry = { role: "المنسق التقني", name: coordinator.name, phone: coordinator.phone, note: `منسق ${cluster.name} المسند إلى هذه المجموعة: يرفع عقود حجاجها، ويأخذ معلوماتهم الصحية` };
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

/** The cluster's coordinator assigned to the group */
export function coordinatorOf(info: GroupInfo) {
  return info.team.find((t) => t.role === "المنسق التقني") ?? info.team[0];
}

/**
 * The membership itself, once the office approved the contract: the whole application is in the group.
 * Coming from another group, the family moves as one: every member of the application, or nobody.
 */
export function enrollFamily(opts: {
  sessionId: string;
  app: Application;
  post: PostAcceptance | undefined;
  group: GroupRef;
  /** Who uploaded the contract */
  coordinator: { id: string; name: string };
  at: number;
  /** The office member who approved it */
  approvedBy?: { name: string; role: string };
}) {
  const { sessionId, app, post, group, coordinator, at, approvedBy } = opts;
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
    actor: approvedBy?.name ?? coordinator.name,
    role: approvedBy?.role ?? "إداري",
    action: from ? `اعتماد عقد نقل طلب عائلي من المجموعة ${from} إلى المجموعة ${group.number}` : `اعتماد عقد حاج مع المجموعة ${group.number}`,
    target: `طلب ${app.number}${applicant ? ` — ${fullName(applicant)}` : ""}`,
    detail: `${app.members.length} أفراد معاً — ${info.clusterName} — رفع العقد ${coordinator.name}`,
  });
  // everyone registered in a group travels with it: if the group is already on its flights, so is the family
  syncFamily(sessionId, app, { clusterId: group.clusterId, groupNumber: group.number });
}

/**
 * The group's side uploads the contract it signed with the pilgrim: it waits for the office. A family
 * already in another group is asking to move with it, as a whole.
 */
export function submitContract(opts: { sessionId: string; app: Application; post: PostAcceptance | undefined; group: GroupRef; uploader: PilgrimContract["uploadedBy"]; file: PilgrimContract["file"]; at: number }) {
  const { sessionId, app, post, group, uploader, file, at } = opts;
  const transferFrom = post?.groupApprovedAt && post.groupNumber && post.groupNumber !== group.number ? post.groupNumber : undefined;
  actions.setPost(sessionId, { contract: { groupNumber: group.number, clusterId: group.clusterId, status: "pending", uploadedBy: uploader, uploadedAt: at, file, transferFrom } });
  const applicant = app.members.find((m) => m.relation === "self")?.person;
  actions.logEvent({
    actor: uploader.name,
    role: uploader.role,
    action: transferFrom ? `رفع عقد نقل طلب عائلي من المجموعة ${transferFrom} إلى المجموعة ${group.number}` : `رفع عقد حاج مع المجموعة ${group.number}`,
    target: `طلب ${app.number}${applicant ? ` — ${fullName(applicant)}` : ""}`,
    detail: `${app.members.length} أفراد — ${file.name} — بانتظار اعتماد المكتب`,
  });
}

/** The office decides: an approved contract puts the whole application in the group; a returned one says why */
export function decideContract(opts: { sessionId: string; app: Application; post: PostAcceptance; status: "approved" | "returned"; by: { name: string; role: string }; at: number; reason?: string }) {
  const { sessionId, app, post, status, by, at, reason } = opts;
  const c = post.contract;
  if (!c) return;
  actions.setPost(sessionId, { contract: { ...c, status, decidedBy: by.name, decidedAt: at, reason } });
  if (status === "approved") {
    enrollFamily({ sessionId, app, post, group: { clusterId: c.clusterId ?? groupInfo(undefined, c.groupNumber).clusterId, number: c.groupNumber }, coordinator: { id: c.uploadedBy.id, name: c.uploadedBy.name }, at, approvedBy: by });
    return;
  }
  const applicant = app.members.find((m) => m.relation === "self")?.person;
  actions.logEvent({ actor: by.name, role: by.role, action: `إعادة عقد حاج مع المجموعة ${c.groupNumber} إلى رافعه`, target: `طلب ${app.number}${applicant ? ` — ${fullName(applicant)}` : ""}`, detail: reason });
}

/** The demo's shortcut on the pilgrim's side: the group uploads the contract and the office approves it at once */
export function attachByContract(opts: { sessionId: string; app: Application; post: PostAcceptance | undefined; group: GroupRef; uploader: PilgrimContract["uploadedBy"]; at: number }) {
  const { sessionId, app, post, group, uploader, at } = opts;
  submitContract({ sessionId, app, post, group, uploader, file: { name: `عقد-${app.number}-المجموعة-${group.number}.pdf`, size: 248_000 }, at });
  const contract: PilgrimContract = { groupNumber: group.number, clusterId: group.clusterId, status: "pending", uploadedBy: uploader, uploadedAt: at, file: { name: `عقد-${app.number}-المجموعة-${group.number}.pdf`, size: 248_000 } };
  decideContract({ sessionId, app, post: { ...(post ?? { documents: {}, payments: {}, ratings: {} }), contract } as PostAcceptance, status: "approved", by: { name: "رنا حداد", role: "إدارة التسجيل" }, at: at + 1 });
}
