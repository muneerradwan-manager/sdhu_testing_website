"use client";

import { AnimatePresence, motion } from "motion/react";
import { Camera, CheckCircle2, Clock, HeartPulse, MapPin, MessageSquareWarning, Send, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, SpeakButton, StarRating, useToast } from "@/components/ui/widgets";
import { PLACES } from "@/lib/journey";
import { ageOf, fullName } from "@/lib/registry";
import { actions, useStore, type Ticket, type TicketKind } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Choice } from "../../apply/_components/ui";
import { WHERE, mealsFor, type Meal } from "../_data";
import { DIET_NEEDS, type SeasonCtx } from "./ctx";
import { TicketTimeline, useMyTickets } from "./tickets";

export const mealWord = (m: Meal) => (m.name.startsWith("وجبة") ? m.name : `وجبة ${m.name}`);

export const MEAL_ASSIGNEE = "وسام خوري — مشرف البرج (ب)";

export function logPilgrimSeason(ctx: SeasonCtx, action: string, detail?: string) {
  actions.logEvent({ actor: fullName(ctx.self.person), role: "حاج", action, target: `طلب ${ctx.app.number}`, detail });
}

export function mealLocation(ctx: SeasonCtx, meal?: Meal) {
  switch (ctx.where) {
    case "makkah":
      return `${PLACES.makkahHotel.name} — ${PLACES.makkahHotel.tower} — ${meal ? meal.place : `الطابق ${PLACES.makkahHotel.floor} — الغرفة ${ctx.self.room}`}`;
    case "madinah":
      return `${PLACES.madinahHotel.name} — ${meal ? meal.place : `الغرفة ${ctx.self.madinahRoom}`}`;
    case "mina":
      return `منى — مخيم 42 — المربع 7 — الخيمة ${ctx.self.tent}`;
    case "arafat":
      return `عرفات — مخيم التكتل — الخيمة ${ctx.self.tent}`;
    case "muzdalifah":
      return "مزدلفة — نقطة المجموعة 27";
    default:
      return WHERE[ctx.where].label;
  }
}

function specialRoom(ctx: SeasonCtx, id: string) {
  const a = ctx.assignments.find((x) => x.person.id === id)!;
  if (ctx.where === "makkah") return `الغرفة ${a.room}`;
  if (ctx.where === "madinah") return `الغرفة ${a.madinahRoom}`;
  if (ctx.where === "mina" || ctx.where === "arafat") return `الخيمة ${a.tent}`;
  return "مكان المجموعة";
}

export function MealsSection({ ctx }: { ctx: SeasonCtx }) {
  const toast = useToast();
  const meals = mealsFor(ctx.where, ctx.day.i);
  const [complain, setComplain] = useState<Meal | null>(null);
  const mine = useMyTickets(ctx.sessionId);
  const healthResolved = mine.some((t) => t.kind === "health" && t.status === "resolved");

  return (
    <section id="meals" className="scroll-mt-40">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 font-display text-3xl font-bold text-green-dark">
          <span className="grid size-12 place-items-center rounded-2xl bg-green-dark text-gold"><UtensilsCrossed className="size-6" /></span>
          وجبات اليوم — {ctx.day.hijri}
        </h2>
        <SpeakButton text={`وجبات اليوم. ${meals.map((m) => `${m.name} ${m.time}: ${m.menu}`).join(". ")}`} label="استمع إلى القائمة" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {meals.map((m, i) => {
          const key = `meal-${ctx.day.i}-${m.key}`;
          const rating = ctx.ratings[key] ?? 0;
          const past = m.start <= ctx.moment.time;
          return (
            <motion.div key={`${ctx.day.i}-${ctx.where}-${m.key}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="flex flex-col overflow-hidden rounded-[1.75rem] border border-gold/40 bg-white">
              <div className={cn("flex items-center justify-between px-5 py-3", past ? "bg-sand" : "bg-green-dark text-white")}>
                <span className="font-display text-xl font-bold">{m.name}</span>
                <span className={cn("flex items-center gap-1 font-mono text-sm", past ? "text-hint" : "text-gold")}>
                  <Clock className="size-4" /> {m.time}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-lg leading-8">{m.menu}</p>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-soft"><MapPin className="size-4 text-gold-dark" /> {m.place}</p>
                <div className="mt-auto pt-4">
                  {past ? (
                    <>
                      <p className="text-sm font-bold text-gold-dark">كيف كانت {mealWord(m)}؟</p>
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                        <StarRating
                          value={rating}
                          onChange={(v) => {
                            actions.setInSeason(ctx.sessionId, { ratings: { ...ctx.ratings, [key]: v } });
                            logPilgrimSeason(ctx, `تقييم ${mealWord(m)}`, `${ctx.day.hijri} — ${v} من 5`);
                            toast({ title: "شكراً لتقييمك", body: "يظهر في لوحة الجودة حسب الفندق والوجبة.", icon: "⭐", tone: "gold" });
                          }}
                        />
                        <button type="button" onClick={() => setComplain(m)} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-maroon ring-1 ring-maroon/30 transition hover:bg-maroon/5">
                          <MessageSquareWarning className="size-4" /> شكوى
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="rounded-2xl bg-gold/15 p-3 text-sm font-semibold text-maroon">تصلك رسالة قبل الوجبة بـ 15 دقيقة.</p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Special meals delivered to the room / tent */}
      {ctx.special.length > 0 && ["makkah", "madinah", "mina", "arafat"].includes(ctx.where) && (
        <div className="mt-4 space-y-3">
          {ctx.special.map((m) => {
            const reason = m.needs.find((n) => DIET_NEEDS.includes(n)) ?? (ageOf(m.person) >= 69 ? "كبار السن" : "وجبة خاصة");
            return (
              <motion.div key={m.person.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-wrap items-center gap-4 rounded-[1.75rem] border-2 border-dashed border-green-light/50 bg-green-light/5 p-5">
                <span className="grid size-14 place-items-center rounded-2xl bg-white text-3xl shadow-sm">🍱</span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold text-green-dark">
                    وجبة {m.person.firstName} الخاصة ({reason}) — تُسلَّم إلى {specialRoom(ctx, m.person.id)}
                  </p>
                  <p className="leading-7 text-ink-soft">أرز بني، دجاج مشوي، سلطة دون صلصة، فاكهة بديلة عن الحلوى — الساعة 13:15 و19:15</p>
                  {healthResolved && (
                    <p className="mt-1 flex items-center gap-1.5 font-semibold text-maroon">
                      <HeartPulse className="size-4" /> أُضيفت وجبة خفيفة الساعة 04:30 بعد اعتماد د. ليلى شمس
                    </p>
                  )}
                </div>
                {ctx.moment.time >= "13:15" && (
                  <span className="flex items-center gap-1.5 rounded-full bg-green-light px-3 py-1.5 text-sm font-bold text-white">
                    <CheckCircle2 className="size-4" /> وصلت إلى {specialRoom(ctx, m.person.id)}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
      <p className="mt-3 text-sm text-hint">ملاحظة غذائية: مياه إضافية عند مكتب المجموعة. تُجمع تقييمات الوجبات حسب الفندق والبرج والوجبة ومقدّم الخدمة.</p>

      <ComplaintModal ctx={ctx} open={!!complain} meal={complain ?? undefined} onClose={() => setComplain(null)} />
    </section>
  );
}

const COMPLAINT_KINDS: { kind: TicketKind; label: string; icon: string; assignee: string; severity: Ticket["severity"]; sla: string }[] = [
  { kind: "meal", label: "وجبة", icon: "🍽️", assignee: MEAL_ASSIGNEE, severity: "medium", sla: "مشرف البرج — خلال ساعتين" },
  { kind: "room", label: "الغرفة أو النظافة", icon: "🛏️", assignee: MEAL_ASSIGNEE, severity: "low", sla: "مشرف البرج — خلال ساعتين" },
  { kind: "transport", label: "نقل أو تأخر حافلة", icon: "🚌", assignee: "هيثم زيدان — فريق المواصلات", severity: "medium", sla: "فريق المواصلات — خلال 30 دقيقة" },
  { kind: "complaint", label: "المجموعة أو المعاملة", icon: "📝", assignee: "الحاج عبد الرحمن العلي — رئيس التكتل", severity: "medium", sla: "رئيس التكتل — خلال 4 ساعات" },
];

/** Complaint pre-filled from where the pilgrim is (and from the meal, when opened from one) */
export function ComplaintModal({ ctx, open, onClose, meal }: { ctx: SeasonCtx; open: boolean; onClose: () => void; meal?: Meal }) {
  return (
    <Modal open={open} onClose={onClose} className="max-w-2xl">
      {open && <ComplaintForm key={meal?.key ?? "general"} ctx={ctx} meal={meal} onClose={onClose} />}
    </Modal>
  );
}

export function ComplaintForm({ ctx, meal, onClose }: { ctx: SeasonCtx; meal?: Meal; onClose: () => void }) {
  const toast = useToast();
  const [kind, setKind] = useState<TicketKind | null>(meal ? "meal" : null);
  const [photo, setPhoto] = useState(false);
  const [text, setText] = useState(meal ? `وصلت ${mealWord(meal)} باردة والأرز غير ناضج.` : "");
  const [ticketId, setTicketId] = useState<string | null>(null);
  const ticket = useStore((s) => (ticketId ? s.tickets.find((t) => t.id === ticketId) : undefined));
  const route = COMPLAINT_KINDS.find((k) => k.kind === kind);

  if (ticket) {
    return (
      <div>
        <p className="mb-3 font-display text-2xl font-bold text-green-dark">وصلت شكواك — تابعها هنا</p>
        <TicketTimeline ticket={ticket} now={ctx.now} />
        <Button size="lg" variant="outline" className="mt-4 w-full" onClick={onClose}>
          إغلاق — تبقى في «تذاكري»
        </Button>
      </div>
    );
  }

  return (
    <div>
      <p className="flex items-center gap-2 font-display text-2xl font-bold text-maroon">
        <MessageSquareWarning className="size-7" /> {meal ? `شكوى عن ${mealWord(meal)}` : "تقديم شكوى"}
      </p>
      {!meal && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {COMPLAINT_KINDS.map((k, i) => (
            <Choice key={k.kind} index={i} icon={k.icon} label={k.label} description={k.sla} selected={kind === k.kind} onClick={() => setKind(k.kind)} />
          ))}
        </div>
      )}
      <AnimatePresence>
        {route && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
            <p className="mt-4 text-sm font-bold text-gold-dark">عُبّئت هذه البيانات تلقائياً:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                ["المكان", mealLocation(ctx, meal)],
                ...(meal ? [["الوجبة", `${meal.name} ${meal.time}`]] : []),
                ["اليوم والوقت", `${ctx.day.hijri} ${meal ? meal.time.split(" ")[0] : ctx.moment.time}`],
                ["يستلمها", route.assignee],
              ].map(([k, v]) => (
                <span key={k} className="rounded-2xl bg-sand px-3 py-2 text-sm">
                  <span className="text-hint">{k}: </span>
                  <b>{v}</b>
                </span>
              ))}
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="اكتب سطرين عن المشكلة" className="mt-4 w-full rounded-2xl border-2 border-gold/50 p-4 text-lg leading-8 outline-none focus:border-green-light" />
            <button type="button" onClick={() => setPhoto((p) => !p)} className={cn("mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-3 font-bold transition", photo ? "border-green-light bg-green-light/10 text-green" : "border-gold-dark text-gold-dark hover:bg-gold/10")}>
              {photo ? <CheckCircle2 className="size-5" /> : <Camera className="size-5" />} {photo ? "أُرفقت صورة (تجريبية)" : "التقط صورة"}
            </button>
            <Button
              size="xl"
              className="mt-4 w-full"
              disabled={text.trim().length < 4}
              onClick={() => {
                const id = actions.addTicket({
                  applicantId: ctx.sessionId,
                  name: fullName(ctx.self.person),
                  kind: route.kind,
                  severity: route.severity,
                  location: mealLocation(ctx, meal),
                  text: `${meal ? `${meal.name} — ` : ""}${ctx.day.hijri}: ${text.trim()}${photo ? " (مع صورة)" : ""}`,
                  assignee: route.assignee,
                });
                logPilgrimSeason(ctx, `تقديم شكوى: ${route.label}`, `تذكرة ${id}`);
                toast({ title: `فُتحت التذكرة رقم ${id}`, body: `المستلم: ${route.assignee} — نسخة لرئيس المجموعة.`, icon: "📨", tone: "info" });
                setTicketId(id);
              }}
            >
              <Send className="size-5" /> إرسال الشكوى
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
