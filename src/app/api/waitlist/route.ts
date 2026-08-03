import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError } from "@/lib/rbac";
import { waitlistSignupSchema } from "@/lib/validations/waitlist";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

// Public, unauthenticated — this is the pre-launch landing page, there's no
// account to be signed into yet. Upserts on [email, role] so resubmitting
// (double-click, retry after a flaky connection) is always a clean success,
// never a "you already joined" error. Role-specific fields from the other
// role's form are simply never sent (each form only collects its own
// fields) rather than needing to be stripped here.
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { allowed } = checkRateLimit(`waitlist:${ip}`, 10, 60 * 60 * 1000);
    if (!allowed) throw new ApiError(429, "Too many attempts. Please try again later.");

    const data = waitlistSignupSchema.parse(await req.json());
    const email = data.email.toLowerCase();

    const shared = {
      name: data.name,
      phone: data.phone,
      city: data.city || null,
      country: data.country || null,
      fashionInterest: data.role === "CUSTOMER" ? data.fashionInterest || null : null,
      businessName: data.role === "DESIGNER" ? data.businessName || null : null,
      specialty: data.role === "DESIGNER" ? data.specialty || null : null,
      yearsExperience: data.role === "DESIGNER" ? (data.yearsExperience ?? null) : null,
      portfolioUrl: data.role === "DESIGNER" ? data.portfolioUrl || null : null,
    };

    await prisma.waitlistSignup.upsert({
      where: { email_role: { email, role: data.role } },
      create: { email, role: data.role, source: data.source, ...shared },
      update: shared,
    });

    return NextResponse.json({ joined: true }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
