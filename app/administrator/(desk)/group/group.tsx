"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  Check,
  CircleDashed,
  ClipboardList,
  Loader2,
  Lock,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/portal/shell";
import { PayMethods, payMethodLabel, type PayMethod } from "@/components/payment/methods";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, StarRating, useToast } from "@/components/ui/widgets";
import { useSeason } from "@/lib/season-live";
import { actions, useStore } from "@/lib/store";
import { cn, formatUSD } from "@/lib/utils";
import { adminReceipt, logAdmin, resultOf, useAdmin } from "../../_lib/admin";
import { useExamRules } from "../../_lib/admin-rules";
import { activeCount } from "../../_lib/group";
import { isClusterRole, isTechCoordinator } from "../../_lib/admin";
import { capacityFor, nextGroupNumber, useCapacityTiers } from "../../_lib/capacity";
import { postsOf } from "../../_lib/cluster";
import { POOLS, POOL_ORDER, useClusterRequests } from "../../_lib/formation";
import { StandingCard } from "../../_components/standing";
import { ClusterGroups } from "./cluster-groups";
import { CoordinatorGroups } from "./coordinator-groups";
import { AdminShell, LockedCard, ReceiptCard } from "../../_components/ui";
import { OperationClosed } from "@/components/app/operation-closed";
import { rangeLabel, useOperation } from "@/lib/operations";

/** Who serves this group, as its cluster's head assigned them: nobody before the group is in a cluster */
function useGroupTeam(number: number) {
  const requests = useClusterRequests();
  return useMemo(() => {
    const req = requests.find((r) => r.groups.some((g) => g.number === number) && r.decision?.status !== "excluded");
    if (!req) return { cluster: undefined, team: [] as { role: string; name: string }[] };
    const posts = postsOf(req.cluster, number);
    return { cluster: req, team: POOL_ORDER.flatMap((pool) => (posts[pool] ? [{ role: POOLS[pool].title, name: posts[pool]!.name }] : [])) };
  }, [requests, number]);
}
const AUTO_APPROVE_MS = 12_000;


/**
 * Two operations of their own, two entries in the sidebar: «تشكيل المجموعات» is the head's request, its fee
 * and the administration's decision, open only in its dates — the head forms his group alone, without a
 * team; «إدارة المجموعات» is the approved group and its pilgrims, with the team its cluster's head assigned
 * to it — and the cluster's groups for the cluster roles, the groups assigned to a guide, an assistant or a
 * coordinator.
 */
export function AdminGroup({ part }: { part: "formation" | "manage" }) {
  const admin = useAdmin()!;
  const p = admin.profile;
  const r = resultOf(p, useExamRules());
  const op = useOperation("group-formation");
  const g = p?.group;
  const [showReceipt, setShowReceipt] = useState(false);
  const cluster = isClusterRole(p);
  const tech = isTechCoordinator(p);

  if (part === "manage") {
    // A cluster role sees the cluster's groups, not one; the coordinator works in the groups sorted to him
    if (cluster) return <ClusterGroups />;
    if (tech || p?.servesIn || (p?.positions.length && p.positions[0] !== "group-head")) return <CoordinatorGroups />;
    if (!g?.approvedAt) {
      return (
        <AdminShell image="/images/clock-tower.jpg" title="إدارة المجموعات" subtitle="المجموعة المعتمدة: حجاجها وفريقها الذي يسنده رئيس تكتلها.">
          <LockedCard title="لا مجموعة معتمدة لك بعد" text="تُدار المجموعة هنا بعد أن تعتمدها إدارة الإداريين. طلب تشكيلها عملية مستقلة في «تشكيل المجموعات»، في مدتها." href="/administrator/group" cta="تشكيل المجموعات" />
        </AdminShell>
      );
    }
    return (
      <AdminShell image="/images/clock-tower.jpg" title={`مجموعتي — المجموعة ${g.number}`} subtitle="صلاحياتك تغيّرت تلقائياً: ترى مجموعتك، وتلحق بها حجاجها بعقودهم، وتنشر الإعلانات، وتفتح التجمّعات. فريقها يسنده رئيس تكتلها.">
        <MyGroup />
      </AdminShell>
    );
  }

  if (cluster || tech || (p?.positions.length && p.positions[0] !== "group-head")) {
    return (
      <AdminShell image="/images/clock-tower.jpg" title="تشكيل المجموعات" subtitle="يطلب تشكيلَ المجموعة رئيسُها، في مدة تشكيل المجموعات.">
        <LockedCard title="تشكيل المجموعات لرؤساء المجموعات" text="صفتك هذا الموسم لا تطلب تشكيل مجموعة. ما تعمل فيه من مجموعات تجده في «إدارة المجموعات»." href="/administrator/groups" cta="إدارة المجموعات" />
      </AdminShell>
    );
  }

  const view = !r.published || !r.passed ? "locked" : !g?.feePaidAt ? (op.open ? "request" : "closed") : showReceipt ? "receipt" : !g.approvedAt ? "pending" : "approved";

  return (
    <AdminShell image="/images/clock-tower.jpg" title="تشكيل المجموعات" subtitle={`يتقدم الناجحون في التأهيل بطلبات تشكيل مجموعاتهم ${rangeLabel(op.start, op.end)}، وتراجعها إدارة الإداريين وتعتمدها. لا يُختار تكتل الآن: تشكيل التكتلات عملية مستقلة.`}>
      <AnimatePresence mode="wait">
        <motion.div key={view} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }}>
          {view === "locked" && (
            <LockedCard title="تشكيل المجموعات للناجحين في التأهيل" text="بعد نشر نتيجتك النهائية واجتياز حد النجاح (70) — أو تجديد صفتك معفى — يمكنك تقديم طلب تشكيل مجموعة." href="/administrator/exam" cta="نتيجتي في التأهيل" />
          )}
          {view === "closed" && <OperationClosed state={op} text="طلب تشكيل المجموعة يُقدَّم في مدة تشكيل المجموعات وحدها." />}
          {view === "request" && <RequestForm onPaid={() => setShowReceipt(true)} />}
          {view === "receipt" && <FeeReceipt onContinue={() => setShowReceipt(false)} />}
          {view === "pending" && <Pending />}
          {view === "approved" && (
            <LockedCard title={`اعتُمدت المجموعة ${g!.number}`} text={`بسعة ${g!.capacity} حاجاً (${g!.capacityTier ?? "فئتك"}). انتهى تشكيلها، وتُدار من الآن في «إدارة المجموعات».`} href="/administrator/groups" cta="إدارة المجموعات" />
          )}
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
  const admins = useStore((s) => s.admins);
  const [name, setName] = useState("مجموعة المزة للعائلات وكبار السن");
  const [payMethod, setPayMethod] = useState<PayMethod | null>(null);
  const [paying, setPaying] = useState(false);
  const stage = existing?.requestedAt ? "pay" : "form";
  // Not the head's to type: the number is the next one this season. The capacity is the administration's,
  // given when it approves the group, by the season's categories (0 until then)
  const number = nextGroupNumber(admins, admin.id);

  const submit = () => {
    actions.upsertAdmin(admin.id, { group: { number, capacity: 0, requestedAt: Date.now() } });
    logAdmin(admin.id, `تقديم طلب تشكيل المجموعة ${number}`, `«${name}»`, "السعة تحددها الإدارة عند الاعتماد — دون فريق ودون تكتل: يسند الفريقَ رئيسُ التكتل", { area: "groups", ref: String(number) });
    toast({ title: `أُرسل طلب تشكيل المجموعة ${number}`, body: `بقي تسديد رسم تشكيل المجموعة (${formatUSD(fee)}).`, icon: "📨", tone: "info" });
  };

  const pay = (m: PayMethod) => {
    setPayMethod(m);
    setPaying(true);
    setTimeout(() => {
      onPaid();
      const g = admin.profile!.group!;
      const receipt = adminReceipt(admin.id, "G", g.number);
      actions.upsertAdmin(admin.id, { group: { ...g, feePaidAt: Date.now() } });
      logAdmin(admin.id, "تسديد رسم تشكيل المجموعة", receipt, `${formatUSD(fee)} — المجموعة ${g.number} — ${payMethodLabel(m)}`, { area: "groups", ref: String(g.number) });
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
            <p className="mt-1 text-sm text-hint">السعة تحددها الإدارة عند الاعتماد — التكتل يُحدَّد لاحقاً</p>
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
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-sand p-4">
            <p className="text-sm font-bold text-ink-soft">رقم المجموعة</p>
            <p className="mt-1 font-display text-4xl font-bold text-maroon tabular-nums">{number}</p>
            <p className="mt-1 text-xs leading-5 text-hint">يُعطى تلقائياً: التالي في أرقام مجموعات هذا الموسم.</p>
          </div>
          <div className="rounded-2xl bg-sand p-4">
            <p className="text-sm font-bold text-ink-soft">سعة المجموعة</p>
            <p className="mt-2 font-bold leading-7 text-green-dark">تحددها إدارة الإداريين عند اعتماد طلبك بفئتك</p>
            <p className="mt-1 text-xs leading-5 text-hint">بفئات الموسم: بحسب خبرتك في رئاسة المجموعات وتقييمك فيها. لا تُختار.</p>
          </div>
          <label className="block sm:col-span-2">
            <span className="mb-2 block font-bold">اسم تعريفي</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="h-14 w-full rounded-2xl border-2 border-gold/50 px-4 outline-none focus:border-green-light" />
          </label>
        </div>

        <p className="mt-6 flex items-start gap-2 rounded-2xl bg-green-dark/6 p-4 text-sm leading-7 text-green-dark">
          <UsersRound className="mt-1 size-5 shrink-0" /> تشكّل مجموعتك وحدك، ولا تختار أحداً: الموجّه الديني والمنسق التقني والمعاون يختارهم رئيس التكتل لتكتله كله، ثم يسند إلى مجموعتك من يراه منهم.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-gold-light pt-6">
          <p className="text-sm text-ink-soft">رسم التشكيل بعد الإرسال: <b className="text-maroon">{formatUSD(fee)}</b></p>
          <Button size="lg" onClick={submit}>
            إرسال طلب التشكيل <ArrowLeft className="size-5" />
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-[2rem] bg-green-dark p-6 text-white">
          <div className="bg-pattern absolute inset-0 opacity-15" />
          <div className="relative">
            <Badge tone="gold">التكتل لاحقاً</Badge>
            <p className="mt-3 font-display text-2xl font-bold">لا تكتل عند التشكيل</p>
            <p className="mt-2 text-sm leading-7 text-white/80">
              تُشكَّل المجموعات أولاً. بعدها يُفتح تشكيل التكتلات مع إلحاق الحجاج بالمجموعات: يدعو رئيسُ تكتل مجموعتك فتقبل الدعوة وتدخل بحجاجك، أو تقدّم أنت طلب تشكيل تكتل إن استوفيت شروطه. لا انتخاب.
            </p>
          </div>
        </div>
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
        <ReceiptCard receipt={adminReceipt(admin.id, "G", g.number)} item={`رسم تشكيل المجموعة ${g.number}`} amount={season.fees.groupFormation} lines={[["رئيس المجموعة", admin.name], ["التكتل", "يُحدَّد في تشكيل التكتلات"]]} />
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
  const tiers = useCapacityTiers();
  const g = admin.profile!.group!;
  const [now, setNow] = useState(() => Date.now());
  // From the last time it was sent: paying the fee, or sending it again after the administration returned it
  const sent = Math.max(g.feePaidAt ?? now, g.requestedAt);
  const elapsed = now - sent;
  const left = Math.max(0, Math.ceil((AUTO_APPROVE_MS - elapsed) / 1000));

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (g.approvedAt || !g.feePaidAt || g.returned) return;
    const wait = Math.max(0, Math.max(g.feePaidAt, g.requestedAt) + AUTO_APPROVE_MS - Date.now());
    const t = setTimeout(() => {
      const at = Date.now();
      const tier = capacityFor(admin.id, tiers).tier;
      if (!tier) return;
      actions.upsertAdmin(admin.id, { group: { ...g, capacity: tier.capacity, capacityTier: tier.label, approvedAt: at, approvedBy: "مازن الحلبي (محاكاة)" } });
      actions.logEvent({ actor: "مازن الحلبي (محاكاة)", role: "موظف", action: "اعتماد مجموعة", target: `المجموعة ${g.number}`, after: `رئيسها ${admin.name}`, detail: `السعة ${tier.capacity} حاجاً (${tier.label})`, system: "admins", area: "groups", ref: String(g.number) });
      logAdmin(admin.id, `استلام اعتماد المجموعة ${g.number}`, undefined, `السعة ${tier.capacity} حاجاً (${tier.label})`);
      toast({ title: `اعتُمدت المجموعة ${g.number}`, body: `بسعة ${tier.capacity} حاجاً.`, icon: "🏛️", tone: "success" });
    }, wait);
    return () => clearTimeout(t);
  }, [g, admin.id, admin.name, toast, tiers]);

  /** Sent back by the administration: he sends it again, and it waits for its decision once more */
  const resend = () => {
    actions.upsertAdmin(admin.id, { group: { ...g, returned: undefined, requestedAt: Date.now() } });
    logAdmin(admin.id, `إعادة إرسال طلب تشكيل المجموعة ${g.number}`, undefined, `بعد ملاحظة ${g.returned?.by}: ${g.returned?.note}`, { area: "groups", ref: String(g.number) });
    toast({ title: "أُعيد إرسال طلبك", body: "يعود إلى شؤون الإداريين لتقرر فيه.", icon: "📨", tone: "info" });
  };

  const steps = [
    { t: "استلام طلب التشكيل والرسم", d: adminReceipt(admin.id, "G", g.number), at: 0 },
    { t: "تحقق المنصة من شروط الطلب", d: "تأهّل الرئيس، والرسم", at: 6000 },
    { t: "قرار إدارة الإداريين", d: "يعتمد صاحب صلاحية «إدارة الإداريين» الطلب ويحدد بفئتك سعة المجموعة، أو يعيده إليك مع ملاحظة", at: AUTO_APPROVE_MS },
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
        {g.returned ? (
          <div className="rounded-[2rem] border-2 border-maroon/40 bg-white p-6">
            <p className="font-display text-xl font-bold text-maroon">أُعيد طلبك إليك</p>
            <p className="mt-1 text-xs text-hint">{g.returned.by} — شؤون الإداريين</p>
            <p className="mt-3 rounded-2xl bg-maroon/8 p-3 text-sm leading-7 text-ink">{g.returned.note}</p>
            <Button variant="maroon" className="mt-4 w-full" onClick={resend}>
              أصلحتُ ما طُلب — أعد إرسال الطلب
            </Button>
          </div>
        ) : (
          <div className="rounded-[2rem] border-2 border-dashed border-maroon/30 bg-white p-6 text-center">
            <p className="text-sm text-ink-soft">يعتمد الطلبَ صاحبُ صلاحية «إدارة الإداريين» من بوابة الموظفين.</p>
            <Link href="/staff" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-green-dark underline">لوحة الموظفين <ArrowLeft className="size-4" /></Link>
            <div className="mx-auto mt-5 grid size-24 place-items-center rounded-full bg-maroon/8">
              <span className="font-display text-4xl font-bold tabular-nums text-maroon">{left}</span>
            </div>
            <p className="mt-3 text-xs font-bold text-maroon">محاكاة: اعتماد تلقائي بعد {left} ثانية إن لم يُعتمد من لوحة الموظفين</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── Contracts ─────────────────────────

// ───────────────────────── My group ─────────────────────────

const TASKS = [
  { key: "program", t: "دخول تكتل: بدعوة تقبلها، أو بطلب تشكيل تكتل", href: "/administrator/cluster" },
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
  const { cluster, team } = useGroupTeam(g.number);
  // The cluster task is done by the platform itself once the group is in a cluster
  const [ticked, setDone] = useState<string[]>([]);
  const done = g.clusterId && !ticked.includes("program") ? ["program", ...ticked] : ticked;
  const [stars, setStars] = useState(0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-green-dark via-green to-green-dark p-7 text-white shadow-2xl md:p-9">
          <div className="bg-pattern absolute inset-0 opacity-15" />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-sm text-gold">الموسم 1448 — {cluster ? `${cluster.cluster.name}${cluster.decision?.status === "approved" ? "" : " (طلب أولي)"}` : "لم تدخل تكتلاً بعد"}</p>
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

        <StandingCard scope="group" name={g.number} />

        <Card className="md:p-8">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark"><UsersRound className="size-5 text-gold-dark" /> فريق المجموعة</h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {[{ role: "رئيس المجموعة", name: admin.name }, ...team].map((t, i) => (
              <motion.li key={t.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="flex items-center gap-3 rounded-2xl bg-sand p-3">
                <span className={cn("grid size-11 place-items-center rounded-xl font-display font-bold", i === 0 ? "bg-maroon text-gold" : "bg-white text-green-dark")}>{t.name.replace("الشيخ ", "")[0]}</span>
                <div className="min-w-0">
                  <p className="truncate font-bold">{i === 0 ? admin.name : t.name}</p>
                  <p className="text-xs text-ink-soft">{t.role}</p>
                </div>
                <Check className="mr-auto size-5 shrink-0 text-green-light" aria-label="قبِل" />
              </motion.li>
            ))}
          </ul>
          <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-3">
            {[
              `رسم التشكيل ${formatUSD(season.fees.groupFormation)} ✓`,
              cluster ? `في ${cluster.cluster.name} ✓` : "التكتل — بدعوة أو بطلب",
              team.length ? `فريقها: ${team.length} أسندهم رئيس التكتل` : "فريقها — يسنده رئيس التكتل",
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
          <p className="mt-4 text-xs text-hint">يُفتح إلحاق الحجاج بالمجموعات في 12 تشرين الثاني (موعد تقديري): تلحق بمجموعتك من يتفق معها من الحجاج المقبولين، بعقد ترفعه.</p>
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
      </div>
    </div>
  );
}
