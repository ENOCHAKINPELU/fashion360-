import type { Prisma, CustomerProfile } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

export async function nextPassportCode(db: Db) {
  const count = await db.fashionPassport.count();
  return `FXP-${String(count + 1).padStart(6, "0")}`;
}

// Section 13 of the Phase 2 spec: "Your Fashion Passport is 40% complete" +
// a clickable list of what's missing. "Add Measurements" is now checkable
// against the real Measurement Vault (Part 14), so this needs a DB read and
// is async — everything else stays a pure field check.
const FIELD_CHECKS: { key: string; label: string; href: string; met: (p: CustomerProfile) => boolean }[] = [
  { key: "photo", label: "Add Profile Photo", href: "/account/settings", met: (p) => !!p.profilePhotoUrl },
  { key: "fit", label: "Add Preferred Fit", href: "/account/passport", met: (p) => !!p.preferredFit },
  { key: "colors", label: "Add Favorite Colors", href: "/account/passport", met: (p) => p.favoriteColors.length > 0 },
  { key: "fabrics", label: "Add Favorite Fabrics", href: "/account/passport", met: (p) => p.favoriteFabrics.length > 0 },
  { key: "style", label: "Complete Style Profile", href: "/account/passport", met: (p) => p.stylePreferences.length > 0 },
  { key: "interests", label: "Add Fashion Interests", href: "/account/passport", met: (p) => p.fashionInterests.length > 0 },
];

export async function computePassportCompletion(db: Db, profile: CustomerProfile) {
  const hasMeasurements = (await db.passportMeasurementProfile.count({ where: { customerProfileId: profile.id } })) > 0;

  const checks = [
    ...FIELD_CHECKS.map((c) => ({ label: c.label, href: c.href, met: c.met(profile) })),
    { label: "Add Measurements", href: "/account/measurements", met: hasMeasurements },
  ];

  const met = checks.filter((c) => c.met).length;
  const completionPercent = Math.round((met / checks.length) * 100);
  const missingItems = checks.filter((c) => !c.met).map(({ label, href }) => ({ label, href }));

  return {
    completionPercent,
    status: (completionPercent >= 100 ? "COMPLETE" : "INCOMPLETE") as "COMPLETE" | "INCOMPLETE",
    missingItems,
  };
}

// Recomputes and persists completion after any CustomerProfile/Measurement
// Vault change, so FashionPassport.status/completionPercent never drift out
// of sync — and assigns a passportCode on first sync if one isn't set yet
// (covers both brand-new passports and the one-time backfill for rows
// created before this field existed).
export async function syncFashionPassport(db: Db, customerProfile: CustomerProfile) {
  const { completionPercent, status } = await computePassportCompletion(db, customerProfile);
  const existing = await db.fashionPassport.findUnique({ where: { customerProfileId: customerProfile.id } });

  const passportCode = existing?.passportCode ?? (await nextPassportCode(db));

  return db.fashionPassport.upsert({
    where: { customerProfileId: customerProfile.id },
    update: { completionPercent, status, passportCode },
    create: { customerProfileId: customerProfile.id, completionPercent, status, passportCode },
  });
}
