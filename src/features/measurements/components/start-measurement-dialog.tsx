"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ruler, Camera } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerPicker } from "@/shared/components/customer-picker";
import { cn } from "@/lib/utils";
import type { MeasurementTemplateItem } from "@/features/measurements/types";

export function StartMeasurementDialog({
  open,
  onOpenChange,
  prefilledCustomer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefilledCustomer?: { id: string; firstName: string; lastName: string; phone: string | null; profilePhotoUrl: string | null };
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState<string | undefined>(prefilledCustomer?.id);
  const [newCustomer, setNewCustomer] = useState<{ firstName: string; lastName: string; email: string; phone: string } | undefined>();
  const [method, setMethod] = useState<"MANUAL" | "PHOTO_ESTIMATION">("MANUAL");
  const [templateId, setTemplateId] = useState<string>("");
  const [templates, setTemplates] = useState<MeasurementTemplateItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setCustomerId(prefilledCustomer?.id);
    setNewCustomer(undefined);
    setMethod("MANUAL");
    setTemplateId("");
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    fetch("/api/measurements/templates")
      .then((res) => res.json())
      .then((data) => setTemplates(data.templates ?? []));
  }, [open]);

  async function handleStart() {
    if (!customerId && !(newCustomer?.firstName && newCustomer?.lastName)) {
      toast.error("Select or create a customer first");
      return;
    }
    setSubmitting(true);
    try {
      let finalCustomerId = customerId;
      if (!finalCustomerId && newCustomer) {
        const res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: newCustomer.firstName,
            lastName: newCustomer.lastName,
            email: newCustomer.email || undefined,
            phone: newCustomer.phone || undefined,
            tags: [],
            status: "LEAD",
            isVip: false,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Could not create customer");
        finalCustomerId = json.customer.id;
      }

      const res = await fetch("/api/measurements/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: finalCustomerId, templateId: templateId || undefined, method }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not start session");

      onOpenChange(false);
      router.push(`/dashboard/measurements/sessions/${json.session.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Measurement</DialogTitle>
          <DialogDescription>Choose a customer and how you&apos;d like to record measurements.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <Label className="mb-2 block">Customer</Label>
            <CustomerPicker
              customerId={customerId}
              onSelectCustomer={(c) => setCustomerId(c?.id)}
              newCustomer={newCustomer}
              onNewCustomerChange={setNewCustomer}
            />
          </div>

          <div>
            <Label className="mb-2 block">Method</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMethod("MANUAL")}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
                  method === "MANUAL" ? "border-primary bg-accent-soft" : "border-border hover:bg-muted/50"
                )}
              >
                <Ruler className="size-5 text-primary" />
                <span className="text-sm font-medium text-foreground">Manual Entry</span>
                <span className="text-xs text-muted-foreground">Record measurements by hand.</span>
              </button>
              <button
                type="button"
                onClick={() => setMethod("PHOTO_ESTIMATION")}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
                  method === "PHOTO_ESTIMATION" ? "border-primary bg-accent-soft" : "border-border hover:bg-muted/50"
                )}
              >
                <Camera className="size-5 text-primary" />
                <span className="text-sm font-medium text-foreground">Photo Estimation</span>
                <span className="text-xs text-muted-foreground">Estimate from uploaded photos.</span>
              </button>
            </div>
          </div>

          {method === "MANUAL" && (
            <div>
              <Label className="mb-2 block">Template (optional)</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No template, free entry" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleStart} disabled={submitting}>
            {submitting ? "Starting..." : "Start Session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
