import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { LogOut } from "lucide-react";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMER") redirect("/sign-in");

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6">
        <Link href="/portal" className="font-display text-lg tracking-tight text-foreground">
          Fashion360
        </Link>
        <Link href="/api/auth/signout" className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
          <LogOut className="h-4 w-4" />
          Sign out
        </Link>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 p-6">{children}</main>
    </div>
  );
}
