import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { homeFor } from "@/lib/auth.config";
import { UnauthorizedState } from "@/shared/components/unauthorized-state";

export const metadata: Metadata = {
  title: "Access denied | Fashion360",
};

const MESSAGES: Record<string, string> = {
  admin: "You don't have permission to access Fashion360 Admin.",
};

// Landed on by proxy.ts when a signed-in user is denied a specific area
// (currently just /admin) — never reachable by a logged-out visitor, who
// gets sent to /login instead. `from` is display-only, never a trust
// decision: the actual access check already happened in proxy.ts before
// this page was ever reached.
export default async function UnauthorizedPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const session = await auth();
  const role = session?.user?.role;

  return (
    <UnauthorizedState
      message={(from && MESSAGES[from]) || "You don't have permission to access this area."}
      homeHref={role ? homeFor(role) : "/"}
      homeLabel={role ? "Go to your dashboard" : "Go home"}
    />
  );
}
