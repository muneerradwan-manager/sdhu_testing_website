"use client";

import { AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";
import { useMemo } from "react";
import { outcomeOf, trackOf } from "@/lib/journey";
import { usePublishedDraw } from "@/lib/lottery";
import { useDraft, useLiveVersion, useNowKey, useReg } from "@/lib/registration/client";
import { ACTIVE_SEASON } from "@/lib/registration/defaults";
import { scheduledVersions, versionsOf } from "@/lib/registration/engine";
import { diffConfigs, validateConfig } from "@/lib/registration/validate";
import { useSeason } from "@/lib/season-live";
import { useStore } from "@/lib/store";
import type { Alert, SystemStatus } from "../_components/system";

/**
 * «إدارة التسجيل على الحج» seen whole, for its holder and for the director: the version in force and the
 * draft, what keeps the draft from being published, what in force no longer fits the season's terms, and the
 * applications — submitted and still being filled in. Every screen of the file reads from here.
 */
export function useRegistrationDesk() {
  const reg = useReg();
  const now = useNowKey();
  const live = useLiveVersion();
  const draft = useDraft(ACTIVE_SEASON);
  const { fees, acceptedDirectAge } = useSeason();
  const applications = useStore((s) => s.applications);
  const drafts = useStore((s) => s.drafts);
  const reviews = useStore((s) => s.reviews);
  const draw = usePublishedDraw();

  return useMemo(() => {
    const versions = versionsOf(reg, ACTIVE_SEASON);
    const scheduled = scheduledVersions(reg, ACTIVE_SEASON, now);
    const issues = validateConfig(draft.config, { previous: versions, hajjCost: fees.hajjCost });
    const errors = issues.filter((i) => i.level === "error");
    const changes = diffConfigs(live.config, draft.config);
    // The version in force against the season's terms now: a cost lowered under the installments fixed in it
    const drift = validateConfig(live.config, { hajjCost: fees.hajjCost }).filter((i) => i.level === "error" && i.where === "الدفعات");

    const apps = Object.values(applications).filter((a) => (a.season ?? ACTIVE_SEASON) === ACTIVE_SEASON);
    const accepted = apps.filter((a) => outcomeOf(a, draw, a.policy?.acceptedDirectAge ?? acceptedDirectAge).accepted && reviews[a.applicantId]?.status !== "rejected");
    const inProgress = Object.entries(drafts).filter(([id]) => !applications[id] || trackOf(applications[id]) === "direct");
    const waiting = inProgress.filter(([, d]) => Object.values(d.consents).some((c) => c.status === "pending"));
    const onOlder = inProgress.filter(([, d]) => d.configVersion && d.configVersion !== live.id);

    const stageIds = new Set(draft.config.stages.map((s) => s.id));
    const ruleIds = new Set(draft.config.eligibility.map((r) => r.id));
    const stepIds = new Set(draft.config.postSteps.map((p) => p.id));
    const count = (pred: (ref: string | undefined, where: string) => boolean) => errors.filter((e) => pred(e.ref, e.where)).length;

    const alerts: Alert[] = [
      ...drift.map((d, i) => ({ id: `drift-${i}`, level: "high" as const, title: "الإصدار المعمول به لم يعد يوافق تكلفة الحج", hint: `${d.message}. عدّل الدفعات وانشر إصداراً جديداً؛ الطلبات المقدَّمة تبقى على شروطها.`, href: "/staff/hajj/manage/payments", action: "عدّل الدفعات" })),
      ...(errors.length ? [{ id: "errors", level: "work" as const, title: `${errors.length} أخطاء في المسودة تمنع نشرها`, hint: errors.slice(0, 2).map((e) => `${e.where}: ${e.message}`).join(" · "), href: "/staff/hajj/manage", action: "راجعها" }] : []),
      ...(changes.length && !errors.length ? [{ id: "changes", level: "work" as const, title: `${changes.length} تغييرات في المسودة لم تُنشر`, hint: changes.slice(0, 2).map((c) => c.text).join(" · "), href: "/staff/hajj/manage/preview", action: "عاينها وانشرها" }] : []),
      ...scheduled.map((v) => ({ id: `sched-${v.id}`, level: "work" as const, title: `الإصدار ${v.number} مجدول`, hint: `يسري من ${v.effectiveFrom.replace("T", " ")}: ${v.note}`, href: "/staff/hajj/manage", action: "اعرضه" })),
      ...(waiting.length ? [{ id: "consents", level: "work" as const, title: `${waiting.length} طلبات تنتظر موافقات أفرادها`, hint: "محفوظة في حسابات أصحابها حتى يوافق الجميع.", href: "/staff/hajj/manage/applications?f=waiting", action: "تابعها" }] : []),
    ];

    return {
      live,
      versions,
      scheduled,
      draft,
      issues,
      errors,
      changes,
      drift,
      apps,
      accepted,
      inProgress,
      waiting,
      onOlder,
      alerts,
      high: alerts.filter((a) => a.level === "high"),
      badges: {
        seasons: scheduled.length,
        stages: count((r, w) => (r ? stageIds.has(r) : w === "المراحل")),
        rules: count((r, w) => (r ? ruleIds.has(r) : w.startsWith("القاعدتان"))),
        payments: count((_, w) => w === "الدفعات" || w === "مسارات التسجيل") + drift.length,
        steps: count((r, w) => (r ? stepIds.has(r) : w === "الخطوات بعد القبول")),
        publish: changes.length && !errors.length ? 1 : 0,
        applications: waiting.length,
      },
    };
  }, [reg, now, live, draft, fees.hajjCost, acceptedDirectAge, applications, drafts, reviews, draw]);
}

export type RegistrationDesk = ReturnType<typeof useRegistrationDesk>;

/** How the file stands on the director's page */
export function useRegistrationStatus(): SystemStatus {
  const desk = useRegistrationDesk();
  return {
    state: desk.high.length
      ? { label: `تحتاج متابعة (${desk.high.length})`, tone: "maroon", icon: <AlertTriangle className="size-4" /> }
      : desk.scheduled.length
        ? { label: `إصدار مجدول: ${desk.scheduled.map((v) => v.number).join("، ")}`, tone: "green", icon: <CalendarClock className="size-4" /> }
        : { label: "تسير بانتظام", tone: "green", icon: <CheckCircle2 className="size-4" /> },
    numbers: [
      { k: "الإصدار المعمول به", v: desk.live.number, hint: `${desk.versions.length} إصدارات هذا الموسم` },
      { k: "طلبات مقدَّمة", v: desk.apps.length, hint: `مقبولة ${desk.accepted.length}` },
      { k: "طلبات قيد التعبئة", v: desk.inProgress.length, hint: desk.waiting.length ? `تنتظر موافقات ${desk.waiting.length}` : undefined },
      { k: "تغييرات غير منشورة", v: desk.changes.length, hint: desk.errors.length ? `أخطاء ${desk.errors.length}` : undefined },
    ],
    high: desk.high,
  };
}
