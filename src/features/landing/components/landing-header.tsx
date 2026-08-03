"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Logo } from "@/shared/components/logo";
import { useWaitlistDialog } from "@/features/landing/components/waitlist-dialog-provider";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#experience", label: "Experience" },
  { href: "#protection", label: "Protection" },
  { href: "#for-customers", label: "For Customers" },
  { href: "#for-designers", label: "For Designers" },
];

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const openWaitlist = useWaitlistDialog();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b transition-[background-color,box-shadow,backdrop-filter] duration-300",
        scrolled ? "border-border bg-surface/85 shadow-sm backdrop-blur-lg" : "border-transparent bg-surface/40 backdrop-blur-sm"
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/">
          <Logo />
        </Link>
        <nav onMouseLeave={() => setHovered(null)} className="hidden items-center gap-8 text-sm font-medium text-muted-foreground lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onMouseEnter={() => setHovered(link.href)}
              className="relative py-1 transition-colors hover:text-foreground"
            >
              {link.label}
              <AnimatePresence>
                {hovered === link.href && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute inset-x-0 -bottom-0.5 h-px bg-primary"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ layout: { type: "spring", stiffness: 380, damping: 32 }, opacity: { duration: 0.15 } }}
                  />
                )}
              </AnimatePresence>
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
              Sign in
            </Button>
          </Link>
          <Button size="sm" onClick={() => openWaitlist("CUSTOMER")}>
            Join the Waitlist
          </Button>
        </div>
      </div>
    </header>
  );
}
