import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      businessId: string | null;
    } & DefaultSessionUser;
  }
  interface User {
    role?: UserRole;
    businessId?: string | null;
    remember?: boolean;
  }
}

// Keep the default shape (name/email/image) alongside our custom fields.
type DefaultSessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export const DAY = 24 * 60 * 60;
export const SHORT_SESSION = DAY; // not remembered: 1 day
export const LONG_SESSION = 30 * DAY; // remembered / OAuth: 30 days

// Where a signed-in user actually belongs — shared by proxy.ts (Edge, role
// cross-redirects) and the /unauthorized page (Node, its "go back" button)
// so both agree on the same destination instead of each hardcoding it.
export function homeFor(role: string): string {
  if (role === "SUPER_ADMIN") return "/admin";
  if (role === "CUSTOMER") return "/account";
  if (["OWNER", "STAFF"].includes(role)) return "/dashboard";
  return "/";
}

/**
 * Edge-safe subset of the NextAuth config: no adapter, no providers that
 * touch Prisma/pg/bcrypt. This is what middleware uses (middleware runs on
 * the Edge runtime, which can't load Node-only modules like `pg`). The full
 * config in auth.ts spreads this and adds the adapter + providers for
 * everywhere else (API routes, server components).
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt", maxAge: LONG_SESSION },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.businessId = user.businessId ?? null;
        const remember = user.remember ?? true; // OAuth sign-ins default to a persistent session
        token.exp = Math.floor(Date.now() / 1000) + (remember ? LONG_SESSION : SHORT_SESSION);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as UserRole;
        session.user.businessId = (token.businessId as string | null) ?? null;
      }
      return session;
    },
  },
};
