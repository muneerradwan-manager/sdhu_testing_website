"use client";

import { Check, UserRoundPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DIRECTION_LABEL, fmtGregShort, fmtClock, isActive, seatStats, type Flight, type FlightsData, type Traveler } from "@/lib/flights";
import { CURRENT_SEASON, MISSIONS, employeeHaystack, fullName, inSeason, matches, postingsOf, useEmployees, useOpFiles, usePlaces, type Employee } from "@/lib/ops";
import { cn } from "@/lib/utils";
import { Drawer } from "../_components/kit";
import { Avatar, Chip, FilterSelect, SearchBox, selectClass } from "../_components/ops-ui";

/** Pick employees for a flight: by name, mission or the operational file they are posted in; whole files at once */
export function StaffPicker({ open, onClose, flight, data, onAssign }: { open: boolean; onClose: () => void; flight: Flight; data: FlightsData; onAssign: (travelers: Traveler[], alsoFlightId?: string) => void }) {
  const employees = useEmployees();
  const files = useOpFiles();
  const places = usePlaces();
  const [q, setQ] = useState("");
  const [mission, setMission] = useState("");
  const [fileId, setFileId] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [also, setAlso] = useState(flight.pairedFlightId ?? "");

  const seasonFiles = useMemo(() => files.filter((f) => f.season === CURRENT_SEASON), [files]);
  const postings = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const e of employees) {
      const p = postingsOf(e.id, seasonFiles, places);
      if (p.length) m.set(e.id, p.map((x) => x.file.id));
    }
    return m;
  }, [employees, seasonFiles, places]);

  const onThisWay = useMemo(() => {
    const set = new Set<string>();
    for (const a of data.assignments) if (a.travelerKind === "employee" && isActive(a) && data.flights.find((f) => f.id === a.flightId)?.direction === flight.direction) set.add(a.travelerId);
    return set;
  }, [data, flight.direction]);

  const rows = useMemo(
    () =>
      employees
        .filter((e) => inSeason(e) && !e.suspended)
        .filter((e) => !mission || e.mission === mission)
        .filter((e) => !fileId || postings.get(e.id)?.includes(fileId))
        .filter((e) => matches(q, employeeHaystack(e)))
        .sort((a, b) => fullName(a).localeCompare(fullName(b), "ar")),
    [employees, mission, fileId, q, postings],
  );
  const s = seatStats(flight, data.assignments);
  const room = s.remainingStaff;
  const chosen = rows.filter((e) => picked.includes(e.id) && !onThisWay.has(e.id));
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const pickAll = () => setPicked([...new Set([...picked, ...rows.filter((e) => !onThisWay.has(e.id)).map((e) => e.id)])]);
  const opposite: Direction = flight.direction === "outbound" ? "return" : "outbound";
  const counterparts = data.flights.filter((f) => f.direction === opposite && (f.status === "published" || f.status === "full") && (f.audience === "staff" || f.staffReserve > 0));

  const travelersOf = (list: Employee[]): Traveler[] => list.map((e) => ({ id: e.id, name: fullName(e), kind: "employee", gender: e.gender === "female" ? "F" : "M", needs: [] }));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`إسناد موظفين إلى ${flight.flightNo} — ${DIRECTION_LABEL[flight.direction]}`}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={cn("text-sm", chosen.length > room ? "text-maroon-light" : "text-white/70")}>المختارون {chosen.length} — المقاعد المتبقية للموظفين {room}</span>
          <div className="flex gap-2">
            <Button variant="glass" onClick={onClose}>إلغاء</Button>
            <Button variant="gold" disabled={!chosen.length || chosen.length > room} onClick={() => onAssign(travelersOf(chosen), also || undefined)}>
              <UserRoundPlus className="size-4" /> إسناد {chosen.length ? chosen.length : ""}
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <SearchBox value={q} onChange={setQ} label="بحث في الموظفين" placeholder="اسم، مسمى، محافظة..." />
        <FilterSelect value={mission} onChange={setMission} label="البعثة" all="كل البعثات" options={MISSIONS} />
        <FilterSelect value={fileId} onChange={setFileId} label="الملف التشغيلي" all="كل الملفات" options={seasonFiles.map((f) => ({ value: f.id, label: `${f.type === "makkah-housing" ? "التسكين في مكة" : f.type === "mina-camps" ? "مخيمات منى" : "مخيمات عرفات"} ${f.season}` }))} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-white/70">
        <span>{rows.length} موظفاً مشاركاً في الموسم{fileId ? " في هذا الملف" : ""}</span>
        <button type="button" onClick={pickAll} className="font-bold text-gold hover:underline">اختيار كل المعروضين</button>
      </div>
      <ul className="mt-3 divide-y divide-white/10 rounded-2xl bg-white/5 ring-1 ring-white/10">
        {rows.slice(0, 120).map((e) => {
          const taken = onThisWay.has(e.id);
          const on = picked.includes(e.id) && !taken;
          return (
            <li key={e.id}>
              <button type="button" disabled={taken} onClick={() => toggle(e.id)} className={cn("flex w-full items-center gap-3 px-3 py-2.5 text-right transition", taken ? "opacity-50" : "hover:bg-white/5", on && "bg-gold/10")}>
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-md ring-1", on ? "bg-gold text-ink ring-gold" : "ring-white/30")}>{on && <Check className="size-4" />}</span>
                <Avatar e={e} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-white">{fullName(e)}</span>
                  <span className="block truncate text-xs text-white/60">{e.jobTitle} — {e.mission}</span>
                </span>
                {taken ? <Chip tone="muted">على رحلة {DIRECTION_LABEL[flight.direction]}</Chip> : postings.has(e.id) ? <Chip tone="green">مُسند في ملف</Chip> : null}
              </button>
            </li>
          );
        })}
        {rows.length === 0 && <li className="px-4 py-8 text-center text-sm text-white/60">لا موظف يطابق البحث</li>}
      </ul>
      {counterparts.length > 0 && (
        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-bold text-gold">إسناد {DIRECTION_LABEL[opposite]} أيضاً (اختياري)</span>
          <select className={selectClass} value={also} onChange={(e) => setAlso(e.target.value)}>
            <option value="">— لا —</option>
            {counterparts.map((f) => (
              <option key={f.id} value={f.id}>{f.flightNo} — {fmtGregShort(f.departAt)} {fmtClock(f.departAt)} — متبقٍّ للموظفين {seatStats(f, data.assignments).remainingStaff}{f.id === flight.pairedFlightId ? " — الرحلة المقابلة" : ""}</option>
            ))}
          </select>
        </label>
      )}
    </Drawer>
  );
}

type Direction = Flight["direction"];
