import Link from "next/link";
import { Logo } from "@/shared/components/logo";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--accent-soft),_var(--background)_60%)]">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-10 sm:px-6">
        <Link href="/" className="mb-8">
          <Logo />
        </Link>
        {children}
      </div>
    </div>
  );
}
