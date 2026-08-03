"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { CollectionCard } from "@/features/design-gallery/components/collection-card";
import { CollectionFormDialog } from "@/features/design-gallery/components/collection-form-dialog";
import type { DesignCollectionOption } from "@/features/design-gallery/types";

export function CollectionsClient({ collections }: { collections: DesignCollectionOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="size-4" /> New Collection
        </Button>
      </div>

      {collections.length === 0 ? (
        <EmptyState icon={Images} title="No collections yet" description="Group your designs into themed collections like &quot;Wedding Collection&quot; or &quot;2026 Collection&quot;." />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}

      <CollectionFormDialog open={open} onOpenChange={setOpen} onSaved={() => router.refresh()} />
    </div>
  );
}
