"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertOctagon, BadgeCheck, FileUp, Loader2, Pill as PillIcon, RefreshCw, Stethoscope, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { ageOf, fullName, relationLabel } from "@/lib/registry";
import type { Member } from "@/lib/rules";
import { actions, type DocStatus } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Question } from "../../../apply/_components/ui";
import { DOCS, docKey, docRequirement, docStatus, memberDocsDone, passportCaseMember, type DocKey } from "./model";
import { Pill, logPilgrim, useNow, type StepProps } from "./shared";

const UPLOAD_MS = 1600;

export function StepDocuments({ app, post, sessionId }: StepProps) {
  const toast = useToast();
  const now = useNow(120);
  const [active, setActive] = useState(() => {
    const firstOpen = app.members.find((m) => !memberDocsDone(post, m));
    return (firstOpen ?? app.members[0]).person.id;
  });
  /** key → upload start (local only; the store learns about it once the upload completes) */
  const [uploading, setUploading] = useState<Record<string, number>>({});
  /** key → when the reviewer started (so a re-render never restarts the review clock) */
  const reviewStart = useRef<Record<string, number>>({});
  const elder = passportCaseMember(app.members);
  const member = app.members.find((m) => m.person.id === active) ?? app.members[0];
  const needsMedicine = app.members.some((m) => docRequirement(m, "medical") === "required");

  // One timer at a time: when it fires, every due transition is applied in a single setPost,
  // so two uploads finishing together can never overwrite each other.
  useEffect(() => {
    const t0 = Date.now();
    const due: { at: number; key: string; to: DocStatus }[] = [];
    for (const [key, start] of Object.entries(uploading)) {
      const st = post.documents[key];
      if (st === "uploaded" || st === "approved") continue;
      due.push({ at: start + UPLOAD_MS, key, to: "uploaded" });
    }
    for (const [key, st] of Object.entries(post.documents)) {
      if (st !== "uploaded") continue;
      reviewStart.current[key] ??= t0;
      const doc = DOCS.find((d) => key.endsWith(`-${d.key}`))!;
      due.push({ at: reviewStart.current[key] + doc.reviewMs, key, to: "approved" });
    }
    if (!due.length) return;
    const next = Math.min(...due.map((d) => d.at));
    const timer = setTimeout(() => {
      const at = Date.now();
      const ready = due.filter((d) => d.at <= at + 30);
      const documents = { ...post.documents };
      for (const d of ready) documents[d.key] = d.to;
      actions.setPost(sessionId, { documents });
      // Finished uploads and reviews leave the local clocks, so a later staff rejection needs a fresh upload
      const doneUploads = ready.filter((d) => d.to === "uploaded").map((d) => d.key);
      if (doneUploads.length) setUploading((u) => Object.fromEntries(Object.entries(u).filter(([k]) => !doneUploads.includes(k))));
      for (const d of ready) if (d.to === "approved") delete reviewStart.current[d.key];

      for (const d of ready) {
        const m = app.members.find((x) => d.key.startsWith(x.person.id))!;
        const doc = DOCS.find((x) => d.key.endsWith(`-${x.key}`))!;
        if (d.to === "uploaded") {
          logPilgrim(app, `رفع وثيقة: ${doc.label}`, fullName(m.person));
        } else {
          actions.logEvent({ actor: `${doc.reviewer} (محاكاة)`, role: doc.reviewer.startsWith("د.") ? "الفريق الطبي" : "إدارة التسجيل", action: `اعتماد وثيقة: ${doc.label}`, target: `طلب ${app.number}`, detail: fullName(m.person) });
          if (doc.key === "medical") {
            toast({ title: `تم اعتماد التقرير الطبي لـ${m.person.firstName}`, body: `اعتمدته ${doc.reviewer}. سيتم مراعاة الاحتياجات في السكن والنقل.`, icon: "🩺", tone: "success" });
          } else if (doc.key === "passport") {
            toast({ title: `قُبل الجواز الجديد لـ${m.person.firstName}`, body: "الجواز ساري المفعول حتى 1458هـ.", icon: "🛂", tone: "success" });
          }
        }
      }
      const post2 = { ...post, documents };
      if (app.members.every((m) => memberDocsDone(post2, m)) && !app.members.every((m) => memberDocsDone(post, m))) {
        toast({ title: `جميع وثائق طلبك رقم ${app.number} مكتملة`, body: "اختر الآن التكتل والمجموعة من دليل الخدمات.", icon: "🎉", tone: "gold" });
      }
    }, Math.max(0, next - t0));
    return () => clearTimeout(timer);
  }, [uploading, post, sessionId, app, toast]);

  const upload = (m: Member, d: DocKey) => {
    const key = docKey(m, d);
    setUploading((u) => ({ ...u, [key]: Date.now() }));
  };

  const uploadAll = (m: Member) => {
    const keys = DOCS.filter((d) => docRequirement(m, d.key) !== "none" && ["missing", "rejected"].includes(docStatus(post, m, d.key)) && !(docKey(m, d.key) in uploading));
    const at = Date.now();
    setUploading((u) => ({ ...u, ...Object.fromEntries(keys.map((d, i) => [docKey(m, d.key), at + i * 350])) }));
  };

  const doneCount = app.members.filter((m) => memberDocsDone(post, m)).length;

  return (
    <Question
      step="الخطوة 2 من 5"
      title="استكمل الأوراق لكل فرد"
      hint="الجواز والصورة مرفوعان منذ التسجيل. بقي اللقاحات، والتقرير الطبي لمن يحتاجه."
      speak="استكمل الأوراق لكل فرد. الجواز والصورة مرفوعان منذ التسجيل. بقي اللقاحات، والتقرير الطبي لمن يحتاجه. سيُطلب منك إحضار الأدوية بكمية تكفي خمسة وثلاثين يوماً مع وصفة طبية."
    >
      {/* Member tabs */}
      <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {app.members.map((m) => {
          const req = DOCS.filter((d) => docRequirement(m, d.key) === "required");
          const ok = req.filter((d) => docStatus(post, m, d.key) === "approved").length;
          const done = ok === req.length;
          const bad = DOCS.some((d) => docStatus(post, m, d.key) === "rejected");
          const on = m.person.id === active;
          return (
            <button
              key={m.person.id}
              type="button"
              onClick={() => setActive(m.person.id)}
              className={cn(
                "relative flex min-w-44 shrink-0 items-center gap-3 rounded-3xl border-2 p-3 text-right transition",
                on ? "border-green-dark bg-green-dark text-white shadow-lg" : "border-gold/50 bg-white hover:border-gold-dark",
              )}
            >
              <span className="relative grid size-12 place-items-center">
                <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90">
                  <circle cx="20" cy="20" r="17" fill="none" strokeWidth="3.5" className={on ? "stroke-white/20" : "stroke-gold-light"} />
                  <motion.circle cx="20" cy="20" r="17" fill="none" strokeWidth="3.5" strokeLinecap="round" className={bad ? "stroke-maroon" : "stroke-green-light"} strokeDasharray={2 * Math.PI * 17} animate={{ strokeDashoffset: 2 * Math.PI * 17 * (1 - ok / req.length) }} transition={{ duration: 0.6 }} />
                </svg>
                <span className="font-display text-lg font-bold">{done ? "✓" : m.person.firstName[0]}</span>
              </span>
              <span>
                <span className="block font-bold">{m.person.firstName}</span>
                <span className={cn("block text-xs", on ? "text-white/70" : "text-hint")}>
                  {bad ? "⚠ وثيقة مرفوضة" : `${ok} من ${req.length} مكتملة`}
                </span>
              </span>
              {bad && !on && <span className="absolute left-3 top-3 size-2.5 animate-ping rounded-full bg-maroon" />}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={member.person.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }} className="mt-4 rounded-[2rem] border border-gold/40 bg-white p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-2xl font-bold text-green-dark">{fullName(member.person)}</p>
              <p className="text-ink-soft">
                {member.relation === "self" ? "صاحب الطلب" : relationLabel(member.relation, member.person.gender)} — {ageOf(member.person)} عاماً
                {member.needs.length > 0 && ` — ${member.needs.join("، ")}`}
              </p>
            </div>
            {!memberDocsDone(post, member) && (
              <Button variant="outline" size="md" onClick={() => uploadAll(member)}>
                <Upload className="size-4" /> رفع الناقص (صور تجريبية)
              </Button>
            )}
          </div>

          <ul className="mt-5 space-y-3">
            {DOCS.map((d, i) => {
              const req = docRequirement(member, d.key);
              if (req === "none") return null;
              const key = docKey(member, d.key);
              const status = docStatus(post, member, d.key);
              const started = uploading[key];
              const isUploading = started !== undefined && (status === "missing" || status === "rejected");
              const progress = isUploading ? Math.min(100, Math.max(0, ((now - started) / UPLOAD_MS) * 100)) : 0;
              const isElderPassport = d.key === "passport" && elder?.person.id === member.person.id;
              return (
                <motion.li
                  key={d.key}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={cn(
                    "relative overflow-hidden rounded-3xl border-2 p-4 transition-colors",
                    status === "approved" ? "border-green-light/40 bg-green-light/5" : status === "rejected" ? "border-maroon/40 bg-maroon/5" : status === "uploaded" ? "border-gold-dark/50 bg-gold/10" : "border-dashed border-gold/70 bg-sand/50",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-3xl shadow-sm">{d.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-lg font-bold">
                        {d.label}
                        {req === "required" && <Pill tone="maroon" className="text-xs">إلزامي</Pill>}
                        {req === "recommended" && <Pill tone="gold" className="text-xs">موصى به لكبار السن</Pill>}
                        {req === "optional" && <Pill tone="ink" className="text-xs">اختياري</Pill>}
                      </p>
                      <p className="mt-0.5 text-ink-soft">
                        {status === "approved" &&
                          (d.key === "passport"
                            ? isElderPassport
                              ? "✓ مقبول — الجواز الجديد ينتهي 1458هـ"
                              : "✓ مقبول — مرفوع منذ تقديم الطلب"
                            : d.key === "medical"
                              ? `✓ معتمد من ${d.reviewer}${member.needs.length ? " — «حالة تحتاج متابعة» في الملف التشغيلي" : ""}`
                              : `✓ معتمد من ${d.reviewer} — ساري حتى 1451هـ`)}
                        {status === "uploaded" && `${d.reviewer} تراجع الوثيقة الآن...`}
                        {status === "missing" && !isUploading && (d.key === "medical" ? "تقرير من طبيب معتمد عن الحالة الصحية والقدرة على السفر" : "ارفع صورة واضحة للشهادة")}
                        {isUploading && `جارٍ الرفع... ${Math.round(progress)}%`}
                        {status === "rejected" && !isUploading && "مرفوض"}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {status === "approved" && (
                        <motion.span initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} className="grid size-12 place-items-center rounded-full bg-green-light text-white">
                          <BadgeCheck className="size-7" />
                        </motion.span>
                      )}
                      {status === "uploaded" && (
                        <span className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-bold text-gold-dark shadow-sm">
                          {d.key === "medical" ? <Stethoscope className="size-5 animate-pulse" /> : <Loader2 className="size-5 animate-spin" />} قيد المراجعة
                        </span>
                      )}
                      {(status === "missing" || status === "rejected") && !isUploading && (
                        <Button size="lg" variant={status === "rejected" ? "maroon" : "primary"} onClick={() => upload(member, d.key)}>
                          {status === "rejected" ? <RefreshCw className="size-5" /> : <FileUp className="size-5" />}
                          {status === "rejected" ? (d.key === "passport" ? "رفع الجواز المجدَّد" : "رفع من جديد") : "رفع"}
                        </Button>
                      )}
                      {isUploading && <Loader2 className="size-8 animate-spin text-green-dark" />}
                    </div>
                  </div>

                  {status === "rejected" && !isUploading && d.key !== "passport" && (
                    <p className="mt-3 rounded-2xl bg-white p-3 font-semibold text-maroon ring-1 ring-maroon/20">رُفضت الوثيقة بعد المراجعة. ارفع نسخة أوضح وسارية المفعول.</p>
                  )}
                  {status === "rejected" && !isUploading && d.key === "passport" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 flex items-start gap-3 rounded-2xl bg-white p-4 text-maroon ring-1 ring-maroon/20">
                      <AlertOctagon className="mt-0.5 size-6 shrink-0" />
                      <div>
                        <p className="text-lg font-bold">صلاحية الجواز أقل من 6 أشهر بعد العودة</p>
                        <p className="leading-7 text-ink-soft">
                          جواز {member.person.firstName} ينتهي بعد 4 أشهر فقط، والمطلوب أن يبقى سارياً حتى 23 جمادى الآخرة 1449 على الأقل. جدّد الجواز من إدارة الهجرة ثم ارفع صورة الجواز الجديد.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {status === "uploaded" && d.key === "medical" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-gold/40">
                      <span className="relative grid size-11 place-items-center rounded-full bg-green-dark font-display text-lg font-bold text-gold">
                        ل
                        <span className="absolute -bottom-0.5 -left-0.5 size-3.5 rounded-full border-2 border-white bg-green-light" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">د. ليلى شمس — الفريق الطبي</p>
                        <p className="flex items-center gap-1 text-sm text-ink-soft">
                          تقرأ التقرير
                          {[0, 1, 2].map((j) => (
                            <motion.span key={j} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.2, delay: j * 0.2 }}>
                              •
                            </motion.span>
                          ))}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {isUploading && (
                    <span className="absolute inset-x-0 bottom-0 h-1.5 bg-gold-light">
                      <span className="block h-full bg-green-light transition-[width] duration-100" style={{ width: `${progress}%` }} />
                    </span>
                  )}
                </motion.li>
              );
            })}
            <li className="flex items-center gap-4 rounded-3xl border-2 border-green-light/40 bg-green-light/5 p-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-3xl shadow-sm">🖼️</span>
              <div className="flex-1">
                <p className="text-lg font-bold">الصورة الشخصية</p>
                <p className="text-ink-soft">✓ مقبولة — مرفوعة منذ تقديم الطلب</p>
              </div>
              <BadgeCheck className="size-8 text-green-light" />
            </li>
          </ul>
        </motion.div>
      </AnimatePresence>

      {needsMedicine && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5 flex items-start gap-3 rounded-3xl bg-gold/25 p-5 text-lg font-bold leading-8 text-maroon">
          <PillIcon className="mt-1 size-6 shrink-0" /> سيُطلب منك إحضار الأدوية بكمية تكفي 35 يوماً مع وصفة طبية.
        </motion.p>
      )}

      <div className="mt-5 flex items-center justify-between rounded-2xl bg-sand p-4">
        <p className="text-lg font-bold">
          الأفراد المكتملة أوراقهم: <span className="text-green-dark">{doneCount}</span> من {app.members.length}
        </p>
        <div className="h-3 w-40 overflow-hidden rounded-full bg-gold-light">
          <motion.div className="h-full rounded-full bg-green-light" animate={{ width: `${(doneCount / app.members.length) * 100}%` }} />
        </div>
      </div>
    </Question>
  );
}
