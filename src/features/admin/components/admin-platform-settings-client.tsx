"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function AdminPlatformSettingsClient({
  initial,
}: {
  initial: { platformFeePercentage: number; disputeWindowDays: number };
}) {
  const [feePercentage, setFeePercentage] = useState(String(initial.platformFeePercentage));
  const [disputeWindow, setDisputeWindow] = useState(String(initial.disputeWindowDays));
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/platform-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformFeePercentage: Number(feePercentage),
          disputeWindowDays: Number(disputeWindow),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save settings");
      toast.success("Platform settings updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save settings");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Platform Fee (%)</Label>
            <Input type="number" min={0} max={100} step={0.1} value={feePercentage} onChange={(e) => setFeePercentage(e.target.value)} />
            <p className="text-xs text-muted-foreground">Applied platform-wide. Never editable by a business.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Dispute Window (days)</Label>
            <Input type="number" min={1} max={30} value={disputeWindow} onChange={(e) => setDisputeWindow(e.target.value)} />
            <p className="text-xs text-muted-foreground">How long after delivery a customer can open a dispute.</p>
          </div>
        </div>
        <Button onClick={submit} disabled={submitting}>
          {submitting ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
