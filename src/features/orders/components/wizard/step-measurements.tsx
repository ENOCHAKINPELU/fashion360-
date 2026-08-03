"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrderMeasurementProfileOption } from "@/features/orders/types";

export function StepMeasurements({
  customerId,
  measurementProfileId,
  onSelect,
}: {
  customerId?: string;
  measurementProfileId?: string;
  onSelect: (profile: OrderMeasurementProfileOption | null) => void;
}) {
  const [profiles, setProfiles] = useState<OrderMeasurementProfileOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!customerId) {
      setProfiles([]);
      return;
    }
    setLoading(true);
    fetch(`/api/measurements/profiles?customerId=${customerId}`)
      .then((res) => res.json())
      .then((data) => setProfiles(data.profiles ?? []))
      .catch(() => setProfiles([]))
      .finally(() => setLoading(false));
  }, [customerId]);

  if (!customerId) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface py-8 text-center text-sm text-muted-foreground">
        Select a customer first to see their saved measurement profiles.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Measurement Profile</h2>
          <p className="text-sm text-muted-foreground">
            Optional, attach a saved profile so the tailoring team has exact measurements.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href={`/dashboard/measurements?customerId=${customerId}`} target="_blank">
            Manage Measurements <ExternalLink className="size-3.5" />
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading measurement profiles...
        </div>
      ) : profiles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface py-8 text-center text-sm text-muted-foreground">
          This customer has no saved measurement profiles yet.
        </p>
      ) : (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => onSelect(profiles[0])}
          >
            <Sparkles className="size-3.5" /> Use Latest
          </Button>
          <div className="grid gap-3 sm:grid-cols-2">
            {profiles.map((profile) => {
              const isSelected = profile.id === measurementProfileId;
              return (
                <button
                  type="button"
                  key={profile.id}
                  onClick={() => onSelect(isSelected ? null : profile)}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-colors",
                    isSelected ? "border-primary bg-accent-soft" : "border-border hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{profile.name}</p>
                    {profile.isDefault && (
                      <Badge variant="secondary" className="text-[10px]">
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Updated {new Date(profile.updatedAt).toLocaleDateString()}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {profile.latestMeasurement?.fitPreference
                      ? `Fit: ${profile.latestMeasurement.fitPreference}`
                      : "No fit preference recorded"}
                    {profile.latestMeasurement?.unit ? ` · ${profile.latestMeasurement.unit}` : ""}
                  </p>
                </button>
              );
            })}
          </div>
        </>
      )}

      {!measurementProfileId && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <p>No measurement profile selected. You can still proceed, but the tailoring team won&apos;t have exact measurements attached to this order.</p>
        </div>
      )}
    </div>
  );
}
