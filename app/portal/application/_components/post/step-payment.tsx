"use client";

import { AnimatePresence, motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, BadgeCheck, Building2, CheckCircle2, CreditCard, Eraser, FileSignature, Landmark, Loader2, Lock, PenLine, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { clustersNow } from "@/lib/cms/content";
import { GROUP } from "@/lib/journey";
import { fullName } from "@/lib/registry";
import { actions } from "@/lib/store";
import { cn, formatUSD } from "@/lib/utils";
import { Choice, Question } from "../../../apply/_components/ui";
import type { CostLine } from "./model";
import { applicantOf, logPilgrim, useNow, type StepProps } from "./shared";

const hijriPaid = (at?: number) => (at ? new Intl.DateTimeFormat("ar-SY-u-nu-latn", { hour: "2-digit", minute: "2-digit" }).format(at) : "");

export function StepPayment({ app, post, sessionId, lines }: StepProps) {
  const [paying, setPaying] = useState<CostLine | null>(null);
  const total = lines.reduce((a, l) => a + l.amount, 0);
  const paidAll = lines.every((l) => post.payments[l.key]);
  const paidCount = lines.filter((l) => post.payments[l.key]).length;

  return (
    <Question
      step="الخطوة 4 من 5"
      title={paidAll ? "وقّع عقد الحاج مع المجموعة" : `المبلغ الإجمالي: ${formatUSD(total)}`}
      hint={paidAll ? "اقرأ العقد، ثم وقّع بإصبعك أو بالفأرة في المربع." : `ادفع كل بند وحده، ويصدر لكل بند إيصال مستقل. سدّدت ${paidCount} من ${lines.length}.`}
      speak={
        paidAll
          ? "تم التسديد. اقرأ العقد، ثم وقّع بإصبعك في المربع."
          : `المبلغ الإجمالي ${total} دولار. ادفع كل بند وحده، ويصدر لكل بند إيصال مستقل.`
      }
    >
      {/* Statement */}
      <div className="overflow-hidden rounded-3xl border border-gold/40 bg-white">
        <div className="flex items-center justify-between bg-sand px-5 py-3 font-bold text-gold-dark">
          <span>كشف التكاليف — طلب {app.number}</span>
          <span>{app.members.length} أفراد</span>
        </div>
        <ul className="divide-y divide-gold-light">
          {lines.map((l) => (
            <li key={l.key} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <span>
                <span className="block text-lg font-bold">{l.title}</span>
                <span className="text-sm text-ink-soft">{l.detail}</span>
              </span>
              <span className="font-display text-xl font-bold text-green-dark">{formatUSD(l.amount)}</span>
            </li>
          ))}
          <li className="flex items-center justify-between bg-green-dark px-5 py-4 text-white">
            <span className="text-lg font-bold">المجموع</span>
            <span className="font-display text-3xl font-bold text-gold">{formatUSD(total)}</span>
          </li>
        </ul>
      </div>

      {/* Receipts */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {lines.map((l, i) => {
          const paidAt = post.payments[l.key];
          return (
            <motion.div key={l.key} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className={cn("overflow-hidden rounded-3xl bg-white ring-2 transition-colors", paidAt ? "ring-green-light/50" : "ring-gold/40")}>
              <div className={cn("relative px-4 py-3 text-white transition-colors", paidAt ? "bg-green-dark" : "bg-ink/80")}>
                <div className="bg-pattern absolute inset-0 opacity-10" />
                <p className="relative text-sm font-bold">{l.title}</p>
                <p className="relative font-mono text-xs text-gold" dir="ltr">{l.receipt}</p>
              </div>
              <div className="perforated h-4" />
              <div className="flex items-center gap-3 px-4 pb-4">
                <AnimatePresence mode="wait">
                  {paidAt ? (
                    <motion.div key="qr" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} className="rounded-xl border border-gold/40 p-1">
                      <QRCodeSVG value={`https://hajj-demo.sy/verify/${l.receipt}`} size={60} fgColor="#00594F" />
                    </motion.div>
                  ) : (
                    <motion.div key="lock" className="grid size-[70px] place-items-center rounded-xl bg-sand text-hint">
                      <Lock className="size-7" />
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-2xl font-bold text-green-dark">{formatUSD(l.amount)}</p>
                  {paidAt ? (
                    <p className="flex items-center gap-1 text-sm font-bold text-green">
                      <BadgeCheck className="size-4" /> مسدَّد {hijriPaid(paidAt)}
                    </p>
                  ) : (
                    <Button size="sm" className="mt-1" onClick={() => setPaying(l)}>
                      ادفع هذا البند
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>{paidAll && <Contract app={app} post={post} sessionId={sessionId} lines={lines} total={total} />}</AnimatePresence>

      <Modal open={!!paying} onClose={() => setPaying(null)} className="max-w-2xl">
        {paying && (
          <PayFlow
            line={paying}
            onPaid={(method) => {
              actions.setPost(sessionId, { payments: { ...post.payments, [paying.key]: Date.now() } });
              logPilgrim(app, `تسديد ${paying.title}`, `${formatUSD(paying.amount)} — ${method === "bank" ? "المصرف المعتمد" : "دفع إلكتروني"} — الإيصال ${paying.receipt}`);
              setPaying(null);
            }}
          />
        )}
      </Modal>
    </Question>
  );
}

function PayFlow({ line, onPaid }: { line: CostLine; onPaid: (m: "card" | "bank") => void }) {
  const toast = useToast();
  const [method, setMethod] = useState<"card" | "bank" | null>(null);
  const [card, setCard] = useState({ number: "", name: "", exp: "", cvv: "" });
  const [flip, setFlip] = useState(false);
  const [notice, setNotice] = useState(false);
  const [phase, setPhase] = useState<"form" | "processing">("form");
  const pretty = card.number.replace(/(\d{4})(?=\d)/g, "$1 ");

  const pay = () => {
    setPhase("processing");
    setTimeout(() => {
      toast({ title: `تم تأكيد استلام «${line.title}»`, body: `الإيصال ${line.receipt} في خزنة الوثائق.`, icon: "🧾", tone: "success" });
      onPaid(method ?? "card");
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
          <p className="mt-6 font-display text-2xl font-bold text-green-dark">{method === "bank" ? "يطابق موظف المالية الإشعار مع كشف المصرف..." : "نعالج الدفع بأمان..."}</p>
          <p className="mt-1 text-hint">لا تغلق النافذة</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-bold text-gold-dark">إيصال مستقل: <span className="font-mono" dir="ltr">{line.receipt}</span></p>
      <p className="mt-1 font-display text-2xl font-bold text-green-dark">
        {line.title}: {formatUSD(line.amount)}
      </p>
      <p className="text-ink-soft">{line.detail}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Choice index={0} icon={<Landmark className="size-7 text-green-dark" />} label="المصرف المعتمد" description="ادفع بالرقم المرجعي وارفع الإشعار" selected={method === "bank"} onClick={() => setMethod("bank")} />
        <Choice index={1} icon={<CreditCard className="size-7 text-green-dark" />} label="الدفع الإلكتروني" description="بطاقة مصرفية — فوري" selected={method === "card"} onClick={() => setMethod("card")} />
      </div>
      <AnimatePresence mode="wait">
        {method === "bank" && (
          <motion.div key="bank" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-5 rounded-3xl border-2 border-dashed border-gold-dark bg-gold/10 p-5">
              <p className="text-sm text-ink-soft">الرقم المرجعي للدفع</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-green-dark" dir="ltr">{line.receipt.replace("-P-", "-BANK-")}</p>
              <ol className="mt-3 list-inside list-decimal space-y-1 leading-7 text-ink-soft">
                <li>راجع أي فرع للمصرف المعتمد وأبرز الرقم المرجعي.</li>
                <li>ادفع {formatUSD(line.amount)} واحتفظ بإشعار الدفع.</li>
                <li>ارفع صورة الإشعار هنا ليطابقه موظف المالية.</li>
              </ol>
              <button type="button" onClick={() => setNotice(true)} className={cn("mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-4 font-bold transition", notice ? "border-green-light bg-green-light/10 text-green" : "border-gold-dark text-gold-dark hover:bg-gold/15")}>
                {notice ? <CheckCircle2 className="size-5" /> : <Upload className="size-5" />}
                {notice ? "تم رفع إشعار الدفع (صورة تجريبية)" : "رفع إشعار الدفع"}
              </button>
            </div>
            <Button size="xl" className="mt-5 w-full" disabled={!notice} onClick={pay}>
              إرسال الإشعار للمطابقة <ArrowLeft className="size-6" />
            </Button>
          </motion.div>
        )}
        {method === "card" && (
          <motion.div key="card" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-5 grid items-center gap-5 sm:grid-cols-2">
              <div className="[perspective:1000px]">
                <motion.div animate={{ rotateY: flip ? 180 : 0 }} transition={{ duration: 0.6 }} className="relative aspect-[1.6] w-full [transform-style:preserve-3d]">
                  <div className="absolute inset-0 overflow-hidden rounded-3xl bg-gradient-to-br from-green-dark via-green to-maroon p-5 text-white shadow-2xl [backface-visibility:hidden]">
                    <div className="bg-pattern absolute inset-0 opacity-20" />
                    <div className="relative flex h-full flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="h-7 w-10 rounded-md bg-gradient-to-br from-gold to-gold-dark" />
                        <Building2 className="size-6 text-gold" />
                      </div>
                      <p className="font-mono text-lg tracking-widest" dir="ltr">{pretty || "•••• •••• •••• ••••"}</p>
                      <div className="flex justify-between text-sm">
                        <span className="truncate">{card.name || "الاسم على البطاقة"}</span>
                        <span dir="ltr">{card.exp || "MM/YY"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-ink to-green-dark shadow-2xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <div className="mt-7 h-9 bg-black/60" />
                    <div className="mx-5 mt-4 flex h-8 items-center justify-end rounded bg-white px-3 font-mono text-ink" dir="ltr">{card.cvv || "•••"}</div>
                  </div>
                </motion.div>
              </div>
              <div className="space-y-3">
                <input dir="ltr" inputMode="numeric" placeholder="رقم البطاقة" maxLength={16} value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value.replace(/\D/g, "") })} className="h-13 w-full rounded-2xl border-2 border-gold/50 px-4 font-mono text-lg outline-none focus:border-green-light" />
                <input placeholder="الاسم على البطاقة" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} className="h-13 w-full rounded-2xl border-2 border-gold/50 px-4 outline-none focus:border-green-light" />
                <div className="grid grid-cols-2 gap-3">
                  <input dir="ltr" placeholder="MM/YY" maxLength={5} value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value.replace(/[^\d/]/g, "") })} className="h-13 min-w-0 rounded-2xl border-2 border-gold/50 px-4 font-mono outline-none focus:border-green-light" />
                  <input dir="ltr" placeholder="CVV" maxLength={3} value={card.cvv} onFocus={() => setFlip(true)} onBlur={() => setFlip(false)} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "") })} className="h-13 min-w-0 rounded-2xl border-2 border-gold/50 px-4 font-mono outline-none focus:border-green-light" />
                </div>
                <button type="button" onClick={() => setCard({ number: "4242424242424242", name: "بطاقة تجريبية", exp: "12/29", cvv: "123" })} className="text-sm font-semibold text-maroon underline">
                  املأ ببطاقة تجريبية
                </button>
              </div>
            </div>
            <Button size="xl" className="mt-5 w-full" disabled={card.number.length < 16 || !card.exp || card.cvv.length < 3} onClick={pay}>
              <Lock className="size-5" /> ادفع {formatUSD(line.amount)}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Contract({ app, post, sessionId, lines, total }: Pick<StepProps, "app" | "post" | "sessionId" | "lines"> & { total: number }) {
  const toast = useToast();
  const [hasInk, setHasInk] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const applicant = applicantOf(app);
  const cluster = clustersNow().find((c) => c.slug === post.clusterId) ?? clustersNow()[0];
  const signedAt = post.contractSignedAt;

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };

  const clear = () => {
    const c = canvas.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setHasInk(false);
  };

  const sign = () => {
    const at = Date.now();
    actions.setPost(sessionId, { contractSignedAt: at });
    logPilgrim(app, "توقيع عقد الحاج إلكترونياً", `${cluster.name} — المجموعة ${post.groupNumber ?? GROUP.number} — ${formatUSD(total)}`);
    setTimeout(() => actions.logEvent({ actor: "أحمد سليمان الحمصي (محاكاة)", role: "رئيس مجموعة", action: "توقيع عقد حاج", target: `طلب ${app.number}` }), 1800);
    setTimeout(() => {
      actions.logEvent({ actor: "رنا حداد (محاكاة)", role: "إدارة التسجيل", action: "المصادقة على عقد حاج", target: `طلب ${app.number}` });
      toast({ title: "وقّع رئيس المجموعة عقدك وصادقت عليه الإدارة", body: "الكتيبان الإداري والديني متاحان في مركز المعرفة.", icon: "📜", tone: "success" });
    }, 3600);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="mt-8 overflow-hidden rounded-[2rem] border border-gold/50 bg-white shadow-xl">
      <div className="flex items-center gap-3 bg-green-dark px-6 py-4 text-white">
        <FileSignature className="size-6 text-gold" />
        <span className="font-display text-xl font-bold">عقد الحاج مع المجموعة {post.groupNumber ?? GROUP.number}</span>
      </div>
      <div className="max-h-72 overflow-y-auto px-6 py-5 text-lg leading-9">
        <p>
          <b>الطرف الأول:</b> {cluster.name} ممثلاً برئيس المجموعة {post.groupNumber ?? GROUP.number} أحمد سليمان الحمصي.
        </p>
        <p>
          <b>الطرف الثاني:</b> الحاج {fullName(applicant.person)} عن نفسه وعن أفراد الطلب رقم {app.number}: {app.members.map((m) => m.person.firstName).join("، ")}.
        </p>
        <p className="mt-3 font-bold text-gold-dark">الخدمات</p>
        <ul className="list-inside list-disc">
          <li>السكن في مكة: {cluster.makkah.hotel} ({cluster.makkah.distance}) — وفي المدينة: {cluster.madinah.hotel}.</li>
          <li>النقل: {cluster.transport.join("، ")}.</li>
          <li>الوجبات: {cluster.meals.join("، ")}.</li>
          <li>البرامج: {cluster.programs.join("، ")}.</li>
        </ul>
        <p className="mt-3 font-bold text-gold-dark">التكلفة ومستوى الخدمة</p>
        <ul className="list-inside list-disc">
          {lines.map((l) => (
            <li key={l.key}>
              {l.title}: {formatUSD(l.amount)} — إيصال <span dir="ltr" className="font-mono text-base">{l.receipt}</span>
            </li>
          ))}
          <li>مستوى الخدمة: {cluster.level} — المجموع {formatUSD(total)}.</li>
        </ul>
        <p className="mt-3 font-bold text-gold-dark">الالتزامات</p>
        <p>يلتزم الطرف الأول بتقديم الخدمات المعلنة ومراعاة الاحتياجات الخاصة، ويلتزم الطرف الثاني بالتعليمات ومواعيد التجمّع. يحق للطرف الثاني تقديم شكوى إلى رئيس التكتل أو الإدارة في أي وقت.</p>
      </div>

      <div className="border-t border-gold-light bg-sand/60 p-6">
        {!signedAt ? (
          <>
            <p className="flex items-center gap-2 text-lg font-bold text-green-dark">
              <PenLine className="size-5" /> وقّع هنا
            </p>
            <div className="relative mt-3 overflow-hidden rounded-3xl border-2 border-dashed border-gold-dark bg-white">
              <canvas
                ref={canvas}
                width={900}
                height={260}
                className="block h-44 w-full touch-none cursor-crosshair"
                onPointerDown={(e) => {
                  const ctx = e.currentTarget.getContext("2d");
                  if (!ctx) return;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  drawing.current = true;
                  const p = point(e);
                  ctx.lineWidth = 5;
                  ctx.lineCap = "round";
                  ctx.lineJoin = "round";
                  ctx.strokeStyle = "#021526";
                  ctx.beginPath();
                  ctx.moveTo(p.x, p.y);
                }}
                onPointerMove={(e) => {
                  if (!drawing.current) return;
                  const ctx = e.currentTarget.getContext("2d");
                  if (!ctx) return;
                  const p = point(e);
                  ctx.lineTo(p.x, p.y);
                  ctx.stroke();
                  if (!hasInk) setHasInk(true);
                }}
                onPointerUp={() => {
                  drawing.current = false;
                }}
              />
              {!hasInk && (
                <span className="pointer-events-none absolute inset-0 grid place-items-center text-2xl font-bold text-gold/70">
                  <motion.span animate={{ x: [0, 16, -10, 0] }} transition={{ repeat: Infinity, duration: 2.4 }}>✍️ ارسم توقيعك</motion.span>
                </span>
              )}
              <span className="pointer-events-none absolute inset-x-8 bottom-8 border-b border-gold-light" />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button size="xl" className="flex-1" disabled={!hasInk} onClick={sign}>
                <FileSignature className="size-6" /> أوقّع العقد إلكترونياً
              </Button>
              <Button size="xl" variant="outline" onClick={clear}>
                <Eraser className="size-5" /> مسح
              </Button>
            </div>
          </>
        ) : (
          <SignatureChain app={app} post={post} />
        )}
      </div>
    </motion.div>
  );
}

/** Pilgrim signs → group leader signs → administration certifies (animated from contractSignedAt) */
export function SignatureChain({ app, post }: Pick<StepProps, "app" | "post">) {
  const now = useNow(300);
  const applicant = applicantOf(app);
  const signedAt = post.contractSignedAt;
  const since = signedAt ? now - signedAt : 0;
  const chain = [
    { who: fullName(applicant.person), role: "الحاج — صاحب الطلب", ok: !!signedAt },
    { who: "أحمد سليمان", role: `رئيس المجموعة ${post.groupNumber ?? GROUP.number}`, ok: !!signedAt && since > 1800 },
    { who: "رنا حداد", role: "الإدارة — المصادقة", ok: !!signedAt && since > 3600 },
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
