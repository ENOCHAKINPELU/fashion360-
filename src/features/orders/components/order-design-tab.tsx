import Link from "next/link";
import { Box, Plus, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { DesignPreviewStatusBadge } from "@/features/design-studio/components/design-preview-status-badge";
import type { OrderItemData } from "@/features/orders/types";

export function OrderDesignTab({ items }: { items: OrderItemData[] }) {
  if (items.length === 0) {
    return <EmptyState icon={Box} title="No garments on this order" className="border-none py-10" />;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card key={item.id} className="border-none shadow-sm">
          <CardContent>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-foreground">{item.designNameSnapshot ?? "Custom design"}</p>
                <p className="text-sm text-muted-foreground">{item.designCategorySnapshot ?? "N/A"}</p>
              </div>

              {item.designPreview ? (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <DesignPreviewStatusBadge status={item.designPreview.status} />
                      <span className="text-xs text-muted-foreground">
                        Version {item.designPreview.latestVersionNumber}
                        {item.designPreview.revisionCount > 0 ? ` · ${item.designPreview.revisionCount} revision(s)` : ""}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.designPreview.previewCode}</p>
                  </div>
                  <Button asChild size="sm" className="gap-1.5">
                    <Link href={`/dashboard/3d-studio/${item.designPreview.id}`}>
                      Open in 3D Studio <ArrowUpRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <Link href={`/dashboard/3d-studio/new?orderItemId=${item.id}`}>
                    <Plus className="size-3.5" /> Create Design Preview
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
