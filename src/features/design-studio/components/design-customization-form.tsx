"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DesignVersionCustomizationInput } from "@/lib/validations/design-preview";
import type { DesignVersionCustomizationData } from "@/features/design-studio/types";
import type { FabricLibraryItemData } from "@/features/design-gallery/types";

export const EMPTY_CUSTOMIZATION: DesignVersionCustomizationInput = {
  fabricId: "",
  fabricNameSnapshot: "",
  primaryColor: "",
  secondaryColor: "",
  pattern: "",
  sleeveStyle: "",
  neckline: "",
  collarStyle: "",
  cuffStyle: "",
  length: "",
  buttonStyle: "",
  embroidery: "",
  pocketStyle: "",
  lining: "",
  accessories: [],
  otherCustomizations: "",
};

export function customizationDataToInput(
  data: DesignVersionCustomizationData | null | undefined
): DesignVersionCustomizationInput {
  if (!data) return { ...EMPTY_CUSTOMIZATION, accessories: [] };
  return {
    fabricId: data.fabricId ?? "",
    fabricNameSnapshot: data.fabricNameSnapshot ?? "",
    primaryColor: data.primaryColor ?? "",
    secondaryColor: data.secondaryColor ?? "",
    pattern: data.pattern ?? "",
    sleeveStyle: data.sleeveStyle ?? "",
    neckline: data.neckline ?? "",
    collarStyle: data.collarStyle ?? "",
    cuffStyle: data.cuffStyle ?? "",
    length: data.length ?? "",
    buttonStyle: data.buttonStyle ?? "",
    embroidery: data.embroidery ?? "",
    pocketStyle: data.pocketStyle ?? "",
    lining: data.lining ?? "",
    accessories: data.accessories ?? [],
    otherCustomizations: data.otherCustomizations ?? "",
  };
}

const STYLE_FIELDS: { key: keyof DesignVersionCustomizationInput; label: string; placeholder: string }[] = [
  { key: "pattern", label: "Pattern", placeholder: "e.g. Solid, Striped" },
  { key: "sleeveStyle", label: "Sleeve Style", placeholder: "e.g. Bell sleeve" },
  { key: "neckline", label: "Neckline", placeholder: "e.g. V-neck" },
  { key: "collarStyle", label: "Collar", placeholder: "e.g. Mandarin collar" },
  { key: "cuffStyle", label: "Cuff Style", placeholder: "e.g. French cuff" },
  { key: "length", label: "Length", placeholder: "e.g. Knee length" },
  { key: "buttonStyle", label: "Buttons", placeholder: "e.g. Horn buttons" },
  { key: "embroidery", label: "Embroidery", placeholder: "e.g. Gold thread" },
  { key: "pocketStyle", label: "Pocket Style", placeholder: "e.g. Welt pockets" },
  { key: "lining", label: "Lining", placeholder: "e.g. Silk lining" },
];

const FIELD_LABELS: Record<string, string> = {
  primaryColor: "Primary Colour",
  secondaryColor: "Secondary Colour",
  otherCustomizations: "Other Customizations",
  accessories: "Accessories",
  ...Object.fromEntries(STYLE_FIELDS.map((f) => [f.key, f.label])),
};

export function DesignCustomizationForm({
  mode = "edit",
  value,
  onChange,
  fabrics,
}: {
  mode?: "edit" | "readonly";
  value: DesignVersionCustomizationInput;
  onChange?: (value: DesignVersionCustomizationInput) => void;
  fabrics: FabricLibraryItemData[];
}) {
  function update(patch: Partial<DesignVersionCustomizationInput>) {
    onChange?.({ ...value, ...patch });
  }

  const fabricName = value.fabricNameSnapshot || fabrics.find((f) => f.id === value.fabricId)?.name || null;

  if (mode === "readonly") {
    const rows: { label: string; value: string }[] = [
      { label: "Fabric", value: fabricName ?? "N/A" },
      { label: "Primary Colour", value: value.primaryColor || "N/A" },
      { label: "Secondary Colour", value: value.secondaryColor || "N/A" },
      ...STYLE_FIELDS.map((f) => ({ label: f.label, value: (value[f.key] as string) || "N/A" })),
      { label: "Accessories", value: value.accessories.length ? value.accessories.join(", ") : "N/A" },
    ];

    return (
      <div className="space-y-4">
        <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className="space-y-0.5">
              <dt className="text-xs text-muted-foreground">{row.label}</dt>
              <dd className="text-sm font-medium text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
        {value.otherCustomizations && (
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Other Customizations</p>
            <p className="text-sm text-foreground">{value.otherCustomizations}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Fabric</Label>
          <Select
            value={value.fabricId || "none"}
            onValueChange={(v) => {
              if (v === "none") {
                update({ fabricId: "", fabricNameSnapshot: "" });
                return;
              }
              const fabric = fabrics.find((f) => f.id === v);
              update({ fabricId: v, fabricNameSnapshot: fabric?.name ?? "" });
            }}
          >
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
          <Label>{FIELD_LABELS.primaryColor}</Label>
          <Input
            value={value.primaryColor ?? ""}
            onChange={(e) => update({ primaryColor: e.target.value })}
            placeholder="#6C3CF0 or colour name"
          />
        </div>
        <div className="space-y-1.5">
          <Label>{FIELD_LABELS.secondaryColor}</Label>
          <Input
            value={value.secondaryColor ?? ""}
            onChange={(e) => update({ secondaryColor: e.target.value })}
            placeholder="Optional accent colour"
          />
        </div>
        {STYLE_FIELDS.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label>{field.label}</Label>
            <Input
              value={(value[field.key] as string) ?? ""}
              onChange={(e) => update({ [field.key]: e.target.value })}
              placeholder={field.placeholder}
            />
          </div>
        ))}
        <div className="space-y-1.5">
          <Label>Accessories</Label>
          <Input
            value={value.accessories.join(", ")}
            onChange={(e) =>
              update({ accessories: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) })
            }
            placeholder="Comma-separated, e.g. Belt, Brooch"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Other Customizations</Label>
        <Textarea
          rows={3}
          value={value.otherCustomizations ?? ""}
          onChange={(e) => update({ otherCustomizations: e.target.value })}
          placeholder="Anything else the designer should know..."
        />
      </div>
    </div>
  );
}
