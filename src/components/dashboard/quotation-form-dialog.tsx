"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function QuotationFormDialog({
  open,
  onClose,
  customers,
}: {
  open: boolean;
  onClose: () => void;
  customers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/quotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: form.get("customerId"),
        description: form.get("description"),
        price: form.get("price"),
        deposit: form.get("deposit"),
        dueDate: form.get("dueDate") || null,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || "Could not create quotation");
      return;
    }

    toast.success("Quotation created");
    onClose();
    router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title="New quotation">
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
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" rows={3} required />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="price">Price</Label>
            <Input id="price" name="price" type="number" step="0.01" required />
          </div>
          <div>
            <Label htmlFor="deposit">Deposit</Label>
            <Input id="deposit" name="deposit" type="number" step="0.01" required />
          </div>
          <div>
            <Label htmlFor="dueDate">Due date</Label>
            <Input id="dueDate" name="dueDate" type="date" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || customers.length === 0}>
            {loading ? "Creating..." : "Create quotation"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
