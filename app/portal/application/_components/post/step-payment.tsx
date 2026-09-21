"use client";

import { motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { BadgeCheck, CheckCircle2, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { PayMethods, payMethodLabel, type PayMethod } from "@/components/payment/methods";
import { planLabel, seasonPlan } from "@/lib/installments";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { GROUP } from "@/lib/journey";
import { fullName } from "@/lib/registry";
import { actions } from "@/lib/store";
import { cn, formatUSD } from "@/lib/utils";
import { Question } from "../../../apply/_components/ui";
import { paidAt, type CostLine } from "./model";
import { applicantOf, logPilgrim, useNow, type StepProps } from "./shared";

const hijriPaid = (at?: number) => (at ? new Intl.DateTimeFormat("ar-SY-u-nu-latn", { hour: "2-digit", minute: "2-digit" }).format(at) : "");

export function StepPayment({ app, post, sessionId, lines }: StepProps) {
  const toast = useToast();
  const [paying, setPaying] = useState<CostLine[] | null>(null);
  const total = lines.reduce((a, l) => a + l.amount, 0);
  const open = lines.filter((l) => !paidAt(l, app, post));
  const remaining = open.reduce((a, l) => a + l.amount, 0);
  const paidSum = total - remaining;

  return (
    <Question
      step="الخطوة 4 من 6"
      title={`بقي عليك: ${formatUSD(remaining)}`}
      hint={`حددت الإدارة لهذا الموسم: ${planLabel(app.plan ?? seasonPlan())}. انضممتم إلى مجموعة، فحان موعد ${(app.plan ?? seasonPlan()) === 1 ? "الهدي وفارق الغرفة إن وجد" : "الدفعة الثانية مع الهدي وفارق الغرفة إن وجد"}. بعد اكتمال الدفع تُطلب الوثائق الطبية.`}
      speak={`بقي عليك ${remaining} دولاراً، تُدفع الآن بعد انضمامك إلى المجموعة. بعد اكتمال الدفع تُطلب الوثائق الطبية.`}
    >
      {/* Statement */}
      <div className="overflow-hidden rounded-3xl border border-gold/40 bg-white">
        <div className="flex items-center justify-between bg-sand px-5 py-3 font-bold text-gold-dark">
          <span>كشف التكاليف — طلب {app.number}</span>
          <span>{app.members.length} أفراد</span>
        </div>
        <ul className="divide-y divide-gold-light">
          {lines.map((l) => {
            const at = paidAt(l, app, post);
            return (
              <li key={l.key} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <span className="min-w-0">
                  <span className="block text-lg font-bold">{l.title}</span>
                  <span className="text-sm text-ink-soft">
                    {l.detail} — {l.key === "i1" ? (app.firstPaid?.creditFrom ? `رصيد من الطلب ${app.firstPaid.creditFrom}` : "دُفعت مع التسجيل أو عند القبول بالقرعة") : `الموعد: ${l.due}`}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-display text-xl font-bold text-green-dark">{formatUSD(l.amount)}</span>
                  {at ? (
                    <span className="flex items-center gap-1 rounded-full bg-green-light/15 px-3 py-1 text-sm font-bold text-green">
                      <BadgeCheck className="size-4" /> مسدَّد
                    </span>
                  ) : (
                    <Button size="sm" onClick={() => setPaying([l])}>
                      ادفع
                    </Button>
                  )}
                </span>
              </li>
            );
          })}
          <li className="flex items-center justify-between bg-green-dark px-5 py-4 text-white">
            <span className="text-lg font-bold">
              المجموع {formatUSD(total)} — المسدَّد {formatUSD(paidSum)}
            </span>
            <span className="font-display text-3xl font-bold text-gold">{formatUSD(remaining)}</span>
          </li>
        </ul>
      </div>

      {open.length > 1 && (
        <Button size="xl" variant="gold" className="mt-5 w-full" onClick={() => setPaying(open)}>
          ادفع المتبقي — {formatUSD(remaining)}
        </Button>
      )}

      {/* Receipts */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {lines.map((l, i) => {
          const at = paidAt(l, app, post);
          return (
            <motion.div key={l.key} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className={cn("overflow-hidden rounded-3xl bg-white ring-2 transition-colors", at ? "ring-green-light/50" : "ring-gold/40")}>
              <div className={cn("relative px-4 py-3 text-white transition-colors", at ? "bg-green-dark" : "bg-ink/80")}>
                <div className="bg-pattern absolute inset-0 opacity-10" />
                <p className="relative text-sm font-bold">{l.title}</p>
                <p className="relative font-mono text-xs text-gold" dir="ltr">{l.receipt}</p>
              </div>
              <div className="perforated h-4" />
              <div className="flex items-center gap-3 px-4 pb-4">
                {at ? (
                  <div className="rounded-xl border border-gold/40 p-1">
                    <QRCodeSVG value={`https://hajj-demo.sy/verify/${l.receipt}`} size={60} fgColor="#00594F" />
                  </div>
                ) : (
                  <div className="grid size-[70px] place-items-center rounded-xl bg-sand text-hint">
                    <Lock className="size-7" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-display text-2xl font-bold text-green-dark">{formatUSD(l.amount)}</p>
                  <p className={cn("text-sm font-bold", at ? "text-green" : "text-gold-dark")}>{at ? `مسدَّد ${hijriPaid(at)}` : l.due}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <Modal open={!!paying} onClose={() => setPaying(null)} className="max-w-2xl">
        {paying && (
          <PayFlow
            items={paying}
            onPaid={(method) => {
              const at = Date.now();
              actions.setPost(sessionId, { payments: { ...post.payments, ...Object.fromEntries(paying.map((l) => [l.key, at])) } });
              logPilgrim(app, `تسديد ${paying.map((l) => l.title).join(" + ")}`, `${formatUSD(paying.reduce((a, l) => a + l.amount, 0))} — ${payMethodLabel(method)} — ${paying.map((l) => l.receipt).join("، ")}`);
              if (paying.length === open.length) toast({ title: "اكتمل دفع المبلغ كاملاً", body: "التالي: الملف الطبي — ارفع الوثائق الطبية المطلوبة.", icon: "🎉", tone: "gold" });
              setPaying(null);
            }}
          />
        )}
      </Modal>
    </Question>
  );
}
function PayFlow({ items, onPaid }: { items: CostLine[]; onPaid: (m: PayMethod) => void }) {
  const line = items.length === 1 ? items[0] : { ...items[0], title: "المتبقي كله", detail: items.map((l) => l.title).join(" + "), amount: items.reduce((a, l) => a + l.amount, 0) };
  const toast = useToast();
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [phase, setPhase] = useState<"form" | "processing">("form");

  const pay = (m: PayMethod) => {
    setMethod(m);
    setPhase("processing");
    setTimeout(() => {
      toast({ title: `تم تأكيد استلام «${line.title}»`, body: `${items.length > 1 ? `${items.length} إيصالات مستقلة` : `الإيصال ${line.receipt}`} في خزنة الوثائق.`, icon: "🧾", tone: "success" });
      onPaid(m);
    }, 2400);
  };

  if (phase === "processing") {
    return (
      <div className="grid min-h-80 place-items-center text-center">
        <div>
          <div className="relative mx-auto size-28">
            <motion.span className="absolute inset-0 rounded-full border-4 border-gold-light border-t-green-dark" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} />
            <span className="absolute inset-0 grid place-items-center text-green-dark">
              <Lock className="size-10" />
            </span>
          </div>
          <p className="mt-6 font-display text-2xl font-bold text-green-dark">{method === "bank" ? "يطابق موظف المالية الإشعار مع كشف المصرف..." : "نتحقق من العملية في شام كاش..."}</p>
          <p className="mt-1 text-hint">لا تغلق النافذة</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-bold text-gold-dark">{items.length > 1 ? `${items.length} إيصالات مستقلة` : <>إيصال مستقل: <span className="font-mono" dir="ltr">{line.receipt}</span></>}</p>
      <p className="mt-1 font-display text-2xl font-bold text-green-dark">
        {line.title}: {formatUSD(line.amount)}
      </p>
      <p className="mb-5 text-ink-soft">{line.detail}</p>
      <PayMethods amount={line.amount} reference={line.receipt} bankReference={line.receipt.replace("-P-", "-BANK-")} onConfirm={pay} />
    </div>
  );
}
/** The pilgrim–group contract signed at enrollment: pilgrim → group coordinator → administration (animated from contractSignedAt) */
export function SignatureChain({ app, post }: Pick<StepProps, "app" | "post">) {
  const now = useNow(300);
  const applicant = applicantOf(app);
  const signedAt = post.contractSignedAt;
  const since = signedAt ? now - signedAt : 0;
  const chain = [
    { who: fullName(applicant.person), role: "الحاج — صاحب الطلب", ok: !!signedAt },
    { who: post.enrolledBy?.name ?? "منسق المجموعة", role: `منسق المجموعة ${post.groupNumber ?? GROUP.number}`, ok: !!signedAt },
    { who: "رنا حداد", role: "الإدارة — المصادقة", ok: !!signedAt && since > 2500 },
  ];
  return (
    <ol className="grid gap-3 md:grid-cols-3">
      {chain.map((c, i) => (
        <motion.li key={c.role} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }} className={cn("relative rounded-3xl border-2 bg-white p-4 transition-colors duration-500", c.ok ? "border-green-light/60" : "border-dashed border-gold/60")}>
          <span className={cn("grid size-11 place-items-center rounded-full transition-colors duration-500", c.ok ? "bg-green-light text-white" : "bg-sand text-gold-dark")}>
            {c.ok ? (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                <CheckCircle2 className="size-6" />
              </motion.span>
            ) : (
              <Loader2 className="size-6 animate-spin" />
            )}
          </span>
          <p className="mt-2 text-sm text-hint">{c.role}</p>
          <p className="font-bold">{c.who}</p>
          <p className={cn("text-sm font-semibold", c.ok ? "text-green" : "text-gold-dark")}>
            {c.ok ? (i === 2 ? "صادق على العقد ✓" : "وقّع ✓") : i === chain.findIndex((x) => !x.ok) ? (i === 1 ? "يوقّع الآن..." : "تراجع العقد الآن...") : "بالانتظار"}
          </p>
        </motion.li>
      ))}
    </ol>
  );
}
