"use client";

import { useEffect } from "react";
import { RecoveryPanel } from "@/components/RecoveryPanel";

export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <RecoveryPanel
      title="This screen did not load."
      body="Try again. If it happens twice, reset the demo."
      onRetry={retry}
      offerReset
    />
  );
}
