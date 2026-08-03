import Link from "next/link";
import { BookUser } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Part 11: "Your Fashion Passport is 40% complete." — a gentle nudge, never
// a hard gate (customers can use their account fully before completing it).
export function FashionPassportBanner({ completionPercent }: { completionPercent: number }) {
  return (
    <Card className="border-none bg-accent-soft shadow-sm">
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
            <BookUser className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Your Fashion Passport is {completionPercent}% complete</p>
            <p className="text-xs text-muted-foreground">Finish your style profile so designers can serve you better.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/60">
            <div className="h-full bg-primary transition-all" style={{ width: `${completionPercent}%` }} />
          </div>
          <Button asChild size="sm">
            <Link href="/account/passport">Complete it</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
