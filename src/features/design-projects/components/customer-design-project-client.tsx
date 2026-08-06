"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, MapPin, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Logo } from "@/shared/components/logo";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";
import { Design3DViewer } from "@/features/design-studio/components/viewer/design-3d-viewer";
import { isDemoModelUrl } from "@/lib/design-demo-model";
import type { DesignTextureData } from "@/features/design-studio/types";
import { CustomerApprovalDialog } from "@/features/design-studio/components/customer-review/customer-approval-dialog";
import { DesignProjectStatusBadge } from "@/features/design-projects/components/design-project-status-badge";
import { MultiImageUpload } from "@/shared/components/multi-image-upload";
import { changeCategoryOptions } from "@/lib/validations/design-project";

interface VersionLite {
  id: string;
  versionNumber: number;
  status: string;
  previewImageUrl: string | null;
  changesSummary: string | null;
  designName: string | null;
  description: string | null;
  fabric: string | null;
  color: string | null;
  styleNotes: string | null;
  designInstructions: string | null;
  tags: string[];
  model: { url: string; format: string } | null;
  textures: DesignTextureData[];
  createdAt: string;
}

interface Bundle {
  project: {
    id: string;
    name: string;
    previewCode: string;
    status: string;
    category: string | null;
    latestVersionNumber: number;
  };
  brief: Record<string, unknown> | null;
  references: { id: string; fileUrl: string; title: string; type: string }[];
  versions: VersionLite[];
  revisionRequests: { id: string; body: string; status: string; changeCategory: string | null; isPostApproval: boolean; createdAt: string }[];
  comments: { id: string; body: string; authorType: string; author: { name: string | null } | null; createdAt: string }[];
  activities: { id: string; title: string; createdAt: string }[];
  approvalRecord: { id: string; approvedAt: string } | null;
  serviceRequest: { id: string; requestCode: string } | null;
  business: { id: string; name: string; logoUrl: string | null; slug: string };
  assignedDesigner: { id: string; name: string | null } | null;
  quotation: { id: string; quotationNumber: string; status: string; orderId: string | null } | null;
}

interface Annotation {
  id: string;
  x: number;
  y: number;
  body: string;
  authorType: string;
  createdAt: string;
}

const BRIEF_FIELDS: { key: string; label: string; placeholder?: string }[] = [
  { key: "whatCustomerWants", label: "What do you want made?" },
  { key: "occasion", label: "Occasion" },
  { key: "preferredStyle", label: "Preferred style" },
  { key: "preferredFabric", label: "Preferred fabric" },
  { key: "inspiration", label: "Inspiration" },
  { key: "thingsToAvoid", label: "Things to avoid" },
  { key: "specialRequirements", label: "Special requirements" },
  { key: "additionalNotes", label: "Additional notes" },
];

const EDITABLE_BRIEF_STATUSES = new Set(["DRAFT", "DESIGN_IN_PROGRESS"]);

export function CustomerDesignProjectClient({ projectId }: { projectId: string }) {
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  const [approveOpen, setApproveOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [changeRequestOpen, setChangeRequestOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const hasLoadedRef = useRef(false);
  const hasViewedRef = useRef(false);

  async function load() {
    try {
      const res = await fetch(`/api/customer/design-projects/${projectId}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error ?? "Could not load this design project.");
        setLoadState("error");
        return;
      }
      setBundle(data);
      setSelectedVersionId((prev) => {
        if (prev && data.versions.some((v: VersionLite) => v.id === prev)) return prev;
        return data.versions[0]?.id ?? null;
      });
      setLoadState("ready");

      if (!hasViewedRef.current) {
        hasViewedRef.current = true;
        fetch(`/api/customer/design-projects/${projectId}/view`, { method: "POST" }).catch(() => {});
      }
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
  }, [projectId]);

  useEffect(() => {
    if (!selectedVersionId) return;
    fetch(`/api/customer/design-projects/${projectId}/versions/${selectedVersionId}/annotations`)
      .then((r) => r.json())
      .then((d) => setAnnotations(d.annotations ?? []))
      .catch(() => setAnnotations([]));
  }, [projectId, selectedVersionId]);

  const versionsAsc = useMemo(() => (bundle ? [...bundle.versions].sort((a, b) => a.versionNumber - b.versionNumber) : []), [bundle]);
  const latestVersion = bundle?.versions[0] ?? null;
  const selectedVersion = bundle?.versions.find((v) => v.id === selectedVersionId) ?? latestVersion;

  async function handleApprove() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/customer/design-projects/${projectId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not approve this design");
      toast.success("Design approved, it's now locked for production.");
      setApproveOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not approve this design");
    } finally {
      setSubmitting(false);
    }
  }

  async function addPin(x: number, y: number, body: string) {
    if (!selectedVersion) return;
    try {
      const res = await fetch(`/api/customer/design-projects/${projectId}/versions/${selectedVersion.id}/annotations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: selectedVersion.id, x, y, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add note");
      setAnnotations((prev) => [...prev, data.annotation]);
      toast.success("Note pinned");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add note");
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
        </div>
      </div>
    );
  }

  if (loadState === "error" || !bundle) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-14 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-danger-soft text-danger">
          <AlertTriangle className="size-6" />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-foreground">Couldn&apos;t load this design</h1>
        <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
      </div>
    );
  }

  const { project, brief, business, assignedDesigner } = bundle;
  const briefEditable = EDITABLE_BRIEF_STATUSES.has(project.status);
  const isReviewable = project.status === "CUSTOMER_REVIEW";
  const isLocked = project.status === "DESIGN_LOCKED";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <header className="mb-6 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <div className="flex items-center gap-3">
          {business.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logoUrl} alt={business.name} className="size-10 shrink-0 rounded-lg object-cover ring-1 ring-border" />
          ) : (
            <Logo mark />
          )}
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Design Project</p>
            <p className="font-semibold text-foreground">{business.name}</p>
          </div>
        </div>
        <DesignProjectStatusBadge status={project.status} />
      </header>

      <div className="mb-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{project.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {project.previewCode}
          {assignedDesigner ? ` · Designer: ${assignedDesigner.name}` : ""}
        </p>
      </div>

      {isLocked && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-success/20 bg-success-soft p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-5 shrink-0 text-success" />
            <p className="text-sm font-medium text-success">
              {bundle.quotation ? "This design is approved and locked." : "This design is approved and locked, a quotation is coming soon."}
            </p>
          </div>
          {bundle.quotation && (
            <Button asChild size="sm" variant="outline" className="border-success/30">
              <a href={`/account/quotations/${bundle.quotation.id}`}>
                View Quotation {bundle.quotation.quotationNumber}
              </a>
            </Button>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
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
            <CardContent className="space-y-3">
              {!selectedVersion ? (
                <div className="flex h-80 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
                  Your designer hasn&apos;t shared a design yet.
                </div>
              ) : (
                <>
                  <Design3DViewer
                    model={selectedVersion.model ? { url: selectedVersion.model.url, format: selectedVersion.model.format } : null}
                    fallbackImageUrl={selectedVersion.previewImageUrl}
                    className="h-full min-h-[380px]"
                    isDemo={isDemoModelUrl(selectedVersion.model?.url)}
                    textures={selectedVersion.textures}
                  />
                  {selectedVersion.changesSummary && (
                    <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">What changed: </span>
                      {selectedVersion.changesSummary}
                    </p>
                  )}
                  {selectedVersion.previewImageUrl && (
                    <AnnotatablePreview
                      imageUrl={selectedVersion.previewImageUrl}
                      annotations={annotations}
                      canAdd={isReviewable}
                      onAdd={addPin}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feedback &amp; Change Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {bundle.revisionRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">You haven&apos;t requested any changes yet.</p>
              ) : (
                <ul className="space-y-3">
                  {bundle.revisionRequests.map((rr) => (
                    <li key={rr.id} className="rounded-xl border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {rr.status.toLowerCase().replace("_", " ")}
                          </Badge>
                          {rr.changeCategory && <Badge variant="outline">{rr.changeCategory}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{formatRelativeTime(rr.createdAt)}</p>
                      </div>
                      <p className="mt-2 text-sm whitespace-pre-wrap text-foreground">{rr.body}</p>
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
              <CommentsThread projectId={projectId} comments={bundle.comments} businessName={business.name} onPosted={load} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {selectedVersion && (
            <Card>
              <CardHeader>
                <CardTitle>Design Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow label="Designer" value={assignedDesigner?.name ?? "Not Assigned"} />
                {project.category && <DetailRow label="Category" value={project.category} />}
                {selectedVersion.fabric && <DetailRow label="Fabric" value={selectedVersion.fabric} />}
                {selectedVersion.color && <DetailRow label="Color" value={selectedVersion.color} />}
                <DetailRow label="Version Created" value={formatDate(selectedVersion.createdAt)} />
                {(selectedVersion.styleNotes || selectedVersion.designInstructions) && (
                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Designer Notes</p>
                    <p className="mt-1 text-sm text-foreground">
                      &ldquo;{selectedVersion.styleNotes || selectedVersion.designInstructions}&rdquo;
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Your Design Brief</CardTitle>
            </CardHeader>
            <CardContent>
              <BriefEditor projectId={projectId} brief={brief} editable={briefEditable} onSaved={load} />
            </CardContent>
          </Card>

          {!isReviewable && !isLocked ? (
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {project.status === "CHANGES_REQUESTED" || project.status === "REVISION_IN_PROGRESS"
                    ? "Your designer is working on your requested changes. We'll notify you when it's ready to review."
                    : "Your designer is working on your design. We'll notify you as soon as it's ready to review."}
                </p>
              </CardContent>
            </Card>
          ) : isReviewable ? (
            <Card>
              <CardHeader>
                <CardTitle>Your Decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <Button className="w-full gap-1.5" onClick={() => setApproveOpen(true)}>
                  <ShieldCheck className="size-4" /> Approve Design
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setFeedbackOpen(true)}>
                  Request Changes
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Need something changed?</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" onClick={() => setChangeRequestOpen(true)}>
                  Request a Change
                </Button>
              </CardContent>
            </Card>
          )}

          {bundle.references.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>References</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-2">
                {bundle.references.map((ref) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={ref.id} src={ref.fileUrl} alt={ref.title} className="aspect-square rounded-lg border border-border object-cover" />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <CustomerApprovalDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        submitting={submitting}
        onConfirm={handleApprove}
        versionNumber={selectedVersion?.versionNumber}
      />
      <FeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        versionId={selectedVersion?.id ?? ""}
        projectId={projectId}
        onDone={load}
      />
      <ChangeRequestDialog open={changeRequestOpen} onOpenChange={setChangeRequestOpen} projectId={projectId} onDone={load} />
    </div>
  );
}

function AnnotatablePreview({
  imageUrl,
  annotations,
  canAdd,
  onAdd,
}: {
  imageUrl: string;
  annotations: Annotation[];
  canAdd: boolean;
  onAdd: (x: number, y: number, body: string) => void;
}) {
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [note, setNote] = useState("");
  const imgRef = useRef<HTMLDivElement>(null);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!canAdd) return;
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPending({ x, y });
    setNote("");
  }

  function submitPin() {
    if (!pending || !note.trim()) return;
    onAdd(pending.x, pending.y, note.trim());
    setPending(null);
    setNote("");
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin className="size-3.5" />
        {canAdd ? "Click anywhere on the image below to pin a specific note." : "Pinned notes on this version:"}
      </div>
      <div
        ref={imgRef}
        onClick={handleClick}
        className={cn("relative overflow-hidden rounded-xl border border-border", canAdd && "cursor-crosshair")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="w-full select-none" draggable={false} />
        {annotations.map((a) => (
          <span
            key={a.id}
            title={a.body}
            className="absolute flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-primary text-[10px] font-bold text-primary-foreground shadow"
            style={{ left: `${a.x}%`, top: `${a.y}%` }}
          >
            !
          </span>
        ))}
        {pending && (
          <span
            className="absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-warning shadow"
            style={{ left: `${pending.x}%`, top: `${pending.y}%` }}
          />
        )}
      </div>
      {pending && (
        <div className="mt-2 flex gap-2">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What would you like changed here?" autoFocus />
          <Button size="sm" onClick={submitPin} disabled={!note.trim()}>
            Pin
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPending(null)}>
            Cancel
          </Button>
        </div>
      )}
      {annotations.length > 0 && (
        <ul className="mt-2 space-y-1">
          {annotations.map((a) => (
            <li key={a.id} className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{a.authorType === "CUSTOMER" ? "You" : "Designer"}:</span> {a.body}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function BriefEditor({
  projectId,
  brief,
  editable,
  onSaved,
}: {
  projectId: string;
  brief: Record<string, unknown> | null;
  editable: boolean;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(BRIEF_FIELDS.map((f) => [f.key, (brief?.[f.key] as string) ?? ""]))
  );
  const [colorsText, setColorsText] = useState(Array.isArray(brief?.preferredColors) ? (brief!.preferredColors as string[]).join(", ") : "");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/customer/design-projects/${projectId}/brief`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          preferredColors: colorsText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          referenceImageUrls: Array.isArray(brief?.referenceImageUrls) ? brief!.referenceImageUrls : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save your brief");
      toast.success("Brief saved");
      setEditing(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your brief");
    } finally {
      setSaving(false);
    }
  }

  if (!editable && !editing) {
    const hasContent = BRIEF_FIELDS.some((f) => values[f.key]);
    if (!hasContent) return <p className="text-sm text-muted-foreground">No brief was provided.</p>;
    return (
      <dl className="space-y-2.5 text-sm">
        {BRIEF_FIELDS.map((f) =>
          values[f.key] ? (
            <div key={f.key}>
              <dt className="text-xs text-muted-foreground">{f.label}</dt>
              <dd className="text-foreground">{values[f.key]}</dd>
            </div>
          ) : null
        )}
      </dl>
    );
  }

  return (
    <div className="space-y-3">
      {BRIEF_FIELDS.map((f) => (
        <div key={f.key} className="space-y-1">
          <Label className="text-xs">{f.label}</Label>
          {f.key === "whatCustomerWants" || f.key === "additionalNotes" ? (
            <Textarea
              rows={2}
              value={values[f.key]}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              disabled={saving}
            />
          ) : (
            <Input value={values[f.key]} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} disabled={saving} />
          )}
        </div>
      ))}
      <div className="space-y-1">
        <Label className="text-xs">Preferred colors (comma-separated)</Label>
        <Input value={colorsText} onChange={(e) => setColorsText(e.target.value)} disabled={saving} />
      </div>
      <Button size="sm" onClick={save} disabled={saving} className="w-full">
        {saving ? "Saving..." : "Save Brief"}
      </Button>
    </div>
  );
}

function FeedbackDialog({
  open,
  onOpenChange,
  versionId,
  projectId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versionId: string;
  projectId: string;
  onDone: () => void;
}) {
  const [changeCategory, setChangeCategory] = useState<string>("");
  const [body, setBody] = useState("");
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function handleOpenChange(next: boolean) {
    if (submitting) return;
    onOpenChange(next);
    if (!next) {
      setBody("");
      setChangeCategory("");
      setReferenceImages([]);
    }
  }

  async function submit() {
    if (!body.trim() || !versionId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/customer/design-projects/${projectId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionId,
          changeCategory: changeCategory || undefined,
          body: body.trim(),
          referenceImages,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send your feedback");
      toast.success("Feedback sent to your designer");
      handleOpenChange(false);
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send your feedback");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">Request changes</DialogTitle>
          <DialogDescription>Tell your designer what you&apos;d like changed. They&apos;ll create a new version for you to review.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>What kind of change?</Label>
            <Select value={changeCategory} onValueChange={setChangeCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a category (optional)" />
              </SelectTrigger>
              <SelectContent>
                {changeCategoryOptions.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Describe the change</Label>
            <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} disabled={submitting} />
          </div>
          <div className="space-y-1.5">
            <Label>Reference images (optional)</Label>
            <MultiImageUpload value={referenceImages} onChange={setReferenceImages} folder="design-references" label="Add reference" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || !body.trim()}>
            {submitting ? "Sending..." : "Send Feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangeRequestDialog({
  open,
  onOpenChange,
  projectId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onDone: () => void;
}) {
  const [requestedChange, setRequestedChange] = useState("");
  const [reason, setReason] = useState("");
  const [referenceImageUrl, setReferenceImageUrl] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function handleOpenChange(next: boolean) {
    if (submitting) return;
    onOpenChange(next);
    if (!next) {
      setRequestedChange("");
      setReason("");
      setReferenceImageUrl([]);
    }
  }

  async function submit() {
    if (!requestedChange.trim() || !reason.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/customer/design-projects/${projectId}/change-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestedChange: requestedChange.trim(),
          reason: reason.trim(),
          referenceImageUrl: referenceImageUrl[0] || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send your request");
      toast.success("Change request sent to the business");
      handleOpenChange(false);
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send your request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">Request a change to your locked design</DialogTitle>
          <DialogDescription>
            Your design is already approved and locked. If accepted, this will create a new version and you&apos;ll need to
            approve it again before it&apos;s locked in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>What would you like changed?</Label>
            <Textarea rows={3} value={requestedChange} onChange={(e) => setRequestedChange(e.target.value)} disabled={submitting} />
          </div>
          <div className="space-y-1.5">
            <Label>Why do you need this change?</Label>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} disabled={submitting} />
          </div>
          <div className="space-y-1.5">
            <Label>Reference image (optional)</Label>
            <MultiImageUpload value={referenceImageUrl} onChange={(v) => setReferenceImageUrl(v.slice(-1))} folder="design-references" label="Add reference" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || !requestedChange.trim() || !reason.trim()}>
            {submitting ? "Sending..." : "Send Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CommentsThread({
  projectId,
  comments,
  businessName,
  onPosted,
}: {
  projectId: string;
  comments: { id: string; body: string; authorType: string; author: { name: string | null } | null; createdAt: string }[];
  businessName: string;
  onPosted: () => void;
}) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/customer/design-projects/${projectId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not post your comment");
      setBody("");
      onPosted();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post your comment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-xl border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{c.authorType === "CUSTOMER" ? "You" : (c.author?.name ?? businessName)}</span>
                <span className="text-xs text-muted-foreground">{formatRelativeTime(c.createdAt)}</span>
              </div>
              <p className="mt-1 text-muted-foreground">{c.body}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a comment..." disabled={submitting} />
        <Button size="sm" onClick={submit} disabled={submitting || !body.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}
