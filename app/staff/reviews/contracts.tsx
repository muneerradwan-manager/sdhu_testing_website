"use client";

import { ArrowLeftRight, Check, FileSignature, Inbox, Search, Undo2, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { DemoJump } from "@/components/app/operation-closed";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { attachByStaff, decideContract, groupInfo } from "@/lib/assignment";
import { useClusters } from "@/lib/cms/content";
import { groupName } from "@/lib/groups";
import { outcomeOf } from "@/lib/journey";
import { usePublishedDraw } from "@/lib/lottery";
import { rangeLabel, useOperation } from "@/lib/operations";
import { ageOf, fullName } from "@/lib/registry";
import { useSeason } from "@/lib/season-live";
import { useStore } from "@/lib/store";
import { cn, digitsOnly, nowMs } from "@/lib/utils";
import { Empty, fmtDateTime, Panel, smallInputClass, useStaffUser } from "../_components/kit";
import { Chip } from "../_components/ops-ui";

const REASONS = ["توقيع الحاج غير ظاهر في العقد", "اسم المجموعة غير مطابق", "العقد لا يشمل كل أفراد الطلب", "الملف غير مقروء"];

/**
 * Attaching the accepted pilgrims to the groups: the office's work, not the administrators'. The family agrees
 * with a group and signs its contract with it at the office; the staff member finds its application, picks the
 * group, uploads the signed contract and attaches it — the whole application at once, never past the group's
 * capacity. The group's head and its coordinator then see the family in their group. A contract a group
 * uploaded before is still decided here.
 */
export function ContractsPanel() {
  const user = useStaffUser()!;
  const toast = useToast();
  const post = useStore((s) => s.post);
  const applications = useStore((s) => s.applications);
  const clusters = useClusters();
  const draw = usePublishedDraw();
  const { acceptedDirectAge } = useSeason();
  const joining = useOperation("group-joining");
  const [q, setQ] = useState("");
  const [found, setFound] = useState<string | null>(null);
  const [target, setTarget] = useState("");
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [error, setError] = useState("");
  const [returning, setReturning] = useState<string | null>(null);
  const [reason, setReason] = useState(REASONS[0]);

  const isAccepted = (sid: string) => outcomeOf(applications[sid], draw, acceptedDirectAge).accepted;
  /** Every group of the season's clusters, with the seats its pilgrims already take */
  const groups = useMemo(() => {
    const attached = (no: number) => Object.entries(post).filter(([sid, p]) => p.groupNumber === no && p.groupApprovedAt && applications[sid]).reduce((n, [sid]) => n + applications[sid].members.length, 0);
    return clusters.flatMap((c) => c.groups.map((g) => ({ key: `${c.slug}:${g.no}`, clusterId: c.slug, clusterName: c.name, number: g.no, leader: g.leader, capacity: g.capacity, taken: g.capacity - g.remaining + attached(g.no) })));
  }, [clusters, post, applications]);
  const rows = Object.entries(post)
    .filter(([sid, p]) => p.contract && applications[sid])
    .sort(([, a], [, b]) => Number(b.contract!.status === "pending") - Number(a.contract!.status === "pending") || (b.contract!.decidedAt ?? b.contract!.uploadedAt) - (a.contract!.decidedAt ?? a.contract!.uploadedAt));
  const pending = rows.filter(([, p]) => p.contract!.status === "pending");
  const ready = Object.keys(applications).filter((sid) => isAccepted(sid) && !post[sid]?.groupApprovedAt).slice(0, 6);
  const app = found ? applications[found] : null;
  const current = found ? post[found] : undefined;
  const group = groups.find((g) => g.key === target);

  const search = () => {
    setError("");
    setFile(null);
    const hit = Object.entries(applications).find(([sid, a]) => sid === q.trim() || a.number === q.trim() || a.members.some((m) => m.person.id === q.trim()));
    if (!hit) return setError("لا يوجد طلب بهذا الرقم.");
    if (!isAccepted(hit[0])) return setError("الطلب لم يُقبل بعد: الإلحاق بالمجموعات للحجاج المقبولين وحدهم.");
    setFound(hit[0]);
  };

  const attach = () => {
    if (!app || !found || !group || !file) return;
    if (current?.groupApprovedAt && current.groupNumber === group.number) return setError(`الطلب في ${groupName(group.number)} بالفعل.`);
    if (group.taken + app.members.length > group.capacity) return setError(`لا تتسع ${groupName(group.number)}: ${group.taken} + ${app.members.length} > ${group.capacity}. الطلب العائلي يُلحق كاملاً أو لا يُلحق.`);
    attachByStaff({ sessionId: found, app, post: current, group: { clusterId: group.clusterId, number: group.number }, staff: { id: user.id, name: user.name, role: user.title }, file, at: nowMs() });
    toast({ title: `أُلحق الطلب ${app.number} ب${groupName(group.number)}`, body: `${app.members.length} أفراد معاً في ${group.clusterName}. يراه رئيس المجموعة ومنسقها في حجاجها، ويرى الحاج مجموعته وعقده.`, icon: "✅", tone: "success" });
    setFound(null);
    setQ("");
    setTarget("");
    setFile(null);
  };

  const decide = (sid: string, status: "approved" | "returned", why?: string) => {
    const a = applications[sid];
    decideContract({ sessionId: sid, app: a, post: post[sid], status, by: { name: user.name, role: user.title }, at: nowMs(), reason: why });
    toast(status === "approved" ? { title: `اعتُمد عقد الطلب ${a.number}`, body: "الطلب كله الآن في المجموعة، ويرى الحاج مجموعته وعقده.", icon: "✅", tone: "success" } : { title: `أُعيد عقد الطلب ${a.number}`, body: `يصل السبب إلى من رفعه: ${why}`, icon: "↩️", tone: "info" });
    setReturning(null);
  };

  return (
    <Panel icon={<FileSignature />} title="إلحاق الحجاج بالمجموعات" action={<Chip tone={joining.open ? "green" : "gold"}>{joining.open ? `مفتوح حتى ${rangeLabel(undefined, joining.end).replace("حتى ", "")}` : `مدته ${rangeLabel(joining.start, joining.end)}`}</Chip>} className="mb-6">
      <p className="mb-4 text-sm leading-7 text-white/70">
        الإلحاق بمجموعة عملية مستقلة عن التسجيل على الحج، ويجريها المكتب وحده: يتفق الحاج مع مجموعة، ويوقّع عقده معها هنا، فتلحقه بها وترفع العقد الموقّع. الطلب العائلي يُلحق كاملاً، ولا تتجاوز المجموعة عدد حجاجها. رئيس المجموعة ومنسقها يرون حجاجها بعد إلحاقهم، ولا يلحقون أحداً.
      </p>

      {!joining.open ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/[.06] p-4 text-sm text-white/80 ring-1 ring-white/10">
          <span>الإلحاق بالمجموعات في مدته فقط: {rangeLabel(joining.start, joining.end)}.</span>
          <DemoJump state={joining} />
        </div>
      ) : (
        <div className="rounded-2xl bg-white/[.06] p-4 ring-1 ring-white/10">
          <p className="flex items-center gap-2 font-bold text-white">
            <UserPlus className="size-5 text-gold" /> إلحاق طلب بمجموعة
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={q}
              onChange={(e) => setQ(digitsOnly(e.target.value).slice(0, 11))}
              onKeyDown={(e) => e.key === "Enter" && search()}
              inputMode="numeric"
              dir="ltr"
              placeholder="الرقم الوطني أو رقم الطلب"
              className={cn(smallInputClass, "min-w-56 flex-1 text-center font-mono")}
              aria-label="الرقم الوطني أو رقم الطلب"
            />
            <Button size="sm" variant="gold" onClick={search} disabled={!q}>
              <Search className="size-4" /> بحث
            </Button>
          </div>
          {ready.length > 0 && !app && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-white/60">مقبولون بلا مجموعة:</span>
              {ready.map((sid) => {
                const a = applications[sid];
                return (
                  <button key={sid} type="button" onClick={() => setQ(a.number)} className="rounded-full bg-white/10 px-3 py-1 font-semibold text-white hover:bg-gold/30">
                    {a.members.find((m) => m.relation === "self")?.person.firstName ?? a.number} — {a.number}
                  </button>
                );
              })}
            </div>
          )}
          {error && <p className="mt-3 rounded-xl bg-maroon/30 p-3 text-sm font-bold text-white ring-1 ring-maroon/60">{error}</p>}

          {app && found && (
            <div className="mt-4 space-y-3 rounded-2xl bg-white/[.05] p-4 ring-1 ring-gold/30">
              <p className="font-bold text-white">
                الطلب {app.number} — {app.members.length} أفراد — {app.office}
              </p>
              <ul className="flex flex-wrap gap-2 text-sm">
                {app.members.map((m) => (
                  <li key={m.person.id} className="rounded-full bg-white/10 px-3 py-1 text-white/90">
                    {fullName(m.person)} ({ageOf(m.person)})
                  </li>
                ))}
              </ul>
              {current?.groupApprovedAt && (
                <p className="flex items-start gap-2 rounded-xl bg-gold/15 p-3 text-sm font-semibold text-gold ring-1 ring-gold/40">
                  <ArrowLeftRight className="mt-0.5 size-4 shrink-0" /> الطلب الآن في {groupName(current.groupNumber!)}. بإلحاقه بمجموعة أخرى ينتقل أفراده كلهم ({app.members.length}) معاً.
                </p>
              )}
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-white/80">المجموعة التي اتفق معها</span>
                <select value={target} onChange={(e) => { setTarget(e.target.value); setError(""); }} className={cn(smallInputClass, "[&_option]:text-ink")} aria-label="المجموعة">
                  <option value="">اختر المجموعة...</option>
                  {clusters.map((c) => (
                    <optgroup key={c.slug} label={c.name}>
                      {groups
                        .filter((g) => g.clusterId === c.slug)
                        .map((g) => (
                          <option key={g.key} value={g.key} disabled={g.taken + app.members.length > g.capacity}>
                            {groupName(g.number)} — {g.leader} — {g.taken} من {g.capacity}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <div>
                <p className="mb-1 text-xs font-bold text-white/80">العقد الموقّع بين الحاج والمجموعة</p>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-dashed border-gold/60 px-4 py-2 text-sm font-bold text-gold hover:bg-white/5">
                    <FileSignature className="size-4" /> {file ? file.name : "اختر ملف العقد (PDF أو صورة)"}
                    <input type="file" accept=".pdf,image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && setFile({ name: e.target.files[0].name, size: e.target.files[0].size })} />
                  </label>
                  {!file && group && (
                    <button type="button" onClick={() => setFile({ name: `عقد-${app.number}-${groupName(group.number).replaceAll(" ", "-")}.pdf`, size: 248_000 })} className="text-sm text-white/60 underline">
                      ملف تجريبي
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="gold" onClick={attach} disabled={!group || !file}>
                  <Check className="size-4" /> {group ? `إلحاق الطلب ب${groupName(group.number)}` : "اختر المجموعة"}
                </Button>
                <Button size="sm" variant="glass" onClick={() => setFound(null)}>
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="mt-5 mb-2 flex items-center justify-between gap-2 text-sm font-bold text-white">
        الطلبات الملحقة وعقودها {pending.length > 0 && <Chip tone="gold">{pending.length} عقد رفعته مجموعة بانتظار قرارك</Chip>}
      </p>
      {rows.length === 0 ? (
        <Empty icon={<Inbox />} title="لم يُلحق أحد بعد" text="يظهر هنا كل طلب تلحقه بمجموعة، مع عقده ومن ألحقه." />
      ) : (
        <ul className="space-y-2">
          {rows.map(([sid, p]) => {
            const c = p.contract!;
            const a = applications[sid];
            const applicant = a.members.find((m) => m.relation === "self")?.person;
            const info = groupInfo(c.clusterId, c.groupNumber);
            const byOffice = c.status === "approved" && c.decidedBy === c.uploadedBy.name;
            return (
              <li key={sid} className={cn("rounded-2xl p-3.5 ring-1", c.status === "pending" ? "bg-gold/10 ring-gold/40" : "bg-white/[.05] ring-white/10")}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-white">
                      الطلب {a.number} — {applicant ? fullName(applicant) : sid} — {a.members.length} أفراد
                    </p>
                    <p className="text-xs leading-5 text-white/65">
                      {groupName(c.groupNumber)} في {info.clusterName}
                      {c.transferFrom ? ` — انتقال من ${groupName(c.transferFrom)}` : ""} — «{c.file.name}» — {byOffice ? `ألحقه ${c.decidedBy} ${fmtDateTime(c.decidedAt ?? c.uploadedAt)}` : `رفعه ${c.uploadedBy.name} (${c.uploadedBy.role}) ${fmtDateTime(c.uploadedAt)}`}
                    </p>
                    {c.status === "returned" && <p className="text-xs font-bold text-gold">أُعيد: {c.reason}</p>}
                  </div>
                  {c.status === "pending" ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="gold" onClick={() => decide(sid, "approved")}>
                        <Check className="size-4" /> اعتماد
                      </Button>
                      <Button size="sm" variant="outline" className="border-white/25 text-white hover:bg-white/10" onClick={() => setReturning(sid)}>
                        <Undo2 className="size-4" /> إعادة
                      </Button>
                    </div>
                  ) : (
                    <Chip tone={c.status === "approved" ? "green" : "maroon"}>{c.status === "approved" ? (byOffice ? "ملحق" : `اعتمده ${c.decidedBy}`) : `أعاده ${c.decidedBy}`}</Chip>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Modal open={!!returning} onClose={() => setReturning(null)}>
        {returning && (
          <div className="text-ink">
            <h3 className="font-display text-2xl font-bold text-green-dark">إعادة العقد إلى من رفعه</h3>
            <div className="mt-4 space-y-2">
              {REASONS.map((x) => (
                <label key={x} className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 text-sm font-semibold", reason === x ? "border-maroon bg-maroon/5" : "border-gold/40")}>
                  <input type="radio" name="contract-why" checked={reason === x} onChange={() => setReason(x)} className="accent-maroon" /> {x}
                </label>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setReturning(null)}>
                إلغاء
              </Button>
              <Button variant="maroon" onClick={() => decide(returning, "returned", reason)}>
                تأكيد الإعادة
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Panel>
  );
}
