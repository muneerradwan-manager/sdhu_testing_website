"use client";

import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { BRAND, Emblem } from "@/components/brand/logo";
import { BrandLockup } from "@/components/brand/lockup";
import { SOCIAL_PATHS, useFooter, useNav } from "@/lib/cms/site";
import { useT } from "@/lib/i18n";

/**
 * كل نصوص التذييل وروابطه تأتي من لوحة المحتوى (الإعدادات العامة ← تذييل الموقع). Kept short: the brand and how
 * to reach the administration side by side, and each group of links laid out in two columns rather than one long one
 */
export function Footer() {
  const t = useT();
  const { nav, more } = useNav();
  const f = useFooter();
  const groups = [
    { title: f.col1Title, links: nav.slice(1).map((n) => ({ href: n.href, label: n.label, soon: false })) },
    { title: f.col2Title, links: [...f.col2.map((l) => ({ href: l.href, label: l.label, soon: false })), ...more.map((m) => ({ href: m.href, label: m.label, soon: !!m.soon }))] },
  ].map((g) => ({ ...g, links: g.links.filter((l, i, all) => all.findIndex((x) => x.href === l.href) === i) })); // a page in both lists, once

  return (
    <footer className="relative mt-24 overflow-hidden bg-ink text-sm text-white/75">
      <div className="bg-pattern absolute inset-0 opacity-[.07]" />
      <div className="h-1.5 bg-gradient-to-l from-green-dark ltr:bg-gradient-to-r via-gold-dark to-maroon" />
      <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 md:px-8 lg:grid-cols-[1.1fr_2.2fr]">
        {/* The administration: who, and how to reach it */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Emblem className="size-12" />
            <BrandLockup name={t(BRAND.name, "Directorate of Hajj and Umrah")} country={t(BRAND.country, "Syria")} nameClass="font-display text-lg font-bold text-white" countryClass="text-xs font-semibold text-gold" />
          </div>
          {f.about && <p className="max-w-sm leading-7 text-white/65">{f.about}</p>}
          <ul className="space-y-2">
            {f.address && (
              <li className="flex gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-gold" /> {f.address}
              </li>
            )}
            {(f.phone || f.email) && (
              <li className="flex flex-wrap gap-x-5 gap-y-2">
                {f.phone && (
                  <span className="flex gap-2.5">
                    <Phone className="mt-0.5 size-4 shrink-0 text-gold" /> <span dir="ltr">{f.phone}</span>
                  </span>
                )}
                {f.email && (
                  <span className="flex gap-2.5">
                    <Mail className="mt-0.5 size-4 shrink-0 text-gold" /> {f.email}
                  </span>
                )}
              </li>
            )}
          </ul>
          {f.hours && <p className="text-xs text-white/50">{f.hours}</p>}
          {f.social.length > 0 && (
            <div className="flex gap-2">
              {f.social.map((s, i) => (
                <a
                  key={`${s.network}-${i}`}
                  href={s.href || "#"}
                  aria-label={s.label}
                  className="grid size-9 place-items-center rounded-xl bg-white/5 text-gold transition hover:-translate-y-0.5 hover:bg-gold hover:text-ink"
                >
                  <svg viewBox="0 0 24 24" className="size-4.5" fill="currentColor" aria-hidden>
                    <path d={SOCIAL_PATHS[s.network] ?? SOCIAL_PATHS.facebook} />
                  </svg>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* The links, each group in two columns */}
        <div className="grid gap-8 sm:grid-cols-[1fr_1.6fr]">
          {groups.map((g) => (
            <nav key={g.title} aria-label={g.title}>
              <h3 className="mb-3 font-display text-base font-bold text-white">{g.title}</h3>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="inline-flex items-center gap-1.5 transition hover:text-gold">
                      {l.label}
                      {l.soon && <span className="rounded-full bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold text-gold">{t("قريباً", "Soon")}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-1 px-4 py-4 text-xs text-white/50 md:flex-row md:px-8">
          <p>{f.legal}</p>
          <p>{f.credits}</p>
        </div>
      </div>
    </footer>
  );
}
