"use client";

import { getState, setState, type State } from "../store";
import type { Result } from "./service";

/**
 * Runs one trusted operation on the state as it is now and keeps what it returns. A refusal that wrote
 * something (an attempt recorded in the audit trail) keeps that too.
 */
export function run<T>(op: (s: State) => Result<T>): Result<T> {
  const r = op(getState());
  if (r.ok) setState(() => r.state);
  else if (r.state) setState(() => r.state!);
  return r;
}
