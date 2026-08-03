import { Badge } from "@/components/ui/badge";

export function DesignTagBadge({ name, color }: { name: string; color?: string | null }) {
  return (
    <Badge
      variant="outline"
      className="border-transparent font-normal"
      style={
        color
          ? { backgroundColor: `${color}1a`, color }
          : { backgroundColor: "var(--accent-soft)", color: "var(--primary)" }
      }
    >
      {name}
    </Badge>
  );
}
