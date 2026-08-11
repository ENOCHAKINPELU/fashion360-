import { Truck } from "lucide-react";
import { AdminComingSoon } from "@/features/admin/components/admin-coming-soon";

export default function AdminDeliveriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Deliveries</h1>
        <p className="text-sm text-muted-foreground">Platform-wide delivery oversight.</p>
      </div>
      <AdminComingSoon
        icon={Truck}
        title="Delivery management is coming in a later Admin phase"
        description="This Phase 1 release establishes Admin's secure foundation. Platform-wide delivery visibility and issue resolution will be built in a dedicated later phase."
      />
    </div>
  );
}
