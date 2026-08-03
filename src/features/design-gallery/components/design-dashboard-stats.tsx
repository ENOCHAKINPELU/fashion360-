import { Shirt, Images, TrendingUp, UploadCloud, Heart } from "lucide-react";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { prisma } from "@/lib/prisma";

export async function DesignDashboardStats({ businessId }: { businessId: string }) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalDesigns, activeCollections, popularDesign, newUploads, favoriteCount] = await Promise.all([
    prisma.design.count({ where: { businessId, status: { not: "ARCHIVED" } } }),
    prisma.designCollection.count({ where: { businessId, status: "PUBLISHED" } }),
    prisma.design.findFirst({ where: { businessId }, orderBy: { viewCount: "desc" }, select: { viewCount: true } }),
    prisma.design.count({ where: { businessId, createdAt: { gte: monthStart } } }),
    prisma.designFavorite.count({ where: { businessId } }),
  ]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard label="Total Designs" value={String(totalDesigns)} icon={Shirt} />
      <StatCard label="Active Collections" value={String(activeCollections)} icon={Images} />
      <StatCard label="Most Popular Views" value={String(popularDesign?.viewCount ?? 0)} icon={TrendingUp} />
      <StatCard label="New Uploads This Month" value={String(newUploads)} icon={UploadCloud} />
      <StatCard label="Favorited Designs" value={String(favoriteCount)} icon={Heart} />
    </div>
  );
}
