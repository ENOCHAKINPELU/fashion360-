import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

// Reusable 404 state — wired into app/admin/not-found.tsx (Next's own
// not-found convention).
export function NotFoundState({
  message = "This page doesn't exist.",
  homeHref = "/",
  homeLabel = "Go back",
}: {
  message?: string;
  homeHref?: string;
  homeLabel?: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 py-24 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Compass className="size-6" aria-hidden="true" />
      </div>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      <Button asChild size="sm" variant="outline" className="mt-1">
        <Link href={homeHref}>{homeLabel}</Link>
      </Button>
    </div>
  );
}
