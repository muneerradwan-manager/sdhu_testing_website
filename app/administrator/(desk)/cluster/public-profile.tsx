"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, BadgeCheck, Bus, CircleDashed, ExternalLink, Hotel, ImageIcon, Images, Plus, RotateCcw, Send, Sparkles, Trash2, Utensils } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/portal/shell";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { diffFields, fieldsOf, useClusterProgrammes, type ClusterProfileFields } from "@/lib/cluster-profile";
import { ROOM_BEDS, ROOM_LABEL, type RoomPrices } from "@/lib/rooms";
import { HARAM, NABAWI } from "@/lib/data/clusters";
import { MapPicker, distanceLabel, distanceM, mapsLink } from "@/components/ui/map-picker";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { logAdmin, nowMs, useAdmin } from "../../_lib/admin";
import { pageWriterOf } from "../../_lib/directory";
import { useClusterRequest } from "../../_lib/formation";
import { CoverPicker, GalleryEditor } from "../../_components/gallery-editor";

const TEXT_FIELDS: { key: keyof ClusterProfileFields; label: string; hint?: string; area?: boolean }[] = [
  { key: "specialty", label: "سطر التعريف تحت الاسم", hint: "جملة قصيرة يقرأها الحاج أولاً" },
  { key: "about", label: "نبذة عن التكتل", area: true },
];

/**
 * The two hotels, each with its map: the team types the hotel's name and area and taps its place, and the distance
 * to the mosque is measured from the pin (they may still write it themselves).
 */
const HOTELS = [
  { city: "مكة المكرمة", name: "makkahHotel", area: "makkahArea", distance: "makkahDistance", at: "makkahAt", mosque: { at: HARAM, label: "المسجد الحرام" }, from: "عن الحرم" },
  { city: "المدينة المنورة", name: "madinahHotel", area: "madinahArea", distance: "madinahDistance", at: "madinahAt", mosque: { at: NABAWI, label: "المسجد النبوي" }, from: "عن المسجد النبوي" },
] as const;

const LISTS: { key: keyof ClusterProfileFields; label: string; icon: typeof Bus; item: string }[] = [
  { key: "makkahFeatures", label: "مزايا سكن مكة", icon: Hotel, item: "ميزة" },
  { key: "transport", label: "النقل", icon: Bus, item: "خدمة نقل" },
  { key: "meals", label: "الإعاشة", icon: Utensils, item: "خدمة إعاشة" },
  { key: "programs", label: "البرامج", icon: Sparkles, item: "برنامج" },
];

/**
 * The public page of the cluster, written by its team once the cluster is approved (../../_lib/directory
 * pageWriterOf): they contracted the hotels and the buses and run the programme, so they describe them — but
 * the page carries the administration's approval, so what any of them sends waits for the administration
 * before it reaches the pilgrims. Its groups, their heads and its people are not written here: the page reads
 * them from the approved request.
 */
export function ClusterPublicProfile({ clusterId, clusterName }: { clusterId: string; clusterName: string }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const view = { id: clusterId, name: clusterName };
  const writer = pageWriterOf(admin.profile);
  const request = useClusterRequest(clusterId);
  const programme = useClusterProgrammes().find((x) => x.cluster.slug === clusterId);
  const state = useStore((s) => s.clusterProfiles[view.id]);
  const listed = programme?.cluster;
  const live = listed ? (state?.approved ? { ...fieldsOf(listed), ...state.approved.fields } : fieldsOf(listed)) : null;
  const [draft, setDraft] = useState<ClusterProfileFields | null>(null);
  const [note, setNote] = useState("");

  if (!listed || !live || request?.status !== "approved") {
    return (
      <Card className="md:p-7">
        <h3 className="font-display text-xl font-bold text-green-dark">صفحة {clusterName} العامة</h3>
        <p className="mt-2 leading-8 text-ink-soft">
          تُفتح صفحة التكتل بعد أن يُشكَّل في المكتب. حينها يكتب فريقه هنا لمحته وسكنه في مكة والمدينة وأسعار السكن الخاص ونقله وإعاشته وبرامجه، ويرسلها للاعتماد. أما مجموعاته ورؤساؤها وفريقه وتقييمه فتظهر في الصفحة وحدها من طلبه المعتمد.
        </p>
      </Card>
    );
  }

  const values = draft ?? (state?.pending?.fields ?? state?.rejected?.fields ?? live);
  const changes = diffFields(live, values);
  const editing = draft !== null;
  const set = (k: keyof ClusterProfileFields, v: string | string[] | number | RoomPrices) => setDraft({ ...values, [k]: v } as ClusterProfileFields);

  const submit = () => {
    if (!changes.length) return;
    actions.submitClusterProfile(view.id, { fields: values, at: nowMs(), by: writer ? `${admin.name} — ${writer.post}` : admin.name, note: note.trim() || undefined });
    logAdmin(admin.id, `إرسال برنامج ${view.name} للاعتماد`, `${changes.length} تعديلات`, changes.map((c) => c.label).join("، "), { area: "clusters", ref: view.id });
    toast({ title: "أُرسل للاعتماد", body: "لا يظهر للحجاج قبل أن تعتمده الإدارة.", icon: "📨", tone: "info" });
    setDraft(null);
    setNote("");
  };

  return (
    <div className="space-y-5">
      <Card className="md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl font-bold text-green-dark">صفحة {view.name} في «التكتلات والمجموعات»</h3>
            <p className="mt-1 max-w-3xl leading-7 text-ink-soft">
              هذه الصفحة يقرأها الحاج قبل أن يختار تكتله. يكتبها فريق التكتل — رئيسه ومعاونوه ومنسقوه ورؤساء مجموعاته ومعاونوها — لأنهم من تعاقد على الفنادق والحافلات ويدير البرنامج. وللصفحة ختم «معتمد من الإدارة»، فلا يظهر أي تعديل للحجاج قبل اعتماده، ويصل إلى الإدارة باسم من أرسله.
            </p>
            <p className="mt-2 text-sm text-hint">مجموعات التكتل ورؤساؤها وفريقه وتقييمه لا تُكتب هنا: تظهر في الصفحة وحدها من طلبه المعتمد.</p>
          </div>
          <Link href={`/clusters/${view.id}`} target="_blank" className="flex items-center gap-1.5 rounded-full bg-sand px-3 py-2 text-sm font-bold text-green-dark">
            <ExternalLink className="size-4" /> عرض الصفحة كما يراها الحاج
          </Link>
        </div>

        {state?.pending && (
          <p className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-gold/20 p-4 text-sm font-semibold text-maroon">
            <CircleDashed className="size-4 animate-spin" /> تعديل أرسله {state.pending.by} عند الإدارة للاعتماد — {diffFields(live, state.pending.fields).length} حقلاً. ما يراه الحاج الآن هو النسخة المعتمدة السابقة.
          </p>
        )}
        {state?.rejected && (
          <p className="mt-4 rounded-2xl bg-maroon/10 p-4 text-sm leading-7 text-maroon">
            أعادت الإدارة آخر تعديل: <b>{state.rejected.reason}</b>. عدّله وأعد إرساله.
          </p>
        )}
        {state?.approved && !state.pending && (
          <p className="mt-4 flex items-center gap-2 rounded-2xl bg-green-light/10 p-4 text-sm font-semibold text-green">
            <BadgeCheck className="size-4" /> برنامج التكتل المعتمد منشور — أرسله {state.approved.by}، واعتمدته الإدارة ({state.approved.approvedBy}).
          </p>
        )}
      </Card>

      <Card className="md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-lg font-bold text-green-dark">التعريف</h3>
          {editing && (
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
              <RotateCcw className="size-4" /> تراجع عن التعديلات
            </Button>
          )}
        </div>
        <div className="mt-4 space-y-4">
          {TEXT_FIELDS.map((f) =>
            f.area ? (
              <label key={f.key} className="block">
                <span className="mb-1 block font-bold">{f.label}</span>
                <textarea rows={3} value={String(values[f.key])} onChange={(e) => set(f.key, e.target.value)} aria-label={f.label} className="w-full rounded-2xl border-2 border-gold/50 p-3 outline-none focus:border-green-light" />
              </label>
            ) : (
              <label key={f.key} className="block">
                <span className="mb-1 block font-bold">{f.label}</span>
                <input value={String(values[f.key])} onChange={(e) => set(f.key, e.target.value)} aria-label={f.label} className="h-12 w-full rounded-2xl border-2 border-gold/50 px-4 outline-none focus:border-green-light" />
                {f.hint && <span className="mt-1 block text-xs text-hint">{f.hint}</span>}
              </label>
            ),
          )}
        </div>
      </Card>

      <Card className="md:p-7">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
          <Hotel className="size-5 text-gold-dark" /> السكن
        </h3>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          {HOTELS.map((h) => {
            const at = values[h.at];
            // It opens on the hotel and the mosque together (or on the mosque, before a pin)
            const far = at ? Math.max(Math.abs(at.lat - h.mosque.at.lat), Math.abs(at.lng - h.mosque.at.lng)) : 0;
            return (
              <fieldset key={h.city} className="space-y-3 rounded-2xl border-2 border-gold/30 p-4">
                <legend className="px-1 font-display font-bold text-green-dark">{h.city}</legend>
                <label className="block">
                  <span className="mb-1 block text-sm font-bold">اسم الفندق</span>
                  <input value={String(values[h.name])} onChange={(e) => set(h.name, e.target.value)} aria-label={`فندق ${h.city}`} className="h-12 w-full rounded-2xl border-2 border-gold/50 px-4 outline-none focus:border-green-light" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-bold">المنطقة</span>
                  <input value={String(values[h.area])} onChange={(e) => set(h.area, e.target.value)} aria-label={`منطقة السكن في ${h.city}`} className="h-12 w-full rounded-2xl border-2 border-gold/50 px-4 outline-none focus:border-green-light" />
                </label>
                <div>
                  <span className="mb-1 block text-sm font-bold">موقع الفندق على الخريطة</span>
                  <MapPicker
                    label={`موقع فندق ${h.city}`}
                    value={at}
                    center={at ? { lat: (at.lat + h.mosque.at.lat) / 2, lng: (at.lng + h.mosque.at.lng) / 2 } : h.mosque.at}
                    zoom={!at ? 15 : far > 0.04 ? 12 : far > 0.015 ? 13 : far > 0.006 ? 14 : 15}
                    landmark={h.mosque}
                    prompt="قرّب الخريطة واضغط على موقع الفندق"
                    onChange={(v) => setDraft({ ...values, [h.at]: v, [h.distance]: `${distanceLabel(distanceM(v, h.mosque.at))} ${h.from}` } as ClusterProfileFields)}
                    className="h-72"
                  />
                  {at && (
                    <a href={mapsLink(at)} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-green-dark underline">
                      افتح الموقع في الخرائط
                    </a>
                  )}
                </div>
                <label className="block">
                  <span className="mb-1 block text-sm font-bold">المسافة {h.from}</span>
                  <input value={String(values[h.distance])} onChange={(e) => set(h.distance, e.target.value)} aria-label={`المسافة ${h.from}`} className="h-12 w-full rounded-2xl border-2 border-gold/50 px-4 outline-none focus:border-green-light" />
                  <span className="mt-1 block text-xs text-hint">تُحسب من موقع الفندق على الخريطة كلما غيّرته، ويمكنك تعديلها.</span>
                </label>
              </fieldset>
            );
          })}
          <label className="block lg:col-span-2">
            <span className="mb-1 block text-sm font-bold">نوع الغرف في مكة</span>
            <input value={String(values.makkahRooms)} onChange={(e) => set("makkahRooms", e.target.value)} aria-label="نوع الغرف" className="h-12 w-full rounded-2xl border-2 border-gold/50 px-4 outline-none focus:border-green-light" />
          </label>
          {/* The shared accommodation adds nothing; each private room type adds its price per person */}
          <fieldset className="lg:col-span-2">
            <legend className="mb-1 text-sm font-bold">السكن الخاص — ما تضيفه كل غرفة للفرد ($)</legend>
            <p className="mb-2 text-xs text-hint">سعر الفرد في كل نوع غرفة. يتوزع أفراد الطلب على الغرف كما يشاؤون، لكل فرد سرير، وكلما قلّت أسرّة الغرفة ارتفع السعر. السكن العام (الرجال وحدهم والنساء وحدهن) دون كلفة.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ROOM_BEDS.map((beds) => (
                <label key={beds} className="block">
                  <span className="mb-1 block text-xs font-semibold text-ink-soft">{ROOM_LABEL[beds]}</span>
                  <input
                    type="number"
                    min={0}
                    value={values.rooms[beds]}
                    onChange={(e) => set("rooms", { ...values.rooms, [beds]: Number(e.target.value) || 0 } as RoomPrices)}
                    aria-label={`السكن الخاص — ${ROOM_LABEL[beds]}`}
                    dir="ltr"
                    className="h-12 w-full rounded-2xl border-2 border-gold/50 px-4 text-center outline-none focus:border-green-light"
                  />
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </Card>

      {LISTS.map(({ key, label, icon: Icon, item }) => {
        const list = values[key] as string[];
        return (
          <Card key={key} className="md:p-7">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
              <Icon className="size-5 text-gold-dark" /> {label}
            </h3>
            <ul className="mt-4 space-y-2">
              {list.map((v, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input
                    value={v}
                    onChange={(e) => set(key, list.map((x, j) => (j === i ? e.target.value : x)))}
                    aria-label={`${label} ${i + 1}`}
                    className="h-12 min-w-0 flex-1 rounded-2xl border-2 border-gold/50 px-4 outline-none focus:border-green-light"
                  />
                  <Button size="sm" variant="ghost" aria-label={`حذف ${label} ${i + 1}`} onClick={() => set(key, list.filter((_, j) => j !== i))}>
                    <Trash2 className="size-4 text-maroon" />
                  </Button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => set(key, [...list, ""])} className="mt-3 flex items-center gap-2 text-sm font-semibold text-maroon underline">
              <Plus className="size-4" /> إضافة {item}
            </button>
          </Card>
        );
      })}

      <Card className="md:p-7">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
          <ImageIcon className="size-5 text-gold-dark" /> الصورة الرئيسية
        </h3>
        <p className="mb-3 mt-1 text-sm text-ink-soft">تظهر أعلى صفحة التكتل، وعلى بطاقته في «التكتلات والمجموعات» وفي الصفحة الرئيسية.</p>
        <CoverPicker label="الصورة الرئيسية" value={values.cover ?? ""} onChange={(v) => set("cover", v)} by={writer ? `${admin.name} — ${writer.post}` : admin.name} />
      </Card>

      <Card className="md:p-7">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
          <Images className="size-5 text-gold-dark" /> معرض الصور
        </h3>
        <p className="mb-3 mt-1 text-sm text-ink-soft">الفنادق والمخيمات والحافلات، وصور المواسم السابقة. تظهر في صفحة التكتل تحت «عن التكتل».</p>
        <GalleryEditor value={values.gallery ?? []} onChange={(v) => set("gallery", v)} by={writer ? `${admin.name} — ${writer.post}` : admin.name} />
      </Card>

      <Card className="md:p-7">
        <h3 className="font-display text-lg font-bold text-green-dark">إرسال للاعتماد</h3>
        {changes.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">لم تغيّر شيئاً بعد. عدّل ما تريد ثم أرسله إلى الإدارة.</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-ink-soft">{changes.length} حقلاً ستتغير على الصفحة العامة بعد الاعتماد:</p>
            <ul className="mt-3 space-y-2 text-sm">
              {changes.map((c) => (
                <motion.li key={c.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-sand p-3">
                  <p className="font-bold text-green-dark">{c.label}</p>
                  <p className="mt-1 text-xs text-hint line-through">{c.before || "—"}</p>
                  <p className="text-xs font-semibold text-green">{c.after || "—"}</p>
                </motion.li>
              ))}
            </ul>
            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-bold">ملاحظة للإدارة (اختيارية)</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} aria-label="ملاحظة للإدارة" placeholder="مثال: تغيّر فندق مكة بعقد جديد" className="h-12 w-full rounded-2xl border-2 border-gold/50 px-4 outline-none focus:border-green-light" />
            </label>
          </>
        )}
        <div className={cn("mt-4 flex flex-wrap gap-3", !changes.length && "opacity-50")}>
          <Button disabled={!changes.length} onClick={submit}>
            <Send className="size-4" /> أرسل للاعتماد
          </Button>
          <Link href={`/clusters/${view.id}`} target="_blank" className="flex items-center gap-1.5 self-center text-sm font-semibold text-maroon underline">
            معاينة الصفحة <ArrowLeft className="size-4" />
          </Link>
        </div>
      </Card>
    </div>
  );
}
