"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Layers, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { FabricFormDialog } from "@/features/design-gallery/components/fabric-form-dialog";
import { fabricAvailabilityOptions } from "@/lib/validations/design";
import type { FabricLibraryItemData } from "@/features/design-gallery/types";

const AVAILABILITY_STYLES: Record<string, string> = {
  IN_STOCK: "bg-success-soft text-success",
  LIMITED: "bg-warning-soft text-warning",
  OUT_OF_STOCK: "bg-danger-soft text-danger",
  SEASONAL: "bg-info-soft text-info",
};

export function FabricLibraryClient({ fabrics }: { fabrics: FabricLibraryItemData[] }) {
  const router = useRouter();
  const [formState, setFormState] = useState<{ open: boolean; fabric?: FabricLibraryItemData }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<FabricLibraryItemData | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/designs/fabrics/${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete fabric");
      return;
    }
    toast.success("Fabric deleted");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setFormState({ open: true })}>
          <Plus className="size-4" /> Add Fabric
        </Button>
      </div>

      {fabrics.length === 0 ? (
        <EmptyState icon={Layers} title="No fabrics yet" description="Build your digital fabric library to power design recommendations and customization." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {fabrics.map((fabric) => (
            <Card key={fabric.id} className="border-none shadow-sm">
              <div className="aspect-square overflow-hidden rounded-t-xl bg-muted">
                {fabric.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fabric.imageUrl} alt={fabric.name} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted-foreground">
                    <Layers className="size-6" />
                  </div>
                )}
              </div>
              <CardContent className="space-y-2 pt-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{fabric.name}</p>
                  <Badge className={AVAILABILITY_STYLES[fabric.availability]}>
                    {fabricAvailabilityOptions.find((o) => o.value === fabric.availability)?.label}
                  </Badge>
                </div>
                {fabric.texture && <p className="text-xs text-muted-foreground">{fabric.texture}</p>}
                <div className="flex gap-1.5 pt-1">
                  <Button variant="outline" size="icon-sm" onClick={() => setFormState({ open: true, fabric })}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button variant="outline" size="icon-sm" onClick={() => setDeleteTarget(fabric)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FabricFormDialog
        open={formState.open}
        onOpenChange={(open) => setFormState((prev) => ({ ...prev, open }))}
        fabric={formState.fabric}
        onSaved={() => router.refresh()}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete fabric?"
        description={`This will remove ${deleteTarget?.name} from your fabric library.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
