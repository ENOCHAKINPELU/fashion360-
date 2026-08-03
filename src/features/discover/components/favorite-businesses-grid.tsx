"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MapPin, ShieldCheck, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface FavoriteBusiness {
  businessId: string;
  name: string;
  logoUrl: string | null;
  location: string;
  handle: string;
  isVerified: boolean;
}

export function FavoriteBusinessesGrid({ favorites }: { favorites: FavoriteBusiness[] }) {
  const router = useRouter();

  async function remove(businessId: string) {
    const res = await fetch(`/api/businesses/${businessId}/favorite`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not remove favorite");
      return;
    }
    toast.success("Removed from favorites");
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {favorites.map((b) => (
        <Card key={b.businessId} className="border-none shadow-sm">
          <CardContent className="flex items-center gap-3">
            {b.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.logoUrl} alt={b.name} className="size-12 shrink-0 rounded-xl object-cover ring-1 ring-border" />
            ) : (
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-sm font-semibold text-primary">
                {b.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <Link href={`/business/${b.handle}`} className="flex items-center gap-1 truncate text-sm font-medium text-foreground hover:underline">
                {b.name}
                {b.isVerified && <ShieldCheck className="size-3.5 shrink-0 text-primary" />}
              </Link>
              {b.location && (
                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <MapPin className="size-3 shrink-0" /> {b.location}
                </p>
              )}
            </div>
            <button
              onClick={() => remove(b.businessId)}
              aria-label={`Remove ${b.name} from favorites`}
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-danger"
            >
              <X className="size-4" />
            </button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
