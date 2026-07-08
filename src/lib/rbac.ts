import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { UserRole } from "@prisma/client";

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

export async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user) throw new ApiError(401, "Not authenticated");
  if (session.user.role !== "SUPER_ADMIN") throw new ApiError(403, "Not authorized");
  return { session };
}
