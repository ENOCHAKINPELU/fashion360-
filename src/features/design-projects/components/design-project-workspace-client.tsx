"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Send, PlusCircle, Upload, Trash2, MessageSquareWarning } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { ImageUpload } from "@/shared/components/image-upload";
import { ModelUpload, type ModelUploadValue } from "@/features/design-studio/components/model-upload";
import { Design3DViewer } from "@/features/design-studio/components/viewer/design-3d-viewer";
import { DesignProjectStatusBadge } from "@/features/design-projects/components/design-project-status-badge";
import { CreateQuotationDialog } from "@/features/quotations/components/create-quotation-dialog";
import { designReferenceTypeOptions } from "@/lib/validations/design-project";
import { formatRelativeTime } from "@/lib/utils";
import type { DesignTextureData } from "@/features/design-studio/types";
import type { FabricLibraryItemData } from "@/features/design-gallery/types";

interface DesignVersionLite {
  id: string;
  versionNumber: number;
  status: string;
  previewType: string;
  previewImageUrl: string | null;
  changesSummary: string | null;
  designName: string | null;
  description: string | null;
  fabric: string | null;
  color: string | null;
  styleNotes: string | null;
  designInstructions: string | null;
  estimatedProductionDays: number | null;
  tags: string[];
  internalNotes: string | null;
  model: { url: string; format: string } | null;
  textures: DesignTextureData[];
}

interface Bundle {
  project: {
    id: string;
    name: string;
    previewCode: string;
    status: string;
    description: string | null;
    category: string | null;
    latestVersionNumber: number;
    assignedDesignerId: string | null;
  };
  customerProfile: { id: string; user: { name: string | null; email: string; image: string | null } } | null;
  brief: Record<string, unknown> | null;
  references: { id: string; fileUrl: string; title: string; type: string; description: string | null }[];
  versions: DesignVersionLite[];
  revisionRequests: {
    id: string;
    body: string;
    status: string;
    changeCategory: string | null;
    isPostApproval: boolean;
    reason: string | null;
    referenceImages: string[];
    createdAt: string;
  }[];
  comments: { id: string; body: string; authorType: string; author: { name: string | null } | null; createdAt: string }[];
  activities: { id: string; title: string; description: string | null; actorType: string; createdAt: string }[];
  approvalRecord: { id: string; approvedAt: string } | null;
  serviceRequest: { id: string; requestCode: string } | null;
  designers: { id: string; name: string | null }[];
  quotation: { id: string; quotationNumber: string; status: string; orderId: string | null } | null;
  currency: string;
}

export function DesignProjectWorkspaceClient({ bundle }: { bundle: Bundle }) {
  const router = useRouter();
  const { project, customerProfile, brief, references, versions, revisionRequests, comments, activities, approvalRecord, serviceRequest, designers, quotation, currency } =
    bundle;

  const [selectedVersionId, setSelectedVersionId] = useState<string>(versions[0]?.id ?? "");
  const selectedVersion = versions.find((v) => v.id === selectedVersionId) ?? versions[0] ?? null;

  const [newVersionOpen, setNewVersionOpen] = useState(false);
  const [addReferenceOpen, setAddReferenceOpen] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [assignedDesignerId, setAssignedDesignerId] = useState(project.assignedDesignerId ?? "");
  const [savingAssignee, setSavingAssignee] = useState(false);

  const latestVersion = versions[0] ?? null;
  const canCreateVersion = project.status !== "DESIGN_LOCKED" && project.status !== "CANCELLED";
  const canSubmitLatest = latestVersion && latestVersion.status === "DRAFT" && project.status !== "DESIGN_LOCKED";

  const customerName = customerProfile?.user.name ?? customerProfile?.user.email ?? "Customer";

  async function saveAssignee(nextId: string) {
    setAssignedDesignerId(nextId);
    setSavingAssignee(true);
    try {
      const res = await fetch(`/api/business/design-projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedDesignerId: nextId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not assign designer");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not assign designer");
    } finally {
      setSavingAssignee(false);
    }
  }

  async function submitForReview() {
    if (!latestVersion) return;
    try {
      const res = await fetch(`/api/business/design-projects/${project.id}/versions/${latestVersion.id}/submit`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit for review");
      toast.success("Sent to customer for review");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit for review");
    }
  }

  async function deleteReference(refId: string) {
    try {
      const res = await fetch(`/api/business/design-projects/${project.id}/references/${refId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not remove reference");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove reference");
    }
  }

  async function respondToRevision(reqId: string, action: "accept" | "reject" | "ask-clarification", responseNote?: string) {
    try {
      const res = await fetch(`/api/business/design-projects/${project.id}/revision-requests/${reqId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, responseNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not respond");
      toast.success("Response sent");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not respond");
    }
  }

  const pillClass =
    "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent-soft disabled:pointer-events-none disabled:opacity-50";

  const briefFields: { key: string; label: string }[] = [
    { key: "whatCustomerWants", label: "What the customer wants" },
    { key: "occasion", label: "Occasion" },
    { key: "preferredStyle", label: "Preferred style" },
    { key: "preferredFabric", label: "Preferred fabric" },
    { key: "inspiration", label: "Inspiration" },
    { key: "thingsToAvoid", label: "Things to avoid" },
    { key: "specialRequirements", label: "Special requirements" },
    { key: "additionalNotes", label: "Additional notes" },
  ];

  return (
    <div className="space-y-6">
      <Link href="/dashboard/design-projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Back to Design Projects
      </Link>

      <Card className="border-none shadow-sm">
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-foreground">{project.name}</h1>
                <span className="text-sm text-muted-foreground">{project.previewCode}</span>
                <DesignProjectStatusBadge status={project.status} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{customerName}</span>
                {serviceRequest && (
                  <>
                    <span>·</span>
                    <Link href={`/dashboard/service-requests/${serviceRequest.id}`} className="hover:text-foreground">
                      {serviceRequest.requestCode}
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div className="w-56 space-y-1.5">
              <Label className="text-xs">Assigned Designer</Label>
              <Select value={assignedDesignerId || "unassigned"} onValueChange={(v) => saveAssignee(v === "unassigned" ? "" : v)} disabled={savingAssignee}>
                <SelectTrigger className="w-full" size="sm">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {designers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name ?? "Unnamed staff"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            {canCreateVersion && (
              <button className={pillClass} onClick={() => setNewVersionOpen(true)}>
                <PlusCircle className="size-3.5" /> {versions.length === 0 ? "Create First Version" : "Create New Version"}
              </button>
            )}
            {canSubmitLatest && (
              <button className={pillClass} onClick={() => setSubmitConfirmOpen(true)}>
                <Send className="size-3.5" /> Submit for Customer Review
              </button>
            )}
            <button className={pillClass} onClick={() => setAddReferenceOpen(true)}>
              <Upload className="size-3.5" /> Add Reference
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="h-full border-none shadow-sm">
            <CardContent className="h-full space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Design Preview</p>
                {versions.length > 0 && (
                  <Select value={selectedVersionId} onValueChange={setSelectedVersionId}>
                    <SelectTrigger size="sm" className="w-44">
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      {versions.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          Version {v.versionNumber}
                          {v.id === latestVersion?.id ? " (Latest)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {versions.length === 0 ? (
                <div className="flex h-96 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
                  No versions yet, create the first one to get started.
                </div>
              ) : (
                <Design3DViewer
                  model={selectedVersion?.model ? { url: selectedVersion.model.url, format: selectedVersion.model.format } : null}
                  fallbackImageUrl={selectedVersion?.previewImageUrl}
                  className="h-full min-h-[420px]"
                  textures={selectedVersion?.textures}
                />
              )}

              {selectedVersion && (
                <div className="rounded-xl border border-border bg-surface p-4 text-sm">
                  <p className="font-medium text-foreground">{selectedVersion.designName ?? project.name}</p>
                  {selectedVersion.description && <p className="mt-1 text-muted-foreground">{selectedVersion.description}</p>}
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:grid-cols-3">
                    {selectedVersion.fabric && (
                      <div>
                        <dt className="text-muted-foreground">Fabric</dt>
                        <dd className="font-medium text-foreground">{selectedVersion.fabric}</dd>
                      </div>
                    )}
                    {selectedVersion.color && (
                      <div>
                        <dt className="text-muted-foreground">Color</dt>
                        <dd className="font-medium text-foreground">{selectedVersion.color}</dd>
                      </div>
                    )}
                    {selectedVersion.estimatedProductionDays != null && (
                      <div>
                        <dt className="text-muted-foreground">Est. Production</dt>
                        <dd className="font-medium text-foreground">{selectedVersion.estimatedProductionDays} days</dd>
                      </div>
                    )}
                  </dl>
                  {selectedVersion.internalNotes && (
                    <p className="mt-3 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
                      <span className="font-semibold">Internal notes (not visible to customer): </span>
                      {selectedVersion.internalNotes}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardContent>
              <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Customer Design Brief</p>
              {!brief || briefFields.every((f) => !brief[f.key]) ? (
                <p className="text-sm text-muted-foreground">The customer hasn&apos;t filled in their brief yet.</p>
              ) : (
                <dl className="space-y-2.5 text-sm">
                  {briefFields.map(
                    (f) =>
                      Boolean(brief[f.key]) && (
                        <div key={f.key}>
                          <dt className="text-xs text-muted-foreground">{f.label}</dt>
                          <dd className="text-foreground">{String(brief[f.key])}</dd>
                        </div>
                      )
                  )}
                  {Array.isArray(brief.preferredColors) && brief.preferredColors.length > 0 && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Preferred colors</dt>
                      <dd className="text-foreground">{(brief.preferredColors as string[]).join(", ")}</dd>
                    </div>
                  )}
                </dl>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardContent>
              <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">References</p>
              {references.length === 0 ? (
                <p className="text-sm text-muted-foreground">No references uploaded yet.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {references.map((ref) => (
                    <div key={ref.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ref.fileUrl} alt={ref.title} className="size-full object-cover" />
                      <button
                        onClick={() => deleteReference(ref.id)}
                        className="absolute top-1 right-1 hidden rounded-full bg-black/60 p-1 text-white group-hover:block"
                        aria-label="Remove reference"
                      >
                        <Trash2 className="size-3" />
                      </button>
                      <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1.5 py-0.5 text-[10px] text-white">{ref.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent>
          <Tabs defaultValue="revisions">
            <TabsList>
              <TabsTrigger value="revisions">Feedback &amp; Revisions</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="revisions" className="space-y-3 pt-4">
              {revisionRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No feedback or change requests yet.</p>
              ) : (
                revisionRequests.map((rr) => (
                  <div key={rr.id} className="rounded-xl border border-border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {rr.status.toLowerCase().replace("_", " ")}
                      </Badge>
                      {rr.changeCategory && <Badge variant="outline">{rr.changeCategory}</Badge>}
                      {rr.isPostApproval && (
                        <Badge className="bg-warning-soft text-warning">
                          <MessageSquareWarning className="mr-1 size-3" /> Post-Approval
                        </Badge>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground">{formatRelativeTime(rr.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm whitespace-pre-wrap text-foreground">{rr.body}</p>
                    {rr.reason && <p className="mt-1 text-xs text-muted-foreground">Reason: {rr.reason}</p>}
                    {rr.referenceImages.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {rr.referenceImages.map((url, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={url} alt="" className="size-14 rounded-lg border border-border object-cover" />
                        ))}
                      </div>
                    )}
                    {rr.status === "OPEN" && (
                      <RevisionResponseActions onRespond={(action, note) => respondToRevision(rr.id, action, note)} />
                    )}
                  </div>
                ))
              )}
            </TabsContent>
            <TabsContent value="comments" className="pt-4">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet.</p>
              ) : (
                <ul className="space-y-3">
                  {comments.map((c) => (
                    <li key={c.id} className="rounded-xl border border-border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{c.authorType === "CUSTOMER" ? customerName : (c.author?.name ?? "Team")}</span>
                        <span className="text-xs text-muted-foreground">{formatRelativeTime(c.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-muted-foreground">{c.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
            <TabsContent value="activity" className="pt-4">
              <ul className="space-y-3">
                {activities.map((a) => (
                  <li key={a.id} className="flex gap-3">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    <div>
                      <p className="text-sm text-foreground">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(a.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {approvalRecord && (
        <Card className="border-none border-success/20 bg-success-soft shadow-sm">
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-medium text-success">
              Design approved and locked on {new Date(approvalRecord.approvedAt).toLocaleDateString()}.
              {!quotation && " Ready for quotation."}
            </p>
            {quotation ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/dashboard/quotations/${quotation.id}`}>
                  View Quotation {quotation.quotationNumber} · {quotation.status}
                </Link>
              </Button>
            ) : (
              <div className="w-56">
                <CreateQuotationDialog designPreviewId={project.id} currency={currency} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <NewVersionDialog open={newVersionOpen} onOpenChange={setNewVersionOpen} projectId={project.id} />
      <AddReferenceDialog open={addReferenceOpen} onOpenChange={setAddReferenceOpen} projectId={project.id} />
      <ConfirmDialog
        open={submitConfirmOpen}
        onOpenChange={setSubmitConfirmOpen}
        title="Send this version to the customer?"
        description="The customer will be notified to review this version and can approve it or request changes."
        confirmLabel="Submit for Review"
        onConfirm={submitForReview}
      />
    </div>
  );
}

function RevisionResponseActions({ onRespond }: { onRespond: (action: "accept" | "reject" | "ask-clarification", note?: string) => void }) {
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState<"reject" | "clarify" | null>(null);

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      {showNote ? (
        <div className="space-y-2">
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={showNote === "reject" ? "Why are you declining this?" : "What do you need clarified?"}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={showNote === "reject" ? "destructive" : "default"}
              onClick={() => {
                onRespond(showNote === "reject" ? "reject" : "ask-clarification", note);
                setShowNote(null);
                setNote("");
              }}
            >
              Send
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowNote(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => onRespond("accept")}>
            Accept &amp; Create Revision
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowNote("clarify")}>
            Ask for Clarification
          </Button>
          <Button size="sm" variant="outline" className="text-danger" onClick={() => setShowNote("reject")}>
            Decline
          </Button>
        </div>
      )}
    </div>
  );
}

function NewVersionDialog({ open, onOpenChange, projectId }: { open: boolean; onOpenChange: (open: boolean) => void; projectId: string }) {
  const router = useRouter();
  const [designName, setDesignName] = useState("");
  const [description, setDescription] = useState("");
  const [fabric, setFabric] = useState("");
  const [fabricLibraryItemId, setFabricLibraryItemId] = useState("");
  const [fabrics, setFabrics] = useState<FabricLibraryItemData[]>([]);
  const [color, setColor] = useState("");
  const [styleNotes, setStyleNotes] = useState("");
  const [designInstructions, setDesignInstructions] = useState("");
  const [estimatedProductionDays, setEstimatedProductionDays] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [changesSummary, setChangesSummary] = useState("");
  const [previewMode, setPreviewMode] = useState<"2d" | "3d">("2d");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [model, setModel] = useState<ModelUploadValue | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/designs/fabrics")
      .then((r) => r.json())
      .then((d) => setFabrics(d.fabrics ?? []))
      .catch(() => setFabrics([]));
  }, [open]);

  function reset() {
    setDesignName("");
    setDescription("");
    setFabric("");
    setFabricLibraryItemId("");
    setColor("");
    setStyleNotes("");
    setDesignInstructions("");
    setEstimatedProductionDays("");
    setInternalNotes("");
    setChangesSummary("");
    setPreviewMode("2d");
    setPreviewImageUrl(null);
    setModel(null);
  }

  async function submit() {
    if (!designName.trim()) {
      toast.error("Give this design a name");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/business/design-projects/${projectId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designName: designName.trim(),
          description,
          fabric,
          fabricLibraryItemId,
          color,
          styleNotes,
          designInstructions,
          estimatedProductionDays,
          tags: [],
          internalNotes,
          changesSummary,
          previewImageUrl: previewMode === "2d" && previewImageUrl ? previewImageUrl : "",
          model: previewMode === "3d" && model ? { format: model.format, url: model.url, fileSizeBytes: model.fileSizeBytes } : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create version");
      toast.success(`Version ${data.version.versionNumber} created`);
      onOpenChange(false);
      reset();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create version");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (submitting ? null : onOpenChange(v))}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Design Version</DialogTitle>
          <DialogDescription>Customer-facing details below; internal notes are never shown to the customer.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Design Name</Label>
              <Input value={designName} onChange={(e) => setDesignName(e.target.value)} disabled={submitting} />
            </div>
            <div className="space-y-1.5">
              <Label>Changes Summary</Label>
              <Input value={changesSummary} onChange={(e) => setChangesSummary(e.target.value)} placeholder="What changed?" disabled={submitting} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} disabled={submitting} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Fabric</Label>
              {fabrics.length > 0 ? (
                <Select
                  value={fabricLibraryItemId || "custom"}
                  onValueChange={(v) => {
                    if (v === "custom") {
                      setFabricLibraryItemId("");
                      return;
                    }
                    const f = fabrics.find((x) => x.id === v);
                    setFabricLibraryItemId(v);
                    setFabric(f?.name ?? "");
                  }}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Type manually</SelectItem>
                    {fabrics.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              {(fabricLibraryItemId === "" || fabrics.length === 0) && (
                <Input
                  value={fabric}
                  onChange={(e) => setFabric(e.target.value)}
                  disabled={submitting}
                  placeholder={fabrics.length > 0 ? "Or type a fabric name" : undefined}
                  className={fabrics.length > 0 ? "mt-1.5" : undefined}
                />
              )}
              {fabricLibraryItemId && !fabrics.find((f) => f.id === fabricLibraryItemId)?.imageUrl && (
                <p className="text-[11px] text-warning">
                  This fabric has no reference photo yet, so it won&apos;t render as a 3D material until one is added in the Design Gallery.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <Input value={color} onChange={(e) => setColor(e.target.value)} disabled={submitting} />
            </div>
            <div className="space-y-1.5">
              <Label>Est. Production Days</Label>
              <Input value={estimatedProductionDays} onChange={(e) => setEstimatedProductionDays(e.target.value.replace(/\D/g, ""))} disabled={submitting} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Style Notes</Label>
            <Textarea rows={2} value={styleNotes} onChange={(e) => setStyleNotes(e.target.value)} disabled={submitting} />
          </div>
          <div className="space-y-1.5">
            <Label>Design Instructions</Label>
            <Textarea rows={2} value={designInstructions} onChange={(e) => setDesignInstructions(e.target.value)} disabled={submitting} />
          </div>

          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={previewMode === "2d" ? "default" : "outline"} onClick={() => setPreviewMode("2d")}>
                2D Image
              </Button>
              <Button type="button" size="sm" variant={previewMode === "3d" ? "default" : "outline"} onClick={() => setPreviewMode("3d")}>
                3D Model
              </Button>
            </div>
            {previewMode === "2d" ? (
              <ImageUpload value={previewImageUrl} onChange={setPreviewImageUrl} folder="designs" label="Upload preview image" />
            ) : (
              <ModelUpload value={model} onChange={setModel} />
            )}
          </div>

          <div className="space-y-1.5 rounded-xl border border-warning/30 bg-warning-soft p-3">
            <Label>Internal Notes (never shown to customer)</Label>
            <Textarea rows={2} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} disabled={submitting} />
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

function AddReferenceDialog({ open, onOpenChange, projectId }: { open: boolean; onOpenChange: (open: boolean) => void; projectId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>("OTHER");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!fileUrl || !title.trim()) {
      toast.error("Add a title and upload an image");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/business/design-projects/${projectId}/references`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl, title: title.trim(), type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add reference");
      toast.success("Reference added");
      onOpenChange(false);
      setTitle("");
      setFileUrl(null);
      setType("OTHER");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add reference");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (submitting ? null : onOpenChange(v))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Reference</DialogTitle>
          <DialogDescription>Sketches, fabric swatches, or inspiration images for this project.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={submitting} />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {designReferenceTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Image</Label>
            <ImageUpload value={fileUrl} onChange={setFileUrl} folder="design-references" label="Upload reference image" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Adding..." : "Add Reference"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
