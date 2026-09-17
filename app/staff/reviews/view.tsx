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
import { Badge, useToast } from "@/components/ui/widgets";
import { REG_STATS } from "@/lib/data/staff-seed";
import { ageOf, relationLabel } from "@/lib/registry";
import type { CheckStatus } from "@/lib/rules";
import { useSeason } from "@/lib/season-live";
import { actions, useStore } from "@/lib/store";
import { cn, formatNumber, maskNationalId } from "@/lib/utils";
import { useReviewQueue, type ReviewItem } from "../_components/data";
import { BarList, Donut, Drawer, Empty, fmtDateTime, Gate, Kpi, Legend, logAs, PageHeader, Panel, Tabs, textareaClass, useStaffUser } from "../_components/kit";

type Filter = "pending" | "approved" | "rejected" | "all";

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
        <Kpi label="الطلبات المقدّمة" value={REG_STATS.applications + realApps.length} icon={<FileText />} hint={realApps.length ? `+${realApps.length} من جلسة العرض` : "التسجيل الأولي 1448"} />
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
                { value: REG_STATS.autoApproved, color: "#00594F", label: "auto" },
                { value: REG_STATS.needsReview, color: "#AD9E6E", label: "review" },
                { value: REG_STATS.rejected, color: "#672146", label: "rejected" },
              ]}
            >
              <div>
                <p className="font-display text-xl font-bold text-green-dark">85%</p>
                <p className="text-[11px] text-hint">مؤهل تلقائياً</p>
              </div>
            </Donut>
            <div className="w-full flex-1">
              <Legend
                items={[
                  { label: "مؤهل تلقائياً", color: "#00594F", value: formatNumber(REG_STATS.autoApproved) },
                  { label: "يحتاج مراجعة بشرية", color: "#AD9E6E", value: formatNumber(REG_STATS.needsReview) },
                  { label: "غير مؤهل بسبب واضح", color: "#672146", value: formatNumber(REG_STATS.rejected) },
                ]}
              />
            </div>
          </div>
        </Panel>
        <Panel title="الطلبات حسب المحافظة" icon={<MapPin />} delay={0.15}>
          <div className="grid gap-x-8 sm:grid-cols-2">
            <BarList items={REG_STATS.byGovernorate.slice(0, 5).map((g) => ({ label: g.name, value: g.value, key: g.name }))} max={REG_STATS.byGovernorate[0].value} />
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
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-hint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="رقم الطلب، الاسم، الرقم الوطني..."
              aria-label="بحث في الطلبات"
              className="h-11 w-full rounded-2xl border-2 border-gold/40 bg-sand/60 pr-9 pl-3 text-sm outline-none focus:border-green-light"
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

      <Drawer open={!!open} onClose={close} title={open ? `الطلب رقم ${open.number} — ${open.name}` : ""}>
        {open && <ReviewDetail key={open.key} item={open} onDone={close} />}
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
        "group relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border bg-white p-4 text-right transition hover:-translate-y-0.5 hover:shadow-lg",
        item.review ? "border-gold/25 opacity-80" : severe ? "border-maroon/25" : "border-gold/40",
      )}
    >
      <span className={cn("absolute inset-y-0 right-0 w-1", item.review?.status === "approved" ? "bg-green-light" : item.review?.status === "rejected" ? "bg-maroon" : severe ? "bg-maroon/70" : "bg-gold-dark")} />
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", severe ? "bg-maroon/10 text-maroon" : "bg-gold/30 text-gold-dark")}>
        {item.review?.status === "approved" ? <CheckCircle2 className="size-5 text-green-light" /> : item.review?.status === "rejected" ? <Ban className="size-5 text-maroon" /> : <AlertTriangle className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-hint">#{item.number}</span>
          <span className="font-bold text-green-dark">{item.name}</span>
          {item.source === "real" && <Badge tone="gold">طلب من جلسة العرض</Badge>}
        </div>
        <p className={cn("mt-1 text-sm font-bold", severe ? "text-maroon" : "text-gold-dark")}>{item.caseLabel}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-hint">
          <span>{item.office}</span>
          <span>{item.members.length} أفراد</span>
          <span>{item.mode}</span>
          <span>{fmtDateTime(item.submittedAt)}</span>
        </p>
      </div>
      <ChevronLeft className="mt-3 size-5 shrink-0 text-gold-dark transition group-hover:-translate-x-1" />
    </button>
  );
}

const STATUS_ICON: Record<CheckStatus, { icon: typeof CheckCircle2; cls: string }> = {
  pass: { icon: CheckCircle2, cls: "text-green-light" },
  fail: { icon: XCircle, cls: "text-maroon" },
  warn: { icon: AlertTriangle, cls: "text-gold-dark" },
  na: { icon: CircleDashed, cls: "text-hint" },
};

function ReviewDetail({ item, onDone }: { item: ReviewItem; onDone: () => void }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(item.members[0]?.person.id ?? null);
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
    <div className="space-y-5">
      {item.review && (
        <div className={cn("rounded-2xl p-4 ring-1", item.review.status === "approved" ? "bg-green-light/10 ring-green-light/30" : "bg-maroon/5 ring-maroon/20")}>
          <p className={cn("font-bold", item.review.status === "approved" ? "text-green" : "text-maroon")}>
            {item.review.status === "approved" ? "معتمد" : "مرفوض"} — {item.review.by} — {fmtDateTime(item.review.at)}
          </p>
          <p className="mt-1 text-sm text-ink-soft">السبب: {item.review.note}</p>
        </div>
      )}

      <section>
        <h3 className="mb-2 font-display font-bold text-green-dark">لماذا يحتاج مراجعة؟</h3>
        <ul className="space-y-2">
          {item.flags.map((f, i) => (
            <motion.li key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className={cn("rounded-2xl p-3 ring-1", f.tone === "maroon" ? "bg-maroon/5 ring-maroon/20" : "bg-gold/15 ring-gold-dark/25")}>
              <p className={cn("flex items-center gap-2 font-bold", f.tone === "maroon" ? "text-maroon" : "text-gold-dark")}>
                <AlertTriangle className="size-4" /> {f.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-ink-soft">{f.detail}</p>
            </motion.li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 flex items-center justify-between font-display font-bold text-green-dark">
          أفراد الطلب وشروط الموسم
          <span className="text-xs font-normal text-hint">{item.office} · {item.mode}</span>
        </h3>
        <ul className="space-y-2">
          {item.result.members.map((mr) => {
            const m = item.members.find((x) => x.person.id === mr.id)!;
            const isOpen = expanded === mr.id;
            const bad = mr.checks.filter((c) => c.status === "fail").length;
            const warn = mr.checks.filter((c) => c.status === "warn").length;
            return (
              <li key={mr.id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-gold/30">
                <button onClick={() => setExpanded(isOpen ? null : mr.id)} className="flex w-full items-center gap-3 p-3 text-right" aria-expanded={isOpen}>
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl font-display font-bold", m.person.gender === "F" ? "bg-maroon/10 text-maroon" : "bg-green-dark/10 text-green-dark")}>
                    {m.person.firstName[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">{mr.name}</p>
                    <p className="flex flex-wrap items-center gap-2 text-xs text-hint">
                      {relationLabel(m.relation, m.person.gender)} · {ageOf(m.person)} عاماً · <span dir="ltr">{maskNationalId(m.person.id)}</span>
                      {m.relation !== "self" &&
                        (m.relationVerified ? (
                          <span className="flex items-center gap-1 text-green"><Link2 className="size-3" /> صلة مؤكدة</span>
                        ) : (
                          <span className="flex items-center gap-1 text-gold-dark"><ShieldQuestion className="size-3" /> صلة مصرّح بها</span>
                        ))}
                    </p>
                  </div>
                  {bad > 0 ? <Badge tone="maroon">{bad} غير مستوفى</Badge> : warn > 0 ? <Badge tone="gold">{warn} تنبيه</Badge> : <Badge tone="green">مستوفٍ</Badge>}
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.ul initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t border-gold/20 bg-sand/50">
                      {mr.checks.map((c) => {
                        const S = STATUS_ICON[c.status];
                        return (
                          <li key={c.key} className="flex items-start gap-2.5 px-4 py-2 text-sm">
                            <S.icon className={cn("mt-0.5 size-4 shrink-0", S.cls)} />
                            <div>
                              <p className="font-semibold text-ink">{c.label}</p>
                              <p className="text-xs leading-5 text-ink-soft">{c.detail}</p>
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
              <li key={g.key} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs ring-1 ring-gold/30" title={g.detail}>
                <S.icon className={cn("size-3.5", S.cls)} /> {g.label}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl bg-white p-4 ring-1 ring-gold/30">
          <h3 className="mb-2 font-display font-bold text-green-dark">الوثائق</h3>
          <ul className="space-y-1.5 text-sm">
            {item.documents.map((d) => (
              <li key={d.name} className="flex items-start gap-2">
                {d.status === "ok" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-light" /> : d.status === "issue" ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold-dark" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-maroon" />}
                <span>
                  {d.name}
                  {d.note && <span className="block text-xs text-hint">{d.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl bg-white p-4 ring-1 ring-gold/30">
          <h3 className="mb-2 flex items-center gap-2 font-display font-bold text-green-dark">
            <Link2 className="size-4 text-gold-dark" /> دليل صلة القرابة
          </h3>
          <p className="text-sm leading-6 text-ink-soft">{item.evidence}</p>
        </section>
      </div>

      <section className="sticky bottom-0 -mx-5 -mb-5 border-t border-gold/30 bg-white/95 p-5 backdrop-blur">
        <label className="block">
          <span className="mb-1.5 flex items-center justify-between font-bold text-ink">
            سبب القرار <span className="text-xs font-normal text-maroon">إلزامي</span>
          </span>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="مثال: خطأ كتابي في اسم الأم مؤكد من بيان القيد المرفوع"
            className={cn(textareaClass, tried && !valid && "border-maroon")}
          />
        </label>
        {tried && !valid && <p className="mt-1 text-sm font-bold text-maroon">اكتب سبباً واضحاً (8 أحرف على الأقل) — سيراه المتقدم ويُحفظ في السجل.</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => decide("approved")} className="flex-1">
            <CheckCircle2 className="size-4" /> اعتماد الطلب
          </Button>
          <Button variant="maroon" onClick={() => decide("rejected")} className="flex-1">
            <Ban className="size-4" /> رفض مع السبب
          </Button>
        </div>
      </section>
    </div>
  );
}
