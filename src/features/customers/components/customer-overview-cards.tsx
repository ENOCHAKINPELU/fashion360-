import { ShoppingBag, CalendarClock, Ruler, Wallet, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";

const PENDING_CARDS = [
  { label: "Total Orders", icon: ShoppingBag },
  { label: "Appointments", icon: CalendarClock },
  { label: "Measurements", icon: Ruler },
  { label: "Outstanding Balance", icon: Wallet },
  { label: "Lifetime Spending", icon: TrendingUp },
];

export function CustomerOverviewCards({ lastVisit }: { lastVisit: string | null }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {PENDING_CARDS.map((card) => (
        <Card key={card.label} className="border-none shadow-sm">
          <CardContent className="space-y-1.5 px-4">
            <div className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-primary">
              <card.icon className="size-4" />
            </div>
            <p className="text-lg font-semibold text-muted-foreground">N/A</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </CardContent>
        </Card>
      ))}
      <Card className="border-none shadow-sm">
        <CardContent className="space-y-1.5 px-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-primary">
            <Clock className="size-4" />
          </div>
          <p className="text-lg font-semibold text-foreground">{lastVisit ? formatRelativeTime(lastVisit) : "N/A"}</p>
          <p className="text-xs text-muted-foreground">Last Visit</p>
        </CardContent>
      </Card>
    </div>
  );
}
