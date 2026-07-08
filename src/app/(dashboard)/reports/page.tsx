import { BarChart3 } from "lucide-react";
import { ModulePlaceholder } from "@/shared/components/module-placeholder";

export default function ReportsPage() {
  return (
    <ModulePlaceholder
      icon={BarChart3}
      title="Reports"
      description="Revenue, customer growth, orders, and appointment analytics, exportable as PDF and Excel."
    />
  );
}
