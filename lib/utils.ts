/** Prefixes a public-folder path with the deployment base path (GitHub Pages serves the site under a sub-path) */
export function asset(path: string) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  if (!path.startsWith("/") || (base && path.startsWith(base + "/"))) return path;
  return `${base}${path}`;
}

/** true on the static GitHub Pages build (no server routes) */
export const STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Western digits are the norm on Syrian government portals; keep this for decorative spots only. */
export function toArabicDigits(value: string | number) {
  return String(value).replace(/\d/g, (d) => AR_DIGITS[Number(d)]);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatUSD(value: number) {
  return `${formatNumber(value)} $`;
}

/** 01012345412 → 010-•••••412 */
export function maskNationalId(id: string) {
  if (id.length < 6) return id;
  return `${id.slice(0, 3)}-•••••${id.slice(-3)}`;
}

export function hijriDate(date: Date = new Date(), options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("ar-SY-u-ca-islamic-umalqura-nu-latn", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...options,
  }).format(date);
}

export function gregorianDate(date: Date = new Date(), options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("ar-SY-u-nu-latn", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...options,
  }).format(date);
}

/** Deterministic PRNG so fake data is stable between renders and reloads */
export function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
