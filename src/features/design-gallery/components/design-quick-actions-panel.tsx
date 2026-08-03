import Link from "next/link";
import { Plus, Images, Layers, Palette, Grid3x3 } from "lucide-react";

const ACTIONS = [
  { label: "Browse Gallery", icon: Grid3x3, href: "/dashboard/design-gallery/browse" },
  { label: "New Collection", icon: Images, href: "/dashboard/design-gallery/collections" },
  { label: "Fabric Library", icon: Layers, href: "/dashboard/design-gallery/fabrics" },
  { label: "Colour Library", icon: Palette, href: "/dashboard/design-gallery/colors" },
];

export function DesignQuickActionsPanel() {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/dashboard/design-gallery/browse?new=1"
        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/80"
      >
        <Plus className="size-3.5" /> Add Design
      </Link>
      {ACTIONS.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent-soft"
        >
          <action.icon className="size-3.5" /> {action.label}
        </Link>
      ))}
    </div>
  );
}
