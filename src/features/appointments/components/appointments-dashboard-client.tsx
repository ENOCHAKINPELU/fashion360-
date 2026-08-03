"use client";

import { useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { AppointmentsQuickActions } from "@/features/appointments/components/appointments-quick-actions";
import { AppointmentFormDialog } from "@/features/appointments/components/appointment-form-dialog";

export function AppointmentsDashboardClient({
  prefilledCustomer,
}: {
  prefilledCustomer?: { id: string; firstName: string; lastName: string; phone: string | null; profilePhotoUrl: string | null };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Open on first render if a customerId was passed in via the URL (e.g.
  // linked from a customer's quick actions); a lazy initializer reads this
  // once on mount rather than reacting to it in an effect.
  const [open, setOpen] = useState(() => !!searchParams.get("customerId"));
  const [walkIn, setWalkIn] = useState(false);

  function closeAndClearParam(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen && searchParams.get("customerId")) {
      router.replace(pathname);
    }
  }

  return (
    <>
      <AppointmentsQuickActions
        onNewAppointment={() => {
          setWalkIn(false);
          setOpen(true);
        }}
        onWalkIn={() => {
          setWalkIn(true);
          setOpen(true);
        }}
      />
      <AppointmentFormDialog
        open={open}
        onOpenChange={closeAndClearParam}
        prefilledCustomer={prefilledCustomer}
        defaultDate={walkIn ? new Date() : undefined}
        defaultStatus={walkIn ? "CHECKED_IN" : undefined}
      />
    </>
  );
}
