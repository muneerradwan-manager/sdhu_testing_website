/**
 * The demo's texts that mention people (testdata/demo, testdata/journey) name them by national number, never by
 * name: «{first:ID}», «{father:ID}», «{last:ID}», «{title:ID}», «{short:ID}» and «{full:ID}» become that citizen's
 * first name, father's name, family name, title («الشيخ»), short name or full name from the civil registry
 * (testdata/people/citizens.json).
 * Without «:ID» they are the record's own person.
 */
import { getPerson, personName } from "./registry";

export function withNames(text: string, id?: string) {
  return text.replace(/\{(first|father|last|title|short|full)(?::(\d{11}))?\}/g, (_, form: string, ref?: string) => {
    const pid = ref ?? id ?? "";
    if (form === "short" || form === "full") return personName(pid, form);
    const p = getPerson(pid);
    if (form === "title") return p ? (p.title ?? "") : pid;
    return (form === "last" ? p?.lastName : form === "father" ? p?.fatherName : p?.firstName) ?? pid;
  });
}
