import type { ReactNode } from "react";
import { Emblem } from "@/components/brand/logo";

/**
 * One look for everything the platform prints — a list, a flight's manifest, a report, a letter — after the
 * operations app's exported sheets: the letterhead (the State, the ministry, the administration, in Arabic and in
 * English, the emblem between them), the document's title with where it comes from and when it was printed, its
 * particulars in boxes, then its tables with a green heading and alternating rows. All in itfQomra (globals.css,
 * «Printed sheets»), on A4; `landscape` for a wide table. It goes inside <PrintSheet>.
 */
export function PrintDocument({ title, source, meta, landscape, children }: { title: string; source?: string; meta?: PrintMeta[]; landscape?: boolean; children?: ReactNode }) {
  const printed = new Intl.DateTimeFormat("ar-SY-u-nu-latn", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date());
  return (
    <article className="print-doc" data-orientation={landscape ? "landscape" : "portrait"}>
      <header className="print-letterhead">
        <div className="print-names">
          <p className="print-names-first">الجمهورية العربية السورية</p>
          <p>وزارة الأوقاف</p>
          <p>إدارة الحج والعمرة</p>
        </div>
        <Emblem className="print-emblem" gradientId="print-emblem-gold" />
        <div className="print-names print-names-en" dir="ltr">
          <p className="print-names-first">Syrian Arab Republic</p>
          <p>Ministry of Religious Affairs</p>
          <p>Directorate of Hajj and Umrah</p>
        </div>
      </header>
      <div className="print-title">
        <h1>{title}</h1>
        <p>
          {source && <>{source} · </>}طُبع {printed}
        </p>
      </div>
      {meta && meta.length > 0 && <PrintMetaGrid items={meta} />}
      {children}
    </article>
  );
}

export type PrintMeta = { label: string; value: ReactNode };

/** A document's particulars, or a section's: label over value, in a row of boxes */
export function PrintMetaGrid({ items }: { items: PrintMeta[] }) {
  return (
    <dl className="print-meta">
      {items.map((m) => (
        <div key={m.label}>
          <dt>{m.label}</dt>
          <dd>{m.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A part of the document — a bus, a flight, a group — with its title and particulars; `newPage` starts it on a page of its own */
export function PrintSection({ title, meta, newPage, children }: { title: string; meta?: PrintMeta[]; newPage?: boolean; children?: ReactNode }) {
  return (
    <section className="print-section" data-new-page={newPage ? "true" : undefined}>
      <h2>{title}</h2>
      {meta && meta.length > 0 && <PrintMetaGrid items={meta} />}
      {children}
    </section>
  );
}

/** A row across the whole table that heads the rows under it: a family, a group */
export type PrintBand = { band: ReactNode };

/**
 * A table on paper: a green heading in white, a hairline grid, every other row tinted so a reader keeps his line in
 * forty names. `narrow` columns (by index) take only what they need: a number, a tick box. A `{ band }` row heads
 * the rows after it (a family's name over its members).
 */
export function PrintTable({ head, rows, narrow = [], empty = "لا شيء هنا." }: { head: string[]; rows: (ReactNode[] | PrintBand)[]; narrow?: number[]; empty?: string }) {
  return (
    <table className="print-table">
      <thead>
        <tr>
          {head.map((h, i) => (
            <th key={i} className={narrow.includes(i) ? "print-narrow" : undefined}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={head.length} className="print-empty">
              {empty}
            </td>
          </tr>
        ) : (
          rows.map((r, i) =>
            !Array.isArray(r) ? (
              <tr key={i} className="print-band">
                <td colSpan={head.length}>{r.band}</td>
              </tr>
            ) : (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={narrow.includes(j) ? "print-narrow" : undefined}>
                  {c}
                </td>
              ))}
            </tr>
            ),
          )
        )}
      </tbody>
    </table>
  );
}

/** A box to tick by hand on paper (boarded, present) */
export const PrintTick = () => <span className="print-tick" aria-hidden />;

/** A note under a table or at the end of the document */
export const PrintNote = ({ children }: { children: ReactNode }) => <p className="print-note">{children}</p>;
