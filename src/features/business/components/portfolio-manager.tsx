"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Plus, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageUpload } from "@/shared/components/image-upload";
import { EmptyState } from "@/shared/components/empty-state";

interface PortfolioItem {
  id: string;
  imageUrl: string;
  title: string;
  description: string | null;
  category: string | null;
}

export function PortfolioManager({ items }: { items: PortfolioItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function addItem() {
    if (!imageUrl || !title.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/business/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, title, category: category || undefined, tags: [] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not add portfolio item");
      toast.success("Added to portfolio");
      setOpen(false);
      setImageUrl(null);
      setTitle("");
      setCategory("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add portfolio item");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeItem(id: string) {
    const res = await fetch(`/api/business/portfolio/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not remove item");
      return;
    }
    toast.success("Removed from portfolio");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Portfolio</p>
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="size-3.5" /> Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={ImageIcon} title="No Portfolio Items" description="Showcase your best work, add photos of designs, collections, or finished pieces." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.id} className="group relative overflow-hidden rounded-xl border border-border bg-surface">
              <div className="aspect-square bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.imageUrl} alt={item.title} className="size-full object-cover" />
              </div>
              <div className="p-2.5">
                <p className="truncate text-xs font-medium text-foreground">{item.title}</p>
                {item.category && <p className="truncate text-xs text-muted-foreground">{item.category}</p>}
              </div>
              <button
                onClick={() => removeItem(item.id)}
                aria-label={`Remove ${item.title}`}
                className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Portfolio Item</DialogTitle>
            <DialogDescription>Add a photo of your work to your public profile.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ImageUpload value={imageUrl} onChange={setImageUrl} folder="portfolio" label="Upload image" />
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Bridal Aso Ebi Collection" />
            </div>
            <div className="space-y-1.5">
              <Label>Category (optional)</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Wedding Wear" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={addItem} disabled={submitting || !imageUrl || !title.trim()}>
              {submitting ? "Adding..." : "Add to Portfolio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
