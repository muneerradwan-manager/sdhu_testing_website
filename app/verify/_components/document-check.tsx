"use client";

import { AnimatePresence, motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { Award, Camera, CircleCheck, FileSearch, LoaderCircle, QrCode, Receipt, ScanLine, SearchX, ShieldCheck } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/widgets";
import { DOCUMENTS, findDocument, type IssuedDocument } from "@/lib/data/clusters";
import { cn, formatUSD } from "@/lib/utils";

type State = { status: "idle" } | { status: "checking" } | { status: "valid"; doc: IssuedDocument } | { status: "invalid"; number: string };

export function DocumentCheck() {
  const [number, setNumber] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });
  const [scanOpen, setScanOpen] = useState(false);
  const [scanCode, setScanCode] = useState(DOCUMENTS[1].number);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function verify(value: string) {
    const v = value.trim();
    if (!v) return;
    setNumber(v);
    setState({ status: "checking" });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const doc = findDocument(v);
      setState(doc ? { status: "valid", doc } : { status: "invalid", number: v });
    }, 1000);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    verify(number);
  }

  function openScanner() {
    const pool = DOCUMENTS;
    setScanCode(pool[Math.floor(Math.random() * pool.length)].number);
    setScanOpen(true);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <form onSubmit={submit} className="relative">
          <label htmlFor="doc-no" className="sr-only">
            رقم الإيصال أو الشهادة
          </label>
          <Receipt className="pointer-events-none absolute right-5 top-1/2 size-6 -translate-y-1/2 text-gold-dark" />
          <input
            id="doc-no"
            dir="ltr"
            autoComplete="off"
            spellCheck={false}
            value={number}
            onChange={(e) => setNumber(e.target.value.toUpperCase())}
            placeholder="1448-R-004512"
            className="h-16 w-full rounded-3xl border-2 border-gold/50 bg-white pl-32 pr-14 text-right font-mono text-xl tracking-wider text-ink shadow-[0_20px_50px_-35px_rgba(0,89,79,.6)] outline-none transition placeholder:text-hint focus:border-green-light focus:ring-8 focus:ring-green-light/10"
          />
          <button
            type="submit"
            className="absolute left-2 top-2 flex h-12 items-center gap-2 rounded-2xl bg-green-dark px-5 font-bold text-white transition hover:bg-green active:scale-95"
          >
            {state.status === "checking" ? <LoaderCircle className="size-5 animate-spin" /> : <FileSearch className="size-5" />}
            تحقّق
          </button>
        </form>
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.96 }}
          onClick={openScanner}
          className="group flex h-16 items-center justify-center gap-3 rounded-3xl bg-maroon px-6 font-bold text-white shadow-[0_20px_40px_-20px_rgba(103,33,70,.8)] transition hover:bg-maroon-dark"
        >
          <span className="relative flex size-9 items-center justify-center rounded-xl bg-white/15">
            <QrCode className="size-5 text-gold" />
            <span className="absolute inset-x-1 top-1 h-0.5 animate-bounce rounded bg-gold/80" />
          </span>
          مسح رمز QR
        </motion.button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="text-ink-soft">أرقام تجريبية:</span>
        {[...DOCUMENTS.map((d) => d.number), "1448-R-009999"].map((n) => (
          <button
            key={n}
            onClick={() => verify(n)}
            dir="ltr"
            className="rounded-full border border-gold/50 bg-white px-3 py-1.5 font-mono text-ink transition hover:border-green-light hover:text-green"
          >
            {n}
          </button>
        ))}
      </div>

      <div className="mt-10 min-h-80">
        <AnimatePresence mode="wait">
          {state.status === "idle" && <DocHint key="idle" />}
          {state.status === "checking" && <DocChecking key="checking" />}
          {state.status === "valid" && <ValidDocument key={`v-${state.doc.number}`} doc={state.doc} />}
          {state.status === "invalid" && <InvalidDocument key={`i-${state.number}`} number={state.number} />}
        </AnimatePresence>
      </div>

      <Scanner
        open={scanOpen}
        code={scanCode}
        onClose={() => setScanOpen(false)}
        onDetected={(code) => {
          setScanOpen(false);
          verify(code);
        }}
      />
    </div>
  );
}

const panel = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
};

function DocHint() {
  return (
    <motion.div {...panel} className="grid gap-4 sm:grid-cols-3">
      {[
        { icon: Receipt, t: "إيصالات الرسوم والتكاليف", d: "لكل رسم أو تكلفة إيصال رقمي مستقل برقم فريد ورمز QR." },
        { icon: Award, t: "شهادة أداء الحج", d: "تصدر بعد الموسم، ويمكن لأي جهة التحقق منها هنا." },
        { icon: ShieldCheck, t: "دون بيانات شخصية", d: "تظهر تفاصيل الوثيقة فقط، واسم صاحبها مقنّع." },
      ].map((x) => (
        <div key={x.t} className="rounded-3xl border border-gold/40 bg-white p-5">
          <x.icon className="size-7 text-green" />
          <p className="mt-3 font-bold text-ink">{x.t}</p>
          <p className="mt-1 text-sm leading-7 text-ink-soft">{x.d}</p>
        </div>
      ))}
    </motion.div>
  );
}

function DocChecking() {
  return (
    <motion.div {...panel} className="flex flex-col items-center py-10">
      <div className="relative">
        <div className="flex h-36 w-28 flex-col gap-2 rounded-xl border border-gold/50 bg-white p-3 shadow-lg">
          <div className="skeleton h-2 w-2/3 rounded" />
          <div className="skeleton h-2 w-full rounded" />
          <div className="skeleton h-2 w-4/5 rounded" />
          <div className="skeleton mt-auto size-10 rounded" />
        </div>
        <motion.div
          className="absolute -inset-x-3 h-1 rounded-full bg-green-light shadow-[0_0_20px_4px_rgba(40,158,146,.6)]"
          initial={{ top: 0 }}
          animate={{ top: "100%" }}
          transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        />
      </div>
      <p className="mt-6 font-semibold text-green-dark">نطابق رقم الوثيقة مع سجل المنصة…</p>
    </motion.div>
  );
}

function Seal() {
  return (
    <div className="relative size-40 shrink-0">
      <motion.svg
        viewBox="0 0 200 200"
        className="absolute inset-0 size-full"
        initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 160, damping: 14 }}
        aria-hidden
      >
        <defs>
          <path id="seal-circle" d="M100,100 m-72,0 a72,72 0 1,1 144,0 a72,72 0 1,1 -144,0" />
        </defs>
        <circle cx="100" cy="100" r="96" fill="#00594F" />
        <circle cx="100" cy="100" r="88" fill="none" stroke="#D9C89E" strokeWidth="1.5" strokeDasharray="3 4" />
        <circle cx="100" cy="100" r="56" fill="#016D5D" stroke="#D9C89E" strokeWidth="2" />
        <g className="animate-spin-slow" style={{ transformOrigin: "100px 100px" }}>
          <text fill="#D9C89E" fontSize="13" fontWeight="700" letterSpacing="1">
            <textPath href="#seal-circle">صادرة عن المنصة الوطنية للحج ✦ صحيحة ✦ موسم 1448هـ ✦</textPath>
          </text>
        </g>
      </motion.svg>
      <svg viewBox="0 0 200 200" className="absolute inset-0 size-full" aria-hidden>
        <motion.path
          d="M78 102 l16 16 l32 -34"
          fill="none"
          stroke="#fff"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.45, ease: "easeOut" }}
        />
      </svg>
    </div>
  );
}

function ValidDocument({ doc }: { doc: IssuedDocument }) {
  const rows = [
    { k: "نوع الوثيقة", v: doc.type },
    { k: "رقم الوثيقة", v: doc.number, mono: true },
    ...(doc.amount !== undefined ? [{ k: "المبلغ", v: formatUSD(doc.amount) }] : []),
    { k: "تاريخ الإصدار", v: doc.date },
    { k: "صاحب الوثيقة", v: doc.holder },
    { k: "البيان", v: doc.detail },
  ];
  return (
    <motion.div {...panel} className="overflow-hidden rounded-[2rem] border border-green-light/30 bg-white shadow-[0_40px_80px_-50px_rgba(0,89,79,.7)]">
      <div className="relative flex flex-col items-center gap-6 overflow-hidden bg-gradient-to-br from-green-light/15 via-white to-gold-light/40 p-6 text-center sm:flex-row sm:text-start md:p-8">
        <motion.div
          className="absolute inset-0 bg-green-light"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.9 }}
        />
        <Seal />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-light/15 px-3 py-1 text-xs font-bold text-green">
            <CircleCheck className="size-3.5" /> تم التحقق الآن
          </span>
          <h3 className="mt-3 font-display text-3xl font-bold text-green-dark md:text-4xl">صادرة عن المنصة — صحيحة</h3>
          <p className="mt-2 text-sm leading-7 text-ink-soft">هذه الوثيقة مسجّلة في سجل المنصة ولم تُلغَ. تظهر هنا تفاصيل غير شخصية فقط.</p>
        </div>
      </div>
      <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:p-8">
        <dl className="divide-y divide-dashed divide-gold/50">
          {rows.map((r, i) => (
            <motion.div
              key={r.k}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.07 }}
              className="flex items-center justify-between gap-4 py-3"
            >
              <dt className="text-sm text-ink-soft">{r.k}</dt>
              <dd className={cn("text-end font-bold text-ink", "mono" in r && r.mono && "font-mono")} dir={"mono" in r && r.mono ? "ltr" : undefined}>
                {r.v}
              </dd>
            </motion.div>
          ))}
        </dl>
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-sand p-4">
          <div className="rounded-xl bg-white p-2 shadow-sm">
            <QRCodeSVG value={`https://hajj.example.sy/verify?doc=${doc.number}`} size={120} fgColor="#00594F" level="M" />
          </div>
          <p className="text-[11px] text-ink-soft">رمز التحقق المطبوع على الوثيقة</p>
        </div>
      </div>
    </motion.div>
  );
}

function InvalidDocument({ number }: { number: string }) {
  return (
    <motion.div {...panel} className="mx-auto max-w-2xl">
      <motion.div
        animate={{ x: [0, -10, 10, -6, 6, 0] }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="rounded-[2rem] border-2 border-red-200 bg-white p-8 text-center shadow-[0_30px_60px_-40px_rgba(220,38,38,.5)]"
      >
        <motion.span
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 14 }}
          className="mx-auto flex size-20 items-center justify-center rounded-full bg-red-50 text-red-600 ring-8 ring-red-50/50"
        >
          <SearchX className="size-9" />
        </motion.span>
        <h3 className="mt-5 font-display text-2xl font-bold text-ink md:text-3xl">لم يُعثر على وثيقة بهذا الرقم</h3>
        <p className="mt-2 font-mono text-ink-soft" dir="ltr">
          {number}
        </p>
        <ul className="mx-auto mt-6 max-w-md space-y-2 text-start text-sm leading-7 text-ink-soft">
          <li>• تأكد من كتابة الرقم كما هو مطبوع، مثل: 1448-R-004512.</li>
          <li>• إذا حصلت على الوثيقة من جهة غير معتمدة فلا تعتمد عليها، وأبلغ عنها على الخط الساخن 9449.</li>
        </ul>
      </motion.div>
    </motion.div>
  );
}

function Scanner({ open, code, onClose, onDetected }: { open: boolean; code: string; onClose: () => void; onDetected: (code: string) => void }) {
  const [detected, setDetected] = useState(false);
  const handleDetected = useEffectEvent((c: string) => onDetected(c));

  useEffect(() => {
    if (!open) return;
    const t1 = setTimeout(() => setDetected(true), 2100);
    const t2 = setTimeout(() => {
      setDetected(false);
      handleDetected(code);
    }, 3100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [open, code]);

  return (
    <Modal
      open={open}
      onClose={() => {
        setDetected(false);
        onClose();
      }}
      className="max-w-md bg-ink p-4 text-white sm:p-5"
    >
      <div className="flex items-center gap-2 pb-3 pl-8">
        <Camera className="size-5 text-gold" />
        <p className="font-bold">مسح رمز QR</p>
        <span className="mr-auto rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70">كاميرا تجريبية</span>
      </div>

      <div className="relative aspect-square overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_30%_20%,#2a3a3a,#0b1414_70%)]">
        {/* ambient "camera" blobs */}
        <motion.div
          className="absolute -left-10 top-10 size-48 rounded-full bg-gold/10 blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-10 right-0 size-56 rounded-full bg-green-light/15 blur-3xl"
          animate={{ x: [0, -20, 0], y: [0, -30, 0] }}
          transition={{ duration: 5, repeat: Infinity }}
        />

        {/* the receipt being held up */}
        <motion.div
          className="absolute left-1/2 top-1/2 w-[62%] rounded-xl bg-[#fbf8f2] p-3 text-ink shadow-2xl"
          initial={{ rotate: -9, scale: 0.85, x: "-50%", y: "-50%", filter: "blur(6px)" }}
          animate={{ rotate: [-9, -4, -6, -3], scale: [0.85, 0.95, 0.93, 0.96], x: ["-50%", "-47%", "-51%", "-50%"], y: ["-50%", "-52%", "-49%", "-50%"], filter: ["blur(6px)", "blur(3px)", "blur(1px)", "blur(0px)"] }}
          transition={{ duration: 2, ease: "easeOut" }}
        >
          <div className="mb-2 flex items-center justify-between text-[9px] font-bold text-green-dark">
            <span>المنصة الوطنية للحج</span>
            <span dir="ltr" className="font-mono">
              {code}
            </span>
          </div>
          <div className="mx-auto w-max rounded bg-white p-1.5">
            <QRCodeSVG value={`https://hajj.example.sy/verify?doc=${code}`} size={140} fgColor="#021526" level="M" />
          </div>
        </motion.div>

        {/* viewfinder corners */}
        {[
          "left-6 top-6 border-l-4 border-t-4 rounded-tl-2xl",
          "right-6 top-6 border-r-4 border-t-4 rounded-tr-2xl",
          "left-6 bottom-6 border-l-4 border-b-4 rounded-bl-2xl",
          "right-6 bottom-6 border-r-4 border-b-4 rounded-br-2xl",
        ].map((c) => (
          <motion.span
            key={c}
            className={cn("absolute size-12", c)}
            animate={{ borderColor: detected ? "#289E92" : "#D9C89E", scale: detected ? 0.9 : 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
          />
        ))}

        {/* scan line */}
        <AnimatePresence>
          {!detected && (
            <motion.div
              exit={{ opacity: 0 }}
              className="absolute inset-x-8 h-0.5 rounded-full bg-gold shadow-[0_0_24px_6px_rgba(217,200,158,.55)]"
              initial={{ top: "12%" }}
              animate={{ top: ["12%", "88%", "12%"] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {detected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-end justify-center bg-green-dark/30 p-5"
            >
              <motion.span
                initial={{ y: 20, scale: 0.8 }}
                animate={{ y: 0, scale: 1 }}
                className="flex items-center gap-2 rounded-full bg-green-light px-4 py-2 text-sm font-bold text-white shadow-xl"
              >
                <CircleCheck className="size-4" /> تم التقاط الرمز
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="mt-4 flex items-center justify-center gap-2 text-center text-sm text-white/70">
        {detected ? (
          <>
            <LoaderCircle className="size-4 animate-spin" /> جارٍ التحقق من الوثيقة…
          </>
        ) : (
          <>
            <ScanLine className="size-4 text-gold" /> وجّه الكاميرا نحو رمز QR على الإيصال أو الشهادة
          </>
        )}
      </p>
    </Modal>
  );
}
