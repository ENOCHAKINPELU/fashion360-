import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
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

// The one place a caught error becomes an HTTP response, for essentially
// every route in the app — which is exactly why a ZodError (thrown by every
// `schema.parse(await req.json())` call whose input fails validation) needs
// its own branch here rather than falling through to the generic 500 below.
// Before this, an invalid email, a weak password, a mistyped enum value —
// anything a client-side form doesn't independently re-validate — surfaced
// to the caller as an opaque "Internal server error" instead of the actual,
// human-readable reason. Fixing it here closes the gap on every route at
// once, rather than one schema.parse() call at a time.
function formatZodError(error: ZodError): string {
  const first = error.issues[0];
  if (!first) return "Invalid request";
  const path = first.path.join(".");
  return path ? `${path}: ${first.message}` : first.message;
}

// Most routes that create a unique row (a User by email, a WaitlistSignup
// by [email, role], ...) already check for an existing one first and throw
// a proper ApiError before ever reaching the database write. This branch
// exists for the gap that check alone can't close: two requests racing each
// other both pass the pre-check before either has committed, so the second
// write still hits the database's own unique constraint. Without this, that
// race surfaced as an opaque 500 instead of the same "already exists"
// message the normal, non-racing path already gives.
function formatUniqueConstraintError(error: Prisma.PrismaClientKnownRequestError): string {
  const target = error.meta?.target;
  const fields = Array.isArray(target) ? target.join(", ") : String(target ?? "this value");
  return `An entry with this ${fields} already exists`;
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: formatZodError(error) }, { status: 400 });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return NextResponse.json({ error: formatUniqueConstraintError(error) }, { status: 409 });
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

  const profile = await prisma.customerProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { suspendedAt: true } } },
  });
  if (!profile) throw new ApiError(404, "Customer profile not found");
  // Admin Phase 3: gives a suspension real, immediate effect on an
  // already-active session — this function already reads the DB once per
  // call (every customer-facing API route goes through it), so checking
  // suspendedAt here is free; login alone (auth.ts) only stops a NEW
  // session from starting.
  if (profile.user.suspendedAt) throw new ApiError(403, "Your account has been suspended. Contact support for help.");

  return { session, profile };
}

export async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user) throw new ApiError(401, "Not authenticated");
  if (session.user.role !== "SUPER_ADMIN") throw new ApiError(403, "Not authorized");
  return { session };
}
