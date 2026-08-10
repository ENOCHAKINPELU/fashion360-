import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  implemented: boolean;
  description?: string;
  // Visual grouping only — purely presentational, never affects routing or
  // what's reachable. Undefined items render ungrouped at the top of the
  // list (the few things used constantly: home, messages).
  group?: string;
}
