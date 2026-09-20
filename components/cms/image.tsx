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

/** رابط جاهز لا يمرّ بمحسّن الصور: رابط بيانات، أو عنوان خارجي كامل */
const isDirectUrl = (v: string) => /^(https?:)?\/\/|^data:/.test(v);

/**
 * صورة يديرها المحتوى.
 *
 * المسار العادي يُمرَّر إلى next/image **كما هو**: محمّل الصور هو من يضيف مسار النشر
 * (basePath) في التصدير الثابت، فلو أضفناه هنا أيضاً لتكرّر في الرابط وضاعت الصورة.
 * أما الصور المرفوعة من اللوحة (روابط بيانات) والعناوين الخارجية فتُعرض بوسم img مباشرة،
 * لأن محسّن الصور لا يتعامل معها.
 */
export function CmsImage({ src, alt = "", fill, width, height, sizes, quality, priority, className, fallback }: Props) {
  const raw = typeof src === "string" && src ? src : (fallback ?? "");
  const uploaded = isMediaRef(raw);
  // الخطّاف يُنادى دائماً؛ ويعيد نصاً فارغاً لما ليس من مكتبة الوسائط
  const resolved = useMediaUrl(uploaded ? raw : "");

  if (!raw) return null;

  if (uploaded || isDirectUrl(raw)) {
    const direct = uploaded ? resolved : raw;
    if (!direct) return null;
    return (
      // eslint-disable-next-line @next/next/no-img-element -- رابط بيانات أو عنوان خارجي؛ لا يمرّ بمحسّن الصور
      <img
        src={direct}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={cn(fill && "absolute inset-0 size-full", className)}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
      />
    );
  }

  if (fill) return <Image src={raw} alt={alt} fill sizes={sizes} quality={quality} priority={priority} className={className} />;
  return <Image src={raw} alt={alt} width={width ?? 1200} height={height ?? 800} sizes={sizes} quality={quality} priority={priority} className={className} />;
}

/** فيديو يديره المحتوى — يقبل مساراً عادياً أو ملفاً مرفوعاً */
export function useCmsSrc(ref: unknown) {
  return useMediaUrl(ref);
}
