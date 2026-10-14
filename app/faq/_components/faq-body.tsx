"use client";

import { FileSearch, ScrollText } from "lucide-react";
import { CmsPageHero } from "@/components/cms/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/motion";
import { useT } from "@/lib/i18n";
import { Faq } from "./faq";

/** «الأسئلة الشائعة»: the approved answers, by topic and searchable, on a page of their own */
export function FaqBody() {
  const t = useT();
  return (
    <>
      <CmsPageHero page="faq" />
      <section className="mx-auto max-w-7xl px-4 pt-16 md:px-8 md:pt-24">
        <Faq />
      </section>
      <section className="mx-auto max-w-4xl px-4 py-20 md:px-8 md:py-28">
        <Reveal>
          <div className="rounded-[2rem] border border-gold/40 bg-white p-6 text-center md:p-10">
            <p className="font-display text-2xl font-bold text-green-dark">{t("لم تجد جواب سؤالك؟", "Didn't find your answer?")}</p>
            <p className="mx-auto mt-2 max-w-xl leading-8 text-ink-soft">
              {t(
                "الشروط والتكاليف كاملة مع فحص أهلية مبدئي في صفحة الشروط، ونتائج القبول المباشر والقرعة في صفحة النتائج.",
                "The full conditions and costs, with a quick eligibility check, are on the conditions page; the results of direct acceptance and the lottery are on the results page.",
              )}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink href="/conditions" variant="primary">
                <ScrollText className="size-5" /> {t("شروط التسجيل والتكاليف", "Conditions and costs")}
              </ButtonLink>
              <ButtonLink href="/results" variant="outline">
                <FileSearch className="size-5" /> {t("نتائج القبول", "Admission results")}
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
