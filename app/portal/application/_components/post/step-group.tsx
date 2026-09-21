"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeftRight,
  ArrowRight,
  Building2,
  Bus,
  FileSignature,
  Hotel,
  Landmark,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
  UserCheck,
  UsersRound,
  UtensilsCrossed,
} from "lucide-react";
import { useState } from "react";
import { DEMO_OTP, OtpInput } from "@/components/portal/bits";
import { Button } from "@/components/ui/button";
import { Badge, Modal, useToast } from "@/components/ui/widgets";
import { coordinatorOf, enrollFamily, groupInfo } from "@/lib/assignment";
import { clustersNow } from "@/lib/cms/content";
import type { Cluster, ClusterGroup } from "@/lib/data/clusters";
import { fullName, relationLabel } from "@/lib/registry";
import { SEASON } from "@/lib/season";
import { cn, formatUSD } from "@/lib/utils";
import { Question } from "../../../apply/_components/ui";
import { COORDINATOR_ID } from "./model";
import type { StepProps } from "./shared";

const LEVEL_TONE: Record<Cluster["level"], string> = {
  عادي: "bg-sand text-ink-soft",
  محسّن: "bg-green-light/15 text-green",
  "خمس نجوم": "bg-gold/40 text-maroon",
};

/**
 * الخطوة 3: التفويج. في مرحلة التفويج يتصفّح الحاج دليل المجموعات ويتواصل مع مجموعة، فيسجّله منسقها
 * فيها ويوقّعان عقد الحاج مع المجموعة. لا زر «انضمام» عند الحاج: التسجيل من صلاحية منسق المجموعة وحده.
 */
export function StepGroup({ app, post, sessionId }: StepProps) {
  if (post.groupApprovedAt) return null;
  return (
    <Question
      step="الخطوة 3 من 6"
      title="مرحلة التفويج: اختر مجموعتك وتواصل مع منسقها"
      hint={`مرحلة التفويج مفتوحة (${SEASON.groupingWindow}). تصفّح المجموعات وقارن بينها، ثم اتصل بمنسق المجموعة التي تناسبك: هو من يسجّلكم فيها ويوقّع معكم العقد. ${app.members.length > 1 ? `أفراد طلبكم (${app.members.length}) يُسجَّلون معاً في المجموعة نفسها.` : ""}`}
      speak="مرحلة التفويج مفتوحة. تصفّح المجموعات، ثم اتصل بمنسق المجموعة التي تناسبك، فيسجّلك فيها ويوقّع معك العقد."
    >
      {app.submittedBy && (
        <p className="mb-5 flex items-start gap-2 rounded-2xl bg-sand p-4 text-sm leading-7 text-ink-soft">
          <ShieldCheck className="mt-1 size-4 shrink-0 text-green-dark" />
          سجّل طلبكم المنسق {app.submittedBy.name}، وهذا لا يضعكم في مجموعته. اختاروا المجموعة التي تناسبكم، ولو كانت مجموعته فهو من يسجّلكم فيها.
        </p>
      )}
      <Directory app={app} post={post} sessionId={sessionId} />
    </Question>
  );
}

/** The group directory: clusters, their groups, and each group's coordinator to contact */
type DirProps = Omit<StepProps, "lines">;

function Directory({ app, post, sessionId, excludeGroup }: DirProps & { excludeGroup?: number }) {
  const [area, setArea] = useState<string>(app.governorate);
  const [clusterSlug, setClusterSlug] = useState<string | null>(null);
  const clusters = clustersNow();
  const areas = [...new Set(clusters.map((c) => c.governorate))];
  const shown = clusters.filter((c) => area === "all" || c.governorate === area);
  const cluster = clusters.find((c) => c.slug === clusterSlug);

  if (cluster) {
    return (
      <div>
        <button type="button" onClick={() => setClusterSlug(null)} className="mb-4 inline-flex items-center gap-2 rounded-full bg-sand px-4 py-2 font-bold text-green-dark hover:bg-gold-light">
          <ArrowRight className="size-5" /> رجوع إلى دليل المجموعات
        </button>
        <ClusterDetail cluster={cluster} />
        <p className="mb-3 mt-8 font-display text-xl font-bold text-green-dark">مجموعات {cluster.name}</p>
        <div className="grid gap-3 md:grid-cols-2">
          {cluster.groups.map((g) => (
            <GroupCard key={g.no} cluster={cluster} g={g} app={app} post={post} sessionId={sessionId} current={excludeGroup === g.no} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[...areas, "all"].map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setArea(a)}
            className={cn("rounded-full px-4 py-2 text-sm font-bold transition", area === a ? "bg-green-dark text-white" : "bg-white text-ink-soft ring-1 ring-gold/40 hover:text-ink")}
          >
            {a === "all" ? "كل المكاتب" : `مكتب ${a}`}
            {a === app.governorate && " (مكتبك)"}
          </button>
        ))}
      </div>
      {shown.length === 0 && <p className="rounded-2xl bg-sand p-5 text-ink-soft">لا تكتلات معتمدة في هذا المكتب بعد. اختر «كل المكاتب» لرؤية بقية المجموعات.</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((c, i) => {
          const seats = c.groups.reduce((a, g) => a + g.remaining, 0);
          return (
            <motion.button
              key={c.slug}
              type="button"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
              whileHover={{ y: -6 }}
              onClick={() => setClusterSlug(c.slug)}
              className="group relative flex flex-col overflow-hidden rounded-[2rem] border-2 border-gold/40 bg-white text-right shadow-sm transition-shadow hover:shadow-2xl"
            >
              <div className={cn("relative p-5 text-white", c.tone === "gold" ? "bg-gradient-to-br from-gold-dark to-maroon" : c.tone === "maroon" ? "bg-gradient-to-br from-maroon to-maroon-dark" : "bg-gradient-to-br from-green to-green-dark")}>
                <div className="bg-pattern absolute inset-0 opacity-15" />
                <p className="relative text-xs text-white/75">
                  منذ {c.since} — مكتب {c.governorate}
                </p>
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
                  <span className="text-sm text-ink-soft">
                    الغرفة الخاصة: <b className="text-ink">+{formatUSD(c.privateRoomDiff)}</b>
                  </span>
                  <span className={cn("text-sm font-bold", seats ? "text-green" : "text-maroon")}>{seats} مقعداً متاحاً</span>
                </div>
                <span className="mt-1 flex items-center justify-center gap-2 rounded-2xl bg-sand py-3 font-bold text-green-dark transition group-hover:bg-green-dark group-hover:text-white">
                  المجموعات ومنسقوها
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      <details className="group/cmp mt-6 overflow-hidden rounded-3xl border border-gold/40 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 text-lg font-bold text-green-dark">
          <span className="flex items-center gap-2">
            <ArrowLeftRight className="size-5" /> جدول المقارنة بين التكتلات
          </span>
          <span className="text-sm text-hint group-open/cmp:hidden">اضغط للعرض</span>
        </summary>
        <div className="scrollbar-none overflow-x-auto border-t border-gold-light">
          <table className="w-full min-w-[56rem] text-right text-sm">
            <tbody>
              {(
                [
                  ["المكتب", (c: Cluster) => c.governorate],
                  ["المستوى", (c: Cluster) => c.level],
                  ["التقييم", (c: Cluster) => `★ ${c.rating}`],
                  ["فندق مكة", (c: Cluster) => `${c.makkah.hotel} — ${c.makkah.distance}`],
                  ["فندق المدينة", (c: Cluster) => `${c.madinah.hotel} — ${c.madinah.distance}`],
                  ["النقل", (c: Cluster) => c.transport[0]],
                  ["الوجبات", (c: Cluster) => c.meals.join("، ")],
                  ["البرامج", (c: Cluster) => c.programs.join("، ")],
                  ["فارق الغرفة الخاصة", (c: Cluster) => formatUSD(c.privateRoomDiff)],
                ] as const
              ).map(([label, get], ri) => (
                <tr key={label} className={ri % 2 ? "bg-sand/50" : ""}>
                  <th className="sticky right-0 w-36 bg-inherit p-3 font-bold text-gold-dark">{label}</th>
                  {shown.map((c) => (
                    <td key={c.slug} className="p-3 align-top leading-6">
                      {get(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

/**
 * One group: its leader, seats, and the coordinator to call. Enrollment itself is the coordinator's
 * action — in the demo the pilgrim can play the call: the coordinator sends the contract, the pilgrim
 * signs it with a code on his phone, and the whole family joins (or moves) together.
 */
function GroupCard({ cluster, g, app, post, sessionId, current }: { cluster: Cluster; g: ClusterGroup; current?: boolean } & DirProps) {
  const toast = useToast();
  const info = groupInfo(cluster.slug, g.no);
  const coordinator = coordinatorOf(info);
  const n = app.members.length;
  const full = g.remaining < n;
  const [contract, setContract] = useState(false);
  const [otp, setOtp] = useState("");

  const sign = () => {
    const moving = !!post.groupApprovedAt;
    enrollFamily({
      sessionId,
      app,
      post,
      group: { clusterId: cluster.slug, number: g.no },
      coordinator: { id: g.no === 27 && cluster.slug === "al-nour" ? COORDINATOR_ID : `coord-${g.no}`, name: coordinator.name },
      at: Date.now(),
    });
    toast({
      title: moving ? `انتقلتم إلى المجموعة ${g.no}` : `سجّلكم ${coordinator.name} في المجموعة ${g.no}`,
      body: `${n > 1 ? `جميع أفراد الطلب (${n}) معاً. ` : ""}وقّعتم عقد الحاج مع المجموعة.`,
      icon: "🤝",
      tone: "success",
    });
    setContract(false);
  };

  return (
    <div className={cn("rounded-3xl border-2 bg-white p-5", current ? "border-green-dark" : "border-gold/40")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-bold text-green-dark">المجموعة {g.no}</p>
          <p className="text-sm text-ink-soft">رئيسها: {g.leader}</p>
        </div>
        {current ? <Badge tone="green">مجموعتكم الحالية</Badge> : <Badge tone={full ? "maroon" : "green"}>{g.remaining === 0 ? "مكتملة" : `بقي ${g.remaining} مقاعد`}</Badge>}
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-gold-light">
        <div className={cn("h-full rounded-full", full ? "bg-maroon" : "bg-green-light")} style={{ width: `${((g.capacity - g.remaining) / g.capacity) * 100}%` }} />
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-sand p-3">
        <span className="grid size-11 place-items-center rounded-xl bg-green-dark font-display font-bold text-gold">{coordinator.name[0]}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gold-dark">المنسق التقني — يسجّلكم في المجموعة</p>
          <p className="font-bold">{coordinator.name}</p>
        </div>
        <button
          type="button"
          onClick={() => toast({ title: `اتصال بـ ${coordinator.name}`, body: `${coordinator.phone} — اتفقوا معه، فيسجّلكم ويرسل إليكم العقد للتوقيع.`, icon: "📞" })}
          className="grid size-10 place-items-center rounded-xl bg-white text-green-dark ring-1 ring-gold/40 hover:bg-gold-light"
          aria-label={`اتصال بـ ${coordinator.name}`}
        >
          <Phone className="size-4" />
        </button>
      </div>
      {!current && (
        <button
          type="button"
          disabled={full}
          onClick={() => setContract(true)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gold-dark p-3 text-sm font-bold text-gold-dark transition hover:bg-gold/10 disabled:opacity-40"
        >
          <MessageCircle className="size-4" /> {full ? `لا تتسع لأفراد طلبكم (${n})` : "محاكاة: اتفقنا مع المنسق — سجّلنا وأرسل العقد"}
        </button>
      )}

      <Modal open={contract} onClose={() => setContract(false)}>
        <div>
          <p className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark">
            <FileSignature className="size-7" /> عقد الحاج مع المجموعة {g.no}
          </p>
          <p className="mt-2 leading-7 text-ink-soft">
            أرسل المنسق {coordinator.name} طلب تسجيلكم في المجموعة {g.no} — {cluster.name}.
            {post.groupApprovedAt ? ` ستنتقلون من المجموعة ${post.groupNumber} إليها جميعاً، ولا ينتقل أحد وحده.` : ""}
          </p>
          <ul className="mt-4 space-y-1.5 rounded-2xl bg-sand p-4 text-sm">
            {app.members.map((m) => (
              <li key={m.person.id} className="flex items-center gap-2">
                <UserCheck className="size-4 text-green" /> {fullName(m.person)} — {m.relation === "self" ? "صاحب الطلب" : relationLabel(m.relation, m.person.gender)}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm font-bold">أدخل رمز الموافقة الذي وصل إلى هاتفك لتوقيع العقد</p>
          <div className="mt-2">
            <OtpInput value={otp} onChange={setOtp} />
          </div>
          <button type="button" onClick={() => setOtp(DEMO_OTP)} className="mt-2 text-sm text-hint">
            رمز تجريبي: <span className="font-mono font-bold text-green-dark underline">{DEMO_OTP}</span>
          </button>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setContract(false)}>
              إلغاء
            </Button>
            <Button disabled={otp !== DEMO_OTP} onClick={sign}>
              <FileSignature className="size-4" /> أوافق وأوقّع العقد
            </Button>
          </div>
        </div>
      </Modal>
    </div>
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

function ClusterDetail({ cluster: c }: { cluster: Cluster }) {
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
          <span className="rounded-full bg-white/15 px-3 py-1">
            {c.groupsCount} مجموعة — {c.pilgrims} حاج
          </span>
          <span className="rounded-full bg-white/15 px-3 py-1">مكتب {c.office}</span>
        </div>
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-2 md:p-8">
        <Block icon={<Building2 className="size-5" />} title="السكن في مكة">
          <p className="font-bold">
            {c.makkah.hotel} — {c.makkah.area}
          </p>
          <p>
            {c.makkah.distance} — {c.makkah.rooms}
          </p>
        </Block>
        <Block icon={<Landmark className="size-5" />} title="السكن في المدينة">
          <p className="font-bold">
            {c.madinah.hotel} — {c.madinah.area}
          </p>
          <p>{c.madinah.distance}</p>
        </Block>
        <Block icon={<Bus className="size-5" />} title="النقل والوجبات">
          <ul className="list-inside list-disc">
            {[...c.transport.slice(0, 2), ...c.meals.slice(0, 1)].map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Block>
        <Block icon={<UsersRound className="size-5" />} title="البرامج والتكلفة">
          <p>{c.programs.join("، ")}</p>
          <p className="font-bold text-maroon">الغرفة الخاصة: فارق {formatUSD(c.privateRoomDiff)}</p>
        </Block>
      </div>
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

/** "مجموعتي" after enrollment — and the way to move: the whole application, through the new group's coordinator */
export function MyGroup({ app, post, sessionId }: StepProps) {
  const [moving, setMoving] = useState(false);
  const info = groupInfo(post.clusterId, post.groupNumber);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-green-dark p-5 text-white">
          <p className="text-sm text-gold">مجموعتي</p>
          <p className="font-display text-2xl font-bold">
            المجموعة {info.number} — {info.clusterName.replace("تكتل ", "")}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-white/75">
            <Building2 className="size-4" /> {info.office} — مستوى الخدمة: {info.level}
          </p>
          {post.enrolledBy && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/75">
              <FileSignature className="size-4" /> سجّلكم المنسق {post.enrolledBy.name} ووقّعتم العقد
            </p>
          )}
          <ul className="mt-3 space-y-1 text-sm">
            {info.team.map((t) => (
              <li key={t.name}>
                <span className="text-white/60">{t.role}:</span> <b>{t.name}</b>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl bg-sand p-5">
          <p className="font-bold text-green-dark">أفراد الطلب في المجموعة</p>
          <ul className="mt-3 space-y-2">
            {app.members.map((m) => (
              <li key={m.person.id} className="rounded-2xl bg-white p-2.5 pr-3 font-semibold">
                {m.person.firstName} <span className="text-sm font-normal text-hint">— {m.relation === "self" ? "صاحب الطلب" : relationLabel(m.relation, m.person.gender)}</span>
              </li>
            ))}
          </ul>
          {post.transfers?.length ? (
            <p className="mt-3 text-sm text-hint">
              انتقلتم سابقاً: {post.transfers.map((t) => `${t.from} ← ${t.to}`).join("، ")}
            </p>
          ) : null}
        </div>
      </div>

      <div className="rounded-3xl border border-gold/40 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-bold text-green-dark">
            <ArrowLeftRight className="size-5" /> الانتقال إلى مجموعة أخرى
          </p>
          <Button size="sm" variant="outline" onClick={() => setMoving((v) => !v)}>
            {moving ? "إغلاق الدليل" : "تصفّح المجموعات"}
          </Button>
        </div>
        <p className="mt-1 text-sm leading-7 text-ink-soft">
          خلال مرحلة التفويج يمكنكم الانتقال: تتواصلون مع منسق المجموعة الجديدة فيسجّلكم فيها. {app.members.length > 1 ? "الطلب العائلي ينتقل كاملاً — كل الأفراد أو لا أحد." : ""}
        </p>
        <AnimatePresence>
          {moving && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-5 overflow-hidden">
              <Directory app={app} post={post} sessionId={sessionId} excludeGroup={post.groupNumber} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
