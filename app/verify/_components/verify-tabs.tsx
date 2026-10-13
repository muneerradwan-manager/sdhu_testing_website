"use client";

import { useRouter } from "next/navigation";

import { AnimatePresence, motion } from "motion/react";
import { Building, FileSearch } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { useLang, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { EntityCheck } from "./entity-check";
import { DocumentCheck } from "./document-check";

const TABS = [
  { key: "entity", label: "التحقق من جهة", sub: "هل التكتل أو الحملة معتمدة؟", en: "Check an organisation", subEn: "Is the cluster or campaign approved?", icon: Building },
  { key: "document", label: "التحقق من وثيقة", sub: "إيصال أو شهادة أو رمز QR", en: "Check a document", subEn: "Receipt, certificate or QR code", icon: FileSearch },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function VerifyTabs() {
  const router = useRouter();
  const t = useT();
  const en = useLang() === "en";
  const [tab, setTab] = useState<TabKey>("entity");
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = TABS.findIndex((t) => t.key === tab);

  function onKey(e: KeyboardEvent) {
    // Forward is ArrowLeft in Arabic (right to left), ArrowRight in English
    const fwd = en ? "ArrowRight" : "ArrowLeft";
    const back = en ? "ArrowLeft" : "ArrowRight";
    const dir = e.key === fwd ? 1 : e.key === back ? -1 : 0;
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
        aria-label={t("أدوات التحقق", "Verification tools")}
        onKeyDown={onKey}
        className="relative grid w-full grid-cols-2 gap-1.5 rounded-3xl border border-gold/40 bg-white p-1.5 shadow-[0_24px_60px_-40px_rgba(0,89,79,.6)]"
      >
        {TABS.map((item, i) => {
          const active = item.key === tab;
          return (
            <button
              key={item.key}
              ref={(el) => {
                refs.current[i] = el;
              }}
              role="tab"
              id={`tab-${item.key}`}
              aria-selected={active}
              aria-controls={`panel-${item.key}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(item.key)}
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
                <item.icon className="size-5" />
              </span>
              <span className="relative">
                <span className="block text-xs font-bold sm:text-base">{t(item.label, item.en)}</span>
                <span className={cn("hidden text-xs sm:block", active ? "text-white/70" : "text-ink-soft")}>{t(item.sub, item.subEn)}</span>
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
              <EntityCheck onOpenCluster={(slug) => router.push(`/clusters/${slug}`)} />
            )}
            {tab === "document" && <DocumentCheck />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
