"use client";

import { Lock, LockOpen, Mails, Paperclip, Printer, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { PrintSheet } from "@/components/print/print-sheet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import type { Letter } from "@/lib/store";
import { cn, nowMs } from "@/lib/utils";
import { LETTER_KINDS, LETTER_STATE, lastAt, letterState, putLetter, useLetters, type LetterState } from "@/app/administrator/_lib/letters";
import { Drawer, Empty, Panel, fmtDateTime, textareaClass, useStaffUser } from "../../_components/kit";
import { Chip, FilterSelect, SearchBox } from "../../_components/ops-ui";
import { SystemRecords } from "../../_components/system";
import { logAdmins } from "../desk";

/**
 * «المراسلات» — what the administrators wrote to the administration, as its platform keeps them: each letter with
 * its subject, kind, attachment and thread. Opening one marks it read; the holder answers in its thread, closes
 * it when it is done (or opens it again), and prints it on one sheet. Its state is read from its thread.
 */
export function LettersTab() {
  const letters = useLetters();
  const [state, setState] = useState<"" | LetterState>("");
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const count = (k: LetterState) => letters.filter((l) => letterState(l) === k).length;
  const list = letters
    .filter((l) => !state || letterState(l) === state)
    .filter((l) => !kind || l.kind === kind)
    .filter((l) => !q.trim() || [l.subject, l.adminName, l.number, ...l.messages.map((m) => m.text)].some((t) => t.includes(q.trim())));
  const sheet = letters.find((l) => l.id === open);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(
          [
            ["", "الكل", letters.length],
            ["unread", LETTER_STATE.unread.label, count("unread")],
            ["waiting", LETTER_STATE.waiting.label, count("waiting")],
            ["answered", LETTER_STATE.answered.label, count("answered")],
            ["closed", LETTER_STATE.closed.label, count("closed")],
          ] as const
        ).map(([k, label, n]) => (
          <button key={label} type="button" onClick={() => setState(k)} aria-pressed={state === k} className={cn("rounded-2xl p-3 text-right ring-1 transition", state === k ? "bg-gold/20 ring-gold/60" : "bg-white/5 ring-white/10 hover:ring-gold/40")}>
            <p className="text-xs text-white/60">{label}</p>
            <p className="font-display text-2xl font-bold text-gold">{n}</p>
          </button>
        ))}
      </div>
      <Panel icon={<Mails />} title="المراسلات">
        <p className="mb-3 text-sm leading-7 text-white/70">يكتبها الإداري من «المراسلات» في حسابه. افتح المراسلة تُعَدّ مقروءة، وردّ في سياقها فيصله الرد في حسابه، وأغلقها حين تنتهي.</p>
        <div className="grid gap-2 md:grid-cols-[2fr_1fr]">
          <SearchBox value={q} onChange={setQ} placeholder="الموضوع، المرسل، الرقم، النص" label="بحث في المراسلات" />
          <FilterSelect label="النوع" all="كل الأنواع" value={kind} onChange={setKind} options={[...LETTER_KINDS]} />
        </div>
        {list.length === 0 ? (
          <Empty icon={<Mails />} title="لا مراسلات" text="تصل هنا رسائل الإداريين إلى الإدارة." />
        ) : (
          <ul className="mt-3 space-y-2">
            {list.map((l) => {
              const st = letterState(l);
              return (
                <li key={l.id}>
                  <button type="button" onClick={() => setOpen(l.id)} className={cn("flex w-full flex-wrap items-start gap-3 rounded-2xl p-3 text-right ring-1 transition hover:ring-gold/50", st === "unread" ? "bg-white/[.09] ring-gold/40" : "bg-white/5 ring-white/10")}>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-white", st === "unread" ? "font-bold" : "font-semibold")}>{l.subject}</span>
                      <span className="block text-xs text-white/60">
                        {l.adminName} · {l.kind} · {l.number} · {fmtDateTime(lastAt(l))}
                        {l.messages.some((m) => m.file) && (
                          <>
                            {" "}
                            · <Paperclip className="inline size-3" /> مرفق
                          </>
                        )}
                      </span>
                    </span>
                    <Chip tone={LETTER_STATE[st].tone}>{LETTER_STATE[st].label}</Chip>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
      <Drawer open={!!sheet} onClose={() => setOpen(null)} title={sheet ? `${sheet.number} — ${sheet.subject}` : ""}>
        {sheet && <Thread l={sheet} />}
      </Drawer>
      <SystemRecords system="admins" area="letters" title="سجل المراسلات" />
    </div>
  );
}

function Thread({ l }: { l: Letter }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const [text, setText] = useState("");
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
        <Button size="sm" variant="glass" onClick={() => close(!l.closed)}>
          {l.closed ? <LockOpen className="size-4" /> : <Lock className="size-4" />} {l.closed ? "إعادة فتحها" : "إغلاق المراسلة"}
        </Button>
        <Button size="sm" variant="glass" onClick={() => window.print()}>
          <Printer className="size-4" /> طباعة
        </Button>
      </div>
      <PrintSheet>
        <LetterPrint l={l} />
      </PrintSheet>
    </div>
  );
}

/** The letter on one sheet: its heading, then its thread */
export function LetterPrint({ l }: { l: Letter }) {
  return (
    <article className="text-[11pt] leading-7 text-black">
      <header className="border-b-2 border-black pb-2">
        <p className="text-[9pt]">إدارة الحج والعمرة السورية — قسم شؤون المجموعات والتكتلات</p>
        <h1 className="text-[15pt] font-bold">مراسلة {l.number}</h1>
        <p>
          الموضوع: <b>{l.subject}</b> — النوع: {l.kind}
        </p>
        <p>
          من: {l.adminName} — {fmtDateTime(l.at)} {l.closed ? `— أُغلقت ${fmtDateTime(l.closed.at)}` : ""}
        </p>
      </header>
      <ol className="mt-3 space-y-3">
        {l.messages.map((m) => (
          <li key={m.id} className="break-inside-avoid">
            <p className="font-bold">
              {m.name} {m.from === "staff" ? "(الإدارة)" : ""} — {fmtDateTime(m.at)}
            </p>
            <p className="whitespace-pre-line">{m.text}</p>
            {m.file && <p className="text-[9pt]">مرفق: {m.file}</p>}
          </li>
        ))}
      </ol>
    </article>
  );
}
