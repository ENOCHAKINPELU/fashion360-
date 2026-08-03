"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MultiImageUpload } from "@/shared/components/multi-image-upload";

export function CustomerRevisionDialog({
  open,
  onOpenChange,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting: boolean;
  onSubmit: (body: string, referenceImages: string[]) => void;
}) {
  const [body, setBody] = useState("");
  const [referenceImages, setReferenceImages] = useState<string[]>([]);

  function handleOpenChange(next: boolean) {
    if (submitting) return;
    onOpenChange(next);
    if (!next) {
      setBody("");
      setReferenceImages([]);
    }
  }

  function handleSubmit() {
    if (!body.trim()) return;
    onSubmit(body.trim(), referenceImages);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">Request a revision</DialogTitle>
          <DialogDescription>
            Tell the designer what you&apos;d like changed. They&apos;ll create a new version for you to review.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>What would you like changed?</Label>
            <Textarea
              rows={4}
              placeholder="e.g. Make the sleeves longer, use a darker blue, change the neckline..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Reference images (optional)</Label>
            <MultiImageUpload value={referenceImages} onChange={setReferenceImages} folder="orders" label="Add reference" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !body.trim()}>
            {submitting ? "Sending..." : "Send Revision Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
