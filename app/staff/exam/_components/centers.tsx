"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { AlertTriangle, Check, Copy, ExternalLink, Landmark, MapPin, MapPinned, Monitor, Pencil, Plus, QrCode, ShieldCheck, UsersRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPicker, mapsLink, type LatLng } from "@/components/ui/map-picker";
import { useToast } from "@/components/ui/widgets";
import { GOVERNORATE_SEATS, GOVERNORATES } from "@/lib/ops";
import { getPerson } from "@/lib/registry";
import { getStaff, STAFF } from "@/lib/staff";
import { asset, cn } from "@/lib/utils";
import { hallActions, runKey, STAGE_LABEL, stageOf, useHalls, type ExamCenter } from "@/app/administrator/_lib/halls";
import { Drawer, Panel, logAs, smallInputClass, useStaffUser } from "../../_components/kit";
import { useExamDesk } from "./desk";
import { RecordHistory, Records } from "./records";
import { Chip, Field, Pick, Switch, selectClass } from "./ui";

/** The applicants' own page, whose QR code every hall screen shows */
const ENTRY = "/administrator/exam";
const displayPath = (n?: number) => (n ? `/exam-display/${n}` : "/exam-display");

/** Copies a link of this site, whatever host it is served from, and says so */
function useCopy() {
  const toast = useToast();
  return async (path: string, what: string) => {
    const url = `${window.location.origin}${asset(path)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: `نُسخ ${what}`, body: url, tone: "success", icon: "📋" });
    } catch {
      toast({ title: "تعذّر النسخ — انسخه يدوياً", body: url, tone: "warning", icon: "📋" });
    }
  };
}

/**
 * The halls where the test is sat, and the governorates each serves: an applicant sits in his registry
 * governorate's hall unless moved. Each hall has its place pinned on the map, its seats, the supervisor who runs
 * its sittings, and the number of its display screen — the screen that shows the sitting, its instructions and
 * time, and the QR code of the applicants' entry page. A hall is created, edited, and switched off or on here.
 */
export function Centers() {
  const user = useStaffUser()!;
  const toast = useToast();
  const copy = useCopy();
  const halls = useHalls();
  const desk = useExamDesk();
  const [editing, setEditing] = useState<ExamCenter | "new" | null>(null);
  const [confirmOff, setConfirmOff] = useState<string | null>(null);
  const served = new Set(halls.live.flatMap((c) => c.governorates));
  const uncovered = GOVERNORATES.filter((g) => !served.has(g));

  const setActive = (c: ExamCenter, on: boolean) => {
    const live = halls.exams.some((e) => ["open", "running"].includes(stageOf(halls.runs[runKey(e.id, c.id)])));
    if (!on && live) {
      toast({ title: "في القاعة جلسة الآن", body: "لا تُعطَّل قاعة مفتوحة. انتظر حتى ينهي المشرف الاختبار.", tone: "warning", icon: "🏛️" });
      return;
    }
    hallActions.saveCenter({ ...c, off: on ? undefined : true }, halls.centers);
    logAs(user, { action: on ? "تفعيل قاعة اختبار" : "تعطيل قاعة اختبار", target: c.name, detail: on ? undefined : `${desk.expected.filter((a) => a.center?.id === c.id).length} متقدمين كانوا فيها`, system: "exams", area: "centers", ref: c.id, important: true });
    toast({ title: on ? `فُعّلت ${c.name}` : `عُطّلت ${c.name}`, body: on ? "يعود إليها متقدمو محافظاتها." : "لا يُسند إليها أحد، ولا تُفتح.", tone: on ? "success" : "info", icon: "🏛️" });
    setConfirmOff(null);
  };

  return (
    <div className="space-y-4">
      <Panel
        icon={<Landmark />}
        title="القاعات"
        action={
          <Button size="sm" variant="gold" onClick={() => setEditing("new")}>
            <Plus className="size-4" /> قاعة جديدة
          </Button>
        }
      >
        <p className="text-sm leading-7 text-white/70">
          {halls.live.length} قاعات فعّالة{halls.centers.length > halls.live.length ? ` و${halls.centers.length - halls.live.length} معطّلة` : ""}. يُسند كل متقدم تلقائياً إلى قاعة محافظة قيده، ولكل قاعة مشرف يفتحها ويدير جلساتها، وشاشة عرض برقمها. اضغط «تعديل» لتغيير أي شيء في القاعة من مكان واحد.
        </p>
        {uncovered.length > 0 && (
          <p className="mt-3 flex items-start gap-2 rounded-2xl bg-maroon/20 p-3 text-sm text-white ring-1 ring-maroon/50">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold" /> محافظات لا تخدمها أي قاعة فعّالة: {uncovered.join("، ")}. من كان قيده فيها يبقى بلا قاعة حتى تضيفها إلى قاعة أو تنقله.
          </p>
        )}
      </Panel>

      <Panel icon={<Monitor />} title="شاشات القاعات ورابط المتقدمين">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
            <p className="font-bold text-white">شاشة عرض كل قاعة</p>
            <p className="mt-1 text-xs leading-5 text-white/65">تُفتح على شاشة كبيرة في القاعة برقمها: اسم القاعة، والجلسة القائمة أو «لا يوجد اختبار مجدول حالياً»، والتعليمات والوقت. ورابط كل القاعات يعرض قائمتها لتختار الشاشة منها.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="glass" onClick={() => copy(displayPath(), "رابط شاشة كل القاعات")}>
                <Copy className="size-4" /> نسخ رابط شاشة كل القاعات
              </Button>
              <a href={asset(displayPath())} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-2xl px-3 text-sm font-semibold text-gold hover:bg-white/10">
                <ExternalLink className="size-4" /> فتح
              </a>
            </div>
          </div>
          <div className="rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
            <p className="flex items-center gap-1.5 font-bold text-white">
              <QrCode className="size-4 text-gold" /> رابط دخول المتقدمين
            </p>
            <p className="mt-1 text-xs leading-5 text-white/65">
              يفتحه المتقدم على جهازه في القاعة ليدخل اختباره برقمه الوطني. رمز QR الخاص به يظهر على كل شاشة قاعة: كبيراً قبل الاختبار، وصغيراً في زاويتها أثناءه.
            </p>
            <p className="mt-1 text-xs text-white/55" dir="ltr">
              {asset(ENTRY)}
            </p>
            <Button size="sm" variant="glass" className="mt-2" onClick={() => copy(ENTRY, "رابط دخول المتقدمين")}>
              <Copy className="size-4" /> نسخ الرابط
            </Button>
          </div>
        </div>
      </Panel>

      <ul className="grid gap-3 lg:grid-cols-2">
        {halls.centers.map((c, i) => {
          const sup = halls.supervisorOf(c.id);
          const here = desk.expected.filter((a) => a.center?.id === c.id);
          const live = halls.exams.map((e) => ({ e, st: stageOf(halls.runs[runKey(e.id, c.id)]) })).filter((x) => x.st === "open" || x.st === "running");
          const full = desk.crowded.filter((x) => x.center.id === c.id);
          const n = halls.displayOf(c);
          return (
            <motion.li
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={cn("rounded-3xl p-4 ring-1", c.off ? "bg-black/20 ring-white/10" : !sup && here.length ? "bg-maroon/15 ring-maroon/40" : "bg-white/[.06] ring-white/10")}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={cn("flex flex-wrap items-center gap-2 font-display text-lg font-bold", c.off ? "text-white/50" : "text-white")}>
                    {c.name} {c.off && <Chip tone="muted">معطّلة</Chip>}
                  </p>
                  <p className="flex flex-wrap items-center gap-1 text-xs text-white/65">
                    <MapPin className="size-3 shrink-0" /> {c.hall}
                    {c.at ? (
                      <a href={mapsLink(c.at)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-bold text-gold hover:underline">
                        على الخريطة <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      <span className="font-bold text-gold">· لم يُحدَّد موقعها على الخريطة</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-white/55">تخدم: {c.governorates.length ? c.governorates.join("، ") : "لا محافظة — يُنقل إليها المتقدمون نقلاً"}</p>
                </div>
                <Switch on={!c.off} onChange={(on) => (on ? setActive(c, true) : setConfirmOff(c.id))} label={`${c.name} فعّالة`} />
              </div>

              {confirmOff === c.id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 rounded-2xl bg-maroon/25 p-3 text-sm text-white ring-1 ring-maroon/50">
                  <p>
                    تعطيل {c.name}: {here.length ? `${here.length} متقدمين ينتظرون فيها يصبحون بلا قاعة حتى تضيف محافظاتهم إلى قاعة أخرى أو تنقلهم.` : "لا أحد ينتظر فيها الآن."} ويصل الخبر إلى مديرة الموسم.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="maroon" onClick={() => setActive(c, false)}>
                      تعطيل
                    </Button>
                    <Button size="sm" variant="ghost" className="text-white" onClick={() => setConfirmOff(null)}>
                      تراجع
                    </Button>
                  </div>
                </motion.div>
              )}

              <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
                {[
                  ["ينتظرون", here.length, false],
                  ["المقاعد", c.capacity ?? "—", full.length > 0],
                  ["جلسات الآن", live.length, false],
                  ["رقم الشاشة", n, false],
                ].map(([k, v, warn]) => (
                  <div key={String(k)} className="rounded-xl bg-black/15 p-2">
                    <dt className="text-[11px] text-white/60">{k}</dt>
                    <dd className={cn("font-display text-xl font-bold tabular-nums", warn ? "text-gold" : "text-white")}>{v}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <ShieldCheck className="size-4 text-gold" />
                {sup ? (
                  <span className="text-white">
                    مشرف القاعة: <b>{sup.name}</b>
                  </span>
                ) : (
                  <span className="font-bold text-gold">بلا مشرف{here.length ? ": لا تُفتح حتى تسند مشرفاً" : ""}</span>
                )}
              </p>
              {(live.length > 0 || full.length > 0) && (
                <p className="mt-2 flex flex-wrap gap-1">
                  {live.map(({ e, st }) => (
                    <Chip key={e.id} tone="green">
                      {e.name}: {STAGE_LABEL[st]}
                    </Chip>
                  ))}
                  {full.map((x) => (
                    <Chip key={x.exam.id} tone="maroon">
                      {x.exam.name}: {x.n} لـ {c.capacity} مقعداً
                    </Chip>
                  ))}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="glass" onClick={() => setEditing(c)}>
                  <Pencil className="size-4" /> تعديل
                </Button>
                <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => copy(displayPath(n), `رابط شاشة ${c.name}`)}>
                  <Copy className="size-4" /> نسخ رابط الشاشة
                </Button>
                <a href={asset(displayPath(n))} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-2xl px-3 text-sm font-semibold text-gold hover:bg-white/10">
                  <Monitor className="size-4" /> فتح الشاشة
                </a>
                <Link href={`/staff/exam/manage/people?c=${c.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-2xl px-3 text-sm font-semibold text-gold hover:bg-white/10">
                  <UsersRound className="size-4" /> متقدموها
                </Link>
              </div>
            </motion.li>
          );
        })}
      </ul>

      <Governorates />
      <Records area="centers" />
      <CenterDrawer center={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

/** Each governorate and the hall that serves it, with how many of its applicants still have a test to sit */
function Governorates() {
  const halls = useHalls();
  const desk = useExamDesk();
  return (
    <Panel icon={<MapPinned />} title="المحافظات" bodyClass="-mx-5 md:-mx-6">
      <div className="overflow-x-auto px-5 md:px-6">
        <table className="w-full min-w-[30rem] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-right text-xs text-gold">
              {["المحافظة", "القاعة التي تخدمها", "ينتظرون اختبارهم"].map((h) => (
                <th key={h} className="pb-2 font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {GOVERNORATES.map((g) => {
              const c = halls.live.find((x) => x.governorates.includes(g));
              const n = desk.applicants.filter((a) => getPerson(a.row.id)?.governorate === g).length;
              return (
                <tr key={g} className="text-white">
                  <td className="py-2 font-bold">{g}</td>
                  <td className="py-2">{c ? c.name : <span className="font-bold text-gold">لا قاعة تخدمها</span>}</td>
                  <td className="py-2 tabular-nums">{n}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

type Draft = { name: string; hall: string; at?: LatLng; governorates: string[]; capacity: string; supervisor: string; display: string };

function CenterDrawer({ center, onClose }: { center: ExamCenter | "new" | null; onClose: () => void }) {
  return (
    <Drawer open={!!center} onClose={onClose} title={center === "new" ? "قاعة جديدة" : center ? `تعديل ${center.name}` : ""} width="max-w-xl">
      {center && <CenterForm key={center === "new" ? "new" : center.id} center={center === "new" ? null : center} onClose={onClose} />}
    </Drawer>
  );
}

function CenterForm({ center, onClose }: { center: ExamCenter | null; onClose: () => void }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const halls = useHalls();
  const others = halls.centers.filter((c) => c.id !== center?.id);
  const [d, setD] = useState<Draft>(() => ({
    name: center?.name ?? "",
    hall: center?.hall ?? "",
    at: center?.at,
    governorates: center?.governorates ?? [],
    capacity: center?.capacity ? String(center.capacity) : "",
    supervisor: center ? (halls.supervisors[center.id] ?? "") : "",
    // A new hall takes the first screen number no other hall has
    display: String(center ? halls.displayOf(center) : Array.from({ length: 9999 }, (_, i) => i + 1).find((n) => !others.some((c) => halls.displayOf(c) === n))),
  }));
  const ownerOf = (g: string) => others.find((c) => c.governorates.includes(g));

  const save = () => {
    const display = /^\d+$/.test(d.display.trim()) ? Number(d.display.trim()) : NaN;
    const problem = !d.name.trim() || !d.hall.trim()
      ? "أكمل اسم القاعة ومكانها."
      : others.some((c) => c.name === d.name.trim())
        ? "اسم القاعة مستعمل لقاعة أخرى."
        : !(display >= 1 && display <= 9999)
          ? "رقم الشاشة من 1 إلى 9999."
          : others.some((c) => halls.displayOf(c) === display)
            ? `رقم الشاشة ${display} لقاعة أخرى (${others.find((c) => halls.displayOf(c) === display)!.name}).`
            : !d.at
              ? "حدّد موقع القاعة على الخريطة: قرّبها واضغط على مكان القاعة، فيصل المتقدم إليها من بوابته."
              : "";
    if (problem) {
      toast({ title: "لم تُحفظ القاعة", body: problem, tone: "warning", icon: "✍️" });
      return;
    }
    const id = center?.id ?? `c-${Date.now().toString(36)}`;
    const next: ExamCenter = {
      id,
      name: d.name.trim(),
      hall: d.hall.trim(),
      at: d.at,
      governorates: d.governorates,
      display,
      ...(Number(d.capacity) > 0 ? { capacity: Number(d.capacity) } : {}),
      // Switched off and on from its card, where the director hears of it
      ...(center?.off ? { off: true as const } : {}),
    };
    const taken = d.governorates.filter((g) => ownerOf(g)).map((g) => `${g} من ${ownerOf(g)!.name}`);
    const screen = center && halls.displayOf(center) !== display ? ` (الشاشة ${halls.displayOf(center)} ← ${display})` : "";
    hallActions.saveCenter(next, halls.centers);
    logAs(user, {
      action: center ? "تعديل قاعة اختبار" : "إضافة قاعة اختبار",
      target: next.name,
      after: `${next.hall}${center?.at && d.at && (center.at.lat !== d.at.lat || center.at.lng !== d.at.lng) ? " (موقع جديد على الخريطة)" : ""} — ${next.governorates.join("، ") || "بلا محافظة"}${next.capacity ? ` — ${next.capacity} مقعداً` : ""} — شاشة ${display}${screen}`,
      detail: taken.length ? `انتقلت إليها: ${taken.join("، ")}` : undefined,
      system: "exams",
      area: "centers",
      ref: id,
      important: !center,
    });
    const before = center ? (halls.supervisors[center.id] ?? "") : "";
    if (d.supervisor !== before) {
      hallActions.assignSupervisor(id, d.supervisor);
      logAs(user, { action: d.supervisor ? "إسناد مشرف قاعة اختبار" : "إلغاء إسناد مشرف قاعة", target: next.name, before: getStaff(before)?.name, after: getStaff(d.supervisor)?.name ?? "—", system: "exams", area: "centers", ref: id });
    }
    toast({ title: center ? `حُفظت ${next.name}` : `أُضيفت ${next.name}`, body: d.supervisor ? `مشرفها ${getStaff(d.supervisor)?.name}، وتظهر جلساتها في لوحته.` : "لم يُسند لها مشرف بعد.", tone: "success", icon: "🏛️" });
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <Field label="اسم القاعة">
          <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} className={smallInputClass} placeholder="مركز طرطوس" />
        </Field>
        <Field label="رقم الشاشة" hint="من 1 إلى 9999، لا يتكرر">
          <input inputMode="numeric" value={d.display} onChange={(e) => setD({ ...d, display: e.target.value })} className={cn(smallInputClass, "text-center")} dir="ltr" />
        </Field>
      </div>
      <Field label="مكانها وعنوانها" hint="يراه المتقدم في بوابته مع موعد اختباره.">
        <input value={d.hall} onChange={(e) => setD({ ...d, hall: e.target.value })} className={smallInputClass} placeholder="قاعة الاختبارات — مديرية أوقاف طرطوس" />
      </Field>
      <div>
        <p className="mb-1 text-sm font-bold text-white">المحافظات التي تخدمها</p>
        <p className="mb-2 text-xs leading-5 text-white/60">يُسند إليها تلقائياً كل متقدم قيده في هذه المحافظات. المحافظة تتبع قاعة واحدة: إن اخترت محافظة تخدمها قاعة أخرى انتقلت إلى هذه.</p>
        <div className="flex flex-wrap gap-1.5">
          {GOVERNORATES.map((g) => {
            const other = ownerOf(g);
            const on = d.governorates.includes(g);
            return (
              <Pick key={g} on={on} onClick={() => setD({ ...d, governorates: on ? d.governorates.filter((x) => x !== g) : [...d.governorates, g] })}>
                {g}
                {other && !on && <span className="font-normal text-white/40"> ({other.name.replace("مركز ", "")})</span>}
              </Pick>
            );
          })}
        </div>
      </div>
      <div>
        <p className="mb-1 text-sm font-bold text-white">موقع القاعة على الخريطة</p>
        <p className="mb-2 text-xs leading-5 text-white/60">اسحب الخريطة وقرّبها، ثم اضغط على مكان القاعة. يفتح المتقدم الموقع من بوابته ويصل إليه بالاتجاهات.</p>
        <MapPicker label="موقع القاعة" value={d.at} onChange={(at) => setD({ ...d, at })} focus={GOVERNORATE_SEATS[d.governorates[0] as keyof typeof GOVERNORATE_SEATS]} />
        <p className="mt-1.5 text-xs text-white/60" dir="rtl">
          {d.at ? (
            <>
              <MapPin className="-mt-0.5 inline size-3 text-gold" /> حُدّد الموقع{" "}
              <span dir="ltr" className="tabular-nums">
                {d.at.lat}, {d.at.lng}
              </span>{" "}
              · اضغط مكاناً آخر لتغييره
            </>
          ) : (
            "لم يُحدَّد بعد. اختر المحافظات أولاً لتفتح الخريطة عليها."
          )}
        </p>
      </div>
      <Field label="عدد المقاعد" hint="لكل جلسة. ينبهك النظام إن زاد متقدمو اختبار في القاعة عليها.">
        <input type="number" min={0} value={d.capacity} onChange={(e) => setD({ ...d, capacity: e.target.value })} className={cn(smallInputClass, "w-32 text-center")} dir="ltr" />
      </Field>
      <Field label="مشرف القاعة" hint="يفتح القاعة ويسجّل الحضور ويوافق على دخول الأجهزة ويبدأ الاختبار ويؤكد التسليم برمزه السري. تظهر له جلساتها في لوحته، ولا يمنحه الإسناد شيئاً آخر.">
        <select value={d.supervisor} onChange={(e) => setD({ ...d, supervisor: e.target.value })} className={selectClass}>
          <option value="">— لم يُسند —</option>
          {STAFF.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.title}
            </option>
          ))}
        </select>
      </Field>
      <div className="flex gap-2 pt-2">
        <Button variant="gold" onClick={save}>
          <Check className="size-4" /> {center ? "حفظ القاعة" : "إضافة القاعة"}
        </Button>
        <Button variant="glass" onClick={onClose}>
          إلغاء
        </Button>
      </div>
      {center && <RecordHistory refId={center.id} />}
    </div>
  );
}
