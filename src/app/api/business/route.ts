import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { businessRegistrationSchema, businessSettingsSchema } from "@/lib/validations/business";
import { ensurePredefinedTags } from "@/lib/customer-tags";
import { ensureDefaultAppointmentTypes } from "@/lib/appointment-types";
import { ensureDefaultMeasurementTypes } from "@/lib/measurement-types";
import { ensureDefaultMeasurementTemplates } from "@/lib/measurement-templates";
import { ensureDefaultDesignCategories } from "@/lib/design-categories";
import { ensureDefaultDesignTags } from "@/lib/design-tags";
import { DEFAULT_WORKING_HOURS } from "@/lib/validations/business";
import { logAuditEvent } from "@/lib/audit-log";
import crypto from "crypto";

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    crypto.randomBytes(3).toString("hex")
  );
}

// Onboarding: create the business for a signed-in owner who doesn't have one yet.
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError(401, "Not authenticated");
    if (!["OWNER", "STAFF"].includes(session.user.role)) throw new ApiError(403, "Not authorized");
    if (session.user.businessId) throw new ApiError(409, "This account already has a business");

    const data = businessRegistrationSchema.parse(await req.json());

    const business = await prisma.$transaction(
      async (tx) => {
        const business = await tx.business.create({
          data: {
            name: data.name,
            slug: slugify(data.name),
            logoUrl: data.logoUrl || null,
            email: data.email || null,
            phone: data.phone || null,
            country: data.country,
            state: data.state || null,
            city: data.city || null,
            address: data.address || null,
            businessType: data.businessType,
            currency: data.currency,
            timezone: data.timezone,
            measurementUnit: data.measurementUnit,
            workingHours: DEFAULT_WORKING_HOURS,
            onboardingCompletedAt: new Date(),
          },
        });

        await tx.user.update({ where: { id: session.user.id }, data: { businessId: business.id } });
        await ensurePredefinedTags(tx, business.id);
        await ensureDefaultAppointmentTypes(tx, business.id);
        await tx.businessAvailability.create({ data: { businessId: business.id } });
        await ensureDefaultMeasurementTypes(tx, business.id);
        await ensureDefaultMeasurementTemplates(tx, business.id);
        await ensureDefaultDesignCategories(tx, business.id);
        await ensureDefaultDesignTags(tx, business.id);
        await tx.businessProfile.create({ data: { businessId: business.id } });
        await tx.businessVerification.create({ data: { businessId: business.id } });

        await tx.notification.create({
          data: {
            businessId: business.id,
            userId: session.user.id,
            title: "Welcome to Fashion360",
            body: `${business.name} is now set up. Explore your dashboard to get started.`,
            type: "success",
          },
        });

        await logAuditEvent(tx, {
          action: "BUSINESS_CREATED",
          userId: session.user.id,
          businessId: business.id,
          entityType: "Business",
          entityId: business.id,
        });

        return business;
      },
      { maxWait: 30_000, timeout: 120_000 }
    );

    return NextResponse.json({ business }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext(["OWNER", "SUPER_ADMIN"]);
    const data = businessSettingsSchema.parse(await req.json());

    const business = await prisma.business.update({
      where: { id: businessId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl || null } : {}),
        ...(data.email !== undefined ? { email: data.email || null } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.country !== undefined ? { country: data.country } : {}),
        ...(data.state !== undefined ? { state: data.state } : {}),
        ...(data.city !== undefined ? { city: data.city } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.businessType !== undefined ? { businessType: data.businessType } : {}),
        ...(data.currency !== undefined ? { currency: data.currency } : {}),
        ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
        ...(data.measurementUnit !== undefined ? { measurementUnit: data.measurementUnit } : {}),
        ...(data.brandColors !== undefined ? { brandColors: data.brandColors } : {}),
        ...(data.workingHours !== undefined ? { workingHours: data.workingHours } : {}),
        ...(data.socialLinks !== undefined ? { socialLinks: data.socialLinks } : {}),
      },
    });

    return NextResponse.json({ business });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
