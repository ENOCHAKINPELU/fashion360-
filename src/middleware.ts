import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

// Edge middleware — must use the edge-safe authConfig (no adapter, no
// pg/bcrypt-touching providers), never the full config in lib/auth.ts.
// JWT sessions don't need the adapter to be *read*, only AUTH_SECRET
// (which NextAuth reads from env automatically), so this correctly
// recognizes a session created by the full sign-in flow elsewhere.
const { auth } = NextAuth(authConfig);

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

  // SUPER_ADMIN is platform-level and never has a businessId by design —
  // its home is /admin, not /dashboard, and it must never be routed
  // through business onboarding (which it can't complete). This exemption
  // is the fix: the previous version of this file (deleted, then
  // unintentionally still served by a stale edge bundle) lacked it, which
  // is what sent the admin account into onboarding after every login.
  if (user.role === "SUPER_ADMIN") {
    if (pathname.startsWith(DASHBOARD_PREFIX)) return NextResponse.redirect(new URL("/admin", req.nextUrl.origin));
    return NextResponse.next();
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
