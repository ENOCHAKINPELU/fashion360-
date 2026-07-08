import { Truck } from "lucide-react";
import { ModulePlaceholder } from "@/shared/components/module-placeholder";

export default function DeliveryPage() {
  return (
    <ModulePlaceholder
      icon={Truck}
      title="Delivery"
      description="Track pickup and home delivery logistics with confirmation and status updates."
    />
  );
}
