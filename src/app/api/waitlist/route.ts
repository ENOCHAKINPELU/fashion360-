import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError } from "@/lib/rbac";
import { waitlistSignupSchema } from "@/lib/validations/waitlist";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

// Public, unauthenticated — this is the pre-launch landing page, there's no
// account to be signed into yet. Rejects a second signup on the same
// [email, role] with a clear, friendly "already joined" message rather than
// silently upserting over it — a genuine race (two near-simultaneous
// submits) still resolves correctly via apiErrorResponse's P2002 handler,
// since the create() below would hit the same unique constraint either way.
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { allowed } = checkRateLimit(`waitlist:${ip}`, 10, 60 * 60 * 1000);
    if (!allowed) throw new ApiError(429, "Too many attempts. Please try again later.");

    const data = waitlistSignupSchema.parse(await req.json());
    const email = data.email.toLowerCase();

    const existing = await prisma.waitlistSignup.findUnique({ where: { email_role: { email, role: data.role } } });
    if (existing) {
      throw new ApiError(409, `You're already on the ${data.role === "DESIGNER" ? "designer" : "customer"} waitlist — we'll be in touch.`);
    }

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

    await prisma.waitlistSignup.create({ data: { email, role: data.role, source: data.source, ...shared } });

    return NextResponse.json({ joined: true }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
