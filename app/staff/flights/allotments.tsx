"use client";

import Link from "next/link";
import { CalendarDays, Save } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import {
  DIRECTION_LABEL,
  STATUS_LABEL,
  clusterName,
  clusterSeats,
  flightsActions,
  fmtClock,
  fmtGregShort,
  fmtHijriShort,
  seatStats,
  tripLabel,
  type Direction,
  type Flight,
  type FlightsData,
} from "@/lib/flights";
import { useOwns } from "@/lib/systems";
import { cn } from "@/lib/utils";
import { Drawer, useStaffUser } from "../_components/kit";
import { OperationHeader } from "../_components/system";
import { Box, EmptyRow, ListTable, RecordsBox, RowActions, RowLink, Tag } from "../_components/wp";
import { useFlightsDesk } from "./desk";
import { flightHref } from "./flight-screen";

/**
 * «أيام التكتلات»: the officer tells each cluster its days — the flights it travels on each way, and the seats it
 * holds on each (the whole flight, or its share of one shared with other clusters). The cluster's head then
 * puts his groups and pilgrims on them from the administrators' platform, up to those seats. One row per
 * cluster; its days open in one side sheet, saved together.
 */
export function AllotmentsPage() {
  const desk = useFlightsDesk();
  const user = useStaffUser()!;
  const officer = useOwns(user, "flights");
  const [open, setOpen] = useState<string | null>(null);
  const rows = desk.clusterTotals;

  const days = (list: (typeof rows)[number]["days"], dir: Direction) => {
    const mine = list.filter((x) => x.f.direction === dir);
    if (!mine.length) return <span className="text-xs text-maroon-light">لا أيام</span>;
    return (
      <span className="flex flex-wrap gap-1">
        {mine.map(({ a, f }) => (
          <Link key={a.id} href={flightHref(f.id)} className="rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] text-white/85 hover:bg-white/20" title={`${f.flightNo} — ${tripLabel(desk.data, f)}`}>
            {fmtHijriShort(f.departAt)} <span dir="ltr" className="font-mono text-gold">{f.flightNo}</span>
            {a.seats !== undefined && <span className="text-white/55"> · {a.seats}</span>}
          </Link>
        ))}
      </span>
    );
  };
  const seats = (n: number, total: number) => <span className={cn("tabular-nums", n < total ? "font-bold text-maroon-light" : "text-green-light")}>{n}/{total}</span>;

  return (
    <div className="space-y-5">
      <OperationHeader system="flights" icon={<CalendarDays />} />
      <ListTable head={["التكتل", "أيام الذهاب", "أيام العودة", "المسافرون", "مقاعد الذهاب", "مقاعد العودة"]} minWidth="56rem">
        {rows.map((t) => (
          <tr key={t.cluster} className="align-top">
            <td className="p-3">
              <p className="font-bold text-white">{t.name}</p>
              <span className="text-xs text-white/55">{t.groups} مجموعات — على الذهاب {t.out}، على العودة {t.back}</span>
              {officer && (
                <RowActions>
                  <RowLink onClick={() => setOpen(t.cluster)}>{t.days.length ? "تعديل الأيام" : "إعطاء أيام"}</RowLink>
                </RowActions>
              )}
            </td>
            <td className="p-3">{days(t.days, "outbound")}</td>
            <td className="p-3">{days(t.days, "return")}</td>
            <td className="p-3 tabular-nums text-white/85">{t.total}</td>
            <td className="p-3">{seats(t.outSeats, t.total)}</td>
            <td className="p-3">{seats(t.backSeats, t.total)}</td>
          </tr>
        ))}
        {rows.length === 0 && <EmptyRow cols={6}>لا تكتل مشكّل بعد. يظهر هنا كل تكتل يُشكَّل في المكتب.</EmptyRow>}
      </ListTable>

      <Box title="كيف تعمل؟" open={false}>
        <p>تعطي كل تكتل أيام رحلاته: رحلات ذهاب من دمشق أو حلب إلى مكة المكرمة (جدة) أو المدينة المنورة، ورحلات عودة. لكل رحلة مقاعد التكتل عليها: الرحلة كلها، أو عدد من مقاعد رحلة يتشاركها أكثر من تكتل.</p>
        <p>يرى منسقو التكتل التقنيون أيامه في «القوائم» (تبويب «الطيران») من منصة الإداريين، فيضع كلٌّ منهم مجموعاته عليها كاملة، ويضيف حاجاً بمفرده إن سافر وحده، في حدود مقاعد تكتله وقبل إقفال الرحلة. وتهبط العودة حيث يسمح مطار الذهاب، كما تضبطه في «المطارات ومندوبوها».</p>
        <p>لا تُسحب رحلة من تكتل وعليها أحد منه، ولا تقلّ مقاعده عمّن عليها، ولا تتجاوز مقاعد التكتلات على رحلة مقاعد الحجاج فيها.</p>
      </Box>

      <RecordsBox system="flights" area="allotments" title="سجل أيام التكتلات" />

      {open && <DaysSheet key={open} clusterId={open} data={desk.data} total={rows.find((t) => t.cluster === open)?.total ?? 0} onClose={() => setOpen(null)} />}
    </div>
  );
}

type Row = { on: boolean; whole: boolean; seats: string };

/** One cluster's days in a side sheet: every pilgrims' flight still to come, given or not, and its seats */
function DaysSheet({ clusterId, data, total, onClose }: { clusterId: string; data: FlightsData; total: number; onClose: () => void }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const actor = { name: user.name, role: user.title };
  const flights = data.flights.filter((f) => f.audience === "pilgrims" && !["departed", "arrived", "cancelled"].includes(f.status)).sort((a, b) => a.departAt - b.departAt);
  const initial = Object.fromEntries(
    flights.map((f) => {
      const a = data.allotments.find((x) => x.flightId === f.id && x.clusterId === clusterId);
      return [f.id, { on: !!a, whole: !!a && a.seats === undefined, seats: a?.seats !== undefined ? String(a.seats) : "" } satisfies Row];
    }),
  ) as Record<string, Row>;
  const [rows, setRows] = useState(initial);
  const set = (id: string, r: Partial<Row>) => setRows((x) => ({ ...x, [id]: { ...x[id], ...r } }));
  const name = clusterName(clusterId);

  const others = (f: Flight) => data.allotments.filter((x) => x.flightId === f.id && x.clusterId !== clusterId);
  const seatsOf = (f: Flight) => {
    const r = rows[f.id];
    return !r?.on ? 0 : r.whole ? seatStats(f, data.assignments).pilgrimSeats : Math.max(0, Math.floor(Number(r.seats) || 0));
  };
  const sum = (dir: Direction) => flights.filter((f) => f.direction === dir).reduce((n, f) => n + seatsOf(f), 0);

  const save = () => {
    const errors: string[] = [];
    let changed = 0;
    for (const f of flights) {
      const was = initial[f.id];
      const now = rows[f.id];
      const seats = now.whole ? undefined : Math.floor(Number(now.seats) || 0);
      if (!now.on && was.on) {
        const r = flightsActions.unallot(clusterId, f.id, actor);
        if (r.ok) changed++;
        else errors.push(`${f.flightNo}: ${r.error}`);
      } else if (now.on && (!was.on || was.whole !== now.whole || (!now.whole && was.seats !== now.seats))) {
        const r = flightsActions.allot(clusterId, f.id, seats, actor);
        if (r.ok) changed++;
        else errors.push(`${f.flightNo}: ${r.error}`);
      }
    }
    if (errors.length) return toast({ title: changed ? `حُفظ ${changed} وبقي ${errors.length}` : "لم تُحفظ الأيام", body: errors.join(" · "), tone: "warning", icon: "⚠️" });
    if (changed) toast({ title: `حُفظت أيام ${name}`, body: `يراها منسقو التكتل في «القوائم» ويضعون مجموعاتهم عليها.`, tone: "success", icon: "🗓️" });
    onClose();
  };

  const section = (dir: Direction) => (
    <section key={dir}>
      <h3 className="mb-2 font-display font-bold text-gold">
        {dir === "outbound" ? "الذهاب" : "العودة"} <span className="text-sm font-normal text-white/60">— مقاعد {name}: {sum(dir)} من {total} مسافراً</span>
      </h3>
      <ul className="divide-y divide-white/10 rounded-2xl bg-white/5 ring-1 ring-white/10">
        {flights
          .filter((f) => f.direction === dir)
          .map((f) => {
            const r = rows[f.id];
            const c = clusterSeats(f, clusterId, data);
            const s = seatStats(f, data.assignments);
            const shared = others(f);
            return (
              <li key={f.id} className={cn("px-3 py-2.5", r.on && "bg-gold/10")}>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <input type="checkbox" className="accent-gold" checked={r.on} disabled={r.on && c.used > 0} onChange={(e) => set(f.id, { on: e.target.checked, whole: e.target.checked && !shared.length })} aria-label={`${f.flightNo} لـ${name}`} />
                    <span className="min-w-0">
                      <span className="block font-bold text-white">
                        {fmtHijriShort(f.departAt)} — {fmtGregShort(f.departAt)} {fmtClock(f.departAt)} <span dir="ltr" className="font-mono text-gold">{f.flightNo}</span>
                      </span>
                      <span className="block text-xs text-white/60">
                        {tripLabel(data, f)} — مقاعد الحجاج {s.pilgrimSeats}
                        {f.status !== "published" ? ` — ${STATUS_LABEL[f.status]}` : ""}
                        {shared.length ? ` — ${shared.map((x) => `${clusterName(x.clusterId)} ${x.seats ?? "كلها"}`).join("، ")}` : ""}
                        {c.used ? ` — عليها من ${name} ${c.used}` : ""}
                      </span>
                    </span>
                  </label>
                  {r.on && (
                    <span className="flex items-center gap-2 text-sm text-white">
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" className="accent-gold" checked={r.whole} onChange={(e) => set(f.id, { whole: e.target.checked })} />
                        الرحلة كلها
                      </label>
                      {!r.whole && <input type="number" min={Math.max(1, c.used)} aria-label={`مقاعد ${name} على ${f.flightNo}`} className="h-9 w-20 rounded-xl bg-white/10 px-2 text-center tabular-nums text-white ring-1 ring-white/20" value={r.seats} onChange={(e) => set(f.id, { seats: e.target.value })} placeholder="مقاعد" />}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
      </ul>
    </section>
  );

  return (
    <Drawer
      open
      onClose={onClose}
      title={`أيام ${name}`}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={cn("text-sm", sum("outbound") < total || sum("return") < total ? "text-gold" : "text-white/70")}>
            {DIRECTION_LABEL.outbound} {sum("outbound")} — {DIRECTION_LABEL.return} {sum("return")} — المسافرون {total}
          </span>
          <div className="flex gap-2">
            <Button variant="glass" onClick={onClose}>إلغاء</Button>
            <Button variant="gold" onClick={save}><Save className="size-4" /> حفظ الأيام</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-white/70">اختر رحلات {name} ذهاباً وعودة. الرحلة كلها له، أو عدد من مقاعدها إن تشاركها مع تكتل آخر. لا تُسحب رحلة عليها أحد منه.</p>
        {section("outbound")}
        {section("return")}
        {flights.length === 0 && <p className="text-sm text-white/60">لا رحلات حجاج قادمة. أنشئها من «الرحلات».</p>}
        <Tag tone="muted">تهبط العودة حيث يسمح مطار الذهاب، كما في «المطارات ومندوبوها»</Tag>
      </div>
    </Drawer>
  );
}
