import Link from "next/link";
import { ImageOff } from "lucide-react";
import { Heart } from "lucide-react";
import { prisma } from "@/lib/prisma";

export async function PopularDesignsWidget({ businessId }: { businessId: string }) {
  const designs = await prisma.design.findMany({
    where: { businessId, status: { not: "ARCHIVED" } },
    orderBy: { viewCount: "desc" },
    take: 6,
    select: {
      id: true,
      name: true,
      designCode: true,
      mainImageUrl: true,
      viewCount: true,
      _count: { select: { favorites: true } },
    },
  });

  if (designs.length === 0) {
    return <p className="text-sm text-muted-foreground">No designs yet.</p>;
  }

  return (
    <div className="space-y-2">
      {designs.map((design) => (
        <Link
          key={design.id}
          href={`/dashboard/design-gallery/${design.id}`}
          className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted"
        >
          <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
            {design.mainImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={design.mainImageUrl} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <ImageOff className="size-3.5" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{design.name}</p>
            <p className="text-xs text-muted-foreground">{design.viewCount} views</p>
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Heart className="size-3.5" /> {design._count.favorites}
          </span>
        </Link>
      ))}
    </div>
  );
}
