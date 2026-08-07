import Link from "next/link";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { formatDate } from "@/lib/utils";

// Server-fetched (via page.tsx, Order -> Delivery join) and passed in as
// props rather than self-fetching client-side like the other panels — there
// is no flat "list deliveries" endpoint to filter by customerId against
// (deliveries are always looked up per-order), so the join happens once in
// the page instead of adding a new API route for a single read-only tab.
export function CustomerDeliveryPanel({
  deliveries,
  customerId,
}: {
  deliveries: { id: string; status: string; trackingNumber: string | null; estimatedDeliveryDate: string | null; order: { id: string; orderCode: string } }[];
  customerId: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Delivery</p>
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/delivery?customerId=${customerId}`}>View All</Link>
        </Button>
      </div>

      {deliveries.length === 0 ? (
        <EmptyState icon={Truck} title="No deliveries" description="This customer has no orders in delivery yet." className="border-none py-8" />
      ) : (
        <ul className="space-y-2">
          {deliveries.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{d.order.orderCode}</p>
                  <Badge variant="outline" className="capitalize">{d.status.toLowerCase().replace(/_/g, " ")}</Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {d.trackingNumber ? `Tracking: ${d.trackingNumber}` : "No tracking number"}
                  {d.estimatedDeliveryDate ? ` · Est. ${formatDate(d.estimatedDeliveryDate)}` : ""}
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/dashboard/orders/${d.order.id}`}>View Order</Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
