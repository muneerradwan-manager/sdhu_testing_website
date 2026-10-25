"use client";

import { CheckCircle2, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { circularActions, KIND_LABEL, useMyCirculars, type Circular } from "@/lib/circulars";
import { fmtDate, fmtDateTime, logAs, PageHeader, useStaffUser } from "../_components/kit";
import { EditHeader, EmptyRow, ListTable, RowActions, RowLink, Tag, Title } from "../_components/wp";
import { Filters, Lead, NotFound, TitleCell, Views, useHrefWith, useOpenId, useView } from "../admins/_components/ui";
import { Reading } from "../employees/circulars";
import { useState } from "react";

const BASE = "/staff/circulars";
const KINDS = ["all", "decision", "circular"] as const;
const KIND_TAB = { all: "الكل", decision: "القرارات", circular: "التعميمات" } as const;

/**
 * Every employee's own page beside «ملفاتي التشغيلية»: the decisions and circulars the administration issued to him
 * (lib/circulars.ts), each opening on its own screen (`?id=`), where he marks it read — its issuer sees who has.
 * No permission is needed: each sees only what was addressed to him.
 */
export function MyCirculars() {
  const user = useStaffUser()!;
  const mine = useMyCirculars(user);
  const id = useOpenId();
  const open = mine.find((c) => c.id === id);
  if (id) return open ? <Screen c={open} /> : <NotFound back={BASE} backLabel="القرارات والتعميمات" what="هذا القرار أو التعميم" />;
  return <List mine={mine} />;
}

function List({ mine }: { mine: Circular[] }) {
  const user = useStaffUser()!;
  const hrefWith = useHrefWith();
  const kind = useView("k", KINDS);
  const [only, setOnly] = useState<"unread" | "all">(() => (mine.some((c) => !c.reads?.[user.id]) ? "unread" : "all"));
  const ofKind = mine.filter((c) => kind === "all" || c.kind === kind);
  const unread = ofKind.filter((c) => !c.reads?.[user.id]);
  const rows = only === "unread" ? unread : ofKind;
  return (
    <div className="space-y-4">
      <PageHeader eyebrow={user.title} icon={<ScrollText />} title="القرارات والتعميمات" description="ما تصدره الإدارة إليك: القرارات والتعميمات بنصها ومرفقاتها. اطّلع على كل منها، فيعرف من أصدرها أنك قرأته." />
      <Views tabs param="k" value={kind} label="النوع" items={KINDS.map((k) => ({ key: k, label: KIND_TAB[k], count: mine.filter((c) => k === "all" || c.kind === k).length }))} />
      <Title>{KIND_TAB[kind] === "الكل" ? "كل ما صدر إليك" : KIND_TAB[kind]}</Title>
      <Lead>{unread.length ? `${unread.length} لم تطّلع عليها بعد. افتح كلاً منها واضغط «اطّلعت عليه».` : "اطّلعت على كل ما صدر إليك."}</Lead>
      <Filters
        label="ما يُعرض"
        value={only}
        onChange={setOnly}
        items={[
          { key: "unread", label: "لم أطّلع عليها", count: unread.length },
          { key: "all", label: "الكل", count: ofKind.length },
        ]}
      />
      <ListTable head={["القرار أو التعميم", "النوع", "التاريخ", "الحال"]} minWidth="36rem">
        {rows.length === 0 && <EmptyRow cols={4}>{only === "unread" ? "لا شيء جديد." : "لم يصدر إليك شيء بعد."}</EmptyRow>}
        {rows.map((c) => {
          const href = hrefWith({ id: c.id });
          const read = c.reads?.[user.id];
          return (
            <tr key={c.id}>
              <TitleCell
                title={c.title}
                href={href}
                sub={`${KIND_LABEL[c.kind]} رقم ${c.number}`}
                actions={
                  <RowActions>
                    <RowLink href={href}>قراءة</RowLink>
                  </RowActions>
                }
              />
              <td className="p-3 align-top">
                <Tag tone={c.kind === "decision" ? "gold" : "muted"}>{KIND_LABEL[c.kind]}</Tag>
              </td>
              <td className="p-3 align-top text-xs text-white/75">{fmtDate(new Date(`${c.date}T12:00:00`).getTime())}</td>
              <td className="p-3 align-top">{read ? <Tag tone="green">اطّلعت</Tag> : <Tag tone="maroon">جديد</Tag>}</td>
            </tr>
          );
        })}
      </ListTable>
    </div>
  );
}

function Screen({ c }: { c: Circular }) {
  const user = useStaffUser()!;
  const read = c.reads?.[user.id];
  const ack = () => {
    circularActions.read(c.id, user.id);
    logAs(user, { action: `اطّلاع على ${KIND_LABEL[c.kind]}`, target: `${c.number} — ${c.title}`, system: "staff", area: "circulars", ref: c.id });
  };
  return (
    <div className="space-y-4">
      <EditHeader back={BASE} backLabel="القرارات والتعميمات" title={c.title}>
        {KIND_LABEL[c.kind]} رقم {c.number}
      </EditHeader>
      <Reading c={c} />
      {read ? (
        <p className="flex items-center gap-2 text-sm font-bold text-green-light">
          <CheckCircle2 className="size-5" /> اطّلعت عليه {fmtDateTime(read)}.
        </p>
      ) : (
        <Button variant="gold" onClick={ack}>
          <CheckCircle2 className="size-4" /> اطّلعت عليه
        </Button>
      )}
    </div>
  );
}
