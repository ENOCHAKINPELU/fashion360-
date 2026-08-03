import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireCustomerContext } from "@/lib/rbac";
import { customerProfileSchema } from "@/lib/validations/customer-account";
import { syncFashionPassport } from "@/lib/fashion-passport";

export async function GET() {
  try {
    const { profile } = await requireCustomerContext();

    const full = await prisma.customerProfile.findUniqueOrThrow({
      where: { id: profile.id },
      include: { fashionPassport: true, user: { select: { name: true, firstName: true, lastName: true, email: true } } },
    });

    return NextResponse.json({ profile: full });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { profile } = await requireCustomerContext();
    const data = customerProfileSchema.partial().parse(await req.json());

    if (data.username) {
      const existing = await prisma.customerProfile.findUnique({ where: { username: data.username } });
      if (existing && existing.id !== profile.id) throw new ApiError(409, "This username is already taken");
    }

    const { dateOfBirth, ...rest } = data;
    const updateData = {
      ...rest,
      ...(dateOfBirth !== undefined ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null } : {}),
    };

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.customerProfile.update({ where: { id: profile.id }, data: updateData });
      await syncFashionPassport(tx, result);
      return tx.customerProfile.findUniqueOrThrow({ where: { id: result.id }, include: { fashionPassport: true } });
    });

    return NextResponse.json({ profile: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
