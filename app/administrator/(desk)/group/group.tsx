"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Check,
  CircleDashed,
  ClipboardList,
  Eraser,
  FileSignature,
  Loader2,
  Lock,
  PenLine,
  Send,
  ShieldCheck,
  Stamp,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Emblem } from "@/components/brand/logo";
import { Card } from "@/components/portal/shell";
import { PayMethods, payMethodLabel, type PayMethod } from "@/components/payment/methods";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, StarRating, useToast } from "@/components/ui/widgets";
import { clustersNow } from "@/lib/cms/content";
import { CLUSTER, GROUP } from "@/lib/journey";
import { useSeason } from "@/lib/season-live";
import { actions, useStore } from "@/lib/store";
import { cn, formatUSD } from "@/lib/utils";
import { adminReceipt, logAdmin, resultOf, useAdmin } from "../../_lib/admin";
import { activeCount } from "../../_lib/group";
import { AdminShell, LockedCard, ReceiptCard, SimButton } from "../../_components/ui";

const TEAM = GROUP.team.slice(1);
const AUTO_APPROVE_MS = 12_000;

function clusterName(id: string) {
  return clustersNow().find((c) => c.slug === id)?.name ?? CLUSTER.name;
}

export function AdminGroup() {
  const admin = useAdmin()!;
  const p = admin.profile;
  const r = resultOf(p);
  const g = p?.group;
  const [showReceipt, setShowReceipt] = useState(false);

  const view = !r.published || !r.passed ? "locked" : !g?.feePaidAt ? "request" : showReceipt ? "receipt" : !g.approvedAt ? "pending" : !g.contractSignedAt ? "contracts" : "mine";
  const subtitle =
    view === "contracts"
      ? "اعتُمدت مجموعتك. وقّع العقود إلكترونياً لتُفعَّل صلاحياتك كرئيس مجموعة."
      : view === "mine"
        ? "صلاحياتك تغيّرت تلقائياً: ترى مجموعتك فقط، وتستلم الحجاج المفوَّجين، وتنشر الإعلانات، وتفتح التجمّعات."
        : "يتقدم الناجحون بأنفسهم بطلبات تشكيل المجموعات من 11 إلى 25 جمادى الأولى، وتراجعها الإدارة وتعتمدها وتوقّع العقود.";

  return (
    <AdminShell image="/images/clock-tower.jpg" title={view === "mine" && g ? `مجموعتي — المجموعة ${g.number}` : "تشكيل مجموعة"} subtitle={subtitle}>
      <AnimatePresence mode="wait">
        <motion.div key={view} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }}>
          {view === "locked" && (
            <LockedCard title="تشكيل المجموعات للناجحين في التأهيل" text="بعد نشر نتيجتك النهائية واجتياز حد النجاح (70) يمكنك تقديم طلب تشكيل مجموعة ضمن تكتل." href="/administrator/exam" cta="نتيجتي في التأهيل" />
          )}
          {view === "request" && <RequestForm onPaid={() => setShowReceipt(true)} />}
          {view === "receipt" && <FeeReceipt onContinue={() => setShowReceipt(false)} />}
          {view === "pending" && <Pending />}
          {view === "contracts" && <Contracts />}
          {view === "mine" && <MyGroup />}
        </motion.div>
      </AnimatePresence>
    </AdminShell>
  );
}

// ───────────────────────── Request ─────────────────────────

function RequestForm({ onPaid }: { onPaid: () => void }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const season = useSeason();
  const fee = season.fees.groupFormation;
  const existing = admin.profile?.group;
  const [form, setForm] = useState({ number: existing?.number ?? 27, clusterId: existing?.clusterId ?? "al-nour", capacity: existing?.capacity ?? 50, name: "مجموعة المزة للعائلات وكبار السن" });
  const [invited, setInvited] = useState<number>(existing ? TEAM.length : 0);
  const [inviting, setInviting] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod | null>(null);
  const [paying, setPaying] = useState(false);
  const stage = existing?.requestedAt ? "pay" : "form";
  const cluster = clustersNow().find((c) => c.slug === form.clusterId);

  const invite = () => {
    setInviting(true);
    TEAM.forEach((_, i) => setTimeout(() => setInvited((n) => Math.max(n, i + 1)), 500 + i * 650));
  };

  const submit = () => {
    actions.upsertAdmin(admin.id, { group: { number: form.number, clusterId: form.clusterId, capacity: form.capacity, requestedAt: Date.now() } });
    logAdmin(admin.id, `تقديم طلب تشكيل المجموعة ${form.number}`, clusterName(form.clusterId), `«${form.name}» — السعة ${form.capacity} — الفريق: ${TEAM.map((t) => t.name).join("، ")}`);
    toast({ title: "أُرسل طلب التشكيل", body: `بقي تسديد رسم تشكيل المجموعة (${formatUSD(fee)}).`, icon: "📨", tone: "info" });
  };

  const pay = (m: PayMethod) => {
    setPayMethod(m);
    setPaying(true);
    setTimeout(() => {
      onPaid();
      const g = admin.profile!.group!;
      const receipt = adminReceipt(admin.id, "G", g.number);
      actions.upsertAdmin(admin.id, { group: { ...g, feePaidAt: Date.now() } });
      logAdmin(admin.id, "تسديد رسم تشكيل المجموعة", receipt, `${formatUSD(fee)} — المجموعة ${g.number} — ${payMethodLabel(m)}`);
      setPaying(false);
    }, 2200);
  };

  if (stage === "pay") {
    const g = existing!;
    return (
      <Card className="mx-auto max-w-2xl text-center">
        {paying ? (
          <div className="grid min-h-72 place-items-center">
            <div>
              <div className="relative mx-auto size-24">
                <motion.span className="absolute inset-0 rounded-full border-4 border-gold-light border-t-maroon" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} />
                <span className="absolute inset-0 grid place-items-center text-maroon"><Lock className="size-9" /></span>
              </div>
              <p className="mt-5 font-display text-2xl font-bold text-green-dark">{payMethod === "bank" ? "نطابق إشعار الدفع مع كشف المصرف..." : "نتحقق من العملية في شام كاش..."}</p>
            </div>
          </div>
        ) : (
          <>
            <Badge tone="gold" className="text-sm">الطلب مستلم — الخطوة 2 من 2</Badge>
            <h2 className="mt-4 font-display text-3xl font-bold text-green-dark">رسم تشكيل المجموعة {g.number}</h2>
            <p className="mt-2 text-ink-soft">بعد التسديد يصدر إيصال رقمي، وتظهر «استمارة المجموعة» في خزنة الوثائق.</p>
            <p className="mt-6 font-display text-6xl font-bold text-maroon" dir="ltr">{formatUSD(fee)}</p>
            <p className="mt-1 text-sm text-hint">{clusterName(g.clusterId)} — السعة {g.capacity}</p>
            <div className="mt-8 text-right">
              <PayMethods amount={fee} reference={adminReceipt(admin.id, "G", g.number)} bankReference={adminReceipt(admin.id, "G", g.number).replace("-G-", "-BANK-")} onConfirm={pay} />
            </div>
          </>
        )}
      </Card>
    );
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.3fr_1fr]">
      <Card>
        <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark"><ClipboardList className="size-7 text-gold-dark" /> طلب تشكيل مجموعة</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block font-bold">رقم المجموعة</span>
            <input type="number" min={1} max={99} value={form.number} onChange={(e) => setForm({ ...form, number: Number(e.target.value) || 0 })} className="h-14 w-full rounded-2xl border-2 border-gold/50 px-4 font-display text-2xl font-bold text-maroon outline-none focus:border-green-light" dir="ltr" />
          </label>
          <label className="block">
            <span className="mb-2 block font-bold">اسم تعريفي</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-14 w-full rounded-2xl border-2 border-gold/50 px-4 outline-none focus:border-green-light" />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-2 block font-bold">التكتل</span>
            <select value={form.clusterId} onChange={(e) => setForm({ ...form, clusterId: e.target.value })} className="h-14 w-full rounded-2xl border-2 border-gold/50 bg-white px-4 outline-none focus:border-green-light">
              {clustersNow().map((c) => (
                <option key={c.slug} value={c.slug}>{c.name} — {c.level}</option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <span className="mb-2 flex items-center justify-between font-bold">
              السعة القصوى <span className="font-display text-2xl text-maroon">{form.capacity} حاجاً</span>
            </span>
            <input type="range" min={20} max={50} step={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} className="w-full accent-maroon" aria-label="السعة" />
            <p className="text-xs text-hint">الحد الأعلى للمجموعة في إعدادات الموسم: 50 حاجاً</p>
          </div>
        </div>

        <h3 className="mt-8 flex items-center gap-2 font-bold text-ink"><UsersRound className="size-5 text-gold-dark" /> فريق المجموعة (من الناجحين)</h3>
        <ul className="mt-3 space-y-2">
          {TEAM.map((t, i) => {
            const ok = invited > i;
            return (
              <li key={t.name} className="flex items-center gap-3 rounded-2xl border border-gold/30 p-3">
                <span className="grid size-11 place-items-center rounded-xl bg-sand font-display font-bold text-green-dark">{t.name.replace("الشيخ ", "")[0]}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{t.name}</p>
                  <p className="text-xs text-ink-soft">{t.role}</p>
                </div>
                <AnimatePresence mode="wait">
                  {ok ? (
                    <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1 rounded-full bg-green-light/15 px-2.5 py-1 text-xs font-bold text-green">
                      <UserCheck className="size-3.5" /> وافق من تطبيقه
                    </motion.span>
                  ) : (
                    <motion.span key="wait" className="flex items-center gap-1 text-xs text-hint">
                      {inviting && <Loader2 className="size-3.5 animate-spin" />}
                      {inviting ? "بانتظار الموافقة..." : "لم يُرسل بعد"}
                    </motion.span>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={invite} disabled={inviting || invited >= TEAM.length}>
            <Send className="size-4" /> إرسال طلبات الانضمام للفريق
          </Button>
          <span className="text-xs text-hint">يصل كلاً منهم طلب انضمام يوافق عليه من تطبيقه.</span>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-gold-light pt-6">
          <p className="text-sm text-ink-soft">رسم التشكيل بعد الإرسال: <b className="text-maroon">{formatUSD(fee)}</b></p>
          <Button size="lg" onClick={submit} disabled={invited < TEAM.length || form.number < 1}>
            إرسال طلب التشكيل <ArrowLeft className="size-5" />
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        {cluster && (
          <motion.div key={cluster.slug} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] bg-green-dark p-6 text-white">
            <div className="bg-pattern absolute inset-0 opacity-15" />
            <div className="relative">
              <Badge tone="gold">{cluster.level}</Badge>
              <p className="mt-3 font-display text-2xl font-bold">{cluster.name}</p>
              <p className="mt-1 text-sm text-white/70">منذ {cluster.since}هـ — {cluster.governorate}</p>
              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-white/10 p-3"><dt className="text-white/60">رئيس التكتل</dt><dd className="font-bold">{cluster.slug === "al-nour" ? CLUSTER.head : "—"}</dd></div>
                <div className="rounded-2xl bg-white/10 p-3"><dt className="text-white/60">التقييم</dt><dd className="font-bold">★ {cluster.rating}</dd></div>
                <div className="col-span-2 rounded-2xl bg-white/10 p-3"><dt className="text-white/60">فندق مكة</dt><dd className="font-bold">{cluster.makkah.hotel} — {cluster.makkah.distance}</dd></div>
              </dl>
              <p className="mt-4 text-xs leading-5 text-white/70">يوافق رئيس التكتل على ضم المجموعة إلى تكتله قبل اعتماد مدير المكتب.</p>
            </div>
          </motion.div>
        )}
        <p className="rounded-3xl bg-gold/20 p-4 text-sm leading-7 text-ink">
          <b>لماذا نُظهر الرسم الآن؟</b> لأن الإداريين طلبوا معرفة رسم التشكيل قبل تقديم الطلب — ملاحظة من تقييم الموسم.
        </p>
      </div>
    </div>
  );
}

function FeeReceipt({ onContinue }: { onContinue: () => void }) {
  const admin = useAdmin()!;
  const season = useSeason();
  const g = admin.profile!.group!;
  return (
    <Card className="text-center">
      <h2 className="font-display text-3xl font-bold text-green-dark">تم تسديد رسم التشكيل</h2>
      <p className="mt-2 text-ink-soft">«استمارة المجموعة» محفوظة في خزنة وثائقك.</p>
      <div className="mt-8">
        <ReceiptCard receipt={adminReceipt(admin.id, "G", g.number)} item={`رسم تشكيل المجموعة ${g.number}`} amount={season.fees.groupFormation} lines={[["التكتل", clusterName(g.clusterId)], ["رئيس المجموعة", admin.name]]} />
      </div>
      <Button size="xl" variant="gold" className="mt-8" onClick={onContinue}>
        متابعة الاعتماد <ArrowLeft className="size-6" />
      </Button>
    </Card>
  );
}

// ───────────────────────── Pending approval ─────────────────────────

function Pending() {
  const admin = useAdmin()!;
  const toast = useToast();
  const g = admin.profile!.group!;
  const [now, setNow] = useState(() => Date.now());
  const elapsed = now - (g.feePaidAt ?? now);
  const left = Math.max(0, Math.ceil((AUTO_APPROVE_MS - elapsed) / 1000));

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (g.approvedAt || !g.feePaidAt) return;
    const wait = Math.max(0, g.feePaidAt + AUTO_APPROVE_MS - Date.now());
    const t = setTimeout(() => {
      const at = Date.now();
      actions.upsertAdmin(admin.id, { group: { ...g, approvedAt: at, approvedBy: "مازن الحلبي (محاكاة)" } });
      actions.logEvent({ actor: "مازن الحلبي (محاكاة)", role: "موظف", action: `اعتماد المجموعة ${g.number}`, target: clusterName(g.clusterId), detail: `رئيس المجموعة: ${admin.name} — بعد مراجعة ماهر عيسى` });
      logAdmin(admin.id, `استلام اعتماد المجموعة ${g.number}`, clusterName(g.clusterId), "العقود جاهزة للتوقيع في خزنة الوثائق");
      toast({ title: `اعتُمدت المجموعة ${g.number}`, body: `ضمن ${clusterName(g.clusterId)} لموسم 1448. العقود جاهزة للتوقيع.`, icon: "🏛️", tone: "success" });
    }, wait);
    return () => clearTimeout(t);
  }, [g, admin.id, admin.name, toast]);

  const steps = [
    { t: "استلام طلب التشكيل والرسم", d: adminReceipt(admin.id, "G", g.number), at: 0 },
    { t: "موافقة أعضاء الفريق", d: "3 من 3 وافقوا من تطبيقاتهم", at: 0 },
    { t: `موافقة رئيس التكتل — ${CLUSTER.head}`, d: `ضم المجموعة ${g.number} إلى التكتل`, at: 2500 },
    { t: "مراجعة شؤون الإداريين — ماهر عيسى", d: "اكتمال الفريق، وصفات أعضائه، والرسوم", at: 6000 },
    { t: "اعتماد مدير المكتب — مازن الحلبي", d: "الاعتماد النهائي والتوقيع بالنيابة عن الإدارة", at: AUTO_APPROVE_MS },
  ];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.3fr_1fr]">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-bold text-green-dark md:text-3xl">طلب المجموعة {g.number} قيد الاعتماد</h2>
          <Badge tone="gold"><Loader2 className="size-3.5 animate-spin" /> قيد المعالجة</Badge>
        </div>
        <ol className="mt-8">
          {steps.map((s, i) => {
            const done = elapsed >= s.at + 400 && s.at < AUTO_APPROVE_MS;
            const active = !done && (i === 0 || elapsed >= steps[i - 1].at + 400);
            return (
              <li key={s.t} className="relative flex gap-4 pb-6 last:pb-0">
                {i < steps.length - 1 && <span className={cn("absolute right-[19px] top-10 h-[calc(100%-2.5rem)] w-0.5 transition-colors duration-700", done ? "bg-green-light" : "bg-gold-light")} />}
                <span className={cn("relative grid size-10 shrink-0 place-items-center rounded-full transition-colors duration-500", done ? "bg-green-light text-white" : active ? "bg-gold/40 text-green-dark" : "bg-sand text-hint")}>
                  {done ? <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}><Check className="size-5" /></motion.span> : active ? <Loader2 className="size-5 animate-spin" /> : <CircleDashed className="size-5" />}
                </span>
                <div>
                  <p className={cn("font-bold", done || active ? "text-ink" : "text-hint")}>{s.t}</p>
                  <p className="text-sm text-ink-soft">{s.d}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </Card>
      <div className="space-y-4">
        <div className="rounded-[2rem] border-2 border-dashed border-maroon/30 bg-white p-6 text-center">
          <p className="text-sm text-ink-soft">يمكن اعتماد الطلب من لوحة الموظفين (مدير المكتب — مازن الحلبي).</p>
          <Link href="/staff" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-green-dark underline">لوحة الموظفين <ArrowLeft className="size-4" /></Link>
          <div className="mx-auto mt-5 grid size-24 place-items-center rounded-full bg-maroon/8">
            <span className="font-display text-4xl font-bold tabular-nums text-maroon">{left}</span>
          </div>
          <p className="mt-3 text-xs font-bold text-maroon">محاكاة: اعتماد تلقائي بعد {left} ثانية إن لم يُعتمد من لوحة الموظفين</p>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Contracts ─────────────────────────

function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [ink, setInk] = useState(false);
  const inked = useRef(false);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#021526";
    ctx.lineWidth = 2.4;
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget;
    const rect = c.getBoundingClientRect();
    // Ratio-based so the ink lands under the pointer whatever the page zoom or canvas resolution
    return { x: ((e.clientX - rect.left) / rect.width) * c.width, y: ((e.clientY - rect.top) / rect.height) * c.height };
  };

  const clear = () => {
    const c = canvas.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setInk(false);
    inked.current = false;
    onChange(null);
  };

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-gold-dark bg-white">
        <span aria-hidden className="pointer-events-none absolute inset-x-6 bottom-10 h-px bg-gold-light" />
        <canvas
          ref={canvas}
          className="block h-44 w-full touch-none cursor-crosshair"
          aria-label="لوحة التوقيع — ارسم توقيعك"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drawing.current = true;
            last.current = point(e);
          }}
          onPointerMove={(e) => {
            if (!drawing.current || !last.current) return;
            const ctx = e.currentTarget.getContext("2d")!;
            const p = point(e);
            ctx.beginPath();
            ctx.moveTo(last.current.x, last.current.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            last.current = p;
            if (!inked.current) {
              inked.current = true;
              setInk(true);
            }
          }}
          onPointerUp={(e) => {
            drawing.current = false;
            last.current = null;
            if (inked.current) onChange(e.currentTarget.toDataURL("image/png"));
          }}
        />
        {!ink && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center text-hint">
            <span className="flex items-center gap-2"><PenLine className="size-5" /> وقّع هنا بالفأرة أو بإصبعك</span>
          </span>
        )}
      </div>
      <button type="button" onClick={clear} className="mt-2 flex items-center gap-1 text-sm font-semibold text-hint hover:text-maroon">
        <Eraser className="size-4" /> مسح التوقيع
      </button>
    </div>
  );
}

function ContractDoc({ kind, signature, signedName }: { kind: "cluster" | "team"; signature: string | null; signedName: string }) {
  const admin = useAdmin()!;
  const g = admin.profile!.group!;
  const cName = clusterName(g.clusterId);
  const title = kind === "cluster" ? `عقد انضمام المجموعة ${g.number} إلى ${cName}` : `ميثاق فريق المجموعة ${g.number}`;
  const clauses =
    kind === "cluster"
      ? [
          `تنضم المجموعة ${g.number} بسعة لا تتجاوز ${g.capacity} حاجاً إلى ${cName} لموسم 1448هـ، وتلتزم ببرنامجه المعتمد من لجنة الإعلانات ومدير المكتب.`,
          "يلتزم رئيس المجموعة بتعليمات رئيس التكتل في النقل والإسكان والمشاعر، وبمسارات وأوقات الرمي المحددة للتكتل.",
          "يُحاسَب التكتل والمجموعة بنظام الأسهم المعتمد من حصيلة الإيصالات الصادرة خلال الموسم.",
          "تُقيَّم المجموعة ككيان في المراحل التسع لبرنامج التقييم الإلكتروني، ويعبّئ التكتل تقييماً ذاتياً للمقارنة.",
          "أي خلاف يُحال إلى قسم شؤون التكتلات، وتُسجَّل القرارات في سجل الأحداث.",
        ]
      : [
          "يعمل الفريق بصفاته المعتمدة: رئيس المجموعة، والمعاون، والموجّه الديني، والمنسق التقني، ولكلٍّ صلاحياته في المنصة.",
          "يرافق أعضاء الفريق الحجاج طوال الموسم، ولا يغادر أحدهم دون تكليف بديل يُسجَّل في المنصة.",
          "التجمّعات تُغلق بعد مسح بطاقات الجميع أو معالجة كل غياب، ويُبلَّغ عن المفقود خلال 5 دقائق.",
          "يُرسل رئيس المجموعة تقريراً يومياً، ويتقاسم الفريق مهامه وفق خطة معلنة في قناة المجموعة.",
          "يحترم الجميع ميثاق الأخلاقيات ولائحة المكافآت والعقوبات، ويقبلون التقييم من الموظفين والحجاج.",
        ];
  const parties =
    kind === "cluster"
      ? [
          { role: "عن التكتل", name: CLUSTER.head, signed: true },
          { role: "رئيس المجموعة", name: admin.name, signed: !!signature },
          { role: "مصادقة الإدارة", name: "مازن الحلبي — مدير المكتب", signed: !!signature },
        ]
      : [
          { role: "رئيس المجموعة", name: admin.name, signed: !!signature },
          ...TEAM.map((t) => ({ role: t.role, name: t.name, signed: true })),
        ];

  return (
    <motion.article key={kind} initial={{ opacity: 0, rotateX: 8 }} animate={{ opacity: 1, rotateX: 0 }} className="relative rounded-2xl border border-gold/50 bg-[#fffdf8] p-6 shadow-inner md:p-10">
      <div className="bg-pattern-dark pointer-events-none absolute inset-0 opacity-50" />
      <div className="relative">
        <div className="flex items-center justify-between gap-4 border-b-2 border-double border-gold-dark pb-4">
          <div className="flex items-center gap-3">
            <Emblem className="size-12" />
            <div>
              <p className="font-display font-bold text-green-dark">الإدارة السورية للحج والعمرة</p>
              <p className="text-xs text-hint">المنصة الوطنية للحج — موسم 1448هـ</p>
            </div>
          </div>
          <span className="font-mono text-xs text-hint" dir="ltr">{kind === "cluster" ? `C-1448-${g.number}` : `T-1448-${g.number}`}</span>
        </div>
        <h3 className="mt-6 text-center font-display text-2xl font-bold text-maroon">{title}</h3>
        <p className="mt-4 text-sm leading-8 text-ink-soft">
          حُرّر هذا العقد إلكترونياً على المنصة الوطنية للحج بين الأطراف المذكورة أدناه، بعد اعتماد المجموعة {g.number} من مدير المكتب، واتفقوا على ما يلي:
        </p>
        <ol className="mt-4 space-y-3">
          {clauses.map((c, i) => (
            <li key={i} className="flex gap-3 text-sm leading-7">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-green-dark/8 font-bold text-green-dark">{i + 1}</span>
              <span>{c}</span>
            </li>
          ))}
        </ol>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {parties.map((pt) => {
            const mine = pt.name === admin.name;
            return (
              <div key={pt.name} className="relative rounded-xl border border-gold/40 bg-white/70 p-3">
                <p className="text-xs text-hint">{pt.role}</p>
                <p className="font-bold">{pt.name}</p>
                <div className="mt-1 flex h-12 items-center">
                  {mine && signature ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={signature} alt={`توقيع ${signedName}`} className="h-12 object-contain" />
                  ) : pt.signed ? (
                    <span className="flex items-center gap-1 text-sm font-bold text-green"><BadgeCheck className="size-4" /> موقّع إلكترونياً</span>
                  ) : (
                    <span className="text-sm text-hint">بانتظار التوقيع</span>
                  )}
                </div>
                {pt.signed && pt.role === "مصادقة الإدارة" && (
                  <motion.span initial={{ scale: 2, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 1, rotate: -12 }} className="absolute left-3 top-3 flex items-center gap-1 rounded-lg border-2 border-maroon px-2 py-0.5 text-xs font-bold text-maroon">
                    <Stamp className="size-3.5" /> مصادق
                  </motion.span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.article>
  );
}

function Contracts() {
  const admin = useAdmin()!;
  const toast = useToast();
  const g = admin.profile!.group!;
  const [tab, setTab] = useState<"cluster" | "team">("cluster");
  const [read, setRead] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [signed, setSigned] = useState<string | null>(null);

  const sign = () => {
    setSigned(signature);
    setTimeout(() => {
      actions.upsertAdmin(admin.id, { group: { ...g, contractSignedAt: Date.now() } });
      logAdmin(admin.id, `توقيع عقد انضمام المجموعة ${g.number} إلى التكتل`, clusterName(g.clusterId), "توقيع إلكتروني — مصادقة الإدارة");
      logAdmin(admin.id, `توقيع ميثاق فريق المجموعة ${g.number}`, TEAM.map((t) => t.name).join("، "), "توقيع إلكتروني");
      toast({ title: "وُقّعت العقود وصودق عليها", body: "تغيّرت صلاحياتك تلقائياً: مجموعتك، حجاجها، الإعلانات، التجمّعات.", icon: "✍️", tone: "success" });
      confetti({ particleCount: 160, spread: 100, origin: { y: 0.45 }, colors: ["#D9C89E", "#AD9E6E", "#00594F", "#672146"] });
    }, 2200);
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
      <Card className="md:p-8">
        <div className="flex flex-wrap gap-2 rounded-2xl bg-sand p-1">
          {([
            ["cluster", "المجموعة ↔ التكتل"],
            ["team", "ميثاق الفريق"],
          ] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={cn("relative flex-1 rounded-xl px-4 py-2.5 text-sm font-bold", tab === k ? "text-white" : "text-ink-soft")}>
              {tab === k && <motion.span layoutId="contract-tab" className="absolute inset-0 rounded-xl bg-green-dark" />}
              <span className="relative">{l}</span>
            </button>
          ))}
        </div>
        <div className="mt-5 max-h-[calc(70vh/var(--zoom))] overflow-y-auto pl-1 [perspective:1200px]">
          <ContractDoc kind={tab} signature={signed} signedName={admin.name} />
        </div>
      </Card>

      <div className="space-y-4 lg:sticky lg:top-28">
        <Card className="md:p-7">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark"><FileSignature className="size-5 text-gold-dark" /> التوقيع الإلكتروني</h3>
          <p className="mt-1 text-sm text-ink-soft">توقيع واحد يُعتمد على العقدين، ويُربط برقمك الوطني ووقت التوقيع.</p>
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-sand p-3 text-sm">
            <input type="checkbox" checked={read} onChange={(e) => setRead(e.target.checked)} className="mt-1 size-4 accent-green-dark" />
            <span>قرأت العقدين وأوافق على بنودهما.</span>
          </label>
          <div className="mt-4">
            <SignaturePad onChange={setSignature} />
          </div>
          <Button size="lg" variant="maroon" className="mt-4 w-full" disabled={!read || !signature || !!signed} onClick={sign}>
            {signed ? <><Loader2 className="size-5 animate-spin" /> نُصادق على العقود...</> : <><ShieldCheck className="size-5" /> توقيع العقدين</>}
          </Button>
        </Card>
        <div className="flex items-center gap-3 rounded-3xl bg-green-dark/6 p-4 text-sm text-green-dark">
          <Building2 className="size-5 shrink-0" /> اعتمدها: {g.approvedBy ?? "مازن الحلبي"}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── My group ─────────────────────────

const TASKS = [
  { key: "program", t: "تجهيز برنامج المجموعة مع التكتل" },
  { key: "training", t: "إكمال التدريب الإلزامي (6 وحدات)" },
  { key: "requests", t: "استلام الحجاج المفوَّجين", href: "/administrator/requests" },
  { key: "needs", t: "مراجعة الاحتياجات الخاصة" },
  { key: "lessons", t: "خطة الدروس قبل السفر (4 دروس)" },
  { key: "intro", t: "تحضير اللقاء التعريفي (10 ذو القعدة)" },
];

function MyGroup() {
  const admin = useAdmin()!;
  const toast = useToast();
  const season = useSeason();
  const applications = useStore((s) => s.applications);
  const post = useStore((s) => s.post);
  const g = admin.profile!.group!;
  const members = activeCount(g.number, post, applications);
  const [done, setDone] = useState<string[]>([]);
  const [stars, setStars] = useState(0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-green-dark via-green to-green-dark p-7 text-white shadow-2xl md:p-9">
          <div className="bg-pattern absolute inset-0 opacity-15" />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-sm text-gold">الموسم 1448 — {clusterName(g.clusterId)} (معتمد، مستوى محسّن)</p>
              <p className="mt-2 font-display text-5xl font-bold">المجموعة {g.number}</p>
              <p className="mt-2 text-white/80">رئيس المجموعة: <b className="text-gold">أنت</b></p>
            </div>
            <div className="text-center">
              <div className="relative size-28">
                <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="8" />
                  <motion.circle cx="50" cy="50" r="44" fill="none" stroke="#D9C89E" strokeWidth="8" strokeLinecap="round" strokeDasharray="276" initial={{ strokeDashoffset: 276 }} animate={{ strokeDashoffset: 276 - (276 * members) / g.capacity }} transition={{ duration: 1.4 }} />
                </svg>
                <span className="absolute inset-0 grid place-items-center font-display text-2xl font-bold">{members}/{g.capacity}</span>
              </div>
              <p className="mt-1 text-xs text-white/70">الأعضاء الفعّالون</p>
            </div>
          </div>
          <div className="relative mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/administrator/requests" variant="gold">حجاج المجموعة <ArrowLeft className="size-4" /></ButtonLink>
            <ButtonLink href="/administrator/field" variant="glass">وضع الميدان</ButtonLink>
          </div>
        </motion.div>

        <Card className="md:p-8">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark"><UsersRound className="size-5 text-gold-dark" /> فريق المجموعة</h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {GROUP.team.map((t, i) => (
              <motion.li key={t.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="flex items-center gap-3 rounded-2xl bg-sand p-3">
                <span className={cn("grid size-11 place-items-center rounded-xl font-display font-bold", i === 0 ? "bg-maroon text-gold" : "bg-white text-green-dark")}>{t.name.replace("الشيخ ", "")[0]}</span>
                <div className="min-w-0">
                  <p className="truncate font-bold">{i === 0 ? admin.name : t.name}</p>
                  <p className="text-xs text-ink-soft">{t.role}</p>
                </div>
                <Check className="mr-auto size-5 shrink-0 text-green-light" aria-label="العقد موقّع" />
              </motion.li>
            ))}
          </ul>
          <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-3">
            {[
              `رسم التشكيل ${formatUSD(season.fees.groupFormation)} ✓`,
              "عقد المجموعة مع التكتل ✓",
              "عقد التكتل مع الإدارة ✓",
            ].map((x) => (
              <li key={x} className="rounded-xl border border-green-light/30 bg-green-light/5 px-3 py-2 font-semibold text-green">{x}</li>
            ))}
          </ul>
          <p className="mt-3 font-mono text-xs text-hint" dir="ltr">{adminReceipt(admin.id, "G", g.number)}</p>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="md:p-7">
          <h3 className="font-display text-lg font-bold text-green-dark">مهامك قبل الموسم</h3>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sand">
            <motion.div className="h-full bg-green-light" animate={{ width: `${(done.length / TASKS.length) * 100}%` }} />
          </div>
          <ul className="mt-4 space-y-2">
            {TASKS.map((t) => {
              const on = done.includes(t.key);
              return (
                <li key={t.key} className="flex items-center gap-3 rounded-2xl border border-gold/30 p-3">
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-label={t.t}
                    onClick={() => {
                      setDone(on ? done.filter((x) => x !== t.key) : [...done, t.key]);
                      if (!on) {
                        logAdmin(admin.id, `إنجاز مهمة: ${t.t}`, `المجموعة ${g.number}`);
                        toast({ title: "أحسنت", body: t.t, icon: "✅", tone: "success" });
                      }
                    }}
                    className={cn("grid size-7 shrink-0 place-items-center rounded-lg border-2 transition", on ? "border-green-light bg-green-light text-white" : "border-gold-dark")}
                  >
                    {on && <Check className="size-4" />}
                  </button>
                  <span className={cn("flex-1 text-sm font-semibold", on && "text-hint line-through")}>{t.t}</span>
                  {t.href && <Link href={t.href} className="text-xs font-bold text-green-dark underline">فتح</Link>}
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-xs text-hint">تُفتح مرحلة التفويج في 2 شعبان: يسجّل منسق مجموعتك من يختارها من الحجاج المقبولين.</p>
        </Card>
        <Card className="text-center md:p-7">
          <p className="font-bold">هل كانت خطوات التشكيل والرسوم والعقود واضحة؟</p>
          <div className="mt-3 flex justify-center">
            <StarRating
              value={stars}
              onChange={(v) => {
                setStars(v);
                logAdmin(admin.id, "تقييم مرحلة تشكيل المجموعة", "تجربة الإداري", `${v} من 5`);
                toast({ title: "شكراً لتقييمك", icon: "⭐", tone: "gold" });
              }}
            />
          </div>
        </Card>
        <SimButton
          onClick={() => {
            actions.upsertAdmin(admin.id, { group: { ...g, contractSignedAt: undefined } });
            logAdmin(admin.id, "إعادة عرض شاشة العقود (نسخة تجريبية)");
          }}
        >
          إعادة عرض شاشة توقيع العقود
        </SimButton>
      </div>
    </div>
  );
}
