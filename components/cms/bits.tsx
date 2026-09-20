"use client";

import Link from "next/link";
import { Eye, PencilLine, X } from "lucide-react";
import { createElement, type ReactNode } from "react";
import { cms, useCmsHydrated, usePreview, useSectionVisible } from "@/lib/cms/store";
import { cmsIcon } from "@/lib/cms/icons";
import { cn } from "@/lib/utils";

/** يخفي القسم كاملاً إن أخفاه الموظف أو أرشفه من لوحة التحكم */
export function CmsSection({ page, section, children }: { page: string; section: string; children: ReactNode }) {
  const visible = useSectionVisible(page, section);
  return visible ? <>{children}</> : null;
}

/**
 * أيقونة يختارها الموظف من لوحة التحكم. تُنشأ بـ createElement لأن الأيقونة تأتي من سجل
 * جاهز باسمها، ولا يصحّ إسناد مكوّن إلى متغيّر جديد في كل عرض.
 */
export function CmsIcon({ name, className, fallback }: { name: unknown; className?: string; fallback?: string }) {
  const icon = cmsIcon(name) ?? cmsIcon(fallback);
  return icon ? createElement(icon, { className }) : null;
}

/**
 * شريط يظهر للموظف حين يشغّل وضع المعاينة، ليعرف أنه ينظر إلى مسودات
 * لم يرها الزوار بعد، ويعود منه إلى لوحة التحكم بضغطة.
 */
export function PreviewBar() {
  const hydrated = useCmsHydrated();
  const preview = usePreview();
  if (!hydrated || !preview) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] border-t border-gold/40 bg-maroon-dark/95 text-white backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 text-sm md:px-8">
        <span className="flex items-center gap-2 font-bold text-gold">
          <Eye className="size-4" /> وضع المعاينة
        </span>
        <span className="text-white/75">تشاهد المسودات غير المنشورة — الزوار ما زالوا يرون المحتوى المنشور.</span>
        <div className="mr-auto flex items-center gap-2">
          <Link
            href="/staff/content"
            className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 font-bold transition hover:bg-white/25"
          >
            <PencilLine className="size-4" /> لوحة المحتوى
          </Link>
          <button
            onClick={() => cms.setPreview(false)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" /> إيقاف
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── قارئات آمنة للقيم ─────────────────────────

export function str(values: Record<string, unknown>, key: string, fallback = ""): string {
  const v = values[key];
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : fallback;
}

export function num(values: Record<string, unknown>, key: string, fallback = 0): number {
  const v = values[key];
  return typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)) ? Number(v) : fallback;
}

export function bool(values: Record<string, unknown>, key: string, fallback = false): boolean {
  const v = values[key];
  return typeof v === "boolean" ? v : fallback;
}

export function list<T extends Record<string, unknown>>(values: Record<string, unknown>, key: string): T[] {
  const v = values[key];
  return Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as T[]) : [];
}

/** ألوان البطاقات التي يختارها الموظف */
export const toneClass = {
  green: { chip: "bg-green-dark/8 text-green-dark", border: "border-gold/30" },
  gold: { chip: "bg-gold text-ink", border: "border-transparent" },
  maroon: { chip: "bg-maroon/10 text-maroon", border: "border-gold/30" },
} as const;

export function tone(v: unknown): keyof typeof toneClass {
  return v === "gold" || v === "maroon" ? v : "green";
}

export { cn };
