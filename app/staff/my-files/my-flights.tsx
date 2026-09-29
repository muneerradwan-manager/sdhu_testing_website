"use client";

import { Plane, PlaneLanding, PlaneTakeoff } from "lucide-react";
import { ASSIGNMENT_LABEL, DIRECTION_LABEL, airportOf, carrierOf, fmtClock, fmtGreg, fmtHijri, itineraryOf, useFlightsData, type Direction } from "@/lib/flights";
import { cn } from "@/lib/utils";
import { Panel } from "../_components/kit";
import { Chip } from "../_components/ops-ui";

/** رحلاتي: the employee's own seats on the mission's flights, as the flight officer assigned them */
export function MyFlights({ employeeId }: { employeeId: string }) {
  const data = useFlightsData();
  const it = itineraryOf(employeeId, data);
  const legs = (["outbound", "return"] as Direction[]).map((d) => ({ d, a: it[d], f: data.flights.find((x) => x.id === it[d]?.flightId) }));
  return (
    <Panel icon={<Plane />} title="رحلاتي" action={<Chip tone={it.outbound && it.return ? "green" : it.outbound ? "gold" : "muted"}>{it.outbound && it.return ? "ذهاب وعودة" : it.outbound ? "ذهاب فقط" : "لم تُحدد بعد"}</Chip>}>
      <div className="grid gap-3 md:grid-cols-2">
        {legs.map(({ d, a, f }) => (
          <div key={d} className={cn("rounded-2xl p-4 ring-1", f ? "bg-white/8 ring-white/15" : "bg-white/5 ring-white/10")}>
            <p className="flex items-center gap-2 text-sm font-bold text-gold">{d === "outbound" ? <PlaneTakeoff className="size-4" /> : <PlaneLanding className="size-4" />} رحلة {DIRECTION_LABEL[d]}</p>
            {f && a ? (
              <>
                <p className="mt-2 font-display text-2xl font-bold text-white"><span dir="ltr" className="font-mono">{f.flightNo}</span> <span className="text-sm font-normal text-white/70">— {carrierOf(data, f.carrierId)?.name}</span></p>
                <p className="mt-1 text-white">{airportOf(data, f.fromId)?.city} ← {airportOf(data, f.divertedToId ?? f.toId)?.city}</p>
                <p className="text-sm text-white/75">{fmtHijri(f.departAt)} — {fmtGreg(f.departAt)}</p>
                <p className="text-sm text-white/75">المغادرة {fmtClock(f.departAt)} — الوصول {fmtClock(f.arriveAt)} — {f.gate ?? ""}</p>
                {f.gathering && <p className="mt-1 text-xs text-white/60">التجمّع: {f.gathering}</p>}
                <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/60">
                  <Chip tone={a.status === "boarded" || a.status === "arrived" ? "green" : "gold"}>{ASSIGNMENT_LABEL[a.status]}</Chip>
                  أسندك {a.assignedBy}
                  {f.status === "postponed" && <Chip tone="maroon">مؤجلة — يصلك الموعد الجديد</Chip>}
                  {f.divertedToId && <Chip tone="maroon">حُوّلت الوجهة</Chip>}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-white/60">لم يُسندك مسؤول الطيران بعد. يصلك إشعار حين تُحدد رحلتك.</p>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}
