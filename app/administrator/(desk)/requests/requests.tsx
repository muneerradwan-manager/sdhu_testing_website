"use client";

import { AnimatePresence, motion } from "motion/react";
import { Accessibility, ArrowLeftRight, BadgeCheck, BellRing, Check, FileSignature, HeartPulse, Inbox, Radio, Search, Stethoscope, UserPlus, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Card } from "@/components/portal/shell";
import { Button } from "@/components/ui/button";
import { Badge, Modal, useToast } from "@/components/ui/widgets";
import { CONDITIONS, NEEDS, recordHealth } from "@/app/portal/application/_components/post/model";
import { submitContract, groupInfo } from "@/lib/assignment";
import { ageOf, fullName } from "@/lib/registry";
import { outcomeOf } from "@/lib/journey";
import { usePublishedDraw, type PublishedDraw } from "@/lib/lottery";
import { useSeason } from "@/lib/season-live";
import { actions, useStore, type Application, type HealthRecord } from "@/lib/store";
import { cn, digitsOnly } from "@/lib/utils";
import { effectiveRole, isTechCoordinator, logAdmin, nowMs, positionLabelOf, useAdmin } from "../../_lib/admin";
import { useAdminCan } from "../../_lib/permissions";
import { LIFT_NEEDS, activeCount, assignedRealFamilies, buildRoster, compositionOf, seedRequestsFor, type JoinRequest } from "../../_lib/group";
import { AdminShell, LockedCard } from "../../_components/ui";
import { OperationClosed } from "@/components/app/operation-closed";
import { useOperation } from "@/lib/operations";
import { clusterGroupsOf, clusterViewOf } from "../../_lib/cluster";
import { useCoordinatorPost } from "../../_lib/coordinators";

function needsLift(r: JoinRequest) {
  return r.members.some((m) => m.needs.some((n) => LIFT_NEEDS.includes(n)));
}

/**
 * حجاج المجموعة. إلحاق الحاج بالمجموعة عملية مستقلة عن تسجيله على الحج، تبدأ مع تشكيل التكتلات
 * وتستمر بعده: يتفق الحاج مع المجموعة، فيلحقه بها رئيسها أو المنسق الذي أسنده رئيس التكتل إليها،
 * والطلب العائلي يُلحق أو ينتقل كاملاً. رئيس المجموعة يرحّب بالعائلة، والمنسق يسجّل ملفها الصحي.
 * المنسق للتكتل لا لمجموعة: يفتح هنا مجموعاته المسندة إليه وحدها.
 */
export function AdminRequests() {
  const joining = useOperation("group-joining");
  const can = useAdminCan();
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
  const admins = useStore((s) => s.admins);
  const clusterGroups = useMemo(() => clusterGroupsOf(p, admin.name, admins), [p, admin.name, admins]);
  const myGroups = coord ? coord.groups : clusterGroups;
  const [picked, setPicked] = useState<number | null>(null);
  const home = p?.group?.number;
  const openNumber = (myCluster || coord ? (picked ?? myGroups[0]?.number) : home) ?? home;
  const openGroup = myGroups.find((x) => x.number === openNumber);
  const [healthFor, setHealthFor] = useState<string | null>(null);
  const tech = isTechCoordinator(p);

  const families = useMemo(() => {
    if (openNumber === undefined) return [];
    return [...assignedRealFamilies(openNumber, post, applications), ...seedRequestsFor(openNumber, home)];
  }, [openNumber, home, post, applications]);
  const roster = useMemo(
    () => buildRoster(p, applications, post, { groupNumber: openNumber, size: openGroup && openNumber !== home ? openGroup.pilgrims : undefined }),
    [p, applications, post, openNumber, home, openGroup],
  );

  if (isTechCoordinator(p) && !coord?.groups.length) {
    return (
      <AdminShell title="حجاج مجموعاتي" subtitle="المنسق التقني للتكتل لا لمجموعة: يسجّل الحجاج في المجموعات التي يفرزها له رئيس التكتل.">
        <LockedCard
          title={coord ? "لم يفرز لك رئيس التكتل مجموعة بعد" : "لم تنضم إلى تكتل بعد"}
          text={coord ? `أنت في ${coord.clusterName}. حين يسند إليك رئيسه ${coord.headName} مجموعات منه تظهر هنا، فتلحق بها الحجاج بعقودهم.` : "يدعوك رئيس تكتل في مدة تشكيل التكتلات، ويسند إليك مجموعات من تكتله."}
          href="/administrator/groups"
          cta="إدارة المجموعات"
        />
      </AdminShell>
    );
  }
  if (!coord && !g?.approvedAt) {
    return (
      <AdminShell title="حجاج المجموعة" subtitle="يتفق الحاج مع المجموعة، فيلحقه بها رئيسها أو المنسق المسند إليها بعقد بينهما.">
        <LockedCard title="لا مجموعة معتمدة بعد" text="يظهر حجاج مجموعتك بعد اعتمادها من مدير المكتب." href="/administrator/groups" cta="إدارة المجموعات" />
      </AdminShell>
    );
  }

  const clusterId = coord?.clusterId ?? g?.clusterId;
  const info = groupInfo(clusterId, openNumber ?? g?.number);
  const capacity = (openGroup && openNumber !== home ? openGroup.capacity : g?.capacity) ?? 50;
  const headOfOpen = openGroup && openNumber !== home ? openGroup.head : admin.name;
  const switcher = (myCluster || coord) && myGroups.length > 1 && (
    <Card className="md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-hint">المجموعة المفتوحة الآن</p>
          <p className="font-display text-2xl font-bold text-green-dark">
            المجموعة {openNumber}
            <span className="mr-2 text-sm font-normal text-ink-soft">رئيسها المباشر {headOfOpen}</span>
          </p>
        </div>
        <Badge tone="gold">{coord ? `${coord.clusterName} — ${myGroups.length} مجموعات مفروزة لك` : `${myCluster!.name} — ${myGroups.length} مجموعات تديرها كلها`}</Badge>
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
              المجموعة {x.number}
            </button>
          );
        })}
      </div>
    </Card>
  );

  const active = activeCount(openNumber, post, applications, openGroup && openNumber !== home ? Math.max(0, openGroup.pilgrims - 6) : undefined, home);
  const healthMissing = (r: JoinRequest) => r.real && !post[r.id]?.health;
  const isNew = (r: JoinRequest) => !decisions[r.id];
  const shown = families.filter((r) => (filter === "all" ? true : filter === "new" ? isNew(r) : healthMissing(r)));
  const newCount = families.filter(isNew).length;
  const healthCount = families.filter(healthMissing).length;

  const welcome = (r: JoinRequest) => {
    actions.upsertAdmin(admin.id, { joinDecisions: { ...decisions, [r.id]: "accepted" } });
    logAdmin(admin.id, `استلام عائلة في المجموعة ${openNumber} والترحيب بها`, `${r.applicant} — الطلب ${r.number}`, `${r.members.length} أفراد — ${r.kind === "transfer" ? "انتقلت من مجموعة أخرى" : "سجّلها منسق المجموعة"}`);
    if (needsLift(r)) logAdmin(admin.id, "إحالة احتياج خاص إلى مشرف البرج", "وسام خوري — البرج (ب)", `${r.applicant}: غرفة قريبة من المصعد`);
    toast({ title: `رحّبت بعائلة ${r.applicant.split(" ")[0]}`, body: "يصلهم إشعار الترحيب وموعد اللقاء التعريفي.", icon: "🤝", tone: "success" });
  };

  const healthTarget = families.find((r) => r.id === healthFor);

  return (
    <AdminShell
      title={myCluster || coord ? `حجاج المجموعة ${openNumber}` : "حجاج المجموعة"}
      subtitle={`${coord ? `من مجموعات ${coord.clusterName} المسندة إليك، رئيسها ${headOfOpen}. ` : myCluster ? `مجموعة من مجموعات ${myCluster.name} التي تديرها كلها، رئيسها المباشر ${headOfOpen}. ` : `المجموعة ${g!.number} — ${info.clusterName}. `}يتفق الحاج المقبول مع المجموعة، فيلحقه بها رئيسها أو المنسق المسند إليها بعقد بينهما.`}
    >
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
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
            <PeopleBoard roster={roster} active={active} capacity={capacity} />
          </Card>

          {can("pilgrims.attach") && openNumber !== undefined && (openNumber === home || coord?.groups.some((x) => x.number === openNumber)) && (joining.open ? <ContractPanel group={{ clusterId: clusterId ?? "al-nour", number: openNumber }} capacity={capacity} active={active} /> : <OperationClosed state={joining} text="من في المجموعة باقٍ فيها؛ ما ينتظر فتحها هو رفع عقود الجدد." />)}

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ["all", `الكل (${families.length})`],
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
                  <p className="mt-1 text-sm leading-7 text-ink-soft">حين يسجّل منسق المجموعة حاجاً اختار المجموعة {openNumber} يظهر هنا مباشرة.</p>
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
                        <li key={m.id} className="flex items-start gap-3 rounded-2xl bg-sand p-3">
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
                      {isNew(r) && !tech && (
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

        <aside className="space-y-4 lg:sticky lg:top-28">
          <div className="rounded-3xl bg-green-dark p-5 text-sm leading-7 text-white/85">
            <p className="font-bold text-gold">كيف تُلحق العائلات بالمجموعة؟</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>لا يختار الحاج المجموعة من المنصة: يتفق معها خارجها.</li>
              <li>يرفع العقد الموقّع من يملك صلاحية «إلحاق الحجاج بالمجموعة» فيها: رئيسها، أو المنسق أو المعاون الذي أسنده إليها رئيس التكتل.</li>
              <li>يعتمده موظف المكتب، فيصير الطلب كله في المجموعة ويرى الحاج مجموعته وعقده.</li>
              <li>تسجيل حاج على الحج لا يضعه في مجموعة من سجّله.</li>
              <li>الطلب العائلي يُلحق كاملاً بمجموعة واحدة، وينتقل بعقد جديد ترفعه المجموعة الجديدة.</li>
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
        </aside>
      </div>

      <Modal open={!!healthTarget} onClose={() => setHealthFor(null)}>
        {healthTarget && <HealthForm family={healthTarget} onDone={() => setHealthFor(null)} />}
      </Modal>
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

function PeopleBoard({ roster, active, capacity }: { roster: { age: number; gender: "M" | "F" }[]; active: number; capacity: number }) {
  // Members in the order they joined, one icon per seat; empty seats stay faint
  const people = roster.slice(0, Math.min(active, capacity));
  while (people.length < Math.min(active, capacity)) people.push({ age: 50, gender: "M" });
  const { men, women, elderly } = compositionOf(people);
  const kinds: PersonKind[] = [
    ...people.map((r): PersonKind => (r.age >= 69 ? "elderly" : r.gender === "F" ? "woman" : "man")),
    ...Array.from({ length: Math.max(0, capacity - people.length) }, () => "empty" as const),
  ];
  const legend: { kind: PersonKind; label: string; n: number }[] = [
    { kind: "man", label: "رجال", n: men },
    { kind: "woman", label: "نساء", n: women },
    { kind: "elderly", label: "كبار السن (69+)", n: elderly },
    { kind: "empty", label: "مقاعد شاغرة", n: Math.max(0, capacity - people.length) },
  ];
  return (
    <div className="mt-5">
      <div className="grid grid-cols-10 gap-1 sm:gap-1.5" aria-label={`${people.length} من ${capacity}: ${men} رجال، ${women} نساء، ${elderly} من كبار السن`}>
        {kinds.map((k, i) => (
          <motion.span key={i} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.012, duration: 0.3 }} className="grid place-items-center">
            <PersonIcon kind={k} className="h-9 w-7 sm:h-10 sm:w-8" />
          </motion.span>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {legend.map((l) => (
          <span key={l.kind} className="flex items-center gap-1.5">
            <PersonIcon kind={l.kind} className="h-6 w-5" />
            <b className="tabular-nums">{l.n}</b> <span className="text-ink-soft">{l.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── Enrollment (coordinator) ─────────────────────────

/**
 * المنسق يسجّل في المجموعة المفتوحة من مجموعاته المفروزة له: يبحث عن حاج مقبول تواصل معه (بالرقم الوطني أو رقم الطلب)، فيسجّل
 * الطلب كاملاً ويرسل إليه العقد ليوقّعه برمز على هاتفه. إن كان الحاج في مجموعة أخرى ينتقل الطلب كله.
 */
/**
 * Uploading a pilgrim's contract with the group: the pilgrim agreed with the group outside the platform,
 * and whoever holds «إلحاق الحجاج بالمجموعة» in it uploads the signed contract. Nothing changes for the
 * pilgrim until the office approves it; a returned one is fixed and uploaded again.
 */
function ContractPanel({ group, capacity, active }: { group: { clusterId: string; number: number }; capacity: number; active: number }) {
  const draw = usePublishedDraw();
  const { acceptedDirectAge } = useSeason();
  const isAccepted = (a: Application) => accepted_(a, draw, acceptedDirectAge);
  const admin = useAdmin()!;
  const toast = useToast();
  const applications = useStore((s) => s.applications);
  const post = useStore((s) => s.post);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<string | null>(null);
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [error, setError] = useState("");

  const accepted = Object.entries(applications).filter(([sid, a]) => isAccepted(a) && post[sid]?.groupNumber !== group.number && post[sid]?.contract?.status !== "pending");
  const mine = Object.entries(post).filter(([sid, x]) => x.contract?.groupNumber === group.number && applications[sid]);
  const app = found ? applications[found] : null;
  const current = found ? post[found] : undefined;

  const search = () => {
    setError("");
    setFile(null);
    const hit = Object.entries(applications).find(([sid, a]) => sid === q.trim() || a.number === q.trim() || a.members.some((m) => m.person.id === q.trim()));
    if (!hit) return setError("لا يوجد طلب بهذا الرقم.");
    if (!isAccepted(hit[1])) return setError("الطلب لم يُقبل بعد — الإلحاق بالمجموعات للحجاج المقبولين فقط.");
    if (post[hit[0]]?.groupNumber === group.number && post[hit[0]]?.groupApprovedAt) return setError("هذا الطلب في مجموعتك بالفعل.");
    if (post[hit[0]]?.contract?.status === "pending") return setError(`لهذا الطلب عقد بانتظار اعتماد المكتب (المجموعة ${post[hit[0]]!.contract!.groupNumber}).`);
    setFound(hit[0]);
  };

  const upload = () => {
    if (!app || !found || !file) return;
    if (active + app.members.length > capacity) return setError(`لا تتسع المجموعة: ${active} + ${app.members.length} > ${capacity}. الطلب العائلي يُلحق كاملاً أو لا يُلحق.`);
    const role = `${positionLabelOf(effectiveRole(admin.profile) || admin.profile?.positions[0] || "")} — المجموعة ${group.number}`;
    submitContract({ sessionId: found, app, post: current, group, uploader: { id: admin.id, name: admin.name, role }, file, at: nowMs() });
    toast({ title: `رُفع عقد الطلب ${app.number}`, body: "ينتظر اعتماد المكتب، ثم يصير الطلب كله في المجموعة.", icon: "📄", tone: "info" });
    setFound(null);
    setQ("");
    setFile(null);
  };

  return (
    <Card className="md:p-7">
      <p className="flex items-center gap-2 font-display text-xl font-bold text-green-dark">
        <UserPlus className="size-6" /> إلحاق حاج بالمجموعة {group.number}
      </p>
      <p className="mt-1 text-sm leading-7 text-ink-soft">
        اتفق معك حاج مقبول على الالتحاق بالمجموعة؟ ابحث عن طلبه وارفع العقد الموقّع بينه وبين المجموعة، فيعتمده المكتب. لا يختار الحاج المجموعة من المنصة، ولا يصير فيها قبل الاعتماد. والطلب العائلي يُلحق كاملاً.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(digitsOnly(e.target.value).slice(0, 11))}
          onKeyDown={(e) => e.key === "Enter" && search()}
          inputMode="numeric"
          dir="ltr"
          placeholder="الرقم الوطني أو رقم الطلب"
          className="h-12 min-w-56 flex-1 rounded-2xl border-2 border-gold/50 px-4 text-center font-mono text-lg outline-none focus:border-green-light"
        />
        <Button onClick={search} disabled={!q}>
          <Search className="size-4" /> بحث
        </Button>
      </div>
      {accepted.length > 0 && !app && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-hint">حجاج مقبولون للتجربة:</span>
          {accepted.slice(0, 6).map(([sid, a]) => (
            <button key={sid} type="button" onClick={() => setQ(a.number)} className="rounded-full bg-sand px-3 py-1 font-semibold text-green-dark hover:bg-gold-light">
              {a.members.find((m) => m.relation === "self")?.person.firstName ?? a.number} — {a.number}
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-3 rounded-2xl bg-maroon/8 p-3 text-sm font-bold text-maroon">{error}</p>}

      {app && found && (
        <div className="mt-5 rounded-2xl border-2 border-gold/50 p-4">
          <p className="font-bold">
            الطلب {app.number} — {app.members.length} أفراد — {app.office}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {app.members.map((m) => (
              <li key={m.person.id} className="rounded-full bg-sand px-3 py-1">
                {fullName(m.person)} ({ageOf(m.person)})
              </li>
            ))}
          </ul>
          {current?.groupApprovedAt && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-gold/20 p-3 text-sm font-semibold text-maroon">
              <ArrowLeftRight className="mt-0.5 size-4 shrink-0" /> الطلب الآن في المجموعة {current.groupNumber}. باعتماد هذا العقد ينتقل جميع أفراده ({app.members.length}) معاً، ولا ينتقل أحد وحده.
            </p>
          )}
          <p className="mt-4 text-sm font-bold">العقد الموقّع بين الحاج والمجموعة</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-dashed border-gold-dark/60 px-4 py-2.5 text-sm font-bold text-green-dark hover:bg-sand">
              <FileSignature className="size-4" /> {file ? file.name : "اختر ملف العقد (PDF أو صورة)"}
              <input type="file" accept=".pdf,image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && setFile({ name: e.target.files[0].name, size: e.target.files[0].size })} />
            </label>
            {!file && (
              <button type="button" onClick={() => setFile({ name: `عقد-${app.number}-المجموعة-${group.number}.pdf`, size: 248_000 })} className="text-sm text-hint underline">
                ملف تجريبي
              </button>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={upload} disabled={!file}>
              <FileSignature className="size-4" /> {current?.groupApprovedAt ? `رفع عقد نقل الطلب إلى المجموعة ${group.number}` : "رفع العقد إلى المكتب"}
            </Button>
            <Button variant="ghost" onClick={() => setFound(null)}>
              إلغاء
            </Button>
          </div>
        </div>
      )}

      {mine.length > 0 && (
        <div className="mt-6">
          <p className="font-bold text-ink">عقود المجموعة {group.number}</p>
          <ul className="mt-2 space-y-2">
            {mine.map(([sid, x]) => {
              const c = x.contract!;
              const a = applications[sid];
              return (
                <li key={sid} className="flex flex-wrap items-center gap-2 rounded-2xl bg-sand px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1">
                    <b>الطلب {a.number}</b> — {a.members.length} أفراد — رفعه {c.uploadedBy.name}
                    {c.status === "returned" && <span className="block text-xs font-bold text-maroon">أعاده المكتب: {c.reason}</span>}
                  </span>
                  <Badge tone={c.status === "approved" ? "green" : c.status === "returned" ? "maroon" : "gold"}>{c.status === "approved" ? `اعتمده ${c.decidedBy}` : c.status === "returned" ? "أُعيد" : "بانتظار المكتب"}</Badge>
                  {c.status === "returned" && (
                    <Button size="sm" variant="outline" onClick={() => { setQ(a.number); setFound(sid); }}>
                      رفع من جديد
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}

/** Direct applications are accepted by the announced age, lottery ones by the published draw */
function accepted_(a: Application, draw: PublishedDraw | null, minAge: number) {
  return outcomeOf(a, draw, minAge).accepted;
}
