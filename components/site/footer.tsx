"use client";

import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Emblem } from "@/components/brand/logo";
import { SOCIAL_PATHS, useFooter, useNav, useSiteIdentity } from "@/lib/cms/site";

/** كل نصوص التذييل وروابطه تأتي من لوحة المحتوى (الإعدادات العامة ← تذييل الموقع) */
export function Footer() {
  const identity = useSiteIdentity();
  const { nav, more } = useNav();
  const f = useFooter();

  return (
    <footer className="relative mt-24 overflow-hidden bg-ink text-white/75">
      <div className="bg-pattern absolute inset-0 opacity-[.07]" />
      <div className="h-1.5 bg-gradient-to-l from-green-dark via-gold-dark to-maroon" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 md:grid-cols-2 md:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <div className="flex items-center gap-3">
            <Emblem className="size-14" />
            <div>
              <p className="font-display text-xl font-bold text-white">{identity.name}</p>
              <p className="text-sm text-gold">{identity.authority}</p>
            </div>
          </div>
          {f.about && <p className="mt-5 max-w-sm leading-8">{f.about}</p>}
          {f.social.length > 0 && (
            <div className="mt-6 flex gap-2">
              {f.social.map((s, i) => (
                <a
                  key={`${s.network}-${i}`}
                  href={s.href || "#"}
                  aria-label={s.label}
                  className="grid size-10 place-items-center rounded-xl bg-white/5 text-gold transition hover:-translate-y-0.5 hover:bg-gold hover:text-ink"
                >
                  <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
                    <path d={SOCIAL_PATHS[s.network] ?? SOCIAL_PATHS.facebook} />
                  </svg>
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-5 font-display text-lg font-bold text-white">{f.col1Title}</h3>
          <ul className="space-y-3">
            {nav.slice(1).map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="transition hover:text-gold">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-5 font-display text-lg font-bold text-white">{f.col2Title}</h3>
          <ul className="space-y-3">
            {f.col2.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition hover:text-gold">
                  {l.label}
                </Link>
              </li>
            ))}
            {more.map((m) => (
              <li key={m.href}>
                <Link href={m.href} className="inline-flex items-center gap-2 transition hover:text-gold">
                  {m.label}
                  {m.soon && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-gold">قريباً</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-5 font-display text-lg font-bold text-white">{f.contactTitle}</h3>
          <ul className="space-y-4">
            {f.address && (
              <li className="flex gap-3">
                <MapPin className="size-5 shrink-0 text-gold" /> {f.address}
              </li>
            )}
            {f.phone && (
              <li className="flex gap-3">
                <Phone className="size-5 shrink-0 text-gold" /> <span dir="ltr">{f.phone}</span>
              </li>
            )}
            {f.email && (
              <li className="flex gap-3">
                <Mail className="size-5 shrink-0 text-gold" /> {f.email}
              </li>
            )}
          </ul>
          {f.hours && <p className="mt-5 rounded-2xl border border-gold/20 bg-white/5 p-3 text-xs leading-6">{f.hours}</p>}
        </div>
      </div>
      <div className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-white/50 md:flex-row md:px-8">
          <p>{f.legal}</p>
          <p>{f.credits}</p>
        </div>
      </div>
    </footer>
  );
}
