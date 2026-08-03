"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Heart, Sparkles, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StarRating } from "@/shared/components/star-rating";
import { TrustBadgesRow } from "@/shared/components/trust-badges-row";
import { RequestServiceDialog } from "@/features/discover/components/request-service-dialog";
import { formatCurrency } from "@/lib/utils";

interface DesignDetail {
  id: string;
  name: string;
  description: string | null;
  mainImageUrl: string | null;
  basePrice: number | null;
  occasion: string | null;
  colorRecommendations: string[];
  fabricRecommendations: string[];
  business: { id: string; name: string; logoUrl: string | null; city: string | null; state: string | null };
  category: { name: string } | null;
  tags: { name: string }[];
  images: { url: string }[];
}

interface SimilarDesign {
  id: string;
  name: string;
  mainImageUrl: string | null;
  business: { name: string };
}

interface RecommendedDesigner {
  id: string;
  name: string;
  logoUrl: string | null;
  rating: { averageRating: number; totalReviews: number } | null;
  trustBadgeAssignments: { trustBadge: { type: string; label: string } }[];
}

export function DesignDetailClient({ design, initialFavorited }: { design: DesignDetail; initialFavorited: boolean }) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [similar, setSimilar] = useState<SimilarDesign[]>([]);
  const [designers, setDesigners] = useState<RecommendedDesigner[]>([]);
  const [requestOpen, setRequestOpen] = useState(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    fetch(`/api/designs/${design.id}/similar`)
      .then((r) => r.json())
      .then((d) => setSimilar(d.designs ?? []));
    fetch(`/api/designs/${design.id}/recommended-designers`)
      .then((r) => r.json())
      .then((d) => setDesigners(d.designers ?? []));
  }, [design.id]);

  async function toggleFavorite() {
    const next = !favorited;
    setFavorited(next);
    try {
      await fetch(`/api/customer/designs/${design.id}/favorite`, { method: "POST" });
      toast.success(next ? "Saved" : "Removed from saved");
    } catch {
      setFavorited(!next);
      toast.error("Something went wrong");
    }
  }

  const allImages = [design.mainImageUrl, ...design.images.map((i) => i.url)].filter((u): u is string => !!u);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-2">
          <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-muted">
            {allImages[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={allImages[0]} alt={design.name} className="size-full object-cover" />
            ) : null}
          </div>
          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {allImages.slice(1).map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{design.name}</h1>
            <Link href={`/business/${design.business.id}`} className="text-sm text-muted-foreground hover:text-primary hover:underline">
              {design.business.name}
            </Link>
          </div>

          {design.basePrice != null && <p className="text-lg font-semibold text-foreground">{formatCurrency(design.basePrice, "NGN")}</p>}
          {design.description && <p className="text-sm text-muted-foreground">{design.description}</p>}

          <div className="flex flex-wrap gap-1.5">
            {design.category && <Badge variant="outline">{design.category.name}</Badge>}
            {design.occasion && <Badge variant="outline">{design.occasion}</Badge>}
            {design.tags.map((t) => (
              <Badge key={t.name} variant="outline">
                {t.name}
              </Badge>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={toggleFavorite} variant={favorited ? "default" : "outline"} className="gap-1.5">
              <Heart className={favorited ? "size-4 fill-current" : "size-4"} /> {favorited ? "Saved" : "Save"}
            </Button>
            <RequestServiceDialog businessId={design.business.id} businessName={design.business.name} services={[]} />
            <Button variant="outline" onClick={() => setRequestOpen(true)}>
              Request Similar Design
            </Button>
          </div>
        </div>
      </div>

      {similar.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardContent>
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Show Me More Like This</p>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {similar.map((d) => (
                <Link key={d.id} href={`/account/designs/browse/${d.id}`} className="w-32 shrink-0">
                  <div className="aspect-[3/4] overflow-hidden rounded-xl bg-muted">
                    {d.mainImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.mainImageUrl} alt={d.name} className="size-full object-cover" />
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-xs text-foreground">{d.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{d.business.name}</p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {designers.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardContent>
            <div className="mb-3 flex items-center gap-2">
              <Users className="size-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Find a Designer for This Style</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {designers.map((d) => (
                <Link key={d.id} href={`/business/${d.id}`}>
                  <Card className="border-none shadow-sm">
                    <CardContent className="flex items-center gap-3 p-3">
                      {d.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.logoUrl} alt={d.name} className="size-11 shrink-0 rounded-xl object-cover ring-1 ring-border" />
                      ) : (
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-sm font-semibold text-primary">{d.name.charAt(0)}</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{d.name}</p>
                        {d.rating && d.rating.totalReviews > 0 && <StarRating value={d.rating.averageRating} />}
                        <TrustBadgesRow badges={d.trustBadgeAssignments.slice(0, 2).map((a) => a.trustBadge)} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <RequestSimilarDialog open={requestOpen} onOpenChange={setRequestOpen} designId={design.id} />
    </div>
  );
}

function RequestSimilarDialog({ open, onOpenChange, designId }: { open: boolean; onOpenChange: (open: boolean) => void; designId: string }) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/customer/designs/${designId}/request-similar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send request");
      toast.success("Request sent to the designer");
      setNote("");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (submitting ? null : onOpenChange(v))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request a similar design</DialogTitle>
        </DialogHeader>
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any specific changes you'd like? (optional)" />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Sending..." : "Send Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
