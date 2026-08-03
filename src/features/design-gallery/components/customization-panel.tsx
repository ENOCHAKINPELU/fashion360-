"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DesignCustomerSelect } from "@/features/design-gallery/components/design-customer-select";
import type { DesignCustomerOption, FabricLibraryItemData } from "@/features/design-gallery/types";
import type { DesignCustomizationInput } from "@/lib/validations/design";

const STYLE_FIELDS: { key: keyof Omit<DesignCustomizationInput, "customerId">; label: string; placeholder: string }[] = [
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

const EMPTY: Omit<DesignCustomizationInput, "customerId"> = {
  fabricId: "",
  primaryColor: "",
  secondaryColor: "",
  sleeveStyle: "",
  neckline: "",
  collarStyle: "",
  buttonStyle: "",
  embroidery: "",
  length: "",
  pocketStyle: "",
  cuffStyle: "",
  lining: "",
  accessories: [],
  extraNotes: "",
};

export function CustomizationPanel({
  designId,
  fabrics,
  customer,
  onCustomerChange,
}: {
  designId: string;
  fabrics: FabricLibraryItemData[];
  customer: DesignCustomerOption | null;
  onCustomerChange: (customer: DesignCustomerOption | null) => void;
}) {
  const [state, setState] = useState<Omit<DesignCustomizationInput, "customerId">>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!customer) {
      setState(EMPTY);
      return;
    }
    setLoading(true);
    fetch(`/api/designs/${designId}/customizations?customerId=${customer.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.customization) {
          setState({
            fabricId: data.customization.fabricId ?? "",
            primaryColor: data.customization.primaryColor ?? "",
            secondaryColor: data.customization.secondaryColor ?? "",
            sleeveStyle: data.customization.sleeveStyle ?? "",
            neckline: data.customization.neckline ?? "",
            collarStyle: data.customization.collarStyle ?? "",
            buttonStyle: data.customization.buttonStyle ?? "",
            embroidery: data.customization.embroidery ?? "",
            length: data.customization.length ?? "",
            pocketStyle: data.customization.pocketStyle ?? "",
            cuffStyle: data.customization.cuffStyle ?? "",
            lining: data.customization.lining ?? "",
            accessories: data.customization.accessories ?? [],
            extraNotes: data.customization.extraNotes ?? "",
          });
        } else {
          setState(EMPTY);
        }
      })
      .finally(() => setLoading(false));
  }, [customer, designId]);

  function update(patch: Partial<Omit<DesignCustomizationInput, "customerId">>) {
    const next = { ...state, ...patch };
    setState(next);
    if (!customer) return;
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        const res = await fetch(`/api/designs/${designId}/customizations`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerId: customer.id, ...next }),
        });
        if (!res.ok) throw new Error("Could not save customization");
        setSaved(true);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save");
      } finally {
        setSaving(false);
      }
    }, 600);
  }

  return (
    <div className="space-y-5">
      <div>
        <Label className="mb-1.5 block">Customer</Label>
        <DesignCustomerSelect selected={customer} onSelect={onCustomerChange} />
      </div>

      {!customer ? (
        <p className="rounded-xl border border-dashed border-border bg-surface py-8 text-center text-sm text-muted-foreground">
          Select a customer to start customizing this design for them.
        </p>
      ) : loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading customization...
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-end text-xs text-muted-foreground">
            {saving ? (
              <span className="flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" /> Saving...
              </span>
            ) : saved ? (
              <span className="flex items-center gap-1 text-success">
                <Check className="size-3" /> Saved
              </span>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Fabric</Label>
              <Select value={state.fabricId || "none"} onValueChange={(v) => update({ fabricId: v === "none" ? "" : v })}>
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
                type="text"
                value={state.primaryColor}
                onChange={(e) => update({ primaryColor: e.target.value })}
                placeholder="#6C3CF0 or colour name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Secondary Colour</Label>
              <Input
                type="text"
                value={state.secondaryColor}
                onChange={(e) => update({ secondaryColor: e.target.value })}
                placeholder="Optional accent colour"
              />
            </div>
            {STYLE_FIELDS.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label>{field.label}</Label>
                <Input
                  value={(state[field.key] as string) ?? ""}
                  onChange={(e) => update({ [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label>Accessories</Label>
              <Input
                value={state.accessories.join(", ")}
                onChange={(e) => update({ accessories: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) })}
                placeholder="Comma-separated, e.g. Belt, Brooch"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Extra Notes</Label>
            <Textarea
              rows={3}
              value={state.extraNotes}
              onChange={(e) => update({ extraNotes: e.target.value })}
              placeholder="Anything else for this customer's version of the design..."
            />
          </div>
        </div>
      )}
    </div>
  );
}
