"use client";

import PhoneInput from "react-phone-number-input";
import ar from "react-phone-number-input/locale/ar.json";
import en from "react-phone-number-input/locale/en.json";
import "react-phone-number-input/style.css";
import { useLang } from "@/lib/i18n";
import { toInternational } from "@/lib/phone";
import { cn } from "@/lib/utils";

/**
 * A phone number from anywhere in the world: the country from a list of every country (its flag and dialling code,
 * its name in the visitor's language), then the number as dialled there. Syria first. The value is the number in its
 * international form (+963944123456); one kept the old Syrian way (0944123456) opens as Syria's.
 * `className` styles the box (border, background, height); `inputClassName` the number's text.
 */
export function CountryPhoneInput({ value, onChange, className, inputClassName, ariaLabel, invalid }: { value: string; onChange: (v: string) => void; className?: string; inputClassName?: string; ariaLabel: string; invalid?: boolean }) {
  const lang = useLang();
  return (
    <div dir="ltr" aria-invalid={invalid || undefined} className={cn("phone-field flex items-center gap-2 px-3", className)}>
      <PhoneInput
        international
        countryCallingCodeEditable={false}
        defaultCountry="SY"
        labels={lang === "en" ? en : ar}
        value={toInternational(value) || undefined}
        onChange={(v) => onChange(v ?? "")}
        autoComplete="tel"
        aria-label={ariaLabel}
        className="flex w-full items-center gap-2"
        numberInputProps={{ className: cn("min-w-0 flex-1 bg-transparent font-mono tracking-wider outline-none", inputClassName) }}
      />
    </div>
  );
}
