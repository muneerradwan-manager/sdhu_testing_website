"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowLeft,
  BadgeCheck,
  GraduationCap,
  HeartHandshake,
  NotebookTabs,
  RotateCcw,
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Card } from "@/components/portal/shell";
import { PilgrimShell } from "./_components/pilgrim-shell";
import { CivilNotice } from "./_components/civil-notice";
import { SeasonChoice } from "./_components/season-choice";
import { ProfileDetails } from "./_components/profile-details";
import { useAccount, useAcademyProgress } from "@/lib/account";
import { useTracks } from "@/lib/cms/content";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, useToast } from "@/components/ui/widgets";
import { outcomeOf, stageAt, trackOf } from "@/lib/journey";
import { usePublishedDraw } from "@/lib/lottery";
import { useSeason } from "@/lib/season-live";
import { SEASON } from "@/lib/season";
import { fullName, getPerson } from "@/lib/registry";
import { actions, useStore } from "@/lib/store";


export default function PortalHome() {
  const sessionId = useStore((s) => s.sessionId)!;
  const account = useStore((s) => s.accounts[s.sessionId ?? ""]);
  const app = useStore((s) => s.applications[s.sessionId ?? ""]);
  const person = getPerson(sessionId)!;
  const [now, setNow] = useState(() => Date.now());
  const draw = usePublishedDraw();
  const { acceptedDirectAge } = useSeason();
  // The account and what it does this season: the Hajj, an administrative role, or not chosen yet
  const acc = useAccount();
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = app ? (now - app.submittedAt) / 1000 : 0;
  const steps = app ? outcomeOf(app, draw, acceptedDirectAge).steps : [];
  const stage = app ? stageAt(steps, elapsed).stage : null;
  // The card follows where the pilgrim is: following the result, then the steps after acceptance, then the season
  const post = useStore((s) => s.post[sessionId]);
  const accepted = stage?.key === "accepted";
  const card = !accepted
    ? { title: stage?.title, text: stage?.text, cta: "متابعة الطلب", href: "/portal/application" }
    : post?.visaAt
      ? { title: "رحلتك جاهزة", text: "اكتملت خطوات طلبك وصدرت التأشيرة. تابع موسمك يوماً بيوم، ووثائقك كلها في «خزنة الوثائق».", cta: "حالتي الآن", href: "/portal/season" }
      : { title: stage?.title, text: "أكمل خطوات ما بعد القبول واحدة بعد الأخرى حتى التأشيرة.", cta: "أكمل خطوات طلبك", href: "/portal/application#steps" };

  return (
    <PilgrimShell
      image="/images/umayyad-courtyard.jpg"
      title={
        <span className="flex flex-wrap items-center gap-3">
          السلام عليكم، {person.firstName}
          <motion.span animate={{ rotate: [0, 18, -8, 14, 0] }} transition={{ delay: 0.6, duration: 1.2 }} className="inline-block origin-bottom-right">
            👋
          </motion.span>
        </span>
      }
      subtitle="هذا حسابك الدائم في منصة الحج الوطنية: يبقى معك عبر المواسم، وفي كل موسم تختار ما تفعله به."
    >
      <DraftAndInvitations sessionId={sessionId} hasApplication={!!app} />
      {/* One column beside the sidebar: the season first, at full width; then who he is beside his seasons; then the services */}
      <div className="space-y-6">
        {account?.civil && <CivilNotice claim={account.civil} />}
        {app ? (
          <Link href={card.href} className="group relative block overflow-hidden rounded-[2rem] bg-green-dark p-7 text-white shadow-2xl md:p-9">
            <div className="bg-pattern absolute inset-0 opacity-20" />
            <div className="relative flex flex-wrap items-center justify-between gap-6">
              <div>
                <p className="text-sm text-gold">
                  طلبي رقم {app.number} — {app.members.length} أفراد — {trackOf(app) === "lottery" ? "التسجيل الأولي على القرعة" : "التسجيل على القبول المباشر"}
                </p>
                <p className="mt-2 font-display text-3xl font-bold md:text-4xl">{card.title}</p>
                <p className="mt-2 text-white/75">{card.text}</p>
              </div>
              <span className="flex items-center gap-2 rounded-2xl bg-gold px-6 py-4 font-bold text-ink transition group-hover:gap-4">
                {card.cta} <ArrowLeft className="size-5" />
              </span>
            </div>
            <div className="relative mt-7 flex gap-1.5">
              {steps.map((t) => (
                <span key={t.key} className="h-2 flex-1 overflow-hidden rounded-full bg-white/15">
                  <motion.span className="block h-full bg-gold" initial={{ width: 0 }} animate={{ width: elapsed >= t.at ? "100%" : "0%" }} transition={{ duration: 0.6 }} />
                </span>
              ))}
            </div>
          </Link>
        ) : acc?.path !== "pilgrim" ? (
          <Suspense>
            <SeasonChoice />
          </Suspense>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] bg-maroon-dark p-7 text-white shadow-2xl md:p-10">
            <div className="bg-pattern absolute inset-0 opacity-15" />
            <div className="absolute -left-20 -top-20 size-64 rounded-full bg-gold/20 blur-3xl" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-gold">
                <span className="relative flex size-2"><span className="absolute inset-0 animate-ping rounded-full bg-green-light" /><span className="relative size-2 rounded-full bg-green-light" /></span>
                التسجيل على القبول المباشر: {SEASON.windows.direct.hijri}
              </span>
              <p className="mt-4 font-display text-3xl font-bold leading-[1.4] md:text-4xl">تقديم طلب حج لموسم 1448هـ</p>
              <p className="mt-3 max-w-xl leading-8 text-white/75">
                لك وحدك أو مع عائلتك. التسجيل على القبول المباشر (الأكبر سناً) يُفتح أولاً، ثم يُفتح التسجيل الأولي على القرعة بطلب مستقل
                ({SEASON.windows.lottery.hijri}). سنسألك أسئلة بسيطة واحداً تلو الآخر، ونجلب بيانات مرافقيك من الشؤون المدنية.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <ButtonLink href="/portal/apply" variant="gold" size="xl">
                  ابدأ الطلب الآن <ArrowLeft className="size-6" />
                </ButtonLink>
                {acc.canChange && (
                  <Button variant="glass" size="lg" onClick={() => actions.chooseSeasonPath(acc.id, acc.season, null)}>
                    <RotateCcw className="size-5" /> غيّرت رأيي: أختار من جديد
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
        {!app && !acc?.path && <AcademyGlance />}

        {/* His details; his seasons have their own page («سجل المواسم»), and an administrator's name is on his ID card */}
        <ProfileDetails identity={acc?.path !== "admin"} />
      </div>
    </PilgrimShell>
  );
}

/**
 * A member who has not chosen his season yet: what he does on the platform meanwhile — his lessons in the Academy,
 * kept on his account whatever he chooses later
 */
function AcademyGlance() {
  const tracks = useTracks();
  const academy = useAcademyProgress();
  const lessons = tracks.flatMap((t) => t.levels.flatMap((l) => l.lessons.map((x) => ({ track: t, lesson: x }))));
  const done = lessons.filter((r) => academy[`${r.track.slug}/${r.lesson.slug}`]).length;
  const next = lessons.find((r) => !academy[`${r.track.slug}/${r.lesson.slug}`]);
  const pct = lessons.length ? Math.round((done / lessons.length) * 100) : 0;
  return (
    <Card className="flex flex-wrap items-center gap-5 md:p-7">
      <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-green-dark text-gold">
        <GraduationCap className="size-7" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-xl font-bold text-green-dark">تقدّمك في الأكاديمية</p>
        <p className="text-sm text-ink-soft">أتممت {done} من {lessons.length} درساً. يبقى تقدّمك في حسابك مهما اخترت في الموسم.</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-sand">
          <div className="h-full bg-green" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <ButtonLink href={next ? `/academy/${next.track.slug}/${next.lesson.slug}` : "/portal/academy"} size="lg">
        {done ? "تابع التعلّم" : "ابدأ أول درس"} <ArrowLeft className="size-5" />
      </ButtonLink>
    </Card>
  );
}

/**
 * طلب لم يُقدَّم بعد، وطلبات الموافقة. صاحب الطلب يرى أين وصل ومن وافق، ويتابع من الخطوة نفسها؛ ومن
 * أُضيف إلى طلب غيره يجد الدعوة هنا فيوافق أو يعتذر، فيظهر ردّه عند صاحب الطلب فوراً.
 */
function DraftAndInvitations({ sessionId, hasApplication }: { sessionId: string; hasApplication: boolean }) {
  const toast = useToast();
  const drafts = useStore((s) => s.drafts);
  const draft = hasApplication ? undefined : drafts[sessionId];
  const invitations = Object.entries(drafts).filter(([owner, d]) => owner !== sessionId && d.consents[sessionId]);
  if (!draft && !invitations.length) return null;

  const waiting = draft ? Object.values(draft.consents).filter((c) => c.status !== "approved") : [];
  const approved = draft ? Object.values(draft.consents).filter((c) => c.status === "approved").length : 0;
  const total = draft ? Object.keys(draft.consents).length : 0;

  return (
    <div className="mb-6 space-y-4">
      {draft && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-4 rounded-[2rem] border-2 border-gold-dark/50 bg-gold/15 p-5">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gold text-ink">
            <NotebookTabs className="size-7" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-bold text-green-dark">لديك طلب حج لم يُقدَّم بعد</p>
            <p className="text-sm leading-7 text-ink-soft">
              {draft.members.length} أفراد — محفوظ تلقائياً{" "}
              {new Intl.DateTimeFormat("ar-SY-u-nu-latn", { weekday: "long", hour: "2-digit", minute: "2-digit" }).format(draft.updatedAt)}.
              {total > 0 && (waiting.length ? ` وافق ${approved} من ${total}، وننتظر الباقين.` : " وافق جميع الأفراد — يمكنك المتابعة إلى الدفع.")}
            </p>
          </div>
          <ButtonLink href="/portal/apply" size="lg">
            متابعة الطلب <ArrowLeft className="size-5" />
          </ButtonLink>
        </motion.div>
      )}
      {invitations.map(([owner, d]) => {
        const c = d.consents[sessionId];
        const ownerPerson = getPerson(owner);
        const applicant = d.members.find((m) => m.relation === "self")?.person;
        return (
          <motion.div key={owner} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-[2rem] border-2 border-green-dark/30 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-green-dark text-gold">
                <HeartHandshake className="size-7" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-xl font-bold text-green-dark">
                  {ownerPerson ? fullName(ownerPerson) : "أحد أقاربك"} أضافك إلى طلب حج
                </p>
                <p className="text-sm leading-7 text-ink-soft">
                  صاحب الطلب: {applicant ? fullName(applicant) : "—"} — الأفراد: {d.members.map((m) => m.person.firstName).join("، ")} — {d.track === "lottery" ? "التسجيل الأولي على القرعة" : "التسجيل على القبول المباشر"}
                </p>
              </div>
              {c.status === "pending" ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      actions.respondConsent(owner, sessionId, "approved", Date.now());
                      toast({ title: "شكراً، سُجّلت موافقتك", body: "تصل فوراً إلى صاحب الطلب.", icon: "✅", tone: "success" });
                    }}
                  >
                    <BadgeCheck className="size-4" /> أوافق على الانضمام
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      actions.respondConsent(owner, sessionId, "declined", Date.now());
                      toast({ title: "سُجّل اعتذارك", body: "يصل إلى صاحب الطلب ليعدّل طلبه.", icon: "↩️" });
                    }}
                  >
                    أعتذر
                  </Button>
                </div>
              ) : (
                <Badge tone={c.status === "approved" ? "green" : "maroon"}>{c.status === "approved" ? "وافقت" : "اعتذرت"}</Badge>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
