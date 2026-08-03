"use client";

import { useSyncExternalStore } from "react";

// useSyncExternalStore is the correct primitive for subscribing to a
// browser API like matchMedia — avoids the extra "set real value after
// mount" render that a useState+useEffect version would need, and handles
// SSR (server snapshot is always `false`) without a hydration mismatch.
function subscribe(query: string, callback: () => void) {
  const mq = window.matchMedia(query);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => subscribe(query, callback),
    () => window.matchMedia(query).matches,
    () => false
  );
}
