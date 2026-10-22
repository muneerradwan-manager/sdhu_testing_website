"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { HeartPulse } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { groupName } from "@/lib/groups";
import { medicalDocsFor, medicalKey } from "@/lib/registration/post";
import { fullName } from "@/lib/registry";
import { actions, useStore, type Application, type PostAcceptance } from "@/lib/store";
import { cn } from "@/lib/utils";
import { KIND_LABELS } from "@/lib/data/staff-seed";
import { useTicketQueue, type QueueTicket } from "../_components/data";
import { can, Drawer, Gate, PageHeader, logAs, textareaClass, useNow, useStaffUser } from "../_components/kit";
import { EmptyRow, ListTable, RowActions, RowLink, Tag } from "../_components/wp";
import { Segments } from "../exam/_components/ui";
import { SEVERITY, STATUS_LABEL, type TicketSystem } from "../operations/shared";
import { TicketDetail } from "../operations/view";
import { viewKeys } from "@/lib/permissions";

type View = "docs" | "files" | "reports";

/** A medical document a pilgrim uploaded, waiting for the team */
type DocRow = { owner: string; app: Application; post: PostAcceptance; memberId: string; name: string; key: string; label: string };

/**
 * «الفريق الطبي»: the medical team's work. The medical documents pilgrims upload after joining a group, to
 * approve or send back with a reason; the health files the groups' coordinators record (who has a condition,
 * a need, a permanent medication); and the health reports from the field. Each part shows to whoever may view it
 * (`medical.documents.GET`, `.health-files.GET`, `.tickets.GET`), and each decision needs its own permission.
 */
export function MedicalView() {
  return (
    <Gate perms={viewKeys("medical")}>
      <Medical />
    </Gate>
  );
}

const VIEW_RESOURCE: Record<View, string> = { docs: "documents", files: "health-files", reports: "tickets" };

function Medical() {
  const params = useSearchParams();
  const router = useRouter();
  const user = useStaffUser()!;
  const allowed = (["docs", "files", "reports"] as const).filter((v) => can(user, `medical.${VIEW_RESOURCE[v]}.GET`));
  const asked = (params.get("view") as View) ?? "docs";
  const view = allowed.includes(asked) ? asked : allowed[0];
  const applications = useStore((s) => s.applications);
  const post = useStore((s) => s.post);
  const tickets = useTicketQueue();

  const docs = useMemo(() => {
    const out: DocRow[] = [];
    for (const app of Object.values(applications)) {
      const p = post[app.applicantId];
      if (!p?.medical) continue;
      for (const m of app.members) {
        for (const d of medicalDocsFor(m, p.health)) {
          const key = medicalKey(m, d);
          if (p.medical[key] === "uploaded") out.push({ owner: app.applicantId, app, post: p, memberId: m.person.id, name: fullName(m.person), key, label: d.label });
        }
      }
    }
    return out;
  }, [applications, post]);

  const files = useMemo(
    () =>
      Object.values(applications).flatMap((app) => {
        const h = post[app.applicantId]?.health;
        if (!h) return [];
        return app.members.flatMap((m) => {
          const rec = h.members[m.person.id];
          if (!rec || (!rec.conditions.length && !rec.needs.length && !rec.medications.trim())) return [];
          return [{ app, name: fullName(m.person), rec, group: post[app.applicantId]?.groupNumber, by: h.by.name, confirmed: !!h.confirmedAt }];
        });
      }),
    [applications, post],
  );

  const reports = tickets.filter((t) => t.kind === "health");
  const open = reports.filter((t) => t.status !== "resolved").length;

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="الفريق الطبي" title="الفريق الطبي" icon={<HeartPulse />} description="وثائق الحجاج الطبية للمراجعة، والحالات الصحية التي سجّلها المنسقون، والبلاغات الصحية من الميدان." />
      <Segments
        value={view}
        onChange={(v) => router.replace(v === "docs" ? "/staff/medical" : `/staff/medical?view=${v}`)}
        label="القسم"
        items={[
          { value: "docs" as const, label: "وثائق تنتظر المراجعة", count: docs.length, tone: "maroon" as const },
          { value: "files" as const, label: "الحالات الصحية", count: files.length },
          { value: "reports" as const, label: "البلاغات الصحية", count: open, tone: "maroon" as const },
        ].filter((x) => allowed.includes(x.value))}
      />
      {view === "docs" && <Docs rows={docs} />}
      {view === "files" && (
        <ListTable head={["الحاج", "المجموعة", "الحالات", "الاحتياجات", "أدوية دائمة", "الملف"]}>
          {files.length === 0 && <EmptyRow cols={6}>لم يسجّل المنسقون ملفات صحية فيها حالات بعد.</EmptyRow>}
          {files.map((f, i) => (
            <tr key={i} className="align-top">
              <td className="p-3 font-bold">
                {f.name}
                <span className="block text-xs font-normal text-white/55">طلب {f.app.number}</span>
              </td>
              <td className="p-3 text-white/80">{f.group ? groupName(f.group) : "—"}</td>
              <td className="p-3">{f.rec.conditions.join("، ") || "—"}</td>
              <td className="p-3">{f.rec.needs.length ? f.rec.needs.map((n) => <Tag key={n} tone="gold">{n}</Tag>) : "—"}</td>
              <td className="p-3 text-white/80">{f.rec.medications || "—"}</td>
              <td className="p-3 text-xs text-white/60">
                {f.by.replace(" (محاكاة)", "")}
                <span className="block">{f.confirmed ? "أكّده الحاج" : "لم يؤكده الحاج بعد"}</span>
              </td>
            </tr>
          ))}
        </ListTable>
      )}
      {view === "reports" && <Reports tickets={reports} empty="لا بلاغات صحية." system="medical" />}
    </div>
  );
}

/** Documents to approve one by one, or send back with what is wrong */
function Docs({ rows }: { rows: DocRow[] }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const [returning, setReturning] = useState<DocRow | null>(null);
  const [reason, setReason] = useState("");
  const mayApprove = can(user, "medical.documents.approve");
  const mayReturn = can(user, "medical.documents.return");

  const decide = (r: DocRow, status: "approved" | "rejected", why?: string) => {
    if (!(status === "approved" ? mayApprove : mayReturn)) return;
    actions.setPost(r.owner, {
      medical: { ...r.post.medical, [r.key]: status },
      ...(status === "rejected" ? { medicalNotes: { ...r.post.medicalNotes, [r.key]: why ?? "" } } : {}),
    });
    logAs(user, { action: status === "approved" ? "اعتماد وثيقة طبية" : "إعادة وثيقة طبية", target: `طلب ${r.app.number} — ${r.name}`, detail: why ? `${r.label}: ${why}` : r.label });
    toast(status === "approved" ? { title: "اعتُمدت الوثيقة", body: `${r.label} — ${r.name}`, icon: "✅", tone: "success" } : { title: "أُعيدت الوثيقة إلى الحاج", body: why, icon: "↩️", tone: "info" });
  };

  return (
    <>
      <ListTable head={["الوثيقة", "الحاج", "الطلب"]}>
        {rows.length === 0 && <EmptyRow cols={3}>لا وثائق تنتظر المراجعة. تظهر هنا حين يرفعها الحجاج بعد انضمامهم إلى مجموعة.</EmptyRow>}
        {rows.map((r) => (
          <tr key={`${r.owner}-${r.key}`} className="align-top">
            <td className="p-3">
              <p className="font-bold">{r.label}</p>
              <RowActions>
                {mayApprove && <RowLink onClick={() => decide(r, "approved")}>اعتماد</RowLink>}
                {mayReturn && (
                  <RowLink
                    danger
                    onClick={() => {
                      setReason("");
                      setReturning(r);
                    }}
                  >
                    إعادة بسبب
                  </RowLink>
                )}
              </RowActions>
            </td>
            <td className="p-3">{r.name}</td>
            <td className="p-3 text-white/70">{r.app.number}</td>
          </tr>
        ))}
      </ListTable>
      <p className="text-xs text-white/50">في العرض التجريبي تُعتمد الوثائق تلقائياً بعد ثوانٍ إن لم يراجعها أحد وبقي الحاج على صفحة ملفه الطبي (محاكاة).</p>
      <Modal open={!!returning} onClose={() => setReturning(null)} className="max-w-md border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
        {returning && (
          <div>
            <p className="font-display text-xl font-bold">إعادة «{returning.label}»</p>
            <p className="mt-1 text-sm text-white/70">{returning.name} — يصله السبب ويرفعها من جديد.</p>
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className={cn(textareaClass, "mt-3")} placeholder="مثال: الشهادة منتهية، أو الصورة غير واضحة" aria-label="السبب" />
            <div className="mt-4 flex gap-2">
              <Button
                variant="maroon"
                disabled={reason.trim().length < 3}
                onClick={() => {
                  decide(returning, "rejected", reason.trim());
                  setReturning(null);
                }}
              >
                إعادة
              </Button>
              <Button variant="glass" onClick={() => setReturning(null)}>
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

/** Field reports of one kind, each opening in the operations room's own sheet, with the acts of `system` */
export function Reports({ tickets, empty, system }: { tickets: QueueTicket[]; empty: string; system: TicketSystem }) {
  const now = useNow(30_000);
  const [id, setId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const shown = tickets.filter((t) => filter === "all" || t.status !== "resolved");
  const t = tickets.find((x) => x.id === id);
  return (
    <>
      <Segments
        value={filter}
        onChange={setFilter}
        label="الحالة"
        items={[
          { value: "open", label: "المفتوحة", count: tickets.filter((x) => x.status !== "resolved").length },
          { value: "all", label: "الكل", count: tickets.length },
        ]}
      />
      <ListTable head={["البلاغ", "المكان", "الأهمية", "الحالة"]}>
        {shown.length === 0 && <EmptyRow cols={4}>{empty}</EmptyRow>}
        {shown.map((x) => (
          <tr key={x.id} className="align-top">
            <td className="p-3">
              <button type="button" onClick={() => setId(x.id)} className="text-right font-bold hover:text-gold">
                {x.name}
              </button>
              <p className="text-xs text-white/60">{x.text}</p>
              <RowActions>
                <RowLink onClick={() => setId(x.id)}>فتح</RowLink>
              </RowActions>
            </td>
            <td className="p-3 text-white/80">{x.location}</td>
            <td className="p-3">
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", SEVERITY[x.severity].chip)}>{SEVERITY[x.severity].label}</span>
            </td>
            <td className="p-3">
              <Tag tone={x.status === "resolved" ? "green" : x.status === "open" ? "maroon" : "gold"}>{STATUS_LABEL[x.status]}</Tag>
            </td>
          </tr>
        ))}
      </ListTable>
      <Drawer open={!!t} onClose={() => setId(null)} title={t ? `بلاغ ${t.id} — ${KIND_LABELS[t.kind]}` : ""}>
        {t && <TicketDetail t={t} now={now} system={system} />}
      </Drawer>
    </>
  );
}
