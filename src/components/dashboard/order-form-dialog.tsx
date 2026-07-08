"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type CustomerOption = { id: string; name: string };

export function OrderFormDialog({
  open,
  onClose,
  customers,
}: {
  open: boolean;
  onClose: () => void;
  customers: CustomerOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: form.get("customerId"),
        notes: form.get("notes"),
        deliveryDate: form.get("deliveryDate") || null,
        fabric: form.get("fabric"),
        color: form.get("color"),
        neckline: form.get("neckline"),
        sleeveStyle: form.get("sleeveStyle"),
        price: form.get("price") || null,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || "Could not create order");
      return;
    }

    const { order } = await res.json();
    toast.success("Order created");
    onClose();
    router.push(`/dashboard/orders/${order.id}`);
  }

  return (
    <Modal open={open} onClose={onClose} title="New order">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="customerId">Customer</Label>
          <Select id="customerId" name="customerId" required defaultValue="">
            <option value="" disabled>
              Select a customer...
            </option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="fabric">Fabric</Label>
            <Input id="fabric" name="fabric" />
          </div>
          <div>
            <Label htmlFor="color">Color</Label>
            <Input id="color" name="color" />
          </div>
          <div>
            <Label htmlFor="neckline">Neckline</Label>
            <Input id="neckline" name="neckline" />
          </div>
          <div>
            <Label htmlFor="sleeveStyle">Sleeve style</Label>
            <Input id="sleeveStyle" name="sleeveStyle" />
          </div>
          <div>
            <Label htmlFor="deliveryDate">Delivery date</Label>
            <Input id="deliveryDate" name="deliveryDate" type="date" />
          </div>
          <div>
            <Label htmlFor="price">Price</Label>
            <Input id="price" name="price" type="number" step="0.01" />
          </div>
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" rows={3} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || customers.length === 0}>
            {loading ? "Creating..." : "Create order"}
          </Button>
        </div>
        {customers.length === 0 && (
          <p className="text-xs text-warning">Add a customer first before creating an order.</p>
        )}
      </form>
    </Modal>
  );
}
