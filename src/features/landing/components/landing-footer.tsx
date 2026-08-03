"use client";

import Link from "next/link";
import { Logo } from "@/shared/components/logo";
import { useWaitlistDialog } from "@/features/landing/components/waitlist-dialog-provider";

const LINKS = {
  Fashion360: [
    { label: "The Experience", href: "#experience" },
    { label: "Protection", href: "#protection" },
    { label: "For Customers", href: "#for-customers" },
  ],
  Legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
};

export function LandingFooter() {
  const openWaitlist = useWaitlistDialog();

  return (
    <footer className="border-t border-border py-14">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 sm:flex-row sm:justify-between lg:px-8">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm text-muted-foreground">
            The premium fashion marketplace connecting customers with trusted designers, from
            discovery to delivery. Coming soon.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-8">
          {Object.entries(LINKS).map(([section, links]) => (
            <div key={section}>
              <p className="text-sm font-semibold text-foreground">{section}</p>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <p className="text-sm font-semibold text-foreground">Designers</p>
            <ul className="mt-3 space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => openWaitlist("DESIGNER")}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Join as a Founding Designer
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-7xl border-t border-border px-6 pt-6 text-sm text-muted-foreground lg:px-8">
        © {new Date().getFullYear()} Fashion360. All rights reserved.
      </div>
    </footer>
  );
}
