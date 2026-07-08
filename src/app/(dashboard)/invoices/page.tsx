import { Receipt } from "lucide-react";
import { ModulePlaceholder } from "@/shared/components/module-placeholder";

export default function InvoicesPage() {
  return (
    <ModulePlaceholder
      icon={Receipt}
      title="Invoices"
      description="Invoices generated automatically from accepted quotations, with receipts and PDF download."
    />
  );
}
