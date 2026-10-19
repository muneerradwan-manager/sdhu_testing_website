"use client";

import { FileHeart, Paperclip, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge, useToast } from "@/components/ui/widgets";
import { uploadMedia } from "@/lib/cms/media";
import { HEALTH_KIND, addHealthDoc, removeHealthDoc } from "@/lib/health-docs";
import { ageOf, fullName } from "@/lib/registry";
import { useStore, type HealthDoc, type HealthDocKind } from "@/lib/store";
import { cn, gregorianDate } from "@/lib/utils";
import { nowMs, useAdmin } from "../../_lib/admin";
import type { JoinRequest } from "../../_lib/group";

/**
 * A family's health documents, member by member, as the administration adds them: the Ministry of Health's
 * certificate (fit with every vaccine, or a condition named), and prescriptions or condition reports. Each may
 * carry its file. They reach the pilgrim's «خزنة الوثائق» at once, and each is written to his application's log.
 * `role`: who adds them — the group's head, the cluster's head, or the coordinator sorted to the group.
 */
export function HealthDocsForm({ family, role, onDone }: { family: JoinRequest; role: string; onDone: () => void }) {
  const app = useStore((s) => s.applications[family.id]);
  const docs = useStore((s) => s.post[family.id]?.healthDocs);
  if (!app) return null;
  return (
    <div>
      <h3 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark">
        <FileHeart className="size-6 text-gold-dark" /> الوثائق الصحية — {family.applicant}
      </h3>
      <p className="mt-1 text-sm leading-7 text-ink-soft">
        الشهادة الصحية من وزارة الصحة لكل فرد قبل السفر: سليم ولقاحاته مكتملة، أو لديه حالة صحية. وتضيف معها ما يحمله من وصفات أدوية أو تقارير حالته. تظهر للحاج في «خزنة الوثائق» فور إضافتها.
      </p>
      <div className="mt-5 max-h-[62vh] space-y-4 overflow-y-auto pl-1">
        {app.members.map((m) => (
          <Member key={m.person.id} sid={family.id} personId={m.person.id} name={fullName(m.person)} age={ageOf(m.person)} docs={docs?.[m.person.id] ?? []} role={role} />
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <Button variant="outline" onClick={onDone}>
          إغلاق
        </Button>
      </div>
    </div>
  );
}

const KINDS: HealthDocKind[] = ["certificate", "prescription", "condition"];

function Member({ sid, personId, name, age, docs, role }: { sid: string; personId: string; name: string; age: number; docs: HealthDoc[]; role: string }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const hasCertificate = docs.some((d) => d.kind === "certificate");
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<HealthDocKind>(hasCertificate ? "prescription" : "certificate");
  const [fit, setFit] = useState(true);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const by = { id: admin.id, name: admin.name, role };
  const needsNote = kind !== "certificate" || !fit;
  const ready = !needsNote || !!note.trim();

  const reset = () => {
    setAdding(false);
    setNote("");
    setFile(null);
    setFit(true);
  };

  const save = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      const up = file ? await uploadMedia(file, admin.name, { documents: true }) : undefined;
      addHealthDoc(sid, personId, { id: `hd-${nowMs()}`, kind, fit: kind === "certificate" ? fit : undefined, note: note.trim() || undefined, ref: up?.ref, name: file?.name, type: file?.type, at: nowMs(), by });
      toast({ title: `أُضيفت ${HEALTH_KIND[kind].one} — ${name.split(" ")[0]}`, body: "تظهر له في «خزنة الوثائق»، وسُجّلت في سجل طلبه.", icon: "🩺", tone: "success" });
      reset();
    } catch (e) {
      toast({ title: "لم يُرفع الملف", body: (e as Error).message, tone: "warning", icon: "⚠️" });
    }
    setBusy(false);
  };

  return (
    <div className="rounded-2xl border border-gold/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold">
          {name} <span className="text-sm font-normal text-hint">— {age} عاماً</span>
        </p>
        {hasCertificate ? <Badge tone="green">الشهادة الصحية مضافة</Badge> : <Badge tone="maroon">بلا شهادة صحية</Badge>}
      </div>
      {docs.length > 0 && (
        <ul className="mt-3 space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="flex items-start gap-3 rounded-xl bg-sand px-3 py-2 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-green-dark">
                  {HEALTH_KIND[d.kind].one}
                  {d.kind === "certificate" && <span className={cn("mr-2 text-xs", d.fit ? "text-green" : "text-maroon")}>{d.fit ? "سليم ولقاحاته مكتملة" : "لديه حالة صحية"}</span>}
                </span>
                {d.note && <span className="block text-ink-soft">{d.note}</span>}
                <span className="block text-xs text-hint">
                  {d.by.name} ({d.by.role}) — {gregorianDate(new Date(d.at))}
                  {d.name ? ` — ${d.name}` : ""}
                </span>
              </span>
              <button type="button" aria-label={`حذف ${HEALTH_KIND[d.kind].one}`} onClick={() => removeHealthDoc(sid, personId, d.id, by)} className="grid size-8 shrink-0 place-items-center rounded-lg text-hint hover:bg-maroon/10 hover:text-maroon">
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <div className="mt-3 space-y-3 rounded-xl border-2 border-dashed border-gold/50 p-3">
          <div role="radiogroup" aria-label="نوع الوثيقة" className="flex flex-wrap gap-1.5">
            {KINDS.map((k) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={cn("rounded-full border px-3 py-1 text-xs font-bold transition", kind === k ? "border-green-dark bg-green-dark text-white" : "border-gold/40 bg-white text-ink-soft hover:border-gold-dark")}>
                {HEALTH_KIND[k].label}
              </button>
            ))}
          </div>
          {kind === "certificate" && (
            <div role="radiogroup" aria-label="ما تقوله الشهادة" className="grid grid-cols-2 gap-1 rounded-xl bg-sand p-1">
              {[true, false].map((v) => (
                <button key={String(v)} type="button" role="radio" aria-checked={fit === v} onClick={() => setFit(v)} className={cn("rounded-lg px-3 py-2 text-sm font-bold transition", fit === v ? (v ? "bg-green-dark text-white" : "bg-maroon text-white") : "text-ink-soft")}>
                  {v ? "سليم ولقاحاته مكتملة" : "لديه حالة صحية"}
                </button>
              ))}
            </div>
          )}
          {needsNote && (
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={kind === "prescription" ? "الأدوية والجرعات كما في الوصفة" : "الحالة الصحية، مثل: سكري من النوع الثاني"}
              className="h-11 w-full rounded-xl border-2 border-gold/40 px-3 text-sm outline-none focus:border-green-light"
            />
          )}
          <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-green-dark">
            <Paperclip className="size-4" /> {file ? file.name : "إرفاق ملف الوثيقة (صورة أو PDF) — اختياري"}
            <input type="file" accept="image/*,application/pdf" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              إلغاء
            </Button>
            <Button size="sm" disabled={!ready || busy} onClick={() => void save()}>
              {busy ? "جارٍ الرفع…" : "إضافة الوثيقة"}
            </Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => { setKind(hasCertificate ? "prescription" : "certificate"); setAdding(true); }} className="mt-3 flex items-center gap-1.5 text-sm font-bold text-maroon underline-offset-4 hover:underline">
          <Plus className="size-4" /> {hasCertificate ? "إضافة وصفة طبية أو تقرير حالة" : "إضافة الشهادة الصحية"}
        </button>
      )}
    </div>
  );
}
