import { ShieldCheck, TrendingUp, Truck, Zap, BadgeCheck, Award, Sparkles, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const BADGE_ICONS: Record<string, typeof Star> = {
  TOP_RATED: Star,
  HIGHLY_REVIEWED: Award,
  RELIABLE_DELIVERY: Truck,
  FAST_RESPONDER: Zap,
  VERIFIED_BUSINESS: BadgeCheck,
  ESTABLISHED_DESIGNER: ShieldCheck,
  RISING_DESIGNER: TrendingUp,
  NEW_ON_FASHION360: Sparkles,
};

// Part 20/31: trust signals, not the raw ranking number — badges are the
// only ranking-related thing shown to customers.
export function TrustBadgesRow({ badges }: { badges: { type: string; label: string }[] }) {
  if (badges.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b) => {
        const Icon = BADGE_ICONS[b.type] ?? Star;
        return (
          <Badge key={b.type} variant="outline" className="gap-1 border-primary/20 bg-accent-soft text-primary">
            <Icon className="size-3" /> {b.label}
          </Badge>
        );
      })}
    </div>
  );
}
