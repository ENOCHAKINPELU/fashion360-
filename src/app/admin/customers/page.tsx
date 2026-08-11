import { Users } from "lucide-react";
import { AdminComingSoon } from "@/features/admin/components/admin-coming-soon";

export default function AdminCustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Customers</h1>
        <p className="text-sm text-muted-foreground">Platform-wide customer directory and management.</p>
      </div>
      <AdminComingSoon
        icon={Users}
        title="Customer management is coming in a later Admin phase"
        description="This Phase 1 release establishes Admin's secure foundation. Browsing, searching, and managing customer accounts will be built in a dedicated later phase."
      />
    </div>
  );
}
