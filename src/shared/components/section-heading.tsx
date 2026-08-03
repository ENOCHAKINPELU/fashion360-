import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
  light = false,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  light?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(align === "center" && "mx-auto text-center", className)}>
      {eyebrow && (
        <p className={cn("text-xs font-semibold tracking-[0.2em] uppercase", light ? "text-white/70" : "text-primary")}>
          {eyebrow}
        </p>
      )}
      <h2
        className={cn(
          "mt-3 font-display text-3xl leading-tight tracking-tight sm:text-4xl lg:text-5xl",
          light ? "text-white" : "text-foreground"
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={cn("mt-4 max-w-xl text-base leading-relaxed sm:text-lg", align === "center" && "mx-auto", light ? "text-white/80" : "text-muted-foreground")}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
