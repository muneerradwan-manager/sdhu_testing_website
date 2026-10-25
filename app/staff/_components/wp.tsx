"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown, ScrollText } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { SystemKey } from "@/lib/systems";
import { cn } from "@/lib/utils";
import { useNavBranch } from "./branch";
import { SystemRecords } from "./system";

/**
 * The staff portal's working pieces, as a site's admin works: a list is a table whose rows open on their
 * title with their actions under it (تعديل | حذف …); an item is edited on its own screen — its content in
 * the middle, small boxes on the side — or in one side sheet; settings are one form, saved once; a file's
 * numbers live on its dashboard alone, never on the pages where things are managed. What is rarely needed
 * waits closed («خيارات متقدمة»، «السجل»).
 *
 * Rules every management page follows:
 * - No statistics (KPI cards, charts) on a management page: counts appear only as the numbers beside a
 *   list's filters («الكل (12) | منشورة (9)»). The numbers belong to the file's dashboard.
 * - One clear primary action per screen («إضافة …», «حفظ»), next to the title or in the side box.
 * - A list first; editing on its own screen (`?id=` on the same route, or a side sheet) — not a long page of
 *   panels and tabs.
 * - Short, plain words: what the page is for in one line; help where it is needed, not paragraphs.
 */

/** A list's title with its «إضافة» button beside it (the page header usually says the title already) */
export function Title({ children, action }: { children?: ReactNode; action?: ReactNode }) {
  if (!children && !action) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      {children && <h2 className="font-display text-2xl font-bold text-white">{children}</h2>}
      {action}
    </div>
  );
}

/** «إضافة …» beside a list's title: a link to the edit screen, or a button opening the sheet */
export function AddButton({ href, onClick, children }: { href?: string; onClick?: () => void; children: ReactNode }) {
  const cls = "inline-flex items-center gap-1.5 rounded-xl border border-gold/60 px-3 py-1.5 text-sm font-bold text-gold transition hover:bg-gold hover:text-ink";
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

/** A list as a table: rows that open on their title */
export function ListTable({ head, children, minWidth = "40rem" }: { head: ReactNode[]; children: ReactNode; minWidth?: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-white/[.04] ring-1 ring-white/10">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead className="bg-black/25 text-white/70">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="p-3 text-right font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10 text-white">{children}</tbody>
      </table>
    </div>
  );
}

/** An empty list, said in a line */
export function EmptyRow({ cols, children }: { cols: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={cols} className="p-8 text-center text-white/60">
        {children}
      </td>
    </tr>
  );
}

/** The links under a row's title: تعديل | معاينة | حذف */
export function RowActions({ children }: { children: ReactNode }) {
  return <div className="mt-1 flex flex-wrap items-center gap-x-1 text-xs font-bold [&>*:not(:last-child)]:after:ms-1 [&>*:not(:last-child)]:after:text-white/30 [&>*:not(:last-child)]:after:content-['|']">{children}</div>;
}

export function RowLink({ onClick, href, children, danger }: { onClick?: () => void; href?: string; children: ReactNode; danger?: boolean }) {
  const cls = cn("hover:underline", danger ? "text-[#ffb4c8]" : "text-gold");
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

/** A box in the side column of an edit screen, or a closed section at the end of a page */
export function Box({ title, children, open: initial = true }: { title: string; children: ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(initial);
  return (
    <section className="overflow-hidden rounded-2xl bg-white/[.06] ring-1 ring-white/10">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between gap-2 border-b border-white/10 px-4 py-3 text-right font-bold text-white">
        {title}
        <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
      </button>
      {open && <div className="space-y-3 p-4 text-sm text-white/85">{children}</div>}
    </section>
  );
}

/**
 * An edit screen's head: back to the list, and what is being edited. The screen also hangs from its list in the
 * sidebar's tree (`useNavBranch`) — adding an item too, which has no entry of its own — unless `nav={false}` (not found).
 */
export function EditHeader({ back, backLabel, title, children, nav = true, navTitle }: { back: string; backLabel: string; title: ReactNode; children?: ReactNode; nav?: boolean; navTitle?: string }) {
  // `navTitle`: the line in the tree when the title is more than text (a flight's number with its status)
  const text = navTitle ?? (typeof title === "string" ? title : null);
  const named = nav ? text : null;
  useNavBranch(named ? { anchor: back.split("?")[0], title: named, closeHref: back } : null);
  return (
    <div className="mb-5">
      <Link href={back} className="inline-flex items-center gap-1 text-sm font-bold text-gold hover:underline">
        <ArrowRight className="size-4" /> {backLabel}
      </Link>
      <h1 className="mt-2 font-display text-3xl font-bold text-white">{title}</h1>
      {children && <p className="mt-1 text-sm text-white/65">{children}</p>}
    </div>
  );
}

/** An edit screen: the content in the middle, its boxes on the side */
export function EditLayout({ main, side }: { main: ReactNode; side: ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="min-w-0 space-y-5">{main}</div>
      <aside className="space-y-4">{side}</aside>
    </div>
  );
}

/** A settings form's section */
export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white/[.04] px-5 py-2 ring-1 ring-white/10">
      <h2 className="border-b border-white/10 py-3 font-display text-lg font-bold text-gold">{title}</h2>
      {children}
    </section>
  );
}

/** One line of a settings form: what it is on one side, the field on the other */
export function SettingsRow({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-2 border-b border-white/10 py-4 last:border-0 md:grid-cols-[13rem_minmax(0,1fr)]">
      <div>
        <p className="font-bold text-white">{label}</p>
        {hint && <p className="mt-0.5 text-xs leading-5 text-white/55">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** A file's dashboard opens with how its work goes, in three or four steps, each a link to where it is done */
export function HowItWorks({ steps }: { steps: { title: string; text: string; href: string; link: string }[] }) {
  const n = ["١", "٢", "٣", "٤", "٥"];
  return (
    <Box title="كيف تعمل؟" open={false}>
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gold text-sm font-bold text-ink">{n[i]}</span>
            <div className="min-w-0">
              <p className="font-bold text-white">{s.title}</p>
              <p className="leading-6 text-white/70">{s.text}</p>
              <Link href={s.href} className="text-sm font-bold text-gold hover:underline">
                {s.link} ←
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </Box>
  );
}

/** What was done in a part of a file, closed at the end of its page until it is wanted */
export function RecordsBox({ system, area, title = "السجل" }: { system: SystemKey; area: string; title?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex items-center gap-1.5 text-sm font-bold text-white/60 hover:text-white">
        <ScrollText className="size-4" /> {title} <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-3">
          <SystemRecords system={system} area={area} title={title} />
        </div>
      )}
    </div>
  );
}

/** A small status label in a row */
export function Tag({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "gold" | "green" | "maroon" }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-bold ring-1",
        tone === "gold" ? "bg-gold/20 text-gold ring-gold/40" : tone === "green" ? "bg-green-light/25 text-white ring-green-light/50" : tone === "maroon" ? "bg-maroon text-white ring-maroon-light" : "bg-white/10 text-white/75 ring-white/15",
      )}
    >
      {children}
    </span>
  );
}
