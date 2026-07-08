import { Users } from "lucide-react";
import { ModulePlaceholder } from "@/shared/components/module-placeholder";

export default function CustomersPage() {
  return (
    <ModulePlaceholder
      icon={Users}
      title="Customers"
      description="Customer profiles, preferences, order history, and saved measurements will live here."
    />
  );
}
