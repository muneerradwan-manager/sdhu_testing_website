"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Download, Eye, Fingerprint, Lock, Scale, ScrollText, Search, SearchCheck, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge, useToast } from "@/components/ui/widgets";
import { OBJECTION_APP } from "@/lib/data/staff-seed";
import { cn, formatNumber } from "@/lib/utils";
import { useAllEvents } from "../_components/data";
import { fmtDate, fmtTime, Gate, Kpi, logAs, PageHeader, Panel, Tabs, useStaffUser } from "../_components/kit";

type Scope = "all" | "live" | "archive";

export function AuditView() {
  return (
    <Gate perms={["audit.read"]}>
      <Audit />
    </Gate>
  );
}

const selectClass = "h-11 w-full rounded-2xl border-2 border-gold/40 bg-sand/60 px-3 text-sm outline-none focus:border-green-light";

function Audit() {
  const user = useStaffUser()!;
  const toast = useToast();
  const events = useAllEvents();
  const [scope, setScope] = useState<Scope>("all");
  const [query, setQuery] = useState("");
  const [actor, setActor] = useState("");
  const [role, setRole] = useState("");
  const [action, setAction] = useState("");
  const [diffOnly, setDiffOnly] = useState(false);
  const [limit, setLimit] = useState(40);

  // Even reading the log is an event (4.5)
  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    logAs(user, { action: "الاطلاع على سجل الأحداث", target: "بوابة التدقيق" });
  }, [user]);

  const actors = useMemo(() => [...new Set(events.map((e) => e.actor))], [events]);
  const roles = useMemo(() => [...new Set(events.map((e) => e.role))], [events]);
  const actionsList = useMemo(() => [...new Set(events.map((e) => e.action))], [events]);

  const filtered = useMemo(() => {
    const q = query.trim();
    const list = events.filter((e) => {
      if (scope === "live" && !e.live) return false;
      if (scope === "archive" && e.live) return false;
      if (actor && e.actor !== actor) return false;
      if (role && e.role !== role) return false;
      if (action && e.action !== action) return false;
      if (diffOnly && e.before === undefined) return false;
      if (q && ![e.actor, e.role, e.action, e.target, e.detail, e.before, e.after].some((v) => v?.includes(q))) return false;
      return true;
    });
    // A traced application reads best in chronological order
    return q === OBJECTION_APP ? [...list].sort((a, b) => a.at - b.at) : list;
  }, [events, scope, query, actor, role, action, diffOnly]);

  const tracing = query.trim() === OBJECTION_APP;
  const hasFilters = !!(query || actor || role || action || diffOnly || scope !== "all");

  const trace = () => {
    setScope("all");
    setActor("");
    setRole("");
    setAction("");
    setDiffOnly(false);
    setQuery(OBJECTION_APP);
    logAs(user, { action: "الاطلاع على سجل الأحداث", target: `تصفية: الطلب ${OBJECTION_APP}`, detail: "اعتراض: «كنت مقبولاً في الملف المعلن ولم يظهر اسمي»" });
  };

  const exportCsv = () => {
    const header = ["الوقت", "الموظف", "الصفة", "الإجراء", "الهدف", "قبل", "بعد", "التفاصيل"];
    const rows = filtered.map((e) => [new Date(e.at).toISOString(), e.actor, e.role, e.action, e.target ?? "", e.before ?? "", e.after ?? "", e.detail ?? ""]);
    const csv = "﻿" + [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `سجل-الأحداث-1448${tracing ? `-الطلب-${OBJECTION_APP}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    logAs(user, { action: "تصدير سجل الأحداث", target: `${filtered.length} حدثاً`, detail: hasFilters ? `مع تصفية${query ? `: ${query}` : ""}` : "السجل كاملاً" });
    toast({ title: "صُدّر السجل", body: "وسُجّل التصدير نفسه كحدث جديد باسمك.", tone: "info", icon: "🧾" });
  };

  const clear = () => {
    setScope("all");
    setQuery("");
    setActor("");
    setRole("");
    setAction("");
    setDiffOnly(false);
  };

  // group by day
  const visible = filtered.slice(0, limit);
  const groups = visible.reduce<{ day: string; items: typeof visible }[]>((acc, e) => {
    const day = fmtDate(e.at);
    const last = acc.at(-1);
    if (last && last.day === day) last.items.push(e);
    else acc.push({ day, items: [e] });
    return acc;
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="التدقيق — قراءة فقط"
        title="سجل الأحداث"
        icon={<ScrollText />}
        description="كل إجراء في المنصة يُسجَّل هنا: من فعل، ومتى، وما القيمة قبل التعديل وبعده، ولماذا."
        actions={
          <>
            <span className="flex items-center gap-2 rounded-full border border-gold/40 bg-gold/15 px-3 py-1.5 text-sm font-bold text-gold">
              <Lock className="size-4" /> للإضافة فقط — لا يمكن التعديل
            </span>
            <Button variant="glass" size="sm" onClick={exportCsv}>
              <Download className="size-4" /> تصدير
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="إجمالي الأحداث" value={events.length} icon={<ScrollText />} />
        <Kpi label="من جلسة العرض" value={events.filter((e) => e.live).length} icon={<Eye />} tone="teal" delay={0.05} />
        <Kpi label="الموظفون في السجل" value={actors.length} icon={<UserRound />} tone="gold" delay={0.1} />
        <Kpi label="تعديلات بقيمة قبل/بعد" value={events.filter((e) => e.before !== undefined).length} icon={<Scale />} tone="maroon" delay={0.15} />
      </div>

      {/* Objection example */}
      <Panel className="mt-6 bg-gradient-to-l from-white to-gold-light/60" delay={0.1}>
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-maroon/10 text-maroon">
            <Fingerprint className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold text-green-dark">مثال: اعتراض على نتيجة القرعة</p>
            <p className="text-sm leading-6 text-ink-soft">«كنت مقبولاً في الملف المعلن على التلفاز، ولم يظهر اسمي» — حوّلت رنا التذكرة إلى التدقيق. تتبّع ما جرى على الطلب {OBJECTION_APP}: من رفع الملف، ومن صحّح، ومن نشر، ومتى.</p>
          </div>
          <Button variant={tracing ? "outline" : "maroon"} onClick={trace} disabled={tracing}>
            <SearchCheck className="size-4" /> تتبّع الطلب {OBJECTION_APP}
          </Button>
        </div>
        <AnimatePresence>
          {tracing && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-4 rounded-2xl bg-green-light/10 p-4 text-sm leading-7 ring-1 ring-green-light/25">
                <p className="font-bold text-green">النتيجة: الطلب {OBJECTION_APP} مقبول فعلاً.</p>
                <p className="text-ink-soft">
                  الصف 4,102 في الملف كان فيه رقم وطني غير مطابق (رقمان متبادلان)، وصحّحته رنا بتصويب موقّع من اللجنة قبل النشر. المشكلة أن صاحبه بحث باسمه لا برقمه الوطني، واسمه مطابق لاسم شخص آخر. لو كان هناك تلاعب لظهر هنا: من عدّل، ومتى، ولماذا.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Panel>

      {/* Filters */}
      <Panel className="mt-6" delay={0.15}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            id="audit-scope"
            value={scope}
            onChange={setScope}
            tabs={[
              { value: "all", label: "الكل" },
              { value: "live", label: "جلسة العرض", count: events.filter((e) => e.live).length },
              { value: "archive", label: "أرشيف الموسم" },
            ]}
          />
          <label className="relative w-full md:w-80">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-hint" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="رقم طلب، اسم، قيمة..." aria-label="بحث في السجل" className="h-11 w-full rounded-2xl border-2 border-gold/40 bg-sand/60 pr-9 pl-3 text-sm outline-none focus:border-green-light" />
          </label>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto_auto]">
          <select value={actor} onChange={(e) => setActor(e.target.value)} className={selectClass} aria-label="الموظف">
            <option value="">كل الموظفين</option>
            {actors.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={selectClass} aria-label="الصفة">
            <option value="">كل الصفات</option>
            {roles.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <select value={action} onChange={(e) => setAction(e.target.value)} className={selectClass} aria-label="الإجراء">
            <option value="">كل الإجراءات</option>
            {actionsList.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <label className="flex h-11 cursor-pointer items-center gap-2 rounded-2xl bg-sand/60 px-3 text-sm ring-1 ring-gold/30">
            <input type="checkbox" checked={diffOnly} onChange={(e) => setDiffOnly(e.target.checked)} className="accent-[#00594F]" />
            تعديلات فقط
          </label>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-11" onClick={clear}>
              <X className="size-4" /> مسح
            </Button>
          )}
        </div>
        <p className="mt-3 text-xs text-hint">
          {formatNumber(filtered.length)} حدثاً مطابقاً {tracing && "— مرتبة زمنياً من الأقدم"}
        </p>

        {/* Timeline */}
        <div className="mt-4 space-y-6">
          {groups.map((g) => (
            <section key={g.day + g.items[0].id}>
              <h3 className="mb-2 inline-flex rounded-full bg-green-dark px-3 py-1 text-xs font-bold text-white shadow">{g.day}</h3>
              <ol className="relative space-y-2 border-r-2 border-gold/30 pr-5">
                {g.items.map((e, i) => (
                  <motion.li key={e.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 12) * 0.025 }} className="group relative">
                    <span className={cn("absolute -right-[27px] top-4 size-3.5 rounded-full border-2 border-white", e.live ? "bg-green-light" : "bg-gold-dark")} />
                    <div className={cn("rounded-2xl p-3 ring-1 transition group-hover:shadow-md", tracing && e.target?.includes(OBJECTION_APP) ? "bg-gold/15 ring-gold-dark/40" : "bg-sand/50 ring-gold/25")}>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-mono text-xs font-bold tabular-nums text-green-dark">{fmtTime(e.at)}</span>
                        <span className="grid size-6 place-items-center rounded-lg bg-green-dark text-[11px] font-bold text-white">{e.actor.replace("د. ", "")[0]}</span>
                        <span className="font-bold text-ink">{e.actor}</span>
                        <span className="text-xs text-hint">{e.role}</span>
                        <Badge tone={e.before !== undefined ? "maroon" : "green"}>{e.action}</Badge>
                        {e.live && <Badge tone="gold">جلسة العرض</Badge>}
                        <span className="mr-auto opacity-0 transition group-hover:opacity-100" title="لا يمكن حذف أو تعديل أي حدث، حتى من أصحاب أعلى الصلاحيات">
                          <Lock className="size-3.5 text-hint" />
                        </span>
                      </div>
                      {e.target && <p className="mt-1 text-sm font-semibold text-green-dark">{e.target}</p>}
                      {(e.before !== undefined || e.after !== undefined) && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          {e.before !== undefined && (
                            <span className="rounded-lg bg-maroon/10 px-2 py-1 text-maroon">
                              <span className="font-bold">قبل: </span>
                              <span className="line-through decoration-maroon/40">{e.before}</span>
                            </span>
                          )}
                          {e.before !== undefined && <ArrowLeft className="size-3.5 text-hint" />}
                          {e.after !== undefined && (
                            <span className="rounded-lg bg-green-light/15 px-2 py-1 text-green">
                              <span className="font-bold">بعد: </span>
                              {e.after}
                            </span>
                          )}
                        </div>
                      )}
                      {e.detail && <p className="mt-1.5 text-xs leading-5 text-ink-soft">{e.detail}</p>}
                    </div>
                  </motion.li>
                ))}
              </ol>
            </section>
          ))}
          {filtered.length === 0 && <p className="rounded-2xl bg-sand p-6 text-center text-sm text-hint">لا توجد أحداث مطابقة.</p>}
          {filtered.length > limit && (
            <div className="text-center">
              <Button variant="outline" onClick={() => setLimit((l) => l + 40)}>
                عرض المزيد ({formatNumber(filtered.length - limit)})
              </Button>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
