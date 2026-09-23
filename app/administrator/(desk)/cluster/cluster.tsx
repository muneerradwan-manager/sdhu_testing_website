"use client";

import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import { BadgeCheck, Building2, Check, CircleDashed, Crown, FileSignature, Inbox, Lock, Megaphone, Send, UserCheck, UsersRound, Vote, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Card } from "@/components/portal/shell";
import { DEMO_OTP, OtpInput } from "@/components/portal/bits";
import { PayMethods, payMethodLabel, type PayMethod } from "@/components/payment/methods";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, Modal, useToast } from "@/components/ui/widgets";
import { clustersNow } from "@/lib/cms/content";
import { getPerson } from "@/lib/registry";
import { SEASON } from "@/lib/season";
import { useSeason } from "@/lib/season-live";
import { actions, useStore, type AdminProfile } from "@/lib/store";
import { cn, formatUSD } from "@/lib/utils";
import { DEMO_ADMINS, adminName, candidacy, deputyEligible, lastServed, logAdmin, nowMs, seasonHistory, useAdmin, type ClusterRules } from "../../_lib/admin";
import { AdminShell, LockedCard, SectionTitle } from "../../_components/ui";
import { HEADS_POOL as SEED_HEADS, clusterGroupsOf, clusterTotals, clusterViewOf } from "../../_lib/cluster";
import { StandingCard } from "../../_components/standing";


type Candidate = { id: string; name: string; group: number; seasons: number; rating: number; votes: number; real: boolean };

function isGroupHead(p: AdminProfile | undefined) {
  return p?.positions[0] === "group-head";
}

/**
 * التكتلات. لا يتقدم أحد لرئاسة تكتل: الإدارة تعلن عدد التكتلات وشروط الترشح، ويرشّح رؤساء المجموعات
 * المستوفون أنفسهم، ويصوّت رؤساء المجموعات. المنتخب يبقى رئيساً لمجموعته ويدير التكتل كاملاً: ينشئه
 * (برسمه)، ويختار معاونه من رؤساء المجموعات السابقين، ويقرر في طلبات المجموعات بحسب سعته — لا إجبار،
 * ويوقّع مع كل مجموعة عقداً.
 */
export function AdminCluster() {
  const admin = useAdmin()!;
  const p = admin.profile;
  const season = useSeason();
  const election = useStore((s) => s.election);
  const admins = useStore((s) => s.admins);
  const rules = season.administrators;

  if (!p?.positions?.length) {
    return (
      <AdminShell title="التكتلات" subtitle="رؤساء التكتلات يُنتخبون من رؤساء المجموعات بعد اعتماد المجموعات.">
        <LockedCard title="بعد اعتماد مجموعتك" text="سجّل لموسم 1448 رئيساً لمجموعة، وشكّل مجموعتك واعتمدها؛ ثم تفتح الإدارة الترشيح لرئاسة التكتلات ويصوّت رؤساء المجموعات." href="/administrator/apply" cta="التسجيل الموسمي" />
      </AdminShell>
    );
  }
  if (!isGroupHead(p)) {
    return (
      <AdminShell title="التكتلات" subtitle="رؤساء التكتلات يُنتخبون من رؤساء المجموعات، وكل رئيس يختار معاونه ويقرر في طلبات المجموعات.">
        <LockedCard title="هذه الصفحة لرؤساء المجموعات" text="الترشح والتصويت وإنشاء التكتل وطلب الانضمام إليه من صلاحيات رئيس المجموعة. بقية الصفات تتبع مجموعتها إلى تكتلها." href="/administrator/dashboard" cta="ملفي" />
      </AdminShell>
    );
  }
  if (!p?.group?.approvedAt) {
    return (
      <AdminShell title="التكتلات" subtitle="بعد تشكيل كل المجموعات واعتمادها يُنتخب رؤساء التكتلات.">
        <LockedCard title="بعد اعتماد مجموعتك" text="التكتلات مرحلة لاحقة: تُشكَّل المجموعات وتُعتمد أولاً، ثم تفتح الإدارة الترشيح لرئاسة التكتلات." href="/administrator/group" cta="مجموعتي" />
      </AdminShell>
    );
  }

  const elected = election.elected ?? [];
  const iAmElected = elected.includes(admin.id);
  const phase = p.deputyOf ? "deputy" : !election.openedAt ? "waiting" : !election.closedAt ? "voting" : iAmElected ? (p.cluster ? "manage" : "create") : "join";

  const myCluster = clusterViewOf(p, admin.name);
  return (
    <AdminShell
      title={myCluster ? myCluster.name : "التكتلات"}
      subtitle={
        myCluster
          ? myCluster.isHead
            ? `تكتلك الذي انتُخبت رئيساً له. تدير مجموعاته وتقرر في طلبات الانضمام إليه بحسب سعته — ${myCluster.capacityGroups} مجموعات.`
            : `تكتلك الذي اختارك رئيسه ${myCluster.headName} معاوناً له. تتابع مجموعاته وتنوب عنه في متابعتها.`
          : `${rules.clusterCount} تكتلات هذا الموسم بقرار الإدارة. رؤساؤها يُنتخبون من رؤساء المجموعات (${SEASON.administrators.clusters.window})، ثم تطلب كل مجموعة الانضمام إلى التكتل الذي تختاره ويقرر رئيسه.`
      }
    >
      <AnimatePresence mode="wait">
        <motion.div key={phase} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
          {phase === "waiting" && <Waiting rules={rules} />}
          {phase === "voting" && <Election rules={rules} admins={admins} />}
          {phase === "create" && <CreateCluster rules={rules} admins={admins} />}
          {phase === "manage" && <ManageCluster admins={admins} />}
          {phase === "deputy" && <DeputyCluster />}
          {phase === "join" && <JoinCluster admins={admins} />}
        </motion.div>
      </AnimatePresence>
    </AdminShell>
  );
}

// ───────────────────────── Waiting for the administration ─────────────────────────

function Waiting({ rules }: { rules: ClusterRules }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const c = candidacy(admin.id, rules);
  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <Card>
        <SectionTitle icon={Megaphone}>بانتظار إعلان الإدارة</SectionTitle>
        <p className="mt-2 leading-8 text-ink-soft">
          بعد اعتماد كل المجموعات تعلن الإدارة عدد التكتلات وتفتح باب الترشح لرئاستها. الرئيس ليس صفة يُتقدَّم إليها: هو رئيس مجموعة ينتخبه زملاؤه رؤساء المجموعات ليدير التكتل كاملاً، ويبقى رئيساً لمجموعته.
        </p>
        <ul className="mt-5 space-y-2 text-sm">
          {[
            `عدد التكتلات هذا الموسم: ${rules.clusterCount}`,
            `شرط الترشح: ${rules.clusterHeadSeasons} مواسم متتالية رئيساً لمجموعة بتقييم ${rules.clusterHeadMinRating} فأكثر`,
            `المعاون يختاره الرئيس المنتخب، ويُشترط أن يكون رئيس مجموعة سابقاً (${rules.deputySeasons} ${rules.deputySeasons === 1 ? "موسماً" : "مواسم"} فأكثر)`,
            `رسم إنشاء التكتل ${formatUSD(SEASON.fees.clusterFormation)} يدفعه الرئيس المنتخب`,
          ].map((t) => (
            <li key={t} className="flex gap-2 rounded-xl bg-sand px-3 py-2">
              <Check className="mt-0.5 size-4 shrink-0 text-green-light" /> {t}
            </li>
          ))}
        </ul>
        <p className={cn("mt-5 rounded-2xl p-4 text-sm font-semibold", c.ok ? "bg-green-light/10 text-green" : "bg-gold/20 text-maroon")}>
          {c.ok ? `تستوفي شروط الترشح: ${c.reason}.` : `لا تستوفي شروط الترشح: ${c.reason}. يمكنك التصويت فقط.`}
        </p>
      </Card>
      <div className="rounded-[2rem] border-2 border-dashed border-maroon/30 bg-white p-6 text-center">
        <p className="text-sm text-ink-soft">في الموسم الفعلي تفتح مديرة الموسم الترشيح من لوحة الموظفين.</p>
        <Button
          variant="maroon"
          className="mt-4"
          onClick={() => {
            actions.setElection({ openedAt: nowMs(), closedAt: undefined, elected: undefined });
            actions.logEvent({ actor: "سهى مراد (محاكاة)", role: "مديرة الموسم", action: "فتح الترشيح لرئاسة التكتلات", target: `${rules.clusterCount} تكتلات`, detail: `الشرط: ${rules.clusterHeadSeasons} مواسم متتالية رئيساً لمجموعة بتقييم ${rules.clusterHeadMinRating}+` });
            toast({ title: `فُتح الترشيح لـ ${rules.clusterCount} تكتلات`, body: "يرشّح المستوفون أنفسهم، ويصوّت رؤساء المجموعات.", icon: "📣", tone: "gold" });
          }}
        >
          محاكاة: الإدارة تفتح الترشيح
        </Button>
      </div>
    </div>
  );
}

// ───────────────────────── Candidacy and vote ─────────────────────────

function useCandidates(admins: Record<string, AdminProfile>): Candidate[] {
  return useMemo(() => {
    const real: Candidate[] = Object.values(admins)
      .filter((a) => a.candidate && isGroupHead(a))
      .map((a) => ({
        id: a.nationalId,
        name: adminName(a.nationalId),
        group: a.group?.number ?? 0,
        seasons: seasonHistory(a.nationalId).filter((h) => h.roleKey === "group-head").length,
        rating: lastServed(a.nationalId)?.rating ?? 0,
        votes: Object.values(admins).filter((v) => v.vote === a.nationalId).length,
        real: true,
      }));
    const seeds: Candidate[] = SEED_HEADS.filter((s) => s.candidate).map((s) => ({ ...s, votes: s.votes + Object.values(admins).filter((v) => v.vote === s.id).length, real: false }));
    return [...real, ...seeds].sort((a, b) => b.votes - a.votes);
  }, [admins]);
}

function Election({ rules, admins }: { rules: ClusterRules; admins: Record<string, AdminProfile> }) {
  const admin = useAdmin()!;
  const p = admin.profile!;
  const toast = useToast();
  const c = candidacy(admin.id, rules);
  const candidates = useCandidates(admins);
  const [statement, setStatement] = useState("");
  const voters = 12 + Object.values(admins).filter((a) => isGroupHead(a)).length;
  const votesCast = candidates.reduce((n, x) => n + x.votes, 0);

  const stand = () => {
    actions.upsertAdmin(admin.id, { candidate: { at: nowMs(), statement: statement.trim() || "أرشّح نفسي لرئاسة تكتل هذا الموسم." } });
    logAdmin(admin.id, "الترشح لرئاسة تكتل", undefined, c.reason);
    toast({ title: "سُجّل ترشحك", body: "يراك رؤساء المجموعات في قائمة المرشحين.", icon: "🗳️", tone: "success" });
  };
  const vote = (id: string, name: string) => {
    actions.upsertAdmin(admin.id, { vote: id });
    logAdmin(admin.id, "التصويت لرئاسة تكتل", name);
    toast({ title: `صوّتَ لـ ${name}`, body: "صوت واحد لكل رئيس مجموعة، ويمكن تغييره حتى إغلاق التصويت.", icon: "✅", tone: "success" });
  };
  const close = () => {
    const elected = candidates.slice(0, rules.clusterCount).map((x) => x.id);
    actions.setElection({ closedAt: nowMs(), elected });
    actions.logEvent({ actor: "سهى مراد (محاكاة)", role: "مديرة الموسم", action: "إغلاق التصويت وإعلان رؤساء التكتلات", target: `${Math.min(rules.clusterCount, candidates.length)} رؤساء`, detail: candidates.slice(0, rules.clusterCount).map((x) => x.name).join("، ") });
    if (elected.includes(admin.id)) confetti({ particleCount: 160, spread: 90, origin: { y: 0.4 }, colors: ["#D9C89E", "#00594F", "#672146"] });
    toast({ title: "أُغلق التصويت", body: elected.includes(admin.id) ? "انتُخبت رئيساً لتكتل — أنشئ تكتلك الآن." : "أُعلن رؤساء التكتلات. اختر تكتلاً لمجموعتك.", icon: "🏁", tone: "gold" });
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-5">
        <Card>
          <SectionTitle icon={Vote} action={<Badge tone="gold">{votesCast} من {voters} صوّتوا</Badge>}>
            المرشحون لرئاسة {rules.clusterCount} تكتلات
          </SectionTitle>
          <p className="mt-2 text-sm leading-7 text-ink-soft">صوت واحد لكل رئيس مجموعة. يفوز أعلى {rules.clusterCount} مرشحين أصواتاً، وينشئ كل منهم تكتله.</p>
          <ul className="mt-4 space-y-2">
            {candidates.map((x, i) => {
              const mine = p.vote === x.id;
              const self = x.id === admin.id;
              return (
                <li key={x.id} className={cn("flex flex-wrap items-center gap-3 rounded-2xl border-2 p-3", mine ? "border-green-dark bg-green-dark/5" : "border-gold/30 bg-white")}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sand font-display text-lg font-bold text-maroon">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">
                      {x.name} {self && <Badge tone="gold">أنت</Badge>} {x.real && !self && <Badge tone="green">مرشح حقيقي</Badge>}
                    </p>
                    <p className="text-xs text-ink-soft">
                      رئيس المجموعة {x.group} — {x.seasons} مواسم رئيساً — تقييم {x.rating}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-green-dark">{x.votes} أصوات</span>
                  <Button size="sm" variant={mine ? "primary" : "outline"} disabled={self} onClick={() => vote(x.id, x.name)}>
                    {mine ? <><Check className="size-4" /> صوتي</> : "صوّت"}
                  </Button>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
      <aside className="space-y-4 lg:sticky lg:top-28">
        <Card className="md:p-6">
          <p className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
            <Crown className="size-5 text-gold-dark" /> ترشحي
          </p>
          {p.candidate ? (
            <p className="mt-2 rounded-2xl bg-green-light/10 p-3 text-sm font-semibold text-green">مرشح — سُجّل ترشحك ويظهر للجميع.</p>
          ) : c.ok ? (
            <>
              <p className="mt-2 text-sm text-green">تستوفي الشروط: {c.reason}.</p>
              <textarea value={statement} onChange={(e) => setStatement(e.target.value)} rows={3} placeholder="كلمة قصيرة لرؤساء المجموعات (اختياري)" className="mt-3 w-full rounded-2xl border-2 border-gold/40 p-3 text-sm outline-none focus:border-green-light" />
              <Button className="mt-3 w-full" onClick={stand}>
                <Crown className="size-4" /> أرشّح نفسي لرئاسة تكتل
              </Button>
            </>
          ) : (
            <p className="mt-2 rounded-2xl bg-gold/20 p-3 text-sm leading-6 text-maroon">
              <Lock className="mb-0.5 inline size-4" /> لا تستوفي شروط الترشح: {c.reason}. يمكنك التصويت.
            </p>
          )}
        </Card>
        <div className="rounded-[2rem] border-2 border-dashed border-maroon/30 bg-white p-5 text-center text-sm text-ink-soft">
          يُغلق التصويت في نهاية {SEASON.administrators.clusters.window}.
          <Button variant="maroon" size="sm" className="mt-3 w-full" onClick={close}>
            محاكاة: إغلاق التصويت وإعلان النتيجة
          </Button>
        </div>
      </aside>
    </div>
  );
}

// ───────────────────────── The elected head creates his cluster ─────────────────────────

function deputyPool(admins: Record<string, AdminProfile>, meId: string, rules: ClusterRules) {
  const real = Object.values(admins)
    .filter((a) => a.nationalId !== meId && isGroupHead(a))
    .map((a) => ({ id: a.nationalId, name: adminName(a.nationalId), ...deputyEligible(a.nationalId, rules) }));
  const demo = DEMO_ADMINS.filter((d) => d.position === "group-head" && d.id !== meId && !admins[d.id]).map((d) => ({ id: d.id, name: adminName(d.id), ...deputyEligible(d.id, rules) }));
  const seeds = SEED_HEADS.map((s) => ({ id: s.id, name: s.name, ok: s.seasons >= rules.deputySeasons, seasons: s.seasons }));
  return [...real, ...demo, ...seeds];
}

function CreateCluster({ rules, admins }: { rules: ClusterRules; admins: Record<string, AdminProfile> }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const fee = SEASON.fees.clusterFormation;
  const [name, setName] = useState(`تكتل ${getPerson(admin.id)?.firstName ?? ""} لخدمة الحجاج`);
  const [deputy, setDeputy] = useState<string>("");
  const [capacity, setCapacity] = useState(12);
  const [paying, setPaying] = useState(false);
  const pool = deputyPool(admins, admin.id, rules);
  const chosen = pool.find((d) => d.id === deputy);

  const create = (m: PayMethod) => {
    setPaying(true);
    setTimeout(() => {
      const at = nowMs();
      const id = `cluster-${admin.id.slice(-4)}`;
      actions.upsertAdmin(admin.id, {
        cluster: { id, name, deputyId: chosen?.id, deputyName: chosen?.name, capacityGroups: capacity, createdAt: at, feePaidAt: at, decisions: {} },
        group: { ...admin.profile!.group!, clusterId: id },
      });
      logAdmin(admin.id, `إنشاء ${name}`, `المعاون: ${chosen?.name ?? "—"}`, `السعة ${capacity} مجموعات — رسم الإنشاء ${formatUSD(fee)} — ${payMethodLabel(m)}`);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.4 }, colors: ["#D9C89E", "#00594F"] });
      toast({ title: `أُنشئ ${name}`, body: `مجموعتك ${admin.profile?.group?.number} فيه، وتصلك الآن طلبات المجموعات.`, icon: "🏛️", tone: "success" });
      setPaying(false);
    }, 1800);
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.3fr_1fr]">
      <Card>
        <Badge tone="gold" className="text-sm">
          <Crown className="size-4" /> انتُخبت رئيساً لتكتل
        </Badge>
        <h2 className="mt-3 font-display text-3xl font-bold text-green-dark">أنشئ تكتلك</h2>
<p className="mt-2 leading-8 text-ink-soft">تبقى رئيساً لمجموعتك {admin.profile?.group?.number}، وترتفع مهامك إلى مستوى التكتل: تدير مجموعاته كلها، لكل واحدة رئيسها وفريقها. اختر معاونك من رؤساء المجموعات السابقين، وحدد كم مجموعة يتسع لها تكتلك.</p>
        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block font-bold">اسم التكتل</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="h-14 w-full rounded-2xl border-2 border-gold/50 px-4 outline-none focus:border-green-light" />
          </label>
          <div>
            <span className="mb-2 flex items-center justify-between font-bold">
              السعة <span className="font-display text-2xl text-maroon">{capacity} مجموعات</span>
            </span>
            <input type="range" min={4} max={20} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className="w-full accent-maroon" aria-label="السعة" />
            <p className="text-xs text-hint">بحسب استطاعتك في السكن والنقل — تقرر أنت في كل طلب انضمام.</p>
          </div>
          <div>
            <span className="mb-2 block font-bold">معاون رئيس التكتل — يجب أن يكون رئيس مجموعة سابقاً</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {pool.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  disabled={!d.ok}
                  onClick={() => setDeputy(d.id)}
                  className={cn("flex items-center gap-3 rounded-2xl border-2 p-3 text-right transition disabled:cursor-not-allowed disabled:opacity-50", deputy === d.id ? "border-green-dark bg-green-dark/5" : "border-gold/30 bg-white hover:border-gold-dark")}
                >
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", d.ok ? "bg-sand text-green-dark" : "bg-sand text-hint")}>{d.ok ? <UserCheck className="size-4" /> : <Lock className="size-4" />}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{d.name}</span>
                    <span className={cn("block text-xs", d.ok ? "text-ink-soft" : "text-maroon")}>{d.seasons} مواسم رئيساً لمجموعة{d.ok ? "" : ` — يشترط ${rules.deputySeasons}`}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>
      <Card className="md:p-7">
        <p className="font-display text-lg font-bold text-green-dark">رسم إنشاء التكتل</p>
        <p className="mt-1 font-display text-5xl font-bold text-maroon" dir="ltr">{formatUSD(fee)}</p>
        <p className="mt-2 text-sm text-ink-soft">يُدفع مرة واحدة كل موسم عند إنشاء التكتل، ويصدر به إيصال رقمي.</p>
        {paying ? (
          <p className="mt-6 text-center font-bold text-green-dark">نتحقق من الدفع وننشئ التكتل...</p>
        ) : (
          <div className={cn("mt-5", (!chosen || !name.trim()) && "pointer-events-none opacity-40")}>
            {(!chosen || !name.trim()) && <p className="mb-2 text-sm font-bold text-maroon">اختر المعاون واسم التكتل أولاً</p>}
            <PayMethods amount={fee} reference={`1448-C-${admin.id.slice(-4)}`} bankReference={`1448-BANK-C${admin.id.slice(-4)}`} cta="ادفع وأنشئ التكتل —" onConfirm={create} />
          </div>
        )}
      </Card>
    </div>
  );
}

// ───────────────────────── The head manages requests ─────────────────────────

type JoinReq = { id: string; head: string; group: number; capacity: number; rating: number | null; note: string; real: boolean };

const SEED_REQUESTS: JoinReq[] = [
  { id: "seed-02", head: "فراس البيطار", group: 9, capacity: 50, rating: 4.2, note: "مجموعة عائلات من الميدان — 3 مواسم بلا شكاوى.", real: false },
  { id: "seed-08", head: "ماهر الجابي", group: 55, capacity: 45, rating: 4.0, note: "مجموعة جديدة من حلب، رئيسها موسمان.", real: false },
  { id: "seed-09", head: "غسان النحاس", group: 44, capacity: 50, rating: 3.9, note: "رئيسها موسم واحد — 4 شكاوى في الإعاشة الموسم الماضي.", real: false },
];

function ManageCluster({ admins }: { admins: Record<string, AdminProfile> }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const cluster = admin.profile!.cluster!;
  const [declining, setDeclining] = useState<JoinReq | null>(null);
  const [reason, setReason] = useState("اكتملت سعة التكتل");

  const real: JoinReq[] = Object.values(admins)
    .filter((a) => a.clusterRequest?.clusterId === cluster.id && a.nationalId !== admin.id)
    .map((a) => ({ id: a.nationalId, head: adminName(a.nationalId), group: a.group?.number ?? 0, capacity: a.group?.capacity ?? 50, rating: lastServed(a.nationalId)?.rating ?? null, note: "طلب حقيقي من بوابة الإداريين", real: true }));
  const all = [...real, ...SEED_REQUESTS];
  const pending = all.filter((r) => !cluster.decisions[r.id]);
  const myGroups = clusterGroupsOf(admin.profile, admin.name);
  const used = clusterTotals(myGroups).groups;

  const decide = (r: JoinReq, status: "accepted" | "declined", why?: string) => {
    if (status === "accepted" && used >= cluster.capacityGroups) {
      return toast({ title: "اكتملت سعة التكتل", body: `${used} من ${cluster.capacityGroups} مجموعات.`, icon: "⛔", tone: "warning" });
    }
    const at = nowMs();
    actions.upsertAdmin(admin.id, { cluster: { ...cluster, decisions: { ...cluster.decisions, [r.id]: { status, at, reason: why } } } });
    if (r.real) {
      const a = admins[r.id];
      actions.upsertAdmin(r.id, { clusterRequest: { ...a.clusterRequest!, status, reason: why } });
    }
    logAdmin(admin.id, status === "accepted" ? `قبول انضمام المجموعة ${r.group} إلى ${cluster.name}` : `رفض انضمام المجموعة ${r.group}`, r.head, why ?? `السعة بعد القبول ${used + 1} من ${cluster.capacityGroups}`);
    toast(status === "accepted" ? { title: `قُبلت المجموعة ${r.group}`, body: "يصل رئيسها العقد ليوقّعه.", icon: "🤝", tone: "success" } : { title: `رُفض طلب المجموعة ${r.group}`, body: "يصل السبب إلى رئيسها ليختار تكتلاً آخر.", icon: "📩", tone: "info" });
    setDeclining(null);
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-5">
        <Card className="md:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm text-hint">التكتل — رئيسه أنت</p>
              <h2 className="font-display text-3xl font-bold text-green-dark">{cluster.name}</h2>
              <p className="mt-1 text-sm text-ink-soft">المعاون: <b>{cluster.deputyName ?? "—"}</b> — رسم الإنشاء مسدد</p>
            </div>
            <p className="font-display text-3xl font-bold text-green-dark">
              {used} <span className="text-lg text-hint">/ {cluster.capacityGroups} مجموعات</span>
            </p>
          </div>
        </Card>
        <StandingCard scope="cluster" name={cluster.name} />
        <Card>
          <SectionTitle icon={Inbox} action={<Badge tone="gold">{pending.length} بانتظار قرارك</Badge>}>
            طلبات الانضمام إلى تكتلك
          </SectionTitle>
          <p className="mt-2 text-sm leading-7 text-ink-soft">لا تُجبر على قبول مجموعة: انظر في سعتك وفي المجموعة، واقبل أو ارفض مع السبب. القبول يُتبع بعقد بين المجموعة والتكتل.</p>
          <ul className="mt-4 space-y-3">
            {pending.length === 0 && <li className="rounded-2xl bg-sand p-4 text-sm text-hint">لا طلبات جديدة.</li>}
            {pending.map((r) => (
              <li key={r.id} className={cn("rounded-2xl border-2 p-4", r.real ? "border-gold-dark/60 ring-2 ring-gold/30" : "border-gold/30")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">
                      المجموعة {r.group} — {r.head} {r.real && <Badge tone="gold">طلب حقيقي</Badge>}
                    </p>
                    <p className="text-xs text-ink-soft">
                      السعة {r.capacity} حاجاً — تقييم رئيسها {r.rating ?? "—"}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">{r.note}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setDeclining(r)}>
                      <X className="size-4" /> رفض
                    </Button>
                    <Button size="sm" onClick={() => decide(r, "accepted")}>
                      <Check className="size-4" /> قبول
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <aside className="space-y-4 lg:sticky lg:top-28">
        <Card className="md:p-6">
          <p className="font-bold text-green-dark">مجموعات التكتل — {used} مجموعة تديرها</p>
          <ul className="mt-3 space-y-2 text-sm">
            {myGroups.map((x) => (
              <li key={x.id} className="flex items-center gap-2 rounded-xl bg-sand px-3 py-2">
                {x.own ? <Crown className="size-4 shrink-0 text-gold-dark" /> : <BadgeCheck className="size-4 shrink-0 text-green-light" />}
                <span className="min-w-0 truncate">
                  المجموعة {x.number} — {x.own ? `${admin.name} (مجموعتك)` : x.head}
                </span>
              </li>
            ))}
          </ul>
          <ButtonLink href="/administrator/group" size="sm" variant="outline" className="mt-3 w-full">
            شاشة مجموعات تكتلي
          </ButtonLink>
        </Card>
        <div className="rounded-3xl bg-green-dark p-5 text-sm leading-7 text-white/85">
          <p className="font-bold text-gold">قواعد التكتل</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>الرئيس منتخب من رؤساء المجموعات، يبقى رئيساً لمجموعته وتضاف إليه إدارة مجموعات التكتل كلها.</li>
            <li>المعاون يختاره الرئيس، ويُشترط أن يكون رئيس مجموعة سابقاً.</li>
            <li>الانضمام بطلب من المجموعة وقرار من الرئيس — لا إجبار.</li>
            <li>لكل مجموعة عقد مع التكتل، وللتكتل عقد مع الإدارة.</li>
          </ul>
        </div>
      </aside>

      <Modal open={!!declining} onClose={() => setDeclining(null)}>
        {declining && (
          <div>
            <h3 className="font-display text-2xl font-bold text-green-dark">رفض المجموعة {declining.group}</h3>
            <p className="mt-1 text-sm text-ink-soft">السبب يصل إلى رئيسها.</p>
            <div className="mt-4 space-y-2">
              {["اكتملت سعة التكتل", "المجموعة لا تناسب برنامج التكتل", "سجل الموسم السابق يحتاج مراجعة", "سبب آخر"].map((x) => (
                <label key={x} className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 text-sm font-semibold", reason === x ? "border-maroon bg-maroon/5" : "border-gold/40")}>
                  <input type="radio" name="why" checked={reason === x} onChange={() => setReason(x)} className="accent-maroon" /> {x}
                </label>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeclining(null)}>
                إلغاء
              </Button>
              <Button variant="maroon" onClick={() => decide(declining, "declined", reason)}>
                تأكيد الرفض
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ───────────────────────── The deputy's view of his cluster ─────────────────────────

/**
 * The deputy of an elected cluster head holds a cluster role too: he does not look for a cluster for
 * his group, he already works in one. He sees the cluster and its groups; the decisions on join
 * requests stay with the head.
 */
function DeputyCluster() {
  const admin = useAdmin()!;
  const view = clusterViewOf(admin.profile, admin.name)!;
  const groups = clusterGroupsOf(admin.profile, admin.name);
  const totals = clusterTotals(groups);
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card className="md:p-7">
        <Badge tone="gold" className="text-sm">
          <UserCheck className="size-4" /> معاون رئيس التكتل
        </Badge>
        <h2 className="mt-3 font-display text-3xl font-bold text-green-dark">{view.name}</h2>
        <p className="mt-2 leading-8 text-ink-soft">
          اختارك رئيس التكتل <b>{view.headName}</b> معاوناً له لأنك رئيس مجموعة سابق، فصارت صفتك هذا الموسم على مستوى التكتل: تنوب عنه في متابعة مجموعات التكتل كلها، وتبقى مجموعتك {admin.profile?.group?.number} إحداها.
        </p>
        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ["مجموعات التكتل", `${totals.groups}`, `من سعة ${view.capacityGroups}`],
            ["حجاج التكتل", `${totals.pilgrims}`, `من أصل ${totals.capacity} مقعداً`],
            ["رئيس التكتل", view.headName, `المجموعة ${view.headGroup}`],
          ].map(([k, v, hint]) => (
            <div key={k} className="rounded-2xl bg-sand p-3">
              <dt className="text-xs text-hint">{k}</dt>
              <dd className="mt-0.5 font-display text-xl font-bold text-green-dark">{v}</dd>
              <dd className="text-xs text-ink-soft">{hint}</dd>
            </div>
          ))}
        </dl>
        <ButtonLink href="/administrator/group" className="mt-6">
          مجموعات التكتل بالتفصيل
        </ButtonLink>
      </Card>
      <div className="space-y-4">
        <Card className="md:p-6">
          <p className="font-bold text-green-dark">مجموعات التكتل</p>
          <ul className="mt-3 space-y-2 text-sm">
            {groups.map((g) => (
              <li key={g.id} className="flex items-center gap-2 rounded-xl bg-sand px-3 py-2">
                {g.own ? <UserCheck className="size-4 shrink-0 text-gold-dark" /> : <BadgeCheck className="size-4 shrink-0 text-green-light" />}
                <span className="min-w-0 truncate">
                  المجموعة {g.number} — {g.own ? `${admin.name} (مجموعتك)` : g.head}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <div className="rounded-3xl bg-green-dark p-5 text-sm leading-7 text-white/85">
          <p className="font-bold text-gold">حدود صلاحيتك</p>
          <p className="mt-2">قبول طلبات انضمام المجموعات وتوقيع عقودها من صلاحية رئيس التكتل وحده. أنت تتابع وتنوب عنه عند غيابه، وتُرفع ملاحظاتك إليه وإلى الإدارة.</p>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── A group head joins a cluster ─────────────────────────

type ClusterCard = { id: string; name: string; head: string; deputy: string; capacityGroups: number; used: number; level?: string; real: boolean };

function JoinCluster({ admins }: { admins: Record<string, AdminProfile> }) {
  const admin = useAdmin()!;
  const p = admin.profile!;
  const toast = useToast();
  const req = p.clusterRequest;
  const [otp, setOtp] = useState("");

  const clusters: ClusterCard[] = useMemo(() => {
    const created: ClusterCard[] = Object.values(admins)
      .filter((a) => a.cluster)
      .map((a) => ({ id: a.cluster!.id, name: a.cluster!.name, head: adminName(a.nationalId), deputy: a.cluster!.deputyName ?? "—", capacityGroups: a.cluster!.capacityGroups, used: 1 + Object.values(a.cluster!.decisions).filter((d) => d.status === "accepted").length + 3, real: true }));
    const seeded: ClusterCard[] = clustersNow()
      .filter((c) => !created.some((x) => x.id === c.slug))
      .map((c) => ({ id: c.slug, name: c.name, head: c.slug === "al-nour" ? "عبد الرحمن العلي" : SEED_HEADS[c.groups[0]?.no % SEED_HEADS.length]?.name ?? c.groups[0]?.leader ?? "—", deputy: "—", capacityGroups: 12, used: c.groupsCount, level: c.level, real: false }));
    return [...created, ...seeded];
  }, [admins]);

  const request = (c: ClusterCard) => {
    actions.upsertAdmin(admin.id, { clusterRequest: { clusterId: c.id, at: nowMs(), status: "pending" } });
    logAdmin(admin.id, `طلب انضمام المجموعة ${p.group?.number} إلى ${c.name}`, c.head, "بانتظار قرار رئيس التكتل");
    toast({ title: `أُرسل طلبك إلى ${c.name}`, body: `يقرر رئيسه ${c.head} بحسب سعة التكتل.`, icon: "📨", tone: "info" });
  };
  const sign = () => {
    const at = nowMs();
    actions.upsertAdmin(admin.id, { clusterRequest: { ...req!, contractSignedAt: at }, group: { ...p.group!, clusterId: req!.clusterId } });
    const c = clusters.find((x) => x.id === req!.clusterId);
    logAdmin(admin.id, `توقيع عقد المجموعة ${p.group?.number} مع ${c?.name ?? "التكتل"}`, c?.head, "توقيع إلكتروني — مصادقة الإدارة");
    confetti({ particleCount: 140, spread: 90, origin: { y: 0.4 }, colors: ["#D9C89E", "#00594F", "#672146"] });
    toast({ title: "وُقّع العقد وصودق عليه", body: `مجموعتك الآن في ${c?.name}.`, icon: "✍️", tone: "success" });
  };
  const simulate = (status: "accepted" | "declined") => {
    actions.upsertAdmin(admin.id, { clusterRequest: { ...req!, status, reason: status === "declined" ? "اكتملت سعة التكتل" : undefined } });
    const c = clusters.find((x) => x.id === req!.clusterId);
    actions.logEvent({ actor: `${c?.head ?? "رئيس التكتل"} (محاكاة)`, role: "رئيس تكتل", action: status === "accepted" ? `قبول انضمام المجموعة ${p.group?.number}` : `رفض انضمام المجموعة ${p.group?.number}`, target: c?.name, detail: status === "declined" ? "اكتملت سعة التكتل" : "ضمن السعة — العقد للتوقيع" });
  };

  const current = req ? clusters.find((c) => c.id === req.clusterId) : undefined;

  if (req && req.status === "accepted" && !req.contractSignedAt) {
    return (
      <Card className="mx-auto max-w-2xl">
        <Badge tone="green">
          <BadgeCheck className="size-4" /> قبل رئيس التكتل طلبك
        </Badge>
        <h2 className="mt-3 font-display text-3xl font-bold text-green-dark">عقد المجموعة {p.group?.number} مع {current?.name}</h2>
        <ol className="mt-4 space-y-2 text-sm leading-7 text-ink-soft">
          {[
            `تنضم المجموعة ${p.group?.number} بسعة ${p.group?.capacity} حاجاً إلى ${current?.name} لموسم 1448هـ وتلتزم ببرنامجه المعتمد.`,
            `يلتزم رئيس المجموعة بتعليمات رئيس التكتل ${current?.head} في النقل والإسكان والمشاعر.`,
            "يُحاسَب التكتل والمجموعة بنظام الأسهم المعتمد، ويُقيَّمان ككيانين في المراحل التسع.",
            "أي خلاف يُحال إلى قسم شؤون التكتلات، وتُسجَّل القرارات في سجل الأحداث.",
          ].map((c, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-green-dark/8 font-bold text-green-dark">{i + 1}</span>
              <span>{c}</span>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-sm font-bold">أدخل رمز التحقق الذي وصل إلى هاتفك لتوقيع العقد</p>
        <div className="mt-2">
          <OtpInput value={otp} onChange={setOtp} />
        </div>
        <button type="button" onClick={() => setOtp(DEMO_OTP)} className="mt-2 text-sm text-hint">
          رمز تجريبي: <span className="font-mono font-bold text-green-dark underline">{DEMO_OTP}</span>
        </button>
        <Button size="xl" className="mt-6 w-full" disabled={otp !== DEMO_OTP} onClick={sign}>
          <FileSignature className="size-5" /> أوقّع العقد إلكترونياً
        </Button>
      </Card>
    );
  }

  if (req?.contractSignedAt) {
    return (
      <Card className="mx-auto max-w-2xl text-center">
        <span className="mx-auto grid size-20 place-items-center rounded-3xl bg-green-dark text-gold">
          <Building2 className="size-10" />
        </span>
        <h2 className="mt-5 font-display text-3xl font-bold text-green-dark">مجموعتك {p.group?.number} في {current?.name}</h2>
        <p className="mt-2 leading-8 text-ink-soft">
          رئيس التكتل: <b>{current?.head}</b> — المعاون: <b>{current?.deputy}</b>. العقد موقّع ومصادق عليه. حين تُفتح مرحلة التفويج يسجّل منسق مجموعتك الحجاج الذين يختارونها.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {req?.status === "pending" && (
        <Card className="border-2 border-gold-dark/50">
          <p className="flex items-center gap-2 font-bold text-green-dark">
            <CircleDashed className="size-5 animate-spin text-gold-dark" /> طلبك عند رئيس {current?.name} — {current?.head}
          </p>
          <p className="mt-1 text-sm text-ink-soft">يقرر بحسب سعة تكتله وما يراه في مجموعتك. يصلك القرار هنا.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <button type="button" onClick={() => simulate("accepted")} className="rounded-full border border-dashed border-gold-dark px-3 py-1 font-semibold text-maroon">
              محاكاة: قبِل
            </button>
            <button type="button" onClick={() => simulate("declined")} className="rounded-full border border-dashed border-maroon/40 px-3 py-1 font-semibold text-maroon/80">
              محاكاة: رفض
            </button>
            <button type="button" onClick={() => actions.upsertAdmin(admin.id, { clusterRequest: undefined })} className="rounded-full bg-sand px-3 py-1 font-semibold text-ink-soft">
              سحب الطلب
            </button>
          </div>
        </Card>
      )}
      {req?.status === "declined" && (
        <Card className="border-2 border-maroon/30">
          <p className="font-bold text-maroon">رفض رئيس {current?.name} طلبك: {req.reason}</p>
          <p className="mt-1 text-sm text-ink-soft">مقعد مجموعتك محفوظ. اختر تكتلاً آخر.</p>
        </Card>
      )}
      <Card>
        <SectionTitle icon={UsersRound}>اختر تكتلاً لمجموعتك {p.group?.number}</SectionTitle>
        <p className="mt-2 text-sm leading-7 text-ink-soft">أُعلن رؤساء التكتلات وأنشؤوا تكتلاتهم. اطلب الانضمام إلى ما يناسب مجموعتك؛ الرئيس يقرر بحسب سعته، ولا يُجبر على القبول ولا تُجبر على تكتل.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {clusters.map((c) => {
            const full = c.used >= c.capacityGroups;
            return (
              <div key={c.id} className={cn("rounded-2xl border-2 p-4", c.real ? "border-green-dark/40" : "border-gold/30")}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{c.name}</p>
                    <p className="text-xs text-ink-soft">
                      الرئيس: {c.head} — المعاون: {c.deputy}
                      {c.level && ` — ${c.level}`}
                    </p>
                  </div>
                  <Badge tone={full ? "maroon" : "green"}>
                    {c.used} / {c.capacityGroups}
                  </Badge>
                </div>
                <Button size="sm" className="mt-3 w-full" disabled={full || (!!req && req.status === "pending")} onClick={() => request(c)}>
                  <Send className="size-4" /> {full ? "مكتمل" : "طلب الانضمام"}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
