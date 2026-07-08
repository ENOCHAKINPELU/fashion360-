import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const DASHBOARD_PREFIX = "/dashboard";
const ONBOARDING_PREFIX = "/onboarding";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected = pathname.startsWith(DASHBOARD_PREFIX) || pathname.startsWith(ONBOARDING_PREFIX);

  if (!isProtected) return NextResponse.next();

  const user = req.auth?.user;
  if (!user) {
    const signInUrl = new URL("/login", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (!["OWNER", "STAFF", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  // Owners/staff without a business yet must finish onboarding first.
  if (pathname.startsWith(DASHBOARD_PREFIX) && !user.businessId) {
    return NextResponse.redirect(new URL("/onboarding/business", req.nextUrl.origin));
  }

  if (pathname.startsWith(ONBOARDING_PREFIX) && user.businessId) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*"],
};
