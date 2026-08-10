import {
  Home,
  Compass,
  ShoppingBag,
  Shirt,
  Ruler,
  BookUser,
  Archive,
  CalendarClock,
  CreditCard,
  Heart,
  Settings,
  ClipboardList,
  Star,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import type { NavItem } from "@/types/nav";

// Mirrors nav-config.ts's shape/convention for the business dashboard —
// separate file rather than a shared parametrized one, since the customer
// and business sidebars are genuinely different surfaces with different
// route prefixes (Part 12: only navigation foundation + Coming Soon states
// in Phase 1, real functionality arrives module-by-module in later phases).
// Grouped for readability only (see NavItem.group) — every item, href, and
// order is functionally unchanged; nothing was removed or hidden.
export const CUSTOMER_NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/account", icon: Home, implemented: true },
  {
    label: "For You",
    href: "/account/for-you",
    icon: Sparkles,
    implemented: true,
    description: "Your personalized discovery feed.",
  },
  {
    label: "Discover",
    href: "/account/discover",
    icon: Compass,
    implemented: true,
    description: "Find fashion businesses and designers on Fashion360.",
  },
  {
    label: "Messages",
    href: "/account/messages",
    icon: MessageSquare,
    implemented: true,
    description: "Direct conversations with businesses you're working with.",
  },

  {
    label: "My Requests",
    href: "/account/requests",
    icon: ClipboardList,
    implemented: true,
    description: "Service requests you've sent to fashion businesses.",
    group: "My Fashion",
  },
  {
    label: "My Orders",
    href: "/account/orders",
    icon: ShoppingBag,
    implemented: true,
    description: "Track orders you've placed with fashion businesses.",
    group: "My Fashion",
  },
  {
    label: "My Designs",
    href: "/account/designs",
    icon: Shirt,
    implemented: true,
    description: "Designs you've saved, customized, or approved.",
    group: "My Fashion",
  },
  {
    label: "Appointments",
    href: "/account/appointments",
    icon: CalendarClock,
    implemented: true,
    description: "Upcoming consultations and fittings.",
    group: "My Fashion",
  },
  {
    label: "My Reviews",
    href: "/account/reviews",
    icon: Star,
    implemented: true,
    description: "Rate and review completed orders.",
    group: "My Fashion",
  },

  {
    label: "My Measurements",
    href: "/account/measurements",
    icon: Ruler,
    implemented: true,
    description: "Your measurement vault, shared with businesses you trust.",
    group: "My Profile",
  },
  { label: "My Fashion Passport", href: "/account/passport", icon: BookUser, implemented: true, group: "My Profile" },
  {
    label: "My Wardrobe",
    href: "/account/wardrobe",
    icon: Archive,
    implemented: true,
    description: "Your digital wardrobe and fashion history.",
    group: "My Profile",
  },
  {
    label: "Favorites",
    href: "/account/favorites",
    icon: Heart,
    implemented: true,
    description: "Designs and businesses you've favorited.",
    group: "My Profile",
  },
  {
    label: "Payments",
    href: "/account/payments",
    icon: CreditCard,
    implemented: true,
    description: "Your invoices, receipts, and payment history.",
    group: "My Profile",
  },

  { label: "Settings", href: "/account/settings", icon: Settings, implemented: true },
];
