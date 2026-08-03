import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";
import { customerPreferencesSchema } from "@/lib/validations/personalization";

// Part 3/29: the structured preference profile — a dedicated view/edit
// surface over CustomerProfile's own preference fields (built in Phase 2)
// plus the Phase 10 additions (price range, service types, preferred
// designers), kept separate from the general PATCH /api/customer-profile
// editor so the two forms (basic profile vs. taste preferences) can evolve
// independently without either overwriting the other's fields.
export async function GET() {
  try {
    const { profile } = await requireCustomerContext();
    const [current, preferredDesigners] = await Promise.all([
      prisma.customerProfile.findUniqueOrThrow({
        where: { id: profile.id },
        select: {
          favoriteColors: true,
          favoriteFabrics: true,
          stylePreferences: true,
          fashionInterests: true,
          preferredClothingCategories: true,
          commonOccasions: true,
          preferredServiceTypes: true,
          priceRangeMin: true,
          priceRangeMax: true,
        },
      }),
      prisma.customerPreferredDesigner.findMany({ where: { customerProfileId: profile.id }, include: { business: { select: { id: true, name: true, logoUrl: true } } } }),
    ]);

    return NextResponse.json({ preferences: current, preferredDesigners: preferredDesigners.map((d) => d.business) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { profile } = await requireCustomerContext();
    const data = customerPreferencesSchema.parse(await req.json());

    const { preferredDesignerBusinessIds, ...profileFields } = data;

    await prisma.customerProfile.update({ where: { id: profile.id }, data: profileFields });

    if (preferredDesignerBusinessIds) {
      await prisma.customerPreferredDesigner.deleteMany({ where: { customerProfileId: profile.id, businessId: { notIn: preferredDesignerBusinessIds } } });
      for (const businessId of preferredDesignerBusinessIds) {
        await prisma.customerPreferredDesigner.upsert({
          where: { customerProfileId_businessId: { customerProfileId: profile.id, businessId } },
          create: { customerProfileId: profile.id, businessId },
          update: {},
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
