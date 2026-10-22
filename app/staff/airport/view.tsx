"use client";

import { Lock, PlaneLanding, PlaneTakeoff, Search, TowerControl, UserX } from "lucide-react";
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
import { can, Empty, fmtDateTime, PageHeader, useStaffUser } from "../_components/kit";
import { Chip } from "../_components/ops-ui";
import { Box, EmptyRow, ListTable, Tag } from "../_components/wp";
import { Segments } from "../exam/_components/ui";
import { StatusChip } from "../flights/shared";

/**
 * «رحلات مطاري»: the page of an airport's representative — whoever holds «رحلات المطار» (`airport.*`) for
 * that airport; the page appears in his menu with it. One list of the flights leaving it and
 * arriving at it — filtered by what waits for him, beside its counts — where he records each take-off (who
 * boarded, who did not: each no-show opens a transport ticket) and each landing. Nothing else opens to him.
 */
type Show = "all" | "waiting" | "departures" | "arrivals";
type Row = { f: Flight; kind: "departure" | "arrival"; when: number };

export function AirportView() {
  const user = useStaffUser()!;
  const { airportsOf } = useAirportReps();
  const mine = airportsOf(user.id);
  const data = useFlightsData();
  const [picked, setPicked] = useState<string | null>(null);
  const [show, setShow] = useState<Show>("all");
  const airport = airportOf(data, picked && mine.includes(picked) ? picked : mine[0]);

  if (!airport) {
    return (
      <div>
        <PageHeader eyebrow="الطيران" title="رحلات مطاري" icon={<TowerControl />} description="تظهر هذه الصفحة لمن يملك صلاحية «رحلات المطار» لمطار بعينه." />
        <Empty icon={<Lock />} title="لست مندوب مطار" text="تُمنح صلاحية «رحلات المطار» لمطار بعينه من «صلاحيات الموظفين»." />
      </div>
    );
  }

  const shown = (f: Flight) => !["draft", "cancelled"].includes(f.status);
  const departures: Row[] = data.flights.filter((f) => f.fromId === airport.id && shown(f)).map((f) => ({ f, kind: "departure", when: f.departAt }));
  const arrivals: Row[] = data.flights.filter((f) => (f.divertedToId ?? f.toId) === airport.id && shown(f)).map((f) => ({ f, kind: "arrival", when: f.arriveAt }));
  const waits = (r: Row) => (r.kind === "departure" ? r.f.status === "locked" : r.f.status === "departed");
  const all = [...departures, ...arrivals].sort((a, b) => a.when - b.when);
  const rows = all.filter((r) => (show === "waiting" ? waits(r) : show === "departures" ? r.kind === "departure" : show === "arrivals" ? r.kind === "arrival" : true));

  return (
    <div className="space-y-5">
      <PageHeader eyebrow={`مندوب ${airport.name}`} title="رحلات مطاري" icon={<TowerControl />} description={`تسجّل هنا إقلاع الرحلات من ${airport.city} ومن تخلّف عنها، وهبوط الرحلات فيها.`} />
      {mine.length > 1 && (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="المطار">
          {mine.map((id) => (
            <button key={id} type="button" role="radio" aria-checked={id === airport.id} onClick={() => setPicked(id)} className={cn("rounded-full px-3 py-1.5 text-xs font-bold ring-1", id === airport.id ? "bg-gold text-ink ring-gold" : "bg-white/[.06] text-white/80 ring-white/15")}>
              {airportOf(data, id)?.city}
            </button>
          ))}
        </div>
      )}

      <Segments<Show>
        value={show}
        onChange={setShow}
        label="الرحلات"
        items={[
          { value: "all", label: "الكل", count: all.length },
          { value: "waiting", label: "بانتظار تسجيلك", count: all.filter(waits).length, tone: "maroon" },
          { value: "departures", label: `المغادرة من ${airport.city}`, count: departures.length },
          { value: "arrivals", label: `الوصول إلى ${airport.city}`, count: arrivals.length },
        ]}
      />

      <ListTable head={["الرحلة", "الموعد", "المسافرون", "الحالة", ""]} minWidth="46rem">
        {rows.map((r) => (
          <FlightRow key={`${r.kind}-${r.f.id}`} f={r.f} kind={r.kind} />
        ))}
        {rows.length === 0 && <EmptyRow cols={5}>{show === "waiting" ? "لا شيء بانتظارك الآن." : "لا رحلات هنا."}</EmptyRow>}
      </ListTable>

      <Box title="كيف تعمل؟" open={false}>
        <p>يُقفل مسؤول الطيران الرحلة ويصدر كشف ركابها قبل الإقلاع، فيظهر لك زر «تسجيل الإقلاع».</p>
        <p>عند الإقلاع: الجميع صعدوا ما لم تعلّم أحداً. من تعلّمه يُسجَّل «تخلّف» وتُفتح له تذكرة نقل ليُسند إلى رحلة أخرى.</p>
        <p>عند الوصول: «تسجيل الهبوط» ثم «تأكيد الهبوط»، فتتقدم حالة المسافرين إلى «وصل».</p>
      </Box>
    </div>
  );
}

function FlightRow({ f, kind }: { f: Flight; kind: "departure" | "arrival" }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const data = useFlightsData();
  const actor: Actor = { name: user.name, role: user.title };
  // Each act for this flight's own airport: the take-off from where it leaves, the landing where it lands
  const mayDepart = can(user, "airport.flights.depart", f.fromId);
  const mayArrive = can(user, "airport.flights.arrive", f.divertedToId ?? f.toId);
  const [departing, setDeparting] = useState(false);
  const [landing, setLanding] = useState(false);
  const seated = data.assignments.filter((a) => a.flightId === f.id && (isActive(a) || a.status === "noShow"));
  const boarded = seated.filter((a) => a.status === "boarded" || a.status === "arrived").length;
  const noShow = seated.filter((a) => a.status === "noShow").length;
  const when = kind === "departure" ? f.departAt : f.arriveAt;

  return (
    <tr className="align-top">
      <td className="p-3">
        <p className="flex flex-wrap items-center gap-2 font-bold text-white">
          <span className={cn("grid size-8 shrink-0 place-items-center rounded-xl", kind === "departure" ? "bg-green-light/20 text-green-light" : "bg-gold/20 text-gold")} aria-hidden>
            {kind === "departure" ? <PlaneTakeoff className="size-4" /> : <PlaneLanding className="size-4" />}
          </span>
          <span className="font-mono" dir="ltr">
            {f.flightNo}
          </span>
          <Tag tone={kind === "departure" ? "green" : "gold"}>{kind === "departure" ? "مغادرة" : "وصول"}</Tag>
        </p>
        <p className="mt-1 text-xs text-white/65">
          {routeLabel(data, f)} · {carrierOf(data, f.carrierId)?.name}
          {kind === "departure" && f.gate ? ` · ${f.gate}` : ""}
        </p>
      </td>
      <td className="p-3 text-white/85">
        <span className="block">
          {fmtHijriShort(when)} ({fmtGregShort(when)})
        </span>
        <span className="block text-xs text-white/60">
          {kind === "departure" ? "المغادرة" : "الوصول"} {fmtClock(when)}
        </span>
      </td>
      <td className="p-3 tabular-nums text-white/85">{formatNumber(seated.length)}</td>
      <td className="p-3">
        <StatusChip f={f} />
      </td>
      <td className="p-3">
        {kind === "departure" ? (
          f.status === "locked" ? (
            <Button size="sm" variant="gold" disabled={!mayDepart} title={mayDepart ? undefined : "يحتاج صلاحية «تسجيل الإقلاع» لهذا المطار"} onClick={() => setDeparting(true)}>
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
            <Button size="sm" variant="gold" disabled={!mayArrive} title={mayArrive ? undefined : "يحتاج صلاحية «تسجيل الهبوط» لهذا المطار"} onClick={() => setLanding(true)}>
              <PlaneLanding className="size-4" /> تسجيل الهبوط
            </Button>
          )
        ) : f.status === "arrived" ? (
          <Chip tone="green">هبطت {f.arrivedAt ? fmtDateTime(f.arrivedAt) : ""}</Chip>
        ) : (
          <span className="text-xs text-white/60">لم تقلع بعد</span>
        )}
        {departing && <DepartDialog f={f} actor={actor} onClose={() => setDeparting(false)} />}
      </td>
    </tr>
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
