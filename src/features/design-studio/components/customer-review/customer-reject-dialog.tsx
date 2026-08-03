"use client";

import { XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function CustomerRejectDialog({
  open,
  onOpenChange,
  submitting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex size-11 items-center justify-center rounded-full bg-danger-soft text-danger">
            <XCircle className="size-5" />
          </div>
          <DialogTitle className="text-lg">Reject this design?</DialogTitle>
          <DialogDescription className="space-y-2 text-sm">
            <span className="block font-medium text-foreground">
              Are you sure you want to reject this design?
            </span>
            <span className="block">
              The designer will need to create a new version. If you just want a change made, consider
              &ldquo;Request Revision&rdquo; instead, it keeps this design moving without starting over.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={submitting}>
            {submitting ? "Rejecting..." : "Yes, Reject Design"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
