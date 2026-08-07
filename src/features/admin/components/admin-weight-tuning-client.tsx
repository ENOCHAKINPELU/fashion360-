"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface WeightRow {
  key: string;
  weight: number;
  description: string | null;
}

// Shared editor for both RankingFactor and PersonalizationWeight — same
// shape (key/weight/description), just a different endpoint and range.
// Local-only edits until "Save Changes" — 13-17 rows each, editing one at a
// time and round-tripping per row would be needlessly chatty.
export function AdminWeightTuningClient({
  title,
  description,
  endpoint,
  initial,
  min,
  max,
}: {
  title: string;
  description: string;
  endpoint: string;
  initial: WeightRow[];
  min: number;
  max: number;
}) {
  const [weights, setWeights] = useState<Record<string, number>>(
    Object.fromEntries(initial.map((w) => [w.key, w.weight]))
  );
  const [submitting, setSubmitting] = useState(false);
  const dirty = initial.some((w) => weights[w.key] !== w.weight);

  function humanize(key: string) {
    return key
      .toLowerCase()
      .split("_")
      .map((s) => s[0].toUpperCase() + s.slice(1))
      .join(" ");
  }

  async function save() {
    setSubmitting(true);
    try {
      const updates = initial
        .filter((w) => weights[w.key] !== w.weight)
        .map((w) => ({ key: w.key, weight: weights[w.key] }));
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save changes");
      toast.success(`${title} updated`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save changes");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="space-y-5">
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="space-y-4">
          {initial.map((row) => (
            <div key={row.key} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{humanize(row.key)}</p>
                  {row.description && <p className="text-xs text-muted-foreground">{row.description}</p>}
                </div>
                <span className="shrink-0 font-mono text-sm tabular-nums text-foreground">{weights[row.key]}</span>
              </div>
              <Slider
                value={[weights[row.key]]}
                min={min}
                max={max}
                step={0.5}
                onValueChange={([v]) => setWeights((prev) => ({ ...prev, [row.key]: v }))}
              />
            </div>
          ))}
        </div>
        <Button onClick={save} disabled={submitting || !dirty}>
          {submitting ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  );
}
