"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, BadgeCheck, CircleDashed, ExternalLink, ImageIcon, Images, NotebookPen, RotateCcw, Send } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/portal/shell";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { diffGroupFields, groupSeed, type GroupProfileFields } from "@/lib/group-profile";
import { groupName } from "@/lib/groups";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { logAdmin, nowMs, useAdmin } from "../../_lib/admin";
import { groupPagesOf } from "../../_lib/directory";
import { CmsImage } from "@/components/cms/image";
import { AdminShell } from "../../_components/ui";
import { CoverPicker, GalleryEditor } from "../../_components/gallery-editor";

/**
 * «صفحة المجموعة العامة»: what a group shows the pilgrims in «التكتلات والمجموعات» beside its head and its seats —
 * its picture, a word about it, and its gallery. A group's head (or his assistant) writes his group's; the cluster's
 * head writes all its groups', picking one at the top. The administration approves each before the
 * pilgrims see it, as the cluster's page.
 */
export function GroupPageDesk() {
  const admin = useAdmin()!;
  const access = groupPagesOf(admin.profile);
  const [chosen, setChosen] = useState<number | null>(null);
  const pages = useStore((s) => s.groupProfiles);

  if (!access) {
    return (
      <AdminShell title="صفحة المجموعة العامة" subtitle="يكتبها رئيس المجموعة ومعاونها بعد اعتماد المجموعة، ورئيس التكتل لكل مجموعاته.">
        <Card className="md:p-8">
          <p className="rounded-2xl bg-sand p-6 text-center leading-8 text-ink-soft">تُفتح لك صفحة المجموعة حين تكون رئيس مجموعة معتمدة أو معاونها، أو رئيس تكتل شُكّل في المكتب.</p>
        </Card>
      </AdminShell>
    );
  }
  const many = access.groups.length > 1;
  const no = chosen !== null && access.groups.includes(chosen) ? chosen : access.groups[0];

  return (
    <AdminShell
      title={many ? "صفحات المجموعات العامة" : "صفحة المجموعة العامة"}
      subtitle={`${many ? `مجموعات ${access.clusterName ?? "التكتل"}` : `${groupName(no)}${access.clusterName ? ` — ${access.clusterName}` : ""}`}. تكتب فيها بصفتك ${access.post}: صورة المجموعة ونبذة عنها ومعرض صورها، وترسلها لاعتماد الإدارة.`}
    >
      {many && (
        <Card className="mb-5 md:p-6">
          <p className="mb-3 text-sm font-bold text-green-dark">اختر المجموعة ({access.groups.length})</p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {access.groups.map((n) => {
              const st = pages[String(n)];
              const cover = st?.pending?.fields.cover ?? st?.approved?.fields.cover ?? groupSeed(n).cover;
              return (
                <li key={n}>
                  <button
                    type="button"
                    onClick={() => setChosen(n)}
                    aria-pressed={n === no}
                    className={cn("flex w-full items-center gap-2 overflow-hidden rounded-2xl border-2 p-1.5 text-start transition", n === no ? "border-green-dark bg-green-dark/5" : "border-gold/30 hover:border-gold-dark")}
                  >
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-sand">
                      <CmsImage src={cover} alt="" fill sizes="48px" className="object-cover" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-ink">{groupName(n)}</span>
                      <span className={cn("block text-[11px] font-semibold", st?.pending ? "text-maroon" : st?.rejected ? "text-maroon" : st?.approved ? "text-green" : "text-hint")}>
                        {st?.pending ? "عند الإدارة" : st?.rejected ? "أُعيدت إليك" : st?.approved ? "معتمدة" : "صور المنصة"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      <GroupPageEditor key={no} no={no} post={access.post} clusterId={access.clusterId} />
    </AdminShell>
  );
}

/** One group's page: its picture, its word, its gallery, and sending them for approval */
function GroupPageEditor({ no, post, clusterId }: { no: number; post: string; clusterId?: string }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const state = useStore((s) => s.groupProfiles[String(no)]);
  const [draft, setDraft] = useState<GroupProfileFields | null>(null);
  const [note, setNote] = useState("");

  const live = state?.approved?.fields ?? groupSeed(no);
  const values = draft ?? state?.pending?.fields ?? state?.rejected?.fields ?? live;
  const changes = diffGroupFields(live, values);
  const set = <K extends keyof GroupProfileFields>(k: K, v: GroupProfileFields[K]) => setDraft({ ...values, [k]: v });
  const by = `${admin.name} — ${post}`;
  const name = groupName(no);

  const submit = () => {
    if (!changes.length) return;
    actions.submitGroupProfile(no, { fields: values, at: nowMs(), by, note: note.trim() || undefined });
    logAdmin(admin.id, `إرسال صفحة ${name} للاعتماد`, name, changes.map((c) => c.label).join("، "), { area: "clusters", ref: clusterId });
    toast({ title: "أُرسلت للاعتماد", body: "لا تظهر للحجاج قبل أن تعتمدها الإدارة.", icon: "📨", tone: "info" });
    setDraft(null);
    setNote("");
  };

  return (
      <div className="space-y-5">
        <Card className="md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl font-bold text-green-dark">{name} في «التكتلات والمجموعات»</h3>
              <p className="mt-1 max-w-3xl leading-7 text-ink-soft">
                يرى الحاج صورة المجموعة على بطاقتها، وإذا ضغطها تُفتح نافذتها بنبذتها ومعرض صورها، مع رئيسها وفريقها ومقاعدها المتبقية. لا يظهر أي تعديل للحجاج قبل أن تعتمده الإدارة.
              </p>
              <p className="mt-2 text-sm text-hint">رئيس المجموعة وفريقها ومقاعدها لا تُكتب هنا: تظهر من طلب التكتل المعتمد.</p>
            </div>
            {clusterId && (
              <Link href={`/clusters/${clusterId}`} target="_blank" className="flex items-center gap-1.5 rounded-full bg-sand px-3 py-2 text-sm font-bold text-green-dark">
                <ExternalLink className="size-4" /> عرض صفحة التكتل كما يراها الحاج
              </Link>
            )}
          </div>
          {state?.pending && (
            <p className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-gold/20 p-4 text-sm font-semibold text-maroon">
              <CircleDashed className="size-4 animate-spin" /> تعديل أرسله {state.pending.by} عند الإدارة للاعتماد — {diffGroupFields(live, state.pending.fields).length} حقول. ما يراه الحاج الآن هو النسخة المعتمدة السابقة.
            </p>
          )}
          {state?.rejected && (
            <p className="mt-4 rounded-2xl bg-maroon/10 p-4 text-sm leading-7 text-maroon">
              أعادت الإدارة آخر تعديل: <b>{state.rejected.reason}</b>. عدّله وأعد إرساله.
            </p>
          )}
          {state?.approved && !state.pending && (
            <p className="mt-4 flex items-center gap-2 rounded-2xl bg-green-light/10 p-4 text-sm font-semibold text-green">
              <BadgeCheck className="size-4" /> صفحة المجموعة المعتمدة منشورة — أرسلها {state.approved.by}، واعتمدتها الإدارة ({state.approved.approvedBy}).
            </p>
          )}
          {draft && (
            <Button size="sm" variant="ghost" className="mt-3" onClick={() => setDraft(null)}>
              <RotateCcw className="size-4" /> تراجع عن التعديلات
            </Button>
          )}
        </Card>

        <Card className="md:p-7">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
            <ImageIcon className="size-5 text-gold-dark" /> صورة المجموعة
          </h3>
          <p className="mb-3 mt-1 text-sm text-ink-soft">تظهر أعلى بطاقة المجموعة وأعلى نافذتها.</p>
          <CoverPicker value={values.cover} onChange={(v) => set("cover", v)} by={by} />
        </Card>

        <Card className="md:p-7">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
            <NotebookPen className="size-5 text-gold-dark" /> نبذة عن المجموعة
          </h3>
          <textarea
            rows={4}
            value={values.about}
            onChange={(e) => set("about", e.target.value)}
            aria-label="نبذة عن المجموعة"
            placeholder="مثال: مجموعة من حمص منذ 1443هـ، فريقها من المواسم السابقة، ولها برنامج يومي في مكة."
            className="mt-3 w-full rounded-2xl border-2 border-gold/50 p-3 outline-none focus:border-green-light"
          />
        </Card>

        <Card className="md:p-7">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
            <Images className="size-5 text-gold-dark" /> معرض الصور
          </h3>
          <p className="mb-3 mt-1 text-sm text-ink-soft">صور المجموعة في المواسم السابقة، وسكنها وفريقها. تظهر في نافذتها.</p>
          <GalleryEditor value={values.gallery} onChange={(v) => set("gallery", v)} by={by} />
        </Card>

        <Card className="md:p-7">
          <h3 className="font-display text-lg font-bold text-green-dark">إرسال للاعتماد</h3>
          {changes.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">لم تغيّر شيئاً بعد. عدّل ما تريد ثم أرسله إلى الإدارة.</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-ink-soft">{changes.length} حقول ستتغير بعد الاعتماد:</p>
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
                <input value={note} onChange={(e) => setNote(e.target.value)} aria-label="ملاحظة للإدارة" className="h-12 w-full rounded-2xl border-2 border-gold/50 px-4 outline-none focus:border-green-light" />
              </label>
            </>
          )}
          <div className={cn("mt-4 flex flex-wrap gap-3", !changes.length && "opacity-50")}>
            <Button disabled={!changes.length} onClick={submit}>
              <Send className="size-4" /> أرسل للاعتماد
            </Button>
            {clusterId && (
              <Link href={`/clusters/${clusterId}`} target="_blank" className="flex items-center gap-1.5 self-center text-sm font-semibold text-maroon underline">
                معاينة صفحة التكتل <ArrowLeft className="size-4" />
              </Link>
            )}
          </div>
        </Card>
      </div>
  );
}
