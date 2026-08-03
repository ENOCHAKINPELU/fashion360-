import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError } from "@/lib/rbac";
import { customerRegisterSchema } from "@/lib/validations/auth";
import { sendEmail } from "@/lib/mailer";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { logAuditEvent } from "@/lib/audit-log";
import { syncFashionPassport } from "@/lib/fashion-passport";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Mirrors /api/register (business) exactly for auth mechanics (rate limit,
// hashing, verification email) — the only difference is what gets created:
// a platform-level CustomerProfile/FashionPassport/PrivacySettings instead
// of a Business, plus consent records for the two checkboxes this form
// requires that the business form doesn't have.
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { allowed } = checkRateLimit(`register:${ip}`, 10, 60 * 60 * 1000);
    if (!allowed) throw new ApiError(429, "Too many attempts. Please try again later.");

    const data = customerRegisterSchema.parse(await req.json());

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ApiError(409, "An account with this email already exists");

    const passwordHash = await bcrypt.hash(data.password, 12);
    const [firstName, ...rest] = data.fullName.trim().split(/\s+/);
    const lastName = rest.join(" ") || null;

    const { user } = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: data.email,
          firstName,
          lastName,
          name: data.fullName,
          phone: data.phone,
          passwordHash,
          role: "CUSTOMER",
        },
      });

      const profile = await tx.customerProfile.create({
        data: { userId: createdUser.id, phone: data.phone },
      });
      await syncFashionPassport(tx, profile);
      await tx.privacySettings.create({ data: { customerProfileId: profile.id } });

      await tx.userConsent.createMany({
        data: [
          { userId: createdUser.id, type: "TERMS_OF_SERVICE", version: "1.0", ipAddress: ip },
          { userId: createdUser.id, type: "PRIVACY_POLICY", version: "1.0", ipAddress: ip },
        ],
      });

      // Convergence: if any business already has this email in its
      // customer CRM, that business has a real, already-established
      // service relationship with this person — link and activate rather
      // than leaving it PENDING (implementation intent: "eventually do the
      // same" — the CRM row and the new platform account describe the same
      // relationship, not two separate ones).
      const matches = await tx.customer.findMany({
        where: { email: { equals: data.email, mode: "insensitive" }, businessRelationship: null },
      });
      for (const match of matches) {
        await tx.businessCustomerRelationship.create({
          data: {
            businessId: match.businessId,
            customerProfileId: profile.id,
            status: "ACTIVE",
            linkedCustomerId: match.id,
            respondedAt: new Date(),
          },
        });
        await logAuditEvent(tx, {
          action: "BUSINESS_RELATIONSHIP_ACCEPTED",
          userId: createdUser.id,
          businessId: match.businessId,
          entityType: "Customer",
          entityId: match.id,
          metadata: { reason: "auto-matched by email at registration" },
        });
      }

      await logAuditEvent(tx, {
        action: "CUSTOMER_REGISTERED",
        userId: createdUser.id,
        entityType: "User",
        entityId: createdUser.id,
        ipAddress: ip,
        userAgent: req.headers.get("user-agent"),
      });

      return { user: createdUser };
    });

    const token = crypto.randomBytes(32).toString("hex");
    await prisma.verificationToken.create({
      data: { identifier: user.email, token, expires: new Date(Date.now() + 1000 * 60 * 60 * 24) },
    });

    await sendEmail({
      to: user.email,
      subject: "Verify your Fashion360 account",
      body: `Welcome to Fashion360, ${firstName}! Your digital fashion journey starts here. Verify your email: ${process.env.AUTH_URL ?? ""}/verify-email?token=${token}`,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
