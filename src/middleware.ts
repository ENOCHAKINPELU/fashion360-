import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const OWNER_PREFIX = "/dashboard";
const PORTAL_PREFIX = "/portal";
const ADMIN_PREFIX = "/admin";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected =
    pathname.startsWith(OWNER_PREFIX) ||
    pathname.startsWith(PORTAL_PREFIX) ||
    pathname.startsWith(ADMIN_PREFIX);

  if (!isProtected) return NextResponse.next();

  const user = req.auth?.user;
  if (!user) {
    const signInUrl = new URL("/sign-in", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (pathname.startsWith(ADMIN_PREFIX) && user.role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  if (pathname.startsWith(OWNER_PREFIX) && !["OWNER", "STAFF", "SUPER_ADMIN"].includes(user.role)) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  if (pathname.startsWith(PORTAL_PREFIX) && user.role !== "CUSTOMER") {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/portal/:path*", "/admin/:path*"],
};
