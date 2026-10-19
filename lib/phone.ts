import { isValidPhoneNumber, parsePhoneNumber } from "react-phone-number-input";

/**
 * Phone numbers from anywhere in the world: kept in the international form (+963944123456), checked against the
 * country's own numbering. A Syrian number kept the old way (0944123456) is read as Syria's.
 */
export function toInternational(v: string | undefined): string {
  const s = (v ?? "").replace(/[\s-]/g, "");
  if (/^0\d{9}$/.test(s)) return `+963${s.slice(1)}`;
  return s;
}

export function isPhone(v: string | undefined) {
  const s = toInternational(v);
  return !!s && isValidPhoneNumber(s);
}

/**
 * A number shown hidden: its whole country code, then its last three digits («+963 ••• 980», «+90 ••• 567»), so the
 * country stays readable whatever its code's length. One kept the old Syrian way is read as Syria's.
 */
export function maskPhone(v: string | undefined) {
  const s = toInternational(v);
  if (!s) return "—";
  const p = parsePhoneNumber(s);
  return p ? `+${p.countryCallingCode} ••• ${s.slice(-3)}` : `${s.slice(0, 4)} ••• ${s.slice(-3)}`;
}
