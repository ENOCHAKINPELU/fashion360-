"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Palette, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { ColorFormDialog } from "@/features/design-gallery/components/color-form-dialog";
import type { ColorLibraryItemData } from "@/features/design-gallery/types";

export function ColorLibraryClient({ colors }: { colors: ColorLibraryItemData[] }) {
  const router = useRouter();
  const [formState, setFormState] = useState<{ open: boolean; color?: ColorLibraryItemData }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<ColorLibraryItemData | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/designs/colors/${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete colour");
      return;
    }
    toast.success("Colour deleted");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setFormState({ open: true })}>
          <Plus className="size-4" /> Add Colour
        </Button>
      </div>

      {colors.length === 0 ? (
        <EmptyState icon={Palette} title="No colours yet" description="Build a colour library to speed up design customization and combos." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {colors.map((color) => (
            <div key={color.id} className="group overflow-hidden rounded-xl border border-border bg-surface">
              <div className="h-20" style={{ backgroundColor: color.hexValue }} />
              <div className="p-3">
                <p className="truncate text-sm font-medium text-foreground">{color.name}</p>
                <p className="text-xs text-muted-foreground uppercase">{color.hexValue}</p>
                {color.pairsWith.length > 0 && (
                  <div className="mt-2 flex gap-1">
                    {color.pairsWith.slice(0, 4).map((swatch, index) => (
                      <span
                        key={swatch + index}
                        className="size-4 rounded-full border border-border"
                        style={{ backgroundColor: swatch.startsWith("#") ? swatch : undefined }}
                        title={swatch}
                      />
                    ))}
                  </div>
                )}
                <div className="mt-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button variant="outline" size="icon-sm" onClick={() => setFormState({ open: true, color })}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button variant="outline" size="icon-sm" onClick={() => setDeleteTarget(color)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ColorFormDialog
        open={formState.open}
        onOpenChange={(open) => setFormState((prev) => ({ ...prev, open }))}
        color={formState.color}
        onSaved={() => router.refresh()}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete colour?"
        description={`This will remove ${deleteTarget?.name} from your colour library.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
