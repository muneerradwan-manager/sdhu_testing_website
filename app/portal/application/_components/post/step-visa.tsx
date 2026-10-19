"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, Globe2, Loader2, Mail, Plane, Stamp } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { groupInfo } from "@/lib/assignment";
import { fullName } from "@/lib/registry";
import { useStore } from "@/lib/store";
import { addVisa, demoVisaNumber } from "@/lib/visas";
import { cn, maskNationalId } from "@/lib/utils";
import { Question } from "../../../apply/_components/ui";
import { logPilgrim, type StepProps } from "./shared";

/**
 * The visa: the Saudi foreign ministry issues each member's visa and emails it to the group's head, who adds it to
 * the member from the administrators' platform. The step shows each member's as it arrives; once every one has
 * his, it is done and the family's flights, hotels and season open. The demo simulates the head's adding.
 */
export function StepVisa({ app, sessionId, stepLabel }: StepProps) {
  const toast = useToast();
  const post = useStore((s) => s.post[sessionId]);
  const [simulating, setSimulating] = useState(false);
  const visas = post?.visas ?? {};
  // the group's technical coordinator, who adds the visas, as the family's group page names him
  const headName = useMemo(() => {
    const info = groupInfo(post?.clusterId, post?.groupNumber);
    return info.team.find((t) => t.role === "المنسق التقني")?.name ?? info.leader;
  }, [post?.clusterId, post?.groupNumber]);
  const added = app.members.filter((m) => visas[m.person.id]).length;
  const all = added === app.members.length;

  const simulate = () => {
    setSimulating(true);
    logPilgrim(app, "متابعة حالة التأشيرة");
    app.members.forEach((m, i) => {
      if (visas[m.person.id]) return;
      setTimeout(() => {
        const r = addVisa(sessionId, m.person.id, { number: demoVisaNumber(app.number, i), at: Date.now(), by: `${headName} (محاكاة)` });
        if (r.complete) {
          toast({ title: "صدرت تأشيرات جميع أفراد طلبك", body: "أضافها منسق مجموعتك التقني، وحُددت رحلتا الذهاب والعودة. بطاقتا الرحلة في قسم «رحلة الذهاب والعودة».", icon: "🛂", tone: "success" });
          confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 }, colors: ["#D9C89E", "#00594F", "#289E92", "#ffffff"] });
          setSimulating(false);
        }
      }, 1200 * (i + 1));
    });
  };

  const pipeline = [
    { icon: <Globe2 className="size-5" />, t: "وزارة الخارجية السعودية", d: "تصدر تأشيرة كل فرد بجوازه", ok: added > 0 || simulating },
    { icon: <Mail className="size-5" />, t: "بريد إلى المجموعة", d: `تصل التأشيرات إلى منسقها ${headName}`, ok: added > 0 },
    { icon: <Stamp className="size-5" />, t: "يضيفها إليكم", d: "لكل فرد تأشيرته في «خزنة الوثائق»", ok: all },
  ];

  return (
    <Question
      step={stepLabel ?? "الخطوة 7 من 7"}
      title="التأشيرة والرحلة"
      hint="تصدر تأشيرة كل فرد من وزارة الخارجية السعودية وتصل بالبريد إلى مجموعتك، فيضيفها إليكم منسقها التقني. حين تكتمل تُحدَّد الرحلات والفنادق والمخيمات وبطاقات الحج."
      speak="التأشيرة والرحلة. يضيف منسق مجموعتك التقني تأشيرة كل فرد حين تصله من وزارة الخارجية السعودية."
    >
      <div className="grid gap-3 md:grid-cols-3">
        {pipeline.map((p, i) => (
          <motion.div key={p.t} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className={cn("flex items-center gap-3 rounded-3xl border-2 p-4 transition-colors", p.ok ? "border-green-light/50 bg-green-light/5" : "border-gold/40 bg-white")}>
            <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl transition-colors", p.ok ? "bg-green-light text-white" : "bg-sand text-gold-dark")}>{p.ok ? <BadgeCheck className="size-5" /> : p.icon}</span>
            <span>
              <span className="block font-bold">{p.t}</span>
              <span className="text-sm text-ink-soft">{p.d}</span>
            </span>
          </motion.div>
        ))}
      </div>

      <ul className="mt-5 space-y-3">
        {app.members.map((m) => {
          const v = visas[m.person.id];
          const status = v ? "issued" : simulating ? "pending" : "idle";
          return (
            <motion.li key={m.person.id} layout className={cn("relative flex flex-wrap items-center gap-4 overflow-hidden rounded-3xl border-2 bg-white p-4", status === "issued" ? "border-green-light/50" : "border-gold/40")}>
              <span className={cn("grid size-14 place-items-center rounded-2xl font-display text-2xl font-bold", m.person.gender === "F" ? "bg-maroon/10 text-maroon" : "bg-green-dark/10 text-green-dark")}>{m.person.firstName[0]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold">{fullName(m.person)}</p>
                <p className="font-mono text-sm text-hint" dir="ltr">{maskNationalId(m.person.id)}</p>
              </div>
              <AnimatePresence mode="wait">
                <motion.span
                  key={status}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 font-bold",
                    status === "issued" ? "bg-green-light text-white" : status === "idle" ? "bg-sand text-hint" : "bg-gold/30 text-maroon",
                  )}
                >
                  {status === "issued" && <BadgeCheck className="size-5" />}
                  {status === "pending" && <Loader2 className="size-5 animate-spin" />}
                  {status === "idle" ? "بانتظار التأشيرة" : status === "pending" ? "في بريد رئيس المجموعة" : "صادرة"}
                </motion.span>
              </AnimatePresence>
              {status === "issued" && (
                <motion.span initial={{ scale: 2.4, opacity: 0, rotate: -25 }} animate={{ scale: 1, opacity: 0.16, rotate: -12 }} transition={{ type: "spring", damping: 12 }} className="pointer-events-none absolute left-40 top-1/2 -translate-y-1/2 rounded-xl border-4 border-green-dark px-3 py-1 font-display text-3xl font-bold text-green-dark">
                  VISA
                </motion.span>
              )}
            </motion.li>
          );
        })}
      </ul>

      {all ? (
        <p className="mt-6 flex items-center justify-center gap-2 text-lg font-bold text-green-dark">
          <Plane className="size-6" /> صدرت تأشيراتكم، وحُددت رحلتا مجموعتكم
        </p>
      ) : simulating ? (
        <p className="mt-6 flex items-center justify-center gap-2 text-lg font-bold text-green-dark">
          <motion.span animate={{ x: [0, 20, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
            <Plane className="size-6" />
          </motion.span>
          يضيف {headName} تأشيراتكم...
        </p>
      ) : (
        <>
          <p className="mt-6 rounded-2xl bg-sand p-4 text-center leading-8 text-ink-soft">{added ? `أضاف رئيس مجموعتك ${added} من ${app.members.length} تأشيرات. تظهر البقية حين تصله.` : "لم تصل التأشيرات بعد. يضيفها رئيس مجموعتك حين تصله من وزارة الخارجية السعودية، ويصلك إشعار."}</p>
          <Button size="xl" className="mt-4 w-full" onClick={simulate}>
            <Mail className="size-6" /> محاكاة: وصلت التأشيرات إلى رئيس المجموعة فأضافها
          </Button>
        </>
      )}
    </Question>
  );
}
