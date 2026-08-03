"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiImageUpload } from "@/shared/components/multi-image-upload";
import type { OrderCustomizationData } from "@/features/orders/types";

interface FabricOption {
  id: string;
  name: string;
}

const STYLE_FIELDS: { key: keyof OrderCustomizationData; label: string; placeholder: string }[] = [
  { key: "sleeveStyle", label: "Sleeve Style", placeholder: "e.g. Bell sleeve" },
  { key: "neckline", label: "Neckline", placeholder: "e.g. V-neck" },
  { key: "collarStyle", label: "Collar", placeholder: "e.g. Mandarin collar" },
  { key: "buttonStyle", label: "Buttons", placeholder: "e.g. Horn buttons" },
  { key: "embroidery", label: "Embroidery", placeholder: "e.g. Gold thread" },
  { key: "length", label: "Length", placeholder: "e.g. Knee length" },
  { key: "pocketStyle", label: "Pocket Style", placeholder: "e.g. Welt pockets" },
  { key: "cuffStyle", label: "Cuff Style", placeholder: "e.g. French cuff" },
  { key: "lining", label: "Lining", placeholder: "e.g. Silk lining" },
];

export function StepCustomization({
  customization,
  onChange,
}: {
  customization: OrderCustomizationData;
  onChange: (patch: Partial<OrderCustomizationData>) => void;
}) {
  const [fabrics, setFabrics] = useState<FabricOption[]>([]);

  useEffect(() => {
    fetch("/api/designs/fabrics")
      .then((res) => res.json())
      .then((data) => setFabrics(data.fabrics ?? []))
      .catch(() => setFabrics([]));
  }, []);

  function updateFabric(id: string) {
    if (id === "none") {
      onChange({ fabricId: null, fabricNameSnapshot: null });
      return;
    }
    const fabric = fabrics.find((f) => f.id === id);
    onChange({ fabricId: id, fabricNameSnapshot: fabric?.name ?? null });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Customize Design</h2>
        <p className="text-sm text-muted-foreground">
          Capture the fabric, colors, and construction details for this order.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Fabric</Label>
          <Select value={customization.fabricId || "none"} onValueChange={updateFabric}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select fabric" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No fabric selected</SelectItem>
              {fabrics.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Primary Colour</Label>
          <Input
            value={customization.primaryColor ?? ""}
            onChange={(e) => onChange({ primaryColor: e.target.value })}
            placeholder="#6C3CF0 or colour name"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Secondary Colour</Label>
          <Input
            value={customization.secondaryColor ?? ""}
            onChange={(e) => onChange({ secondaryColor: e.target.value })}
            placeholder="Optional accent colour"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Pattern</Label>
          <Input
            value={customization.pattern ?? ""}
            onChange={(e) => onChange({ pattern: e.target.value })}
            placeholder="e.g. Ankara print, Stripes"
          />
        </div>
        {STYLE_FIELDS.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label>{field.label}</Label>
            <Input
              value={(customization[field.key] as string) ?? ""}
              onChange={(e) => onChange({ [field.key]: e.target.value } as Partial<OrderCustomizationData>)}
              placeholder={field.placeholder}
            />
          </div>
        ))}
        <div className="space-y-1.5">
          <Label>Accessories</Label>
          <Input
            value={customization.accessories.join(", ")}
            onChange={(e) =>
              onChange({ accessories: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) })
            }
            placeholder="Comma-separated, e.g. Belt, Brooch"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Custom Instructions</Label>
        <Textarea
          rows={3}
          value={customization.customInstructions ?? ""}
          onChange={(e) => onChange({ customInstructions: e.target.value })}
          placeholder="Anything else the tailoring team should know..."
        />
      </div>

      <div className="space-y-1.5">
        <Label>Reference / Inspiration Images</Label>
        <MultiImageUpload
          value={customization.referenceImages}
          onChange={(urls) => onChange({ referenceImages: urls })}
          folder="orders"
          label="Add images"
        />
      </div>
    </div>
  );
}
