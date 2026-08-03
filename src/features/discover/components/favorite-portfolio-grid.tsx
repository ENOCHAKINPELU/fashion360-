"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";

interface FavoritePortfolioItem {
  id: string;
  imageUrl: string;
  title: string;
  businessName: string;
  handle: string;
}

export function FavoritePortfolioGrid({ items }: { items: FavoritePortfolioItem[] }) {
  const router = useRouter();

  async function remove(id: string) {
    const res = await fetch(`/api/portfolio/${id}/favorite`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not remove favorite");
      return;
    }
    toast.success("Removed from favorites");
    router.refresh();
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.id} className="group relative overflow-hidden rounded-xl border border-border bg-surface">
          <Link href={`/business/${item.handle}`} className="block">
            <div className="aspect-square bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.imageUrl} alt={item.title} className="size-full object-cover" />
            </div>
            <div className="p-2.5">
              <p className="truncate text-xs font-medium text-foreground">{item.title}</p>
              <p className="truncate text-xs text-muted-foreground">{item.businessName}</p>
            </div>
          </Link>
          <button
            onClick={() => remove(item.id)}
            aria-label={`Remove ${item.title} from favorites`}
            className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
