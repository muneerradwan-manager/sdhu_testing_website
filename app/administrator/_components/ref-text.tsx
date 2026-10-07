import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { blocksOf, boldParts } from "../_lib/references";

/** A reference's text as the administration wrote it: paragraphs, lists, and bold terms */
export function RefText({ body, dark = false, className }: { body: string; dark?: boolean; className?: string }) {
  const inline = (text: string) =>
    boldParts(text).map((p, i) =>
      p.bold ? (
        <b key={i} className={dark ? "text-gold" : "text-green-dark"}>
          {p.text}
        </b>
      ) : (
        <Fragment key={i}>{p.text}</Fragment>
      ),
    );
  return (
    <div className={cn("space-y-3 leading-8", dark ? "text-white/85" : "text-ink-soft", className)}>
      {blocksOf(body).map((b, i) =>
        b.kind === "p" ? (
          <p key={i}>{inline(b.text)}</p>
        ) : (
          <ul key={i} className="list-disc space-y-1 pr-5 marker:text-gold-dark">
            {b.items.map((it, j) => (
              <li key={j}>{inline(it)}</li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
