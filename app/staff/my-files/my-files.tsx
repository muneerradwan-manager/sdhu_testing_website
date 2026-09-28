"use client";

import { motion } from "motion/react";
import { BedDouble, BriefcaseBusiness, CalendarRange, ChevronDown, Clock, FileText, Hotel as HotelIcon, MapPin, Phone, Tent, UserRound, UsersRound } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useClusters } from "@/lib/cms/content";
import {
  CADENCE_LABEL,
  CURRENT_SEASON,
  fileState,
  fileTypeOf,
  fullName,
  roleIn,
  useEmployees,
  useOpFiles,
  usePlaces,
  useRefs,
  type Assignment,
  type Employee,
  type FileState,
  type FileType,
  type InnerNode,
  type OpFile,
  type OuterNode,
  type Role,
} from "@/lib/ops";
import { cn, formatNumber } from "@/lib/utils";
import { Empty, Panel, fmtDate, useNow } from "../_components/kit";
import { Avatar, Chip } from "../_components/ops-ui";

/** One post a person holds, with the nodes around it */
type Seat = { file: OpFile; type: FileType; role: Role; assignment: Assignment; outer?: OuterNode; inner?: InnerNode };

function seatsOf(employeeId: string, files: OpFile[]): Seat[] {
  const out: Seat[] = [];
  for (const file of files) {
    const type = fileTypeOf(file.type);
    const add = (a: Assignment, outer?: OuterNode, inner?: InnerNode) => {
      if (a.employeeId === employeeId) out.push({ file, type, role: roleIn(type, a.role), assignment: a, outer, inner });
    };
    file.members.forEach((a) => add(a));
    for (const o of file.nodes) {
      o.members.forEach((a) => add(a, o));
      o.children.forEach((c) => c.members.forEach((a) => add(a, o, c)));
    }
  }
  // In the order the season runs: Makkah first, then Mina, then Arafat
  return out.sort((a, b) => b.file.season - a.file.season || a.file.startsOn.localeCompare(b.file.startsOn));
}

const at = (iso: string) => new Date(`${iso}T12:00:00`).getTime();
const dateOf = (iso: string) => fmtDate(at(iso));
const DAY = 86_400_000;

const STATE: Record<FileState, { label: string; tone: "gold" | "green" | "muted"; note: string }> = {
  draft: { label: "إسناد مبدئي", tone: "gold", note: "الملف ما زال مسودة: قد يتغير موقعك قبل تفعيله، ويصلك إشعار حين يُعتمد." },
  active: { label: "نافذ", tone: "green", note: "الملف مفعّل بقرار إداري، وهذا موقعك المعتمد." },
  ended: { label: "منتهٍ", tone: "muted", note: "انتهى العمل في هذا الملف." },
};

/**
 * What an employee sees about his own field work: every post he holds in the season's operational
 * files — the tower or camp, the role and its job description, whom he reports to, who works beside
 * him (with their numbers), where he sleeps and whose pilgrims he serves — plus a timeline of where
 * he will be and when. Past seasons are kept below.
 */
export function MyFiles({ employee }: { employee: Employee }) {
  const files = useOpFiles();
  const seats = useMemo(() => seatsOf(employee.id, files), [employee.id, files]);
  const current = seats.filter((s) => s.file.season === CURRENT_SEASON);
  const past = seats.filter((s) => s.file.season < CURRENT_SEASON);
  const [showPast, setShowPast] = useState(false);

  return (
    <div className="space-y-6">
      {current.length === 0 ? (
        <Empty
          icon={<BriefcaseBusiness />}
          title={`لا مواقع لك في ملفات موسم ${CURRENT_SEASON} بعد`}
          text="حين تُسندك إدارة شؤون البعثة إلى برج أو مخيم أو فريق يظهر موقعك هنا مع مهامه وفريقه وأرقام التواصل."
        />
      ) : (
        <>
          <Timeline seats={current} />
          <div className="space-y-5">
            {current.map((s, i) => (
              <SeatCard key={`${s.file.id}-${s.role.code}-${s.inner?.id ?? s.outer?.id ?? "file"}`} seat={s} self={employee.id} index={i} />
            ))}
          </div>
        </>
      )}

      {past.length > 0 && (
        <Panel>
          <button onClick={() => setShowPast((v) => !v)} className="flex w-full items-center justify-between gap-3 text-right" aria-expanded={showPast}>
            <span className="font-display text-lg font-bold text-white">مواقعك في المواسم السابقة</span>
            <span className="flex items-center gap-1 text-xs font-bold text-gold">
              {past.length} <ChevronDown className={cn("size-4 transition", showPast && "rotate-180")} />
            </span>
          </button>
          {showPast && (
            <div className="mt-4 space-y-4">
              {past.map((s, i) => (
                <SeatCard key={`${s.file.id}-${s.role.code}-${s.inner?.id ?? s.outer?.id ?? "file"}`} seat={s} self={employee.id} index={i} compact />
              ))}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

/** Where he will be and when: one bar per file across the season's working window */
function Timeline({ seats }: { seats: Seat[] }) {
  const now = useNow(60_000);
  const places = usePlaces();
  const label = (x: Seat) => `${x.role.name} — ${x.inner ? places.get(x.inner.refId)?.name : x.outer ? places.get(x.outer.refId)?.name : (x.type.team ?? x.type.short)}`;
  const files = [...new Map(seats.map((s) => [s.file.id, s])).values()].sort((a, b) => a.file.startsOn.localeCompare(b.file.startsOn));
  const start = Math.min(...files.map((s) => at(s.file.startsOn)));
  const end = Math.max(...files.map((s) => at(s.file.endsOn)));
  const span = Math.max(DAY, end - start);
  const days = Math.ceil((start - now) / DAY);
  const today = now >= start && now <= end + DAY ? ((now - start) / span) * 100 : null;

  return (
    <Panel icon={<CalendarRange />} title={`أين أكون ومتى — موسم ${CURRENT_SEASON}`} action={days > 0 ? <Chip tone="gold">يبدأ عملك بعد {formatNumber(days)} يوماً</Chip> : now <= end + DAY ? <Chip tone="green">أنت في فترة العمل</Chip> : <Chip>انتهت فترة العمل</Chip>}>
      <div className="relative space-y-3">
        {today !== null && <div className="absolute inset-y-0 z-10 w-0.5 bg-gold" style={{ right: `${today}%` }} aria-label="اليوم" />}
        {files.map((s, i) => {
          const from = ((at(s.file.startsOn) - start) / span) * 100;
          const width = Math.max(3, ((at(s.file.endsOn) + DAY - at(s.file.startsOn)) / span) * 100);
          const mine = seats.filter((x) => x.file.id === s.file.id);
          return (
            <div key={s.file.id}>
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-xs">
                <span className="font-bold text-white">
                  {s.type.short}
                  <span className="font-normal text-white/70"> — {mine.map(label).join(" · ")}</span>
                </span>
                <span className="text-white/60">
                  {dateOf(s.file.startsOn)} ← {dateOf(s.file.endsOn)}
                </span>
              </div>
              <div className="relative h-9 rounded-xl bg-white/5 ring-1 ring-white/10">
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                  style={{ right: `${from}%`, width: `${Math.min(width, 100 - from)}%`, transformOrigin: "right" }}
                  className={cn("absolute inset-y-1 flex items-center overflow-hidden rounded-lg px-2 text-[11px] font-bold", s.type.inner.ref === "camps" ? "bg-gold text-ink" : "bg-green-light/80 text-white")}
                >
                  <span className="truncate">{Math.round((at(s.file.endsOn) - at(s.file.startsOn)) / DAY) + 1} يوماً</span>
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function SeatCard({ seat, self, index, compact }: { seat: Seat; self: string; index: number; compact?: boolean }) {
  const { file, type, role, assignment, outer, inner } = seat;
  const employees = useEmployees();
  const places = usePlaces();
  const refs = useRefs();
  const clusters = useClusters();
  const state = fileState(file);
  const who = (id: string) => employees.find((e) => e.id === id);
  const outerPlace = outer ? places.get(outer.refId) : undefined;
  const innerPlace = inner ? places.get(inner.refId) : undefined;
  const isCamp = type.inner.ref === "camps";
  const mapUrl = inner ? (refs.hotels.find((h) => h.id === inner.refId)?.mapUrl ?? refs.camps.find((c) => c.id === inner.refId)?.mapUrl) : undefined;
  const housing = type.housing ? places.get(inner?.refId ?? assignment.housingHotelId ?? "") : undefined;

  // Direct manager: the holder(s) of the role this one reports to, on the same node or the level above
  const managerRole = role.reportsTo ? roleIn(type, role.reportsTo) : undefined;
  const managerPool = !managerRole ? [] : managerRole.level === "file" ? file.members : managerRole.level === "outer" ? (outer?.members ?? []) : (inner?.members ?? []);
  const managers = managerRole ? managerPool.filter((m) => m.role === managerRole.code && m.employeeId !== self) : [];

  // Colleagues: everybody else on the same node
  const pool = inner ? inner.members : outer ? outer.members : file.members;
  const team = pool.filter((m) => m.employeeId !== self && !managers.some((x) => x.employeeId === m.employeeId));

  // What a sector head / centre supervisor oversees
  const overseen = role.level === "outer" && outer ? outer.children : [];
  const innerLead = type.roles.find((r) => r.level === "inner" && r.required);

  const where = innerPlace ?? outerPlace;
  const Icon = isCamp ? Tent : role.level === "file" ? UsersRound : HotelIcon;

  return (
    <Panel delay={Math.min(index, 4) * 0.06} className={cn(compact && "p-4 md:p-5")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", isCamp ? "bg-gold text-ink" : "bg-green-light/80 text-white")}>
            <Icon className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gold">
              {type.short} · موسم {file.season}
            </p>
            <p className="font-display text-2xl font-bold text-white">{role.name}</p>
            <p className="text-sm text-white/80">
              {where ? where.name : (type.team ?? type.short)}
              {outerPlace && innerPlace && <span className="text-white/60"> · {outerPlace.name}</span>}
              {role.level === "file" && <span className="text-white/60"> · يخدم {type.outer.plural} كلها</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Chip tone={STATE[state].tone}>{STATE[state].label}</Chip>
          {file.decisionNumber && <span className="text-[11px] text-white/55">القرار رقم {file.decisionNumber}</span>}
        </div>
      </div>

      {!compact && <p className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-xs leading-6 text-white/70 ring-1 ring-white/10">{STATE[state].note}</p>}

      <div className={cn("mt-4 grid gap-4", !compact && "lg:grid-cols-2")}>
        {/* The place */}
        <div className="space-y-3">
          <Info icon={<Clock />} label="فترة العمل">
            {dateOf(file.startsOn)} — {dateOf(file.endsOn)}
            <span className="block text-xs text-white/55">{type.endCondition}</span>
          </Info>
          {where && (
            <Info icon={<MapPin />} label={role.level === "outer" ? type.outer.name : isCamp ? "المخيم" : "البرج / الفندق"}>
              {where.name} — {where.sub}
              {where.capacity ? <span className="block text-xs text-white/55">الطاقة الاستيعابية {formatNumber(where.capacity)}</span> : null}
              {mapUrl && (
                <a href={mapUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-bold text-gold hover:underline">
                  فتح الموقع على الخريطة
                </a>
              )}
            </Info>
          )}
          {inner?.tent && <Info icon={<Tent />} label="الخيمة">{inner.tent}</Info>}
          {inner?.bodies && <Info icon={<FileText />} label="جهات مخصّصة في المخيم">{inner.bodies}</Info>}
          {housing && <Info icon={<BedDouble />} label="سكنك">{housing.name}</Info>}
          {inner && (inner.clusters.length > 0 || inner.pilgrims > 0) && (
            <Info icon={<UsersRound />} label={`حجاج ${isCamp ? "المخيم" : "البرج"}`}>
              {formatNumber(inner.pilgrims)} حاجاً
              {inner.clusters.length > 0 && <span className="block text-xs text-white/65">{inner.clusters.map((c) => clusters.find((x) => x.slug === c)?.name ?? c).join("، ")}</span>}
            </Info>
          )}
          {!compact && (
            <div>
              <p className="mb-1 text-xs font-bold text-gold">الوصف الوظيفي</p>
              <p className="text-sm leading-7 text-white/80">{role.description}</p>
            </div>
          )}
        </div>

        {/* The people */}
        <div className="space-y-3">
          {managerRole && (
            <People title={`مسؤولك المباشر — ${managerRole.name}`} ids={managers.map((m) => m.employeeId)} who={who} empty="لم يُسمَّ بعد" highlight />
          )}
          {managerRole && file.reportCadence !== "none" && (
            <p className="text-xs text-white/65">
              {CADENCE_LABEL[file.reportCadence]} ترفعه إلى {managerRole.name}.
            </p>
          )}
          {overseen.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold text-gold">
                {type.inner.plural} التي تشرف عليها ({overseen.length})
              </p>
              <ul className="space-y-1.5">
                {overseen.map((c) => {
                  const lead = innerLead ? c.members.find((m) => m.role === innerLead.code) : undefined;
                  const l = lead && who(lead.employeeId);
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10">
                      <span className="min-w-0">
                        <span className="block truncate font-bold text-white">{places.get(c.refId)?.name}</span>
                        <span className="block truncate text-[11px] text-white/60">
                          {formatNumber(c.pilgrims)} حاجاً · {c.members.length} من البعثة
                          {l ? ` · ${innerLead!.name}: ${fullName(l)}` : isCamp ? "" : " · بلا مشرف"}
                        </span>
                      </span>
                      {l && <Call e={l} />}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {!compact && <People title={role.level === "outer" ? `معك على ${type.outer.name}` : role.level === "file" ? `فريقك في ${type.team ?? "الملف"}` : `فريقك في ${isCamp ? "المخيم" : "البرج"}`} ids={team.map((m) => m.employeeId)} who={who} roleOf={(id) => roleIn(type, team.find((m) => m.employeeId === id)!.role).name} empty="لا أحد غيرك بعد" />}
        </div>
      </div>
    </Panel>
  );
}

function Info({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-white/10 text-gold [&_svg]:size-4">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-gold/90">{label}</p>
        <div className="text-sm text-white">{children}</div>
      </div>
    </div>
  );
}

function Call({ e }: { e: Employee }) {
  const number = e.phoneSa ?? e.phoneSy;
  return (
    <a href={`tel:${number.replace(/\s/g, "")}`} className="flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-gold hover:text-ink" dir="ltr" title={`اتصال بـ ${fullName(e)}`}>
      <Phone className="size-3" /> {number}
    </a>
  );
}

function People({ title, ids, who, roleOf, empty, highlight }: { title: string; ids: string[]; who: (id: string) => Employee | undefined; roleOf?: (id: string) => string; empty: string; highlight?: boolean }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-gold">
        <UserRound className="size-3.5" /> {title}
      </p>
      {ids.length === 0 ? (
        <p className={cn("rounded-xl px-3 py-2 text-sm ring-1", highlight ? "bg-maroon/25 text-[#ffc9d8] ring-maroon/50" : "bg-white/5 text-white/55 ring-white/10")}>{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {ids.map((id) => {
            const e = who(id);
            if (!e) return null;
            return (
              <li key={id} className={cn("flex items-center gap-2.5 rounded-xl px-3 py-2 ring-1", highlight ? "bg-gold/10 ring-gold/30" : "bg-white/5 ring-white/10")}>
                <Avatar e={e} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-white">{fullName(e)}</span>
                  <span className="block truncate text-[11px] text-white/60">
                    {roleOf ? `${roleOf(id)} · ` : ""}
                    {e.jobTitle}
                  </span>
                </span>
                <Call e={e} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
