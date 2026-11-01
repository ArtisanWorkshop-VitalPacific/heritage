"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDemo } from "@/lib/store";
import { ROLE_HOME } from "@/lib/roles";
import { ParentHome } from "@/components/adult/ParentHome";

/** /app routes each role to its home. Parents land here. */
export default function AppHome() {
  const { role } = useDemo();
  const router = useRouter();
  const home = ROLE_HOME[role];

  useEffect(() => {
    if (home !== "/app") router.replace(home);
  }, [home, router]);

  if (home !== "/app") return null;
  return <ParentHome />;
}
