"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export interface AppointmentTypeItem {
  id: string;
  name: string;
  color: string;
  defaultDurationMinutes: number;
  isSystem: boolean;
}

export function AppointmentTypesManager({ types }: { types: AppointmentTypeItem[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6C3CF0");
  const [duration, setDuration] = useState(60);
  const [submitting, setSubmitting] = useState(false);

  async function addType() {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/appointments/types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color, defaultDurationMinutes: duration }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not add type");
      setName("");
      toast.success("Appointment type added");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeType(id: string) {
    const res = await fetch(`/api/appointments/types/${id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error ?? "Could not remove type");
      return;
    }
    toast.success("Type removed");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Type Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Custom Appointment" />
        </div>
        <div className="space-y-1.5">
          <Label>Color</Label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-full cursor-pointer rounded-lg border border-border bg-transparent p-1"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Duration (min)</Label>
          <div className="flex gap-2">
            <Input type="number" min={5} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            <Button onClick={addType} disabled={submitting || !name.trim()}>
              Add
            </Button>
          </div>
        </div>
      </div>

      <ul className="divide-y divide-border rounded-xl border border-border">
        {types.map((type) => (
          <li key={type.id} className="flex items-center justify-between gap-3 p-3">
            <div className="flex items-center gap-2.5">
              <span className="size-3 rounded-full" style={{ backgroundColor: type.color }} />
              <p className="text-sm font-medium text-foreground">{type.name}</p>
              <span className="text-xs text-muted-foreground">{type.defaultDurationMinutes} min</span>
              {type.isSystem && (
                <Badge variant="outline" className="font-normal text-muted-foreground">
                  Default
                </Badge>
              )}
            </div>
            {!type.isSystem && (
              <Button variant="ghost" size="icon-sm" onClick={() => removeType(type.id)}>
                <Trash2 className="size-4 text-danger" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
