"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Link2 } from "lucide-react";

export function PaymentLinkDialog({
  open,
  onOpenChange,
  invoiceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  async function createLink() {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/payment-link`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create payment link");
      setLink(data.authorizationUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create payment link");
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setLink(null);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Payment Link</DialogTitle>
          <DialogDescription>
            Generates a hosted checkout link through your connected payment gateway. The customer pays your business
            directly, Fashion360 never holds the funds.
          </DialogDescription>
        </DialogHeader>

        {link ? (
          <div className="flex items-center gap-2">
            <Input readOnly value={link} className="flex-1" />
            <Button variant="outline" size="icon" onClick={copyLink} aria-label="Copy link">
              <Copy className="size-4" />
            </Button>
          </div>
        ) : (
          <Button onClick={createLink} disabled={loading} className="gap-1.5">
            <Link2 className="size-4" /> {loading ? "Generating..." : "Generate Link"}
          </Button>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
