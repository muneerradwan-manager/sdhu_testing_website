"use client";

import { AlertTriangle, Check, PlaneTakeoff, UserRoundX } from "lucide-react";
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
  flightWarnings,
  flightsActions,
  fmtClock,
  groupsOnFlight,
  fmtGregShort,
  groupsOfCluster,
  isActive,
  itineraryOf,
  membersOfGroup,
  seatStats,
  type Actor,
  type Direction,
  type Flight,
  type FlightsData,
  type GroupRef,
  type Traveler,
} from "@/lib/flights";
import { CURRENT_SEASON, fullName, inSeason, postingsOf, useEmployees, useOpFiles, usePlaces } from "@/lib/ops";
import { useStore } from "@/lib/store";
import { cn, formatNumber } from "@/lib/utils";
import { Panel } from "../_components/kit";
import { Chip } from "../_components/ops-ui";

type Row = { g: GroupRef; total: number; out: number; back: number; flightOut?: Flight; flightBack?: Flight; warnings: string[] };

/**
 * لوحة التفويج: every cluster and group, which flights they are on, and what needs the officer's hand. A
 * group is put on its flights from here in one step: the officer picks the outbound and the return.
 */
export function DispatchBoard({ data, officer, actor, onOpenFlight }: { data: FlightsData; officer: boolean; actor: Actor; onOpenFlight: (id: string) => void }) {
  const toast = useToast();
  const post = useStore((s) => s.post);
  const applications = useStore((s) => s.applications);
  const admins = useStore((s) => s.admins);
  const employees = useEmployees();
  const files = useOpFiles();
  const places = usePlaces();
  const [assignOne, setAssignOne] = useState<{ t: Traveler; dir: Direction } | null>(null);
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [assignGroup, setAssignGroup] = useState<GroupRef | null>(null);
  const [pick, setPick] = useState({ out: "", back: "" });

  const flightOf = useMemo(() => (id: string) => data.flights.find((f) => f.id === id), [data.flights]);
  const rows = useMemo(() => {
    const out: { cluster: string; rows: Row[] }[] = [];
    for (const cid of allClusterIds()) {
      const rs: Row[] = [];
      for (const g of groupsOfCluster(cid)) {
        const members = membersOfGroup(g, post, applications, admins);
        const its = members.map((m) => itineraryOf(m.id, data));
        const warnings: string[] = [];
        const outs = new Set(its.map((i) => i.outbound?.flightId).filter(Boolean));
        if (outs.size > 1) warnings.push(`أفراد المجموعة على ${outs.size} رحلات ذهاب`);
        const missing = its.filter((i) => !i.outbound && i.status !== "otherMeans").length;
        const fo = flightOfGroup(g.clusterId, g.number, "outbound", data);
        if (fo && missing) warnings.push(`${missing} بلا مقعد على رحلة المجموعة`);
        const retOnly = its.filter((i) => i.status === "returnOnly").length;
        if (retOnly) warnings.push(`${retOnly} على العودة دون ذهاب`);
        rs.push({ g, total: members.length, out: its.filter((i) => i.outbound).length, back: its.filter((i) => i.return).length, flightOut: fo, flightBack: flightOfGroup(g.clusterId, g.number, "return", data), warnings });
      }
      out.push({ cluster: cid, rows: rs });
    }
    return out;
  }, [data, post, applications, admins]);

  // travellers who lost their seat: last assignment cancelled or a no-show, and nothing active that way
  const needsFlight = useMemo(() => {
    const seen = new Set<string>();
    const list: { t: Traveler; dir: Direction; why: string }[] = [];
    for (const a of [...data.assignments].sort((x, y) => (y.cancelledAt ?? y.assignedAt) - (x.cancelledAt ?? x.assignedAt))) {
      if (a.status !== "cancelled" && a.status !== "noShow") continue;
      const f = flightOf(a.flightId);
      if (!f) continue;
      const key = `${a.travelerId}:${f.direction}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const hasActive = data.assignments.some((b) => b.travelerId === a.travelerId && isActive(b) && flightOf(b.flightId)?.direction === f.direction);
      // a group taken off a flight on purpose is not "lost": it shows in the groups table without a flight
      const groupOff = !!a.reason?.startsWith("إزالة المجموعة من الرحلة");
      if (hasActive || data.otherMeans[a.travelerId] || groupOff) continue;
      list.push({ t: { id: a.travelerId, name: a.name, kind: a.travelerKind, gender: a.gender, age: a.age, needs: a.needs, requestId: a.requestId, groupNumber: a.groupNumber, clusterId: a.clusterId }, dir: f.direction, why: a.status === "noShow" ? `تخلّف عن ${f.flightNo}` : `أُلغي إسناده على ${f.flightNo}${a.reason ? ` — ${a.reason}` : ""}` });
    }
    return list;
  }, [data, flightOf]);

  const staffNoFlight = useMemo(() => {
    const seasonFiles = files.filter((f) => f.season === CURRENT_SEASON);
    return employees
      .filter((e) => inSeason(e) && !e.suspended && postingsOf(e.id, seasonFiles, places).length > 0)
      .filter((e) => !data.assignments.some((a) => a.travelerId === e.id && isActive(a) && flightOf(a.flightId)?.direction === "outbound"))
      .sort((a, b) => fullName(a).localeCompare(fullName(b), "ar"));
  }, [employees, files, places, data, flightOf]);

  const alerts = data.flights.filter((f) => ["published", "full", "locked"].includes(f.status)).flatMap((f) => flightWarnings(f, data).map((w) => ({ f, w })));
  const totals = rows.flatMap((c) => c.rows).reduce((acc, r) => ({ total: acc.total + r.total, out: acc.out + r.out, back: acc.back + r.back }), { total: 0, out: 0, back: 0 });

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
    const groups = [{ ref: assignGroup, members: groupMembers }];
    const done: string[] = [];
    for (const [id, dir] of [[pick.out, "outbound"], [pick.back, "return"]] as const) {
      if (!id) continue;
      const r = flightsActions.assignGroups(id, groups, actor);
      if (!r.ok) return toast({ title: `لم تُسند رحلة ${DIRECTION_LABEL[dir]}`, body: r.error, tone: "warning", icon: "⚠️" });
      done.push(`${DIRECTION_LABEL[dir]}: ${flightOf(id)?.flightNo}`);
    }
    toast({ title: `أُسندت المجموعة ${assignGroup.number}`, body: `${groupMembers.length} مسافراً — ${done.join("، ")}`, tone: "success", icon: "✈️" });
    setAssignGroup(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["حجاج وإداريون", totals.total, "white"],
          ["مسندون ذهاباً", totals.out, "green"],
          ["مسندون عودة", totals.back, "green"],
          ["بلا رحلة ذهاب", totals.total - totals.out, totals.total - totals.out ? "maroon" : "white"],
        ].map(([l, v, tone]) => (
          <div key={l as string} className="rounded-2xl bg-white/8 px-4 py-3 ring-1 ring-white/10">
            <p className="text-xs text-white/60">{l}</p>
            <p className={cn("font-display text-2xl font-bold tabular-nums", tone === "green" ? "text-green-light" : tone === "maroon" ? "text-maroon-light" : "text-white")}>{formatNumber(v as number)}</p>
          </div>
        ))}
      </div>

      <Panel title="التكتلات والمجموعات" bodyClass="overflow-x-auto">
        <p className="mb-3 text-xs text-white/60">كل مجموعة تُسند كاملة: جميع المسجلين فيها وفريقها على الرحلة نفسها، ومن ينضم إليها لاحقاً يلحق بها تلقائياً.</p>
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-right text-xs text-white/60">
              <th className="p-2 font-bold">المجموعة</th>
              <th className="p-2 font-bold">الأفراد</th>
              <th className="p-2 font-bold">الذهاب</th>
              <th className="p-2 font-bold">العودة</th>
              <th className="p-2 font-bold">تنبيهات</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ cluster, rows: rs }) => (
              <RowsOfCluster key={cluster} cluster={cluster} rows={rs} officer={officer} onOpenFlight={onOpenFlight} onAssign={openGroup} />
            ))}
          </tbody>
        </table>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="بحاجة إلى رحلة" icon={<UserRoundX />} action={<Chip tone={needsFlight.length ? "maroon" : "green"}>{needsFlight.length}</Chip>}>
          {needsFlight.length === 0 ? (
            <p className="text-sm text-white/60">لا أحد. من يُلغى إسناده أو يتخلف عن رحلة أو تُلغى رحلته يظهر هنا حتى يُسند من جديد.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-white/10 overflow-auto">
              {needsFlight.map(({ t, dir, why }) => (
                <li key={`${t.id}-${dir}`} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-white">{t.name} <span className="font-normal text-white/60">— {DIRECTION_LABEL[dir]}{t.groupNumber ? ` — المجموعة ${t.groupNumber}` : ""}</span></span>
                    <span className="block text-xs text-white/60">{why}</span>
                  </span>
                  {officer && (
                    <>
                      <Button size="sm" variant="gold" onClick={() => { setAssignOne({ t, dir }); setTarget(""); }}>إسناد</Button>
                      <Button size="sm" variant="glass" onClick={() => { flightsActions.setOtherMeans(t.id, t.name, "بقرار مسؤول الطيران", actor); toast({ title: "عُلّم: وسيلة أخرى", body: t.name, tone: "info" }); }}>وسيلة أخرى</Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="موظفون بلا رحلة ذهاب" icon={<PlaneTakeoff />} action={<Chip tone={staffNoFlight.length ? "gold" : "green"}>{staffNoFlight.length}</Chip>}>
          <p className="mb-2 text-xs text-white/60">المشاركون في الموسم ولهم منصب في ملف تشغيلي. يُسندون من صفحة الرحلة، واحداً أو فريقاً كاملاً.</p>
          {staffNoFlight.length === 0 ? (
            <p className="text-sm text-white/60">كل من له منصب على رحلة.</p>
          ) : (
            <ul className="max-h-64 divide-y divide-white/10 overflow-auto">
              {staffNoFlight.map((e) => (
                <li key={e.id} className="flex items-center gap-2 py-1.5 text-sm">
                  <span className="flex-1 truncate font-bold text-white">{fullName(e)}</span>
                  <span className="truncate text-xs text-white/60">{e.jobTitle}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="تنبيهات على الرحلات" icon={<AlertTriangle />} action={<Chip tone={alerts.length ? "maroon" : "green"}>{alerts.length}</Chip>} className="lg:col-span-2">
          {alerts.length === 0 ? (
            <p className="text-sm text-white/60">لا تنبيهات: كل مجموعة معها مرافق، ولا أحد على العودة دون ذهاب.</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {alerts.map(({ f, w }, i) => (
                <li key={i} className="flex items-center gap-2 py-2 text-sm">
                  <button type="button" onClick={() => onOpenFlight(f.id)} className="shrink-0 rounded-lg bg-white/10 px-2 py-0.5 font-mono text-xs text-gold hover:bg-white/20" dir="ltr">{f.flightNo}</button>
                  <span className="text-white">{w}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Modal open={!!assignOne} onClose={() => setAssignOne(null)}>
        {assignOne && (
          <div>
            <h2 className="font-display text-xl font-bold text-green-dark">إسناد {assignOne.t.name} — {DIRECTION_LABEL[assignOne.dir]}</h2>
            <p className="mt-1 text-sm text-ink-soft">إسناد فردي لمن فقد مقعده. إن كانت عائلته على رحلة أخرى يظهر ذلك في التنبيهات.</p>
            <label className="mt-4 block text-sm"><span className="mb-1 block text-xs font-bold text-ink-soft">الرحلة</span>
              <select className="h-11 w-full rounded-2xl border-2 border-gold/40 bg-white px-3" value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="">— اختر —</option>
                {candidates.map((f) => <option key={f.id} value={f.id}>{f.flightNo} — {fmtGregShort(f.departAt)} — متبقٍّ {assignOne.t.kind === "employee" ? seatStats(f, data.assignments).remainingStaff : seatStats(f, data.assignments).remaining}{f.status === "locked" ? " — مقفلة" : ""}</option>)}
              </select>
            </label>
            <label className="mt-3 block text-sm"><span className="mb-1 block text-xs font-bold text-ink-soft">السبب (إلزامي على رحلة مقفلة)</span><input className="h-11 w-full rounded-2xl border-2 border-gold/40 px-3" value={reason} onChange={(e) => setReason(e.target.value)} /></label>
            <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setAssignOne(null)}>رجوع</Button><Button onClick={doAssign} disabled={!target || (flightOf(target)?.status === "locked" && !reason.trim())}><Check className="size-4" /> إسناد</Button></div>
          </div>
        )}
      </Modal>

      <Modal open={!!assignGroup} onClose={() => setAssignGroup(null)} className="max-w-xl">
        {assignGroup && (
          <div>
            <h2 className="font-display text-xl font-bold text-green-dark">إسناد المجموعة {assignGroup.number} — {clusterName(assignGroup.clusterId)}</h2>
            <p className="mt-1 text-sm text-ink-soft">{groupMembers.length} مسافراً: {familiesOfGroup(assignGroup, post, applications).length} عائلة وفريق المجموعة. تُسند كاملة، ومن ينضم إليها لاحقاً يلحق بها.</p>
            {(["out", "back"] as const).map((k) => {
              const dir: Direction = k === "out" ? "outbound" : "return";
              const already = flightOfGroup(assignGroup.clusterId, assignGroup.number, dir, data);
              return (
                <label key={k} className="mt-4 block text-sm">
                  <span className="mb-1 block text-xs font-bold text-ink-soft">رحلة {DIRECTION_LABEL[dir]}</span>
                  {already ? (
                    <p className="rounded-2xl bg-sand px-3 py-2 font-bold">على <span dir="ltr" className="font-mono">{already.flightNo}</span> — تُزال من صفحة الرحلة إن أردت تغييرها</p>
                  ) : (
                    <select className="h-11 w-full rounded-2xl border-2 border-gold/40 bg-white px-3" value={pick[k]} onChange={(e) => setPick({ ...pick, [k]: e.target.value })}>
                      <option value="">— لاحقاً —</option>
                      {flightsFor(dir).map((f) => {
                        const rem = seatStats(f, data.assignments).remaining;
                        return <option key={f.id} value={f.id} disabled={rem < groupMembers.length}>{f.flightNo} — {fmtGregShort(f.departAt)} {fmtClock(f.departAt)} — متبقٍّ {rem}{rem < groupMembers.length ? " (لا تتسع)" : ""}</option>;
                      })}
                    </select>
                  )}
                </label>
              );
            })}
            <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setAssignGroup(null)}>رجوع</Button><Button onClick={doAssignGroup} disabled={!pick.out && !pick.back}><Check className="size-4" /> إسناد المجموعة</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function RowsOfCluster({ cluster, rows, officer, onOpenFlight, onAssign }: { cluster: string; rows: Row[]; officer: boolean; onOpenFlight: (id: string) => void; onAssign: (g: GroupRef) => void }) {
  const sum = rows.reduce((a, r) => ({ total: a.total + r.total, out: a.out + r.out, back: a.back + r.back }), { total: 0, out: 0, back: 0 });
  const FlightChip = ({ f }: { f?: Flight }) =>
    f ? (
      <button type="button" onClick={() => onOpenFlight(f.id)} className="rounded-md bg-white/10 px-1.5 font-mono text-[11px] text-gold hover:bg-white/20" dir="ltr">{f.flightNo}</button>
    ) : null;
  return (
    <>
      <tr className="border-t border-white/15 bg-white/5">
        <td className="p-2 font-display font-bold text-gold">{clusterName(cluster)}</td>
        <td className="p-2 tabular-nums text-white">{formatNumber(sum.total)}</td>
        <td className={cn("p-2 tabular-nums", sum.out < sum.total ? "text-maroon-light" : "text-green-light")}>{formatNumber(sum.out)}</td>
        <td className={cn("p-2 tabular-nums", sum.back < sum.total ? "text-maroon-light" : "text-green-light")}>{formatNumber(sum.back)}</td>
        <td className="p-2" colSpan={2} />
      </tr>
      {rows.map((r) => (
        <tr key={r.g.number} className="border-t border-white/5">
          <td className="p-2 text-white">المجموعة {r.g.number} <span className="text-xs text-white/60">— {r.g.head}</span></td>
          <td className="p-2 tabular-nums text-white/85">{r.total}</td>
          <td className="p-2"><span className="flex flex-wrap items-center gap-2"><span className={cn("tabular-nums", r.out === 0 ? "text-maroon-light" : r.out < r.total ? "text-gold" : "text-green-light")}>{r.out}/{r.total}</span><FlightChip f={r.flightOut} /></span></td>
          <td className="p-2"><span className="flex flex-wrap items-center gap-2"><span className={cn("tabular-nums", r.back === 0 ? "text-maroon-light" : r.back < r.total ? "text-gold" : "text-green-light")}>{r.back}/{r.total}</span><FlightChip f={r.flightBack} /></span></td>
          <td className="p-2 text-xs text-maroon-light">{r.warnings.join(" · ")}</td>
          <td className="p-2 text-left">{officer && (!r.flightOut || !r.flightBack) && <Button size="sm" variant="gold" onClick={() => onAssign(r.g)} aria-label={`إسناد المجموعة ${r.g.number} من ${clusterName(cluster)}`}>إسناد</Button>}</td>
        </tr>
      ))}
    </>
  );
}
