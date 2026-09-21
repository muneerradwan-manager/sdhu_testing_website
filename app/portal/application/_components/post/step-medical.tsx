"use client";

import { motion } from "motion/react";
import { BadgeCheck, CheckCircle2, FileUp, HeartPulse, Loader2, MessageCircle, Phone, Pill as PillIcon, Upload } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { coordinatorOf, groupInfo } from "@/lib/assignment";
import { ageOf, fullName, relationLabel } from "@/lib/registry";
import { actions } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Question } from "../../../apply/_components/ui";
import { COORDINATOR_ID, demoHealth, medicalDocsFor, medicalKey, recordHealth } from "./model";
import { Pill, logPilgrim, type StepProps } from "./shared";

const REVIEW_MS = 3500;

/**
 * الخطوة 5: الملف الطبي — بعد اكتمال دفع المبلغ كاملاً فقط، ولا تُطلب أي وثيقة طبية قبل ذلك.
 * جزآن: المعلومات الصحية التي يسجّلها منسق المجموعة (ويؤكدها الحاج)، والوثائق الطبية التي يرفعها
 * الحاج لكل فرد وفق القائمة التي تحددها الإدارة، ويراجعها الفريق الطبي.
 */
export function StepMedical({ app, post, sessionId }: StepProps) {
  const toast = useToast();
  const info = groupInfo(post.clusterId, post.groupNumber);
  const coordinator = coordinatorOf(info);
  const health = post.health;
  const medical = useMemo(() => post.medical ?? {}, [post.medical]);

  // The medical team reviews each uploaded document
  useEffect(() => {
    const pending = Object.entries(medical).filter(([, s]) => s === "uploaded");
    if (!pending.length) return;
    const t = setTimeout(() => {
      actions.setPost(sessionId, { medical: { ...medical, ...Object.fromEntries(pending.map(([k]) => [k, "approved" as const])) } });
      actions.logEvent({ actor: "د. ليلى شمس (محاكاة)", role: "الفريق الطبي", action: "اعتماد وثائق طبية", target: `طلب ${app.number}`, detail: `${pending.length} وثائق` });
      toast({ title: "اعتمد الفريق الطبي الوثائق", body: "د. ليلى شمس — تُراعى الحالات في السكن والنقل والوجبات.", icon: "🩺", tone: "success" });
    }, REVIEW_MS);
    return () => clearTimeout(t);
  }, [medical, sessionId, app.number, toast]);

  const upload = (keys: string[]) => {
    if (!keys.length) return;
    actions.setPost(sessionId, { medical: { ...medical, ...Object.fromEntries(keys.map((k) => [k, "uploaded" as const])) } });
    logPilgrim(app, "رفع وثائق طبية", `${keys.length} وثائق`);
  };

  const allKeys = app.members.flatMap((m) => medicalDocsFor(m, health).map((d) => medicalKey(m, d)));
  const missing = allKeys.filter((k) => !medical[k]);
  const reviewing = allKeys.some((k) => medical[k] === "uploaded");

  return (
    <Question
      step="الخطوة 5 من 6"
      title="الملف الطبي"
      hint="انضممت إلى مجموعة ودفعت ما استحق عندها، فحان وقت الوثائق الطبية — ولم يُطلب أي منها قبل ذلك. ترفع شهادات اللقاحات والوثائق التي تطلبها الإدارة لكل فرد، ويسجّل منسق مجموعتك المعلومات الصحية."
      speak="اكتمل الدفع. الآن الملف الطبي: يسجّل منسق مجموعتك المعلومات الصحية، وترفع الوثائق الطبية لكل فرد."
    >
      {/* Part 1 — health information by the coordinator */}
      <div className="rounded-3xl border border-gold/40 bg-white p-5">
        <p className="flex items-center gap-2 font-display text-xl font-bold text-green-dark">
          <HeartPulse className="size-6" /> المعلومات الصحية — يسجّلها منسق المجموعة
        </p>
        {!health ? (
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl bg-sand p-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-green-dark font-display text-xl font-bold text-gold">{coordinator.name[0]}</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">بانتظار {coordinator.name} — منسق المجموعة {info.number}</p>
              <p className="text-sm text-ink-soft">يتصل بك ليسجّل الأمراض المزمنة والأدوية والاحتياجات الخاصة لكل فرد.</p>
            </div>
            <a href="#" onClick={(e) => { e.preventDefault(); toast({ title: `اتصال بـ ${coordinator.name}`, body: coordinator.phone, icon: "📞" }); }} className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-bold text-green-dark ring-1 ring-gold/40">
              <Phone className="size-4" /> {coordinator.phone}
            </a>
            <button
              type="button"
              onClick={() => recordHealth(sessionId, app, demoHealth(app.members, { id: COORDINATOR_ID, name: `${coordinator.name} (محاكاة)` }, Date.now()))}
              className="w-full text-sm font-bold text-green-dark underline sm:w-auto"
            >
              محاكاة: المنسق يسجّل الآن
            </button>
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {app.members.map((m) => {
                const rec = health.members[m.person.id];
                return (
                  <div key={m.person.id} className="rounded-2xl bg-sand/60 p-4">
                    <p className="font-bold">
                      {fullName(m.person)} <span className="text-sm font-normal text-hint">— {m.relation === "self" ? "صاحب الطلب" : relationLabel(m.relation, m.person.gender)}، {ageOf(m.person)} عاماً</span>
                    </p>
                    {!rec ? (
                      <p className="mt-2 text-sm text-hint">لم يُسجَّل بعد</p>
                    ) : (
                      <div className="mt-2 space-y-2 text-sm">
                        <div className="flex flex-wrap gap-1.5">
                          {rec.conditions.length === 0 && rec.needs.length === 0 && <Pill tone="green">لا أمراض مزمنة ولا احتياجات خاصة</Pill>}
                          {rec.conditions.map((c) => (
                            <Pill key={c} tone="maroon">{c}</Pill>
                          ))}
                          {rec.needs.map((c) => (
                            <Pill key={c} tone="gold">{c}</Pill>
                          ))}
                        </div>
                        {rec.medications && (
                          <p className="flex items-start gap-1.5 text-ink-soft">
                            <PillIcon className="mt-0.5 size-4 shrink-0" /> {rec.medications}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {health.confirmedAt ? (
                <span className="flex items-center gap-2 rounded-full bg-green-light/15 px-4 py-2 font-bold text-green">
                  <CheckCircle2 className="size-5" /> أكّدتَ صحة المعلومات
                </span>
              ) : (
                <>
                  <Button
                    size="lg"
                    onClick={() => {
                      actions.setPost(sessionId, { health: { ...health, confirmedAt: Date.now() } });
                      logPilgrim(app, "تأكيد صحة المعلومات الصحية", `سجّلها ${health.by.name}`);
                    }}
                  >
                    <CheckCircle2 className="size-5" /> المعلومات صحيحة
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => {
                      logPilgrim(app, "طلب تصحيح المعلومات الصحية", `إلى المنسق ${coordinator.name}`);
                      toast({ title: `أُرسل طلب التصحيح إلى ${coordinator.name}`, body: "سيتصل بك لتعديل المعلومات.", icon: "💬", tone: "info" });
                    }}
                  >
                    <MessageCircle className="size-5" /> أطلب تصحيحاً
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Part 2 — medical documents */}
      <div className="mt-5 rounded-3xl border border-gold/40 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-display text-xl font-bold text-green-dark">
            <FileUp className="size-6" /> اللقاحات والوثائق الطبية
          </p>
          {missing.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => upload(missing)}>
              <Upload className="size-4" /> رفع الكل (صور تجريبية)
            </Button>
          )}
        </div>
        <p className="mt-1 text-sm text-ink-soft">القائمة تحددها الإدارة: لقاحا كورونا والحمى الشوكية لكل فرد، والإنفلونزا لمن بلغ 60 عاماً، والتقرير الطبي، والوصفة لمن سجّل له المنسق أدوية دائمة.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {app.members.map((m) => (
            <div key={m.person.id} className="rounded-2xl bg-sand/60 p-4">
              <p className="font-bold">{m.person.firstName}</p>
              <ul className="mt-2 space-y-2">
                {medicalDocsFor(m, health).map((d) => {
                  const k = medicalKey(m, d);
                  const s = medical[k];
                  return (
                    <li key={d.key} className={cn("flex items-center gap-3 rounded-xl border-2 bg-white p-3", s === "approved" ? "border-green-light/50" : s === "uploaded" ? "border-gold-dark/50" : "border-dashed border-gold/60")}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">{d.label}</p>
                        <p className="text-xs text-ink-soft">{s === "approved" ? "✓ معتمد — د. ليلى شمس" : s === "uploaded" ? "الفريق الطبي يراجع الوثيقة..." : d.hint}</p>
                      </div>
                      {s === "approved" ? (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <BadgeCheck className="size-7 text-green-light" />
                        </motion.span>
                      ) : s === "uploaded" ? (
                        <Loader2 className="size-6 animate-spin text-gold-dark" />
                      ) : (
                        <Button size="sm" onClick={() => upload([k])}>
                          رفع
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        {reviewing && <p className="mt-3 text-sm font-semibold text-gold-dark">الفريق الطبي يراجع ما رُفع...</p>}
      </div>
    </Question>
  );
}
