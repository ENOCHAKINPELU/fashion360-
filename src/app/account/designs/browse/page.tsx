import Link from "next/link";
import { requireCustomerContext } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { discoverableDesignWhere } from "@/lib/design-catalog-access";
import { DesignBrowsePageClient } from "@/features/personalization/components/design-browse-page-client";

const PAGE_SIZE = 20;

export default async function DesignBrowsePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { profile } = await requireCustomerContext();
  const params = await searchParams;

  const search = params.search?.trim();
  const sort = params.sort ?? "newest";
  const page = Math.max(1, Number(params.page ?? 1));

  const where = {
    ...discoverableDesignWhere(),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { category: { name: { contains: search, mode: "insensitive" as const } } },
            { occasion: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const orderBy = sort === "popular" ? { viewCount: "desc" as const } : { createdAt: "desc" as const };

  const [designs, total, favorites] = await Promise.all([
    prisma.design.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, name: true, mainImageUrl: true, basePrice: true, businessId: true, business: { select: { name: true } } },
    }),
    prisma.design.count({ where }),
    prisma.designFavorite.findMany({ where: { customerProfileId: profile.id }, select: { designId: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Browse Designs</h1>
          <p className="text-sm text-muted-foreground">Explore designs from fashion businesses across Fashion360.</p>
        </div>
        <Link href="/account/designs" className="text-sm font-medium text-primary hover:underline">
          My Designs
        </Link>
      </div>
      <DesignBrowsePageClient
        designs={JSON.parse(JSON.stringify(designs))}
        pagination={{ page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) }}
        favoritedIds={favorites.map((f) => f.designId)}
      />
    </div>
  );
}
