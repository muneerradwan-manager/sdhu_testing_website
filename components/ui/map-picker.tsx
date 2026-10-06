"use client";

import { Crosshair, MapPin, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "@/lib/utils";

export type LatLng = { lat: number; lng: number };

const TILE = 256;
const MIN_ZOOM = 5;
const MAX_ZOOM = 18;
/** Where the map opens when there is nothing to show yet: all of Syria */
const SYRIA: LatLng = { lat: 34.9, lng: 38.6 };

const worldSize = (z: number) => TILE * 2 ** z;

/** Web Mercator, the projection of the OpenStreetMap tiles: a point to its pixel at zoom z */
function project({ lat, lng }: LatLng, z: number) {
  const s = Math.sin((lat * Math.PI) / 180);
  return { x: ((lng + 180) / 360) * worldSize(z), y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * worldSize(z) };
}

function unproject(x: number, y: number, z: number): LatLng {
  const n = Math.PI - (2 * Math.PI * y) / worldSize(z);
  return { lat: (180 / Math.PI) * Math.atan(Math.sinh(n)), lng: (x / worldSize(z)) * 360 - 180 };
}

/** About a metre: enough for a hall's door */
const round = (v: number) => Math.round(v * 1e5) / 1e5;

/** Opens the place in the phone's or the browser's maps */
export const mapsLink = ({ lat, lng }: LatLng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

/**
 * A keyless OpenStreetMap to pick a place on: drag to move, the buttons to zoom, a tap to drop the pin.
 * From the keyboard: the arrows move, + and − zoom, Enter drops the pin in the middle. While nothing is
 * pinned it follows `focus` (a governorate chosen in the form), so the user starts near the place.
 */
export function MapPicker({ value, onChange, focus, label, className }: { value?: LatLng; onChange: (v: LatLng) => void; focus?: LatLng; label: string; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(value ? 16 : focus ? 12 : 6);
  const [center, setCenter] = useState<LatLng>(value ?? focus ?? SYRIA);
  const drag = useRef<{ x: number; y: number; from: { x: number; y: number }; moved: boolean } | null>(null);

  const [seen, setSeen] = useState(focus);
  if (focus !== seen) {
    setSeen(focus);
    if (!value && focus) {
      setCenter(focus);
      setZoom(12);
    }
  }

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.offsetWidth, h: el.offsetHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const mid = project(center, zoom);
  const left = mid.x - size.w / 2;
  const top = mid.y - size.h / 2;
  const n = 2 ** zoom;
  const tiles: { key: string; url: string; x: number; y: number }[] = [];
  if (size.w) {
    for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + size.h) / TILE); ty++) {
      if (ty < 0 || ty >= n) continue;
      for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + size.w) / TILE); tx++) {
        const wx = ((tx % n) + n) % n;
        tiles.push({ key: `${zoom}/${tx}/${ty}`, url: `https://tile.openstreetmap.org/${zoom}/${wx}/${ty}.png`, x: tx * TILE - left, y: ty * TILE - top });
      }
    }
  }
  const pin = value && (() => {
    const p = project(value, zoom);
    return { x: p.x - left, y: p.y - top };
  })();

  // The site scales itself with CSS zoom: pointer offsets are in screen pixels, the map in CSS pixels
  const scale = () => {
    const el = box.current!;
    return el.getBoundingClientRect().width / el.offsetWidth || 1;
  };
  const zoomBy = (d: number) => setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + d)));
  const pan = (dx: number, dy: number) => setCenter(unproject(mid.x + dx, mid.y + dy, zoom));
  const drop = (p: LatLng) => onChange({ lat: round(p.lat), lng: round(p.lng) });

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, from: mid, moved: false };
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const s = scale();
    const dx = (e.clientX - d.x) / s;
    const dy = (e.clientY - d.y) / s;
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    d.moved = true;
    setCenter(unproject(d.from.x - dx, d.from.y - dy, zoom));
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved) return;
    const r = box.current!.getBoundingClientRect();
    const s = scale();
    drop(unproject(left + (e.clientX - r.left) / s, top + (e.clientY - r.top) / s, zoom));
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = 80;
    const keys: Record<string, () => void> = {
      ArrowLeft: () => pan(-step, 0),
      ArrowRight: () => pan(step, 0),
      ArrowUp: () => pan(0, -step),
      ArrowDown: () => pan(0, step),
      "+": () => zoomBy(1),
      "=": () => zoomBy(1),
      "-": () => zoomBy(-1),
      Enter: () => drop(center),
    };
    if (!keys[e.key]) return;
    e.preventDefault();
    keys[e.key]();
  };

  return (
    <div className={cn("relative h-64 overflow-hidden rounded-2xl bg-[#dfe7e2] ring-1 ring-white/15", className)} dir="ltr">
      <div
        ref={box}
        role="application"
        tabIndex={0}
        aria-label={`${label}: اسحب لتحريك الخريطة، واضغط لوضع الدبوس. من لوحة المفاتيح: الأسهم للتحريك، و+ و− للتكبير، وEnter لوضع الدبوس في الوسط.`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={onKey}
        className="absolute inset-0 cursor-crosshair touch-none outline-none select-none focus-visible:ring-4 focus-visible:ring-gold/40"
      >
        {tiles.map((t) => (
          <div key={t.key} className="absolute size-64 bg-cover" style={{ left: t.x, top: t.y, backgroundImage: `url(${t.url})` }} />
        ))}
        {pin && (
          <MapPin className="pointer-events-none absolute size-9 -translate-x-1/2 -translate-y-full fill-maroon text-white drop-shadow-lg" style={{ left: pin.x, top: pin.y }} strokeWidth={1.75} />
        )}
      </div>

      <div className="absolute top-2 left-2 flex flex-col overflow-hidden rounded-xl bg-white shadow-lg">
        <button type="button" onClick={() => zoomBy(1)} disabled={zoom >= MAX_ZOOM} aria-label="تكبير الخريطة" className="grid size-9 place-items-center text-green-dark hover:bg-sand disabled:opacity-40">
          <Plus className="size-4" />
        </button>
        <button type="button" onClick={() => zoomBy(-1)} disabled={zoom <= MIN_ZOOM} aria-label="تصغير الخريطة" className="grid size-9 place-items-center border-t border-black/10 text-green-dark hover:bg-sand disabled:opacity-40">
          <Minus className="size-4" />
        </button>
        {value && (
          <button
            type="button"
            onClick={() => {
              setCenter(value);
              setZoom((z) => Math.max(z, 15));
            }}
            aria-label="العودة إلى الدبوس"
            className="grid size-9 place-items-center border-t border-black/10 text-maroon hover:bg-sand"
          >
            <Crosshair className="size-4" />
          </button>
        )}
      </div>

      {!value && (
        <p dir="rtl" className="pointer-events-none absolute inset-x-0 top-2 mx-auto w-fit rounded-full bg-green-dark/90 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
          قرّب الخريطة واضغط على موقع القاعة
        </p>
      )}
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="absolute right-0 bottom-0 rounded-tl-lg bg-white/85 px-1.5 py-0.5 text-[10px] text-black/70">
        © OpenStreetMap
      </a>
    </div>
  );
}
