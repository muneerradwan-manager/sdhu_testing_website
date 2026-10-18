"use client";

import { motion } from "motion/react";
import { CheckCircle2, FileUp, Mail, Stamp, Trash2 } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/portal/shell";
import { Button } from "@/components/ui/button";
import { Badge, useToast } from "@/components/ui/widgets";
import { uploadMedia } from "@/lib/cms/media";
import { groupName } from "@/lib/groups";
import { docStatus } from "@/lib/registration/post";
import { fullName, relationLabel } from "@/lib/registry";
import { useStore, type Application, type PostAcceptance } from "@/lib/store";
import { cn, maskNationalId } from "@/lib/utils";
import { addVisa, demoVisaNumber, removeVisa } from "@/lib/visas";
import { AdminShell, LockedCard } from "../../_components/ui";
import { useAdmin } from "../../_lib/admin";

/**
 * «التأشيرات»: the Saudi foreign ministry emails each pilgrim's visa to his group's head; the head adds it to the
 * pilgrim here — the file (a picture or a PDF) and its number. Once every member of a family has his, the
 * family's visa step is done in its portal, and its flights, hotels and season open.
 */
export function AdminVisas() {
  const admin = useAdmin()!;
  const g = admin.profile?.group;
  const post = useStore((s) => s.post);
  const applications = useStore((s) => s.applications);
  if (!g?.approvedAt) {
    return (
      <AdminShell title="التأشيرات" subtitle="تأشيرات حجاج مجموعتك كما تصلك من وزارة الخارجية السعودية.">
        <LockedCard title="التأشيرات لرئيس المجموعة" text="حين تُشكَّل مجموعتك ويلحق المكتب بها الحجاج، تضيف هنا تأشيرة كل حاج كما تصلك بالبريد من وزارة الخارجية السعودية." href="/administrator/dashboard" cta="ملفي" />
      </AdminShell>
    );
  }
  const families = Object.entries(post)
    .filter(([sid, p]) => p.groupNumber === g.number && p.groupApprovedAt && applications[sid] && (!g.clusterId || !p.clusterId || p.clusterId === g.clusterId))
    .map(([sid, p]) => ({ sid, p, app: applications[sid] }));
  const people = families.flatMap((f) => f.app.members);
  const withVisa = families.reduce((n, f) => n + f.app.members.filter((m) => f.p.visas?.[m.person.id]).length, 0);
  const complete = families.filter((f) => f.p.visaAt).length;

  return (
    <AdminShell image="/images/kaaba-panoramio.jpg" title={`تأشيرات ${groupName(g.number)}`} subtitle="تصلك تأشيرة كل حاج بالبريد من وزارة الخارجية السعودية: أضفها إلى صاحبها هنا، ملفاً ورقماً. حين تكتمل تأشيرات عائلة تصدر خطوتها في بوابتها، وتُفتح رحلتها وسكنها.">
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { k: "حجاج في عائلات المجموعة", v: people.length },
          { k: "أُضيفت تأشيراتهم", v: withVisa },
          { k: "عائلات اكتملت تأشيراتها", v: `${complete} من ${families.length}` },
        ].map((x) => (
          <div key={x.k} className="rounded-3xl border border-gold/30 bg-white p-4">
            <p className="font-display text-2xl font-bold text-green-dark">{x.v}</p>
            <p className="text-xs text-hint">{x.k}</p>
          </div>
        ))}
      </div>
      {families.length === 0 ? (
        <Card className="text-center text-ink-soft">لم يلحق المكتب عائلة بمجموعتك بعد. تظهر هنا كل عائلة يلحقها بعقدها.</Card>
      ) : (
        <div className="space-y-5">
          {families.map((f, i) => <Family key={f.sid} sid={f.sid} app={f.app} post={f.p} i={i} by={admin.name} />)}
        </div>
      )}
    </AdminShell>
  );
}

function Family({ sid, app, post, i, by }: { sid: string; app: Application; post: PostAcceptance; i: number; by: string }) {
  const toast = useToast();
  const [numbers, setNumbers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const holder = app.members.find((m) => m.relation === "self") ?? app.members[0];
  const done = app.members.filter((m) => post.visas?.[m.person.id]).length;

  const add = async (personId: string, idx: number, file?: File) => {
    const number = (numbers[personId] ?? "").trim() || demoVisaNumber(app.number, idx);
    setBusy(personId);
    try {
      const up = file ? await uploadMedia(file, by, { documents: true }) : undefined;
      const r = addVisa(sid, personId, { number, ref: up?.ref, name: file?.name, type: file?.type, at: Date.now(), by });
      toast(r.complete ? { title: "اكتملت تأشيرات العائلة", body: `طلب ${app.number}: صدرت خطوة التأشيرة في بوابتها، وفُتحت رحلتها وسكنها.`, tone: "success", icon: "🛂" } : { title: "أُضيفت التأشيرة", body: number, tone: "success", icon: "🛂" });
    } catch (e) {
      toast({ title: "لم تُرفع التأشيرة", body: (e as Error).message, tone: "warning", icon: "⚠️" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} data-family={app.number}>
      <Card className="md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-xl font-bold text-green-dark">عائلة {fullName(holder.person)}</p>
            <p className="text-sm text-hint">طلب {app.number} — {app.members.length} أفراد</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={post.visaAt ? "green" : done ? "gold" : "ink"}>{post.visaAt ? "اكتملت التأشيرات" : `${done} من ${app.members.length}`}</Badge>
            {!post.visaAt && (
              <Button size="sm" variant="outline" onClick={() => app.members.forEach((m, idx) => { if (!post.visas?.[m.person.id]) void add(m.person.id, idx); })}>
                <Mail className="size-4" /> محاكاة: وصل بريد الخارجية بتأشيراتهم
              </Button>
            )}
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {app.members.map((m, idx) => {
            const v = post.visas?.[m.person.id];
            const passport = docStatus(post, m, "passport");
            return (
              <li key={m.person.id} className={cn("flex flex-wrap items-center gap-3 rounded-2xl border p-3", v ? "border-green-light/40 bg-green-light/5" : "border-gold/30")}>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{fullName(m.person)} <span className="text-xs font-normal text-hint">— {relationLabel(m.relation, m.person.gender)}</span></span>
                  <span className="block font-mono text-xs text-hint" dir="ltr">{maskNationalId(m.person.id)}</span>
                  {passport !== "approved" && !v && <span className="block text-xs text-gold-dark">جوازه: {passport === "uploaded" ? "عند المراجعة" : passport === "rejected" ? "أُعيد" : "لم يُرفع"} — تُطلب التأشيرة بجوازه</span>}
                </span>
                {v ? (
                  <>
                    <span className="flex items-center gap-1.5 text-sm font-bold text-green"><CheckCircle2 className="size-4" /> <span dir="ltr" className="font-mono">{v.number}</span></span>
                    <span className="text-xs text-hint">{v.name ?? "من بريد الخارجية"}</span>
                    <button type="button" aria-label={`حذف تأشيرة ${m.person.firstName}`} onClick={() => { removeVisa(sid, m.person.id, by); toast({ title: "حُذفت التأشيرة", body: "أضفها من جديد بالملف الصحيح.", tone: "info" }); }} className="rounded-lg p-1.5 text-maroon hover:bg-maroon/10"><Trash2 className="size-4" /></button>
                  </>
                ) : (
                  <>
                    <input aria-label={`رقم تأشيرة ${m.person.firstName}`} dir="ltr" className="h-10 w-44 rounded-xl border-2 border-gold/40 px-2 font-mono text-sm" placeholder={demoVisaNumber(app.number, idx)} value={numbers[m.person.id] ?? ""} onChange={(e) => setNumbers({ ...numbers, [m.person.id]: e.target.value })} />
                    <label className={cn("inline-flex cursor-pointer items-center gap-2 rounded-xl bg-green-dark px-3 py-2 text-sm font-bold text-white hover:bg-green", busy === m.person.id && "opacity-60")}>
                      <FileUp className="size-4" /> {busy === m.person.id ? "جارٍ الرفع…" : "رفع التأشيرة"}
                      <input type="file" accept="image/*,application/pdf" hidden aria-label={`ملف تأشيرة ${m.person.firstName}`} onChange={(e) => { const file = e.target.files?.[0]; if (file) void add(m.person.id, idx, file); e.target.value = ""; }} />
                    </label>
                  </>
                )}
              </li>
            );
          })}
        </ul>
        {post.visaAt && <p className="mt-3 flex items-center gap-2 text-sm text-green"><Stamp className="size-4" /> صدرت خطوة التأشيرة للعائلة في بوابتها، ووُضعت على رحلتي مجموعتها.</p>}
      </Card>
    </motion.div>
  );
}
