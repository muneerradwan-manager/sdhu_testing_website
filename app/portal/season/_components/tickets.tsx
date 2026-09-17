"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Circle, Clock, Loader2, MapPin, RotateCcw, ThumbsDown, ThumbsUp, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { StarRating, useToast } from "@/components/ui/widgets";
import { actions, useStore, type Ticket, type TicketKind } from "@/lib/store";
import { cn } from "@/lib/utils";

export const KIND_LABEL: Record<TicketKind, string> = {
  health: "حالة صحية",
  missing: "حاج مفقود",
  transport: "نقل",
  meal: "وجبة",
  room: "غرفة",
  lost: "مفقودات",
  complaint: "شكوى / اعتراض",
};

const SEVERITY: Record<Ticket["severity"], { label: string; cls: string }> = {
  low: { label: "منخفضة", cls: "bg-sand text-ink-soft" },
  medium: { label: "متوسطة", cls: "bg-gold/35 text-maroon" },
  high: { label: "عالية", cls: "bg-maroon/15 text-maroon" },
  critical: { label: "حرجة", cls: "bg-maroon text-white" },
};

const STATUS: Record<Ticket["status"], string> = { open: "مفتوحة", in_progress: "قيد المعالجة", resolved: "تم الحل" };

export const SIM = "(محاكاة)";
const isSim = (by: string) => by.endsWith(SIM);

/** What the "staff" says when nobody from the operations room touches a ticket (demo fallback) */
const SCRIPTS: Partial<Record<TicketKind, { after: number; by?: string; text: string; status: Ticket["status"] }[]>> = {
  meal: [
    { after: 15_000, text: "تم التحقق. المشكلة في دفعة الأرز الثانية. جارٍ استبدال الوجبة للطابق 12.", status: "in_progress" },
    { after: 32_000, text: "تم الحل — وجبة بديلة ساخنة في طريقها إليك.", status: "resolved" },
  ],
  health: [
    { after: 4_000, by: "فادي سلوم — غرفة العمليات", text: "استلمنا البلاغ. أُبلغ الفريق الطبي ورئيس المجموعة.", status: "in_progress" },
    { after: 11_000, text: "في الطريق إلى موقعك الآن — ابقوا في المكان.", status: "in_progress" },
    { after: 24_000, text: "وصلت الطبيبة وتم التعامل مع الحالة. يُنصح بوجبة خفيفة إضافية قبل الفجر.", status: "in_progress" },
    { after: 34_000, by: "فادي سلوم — غرفة العمليات", text: "تم إغلاق بلاغ الطوارئ. الحالة مستقرة.", status: "resolved" },
  ],
  lost: [
    { after: 15_000, text: "تم العثور على الحقيبة — سلّمها السائق إلى مكتب المواصلات.", status: "in_progress" },
    { after: 30_000, text: "تم التسليم في مكتب المجموعة 1230. تأكد من محتوياتها.", status: "resolved" },
  ],
  complaint: [
    { after: 15_000, text: "استلمنا اعتراضك، ونراجع الوثائق من جديد.", status: "in_progress" },
    { after: 40_000, text: "انتهت مراجعة الاعتراض. سيصلك القرار النهائي برسالة خلال يومي عمل.", status: "resolved" },
  ],
};
const GENERIC = [
  { after: 15_000, by: undefined, text: "استلمنا البلاغ ونعمل عليه الآن.", status: "in_progress" as const },
  { after: 35_000, by: undefined, text: "تمت معالجة البلاغ.", status: "resolved" as const },
];

const REOPEN = [
  { after: 8_000, by: undefined, text: "نعتذر عن ذلك. أتابع المشكلة بنفسي الآن وأتواصل معك.", status: "in_progress" as const },
  { after: 22_000, by: undefined, text: "تمت المتابعة المباشرة وحُلّت المشكلة.", status: "resolved" as const },
];

export const PILGRIM = "الحاج";

export function useMyTickets(sessionId: string) {
  const tickets = useStore((s) => s.tickets);
  return useMemo(() => tickets.filter((t) => t.applicantId === sessionId), [tickets, sessionId]);
}

/**
 * Demo fallback: a ticket that no staff member has touched gets simulated updates from its assignee.
 * The moment a real update arrives from the operations room, the simulation for that ticket stops.
 */
export function useTicketFallback(tickets: Ticket[]) {
  useEffect(() => {
    const t0 = Date.now();
    let best: { at: number; run: () => void } | null = null;
    for (const t of tickets) {
      if (t.status === "resolved") continue;
      const staffTouched = t.updates.some((u) => !isSim(u.by) && u.by !== PILGRIM) || (t.status !== "open" && t.updates.length === 0);
      if (staffTouched) continue;
      // After «لا، لم تُحل» the assignee follows up again
      const reopenedIdx = t.updates.map((u) => u.by).lastIndexOf(PILGRIM);
      const script = reopenedIdx >= 0 ? REOPEN : (SCRIPTS[t.kind] ?? GENERIC);
      const origin = reopenedIdx >= 0 ? t.updates[reopenedIdx].at : t.at;
      const step = script[reopenedIdx >= 0 ? t.updates.length - reopenedIdx - 1 : t.updates.length];
      if (!step) continue;
      const at = origin + step.after;
      if (!best || at < best.at) {
        best = {
          at,
          run: () => {
            const by = `${step.by ?? t.assignee} ${SIM}`;
            actions.updateTicket(t.id, { status: step.status }, { by, text: step.text });
            actions.logEvent({ actor: by, role: "غرفة العمليات", action: step.status === "resolved" ? "إغلاق تذكرة" : "تحديث تذكرة", target: `تذكرة ${t.id}`, detail: step.text });
          },
        };
      }
    }
    if (!best) return;
    const timer = setTimeout(best.run, Math.max(0, best.at - t0));
    return () => clearTimeout(timer);
  }, [tickets]);
}

const time = (at: number) => new Intl.DateTimeFormat("ar-SY-u-nu-latn", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(at);

/** Live ticket card: status, timeline of updates (from staff or simulation), and «هل حُلّت مشكلتك؟» */
export function TicketTimeline({ ticket, now, steps, compact }: { ticket: Ticket; now: number; steps?: string[]; compact?: boolean }) {
  const toast = useToast();
  const [happy, setHappy] = useState<boolean | null>(null);
  const sev = SEVERITY[ticket.severity];
  const elapsed = Math.max(0, Math.floor(((ticket.status === "resolved" ? ticket.updates.at(-1)?.at ?? now : now) - ticket.at) / 1000));
  const stepIdx = ticket.status === "open" ? 0 : ticket.status === "in_progress" ? 1 : ticket.rating ? 3 : 2;
  const labels = steps ?? ["مفتوحة", "قيد المعالجة", "تم الحل", "مغلقة"];

  return (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-3xl border border-gold/40 bg-white">
      <div className={cn("flex flex-wrap items-center justify-between gap-2 px-5 py-3", ticket.status === "resolved" ? "bg-green-light/10" : "bg-sand")}>
        <p className="font-bold">
          تذكرة رقم <span className="font-mono">{ticket.id}</span> — {KIND_LABEL[ticket.kind]}
        </p>
        <div className="flex items-center gap-2 text-sm">
          <span className={cn("rounded-full px-2.5 py-1 font-bold", sev.cls)}>الخطورة: {sev.label}</span>
          <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 font-bold", ticket.status === "resolved" ? "bg-green-light text-white" : "bg-white text-green-dark")}>
            {ticket.status !== "resolved" && <Loader2 className="size-3.5 animate-spin" />}
            {STATUS[ticket.status]}
          </span>
        </div>
      </div>

      <div className="p-5">
        {/* Stepper */}
        <ol className="relative grid grid-cols-4 gap-1">
          <div className="absolute right-[12.5%] left-[12.5%] top-4 h-1 rounded-full bg-gold-light" />
          <motion.div className="absolute right-[12.5%] top-4 h-1 rounded-full bg-green-light" animate={{ width: `${(stepIdx / 3) * 75}%` }} transition={{ duration: 0.7 }} />
          {labels.map((l, i) => (
            <li key={l} className="relative flex flex-col items-center text-center">
              <span className={cn("relative z-10 grid size-9 place-items-center rounded-full border-4 border-white transition-colors duration-500", i <= stepIdx ? "bg-green-light text-white" : "bg-sand text-hint")}>
                {i < stepIdx || (i === 3 && stepIdx === 3) ? <CheckCircle2 className="size-4" /> : i === stepIdx ? <span className="size-2.5 animate-pulse rounded-full bg-white" /> : <Circle className="size-3" />}
              </span>
              <span className={cn("mt-1 text-xs font-bold md:text-sm", i <= stepIdx ? "text-green-dark" : "text-hint")}>{l}</span>
            </li>
          ))}
        </ol>

        {!compact && (
          <div className="mt-4 grid gap-2 text-sm text-ink-soft sm:grid-cols-2">
            <p className="flex items-center gap-1.5"><MapPin className="size-4 text-gold-dark" /> {ticket.location}</p>
            <p className="flex items-center gap-1.5"><UserRound className="size-4 text-gold-dark" /> المستلم: {ticket.assignee}</p>
          </div>
        )}
        <p className="mt-3 flex items-center gap-2 text-sm font-bold text-green-dark">
          <Clock className="size-4" /> {ticket.status === "resolved" ? "زمن المعالجة" : "منذ فتح البلاغ"}: {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
        </p>

        {/* Timeline */}
        <ol className="mt-4 space-y-3 border-r-2 border-gold-light pr-5">
          <li className="relative">
            <span className="absolute -right-[27px] top-1.5 size-3 rounded-full bg-gold-dark ring-4 ring-white" />
            <p className="text-xs text-hint">{time(ticket.at)} — أنت</p>
            <p className="leading-7">{ticket.text}</p>
          </li>
          <AnimatePresence initial={false}>
            {ticket.updates.map((u, i) => (
              <motion.li key={`${u.at}-${i}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="relative">
                <span className="absolute -right-[27px] top-1.5 size-3 rounded-full bg-green-light ring-4 ring-white" />
                <p className="text-xs text-hint">
                  {time(u.at)} — <b className="text-green">{u.by.replace(` ${SIM}`, "")}</b>
                </p>
                <p className="leading-7">{u.text}</p>
              </motion.li>
            ))}
          </AnimatePresence>
          {ticket.status !== "resolved" && (
            <li className="relative flex items-center gap-1 text-sm text-hint">
              <span className="absolute -right-[27px] top-1.5 size-3 animate-ping rounded-full bg-gold" />
              بانتظار التحديث التالي
              {[0, 1, 2].map((j) => (
                <motion.span key={j} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.2, delay: j * 0.2 }}>
                  •
                </motion.span>
              ))}
            </li>
          )}
        </ol>

        {/* Closure question */}
        <AnimatePresence>
          {ticket.status === "resolved" && !ticket.rating && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="mt-5 rounded-3xl bg-gold/15 p-5 text-center">
                {happy === null ? (
                  <>
                    <p className="font-display text-2xl font-bold text-green-dark">هل حُلّت مشكلتك؟</p>
                    <div className="mt-4 flex justify-center gap-3">
                      <button type="button" onClick={() => setHappy(true)} className="flex items-center gap-2 rounded-2xl bg-green-dark px-7 py-3 text-lg font-bold text-white hover:bg-green">
                        <ThumbsUp className="size-5" /> نعم
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          actions.updateTicket(ticket.id, { status: "open" }, { by: PILGRIM, text: "المشكلة لم تُحل بعد — أرجو المتابعة." });
                          toast({ title: "أعدنا فتح التذكرة", body: "يصل تنبيه إلى المستلم ورئيس المجموعة.", icon: "🔁", tone: "warning" });
                        }}
                        className="flex items-center gap-2 rounded-2xl bg-white px-7 py-3 text-lg font-bold text-maroon ring-2 ring-maroon/30 hover:bg-maroon/5"
                      >
                        <ThumbsDown className="size-5" /> لا
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="font-display text-xl font-bold text-green-dark">كيف تقيّم سرعة الاستجابة والتعامل؟</p>
                    <div className="mt-3 flex justify-center">
                      <StarRating
                        size="lg"
                        value={0}
                        onChange={(v) => {
                          actions.updateTicket(ticket.id, { rating: v });
                          toast({ title: "شكراً لتقييمك", body: "أُغلقت التذكرة.", icon: "⭐", tone: "gold" });
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {ticket.rating ? (
          <p className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-green-light/10 p-3 font-bold text-green">
            <CheckCircle2 className="size-5" /> مغلقة — تقييمك {ticket.rating} من 5
          </p>
        ) : null}
        {ticket.updates.some((u) => u.by === PILGRIM) && ticket.status === "open" && (
          <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-maroon">
            <RotateCcw className="size-4" /> أُعيد فتح التذكرة بطلبك
          </p>
        )}
      </div>
    </motion.div>
  );
}
