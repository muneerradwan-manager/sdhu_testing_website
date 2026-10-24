"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Copy, ExternalLink, MapPin, Plus, QrCode, Save } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPicker, mapsLink, type LatLng } from "@/components/ui/map-picker";
import { Modal, useToast } from "@/components/ui/widgets";
import { GOVERNORATE_SEATS, GOVERNORATES } from "@/lib/ops";
import { asset, cn } from "@/lib/utils";
import { hallActions, runKey, STAGE_LABEL, stageOf, useHalls, type ExamCenter } from "@/app/administrator/_lib/halls";
import { logAs, smallInputClass, useCan, useStaffUser } from "../../_components/kit";
import { AddButton, Box, EditHeader, EditLayout, ListTable, RowActions, RowLink, Tag, Title } from "../../_components/wp";
import { useExamDesk } from "./desk";
import { RecordHistory, Records } from "./records";
import { Field, Pick, Segments } from "./ui";

/** The applicants' own page, whose QR code every hall screen shows */
const ENTRY = "/portal/exam";
const displayPath = (n?: number) => (n ? `/exam-display/${n}` : "/exam-display");
const LIST = "/staff/exam/manage";
const editHref = (id?: string) => (id ? `/staff/exam/manage/edit?id=${id}` : "/staff/exam/manage/edit");
const DARK_MODAL = "max-w-md border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white";

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

/** A hall switched off or on: never while one of its sittings is open, and the director hears of it */
function useSetActive() {
  const user = useStaffUser()!;
  const toast = useToast();
  const halls = useHalls();
  const desk = useExamDesk();
  return (c: ExamCenter, on: boolean) => {
    const live = halls.exams.some((e) => ["open", "running"].includes(stageOf(halls.runs[runKey(e.id, c.id)])));
    if (!on && live) {
      toast({ title: "في القاعة جلسة الآن", body: "لا تُعطَّل قاعة مفتوحة. انتظر حتى ينهي المشرف الاختبار.", tone: "warning", icon: "🏛️" });
      return false;
    }
    hallActions.saveCenter({ ...c, off: on ? undefined : true }, halls.centers);
    logAs(user, { action: on ? "تفعيل قاعة اختبار" : "تعطيل قاعة اختبار", target: c.name, detail: on ? undefined : `${desk.expected.filter((a) => a.center?.id === c.id).length} متقدمين كانوا فيها`, system: "exams", area: "centers", ref: c.id, important: true });
    toast({ title: on ? `فُعّلت ${c.name}` : `عُطّلت ${c.name}`, body: on ? "يعود إليها متقدمو محافظاتها." : "لا يُسند إليها أحد، ولا تُفتح.", tone: on ? "success" : "info", icon: "🏛️" });
    return true;
  };
}

/** Switching a hall off, said before it is done: who it leaves without a hall */
function OffDialog({ center, onClose }: { center: ExamCenter | null; onClose: () => void }) {
  const desk = useExamDesk();
  const setActive = useSetActive();
  const here = center ? desk.expected.filter((a) => a.center?.id === center.id).length : 0;
  return (
    <Modal open={!!center} onClose={onClose} className={DARK_MODAL}>
      {center && (
        <div>
          <p className="font-display text-xl font-bold">تعطيل {center.name}؟</p>
          <p className="mt-2 text-sm leading-7 text-white/75">
            {here ? `${here} متقدمين ينتظرون فيها يصبحون بلا قاعة حتى تضيف محافظاتهم إلى قاعة أخرى أو تنقلهم.` : "لا أحد ينتظر فيها الآن."} ويصل الخبر إلى مدير الموسم.
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="maroon" onClick={() => setActive(center, false) && onClose()}>
              تعطيل
            </Button>
            <Button variant="glass" onClick={onClose}>
              تراجع
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ───────────────────────── All halls ─────────────────────────

/**
 * The halls as a list: each opens on its name to its own edit screen (place on the map, governorates, seats,
 * supervisor, screen number); its screen and its applicants are one click from its row. How many wait in each and
 * what runs there now are on the file's dashboard.
 */
export function Centers() {
  const halls = useHalls();
  const desk = useExamDesk();
  const copy = useCopy();
  const setActive = useSetActive();
  const may = useCan();
  const [filter, setFilter] = useState<"all" | "on" | "off">("all");
  const [offing, setOffing] = useState<ExamCenter | null>(null);
  const served = new Set(halls.live.flatMap((c) => c.governorates));
  const uncovered = GOVERNORATES.filter((g) => !served.has(g));
  const shown = halls.centers.filter((c) => filter === "all" || (filter === "on" ? !c.off : !!c.off));

  return (
    <div className="space-y-5">
      <Title
        action={
          may("exams.centers.POST") && (
            <AddButton href={editHref()}>
              <Plus className="size-4" /> إضافة قاعة
            </AddButton>
          )
        }
      />
      {uncovered.length > 0 && (
        <p className="flex items-start gap-2 rounded-2xl bg-maroon/20 p-3 text-sm text-white ring-1 ring-maroon/50">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold" /> محافظات لا تخدمها أي قاعة فعّالة: {uncovered.join("، ")}. أضفها إلى قاعة، أو انقل متقدميها.
        </p>
      )}
      <Segments
        value={filter}
        onChange={setFilter}
        label="تصفية القاعات"
        items={[
          { value: "all", label: "الكل", count: halls.centers.length },
          { value: "on", label: "فعّالة", count: halls.live.length },
          { value: "off", label: "معطّلة", count: halls.centers.length - halls.live.length },
        ]}
      />
      <ListTable head={["القاعة", "تخدم", "مشرف القاعة", "الشاشة", "المقاعد", "الحالة"]} minWidth="52rem">
        {shown.map((c) => {
          const sup = halls.supervisorOf(c.id);
          const waiting = desk.expected.some((a) => a.center?.id === c.id);
          const live = halls.exams.map((e) => ({ e, st: stageOf(halls.runs[runKey(e.id, c.id)]) })).filter((x) => x.st === "open" || x.st === "running");
          const full = desk.crowded.filter((x) => x.center.id === c.id);
          const n = halls.displayOf(c);
          return (
            <tr key={c.id} className={cn("align-top", c.off && "opacity-60")}>
              <td className="p-3">
                <Link href={editHref(c.id)} className="font-bold text-white hover:text-gold">
                  {c.name}
                </Link>
                <p className="text-xs text-white/55">
                  {c.hall}
                  {c.at ? (
                    <a href={mapsLink(c.at)} target="_blank" rel="noreferrer" className="ms-1 inline-flex items-center gap-0.5 text-gold hover:underline">
                      على الخريطة <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    <span className="ms-1 font-bold text-gold">· بلا موقع على الخريطة</span>
                  )}
                </p>
                <RowActions>
                  <RowLink href={editHref(c.id)}>{may("exams.centers.PUT") ? "تعديل" : "عرض"}</RowLink>
                  <RowLink href={`/staff/exam/manage/people?c=${c.id}`}>متقدموها</RowLink>
                  <a href={asset(displayPath(n))} target="_blank" rel="noreferrer" className="text-gold hover:underline">
                    فتح الشاشة
                  </a>
                  <RowLink onClick={() => copy(displayPath(n), `رابط شاشة ${c.name}`)}>نسخ رابط الشاشة</RowLink>
                  {may("exams.centers.disable") &&
                    (c.off ? (
                      <RowLink onClick={() => setActive(c, true)}>تفعيل</RowLink>
                    ) : (
                      <RowLink danger onClick={() => setOffing(c)}>
                        تعطيل
                      </RowLink>
                    ))}
                </RowActions>
              </td>
              <td className="p-3 text-white/80">{c.governorates.length ? c.governorates.join("، ") : <span className="text-white/50">لا محافظة — بالنقل فقط</span>}</td>
              <td className="p-3">{sup ? sup.name : <Tag tone={waiting && !c.off ? "maroon" : "gold"}>بلا مشرف</Tag>}</td>
              <td className="p-3 tabular-nums">{n}</td>
              <td className="p-3 tabular-nums">{c.capacity ?? "—"}</td>
              <td className="p-3">
                <span className="flex flex-wrap gap-1">
                  {c.off ? <Tag>معطّلة</Tag> : <Tag tone="green">فعّالة</Tag>}
                  {live.map(({ e, st }) => (
                    <Tag key={e.id} tone="gold">
                      {STAGE_LABEL[st]}: {e.name}
                    </Tag>
                  ))}
                  {full.map((x) => (
                    <Tag key={x.exam.id} tone="maroon">
                      {x.exam.name}: {x.n} لـ {c.capacity} مقعداً
                    </Tag>
                  ))}
                </span>
              </td>
            </tr>
          );
        })}
      </ListTable>

      <Box title="شاشات القاعات ورابط المتقدمين" open={false}>
        <div>
          <p className="font-bold text-white">شاشة عرض كل قاعة</p>
          <p className="mt-1 text-xs leading-5 text-white/65">تُفتح على شاشة كبيرة في القاعة برقمها: الجلسة القائمة وتعليماتها ووقتها. رابط كل القاعات يعرض قائمتها لتختار الشاشة منها.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="glass" onClick={() => copy(displayPath(), "رابط شاشة كل القاعات")}>
              <Copy className="size-4" /> نسخ رابط شاشة كل القاعات
            </Button>
            <a href={asset(displayPath())} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-2xl px-3 text-sm font-semibold text-gold hover:bg-white/10">
              <ExternalLink className="size-4" /> فتح
            </a>
          </div>
        </div>
        <div className="border-t border-white/10 pt-3">
          <p className="flex items-center gap-1.5 font-bold text-white">
            <QrCode className="size-4 text-gold" /> رابط دخول المتقدمين
          </p>
          <p className="mt-1 text-xs leading-5 text-white/65">يفتحه المتقدم على جهازه في القاعة ليدخل اختباره برقمه الوطني. رمزه QR على كل شاشة قاعة.</p>
          <p className="mt-1 text-xs text-white/55" dir="ltr">
            {asset(ENTRY)}
          </p>
          <Button size="sm" variant="glass" className="mt-2" onClick={() => copy(ENTRY, "رابط دخول المتقدمين")}>
            <Copy className="size-4" /> نسخ الرابط
          </Button>
        </div>
      </Box>

      <Box title="المحافظات والقاعة التي تخدم كلاً منها" open={false}>
        <p className="text-xs leading-5 text-white/60">يُسند كل متقدم تلقائياً إلى قاعة محافظة قيده. تُغيَّر المحافظات من شاشة تعديل القاعة.</p>
        <ul className="divide-y divide-white/10">
          {GOVERNORATES.map((g) => {
            const c = halls.live.find((x) => x.governorates.includes(g));
            return (
              <li key={g} className="flex items-center justify-between gap-3 py-2">
                <span className="font-bold text-white">{g}</span>
                {c ? (
                  <Link href={editHref(c.id)} className="text-gold hover:underline">
                    {c.name}
                  </Link>
                ) : (
                  <Tag tone="maroon">لا قاعة تخدمها</Tag>
                )}
              </li>
            );
          })}
        </ul>
      </Box>

      <Records area="centers" />
      <OffDialog center={offing} onClose={() => setOffing(null)} />
    </div>
  );
}

// ───────────────────────── Edit one hall ─────────────────────────

type Draft = { name: string; hall: string; at?: LatLng; governorates: string[]; capacity: string; display: string };

/** One hall on its own screen (`?id=`; none: a new one) */
export function CenterEditor() {
  const params = useSearchParams();
  const halls = useHalls();
  const id = params.get("id");
  const center = halls.centerById(id ?? undefined) ?? null;
  if (id && !center)
    return (
      <div>
        <EditHeader back={LIST} backLabel="كل القاعات" nav={false} title="لم يُعثر على هذه القاعة" />
        <p className="text-white/70">ربما حُذفت. ارجع إلى القاعات وافتحها من القائمة.</p>
      </div>
    );
  return <CenterForm key={center?.id ?? "new"} center={center} />;
}

/**
 * As a site's edit screen: its name, place and governorates in the middle; on the side saving, whether it is on,
 * its supervisor, its screen and seats, and its own history.
 */
function CenterForm({ center }: { center: ExamCenter | null }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const router = useRouter();
  const halls = useHalls();
  const copy = useCopy();
  const setActive = useSetActive();
  const may = useCan();
  // A new hall is added (POST), an existing one changed (PUT)
  const allowed = may(center ? "exams.centers.PUT" : "exams.centers.POST");
  const [offing, setOffing] = useState(false);
  const others = halls.centers.filter((c) => c.id !== center?.id);
  const initial = (): Draft => ({
    name: center?.name ?? "",
    hall: center?.hall ?? "",
    at: center?.at,
    governorates: center?.governorates ?? [],
    capacity: center?.capacity ? String(center.capacity) : "",
    // A new hall takes the first screen number no other hall has
    display: String(center ? halls.displayOf(center) : Array.from({ length: 9999 }, (_, i) => i + 1).find((n) => !others.some((c) => halls.displayOf(c) === n))),
  });
  const [d, setD] = useState<Draft>(initial);
  const [saved, setSaved] = useState<Draft>(initial);
  const dirty = !center || JSON.stringify(d) !== JSON.stringify(saved);
  const ownerOf = (g: string) => others.find((c) => c.governorates.includes(g));

  const save = () => {
    if (!allowed) return;
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
    // The stored hall now (switched off or on from the list since this screen opened)
    const stored = halls.centerById(center?.id);
    const next: ExamCenter = {
      id,
      name: d.name.trim(),
      hall: d.hall.trim(),
      at: d.at,
      governorates: d.governorates,
      display,
      ...(Number(d.capacity) > 0 ? { capacity: Number(d.capacity) } : {}),
      // Switched off and on from its own control, where the director hears of it
      ...(stored?.off ? { off: true as const } : {}),
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
    const sups = halls.supervisorsOf(id);
    toast({ title: center ? `حُفظت ${next.name}` : `أُضيفت ${next.name}`, body: sups.length ? `مشرفها ${sups.map((u) => u.name).join("، ")}، وتظهر جلساتها في لوحته.` : "لا مشرف لها بعد: تُمنح صلاحية «قاعة الامتحان» لهذه القاعة من «صلاحيات الموظفين».", tone: "success", icon: "🏛️" });
    setSaved(d);
    if (!center) router.replace(editHref(id));
  };

  const live = center ? halls.centerById(center.id) : undefined;
  const n = /^\d+$/.test(d.display.trim()) ? Number(d.display.trim()) : undefined;

  return (
    <div>
      <EditHeader back={LIST} backLabel="كل القاعات" title={center ? `تعديل ${center.name}` : "إضافة قاعة"}>
        قاعة يُجلس فيها للاختبار: مكانها، والمحافظات التي تخدمها، ومشرفها وشاشتها.
      </EditHeader>
      <EditLayout
        main={
          <>
            <input
              value={d.name}
              onChange={(e) => setD({ ...d, name: e.target.value })}
              placeholder="اسم القاعة — مثال: مركز طرطوس"
              aria-label="اسم القاعة"
              className="h-16 w-full rounded-2xl border-2 border-white/15 bg-white/10 px-5 font-display text-2xl font-bold text-white outline-none placeholder:text-white/35 focus:border-gold"
            />
            <Field label="مكانها وعنوانها" hint="يراه المتقدم في بوابته مع موعد اختباره.">
              <input value={d.hall} onChange={(e) => setD({ ...d, hall: e.target.value })} className={smallInputClass} placeholder="قاعة الاختبارات — مديرية أوقاف طرطوس" />
            </Field>
            <section className="rounded-2xl bg-white/[.04] p-4 ring-1 ring-white/10">
              <h2 className="font-bold text-white">المحافظات التي تخدمها</h2>
              <p className="mb-2 mt-0.5 text-xs leading-5 text-white/60">يُسند إليها تلقائياً كل متقدم قيده فيها. المحافظة تتبع قاعة واحدة: إن اخترت محافظة تخدمها قاعة أخرى انتقلت إلى هذه.</p>
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
            </section>
            <section className="rounded-2xl bg-white/[.04] p-4 ring-1 ring-white/10">
              <h2 className="font-bold text-white">موقع القاعة على الخريطة</h2>
              <p className="mb-2 mt-0.5 text-xs leading-5 text-white/60">قرّب الخريطة ثم اضغط على مكان القاعة. يفتحه المتقدم من بوابته ويصل إليه بالاتجاهات.</p>
              <MapPicker label="موقع القاعة" value={d.at} onChange={(at) => setD({ ...d, at })} focus={GOVERNORATE_SEATS[d.governorates[0] as keyof typeof GOVERNORATE_SEATS]} />
              <p className="mt-1.5 text-xs text-white/60">
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
            </section>
          </>
        }
        side={
          <>
            <Box title="الحفظ">
              {live && (
                <p className="flex flex-wrap items-center gap-2">
                  {live.off ? <Tag>معطّلة</Tag> : <Tag tone="green">فعّالة</Tag>}
                  {may("exams.centers.disable") &&
                    (live.off ? (
                      <RowLink onClick={() => setActive(live, true)}>تفعيلها</RowLink>
                    ) : (
                      <RowLink danger onClick={() => setOffing(true)}>
                        تعطيلها
                      </RowLink>
                    ))}
                </p>
              )}
              <Button variant="gold" className="w-full" onClick={save} disabled={!dirty || !allowed}>
                <Save className="size-4" /> {center ? "حفظ القاعة" : "إضافة القاعة"}
              </Button>
              <p className="text-xs text-white/55">{!allowed ? `للاطلاع: ${center ? "تعديل القاعات" : "إضافة القاعات"} يحتاج صلاحيته.` : dirty ? "لديك تعديلات لم تُحفظ." : "محفوظة."}</p>
            </Box>
            <Box title="مشرف القاعة">
              {center && halls.supervisorsOf(center.id).length ? (
                <ul className="space-y-1 text-sm">
                  {halls.supervisorsOf(center.id).map((u) => (
                    <li key={u.id}>
                      <b>{u.name}</b> <span className="text-xs text-white/55">— {u.title}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-white/70">لا مشرف لها بعد.</p>
              )}
              <p className="text-xs leading-5 text-white/55">مشرف القاعة من يملك صلاحية «قاعة الامتحان» لهذه القاعة، وتُمنح من «صلاحيات الموظفين» لا من هنا. يفتح القاعة ويسجّل الحضور ويوافق على دخول الأجهزة ويؤكد التسليم برمزه، وتظهر له جلساتها في «قاعتي الامتحانية».</p>
            </Box>
            <Box title="الشاشة والمقاعد">
              <Field label="رقم الشاشة" hint="من 1 إلى 9999، لا يتكرر">
                <input inputMode="numeric" value={d.display} onChange={(e) => setD({ ...d, display: e.target.value })} className={cn(smallInputClass, "text-center")} dir="ltr" />
              </Field>
              <Field label="عدد المقاعد" hint="لكل جلسة. ينبهك النظام إن زاد متقدمو اختبار عليها.">
                <input type="number" min={0} value={d.capacity} onChange={(e) => setD({ ...d, capacity: e.target.value })} className={cn(smallInputClass, "text-center")} dir="ltr" />
              </Field>
              {center && n && (
                <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold">
                  <a href={asset(displayPath(n))} target="_blank" rel="noreferrer" className="text-gold hover:underline">
                    فتح الشاشة
                  </a>
                  <RowLink onClick={() => copy(displayPath(n), `رابط شاشة ${center.name}`)}>نسخ رابطها</RowLink>
                  <RowLink href={`/staff/exam/manage/people?c=${center.id}`}>متقدموها</RowLink>
                </p>
              )}
            </Box>
            {center && (
              <Box title="سجلّها" open={false}>
                <RecordHistory refId={center.id} bare />
              </Box>
            )}
          </>
        }
      />
      <OffDialog center={offing && live ? live : null} onClose={() => setOffing(false)} />
    </div>
  );
}
