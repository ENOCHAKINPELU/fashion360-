"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

export function RecordPaymentDialog({
  open,
  onClose,
  invoiceId,
  balance,
}: {
  open: boolean;
  onClose: () => void;
  invoiceId: string;
  balance: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoiceId,
        type: form.get("type"),
        amount: form.get("amount"),
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || "Could not record payment");
      return;
    }

    toast.success("Payment recorded");
    onClose();
    router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title="Record payment">
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-sm text-muted">Outstanding balance: {formatCurrency(balance)}</p>
        <div>
          <Label htmlFor="type">Payment type</Label>
          <Select id="type" name="type" required defaultValue="BALANCE">
            <option value="DEPOSIT">Deposit</option>
            <option value="BALANCE">Balance</option>
            <option value="FULL">Full payment</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" name="amount" type="number" step="0.01" required defaultValue={balance} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Recording..." : "Record payment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
