"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchInput } from "@/shared/components/search-input";
import { cn } from "@/lib/utils";
import type { OrderDesignOption } from "@/features/orders/types";

export function StepDesign({
  designId,
  selectedDesign,
  isCustomDesign,
  customDesignDescription,
  basePrice,
  onSelectDesign,
  onCustomDesignChange,
  onModeChange,
}: {
  designId?: string;
  selectedDesign: OrderDesignOption | null;
  isCustomDesign: boolean;
  customDesignDescription: string;
  basePrice: number;
  onSelectDesign: (design: OrderDesignOption) => void;
  onCustomDesignChange: (patch: { customDesignDescription?: string; basePrice?: number }) => void;
  onModeChange: (isCustom: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const [designs, setDesigns] = useState<OrderDesignOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isCustomDesign) return;
    setLoading(true);
    const handle = setTimeout(() => {
      fetch(`/api/designs?status=PUBLISHED&pageSize=60&search=${encodeURIComponent(search)}`)
        .then((res) => res.json())
        .then((data) => setDesigns(data.designs ?? []))
        .catch(() => setDesigns([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [search, isCustomDesign]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">Select Design</h2>
        <p className="text-sm text-muted-foreground">
          Pick a design from the gallery, or request a fully custom design.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={!isCustomDesign ? "default" : "outline"}
          onClick={() => onModeChange(false)}
        >
          Select from Gallery
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isCustomDesign ? "default" : "outline"}
          onClick={() => onModeChange(true)}
          className="gap-1.5"
        >
          <PenLine className="size-3.5" /> Custom Design Request
        </Button>
      </div>

      {isCustomDesign ? (
        <div className="space-y-4 rounded-2xl border border-border p-4">
          <div className="space-y-1.5">
            <Label>Custom Design Description</Label>
            <Textarea
              rows={4}
              value={customDesignDescription}
              onChange={(e) => onCustomDesignChange({ customDesignDescription: e.target.value })}
              placeholder="Describe the custom garment the customer wants..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Estimated Base Price (₦)</Label>
            <Input
              type="number"
              min="0"
              value={basePrice || ""}
              onChange={(e) => onCustomDesignChange({ basePrice: Number(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <SearchInput
            placeholder="Search designs by name, category, or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading designs...
            </div>
          ) : designs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-surface py-8 text-center text-sm text-muted-foreground">
              No published designs found.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {designs.map((design) => {
                const isSelected = design.id === designId;
                return (
                  <button
                    type="button"
                    key={design.id}
                    onClick={() => onSelectDesign(design)}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border text-left transition-colors",
                      isSelected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="aspect-square w-full overflow-hidden bg-muted">
                      {design.mainImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={design.mainImageUrl} alt={design.name} className="size-full object-cover" />
                      ) : (
                        <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3.5" />
                      </span>
                    )}
                    <div className="space-y-0.5 p-2.5">
                      <p className="truncate text-sm font-medium text-foreground">{design.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {design.category?.name ?? "Uncategorized"}
                      </p>
                      <p className="text-xs font-medium text-foreground">
                        {design.basePrice != null ? `₦${design.basePrice.toLocaleString()}` : "N/A"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
