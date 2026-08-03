"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, History, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { formatDate } from "@/lib/utils";

const EVENT_LABELS: Record<string, string> = {
  BUSINESS_CONNECTED: "Connected with a business",
  ORDER_PLACED: "Order placed",
  DESIGN_APPROVED: "Design approved",
  GARMENT_DELIVERED: "Garment delivered",
  REVIEW_LEFT: "Review left",
  OTHER: "Update",
};

interface WardrobeItem {
  id: string;
  garmentName: string;
  imageUrl: string | null;
  category: string | null;
  createdAt: string;
  readyForReorder: boolean;
}
interface FashionHistoryEntry {
  id: string;
  eventType: string;
  description: string | null;
  occurredAt: string;
}

export function WardrobePageClient({ wardrobeItems, fashionHistory }: { wardrobeItems: WardrobeItem[]; fashionHistory: FashionHistoryEntry[] }) {
  const router = useRouter();
  const [reorderTarget, setReorderTarget] = useState<WardrobeItem | null>(null);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Wardrobe</h1>
        <p className="text-sm text-muted-foreground">Your digital wardrobe and fashion history, in one place.</p>
      </div>

      <div className="space-y-4">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Wardrobe</p>
        {wardrobeItems.length === 0 ? (
          <EmptyState icon={Archive} title="Your Wardrobe Is Empty" description="Complete your first order to start building your wardrobe." />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {wardrobeItems.map((item) => (
              <Card key={item.id} className="overflow-hidden border-none shadow-sm">
                <div className="aspect-[3/4] bg-muted">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.garmentName} className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground">
                      <Archive className="size-8" />
                    </div>
                  )}
                </div>
                <CardContent className="space-y-1.5 p-3">
                  <p className="truncate text-sm font-medium text-foreground">{item.garmentName}</p>
                  {item.category && <p className="truncate text-xs text-muted-foreground">{item.category}</p>}
                  {item.readyForReorder && (
                    <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => setReorderTarget(item)}>
                      <RefreshCw className="size-3.5" /> Ready for another one?
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Fashion History</p>
        {fashionHistory.length === 0 ? (
          <EmptyState
            icon={History}
            title="No Fashion History Yet"
            description="A timeline of your milestones (orders, approvals, deliveries) will build up here as you use Fashion360."
          />
        ) : (
          <ul className="space-y-2">
            {fashionHistory.map((event) => (
              <li key={event.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">{EVENT_LABELS[event.eventType] ?? event.eventType}</p>
                  {event.description && <p className="text-xs text-muted-foreground">{event.description}</p>}
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(event.occurredAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {reorderTarget && (
        <ReorderDialog
          item={reorderTarget}
          onOpenChange={(open) => !open && setReorderTarget(null)}
          onDone={() => {
            setReorderTarget(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ReorderDialog({ item, onOpenChange, onDone }: { item: WardrobeItem; onOpenChange: (open: boolean) => void; onDone: () => void }) {
  const [changeColor, setChangeColor] = useState("");
  const [changeFabric, setChangeFabric] = useState("");
  const [requestMeasurementUpdate, setRequestMeasurementUpdate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/customer/wardrobe/${item.id}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changeColor: changeColor || undefined, changeFabric: changeFabric || undefined, requestMeasurementUpdate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send reorder request");
      toast.success("Reorder request sent");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send reorder request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => (submitting ? null : onOpenChange(v))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reorder &quot;{item.garmentName}&quot;</DialogTitle>
          <DialogDescription>We&apos;ll send this as a new request to the business.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm text-foreground">Change Color (optional)</label>
            <Input value={changeColor} onChange={(e) => setChangeColor(e.target.value)} placeholder="e.g. Navy blue" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-foreground">Change Fabric (optional)</label>
            <Input value={changeFabric} onChange={(e) => setChangeFabric(e.target.value)} placeholder="e.g. Silk" />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={requestMeasurementUpdate} onCheckedChange={(v) => setRequestMeasurementUpdate(v === true)} />
            I&apos;d like to update my measurements first
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Sending..." : "Send Reorder Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
