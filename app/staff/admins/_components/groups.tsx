"use client";

import { motion } from "motion/react";
import { AlertTriangle, BadgeCheck, CheckCircle2, ClipboardList, CornerDownLeft, Receipt, Send, UsersRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { useClusters } from "@/lib/cms/content";
import { actions } from "@/lib/store";
import { cn } from "@/lib/utils";
import { adminReceipt } from "@/app/administrator/_lib/admin";
import { patchAdmin } from "../../_components/data";
import { Drawer, Empty, fmtDateTime, Panel, textareaClass, useStaffUser } from "../../_components/kit";
import { Chip, InfoGrid } from "../../_components/ops-ui";
import { RecordHistory, SystemRecords } from "../../_components/system";
import { GROUP_STATE, logAdmins, useAdminsDesk, type AdminsDesk, type GroupRow } from "../desk";

/** The cluster a group is in: one an elected head created on the platform, or one of the season's directory */
function useClusterName(desk: AdminsDesk) {
  const directory = useClusters();
  return (id?: string) => (id ? (desk.clusters.find((x) => x.c.id === id)?.c.name ?? directory.find((c) => c.slug === id)?.name ?? id) : undefined);
}

/**
 * The groups, from the head's request to the approved group in its cluster. A group head forms his group
 * himself — a team invited one by one from those who qualified, and the formation fee — and the request
 * comes here with its conditions checked. The holder decides once: he approves it, or sends it back to
 * its head with what to fix. Approved groups then wait for the election, and join a cluster by request.
 */
export function GroupsTab() {
  const desk = useAdminsDesk();
  const clusterName = useClusterName(desk);
  const [open, setOpen] = useState<number | null>(null);
  const [returning, setReturning] = useState<GroupRow | null>(null);
  const decide = useDecision();
  const sheet = desk.groups.find((x) => x.g.number === open);
  const pending = desk.groups.filter((x) => x.state === "unpaid" || x.state === "returned");

  return (
    <div className="space-y-6">
      <Panel icon={<ClipboardList />} title="طلبات تنتظر قرارك" action={<Chip tone={desk.waiting.length ? "gold" : "green"}>{desk.waiting.length}</Chip>}>
        {desk.waiting.length === 0 ? (
          <Empty icon={<CheckCircle2 />} title="لا طلب ينتظر قرارك" text="يصل الطلب إلى هنا حين يسدد رئيس المجموعة رسم التشكيل، ومعه شروطه محسوبة." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {desk.waiting.map((x, i) => (
              <RequestCard key={x.g.number} x={x} delay={i * 0.05} onApprove={() => decide.approve(x)} onReturn={() => setReturning(x)} onOpen={() => setOpen(x.g.number)} />
            ))}
          </div>
        )}
      </Panel>

      {pending.length > 0 && (
        <Panel icon={<Send />} title="عند رؤسائها" action={<Chip>{pending.length}</Chip>}>
          <ul className="space-y-2">
            {pending.map((x) => (
              <li key={x.g.number}>
                <button type="button" onClick={() => setOpen(x.g.number)} className="flex w-full flex-wrap items-center gap-3 rounded-2xl bg-white/[.06] p-3 text-right ring-1 ring-white/10 transition hover:ring-gold/50">
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-white">
                      المجموعة {x.g.number} — {x.row.name}
                    </span>
                    <span className="block text-xs leading-5 text-white/65">{x.g.returned ? `أعادها ${x.g.returned.by}: ${x.g.returned.note}` : `قُدّم ${fmtDateTime(x.g.requestedAt)} — لم يُسدَّد رسم التشكيل بعد`}</span>
                  </span>
                  <Chip tone={GROUP_STATE[x.state].tone}>{GROUP_STATE[x.state].label}</Chip>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div id="approved" className="scroll-mt-24">
        <Panel
          icon={<BadgeCheck />}
          title="المجموعات المعتمدة"
          action={
            <span className="flex flex-wrap gap-2">
              <Chip tone="green">{desk.approved.length}</Chip>
              {desk.outside.length > 0 && <Chip tone="gold">{desk.outside.length} لم تنضم إلى تكتل</Chip>}
            </span>
          }
          bodyClass="-mx-5 md:-mx-6"
        >
          {desk.approved.length === 0 ? (
            <div className="px-5 md:px-6">
              <Empty icon={<UsersRound />} title="لا مجموعة معتمدة بعد" />
            </div>
          ) : (
            <div className="overflow-x-auto px-5 md:px-6">
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-right text-xs text-gold">
                    {["المجموعة", "رئيسها", "السعة", "الفريق", "التكتل", "اعتمدها"].map((h) => (
                      <th key={h} className="pb-2 font-bold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {desk.approved.map((x) => (
                    <tr key={x.g.number} className="text-white">
                      <td className="py-2.5">
                        <button type="button" onClick={() => setOpen(x.g.number)} className="font-bold text-gold hover:underline">
                          المجموعة {x.g.number}
                        </button>
                      </td>
                      <td className="py-2.5">{x.row.name}</td>
                      <td className="py-2.5 tabular-nums">{x.g.capacity}</td>
                      <td className="py-2.5 tabular-nums">{x.g.team?.length ?? 0}</td>
                      <td className="py-2.5">{clusterName(x.g.clusterId) ?? <span className="font-bold text-gold">لم تنضم بعد</span>}</td>
                      <td className="py-2.5 text-xs text-white/70">
                        {x.g.approvedBy} — {fmtDateTime(x.g.approvedAt!)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 px-5 text-xs leading-6 text-white/55 md:px-6">لا تنضم مجموعة إلى تكتل قبل انتخاب رؤسائها: تطلب الانضمام بعده، ويقرر رئيس التكتل بحسب سعته، ويوقّعان العقد.</p>
        </Panel>
      </div>

      <SystemRecords system="admins" area="groups" title="سجل المجموعات" />

      <Drawer open={!!sheet} onClose={() => setOpen(null)} title={sheet ? `المجموعة ${sheet.g.number}` : ""}>
        {sheet && <GroupSheet x={sheet} clusterName={clusterName(sheet.g.clusterId)} onApprove={() => decide.approve(sheet)} onReturn={() => setReturning(sheet)} />}
      </Drawer>
      <Modal open={!!returning} onClose={() => setReturning(null)} className="max-w-lg border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
        {returning && (
          <ReturnForm
            key={returning.g.number}
            x={returning}
            onClose={() => setReturning(null)}
            onSend={(note) => {
              decide.send(returning, note);
              setReturning(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

/** The holder's one decision on a request: approve it, or send it back to its head with what to fix */
function useDecision() {
  const user = useStaffUser()!;
  const toast = useToast();
  return {
    approve(x: GroupRow) {
      patchAdmin(x.row, { group: { ...x.g, approvedAt: Date.now(), approvedBy: user.name, returned: undefined } }, actions.upsertAdmin);
      logAdmins(user, "groups", { action: "اعتماد مجموعة", target: `المجموعة ${x.g.number}`, after: `رئيسها ${x.row.name}`, detail: `السعة ${x.g.capacity} حاجاً — الفريق: ${(x.g.team ?? []).map((t) => t.name).join("، ") || "—"}`, ref: String(x.g.number) });
      toast({ title: `اعتُمدت المجموعة ${x.g.number}`, body: "يوقّع رئيسها ميثاق الفريق، وتنتظر انتخاب رؤساء التكتلات لتنضم إلى تكتل.", tone: "success", icon: "🏅" });
    },
    send(x: GroupRow, note: string) {
      patchAdmin(x.row, { group: { ...x.g, returned: { at: Date.now(), by: user.name, note } } }, actions.upsertAdmin);
      logAdmins(user, "groups", { action: "إعادة طلب تشكيل مجموعة إلى رئيسه", target: `المجموعة ${x.g.number} — ${x.row.name}`, detail: note, ref: String(x.g.number) });
      toast({ title: `أُعيد طلب المجموعة ${x.g.number}`, body: "تصل الملاحظة إلى رئيسها في بوابته، فيصلح ويعيد الإرسال.", tone: "info", icon: "↩️" });
    },
  };
}

function Checks({ x }: { x: GroupRow }) {
  return (
    <ul className="grid gap-1.5 text-sm">
      {x.checks.map((c) => (
        <li key={c.label} className="flex items-center gap-2">
          {c.ok ? <CheckCircle2 className="size-4 shrink-0 text-green-light" /> : <AlertTriangle className="size-4 shrink-0 text-gold" />}
          <span className={c.ok ? "text-white/90" : "font-bold text-gold"}>{c.label}</span>
        </li>
      ))}
    </ul>
  );
}

function Decision({ x, onApprove, onReturn }: { x: GroupRow; onApprove: () => void; onReturn: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="gold" disabled={!x.complete} onClick={onApprove}>
        <BadgeCheck className="size-4" /> اعتماد المجموعة
      </Button>
      <Button size="sm" variant="glass" onClick={onReturn}>
        <CornerDownLeft className="size-4" /> إعادة إلى رئيسها
      </Button>
      {!x.complete && <span className="text-xs font-bold text-gold">لا تُعتمد قبل اكتمال شروطها: أعدها إلى رئيسها بما ينقصها.</span>}
    </div>
  );
}

function RequestCard({ x, delay, onApprove, onReturn, onOpen }: { x: GroupRow; delay: number; onApprove: () => void; onReturn: () => void; onOpen: () => void }) {
  const team = x.g.team ?? [];
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="space-y-4 rounded-2xl bg-white/[.06] p-4 ring-1 ring-white/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-2xl font-bold text-white">المجموعة {x.g.number}</h3>
          <p className="text-sm text-white/85">
            رئيسها: {x.row.name} · السعة {x.g.capacity} حاجاً
          </p>
        </div>
        <Chip tone={x.complete ? "green" : "gold"}>{x.complete ? "مكتملة الشروط" : "ناقصة"}</Chip>
      </div>
      <Checks x={x} />
      {team.length > 0 && (
        <ul className="grid gap-1.5 text-xs sm:grid-cols-3">
          {team.map((t) => (
            <li key={t.id} className="rounded-xl bg-white/5 px-2.5 py-2 ring-1 ring-white/10">
              <span className="block text-white/60">{t.role}</span>
              <span className="block truncate font-bold text-white">{t.name}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/70">
        <span>قُدّم {fmtDateTime(x.g.requestedAt)}</span>
        {x.g.feePaidAt && (
          <span className="flex items-center gap-1">
            <Receipt className="size-3" /> {adminReceipt(x.row.id, "G", x.g.number)}
          </span>
        )}
        <button type="button" onClick={onOpen} className="font-bold text-gold hover:underline">
          ورقتها وسجلّها
        </button>
      </p>
      <Decision x={x} onApprove={onApprove} onReturn={onReturn} />
    </motion.div>
  );
}

/** One group whole: its request, its conditions, its team, the decision on it and its history */
function GroupSheet({ x, clusterName, onApprove, onReturn }: { x: GroupRow; clusterName?: string; onApprove: () => void; onReturn: () => void }) {
  const g = x.g;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={GROUP_STATE[x.state].tone}>{GROUP_STATE[x.state].label}</Chip>
        {clusterName && <Chip tone="green">{clusterName}</Chip>}
      </div>
      <InfoGrid
        rows={[
          ["رئيسها", x.row.name],
          ["السعة", `${g.capacity} حاجاً`],
          ["قُدّم الطلب", fmtDateTime(g.requestedAt)],
          ["رسم التشكيل", g.feePaidAt ? `${fmtDateTime(g.feePaidAt)} — ${adminReceipt(x.row.id, "G", g.number)}` : "لم يُسدَّد"],
          ["الاعتماد", g.approvedAt ? `${g.approvedBy} — ${fmtDateTime(g.approvedAt)}` : ""],
          ["ميثاق الفريق", g.contractSignedAt ? fmtDateTime(g.contractSignedAt) : ""],
        ]}
      />
      <Checks x={x} />
      {(g.team ?? []).length > 0 && (
        <ul className="space-y-1.5 text-sm">
          {g.team!.map((t) => (
            <li key={t.id} className="flex justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
              <span className="text-white/65">{t.role}</span>
              <span className="font-bold text-white">{t.name}</span>
            </li>
          ))}
        </ul>
      )}
      {g.returned && (
        <p className="rounded-2xl bg-maroon/25 p-3 text-sm leading-7 text-white ring-1 ring-maroon/50">
          أعادها {g.returned.by} — {fmtDateTime(g.returned.at)}: {g.returned.note}
        </p>
      )}
      {x.state === "waiting" && <Decision x={x} onApprove={onApprove} onReturn={onReturn} />}
      <RecordHistory system="admins" refId={String(g.number)} />
    </div>
  );
}

/** What the head has to fix, in words he can act on: it reaches him in his portal */
function ReturnForm({ x, onClose, onSend }: { x: GroupRow; onClose: () => void; onSend: (note: string) => void }) {
  const missing = x.checks.filter((c) => !c.ok).map((c) => c.label);
  const [note, setNote] = useState(missing.length ? `ينقص الطلب: ${missing.join("، ")}.` : "");
  return (
    <div>
      <p className="text-xs font-bold text-gold">إعادة الطلب إلى رئيسه</p>
      <h3 className="mt-1 font-display text-xl font-bold">
        المجموعة {x.g.number} — {x.row.name}
      </h3>
      <p className="mt-1 text-sm leading-7 text-white/70">يرى ملاحظتك في بوابته، فيصلح الطلب ويعيد إرساله، ويعود إليك. لا يُعاد إليه الرسم المسدَّد.</p>
      <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} className={cn(textareaClass, "mt-4")} placeholder="ما الذي يصلحه؟" aria-label="ملاحظة الإعادة" />
      <div className="mt-4 flex gap-2">
        <Button variant="gold" disabled={note.trim().length < 5} onClick={() => onSend(note.trim())}>
          <CornerDownLeft className="size-4" /> إعادة مع الملاحظة
        </Button>
        <Button variant="glass" onClick={onClose}>
          إلغاء
        </Button>
      </div>
    </div>
  );
}
