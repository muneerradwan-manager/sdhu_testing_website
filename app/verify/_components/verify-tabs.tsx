"use client";

import { AnimatePresence, motion } from "motion/react";
import { Building, FileSearch, Hotel } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { EntityCheck } from "./entity-check";
import { DocumentCheck } from "./document-check";
import { ServicesDirectory } from "./services-directory";

const TABS = [
  { key: "entity", label: "التحقق من جهة", sub: "هل التكتل أو الحملة معتمدة؟", icon: Building },
  { key: "document", label: "التحقق من وثيقة", sub: "إيصال أو شهادة أو رمز QR", icon: FileSearch },
  { key: "directory", label: "دليل الخدمات", sub: "برامج التكتلات المعتمدة", icon: Hotel },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function VerifyTabs() {
  const [tab, setTab] = useState<TabKey>("entity");
  const [openCluster, setOpenCluster] = useState<string | null>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = TABS.findIndex((t) => t.key === tab);

  function onKey(e: KeyboardEvent) {
    // RTL: ArrowLeft moves forward
    const dir = e.key === "ArrowLeft" ? 1 : e.key === "ArrowRight" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (index + dir + TABS.length) % TABS.length;
    setTab(TABS[next].key);
    refs.current[next]?.focus();
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="أدوات التحقق"
        onKeyDown={onKey}
        className="relative mx-auto grid max-w-4xl grid-cols-3 gap-1.5 rounded-3xl border border-gold/40 bg-white p-1.5 shadow-[0_24px_60px_-40px_rgba(0,89,79,.6)]"
      >
        {TABS.map((t, i) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              ref={(el) => {
                refs.current[i] = el;
              }}
              role="tab"
              id={`tab-${t.key}`}
              aria-selected={active}
              aria-controls={`panel-${t.key}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(t.key)}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-[1.1rem] px-2 py-3 text-center transition sm:flex-row sm:gap-3 sm:px-4 sm:text-start",
                active ? "text-white" : "text-ink hover:bg-sand",
              )}
            >
              {active && (
                <motion.span
                  layoutId="verify-tab"
                  className="absolute inset-0 rounded-[1.1rem] bg-gradient-to-br from-green-dark to-green shadow-[0_12px_30px_-12px_rgba(0,89,79,.9)]"
                  transition={{ type: "spring", damping: 28, stiffness: 320 }}
                />
              )}
              <span
                className={cn(
                  "relative flex size-10 shrink-0 items-center justify-center rounded-xl transition",
                  active ? "bg-white/15 text-gold" : "bg-green-light/10 text-green",
                )}
              >
                <t.icon className="size-5" />
              </span>
              <span className="relative">
                <span className="block text-xs font-bold sm:text-base">{t.label}</span>
                <span className={cn("hidden text-xs sm:block", active ? "text-white/70" : "text-ink-soft")}>{t.sub}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-10">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            role="tabpanel"
            id={`panel-${tab}`}
            aria-labelledby={`tab-${tab}`}
            // No filter here: a lingering filter would trap the fixed-position modals inside this panel
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {tab === "entity" && (
              <EntityCheck
                onOpenCluster={(slug) => {
                  setOpenCluster(slug);
                  setTab("directory");
                }}
              />
            )}
            {tab === "document" && <DocumentCheck />}
            {tab === "directory" && <ServicesDirectory openSlug={openCluster} onOpenChange={setOpenCluster} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
