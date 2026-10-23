"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Ban, CheckCircle2, CircleDashed, ClipboardCheck, Link2, Search, ShieldQuestion, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { ageOf, relationLabel } from "@/lib/registry";
import type { CheckStatus } from "@/lib/rules";
import { actions, useStore } from "@/lib/store";
import { cn, maskNationalId } from "@/lib/utils";
import { useCivilClaims, useReviewQueue, type ReviewItem } from "../_components/data";
import { can, fmtDateTime, Gate, logAs, PageHeader, textareaClass, useStaffUser } from "../_components/kit";
import { Box, EditHeader, EditLayout, EmptyRow, ListTable, RowActions, RowLink, Tag } from "../_components/wp";
import { Segments } from "../exam/_components/ui";
import { CivilClaims } from "./civil";
import { ContractsScreen } from "./contracts";
import { viewKeys } from "@/lib/permissions";

type Filter = "pending" | "approved" | "rejected" | "all";

const BASE = "/staff/reviews";

export function ReviewsView() {
  return (
    <Gate perms={viewKeys("reviews")}>
      <Reviews />
    </Gate>
  );
}

/**
 * Three lists, as a site's admin: the applications the platform could not decide alone, each reviewed on its
 * own screen (`?id=`), the civil details pilgrims corrected at account creation (`?view=civil`, one by `&id=`),
 * and the pilgrims attached to the groups (`?view=groups`). Their numbers are on its statistics page (/staff/stats/reviews).
 */
function Reviews() {
  const params = useSearchParams();
  const router = useRouter();
  const queue = useReviewQueue();
  const civil = useCivilClaims();
  const post = useStore((s) => s.post);
  const id = params.get("id");
  const v = params.get("view");
  const user = useStaffUser();
  // Each part opens to whoever may view it: the applications, the civil corrections, the group contracts
  const allowed = { reviews: can(user, "reviews.applications.GET"), civil: can(user, "reviews.civil-claims.GET"), groups: can(user, "reviews.group-contracts.GET") };
  const asked = v === "groups" || v === "civil" ? v : "reviews";
  const view = allowed[asked] ? asked : (["reviews", "civil", "groups"] as const).find((k) => allowed[k]) ?? "reviews";

  if (view === "civil" && id) return <CivilClaims key={id} id={id} />;
  if (id && allowed.reviews) return <ReviewScreen key={id} id={id} />;

  const pending = queue.filter((q) => !q.review).length;
  const contracts = Object.values(post).filter((p) => p.contract?.status === "pending").length;

  return (
    <div className="space-y-5">
      <PageHeader title="مراجعة الطلبات" icon={<ClipboardCheck />} description="ما لم تحسمه المنصة وحدها يحتاج قرارك مع سبب مكتوب، والإلحاق بالمجموعات يجري من هنا." />
      <Segments
        value={view}
        onChange={(v) => router.replace(v === "reviews" ? BASE : `${BASE}?view=${v}`, { scroll: false })}
        label="الأقسام"
        items={[
          { value: "reviews" as const, label: "طلبات تحتاج قراراً", count: pending, tone: "maroon" as const },
          { value: "civil" as const, label: "تصحيح البيانات المدنية", count: civil.filter((c) => c.claim.status === "pending").length, tone: "maroon" as const },
          { value: "groups" as const, label: "الإلحاق بالمجموعات", count: contracts, tone: "maroon" as const },
        ].filter((x) => allowed[x.value])}
      />
      {view === "groups" ? <ContractsScreen /> : view === "civil" ? <CivilClaims id={null} /> : <ReviewList queue={queue} />}
    </div>
  );
}

// ───────────────────────── The list ─────────────────────────

function statusOf(item: ReviewItem) {
  if (item.review?.status === "approved") return <Tag tone="green">معتمد</Tag>;
  if (item.review?.status === "rejected") return <Tag tone="maroon">مرفوض</Tag>;
  return item.flags.some((f) => f.tone === "maroon") ? <Tag tone="maroon">بانتظار القرار</Tag> : <Tag tone="gold">بانتظار القرار</Tag>;
}

function ReviewList({ queue }: { queue: ReviewItem[] }) {
  const [filter, setFilter] = useState<Filter>("pending");
  const [query, setQuery] = useState("");

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segments
          value={filter}
          onChange={setFilter}
          label="تصفية الطلبات"
          items={[
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
            className="h-10 w-full rounded-xl border-2 border-white/15 bg-white/10 pr-9 pl-3 text-sm text-white outline-none transition placeholder:text-white/50 focus:border-gold"
          />
        </label>
      </div>

      <ListTable head={["الطلب", "الحالة", "المكتب", "الأفراد", "قُدِّم"]}>
        {list.length === 0 && <EmptyRow cols={5}>لا طلبات هنا. جرّب تصفية أخرى أو امسح البحث.</EmptyRow>}
        {list.map((item) => {
          const href = `${BASE}?id=${encodeURIComponent(item.key)}`;
          return (
            <tr key={item.key} className="align-top">
              <td className="p-3">
                <RowLink href={href}>
                  <span className="font-bold text-white hover:text-gold">
                    #{item.number} — {item.name}
                  </span>
                </RowLink>
                <p className="text-xs font-bold text-gold">{item.caseLabel}</p>
                {item.source === "real" && <p className="text-[11px] text-white/55">طلب من جلسة العرض</p>}
                <RowActions>
                  <RowLink href={href}>{item.review ? "عرض القرار" : "مراجعة"}</RowLink>
                </RowActions>
              </td>
              <td className="p-3">{statusOf(item)}</td>
              <td className="p-3 text-white/80">{item.office}</td>
              <td className="p-3 text-white/80">
                {item.members.length} · <span className="text-xs">{item.mode}</span>
              </td>
              <td className="p-3 text-xs text-white/70">{fmtDateTime(item.submittedAt)}</td>
            </tr>
          );
        })}
      </ListTable>
    </div>
  );
}

// ───────────────────────── One application ─────────────────────────

function ReviewScreen({ id }: { id: string }) {
  const queue = useReviewQueue();
  const router = useRouter();
  const item = queue.find((q) => q.key === id);

  if (!item) {
    return (
      <div>
        <EditHeader back={BASE} backLabel="كل الطلبات" title="الطلب غير موجود" />
        <p className="text-white/70">لم يعد هذا الطلب في قائمة المراجعة.</p>
      </div>
    );
  }

  return (
    <div>
      <EditHeader back={BASE} backLabel="كل الطلبات" title={`الطلب رقم ${item.number} — ${item.name}`}>
        {item.caseLabel}
      </EditHeader>
      <EditLayout
        main={<ReviewDetail item={item} />}
        side={
          <>
            <Box title="القرار">
              <ReviewDecision key={item.key} item={item} onDone={() => router.push(BASE)} />
            </Box>
            <Box title="عن الطلب">
              <dl className="space-y-1.5">
                {[
                  ["المكتب", item.office],
                  ["المحافظة", item.governorate],
                  ["طريقة الإضافة", item.mode],
                  ["الأفراد", String(item.members.length)],
                  ["قُدِّم", fmtDateTime(item.submittedAt)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-white/60">{k}</dt>
                    <dd className="text-left font-bold text-white">{v}</dd>
                  </div>
                ))}
              </dl>
              {item.source === "real" && <Tag tone="gold">طلب من جلسة العرض</Tag>}
            </Box>
          </>
        }
      />
    </div>
  );
}

const STATUS_ICON: Record<CheckStatus, { icon: typeof CheckCircle2; cls: string }> = {
  // filled discs keep green/maroon legible on the dark surfaces
  pass: { icon: CheckCircle2, cls: "fill-green-light text-white" },
  fail: { icon: XCircle, cls: "fill-maroon text-white" },
  warn: { icon: AlertTriangle, cls: "text-gold" },
  na: { icon: CircleDashed, cls: "text-white/70" },
};

const section = "rounded-2xl bg-white/[.04] p-4 ring-1 ring-white/10";

function ReviewDetail({ item }: { item: ReviewItem }) {
  const [expanded, setExpanded] = useState<string | null>(item.members[0]?.person.id ?? null);

  return (
    <>
      {item.review && (
        <div className={cn("rounded-2xl p-4 ring-1", item.review.status === "approved" ? "bg-green-light/20 ring-green-light/50" : "bg-maroon/50 ring-maroon")}>
          <p className="flex items-center gap-2 font-bold text-white">
            {item.review.status === "approved" ? <CheckCircle2 className="size-4 text-gold" /> : <Ban className="size-4 text-gold" />}
            {item.review.status === "approved" ? "معتمد" : "مرفوض"} — {item.review.by} — {fmtDateTime(item.review.at)}
          </p>
          <p className="mt-1 text-sm text-white/90">السبب: {item.review.note}</p>
        </div>
      )}

      <section className={section}>
        <h2 className="mb-2 font-display text-lg font-bold text-gold">لماذا يحتاج مراجعة؟</h2>
        <ul className="space-y-2">
          {item.flags.map((f, i) => (
            <li key={i} className={cn("rounded-xl p-3 ring-1", f.tone === "maroon" ? "bg-maroon/50 ring-maroon" : "bg-gold/10 ring-gold/35")}>
              <p className={cn("flex items-center gap-2 font-bold", f.tone === "maroon" ? "text-white" : "text-gold")}>
                <AlertTriangle className="size-4 text-gold" /> {f.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-white/90">{f.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={section}>
        <h2 className="mb-2 font-display text-lg font-bold text-gold">أفراد الطلب وشروط الموسم</h2>
        <ul className="space-y-2">
          {item.result.members.map((mr) => {
            const m = item.members.find((x) => x.person.id === mr.id)!;
            const isOpen = expanded === mr.id;
            const bad = mr.checks.filter((c) => c.status === "fail").length;
            const warn = mr.checks.filter((c) => c.status === "warn").length;
            return (
              <li key={mr.id} className={cn("overflow-hidden rounded-xl ring-1 transition", isOpen ? "bg-white/10 ring-gold/40" : "bg-white/[.06] ring-white/10 hover:ring-gold/40")}>
                <button onClick={() => setExpanded(isOpen ? null : mr.id)} className="flex w-full items-center gap-3 p-3 text-right" aria-expanded={isOpen}>
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl font-display font-bold text-white", m.person.gender === "F" ? "bg-maroon/70" : "bg-green-light/25")}>{m.person.firstName[0]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-white">{mr.name}</p>
                    <p className="flex flex-wrap items-center gap-2 text-xs text-white/75">
                      {relationLabel(m.relation, m.person.gender)} · {ageOf(m.person)} عاماً · <span dir="ltr">{maskNationalId(m.person.id)}</span>
                      {m.relation !== "self" &&
                        (m.relationVerified ? (
                          <span className="flex items-center gap-1 font-semibold text-white">
                            <Link2 className="size-3 text-gold" /> صلة مؤكدة
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 font-semibold text-gold">
                            <ShieldQuestion className="size-3" /> صلة مصرّح بها
                          </span>
                        ))}
                    </p>
                  </div>
                  {bad > 0 ? <Tag tone="maroon">{bad} غير مستوفى</Tag> : warn > 0 ? <Tag tone="gold">{warn} تنبيه</Tag> : <Tag tone="green">مستوفٍ</Tag>}
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
        <section className={section}>
          <h2 className="mb-2 font-display font-bold text-gold">الوثائق</h2>
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
        <section className={section}>
          <h2 className="mb-2 flex items-center gap-2 font-display font-bold text-gold">
            <Link2 className="size-4" /> دليل صلة القرابة
          </h2>
          <p className="text-sm leading-6 text-white/90">{item.evidence}</p>
        </section>
      </div>
    </>
  );
}

/** The decision, in the side box: a reason the applicant reads, then approve or reject */
function ReviewDecision({ item, onDone }: { item: ReviewItem; onDone: () => void }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const valid = note.trim().length >= 8;
  const mayApprove = can(user, "reviews.applications.approve");
  const mayReject = can(user, "reviews.applications.reject");
  if (!mayApprove && !mayReject) return <p className="text-xs leading-5 text-white/60">للاطلاع: القرار يحتاج صلاحية «اعتماد الطلب» أو «رفض الطلب».</p>;

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
    <div className="space-y-3">
      {item.review && <p className="text-xs text-white/60">قرار جديد يحل محل القرار الحالي، ويُسجَّل الاثنان.</p>}
      <label className="block">
        <span className="mb-1.5 block font-bold text-white">
          سبب القرار <span className="text-xs font-normal text-white/60">(إلزامي — يراه المتقدم)</span>
        </span>
        <textarea
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="مثال: خطأ كتابي في اسم الأم مؤكد من بيان القيد المرفوع"
          className={cn(textareaClass, "resize-none text-sm", tried && !valid && "border-gold! bg-maroon/40!")}
        />
        {tried && !valid && (
          <span className="mt-1 flex items-center gap-1.5 text-xs font-bold text-gold">
            <AlertTriangle className="size-4 shrink-0" /> اكتب سبباً واضحاً (8 أحرف على الأقل)
          </span>
        )}
      </label>
      <div className="flex gap-2">
        {mayApprove && (
          <Button variant="gold" className="flex-1" onClick={() => decide("approved")}>
            <CheckCircle2 className="size-4" /> اعتماد
          </Button>
        )}
        {mayReject && (
          <Button variant="maroon" className="flex-1" onClick={() => decide("rejected")}>
            <Ban className="size-4" /> رفض
          </Button>
        )}
      </div>
    </div>
  );
}
