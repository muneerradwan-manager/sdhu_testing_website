"use client";

import { Lock, LockOpen, Paperclip, Printer, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { PrintSheet } from "@/components/print/print-sheet";
import { PrintDocument, PrintSection, PrintTable } from "@/components/print/print-document";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import type { Letter } from "@/lib/store";
import { cn, nowMs } from "@/lib/utils";
import { LETTER_KINDS, LETTER_STATE, lastAt, letterState, putLetter, useLetters, type LetterState } from "@/app/administrator/_lib/letters";
import { Drawer, fmtDateTime, textareaClass, useCan, useStaffUser } from "../../_components/kit";
import { Chip, FilterSelect, SearchBox } from "../../_components/ops-ui";
import { EmptyRow, ListTable, RecordsBox, RowActions, RowLink, Tag, Title } from "../../_components/wp";
import { Filters, Lead, Locked, TitleCell } from "./ui";
import { logAdmins } from "../desk";

/**
 * «المراسلات» — what the administrators wrote to the administration, as a site's inbox: one table filtered by
 * state (with its counts), each letter opening in a side sheet with its thread. Opening one marks it read; the
 * holder answers in its thread, closes it when it is done (or opens it again), and prints it on one sheet.
 */
export function LettersTab() {
  const user = useStaffUser()!;
  const letters = useLetters();
  const [state, setState] = useState<"all" | LetterState>("all");
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const may = useCan();
  const [open, setOpen] = useState<string | null>(null);
  const count = (k: LetterState) => letters.filter((l) => letterState(l) === k).length;
  const list = letters
    .filter((l) => state === "all" || letterState(l) === state)
    .filter((l) => !kind || l.kind === kind)
    .filter((l) => !q.trim() || [l.subject, l.adminName, l.number, ...l.messages.map((m) => m.text)].some((t) => t.includes(q.trim())));
  const sheet = letters.find((l) => l.id === open);
  const close = (l: Letter, on: boolean) => {
    putLetter({ ...l, closed: on ? { at: nowMs(), by: user.name } : undefined });
    logAdmins(user, "letters", { action: on ? "إغلاق مراسلة" : "إعادة فتح مراسلة", target: `${l.number} — ${l.adminName}`, ref: l.id });
  };
  return (
    <div className="space-y-4">
      <Title>المراسلات</Title>
      <Lead>يكتبها الإداري من «المراسلات» في حسابه. افتح المراسلة تُعَدّ مقروءة، وردّ في سياقها، وأغلقها حين تنتهي.</Lead>
      <Filters
        label="حال المراسلات"
        value={state}
        onChange={setState}
        items={[
          { key: "all", label: "الكل", count: letters.length },
          { key: "unread", label: LETTER_STATE.unread.label, count: count("unread") },
          { key: "waiting", label: LETTER_STATE.waiting.label, count: count("waiting") },
          { key: "answered", label: LETTER_STATE.answered.label, count: count("answered") },
          { key: "closed", label: LETTER_STATE.closed.label, count: count("closed") },
        ]}
      />
      <div className="grid gap-2 md:grid-cols-[2fr_1fr]">
        <SearchBox value={q} onChange={setQ} placeholder="الموضوع، المرسل، الرقم، النص" label="بحث في المراسلات" />
        <FilterSelect label="النوع" all="كل الأنواع" value={kind} onChange={setKind} options={[...LETTER_KINDS]} />
      </div>
      <ListTable head={["الموضوع", "المرسل", "النوع", "آخر نشاط", "الحالة"]}>
        {list.length === 0 && <EmptyRow cols={5}>{letters.length ? "لا مراسلات بهذا البحث." : "تصل هنا رسائل الإداريين إلى الإدارة."}</EmptyRow>}
        {list.map((l) => {
          const st = letterState(l);
          return (
            <tr key={l.id} className={cn(st === "unread" && "bg-white/[.05]")}>
              <TitleCell
                title={<span className={st === "unread" ? "font-bold" : "font-semibold"}>{l.subject}</span>}
                onOpen={() => setOpen(l.id)}
                sub={
                  <>
                    {l.number}
                    {l.messages.some((m) => m.file) && (
                      <>
                        {" "}
                        · <Paperclip className="inline size-3" /> مرفق
                      </>
                    )}
                  </>
                }
                actions={
                  <RowActions>
                    <RowLink onClick={() => setOpen(l.id)}>{l.closed ? "فتح" : "قراءة والرد"}</RowLink>
                    {may("admins.letters.close") && <RowLink onClick={() => close(l, !l.closed)}>{l.closed ? "إعادة فتحها" : "إغلاق"}</RowLink>}
                  </RowActions>
                }
              />
              <td className="p-3 align-top text-white/80">{l.adminName}</td>
              <td className="p-3 align-top text-white/80">{l.kind}</td>
              <td className="whitespace-nowrap p-3 align-top text-xs text-white/60">{fmtDateTime(lastAt(l))}</td>
              <td className="p-3 align-top">
                <Tag tone={LETTER_STATE[st].tone}>{LETTER_STATE[st].label}</Tag>
              </td>
            </tr>
          );
        })}
      </ListTable>
      <Drawer open={!!sheet} onClose={() => setOpen(null)} title={sheet ? `${sheet.number} — ${sheet.subject}` : ""}>
        {sheet && <Thread l={sheet} />}
      </Drawer>
      <RecordsBox system="admins" area="letters" title="سجل المراسلات" />
    </div>
  );
}

function Thread({ l }: { l: Letter }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const [text, setText] = useState("");
  const may = useCan();
  const [file, setFile] = useState("");
  const st = letterState(l);

  // Opening an unread letter marks it read
  useEffect(() => {
    if (letterState(l) === "unread") putLetter({ ...l, readAt: nowMs() });
  }, [l]);

  const reply = () => {
    const at = nowMs();
    putLetter({ ...l, readAt: at, messages: [...l.messages, { id: `m-${at.toString(36)}`, from: "staff", name: user.name, text: text.trim(), at, file: file || undefined }] });
    logAdmins(user, "letters", { action: "رد على مراسلة", target: `${l.number} — ${l.adminName}`, detail: text.trim(), ref: l.id });
    toast({ title: "أُرسل الرد", body: `يصل ${l.adminName} في «المراسلات» بحسابه.`, tone: "success", icon: "✉️" });
    setText("");
    setFile("");
  };
  const close = (on: boolean) => {
    putLetter({ ...l, closed: on ? { at: nowMs(), by: user.name } : undefined });
    logAdmins(user, "letters", { action: on ? "إغلاق مراسلة" : "إعادة فتح مراسلة", target: `${l.number} — ${l.adminName}`, ref: l.id });
  };

  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={LETTER_STATE[st].tone}>{LETTER_STATE[st].label}</Chip>
        <Chip>{l.kind}</Chip>
        <span className="text-xs text-white/60">
          من {l.adminName} — {fmtDateTime(l.at)}
        </span>
      </div>
      <ol className="space-y-2">
        {l.messages.map((m) => (
          <li key={m.id} className={cn("rounded-2xl p-3 ring-1", m.from === "staff" ? "mr-8 bg-gold/15 ring-gold/30" : "ml-8 bg-white/[.06] ring-white/10")}>
            <p className="text-xs font-bold text-gold">
              {m.name} {m.from === "staff" ? "— الإدارة" : ""}
            </p>
            <p className="mt-1 whitespace-pre-line leading-7 text-white">{m.text}</p>
            {m.file && (
              <p className="mt-1 flex items-center gap-1 text-xs text-white/70">
                <Paperclip className="size-3.5" /> {m.file}
              </p>
            )}
            <p className="mt-1 text-[11px] text-white/45">{fmtDateTime(m.at)}</p>
          </li>
        ))}
      </ol>
      {l.closed ? (
        <p className="rounded-2xl bg-white/5 p-3 text-xs text-white/70 ring-1 ring-white/10">
          أغلقها {l.closed.by} — {fmtDateTime(l.closed.at)}. لا رد عليها حتى تُفتح.
        </p>
      ) : !may("admins.letters.PUT") ? (
        <Locked perm="admins.letters.PUT">الرد لغيرك.</Locked>
      ) : (
        <div className="space-y-2 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
          <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} className={textareaClass} placeholder="ردّك" aria-label="الرد" />
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white ring-1 ring-white/15">
              <Paperclip className="size-3.5" /> {file || "إرفاق ملف"}
              <input type="file" className="sr-only" onChange={(e) => setFile(e.target.files?.[0]?.name ?? "")} />
            </label>
            <Button size="sm" variant="gold" disabled={text.trim().length < 2} onClick={reply}>
              <Send className="size-4" /> إرسال الرد
            </Button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
        <Button size="sm" variant="glass" disabled={!may("admins.letters.close")} onClick={() => close(!l.closed)}>
          {l.closed ? <LockOpen className="size-4" /> : <Lock className="size-4" />} {l.closed ? "إعادة فتحها" : "إغلاق المراسلة"}
        </Button>
        <Button size="sm" variant="glass" disabled={!may("admins.letters.print")} onClick={() => window.print()}>
          <Printer className="size-4" /> طباعة
        </Button>
      </div>
      <PrintSheet>
        <LetterPrint l={l} />
      </PrintSheet>
    </div>
  );
}

/** The letter on paper in the platform's one print template: its particulars in boxes, then its thread as a table */
export function LetterPrint({ l }: { l: Letter }) {
  return (
    <PrintDocument
      title={`مراسلة ${l.number}`}
      source="قسم شؤون المجموعات والتكتلات"
      meta={[
        { label: "الموضوع", value: l.subject },
        { label: "النوع", value: l.kind },
        { label: "من", value: l.adminName },
        { label: "أُرسلت", value: fmtDateTime(l.at) },
        { label: "الحالة", value: l.closed ? `أُغلقت ${fmtDateTime(l.closed.at)}` : LETTER_STATE[letterState(l)].label },
      ]}
    >
      <PrintSection title="سياق المراسلة">
        <PrintTable
          head={["#", "الكاتب", "التاريخ", "النص"]}
          narrow={[0, 2]}
          rows={l.messages.map((m, i) => [
            i + 1,
            <>
              <b>{m.name}</b>
              {m.from === "staff" ? " (الإدارة)" : ""}
            </>,
            fmtDateTime(m.at),
            <>
              <span className="whitespace-pre-line">{m.text}</span>
              {m.file && <span className="block text-[8.5pt]">مرفق: {m.file}</span>}
            </>,
          ])}
          empty="لا رسائل فيها."
        />
      </PrintSection>
    </PrintDocument>
  );
}
