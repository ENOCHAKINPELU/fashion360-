import {
  LayoutDashboard,
  Users,
  Shirt,
  Inbox,
  ShoppingBag,
  CreditCard,
  Truck,
  Star,
  Bell,
  History,
  BadgeCheck,
  ShieldAlert,
  Undo2,
  Receipt,
  ClipboardList,
} from "lucide-react";
import type { NavItem } from "@/types/nav";

// Phase 1's canonical primary navigation (ungrouped, in the exact order
// specified) followed by the pre-existing admin pages built in earlier
// sessions that don't map onto one of those 10 items 1:1 — grouped under
// "Platform" rather than dropped, since none of them are fabricated or
// half-built (Verifications, Disputes, Refunds, Transactions, Waitlist all
// have real data and real actions behind them). Removing access to real,
// working tools to fit a 10-item list would be a regression, not a
// simplification.
//
// `implemented: false` items get the SidebarNav's existing "Soon" badge —
// the same mechanism the business dashboard nav already uses — rather than
// a second, new way of marking something not-yet-built.
export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, implemented: true },
  { label: "Customers", href: "/admin/customers", icon: Users, implemented: true, description: "Every customer on the platform." },
  { label: "Designers", href: "/admin/businesses", icon: Shirt, implemented: true, description: "Every business on the platform." },
  { label: "Requests", href: "/admin/requests", icon: Inbox, implemented: true, description: "Every customer-to-designer service request." },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag, implemented: true, description: "Every order on the platform." },
  { label: "Payments", href: "/admin/payments", icon: CreditCard, implemented: true, description: "Every payment, its escrow status, and the payout it funds." },
  { label: "Deliveries", href: "/admin/deliveries", icon: Truck, implemented: false, description: "Coming in a later Admin phase." },
  { label: "Reviews", href: "/admin/reviews", icon: Star, implemented: true, description: "Moderate reported and flagged reviews." },
  { label: "Notifications", href: "/admin/notifications", icon: Bell, implemented: false, description: "Coming in a later Admin phase." },
  { label: "Activity Log", href: "/admin/activity", icon: History, implemented: true, description: "Every recorded admin and platform action." },

  { label: "Verifications", href: "/admin/verifications", icon: BadgeCheck, implemented: true, group: "Platform" },
  { label: "Disputes", href: "/admin/disputes", icon: ShieldAlert, implemented: true, group: "Platform" },
  { label: "Refunds", href: "/admin/refunds", icon: Undo2, implemented: true, group: "Platform" },
  { label: "Transactions", href: "/admin/transactions", icon: Receipt, implemented: true, group: "Platform" },
  { label: "Waitlist", href: "/admin/waitlist", icon: ClipboardList, implemented: true, group: "Platform" },
];
