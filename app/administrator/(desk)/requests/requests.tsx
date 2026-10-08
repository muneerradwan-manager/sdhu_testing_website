"use client";

import { AnimatePresence, motion } from "motion/react";
import { Accessibility, ArrowLeftRight, BadgeCheck, BellRing, Check, Eye, FileSignature, Search, HeartPulse, Inbox, Radio, Stethoscope, UserPlus, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Card } from "@/components/portal/shell";
import { Button } from "@/components/ui/button";
import { Badge, Modal, useToast } from "@/components/ui/widgets";
import { CONDITIONS, NEEDS, recordHealth } from "@/app/portal/application/_components/post/model";
import { groupInfo } from "@/lib/assignment";
import { groupName } from "@/lib/groups";
import { ageOf, fullName } from "@/lib/registry";
import { actions, useStore, type HealthRecord } from "@/lib/store";
import { cn } from "@/lib/utils";
import { isTechCoordinator, logAdmin, nowMs, useAdmin } from "../../_lib/admin";
import { LIFT_NEEDS, assignedRealFamilies, buildRoster, compositionOf, groupCount, groupPilgrims, seedRequestsFor, type GroupPilgrim, type JoinRequest } from "../../_lib/group";
import { AdminShell, LockedCard, MovedTo } from "../../_components/ui";
import { PilgrimSheet } from "../../_components/pilgrim-sheet";
import { rangeLabel, useOperation } from "@/lib/operations";
import { clusterViewOf } from "../../_lib/cluster";
import { useClusterGroupsOf, useClusterRequests } from "../../_lib/formation";
import { useCoordinatorPost } from "../../_lib/coordinators";

function needsLift(r: JoinRequest) {
  return r.members.some((m) => m.needs.some((n) => LIFT_NEEDS.includes(n)));
}

/**
 * حجاج المجموعة. إلحاق الحاج بالمجموعة عملية مستقلة عن تسجيله على الحج، يجريها المكتب وحده: يتفق
 * الحاج مع المجموعة ويوقّع عقده معها في المكتب، فيلحقه بها موظف المكتب، والطلب العائلي يُلحق أو ينتقل
 * كاملاً. يرى رئيس المجموعة حجاجها ويرحّب بالعائلة، والمنسق يسجّل ملفها الصحي.
 * المنسق للتكتل لا لمجموعة: يفتح هنا مجموعاته المسندة إليه وحدها.
 */
/**
 * A group's pilgrims: the families attached to it by their contracts, their welcome and their health files.
 * Its own page for a group head and for whoever serves in groups; inside «إدارة التكتل» the cluster's head
 * and deputy open it for one group of the cluster (`fixed`, `embedded`), with no page or switcher around it.
 */
export function AdminRequests({ fixed, embedded = false }: { fixed?: number; embedded?: boolean } = {}) {
  const joining = useOperation("group-joining");
  const admin = useAdmin()!;
  const toast = useToast();
  const p = admin.profile;
  const g = p?.group;
  const post = useStore((s) => s.post);
  const applications = useStore((s) => s.applications);
  const decisions = useMemo(() => p?.joinDecisions ?? {}, [p?.joinDecisions]);
  const [filter, setFilter] = useState<"all" | "new" | "health">("all");
  // A cluster head manages every group of his cluster alike, so the screen opens whichever one he picks
  const myCluster = clusterViewOf(p, admin.name);
  // The coordinator works for the cluster, in the groups its head sorted to him
  const coord = useCoordinatorPost(admin.id, p);
  const clusterGroups = useClusterGroupsOf(p);
  const myGroups = coord ? coord.groups : clusterGroups;
  const [picked, setPicked] = useState<number | null>(null);
  const home = p?.group?.number;
  const openNumber = fixed ?? (myCluster || coord ? (picked ?? myGroups[0]?.number) : home) ?? home;
  const openGroup = myGroups.find((x) => x.number === openNumber);
  // The open group as its cluster records it (a group head's own group too), for its count and capacity
  const requests = useClusterRequests();
  const placed = openGroup ?? requests.find((r) => r.groups.some((x) => x.number === openNumber))?.groups.find((x) => x.number === openNumber);
  const openName = openNumber === undefined ? "المجموعة" : groupName(openNumber);
  const [healthFor, setHealthFor] = useState<string | null>(null);
  // One pilgrim's file, opened from his family's card
  const [person, setPerson] = useState<{ family: JoinRequest; id: string } | null>(null);
  const tech = isTechCoordinator(p);

  const families = useMemo(() => {
    if (openNumber === undefined) return [];
    return [...assignedRealFamilies(openNumber, post, applications), ...seedRequestsFor(openNumber, home)];
  }, [openNumber, home, post, applications]);
  // As many as its cluster counts for it, the same number «إدارة التكتل» shows
  const active = groupCount(openNumber, post, applications, placed, home);
  // Every pilgrim of the open group by name: the families attached lately, then those in it from before
  const everyone = useMemo(
    () => groupPilgrims(families, buildRoster(p, applications, post, { groupNumber: openNumber, size: active }), active),
    [families, p, applications, post, openNumber, active],
  );

  // A cluster's head and deputy open each group's pilgrims from the cluster's groups
  if (!embedded && myCluster) return <MovedTo href="/administrator/clusters" title="إدارة التكتل" />;
  if (!embedded && isTechCoordinator(p) && !coord?.groups.length) {
    return (
      <AdminShell title="حجاج مجموعاتي" subtitle="المنسق التقني للتكتل لا لمجموعة: يعمل في المجموعات التي يوزّعه عليها رئيس التكتل.">
        <LockedCard
          title={coord ? "لم يوزّعك رئيس التكتل على مجموعة بعد" : "لم تنضم إلى تكتل بعد"}
          text={coord ? `أنت في ${coord.clusterName}. حين يوزّعك رئيسه ${coord.headName} على مجموعات منه تظهر هنا، فترى حجاجها حين يلحقهم المكتب بعقودهم، وتأخذ ملفاتهم الصحية.` : "يدعوك رئيس تكتل في مدة تشكيل التكتلات، ويوزّعك على مجموعات من تكتله."}
          href="/administrator/groups"
          cta="إدارة المجموعات"
        />
      </AdminShell>
    );
  }
  if (!embedded && !coord && !g?.approvedAt) {
    return (
      <AdminShell title="حجاج المجموعة" subtitle="يتفق الحاج مع المجموعة ويوقّع عقده معها في المكتب، فيلحقه بها موظف المكتب.">
        <LockedCard title="لا مجموعة لك بعد" text="يظهر حجاج مجموعتك بعد أن يشكّلها موظف إدارة الإداريين في المكتب." href="/administrator/group" cta="تشكيل المجموعة" />
      </AdminShell>
    );
  }

  const clusterId = coord?.clusterId ?? g?.clusterId;
  const info = groupInfo(clusterId, openNumber ?? g?.number);
  const capacity = placed?.capacity || g?.capacity || 50;
  const headOfOpen = openGroup && openNumber !== home ? openGroup.head : admin.name;
  const switcher = !fixed && (myCluster || coord) && myGroups.length > 1 && (
    <Card className="md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-hint">المجموعة المفتوحة الآن</p>
          <p className="font-display text-2xl font-bold text-green-dark">
            {openName}
            <span className="mr-2 text-sm font-normal text-ink-soft">رئيسها المباشر {headOfOpen}</span>
          </p>
        </div>
        <Badge tone="gold">{coord ? `${coord.clusterName} — ${myGroups.length} مجموعات وُزّعت عليها` : `${myCluster!.name} — ${myGroups.length} مجموعات تديرها كلها`}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {myGroups.map((x) => {
          const on = x.number === openNumber;
          return (
            <button
              key={x.id}
              type="button"
              aria-pressed={on}
              onClick={() => setPicked(x.number)}
              className={cn("rounded-2xl border-2 px-4 py-2 text-sm font-bold transition", on ? "border-maroon bg-maroon text-white" : "border-gold/40 bg-white text-ink-soft hover:border-gold-dark")}
            >
              {groupName(x.number)}
            </button>
          );
        })}
      </div>
    </Card>
  );

  const healthMissing = (r: JoinRequest) => r.real && !post[r.id]?.health;
  const isNew = (r: JoinRequest) => !decisions[r.id];
  const shown = families.filter((r) => (filter === "all" ? true : filter === "new" ? isNew(r) : healthMissing(r)));
  const newCount = families.filter(isNew).length;
  const healthCount = families.filter(healthMissing).length;

  const welcome = (r: JoinRequest) => {
    actions.upsertAdmin(admin.id, { joinDecisions: { ...decisions, [r.id]: "accepted" } });
    logAdmin(admin.id, `استلام عائلة في ${openName} والترحيب بها`, `${r.applicant} — الطلب ${r.number}`, `${r.members.length} أفراد — ${r.kind === "transfer" ? "انتقلت من مجموعة أخرى" : "سجّلها منسق المجموعة"}`);
    if (needsLift(r)) logAdmin(admin.id, "إحالة احتياج خاص إلى مشرف البرج", "وسام خوري — البرج (ب)", `${r.applicant}: غرفة قريبة من المصعد`);
    toast({ title: `رحّبت بعائلة ${r.applicant.split(" ")[0]}`, body: "يصلهم إشعار الترحيب وموعد اللقاء التعريفي.", icon: "🤝", tone: "success" });
  };

  const healthTarget = families.find((r) => r.id === healthFor);
  const pick = (r: GroupPilgrim) => setPerson({ family: r.family, id: r.member.id });

  const content = (
    <>
      <div className={cn("grid items-start gap-6", !embedded && "lg:grid-cols-[1fr_20rem]")}>
        <div className="space-y-5">
          {switcher}
          <Card className="md:p-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm text-hint">أعضاء المجموعة</p>
                <p className="font-display text-4xl font-bold text-green-dark">
                  <motion.span key={active} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="inline-block tabular-nums">
                    {active}
                  </motion.span>
                  <span className="text-2xl text-hint"> / {capacity}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge tone="gold">
                  <Inbox className="size-3.5" /> {newCount} عائلات جديدة
                </Badge>
                <Badge tone="maroon">
                  <HeartPulse className="size-3.5" /> {healthCount} بلا ملف صحي
                </Badge>
              </div>
            </div>
            <PeopleBoard rows={everyone} capacity={capacity} onPick={pick} />
          </Card>

          <PilgrimList rows={everyone} name={openName} onPick={pick} />

          {/* The office attaches the pilgrims; the group's side sees them here */}
          <p className="flex items-start gap-2 rounded-2xl bg-sand p-4 text-sm leading-7 text-ink-soft">
            <FileSignature className="mt-1 size-4 shrink-0 text-green-dark" />
            يلحق موظفو المكتب الحجاج ب{openName}: يتفق الحاج مع المجموعة ويوقّع عقده معها في المكتب، فيُلحق بها هو وأفراد طلبه معاً. تراهم هنا فور إلحاقهم{joining.open ? "" : ` — مدة الإلحاق ${rangeLabel(joining.start, joining.end)}`}، واضغط أي حاج لترى ملفه وآخر ما وصل إليه.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ["all", `آخر العائلات الملحقة (${families.length})`],
                ["new", `جديدة (${newCount})`],
                ["health", `بانتظار الملف الصحي (${healthCount})`],
              ] as const
            ).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setFilter(k)} className={cn("relative rounded-full px-4 py-2 text-sm font-bold transition", filter === k ? "text-white" : "bg-white text-ink-soft hover:text-ink")}>
                {filter === k && <motion.span layoutId="req-filter" className="absolute inset-0 rounded-full bg-green-dark" />}
                <span className="relative">{l}</span>
              </button>
            ))}
            <span className="mr-auto flex items-center gap-1.5 text-xs text-hint">
              <Radio className="size-3.5 animate-pulse text-green-light" /> تُحدَّث مباشرة عند كل تسجيل
            </span>
          </div>

          <AnimatePresence mode="popLayout">
            {shown.length === 0 && (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card className="text-center">
                  <Inbox className="mx-auto size-12 text-gold-dark" />
                  <p className="mt-3 font-display text-xl font-bold text-green-dark">لا عائلات في هذا التصنيف</p>
                  <p className="mt-1 text-sm leading-7 text-ink-soft">حين يلحق موظف المكتب عائلة ب{openName} تظهر هنا مباشرة.</p>
                </Card>
              </motion.div>
            )}
            {shown.map((r) => {
              const n = r.members.length;
              const health = r.real ? post[r.id]?.health : undefined;
              return (
                <motion.article
                  layout
                  key={r.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  className={cn("overflow-hidden rounded-[2rem] border bg-white shadow-[0_30px_80px_-50px_rgba(2,21,38,.5)]", r.real ? "border-gold-dark/60 ring-2 ring-gold/40" : "border-gold/30")}
                >
                  <header className={cn("flex flex-wrap items-center justify-between gap-3 px-6 py-4", r.real ? "bg-gradient-to-l from-gold/40 to-gold/10" : "bg-sand")}>
                    <div className="flex items-center gap-3">
                      <span className={cn("grid size-11 place-items-center rounded-xl", r.kind === "transfer" ? "bg-white text-maroon" : "bg-green-dark text-gold")}>
                        {r.kind === "transfer" ? <ArrowLeftRight className="size-5" /> : <UserPlus className="size-5" />}
                      </span>
                      <div>
                        <p className="font-bold text-ink">{r.applicant}</p>
                        <p className="text-xs text-ink-soft">{r.receivedLabel}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {r.real && (
                        <Badge tone="gold">
                          <BellRing className="size-3.5" /> من بوابة الحاج
                        </Badge>
                      )}
                      <Badge tone="ink">الطلب {r.number}</Badge>
                      <Badge tone="green">{n === 1 ? "فرد واحد" : `عائلة — ${n} أفراد`}</Badge>
                      {!isNew(r) && (
                        <Badge tone="green">
                          <Check className="size-3.5" /> تم الترحيب
                        </Badge>
                      )}
                    </div>
                  </header>

                  <div className="p-6">
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {r.members.map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            onClick={() => setPerson({ family: r, id: m.id })}
                            aria-label={`ملف ${m.name}`}
                            className="group flex w-full items-start gap-3 rounded-2xl bg-sand p-3 text-right transition hover:bg-gold/20 hover:shadow-md"
                          >
                          <span className="grid size-10 shrink-0 place-items-center">
                            <PersonIcon kind={m.age >= 69 ? "elderly" : m.gender === "F" ? "woman" : "man"} className="size-8" />
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold">
                              {m.name.split(" ")[0]} <span className="font-display text-maroon">{m.age}</span>
                            </p>
                            <p className="text-xs text-ink-soft">{m.relation}</p>
                            {m.needs.length > 0 && (
                              <p className="mt-1 flex flex-wrap gap-1">
                                {m.needs.map((x) => (
                                  <span key={x} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", LIFT_NEEDS.includes(x) ? "bg-maroon text-white" : "bg-white text-maroon ring-1 ring-maroon/20")}>
                                    {LIFT_NEEDS.includes(x) && <Accessibility className="size-3" />} {x}
                                  </span>
                                ))}
                              </p>
                            )}
                          </div>
                          <Eye className="mr-auto size-4 shrink-0 self-center text-green-dark opacity-40 transition group-hover:opacity-100" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    {r.note && <p className="mt-3 rounded-xl border-r-4 border-gold-dark bg-gold/10 px-3 py-2 text-sm text-ink-soft">{r.note}</p>}

                    {r.real && (
                      <p className={cn("mt-4 flex items-center gap-2 rounded-2xl p-3 text-sm font-semibold", health ? "bg-green-light/10 text-green" : "bg-maroon/6 text-maroon")}>
                        {health ? <BadgeCheck className="size-5" /> : <HeartPulse className="size-5" />}
                        {health ? `الملف الصحي مسجّل — ${health.by.name}${health.confirmedAt ? " — أكّده الحاج" : " — بانتظار تأكيد الحاج"}` : "الملف الصحي لم يُسجَّل بعد — من مهام المنسق التقني"}
                      </p>
                    )}

                    <div className="mt-5 flex flex-wrap justify-end gap-3">
                      {r.real && tech && (
                        <Button variant={health ? "outline" : "maroon"} onClick={() => setHealthFor(r.id)}>
                          <Stethoscope className="size-4" /> {health ? "تعديل الملف الصحي" : "تسجيل الملف الصحي"}
                        </Button>
                      )}
                      {/* The group's head welcomes the family (and the cluster's head for any of its groups); its team only sees it */}
                      {isNew(r) && !coord && (
                        <Button onClick={() => welcome(r)}>
                          <UsersRound className="size-4" /> استلام والترحيب
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>

        {!embedded && <aside className="space-y-4 lg:sticky lg:top-28">
          <div className="rounded-3xl bg-green-dark p-5 text-sm leading-7 text-white/85">
            <p className="font-bold text-gold">كيف تُلحق العائلات بالمجموعة؟</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>لا يختار الحاج المجموعة من المنصة: يتفق معها، ويوقّع عقده معها في المكتب.</li>
              <li>يلحقه موظف المكتب بالمجموعة ويرفع العقد الموقّع، فيصير الطلب كله فيها ويرى الحاج مجموعته وعقده. الإداريون لا يلحقون أحداً.</li>
              <li>تسجيل حاج على الحج لا يضعه في مجموعة من سجّله.</li>
              <li>الطلب العائلي يُلحق كاملاً بمجموعة واحدة، وينتقل بعقد جديد يلحقه به المكتب.</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-gold/30 bg-white p-5 text-sm leading-7">
            <p className="flex items-center gap-2 font-bold text-green-dark">
              <HeartPulse className="size-4" /> الملف الصحي
            </p>
            <p className="mt-1 text-ink-soft">
              لا يُسأل الحاج عن صحته عند التسجيل. بعد انضمامه إلى المجموعة يسجّل المنسق التقني أمراضه المزمنة وأدويته واحتياجاته، والوثائق الطبية يرفعها الحاج بعد اكتمال دفع المبلغ كاملاً.
            </p>
            {!tech && <p className="mt-2 font-semibold text-gold-dark">الملف الصحي يأخذه منسق التكتل المسند إلى مجموعتك.</p>}
          </div>
        </aside>}
      </div>

      <Modal open={!!healthTarget} onClose={() => setHealthFor(null)}>
        {healthTarget && <HealthForm family={healthTarget} onDone={() => setHealthFor(null)} />}
      </Modal>
      <Modal open={!!person} onClose={() => setPerson(null)} className="max-w-3xl">
        {person && <PilgrimSheet family={person.family} memberId={person.id} groupLabel={openName} onClose={() => setPerson(null)} />}
      </Modal>
    </>
  );
  if (embedded) return content;
  return (
    <AdminShell
      title={myCluster || coord ? `حجاج ${openName}` : "حجاج المجموعة"}
      subtitle={`${coord ? `من مجموعات ${coord.clusterName} التي وُزّعت عليها، رئيسها ${headOfOpen}. ` : myCluster ? `مجموعة من مجموعات ${myCluster.name} التي تديرها كلها، رئيسها المباشر ${headOfOpen}. ` : `${groupName(g!.number)} — ${info.clusterName}. `}يتفق الحاج المقبول مع المجموعة ويوقّع عقده معها في المكتب، فيلحقه بها موظف المكتب.`}
    >
      {content}
    </AdminShell>
  );
}

// ───────────────────────── Health file (coordinator) ─────────────────────────

function HealthForm({ family, onDone }: { family: JoinRequest; onDone: () => void }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const app = useStore((s) => s.applications[family.id]);
  const existing = useStore((s) => s.post[family.id]?.health);
  const [recs, setRecs] = useState<Record<string, HealthRecord>>(
    () => existing?.members ?? Object.fromEntries(family.members.map((m) => [m.id, { conditions: [], needs: [], medications: "" }])),
  );
  if (!app) return null;

  const toggle = (id: string, field: "conditions" | "needs", value: string) =>
    setRecs((r) => {
      const cur = r[id][field];
      return { ...r, [id]: { ...r[id], [field]: cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value] } };
    });

  const save = () => {
    const members = Object.fromEntries(
      app.members.map((m) => {
        return [m.person.id, recs[m.person.id] ?? { conditions: [], needs: [], medications: "" }];
      }),
    );
    recordHealth(family.id, app, { by: { id: admin.id, name: admin.name }, at: nowMs(), members });
    toast({ title: `سُجّل الملف الصحي لعائلة ${family.applicant.split(" ")[0]}`, body: "يصل إلى الحاج ليؤكد صحته. الوثائق الطبية يرفعها الحاج بعد اكتمال الدفع.", icon: "🩺", tone: "success" });
    onDone();
  };

  return (
    <div>
      <h3 className="font-display text-2xl font-bold text-green-dark">الملف الصحي — {family.applicant}</h3>
      <p className="mt-1 text-sm text-ink-soft">اتصل بالعائلة وسجّل لكل فرد. أما الوثائق الطبية فيرفعها الحاج بنفسه بعد اكتمال دفع المبلغ كاملاً.</p>
      <div className="mt-5 max-h-[60vh] space-y-4 overflow-y-auto pl-1">
        {app.members.map((m) => {
          const rec = recs[m.person.id] ?? { conditions: [], needs: [], medications: "" };
          return (
            <div key={m.person.id} className="rounded-2xl border border-gold/40 p-4">
              <p className="font-bold">
                {fullName(m.person)} <span className="text-sm font-normal text-hint">— {ageOf(m.person)} عاماً</span>
              </p>
              <p className="mt-3 text-xs font-bold text-maroon">أمراض مزمنة</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {CONDITIONS.map((c) => (
                  <Chip key={c} on={rec.conditions.includes(c)} onClick={() => toggle(m.person.id, "conditions", c)}>
                    {c}
                  </Chip>
                ))}
              </div>
              <p className="mt-3 text-xs font-bold text-gold-dark">احتياجات خاصة</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {NEEDS.map((c) => (
                  <Chip key={c} on={rec.needs.includes(c)} onClick={() => toggle(m.person.id, "needs", c)}>
                    {c}
                  </Chip>
                ))}
              </div>
              <input
                value={rec.medications}
                onChange={(e) => setRecs((r) => ({ ...r, [m.person.id]: { ...rec, medications: e.target.value } }))}
                placeholder="الأدوية والجرعات (إن وجدت)"
                className="mt-3 h-11 w-full rounded-xl border-2 border-gold/40 px-3 text-sm outline-none focus:border-green-light"
              />

            </div>
          );
        })}
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={onDone}>
          إلغاء
        </Button>
        <Button onClick={save}>
          <Check className="size-4" /> حفظ وإرسال للحاج
        </Button>
      </div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={cn("rounded-full border-2 px-3 py-1 text-xs font-bold transition", on ? "border-green-dark bg-green-dark text-white" : "border-gold/50 bg-white text-ink-soft hover:border-green-dark/40")}>
      {children}
    </button>
  );
}

// ───────────────────────── People board ─────────────────────────

type PersonKind = "man" | "woman" | "elderly" | "empty";

const KIND_STYLE: Record<PersonKind, string> = {
  man: "text-green-dark",
  woman: "text-maroon",
  elderly: "text-gold-dark",
  empty: "text-gold/40",
};

/** One seat: a man, a woman (with hijab), an elderly pilgrim (with a cane), or an empty seat */
function PersonIcon({ kind, className }: { kind: PersonKind; className?: string }) {
  return (
    <svg viewBox="0 0 24 32" aria-hidden className={cn(KIND_STYLE[kind], className)} fill="currentColor">
      {kind === "woman" ? (
        <>
          <path d="M12 2.5c-3.3 0-5.6 2.6-5.6 5.8 0 2 .9 3.6 2.3 4.6L6 14.4c-1.9 1-3 2.9-3 5v10.1h18V19.4c0-2.1-1.1-4-3-5l-2.7-1.5c1.4-1 2.3-2.6 2.3-4.6 0-3.2-2.3-5.8-5.6-5.8z" />
          <circle cx="12" cy="8.6" r="2.9" fill="white" opacity=".35" />
        </>
      ) : kind === "elderly" ? (
        <>
          <circle cx="10.5" cy="6" r="3.6" />
          <path d="M5 29.5V17.5c0-2.8 2.2-5 5-5h1c2.8 0 5 2.2 5 5v12z" />
          <path d="M19 15.5c1.2 0 2 .8 2 2V30" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </>
      ) : kind === "empty" ? (
        <>
          <circle cx="12" cy="6.5" r="3.8" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M5 29.5V18.5c0-3 2.4-5.4 5.4-5.4h3.2c3 0 5.4 2.4 5.4 5.4v11z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 2" />
        </>
      ) : (
        <>
          <circle cx="12" cy="6.5" r="3.9" />
          <path d="M5 29.5V18.5c0-3 2.4-5.4 5.4-5.4h3.2c3 0 5.4 2.4 5.4 5.4v11z" />
        </>
      )}
    </svg>
  );
}

function PeopleBoard({ rows, capacity, onPick }: { rows: GroupPilgrim[]; capacity: number; onPick: (r: GroupPilgrim) => void }) {
  // One icon per pilgrim in the order they joined, each opening his file; empty seats stay faint
  const people = rows.slice(0, capacity);
  const { men, women, elderly } = compositionOf(people.map((r) => r.member));
  const kindOf = (r: GroupPilgrim): PersonKind => (r.member.age >= 69 ? "elderly" : r.member.gender === "F" ? "woman" : "man");
  const empty = Math.max(0, capacity - people.length);
  const legend: { kind: PersonKind; label: string; n: number }[] = [
    { kind: "man", label: "رجال", n: men },
    { kind: "woman", label: "نساء", n: women },
    { kind: "elderly", label: "كبار السن (69+)", n: elderly },
    { kind: "empty", label: "مقاعد شاغرة", n: empty },
  ];
  return (
    <div className="mt-5">
      <div className="grid grid-cols-10 gap-1 sm:gap-1.5" aria-label={`${people.length} من ${capacity}: ${men} رجال، ${women} نساء، ${elderly} من كبار السن`}>
        {people.map((r, i) => (
          <motion.button
            key={r.member.id}
            type="button"
            onClick={() => onPick(r)}
            title={r.member.name}
            aria-label={`ملف ${r.member.name}`}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.012, duration: 0.3 }}
            className="grid place-items-center rounded-lg transition hover:bg-gold/25"
          >
            <PersonIcon kind={kindOf(r)} className="h-9 w-7 sm:h-10 sm:w-8" />
          </motion.button>
        ))}
        {Array.from({ length: empty }, (_, i) => (
          <span key={`empty-${i}`} className="grid place-items-center">
            <PersonIcon kind="empty" className="h-9 w-7 sm:h-10 sm:w-8" />
          </span>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {legend.map((l) => (
          <span key={l.kind} className="flex items-center gap-1.5">
            <PersonIcon kind={l.kind} className="h-6 w-5" />
            <b className="tabular-nums">{l.n}</b> <span className="text-ink-soft">{l.label}</span>
          </span>
        ))}
        <span className="text-xs text-hint">اضغط أي حاج لترى ملفه.</span>
      </div>
    </div>
  );
}

// ───────────────────────── Every pilgrim, by name ─────────────────────────

const ONLY = [
  ["all", "الكل"],
  ["needs", "ذوو الاحتياجات"],
  ["elderly", "كبار السن"],
  ["women", "النساء"],
] as const;

/** The group's whole list: search by name or application number, a few filters, each pilgrim opening his file */
function PilgrimList({ rows, name, onPick }: { rows: GroupPilgrim[]; name: string; onPick: (r: GroupPilgrim) => void }) {
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<(typeof ONLY)[number][0]>("all");
  const term = q.trim();
  const shown = rows.filter(
    (r) =>
      (only === "all" || (only === "needs" ? r.member.needs.length > 0 : only === "elderly" ? r.member.age >= 69 : r.member.gender === "F")) &&
      (!term || r.member.name.includes(term) || r.family.number.includes(term) || r.family.applicant.includes(term)),
  );
  return (
    <Card className="md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-xl font-bold text-green-dark">
          <UsersRound className="size-5 text-gold-dark" /> كل حجاج {name} — {rows.length}
        </h3>
        <label className="relative w-full sm:w-72">
          <span className="sr-only">ابحث عن حاج</span>
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-hint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو رقم الطلب" className="h-10 w-full rounded-xl bg-sand pr-9 pl-3 text-sm outline-none focus:ring-4 focus:ring-green-light/15" />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {ONLY.map(([k, l]) => (
          <button key={k} type="button" aria-pressed={only === k} onClick={() => setOnly(k)} className={cn("rounded-full px-3 py-1 text-xs font-bold transition", only === k ? "bg-green-dark text-white" : "bg-sand text-ink-soft hover:text-ink")}>
            {l}
          </button>
        ))}
      </div>
      <div className="mt-4 max-h-[28rem] overflow-y-auto rounded-2xl border border-gold/30">
        <div className="sticky top-0 z-10 hidden grid-cols-[2.5rem_1fr_4rem_5rem_1fr_1.5rem] gap-2 bg-sand px-3 py-2 text-xs font-bold text-ink-soft sm:grid">
          <span>#</span>
          <span>الحاج</span>
          <span>العمر</span>
          <span>الطلب</span>
          <span>الاحتياجات</span>
          <span />
        </div>
        {shown.length === 0 ? (
          <p className="p-6 text-center text-sm text-hint">لا حاج مطابقاً.</p>
        ) : (
          <ul className="divide-y divide-gold/20">
            {shown.map((r) => (
              <li key={r.member.id}>
                <button
                  type="button"
                  onClick={() => onPick(r)}
                  className="group grid w-full grid-cols-[2.5rem_1fr_1.5rem] items-center gap-2 px-3 py-2.5 text-right text-sm transition hover:bg-gold/15 sm:grid-cols-[2.5rem_1fr_4rem_5rem_1fr_1.5rem]"
                >
                  <span className="tabular-nums text-hint">{rows.indexOf(r) + 1}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-bold text-ink">{r.member.name}</span>
                    <span className="block truncate text-xs text-ink-soft">
                      {r.member.gender === "F" ? "أنثى" : "ذكر"}
                      {r.family.members.length > 1 ? ` — ${r.member.relation}، عائلة ${r.family.applicant}` : ""}
                      <span className="sm:hidden"> — {r.member.age} عاماً</span>
                    </span>
                  </span>
                  <span className="hidden font-display text-maroon sm:block">{r.member.age}</span>
                  <span className="hidden tabular-nums text-ink-soft sm:block">{r.family.number}</span>
                  <span className="hidden flex-wrap gap-1 sm:flex">
                    {r.member.needs.length ? r.member.needs.map((x) => <Badge key={x} tone={LIFT_NEEDS.includes(x) ? "maroon" : "gold"}>{x}</Badge>) : <span className="text-hint">—</span>}
                  </span>
                  <Eye className="size-4 text-green-dark opacity-40 transition group-hover:opacity-100" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

// ───────────────────────── Enrollment (coordinator) ─────────────────────────

/**
 * المنسق يسجّل في المجموعة المفتوحة من المجموعات التي وُزّع عليها: يبحث عن حاج مقبول تواصل معه (بالرقم الوطني أو رقم الطلب)، فيسجّل
 * الطلب كاملاً ويرسل إليه العقد ليوقّعه برمز على هاتفه. إن كان الحاج في مجموعة أخرى ينتقل الطلب كله.
 */
