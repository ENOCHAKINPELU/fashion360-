"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DesignImageGallery } from "@/features/design-gallery/components/design-image-gallery";
import { DesignStatusBadge } from "@/features/design-gallery/components/design-status-badge";
import { DesignTagBadge } from "@/features/design-gallery/components/design-tag-badge";
import { DesignQuickActions, FavoriteButton } from "@/features/design-gallery/components/design-quick-actions";
import { DesignNotesPanel } from "@/features/design-gallery/components/design-notes-panel";
import { RelatedDesigns } from "@/features/design-gallery/components/related-designs";
import { CustomizationPanel } from "@/features/design-gallery/components/customization-panel";
import { CustomerInspirationPanel } from "@/features/design-gallery/components/customer-inspiration-panel";
import { DesignFormDialog } from "@/features/design-gallery/components/design-form-dialog";
import type {
  DesignListItem,
  DesignCategoryOption,
  DesignCollectionOption,
  DesignCustomerOption,
  FabricLibraryItemData,
} from "@/features/design-gallery/types";

interface DesignDetail extends DesignListItem {
  fabricRecommendations: string[];
  colorRecommendations: string[];
  notes: {
    id: string;
    category: string;
    body: string;
    createdAt: string;
    author: { name: string | null } | null;
  }[];
}

export function DesignDetailClient({
  design,
  categories,
  collections,
  fabrics,
}: {
  design: DesignDetail;
  categories: DesignCategoryOption[];
  collections: DesignCollectionOption[];
  fabrics: FabricLibraryItemData[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [customer, setCustomer] = useState<DesignCustomerOption | null>(null);

  useEffect(() => {
    fetch(`/api/designs/${design.id}/view`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design.id]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
      <div className="space-y-4">
        <DesignImageGallery mainImageUrl={design.mainImageUrl} images={design.images} />
        <Card className="border-none shadow-sm">
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <DesignStatusBadge status={design.status} />
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditOpen(true)}>
                <Pencil className="size-3.5" /> Edit
              </Button>
            </div>
            {design.basePrice != null && (
              <p className="text-2xl font-semibold text-foreground">₦{design.basePrice.toLocaleString()}</p>
            )}
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Design Code</dt>
                <dd className="font-medium text-foreground">{design.designCode}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Category</dt>
                <dd className="font-medium text-foreground">{design.category?.name ?? "N/A"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Collection</dt>
                <dd className="font-medium text-foreground">{design.collection?.name ?? "N/A"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Occasion</dt>
                <dd className="font-medium text-foreground">{design.occasion ?? "N/A"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Difficulty</dt>
                <dd className="font-medium text-foreground">{design.difficulty ?? "N/A"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Est. Completion</dt>
                <dd className="font-medium text-foreground">
                  {design.estimatedCompletionDays ? `${design.estimatedCompletionDays} days` : "N/A"}
                </dd>
              </div>
            </dl>
            {design.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {design.tags.map((tag) => (
                  <DesignTagBadge key={tag.id} name={tag.name} color={tag.color} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent>
            <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Quick Actions</p>
            <DesignQuickActions design={design} />
            {customer && (
              <div className="mt-2">
                <FavoriteButton designId={design.id} customerId={customer.id} initialFavorited={false} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{design.name}</h1>
          {design.description && <p className="mt-1 text-sm text-muted-foreground">{design.description}</p>}
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="customize">Customize</TabsTrigger>
            <TabsTrigger value="inspiration">Inspiration</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="related">Related Designs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-semibold text-foreground">Recommended Fabrics</p>
                  {design.fabricRecommendations?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {design.fabricRecommendations.map((f) => (
                        <span key={f} className="rounded-full bg-accent-soft px-2.5 py-1 text-xs text-primary">
                          {f}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No fabric recommendations added.</p>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-foreground">Recommended Colours</p>
                  {design.colorRecommendations?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {design.colorRecommendations.map((c) => (
                        <span key={c} className="rounded-full bg-accent-soft px-2.5 py-1 text-xs text-primary">
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No colour recommendations added.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customize">
            <Card className="border-none shadow-sm">
              <CardContent>
                <CustomizationPanel designId={design.id} fabrics={fabrics} customer={customer} onCustomerChange={setCustomer} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inspiration">
            <Card className="border-none shadow-sm">
              <CardContent>
                <CustomerInspirationPanel customer={customer} relatedDesignId={design.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card className="border-none shadow-sm">
              <CardContent>
                <DesignNotesPanel designId={design.id} notes={design.notes} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="related">
            <Card className="border-none shadow-sm">
              <CardContent>
                <RelatedDesigns designId={design.id} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <DesignFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        design={design}
        categories={categories}
        collections={collections}
        onSaved={() => window.location.reload()}
      />
    </div>
  );
}
