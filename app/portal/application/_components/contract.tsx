"use client";

import { groupInfo } from "@/lib/assignment";
import { groupName } from "@/lib/groups";
import { relationLabel } from "@/lib/registry";
import type { Application, PostAcceptance } from "@/lib/store";
import { cn, formatUSD } from "@/lib/utils";
import type { costLines } from "./post/model";

/** «7 تشرين الأول 2026» */
export const day = (at?: number) => (at ? new Intl.DateTimeFormat("ar-SY-u-nu-latn", { day: "numeric", month: "long", year: "numeric" }).format(at) : "—");

/** The contract as it was signed: its parties, its terms, its cost and its signatures (on screen, and on paper) */
export function ContractDocument({ app, post, group, lines, total, by, print = false }: { app: Application; post: PostAcceptance; group: ReturnType<typeof groupInfo>; lines: ReturnType<typeof costLines>; total: number; by: string; print?: boolean }) {
  const head = print ? "text-[13pt] font-bold" : "font-display text-xl font-bold text-green-dark";
  const box = print ? "mt-3" : "mt-4 rounded-2xl bg-sand p-4";
  return (
    <article className={print ? "text-[10.5pt] leading-7 text-black" : "leading-8 text-ink"}>
      <header className={print ? "border-b-2 border-black pb-2" : "border-b border-gold/40 pb-3"}>
        <p className={print ? "text-[9pt]" : "text-xs font-bold text-gold-dark"}>إدارة الحج والعمرة السورية — موسم 1448هـ</p>
        <h3 className={print ? "text-[16pt] font-bold" : "font-display text-3xl font-bold text-green-dark"}>عقد الحاج مع {groupName(group.number)}</h3>
        <p className={print ? "text-[9pt]" : "text-sm text-hint"}>رقم العقد ع-{app.number} — طلب الحج رقم {app.number}</p>
      </header>
      <section className={box}>
        <p className={head}>الطرف الأول: المجموعة</p>
        <p>
          {groupName(group.number)}، برئاسة {group.leader}، في {group.clusterName} — {group.office}، مستوى الخدمة: {group.level}.
        </p>
      </section>
      <section className={box}>
        <p className={head}>الطرف الثاني: الحاج صاحب الطلب ومرافقوه</p>
        <ul className={print ? "list-disc pr-5" : "list-disc space-y-0.5 pr-5 marker:text-gold-dark"}>
          {app.members.map((m) => (
            <li key={m.person.id}>
              {m.person.firstName} {m.person.fatherName} {m.person.lastName}
              {` — ${relationLabel(m.relation, m.person.gender)}`}
            </li>
          ))}
        </ul>
      </section>
      <section className={box}>
        <p className={head}>البنود</p>
        <ol className="list-decimal space-y-1 pr-5">
          <li>تقدّم المجموعة لأفراد الطلب خدمات الحج لموسم 1448هـ بمستوى «{group.level}»: السكن في مكة المكرمة والمدينة المنورة والمشاعر، والنقل بين المدن والمشاعر، والإعاشة، والمرافقة، والتوجيه الديني.</li>
          <li>يلتزم أفراد الطلب بتعليمات رئيس المجموعة وفريقها، وبمواعيد التجمّع والتفويج، ويحملون سوار المنصة وبطاقاتها.</li>
          <li>الطلب العائلي واحد في هذا العقد: يُلحق أفراده بالمجموعة معاً، ولا ينتقل أحدهم إلى مجموعة أخرى إلا بعقد جديد يُلحق به الطلب كله في المكتب.</li>
          <li>التكلفة كما في الجدول أدناه، تُدفع على الدفعات التي تعلنها الإدارة، ولكل دفعة إيصال مستقل قابل للتحقق.</li>
          <li>تتابع إدارة الحج والعمرة تنفيذ هذا العقد، ويُرفع أي خلاف إليها من «حالتي الآن» أو من مكتب الحاج.</li>
        </ol>
      </section>
      <section className={box}>
        <p className={head}>التكلفة</p>
        <table className="mt-1 w-full text-right">
          <tbody>
            {lines.map((l) => (
              <tr key={l.key} className={print ? "" : "border-b border-gold/20"}>
                <td className="py-1">
                  {l.title} <span className={print ? "" : "text-xs text-hint"}>({l.detail})</span>
                </td>
                <td className="py-1 text-left font-bold">{formatUSD(l.amount)}</td>
              </tr>
            ))}
            <tr>
              <td className="py-1 font-bold">المجموع</td>
              <td className="py-1 text-left font-bold">{formatUSD(total)}</td>
            </tr>
          </tbody>
        </table>
      </section>
      <section className={cn(box, "grid gap-3 sm:grid-cols-2")}>
        <div>
          <p className={head}>توقيع الطرف الثاني</p>
          <p>وقّعه صاحب الطلب في المكتب — {day(post.contract?.uploadedAt ?? post.groupApprovedAt)}</p>
        </div>
        <div>
          <p className={head}>الإلحاق بالمجموعة</p>
          <p>
            {by} — {day(post.groupApprovedAt)}
          </p>
          {post.contract && <p className={print ? "text-[9pt]" : "text-xs text-hint"}>النسخة الموقّعة: {post.contract.file.name}</p>}
        </div>
      </section>
    </article>
  );
}
