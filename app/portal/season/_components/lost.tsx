"use client";

import { AnimatePresence, motion } from "motion/react";
import { Camera, CheckCircle2, Luggage, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SpeakButton, useToast } from "@/components/ui/widgets";
import { fullName } from "@/lib/registry";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { SeasonCtx } from "./ctx";
import { logPilgrimSeason } from "./meals";
import { TicketTimeline, useMyTickets } from "./tickets";

const LOST_STEPS = ["جارٍ البحث", "تم العثور", "تم التسليم", "مغلق"];
const inputCls = "h-14 w-full rounded-2xl border-2 border-gold/50 bg-white px-4 text-lg outline-none focus:border-green-light";

export function LostSection({ ctx }: { ctx: SeasonCtx }) {
  const toast = useToast();
  const lostReports = useStore((s) => s.inSeason[ctx.sessionId]?.lostReports ?? 0);
  const mine = useMyTickets(ctx.sessionId).filter((t) => t.kind === "lost");
  const women = ctx.app.members.filter((m) => m.relation !== "self" && m.person.gender === "F");
  const defaultOwner = (women.find((m) => m.relation === "spouse") ?? women[0] ?? ctx.app.members[0]).person.id;
  const [open, setOpen] = useState(false);
  const [owner, setOwner] = useState(defaultOwner);
  const [place, setPlace] = useState("حافلة العودة من الحرم 22:00 — موقف (ب)");
  const [desc, setDesc] = useState("حقيبة يد سوداء صغيرة فيها نظارة ومصحف");
  const [photo, setPhoto] = useState(false);

  const submit = () => {
    const m = ctx.app.members.find((x) => x.person.id === owner)!;
    const id = actions.addTicket({
      applicantId: ctx.sessionId,
      name: fullName(m.person),
      kind: "lost",
      severity: "low",
      location: place,
      text: `مفقودات لـ${m.person.firstName}: ${desc}${photo ? " (مع صورة مشابهة)" : ""} — ${ctx.day.hijri}`,
      assignee: "هيثم زيدان — فريق المواصلات",
    });
    actions.setInSeason(ctx.sessionId, { lostReports: lostReports + 1 });
    logPilgrimSeason(ctx, "بلاغ مفقودات", `تذكرة ${id} — ${desc}`);
    toast({ title: `أُرسل بلاغ المفقودات رقم ${id}`, body: "يصل إلى فريق المواصلات.", icon: "👜", tone: "info" });
    setOpen(false);
  };

  return (
    <section id="lost" className="scroll-mt-40">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 font-display text-3xl font-bold text-green-dark">
          <span className="grid size-12 place-items-center rounded-2xl bg-green-dark text-gold"><Luggage className="size-6" /></span>
          المفقودات
        </h2>
        {!open && (
          <Button size="lg" onClick={() => setOpen(true)}>
            فقدتُ شيئاً
          </Button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-[1.75rem] border border-gold/40 bg-white p-5 md:p-7">
              <SpeakButton text="بلاغ مفقودات. اختر صاحب الغرض، واكتب المكان والوصف." />
              <p className="mt-4 font-bold">لمن الغرض المفقود؟</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ctx.app.members.map((m) => (
                  <button key={m.person.id} type="button" onClick={() => setOwner(m.person.id)} className={cn("rounded-2xl border-2 px-5 py-3 text-lg font-bold transition", owner === m.person.id ? "border-green-dark bg-green-dark text-white" : "border-gold/50 bg-white hover:border-gold-dark")}>
                    {m.person.firstName}
                  </button>
                ))}
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block font-bold">أين فُقد؟</span>
                  <input value={place} onChange={(e) => setPlace(e.target.value)} className={inputCls} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-bold">الوصف</span>
                  <input value={desc} onChange={(e) => setDesc(e.target.value)} className={inputCls} />
                </label>
              </div>
              <button type="button" onClick={() => setPhoto((p) => !p)} className={cn("mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-3 font-bold transition", photo ? "border-green-light bg-green-light/10 text-green" : "border-gold-dark text-gold-dark hover:bg-gold/10")}>
                {photo ? <CheckCircle2 className="size-5" /> : <Camera className="size-5" />} {photo ? "أُرفقت صورة مشابهة" : "أرفق صورة مشابهة"}
              </button>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button size="xl" className="flex-1" disabled={desc.trim().length < 3 || place.trim().length < 3} onClick={submit}>
                  <Send className="size-5" /> إرسال البلاغ
                </Button>
                <Button size="xl" variant="ghost" onClick={() => setOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {mine.length > 0 ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {mine.map((t) => (
            <TicketTimeline key={t.id} ticket={t} now={ctx.now} steps={LOST_STEPS} />
          ))}
        </div>
      ) : (
        !open && <p className="rounded-[1.75rem] border border-dashed border-gold-dark/50 bg-white/70 p-6 text-lg text-ink-soft">لا بلاغات مفقودات. إن نسيت شيئاً في الحافلة أو الحرم فأبلغ فوراً، ويتابعه فريق المواصلات خطوة بخطوة.</p>
      )}
    </section>
  );
}
