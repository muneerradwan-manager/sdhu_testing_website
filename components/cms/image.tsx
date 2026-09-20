"use client";

import Image from "next/image";
import { useMediaUrl } from "@/lib/cms/media";
import { isMediaRef } from "@/lib/cms/types";
import { cn } from "@/lib/utils";

type Props = {
  src: unknown;
  alt?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  quality?: number;
  priority?: boolean;
  className?: string;
  /** يظهر بدل الصورة إن لم تُضبط صورة في لوحة التحكم */
  fallback?: string;
};

/**
 * صورة يديرها المحتوى. المسارات العادية تمرّ عبر next/image كالمعتاد؛
 * أما الصور المرفوعة من لوحة التحكم فهي روابط بيانات، ولا يعالجها محسّن الصور،
 * فتُعرض بوسم img مباشرة.
 */
export function CmsImage({ src, alt = "", fill, width, height, sizes, quality, priority, className, fallback }: Props) {
  const raw = typeof src === "string" && src ? src : (fallback ?? "");
  const url = useMediaUrl(raw);
  const uploaded = isMediaRef(raw);

  if (!url) return null;

  if (uploaded) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- رابط بيانات من مكتبة الوسائط؛ لا يمرّ بمحسّن الصور
      <img
        src={url}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={cn(fill && "absolute inset-0 size-full", className)}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
      />
    );
  }

  if (fill) return <Image src={url} alt={alt} fill sizes={sizes} quality={quality} priority={priority} className={className} />;
  return <Image src={url} alt={alt} width={width ?? 1200} height={height ?? 800} sizes={sizes} quality={quality} priority={priority} className={className} />;
}

/** فيديو يديره المحتوى — يقبل مساراً عادياً أو ملفاً مرفوعاً */
export function useCmsSrc(ref: unknown) {
  return useMediaUrl(ref);
}
