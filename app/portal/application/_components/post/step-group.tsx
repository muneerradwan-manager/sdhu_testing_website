"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeftRight,
  ArrowRight,
  Bus,
  Building2,
  CheckCircle2,
  Clock,
  EyeOff,
  Hotel,
  Landmark,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  TriangleAlert,
  UsersRound,
  UtensilsCrossed,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge, Modal, useToast } from "@/components/ui/widgets";
import { CLUSTERS, type Cluster, type ClusterGroup } from "@/lib/data/clusters";
import { GROUP } from "@/lib/journey";
import { ageOf, fullName, relationLabel } from "@/lib/registry";
import type { Member } from "@/lib/rules";
import { actions, useStore } from "@/lib/store";
import { cn, formatUSD } from "@/lib/utils";
import { Choice, Question } from "../../../apply/_components/ui";
import { clearJoinDecisions, companionOf, elderlyMembers } from "./model";
import { logPilgrim, useNow, type StepProps } from "./shared";


const LEVEL_TONE: Record<Cluster["level"], string> = {
  عادي: "bg-sand text-ink-soft",
  محسّن: "bg-green-light/15 text-green",
  "خمس نجوم": "bg-gold/40 text-maroon",
};

export function StepGroup({ app, post, sessionId }: StepProps) {
  const toast = useToast();
  const admins = useStore((s) => s.admins);
  const [clusterSlug, setClusterSlug] = useState<string | null>(null);
  const [groupNo, setGroupNo] = useState<number | null>(null);
  const events = useStore((s) => s.events);
  const rejected = useMemo(() => Object.values(admins).some((a) => a.joinDecisions?.[sessionId] === "rejected"), [admins, sessionId]);
  const rejection = useMemo(
    () => (rejected ? [...events].reverse().find((e) => e.action.startsWith("رفض طلب انتساب") && e.target?.includes(`الطلب ${app.number}`)) : undefined),
    [rejected, events, app.number],
  );
  const n = app.members.length;
  const hasElderly = elderlyMembers(app.members).length > 0 || app.members.some((m) => m.needs.length);

  if (post.groupRequestedAt && !post.groupApprovedAt) {
    if (rejected) {
      return (
        <Question
          step="الخطوة 3 من 5"
          title={`لم يُقبل طلب الانتساب إلى المجموعة ${post.groupNumber ?? GROUP.number}`}
          hint="لا تقلق، مقعدك في الحج محفوظ. اختر مجموعة أخرى من دليل الخدمات."
          speak={`لم يُقبل طلب الانتساب. ${rejection?.detail ?? ""}. مقعدك في الحج محفوظ. اختر مجموعة أخرى.`}
        >
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-start gap-4 rounded-3xl border-2 border-maroon/30 bg-maroon/5 p-5">
            <XCircle className="mt-1 size-8 shrink-0 text-maroon" />
            <div>
              <p className="text-xl font-bold text-maroon">{rejection?.detail ?? "رفض رئيس المجموعة الطلب."}</p>
              <p className="mt-1 text-ink-soft">{rejection ? `${rejection.actor} — ${new Intl.DateTimeFormat("ar-SY-u-nu-latn", { timeStyle: "short" }).format(rejection.at)}` : "رئيس المجموعة"}</p>
            </div>
          </motion.div>
          <div className="flex flex-wrap gap-3">
            <Button
              size="xl"
              onClick={() => {
                clearJoinDecisions(sessionId, admins);
                actions.setPost(sessionId, { groupRequestedAt: undefined, groupNumber: undefined, clusterId: undefined });
              }}
            >
              <ArrowRight className="size-6" /> اختيار مجموعة أخرى
            </Button>
          </div>
        </Question>
      );
    }
    return <Waiting app={app} requestedAt={post.groupRequestedAt} groupNumber={post.groupNumber ?? GROUP.number} clusterId={post.clusterId} onCancel={() => {
      actions.setPost(sessionId, { groupRequestedAt: undefined });
      logPilgrim(app, "إلغاء طلب انتساب", `المجموعة ${post.groupNumber}`);
    }} />;
  }

  const cluster = CLUSTERS.find((c) => c.slug === clusterSlug);

  if (cluster) {
    const group = cluster.groups.find((g) => g.no === groupNo);
    const canRequest = cluster.slug === "al-nour";
    return (
      <div>
        <button type="button" onClick={() => { setClusterSlug(null); setGroupNo(null); }} className="mb-4 inline-flex items-center gap-2 rounded-full bg-sand px-4 py-2 font-bold text-green-dark hover:bg-gold-light">
          <ArrowRight className="size-5" /> رجوع إلى دليل الخدمات
        </button>
        <ClusterDetail cluster={cluster} n={n} />

        <div className="mt-8">
          <Question title="اختر المجموعة" hint={`تحتاج ${n} مقاعد لأفراد طلبك معاً. المجموعات المكتملة لا تقبل طلبات جديدة.`} speak={`اختر المجموعة. تحتاج ${n} مقاعد لأفراد طلبك معاً.`}>
            <div className="grid gap-3 md:grid-cols-2">
              {cluster.groups.map((g, i) => (
                <GroupChoice key={g.no} g={g} n={n} index={i} selected={groupNo === g.no} onClick={() => setGroupNo(g.no)} recommended={g.no === 27 && hasElderly} />
              ))}
            </div>
          </Question>
        </div>

        <AnimatePresence>
          {group && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="mt-6 rounded-[2rem] bg-green-dark p-6 text-white md:p-8">
              <p className="text-gold">طلب انتساب عائلي</p>
              <p className="mt-1 font-display text-2xl font-bold md:text-3xl">
                المجموعة {group.no} — {cluster.name}
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {app.members.map((m) => (
                  <li key={m.person.id} className="flex items-center gap-3 rounded-2xl bg-white/10 p-3">
                    <span className={cn("grid size-10 place-items-center rounded-xl font-bold", m.person.gender === "F" ? "bg-gold text-maroon" : "bg-gold-light text-green-dark")}>{m.person.firstName[0]}</span>
                    <span>
                      <span className="block font-bold">{fullName(m.person)}</span>
                      <span className="text-sm text-white/70">
                        {ageOf(m.person)} عاماً{m.needs.length ? ` — ${m.needs.join("، ")}` : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              {canRequest ? (
                <Button
                  size="xl"
                  variant="gold"
                  className="mt-6 w-full"
                  onClick={() => {
                    actions.setPost(sessionId, { clusterId: cluster.slug, groupNumber: group.no, groupRequestedAt: Date.now(), groupApprovedAt: undefined });
                    logPilgrim(app, "إرسال طلب انتساب", `${cluster.name} — المجموعة ${group.no} — ${n} أفراد`);
                    toast({ title: "أُرسل طلب الانتساب", body: `إلى رئيس المجموعة ${group.leader}. ستصلك الموافقة هنا.`, icon: "📨", tone: "info" });
                  }}
                >
                  <Send className="size-6" /> إرسال طلب الانتساب لـ {n} أفراد
                </Button>
              ) : (
                <p className="mt-6 rounded-2xl bg-white/10 p-4 leading-7 text-white/85">
                  في هذا العرض التجريبي يُكمل المسار الكامل مع «تكتل النور» فقط. ارجع واختر تكتل النور لمتابعة التجربة.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (post.groupApprovedAt) return null;

  return (
    <Question
      step="الخطوة 3 من 5"
      title="اختر التكتل الذي يخدمكم"
      hint="هذا دليل الخدمات الرسمي. كل البرامج معتمدة من لجنة الإعلانات ومدير المكتب. قارن ثم افتح التكتل المناسب."
      speak="اختر التكتل الذي يخدمكم. قارن بين مستوى الخدمة والفندق والمسافة والوجبات، ثم افتح التكتل المناسب."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {CLUSTERS.map((c, i) => {
          const seats = c.groups.reduce((a, g) => a + g.remaining, 0);
          const recommended = c.slug === "al-nour" && hasElderly;
          return (
            <motion.button
              key={c.slug}
              type="button"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
              whileHover={{ y: -6 }}
              onClick={() => setClusterSlug(c.slug)}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-[2rem] border-2 bg-white text-right shadow-sm transition-shadow hover:shadow-2xl",
                recommended ? "border-green-dark" : "border-gold/40",
              )}
            >
              <div className={cn("relative p-5 text-white", c.tone === "gold" ? "bg-gradient-to-br from-gold-dark to-maroon" : c.tone === "maroon" ? "bg-gradient-to-br from-maroon to-maroon-dark" : "bg-gradient-to-br from-green to-green-dark")}>
                <div className="bg-pattern absolute inset-0 opacity-15" />
                {recommended && (
                  <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-ink shadow">
                    <Sparkles className="size-3.5" /> مناسب لعائلتك
                  </span>
                )}
                <p className="relative text-xs text-white/75">منذ {c.since} — {c.governorate}</p>
                <p className="relative mt-1 font-display text-xl font-bold">{c.name}</p>
                <div className="relative mt-2 flex items-center gap-2 text-sm">
                  <Star className="size-4 fill-gold text-gold" /> {c.rating} <span className="text-white/60">({c.reviews.toLocaleString("en-US")} تقييم)</span>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2.5 p-5 text-[15px]">
                <span className={cn("w-fit rounded-full px-3 py-1 text-sm font-bold", LEVEL_TONE[c.level])}>مستوى الخدمة: {c.level}</span>
                <p className="font-semibold text-gold-dark">{c.specialty}</p>
                <Row icon={<Hotel className="size-4" />} text={`${c.makkah.hotel} — ${c.makkah.distance}`} />
                <Row icon={<Landmark className="size-4" />} text={`${c.madinah.hotel} — ${c.madinah.distance}`} />
                <Row icon={<Bus className="size-4" />} text={c.transport[0]} />
                <Row icon={<UtensilsCrossed className="size-4" />} text={c.meals[0]} />
                <div className="mt-auto flex items-center justify-between border-t border-gold-light pt-3">
                  <span className="text-sm text-ink-soft">الغرفة الخاصة: <b className="text-ink">+{formatUSD(c.privateRoomDiff)}</b></span>
                  <span className={cn("text-sm font-bold", seats ? "text-green" : "text-maroon")}>{seats} مقعداً متاحاً</span>
                </div>
                <span className="mt-1 flex items-center justify-center gap-2 rounded-2xl bg-sand py-3 font-bold text-green-dark transition group-hover:bg-green-dark group-hover:text-white">
                  افتح صفحة التكتل
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Side-by-side comparison */}
      <details className="group/cmp mt-6 overflow-hidden rounded-3xl border border-gold/40 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 text-lg font-bold text-green-dark">
          <span className="flex items-center gap-2"><ArrowLeftRight className="size-5" /> جدول المقارنة بين التكتلات</span>
          <span className="text-sm text-hint group-open/cmp:hidden">اضغط للعرض</span>
        </summary>
        <div className="scrollbar-none overflow-x-auto border-t border-gold-light">
          <table className="w-full min-w-[56rem] text-right text-sm">
            <tbody>
              {[
                ["المستوى", (c: Cluster) => c.level],
                ["التقييم", (c: Cluster) => `★ ${c.rating}`],
                ["فندق مكة", (c: Cluster) => c.makkah.hotel],
                ["المسافة عن الحرم", (c: Cluster) => c.makkah.distance],
                ["فندق المدينة", (c: Cluster) => `${c.madinah.hotel} — ${c.madinah.distance}`],
                ["النقل", (c: Cluster) => c.transport[0]],
                ["الوجبات", (c: Cluster) => c.meals.join("، ")],
                ["البرامج", (c: Cluster) => c.programs.join("، ")],
                ["فارق الغرفة الخاصة", (c: Cluster) => formatUSD(c.privateRoomDiff)],
              ].map(([label, get], ri) => (
                <tr key={label as string} className={ri % 2 ? "bg-sand/50" : ""}>
                  <th className="sticky right-0 w-36 bg-inherit p-3 font-bold text-gold-dark">{label as string}</th>
                  {CLUSTERS.map((c) => (
                    <td key={c.slug} className={cn("p-3 align-top leading-6", c.slug === "al-nour" && "bg-green-light/8 font-semibold")}>
                      {(get as (c: Cluster) => string)(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Question>
  );
}

function Row({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <p className="flex items-start gap-2 leading-6 text-ink-soft">
      <span className="mt-1 shrink-0 text-gold-dark">{icon}</span>
      {text}
    </p>
  );
}

function GroupChoice({ g, n, index, selected, onClick, recommended }: { g: ClusterGroup; n: number; index: number; selected: boolean; onClick: () => void; recommended: boolean }) {
  const full = g.remaining < n;
  const used = g.capacity - g.remaining;
  return (
    <Choice
      index={index}
      selected={selected}
      disabled={full}
      onClick={onClick}
      icon={<span className="font-display text-2xl font-bold text-green-dark">{g.no}</span>}
      label={
        <span className="flex flex-wrap items-center gap-2">
          المجموعة {g.no}
          {recommended && <span className="rounded-full bg-gold px-2 py-0.5 text-xs text-ink">للعائلات وكبار السن</span>}
        </span>
      }
      description={
        <span className="block">
          رئيسها: {g.leader} — {full ? (g.remaining === 0 ? "مكتملة" : `بقي ${g.remaining} فقط`) : `بقي ${g.remaining} مقاعد`}
          <span className={cn("mt-2 block h-2 overflow-hidden rounded-full", selected ? "bg-white/20" : "bg-gold-light")}>
            <motion.span className={cn("block h-full rounded-full", full ? "bg-maroon" : selected ? "bg-gold" : "bg-green-light")} initial={{ width: 0 }} animate={{ width: `${(used / g.capacity) * 100}%` }} transition={{ duration: 0.8, delay: 0.2 + index * 0.05 }} />
          </span>
        </span>
      }
    />
  );
}

function ClusterDetail({ cluster: c, n }: { cluster: Cluster; n: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-[2rem] border border-gold/40 bg-white">
      <div className={cn("relative p-6 text-white md:p-8", c.tone === "gold" ? "bg-gradient-to-br from-gold-dark to-maroon" : c.tone === "maroon" ? "bg-gradient-to-br from-maroon to-maroon-dark" : "bg-gradient-to-br from-green to-green-dark")}>
        <div className="bg-pattern absolute inset-0 opacity-15" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <Badge tone="gold" className="bg-white/90">
              <ShieldCheck className="size-3.5" /> برنامج معتمد — {c.approvedOn}
            </Badge>
            <p className="mt-3 font-display text-3xl font-bold md:text-4xl">{c.name}</p>
            <p className="mt-2 max-w-2xl text-lg leading-8 text-white/85">{c.about}</p>
          </div>
          <div className="rounded-3xl bg-white/10 p-4 text-center backdrop-blur">
            <p className="font-display text-4xl font-bold text-gold">{c.rating}</p>
            <p className="text-xs text-white/70">{c.reviews.toLocaleString("en-US")} تقييم</p>
          </div>
        </div>
        <div className="relative mt-5 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-white/15 px-3 py-1">مستوى الخدمة: {c.level}</span>
          <span className="rounded-full bg-white/15 px-3 py-1">{c.groupsCount} مجموعة — {c.pilgrims} حاج</span>
          <span className="rounded-full bg-white/15 px-3 py-1">مكتب {c.office}</span>
        </div>
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-2 md:p-8">
        <Block icon={<Building2 className="size-5" />} title="السكن في مكة">
          <p className="font-bold">{c.makkah.hotel} — {c.makkah.area}</p>
          <p>{c.makkah.distance} — {c.makkah.rooms}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">{c.makkah.features.map((f) => <Badge key={f}>{f}</Badge>)}</div>
        </Block>
        <Block icon={<Landmark className="size-5" />} title="السكن في المدينة">
          <p className="font-bold">{c.madinah.hotel} — {c.madinah.area}</p>
          <p>{c.madinah.distance}</p>
        </Block>
        <Block icon={<Bus className="size-5" />} title="النقل">
          <ul className="list-inside list-disc">{c.transport.map((t) => <li key={t}>{t}</li>)}</ul>
        </Block>
        <Block icon={<UtensilsCrossed className="size-5" />} title="الوجبات">
          <ul className="list-inside list-disc">{c.meals.map((t) => <li key={t}>{t}</li>)}</ul>
        </Block>
        <Block icon={<Sparkles className="size-5" />} title="البرامج">
          <ul className="list-inside list-disc">{c.programs.map((t) => <li key={t}>{t}</li>)}</ul>
        </Block>
        <Block icon={<UsersRound className="size-5" />} title="التكلفة">
          <p>تكلفة الحج المعتمدة للفرد + الهدي — كما حددها الموسم</p>
          <p className="font-bold text-maroon">الغرفة الخاصة (فرد أو فردان): فارق {formatUSD(c.privateRoomDiff)}</p>
          <p className="text-sm text-hint">طلبك: {n} أفراد</p>
        </Block>
      </div>
      <p className="mx-5 mb-5 flex items-start gap-2 rounded-2xl bg-sand p-4 text-sm leading-6 text-ink-soft md:mx-8 md:mb-8">
        <EyeOff className="mt-0.5 size-4 shrink-0" /> لا تظهر هنا أرقام الغرف ولا أسماء الحجاج الآخرين ولا خطط النقل التفصيلية؛ فهي معلومات تشغيلية.
      </p>
    </motion.div>
  );
}

function Block({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-sand/70 p-5 leading-7">
      <p className="mb-2 flex items-center gap-2 font-display text-lg font-bold text-green-dark">
        <span className="grid size-9 place-items-center rounded-xl bg-green-dark text-gold">{icon}</span>
        {title}
      </p>
      {children}
    </div>
  );
}

function Waiting({ app, requestedAt, groupNumber, clusterId, onCancel }: { app: StepProps["app"]; requestedAt: number; groupNumber: number; clusterId?: string; onCancel: () => void }) {
  const now = useNow(250);
  const cluster = CLUSTERS.find((c) => c.slug === clusterId) ?? CLUSTERS[0];
  const group = cluster.groups.find((g) => g.no === groupNumber);
  const elapsed = Math.max(0, now - requestedAt);
  const leader = group?.leader ?? "أحمد سليمان";
  return (
    <Question
      step="الخطوة 3 من 5"
      title={`بانتظار موافقة رئيس المجموعة ${leader}`}
      hint="وصل طلبكم إلى قائمة عمله الآن. تصلكم الموافقة هنا فوراً دون تحديث الصفحة."
      speak={`بانتظار موافقة رئيس المجموعة ${leader}. تصلكم الموافقة هنا فوراً.`}
    >
      <div className="relative overflow-hidden rounded-[2rem] bg-green-dark p-6 text-white md:p-10">
        <div className="bg-pattern absolute inset-0 opacity-15" />
        <div className="relative grid items-center gap-8 md:grid-cols-[auto_1fr]">
          <div className="relative mx-auto grid size-40 place-items-center">
            {[0, 1, 2].map((i) => (
              <motion.span key={i} className="absolute inset-0 rounded-full border-2 border-gold/60" animate={{ scale: [0.6, 1.3], opacity: [0.8, 0] }} transition={{ repeat: Infinity, duration: 2.4, delay: i * 0.8 }} />
            ))}
            <span className="relative grid size-24 place-items-center rounded-full bg-gold font-display text-4xl font-bold text-ink shadow-2xl">{leader[0]}</span>
            <motion.span className="absolute -left-2 top-4 grid size-11 place-items-center rounded-full bg-white text-green-dark shadow-lg" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}>
              <Clock className="size-5" />
            </motion.span>
          </div>
          <div>
            <p className="text-gold">{cluster.name} — المجموعة {groupNumber}</p>
            <p className="mt-1 font-display text-2xl font-bold md:text-3xl">طلب انتساب عائلي — {app.members.length} أفراد</p>
            <ol className="mt-5 space-y-3">
              {[
                { t: "أُرسل الطلب", ok: true },
                { t: `ظهر في «طلبات الانتساب» عند ${leader}`, ok: elapsed > 1500 },
                { t: "يراجع السعة والاحتياجات الخاصة", ok: elapsed > 4000 },
                { t: "القرار", ok: false },
              ].map((s, i) => (
                <li key={s.t} className="flex items-center gap-3">
                  <span className={cn("grid size-8 place-items-center rounded-full transition-colors", s.ok ? "bg-green-light" : "bg-white/15")}>
                    {s.ok ? <CheckCircle2 className="size-5" /> : <motion.span className="size-2 rounded-full bg-gold" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: i * 0.1 }} />}
                  </span>
                  <span className={cn("text-lg", s.ok ? "font-bold" : "text-white/70")}>{s.t}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 flex items-center gap-2 text-sm text-white/60">
              <span className="relative flex size-2.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-green-light" />
                <span className="relative size-2.5 rounded-full bg-green-light" />
              </span>
              متابعة مباشرة — منذ {Math.floor(elapsed / 1000)} ثانية
            </p>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sand p-4 text-sm text-ink-soft">
        <span>في العرض التجريبي: إن لم يرد رئيس المجموعة من بوابة الإداريين خلال 10 ثوانٍ تتم الموافقة تلقائياً.</span>
        <button type="button" onClick={onCancel} className="inline-flex items-center gap-1 font-bold text-maroon hover:underline">
          <XCircle className="size-4" /> إلغاء الطلب
        </button>
      </div>
    </Question>
  );
}

/** "مجموعتي" after approval, with the spec's transfer warning for an official companion */
export function MyGroup({ app, groupNumber, clusterId }: { app: StepProps["app"]; groupNumber: number; clusterId?: string }) {
  const toast = useToast();
  const [transfer, setTransfer] = useState<Member | null>(null);
  const cluster = CLUSTERS.find((c) => c.slug === clusterId) ?? CLUSTERS[0];
  const group = cluster.groups.find((g) => g.no === groupNumber);
  const escorted = transfer ? companionOf(app.members, transfer) : [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-green-dark p-5 text-white">
          <p className="text-sm text-gold">مجموعتي</p>
          <p className="font-display text-2xl font-bold">{cluster.name.replace("تكتل ", "")} — المجموعة {groupNumber}</p>
          <p className="mt-1 text-white/75">مستوى الخدمة: {cluster.level} — بعد انضمامكم: {group ? group.capacity - group.remaining + app.members.length : GROUP.members} من {group?.capacity ?? GROUP.capacity}</p>
          <ul className="mt-3 space-y-1 text-sm">
            {GROUP.team.map((t) => (
              <li key={t.name}><span className="text-white/60">{t.role}:</span> <b>{t.name}</b></li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl bg-sand p-5">
          <p className="font-bold text-green-dark">أفراد عائلتك في المجموعة</p>
          <ul className="mt-3 space-y-2">
            {app.members.map((m) => (
              <li key={m.person.id} className="flex items-center justify-between gap-2 rounded-2xl bg-white p-2.5 pr-3">
                <span className="font-semibold">
                  {m.person.firstName} <span className="text-sm font-normal text-hint">— {m.relation === "self" ? "صاحب الطلب" : relationLabel(m.relation, m.person.gender)}</span>
                </span>
                {m.relation !== "self" && (
                  <button type="button" onClick={() => setTransfer(m)} className="rounded-xl px-3 py-1.5 text-sm font-bold text-gold-dark ring-1 ring-gold/50 hover:bg-gold/15">
                    طلب الانتقال
                  </button>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-hint">الفندق: أبراج النور — البرج (ب) — الغرفة: لم تُحدَّد بعد</p>
        </div>
      </div>

      <Modal open={!!transfer} onClose={() => setTransfer(null)}>
        {transfer && (
          <div>
            <p className="flex items-center gap-2 font-display text-2xl font-bold text-maroon">
              <TriangleAlert className="size-7" /> طلب انتقال {transfer.person.firstName}
            </p>
            {escorted.length > 0 ? (
              <>
                <p className="mt-4 rounded-2xl bg-maroon/8 p-4 text-lg font-bold leading-8 text-maroon">
                  أنت المرافق الرسمي لـ{escorted.map((e) => fullName(e.person)).join(" و")}، وانتقالك يلغي المرافقة.
                </p>
                <p className="mt-3 leading-7 text-ink-soft">لو استمر الطلب يبقى {transfer.person.firstName} في المجموعة {groupNumber} حتى يوافق رئيسا المجموعتين، ثم يتم الانتقال دفعة واحدة.</p>
              </>
            ) : (
              <p className="mt-4 leading-8 text-ink-soft">
                يبقى {transfer.person.firstName} عضواً في المجموعة {groupNumber} حتى يوافق رئيسا المجموعتين، ثم يتم الانتقال. تُقفل فترة الانتقال في 25 شعبان.
              </p>
            )}
            <div className="mt-6 grid gap-2">
              <Button
                size="lg"
                onClick={() => {
                  logPilgrim(app, "إلغاء طلب انتقال", transfer.person.firstName);
                  toast({ title: "تم إلغاء طلب الانتقال بناءً على طلبك", icon: "↩️" });
                  setTransfer(null);
                }}
              >
                تراجع وإلغاء الطلب
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={() => {
                  logPilgrim(app, "طلب انتقال بين المجموعات (معلّق)", `${transfer.person.firstName}${escorted.length ? " — مع تحذير إلغاء المرافقة" : ""}`);
                  toast({ title: "أُرسل طلب الانتقال", body: "بانتظار موافقة رئيسي المجموعتين.", icon: "📨", tone: "gold" });
                  setTransfer(null);
                }}
              >
                متابعة الطلب رغم ذلك
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
