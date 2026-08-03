"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { financialLineItemTypeOptions, type FinancialLineItemInput } from "@/lib/validations/quotation";
import { formatCurrency } from "@/lib/utils";

const EMPTY_ITEM: FinancialLineItemInput = {
  type: "GARMENT",
  name: "",
  description: "",
  quantity: 1,
  unitPrice: 0,
  discount: 0,
  tax: 0,
};

export function lineItemSubtotal(item: FinancialLineItemInput) {
  return item.quantity * item.unitPrice - item.discount + item.tax;
}

export function LineItemsEditor({
  items,
  onChange,
  currency,
}: {
  items: FinancialLineItemInput[];
  onChange: (items: FinancialLineItemInput[]) => void;
  currency: string;
}) {
  function updateItem(index: number, patch: Partial<FinancialLineItemInput>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function addItem() {
    onChange([...items, { ...EMPTY_ITEM }]);
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="space-y-3 rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Item {index + 1}</p>
            {items.length > 1 && (
              <Button variant="ghost" size="icon-sm" onClick={() => removeItem(index)} aria-label="Remove item">
                <Trash2 className="size-3.5 text-danger" />
              </Button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={item.type} onValueChange={(v) => updateItem(index, { type: v as FinancialLineItemInput["type"] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {financialLineItemTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={item.name} onChange={(e) => updateItem(index, { name: e.target.value })} placeholder="e.g. Agbada (Custom)" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              value={item.description ?? ""}
              onChange={(e) => updateItem(index, { description: e.target.value })}
              placeholder="Optional details"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input type="number" min={0.01} step="0.01" value={item.quantity} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Unit Price</Label>
              <Input type="number" min={0} step="0.01" value={item.unitPrice} onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Discount</Label>
              <Input type="number" min={0} step="0.01" value={item.discount} onChange={(e) => updateItem(index, { discount: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Tax</Label>
              <Input type="number" min={0} step="0.01" value={item.tax} onChange={(e) => updateItem(index, { tax: Number(e.target.value) })} />
            </div>
          </div>

          <p className="text-right text-sm text-muted-foreground">
            Subtotal: <span className="font-medium text-foreground">{formatCurrency(lineItemSubtotal(item), currency)}</span>
          </p>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addItem}>
        <Plus className="size-3.5" /> Add Item
      </Button>
    </div>
  );
}
