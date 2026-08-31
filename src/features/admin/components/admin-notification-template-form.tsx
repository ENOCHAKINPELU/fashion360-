"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface TemplateFormProps {
  id: string;
  name: string;
  titleTemplate: string;
  bodyTemplate: string;
  isActive: boolean;
}

// Admin Phase 10 — editing a template's wording. Key/channel/event are
// fixed at creation (these eight are the starter set from
// lib/notification-templates.ts's DEFAULT_TEMPLATES) — only the copy and
// active state are editable here, which is genuinely all the spec asks
// for ("reusable templates ... support placeholders").
export function EditTemplateDialog({ id, name, titleTemplate, bodyTemplate, isActive }: TemplateFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(titleTemplate);
  const [body, setBody] = useState(bodyTemplate);
  const [active, setActive] = useState(isActive);
  const [submitting, setSubmitting] = useState(false);

  async function save() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/notification-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titleTemplate: title, bodyTemplate: body, isActive: active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save template");
      toast.success("Template updated");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save template");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setOpen(true)}>
        <Pencil className="size-3.5" /> Edit
      </Button>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit &quot;{name}&quot;</DialogTitle>
          <DialogDescription>Use {"{{placeholder}}"} tokens — anything not filled in at send time is left as literal text, so a typo is easy to spot.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="tpl-title">Title template</Label>
            <Input id="tpl-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-body">Body template</Label>
            <Textarea id="tpl-body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={2000} />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="tpl-active" checked={active} onCheckedChange={setActive} />
            <Label htmlFor="tpl-active">Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={submitting}>
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
