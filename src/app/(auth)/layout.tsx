import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-muted-surface px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="font-display text-2xl tracking-tight text-foreground">
            Fashion360
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
