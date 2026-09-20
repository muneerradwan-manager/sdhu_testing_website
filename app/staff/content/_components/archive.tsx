"use client";

import { AnimatePresence, motion } from "motion/react";
import { Archive, ArchiveRestore, FileText, Layers, Newspaper } from "lucide-react";
import { useToast } from "@/components/ui/widgets";
import { CmsIcon } from "@/components/cms/bits";
import { getCollectionDef } from "@/lib/cms/collections";
import { CMS_PAGES, getPageDef, getSectionDef } from "@/lib/cms/schema";
import { archivedItems, archivedSections, cms, cmsMemo, useCms } from "@/lib/cms/store";
import type { StaffUser } from "@/lib/staff";
import { Empty, fmtDateTime, logAs, Panel } from "../../_components/kit";

/**
 * سلة الأرشيف: الصفحات والأقسام التي أخرجها الموظف من الموقع.
 * لا شيء يُحذف نهائياً — الاستعادة تعيده إلى مكانه في المسودة.
 */
export function ArchiveView({ user, onOpenPage }: { user: StaffUser; onOpenPage: (pageId: string) => void }) {
  const toast = useToast();
  const author = { name: user.name, title: user.title };

  const pages = useCms((s) => cmsMemo("archivedPages", s, () => CMS_PAGES.filter((p) => s.pages[p.id]?.status === "archived")));
  const sections = useCms(archivedSections);
  const items = useCms(archivedItems);

  const restorePage = (id: string, label: string) => {
    cms.setPageStatus(id, "draft", author);
    logAs(user, { action: "استعادة صفحة من الأرشيف", target: label, after: "مسودة" });
    toast({ title: "استُعيدت الصفحة كمسودة", body: "راجعها ثم انشرها للزوار", tone: "success", icon: "📄" });
    onOpenPage(id);
  };

  const restoreSection = (pageId: string, sectionId: string, label: string) => {
    cms.setSectionArchived(pageId, sectionId, false, author);
    logAs(user, { action: "استعادة قسم من الأرشيف", target: label });
    toast({ title: "استُعيد القسم", body: "انشر الصفحة ليظهر للزوار", tone: "success", icon: "↩️" });
  };

  const restoreItem = (colId: string, itemId: string, label: string) => {
    cms.setItemArchived(colId, itemId, false, author);
    logAs(user, { action: "استعادة عنصر من الأرشيف", target: label });
    toast({ title: "استُعيد العنصر", body: "انشر المجموعة ليظهر للزوار", tone: "success", icon: "↩️" });
  };

  const empty = pages.length === 0 && sections.length === 0 && items.length === 0;

  return (
    <div className="space-y-4">
      {empty && (
        <Panel title="سلة الأرشيف" icon={<Archive />}>
          <Empty
            icon={<Archive />}
            title="الأرشيف فارغ"
            text="ما تؤرشفه من صفحات أو أقسام أو مقالات يظهر هنا، ويبقى محفوظاً حتى تستعيده. لا شيء يُحذف من الموقع نهائياً."
          />
        </Panel>
      )}

      {pages.length > 0 && (
        <Panel title="صفحات مؤرشفة" icon={<FileText />} action={<span className="text-xs text-white/55">{pages.length} صفحة</span>}>
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {pages.map((p) => {
                return (
                  <motion.li
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/[.04] p-3.5"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-gold">{p.icon ? <CmsIcon name={p.icon} className="size-5" /> : <FileText className="size-5" />}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-white">{p.label}</p>
                      <p className="truncate text-xs text-white/55">{p.description}</p>
                    </div>
                    <button
                      onClick={() => restorePage(p.id, p.label)}
                      className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gold px-3.5 py-2 text-sm font-bold text-ink transition hover:bg-gold-light"
                    >
                      <ArchiveRestore className="size-4" /> استعادة
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </Panel>
      )}

      {sections.length > 0 && (
        <Panel title="أقسام مؤرشفة" icon={<Layers />} action={<span className="text-xs text-white/55">{sections.length} قسماً</span>}>
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {sections.map(({ pageId, sectionId, at }) => {
                const page = getPageDef(pageId);
                const section = getSectionDef(pageId, sectionId);
                if (!page || !section) return null;
                return (
                  <motion.li
                    key={`${pageId}/${sectionId}`}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/[.04] p-3.5"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-gold">{section.icon ? <CmsIcon name={section.icon} className="size-5" /> : <Layers className="size-5" />}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-white">{section.label}</p>
                      <p className="truncate text-xs text-white/55">
                        من صفحة «{page.label}»{at ? ` · أُرشف ${fmtDateTime(at)}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => onOpenPage(pageId)}
                      className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white/80 transition hover:bg-white/20 hover:text-white"
                    >
                      فتح الصفحة
                    </button>
                    <button
                      onClick={() => restoreSection(pageId, sectionId, `${page.label} — ${section.label}`)}
                      className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gold px-3.5 py-2 text-sm font-bold text-ink transition hover:bg-gold-light"
                    >
                      <ArchiveRestore className="size-4" /> استعادة
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </Panel>
      )}

      {items.length > 0 && (
        <Panel title="عناصر مؤرشفة" icon={<Newspaper />} action={<span className="text-xs text-white/55">{items.length} عنصراً</span>}>
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {items.map(({ colId, itemId, title }) => {
                const col = getCollectionDef(colId);
                if (!col) return null;
                return (
                  <motion.li
                    key={`${colId}/${itemId}`}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/[.04] p-3.5"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-gold">
                      {col.icon ? <CmsIcon name={col.icon} className="size-5" /> : <Newspaper className="size-5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-white">{title}</p>
                      <p className="truncate text-xs text-white/55">من مجموعة «{col.label}»</p>
                    </div>
                    <button
                      onClick={() => onOpenPage(colId)}
                      className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white/80 transition hover:bg-white/20 hover:text-white"
                    >
                      فتح المجموعة
                    </button>
                    <button
                      onClick={() => restoreItem(colId, itemId, `${col.label} — ${title}`)}
                      className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gold px-3.5 py-2 text-sm font-bold text-ink transition hover:bg-gold-light"
                    >
                      <ArchiveRestore className="size-4" /> استعادة
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </Panel>
      )}
    </div>
  );
}
