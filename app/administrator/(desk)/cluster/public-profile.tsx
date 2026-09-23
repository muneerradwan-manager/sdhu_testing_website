"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, BadgeCheck, Bus, CircleDashed, ExternalLink, Hotel, Plus, RotateCcw, Send, Sparkles, Trash2, Utensils } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/portal/shell";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { useClusters } from "@/lib/cms/content";
import { diffFields, fieldsOf, type ClusterProfileFields } from "@/lib/cluster-profile";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { logAdmin, nowMs, useAdmin } from "../../_lib/admin";
import { clusterViewOf } from "../../_lib/cluster";

const TEXT_FIELDS: { key: keyof ClusterProfileFields; label: string; hint?: string; area?: boolean }[] = [
  { key: "specialty", label: "سطر التعريف تحت الاسم", hint: "جملة قصيرة يقرأها الحاج أولاً" },
  { key: "about", label: "نبذة عن التكتل", area: true },
];

const HOUSING: { key: keyof ClusterProfileFields; label: string }[] = [
  { key: "makkahHotel", label: "فندق مكة" },
  { key: "makkahArea", label: "منطقة السكن في مكة" },
  { key: "makkahDistance", label: "المسافة عن الحرم" },
  { key: "makkahRooms", label: "نوع الغرف" },
  { key: "madinahHotel", label: "فندق المدينة" },
  { key: "madinahArea", label: "منطقة السكن في المدينة" },
  { key: "madinahDistance", label: "المسافة عن المسجد النبوي" },
];

const LISTS: { key: keyof ClusterProfileFields; label: string; icon: typeof Bus; item: string }[] = [
  { key: "makkahFeatures", label: "مزايا سكن مكة", icon: Hotel, item: "ميزة" },
  { key: "transport", label: "النقل", icon: Bus, item: "خدمة نقل" },
  { key: "meals", label: "الإعاشة", icon: Utensils, item: "خدمة إعاشة" },
  { key: "programs", label: "البرامج", icon: Sparkles, item: "برنامج" },
];

/**
 * The public page of the cluster, written by its head. He contracted the hotels and the buses, so he
 * is the one who describes them — but the page carries the administration's approval, so what he
 * writes waits for the administration before it reaches the pilgrims.
 */
export function ClusterPublicProfile() {
  const admin = useAdmin()!;
  const toast = useToast();
  const view = clusterViewOf(admin.profile, admin.name)!;
  const clusters = useClusters();
  const state = useStore((s) => s.clusterProfiles[view.id]);
  const listed = clusters.find((c) => c.slug === view.id);
  const live = listed ? (state?.approved ? { ...fieldsOf(listed), ...state.approved.fields } : fieldsOf(listed)) : null;
  const [draft, setDraft] = useState<ClusterProfileFields | null>(null);
  const [note, setNote] = useState("");

  if (!listed || !live) {
    return (
      <Card className="md:p-7">
        <h3 className="font-display text-xl font-bold text-green-dark">صفحة تكتلك العامة</h3>
        <p className="mt-2 leading-8 text-ink-soft">
          تُنشأ صفحة التكتل في دليل الخدمات بعد أن تدرجه الإدارة في دليل الموسم المعتمد. حين تُدرج، تظهر لك هنا لتكتب برنامجك وسكنك ونقلك وإعاشتك، وتُرسلها للاعتماد.
        </p>
      </Card>
    );
  }

  const values = draft ?? (state?.pending?.fields ?? state?.rejected?.fields ?? live);
  const changes = diffFields(live, values);
  const editing = draft !== null;
  const set = (k: keyof ClusterProfileFields, v: string | string[] | number) => setDraft({ ...values, [k]: v } as ClusterProfileFields);

  const submit = () => {
    if (!changes.length) return;
    actions.submitClusterProfile(view.id, { fields: values, at: nowMs(), by: admin.name, note: note.trim() || undefined });
    logAdmin(admin.id, `إرسال برنامج ${view.name} للاعتماد`, `${changes.length} تعديلات`, changes.map((c) => c.label).join("، "));
    toast({ title: "أُرسل للاعتماد", body: "لا يظهر للحجاج قبل أن تعتمده الإدارة.", icon: "📨", tone: "info" });
    setDraft(null);
    setNote("");
  };

  return (
    <div className="space-y-5">
      <Card className="md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl font-bold text-green-dark">صفحة {view.name} في دليل الخدمات</h3>
            <p className="mt-1 max-w-2xl leading-7 text-ink-soft">
              هذه الصفحة يقرأها الحاج قبل أن يختار تكتله. أنت من تعاقد على الفنادق والحافلات، فأنت من يكتب تفاصيلها. وللصفحة ختم «معتمد من الإدارة»، فلا يظهر تعديلك للحجاج قبل اعتماده.
            </p>
          </div>
          <Link href={`/verify/clusters/${view.id}`} target="_blank" className="flex items-center gap-1.5 rounded-full bg-sand px-3 py-2 text-sm font-bold text-green-dark">
            <ExternalLink className="size-4" /> عرض الصفحة كما يراها الحاج
          </Link>
        </div>

        {state?.pending && (
          <p className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-gold/20 p-4 text-sm font-semibold text-maroon">
            <CircleDashed className="size-4 animate-spin" /> تعديلك عند الإدارة للاعتماد — {diffFields(live, state.pending.fields).length} حقلاً. ما يراه الحاج الآن هو النسخة المعتمدة السابقة.
          </p>
        )}
        {state?.rejected && (
          <p className="mt-4 rounded-2xl bg-maroon/10 p-4 text-sm leading-7 text-maroon">
            أعادت الإدارة تعديلك: <b>{state.rejected.reason}</b>. عدّله وأعد إرساله.
          </p>
        )}
        {state?.approved && !state.pending && (
          <p className="mt-4 flex items-center gap-2 rounded-2xl bg-green-light/10 p-4 text-sm font-semibold text-green">
            <BadgeCheck className="size-4" /> برنامجك المعتمد منشور — اعتمدته الإدارة ({state.approved.approvedBy}).
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
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {HOUSING.map((f) => (
            <label key={f.key} className="block">
              <span className="mb-1 block text-sm font-bold">{f.label}</span>
              <input value={String(values[f.key])} onChange={(e) => set(f.key, e.target.value)} aria-label={f.label} className="h-12 w-full rounded-2xl border-2 border-gold/50 px-4 outline-none focus:border-green-light" />
            </label>
          ))}
          <label className="block">
            <span className="mb-1 block text-sm font-bold">فارق الغرفة الخاصة ($)</span>
            <input
              type="number"
              min={0}
              value={values.privateRoomDiff}
              onChange={(e) => set("privateRoomDiff", Number(e.target.value) || 0)}
              aria-label="فارق الغرفة الخاصة"
              dir="ltr"
              className="h-12 w-full rounded-2xl border-2 border-gold/50 px-4 text-center outline-none focus:border-green-light"
            />
          </label>
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
          <Link href={`/verify/clusters/${view.id}`} target="_blank" className="flex items-center gap-1.5 self-center text-sm font-semibold text-maroon underline">
            معاينة الصفحة <ArrowLeft className="size-4" />
          </Link>
        </div>
      </Card>
    </div>
  );
}
