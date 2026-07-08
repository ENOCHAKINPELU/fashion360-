import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";

const nav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/businesses", label: "Businesses" },
  { href: "/admin/users", label: "Users" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/sign-in");

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="flex h-16 items-center border-b border-border px-6">
          <span className="font-display text-lg tracking-tight text-foreground">Fashion360</span>
        </div>
        <p className="px-6 pt-4 text-xs font-medium uppercase tracking-wide text-muted">Platform Admin</p>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-muted-surface hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto bg-background p-6">{children}</main>
    </div>
  );
}
