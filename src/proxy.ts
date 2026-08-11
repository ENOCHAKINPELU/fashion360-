import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig, homeFor } from "@/lib/auth.config";

// Uses the slim config (no Prisma adapter/providers) so this request-gating
// layer never depends on the database — it only needs to decode the JWT.
const { auth } = NextAuth(authConfig);

const DASHBOARD_PREFIX = "/dashboard";
const ACCOUNT_PREFIX = "/account";
const ADMIN_PREFIX = "/admin";
const ONBOARDING_BUSINESS_PREFIX = "/onboarding/business";
const ONBOARDING_CUSTOMER_PREFIX = "/onboarding/customer";
const ONBOARDING_PREFIX = "/onboarding";
const BUSINESS_ROLES = ["OWNER", "STAFF", "SUPER_ADMIN"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected =
    pathname.startsWith(DASHBOARD_PREFIX) ||
    pathname.startsWith(ACCOUNT_PREFIX) ||
    pathname.startsWith(ADMIN_PREFIX) ||
    pathname.startsWith(ONBOARDING_PREFIX);

  if (!isProtected) return NextResponse.next();

  const user = req.auth?.user;
  if (!user) {
    const signInUrl = new URL("/login", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  const isBusinessUser = BUSINESS_ROLES.includes(user.role);
  const isCustomer = user.role === "CUSTOMER";
  const isSuperAdmin = user.role === "SUPER_ADMIN";

  // Admin-only area — the Edge-level gate that was missing here; previously
  // the only thing standing between a non-admin and /admin's pages was
  // admin/layout.tsx's own server check, which works but breaks the
  // defense-in-depth pattern every other protected area in this file
  // follows (a page-level check reachable only after a request already got
  // this far, rather than being turned away before rendering starts).
  //
  // Routed through /unauthorized rather than straight to homeFor() like the
  // other cross-role redirects below: a signed-in user who typed or clicked
  // their way to /admin deserves to be told why they ended up somewhere
  // else, not silently teleported. The other protected areas keep their
  // existing silent-redirect behavior unchanged.
  if (pathname.startsWith(ADMIN_PREFIX) && !isSuperAdmin) {
    const unauthorizedUrl = new URL("/unauthorized", req.nextUrl.origin);
    unauthorizedUrl.searchParams.set("from", "admin");
    return NextResponse.redirect(unauthorizedUrl);
  }

  // Business-only areas: the existing business dashboard, unchanged, plus
  // its onboarding step. A signed-in user landing here who isn't a business
  // user is sent to their own home rather than back through /login.
  if ((pathname.startsWith(DASHBOARD_PREFIX) || pathname.startsWith(ONBOARDING_BUSINESS_PREFIX)) && !isBusinessUser) {
    return NextResponse.redirect(new URL(homeFor(user.role), req.nextUrl.origin));
  }

  // Customer-only areas: the new account dashboard and its onboarding step.
  if ((pathname.startsWith(ACCOUNT_PREFIX) || pathname.startsWith(ONBOARDING_CUSTOMER_PREFIX)) && !isCustomer) {
    return NextResponse.redirect(new URL(homeFor(user.role), req.nextUrl.origin));
  }

  // SUPER_ADMIN is platform-level and never has a businessId by design —
  // its home is /admin, not /dashboard. Without this exemption it fell
  // into the "no business yet" branch below on every single login and
  // got sent through business onboarding, which it can never complete.
  if (isSuperAdmin && pathname.startsWith(DASHBOARD_PREFIX)) {
    return NextResponse.redirect(new URL(ADMIN_PREFIX, req.nextUrl.origin));
  }

  // Owners/staff without a business yet must finish onboarding first —
  // unchanged from before.
  if (pathname.startsWith(DASHBOARD_PREFIX) && !user.businessId) {
    return NextResponse.redirect(new URL(ONBOARDING_BUSINESS_PREFIX, req.nextUrl.origin));
  }
  if (pathname.startsWith(ONBOARDING_BUSINESS_PREFIX) && user.businessId) {
    return NextResponse.redirect(new URL(DASHBOARD_PREFIX, req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/account/:path*", "/admin/:path*", "/onboarding/:path*"],
};
