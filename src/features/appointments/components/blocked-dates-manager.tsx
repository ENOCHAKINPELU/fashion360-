"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, CalendarOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/shared/components/empty-state";
import { formatDate } from "@/lib/utils";

export interface BlockedDateItem {
  id: string;
  date: string;
  endDate: string | null;
  reason: string | null;
}

export function BlockedDatesManager({ blockedDates }: { blockedDates: BlockedDateItem[] }) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function addBlockedDate() {
    if (!date) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/availability/blocked-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, endDate: endDate || undefined, reason: reason || undefined }),
      });
      if (!res.ok) throw new Error("Could not add blocked date");
      setDate("");
      setEndDate("");
      setReason("");
      toast.success("Date blocked");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeBlockedDate(id: string) {
    const res = await fetch(`/api/availability/blocked-dates/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not remove blocked date");
      return;
    }
    toast.success("Blocked date removed");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>End date (optional)</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Reason</Label>
          <div className="flex gap-2">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Public holiday, staff training..." />
            <Button onClick={addBlockedDate} disabled={submitting || !date}>
              Add
            </Button>
          </div>
        </div>
      </div>

      {blockedDates.length === 0 ? (
        <EmptyState icon={CalendarOff} title="No blocked dates" className="border-none py-8" />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {blockedDates.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 p-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {formatDate(b.date)}
                  {b.endDate ? ` – ${formatDate(b.endDate)}` : ""}
                </p>
                {b.reason && <p className="text-xs text-muted-foreground">{b.reason}</p>}
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => removeBlockedDate(b.id)}>
                <Trash2 className="size-4 text-danger" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
