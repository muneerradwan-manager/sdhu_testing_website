"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  CheckCircle2,
  ChevronLeft,
  CircleDashed,
  ClipboardCheck,
  FileText,
  Link2,
  MapPin,
  Search,
  ShieldQuestion,
  UsersRound,
  Wallet,
  XCircle,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { REG_STATS } from "@/lib/data/staff-seed";
import { ageOf, relationLabel } from "@/lib/registry";
import type { CheckStatus } from "@/lib/rules";
import { useSeason } from "@/lib/season-live";
import { actions, useStore } from "@/lib/store";
import { cn, formatNumber, maskNationalId } from "@/lib/utils";
import { useReviewQueue, type ReviewItem } from "../_components/data";
import { BarList, Donut, Drawer, Empty, fmtDateTime, Gate, Kpi, Legend, logAs, PageHeader, Panel, Tabs, textareaClass, useStaffUser } from "../_components/kit";

type Filter = "pending" | "approved" | "rejected" | "all";

/** Chips tuned for the dark staff cards (the shared Badge is written for white surfaces) */
const CHIP = {
  green: "bg-green-light/25 text-white ring-green-light/40",
  gold: "bg-gold/20 text-gold ring-gold/40",
  maroon: "bg-maroon/70 text-white ring-maroon",
} as const;

function Chip({ tone, children }: { tone: keyof typeof CHIP; children: React.ReactNode }) {
  return <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1", CHIP[tone])}>{children}</span>;
}

export function ReviewsView() {
  return (
    <Gate perms={["registration.review"]}>
      <Reviews />
    </Gate>
  );
}

function Reviews() {
  const queue = useReviewQueue();
  const season = useSeason();
  const applications = useStore((s) => s.applications);
  const [filter, setFilter] = useState<Filter>("pending");
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const realApps = Object.values(applications);
  const realPersons = realApps.reduce((a, x) => a + x.members.length, 0);
  const realPaid = realApps.reduce((a, x) => a + (x.paid || 0), 0);

  const counts = useMemo(
    () => ({
      pending: queue.filter((q) => !q.review).length,
      approved: queue.filter((q) => q.review?.status === "approved").length,
      rejected: queue.filter((q) => q.review?.status === "rejected").length,
      all: queue.length,
    }),
    [queue],
  );

  const list = useMemo(() => {
    const q = query.trim();
    return queue.filter((item) => {
      if (filter === "pending" && item.review) return false;
      if (filter === "approved" && item.review?.status !== "approved") return false;
      if (filter === "rejected" && item.review?.status !== "rejected") return false;
      if (!q) return true;
      return item.number.includes(q) || item.name.includes(q) || item.office.includes(q) || item.caseLabel.includes(q) || item.members.some((m) => m.person.id.includes(q));
    });
  }, [queue, filter, query]);

  const open = queue.find((q) => q.key === openKey) ?? null;
  const close = useCallback(() => setOpenKey(null), []);

  return (
    <div>
      <PageHeader
        eyebrow="المرحلة 3 — تدقيق البيانات والتحقق من الأهلية"
        title="طلبات تحتاج مراجعة"
        icon={<ClipboardCheck />}
        description="طبّقت المنصة شروط الموسم على كل فرد في كل طلب. ما استوفى الشروط اعتُمد تلقائياً، وما يلي يحتاج قراراً بشرياً مع سبب مكتوب."
      />

      {/* Registration overview */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="الطلبات المقدّمة" value={REG_STATS.applications + realApps.length} icon={<FileText />} hint={realApps.length ? `+${realApps.length} من جلسة العرض` : "التسجيل على القبول المباشر 1448"} />
        <Kpi label="الأفراد في الطلبات" value={REG_STATS.persons + realPersons} icon={<UsersRound />} tone="teal" delay={0.05} />
        <Kpi label="رسوم التسجيل المحصّلة" value={REG_STATS.persons * season.fees.registrationPerPerson + realPaid} suffix=" $" icon={<Wallet />} tone="gold" delay={0.1} hint={`${season.fees.registrationPerPerson} $ للفرد`} />
        <Kpi label="بانتظار المراجعة" value={counts.pending} icon={<ShieldQuestion />} tone="maroon" delay={0.15} pulse={counts.pending > 0} hint={`من أصل ${formatNumber(REG_STATS.needsReview)} حالة في الموسم`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.3fr]">
        <Panel title="نتيجة التدقيق الآلي" icon={<BadgeCheck />} delay={0.1}>
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <Donut
              size={150}
              thickness={20}
              segments={[
                { value: REG_STATS.autoApproved, color: "#289E92", label: "auto" },
                { value: REG_STATS.needsReview, color: "#AD9E6E", label: "review" },
                { value: REG_STATS.rejected, color: "#672146", label: "rejected" },
              ]}
            >
              <div>
                <p className="font-display text-xl font-bold text-white">85%</p>
                <p className="text-[11px] text-white/75">مؤهل تلقائياً</p>
              </div>
            </Donut>
            <div className="w-full flex-1">
              <Legend
                items={[
                  { label: "مؤهل تلقائياً", color: "#289E92", value: formatNumber(REG_STATS.autoApproved) },
                  { label: "يحتاج مراجعة بشرية", color: "#AD9E6E", value: formatNumber(REG_STATS.needsReview) },
                  { label: "غير مؤهل بسبب واضح", color: "#672146", value: formatNumber(REG_STATS.rejected) },
                ]}
              />
            </div>
          </div>
        </Panel>
        <Panel title="الطلبات حسب المحافظة" icon={<MapPin />} delay={0.15}>
          <div className="grid gap-x-8 sm:grid-cols-2">
            <BarList items={REG_STATS.byGovernorate.slice(0, 5).map((g) => ({ label: g.name, value: g.value, key: g.name }))} max={REG_STATS.byGovernorate[0].value} color="bg-gold" />
            <div className="mt-3 sm:mt-0">
              <BarList items={REG_STATS.byGovernorate.slice(5).map((g) => ({ label: g.name, value: g.value, key: g.name }))} max={REG_STATS.byGovernorate[0].value} color="bg-green-light" />
            </div>
          </div>
        </Panel>
      </div>

      {/* Queue */}
      <Panel className="mt-6" delay={0.2}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Tabs
            id="reviews"
            value={filter}
            onChange={setFilter}
            tabs={[
              { value: "pending", label: "بانتظار القرار", count: counts.pending },
              { value: "approved", label: "معتمدة", count: counts.approved },
              { value: "rejected", label: "مرفوضة", count: counts.rejected },
              { value: "all", label: "الكل", count: counts.all },
            ]}
          />
          <label className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-white/70" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="رقم الطلب، الاسم، الرقم الوطني..."
              aria-label="بحث في الطلبات"
              className="h-11 w-full rounded-2xl border-2 border-white/15 bg-white/10 pr-9 pl-3 text-sm text-white outline-none transition placeholder:text-white/50 focus:border-gold"
            />
          </label>
        </div>

        {list.length === 0 ? (
          <Empty icon={<CheckCircle2 />} title="لا توجد طلبات هنا" text="جرّب تبويباً آخر أو امسح البحث." />
        ) : (
          <motion.ul layout className="grid gap-3 lg:grid-cols-2">
            <AnimatePresence initial={false}>
              {list.map((item, i) => (
                <motion.li key={item.key} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 10) * 0.03 } }} exit={{ opacity: 0, scale: 0.97 }}>
                  <QueueCard item={item} onOpen={() => setOpenKey(item.key)} />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </Panel>

      <Drawer
        open={!!open}
        onClose={close}
        title={open ? `الطلب رقم ${open.number} — ${open.name}` : ""}
        footer={open && <ReviewDecision key={open.key} item={open} onDone={close} />}
      >
        {open && <ReviewDetail key={open.key} item={open} />}
      </Drawer>
    </div>
  );
}

function QueueCard({ item, onOpen }: { item: ReviewItem; onOpen: () => void }) {
  const severe = item.flags.some((f) => f.tone === "maroon");
  return (
    <button
      onClick={onOpen}
      className={cn(
        "group relative flex w-full items-start gap-3 overflow-hidden rounded-2xl bg-white/[.06] p-4 text-right ring-1 transition hover:-translate-y-0.5 hover:bg-white/10 hover:shadow-lg hover:ring-gold/40",
        severe && !item.review ? "ring-maroon/80" : "ring-white/10",
      )}
    >
      <span className={cn("absolute inset-y-0 right-0 w-1", item.review?.status === "approved" ? "bg-green-light" : item.review?.status === "rejected" ? "bg-maroon" : severe ? "bg-maroon" : "bg-gold")} />
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-xl",
          item.review?.status === "approved" ? "bg-green-light/25 text-white" : item.review?.status === "rejected" || severe ? "bg-maroon/70 text-white" : "bg-gold/20 text-gold",
        )}
      >
        {item.review?.status === "approved" ? <CheckCircle2 className="size-5" /> : item.review?.status === "rejected" ? <Ban className="size-5" /> : <AlertTriangle className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-white/75">#{item.number}</span>
          <span className="font-bold text-white">{item.name}</span>
          {item.source === "real" && <Chip tone="gold">طلب من جلسة العرض</Chip>}
        </div>
        <p className="mt-1 text-sm font-bold text-gold">{item.caseLabel}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/75">
          <span>{item.office}</span>
          <span>{item.members.length} أفراد</span>
          <span>{item.mode}</span>
          <span>{fmtDateTime(item.submittedAt)}</span>
        </p>
      </div>
      <ChevronLeft className="mt-3 size-5 shrink-0 text-gold transition group-hover:-translate-x-1" />
    </button>
  );
}

const STATUS_ICON: Record<CheckStatus, { icon: typeof CheckCircle2; cls: string }> = {
  // filled discs keep green/maroon legible on the dark surfaces
  pass: { icon: CheckCircle2, cls: "fill-green-light text-white" },
  fail: { icon: XCircle, cls: "fill-maroon text-white" },
  warn: { icon: AlertTriangle, cls: "text-gold" },
  na: { icon: CircleDashed, cls: "text-white/70" },
};

function ReviewDetail({ item }: { item: ReviewItem }) {
  const [expanded, setExpanded] = useState<string | null>(item.members[0]?.person.id ?? null);

  return (
    <div className="space-y-5">
      {item.review && (
        <div className={cn("rounded-2xl p-4 ring-1", item.review.status === "approved" ? "bg-green-light/20 ring-green-light/50" : "bg-maroon/50 ring-maroon")}>
          <p className="flex items-center gap-2 font-bold text-white">
            {item.review.status === "approved" ? <CheckCircle2 className="size-4 text-gold" /> : <Ban className="size-4 text-gold" />}
            {item.review.status === "approved" ? "معتمد" : "مرفوض"} — {item.review.by} — {fmtDateTime(item.review.at)}
          </p>
          <p className="mt-1 text-sm text-white/90">السبب: {item.review.note}</p>
        </div>
      )}

      <section>
        <h3 className="mb-2 font-display font-bold text-gold">لماذا يحتاج مراجعة؟</h3>
        <ul className="space-y-2">
          {item.flags.map((f, i) => (
            <motion.li key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className={cn("rounded-2xl p-3 ring-1", f.tone === "maroon" ? "bg-maroon/50 ring-maroon" : "bg-gold/10 ring-gold/35")}>
              <p className={cn("flex items-center gap-2 font-bold", f.tone === "maroon" ? "text-white" : "text-gold")}>
                <AlertTriangle className="size-4 text-gold" /> {f.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-white/90">{f.detail}</p>
            </motion.li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 flex items-center justify-between gap-2 font-display font-bold text-gold">
          أفراد الطلب وشروط الموسم
          <span className="text-xs font-normal text-white/75">{item.office} · {item.mode}</span>
        </h3>
        <ul className="space-y-2">
          {item.result.members.map((mr) => {
            const m = item.members.find((x) => x.person.id === mr.id)!;
            const isOpen = expanded === mr.id;
            const bad = mr.checks.filter((c) => c.status === "fail").length;
            const warn = mr.checks.filter((c) => c.status === "warn").length;
            return (
              <li key={mr.id} className={cn("overflow-hidden rounded-2xl ring-1 transition", isOpen ? "bg-white/10 ring-gold/40" : "bg-white/[.06] ring-white/10 hover:ring-gold/40")}>
                <button onClick={() => setExpanded(isOpen ? null : mr.id)} className="flex w-full items-center gap-3 p-3 text-right" aria-expanded={isOpen}>
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl font-display font-bold text-white", m.person.gender === "F" ? "bg-maroon/70" : "bg-green-light/25")}>
                    {m.person.firstName[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-white">{mr.name}</p>
                    <p className="flex flex-wrap items-center gap-2 text-xs text-white/75">
                      {relationLabel(m.relation, m.person.gender)} · {ageOf(m.person)} عاماً · <span dir="ltr">{maskNationalId(m.person.id)}</span>
                      {m.relation !== "self" &&
                        (m.relationVerified ? (
                          <span className="flex items-center gap-1 font-semibold text-white"><Link2 className="size-3 text-gold" /> صلة مؤكدة</span>
                        ) : (
                          <span className="flex items-center gap-1 font-semibold text-gold"><ShieldQuestion className="size-3" /> صلة مصرّح بها</span>
                        ))}
                    </p>
                  </div>
                  {bad > 0 ? <Chip tone="maroon">{bad} غير مستوفى</Chip> : warn > 0 ? <Chip tone="gold">{warn} تنبيه</Chip> : <Chip tone="green">مستوفٍ</Chip>}
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.ul initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t border-white/10 bg-black/15">
                      {mr.checks.map((c) => {
                        const S = STATUS_ICON[c.status];
                        return (
                          <li key={c.key} className="flex items-start gap-2.5 px-4 py-2 text-sm">
                            <S.icon className={cn("mt-0.5 size-4 shrink-0", S.cls)} />
                            <div>
                              <p className="font-semibold text-white">{c.label}</p>
                              <p className="text-xs leading-5 text-white/80">{c.detail}</p>
                            </div>
                          </li>
                        );
                      })}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
        <ul className="mt-2 flex flex-wrap gap-2">
          {item.result.general.map((g) => {
            const S = STATUS_ICON[g.status];
            return (
              <li key={g.key} className="flex items-center gap-1.5 rounded-full bg-white/[.06] px-3 py-1 text-xs text-white/90 ring-1 ring-white/10" title={g.detail}>
                <S.icon className={cn("size-3.5", S.cls)} /> {g.label}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl bg-white/[.06] p-4 ring-1 ring-white/10">
          <h3 className="mb-2 font-display font-bold text-gold">الوثائق</h3>
          <ul className="space-y-1.5 text-sm">
            {item.documents.map((d) => (
              <li key={d.name} className="flex items-start gap-2">
                {d.status === "ok" ? (
                  <CheckCircle2 className={cn("mt-0.5 size-4 shrink-0", STATUS_ICON.pass.cls)} />
                ) : d.status === "issue" ? (
                  <AlertTriangle className={cn("mt-0.5 size-4 shrink-0", STATUS_ICON.warn.cls)} />
                ) : (
                  <XCircle className={cn("mt-0.5 size-4 shrink-0", STATUS_ICON.fail.cls)} />
                )}
                <span className="text-white">
                  {d.name}
                  {d.note && <span className="block text-xs text-white/75">{d.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl bg-white/[.06] p-4 ring-1 ring-white/10">
          <h3 className="mb-2 flex items-center gap-2 font-display font-bold text-gold">
            <Link2 className="size-4" /> دليل صلة القرابة
          </h3>
          <p className="text-sm leading-6 text-white/90">{item.evidence}</p>
        </section>
      </div>
    </div>
  );
}

/**
 * شريط القرار. يعيش في تذييل اللوحة لا داخل منطقة التمرير، فلا يغطي بيانات الطلب خلفه.
 */
function ReviewDecision({ item, onDone }: { item: ReviewItem; onDone: () => void }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const valid = note.trim().length >= 8;

  const decide = (status: "approved" | "rejected") => {
    setTried(true);
    if (!valid) return;
    const prev = item.review;
    actions.setReview(item.key, { status, note: note.trim(), by: user.name, at: Date.now() });
    logAs(user, {
      action: status === "approved" ? "اعتماد طلب بعد المراجعة" : "رفض طلب بعد المراجعة",
      target: `الطلب ${item.number}`,
      detail: note.trim(),
      before: prev ? (prev.status === "approved" ? "معتمد" : "مرفوض") : "بانتظار المراجعة",
      after: status === "approved" ? "معتمد" : "مرفوض",
    });
    toast(
      status === "approved"
        ? { title: `اعتُمد الطلب ${item.number}`, body: "سُجّل القرار والسبب باسمك في سجل الأحداث.", tone: "success", icon: "✅" }
        : { title: `رُفض الطلب ${item.number}`, body: "سيرى المتقدم سبب الرفض ويمكنه تقديم اعتراض.", tone: "warning", icon: "⛔" },
    );
    onDone();
  };

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end">
      <label className="block min-w-0 flex-1">
        <span className="mb-1.5 flex flex-wrap items-center gap-2 text-sm font-bold text-white">
          سبب القرار <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-bold text-gold">إلزامي</span>
          <span className="text-xs font-normal text-white/60">يراه المتقدم ويُحفظ في السجل</span>
        </span>
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="مثال: خطأ كتابي في اسم الأم مؤكد من بيان القيد المرفوع"
          className={cn(textareaClass, "resize-none", tried && !valid && "border-gold! bg-maroon/40!")}
        />
        {tried && !valid && (
          <span className="mt-1 flex items-center gap-1.5 text-sm font-bold text-gold">
            <AlertTriangle className="size-4 shrink-0" /> اكتب سبباً واضحاً (8 أحرف على الأقل)
          </span>
        )}
      </label>
      <div className="flex shrink-0 gap-2">
        <Button variant="gold" onClick={() => decide("approved")}>
          <CheckCircle2 className="size-4" /> اعتماد
        </Button>
        <Button variant="maroon" onClick={() => decide("rejected")}>
          <Ban className="size-4" /> رفض
        </Button>
      </div>
    </div>
  );
}
