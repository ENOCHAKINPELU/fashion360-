import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { UserRole, StaffPermission } from "@prisma/client";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

/**
 * Every business-scoped API route must go through this: it guarantees a signed-in
 * OWNER/STAFF/SUPER_ADMIN with a businessId, so a query built from `businessId` can
 * never leak another tenant's rows.
 */
export async function requireBusinessContext(allowed: UserRole[] = ["OWNER", "STAFF", "SUPER_ADMIN"]) {
  const session = await auth();
  if (!session?.user) throw new ApiError(401, "Not authenticated");
  if (!allowed.includes(session.user.role)) throw new ApiError(403, "Not authorized");
  if (!session.user.businessId) throw new ApiError(403, "No business associated with this account");

  return { session, businessId: session.user.businessId };
}

/**
 * For the handful of Phase 8 actions the spec calls out as sensitive
 * (connecting a payment gateway, processing a refund): OWNER/SUPER_ADMIN
 * always pass, STAFF must carry the named permission. Checks staffPermissions
 * fresh from the database rather than the session/JWT, since permissions
 * aren't part of the token payload and a business shouldn't have to wait for
 * a staff member's session to expire before a permission change takes effect.
 */
export async function requireBusinessPermission(permission: StaffPermission) {
  const { session, businessId } = await requireBusinessContext();
  if (session.user.role === "OWNER" || session.user.role === "SUPER_ADMIN") {
    return { session, businessId };
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { staffPermissions: true } });
  if (!user?.staffPermissions.includes(permission)) {
    throw new ApiError(403, "You do not have permission to perform this action");
  }
  return { session, businessId };
}

/**
 * Every customer-scoped API route must go through this: guarantees a
 * signed-in CUSTOMER with a CustomerProfile, mirroring how
 * requireBusinessContext guarantees a businessId for staff routes. Throws
 * rather than lazily creating the profile — it should always exist by the
 * time a customer can log in, since registration creates it atomically.
 */
export async function requireCustomerContext() {
  const session = await auth();
  if (!session?.user) throw new ApiError(401, "Not authenticated");
  if (session.user.role !== "CUSTOMER") throw new ApiError(403, "Not authorized");

  const profile = await prisma.customerProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) throw new ApiError(404, "Customer profile not found");

  return { session, profile };
}

export async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user) throw new ApiError(401, "Not authenticated");
  if (session.user.role !== "SUPER_ADMIN") throw new ApiError(403, "Not authorized");
  return { session };
}
