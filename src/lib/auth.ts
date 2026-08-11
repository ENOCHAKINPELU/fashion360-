import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { authConfig } from "@/lib/auth.config";
import { logAuditEvent } from "@/lib/audit-log";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
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
    ...authConfig.callbacks,
    // Extends the edge-safe jwt() callback (which only ever sets
    // businessId/role at initial sign-in — see auth.config.ts) with a
    // DB-touching branch for `trigger === "update"`. Only possible here,
    // not in auth.config.ts, since that file is shared with the
    // Edge-runtime proxy and can't import Prisma. Triggered client-side via
    // next-auth/react's update() right after a business is created (see
    // business-details-form.tsx) — without this, a brand-new designer's
    // session keeps the businessId: null it had at sign-in for the rest of
    // that session's lifetime (up to 30 days), and dashboard/layout.tsx's
    // `if (!session.user.businessId) redirect(...)` bounces them right back
    // to onboarding forever, even though the business now exists.
    async jwt(params) {
      const token = await authConfig.callbacks!.jwt!(params);
      if (token && params.trigger === "update" && token.sub) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.sub }, select: { businessId: true, role: true } });
        if (dbUser) {
          token.businessId = dbUser.businessId;
          token.role = dbUser.role;
        }
      }
      return token;
    },
  },
  events: {
    async signIn({ user }) {
      if (user.id) {
        await logAuditEvent(prisma, { action: "USER_LOGIN", userId: user.id, entityType: "User", entityId: user.id });
      }
    },
    // USER_LOGOUT existed as an AuditLogAction value but nothing ever fired
    // it — signOut() is called client-side (next-auth/react) with no
    // server-side hook wired to log it. For a JWT-strategy session this
    // event receives `token`, not `session` (there's no DB session row to
    // hand back), so the actor is read from token.sub the same way the jwt
    // callback's own update-trigger branch does above.
    async signOut(message) {
      const userId = "token" in message ? message.token?.sub : undefined;
      if (userId) {
        await logAuditEvent(prisma, { action: "USER_LOGOUT", userId, entityType: "User", entityId: userId });
      }
    },
  },
});
