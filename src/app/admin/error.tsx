"use client";

import { useEffect } from "react";
import { ErrorState } from "@/shared/components/error-state";

// Next's own error-boundary convention — catches any render/data error
// thrown by a page or layout under /admin/*. Logs the real error to the
// console for whoever's debugging; ErrorState itself never renders it to
// the screen (an admin shouldn't have to parse a raw Prisma/network error).
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Admin route error:", error);
  }, [error]);

  return <ErrorState onRetry={reset} />;
}
