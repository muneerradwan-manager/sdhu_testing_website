"use client";

import { motion } from "motion/react";
import { Eye, FileImage, IdCard, Stamp, UserRound } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { Card } from "@/components/portal/shell";
import { Button } from "@/components/ui/button";
import { Badge, Modal } from "@/components/ui/widgets";
import type { Member } from "@/lib/rules";
import { relationLabel } from "@/lib/registry";
import type { Application, DocStatus, PostAcceptance } from "@/lib/store";
import { cn } from "@/lib/utils";
import { docStatus } from "./post/model";

/**
 * The family's travel documents in one place: for each of them the personal photo (after the first payment), the
 * passport (after the second) and the visa (once issued), each with where it stands, and each opened by a click
 * to see it as it was uploaded or issued. The images are the demo's own drawings of the documents, never real ones.
 */

type Kind = "photo" | "passport" | "visa";
const KINDS: { key: Kind; label: string; icon: typeof UserRound }[] = [
  { key: "photo", label: "الصورة الشخصية", icon: UserRound },
  { key: "passport", label: "جواز السفر", icon: IdCard },
  { key: "visa", label: "التأشيرة", icon: Stamp },
];

const STATE: Record<DocStatus | "issued" | "waiting", { label: string; tone: "green" | "gold" | "maroon" | "ink" }> = {
  approved: { label: "مقبولة", tone: "green" },
  issued: { label: "صادرة", tone: "green" },
  uploaded: { label: "عند المراجعة", tone: "gold" },
  rejected: { label: "أُعيدت", tone: "maroon" },
  missing: { label: "لم تُرفع", tone: "ink" },
  waiting: { label: "لم تصدر", tone: "ink" },
};

const date = (at: number) => new Intl.DateTimeFormat("ar-SY-u-nu-latn", { day: "numeric", month: "long", year: "numeric" }).format(at);
/** The demo's passport number for a person: the same on every screen */
const passportNo = (m: Member) => `N${m.person.id.slice(-7)}`;
const visaNo = (app: Application, i: number) => `HV-1448-${app.number}-${i + 1}`;

export function FamilyDocuments({ app, post }: { app: Application; post: PostAcceptance }) {
  const [open, setOpen] = useState<{ m: Member; i: number; kind: Kind } | null>(null);
  const stateOf = (m: Member, kind: Kind) => (kind === "visa" ? (post.visaAt ? "issued" : "waiting") : docStatus(post, m, kind));
  const viewable = (s: string) => s === "approved" || s === "uploaded" || s === "issued";
  return (
    <Card className="md:p-8">
      <p className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark">
        <FileImage className="size-7 text-gold-dark" /> وثائق أفراد الطلب
      </p>
      <p className="mt-1 text-sm leading-7 text-ink-soft">الصورة الشخصية بعد الدفعة الأولى، وجواز السفر بعد الدفعة الثانية، والتأشيرة حين تصدر. اضغط أي وثيقة لتراها.</p>
      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {app.members.map((m, i) => (
          <motion.div key={m.person.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-3xl border border-gold/30 p-4">
            <p className="font-display text-lg font-bold text-green-dark">
              {m.person.firstName} {m.person.lastName} <span className="text-sm font-normal text-hint">— {relationLabel(m.relation, m.person.gender)}</span>
            </p>
            <ul className="mt-3 grid grid-cols-3 gap-2">
              {KINDS.map((k) => {
                const st = stateOf(m, k.key);
                const can = viewable(st);
                return (
                  <li key={k.key}>
                    <button
                      type="button"
                      disabled={!can}
                      onClick={() => setOpen({ m, i, kind: k.key })}
                      aria-label={`${k.label} — ${m.person.firstName}`}
                      className={cn("group flex w-full flex-col items-center gap-2 rounded-2xl p-3 text-center transition", can ? "bg-sand hover:bg-gold/20 hover:shadow-md" : "cursor-not-allowed bg-sand/50 opacity-60")}
                    >
                      <span className="grid size-12 place-items-center rounded-xl bg-white text-green-dark shadow-sm">
                        <k.icon className="size-6" />
                      </span>
                      <span className="text-xs font-bold text-ink">{k.label}</span>
                      <Badge tone={STATE[st].tone} className="text-[10px]">
                        {STATE[st].label}
                      </Badge>
                      {can && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-green-dark opacity-70 group-hover:opacity-100">
                          <Eye className="size-3.5" /> عرض
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        ))}
      </div>
      <Modal open={!!open} onClose={() => setOpen(null)} className="max-w-2xl">
        {open && (
          <div>
            <p className="text-xs font-bold text-gold-dark">
              {KINDS.find((k) => k.key === open.kind)!.label} — {open.m.person.firstName} {open.m.person.lastName}
            </p>
            <div className="mt-3">
              {open.kind === "photo" && <PhotoView m={open.m} />}
              {open.kind === "passport" && <PassportView m={open.m} />}
              {open.kind === "visa" && <VisaView app={app} m={open.m} i={open.i} at={post.visaAt!} />}
            </div>
            <p className="mt-3 text-center text-[11px] text-hint">نسخة تجريبية: رسم للوثيقة من بيانات وهمية، لا صورة حقيقية.</p>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => setOpen(null)}>
                إغلاق
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}

function PhotoView({ m }: { m: Member }) {
  const f = m.person.gender === "F";
  return (
    <div className="mx-auto w-56 rounded-2xl border border-gold/40 bg-white p-3 shadow-lg">
      <div className="relative grid aspect-[4/5] place-items-end overflow-hidden rounded-xl bg-white ring-1 ring-ink/10">
        <svg viewBox="0 0 120 150" className="h-full w-full" aria-hidden>
          <circle cx="60" cy="58" r="28" fill={f ? "#c9b48a" : "#b49a72"} />
          {f && <path d="M28 64 Q30 22 60 22 Q90 22 92 64 L92 96 Q60 84 28 96 Z" fill="#5b4636" opacity=".85" />}
          <circle cx="60" cy="60" r="24" fill="#e8cfae" />
          <path d="M14 150 Q18 102 60 98 Q102 102 106 150 Z" fill={f ? "#5b4636" : "#2f4a5a"} />
        </svg>
      </div>
      <p className="mt-2 text-center text-sm font-bold text-ink">
        {m.person.firstName} {m.person.lastName}
      </p>
      <p className="text-center text-[11px] text-hint">خلفية بيضاء، حديثة، دون نظارات — مقبولة</p>
    </div>
  );
}

function PassportView({ m }: { m: Member }) {
  const p = m.person;
  const rows: [string, string][] = [
    ["الاسم", `${p.firstName} ${p.fatherName} ${p.lastName}`],
    ["رقم الجواز", passportNo(m)],
    ["تاريخ الميلاد", p.birthDate],
    ["مكان الولادة", p.birthPlace],
    ["الجنس", p.gender === "F" ? "أنثى" : "ذكر"],
    // Valid five years from its issue in 1447, ending on its holder's birthday
    ["تاريخ الانتهاء", `2031-${p.birthDate.slice(5)}`],
  ];
  const mrz = `P<SYR${p.id.slice(0, 9)}<<<<<<<<<<<<<<<<<<<<<<<<<<`.slice(0, 44);
  return (
    <div className="overflow-hidden rounded-2xl border border-green-dark/30 bg-gradient-to-br from-[#eef4ef] to-[#f7f1e3] shadow-lg">
      <div className="flex items-center justify-between bg-green-dark px-4 py-2 text-xs font-bold text-gold">
        <span>جواز سفر — صفحة البيانات</span>
        <span className="rounded bg-white/15 px-2 py-0.5 text-white">تجريبي</span>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-[7rem_1fr]">
        <div className="grid aspect-[4/5] place-items-center rounded-lg bg-white ring-1 ring-ink/10">
          <UserRound className="size-12 text-hint" />
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className={k === "الاسم" ? "col-span-2" : undefined}>
              <dt className="text-[11px] text-hint">{k}</dt>
              <dd className="font-bold text-ink" dir={/\d/.test(v) && k !== "الاسم" ? "ltr" : undefined}>
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="border-t border-ink/10 bg-white/60 px-4 py-2 font-mono text-[11px] tracking-widest text-ink-soft" dir="ltr">
        {mrz}
      </p>
    </div>
  );
}

function VisaView({ app, m, i, at }: { app: Application; m: Member; i: number; at: number }) {
  const p = m.person;
  const no = visaNo(app, i);
  const rows: [string, string][] = [
    ["الاسم", `${p.firstName} ${p.fatherName} ${p.lastName}`],
    ["رقم التأشيرة", no],
    ["رقم الجواز", passportNo(m)],
    ["النوع", "حج — موسم 1448هـ"],
    ["تاريخ الإصدار", date(at)],
    ["صالحة للدخول", "1 ذو القعدة – 30 ذو الحجة 1448"],
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-gold/50 bg-gradient-to-br from-white to-[#f7f1e3] shadow-lg">
      <div className="flex items-center justify-between bg-gradient-to-l from-gold-dark to-gold px-4 py-2 text-xs font-bold text-ink">
        <span className="flex items-center gap-1.5">
          <Stamp className="size-4" /> تأشيرة حج
        </span>
        <span className="rounded bg-white/40 px-2 py-0.5">تجريبي</span>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_7rem]">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className={k === "الاسم" || k === "صالحة للدخول" ? "col-span-2" : undefined}>
              <dt className="text-[11px] text-hint">{k}</dt>
              <dd className="font-bold text-ink" dir={/^[A-Z0-9-]+$/.test(v) ? "ltr" : undefined}>
                {v}
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col items-center justify-center gap-1">
          <QRCodeSVG value={`https://hajj-demo.sy/verify/visa/${no}`} size={96} fgColor="#00594F" />
          <span className="text-[10px] text-hint">رمز التحقق</span>
        </div>
      </div>
    </div>
  );
}
