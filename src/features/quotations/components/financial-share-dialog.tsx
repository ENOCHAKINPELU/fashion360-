"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Link2, Mail, MessageCircle, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import type { FinancialShareData } from "@/features/quotations/types";

// Generic secure-share-link dialog, parametrized by API base and public
// review path — used for both quotations (/quotation-review) and invoices
// (/invoice-pay), mirroring Phase 7's DesignShareDialog exactly otherwise.
export function FinancialShareDialog({
  open,
  onOpenChange,
  apiBase,
  reviewPath,
  shares,
  title,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiBase: string;
  reviewPath: string;
  shares: FinancialShareData[];
  title: string;
  description: string;
}) {
  const router = useRouter();
  const [channel, setChannel] = useState<"LINK" | "EMAIL" | "WHATSAPP">("LINK");
  const [creating, setCreating] = useState(false);

  async function createShare() {
    setCreating(true);
    try {
      const res = await fetch(`${apiBase}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, expiresInDays: 30 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create share link");
      toast.success("Share link created");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create share link");
    } finally {
      setCreating(false);
    }
  }

  async function revokeShare(shareId: string) {
    const res = await fetch(`${apiBase}/shares/${shareId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not revoke share link");
      return;
    }
    toast.success("Share link revoked");
    router.refresh();
  }

  function shareUrl(token: string) {
    return `${window.location.origin}${reviewPath}/${token}`;
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(shareUrl(token));
    toast.success("Link copied to clipboard");
  }

  const activeShares = shares.filter((s) => !s.revokedAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LINK">Secure Link</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={createShare} disabled={creating} className="gap-1.5">
              <Link2 className="size-4" /> {creating ? "Creating..." : "New Link"}
            </Button>
          </div>

          {activeShares.length > 0 && (
            <div className="space-y-2">
              <Label>Active Links</Label>
              <ul className="space-y-2">
                {activeShares.map((share) => (
                  <li key={share.id} className="flex items-center gap-2 rounded-xl border border-border p-3">
                    {share.channel === "EMAIL" ? (
                      <Mail className="size-4 shrink-0 text-muted-foreground" />
                    ) : share.channel === "WHATSAPP" ? (
                      <MessageCircle className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <Link2 className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-muted-foreground">
                        Expires {share.expiresAt ? formatDate(share.expiresAt) : "never"} · Viewed{" "}
                        {share.accessCount} time{share.accessCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={() => copyLink(share.token)} aria-label="Copy link">
                      <Copy className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => revokeShare(share.id)}
                      aria-label="Revoke link"
                      className="text-danger hover:text-danger"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
