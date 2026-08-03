import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { customerFormSchema } from "@/lib/validations/customer";
import { logCustomerActivity } from "@/lib/customer-activity";
import { z } from "zod";

async function getScopedCustomer(businessId: string, id: string) {
  const customer = await prisma.customer.findFirst({ where: { id, businessId } });
  if (!customer) throw new ApiError(404, "Customer not found");
  return customer;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;

    const customer = await prisma.customer.findFirst({
      where: { id, businessId },
      include: {
        tags: true,
        preferences: true,
        notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
        files: { orderBy: { createdAt: "desc" } },
        activities: { orderBy: { createdAt: "desc" }, take: 10, include: { actor: { select: { name: true } } } },
      },
    });
    if (!customer) throw new ApiError(404, "Customer not found");

    return NextResponse.json({ customer });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const patchSchema = z.union([
  customerFormSchema.partial(),
  z.object({ action: z.enum(["archive", "unarchive"]) }),
]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    await getScopedCustomer(businessId, id);

    const body = patchSchema.parse(await req.json());

    if ("action" in body) {
      const isArchiving = body.action === "archive";
      const customer = await prisma.$transaction(async (tx) => {
        const updated = await tx.customer.update({
          where: { id },
          data: { isArchived: isArchiving, archivedAt: isArchiving ? new Date() : null },
          include: { tags: true },
        });
        await logCustomerActivity(tx, {
          customerId: id,
          businessId,
          type: "STATUS_CHANGED",
          title: isArchiving ? "Customer archived" : "Customer restored from archive",
          actorId: session.user.id,
        });
        return updated;
      });
      return NextResponse.json({ customer });
    }

    const data = body;
    if (data.email) {
      const existing = await prisma.customer.findFirst({
        where: { businessId, email: data.email, isArchived: false, NOT: { id } },
      });
      if (existing) throw new ApiError(409, "A customer with this email already exists");
    }

    const customer = await prisma.$transaction(async (tx) => {
      const updated = await tx.customer.update({
        where: { id },
        data: {
          ...(data.profilePhotoUrl !== undefined ? { profilePhotoUrl: data.profilePhotoUrl || null } : {}),
          ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
          ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
          ...(data.email !== undefined ? { email: data.email || null } : {}),
          ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
          ...(data.whatsapp !== undefined ? { whatsapp: data.whatsapp || null } : {}),
          ...(data.gender !== undefined ? { gender: data.gender } : {}),
          ...(data.dateOfBirth !== undefined
            ? { dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null }
            : {}),
          ...(data.occupation !== undefined ? { occupation: data.occupation || null } : {}),
          ...(data.country !== undefined ? { country: data.country || null } : {}),
          ...(data.state !== undefined ? { state: data.state || null } : {}),
          ...(data.city !== undefined ? { city: data.city || null } : {}),
          ...(data.address !== undefined ? { address: data.address || null } : {}),
          ...(data.emergencyContactName !== undefined
            ? { emergencyContactName: data.emergencyContactName || null }
            : {}),
          ...(data.emergencyContactPhone !== undefined
            ? { emergencyContactPhone: data.emergencyContactPhone || null }
            : {}),
          ...(data.referralSource !== undefined ? { referralSource: data.referralSource || null } : {}),
          ...(data.preferredCommunication !== undefined
            ? { preferredCommunication: data.preferredCommunication }
            : {}),
          ...(data.specialNotes !== undefined ? { specialNotes: data.specialNotes || null } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.isVip !== undefined ? { isVip: data.isVip } : {}),
          ...(data.tags !== undefined ? { tags: { set: data.tags.map((tagId) => ({ id: tagId })) } } : {}),
        },
        include: { tags: true },
      });

      await logCustomerActivity(tx, {
        customerId: id,
        businessId,
        type: "PROFILE_UPDATED",
        title: "Customer profile updated",
        actorId: session.user.id,
      });

      return updated;
    });

    return NextResponse.json({ customer });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId } = await requireBusinessContext();
    const { id } = await params;
    await getScopedCustomer(businessId, id);

    await prisma.customer.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
