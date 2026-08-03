"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface GoalOption {
  key: string;
  label: string;
  description: string | null;
}

// Part 10/18: "What are you looking for today?" — skippable, used
// alongside the style/category/occasion questions the onboarding form
// already asks.
export function FashionGoalPicker({ onSaved }: { onSaved?: () => void }) {
  const [catalog, setCatalog] = useState<GoalOption[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    fetch("/api/customer/fashion-goals")
      .then((r) => r.json())
      .then((d) => setCatalog(d.catalog ?? []))
      .catch(() => {});
  }, []);

  async function save() {
    if (!selected && !customText.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/api/customer/fashion-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fashionGoalKey: selected === "CUSTOM" ? undefined : (selected ?? undefined), customText: selected === "CUSTOM" || !selected ? customText.trim() || undefined : undefined }),
      });
      setSaved(true);
      toast.success("Got it, we'll personalize your discovery around this.");
      onSaved?.();
    } catch {
      toast.error("Could not save your fashion goal");
    } finally {
      setSubmitting(false);
    }
  }

  if (catalog.length === 0) return null;
  if (saved) {
    return <p className="text-sm text-success">Thanks! We&apos;ll use this to personalize your discovery.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">What are you looking for today? (optional)</p>
      <div className="flex flex-wrap gap-2">
        {catalog.map((g) => (
          <Badge
            key={g.key}
            variant={selected === g.key ? "default" : "outline"}
            className="cursor-pointer px-3 py-1.5 text-sm"
            onClick={() => setSelected(g.key)}
          >
            {g.label}
          </Badge>
        ))}
      </div>
      {selected === "CUSTOM" && <Textarea rows={2} value={customText} onChange={(e) => setCustomText(e.target.value)} placeholder="Tell us what you're looking for..." />}
      <Button size="sm" variant="outline" onClick={save} disabled={submitting || (!selected && !customText.trim())}>
        {submitting ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
