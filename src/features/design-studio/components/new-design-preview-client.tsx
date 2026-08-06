"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Search, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/shared/components/user-avatar";
import { ImageUpload } from "@/shared/components/image-upload";
import { ModelUpload, type ModelUploadValue } from "@/features/design-studio/components/model-upload";
import {
  DesignCustomizationForm,
  EMPTY_CUSTOMIZATION,
} from "@/features/design-studio/components/design-customization-form";
import { cn } from "@/lib/utils";
import type { DesignVersionCustomizationInput } from "@/lib/validations/design-preview";
import type { FabricLibraryItemData } from "@/features/design-gallery/types";
import type { OrderListItem, OrderDetailData, OrderItemData } from "@/features/orders/types";
import { deriveFabricTextures } from "@/features/design-studio/lib/derive-fabric-texture";

export function NewDesignPreviewClient({
  initialOrderId,
  initialOrderItemId,
}: {
  initialOrderId?: string;
  initialOrderItemId?: string;
}) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<OrderListItem[]>([]);
  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OrderItemData | null>(null);

  const [name, setName] = useState("");
  const [changesSummary, setChangesSummary] = useState("Initial design preview");
  const [notes, setNotes] = useState("");
  const [customization, setCustomization] = useState<DesignVersionCustomizationInput>(EMPTY_CUSTOMIZATION);
  const [previewMode, setPreviewMode] = useState<"2d" | "3d">("2d");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [model, setModel] = useState<ModelUploadValue | null>(null);
  const [fabrics, setFabrics] = useState<FabricLibraryItemData[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/designs/fabrics")
      .then((r) => r.json())
      .then((d) => setFabrics(d.fabrics ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (initialOrderId) {
      selectOrder(initialOrderId, initialOrderItemId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (order || !query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      fetch(`/api/orders?search=${encodeURIComponent(query)}&pageSize=20`)
        .then((res) => res.json())
        .then((data) => setResults(data.orders ?? []))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query, order]);

  async function selectOrder(orderId: string, preselectItemId?: string) {
    setOrderLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load order");
      const loadedOrder: OrderDetailData = data.order;
      setOrder(loadedOrder);
      setResults([]);
      setQuery("");
      const items = loadedOrder.items ?? [];
      if (preselectItemId) {
        setSelectedItem(items.find((i) => i.id === preselectItemId) ?? (items.length === 1 ? items[0] : null));
      } else if (items.length === 1) {
        setSelectedItem(items[0]);
      } else {
        setSelectedItem(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load order");
    } finally {
      setOrderLoading(false);
    }
  }

  function clearOrder() {
    setOrder(null);
    setSelectedItem(null);
  }

  async function handleSubmit() {
    if (!selectedItem) {
      toast.error("Select which order item this preview is for");
      return;
    }
    if (selectedItem.designPreview) {
      toast.error("This order item already has a design preview");
      return;
    }
    if (!name.trim()) {
      toast.error("Enter a design name");
      return;
    }
    if (previewMode === "3d" && !model) {
      toast.error("Upload a 3D model, or switch to 2D Image");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/design-previews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderItemId: selectedItem.id,
          name,
          version: {
            changesSummary,
            notes,
            previewImageUrl: previewMode === "2d" && previewImageUrl ? previewImageUrl : "",
            customization,
            model:
              previewMode === "3d" && model ? { format: model.format, url: model.url, fileSizeBytes: model.fileSizeBytes } : undefined,
            textures: deriveFabricTextures(previewMode === "3d" && !!model, customization.fabricId, fabrics),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create design preview");
      toast.success("Design preview created");
      router.push(`/dashboard/3d-studio/${data.preview.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create design preview");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/3d-studio"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Back to 3D Studio
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-foreground">New Design Preview</h1>
        <p className="text-sm text-muted-foreground">
          Create a 3D or 2D design preview for a customer to review and approve.
        </p>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">1. Select Order</h2>
            <p className="text-sm text-muted-foreground">Search by order code or customer name.</p>
          </div>

          {order ? (
            <div className="flex items-center gap-3 rounded-xl border border-border p-3">
              <UserAvatar
                name={`${order.customer.firstName} ${order.customer.lastName}`}
                image={order.customer.profilePhotoUrl}
                className="size-9"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{order.orderCode}</p>
                <p className="text-xs text-muted-foreground">
                  {order.customer.firstName} {order.customer.lastName} · {order.customer.customerCode}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={clearOrder}>
                Change
              </Button>
            </div>
          ) : (
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by order code or customer name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
              {(results.length > 0 || searching) && (
                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-popover shadow-lg">
                  {searching && <p className="p-3 text-xs text-muted-foreground">Searching...</p>}
                  {results.map((o) => (
                    <button
                      type="button"
                      key={o.id}
                      onClick={() => selectOrder(o.id)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <UserAvatar
                        name={`${o.customer.firstName} ${o.customer.lastName}`}
                        image={o.customer.profilePhotoUrl}
                        className="size-7"
                      />
                      <span className="font-medium text-foreground">{o.orderCode}</span>
                      <span className="text-muted-foreground">
                        {o.customer.firstName} {o.customer.lastName}
                      </span>
                    </button>
                  ))}
                  {!searching && results.length === 0 && query.trim() && (
                    <p className="p-3 text-xs text-muted-foreground">No orders found.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {order && (
        <Card className="border-none shadow-sm">
          <CardContent className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">2. Select Order Item</h2>
              <p className="text-sm text-muted-foreground">
                Which item on this order is this design preview for?
              </p>
            </div>

            {orderLoading ? (
              <p className="text-sm text-muted-foreground">Loading order items...</p>
            ) : (
              <div className="space-y-2">
                {(order.items ?? []).map((item) => {
                  const hasPreview = Boolean(item.designPreview);
                  const isSelected = selectedItem?.id === item.id;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      disabled={hasPreview}
                      onClick={() => setSelectedItem(item)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                        isSelected ? "border-primary/50 bg-accent-soft" : "border-border hover:bg-muted"
                      )}
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-primary">
                        <ShoppingBag className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.designNameSnapshot || item.customDesignDescription || "Custom design"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.designCategorySnapshot ?? "Custom"} · Qty {item.quantity}
                          {hasPreview ? ` · Already has preview ${item.designPreview?.previewCode ?? ""}` : ""}
                        </p>
                      </div>
                    </button>
                  );
                })}
                {(order.items ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">This order has no items.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedItem && (
        <Card className="border-none shadow-sm">
          <CardContent className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">3. Design Details</h2>
              <p className="text-sm text-muted-foreground">Name the design and set up its first version.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Design Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emerald Aso-Oke Gown" />
            </div>

            <div className="space-y-1.5">
              <Label>Changes Summary</Label>
              <Input
                value={changesSummary}
                onChange={(e) => setChangesSummary(e.target.value)}
                placeholder="e.g. Initial design preview"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes (optional)" />
            </div>

            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={previewMode === "2d" ? "default" : "outline"}
                  onClick={() => setPreviewMode("2d")}
                >
                  2D Image
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={previewMode === "3d" ? "default" : "outline"}
                  onClick={() => setPreviewMode("3d")}
                >
                  3D Model
                </Button>
              </div>
              {previewMode === "2d" ? (
                <ImageUpload value={previewImageUrl} onChange={setPreviewImageUrl} folder="orders" label="Upload preview image" />
              ) : (
                <ModelUpload value={model} onChange={setModel} />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="mb-1 block">Customization</Label>
              <DesignCustomizationForm mode="edit" value={customization} onChange={setCustomization} fabrics={fabrics} />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Creating..." : "Create Design Preview"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
