import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
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

const DAY = 24 * 60 * 60;
const SHORT_SESSION = DAY; // not remembered: 1 day
const LONG_SESSION = 30 * DAY; // remembered / OAuth: 30 days

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: LONG_SESSION },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember me", type: "text" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const { allowed } = checkRateLimit(`login:${email}`, 8, 15 * 60 * 1000);
        if (!allowed) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          businessId: user.businessId,
          remember: credentials?.remember === "true",
        };
      },
    }),
  ],
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
});
