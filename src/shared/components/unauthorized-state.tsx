import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shown when a signed-in user is explicitly denied a specific area (as
// opposed to simply not being signed in, which redirects to /login instead
// — see proxy.ts). Always paired with a real access-control decision made
// server-side beforehand; this component only ever communicates a denial
// that already happened, it never makes one.
export function UnauthorizedState({
  message = "You don't have permission to access this area.",
  homeHref = "/",
  homeLabel = "Go back",
}: {
  message?: string;
  homeHref?: string;
  homeLabel?: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 py-24 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-warning-soft text-warning">
        <ShieldAlert className="size-6" aria-hidden="true" />
      </div>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      <Button asChild size="sm" className="mt-1">
        <Link href={homeHref}>{homeLabel}</Link>
      </Button>
    </div>
  );
}
