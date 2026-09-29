"use client";

import { Check, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DIRECTION_LABEL,
  allClusterIds,
  clusterName,
  flightOfGroup,
  fmtClock,
  fmtGregShort,
  groupsOfCluster,
  isOpenForAssignment,
  membersOfGroup,
  seatStats,
  type Flight,
  type FlightsData,
  type GroupRef,
  type Traveler,
} from "@/lib/flights";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Drawer, textareaClass } from "../_components/kit";
import { Chip, FilterSelect, SearchBox, selectClass } from "../_components/ops-ui";

export type GroupPick = { ref: GroupRef; members: Traveler[] };

/**
 * Put whole groups on a flight. Every member the group has now travels (its families and its team); a
 * group is picked whole or not at all. The officer usually arrives here after a call from a cluster head:
 * the coordination happens outside the platform.
 */
export function GroupPicker({ open, onClose, flight, data, onAssign }: { open: boolean; onClose: () => void; flight: Flight; data: FlightsData; onAssign: (groups: GroupPick[], alsoFlightId?: string, reason?: string) => void }) {
  const post = useStore((s) => s.post);
  const applications = useStore((s) => s.applications);
  const admins = useStore((s) => s.admins);
  const [cluster, setCluster] = useState("");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const opposite = flight.direction === "outbound" ? "return" : "outbound";
  const paired = data.flights.find((f) => f.id === flight.pairedFlightId && isOpenForAssignment(f));
  const [also, setAlso] = useState(paired?.id ?? "");
  const [reason, setReason] = useState("");

  const rows = useMemo(
    () =>
      allClusterIds()
        .filter((c) => !cluster || c === cluster)
        .flatMap((c) => groupsOfCluster(c))
        .filter((g) => !q || `${g.number} ${g.head} ${clusterName(g.clusterId)}`.includes(q.trim()))
        .map((g) => ({ g, key: `${g.clusterId}:${g.number}`, members: membersOfGroup(g, post, applications, admins), here: flightOfGroup(g.clusterId, g.number, flight.direction, data), there: flightOfGroup(g.clusterId, g.number, opposite, data) })),
    [cluster, q, post, applications, admins, data, flight.direction, opposite],
  );
  const chosen = rows.filter((r) => picked.includes(r.key) && !r.here);
  const count = chosen.reduce((n, r) => n + r.members.length, 0);
  const s = seatStats(flight, data.assignments);
  const room = s.remaining;
  const alsoFlight = data.flights.find((f) => f.id === also);
  const alsoRoom = alsoFlight ? seatStats(alsoFlight, data.assignments).remaining : Infinity;
  const locked = flight.status === "locked";
  const counterparts = data.flights.filter((f) => f.direction === opposite && f.audience === "pilgrims" && isOpenForAssignment(f));
  const toggle = (k: string) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`إضافة مجموعات إلى ${flight.flightNo} — ${DIRECTION_LABEL[flight.direction]}`}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={cn("text-sm", count > room || (alsoFlight && count > alsoRoom) ? "text-maroon-light" : "text-white/70")}>
            {chosen.length} مجموعات — {count} مسافراً — المتبقي على الرحلة {room}
            {alsoFlight ? ` — وعلى ${alsoFlight.flightNo} ${alsoRoom}` : ""}
          </span>
          <div className="flex gap-2">
            <Button variant="glass" onClick={onClose}>إلغاء</Button>
            <Button variant="gold" disabled={!chosen.length || count > room || (!!alsoFlight && count > alsoRoom) || (locked && !reason.trim())} onClick={() => onAssign(chosen.map((r) => ({ ref: r.g, members: r.members })), also || undefined, reason.trim() || undefined)}>
              <UsersRound className="size-4" /> إسناد {chosen.length ? `${chosen.length} ${chosen.length === 1 ? "مجموعة" : "مجموعات"}` : ""}
            </Button>
          </div>
        </div>
      }
    >
      <p className="mb-3 text-sm text-white/70">اختر المجموعة كاملة: كل المسجلين فيها يسافرون على هذه الرحلة، مع فريقها، ومن ينضم إليها لاحقاً يُضاف إليها تلقائياً.</p>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <SearchBox value={q} onChange={setQ} label="بحث في المجموعات" placeholder="رقم المجموعة أو اسم رئيسها..." />
        <FilterSelect value={cluster} onChange={setCluster} label="التكتل" all="كل التكتلات" options={allClusterIds().map((c) => ({ value: c, label: clusterName(c) }))} />
      </div>
      <ul className="mt-3 divide-y divide-white/10 rounded-2xl bg-white/5 ring-1 ring-white/10">
        {rows.map((r) => {
          const on = picked.includes(r.key) && !r.here;
          return (
            <li key={r.key}>
              <button type="button" disabled={!!r.here} onClick={() => toggle(r.key)} aria-pressed={on} aria-label={`المجموعة ${r.g.number} — ${clusterName(r.g.clusterId)}`} className={cn("flex w-full items-center gap-3 px-3 py-2.5 text-right transition", r.here ? "opacity-55" : "hover:bg-white/5", on && "bg-gold/10")}>
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-md ring-1", on ? "bg-gold text-ink ring-gold" : "ring-white/30")}>{on && <Check className="size-4" />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-white">المجموعة {r.g.number} <span className="font-normal text-white/60">— {clusterName(r.g.clusterId)}</span></span>
                  <span className="block truncate text-xs text-white/60">{r.g.head} — {r.members.length} مسافراً مع الفريق</span>
                </span>
                {r.here ? <Chip tone="muted">على {r.here.flightNo}</Chip> : r.there ? <Chip tone="green">{DIRECTION_LABEL[opposite]}: {r.there.flightNo}</Chip> : null}
              </button>
            </li>
          );
        })}
        {rows.length === 0 && <li className="px-4 py-8 text-center text-sm text-white/60">لا مجموعة تطابق البحث</li>}
      </ul>
      {counterparts.length > 0 && (
        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-bold text-gold">وإسنادها إلى رحلة {DIRECTION_LABEL[opposite]} أيضاً</span>
          <select className={selectClass} value={also} onChange={(e) => setAlso(e.target.value)}>
            <option value="">— لا —</option>
            {counterparts.map((f) => (
              <option key={f.id} value={f.id}>{f.flightNo} — {fmtGregShort(f.departAt)} {fmtClock(f.departAt)} — متبقٍّ {seatStats(f, data.assignments).remaining}{f.id === flight.pairedFlightId ? " — الرحلة المقابلة" : ""}</option>
            ))}
          </select>
        </label>
      )}
      {locked && (
        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-bold text-gold">السبب (الرحلة مقفلة)</span>
          <textarea className={textareaClass} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="أُضيفت بعد إقفال الرحلة لإلغاء رحلتها الأصلية" />
        </label>
      )}
    </Drawer>
  );
}
