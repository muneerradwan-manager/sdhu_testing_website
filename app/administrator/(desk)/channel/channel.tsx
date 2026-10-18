"use client";

import { AnimatePresence, motion } from "motion/react";
import { CornerDownLeft, Lock, MessagesSquare, Pin, PinOff, Reply, Send, ShieldCheck, Trash2, UserRoundX, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/portal/shell";
import { Button } from "@/components/ui/button";
import { Badge, Modal, useToast } from "@/components/ui/widgets";
import type { ChannelMessage } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useAdmin } from "../../_lib/admin";
import {
  CHANNEL_ROLES,
  WRITER_PRESETS,
  markRead,
  postMessage,
  removeMessage,
  roleLabel,
  setMuted,
  setWriters,
  togglePin,
  useClusterChannel,
  type ChannelMember,
  type ChannelRole,
  type ClusterChannelView,
} from "../../_lib/channel";
import { AdminShell, SectionTitle } from "../../_components/ui";

const when = (at: number) => new Intl.DateTimeFormat("ar-SY-u-nu-latn", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(at);

/**
 * «قناة التكتل»: everyone who works in the cluster reads it — all of them are in it, so it lists no members; who
 * writes is by role, as its head sets it. The head also pins a message on top, stops one writer from writing (from
 * one of his messages; «من يكتب» lists who is stopped, to give it back), and takes any message down.
 */
export function ClusterChannelPage() {
  const admin = useAdmin()!;
  const v = useClusterChannel(admin.id, admin.profile);
  if (!v) {
    return (
      <AdminShell title="قناة التكتل" subtitle="قناة كادر التكتل: رئيسه ومحاسبه، ورؤساء مجموعاته وفرقها، ومنسقوه وموجّهاته ومعاونوه.">
        <Card className="md:p-8">
          <p className="rounded-2xl bg-sand p-6 text-center leading-8 text-ink-soft">لست في تكتل بعد. تُفتح لك قناة التكتل حين تقبل دعوة تكتل، أو تنضم مجموعتك إلى تكتل.</p>
        </Card>
      </AdminShell>
    );
  }
  return (
    <AdminShell title="قناة التكتل" subtitle={`${v.clusterName} — قناة كادره كله: ${v.members.length} عضواً. يقرؤها الجميع، ويكتب فيها من يحدده رئيس التكتل.`}>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Messages v={v} />
        <Writers v={v} />
      </div>
    </AdminShell>
  );
}

// ───────────────────────── the messages ─────────────────────────

function Messages({ v }: { v: ClusterChannelView }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ChannelMessage | null>(null);
  const [removing, setRemoving] = useState<ChannelMessage | null>(null);
  const [muting, setMuting] = useState<ChannelMember | null>(null);
  const [reason, setReason] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const byId = useMemo(() => Object.fromEntries(v.messages.map((m) => [m.id, m])), [v.messages]);
  const pinned = v.messages.filter((m) => m.pinned && !m.removed);

  // Reading the channel clears its unread count
  useEffect(() => markRead(v), [v]);
  // It opens on the latest message, and follows a new one
  const count = v.messages.length;
  useEffect(() => {
    const el = list.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: count ? "smooth" : "auto" });
  }, [count]);

  const send = () => {
    if (!text.trim()) return;
    postMessage(v, text, replyTo?.id);
    setText("");
    setReplyTo(null);
    toast({ title: "نُشرت رسالتك في القناة", body: `يقرؤها ${v.members.length - 1} من كادر ${v.clusterName}`, icon: "💬", tone: "success" });
  };

  return (
    <Card className="overflow-hidden p-0 md:p-0">
      <div className="flex items-center gap-3 bg-gradient-to-l from-green-dark to-[#00352f] px-5 py-4 text-white">
        <span className="grid size-11 place-items-center rounded-2xl bg-gold text-ink">
          <MessagesSquare className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="font-bold">قناة {v.clusterName}</p>
          <p className="truncate text-xs text-white/70">
            {v.members.length} عضواً — يكتب: {v.writers.map((r) => CHANNEL_ROLES.find((x) => x.key === r)?.plural).join("، ")}
          </p>
        </div>
      </div>

      {pinned.length > 0 && (
        <div className="space-y-2 border-b border-gold/30 bg-gold/10 px-5 py-3">
          {pinned.map((m) => (
            <p key={m.id} className="flex items-start gap-2 text-sm leading-7">
              <Pin className="mt-1.5 size-4 shrink-0 text-gold-dark" />
              <span>
                <b className="text-green-dark">{m.name}:</b> {m.text}
              </span>
            </p>
          ))}
        </div>
      )}

      <div ref={list} className="max-h-[38rem] space-y-3 overflow-y-auto bg-sand px-4 py-5 md:px-6">
        {v.messages.length === 0 && <p className="rounded-2xl bg-white/70 p-6 text-center text-ink-soft">لا رسائل بعد. {v.canWrite ? "اكتب أول رسالة إلى كادر التكتل." : "تظهر هنا رسائل من يكتب في القناة."}</p>}
        <AnimatePresence initial={false}>
          {v.messages.map((m) => (
            <Bubble
              key={m.id}
              m={m}
              v={v}
              quoted={m.replyTo ? byId[m.replyTo] : undefined}
              onReply={() => setReplyTo(m)}
              onRemove={() => setRemoving(m)}
              onMute={(member) => {
                setReason("");
                setMuting(member);
              }}
            />
          ))}
        </AnimatePresence>
      </div>

      <div className="border-t border-gold/30 p-4 md:p-5">
        {v.canWrite ? (
          <>
            {replyTo && (
              <div className="mb-2 flex items-center gap-2 rounded-xl bg-sand px-3 py-2 text-xs text-ink-soft">
                <CornerDownLeft className="size-3.5 shrink-0 text-gold-dark" />
                <span className="min-w-0 flex-1 truncate">
                  ردّ على <b>{replyTo.name}</b>: {replyTo.text}
                </span>
                <button type="button" onClick={() => setReplyTo(null)} aria-label="إلغاء الرد" className="text-hint hover:text-maroon">
                  <X className="size-4" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={2}
                maxLength={1000}
                placeholder="اكتب رسالة إلى كادر التكتل…"
                aria-label="نص الرسالة"
                className="min-h-[3.25rem] flex-1 resize-y rounded-2xl border-2 border-gold/40 px-4 py-3 leading-7 outline-none focus:border-green-light"
              />
              <Button onClick={send} disabled={!text.trim()} aria-label="إرسال">
                <Send className="size-4" /> إرسال
              </Button>
            </div>
            <p className="mt-1.5 text-[11px] text-hint">Enter للإرسال، وShift + Enter لسطر جديد. كل رسالة تُسجَّل في سجل نشاطك.</p>
          </>
        ) : (
          <p className="flex items-start gap-2 rounded-2xl bg-sand px-4 py-3 text-sm leading-7 text-ink-soft">
            <Lock className="mt-1 size-4 shrink-0 text-gold-dark" /> {v.readOnly}
          </p>
        )}
      </div>

      <Modal open={!!removing} onClose={() => setRemoving(null)} className="max-w-md">
        {removing && (
          <div>
            <p className="font-display text-xl font-bold text-green-dark">حذف الرسالة؟</p>
            <p className="mt-2 rounded-xl bg-sand p-3 text-sm leading-7 text-ink-soft">
              <b>{removing.name}:</b> {removing.text}
            </p>
            <p className="mt-2 text-xs text-hint">تبقى في مكانها بعبارة «حُذفت هذه الرسالة» واسم من حذفها.</p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="maroon"
                onClick={() => {
                  removeMessage(v, removing);
                  setRemoving(null);
                }}
              >
                <Trash2 className="size-4" /> حذف
              </Button>
              <Button variant="outline" onClick={() => setRemoving(null)}>
                تراجع
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <Modal open={!!muting} onClose={() => setMuting(null)} className="max-w-md">
        {muting && (
          <div>
            <p className="flex items-center gap-2 font-display text-xl font-bold text-green-dark">
              <UserRoundX className="size-5 text-maroon" /> إيقاف كتابة {muting.name}
            </p>
            <p className="mt-2 text-sm leading-7 text-ink-soft">يبقى يقرأ القناة، ولا يكتب فيها حتى تعيدها له من «من يكتب في القناة»، مهما كانت صفته.</p>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="السبب (اختياري)" aria-label="السبب" className="mt-3 w-full rounded-2xl border-2 border-gold/40 px-4 py-2.5 outline-none focus:border-green-light" />
            <div className="mt-4 flex gap-2">
              <Button
                variant="maroon"
                onClick={() => {
                  setMuted(v, muting, true, reason);
                  toast({ title: `أُوقفت كتابة ${muting.name} في القناة`, tone: "info", icon: "🔇" });
                  setMuting(null);
                }}
              >
                إيقاف الكتابة
              </Button>
              <Button variant="outline" onClick={() => setMuting(null)}>
                تراجع
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}

function Bubble({ m, v, quoted, onReply, onRemove, onMute }: { m: ChannelMessage; v: ClusterChannelView; quoted?: ChannelMessage; onReply: () => void; onRemove: () => void; onMute: (member: ChannelMember) => void }) {
  const mine = m.by === v.me.id;
  // The head stops a writer from one of his messages (never himself, nor another head)
  const author = v.manager && !mine && m.role !== "head" && !v.channel.muted?.[m.by] ? v.members.find((x) => x.id === m.by) : undefined;
  const leader = m.role === "head";
  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={cn("flex", mine ? "justify-start" : "justify-end")}>
      <div className={cn("group max-w-[88%] rounded-2xl px-4 py-3 shadow-sm", mine ? "rounded-tr-sm bg-white" : leader ? "rounded-tl-sm bg-green-dark/[.07] ring-1 ring-green-dark/15" : "rounded-tl-sm bg-white/90")}>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <b className={leader ? "text-green-dark" : "text-maroon"}>{mine ? "أنت" : m.name}</b>
          <span className="text-hint">{roleLabel(m.role)}</span>
          {m.pinned && !m.removed && (
            <span className="flex items-center gap-1 text-gold-dark">
              <Pin className="size-3" /> مثبّتة
            </span>
          )}
        </p>
        {m.removed ? (
          <p className="mt-1 text-sm italic text-hint">حُذفت هذه الرسالة — حذفها {m.removed.by}</p>
        ) : (
          <>
            {quoted && (
              <p className="mt-2 line-clamp-2 border-r-2 border-gold-dark/50 pr-2 text-xs leading-6 text-ink-soft">
                <b>{quoted.name}:</b> {quoted.removed ? "رسالة محذوفة" : quoted.text}
              </p>
            )}
            <p className="mt-1 whitespace-pre-line leading-8">{m.text}</p>
          </>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-hint">
          <span>{when(m.at)}</span>
          {!m.removed && (
            <span className="flex items-center gap-3">
              {v.canWrite && (
                <button type="button" onClick={onReply} className="flex items-center gap-1 font-bold hover:text-green-dark">
                  <Reply className="size-3.5" /> ردّ
                </button>
              )}
              {v.manager && (
                <button type="button" onClick={() => togglePin(v, m)} className="flex items-center gap-1 font-bold hover:text-gold-dark">
                  {m.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />} {m.pinned ? "إلغاء التثبيت" : "تثبيت"}
                </button>
              )}
              {(mine || v.manager) && (
                <button type="button" onClick={onRemove} className="flex items-center gap-1 font-bold hover:text-maroon">
                  <Trash2 className="size-3.5" /> حذف
                </button>
              )}
              {author && (
                <button type="button" onClick={() => onMute(author)} className="flex items-center gap-1 font-bold hover:text-maroon">
                  <UserRoundX className="size-3.5" /> إيقاف كتابته
                </button>
              )}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ───────────────────────── who writes ─────────────────────────

function Writers({ v }: { v: ClusterChannelView }) {
  const toast = useToast();
  const stopped = v.members.filter((m) => v.channel.muted?.[m.id]);
  const [draft, setDraft] = useState<ChannelRole[] | null>(null);
  const roles = draft ?? v.writers;
  const present = new Set(v.members.map((m) => m.role));
  const changed = draft && (draft.length !== v.writers.length || draft.some((r) => !v.writers.includes(r)));
  const toggle = (r: ChannelRole) => setDraft(roles.includes(r) ? roles.filter((x) => x !== r) : [...roles, r]);
  const same = (a: ChannelRole[], b: ChannelRole[]) => a.length === b.length && a.every((r) => b.includes(r));

  return (
    <Card className="md:p-6">
      <SectionTitle icon={ShieldCheck}>من يكتب في القناة</SectionTitle>
      {v.manager ? (
        <>
          <p className="mt-2 text-sm leading-7 text-ink-soft">الجميع يقرأ. اختر من يكتب، جاهزاً أو صفةً صفة. رئيس التكتل يكتب دائماً.</p>
          <div className="mt-3 grid gap-2">
            {WRITER_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setDraft(p.roles)}
                className={cn("rounded-2xl border-2 px-3 py-2 text-right transition", same(roles, p.roles) ? "border-green-light bg-green-light/10" : "border-gold/30 hover:border-gold-dark")}
              >
                <span className="block text-sm font-bold text-ink">{p.label}</span>
                <span className="block text-xs text-hint">{p.hint}</span>
              </button>
            ))}
          </div>
          <ul className="mt-4 space-y-1.5">
            {CHANNEL_ROLES.map((r) => (
              <li key={r.key}>
                <label className={cn("flex items-center gap-2 text-sm", r.key === "head" ? "text-hint" : "cursor-pointer")}>
                  <input type="checkbox" checked={roles.includes(r.key)} disabled={r.key === "head"} onChange={() => toggle(r.key)} className="size-4 accent-[#00594f]" />
                  {r.plural}
                  {!present.has(r.key) && <span className="text-[11px] text-hint">(لا أحد في التكتل)</span>}
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              disabled={!changed}
              onClick={() => {
                setWriters(v, roles);
                setDraft(null);
                toast({ title: "حُفظ من يكتب في القناة", body: roles.map((r) => CHANNEL_ROLES.find((x) => x.key === r)!.plural).join("، "), tone: "success", icon: "✅" });
              }}
            >
              حفظ
            </Button>
            {changed && (
              <Button size="sm" variant="outline" onClick={() => setDraft(null)}>
                تراجع
              </Button>
            )}
          </div>
          <div className="mt-5 border-t border-gold-light pt-4">
            <p className="text-sm font-bold text-ink">موقوفون عن الكتابة</p>
            {stopped.length === 0 ? (
              <p className="mt-1 text-xs leading-6 text-hint">لا أحد. توقف كتابة أي شخص من رسالة له: «إيقاف كتابته».</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {stopped.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{m.name}</span>
                      {v.channel.muted?.[m.id]?.reason && <span className="block truncate text-[11px] text-hint">{v.channel.muted[m.id].reason}</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setMuted(v, m, false);
                        toast({ title: `عاد ${m.name} يكتب في القناة`, tone: "success", icon: "✅" });
                      }}
                      className="shrink-0 text-xs font-bold text-green-dark hover:underline"
                    >
                      إعادة الكتابة
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {v.writers.map((r) => (
              <li key={r}>
                <Badge tone="green">{CHANNEL_ROLES.find((x) => x.key === r)?.plural}</Badge>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-6 text-hint">يحدد رئيس التكتل من يكتب في القناة. والجميع يقرأ.</p>
        </>
      )}
    </Card>
  );
}
