"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Ruler, Share2, X, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { MEASUREMENT_FIELDS } from "@/lib/validations/measurement";
import { valuesForDisplay } from "@/lib/measurement-conversion";
import { formatDate } from "@/lib/utils";

interface Grant {
  id: string;
  scope: string;
  business: { id: string; name: string } | null;
}

interface CurrentVersion {
  id: string;
  versionNumber: number;
  status: string;
  values: Record<string, number>;
  createdAt: string;
}

interface VaultProfile {
  id: string;
  name: string;
  isDefault: boolean;
  status: string;
  preferredUnit: "METRIC" | "IMPERIAL";
  updatedAt: string;
  currentVersion: CurrentVersion | null;
  accessGrants: Grant[];
}

interface PendingAccessRequest {
  id: string;
  reason: string;
  business: { name: string };
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PENDING_REVIEW: "bg-warning-soft text-warning",
  CONFIRMED: "bg-success-soft text-success",
  ARCHIVED: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending Your Review",
  CONFIRMED: "Confirmed",
  ARCHIVED: "Archived",
};

export function MeasurementVaultManager({
  profiles,
  connectedBusinesses,
  pendingAccessRequests,
}: {
  profiles: VaultProfile[];
  connectedBusinesses: { businessId: string; businessName: string }[];
  pendingAccessRequests: PendingAccessRequest[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<VaultProfile | null>(null);
  const [correctionTarget, setCorrectionTarget] = useState<VaultProfile | null>(null);

  async function respondToAccessRequest(id: string, action: "allow" | "decline") {
    const res = await fetch(`/api/customer-profile/measurement-access-requests/${id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      toast.error(json?.error ?? "Could not respond to this request");
      return;
    }
    toast.success(action === "allow" ? "Access granted" : "Request declined");
    router.refresh();
  }

  async function confirmProfile(id: string) {
    const res = await fetch(`/api/customer-profile/measurement-vault/${id}/confirm`, { method: "POST" });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      toast.error(json?.error ?? "Could not confirm measurements");
      return;
    }
    toast.success("Measurements confirmed");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {pendingAccessRequests.length > 0 && (
        <div className="space-y-2 rounded-xl border border-warning/30 bg-warning-soft p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-warning uppercase">
            <AlertTriangle className="size-3.5" /> Access Requests
          </p>
          {pendingAccessRequests.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface p-2.5 text-sm">
              <div>
                <p className="font-medium text-foreground">{r.business.name}</p>
                <p className="text-xs text-muted-foreground">{r.reason}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => respondToAccessRequest(r.id, "allow")}>
                  Allow
                </Button>
                <Button size="sm" variant="outline" onClick={() => respondToAccessRequest(r.id, "decline")}>
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">My Measurement Vault</p>
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="size-3.5" /> Add Profile
        </Button>
      </div>

      {profiles.length === 0 ? (
        <EmptyState
          icon={Ruler}
          title="No Measurement Profiles Yet"
          description="Create your own measurement profile, it stays with you and you decide which businesses can see it."
        />
      ) : (
        <div className="space-y-4">
          {profiles.map((p) => {
            const displayValues = p.currentVersion ? valuesForDisplay(p.currentVersion.values, p.preferredUnit) : {};
            return (
              <Card key={p.id} className="border-none shadow-sm">
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                        {p.isDefault && <Badge className="bg-accent-soft text-primary hover:bg-accent-soft">Default</Badge>}
                        <Badge className={STATUS_STYLES[p.status] ?? STATUS_STYLES.DRAFT}>{STATUS_LABELS[p.status] ?? p.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Version {p.currentVersion?.versionNumber ?? 0} · Updated {formatDate(p.updatedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.status === "PENDING_REVIEW" && (
                        <>
                          <Button size="sm" className="gap-1.5" onClick={() => confirmProfile(p.id)}>
                            <CheckCircle2 className="size-3.5" /> Confirm
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setCorrectionTarget(p)}>
                            Request Correction
                          </Button>
                        </>
                      )}
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShareTarget(p)}>
                        <Share2 className="size-3.5" /> Share
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-danger"
                        onClick={async () => {
                          const res = await fetch(`/api/customer-profile/measurement-vault/${p.id}`, { method: "DELETE" });
                          if (!res.ok) {
                            toast.error("Could not remove profile");
                            return;
                          }
                          toast.success("Profile removed");
                          router.refresh();
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm sm:grid-cols-5">
                    {MEASUREMENT_FIELDS.filter((f) => displayValues[f.key] != null).map((f) => (
                      <div key={f.key}>
                        <dt className="text-xs text-muted-foreground">{f.label}</dt>
                        <dd className="font-medium text-foreground">
                          {displayValues[f.key]} {p.preferredUnit === "METRIC" ? "cm" : "in"}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    <span className="text-xs text-muted-foreground">Shared with:</span>
                    {p.accessGrants.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">No one, this profile is private to you</span>
                    ) : (
                      p.accessGrants.map((g) => (
                        <Badge key={g.id} variant="outline" className="gap-1.5">
                          {g.scope === "SHARED_WITH_APPROVED_BUSINESSES" ? "All Connected Businesses" : (g.business?.name ?? "Business")}
                          <button
                            aria-label="Revoke access"
                            onClick={async () => {
                              const res = await fetch(`/api/customer-profile/measurement-vault/${p.id}/access/${g.id}`, { method: "DELETE" });
                              if (!res.ok) {
                                toast.error("Could not revoke access");
                                return;
                              }
                              toast.success("Access revoked");
                              router.refresh();
                            }}
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AddProfileDialog open={open} onOpenChange={setOpen} onCreated={() => router.refresh()} />
      <ShareDialog profile={shareTarget} businesses={connectedBusinesses} onOpenChange={() => setShareTarget(null)} onShared={() => router.refresh()} />
      <CorrectionDialog profile={correctionTarget} onOpenChange={() => setCorrectionTarget(null)} onSubmitted={() => router.refresh()} />
    </div>
  );
}

function AddProfileDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<"METRIC" | "IMPERIAL">("METRIC");
  const [isDefault, setIsDefault] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setName("");
    setUnit("METRIC");
    setIsDefault(false);
    setValues({});
    setNotes("");
  }

  async function submit() {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const numericValues = Object.fromEntries(
        Object.entries(values)
          .filter(([, v]) => v.trim() !== "")
          .map(([k, v]) => [k, Number(v)])
      );
      const res = await fetch("/api/customer-profile/measurement-vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, unit, isDefault, values: numericValues, notes: notes || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not create profile");
      toast.success("Measurement profile created");
      reset();
      onOpenChange(false);
      onCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create profile");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Measurement Profile</DialogTitle>
          <DialogDescription>Your own measurements, you choose who can see them.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Profile Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My Measurements" />
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v as "METRIC" | "IMPERIAL")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="METRIC">Centimeters</SelectItem>
                  <SelectItem value="IMPERIAL">Inches</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {MEASUREMENT_FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label className="text-xs">{f.label}</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes" />
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={isDefault} onCheckedChange={(v) => setIsDefault(v === true)} />
            Set as default profile
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || !name.trim()}>
            {submitting ? "Saving..." : "Save Profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShareDialog({
  profile,
  businesses,
  onOpenChange,
  onShared,
}: {
  profile: VaultProfile | null;
  businesses: { businessId: string; businessName: string }[];
  onOpenChange: () => void;
  onShared: () => void;
}) {
  const [businessId, setBusinessId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const alreadySharedIds = new Set((profile?.accessGrants ?? []).map((g) => g.business?.id).filter(Boolean));
  const alreadySharedWithAll = (profile?.accessGrants ?? []).some((g) => g.scope === "SHARED_WITH_APPROVED_BUSINESSES");
  const available = businesses.filter((b) => !alreadySharedIds.has(b.businessId));

  async function share(scope: "SHARED_WITH_BUSINESS" | "SHARED_WITH_APPROVED_BUSINESSES") {
    if (!profile) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/customer-profile/measurement-vault/${profile.id}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, businessId: scope === "SHARED_WITH_BUSINESS" ? businessId : undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not share this profile");
      toast.success("Sharing updated");
      setBusinessId("");
      onOpenChange();
      onShared();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not share this profile");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={!!profile} onOpenChange={(v) => !v && onOpenChange()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share &ldquo;{profile?.name}&rdquo;</DialogTitle>
          <DialogDescription>Only businesses you explicitly share with can see this profile.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {businesses.length === 0
                ? "Connect with a business first, then you can share your measurements with them."
                : "This profile is already shared with everyone you're connected to."}
            </p>
          ) : (
            <div className="space-y-1.5">
              <Label>Share with a business</Label>
              <div className="flex gap-2">
                <Select value={businessId} onValueChange={setBusinessId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a business" />
                  </SelectTrigger>
                  <SelectContent>
                    {available.map((b) => (
                      <SelectItem key={b.businessId} value={b.businessId}>
                        {b.businessName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => share("SHARED_WITH_BUSINESS")} disabled={!businessId || submitting}>
                  Share
                </Button>
              </div>
            </div>
          )}

          {!alreadySharedWithAll && businesses.length > 1 && (
            <Button variant="outline" className="w-full" onClick={() => share("SHARED_WITH_APPROVED_BUSINESSES")} disabled={submitting}>
              Share with all connected businesses
            </Button>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onOpenChange}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CorrectionDialog({
  profile,
  onOpenChange,
  onSubmitted,
}: {
  profile: VaultProfile | null;
  onOpenChange: () => void;
  onSubmitted: () => void;
}) {
  const [fieldKey, setFieldKey] = useState("");
  const [requestedValue, setRequestedValue] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const available = profile?.currentVersion ? Object.keys(profile.currentVersion.values) : [];

  async function submit() {
    if (!profile?.currentVersion || !fieldKey || !requestedValue.trim() || !reason.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/customer-profile/measurement-vault/${profile.id}/request-correction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionId: profile.currentVersion.id,
          fieldKey,
          requestedValue: Number(requestedValue),
          unit: profile.preferredUnit,
          reason,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not send correction request");
      toast.success("Correction requested");
      setFieldKey("");
      setRequestedValue("");
      setReason("");
      onOpenChange();
      onSubmitted();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send correction request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={!!profile} onOpenChange={(v) => !v && onOpenChange()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request a Correction</DialogTitle>
          <DialogDescription>Flag one measurement as wrong, the business will review your request.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Measurement</Label>
            <Select value={fieldKey} onValueChange={setFieldKey}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a measurement" />
              </SelectTrigger>
              <SelectContent>
                {MEASUREMENT_FIELDS.filter((f) => available.includes(f.key)).map((f) => (
                  <SelectItem key={f.key} value={f.key}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Correct Value ({profile?.preferredUnit === "METRIC" ? "cm" : "in"})</Label>
            <Input type="number" min={0} step="0.1" value={requestedValue} onChange={(e) => setRequestedValue(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What's wrong with this measurement?" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onOpenChange} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || !fieldKey || !requestedValue.trim() || !reason.trim()}>
            {submitting ? "Sending..." : "Send Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
