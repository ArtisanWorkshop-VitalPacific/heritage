"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDemo } from "@/lib/store";
import { ROLE_HOME } from "@/lib/roles";
import { ParentHome } from "@/components/adult/ParentHome";

/**
 * /app routes each role to its home on arrival. Parents land here.
 * Only on arrival: a later role change on this page (the walkthrough, the role switcher)
 * brings its own navigation, and a second redirect here would race it.
 */
export default function AppHome() {
  const { role } = useDemo();
  const router = useRouter();
  const home = ROLE_HOME[role];
  const routed = useRef(false);

  useEffect(() => {
    if (routed.current) return;
    routed.current = true;
    if (home !== "/app") router.replace(home);
  }, [home, router]);

  if (home !== "/app") return null;
  return <ParentHome />;
}
