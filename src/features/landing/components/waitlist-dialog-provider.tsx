"use client";

import { createContext, useContext, useState } from "react";
import { WaitlistDialog } from "@/features/landing/components/waitlist-dialog";

type WaitlistRole = "CUSTOMER" | "DESIGNER";

const WaitlistDialogContext = createContext<((role: WaitlistRole) => void) | null>(null);

// Mounted once at the page level so every section's CTA (header, hero,
// discovery, for-designers, final CTA) opens the same dialog instance
// instead of each one owning its own state/dialog.
export function WaitlistDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ open: boolean; role: WaitlistRole }>({ open: false, role: "CUSTOMER" });

  function openWaitlist(role: WaitlistRole) {
    setState({ open: true, role });
  }

  return (
    <WaitlistDialogContext.Provider value={openWaitlist}>
      {children}
      <WaitlistDialog open={state.open} onOpenChange={(open) => setState((s) => ({ ...s, open }))} role={state.role} />
    </WaitlistDialogContext.Provider>
  );
}

export function useWaitlistDialog() {
  const ctx = useContext(WaitlistDialogContext);
  if (!ctx) throw new Error("useWaitlistDialog must be used within a WaitlistDialogProvider");
  return ctx;
}
