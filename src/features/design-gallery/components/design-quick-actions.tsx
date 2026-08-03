"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShoppingBag, CalendarPlus, Heart, Share2, Copy, Archive, Printer } from "lucide-react";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import type { DesignListItem } from "@/features/design-gallery/types";

export function DesignQuickActions({ design }: { design: DesignListItem }) {
  const router = useRouter();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  async function handleShare() {
    const url = `${window.location.origin}/dashboard/design-gallery/${design.id}`;
    await navigator.clipboard.writeText(url);
    toast.success("Design link copied to clipboard");
  }

  async function handleDuplicate() {
    setDuplicating(true);
    try {
      const res = await fetch(`/api/designs/${design.id}/duplicate`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not duplicate design");
      toast.success("Design duplicated");
      router.push(`/dashboard/design-gallery/${json.design.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setDuplicating(false);
    }
  }

  async function handleArchive() {
    const res = await fetch(`/api/designs/${design.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "archive" }),
    });
    if (!res.ok) {
      toast.error("Could not archive design");
      return;
    }
    toast.success("Design archived");
    router.refresh();
  }

  function handlePrint() {
    const win = window.open("", "_blank", "width=480,height=640");
    if (!win) {
      toast.error("Please allow pop-ups to print the design sheet");
      return;
    }
    win.document.write(`
      <html>
        <head><title>${design.name} | Fashion360</title></head>
        <body style="font-family: Inter, Arial, sans-serif; padding: 32px;">
          <h2 style="margin-bottom:4px;">${design.name}</h2>
          <p style="color:#6F7287;margin-top:0;">${design.designCode} · ${design.category?.name ?? "Uncategorized"}</p>
          ${design.mainImageUrl ? `<img src="${design.mainImageUrl}" style="max-width:100%;border-radius:12px;margin:16px 0;" />` : ""}
          <p>${design.description ?? ""}</p>
          <p>Occasion: ${design.occasion ?? "N/A"}</p>
          <p>Estimated completion: ${design.estimatedCompletionDays ? `${design.estimatedCompletionDays} days` : "N/A"}</p>
          <p>Base price: ${design.basePrice != null ? `₦${design.basePrice.toLocaleString()}` : "N/A"}</p>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  const pillClass =
    "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent-soft disabled:opacity-60";

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/dashboard/orders?designId=${design.id}`} className={pillClass}>
        <ShoppingBag className="size-3.5" /> Create Order
      </Link>
      <Link href={`/dashboard/appointments?designId=${design.id}`} className={pillClass}>
        <CalendarPlus className="size-3.5" /> Book Consultation
      </Link>
      <button onClick={handleShare} className={pillClass}>
        <Share2 className="size-3.5" /> Share Design
      </button>
      <button onClick={handleDuplicate} disabled={duplicating} className={pillClass}>
        <Copy className="size-3.5" /> Duplicate
      </button>
      <button onClick={() => setArchiveOpen(true)} className={pillClass}>
        <Archive className="size-3.5" /> Archive
      </button>
      <button onClick={handlePrint} className={pillClass}>
        <Printer className="size-3.5" /> Print Sheet
      </button>

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive design?"
        description="Archived designs are hidden from the gallery but not deleted."
        confirmLabel="Archive"
        onConfirm={handleArchive}
      />
    </div>
  );
}

export function FavoriteButton({
  designId,
  customerId,
  initialFavorited,
}: {
  designId: string;
  customerId: string;
  initialFavorited: boolean;
}) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/designs/${designId}/favorite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not update favorite");
      setFavorited(json.favorited);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent-soft disabled:opacity-60"
    >
      <Heart className={favorited ? "size-3.5 fill-primary text-primary" : "size-3.5"} />
      {favorited ? "Favorited" : "Save Favorite"}
    </button>
  );
}
