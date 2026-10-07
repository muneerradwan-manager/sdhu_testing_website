"use client";

import { Check, FileSignature, Inbox, Undo2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { decideContract, groupInfo } from "@/lib/assignment";
import { groupName } from "@/lib/groups";
import { fullName } from "@/lib/registry";
import { useStore } from "@/lib/store";
import { cn, nowMs } from "@/lib/utils";
import { Empty, fmtDateTime, Panel, useStaffUser } from "../_components/kit";
import { Chip } from "../_components/ops-ui";

const REASONS = ["توقيع الحاج غير ظاهر في العقد", "اسم المجموعة غير مطابق", "العقد لا يشمل كل أفراد الطلب", "الملف غير مقروء"];

/**
 * The pilgrim–group contracts the groups uploaded: a pilgrim is in a group only once the office approves
 * his. Approving puts the whole application in the group, and the pilgrim then sees his group and his
 * contract; returning tells the uploader what to fix.
 */
export function ContractsPanel() {
  const user = useStaffUser()!;
  const toast = useToast();
  const post = useStore((s) => s.post);
  const applications = useStore((s) => s.applications);
  const [returning, setReturning] = useState<string | null>(null);
  const [reason, setReason] = useState(REASONS[0]);
  const rows = Object.entries(post)
    .filter(([sid, p]) => p.contract && applications[sid])
    .sort(([, a], [, b]) => Number(b.contract!.status === "pending") - Number(a.contract!.status === "pending") || b.contract!.uploadedAt - a.contract!.uploadedAt);
  const pending = rows.filter(([, p]) => p.contract!.status === "pending");

  const decide = (sid: string, status: "approved" | "returned", why?: string) => {
    const app = applications[sid];
    decideContract({ sessionId: sid, app, post: post[sid], status, by: { name: user.name, role: user.title }, at: nowMs(), reason: why });
    toast(status === "approved" ? { title: `اعتُمد عقد الطلب ${app.number}`, body: "الطلب كله الآن في المجموعة، ويرى الحاج مجموعته وعقده.", icon: "✅", tone: "success" } : { title: `أُعيد عقد الطلب ${app.number}`, body: `يصل السبب إلى من رفعه: ${why}`, icon: "↩️", tone: "info" });
    setReturning(null);
  };

  return (
    <Panel icon={<FileSignature />} title="عقود الحجاج مع المجموعات" action={<Chip tone={pending.length ? "gold" : "green"}>{pending.length} بانتظار الاعتماد</Chip>} className="mb-6">
      <p className="mb-4 text-sm leading-7 text-white/70">
        الإلحاق بمجموعة عملية مستقلة عن التسجيل على الحج: لا يختار الحاج المجموعة من المنصة، بل يتفق معها، فيرفع رئيسها أو منسقها أو معاونها العقد الموقّع. لا يصير الحاج في المجموعة قبل اعتمادك.
      </p>
      {rows.length === 0 ? (
        <Empty icon={<Inbox />} title="لا عقود مرفوعة بعد" text="ترفعها المجموعات من «حجاج المجموعة» في بوابة الإداريين، في مدة الإلحاق بالمجموعات." />
      ) : (
        <ul className="space-y-2">
          {rows.map(([sid, p]) => {
            const c = p.contract!;
            const app = applications[sid];
            const applicant = app.members.find((m) => m.relation === "self")?.person;
            const info = groupInfo(c.clusterId, c.groupNumber);
            return (
              <li key={sid} className={cn("rounded-2xl p-3.5 ring-1", c.status === "pending" ? "bg-gold/10 ring-gold/40" : "bg-white/[.05] ring-white/10")}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-white">
                      الطلب {app.number} — {applicant ? fullName(applicant) : sid} — {app.members.length} أفراد
                    </p>
                    <p className="text-xs leading-5 text-white/65">
                      إلى {groupName(c.groupNumber)} في {info.clusterName}
                      {c.transferFrom ? ` — انتقال من ${groupName(c.transferFrom)}` : ""} — رفعه {c.uploadedBy.name} ({c.uploadedBy.role}) {fmtDateTime(c.uploadedAt)} — «{c.file.name}»
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
                    <Chip tone={c.status === "approved" ? "green" : "maroon"}>{c.status === "approved" ? `اعتمده ${c.decidedBy}` : `أعاده ${c.decidedBy}`}</Chip>
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
