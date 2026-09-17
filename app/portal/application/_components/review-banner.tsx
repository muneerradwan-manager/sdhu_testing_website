"use client";

import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, FileWarning, Megaphone, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, SpeakButton, useToast } from "@/components/ui/widgets";
import { fullName } from "@/lib/registry";
import { actions, type Application, type Review } from "@/lib/store";
import { TicketTimeline, useMyTickets, useTicketFallback } from "../../season/_components/tickets";
import { applicantOf, logPilgrim, useNow } from "./post/shared";

const APPEAL_TAG = "اعتراض على قرار مراجعة الطلب";

/** Registration staff decision (from /staff) — a rejection stops the journey and offers an appeal */
export function ReviewBanner({ app, review, sessionId }: { app: Application; review: Review; sessionId: string }) {
  const toast = useToast();
  const now = useNow(1000);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("أرجو إعادة النظر في القرار. أرفقت الوثائق المطلوبة وهي سارية المفعول.");
  const mine = useMyTickets(sessionId);
  const appeal = mine.find((t) => t.kind === "complaint" && t.text.startsWith(APPEAL_TAG) && t.at > review.at);
  useTicketFallback(appeal ? [appeal] : []);
  const when = new Intl.DateTimeFormat("ar-SY-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(review.at);

  if (review.status === "approved") {
    return (
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-wrap items-center gap-3 rounded-3xl border border-green-light/40 bg-white p-4 shadow-sm">
        <BadgeCheck className="size-7 text-green-light" />
        <p className="flex-1 font-bold text-green-dark">
          راجع موظف التسجيل ({review.by}) طلبك واعتمده{review.note ? ` — ${review.note}` : ""}.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 overflow-hidden rounded-[2rem] border-2 border-maroon/30 bg-white shadow-xl">
      <div className="relative bg-maroon p-6 text-white md:p-8">
        <div className="bg-pattern absolute inset-0 opacity-10" />
        <div className="relative flex flex-wrap items-start gap-5">
          <motion.span initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 12 }} className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white/15">
            <FileWarning className="size-9" />
          </motion.span>
          <div className="min-w-0 flex-1">
            <p className="text-white/75">قرار إدارة التسجيل — {when}</p>
            <p className="font-display text-3xl font-bold">لم يُقبل طلبك بعد المراجعة</p>
            <p className="mt-3 rounded-2xl bg-white/10 p-4 text-lg leading-8">
              <b>السبب:</b> {review.note || "لم يُذكر سبب."}
            </p>
            <p className="mt-2 text-sm text-white/70">راجع الطلب: {review.by}</p>
            <SpeakButton text={`لم يُقبل طلبك بعد المراجعة. السبب: ${review.note}. يمكنك تقديم اعتراض.`} className="mt-3" />
          </div>
        </div>
      </div>
      <div className="p-5 md:p-8">
        <AnimatePresence mode="wait">
          {appeal ? (
            <motion.div key="appeal" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="mb-3 font-display text-xl font-bold text-green-dark">اعتراضك قيد المتابعة</p>
              <TicketTimeline ticket={appeal} now={now} steps={["أُرسل", "قيد المراجعة", "تم الرد", "مغلق"]} />
            </motion.div>
          ) : (
            <motion.div key="cta" className="flex flex-wrap items-center justify-between gap-4">
              <p className="max-w-2xl text-lg leading-8 text-ink-soft">إذا كان لديك ما يوضح وضعك، قدّم اعتراضاً الآن. يصل إلى إدارة التسجيل وتتابع حالته من هنا.</p>
              <Button size="xl" variant="maroon" onClick={() => setOpen(true)}>
                <Megaphone className="size-6" /> تقديم اعتراض
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Modal open={open} onClose={() => setOpen(false)}>
        <p className="font-display text-2xl font-bold text-maroon">تقديم اعتراض</p>
        <p className="mt-1 text-ink-soft">على قرار طلبك رقم {app.number}. اكتب سطرين يوضحان سبب الاعتراض.</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} className="mt-4 w-full rounded-2xl border-2 border-gold/50 p-4 text-lg leading-8 outline-none focus:border-green-light" />
        <Button
          size="xl"
          className="mt-4 w-full"
          disabled={text.trim().length < 5}
          onClick={() => {
            const applicant = applicantOf(app);
            const id = actions.addTicket({
              applicantId: sessionId,
              name: fullName(applicant.person),
              kind: "complaint",
              severity: "medium",
              location: `طلب ${app.number} — مكتب ${app.office}`,
              text: `${APPEAL_TAG}: ${text.trim()}`,
              assignee: "رنا حداد",
            });
            logPilgrim(app, "تقديم اعتراض على قرار المراجعة", `تذكرة ${id}`);
            toast({ title: `أُرسل اعتراضك — تذكرة ${id}`, body: "يصل إلى رنا حداد في إدارة التسجيل.", icon: "📨", tone: "info" });
            setOpen(false);
          }}
        >
          <Send className="size-5" /> إرسال الاعتراض
        </Button>
      </Modal>
    </motion.div>
  );
}
