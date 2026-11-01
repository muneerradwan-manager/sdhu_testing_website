import type { Employee } from "../ops";
import { getStaff } from "../staff";
import EMPLOYEES from "@/testdata/staff/employees.json";

/**
 * The directorate's employees for the demo (testdata/staff/employees.json) — the same shape as the operations
 * app's profile (hajjoperations_app, profiles): name in three parts, job title, governorate, mission, permanent or
 * delegated by another body, both phone numbers, and the seasons he travelled with the mission.
 * The people the demo names carry their handle: his email, and his staff-portal account (lib/staff.ts) while one
 * is open under it — an account closed leaves him an employee without one.
 */

type EmployeeRecord = Omit<Employee, "staffId" | "email"> & { handle?: string };

const RECORDS = EMPLOYEES as EmployeeRecord[];

export const EMPLOYEES_SEED: Employee[] = RECORDS.map(({ handle, ...e }) => ({
  ...e,
  ...(handle && getStaff(handle) && { staffId: handle }),
  ...(handle && { email: `${handle}@hajj.gov.sy` }),
}));

/** The employee id of each person the demo names, by his handle — whether or not he has an account */
export const NAMED_EMPLOYEES: Record<string, string> = Object.fromEntries(RECORDS.filter((e) => e.handle).map((e) => [e.handle!, e.id]));
