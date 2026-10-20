"use client";

import { motion } from "motion/react";
import { CheckCircle2, FileUp, Mail, Stamp, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Card } from "@/components/portal/shell";
import { Button } from "@/components/ui/button";
import { Badge, useToast } from "@/components/ui/widgets";
import { uploadMedia } from "@/lib/cms/media";
import { familiesOfGroup } from "@/lib/flights";
import { groupName } from "@/lib/groups";
import { docStatus } from "@/lib/registration/post";
import { fullName, relationLabel } from "@/lib/registry";
import { useStore, type PilgrimVisa } from "@/lib/store";
import { cn, maskNationalId } from "@/lib/utils";
import { addVisa, demoVisaNumber, removeVisa, setGroupVisa } from "@/lib/visas";
import { AdminShell, LockedCard, ViewOnlyNote } from "@/app/administrator/_components/ui";
import { useAdmin } from "@/app/administrator/_lib/admin";
import { useFieldGroups } from "@/app/administrator/_lib/field-groups";
import { useAdminScope, viewOnlyText } from "@/app/administrator/_lib/scope";

/** One member as the page lists him: his visa, and what his passport says when it holds his visa back */
type Member = { id: string; name: string; relation?: string; passport?: string; visa?: PilgrimVisa };
/** A family of the group: an application of this device, or one the demo generates for the group's size */
type VisaFamily = { id: string; number: string; holder: string; complete: boolean; members: Member[]; add: (m: Member, visa: PilgrimVisa) => { complete: boolean }; remove: (m: Member, by: string) => void };

/**
 * «التأشيرات»: the Saudi foreign ministry emails each pilgrim's visa to his group; the technical coordinator sorted
 * to the group adds it to the pilgrim here — the file (a picture or a PDF) and its number. Once every member of a
 * family has his, the family's visa step is done in its portal, and its flights, hotels and season open. The
 * group's head and its assistant see their group's visas, and the cluster's head, its assistant and its accountant
 * every group's; none of them adds one.
 */
export function AdminVisas() {
  const admin = useAdmin()!;
  const scope = useAdminScope();
  const groups = useFieldGroups();
  const [picked, setPicked] = useState<number | null>(null);
  const post = useStore((s) => s.post);
  const applications = useStore((s) => s.applications);
  const groupVisas = useStore((s) => s.groupVisas);
  const g = groups.find((x) => x.number === picked) ?? groups[0];

  const families = useMemo<VisaFamily[]>(() => {
    if (!g) return [];
    // The applications attached to the group, each visa on its application
    const real = Object.entries(post)
      .filter(([sid, p]) => p.groupNumber === g.number && p.groupApprovedAt && applications[sid] && (!g.clusterId || !p.clusterId || p.clusterId === g.clusterId))
      .map(([sid, p]): VisaFamily => {
        const app = applications[sid];
        const holder = app.members.find((m) => m.relation === "self") ?? app.members[0];
        return {
          id: sid,
          number: app.number,
          holder: fullName(holder.person),
          complete: !!p.visaAt,
          members: app.members.map((m) => {
            const passport = docStatus(p, m, "passport");
            return { id: m.person.id, name: fullName(m.person), relation: relationLabel(m.relation, m.person.gender), passport: passport === "approved" ? undefined : passport === "uploaded" ? "عند المراجعة" : passport === "rejected" ? "أُعيد" : "لم يُرفع", visa: p.visas?.[m.person.id] };
          }),
          add: (m, visa) => addVisa(sid, m.id, visa),
          remove: (m, by) => removeVisa(sid, m.id, by),
        };
      });
    // The rest of the group, as the demo generates it up to its size: their visas are kept apart
    const ref = { clusterId: g.clusterId ?? "", clusterName: "", number: g.number, head: g.head, pilgrims: g.size ?? g.pilgrims, capacity: 0 };
    const seeded = familiesOfGroup(ref, post, applications).filter((f) => !f.real).map((f, n): VisaFamily => {
      const members = f.members.map((m) => ({ id: m.id, name: m.name, visa: groupVisas[m.id] }));
      return {
        id: f.id,
        number: `${g.number}${String(n + 1).padStart(2, "0")}`,
        holder: f.applicant,
        complete: members.every((m) => m.visa),
        members,
        add: (m, visa) => {
          setGroupVisa(m.id, m.name, visa, visa.by);
          return { complete: members.every((x) => x.id === m.id || x.visa) };
        },
        remove: (m, by) => setGroupVisa(m.id, m.name, null, by),
      };
    });
    return [...real, ...seeded];
  }, [g, post, applications, groupVisas]);

  if (!g || scope.kind === "guide" || scope.kind === "none") {
    return (
      <AdminShell title="التأشيرات" subtitle="تأشيرات حجاج المجموعة كما تصل من وزارة الخارجية السعودية.">
        <LockedCard title="التأشيرات للمنسق التقني" text="يُدخلها المنسق التقني لحجاج المجموعات التي وُزّع عليها، حين يلحق المكتب بها الحجاج: تأشيرة كل حاج كما تصل بالبريد من وزارة الخارجية السعودية. ويراها رئيس المجموعة ومعاونه، ويتابعها رئيس التكتل." href="/portal" cta="ملفي" />
      </AdminShell>
    );
  }
  const canAct = scope.kind === "tech" && scope.canAct(g.number);
  const people = families.flatMap((f) => f.members);
  const withVisa = people.filter((m) => m.visa).length;
  const complete = families.filter((f) => f.complete).length;

  return (
    <AdminShell image="/images/kaaba-panoramio.jpg" title={`تأشيرات ${groupName(g.number)}`} subtitle="تصل تأشيرة كل حاج بالبريد من وزارة الخارجية السعودية، فيضيفها المنسق التقني إلى صاحبها هنا، ملفاً ورقماً. حين تكتمل تأشيرات عائلة تصدر خطوتها في بوابتها، وتُفتح رحلتها وسكنها.">
      {scope.viewOnly && <ViewOnlyNote>{viewOnlyText(scope, "تأشيرات حجاج المجموعات", true)}</ViewOnlyNote>}
      {scope.kind === "group" && <p className="mb-5 rounded-2xl bg-sand px-4 py-3 text-sm text-ink-soft">تأشيرات {groupName(g.number)} كما يُدخلها المنسق التقني للمجموعة: تراها هنا ولا تضيفها.</p>}
      {groups.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {groups.map((x) => (
            <button key={x.number} type="button" aria-pressed={x.number === g.number} onClick={() => setPicked(x.number)} className={cn("rounded-2xl border-2 px-4 py-2 text-sm font-bold transition", x.number === g.number ? "border-maroon bg-maroon text-white" : "border-gold/40 bg-white text-ink-soft hover:border-gold-dark")}>
              {groupName(x.number)}
            </button>
          ))}
        </div>
      )}
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
        <Card className="text-center text-ink-soft">لم يلحق المكتب عائلة بهذه المجموعة بعد. تظهر هنا كل عائلة يلحقها بعقدها.</Card>
      ) : (
        <div className="space-y-5">
          {families.map((f, i) => <Family key={f.id} f={f} i={i} by={admin.name} canAct={canAct} />)}
        </div>
      )}
    </AdminShell>
  );
}

function Family({ f, i, by, canAct }: { f: VisaFamily; i: number; by: string; canAct: boolean }) {
  const toast = useToast();
  const [numbers, setNumbers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const done = f.members.filter((m) => m.visa).length;

  const add = async (m: Member, idx: number, file?: File) => {
    const number = (numbers[m.id] ?? "").trim() || demoVisaNumber(f.number, idx);
    setBusy(m.id);
    try {
      const up = file ? await uploadMedia(file, by, { documents: true }) : undefined;
      const r = f.add(m, { number, ref: up?.ref, name: file?.name, type: file?.type, at: Date.now(), by });
      toast(r.complete ? { title: "اكتملت تأشيرات العائلة", body: `عائلة ${f.holder}: صدرت خطوة التأشيرة في بوابتها، وفُتحت رحلتها وسكنها.`, tone: "success", icon: "🛂" } : { title: "أُضيفت التأشيرة", body: number, tone: "success", icon: "🛂" });
    } catch (e) {
      toast({ title: "لم تُرفع التأشيرة", body: (e as Error).message, tone: "warning", icon: "⚠️" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.05 }} data-family={f.number}>
      <Card className="md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-xl font-bold text-green-dark">عائلة {f.holder}</p>
            <p className="text-sm text-hint">طلب {f.number} — {f.members.length} أفراد</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={f.complete ? "green" : done ? "gold" : "ink"}>{f.complete ? "اكتملت التأشيرات" : `${done} من ${f.members.length}`}</Badge>
            {!f.complete && canAct && (
              <Button size="sm" variant="outline" onClick={() => f.members.forEach((m, idx) => { if (!m.visa) void add(m, idx); })}>
                <Mail className="size-4" /> محاكاة: وصل بريد الخارجية بتأشيراتهم
              </Button>
            )}
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {f.members.map((m, idx) => (
            <li key={m.id} className={cn("flex flex-wrap items-center gap-3 rounded-2xl border p-3", m.visa ? "border-green-light/40 bg-green-light/5" : "border-gold/30")}>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{m.name}{m.relation && <span className="text-xs font-normal text-hint"> — {m.relation}</span>}</span>
                <span className="block font-mono text-xs text-hint" dir="ltr">{maskNationalId(m.id)}</span>
                {m.passport && !m.visa && <span className="block text-xs text-gold-dark">جوازه: {m.passport} — تُطلب التأشيرة بجوازه</span>}
              </span>
              {m.visa ? (
                <>
                  <span className="flex items-center gap-1.5 text-sm font-bold text-green"><CheckCircle2 className="size-4" /> <span dir="ltr" className="font-mono">{m.visa.number}</span></span>
                  <span className="text-xs text-hint">{m.visa.name ?? "من بريد الخارجية"}</span>
                  {canAct && <button type="button" aria-label={`حذف تأشيرة ${m.name}`} onClick={() => { f.remove(m, by); toast({ title: "حُذفت التأشيرة", body: "أضفها من جديد بالملف الصحيح.", tone: "info" }); }} className="rounded-lg p-1.5 text-maroon hover:bg-maroon/10"><Trash2 className="size-4" /></button>}
                </>
              ) : !canAct ? (
                <span className="text-xs text-hint">لم تصل تأشيرته بعد</span>
              ) : (
                <>
                  <input aria-label={`رقم تأشيرة ${m.name}`} dir="ltr" className="h-10 w-44 rounded-xl border-2 border-gold/40 px-2 font-mono text-sm" placeholder={demoVisaNumber(f.number, idx)} value={numbers[m.id] ?? ""} onChange={(e) => setNumbers({ ...numbers, [m.id]: e.target.value })} />
                  <label className={cn("inline-flex cursor-pointer items-center gap-2 rounded-xl bg-green-dark px-3 py-2 text-sm font-bold text-white hover:bg-green", busy === m.id && "opacity-60")}>
                    <FileUp className="size-4" /> {busy === m.id ? "جارٍ الرفع…" : "رفع التأشيرة"}
                    <input type="file" accept="image/*,application/pdf" hidden aria-label={`ملف تأشيرة ${m.name}`} onChange={(e) => { const file = e.target.files?.[0]; if (file) void add(m, idx, file); e.target.value = ""; }} />
                  </label>
                </>
              )}
            </li>
          ))}
        </ul>
        {f.complete && <p className="mt-3 flex items-center gap-2 text-sm text-green"><Stamp className="size-4" /> صدرت خطوة التأشيرة للعائلة في بوابتها، ووُضعت على رحلتي مجموعتها.</p>}
      </Card>
    </motion.div>
  );
}
