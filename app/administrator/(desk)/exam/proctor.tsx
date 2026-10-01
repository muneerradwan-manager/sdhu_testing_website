"use client";

import { motion } from "motion/react";
import { Camera, CircleCheck, Loader2, Mic, MicOff, VideoOff } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

/**
 * The written exam is sat with the camera and the microphone on. One stream is shared by the instructions
 * screen (where it is turned on and checked) and the exam itself (where it must stay on to the end), so it
 * lives here, outside any component. Nothing is recorded in the demo: only turning on and interruptions
 * are written to the exam's record. Later, AI tools can watch the same stream and the screen.
 */

export type ProctorState = "off" | "asking" | "on" | "denied" | "unsupported" | "lost";

let stream: MediaStream | null = null;
let state: ProctorState = "off";
const listeners = new Set<() => void>();
const set = (s: ProctorState) => {
  state = s;
  listeners.forEach((l) => l());
};

/** Ask for the camera and the microphone (the browser asks the applicant once) */
export async function startProctor() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return set("unsupported");
  if (stream && stream.getTracks().every((t) => t.readyState === "live")) return set("on");
  set("asking");
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: true });
    // Unplugged, blocked from the browser bar, or taken by another app: the exam stops until it is back
    stream.getTracks().forEach((t) => t.addEventListener("ended", () => set("lost")));
    set("on");
  } catch {
    stream = null;
    set("denied");
  }
}

/** Release the camera and the microphone (after the exam is sent) */
export function stopProctor() {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  set("off");
}

export function useProctor() {
  const s = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => "off" as ProctorState,
  );
  return { state: s, stream: s === "on" ? stream : null };
}

/** How loud the microphone is, 0–1, while the stream is on */
function useMicLevel(media: MediaStream | null) {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (!media || !media.getAudioTracks().length) return;
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(media).connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let raf = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
      setLevel(Math.min(1, peak / 64));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      void ctx.close();
    };
  }, [media]);
  return level;
}

function Preview({ media, className }: { media: MediaStream; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = media;
  }, [media]);
  return <video ref={ref} autoPlay muted playsInline className={cn("-scale-x-100 object-cover", className)} />;
}

function MicMeter({ level, bars = 12 }: { level: number; bars?: number }) {
  return (
    <span className="flex h-4 items-end gap-0.5" aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} className={cn("w-1 rounded-full transition-all", i / bars < level ? "bg-green-light" : "bg-white/25")} style={{ height: `${30 + (i / bars) * 70}%` }} />
      ))}
    </span>
  );
}

/** The check on the instructions screen: turn both on, see yourself, see the microphone move */
export function ProctorCheck() {
  const { state: s, stream: media } = useProctor();
  const level = useMicLevel(media);
  const [heard, setHeard] = useState(false);
  if (level > 0.08 && !heard) setHeard(true);

  return (
    <div className="mt-6 rounded-2xl border-2 border-green-dark/20 bg-green-dark/[.04] p-4">
      <p className="flex items-center gap-2 font-bold text-green-dark">
        <Camera className="size-5" /> الكاميرا والميكروفون
      </p>
      <p className="mt-1 text-sm leading-7 text-ink-soft">
        يُؤدّى الامتحان والكاميرا والميكروفون مفتوحان طوال مدته، للتأكد من أنك من يؤدّيه وحدك ودون مساعدة. إن توقف أحدهما يتوقف الامتحان حتى تعيده، والوقت مستمر. في النسخة التجريبية لا تُحفظ الصورة ولا الصوت؛ يُسجَّل التشغيل والانقطاع فقط.
      </p>
      {s === "on" && media ? (
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="relative overflow-hidden rounded-2xl bg-ink">
            <Preview media={media} className="h-32 w-44" />
            <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-maroon px-2 py-0.5 text-[10px] font-bold text-white">
              <span className="size-1.5 animate-pulse rounded-full bg-white" /> مباشر
            </span>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 font-semibold text-green">
              <CircleCheck className="size-5" /> الكاميرا تعمل
            </li>
            <li className={cn("flex items-center gap-2 font-semibold", heard ? "text-green" : "text-ink-soft")}>
              {heard ? <CircleCheck className="size-5" /> : <Mic className="size-5" />} {heard ? "الميكروفون يلتقط الصوت" : "قل شيئاً لتجربة الميكروفون"}
              <span className="rounded-md bg-ink px-1.5 py-1"><MicMeter level={level} /></span>
            </li>
          </ul>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void startProctor()}
            disabled={s === "asking"}
            className="inline-flex items-center gap-2 rounded-2xl bg-green-dark px-5 py-3 font-bold text-white transition hover:bg-green disabled:opacity-60"
          >
            {s === "asking" ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />} تشغيل الكاميرا والميكروفون
          </button>
          {s === "denied" && <p className="text-sm font-semibold text-maroon">رُفض الإذن. اسمح للمتصفح باستعمال الكاميرا والميكروفون (رمز القفل بجانب العنوان) ثم أعد المحاولة.</p>}
          {s === "unsupported" && <p className="text-sm font-semibold text-maroon">لا يتيح هذا المتصفح الكاميرا هنا. افتح المنصة من رابطها الآمن (https) في متصفح حديث.</p>}
          {s === "lost" && <p className="text-sm font-semibold text-maroon">توقفت الكاميرا أو الميكروفون. أعد تشغيلهما.</p>}
        </div>
      )}
    </div>
  );
}

/**
 * During the exam: the applicant sees himself in the corner with the microphone moving. If either stops,
 * a screen covers the questions until both are back; the clock keeps running.
 */
export function ProctorDuringExam({ onInterrupt }: { onInterrupt: () => void }) {
  const { state: s, stream: media } = useProctor();
  const level = useMicLevel(media);
  const reported = useRef<ProctorState | null>(null);
  const down = s !== "on";

  // A fresh exam page (reload, or coming back to it) has no stream yet: ask for it again
  useEffect(() => {
    if (state === "off") void startProctor();
  }, []);
  // Every interruption once, in the exam's record
  useEffect(() => {
    if ((s === "lost" || s === "denied") && reported.current !== s) {
      reported.current = s;
      onInterrupt();
    }
    if (s === "on") reported.current = null;
  }, [s, onInterrupt]);

  return (
    <>
      {media && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-4 left-4 z-[65] overflow-hidden rounded-2xl bg-ink shadow-2xl ring-2 ring-white/80">
          <Preview media={media} className="h-24 w-32" />
          <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-maroon px-1.5 py-0.5 text-[9px] font-bold text-white">
            <span className="size-1.5 animate-pulse rounded-full bg-white" /> مراقَب
          </span>
          <span className="absolute bottom-1 left-1 rounded bg-ink/70 px-1 py-0.5">
            <MicMeter level={level} bars={8} />
          </span>
        </motion.div>
      )}
      {down && s !== "asking" && s !== "off" && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/80 p-4 backdrop-blur" role="alertdialog" aria-label="توقفت الكاميرا أو الميكروفون">
          <div className="max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
            <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-maroon/10 text-maroon">
              {s === "lost" ? <VideoOff className="size-8" /> : <MicOff className="size-8" />}
            </span>
            <p className="mt-4 font-display text-2xl font-bold text-green-dark">توقفت الكاميرا أو الميكروفون</p>
            <p className="mt-2 leading-7 text-ink-soft">لا يُتابَع الامتحان إلا والكاميرا والميكروفون مفتوحان. أعد تشغيلهما — الوقت مستمر، ويُسجَّل الانقطاع في سجل امتحانك.</p>
            <button type="button" onClick={() => void startProctor()} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-green-dark px-5 py-3 font-bold text-white transition hover:bg-green">
              <Camera className="size-5" /> إعادة التشغيل
            </button>
          </div>
        </div>
      )}
    </>
  );
}
