import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { customerPreferenceSchema } from "@/lib/validations/customer";
import { logCustomerActivity } from "@/lib/customer-activity";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;

    const customer = await prisma.customer.findFirst({ where: { id, businessId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    const data = customerPreferenceSchema.parse(await req.json());

    const preferences = await prisma.$transaction(async (tx) => {
      const saved = await tx.customerPreference.upsert({
        where: { customerId: id },
        update: data,
        create: { customerId: id, ...data },
      });

      await logCustomerActivity(tx, {
        customerId: id,
        businessId,
        type: "PREFERENCE_UPDATED",
        title: "Preferences updated",
        actorId: session.user.id,
      });

      return saved;
    });

    return NextResponse.json({ preferences });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
