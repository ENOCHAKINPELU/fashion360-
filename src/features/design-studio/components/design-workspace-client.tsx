"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Send, Gavel, FileCheck2, PlusCircle, Share2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { ImageUpload } from "@/shared/components/image-upload";
import { ModelUpload, type ModelUploadValue } from "@/features/design-studio/components/model-upload";
import { Design3DViewer } from "@/features/design-studio/components/viewer/design-3d-viewer";
import { DesignPreviewStatusBadge } from "@/features/design-studio/components/design-preview-status-badge";
import { DesignShareDialog } from "@/features/design-studio/components/design-share-dialog";
import { DesignVersionHistory } from "@/features/design-studio/components/design-version-history";
import { DesignCommentsPanel } from "@/features/design-studio/components/design-comments-panel";
import { DesignApprovalStatusPanel } from "@/features/design-studio/components/design-approval-status-panel";
import {
  DesignCustomizationForm,
  customizationDataToInput,
  EMPTY_CUSTOMIZATION,
} from "@/features/design-studio/components/design-customization-form";
import type { DesignPreviewDetailData, DesignVersionData } from "@/features/design-studio/types";
import type { DesignVersionCustomizationInput } from "@/lib/validations/design-preview";
import type { FabricLibraryItemData } from "@/features/design-gallery/types";

const DIFF_FIELDS: { key: keyof DesignVersionCustomizationInput; label: string }[] = [
  { key: "fabricNameSnapshot", label: "Fabric" },
  { key: "primaryColor", label: "Primary Colour" },
  { key: "secondaryColor", label: "Secondary Colour" },
  { key: "pattern", label: "Pattern" },
  { key: "sleeveStyle", label: "Sleeve Style" },
  { key: "neckline", label: "Neckline" },
  { key: "collarStyle", label: "Collar" },
  { key: "cuffStyle", label: "Cuff Style" },
  { key: "length", label: "Length" },
  { key: "buttonStyle", label: "Buttons" },
  { key: "embroidery", label: "Embroidery" },
  { key: "pocketStyle", label: "Pocket Style" },
  { key: "lining", label: "Lining" },
  { key: "otherCustomizations", label: "Other Customizations" },
];

function diffCustomizations(a: DesignVersionCustomizationInput, b: DesignVersionCustomizationInput) {
  const diffs: { label: string; from: string; to: string }[] = [];
  for (const field of DIFF_FIELDS) {
    const av = (a[field.key] as string) || "N/A";
    const bv = (b[field.key] as string) || "N/A";
    if (av !== bv) diffs.push({ label: field.label, from: av, to: bv });
  }
  const aAcc = a.accessories.join(", ") || "N/A";
  const bAcc = b.accessories.join(", ") || "N/A";
  if (aAcc !== bAcc) diffs.push({ label: "Accessories", from: aAcc, to: bAcc });
  return diffs;
}

function ComparisonDiff({ a, b }: { a: DesignVersionData; b: DesignVersionData }) {
  const diffs = diffCustomizations(customizationDataToInput(a.customization), customizationDataToInput(b.customization));
  if (diffs.length === 0) {
    return <p className="text-sm text-muted-foreground">No customization differences between these versions.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {diffs.map((d) => (
        <li key={d.label} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="w-32 shrink-0 text-muted-foreground">{d.label}</span>
          <span className="text-foreground">{d.from}</span>
          <span className="text-muted-foreground">→</span>
          <span className="font-medium text-foreground">{d.to}</span>
        </li>
      ))}
    </ul>
  );
}

export function DesignWorkspaceClient({ preview }: { preview: DesignPreviewDetailData }) {
  const router = useRouter();
  const [fabrics, setFabrics] = useState<FabricLibraryItemData[]>([]);

  useEffect(() => {
    fetch("/api/designs/fabrics")
      .then((r) => r.json())
      .then((d) => setFabrics(d.fabrics ?? []))
      .catch(() => {});
  }, []);

  const versions = preview.versions; // ordered desc by versionNumber
  const latestVersion = versions[0] ?? null;

  const [selectedVersionId, setSelectedVersionId] = useState<string>(latestVersion?.id ?? "");
  const [compareVersionId, setCompareVersionId] = useState<string | null>(null);

  const selectedVersion = versions.find((v) => v.id === selectedVersionId) ?? latestVersion;
  const compareVersion = compareVersionId ? versions.find((v) => v.id === compareVersionId) ?? null : null;

  const [shareOpen, setShareOpen] = useState(false);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [newVersionOpen, setNewVersionOpen] = useState(false);

  const [editingCustomization, setEditingCustomization] = useState(false);
  const [customizationDraft, setCustomizationDraft] = useState<DesignVersionCustomizationInput>(EMPTY_CUSTOMIZATION);
  const [savingCustomization, setSavingCustomization] = useState(false);

  function startEditingCustomization() {
    if (!selectedVersion) return;
    setCustomizationDraft(customizationDataToInput(selectedVersion.customization));
    setEditingCustomization(true);
  }

  async function saveCustomization() {
    if (!selectedVersion) return;
    setSavingCustomization(true);
    try {
      const res = await fetch(`/api/design-previews/${preview.id}/versions/${selectedVersion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customization: customizationDraft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save customization");
      toast.success("Customization updated");
      setEditingCustomization(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save customization");
    } finally {
      setSavingCustomization(false);
    }
  }

  async function requestApproval() {
    try {
      const res = await fetch(`/api/design-previews/${preview.id}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send for review");
      toast.success("Sent for customer review");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send for review");
    }
  }

  const pillClass =
    "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent-soft disabled:pointer-events-none disabled:opacity-50";

  const fullCustomerName = `${preview.customer.firstName} ${preview.customer.lastName}`;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/3d-studio"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Back to 3D Studio
      </Link>

      <Card className="border-none shadow-sm">
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-foreground">{preview.name}</h1>
                <span className="text-sm text-muted-foreground">{preview.previewCode}</span>
                <DesignPreviewStatusBadge status={preview.status} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Link href={`/dashboard/orders/${preview.order.id}`} className="text-muted-foreground hover:text-foreground">
                  Order {preview.order.orderCode}
                </Link>
                <span className="text-muted-foreground">·</span>
                <Link
                  href={`/dashboard/customers/${preview.customer.id}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {fullCustomerName} ({preview.customer.customerCode})
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            <button className={pillClass} onClick={() => setShareOpen(true)}>
              <Share2 className="size-3.5" /> Send to Customer
            </button>
            <button className={pillClass} onClick={() => setSendConfirmOpen(true)}>
              <Send className="size-3.5" /> Request Approval
            </button>
            <button className={pillClass} onClick={() => setDecisionOpen(true)}>
              <Gavel className="size-3.5" /> Record Decision
            </button>
            <button className={pillClass} onClick={() => setNewVersionOpen(true)}>
              <PlusCircle className="size-3.5" /> Create New Version
            </button>
            {preview.approvalRecord && (
              <a
                href={`/api/design-previews/${preview.id}/approval-record/pdf`}
                target="_blank"
                rel="noreferrer"
                className={pillClass}
              >
                <FileCheck2 className="size-3.5" /> Download Certificate
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="h-full border-none shadow-sm">
            <CardContent className="h-full space-y-4">
              {compareVersion && selectedVersion ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Version {selectedVersion.versionNumber}</p>
                    <Design3DViewer
                      model={
                        selectedVersion.model ? { url: selectedVersion.model.url, format: selectedVersion.model.format } : null
                      }
                      fallbackImageUrl={selectedVersion.previewImageUrl}
                      className="h-full min-h-[320px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Version {compareVersion.versionNumber}</p>
                    <Design3DViewer
                      model={
                        compareVersion.model ? { url: compareVersion.model.url, format: compareVersion.model.format } : null
                      }
                      fallbackImageUrl={compareVersion.previewImageUrl}
                      className="h-full min-h-[320px]"
                    />
                  </div>
                </div>
              ) : (
                <Design3DViewer
                  model={selectedVersion?.model ? { url: selectedVersion.model.url, format: selectedVersion.model.format } : null}
                  fallbackImageUrl={selectedVersion?.previewImageUrl}
                  className="h-full min-h-[420px]"
                />
              )}

              {compareVersion && selectedVersion && (
                <div className="rounded-xl border border-border bg-surface p-4">
                  <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Customization Differences
                  </p>
                  <ComparisonDiff a={selectedVersion} b={compareVersion} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="h-full border-none shadow-sm">
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Customization</p>
                {selectedVersion?.status === "DRAFT" &&
                  !compareVersion &&
                  (editingCustomization ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditingCustomization(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={saveCustomization} disabled={savingCustomization}>
                        {savingCustomization ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={startEditingCustomization}>
                      Edit
                    </Button>
                  ))}
              </div>
              {selectedVersion && (
                <DesignCustomizationForm
                  mode={editingCustomization ? "edit" : "readonly"}
                  value={editingCustomization ? customizationDraft : customizationDataToInput(selectedVersion.customization)}
                  onChange={setCustomizationDraft}
                  fabrics={fabrics}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent>
          <Tabs defaultValue="versions">
            <TabsList>
              <TabsTrigger value="versions">Version History</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
              <TabsTrigger value="approval">Approval Status</TabsTrigger>
            </TabsList>
            <TabsContent value="versions" className="pt-4">
              <DesignVersionHistory
                versions={versions}
                selectedVersionId={selectedVersion?.id ?? ""}
                onSelectVersion={(id) => {
                  setSelectedVersionId(id);
                  setEditingCustomization(false);
                }}
                compareVersionId={compareVersionId}
                onToggleCompare={setCompareVersionId}
              />
            </TabsContent>
            <TabsContent value="comments" className="pt-4">
              <DesignCommentsPanel previewId={preview.id} comments={preview.comments} />
            </TabsContent>
            <TabsContent value="approval" className="pt-4">
              <DesignApprovalStatusPanel
                previewId={preview.id}
                status={preview.status}
                revisionRequests={preview.revisionRequests}
                approvals={preview.approvals}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <DesignShareDialog open={shareOpen} onOpenChange={setShareOpen} previewId={preview.id} shares={preview.shares} />

      <ConfirmDialog
        open={sendConfirmOpen}
        onOpenChange={setSendConfirmOpen}
        title="Send latest version for customer review?"
        description="The current draft version will become active and the customer will be notified to review and approve it."
        confirmLabel="Send for Review"
        onConfirm={requestApproval}
      />

      <NewVersionDialog
        open={newVersionOpen}
        onOpenChange={setNewVersionOpen}
        previewId={preview.id}
        fabrics={fabrics}
        baseCustomization={selectedVersion ? customizationDataToInput(selectedVersion.customization) : EMPTY_CUSTOMIZATION}
      />

      <DecisionDialog
        open={decisionOpen}
        onOpenChange={setDecisionOpen}
        previewId={preview.id}
        versionId={latestVersion?.id ?? ""}
        versionNumber={latestVersion?.versionNumber ?? 0}
      />
    </div>
  );
}

function NewVersionDialog({
  open,
  onOpenChange,
  previewId,
  fabrics,
  baseCustomization,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewId: string;
  fabrics: FabricLibraryItemData[];
  baseCustomization: DesignVersionCustomizationInput;
}) {
  const router = useRouter();
  const [changesSummary, setChangesSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [previewMode, setPreviewMode] = useState<"2d" | "3d">("2d");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [model, setModel] = useState<ModelUploadValue | null>(null);
  const [customization, setCustomization] = useState<DesignVersionCustomizationInput>(baseCustomization);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setCustomization(baseCustomization);
      setChangesSummary("");
      setNotes("");
      setPreviewImageUrl(null);
      setModel(null);
      setPreviewMode("2d");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/design-previews/${previewId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changesSummary,
          notes,
          previewImageUrl: previewMode === "2d" && previewImageUrl ? previewImageUrl : "",
          customization,
          model:
            previewMode === "3d" && model ? { format: model.format, url: model.url, fileSizeBytes: model.fileSizeBytes } : undefined,
          textures: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create new version");
      toast.success(`Version ${data.version.versionNumber} created`);
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create new version");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Version</DialogTitle>
          <DialogDescription>
            Iterate on this design, typically used after reviewing a revision request. The new version starts as a
            draft.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Changes Summary</Label>
            <Input
              value={changesSummary}
              onChange={(e) => setChangesSummary(e.target.value)}
              placeholder="What changed in this version?"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes (optional)" />
          </div>

          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={previewMode === "2d" ? "default" : "outline"}
                onClick={() => setPreviewMode("2d")}
              >
                2D Image
              </Button>
              <Button
                type="button"
                size="sm"
                variant={previewMode === "3d" ? "default" : "outline"}
                onClick={() => setPreviewMode("3d")}
              >
                3D Model
              </Button>
            </div>
            {previewMode === "2d" ? (
              <ImageUpload value={previewImageUrl} onChange={setPreviewImageUrl} folder="orders" label="Upload preview image" />
            ) : (
              <ModelUpload value={model} onChange={setModel} />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="mb-1 block">Customization</Label>
            <DesignCustomizationForm mode="edit" value={customization} onChange={setCustomization} fabrics={fabrics} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Creating..." : "Create Version"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DecisionDialog({
  open,
  onOpenChange,
  previewId,
  versionId,
  versionNumber,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewId: string;
  versionId: string;
  versionNumber: number;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setDecision("APPROVED");
      setConfirmed(false);
    }
  }, [open]);

  async function submit() {
    if (!versionId) {
      toast.error("No version to decide on");
      return;
    }
    if (!confirmed) {
      toast.error("Please confirm before recording this decision");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/design-previews/${previewId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, confirm: true, versionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not record decision");
      toast.success(decision === "APPROVED" ? "Design approved" : "Design rejected");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record decision");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Approval Decision</DialogTitle>
          <DialogDescription>
            Record a decision taken outside the customer portal (e.g. verbal sign-off) for version {versionNumber}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={decision === "APPROVED" ? "default" : "outline"}
              onClick={() => setDecision("APPROVED")}
            >
              Approve
            </Button>
            <Button
              type="button"
              size="sm"
              variant={decision === "REJECTED" ? "destructive" : "outline"}
              onClick={() => setDecision("REJECTED")}
            >
              Reject
            </Button>
          </div>

          <label className="flex items-start gap-2.5 rounded-xl border border-border bg-surface p-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span>
              {decision === "APPROVED"
                ? "You are approving this design for production. This will lock the version and generate an approval certificate."
                : "You are rejecting this design. The customer and team will be notified to revise it."}
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant={decision === "REJECTED" ? "destructive" : "default"}
            onClick={submit}
            disabled={submitting || !confirmed}
          >
            {submitting ? "Recording..." : "Record Decision"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
