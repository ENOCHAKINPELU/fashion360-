"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Heart, EyeOff, ThumbsDown, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface DesignRec {
  id: string;
  reasonText: string;
  design: { id: string; name: string; mainImageUrl: string | null; basePrice?: number | null; business?: { name: string } | null; businessId?: string } | null;
}

// Part 6/16/17: every card carries its own honest reason and the full
// feedback set (Save / Not Interested / Hide / Show More Like This) — the
// system only learns from actions taken here.
export function DesignRecommendationCard({ recommendation, onDismissed }: { recommendation: DesignRec; onDismissed: () => void }) {
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const design = recommendation.design;
  if (!design || dismissed) return null;

  async function act(action: "save" | "not-interested" | "hide") {
    setBusy(true);
    try {
      if (action === "save") {
        await fetch(`/api/recommendations/${recommendation.id}/save`, { method: "POST" });
        toast.success("Saved");
      } else {
        await fetch(`/api/recommendations/${recommendation.id}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        setDismissed(true);
        onDismissed();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="group overflow-hidden border-none shadow-sm">
      <Link href={`/account/designs/browse/${design.id}`} onClick={() => fetch(`/api/recommendations/${recommendation.id}/click`, { method: "POST" }).catch(() => {})}>
        <div className="aspect-[3/4] bg-muted">
          {design.mainImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={design.mainImageUrl} alt={design.name} className="size-full object-cover transition-transform group-hover:scale-105" />
          ) : null}
        </div>
      </Link>
      <CardContent className="space-y-1.5 p-3">
        <p className="truncate text-sm font-medium text-foreground">{design.name}</p>
        {design.business && <p className="truncate text-xs text-muted-foreground">{design.business.name}</p>}
        {design.basePrice != null && <p className="text-xs font-medium text-foreground">{formatCurrency(design.basePrice, "NGN")}</p>}
        <p className="flex items-center gap-1 text-xs text-primary">
          <Sparkles className="size-3 shrink-0" /> {recommendation.reasonText}
        </p>
        <div className="flex gap-1 pt-1">
          <Button size="icon-sm" variant="ghost" disabled={busy} onClick={() => act("save")} aria-label="Save">
            <Heart className="size-3.5" />
          </Button>
          <Button size="icon-sm" variant="ghost" disabled={busy} onClick={() => act("not-interested")} aria-label="Not interested">
            <ThumbsDown className="size-3.5" />
          </Button>
          <Button size="icon-sm" variant="ghost" disabled={busy} onClick={() => act("hide")} aria-label="Hide">
            <EyeOff className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
