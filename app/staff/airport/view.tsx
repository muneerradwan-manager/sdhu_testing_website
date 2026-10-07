"use client";

import { motion } from "motion/react";
import { Check, Lock, PlaneLanding, PlaneTakeoff, Search, TowerControl, UserX } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import {
  KIND_LABEL,
  airportOf,
  carrierOf,
  clusterName,
  flightsActions,
  fmtClock,
  fmtGregShort,
  fmtHijriShort,
  isActive,
  routeLabel,
  useAirportReps,
  useFlightsData,
  type Actor,
  type Flight,
} from "@/lib/flights";
import { groupName } from "@/lib/groups";
import { cn, formatNumber } from "@/lib/utils";
import { Empty, fmtDateTime, Kpi, PageHeader, Panel, useStaffUser } from "../_components/kit";
import { Chip } from "../_components/ops-ui";
import { StatusChip } from "../flights/shared";

/**
 * «رحلات مطاري»: the page of an airport's representative. The flights system's owner assigns him an
 * airport, and the page appears in his menu whatever his permissions. He records the take-off of every
 * flight leaving it — who boarded, who did not (each no-show opens a transport ticket) — and the landing
 * of every flight arriving at it. Nothing else of the flights opens to him.
 */
export function AirportView() {
  const user = useStaffUser()!;
  const { airportsOf } = useAirportReps();
  const mine = airportsOf(user.id);
  const data = useFlightsData();
  const [picked, setPicked] = useState<string | null>(null);
  const airportId = picked && mine.includes(picked) ? picked : mine[0];
  const airport = airportOf(data, airportId);

  if (!airport) {
    return (
      <div>
        <PageHeader eyebrow="الطيران" title="رحلات مطاري" icon={<TowerControl />} description="تظهر هذه الصفحة لمن يسنده صاحب صلاحية «إدارة الطيران» مندوباً لمطار." />
        <Empty icon={<Lock />} title="لست مندوب مطار" text="يسند صاحب صلاحية «إدارة الطيران» مندوبي المطارات من «إدارة الطيران» ← «المطارات والناقلون»." />
      </div>
    );
  }

  const shown = (f: Flight) => !["draft", "cancelled"].includes(f.status);
  const departures = data.flights.filter((f) => f.fromId === airport.id && shown(f)).sort((a, b) => a.departAt - b.departAt);
  const arrivals = data.flights.filter((f) => (f.divertedToId ?? f.toId) === airport.id && shown(f)).sort((a, b) => a.arriveAt - b.arriveAt);
  const toDepart = departures.filter((f) => f.status === "locked").length;
  const toLand = arrivals.filter((f) => f.status === "departed").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`مندوب ${airport.name}`}
        title="رحلات مطاري"
        icon={<TowerControl />}
        description={`تسجّل هنا إقلاع كل رحلة تغادر ${airport.city}: من صعد ومن تخلّف — ولكل متخلف تُفتح تذكرة نقل ليُسند إلى رحلة أخرى — وهبوط كل رحلة تصل إليها. يُقفل مسؤول الطيران الرحلة ويصدر كشفها قبل الإقلاع.`}
      />
      {mine.length > 1 && (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="المطار">
          {mine.map((id) => (
            <button key={id} type="button" role="radio" aria-checked={id === airport.id} onClick={() => setPicked(id)} className={cn("rounded-full px-3 py-1.5 text-xs font-bold ring-1", id === airport.id ? "bg-gold text-ink ring-gold" : "bg-white/[.06] text-white/80 ring-white/15")}>
              {airportOf(data, id)?.city}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="تغادر من مطارك" value={departures.length} icon={<PlaneTakeoff />} hint={`أقلع منها ${departures.filter((f) => f.status === "departed" || f.status === "arrived").length}`} />
        <Kpi label="بانتظار تسجيل الإقلاع" value={toDepart} icon={<Check />} tone="gold" delay={0.05} pulse={toDepart > 0} hint="مقفلة وكشفها صادر" />
        <Kpi label="تصل إلى مطارك" value={arrivals.length} icon={<PlaneLanding />} tone="teal" delay={0.1} hint={`هبط منها ${arrivals.filter((f) => f.status === "arrived").length}`} />
        <Kpi label="في الجو إليك الآن" value={toLand} icon={<PlaneLanding />} tone="maroon" delay={0.15} pulse={toLand > 0} hint="سجّل هبوطها حين تصل" />
      </div>

      <Panel icon={<PlaneTakeoff />} title={`المغادرة من ${airport.city}`} bodyClass="space-y-2">
        {departures.length === 0 ? <Empty icon={<PlaneTakeoff />} title="لا رحلات تغادر من مطارك" /> : departures.map((f) => <FlightRow key={f.id} f={f} kind="departure" />)}
      </Panel>
      <Panel icon={<PlaneLanding />} title={`الوصول إلى ${airport.city}`} bodyClass="space-y-2">
        {arrivals.length === 0 ? <Empty icon={<PlaneLanding />} title="لا رحلات تصل إلى مطارك" /> : arrivals.map((f) => <FlightRow key={f.id} f={f} kind="arrival" />)}
      </Panel>
    </div>
  );
}

function FlightRow({ f, kind }: { f: Flight; kind: "departure" | "arrival" }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const data = useFlightsData();
  const actor: Actor = { name: user.name, role: user.title };
  const [departing, setDeparting] = useState(false);
  const [landing, setLanding] = useState(false);
  const seated = data.assignments.filter((a) => a.flightId === f.id && (isActive(a) || a.status === "noShow"));
  const boarded = seated.filter((a) => a.status === "boarded" || a.status === "arrived").length;
  const noShow = seated.filter((a) => a.status === "noShow").length;
  const when = kind === "departure" ? f.departAt : f.arriveAt;

  return (
    <motion.div layout className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", kind === "departure" ? "bg-green-light/20 text-green-light" : "bg-gold/20 text-gold")}>{kind === "departure" ? <PlaneTakeoff className="size-5" /> : <PlaneLanding className="size-5" />}</span>
      <div className="min-w-0 flex-1 basis-60">
        <p className="flex flex-wrap items-center gap-2 font-bold text-white">
          <span className="font-mono" dir="ltr">
            {f.flightNo}
          </span>
          <span className="text-sm font-normal text-white/70">{routeLabel(data, f)}</span>
          <StatusChip f={f} />
        </p>
        <p className="text-xs text-white/65">
          {fmtHijriShort(when)} ({fmtGregShort(when)}) — {kind === "departure" ? "المغادرة" : "الوصول"} {fmtClock(when)} · {carrierOf(data, f.carrierId)?.name} · {formatNumber(seated.length)} مسافراً
          {kind === "departure" && f.gate ? ` · ${f.gate}` : ""}
        </p>
      </div>
      {kind === "departure" ? (
        f.status === "locked" ? (
          <Button size="sm" variant="gold" onClick={() => setDeparting(true)}>
            <PlaneTakeoff className="size-4" /> تسجيل الإقلاع
          </Button>
        ) : f.status === "departed" || f.status === "arrived" ? (
          <Chip tone="green">
            أقلعت {f.departedAt ? fmtDateTime(f.departedAt) : ""} — صعد {boarded}
            {noShow ? `، تخلّف ${noShow}` : ""}
          </Chip>
        ) : f.status === "postponed" ? (
          <Chip tone="maroon">مؤجلة: {f.postponeReason}</Chip>
        ) : (
          <span className="text-xs text-white/60">بانتظار إقفالها وإصدار كشفها من مسؤول الطيران</span>
        )
      ) : f.status === "departed" ? (
        landing ? (
          <span className="flex items-center gap-2">
            <Button
              size="sm"
              variant="gold"
              onClick={() => {
                const r = flightsActions.arrive(f.id, actor);
                toast(r.ok ? { title: `سُجّل هبوط ${f.flightNo}`, body: "تقدمت حالة مسافريها إلى «وصل».", tone: "success", icon: "🛬" } : { title: "لم يُنفَّذ", body: r.error, tone: "warning", icon: "⚠️" });
                setLanding(false);
              }}
            >
              تأكيد الهبوط
            </Button>
            <Button size="sm" variant="ghost" className="text-white" onClick={() => setLanding(false)}>
              تراجع
            </Button>
          </span>
        ) : (
          <Button size="sm" variant="gold" onClick={() => setLanding(true)}>
            <PlaneLanding className="size-4" /> تسجيل الهبوط
          </Button>
        )
      ) : f.status === "arrived" ? (
        <Chip tone="green">هبطت {f.arrivedAt ? fmtDateTime(f.arrivedAt) : ""}</Chip>
      ) : (
        <span className="text-xs text-white/60">لم تقلع بعد</span>
      )}
      {departing && <DepartDialog f={f} actor={actor} onClose={() => setDeparting(false)} />}
    </motion.div>
  );
}

/** Who boarded: everyone by default; the representative ticks who did not come */
function DepartDialog({ f, actor, onClose }: { f: Flight; actor: Actor; onClose: () => void }) {
  const toast = useToast();
  const data = useFlightsData();
  const [missing, setMissing] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const active = useMemo(() => data.assignments.filter((a) => a.flightId === f.id && isActive(a)), [data.assignments, f.id]);
  const shown = active.filter((a) => !q.trim() || a.name.includes(q.trim()) || (a.groupNumber !== undefined && groupName(a.groupNumber).includes(q.trim())));

  const record = () => {
    const r = flightsActions.depart(
      f.id,
      actor,
      active.filter((a) => !missing.includes(a.travelerId)).map((a) => a.travelerId),
    );
    toast(r.ok ? { title: `سُجّل إقلاع ${f.flightNo}`, body: missing.length ? `تخلّف ${missing.length}: فُتحت لهم تذاكر نقل، ويظهرون لمسؤول الطيران «بحاجة إلى رحلة».` : `صعد الجميع (${active.length}).`, tone: "success", icon: "🛫" } : { title: "لم يُنفَّذ", body: r.error, tone: "warning", icon: "⚠️" });
    if (r.ok) onClose();
  };

  return (
    <Modal open onClose={onClose} className="max-w-2xl border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
      <p className="text-xs font-bold text-gold">تسجيل الإقلاع</p>
      <h3 className="mt-1 font-display text-xl font-bold">
        <span className="font-mono" dir="ltr">
          {f.flightNo}
        </span>{" "}
        — {routeLabel(data, f)}
      </h3>
      <p className="mt-1 text-sm leading-7 text-white/70">الجميع صعدوا ما لم تعلّم أحداً. علّم من لم يصعد: يُسجَّل «تخلّف» وتُفتح له تذكرة نقل.</p>
      <label className="relative mt-3 block">
        <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gold" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="اسم المسافر أو مجموعته..." className="h-11 w-full rounded-xl border-2 border-white/15 bg-white/10 pr-9 pl-3 text-white outline-none placeholder:text-white/40 focus:border-gold" aria-label="بحث في المسافرين" />
      </label>
      <ul className="mt-3 max-h-72 space-y-1 overflow-auto rounded-2xl bg-black/20 p-2">
        {shown.map((a) => {
          const off = missing.includes(a.travelerId);
          return (
            <li key={a.id}>
              <label className={cn("flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm", off ? "bg-maroon/30" : "hover:bg-white/5")}>
                <input type="checkbox" className="size-4 accent-[#672146]" checked={off} onChange={() => setMissing((p) => (off ? p.filter((x) => x !== a.travelerId) : [...p, a.travelerId]))} aria-label={`${a.name} لم يصعد`} />
                <span className={cn("flex-1 font-bold", off && "line-through")}>{a.name}</span>
                <span className="text-xs text-white/55">{a.groupNumber ? `${groupName(a.groupNumber)} — ${clusterName(a.clusterId ?? "")}` : KIND_LABEL[a.travelerKind]}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 flex items-center gap-2 text-sm">
        <Chip tone="green">صعد {active.length - missing.length}</Chip>
        {missing.length > 0 && (
          <Chip tone="maroon">
            <UserX className="size-3" /> تخلّف {missing.length}
          </Chip>
        )}
      </p>
      <div className="mt-4 flex gap-2">
        <Button variant="gold" onClick={record}>
          <PlaneTakeoff className="size-4" /> تسجيل الإقلاع
        </Button>
        <Button variant="glass" onClick={onClose}>
          إلغاء
        </Button>
      </div>
    </Modal>
  );
}
