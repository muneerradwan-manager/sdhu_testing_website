"use client";

import { groupName } from "@/lib/groups";
import { useStore } from "@/lib/store";
import { useAdmin } from "@/app/administrator/_lib/admin";
import { headRecordOf } from "@/app/administrator/_lib/cluster";
import { cadreOf } from "@/app/administrator/_lib/formation";
import { myGroupNumbers } from "@/app/administrator/_lib/directory";
import { ContractView, seedContract } from "@/app/administrator/_components/contract-view";
import { AdminShell, LockedCard } from "@/app/administrator/_components/ui";

/**
 * «العقود»: the paper contracts he signed at the office, each a card that opens the contract itself. A group's
 * contract only for the people in that group (its head and its team, who signed it when the office formed it); the
 * cluster's for everyone in the cluster (all of them signed it when it was formed) — as the employee uploaded them.
 */
export function MyContracts() {
  const admin = useAdmin()!;
  const admins = useStore((s) => s.admins);
  const overrides = useStore((s) => s.formation.overrides);
  const p = admin.profile;
  const groups = myGroupNumbers(admin.id, p, admins);
  const record = headRecordOf(p, admins, overrides);
  const owner = (n: number) => Object.values(admins).find((a) => a.group?.number === n)?.group ?? (p?.group?.number === n ? p.group : undefined);
  // a group formed at the office before the demo began carries the contract uploaded then
  const groupContract = (n: number) => owner(n)?.contract ?? seedContract("group", `عقد ${groupName(n)}`);
  const clusterContract = record ? (record.cluster.contract ?? (record.cluster.status === "approved" ? seedContract("cluster", `عقد ${record.cluster.name}`) : undefined)) : undefined;
  if (!groups.length && !record) {
    return (
      <AdminShell title="العقود" subtitle="عقود مجموعتك وتكتلك كما وُقّعت في المكتب.">
        <LockedCard title="لا عقود بعد" text="يوقّع رئيس المجموعة وفريقها عقد المجموعة حين يشكّلها المكتب، ويوقّع كل من في التكتل عقده حين يُشكَّل. يرفع الموظف صورة كل عقد فتظهر هنا." href="/portal" cta="ملفي" />
      </AdminShell>
    );
  }
  return (
    <AdminShell title="العقود" subtitle="عقود مجموعتك وتكتلك كما وُقّعت ورقياً في المكتب ورفعها الموظف. اضغط العقد لفتحه.">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((n) => (
          <ContractView
            key={n}
            kind="group"
            title={`عقد ${groupName(n)}`}
            contract={groupContract(n)}
            signers="رئيس المجموعة وفريقها"
            empty="لم يُرفع عقد المجموعة بعد. يوقّعه رئيسها وفريقها في المكتب حين تُشكَّل، ويرفعه الموظف."
          />
        ))}
        {record && (
          <ContractView
            kind="cluster"
            title={`عقد ${record.cluster.name}`}
            contract={clusterContract}
            signers={`رئيس التكتل وكل من فيه (${cadreOf(record.headId, record.cluster).length} شخصاً)`}
            empty="لم يُرفع عقد التكتل بعد. يوقّعه في المكتب رئيس التكتل وكل من فيه، ويرفعه الموظف."
          />
        )}
      </div>
      <p className="mt-6 text-sm leading-7 text-ink-soft">عقد المجموعة يراه من فيها وحدهم: رئيسها ومعاونه وموجّهها. وعقد التكتل يراه كل من في التكتل.</p>
    </AdminShell>
  );
}
