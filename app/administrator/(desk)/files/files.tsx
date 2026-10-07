"use client";

import { FileCheck2, FolderOpen, History, Languages, RefreshCw, Sparkles } from "lucide-react";
import { Card } from "@/components/portal/shell";
import { Badge } from "@/components/ui/widgets";
import { SEASON } from "@/lib/season";
import { cn, gregorianDate } from "@/lib/utils";
import { docState, seasonHistory, servedBefore } from "../../_lib/admin";
import { useDocTypes } from "../../_lib/admin-rules";
import { AdminShell, LockedCard, SectionTitle } from "../../_components/ui";
import { DocumentsStep, SkillsStep, useRecord } from "../apply/record";

/**
 * «وثائقي ومهاراتي»: the permanent file of an administrator who has served before — every document and certificate
 * he uploaded, his languages and his skills, as they stand between seasons. He renews a document, uploads a
 * new one, or changes his skills and languages here at any time, not only inside a season's application;
 * the application of each new season starts from it. It is the same file the application's first two
 * steps edit, so the two never disagree. His roles and ratings stay in «ملفي» («السجل الموسمي»).
 */
export function AdminFiles() {
  const { rec, admin } = useRecord();
  const { validity } = useDocTypes();
  const season = SEASON.hijriYear;

  if (!servedBefore(admin.id)) {
    return (
      <AdminShell title="وثائقي ومهاراتي">
        <LockedCard
          title="ملفك الدائم يبدأ مع أول موسم تشارك فيه"
          text="بعد أول موسم تخدم فيه تبقى وثائقك وشهاداتك ولغاتك ومهاراتك في ملف دائم هنا، تحدّثها متى شئت ويبدأ منها طلب كل موسم. أما هذا الموسم فترفعها في طلب التسجيل كإداري."
          href="/administrator/apply"
          cta="التسجيل كإداري"
        />
      </AdminShell>
    );
  }

  const valid = rec.documents.filter((d) => docState(d, season, validity).ok).length;
  const expired = rec.documents.length - valid;
  const served = seasonHistory(admin.id);
  // The file's history: what was uploaded in each season, newest first
  const bySeason = [...new Set(rec.documents.map((d) => d.issuedSeason))]
    .sort((a, b) => b - a)
    .map((s) => ({ season: s, role: served.find((h) => Number(h.season) === s && h.roleKey)?.role, docs: rec.documents.filter((d) => d.issuedSeason === s) }));
  const applied = !!admin.profile?.feePaidAt;

  return (
    <AdminShell title="وثائقي ومهاراتي" subtitle="ملفك الدائم بين المواسم: كل ما رفعته من وثائق وشهادات، ولغاتك ومهاراتك. حدّثه متى شئت، ومنه يبدأ طلب كل موسم جديد.">
      <dl className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { k: "وثائق سارية", v: `${valid} من ${rec.documents.length}`, icon: FileCheck2 },
          { k: "تحتاج تحديثاً", v: expired ? `${expired}` : "لا شيء", icon: RefreshCw, warn: expired > 0 },
          { k: "اللغات", v: `${rec.languages.length}`, icon: Languages },
          { k: "المهارات", v: `${rec.skills.length}`, icon: Sparkles },
        ].map((s) => (
          <div key={s.k} className="flex items-center gap-3 rounded-2xl border border-gold/30 bg-white p-4 shadow-sm">
            <span className={s.warn ? "grid size-10 place-items-center rounded-xl bg-maroon/10 text-maroon" : "grid size-10 place-items-center rounded-xl bg-sand text-gold-dark"}>
              <s.icon className="size-5" />
            </span>
            <span>
              <dt className="text-xs text-hint">{s.k}</dt>
              <dd className={s.warn ? "font-display text-xl font-bold text-maroon" : "font-display text-xl font-bold text-green-dark"}>{s.v}</dd>
            </span>
          </div>
        ))}
      </dl>
      {applied && (
        <p className="mb-6 rounded-2xl bg-gold/20 p-4 text-sm leading-6 text-maroon">
          قدّمت طلب موسم {season} بالوثائق التي كانت في ملفك يومها، ولا يتغير الطلب بما تعدّله الآن. ما تحدّثه هنا يبقى في ملفك ويظهر في طلب الموسم القادم.
        </p>
      )}
      {/* One under the other, each across the page: the documents' rows need the width */}
      <div className="space-y-6">
        <Card className="md:p-8">
          <DocumentsStep />
        </Card>
        <Card className="md:p-8">
          <SkillsStep experience={false} />
        </Card>
        <Card className="md:p-8">
          <SectionTitle icon={History}>تاريخ ملفي</SectionTitle>
          <p className="mt-1 text-sm text-ink-soft">ما رفعته في كل موسم. النسخة الأحدث من كل وثيقة هي التي تبقى في ملفك.</p>
          <ol className="mt-4 grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(15rem,1fr))]">
            {bySeason.map((s) => (
              <li key={s.season} className={cn("rounded-2xl border-2 p-4", s.season === season ? "border-maroon/30 bg-maroon/5" : "border-gold/30 bg-sand/60")}>
                <p className="flex items-center gap-2 font-bold">
                  <span className={cn("size-3 shrink-0 rounded-full", s.season === season ? "bg-maroon" : "bg-green-light")} />
                  موسم {s.season}
                </p>
                {s.role && <p className="text-xs text-hint">{s.role}</p>}
                <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                  {s.docs.map((d) => (
                    <li key={d.id} className="flex items-start gap-1.5 leading-6">
                      <FolderOpen className="mt-1 size-3.5 shrink-0 text-gold-dark" />
                      <span>
                        {d.label} {!!d.updatedAt && <Badge tone="green" className="text-[11px]">حُدّثت</Badge>}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          {rec.updatedAt > season * 1000 && <p className="mt-4 text-xs text-hint">آخر تعديل على ملفك: {gregorianDate(new Date(rec.updatedAt), { weekday: "long" })}</p>}
        </Card>
      </div>
    </AdminShell>
  );
}
