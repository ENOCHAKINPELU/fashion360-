"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Download,
  History,
  Loader2,
  Ruler,
  ShieldAlert,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Logo } from "@/shared/components/logo";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";
import { Design3DViewer } from "@/features/design-studio/components/viewer/design-3d-viewer";
import { isDemoModelUrl } from "@/lib/design-demo-model";
import { CustomerApprovalDialog } from "@/features/design-studio/components/customer-review/customer-approval-dialog";
import { CustomerRejectDialog } from "@/features/design-studio/components/customer-review/customer-reject-dialog";
import { CustomerRevisionDialog } from "@/features/design-studio/components/customer-review/customer-revision-dialog";
import { CustomerCommentsPanel } from "@/features/design-studio/components/customer-review/customer-comments-panel";
import type {
  DesignCommentData,
  DesignRevisionRequestData,
  DesignVersionCustomizationData,
  DesignVersionData,
} from "@/features/design-studio/types";

interface DesignReviewBundle {
  preview: {
    id: string;
    previewCode: string;
    name: string;
    status: string;
    previewType: string;
    latestVersionNumber: number;
    revisionCount: number;
    measurementSnapshot: Record<string, number> | null;
    business: { id: string; name: string; logoUrl: string | null };
    customer: { id: string; firstName: string; lastName: string };
    order: {
      id: string;
      orderCode: string;
      totalValue: number;
      expectedCompletionDate: string | null;
      measurementSnapshot: Record<string, number> | null;
      measurementProfileId: string | null;
    };
  };
  versions: DesignVersionData[];
  comments: DesignCommentData[];
  revisionRequests: DesignRevisionRequestData[];
}

const FINAL_STATUSES = new Set(["APPROVED", "REJECTED", "LOCKED"]);
const APPROVED_STATUSES = new Set(["APPROVED", "LOCKED"]);

const STATUS_META: Record<string, { label: string; tone: "neutral" | "info" | "warning" | "success" | "danger" }> = {
  DRAFT: { label: "Preparing Your Design", tone: "neutral" },
  PREVIEW_READY: { label: "Preview Ready", tone: "info" },
  SENT_FOR_REVIEW: { label: "Awaiting Your Review", tone: "warning" },
  UNDER_CUSTOMER_REVIEW: { label: "Awaiting Your Review", tone: "warning" },
  REVISION_REQUESTED: { label: "Revision Requested", tone: "warning" },
  UPDATED: { label: "Updated: Ready for Review", tone: "info" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
  ARCHIVED: { label: "Archived", tone: "neutral" },
  LOCKED: { label: "Approved & Locked for Production", tone: "success" },
};

const TONE_CLASSES: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
};

const CUSTOMIZATION_FIELDS: { key: keyof DesignVersionCustomizationData; label: string; multiline?: boolean }[] = [
  { key: "fabricNameSnapshot", label: "Fabric" },
  { key: "primaryColor", label: "Primary Color" },
  { key: "secondaryColor", label: "Secondary Color" },
  { key: "pattern", label: "Pattern" },
  { key: "sleeveStyle", label: "Sleeve Style" },
  { key: "neckline", label: "Neckline" },
  { key: "collarStyle", label: "Collar Style" },
  { key: "cuffStyle", label: "Cuff Style" },
  { key: "length", label: "Length" },
  { key: "buttonStyle", label: "Button Style" },
  { key: "embroidery", label: "Embroidery" },
  { key: "pocketStyle", label: "Pocket Style" },
  { key: "lining", label: "Lining" },
  { key: "accessories", label: "Accessories" },
  { key: "otherCustomizations", label: "Other Notes", multiline: true },
];

const COLOR_FIELD_KEYS = new Set<keyof DesignVersionCustomizationData>(["primaryColor", "secondaryColor"]);

function isHexColor(value: string) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

function formatCustomizationValue(value: string | string[] | null) {
  if (value === null || value === undefined) return "N/A";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "N/A";
  return value.trim() ? value : "N/A";
}

function formatNaira(value: number) {
  return `₦${value.toLocaleString()}`;
}

function humanizeKey(key: string) {
  return key.replace(/([A-Z])/g, " $1").trim();
}

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, tone: "neutral" as const };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold",
        TONE_CLASSES[meta.tone]
      )}
    >
      <span className={cn("size-2 rounded-full", meta.tone === "success" && "bg-success", meta.tone === "warning" && "bg-warning", meta.tone === "danger" && "bg-danger", meta.tone === "info" && "bg-info", meta.tone === "neutral" && "bg-muted-foreground")} />
      {meta.label}
    </span>
  );
}

export function CustomerReviewClient({ token }: { token: string }) {
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [bundle, setBundle] = useState<DesignReviewBundle | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareAId, setCompareAId] = useState<string | null>(null);
  const [compareBId, setCompareBId] = useState<string | null>(null);

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reviseOpen, setReviseOpen] = useState(false);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const hasLoadedRef = useRef(false);

  async function load() {
    try {
      const res = await fetch(`/api/design-share/${token}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error ?? "This link is no longer valid.");
        setLoadState("error");
        return;
      }
      setBundle(data);
      setSelectedVersionId((prev) => {
        if (prev && data.versions.some((v: DesignVersionData) => v.id === prev)) return prev;
        return data.versions[0]?.id ?? null;
      });
      setLoadState("ready");
    } catch {
      setErrorMessage("Something went wrong loading this design. Please check your connection and try again.");
      setLoadState("error");
    }
  }

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const versionsAsc = useMemo(() => (bundle ? [...bundle.versions].sort((a, b) => a.versionNumber - b.versionNumber) : []), [bundle]);
  const latestVersion = bundle?.versions[0] ?? null;
  const selectedVersion = bundle?.versions.find((v) => v.id === selectedVersionId) ?? latestVersion;

  const isFinal = bundle ? FINAL_STATUSES.has(bundle.preview.status) : false;
  const isApprovedFinal = bundle ? APPROVED_STATUSES.has(bundle.preview.status) : false;
  const isRejectedFinal = bundle?.preview.status === "REJECTED";

  async function handleApprove() {
    setActionSubmitting(true);
    try {
      const res = await fetch(`/api/design-share/${token}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "APPROVED", confirm: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not approve this design");
      toast.success("Design approved, thank you! It's now locked in for production.");
      setApproveOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not approve this design");
    } finally {
      setActionSubmitting(false);
    }
  }

  async function handleReject() {
    setActionSubmitting(true);
    try {
      const res = await fetch(`/api/design-share/${token}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "REJECTED", confirm: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not reject this design");
      toast.success("Design rejected. The business has been notified.");
      setRejectOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reject this design");
    } finally {
      setActionSubmitting(false);
    }
  }

  async function handleRevise(body: string, referenceImages: string[]) {
    setActionSubmitting(true);
    try {
      const res = await fetch(`/api/design-share/${token}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, referenceImages, versionId: selectedVersion?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send your revision request");
      toast.success("Revision request sent to the designer.");
      setReviseOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send your revision request");
    } finally {
      setActionSubmitting(false);
    }
  }

  async function handleAddComment(body: string): Promise<boolean> {
    setCommentSubmitting(true);
    try {
      const res = await fetch(`/api/design-share/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, versionId: selectedVersion?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not post your comment");
      await load();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post your comment");
      return false;
    } finally {
      setCommentSubmitting(false);
    }
  }

  if (loadState === "loading") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="space-y-4">
          <Skeleton className="mx-auto h-8 w-72" />
          <Skeleton className="h-96 w-full rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (loadState === "error" || !bundle) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-14 text-center">
        <div className="mb-6">
          <Logo />
        </div>
        <div className="flex size-14 items-center justify-center rounded-full bg-danger-soft text-danger">
          <AlertTriangle className="size-6" />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-foreground">This link is no longer valid</h1>
        <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
        <p className="mt-6 text-xs text-muted-foreground">
          Please reach out to the business that shared this link with you for a fresh one.
        </p>
      </div>
    );
  }

  const { preview } = bundle;
  const customization = selectedVersion?.customization ?? null;
  const measurementEntries = preview.measurementSnapshot ? Object.entries(preview.measurementSnapshot) : [];

  const compareA = compareAId ? bundle.versions.find((v) => v.id === compareAId) ?? null : null;
  const compareB = compareBId ? bundle.versions.find((v) => v.id === compareBId) ?? null : null;

  function openCompare() {
    if (versionsAsc.length >= 2) {
      setCompareAId(versionsAsc[versionsAsc.length - 2].id);
      setCompareBId(versionsAsc[versionsAsc.length - 1].id);
    }
    setCompareOpen(true);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      {/* Header */}
      <header className="mb-6 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <div className="flex items-center gap-3">
          {preview.business.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.business.logoUrl} alt={preview.business.name} className="size-10 shrink-0 rounded-lg object-cover ring-1 ring-border" />
          ) : (
            <Logo mark />
          )}
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Design Review</p>
            <p className="font-semibold text-foreground">{preview.business.name}</p>
          </div>
        </div>
        <StatusPill status={preview.status} />
      </header>

      <div className="mb-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
          Design Review for {preview.customer.firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Order #{preview.order.orderCode} · {preview.name}
        </p>
      </div>

      {isApprovedFinal && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-success/20 bg-success-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-5 shrink-0 text-success" />
            <p className="text-sm font-medium text-success">
              This design has been approved and is locked in for production.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="border-success/30">
            <a href={`/api/design-share/${token}/approval-record/pdf`} target="_blank" rel="noopener noreferrer">
              <Download className="size-4" /> Download Certificate
            </a>
          </Button>
        </div>
      )}
      {isRejectedFinal && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-danger/20 bg-danger-soft p-4">
          <ShieldAlert className="size-5 shrink-0 text-danger" />
          <p className="text-sm font-medium text-danger">
            This design was rejected. Please contact {preview.business.name} to discuss next steps.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Left column */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
              <CardTitle>Design Preview</CardTitle>
              {versionsAsc.length > 0 && (
                <Select value={selectedVersionId ?? undefined} onValueChange={setSelectedVersionId}>
                  <SelectTrigger size="sm" className="w-44">
                    <SelectValue placeholder="Select version" />
                  </SelectTrigger>
                  <SelectContent>
                    {versionsAsc.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        Version {v.versionNumber}
                        {v.id === latestVersion?.id ? " (Current)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardHeader>
            <CardContent>
              <Design3DViewer
                model={selectedVersion?.model ? { url: selectedVersion.model.url, format: selectedVersion.model.format } : null}
                fallbackImageUrl={selectedVersion?.previewImageUrl ?? null}
                className="h-full min-h-[420px]"
                isDemo={isDemoModelUrl(selectedVersion?.model?.url)}
                textures={selectedVersion?.textures}
              />
              {selectedVersion?.changesSummary && (
                <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">What changed: </span>
                  {selectedVersion.changesSummary}
                </p>
              )}
              {versionsAsc.length > 1 && (
                <div className="mt-3">
                  <Button variant="ghost" size="sm" onClick={openCompare}>
                    <History className="size-4" /> Compare Versions
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {compareOpen && versionsAsc.length >= 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Compare Versions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {[{ id: compareAId, setId: setCompareAId, version: compareA }, { id: compareBId, setId: setCompareBId, version: compareB }].map((slot, i) => (
                    <div key={i} className="space-y-2">
                      <Select value={slot.id ?? undefined} onValueChange={slot.setId}>
                        <SelectTrigger size="sm" className="w-full">
                          <SelectValue placeholder="Select version" />
                        </SelectTrigger>
                        <SelectContent>
                          {versionsAsc.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              Version {v.versionNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="aspect-square overflow-hidden rounded-xl border border-border bg-muted">
                        {slot.version?.previewImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={slot.version.previewImageUrl} alt="" className="size-full object-cover" />
                        ) : (
                          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">No preview image</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {compareA && compareB && (
                  <div className="overflow-hidden rounded-xl border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted text-xs text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Field</th>
                          <th className="px-3 py-2 text-left font-medium">Version {compareA.versionNumber}</th>
                          <th className="px-3 py-2 text-left font-medium">Version {compareB.versionNumber}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {CUSTOMIZATION_FIELDS.map((field) => {
                          const aVal = compareA.customization?.[field.key] ?? null;
                          const bVal = compareB.customization?.[field.key] ?? null;
                          const changed = JSON.stringify(aVal) !== JSON.stringify(bVal);
                          return (
                            <tr key={field.key} className={cn("border-t border-border", changed && "bg-warning-soft/40")}>
                              <td className="px-3 py-2 font-medium text-foreground">{field.label}</td>
                              <td className="px-3 py-2 text-muted-foreground">{formatCustomizationValue(aVal)}</td>
                              <td className={cn("px-3 py-2", changed ? "font-medium text-foreground" : "text-muted-foreground")}>
                                {formatCustomizationValue(bVal)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Revision History</CardTitle>
            </CardHeader>
            <CardContent>
              {bundle.revisionRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No revisions have been requested yet.</p>
              ) : (
                <ul className="space-y-3">
                  {bundle.revisionRequests.map((rr) => (
                    <li key={rr.id} className="rounded-xl border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="capitalize">
                          {rr.status.toLowerCase().replace("_", " ")}
                        </Badge>
                        <p className="text-xs text-muted-foreground">{formatRelativeTime(rr.createdAt)}</p>
                      </div>
                      <p className="mt-2 text-sm whitespace-pre-wrap text-foreground">{rr.body}</p>
                      {rr.referenceImages.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {rr.referenceImages.map((url, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={url} alt="" className="size-14 rounded-lg border border-border object-cover" />
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerCommentsPanel
                comments={bundle.comments}
                businessName={preview.business.name}
                onAdd={handleAddComment}
                submitting={commentSubmitting}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Design Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Designed by {selectedVersion?.createdBy?.name ?? `the ${preview.business.name} team`}
              </p>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
                {CUSTOMIZATION_FIELDS.map((field) => {
                  const rawValue = customization?.[field.key] ?? null;
                  const value = formatCustomizationValue(rawValue);
                  const swatchColor = COLOR_FIELD_KEYS.has(field.key) && typeof rawValue === "string" && isHexColor(rawValue) ? rawValue : null;
                  return (
                    <div key={field.key} className={field.multiline ? "col-span-2" : undefined}>
                      <dt className="text-xs text-muted-foreground">{field.label}</dt>
                      <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-foreground">
                        {swatchColor && (
                          <span className="size-3.5 shrink-0 rounded-full border border-border" style={{ backgroundColor: swatchColor }} />
                        )}
                        <span className="break-words">{value}</span>
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ruler className="size-4 text-primary" /> Measurements Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              {measurementEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No measurements recorded for this order.</p>
              ) : (
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  {measurementEntries.map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-xs text-muted-foreground capitalize">{humanizeKey(key)}</dt>
                      <dd className="font-medium text-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                These measurements are read-only here. Contact {preview.business.name} if anything needs correcting.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Wallet className="size-4" /> Estimated Price
                </span>
                <span className="font-semibold text-foreground">{formatNaira(preview.order.totalValue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <CalendarClock className="size-4" /> Estimated Completion
                </span>
                <span className="font-semibold text-foreground">
                  {preview.order.expectedCompletionDate ? formatDate(preview.order.expectedCompletionDate) : "Not yet scheduled"}
                </span>
              </div>
            </CardContent>
          </Card>

          {!isFinal ? (
            <Card>
              <CardHeader>
                <CardTitle>Your Decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <Button className="w-full gap-1.5" onClick={() => setApproveOpen(true)}>
                  <ShieldCheck className="size-4" /> Approve Design
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setReviseOpen(true)}>
                  Request Revision
                </Button>
                <Button variant="destructive" className="w-full" onClick={() => setRejectOpen(true)}>
                  Reject Design
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Your Decision</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {isApprovedFinal
                    ? "You've already approved this design. No further action is needed."
                    : "You've rejected this design. This preview is now closed for further decisions."}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <CustomerApprovalDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        submitting={actionSubmitting}
        onConfirm={handleApprove}
        versionNumber={selectedVersion?.versionNumber}
      />
      <CustomerRejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        submitting={actionSubmitting}
        onConfirm={handleReject}
      />
      <CustomerRevisionDialog
        open={reviseOpen}
        onOpenChange={setReviseOpen}
        submitting={actionSubmitting}
        onSubmit={handleRevise}
      />

      <div className="mt-2 flex justify-center">
        {actionSubmitting && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>
    </div>
  );
}
