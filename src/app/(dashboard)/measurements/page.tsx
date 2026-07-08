import { Ruler } from "lucide-react";
import { ModulePlaceholder } from "@/shared/components/module-placeholder";

export default function MeasurementsPage() {
  return (
    <ModulePlaceholder
      icon={Ruler}
      title="Measurements"
      description="Manual measurement profiles today, with AI-assisted estimation architecture arriving in a later phase."
    />
  );
}
