"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { measurementFieldCategoryOptions } from "@/lib/validations/measurement";
import type { MeasurementTypeItem } from "@/features/measurements/types";

const CATEGORY_LABELS = Object.fromEntries(measurementFieldCategoryOptions.map((o) => [o.value, o.label]));
const CATEGORY_ORDER = ["UPPER_BODY", "LOWER_BODY", "DRESS", "ADDITIONAL", "CUSTOM"];

export function MeasurementValuesEditor({
  types,
  values,
  onChange,
  unit,
  requiredKeys,
}: {
  types: MeasurementTypeItem[];
  values: Record<string, number | undefined>;
  onChange: (key: string, value: number | undefined) => void;
  unit: "METRIC" | "IMPERIAL";
  requiredKeys?: Set<string>;
}) {
  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    fields: types.filter((t) => t.category === category),
  })).filter((g) => g.fields.length > 0);

  const unitLabel = unit === "METRIC" ? "cm" : "in";

  return (
    <div className="space-y-6">
      {grouped.map((group) => (
        <div key={group.category}>
          <h3 className="mb-3 text-sm font-semibold text-foreground">{CATEGORY_LABELS[group.category]}</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {group.fields.map((field) => (
              <div key={field.id} className="space-y-1.5">
                <Label htmlFor={`m-${field.key}`}>
                  {field.label}
                  {requiredKeys?.has(field.key) && <span className="text-danger"> *</span>}
                </Label>
                <div className="relative">
                  <Input
                    id={`m-${field.key}`}
                    type="number"
                    min={0}
                    max={500}
                    step={0.1}
                    value={values[field.key] ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      onChange(field.key, v === "" ? undefined : Math.max(0, Number(v)));
                    }}
                    className="pr-9"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                    {unitLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
