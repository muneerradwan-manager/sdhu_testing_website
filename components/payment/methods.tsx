"use client";

import { AnimatePresence, motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, CheckCircle2, FileImage, Landmark, Smartphone, Upload, Wallet } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Choice } from "@/app/portal/apply/_components/ui";
import { cn, formatUSD } from "@/lib/utils";

/**
 * طرق الدفع في المنصة كلها: شام كاش (المحفظة الإلكترونية) أو المصرف المعتمد مع رفع إشعار الدفع.
 * لا دفع بالبطاقة المصرفية. "card" يبقى فقط لقراءة طلبات قديمة محفوظة في المتصفح.
 */
export type PayMethod = "shamcash" | "bank";

export const SHAMCASH_ACCOUNT = "SDHU-1448";

export function payMethodLabel(m: PayMethod | "card" | undefined) {
  return m === "bank" ? "المصرف المعتمد — إشعار مرفوع" : "شام كاش";
}

export function PayMethodChoice({ value, onChange, bankFirst = false }: { value: PayMethod | null; onChange: (m: PayMethod) => void; bankFirst?: boolean }) {
  const items = [
    { k: "shamcash" as const, icon: <Wallet className="size-7 text-green-dark" />, label: "شام كاش", description: "من تطبيق شام كاش على هاتفك — فوري" },
    { k: "bank" as const, icon: <Landmark className="size-7 text-green-dark" />, label: "المصرف المعتمد", description: "ادفع بالرقم المرجعي ثم ارفع إشعار الدفع" },
  ];
  const ordered = bankFirst ? [...items].reverse() : items;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {ordered.map((m, i) => (
        <Choice key={m.k} index={i} icon={m.icon} label={m.label} description={m.description} selected={value === m.k} onClick={() => onChange(m.k)} />
      ))}
    </div>
  );
}

/** ShamCash: scan the platform's code (or send to its account), then enter the transaction number from the app */
export function ShamCashPanel({ amount, reference, onConfirm, cta = "تأكيد الدفع" }: { amount: number; reference: string; onConfirm: () => void; cta?: string }) {
  const [tx, setTx] = useState("");
  return (
    <motion.div key="shamcash" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
      <div className="mt-5 grid items-center gap-5 rounded-3xl border-2 border-green-dark/20 bg-green-dark/5 p-5 sm:grid-cols-[auto_1fr]">
        <div className="mx-auto rounded-2xl bg-white p-3 shadow-sm ring-1 ring-gold/40">
          <QRCodeSVG value={`shamcash://pay?to=${SHAMCASH_ACCOUNT}&amount=${amount}&currency=USD&ref=${reference}`} size={132} fgColor="#00594F" />
          <p className="mt-1 text-center text-xs font-bold text-green-dark">امسح بتطبيق شام كاش</p>
        </div>
        <div>
          <p className="flex items-center gap-2 font-bold text-green-dark">
            <Smartphone className="size-5" /> الدفع عبر شام كاش
          </p>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-sm leading-7 text-ink-soft">
            <li>افتح تطبيق شام كاش وامسح الرمز، أو حوّل إلى حساب المنصة <b className="font-mono text-ink" dir="ltr">{SHAMCASH_ACCOUNT}</b>.</li>
            <li>المبلغ: <b className="text-ink">{formatUSD(amount)}</b> — واكتب في الملاحظة الرقم المرجعي <b className="font-mono text-ink" dir="ltr">{reference}</b>.</li>
            <li>أدخل رقم العملية الذي يظهر في التطبيق بعد الدفع.</li>
          </ol>
          <input
            dir="ltr"
            inputMode="numeric"
            placeholder="رقم العملية في شام كاش"
            value={tx}
            onChange={(e) => setTx(e.target.value.replace(/\D/g, "").slice(0, 12))}
            className="mt-3 h-12 w-full rounded-2xl border-2 border-gold/50 bg-white px-4 text-center font-mono text-lg tracking-widest outline-none focus:border-green-light"
          />
          <button type="button" onClick={() => setTx("73019448")} className="mt-1.5 text-sm font-semibold text-maroon underline">
            رقم عملية تجريبي
          </button>
        </div>
      </div>
      <Button size="xl" className="mt-5 w-full" disabled={tx.length < 6} onClick={onConfirm}>
        <Wallet className="size-5" /> {cta} {formatUSD(amount)}
      </Button>
    </motion.div>
  );
}

/** Approved bank: pay with the reference number, then upload the payment slip for the finance officer to match */
export function BankSlipPanel({ amount, reference, onConfirm }: { amount: number; reference: string; onConfirm: () => void }) {
  const [slip, setSlip] = useState<string | null>(null);
  return (
    <motion.div key="bank" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
      <div className="mt-5 rounded-3xl border-2 border-dashed border-gold-dark bg-gold/10 p-5">
        <p className="text-sm text-ink-soft">الرقم المرجعي للدفع</p>
        <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-green-dark" dir="ltr">
          {reference}
        </p>
        <ol className="mt-3 list-inside list-decimal space-y-1 leading-7 text-ink-soft">
          <li>راجع أي فرع للمصرف المعتمد وأبرز الرقم المرجعي.</li>
          <li>ادفع {formatUSD(amount)} واحتفظ بإشعار الدفع (الورقة المختومة).</li>
          <li>صوّر الإشعار وارفعه هنا ليطابقه موظف المالية مع كشف المصرف.</li>
        </ol>
        <label
          className={cn(
            "mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-4 font-bold transition",
            slip ? "border-green-light bg-green-light/10 text-green" : "border-gold-dark text-gold-dark hover:bg-gold/15",
          )}
        >
          <input type="file" accept="image/*,.pdf" className="sr-only" onChange={(e) => setSlip(e.target.files?.[0]?.name ?? null)} />
          {slip ? <CheckCircle2 className="size-5" /> : <Upload className="size-5" />}
          {slip ? `تم رفع إشعار الدفع: ${slip}` : "رفع صورة إشعار الدفع"}
        </label>
        {!slip && (
          <button type="button" onClick={() => setSlip("bank-slip.jpg")} className="mt-2 flex items-center gap-1 text-sm font-semibold text-maroon underline">
            <FileImage className="size-4" /> إشعار تجريبي
          </button>
        )}
      </div>
      <Button size="xl" className="mt-5 w-full" disabled={!slip} onClick={onConfirm}>
        إرسال الإشعار للمطابقة <ArrowLeft className="size-6" />
      </Button>
    </motion.div>
  );
}

/** Choice + the matching panel — the whole payment form used across the platform */
export function PayMethods({ amount, reference, bankReference, onConfirm, cta }: { amount: number; reference: string; bankReference: string; onConfirm: (m: PayMethod) => void; cta?: string }) {
  const [method, setMethod] = useState<PayMethod | null>(null);
  return (
    <div>
      <PayMethodChoice value={method} onChange={setMethod} />
      <AnimatePresence mode="wait">
        {method === "shamcash" && <ShamCashPanel amount={amount} reference={reference} cta={cta} onConfirm={() => onConfirm("shamcash")} />}
        {method === "bank" && <BankSlipPanel amount={amount} reference={bankReference} onConfirm={() => onConfirm("bank")} />}
      </AnimatePresence>
    </div>
  );
}
