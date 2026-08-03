"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { DesignCategoryOption } from "@/features/design-gallery/types";

export function CategoryManager({ categories }: { categories: DesignCategoryOption[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function addCategory() {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/designs/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not add category");
      toast.success("Category added");
      setName("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/dashboard/design-gallery/browse?categoryId=${category.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent-soft"
          >
            {category.name}
            <span className="text-muted-foreground">{category._count?.designs ?? 0}</span>
          </Link>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name"
          onKeyDown={(e) => e.key === "Enter" && addCategory()}
          className="max-w-xs"
        />
        <Button size="sm" variant="outline" onClick={addCategory} disabled={submitting || !name.trim()} className="gap-1.5">
          <Plus className="size-4" /> Add
        </Button>
      </div>
    </div>
  );
}
