import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

// Part 19's "Business Profile Completion" — mirrors the customer Fashion
// Passport completion pattern (lib/fashion-passport.ts) but for the
// business side, computed live rather than persisted (there's no
// "BusinessProfileCompletion" table — see the schema comment explaining
// why a separate ProfileCompletion model wasn't added for either side).
export async function computeBusinessProfileCompletion(db: Db, businessId: string) {
  const [business, profile, specialtyCount, portfolioCount] = await Promise.all([
    db.business.findUniqueOrThrow({ where: { id: businessId }, select: { logoUrl: true, phone: true, email: true, city: true, state: true, workingHours: true } }),
    db.businessProfile.findUnique({ where: { businessId } }),
    db.businessSpecialty.count({ where: { businessId } }),
    db.businessPortfolioItem.count({ where: { businessId } }),
  ]);

  const checks = [
    { label: "Add Business Logo", href: "/dashboard/settings", met: !!business.logoUrl },
    { label: "Add Business Description", href: "/dashboard/settings", met: !!profile?.description },
    { label: "Add Specialties", href: "/dashboard/settings", met: specialtyCount > 0 },
    { label: "Add Location", href: "/dashboard/settings", met: !!(business.city || business.state) },
    { label: "Add Contact Details", href: "/dashboard/settings", met: !!(business.phone || business.email) },
    { label: "Set Business Hours", href: "/dashboard/settings", met: !!business.workingHours },
    { label: "Add Portfolio Items", href: "/dashboard/settings", met: portfolioCount > 0 },
  ];

  const met = checks.filter((c) => c.met).length;
  const completionPercent = Math.round((met / checks.length) * 100);
  const missingItems = checks.filter((c) => !c.met).map(({ label, href }) => ({ label, href }));

  return { completionPercent, missingItems };
}
