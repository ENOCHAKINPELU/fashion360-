"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookAppointmentDialog } from "@/features/appointments/components/book-appointment-dialog";

// Part 28: Service Request accepted -> "Book a Consultation" -> Book Now /
// Book Later / Skip for Now. Later/Skip both just dismiss the prompt for
// this visit — the Service Request stays ACCEPTED and active either way,
// and the customer can always book later from the business's profile.
export function ConsultationPrompt({ businessId, businessName, serviceRequestId }: { businessId: string; businessName: string; serviceRequestId: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <Card className="border-none bg-accent-soft shadow-sm">
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
            <Sparkles className="size-4.5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Ready for the next step?</p>
            <p className="text-xs text-muted-foreground">Book a consultation with {businessName} to keep things moving.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BookAppointmentDialog
            businessId={businessId}
            businessName={businessName}
            serviceRequestId={serviceRequestId}
            trigger={<Button size="sm">Book Now</Button>}
          />
          <Button size="sm" variant="outline" onClick={() => setDismissed(true)}>
            Book Later
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDismissed(true)} aria-label="Skip for now">
            <X className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
