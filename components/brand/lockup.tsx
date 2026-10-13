"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const TATWEEL = "ـ";

/** «الس» + tatweels + «ورية»: the seen drawn out to `n`. A word without a seen is returned as it is */
function drawn(word: string, n: number) {
  const i = word.indexOf("س");
  return i < 0 ? word : `${word.slice(0, i + 1)}${TATWEEL.repeat(n)}${word.slice(i + 1)}`;
}

/**
 * The administration's lockup: its name on the first line, and the country beneath it exactly as wide — in Arabic
 * by drawing out the seen of «السورية» with tatweels, in English by spacing the letters. Measured once the font
 * is in, and again whenever the name's width changes (the display size, the theme's zoom). Screen readers read the
 * plain word.
 */
export function BrandLockup({ name, country, className, nameClass, countryClass }: { name: string; country: string; className?: string; nameClass?: string; countryClass?: string }) {
  const nameRef = useRef<HTMLSpanElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const [fit, setFit] = useState<{ n: number; spacing: number }>({ n: 4, spacing: 0 });
  const arabic = country.includes("س");

  useLayoutEffect(() => {
    const el = nameRef.current;
    const pr = probe.current;
    if (!el || !pr) return;
    const widthOf = (text: string, spacing = 0) => {
      pr.style.letterSpacing = `${spacing}px`;
      pr.textContent = text;
      return pr.getBoundingClientRect().width;
    };
    const measure = () => {
      const target = el.getBoundingClientRect().width;
      if (!target) return;
      if (arabic) {
        const base = widthOf(drawn(country, 0));
        const per = (widthOf(drawn(country, 20)) - base) / 20;
        setFit({ n: per > 0 ? Math.max(0, Math.round((target - base) / per)) : 0, spacing: 0 });
      } else {
        const base = widthOf(country);
        setFit({ n: 0, spacing: country.length > 1 ? Math.max(0, (target - base) / (country.length - 1)) : 0 });
      }
    };
    measure();
    document.fonts?.ready.then(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [country, arabic]);

  return (
    <span className={cn("relative inline-flex min-w-0 flex-col leading-tight", className)}>
      <span ref={nameRef} className={cn("whitespace-nowrap", nameClass)}>
        {name}
      </span>
      <span className={cn("whitespace-nowrap", countryClass)} style={fit.spacing ? { letterSpacing: `${fit.spacing}px`, marginInlineEnd: `-${fit.spacing}px` } : undefined}>
        <span aria-hidden>{arabic ? drawn(country, fit.n) : country}</span>
        <span className="sr-only">{country}</span>
      </span>
      {/* Measures the country's width off screen, in the same type */}
      <span ref={probe} aria-hidden className={cn("pointer-events-none invisible absolute start-0 top-0 whitespace-nowrap", countryClass)} />
    </span>
  );
}
