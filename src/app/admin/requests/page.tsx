import { Inbox } from "lucide-react";
import { AdminComingSoon } from "@/features/admin/components/admin-coming-soon";

export default function AdminRequestsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Requests</h1>
        <p className="text-sm text-muted-foreground">Platform-wide oversight of customer service requests.</p>
      </div>
      <AdminComingSoon
        icon={Inbox}
        title="Request oversight is coming in a later Admin phase"
        description="This Phase 1 release establishes Admin's secure foundation. Platform-wide visibility into service requests will be built in a dedicated later phase."
      />
    </div>
  );
}
