"use client";

import { groupName } from "@/lib/groups";
import type { Zone } from "@/lib/data/staff-seed";
import { KIND_LABELS } from "@/lib/data/staff-seed";
import { asset, cn } from "@/lib/utils";
import type { QueueTicket } from "../_components/data";
import { SEVERITY, escalated } from "./shared";

// ───────────────────────── Map ─────────────────────────

/**
 * The real map behind the incidents: a picture of OpenStreetMap stitched once by
 * scripts/build-mashaer-map.py, covering exactly these edges in Web Mercator at the map's 700×400. Every
 * place is put on it from its latitude and longitude, so the zones sit where they are on the ground.
 */
const BOUNDS = { west: 39.79, east: 40.01, north: 21.44352, south: 21.32646 };
const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
function project(lat: number, lon: number) {
  return {
    x: ((lon - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * 700,
    y: ((mercY(BOUNDS.north) - mercY(lat)) / (mercY(BOUNDS.north) - mercY(BOUNDS.south))) * 400,
  };
}
/** Map units per kilometre at Makkah's latitude, for the size of each zone on the ground */
const PER_KM = 700 / ((BOUNDS.east - BOUNDS.west) * 111.32 * Math.cos((21.385 * Math.PI) / 180));

const PLACES: Record<Zone, { lat: number; lon: number; km: number; label: string }> = {
  makkah: { lat: 21.4225, lon: 39.8262, km: 1, label: "مكة — الفندق" },
  jamarat: { lat: 21.421, lon: 39.8727, km: 0.6, label: "الجمرات" },
  mina: { lat: 21.4135, lon: 39.8925, km: 1.4, label: "منى" },
  muzdalifah: { lat: 21.3835, lon: 39.9363, km: 1.5, label: "مزدلفة" },
  arafat: { lat: 21.3557, lon: 39.9754, km: 2.4, label: "عرفة" },
};
const ZONES = Object.fromEntries(
  (Object.keys(PLACES) as Zone[]).map((k) => [k, { ...project(PLACES[k].lat, PLACES[k].lon), r: PLACES[k].km * PER_KM, label: PLACES[k].label }]),
) as Record<Zone, { x: number; y: number; label: string; r: number }>;

/** The pilgrims' road through the zones, drawn as a smooth curve (Catmull-Rom) through their centres */
const ROUTE = (() => {
  const pts = (["makkah", "jamarat", "mina", "muzdalifah", "arafat"] as Zone[]).map((k) => ZONES[k]);
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [pts[i - 1] ?? pts[i], pts[i], pts[i + 1], pts[i + 2] ?? pts[i + 1]];
    d += ` C${f(p1.x + (p2.x - p0.x) / 6)} ${f(p1.y + (p2.y - p0.y) / 6)}, ${f(p2.x - (p3.x - p1.x) / 6)} ${f(p2.y - (p3.y - p1.y) / 6)}, ${f(p2.x)} ${f(p2.y)}`;
  }
  return d;
})();

export function MashaerMap({ tickets, zone, onZone, onOpen, now }: { tickets: QueueTicket[]; zone: Zone | null; onZone: (z: Zone) => void; onOpen: (id: string) => void; now: number }) {
  const route = ROUTE;
  const arafat = ZONES.arafat;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#012a25] ring-1 ring-white/10">
      <svg viewBox="0 0 700 400" className="h-auto w-full" style={{ direction: "ltr" }} role="img" aria-label="خريطة مكة ومنى ومزدلفة وعرفة مع مواقع البلاغات">
        <defs>
          <radialGradient id="heat">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity=".35" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="zone">
            <stop offset="0%" stopColor="#289E92" stopOpacity=".32" />
            <stop offset="100%" stopColor="#289E92" stopOpacity=".08" />
          </radialGradient>
        </defs>
        <image href={asset("/images/mashaer-map.jpg")} width="700" height="400" preserveAspectRatio="none" />
        <circle cx={arafat.x} cy={arafat.y} r={arafat.r * 1.9} fill="url(#heat)">
          <animate attributeName="r" values={`${arafat.r * 1.7};${arafat.r * 2.05};${arafat.r * 1.7}`} dur="6s" repeatCount="indefinite" />
        </circle>
        {/* route */}
        <path d={route} fill="none" stroke="rgba(217,200,158,.25)" strokeWidth="10" strokeLinecap="round" />
        <path d={route} fill="none" stroke="#D9C89E" strokeWidth="2" strokeDasharray="6 10" strokeLinecap="round">
          <animate attributeName="stroke-dashoffset" from="160" to="0" dur="4s" repeatCount="indefinite" />
        </path>
        {/* zones */}
        {(Object.keys(ZONES) as Zone[]).map((k) => {
          const z = ZONES[k];
          const count = tickets.filter((t) => t.zone === k).length;
          const selected = zone === k;
          return (
            <g key={k} onClick={() => onZone(k)} className="cursor-pointer" role="button" aria-label={`${z.label}: ${count} بلاغات`}>
              <circle cx={z.x} cy={z.y} r={z.r} fill="url(#zone)" stroke={selected ? "#D9C89E" : "rgba(40,158,146,.45)"} strokeWidth={selected ? 2.5 : 1.2} strokeDasharray={selected ? undefined : "4 4"} />
              <text x={z.x} y={z.y + z.r + 16} textAnchor="middle" fill="rgba(255,255,255,.95)" fontSize="13" fontWeight="700" stroke="#011f1b" strokeWidth="3.5" strokeLinejoin="round" paintOrder="stroke">
                {z.label}
              </text>
              {count > 0 && (
                <g>
                  <circle cx={z.x + z.r * 0.72} cy={z.y - z.r * 0.72} r="10" fill="#672146" stroke="#fff" strokeWidth="1.5" />
                  <text x={z.x + z.r * 0.72} y={z.y - z.r * 0.72 + 4} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700">
                    {count}
                  </text>
                </g>
              )}
            </g>
          );
        })}
        {/* group 27 marker, just above Arafat where the group is */}
        <g>
          <rect x={arafat.x - 68} y={arafat.y - arafat.r - 34} width="136" height="24" rx="12" fill="rgba(0,0,0,.45)" stroke="rgba(217,200,158,.4)" />
          <text x={arafat.x} y={arafat.y - arafat.r - 18} textAnchor="middle" fill="#D9C89E" fontSize="11">{groupName(27)} — 48 حاجاً</text>
        </g>
        {/* the map data's licence asks for this credit */}
        <text x="8" y="393" fill="rgba(255,255,255,.55)" fontSize="9">© OpenStreetMap contributors</text>
        {/* bus */}
        <g>
          <circle r="5" fill="#D9C89E">
            <animateMotion dur="14s" repeatCount="indefinite" path={route} />
          </circle>
        </g>
        {/* incidents */}
        {tickets.map((t, i) => {
          const z = ZONES[t.zone];
          const angle = (i * 137.5 * Math.PI) / 180;
          const dist = z.r * 0.25 + ((i * 7) % 10) * (z.r * 0.05);
          const x = z.x + Math.cos(angle) * dist;
          const y = z.y + Math.sin(angle) * dist;
          const s = SEVERITY[t.severity];
          const hot = t.severity === "critical" || t.severity === "high";
          return (
            <g key={t.id} onClick={() => onOpen(t.id)} className="cursor-pointer" role="button" aria-label={`${KIND_LABELS[t.kind]}: ${t.name}`}>
              {/* maroon reads too dark as a filled halo on the night map — use an expanding light ring instead */}
              <circle cx={x} cy={y} r="6" fill={hot ? "none" : s.hex} stroke={hot ? s.stroke : "none"} strokeWidth="1.5" opacity=".35">
                <animate attributeName="r" values="6;18;6" dur={t.severity === "critical" ? "1.4s" : "2.6s"} repeatCount="indefinite" />
                <animate attributeName="opacity" values=".6;0;.6" dur={t.severity === "critical" ? "1.4s" : "2.6s"} repeatCount="indefinite" />
              </circle>
              {escalated(t, now) && <circle cx={x} cy={y} r="10" fill="none" stroke="#D9C89E" strokeWidth="2" />}
              <circle cx={x} cy={y} r={hot ? 6.5 : 5.5} fill={s.hex} stroke={s.stroke} strokeWidth="2" />
            </g>
          );
        })}
      </svg>
      <div className="absolute right-3 top-3 flex flex-wrap gap-2.5 rounded-xl bg-black/40 px-3 py-2 text-[11px] font-bold text-white/90 ring-1 ring-white/10 backdrop-blur">
        {(Object.keys(SEVERITY) as (keyof typeof SEVERITY)[]).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", SEVERITY[k].dot)} /> {SEVERITY[k].label}
          </span>
        ))}
      </div>
    </div>
  );
}
