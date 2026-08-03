import Image from "next/image";
import { cn } from "@/lib/utils";

// The one Fashion360 logo component — every header, sidebar, and auth page
// across the app renders through this, so this is the single place the
// brand mark is defined. Icon artwork has a transparent background (works
// on both light headers and the dark sidebar); the wordmark stays live text
// rather than baking it into a raster image, so it can inherit surrounding
// color/weight/dark-mode instead of shipping a flat white-background PNG
// into contexts it wouldn't match.
export function Logo({ className, mark = false }: { className?: string; mark?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image
        src="/images/fashion360/brand/logo-icon.png"
        alt="Fashion360"
        width={32}
        height={36}
        priority
        className="h-8 w-auto shrink-0"
      />
      {!mark && <span className="text-lg font-semibold tracking-tight">Fashion360</span>}
    </div>
  );
}
