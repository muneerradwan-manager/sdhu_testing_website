"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowRight, ArrowUp, Save } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Box } from "../../_components/wp";

/**
 * The pieces the administrators' file adds to the staff portal's site-admin kit (`../../_components/wp`): the
 * views of a page as links in its address, the closed «كيف تعمل؟» box, the order arrows of a list, the save line
 * of a form, and the secondary buttons beside a list (Excel, columns…).
 */

/** The value of a view kept in the address (`?s=…`), the first of `keys` when absent or unknown */
export function useView<T extends string>(param: string, keys: readonly T[]): T {
  const params = useSearchParams();
  const v = params.get(param);
  return keys.find((k) => k === v) ?? keys[0];
}

/** The id of the item an edit screen opens (`?id=…`) */
export function useOpenId() {
  return useSearchParams().get("id");
}

/** A link to this page with one parameter set (or removed with `null`), the others kept — the opened item dropped */
export function useHrefWith() {
  const pathname = usePathname();
  const params = useSearchParams();
  return (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    p.delete("id");
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    const q = p.toString();
    return q ? `${pathname}?${q}` : pathname;
  };
}

/**
 * A page's views, each a link: as tabs across a settings page («المواعيد | الصلاحيات …»), or as the light links
 * over a list («الكل (12) | مقبولة (9)»). The first view is the page's own address.
 */
export function Views<T extends string>({ param, value, items, tabs = false, label }: { param: string; value: T; items: { key: T; label: string; count?: number }[]; tabs?: boolean; label: string }) {
  const hrefWith = useHrefWith();
  const href = (k: T, i: number) => hrefWith({ [param]: i === 0 ? null : k });
  if (tabs)
    return (
      <nav aria-label={label} className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto border-b border-white/15 px-1">
        {items.map((it, i) => {
          const on = it.key === value;
          return (
            <Link
              key={it.key}
              href={href(it.key, i)}
              scroll={false}
              aria-current={on ? "page" : undefined}
              className={cn("-mb-px shrink-0 rounded-t-xl border px-3.5 py-2 text-sm font-bold transition", on ? "border-white/15 border-b-transparent bg-white/[.08] text-white" : "border-transparent text-white/65 hover:text-gold")}
            >
              {it.label}
              {it.count !== undefined && <span className="ms-1 text-xs font-normal text-white/50">({it.count})</span>}
            </Link>
          );
        })}
      </nav>
    );
  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
      {items.map((it, i) => {
        const on = it.key === value;
        return (
          <span key={it.key} className="flex items-center gap-1">
            {i > 0 && <span className="text-white/25">|</span>}
            <Link href={href(it.key, i)} scroll={false} aria-current={on ? "page" : undefined} className={cn("rounded-md px-1 font-bold", on ? "text-white" : "text-gold hover:underline")}>
              {it.label}
              {it.count !== undefined && <span className={cn("ms-1 font-normal", on ? "text-white/70" : "text-white/50")}>({it.count})</span>}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}

/** In-page filters over a list, as the same light links but held in the page («الكل (12) | ناقصة (3)») */
export function Filters<T extends string>({ value, onChange, items, label }: { value: T; onChange: (v: T) => void; items: { key: T; label: string; count?: number }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
      {items.map((it, i) => {
        const on = it.key === value;
        return (
          <span key={it.key} className="flex items-center gap-1">
            {i > 0 && <span className="text-white/25">|</span>}
            <button type="button" role="radio" aria-checked={on} onClick={() => onChange(it.key)} className={cn("rounded-md px-1 font-bold", on ? "text-white" : "text-gold hover:underline")}>
              {it.label}
              {it.count !== undefined && <span className={cn("ms-1 font-normal", on ? "text-white/70" : "text-white/50")}>({it.count})</span>}
            </button>
          </span>
        );
      })}
    </div>
  );
}

/** What a page or a part of it is for, at length — closed until it is wanted */
export function Help({ children, title = "كيف تعمل؟" }: { children: ReactNode; title?: string }) {
  return (
    <Box title={title} open={false}>
      <div className="space-y-2 leading-7 text-white/75">{children}</div>
    </Box>
  );
}

/** The one line under a list's title saying what it holds */
export function Lead({ children }: { children: ReactNode }) {
  return <p className="-mt-2 mb-4 text-sm leading-7 text-white/65">{children}</p>;
}

/** A small secondary button beside a list (Excel, الأعمدة, إرسال…) */
export function Tool({ onClick, children, disabled }: { onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-bold text-white/75 ring-1 ring-white/15 transition hover:bg-white/10 hover:text-white disabled:opacity-40 [&_svg]:size-4">
      {children}
    </button>
  );
}

/** Up and down in a list's order */
export function Order({ onUp, onDown, first, last, name }: { onUp: () => void; onDown: () => void; first: boolean; last: boolean; name: string }) {
  const cls = "grid size-8 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-25";
  return (
    <span className="flex">
      <button type="button" aria-label={`نقل ${name} إلى الأعلى`} disabled={first} onClick={onUp} className={cls}>
        <ArrowUp className="size-4" />
      </button>
      <button type="button" aria-label={`نقل ${name} إلى الأسفل`} disabled={last} onClick={onDown} className={cls}>
        <ArrowDown className="size-4" />
      </button>
    </span>
  );
}

/** A form's one save, and whether anything waits to be saved */
export function SaveLine({ dirty, onSave, label = "حفظ التغييرات", disabled, note }: { dirty: boolean; onSave: () => void; label?: string; disabled?: boolean; note?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="gold" onClick={onSave} disabled={!dirty || disabled}>
        <Save className="size-4" /> {label}
      </Button>
      <span className="text-xs text-white/60">{note ?? (dirty ? "لديك تعديلات لم تُحفظ." : "لا تعديلات.")}</span>
    </div>
  );
}

/** An edit screen whose item is gone (deleted, or a link from another device) */
export function NotFound({ back, backLabel, what }: { back: string; backLabel: string; what: string }) {
  return (
    <div className="rounded-2xl bg-white/[.06] p-8 text-center text-white/75 ring-1 ring-white/10">
      <p>{what} غير موجود.</p>
      <Link href={back} className="mt-3 inline-flex items-center gap-1 font-bold text-gold hover:underline">
        <ArrowRight className="size-4" /> {backLabel}
      </Link>
    </div>
  );
}

/** The cell of a row's title: its name (a link or a button that opens it), a line under it, and its actions */
export function TitleCell({ title, href, onOpen, sub, actions, muted }: { title: ReactNode; href?: string; onOpen?: () => void; sub?: ReactNode; actions?: ReactNode; muted?: boolean }) {
  const cls = cn("text-right font-bold hover:text-gold", muted ? "text-white/60" : "text-white");
  return (
    <td className="p-3 align-top">
      {href ? (
        <Link href={href} className={cls}>
          {title}
        </Link>
      ) : onOpen ? (
        <button type="button" onClick={onOpen} className={cls}>
          {title}
        </button>
      ) : (
        <span className={cls}>{title}</span>
      )}
      {sub && <div className="mt-0.5 text-xs leading-5 text-white/55">{sub}</div>}
      {actions}
    </td>
  );
}
