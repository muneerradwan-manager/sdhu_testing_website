"use client";

import { ArrowLeft, Download, ScrollText, Search, SearchCheck, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { OBJECTION_APP } from "@/lib/data/staff-seed";
import { cn, formatNumber } from "@/lib/utils";
import { useAllEvents } from "../_components/data";
import { can, fmtDate, fmtTime, Gate, logAs, PageHeader, useStaffUser } from "../_components/kit";
import { FilterSelect } from "../_components/ops-ui";
import { AddButton, Box, EmptyRow, ListTable, Tag } from "../_components/wp";
import { Segments } from "../exam/_components/ui";
import { viewKeys } from "@/lib/permissions";

type Scope = "all" | "live" | "archive";

export function AuditView() {
  return (
    <Gate perms={viewKeys("audit")}>
      <Audit />
    </Gate>
  );
}

/**
 * The events log, read only: one table of who did what, when, and the value before and after — filtered
 * from the line above it. Its numbers are on «لوحتي».
 */
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
  const live = events.filter((e) => e.live).length;

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
    logAs(user, { action: "الاطلاع على سجل الأحداث", target: `تصفية: الطلب ${OBJECTION_APP}`, detail: "اعتراض: «أنا من مواليد شباط 1972، وشباط مسحوب، ولم يُقبل طلبي»" });
  };

  const exportCsv = () => {
    if (!can(user, "audit.events.export")) return;
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

  const visible = filtered.slice(0, limit);

  return (
    <div className="space-y-4">
      <PageHeader
        title="سجل الأحداث"
        icon={<ScrollText />}
        description="كل إجراء في المنصة: من فعل، ومتى، والقيمة قبل التعديل وبعده. للقراءة فقط — لا يُعدَّل حدث ولا يُحذف."
        actions={
          can(user, "audit.events.export") && (
            <AddButton onClick={exportCsv}>
              <Download className="size-4" /> تصدير ما يظهر (CSV)
            </AddButton>
          )
        }
      />

      {can(user, "audit.events.trace") && (
        <Box title="مثال: اعتراض على نتيجة القرعة" open={false}>
          <p>«أنا من مواليد شباط 1972، وشباط مسحوب في القرعة، ولم يُقبل طلبي» — حوّلت رنا التذكرة إلى التدقيق. تتبّع ما جرى على الطلب {OBJECTION_APP}: من أدخل نتائج البث، ومن اعتمدها ونشرها، ومتى.</p>
          <Button size="sm" variant={tracing ? "glass" : "gold"} onClick={trace} disabled={tracing}>
            <SearchCheck className="size-4" /> تتبّع الطلب {OBJECTION_APP}
          </Button>
        </Box>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segments
          value={scope}
          onChange={setScope}
          label="النطاق"
          items={[
            { value: "all", label: "الكل", count: events.length },
            { value: "live", label: "جلسة العرض", count: live },
            { value: "archive", label: "أرشيف الموسم", count: events.length - live },
          ]}
        />
        <label className="relative w-full md:w-80">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-white/60" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="رقم طلب، اسم، قيمة..." aria-label="بحث في السجل" className="h-11 w-full rounded-xl border-2 border-white/15 bg-white/10 pr-9 pl-3 text-sm text-white outline-none transition placeholder:text-white/50 focus:border-gold" />
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto_auto]">
        <FilterSelect value={actor} onChange={setActor} label="الموظف" all="كل الموظفين" options={actors} />
        <FilterSelect value={role} onChange={setRole} label="الصفة" all="كل الصفات" options={roles} />
        <FilterSelect value={action} onChange={setAction} label="الإجراء" all="كل الإجراءات" options={actionsList} />
        <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border-2 border-white/15 bg-white/10 px-3 text-sm text-white">
          <input type="checkbox" checked={diffOnly} onChange={(e) => setDiffOnly(e.target.checked)} className="size-4 accent-[#D9C89E]" />
          تعديلات فقط
        </label>
        {hasFilters && (
          <Button variant="glass" size="sm" className="h-11" onClick={clear}>
            <X className="size-4" /> مسح
          </Button>
        )}
      </div>

      {tracing && (
        <div className="rounded-2xl border-r-4 border-gold bg-green-light/15 p-4 text-sm leading-7 ring-1 ring-green-light/40">
          <p className="font-bold text-gold">النتيجة: الطلب {OBJECTION_APP} غير مقبول، والنتيجة صحيحة.</p>
          <p className="text-white/90">
            أُدخلت نتائج البث كما أُعلنت واعتُمدت ولم تُعدَّل بعد النشر. صاحب الطلب {OBJECTION_APP} هو والد المعترض، الأكبر سناً فيه، من مواليد 1969، والقرعة تُطابَق بميلاد صاحب الطلب لا بميلاد كل فرد. لو كان هناك تلاعب لظهر هنا: من عدّل، ومتى، ولماذا.
          </p>
        </div>
      )}

      <p className="text-xs text-white/65">
        {formatNumber(filtered.length)} حدثاً مطابقاً {tracing && "— مرتبة زمنياً من الأقدم"}
      </p>

      <ListTable head={["الوقت", "الموظف", "الإجراء", "الهدف والتفاصيل"]} minWidth="48rem">
        {filtered.length === 0 && <EmptyRow cols={4}>لا توجد أحداث مطابقة.</EmptyRow>}
        {visible.map((e) => (
          <tr key={e.id} className={cn("align-top", tracing && e.target?.includes(OBJECTION_APP) && "bg-gold/10")}>
            <td className="whitespace-nowrap p-3 text-xs text-white/70">
              <span className="block font-mono font-bold tabular-nums text-gold">{fmtTime(e.at)}</span>
              {fmtDate(e.at)}
            </td>
            <td className="p-3">
              <p className="font-bold text-white">{e.actor}</p>
              <p className="text-xs text-white/60">{e.role}</p>
            </td>
            <td className="p-3">
              <Tag tone={e.before !== undefined ? "maroon" : "green"}>{e.action}</Tag>
              {e.live && (
                <span className="mt-1 block">
                  <Tag tone="gold">جلسة العرض</Tag>
                </span>
              )}
            </td>
            <td className="p-3">
              {e.target && <p className="font-semibold text-gold">{e.target}</p>}
              {(e.before !== undefined || e.after !== undefined) && (
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  {e.before !== undefined && <span className="rounded-md bg-maroon/60 px-1.5 py-0.5 text-white line-through decoration-white/60">{e.before}</span>}
                  {e.before !== undefined && <ArrowLeft className="size-3.5 text-white/70" />}
                  {e.after !== undefined && <span className="rounded-md bg-green-light/25 px-1.5 py-0.5 font-bold text-white">{e.after}</span>}
                </p>
              )}
              {e.detail && <p className="mt-1 text-xs leading-5 text-white/75">{e.detail}</p>}
            </td>
          </tr>
        ))}
      </ListTable>
      {filtered.length > limit && (
        <div className="text-center">
          <Button variant="glass" onClick={() => setLimit((l) => l + 40)}>
            عرض المزيد ({formatNumber(filtered.length - limit)})
          </Button>
        </div>
      )}

    </div>
  );
}
