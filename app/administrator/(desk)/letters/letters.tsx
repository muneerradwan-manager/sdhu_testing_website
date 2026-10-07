"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Mails, Paperclip, PenLine, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/components/portal/shell";
import { Button } from "@/components/ui/button";
import { Badge, useToast } from "@/components/ui/widgets";
import type { Letter } from "@/lib/store";
import { cn, nowMs } from "@/lib/utils";
import { logAdmin, useAdmin } from "../../_lib/admin";
import { useFormingSeason } from "../../_lib/formation";
import { LETTER_KINDS, LETTER_STATE, lastAt, letterState, nextLetterNumber, putLetter, unreadReplies, useLetters } from "../../_lib/letters";
import { AdminShell, SectionTitle } from "../../_components/ui";

const when = (at: number) => new Intl.DateTimeFormat("ar-SY-u-nu-latn", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(at);
const field = "w-full rounded-2xl border-2 border-gold/40 px-4 outline-none focus:border-green-light";

/**
 * «المراسلات»: the administrator writes to the administration — a subject, a kind, his text and an attachment —
 * and reads its replies in the letter's thread, answering there while it is open. The staff who hold «إدارة
 * الإداريين» read, answer and close it.
 */
export function AdminLetters() {
  const admin = useAdmin()!;
  const all = useLetters();
  const mine = all.filter((l) => l.adminId === admin.id);
  const [open, setOpen] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const letter = mine.find((l) => l.id === open);
  return (
    <AdminShell title="المراسلات" subtitle="رسائلك إلى إدارة الحج والعمرة — قسم شؤون المجموعات والتكتلات — وردودها. لكل رسالة سياقها، تردّ فيه ما دامت مفتوحة.">
      <AnimatePresence mode="wait">
        {letter ? (
          <motion.div key={letter.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Thread l={letter} onBack={() => setOpen(null)} />
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
            {writing ? (
              <NewLetter onSent={(id) => { setWriting(false); setOpen(id); }} onCancel={() => setWriting(false)} all={all} />
            ) : (
              <Button onClick={() => setWriting(true)}>
                <PenLine className="size-4" /> رسالة جديدة إلى الإدارة
              </Button>
            )}
            <Card className="md:p-8">
              <SectionTitle icon={Mails}>رسائلي ({mine.length})</SectionTitle>
              {mine.length === 0 ? (
                <p className="mt-4 rounded-2xl bg-sand p-6 text-center text-ink-soft">لم تكتب إلى الإدارة بعد. استفسار، أو طلب، أو شكوى، أو اقتراح: اكتبه هنا يصل القسم ويصلك رده.</p>
              ) : (
                <ul className="mt-4 divide-y divide-gold-light">
                  {mine.map((l) => {
                    const st = letterState(l);
                    const fresh = unreadReplies(l);
                    return (
                      <li key={l.id}>
                        <button type="button" onClick={() => setOpen(l.id)} className="flex w-full flex-wrap items-center gap-3 py-4 text-right hover:bg-sand/40">
                          <span className="min-w-0 flex-1">
                            <span className={cn("block text-ink", fresh ? "font-bold" : "font-semibold")}>{l.subject}</span>
                            <span className="block text-xs text-hint">
                              {l.number} · {l.kind} · {when(lastAt(l))}
                            </span>
                          </span>
                          {fresh > 0 && <Badge tone="maroon">رد جديد</Badge>}
                          <Badge tone={st === "answered" ? "green" : st === "closed" ? "ink" : "gold"}>{st === "unread" || st === "waiting" ? "بانتظار الرد" : LETTER_STATE[st].label}</Badge>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminShell>
  );
}

function NewLetter({ onSent, onCancel, all }: { onSent: (id: string) => void; onCancel: () => void; all: Letter[] }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const season = useFormingSeason();
  const [subject, setSubject] = useState("");
  const [kind, setKind] = useState<string>(LETTER_KINDS[0]);
  const [text, setText] = useState("");
  const [file, setFile] = useState("");
  const send = () => {
    const at = nowMs();
    const id = `lt-${at.toString(36)}`;
    const number = nextLetterNumber(all, season);
    putLetter({ id, number, adminId: admin.id, adminName: admin.name, subject: subject.trim(), kind, at, messages: [{ id: `${id}-a`, from: "admin", name: admin.name, text: text.trim(), at, file: file || undefined }], adminReadAt: at });
    logAdmin(admin.id, `مراسلة إلى الإدارة: ${subject.trim()}`, number, kind);
    toast({ title: "أُرسلت رسالتك", body: `${number} — يصلك الرد هنا وفي الإشعارات.`, tone: "success", icon: "✉️" });
    onSent(id);
  };
  return (
    <Card className="md:p-8">
      <SectionTitle icon={PenLine}>رسالة جديدة</SectionTitle>
      <div className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="الموضوع" aria-label="الموضوع" className={cn(field, "h-12")} />
          <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="النوع" className={cn(field, "h-12 bg-white")}>
            {LETTER_KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </div>
        <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="نص الرسالة" aria-label="نص الرسالة" className={cn(field, "p-4 leading-8")} />
        <label className="flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-dashed border-gold/50 px-4 py-3 text-sm font-bold text-green-dark hover:bg-sand">
          <Paperclip className="size-4" /> {file || "إرفاق ملف (اختياري)"}
          <input type="file" className="sr-only" onChange={(e) => setFile(e.target.files?.[0]?.name ?? "")} />
        </label>
        <div className="flex gap-2">
          <Button disabled={subject.trim().length < 3 || text.trim().length < 5} onClick={send}>
            <Send className="size-4" /> إرسال
          </Button>
          <Button variant="outline" onClick={onCancel}>
            إلغاء
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Thread({ l, onBack }: { l: Letter; onBack: () => void }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const [text, setText] = useState("");
  const [file, setFile] = useState("");
  // Reading the thread reads its replies
  useEffect(() => {
    if (unreadReplies(l)) putLetter({ ...l, adminReadAt: nowMs() });
  }, [l]);
  const reply = () => {
    const at = nowMs();
    putLetter({ ...l, adminReadAt: at, messages: [...l.messages, { id: `m-${at.toString(36)}`, from: "admin", name: admin.name, text: text.trim(), at, file: file || undefined }] });
    logAdmin(admin.id, `رد في المراسلة ${l.number}`, l.subject);
    toast({ title: "أُرسل ردك", tone: "success", icon: "✉️" });
    setText("");
    setFile("");
  };
  return (
    <Card className="md:p-8">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-bold text-green-dark hover:underline">
        <ArrowRight className="size-4" /> رسائلي
      </button>
      <h2 className="mt-3 font-display text-2xl font-bold text-green-dark">{l.subject}</h2>
      <p className="text-sm text-hint">
        {l.number} · {l.kind} · {when(l.at)}
      </p>
      <ol className="mt-5 space-y-3">
        {l.messages.map((m) => (
          <li key={m.id} className={cn("rounded-2xl p-4", m.from === "staff" ? "ml-10 bg-green-light/10 ring-1 ring-green-light/30" : "mr-10 bg-sand")}>
            <p className="text-xs font-bold text-green-dark">{m.from === "staff" ? `${m.name} — الإدارة` : "أنت"}</p>
            <p className="mt-1 whitespace-pre-line leading-8 text-ink">{m.text}</p>
            {m.file && (
              <p className="mt-1 flex items-center gap-1 text-xs text-ink-soft">
                <Paperclip className="size-3.5" /> {m.file}
              </p>
            )}
            <p className="mt-1 text-[11px] text-hint">{when(m.at)}</p>
          </li>
        ))}
      </ol>
      {l.closed ? (
        <p className="mt-5 rounded-2xl bg-sand p-4 text-sm text-ink-soft">أغلقت الإدارة هذه المراسلة ({when(l.closed.at)}). لأمر جديد اكتب رسالة جديدة.</p>
      ) : (
        <div className="mt-5 space-y-3">
          <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="ردّك" aria-label="ردّك" className={cn(field, "p-4 leading-8")} />
          <div className="flex flex-wrap gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-dashed border-gold/50 px-4 py-2 text-sm font-bold text-green-dark hover:bg-sand">
              <Paperclip className="size-4" /> {file || "إرفاق ملف"}
              <input type="file" className="sr-only" onChange={(e) => setFile(e.target.files?.[0]?.name ?? "")} />
            </label>
            <Button disabled={text.trim().length < 2} onClick={reply}>
              <Send className="size-4" /> إرسال
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
