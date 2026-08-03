"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SUGGESTED_BUSINESS_SPECIALTIES } from "@/lib/business-specialties";

interface SpecialtyItem {
  id: string;
  name: string;
}

export function SpecialtiesManager({ specialties }: { specialties: SpecialtyItem[] }) {
  const router = useRouter();
  const [customName, setCustomName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedNames = new Set(specialties.map((s) => s.name));
  const suggestions = SUGGESTED_BUSINESS_SPECIALTIES.filter((s) => !selectedNames.has(s));

  async function addSpecialty(name: string) {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/business/specialties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not add specialty");
      setCustomName("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add specialty");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeSpecialty(id: string) {
    const res = await fetch(`/api/business/specialties/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not remove specialty");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Your Specialties</p>
        {specialties.length === 0 ? (
          <p className="text-sm text-muted-foreground">No specialties added yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {specialties.map((s) => (
              <Badge key={s.id} className="gap-1.5 bg-accent-soft text-primary hover:bg-accent-soft">
                {s.name}
                <button onClick={() => removeSpecialty(s.id)} aria-label={`Remove ${s.name}`}>
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Suggested</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => addSpecialty(s)}
                disabled={submitting}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Plus className="size-3" /> {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Add Custom Specialty</p>
          <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Vintage Restyling" />
        </div>
        <Button onClick={() => addSpecialty(customName)} disabled={submitting || !customName.trim()}>
          Add
        </Button>
      </div>
    </div>
  );
}
