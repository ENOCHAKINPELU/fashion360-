import Link from "next/link";
import { ImageOff } from "lucide-react";
import { prisma } from "@/lib/prisma";

export async function RecentlyViewedWidget({ businessId }: { businessId: string }) {
  const views = await prisma.designView.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    distinct: ["designId"],
    take: 6,
    include: { design: { select: { id: true, name: true, mainImageUrl: true, designCode: true } } },
  });

  if (views.length === 0) {
    return <p className="text-sm text-muted-foreground">No designs viewed yet.</p>;
  }

  return (
    <div className="space-y-2">
      {views.map((view) => (
        <Link
          key={view.id}
          href={`/dashboard/design-gallery/${view.design.id}`}
          className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted"
        >
          <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
            {view.design.mainImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={view.design.mainImageUrl} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <ImageOff className="size-3.5" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{view.design.name}</p>
            <p className="text-xs text-muted-foreground">{view.design.designCode}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
