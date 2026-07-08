import { ShoppingBag } from "lucide-react";
import { ModulePlaceholder } from "@/shared/components/module-placeholder";

export default function OrdersPage() {
  return (
    <ModulePlaceholder
      icon={ShoppingBag}
      title="Orders"
      description="Configurable order workflows from consultation through delivery, with design approvals built in."
    />
  );
}
