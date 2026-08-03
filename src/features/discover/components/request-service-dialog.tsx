"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MultiImageUpload } from "@/shared/components/multi-image-upload";

interface ServiceOption {
  id: string;
  name: string;
  priceMin: string | null;
  priceMax: string | null;
}

export function RequestServiceDialog({ businessId, businessName, services }: { businessId: string; businessName: string; services: ServiceOption[] }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [locationPreference, setLocationPreference] = useState("");
  const [description, setDescription] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const [step, setStep] = useState<"form" | "summary">("form");

  function reset() {
    setServiceId("");
    setPreferredDate("");
    setPreferredTime("");
    setLocationPreference("");
    setDescription("");
    setBudgetMin("");
    setBudgetMax("");
    setAdditionalNotes("");
    setAttachmentUrls([]);
    setStep("form");
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          serviceId: serviceId || undefined,
          preferredDate: preferredDate || undefined,
          preferredTime: preferredTime || undefined,
          locationPreference: locationPreference || undefined,
          description,
          budgetMin: budgetMin || undefined,
          budgetMax: budgetMax || undefined,
          additionalNotes: additionalNotes || undefined,
          attachmentUrls,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not send request");
      toast.success("Request sent!");
      setOpen(false);
      reset();
      router.push("/account/requests");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send request");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedService = services.find((s) => s.id === serviceId);
  const canSubmit = description.trim().length >= 10;

  if (status !== "authenticated" || session.user.role !== "CUSTOMER") {
    return (
      <Button className="w-full gap-1.5" onClick={() => router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`)}>
        <Sparkles className="size-4" /> Sign in to Request a Service
      </Button>
    );
  }

  return (
    <>
      <Button className="w-full gap-1.5" onClick={() => setOpen(true)}>
        <Sparkles className="size-4" /> Request a Service
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{step === "form" ? `Request a Service from ${businessName}` : "Review Your Request"}</DialogTitle>
            <DialogDescription>
              {step === "form" ? "Tell them what you need, they'll respond with availability and pricing." : "Confirm the details before sending."}
            </DialogDescription>
          </DialogHeader>

          {step === "form" ? (
            <div className="space-y-4">
              {services.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Service (optional)</Label>
                  <Select value={serviceId} onValueChange={setServiceId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                          {s.priceMin ? ` (from ${s.priceMin})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Preferred Date</Label>
                  <Input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Preferred Time</Label>
                  <Input type="time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Location Preference</Label>
                <Input
                  placeholder="e.g. At their studio, or my address"
                  value={locationPreference}
                  onChange={(e) => setLocationPreference(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Describe what you need</Label>
                <Textarea
                  rows={4}
                  placeholder="e.g. I need a custom Agbada for my wedding in December."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Budget Min (optional)</Label>
                  <Input type="number" min={0} value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Budget Max (optional)</Label>
                  <Input type="number" min={0} value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Inspiration Images (optional)</Label>
                <MultiImageUpload value={attachmentUrls} onChange={setAttachmentUrls} folder="service-requests" max={6} label="Add images" />
              </div>

              <div className="space-y-1.5">
                <Label>Additional Notes (optional)</Label>
                <Textarea rows={2} value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="rounded-xl border border-border bg-surface p-3">
                <p className="text-xs text-muted-foreground uppercase">Business</p>
                <p className="font-medium text-foreground">{businessName}</p>
              </div>
              {selectedService && (
                <div className="rounded-xl border border-border bg-surface p-3">
                  <p className="text-xs text-muted-foreground uppercase">Service</p>
                  <p className="font-medium text-foreground">{selectedService.name}</p>
                </div>
              )}
              {preferredDate && (
                <div className="rounded-xl border border-border bg-surface p-3">
                  <p className="text-xs text-muted-foreground uppercase">Preferred Date</p>
                  <p className="font-medium text-foreground">
                    {preferredDate} {preferredTime}
                  </p>
                </div>
              )}
              <div className="rounded-xl border border-border bg-surface p-3">
                <p className="text-xs text-muted-foreground uppercase">Description</p>
                <p className="text-foreground">{description}</p>
              </div>
              {attachmentUrls.length > 0 && (
                <div className="rounded-xl border border-border bg-surface p-3">
                  <p className="mb-2 text-xs text-muted-foreground uppercase">Attachments</p>
                  <div className="flex flex-wrap gap-2">
                    {attachmentUrls.map((url) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={url} src={url} alt="" className="size-14 rounded-lg object-cover" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {step === "form" ? (
              <Button className="w-full" disabled={!canSubmit} onClick={() => setStep("summary")}>
                Review Request
              </Button>
            ) : (
              <div className="flex w-full gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep("form")} disabled={submitting}>
                  Back
                </Button>
                <Button className="flex-1" onClick={submit} disabled={submitting}>
                  {submitting ? "Sending..." : "Send Request"}
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
