"use client";

import { AnimatePresence, motion } from "motion/react";
import { FileClock, History, Trash2, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useToast } from "@/components/ui/widgets";
import { CMS_COLLECTIONS, getCollectionDef } from "@/lib/cms/collections";
import { getPageDef, CMS_PAGES } from "@/lib/cms/schema";
import { cms, useCms } from "@/lib/cms/store";
import type { StaffUser } from "@/lib/staff";
import { cn } from "@/lib/utils";
import { Empty, fmtDateTime, logAs, Panel, Tabs } from "../../_components/kit";

/**
 * سجل المراجعات: كل نشر أو تغيير حالة يحفظ لقطة من المحتوى السابق.
 * الاستعادة لا تنشر مباشرة — تضع النسخة القديمة في المسودة ليراجعها الموظف ثم ينشرها.
 */
export function RevisionsView({ user, focusPage, onOpenPage }: { user: StaffUser; focusPage?: string; onOpenPage: (pageId: string) => void }) {
  const toast = useToast();
  const revisions = useCms((s) => s.revisions);
  const [filter, setFilter] = useState<string>(focusPage ?? "all");

  const shown = useMemo(() => (filter === "all" ? revisions : revisions.filter((r) => r.pageId === filter)), [revisions, filter]);

  const tabs = useMemo(() => {
    const counts = new Map<string, number>();
    revisions.forEach((r) => counts.set(r.pageId, (counts.get(r.pageId) ?? 0) + 1));
    return [
      { value: "all", label: "الكل", count: revisions.length },
      ...[...CMS_PAGES, ...CMS_COLLECTIONS]
        .filter((x) => counts.has(x.id))
        .map((x) => ({ value: x.id, label: x.label, count: counts.get(x.id) ?? 0 })),
    ];
  }, [revisions]);

  const restore = (id: string, pageId: string, label: string) => {
    cms.restoreRevision(id, { name: user.name, title: user.title });
    logAs(user, { action: "استعادة نسخة سابقة", target: label, detail: "وُضعت في المسودة بانتظار النشر" });
    toast({ title: "استُعيدت النسخة إلى المسودة", body: "راجعها ثم اضغط «نشر»", tone: "success", icon: "🕘" });
    onOpenPage(pageId);
  };

  return (
    <Panel title="النسخ السابقة" icon={<History />} action={<span className="text-xs text-white/55">تُحفظ آخر 20 نسخة لكل صفحة</span>}>
      {revisions.length === 0 ? (
        <Empty icon={<FileClock />} title="لا توجد نسخ بعد" text="تُحفظ نسخة تلقائياً قبل كل عملية نشر أو تغيير حالة، فتستطيع العودة إليها في أي وقت." />
      ) : (
        <div className="space-y-4">
          <Tabs id="revisions" tabs={tabs} value={filter} onChange={setFilter} />
          <ol className="relative space-y-2 border-r-2 border-white/10 pr-5">
            <AnimatePresence initial={false}>
              {shown.map((r) => {
                const target = getPageDef(r.pageId) ?? getCollectionDef(r.pageId);
                return (
                  <motion.li
                    key={r.id}
                    layout
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="relative rounded-2xl bg-white/[.04] p-3.5 transition hover:bg-white/[.07]"
                  >
                    <span className="absolute -right-[26px] top-5 size-3 rounded-full border-2 border-[#00352f] bg-gold" />
                    <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white">{r.note}</p>
                        <p className="mt-0.5 text-xs text-white/60">
                          {target?.label ?? r.pageId} · {fmtDateTime(r.at)} · {r.by}
                          {r.byTitle ? ` (${r.byTitle})` : ""}
                        </p>
                        <p className="mt-1 text-[11px] text-white/45">
                          {r.scope === "collection"
                            ? `${Object.keys(r.itemsSnapshot?.items ?? {}).length} عنصراً محفوظاً في هذه النسخة`
                            : `${countValues(r.snapshot.sections)} حقلاً محفوظاً في هذه النسخة`}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <button
                          onClick={() => restore(r.id, r.pageId, target?.label ?? r.pageId)}
                          className="flex items-center gap-1.5 rounded-xl bg-gold px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-gold-light"
                        >
                          <Undo2 className="size-3.5" /> استعادة
                        </button>
                        <button
                          onClick={() => {
                            cms.deleteRevision(r.id);
                            toast({ title: "حُذفت النسخة من السجل", tone: "warning", icon: "🗑️" });
                          }}
                          className="grid size-8 place-items-center rounded-xl bg-white/10 text-white/60 transition hover:bg-maroon/40 hover:text-white"
                          title="حذف النسخة"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ol>
          {shown.length === 0 && <p className={cn("py-6 text-center text-sm text-white/55")}>لا نسخ محفوظة لهذه الصفحة بعد.</p>}
        </div>
      )}
    </Panel>
  );
}

function countValues(sections: Record<string, { values?: Record<string, unknown> }>) {
  return Object.values(sections).reduce((n, s) => n + Object.keys(s.values ?? {}).length, 0);
}
