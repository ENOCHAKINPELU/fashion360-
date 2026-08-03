import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireCustomerContext } from "@/lib/rbac";

// Read-only from the API's perspective — completion/status are always
// derived from CustomerProfile fields (see lib/fashion-passport.ts) and
// recomputed automatically whenever the profile is updated, so there's no
// separate "update" action to expose here.
export async function GET() {
  try {
    const { profile } = await requireCustomerContext();

    const passport = await prisma.fashionPassport.findUnique({ where: { customerProfileId: profile.id } });
    return NextResponse.json({ passport });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
