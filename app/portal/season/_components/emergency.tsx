"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertOctagon, ArrowRight, Ambulance, CheckCircle2, HeartPulse, Loader2, MapPin, Radio, Siren, Stethoscope, UserRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, SpeakButton, useToast } from "@/components/ui/widgets";
import { ageOf, fullName, relationLabel } from "@/lib/registry";
import type { Member } from "@/lib/rules";
import { actions, useStore, type Ticket, type TicketKind } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Choice } from "../../apply/_components/ui";
import type { SeasonCtx } from "./ctx";
import { ComplaintForm, logPilgrimSeason, mealLocation } from "./meals";
import { SIM, TicketTimeline } from "./tickets";

type EmergencyType = { kind: TicketKind; label: string; icon: string; route: string; sla: string; severity: Ticket["severity"]; assignee: string };

const TYPES: EmergencyType[] = [
  { kind: "health", label: "حالة صحية", icon: "🩺", route: "الفريق الطبي + رئيس المجموعة + غرفة العمليات", sla: "خلال 10 دقائق", severity: "high", assignee: "د. ليلى شمس — الفريق الطبي" },
  { kind: "missing", label: "حاج مفقود", icon: "🧭", route: "غرفة العمليات مباشرة", sla: "فوري", severity: "critical", assignee: "فادي سلوم — غرفة العمليات" },
  { kind: "transport", label: "نقل أو تأخر حافلة", icon: "🚌", route: "فريق المواصلات", sla: "خلال 30 دقيقة", severity: "medium", assignee: "هيثم زيدان — فريق المواصلات" },
  { kind: "meal", label: "شكوى وجبة أو غرفة", icon: "🍽️", route: "مشرف البرج", sla: "خلال ساعتين", severity: "medium", assignee: "وسام خوري — مشرف البرج (ب)" },
];

function locationFor(ctx: SeasonCtx, m: Member) {
  const a = ctx.assignments.find((x) => x.person.id === m.person.id) ?? ctx.self;
  switch (ctx.where) {
    case "makkah":
      return `أبراج النور — البرج (ب) — الطابق 12 — الغرفة ${a.room}`;
    case "madinah":
      return `روضة طيبة — الطابق 8 — الغرفة ${a.madinahRoom}`;
    case "mina":
      return `منى — مخيم 42 — المربع 7 — الخيمة ${a.tent}`;
    case "arafat":
      return `عرفات — مخيم التكتل — الخيمة ${a.tent}`;
    default:
      return mealLocation(ctx);
  }
}

export function EmergencyModal({ ctx, open, onClose }: { ctx: SeasonCtx; open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} className="max-w-2xl">
      {open && <EmergencyFlow ctx={ctx} onClose={onClose} />}
    </Modal>
  );
}

function EmergencyFlow({ ctx, onClose }: { ctx: SeasonCtx; onClose: () => void }) {
  const toast = useToast();
  const [type, setType] = useState<EmergencyType | null>(null);
  const [who, setWho] = useState<Member | null>(null);
  const [complaint, setComplaint] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const ticket = useStore((s) => (ticketId ? s.tickets.find((t) => t.id === ticketId) : undefined));

  if (complaint) return <ComplaintForm ctx={ctx} onClose={onClose} />;
  if (ticket) return <LiveEmergency ctx={ctx} ticket={ticket} onClose={onClose} />;

  const members = [...ctx.app.members].sort((a, b) => ageOf(b.person) - ageOf(a.person));

  const send = () => {
    if (!type) return;
    const person = who ?? ctx.app.members.find((m) => m.person.id === ctx.self.person.id)!;
    const forOther = person.person.id !== ctx.self.person.id;
    const id = actions.addTicket({
      applicantId: ctx.sessionId,
      name: fullName(person.person),
      kind: type.kind,
      severity: type.severity,
      location: locationFor(ctx, person),
      text:
        type.kind === "health"
          ? `${forOther ? `${ctx.companion?.person.id === ctx.self.person.id && ctx.elderly?.person.id === person.person.id ? "لحاج أرافقه" : "لفرد من عائلتي"}: ${fullName(person.person)} (${ageOf(person.person)} عاماً)` : "لنفسي"} — ${person.needs.length ? `احتياجات: ${person.needs.join("، ")} — ` : ""}${person.needs.includes("سكري") ? "دوار وهبوط سكر محتمل" : "دوار وتعب شديد"}`
          : type.kind === "missing"
            ? `لم يعد ${fullName(person.person)} إلى نقطة التجمّع — السوار NR27-${person.person.id.slice(-4)}`
            : `${type.label} — ${ctx.day.hijri} ${ctx.moment.time}`,
      assignee: type.assignee,
    });
    logPilgrimSeason(ctx, `بلاغ طوارئ: ${type.label}`, `تذكرة ${id} — ${fullName(person.person)}`);
    toast({ title: `أُرسل البلاغ رقم ${id}`, body: type.route, icon: "🚨", tone: "warning" });
    setTicketId(id);
  };

  return (
    <div>
      <p className="flex items-center gap-2 font-display text-3xl font-bold text-maroon">
        <AlertOctagon className="size-8" /> بلاغ طوارئ
      </p>
      <SpeakButton text="بلاغ طوارئ. اختر نوع الحالة، ويصل البلاغ فوراً إلى الجهات المختصة بحسب موقعك." className="mt-2" />
      <AnimatePresence mode="wait">
        {!type ? (
          <motion.div key="type" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mt-5 grid gap-3">
            {TYPES.map((t, i) => (
              <Choice
                key={t.kind}
                index={i}
                icon={t.icon}
                tone="danger"
                label={t.label}
                description={`${t.route} — ${t.sla}`}
                onClick={() => {
                  if (t.kind === "meal") setComplaint(true);
                  else setType(t);
                }}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div key="who" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="mt-5">
            <button type="button" onClick={() => { setType(null); setWho(null); }} className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-ink-soft hover:text-ink">
              <ArrowRight className="size-4" /> تغيير النوع
            </button>
            <p className="font-display text-2xl font-bold text-green-dark">{type.kind === "missing" ? "من المفقود؟" : "لمن الحالة؟"}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {members.map((m, i) => {
                const self = m.person.id === ctx.self.person.id;
                const escorted = ctx.companion?.person.id === ctx.self.person.id && ctx.elderly?.person.id === m.person.id;
                return (
                  <Choice
                    key={m.person.id}
                    index={i}
                    icon={<span className="font-display text-2xl font-bold text-green-dark">{m.person.firstName[0]}</span>}
                    label={self ? "لنفسي" : m.person.firstName}
                    description={self ? fullName(m.person) : `${escorted ? "حاج أرافقه — " : ""}${relationLabel(m.relation, m.person.gender)} — ${ageOf(m.person)} عاماً${m.needs.length ? ` — ${m.needs.join("، ")}` : ""}`}
                    selected={who?.person.id === m.person.id}
                    onClick={() => setWho(m)}
                  />
                );
              })}
            </div>
            {who && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl bg-sand p-4">
                <p className="flex items-center gap-2 font-semibold"><MapPin className="size-4 text-maroon" /> الموقع يُرسل تلقائياً: {locationFor(ctx, who)}</p>
                <p className="mt-1 text-sm text-ink-soft">الخطورة: {type.severity === "critical" ? "حرجة" : type.severity === "high" ? "عالية" : "متوسطة"} — يصل إلى: {type.route}</p>
              </motion.div>
            )}
            <Button size="xl" variant="maroon" className="mt-5 w-full" disabled={!who} onClick={send}>
              <Siren className="size-6" /> أرسل البلاغ الآن
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LiveEmergency({ ctx, ticket, onClose }: { ctx: SeasonCtx; ticket: Ticket; onClose: () => void }) {
  const elapsed = Math.max(0, Math.floor((ctx.now - ticket.at) / 1000));
  const frozen = ticket.status === "resolved" ? Math.floor(((ticket.updates.at(-1)?.at ?? ctx.now) - ticket.at) / 1000) : elapsed;
  const health = ticket.kind === "health";
  const n = ticket.updates.length;
  const arrived = ticket.status === "resolved" || ticket.updates.some((u) => u.text.includes("وصل"));
  const onTheWay = n >= 2 || ticket.updates.some((u) => !u.by.endsWith(SIM));
  const lastUpdate = ticket.updates.at(-1)?.at ?? ticket.at;
  const travel = arrived ? 1 : onTheWay ? Math.min(0.92, (ctx.now - lastUpdate) / 13_000) : 0.04;

  const parties = health
    ? [
        { who: "د. ليلى شمس", role: "عيادة الفندق — الفريق الطبي", icon: <Stethoscope className="size-5" /> },
        { who: "أحمد سليمان", role: "رئيس المجموعة 27", icon: <UserRound className="size-5" /> },
        { who: "فادي سلوم", role: "غرفة العمليات", icon: <Radio className="size-5" /> },
      ]
    : [{ who: ticket.assignee, role: "المستلم", icon: <Radio className="size-5" /> }];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-display text-2xl font-bold text-maroon">
          <span className="relative flex size-3.5">
            {ticket.status !== "resolved" && <span className="absolute inset-0 animate-ping rounded-full bg-maroon" />}
            <span className={cn("relative size-3.5 rounded-full", ticket.status === "resolved" ? "bg-green-light" : "bg-maroon")} />
          </span>
          {ticket.status === "resolved" ? "أُغلق البلاغ — الحالة مستقرة" : "البلاغ قيد الاستجابة"}
        </p>
        <div className="rounded-2xl bg-ink px-4 py-2 text-center text-white">
          <p className="font-mono text-3xl font-bold tabular-nums text-gold">
            {String(Math.floor(frozen / 60)).padStart(2, "0")}:{String(frozen % 60).padStart(2, "0")}
          </p>
          <p className="text-xs text-white/60">زمن الاستجابة</p>
        </div>
      </div>

      {/* Routed to */}
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {parties.map((p, i) => (
          <motion.div key={p.who} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.35 }} className="flex items-center gap-2 rounded-2xl bg-sand p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-green-dark">{p.icon}</span>
            <span className="min-w-0">
              <span className="block truncate font-bold">{p.who}</span>
              <span className="block truncate text-xs text-ink-soft">{p.role}</span>
            </span>
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6 + i * 0.35, type: "spring" }} className="mr-auto text-green-light">
              <CheckCircle2 className="size-5" />
            </motion.span>
          </motion.div>
        ))}
      </div>

      {/* Responder on the way */}
      {(health || ticket.kind === "missing") && (
        <div className="mt-5 rounded-3xl border border-gold/40 bg-white p-5">
          <p className="flex items-center gap-2 text-lg font-bold text-green-dark">
            {arrived ? <HeartPulse className="size-5 text-green-light" /> : <Loader2 className="size-5 animate-spin" />}
            {health ? (arrived ? "وصلت الطبيبة إلى الموقع" : onTheWay ? "الطبيبة في الطريق إليكم" : "جارٍ توجيه أقرب فريق طبي...") : arrived ? "تم العثور عليه" : "نقاط الإرشاد تبحث الآن"}
          </p>
          <div className="relative mt-5 h-14">
            <div className="absolute inset-x-6 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gold-light" />
            <motion.div className="absolute right-6 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-green-light" animate={{ width: `calc((100% - 3rem) * ${travel})` }} transition={{ duration: 0.6 }} />
            <span className="absolute right-0 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-green-dark text-white shadow-lg">
              <Ambulance className="size-6" />
            </span>
            <motion.span className="absolute top-1/2 grid size-10 -translate-y-1/2 translate-x-1/2 place-items-center rounded-full bg-gold text-ink shadow-lg" animate={{ right: `calc(1.5rem + (100% - 3rem) * ${travel})` }} transition={{ duration: 0.6 }}>
              <Stethoscope className="size-5" />
            </motion.span>
            <span className={cn("absolute left-0 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full text-white shadow-lg transition-colors", arrived ? "bg-green-light" : "bg-maroon")}>
              <MapPin className="size-6" />
            </span>
          </div>
          <div className="mt-1 flex justify-between text-sm text-ink-soft">
            <span>العيادة — الطابق الأرضي</span>
            <span>{ticket.location}</span>
          </div>
        </div>
      )}

      <div className="mt-5">
        <TicketTimeline ticket={ticket} now={ctx.now} compact />
      </div>
      <Button size="lg" variant="outline" className="mt-4 w-full" onClick={onClose}>
        إغلاق النافذة — يبقى البلاغ في «بلاغاتي»
      </Button>
    </div>
  );
}
