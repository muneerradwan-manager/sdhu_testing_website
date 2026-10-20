"use client";

import { Card } from "@/components/portal/shell";
import { useAdmin } from "@/app/administrator/_lib/admin";
import { pageWriterOf } from "@/app/administrator/_lib/directory";
import { AdminShell } from "@/app/administrator/_components/ui";
import { ClusterPublicProfile } from "../cluster/public-profile";

/**
 * «صفحة التكتل العامة»: what the cluster's team writes for the pilgrims — its introduction, its housing in Makkah
 * and Madinah with the private rooms' prices, its transport, meals and programmes — once the cluster is approved.
 * Its head, its assistants, coordinators, group heads and their assistants all write it from here.
 */
export function ClusterPageDesk() {
  const admin = useAdmin()!;
  const writer = pageWriterOf(admin.profile);
  if (!writer) {
    return (
      <AdminShell title="صفحة التكتل العامة" subtitle="يكتبها فريق التكتل بعد تشكيله: رئيسه ومعاونوه ومنسقوه ورؤساء مجموعاته ومعاونوها.">
        <Card className="md:p-8">
          <p className="rounded-2xl bg-sand p-6 text-center leading-8 text-ink-soft">لست في فريق تكتل بعد. تُفتح لك صفحة التكتل حين تكون في تكتل معتمد: رئيساً له، أو معاوناً أو منسقاً فيه، أو رئيس إحدى مجموعاته أو معاونها.</p>
        </Card>
      </AdminShell>
    );
  }
  return (
    <AdminShell title="صفحة التكتل العامة" subtitle={`${writer.clusterName} — تكتب فيها بصفتك ${writer.post}: لمحة التكتل وسكنه ونقله وإعاشته وبرامجه، وترسلها لاعتماد الإدارة.`}>
      <ClusterPublicProfile clusterId={writer.clusterId} clusterName={writer.clusterName} />
    </AdminShell>
  );
}
