"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Route } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import {
  DIRECTION_LABEL,
  acceptsAssignment,
  allClusterIds,
  clusterName,
  familiesOfGroup,
  flightOfGroup,
  flightsActions,
  fmtClock,
  fmtGregShort,
  groupsOnFlight,
  membersOfGroup,
  seatStats,
  type Direction,
  type Flight,
  type GroupRef,
  type Traveler,
} from "@/lib/flights";
import { groupName } from "@/lib/groups";
import { fullName } from "@/lib/ops";
import { useStore } from "@/lib/store";
import { useOwns } from "@/lib/systems";
import { cn } from "@/lib/utils";
import { useStaffUser } from "../_components/kit";
import { FilterSelect } from "../_components/ops-ui";
import { OperationHeader } from "../_components/system";
import { EmptyRow, ListTable, RecordsBox, RowActions, RowLink } from "../_components/wp";
import { Segments } from "../exam/_components/ui";
import { useFlightsDesk, type GroupRow } from "./desk";
import { FLIGHTS_LIST, flightHref } from "./flight-screen";

type View = "groups" | "needs" | "staff" | "alerts";
const VIEWS: View[] = ["groups", "needs", "staff", "alerts"];

/**
 * «التفويج»: who travels on what, as lists — the groups and their two flights (a group is put on both in one
 * step), who lost a seat, which staff have none, and what the flights warn of. `?view=` opens one of them (the
 * summary's «ما ينتظرك» links there, and to `?state=` for the groups without a flight).
 */
export function DispatchPage() {
  const desk = useFlightsDesk();
  const data = desk.data;
  const user = useStaffUser()!;
  const officer = useOwns(user, "flights");
  const actor = { name: user.name, role: user.title };
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const asked = params.get("view") as View | null;
  const view: View = asked && VIEWS.includes(asked) ? asked : "groups";
  const setView = (v: View) => router.replace(v === "groups" ? pathname : `${pathname}?view=${v}`, { scroll: false });

  const post = useStore((s) => s.post);
  const applications = useStore((s) => s.applications);
  const admins = useStore((s) => s.admins);
  const [cluster, setCluster] = useState("");
  const [state, setState] = useState(() => (["noOut", "noBack", "warn"].includes(params.get("state") ?? "") ? params.get("state")! : ""));
  const [assignOne, setAssignOne] = useState<{ t: Traveler; dir: Direction } | null>(null);
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [assignGroup, setAssignGroup] = useState<GroupRef | null>(null);
  const [pick, setPick] = useState({ out: "", back: "" });

  const flightOf = useMemo(() => (id: string) => data.flights.find((f) => f.id === id), [data.flights]);
  const { needsFlight, staffNoFlight, flightAlerts: alerts } = desk;
  const groups = desk.groups.filter((r) => (!cluster || r.g.clusterId === cluster) && (!state || (state === "noOut" ? r.total && !r.flightOut : state === "noBack" ? r.total && !r.flightBack : r.warnings.length > 0)));

  // ── one traveller who lost a seat
  const candidates = assignOne ? data.flights.filter((f) => f.direction === assignOne.dir && f.audience === (assignOne.t.kind === "employee" ? "staff" : "pilgrims") && acceptsAssignment(f)) : [];
  const doAssign = () => {
    if (!assignOne || !target) return;
    const r = flightsActions.assign(target, [assignOne.t], actor, reason.trim() || undefined);
    if (r.ok) {
      toast({ title: "أُسند", body: `${assignOne.t.name} ← ${flightOf(target)?.flightNo}`, tone: "success", icon: "✈️" });
      setAssignOne(null);
      setReason("");
    } else toast({ title: "لم يُنفَّذ", body: r.error, tone: "warning", icon: "⚠️" });
  };

  // ── a whole group, on its outbound and its return at once
  const groupMembers = assignGroup ? membersOfGroup(assignGroup, post, applications, admins) : [];
  const flightsFor = (dir: Direction) => data.flights.filter((f) => f.direction === dir && f.audience === "pilgrims" && acceptsAssignment(f) && f.status !== "locked").sort((a, b) => a.departAt - b.departAt);
  const openGroup = (g: GroupRef) => {
    const members = membersOfGroup(g, post, applications, admins);
    const fits = (f: Flight) => seatStats(f, data.assignments).remaining >= members.length;
    // keep a cluster together: a flight already carrying its groups first, then an empty one, then any with room
    const sameCluster = (f: Flight) => groupsOnFlight(f.id, data.groups).some((x) => x.clusterId === g.clusterId);
    const empty = (f: Flight) => groupsOnFlight(f.id, data.groups).length === 0;
    // the cluster's home airport: where its groups already fly from (outbound) or to (return); Damascus by default
    const home = (dir: Direction) => {
      const f = data.flights.find((x) => x.direction === dir && sameCluster(x));
      return f ? (dir === "outbound" ? f.fromId : f.toId) : "ap-dam";
    };
    const best = (dir: Direction) => {
      const list = flightsFor(dir).filter(fits);
      const atHome = list.filter((f) => (dir === "outbound" ? f.fromId : f.toId) === home(dir));
      return list.find(sameCluster) ?? atHome.find(empty) ?? atHome[0] ?? list.find(empty) ?? list[0];
    };
    const out = flightOfGroup(g.clusterId, g.number, "outbound", data) ? "" : (best("outbound")?.id ?? "");
    const pairedBack = data.flights.find((f) => f.id === flightOf(out)?.pairedFlightId);
    const back = flightOfGroup(g.clusterId, g.number, "return", data) ? "" : pairedBack && fits(pairedBack) && pairedBack.status !== "locked" ? pairedBack.id : (best("return")?.id ?? "");
    setPick({ out, back });
    setAssignGroup(g);
  };
  const doAssignGroup = () => {
    if (!assignGroup) return;
    const list = [{ ref: assignGroup, members: groupMembers }];
    const done: string[] = [];
    for (const [id, dir] of [[pick.out, "outbound"], [pick.back, "return"]] as const) {
      if (!id) continue;
      const r = flightsActions.assignGroups(id, list, actor);
      if (!r.ok) return toast({ title: `لم تُسند رحلة ${DIRECTION_LABEL[dir]}`, body: r.error, tone: "warning", icon: "⚠️" });
      done.push(`${DIRECTION_LABEL[dir]}: ${flightOf(id)?.flightNo}`);
    }
    toast({ title: `أُسندت ${groupName(assignGroup.number)}`, body: `${groupMembers.length} مسافراً — ${done.join("، ")}`, tone: "success", icon: "✈️" });
    setAssignGroup(null);
  };

  return (
    <div className="space-y-5">
      <OperationHeader system="flights" icon={<Route />} />
      <Segments<View>
        value={view}
        onChange={setView}
        label="التفويج"
        items={[
          { value: "groups", label: "المجموعات", count: desk.groups.length },
          { value: "needs", label: "بحاجة إلى رحلة", count: needsFlight.length, tone: "maroon" },
          { value: "staff", label: "موظفون بلا رحلة ذهاب", count: staffNoFlight.length, tone: "maroon" },
          { value: "alerts", label: "تنبيهات الرحلات", count: alerts.length, tone: "maroon" },
        ]}
      />

      {view === "groups" && (
        <>
          <div className="flex flex-wrap gap-2">
            <div className="w-full sm:w-56">
              <FilterSelect value={cluster} onChange={setCluster} label="التكتل" all="كل التكتلات" options={allClusterIds().map((c) => ({ value: c, label: clusterName(c) }))} />
            </div>
            <div className="w-full sm:w-56">
              <FilterSelect value={state} onChange={setState} label="حال المجموعة" all="كل المجموعات" options={[{ value: "noOut", label: "بلا رحلة ذهاب" }, { value: "noBack", label: "بلا رحلة عودة" }, { value: "warn", label: "عليها تنبيهات" }]} />
            </div>
          </div>
          <ListTable head={["المجموعة", "التكتل", "الأفراد", "الذهاب", "العودة", "تنبيهات"]} minWidth="50rem">
            {groups.map((r) => (
              <GroupLine key={`${r.g.clusterId}-${r.g.number}`} r={r} officer={officer} onAssign={openGroup} />
            ))}
            {groups.length === 0 && <EmptyRow cols={6}>لا مجموعة تطابق التصفية.</EmptyRow>}
          </ListTable>
          <p className="text-xs text-white/55">كل مجموعة تُسند كاملة: جميع المسجلين فيها وفريقها على الرحلة نفسها، ومن ينضم إليها لاحقاً يلحق بها تلقائياً.</p>
        </>
      )}

      {view === "needs" && (
        <ListTable head={["المسافر", "الاتجاه", "المجموعة", "السبب"]}>
          {needsFlight.map(({ t, dir, why }) => (
            <tr key={`${t.id}-${dir}`} className="align-top">
              <td className="p-3">
                <p className="font-bold text-white">{t.name}</p>
                {officer && (
                  <RowActions>
                    <RowLink onClick={() => { setAssignOne({ t, dir }); setTarget(""); }}>إسناد</RowLink>
                    <RowLink onClick={() => { flightsActions.setOtherMeans(t.id, t.name, "بقرار مسؤول الطيران", actor); toast({ title: "عُلّم: وسيلة أخرى", body: t.name, tone: "info" }); }}>وسيلة أخرى</RowLink>
                  </RowActions>
                )}
              </td>
              <td className="p-3 text-white/80">{DIRECTION_LABEL[dir]}</td>
              <td className="p-3 text-white/80">{t.groupNumber ? groupName(t.groupNumber) : "—"}</td>
              <td className="p-3 text-xs text-white/70">{why}</td>
            </tr>
          ))}
          {needsFlight.length === 0 && <EmptyRow cols={4}>لا أحد. من يُلغى إسناده أو يتخلف عن رحلة أو تُلغى رحلته يظهر هنا حتى يُسند من جديد.</EmptyRow>}
        </ListTable>
      )}

      {view === "staff" && (
        <>
          <p className="text-sm text-white/70">
            المشاركون في الموسم ولهم منصب في ملف تشغيلي. يُسندون من صفحة رحلة الموظفين («إسناد موظفين»)، واحداً أو فريقاً كاملاً.{" "}
            <Link href={FLIGHTS_LIST} className="font-bold text-gold hover:underline">
              إلى الرحلات
            </Link>
          </p>
          <ListTable head={["الموظف", "المسمى"]} minWidth="28rem">
            {staffNoFlight.map((e) => (
              <tr key={e.id}>
                <td className="p-3 font-bold text-white">{fullName(e)}</td>
                <td className="p-3 text-white/70">{e.jobTitle}</td>
              </tr>
            ))}
            {staffNoFlight.length === 0 && <EmptyRow cols={2}>كل من له منصب على رحلة.</EmptyRow>}
          </ListTable>
        </>
      )}

      {view === "alerts" && (
        <ListTable head={["الرحلة", "التنبيه"]} minWidth="28rem">
          {alerts.map(({ f, w }, i) => (
            <tr key={i} className="align-top">
              <td className="p-3">
                <Link href={flightHref(f.id)} className="font-mono font-bold text-white hover:text-gold" dir="ltr">
                  {f.flightNo}
                </Link>
                <RowActions>
                  <RowLink href={flightHref(f.id)}>فتح الرحلة</RowLink>
                </RowActions>
              </td>
              <td className="p-3 text-white">{w}</td>
            </tr>
          ))}
          {alerts.length === 0 && <EmptyRow cols={2}>لا تنبيهات: كل مجموعة معها مرافق، ولا أحد على العودة دون ذهاب.</EmptyRow>}
        </ListTable>
      )}

      <RecordsBox system="flights" area="dispatch" title="سجل التفويج" />

      <Modal open={!!assignOne} onClose={() => setAssignOne(null)}>
        {assignOne && (
          <div>
            <h2 className="font-display text-xl font-bold text-green-dark">
              إسناد {assignOne.t.name} — {DIRECTION_LABEL[assignOne.dir]}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">إسناد فردي لمن فقد مقعده. إن كانت عائلته على رحلة أخرى يظهر ذلك في التنبيهات.</p>
            <label className="mt-4 block text-sm">
              <span className="mb-1 block text-xs font-bold text-ink-soft">الرحلة</span>
              <select className="h-11 w-full rounded-2xl border-2 border-gold/40 bg-white px-3" value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="">— اختر —</option>
                {candidates.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.flightNo} — {fmtGregShort(f.departAt)} — متبقٍّ {assignOne.t.kind === "employee" ? seatStats(f, data.assignments).remainingStaff : seatStats(f, data.assignments).remaining}
                    {f.status === "locked" ? " — مقفلة" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm">
              <span className="mb-1 block text-xs font-bold text-ink-soft">السبب (إلزامي على رحلة مقفلة)</span>
              <input className="h-11 w-full rounded-2xl border-2 border-gold/40 px-3" value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssignOne(null)}>
                رجوع
              </Button>
              <Button onClick={doAssign} disabled={!target || (flightOf(target)?.status === "locked" && !reason.trim())}>
                <Check className="size-4" /> إسناد
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!assignGroup} onClose={() => setAssignGroup(null)} className="max-w-xl">
        {assignGroup && (
          <div>
            <h2 className="font-display text-xl font-bold text-green-dark">
              إسناد {groupName(assignGroup.number)} — {clusterName(assignGroup.clusterId)}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {groupMembers.length} مسافراً: {familiesOfGroup(assignGroup, post, applications).length} عائلة وفريق المجموعة. تُسند كاملة، ومن ينضم إليها لاحقاً يلحق بها.
            </p>
            {(["out", "back"] as const).map((k) => {
              const dir: Direction = k === "out" ? "outbound" : "return";
              const already = flightOfGroup(assignGroup.clusterId, assignGroup.number, dir, data);
              return (
                <label key={k} className="mt-4 block text-sm">
                  <span className="mb-1 block text-xs font-bold text-ink-soft">رحلة {DIRECTION_LABEL[dir]}</span>
                  {already ? (
                    <p className="rounded-2xl bg-sand px-3 py-2 font-bold">
                      على <span dir="ltr" className="font-mono">{already.flightNo}</span> — تُزال من صفحة الرحلة إن أردت تغييرها
                    </p>
                  ) : (
                    <select className="h-11 w-full rounded-2xl border-2 border-gold/40 bg-white px-3" value={pick[k]} onChange={(e) => setPick({ ...pick, [k]: e.target.value })}>
                      <option value="">— لاحقاً —</option>
                      {flightsFor(dir).map((f) => {
                        const rem = seatStats(f, data.assignments).remaining;
                        return (
                          <option key={f.id} value={f.id} disabled={rem < groupMembers.length}>
                            {f.flightNo} — {fmtGregShort(f.departAt)} {fmtClock(f.departAt)} — متبقٍّ {rem}
                            {rem < groupMembers.length ? " (لا تتسع)" : ""}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </label>
              );
            })}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssignGroup(null)}>
                رجوع
              </Button>
              <Button onClick={doAssignGroup} disabled={!pick.out && !pick.back}>
                <Check className="size-4" /> إسناد المجموعة
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/** One group: its two flights, and «إسناد» when one of them is missing */
function GroupLine({ r, officer, onAssign }: { r: GroupRow; officer: boolean; onAssign: (g: GroupRef) => void }) {
  const tone = (n: number) => (n === 0 ? "text-maroon-light" : n < r.total ? "text-gold" : "text-green-light");
  const leg = (n: number, f?: Flight) => (
    <span className="flex flex-wrap items-center gap-2">
      <span className={cn("tabular-nums", tone(n))}>
        {n}/{r.total}
      </span>
      {f && (
        <Link href={flightHref(f.id)} className="rounded-md bg-white/10 px-1.5 font-mono text-[11px] text-gold hover:bg-white/20" dir="ltr">
          {f.flightNo}
        </Link>
      )}
    </span>
  );
  return (
    <tr className="align-top">
      <td className="p-3">
        <p className="font-bold text-white">
          {groupName(r.g.number)} <span className="text-xs font-normal text-white/60">— {r.g.head}</span>
        </p>
        <RowActions>
          {officer && (!r.flightOut || !r.flightBack) && (
<RowLink onClick={() => onAssign(r.g)}>إسناد</RowLink>
          )}
          {r.flightOut && <RowLink href={flightHref(r.flightOut.id)}>رحلة الذهاب</RowLink>}
          {r.flightBack && <RowLink href={flightHref(r.flightBack.id)}>رحلة العودة</RowLink>}
        </RowActions>
      </td>
      <td className="p-3 text-white/80">{clusterName(r.g.clusterId)}</td>
      <td className="p-3 tabular-nums text-white/85">{r.total}</td>
      <td className="p-3">{leg(r.out, r.flightOut)}</td>
      <td className="p-3">{leg(r.back, r.flightBack)}</td>
      <td className="p-3 text-xs text-maroon-light">{r.warnings.join(" · ")}</td>
    </tr>
  );
}
