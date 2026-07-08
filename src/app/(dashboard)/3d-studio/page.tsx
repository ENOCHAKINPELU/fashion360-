import { Box } from "lucide-react";
import { ModulePlaceholder } from "@/shared/components/module-placeholder";

export default function StudioPage() {
  return (
    <ModulePlaceholder
      icon={Box}
      title="3D Studio"
      description="Interactive garment visualization — rotate, customize fabric and color, and preview designs live."
    />
  );
}
