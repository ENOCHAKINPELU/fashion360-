import { ShieldCheck, ShieldQuestion, Star, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Part 8 — every value here is either real (completedOrders, from Order
// data) or an honest zero state (rating/reviews — no review system exists
// yet). Nothing here is editable by the business.
export function BusinessTrustProfileCard({
  isVerified,
  completedOrders,
  averageRating,
  reviewCount,
}: {
  isVerified: boolean;
  completedOrders: number;
  averageRating: number | null;
  reviewCount: number;
}) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Trust Profile</p>
          {isVerified ? (
            <Badge className="gap-1.5 bg-success-soft text-success hover:bg-success-soft">
              <ShieldCheck className="size-3.5" /> Verified Business
            </Badge>
          ) : (
            <Badge className="gap-1.5 bg-muted text-muted-foreground hover:bg-muted">
              <ShieldQuestion className="size-3.5" /> Not Verified
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-primary">
              <CheckCircle2 className="size-4.5" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{completedOrders}</p>
              <p className="text-xs text-muted-foreground">{completedOrders === 0 ? "No completed orders yet" : "Completed Orders"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-primary">
              <Star className="size-4.5" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{averageRating ?? "N/A"}</p>
              <p className="text-xs text-muted-foreground">{reviewCount === 0 ? "Not yet rated" : `${reviewCount} reviews`}</p>
            </div>
          </div>
        </div>

        {reviewCount === 0 && <p className="text-xs text-muted-foreground">No reviews yet, reviews will appear here once customers start leaving them.</p>}
      </CardContent>
    </Card>
  );
}
