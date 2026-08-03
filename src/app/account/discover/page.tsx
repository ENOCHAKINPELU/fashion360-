import type { Prisma, ServiceCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/lib/rbac";
import { discoverableBusinessWhere } from "@/lib/business-discovery";
import { backfillMissingReputationRows } from "@/lib/discovery-ranked";
import { DiscoverPageClient } from "@/features/discover/components/discover-page-client";

const PAGE_SIZE = 12;

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { profile } = await requireCustomerContext();
  const params = await searchParams;

  const search = params.search?.trim();
  const location = params.location?.trim();
  const specialty = params.specialty?.trim();
  const category = params.category as ServiceCategory | undefined;
  const verified = params.verified === "true";
  const availableOnly = params.available === "true";
  const priceMin = params.priceMin ? Number(params.priceMin) : undefined;
  const priceMax = params.priceMax ? Number(params.priceMax) : undefined;
  const sort = params.sort ?? "recommended";
  const page = Math.max(1, Number(params.page ?? 1));

  // Part 22 filters.
  const minRating = params.minRating ? Number(params.minRating) : undefined;
  const verifiedReviewsOnly = params.verifiedReviews === "true";
  const topRatedOnly = params.topRated === "true";
  const reliableDeliveryOnly = params.reliableDelivery === "true";
  const fastResponseOnly = params.fastResponse === "true";
  const newDesignersOnly = params.newDesigners === "true";
  const popularOnly = params.popularDesigners === "true";

  const base = discoverableBusinessWhere();
  const extraFilters: Prisma.BusinessWhereInput[] = [
    ...(search
      ? [
          {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { profile: { description: { contains: search, mode: "insensitive" as const } } },
              { specialties: { some: { name: { contains: search, mode: "insensitive" as const } } } },
              { services: { some: { name: { contains: search, mode: "insensitive" as const } } } },
              { city: { contains: search, mode: "insensitive" as const } },
              { state: { contains: search, mode: "insensitive" as const } },
            ],
          },
        ]
      : []),
    ...(location
      ? [
          {
            OR: [
              { city: { equals: location, mode: "insensitive" as const } },
              { state: { equals: location, mode: "insensitive" as const } },
            ],
          },
        ]
      : []),
    ...(specialty ? [{ specialties: { some: { name: { equals: specialty, mode: "insensitive" as const } } } }] : []),
    ...(category ? [{ services: { some: { category, isActive: true } } }] : []),
    ...(verified ? [{ verification: { is: { status: "VERIFIED" as const } } }] : []),
    ...(availableOnly
      ? [{ OR: [{ discoverySettings: null }, { discoverySettings: { is: { isAcceptingRequests: true } } }] }]
      : []),
    ...(priceMin != null || priceMax != null
      ? [
          {
            services: {
              some: {
                isActive: true,
                ...(priceMax != null ? { priceMin: { lte: priceMax } } : {}),
                ...(priceMin != null ? { priceMax: { gte: priceMin } } : {}),
              },
            },
          },
        ]
      : []),
    ...(minRating != null ? [{ rating: { is: { averageRating: { gte: minRating } } } }] : []),
    ...(verifiedReviewsOnly ? [{ rating: { is: { verifiedReviewCount: { gt: 0 } } } }] : []),
    ...(topRatedOnly ? [{ trustBadgeAssignments: { some: { trustBadge: { type: "TOP_RATED" as const } } } }] : []),
    ...(reliableDeliveryOnly ? [{ trustBadgeAssignments: { some: { trustBadge: { type: "RELIABLE_DELIVERY" as const } } } }] : []),
    ...(fastResponseOnly ? [{ trustBadgeAssignments: { some: { trustBadge: { type: "FAST_RESPONDER" as const } } } }] : []),
    ...(newDesignersOnly ? [{ trustBadgeAssignments: { some: { trustBadge: { type: "NEW_ON_FASHION360" as const } } } }] : []),
    ...(popularOnly ? [{ trustBadgeAssignments: { some: { trustBadge: { type: "HIGHLY_REVIEWED" as const } } } }] : []),
  ];

  const where: Prisma.BusinessWhereInput = { ...base, AND: [...(base.AND as Prisma.BusinessWhereInput[]), ...extraFilters] };

  // Part 8 (Phase 8): rating/ranking rows now back "Recommended" and
  // "Highest Rated" for real — every discoverable business gets a
  // BusinessRating/BusinessRanking row lazily backfilled before sorting on
  // one (no cron; same pattern as Phase 7's releaseIfWindowExpired).
  // "Closest" (no geolocation) and "Fastest Response" (no cheap DB-level
  // sort field for it yet) still fall back to Recommended — see
  // DiscoverPageClient's sort options for the "Not enough data" messaging.
  await backfillMissingReputationRows(base);

  const orderBy: Prisma.BusinessOrderByWithRelationInput =
    sort === "newest"
      ? { createdAt: "desc" }
      : sort === "popular"
        ? { favoritedBy: { _count: "desc" } }
        : sort === "rating"
          ? { rating: { averageRating: "desc" } }
          : { ranking: { score: "desc" } };

  const [businesses, total, favorites, locations, specialties, categories] = await Promise.all([
    prisma.business.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        profile: true,
        specialties: { orderBy: { name: "asc" }, take: 4 },
        portfolioItems: { orderBy: { sortOrder: "asc" }, take: 3, select: { imageUrl: true } },
        verification: true,
        services: { where: { isActive: true }, select: { category: true }, take: 6 },
        rating: { select: { averageRating: true, totalReviews: true, verifiedReviewCount: true } },
        trustBadgeAssignments: { select: { trustBadge: { select: { type: true, label: true } } } },
      },
    }),
    prisma.business.count({ where }),
    prisma.businessFavorite.findMany({ where: { customerProfileId: profile.id }, select: { businessId: true } }),
    prisma.business.findMany({ where: base, select: { city: true, state: true } }),
    prisma.businessSpecialty.findMany({ where: { business: base }, select: { name: true }, distinct: ["name"] }),
    prisma.businessService.findMany({
      where: { isActive: true, business: base },
      select: { category: true },
      distinct: ["category"],
    }),
  ]);

  const locationOptions = Array.from(new Set(locations.flatMap((l) => [l.city, l.state]).filter((v): v is string => !!v))).sort();
  const specialtyOptions = Array.from(new Set(specialties.map((s) => s.name))).sort();
  const categoryOptions = Array.from(new Set(categories.map((c) => c.category)));
  const favoriteBusinessIds = favorites.map((f) => f.businessId);

  return (
    <DiscoverPageClient
      businesses={JSON.parse(JSON.stringify(businesses))}
      pagination={{ page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) }}
      favoriteBusinessIds={favoriteBusinessIds}
      filterOptions={{ locations: locationOptions, specialties: specialtyOptions, categories: categoryOptions }}
    />
  );
}
