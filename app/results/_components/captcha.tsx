"use client";

import { useId } from "react";
import { seeded } from "@/lib/utils";

const CHARS = "ABCDEFGHJKMNPRSTUVWXYZ23456789";
const INKS = ["#00594F", "#672146", "#021526", "#016D5D", "#420023", "#7A2631"];

export function makeCaptcha(seed: string) {
  const rnd = seeded(`captcha:${seed}`);
  const text = Array.from({ length: 5 }, () => CHARS[Math.floor(rnd() * CHARS.length)]).join("");
  const glyphs = text.split("").map((ch, i) => ({
    ch,
    x: 26 + i * 31 + (rnd() - 0.5) * 8,
    y: 42 + (rnd() - 0.5) * 12,
    rotate: (rnd() - 0.5) * 55,
    size: 25 + rnd() * 9,
    color: INKS[Math.floor(rnd() * INKS.length)],
    skew: (rnd() - 0.5) * 24,
  }));
  const lines = Array.from({ length: 4 }, () => {
    const y1 = 10 + rnd() * 45;
    const y2 = 10 + rnd() * 45;
    return {
      d: `M ${-5} ${y1} C ${50 + rnd() * 30} ${rnd() * 64}, ${100 + rnd() * 30} ${rnd() * 64}, 185 ${y2}`,
      color: INKS[Math.floor(rnd() * INKS.length)],
      width: 1 + rnd() * 1.6,
    };
  });
  const dots = Array.from({ length: 34 }, () => ({ x: rnd() * 180, y: rnd() * 64, r: 0.6 + rnd() * 1.4 }));
  return { text, glyphs, lines, dots, noiseSeed: Math.floor(rnd() * 1000) };
}

/** Distorted SVG text captcha, generated on the client (demo only — a real portal verifies on the server) */
export function CaptchaImage({ captcha }: { captcha: ReturnType<typeof makeCaptcha> }) {
  const raw = useId();
  const id = `cap${raw.replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg viewBox="0 0 180 64" className="h-full w-full" role="img" aria-label="صورة رمز التحقق: حروف وأرقام مشوّهة" direction="ltr">
      <defs>
        <filter id={`${id}-warp`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035 0.08" numOctaves="2" seed={captcha.noiseSeed} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="7" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <linearGradient id={`${id}-bg`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#F7F4EF" />
          <stop offset="1" stopColor="#E4DDD3" />
        </linearGradient>
        <pattern id={`${id}-hatch`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#AD9E6E" strokeWidth="0.6" opacity=".35" />
        </pattern>
      </defs>
      <rect width="180" height="64" fill={`url(#${id}-bg)`} />
      <rect width="180" height="64" fill={`url(#${id}-hatch)`} />
      <g filter={`url(#${id}-warp)`}>
        {captcha.dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#AD9E6E" opacity=".6" />
        ))}
        {captcha.glyphs.map((g, i) => (
          <text
            key={i}
            x={0}
            y={0}
            transform={`translate(${g.x} ${g.y}) rotate(${g.rotate}) skewX(${g.skew})`}
            fontSize={g.size}
            fontWeight={800}
            fontFamily="Georgia, 'Times New Roman', serif"
            fill={g.color}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ userSelect: "none" }}
          >
            {g.ch}
          </text>
        ))}
        {captcha.lines.map((l, i) => (
          <path key={i} d={l.d} stroke={l.color} strokeWidth={l.width} fill="none" opacity=".75" />
        ))}
      </g>
    </svg>
  );
}
