"use client";

import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, ChevronLeft, ChevronRight, Dices, Hash, Hourglass, ListFilter, RotateCcw, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { OFFICES } from "@/lib/season";
import { getPublicList, RESULTS_SUMMARY, type ListKind } from "@/lib/data/public-results";
import { cn, formatNumber } from "@/lib/utils";

const TABS: { key: ListKind; label: string; count: number; icon: typeof BadgeCheck; hint: string }[] = [
  { key: "direct", label: "المقبولون مباشرة", count: RESULTS_SUMMARY.direct, icon: BadgeCheck, hint: "وفق الأكبر سناً — 66 عاماً فأكثر" },
  { key: "lottery", label: "المقبولون بالقرعة", count: RESULTS_SUMMARY.lottery, icon: Dices, hint: "القرعة الإلكترونية — 1 شعبان 20:00" },
  { key: "reserve", label: "الاحتياط", count: RESULTS_SUMMARY.reserve, icon: Hourglass, hint: "مرتبة حسب ترتيب الاحتياط" },
];

const PAGE_SIZE = 10;

const selectCls =
  "h-11 w-full appearance-none rounded-xl border border-gold/50 bg-white px-3 text-sm text-ink outline-none transition focus:border-green-light focus:ring-4 focus:ring-green-light/15";

export function PublicLists() {
  const [kind, setKind] = useState<ListKind>("lottery");
  const [gov, setGov] = useState("");
  const [office, setOffice] = useState("");
  const [campaign, setCampaign] = useState("");
  const [appNo, setAppNo] = useState("");
  const [page, setPage] = useState(1);

  const list = useMemo(() => getPublicList(kind), [kind]);
  const filtered = useMemo(
    () =>
      list.filter(
        (a) =>
          (!gov || a.governorate === gov) &&
          (!office || a.office === office) &&
          (!campaign || a.campaign === campaign) &&
          (!appNo || a.applicationNo.startsWith(appNo)),
      ),
    [list, gov, office, campaign, appNo],
  );

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const slice = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const people = filtered.reduce((a, r) => a + r.members.length, 0);
  const offices = OFFICES.find((o) => o.governorate === gov)?.offices ?? [];
  const hasFilters = gov || office || campaign || appNo;
  const tab = TABS.find((t) => t.key === kind)!;

  const change = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  return (
    <div className="rounded-[2rem] border border-gold/40 bg-white p-4 shadow-[0_30px_70px_-50px_rgba(0,89,79,.6)] sm:p-6 md:p-8">
      {/* Tabs */}
      <div role="tablist" aria-label="القوائم العامة" className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => {
          const active = t.key === kind;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => {
                setKind(t.key);
                setPage(1);
                if (t.key !== "direct") setCampaign("");
              }}
              className={cn(
                "relative flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-start transition",
                active ? "text-white" : "bg-sand text-ink hover:bg-gold-light",
              )}
            >
              {active && (
                <motion.span
                  layoutId="list-tab"
                  className="absolute inset-0 rounded-2xl bg-green-dark shadow-[0_12px_30px_-12px_rgba(0,89,79,.8)]"
                  transition={{ type: "spring", damping: 28, stiffness: 320 }}
                />
              )}
              <t.icon className={cn("relative size-5", active ? "text-gold" : "text-green")} />
              <span className="relative">
                <span className="block text-sm font-bold">{t.label}</span>
                <span className={cn("block text-xs tabular-nums", active ? "text-white/70" : "text-ink-soft")}>{formatNumber(t.count)} حاجاً</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mt-6 grid gap-3 rounded-2xl bg-sand/70 p-3 sm:grid-cols-2 lg:grid-cols-[auto_1fr_1fr_1fr_1fr_auto] lg:items-center">
        <span className="hidden items-center gap-1.5 px-2 text-sm font-bold text-green-dark lg:flex">
          <ListFilter className="size-4" /> تصفية
        </span>
        <label className="relative">
          <span className="sr-only">المحافظة</span>
          <select
            className={selectCls}
            value={gov}
            onChange={(e) => {
              change(setGov)(e.target.value);
              setOffice("");
            }}
          >
            <option value="">كل المحافظات</option>
            {OFFICES.map((o) => (
              <option key={o.governorate}>{o.governorate}</option>
            ))}
          </select>
          <ChevronLeft className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 -rotate-90 text-hint" />
        </label>
        <label className="relative">
          <span className="sr-only">المكتب</span>
          <select className={selectCls} value={office} disabled={!gov} onChange={(e) => change(setOffice)(e.target.value)}>
            <option value="">{gov ? "كل المكاتب" : "اختر المحافظة أولاً"}</option>
            {offices.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          <ChevronLeft className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 -rotate-90 text-hint" />
        </label>
        <label className="relative">
          <span className="sr-only">الحملة</span>
          <select className={selectCls} value={campaign} onChange={(e) => change(setCampaign)(e.target.value)}>
            <option value="">كل الحملات</option>
            {kind === "direct" ? (
              <>
                <option>القبول المباشر</option>
                <option>المنحة</option>
              </>
            ) : (
              <option>القرعة</option>
            )}
          </select>
          <ChevronLeft className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 -rotate-90 text-hint" />
        </label>
        <label className="relative">
          <span className="sr-only">رقم الطلب</span>
          <Hash className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-hint" />
          <input
            className={cn(selectCls, "pr-9")}
            inputMode="numeric"
            placeholder="رقم الطلب (مثال: 4512)"
            value={appNo}
            onChange={(e) => change(setAppNo)(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        </label>
        <AnimatePresence>
          {hasFilters && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => {
                setGov("");
                setOffice("");
                setCampaign("");
                setAppNo("");
                setPage(1);
              }}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-bold text-maroon hover:bg-maroon/5"
            >
              <RotateCcw className="size-4" /> مسح
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-1 text-sm text-ink-soft">
        <p>
          <span className="font-bold text-green-dark tabular-nums">{formatNumber(filtered.length)}</span> طلباً ·{" "}
          <span className="font-bold text-green-dark tabular-nums">{formatNumber(people)}</span> شخصاً — {tab.hint}
        </p>
        <p className="text-xs">الرقم الوطني مقنّع · آخر تحديث: {RESULTS_SUMMARY.lastUpdate}</p>
      </div>

      {/* Table — scrolls inside its own container on small screens */}
      <div className="mt-3 overflow-x-auto rounded-2xl border border-gold/40">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead className="bg-green-dark text-white">
            <tr className="text-start">
              {kind === "reserve" && <th className="px-4 py-3 text-start font-semibold">الترتيب</th>}
              <th className="px-4 py-3 text-start font-semibold">رقم الطلب</th>
              <th className="px-4 py-3 text-start font-semibold">الاسم</th>
              <th className="px-4 py-3 text-start font-semibold">الرقم الوطني</th>
              <th className="px-4 py-3 text-start font-semibold">المحافظة</th>
              <th className="px-4 py-3 text-start font-semibold">المكتب</th>
              <th className="px-4 py-3 text-start font-semibold">الحملة</th>
            </tr>
          </thead>
          {slice.map((a, i) => {
            const family = a.members.length > 1;
            const span = a.members.length;
            return (
              <motion.tbody
                key={`${kind}-${a.applicationNo}-${current}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.035, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "group border-t border-gold/30 transition-colors hover:bg-gold-light/40",
                  a.applicationNo === "4512" || a.applicationNo === "3981" ? "bg-gold/15" : i % 2 ? "bg-sand/40" : "bg-white",
                )}
              >
                {a.members.map((m, j) => (
                  <tr key={j} className={cn(j > 0 && "border-t border-dashed border-gold/30")}>
                    {j === 0 && kind === "reserve" && (
                      <td rowSpan={span} className="px-4 py-3 align-top">
                        <span className="inline-flex min-w-12 justify-center rounded-lg bg-maroon/10 px-2 py-1 font-bold text-maroon tabular-nums">
                          {formatNumber(a.rank ?? 0)}
                        </span>
                      </td>
                    )}
                    {j === 0 && (
                      <td rowSpan={span} className="px-4 py-3 align-top">
                        <span className="font-mono font-bold text-green-dark">{a.applicationNo}</span>
                        {family && (
                          <span className="mt-1 flex w-max items-center gap-1 rounded-full bg-green-light/12 px-2 py-0.5 text-[11px] font-bold text-green">
                            <Users className="size-3" /> طلب عائلي · {span} أفراد
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-2.5 font-semibold text-ink">
                      <span className="flex items-center gap-2">
                        {family && <span className={cn("size-1.5 shrink-0 rotate-45", j === 0 ? "bg-gold-dark" : "bg-gold")} />}
                        {m.name}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-ink-soft" dir="ltr" style={{ textAlign: "right" }}>
                      {m.maskedId}
                    </td>
                    {j === 0 && (
                      <>
                        <td rowSpan={span} className="px-4 py-3 align-top text-ink">
                          {a.governorate}
                        </td>
                        <td rowSpan={span} className="px-4 py-3 align-top text-ink-soft">
                          {a.office}
                        </td>
                        <td rowSpan={span} className="px-4 py-3 align-top">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
                              a.campaign === "المنحة" ? "bg-maroon/10 text-maroon" : "bg-gold/35 text-ink",
                            )}
                          >
                            {a.campaign}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </motion.tbody>
            );
          })}
          {slice.length === 0 && (
            <tbody>
              <tr>
                <td colSpan={7} className="px-4 py-14 text-center text-ink-soft">
                  لا توجد طلبات مطابقة للتصفية المختارة.
                </td>
              </tr>
            </tbody>
          )}
        </table>
      </div>

      {/* Pagination */}
      <Pagination page={current} pages={pages} onChange={setPage} />
    </div>
  );
}

function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  const nums = Array.from(new Set([1, page - 1, page, page + 1, pages].filter((n) => n >= 1 && n <= pages))).sort((a, b) => a - b);
  const btn = "flex size-10 items-center justify-center rounded-xl text-sm font-bold transition disabled:opacity-30";
  return (
    <nav aria-label="الصفحات" className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-ink-soft">
        صفحة <span className="font-bold text-ink tabular-nums">{formatNumber(page)}</span> من <span className="tabular-nums">{formatNumber(pages)}</span>
      </p>
      <div className="flex items-center gap-1">
        <button className={cn(btn, "hover:bg-sand")} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="الصفحة السابقة">
          <ChevronRight className="size-5" />
        </button>
        {nums.map((n, i) => (
          <span key={n} className="flex items-center gap-1">
            {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-hint">…</span>}
            <button
              onClick={() => onChange(n)}
              aria-current={n === page ? "page" : undefined}
              className={cn(btn, "relative tabular-nums", n === page ? "text-white" : "text-ink hover:bg-sand")}
            >
              {n === page && <motion.span layoutId="page-dot" className="absolute inset-0 rounded-xl bg-green-dark" />}
              <span className="relative">{formatNumber(n)}</span>
            </button>
          </span>
        ))}
        <button className={cn(btn, "hover:bg-sand")} disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="الصفحة التالية">
          <ChevronLeft className="size-5" />
        </button>
      </div>
    </nav>
  );
}
