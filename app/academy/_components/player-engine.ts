"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/** Common shape both the real <video> and the simulated clock expose to the player UI */
export type PlayerEngine = {
  started: boolean;
  playing: boolean;
  loading: boolean;
  ended: boolean;
  time: number;
  duration: number;
  buffered: number;
  volume: number;
  muted: boolean;
  rate: number;
  toggle: () => void;
  seek: (t: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setRate: (r: number) => void;
  replay: () => void;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * A fake media clock: behaves like a real player (buffering on first play and on far seeks,
 * playback rate, end state) so lessons without a video file still feel alive.
 */
export function useSimEngine(duration: number, { bootMs = 1400 }: { bootMs?: number } = {}): PlayerEngine {
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ended, setEnded] = useState(false);
  const [time, setTime] = useState(0);
  const [bufferedTo, setBufferedTo] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [rate, setRateState] = useState(1);

  const timeRef = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      const next = Math.min(duration, timeRef.current + dt * rate);
      timeRef.current = next;
      setTime(next);
      setBufferedTo((b) => Math.min(duration, Math.max(b, next + 60 + next * 0.15)));
      if (next >= duration) {
        setPlaying(false);
        setEnded(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, rate, duration]);

  const buffer = useCallback((ms: number) => {
    clearTimeout(timer.current);
    setLoading(true);
    setPlaying(false);
    timer.current = setTimeout(() => {
      setLoading(false);
      setPlaying(true);
    }, ms);
  }, []);

  const toggle = useCallback(() => {
    if (loading) return;
    if (!started) {
      setStarted(true);
      setBufferedTo(90);
      buffer(bootMs);
      return;
    }
    if (ended) {
      timeRef.current = 0;
      setTime(0);
      setEnded(false);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  }, [loading, started, ended, buffer, bootMs]);

  const seek = useCallback(
    (t: number) => {
      const next = clamp(t, 0, duration);
      const far = next > bufferedTo + 1;
      timeRef.current = next;
      setTime(next);
      setEnded(false);
      if (!started) setStarted(true);
      if (far) {
        setBufferedTo(next + 45);
        buffer(650);
      }
    },
    [duration, bufferedTo, started, buffer],
  );

  return {
    started,
    playing,
    loading,
    ended,
    time,
    duration,
    buffered: Math.max(bufferedTo, time),
    volume,
    muted,
    rate,
    toggle,
    seek,
    setVolume: (v) => {
      setVolumeState(clamp(v, 0, 1));
      setMuted(v <= 0);
    },
    toggleMute: () => setMuted((m) => !m),
    setRate: setRateState,
    replay: () => {
      timeRef.current = 0;
      setTime(0);
      setEnded(false);
      setStarted(true);
      setPlaying(true);
    },
  };
}

/** Wraps a real <video> or <audio> element with the same engine contract */
export function useVideoEngine(ref: RefObject<HTMLMediaElement | null>) {
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [ended, setEnded] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [rate, setRateState] = useState(1);

  const sync = useCallback(() => {
    const v = ref.current;
    if (!v) return;
    setTime(v.currentTime);
    if (Number.isFinite(v.duration)) setDuration(v.duration);
    if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
  }, [ref]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const loop = () => {
      sync();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, sync]);

  const engine: PlayerEngine = {
    started,
    playing,
    loading: started && waiting,
    ended,
    time,
    duration,
    buffered,
    volume,
    muted,
    rate,
    toggle: () => {
      const v = ref.current;
      if (!v) return;
      if (v.paused || v.ended) {
        setStarted(true);
        v.volume = volume;
        v.playbackRate = rate;
        void v.play().catch(() => setWaiting(false));
      } else v.pause();
    },
    seek: (t) => {
      const v = ref.current;
      if (!v) return;
      const d = Number.isFinite(v.duration) ? v.duration : duration;
      v.currentTime = clamp(t, 0, d || 0);
      setEnded(false);
      sync();
    },
    setVolume: (val) => {
      const v = ref.current;
      const next = clamp(val, 0, 1);
      setVolumeState(next);
      setMuted(next <= 0);
      if (v) {
        v.volume = next;
        v.muted = next <= 0;
      }
    },
    toggleMute: () => {
      const next = !muted;
      setMuted(next);
      if (ref.current) ref.current.muted = next;
    },
    setRate: (r) => {
      setRateState(r);
      if (ref.current) ref.current.playbackRate = r;
    },
    replay: () => {
      const v = ref.current;
      if (!v) return;
      v.currentTime = 0;
      setEnded(false);
      void v.play();
    },
  };

  const handlers = {
    onPlay: () => {
      setPlaying(true);
      setEnded(false);
    },
    onPause: () => setPlaying(false),
    onWaiting: () => setWaiting(true),
    onPlaying: () => setWaiting(false),
    onCanPlay: () => setWaiting(false),
    onEnded: () => {
      setPlaying(false);
      setEnded(true);
    },
    onLoadedMetadata: sync,
    onDurationChange: sync,
    onProgress: sync,
    onSeeked: sync,
  };

  return { engine, handlers };
}
