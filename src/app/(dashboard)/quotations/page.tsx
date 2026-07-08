import { FileText } from "lucide-react";
import { ModulePlaceholder } from "@/shared/components/module-placeholder";

export default function QuotationsPage() {
  return (
    <ModulePlaceholder
      icon={FileText}
      title="Quotations"
      description="Create and send price quotes with garment details, deposits, and due dates as a downloadable PDF."
    />
  );
}
