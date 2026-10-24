"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * The sidebar's tree: under a main page, the sub-page that is open — an employee, an application, a flight, a
 * page being edited. The sub-page says what it is (`useNavBranch`), the sidebar hangs it under `anchor`, the
 * main page it belongs to, and drops it when the page closes. «×» goes back to `closeHref`, else to the anchor.
 */
export type NavBranchSpec = { anchor: string; title: string; closeHref?: string };

const SetBranch = createContext<(b: NavBranchSpec | null) => void>(() => {});
const Branch = createContext<NavBranchSpec | null>(null);

export function NavBranchProvider({ children }: { children: ReactNode }) {
  const [branch, setBranch] = useState<NavBranchSpec | null>(null);
  return (
    <SetBranch.Provider value={setBranch}>
      <Branch.Provider value={branch}>{children}</Branch.Provider>
    </SetBranch.Provider>
  );
}

/** What the sidebar shows now: the open sub-page, if any */
export const useOpenBranch = () => useContext(Branch);

/** A sub-page's own line: call it where the screen knows its name; `null` while it has none (a new item, one not found) */
export function useNavBranch(spec: NavBranchSpec | null) {
  const set = useContext(SetBranch);
  const anchor = spec?.anchor;
  const title = spec?.title;
  const closeHref = spec?.closeHref;
  useEffect(() => {
    if (!anchor || !title) return;
    set({ anchor, title, closeHref });
    return () => set(null);
  }, [anchor, title, closeHref, set]);
}
