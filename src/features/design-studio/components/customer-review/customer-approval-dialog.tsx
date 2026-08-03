"use client";

import { ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Phase 7 spec section 14: approval is a real production commitment, so it
// must never be a single casual click. This dialog is the explicit
// confirmation step that has to appear before POST .../approve ever fires.
export function CustomerApprovalDialog({
  open,
  onOpenChange,
  submitting,
  onConfirm,
  versionNumber,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting: boolean;
  onConfirm: () => void;
  versionNumber?: number;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex size-11 items-center justify-center rounded-full bg-success-soft text-success">
            <ShieldCheck className="size-5" />
          </div>
          <DialogTitle className="text-lg">Approve this design?</DialogTitle>
          <DialogDescription className="space-y-2 text-sm">
            <span className="block font-medium text-foreground">
              You are approving this design for production.
            </span>
            <span className="block">
              {versionNumber ? `Version ${versionNumber} of this design` : "This design"} will be locked and sent
              into production exactly as shown. An approval certificate will be generated, and no further changes
              can be requested against this version.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={submitting}>
            {submitting ? "Approving..." : "Yes, Approve for Production"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
