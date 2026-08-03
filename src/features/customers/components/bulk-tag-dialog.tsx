"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CustomerTagBadge } from "@/features/customers/components/customer-tag-badge";

interface TagOption {
  id: string;
  name: string;
  color: string | null;
}

export function BulkTagDialog({
  open,
  onOpenChange,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (tagId: string) => Promise<void>;
}) {
  const [tags, setTags] = useState<TagOption[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/customers/tags")
      .then((res) => res.json())
      .then((data) => setTags(data.tags ?? []))
      .catch(() => setTags([]));
  }, [open]);

  async function handleApply() {
    if (!selected) {
      toast.error("Choose a tag first");
      return;
    }
    setApplying(true);
    try {
      await onApply(selected);
      onOpenChange(false);
      setSelected(null);
    } finally {
      setApplying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Tag Customers</DialogTitle>
          <DialogDescription>Apply a tag to all selected customers.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button key={tag.id} onClick={() => setSelected(tag.id)} className={selected === tag.id ? "" : "opacity-50"}>
              <CustomerTagBadge name={tag.name} color={tag.color} />
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={applying}>
            {applying ? "Applying..." : "Apply Tag"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
