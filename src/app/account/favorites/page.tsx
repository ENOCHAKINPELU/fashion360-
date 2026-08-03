import { Heart } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/lib/rbac";
import { EmptyState } from "@/shared/components/empty-state";
import { FavoriteBusinessesGrid } from "@/features/discover/components/favorite-businesses-grid";
import { FavoritePortfolioGrid } from "@/features/discover/components/favorite-portfolio-grid";

export default async function CustomerFavoritesPage() {
  const { profile } = await requireCustomerContext();

  const [businessFavorites, portfolioFavorites] = await Promise.all([
    prisma.businessFavorite.findMany({
      where: { customerProfileId: profile.id },
      orderBy: { createdAt: "desc" },
      include: {
        business: {
          select: { id: true, name: true, logoUrl: true, city: true, state: true, profile: { select: { username: true } }, verification: { select: { status: true } } },
        },
      },
    }),
    prisma.portfolioFavorite.findMany({
      where: { customerProfileId: profile.id },
      orderBy: { createdAt: "desc" },
      include: {
        portfolioItem: {
          select: { id: true, imageUrl: true, title: true, businessId: true, business: { select: { name: true, profile: { select: { username: true } } } } },
        },
      },
    }),
  ]);

  const hasFavorites = businessFavorites.length > 0 || portfolioFavorites.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Favorites</h1>
        <p className="text-sm text-muted-foreground">Businesses and portfolio items you&apos;ve saved.</p>
      </div>

      {!hasFavorites ? (
        <EmptyState icon={Heart} title="No Favorites Yet" description="Save businesses and designs you love." />
      ) : (
        <>
          <div className="space-y-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Favorite Businesses</p>
            {businessFavorites.length === 0 ? (
              <p className="text-sm text-muted-foreground">No favorite businesses yet.</p>
            ) : (
              <FavoriteBusinessesGrid
                favorites={businessFavorites.map((f) => ({
                  businessId: f.business.id,
                  name: f.business.name,
                  logoUrl: f.business.logoUrl,
                  location: [f.business.city, f.business.state].filter(Boolean).join(", "),
                  handle: f.business.profile?.username ?? f.business.id,
                  isVerified: f.business.verification?.status === "VERIFIED",
                }))}
              />
            )}
          </div>

          <div className="space-y-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Favorite Portfolio Items</p>
            {portfolioFavorites.length === 0 ? (
              <p className="text-sm text-muted-foreground">No favorite portfolio items yet.</p>
            ) : (
              <FavoritePortfolioGrid
                items={portfolioFavorites.map((f) => ({
                  id: f.portfolioItem.id,
                  imageUrl: f.portfolioItem.imageUrl,
                  title: f.portfolioItem.title,
                  businessName: f.portfolioItem.business.name,
                  handle: f.portfolioItem.business.profile?.username ?? f.portfolioItem.businessId,
                }))}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
