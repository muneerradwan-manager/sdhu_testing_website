"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStaffHome, useStaffUser } from "../_components/kit";

/**
 * Where a link from outside the portal sends a signed-in employee (the site header's name chip): the page he lands on
 * after signing in (staffHome), worked out here so the public site does not load the portal to know it.
 */
export function HomeRedirect() {
  const user = useStaffUser();
  const router = useRouter();
  const home = useStaffHome(user);
  useEffect(() => router.replace(home), [home, router]);
  return null;
}
