import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { discoverableDesignWhere } from "@/lib/design-catalog-access";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 20;

// Part 6/9/11/12: the customer-facing design catalog browse — this didn't
// exist anywhere before Phase 10 (the only prior "Design" browsing was
// staff-side, in the order-creation wizard). Mirrors /account/discover's
// query shape for businesses.
export async function GET(req: NextRequest) {
  try {
    await requireCustomerContext();
    const search = req.nextUrl.searchParams.get("search")?.trim();
    const category = req.nextUrl.searchParams.get("category")?.trim();
    const occasion = req.nextUrl.searchParams.get("occasion")?.trim();
    const sort = req.nextUrl.searchParams.get("sort") ?? "newest";
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1));

    const where: Prisma.DesignWhereInput = {
      ...discoverableDesignWhere(),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { tags: { some: { name: { contains: search, mode: "insensitive" } } } },
              { category: { name: { contains: search, mode: "insensitive" } } },
              { occasion: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(category ? { category: { name: { equals: category, mode: "insensitive" } } } : {}),
      ...(occasion ? { occasion: { equals: occasion, mode: "insensitive" } } : {}),
    };

    const orderBy: Prisma.DesignOrderByWithRelationInput = sort === "popular" ? { viewCount: "desc" } : sort === "price-low" ? { basePrice: "asc" } : sort === "price-high" ? { basePrice: "desc" } : { createdAt: "desc" };

    const [designs, total] = await Promise.all([
      prisma.design.findMany({
        where,
        orderBy,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          name: true,
          mainImageUrl: true,
          basePrice: true,
          occasion: true,
          businessId: true,
          business: { select: { name: true, logoUrl: true } },
          category: { select: { name: true } },
        },
      }),
      prisma.design.count({ where }),
    ]);

    return NextResponse.json({ designs, pagination: { page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
