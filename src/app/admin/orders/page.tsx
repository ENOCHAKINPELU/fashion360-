import { ShoppingBag } from "lucide-react";
import { AdminComingSoon } from "@/features/admin/components/admin-coming-soon";

export default function AdminOrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Orders</h1>
        <p className="text-sm text-muted-foreground">Platform-wide order oversight and intervention.</p>
      </div>
      <AdminComingSoon
        icon={ShoppingBag}
        title="Order management is coming in a later Admin phase"
        description="This Phase 1 release establishes Admin's secure foundation. Platform-wide order visibility and intervention tools will be built in a dedicated later phase."
      />
    </div>
  );
}
