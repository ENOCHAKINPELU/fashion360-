import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/lib/rbac";
import { discoverableDesignWhere } from "@/lib/design-catalog-access";
import { logCustomerBehavior } from "@/lib/customer-behavior";
import { DesignDetailClient } from "@/features/personalization/components/design-detail-client";

export default async function DesignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await requireCustomerContext();
  const { id } = await params;

  const design = await prisma.design.findFirst({
    where: { id, ...discoverableDesignWhere() },
    include: {
      business: { select: { id: true, name: true, logoUrl: true, city: true, state: true } },
      category: { select: { name: true } },
      tags: { select: { name: true } },
      images: { orderBy: { sortOrder: "asc" }, select: { url: true } },
    },
  });
  if (!design) notFound();

  const favorited = await prisma.designFavorite.findUnique({ where: { designId_customerProfileId: { designId: id, customerProfileId: profile.id } } });

  await Promise.all([
    prisma.design.update({ where: { id }, data: { viewCount: { increment: 1 } } }),
    logCustomerBehavior(prisma, { customerProfileId: profile.id, businessId: design.businessId, type: "DESIGN_VIEWED", targetType: "DESIGN", targetId: id }),
  ]);

  return <DesignDetailClient design={JSON.parse(JSON.stringify(design))} initialFavorited={!!favorited} />;
}
