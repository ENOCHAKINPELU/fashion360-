import { requireCustomerContext } from "@/lib/rbac";
import { DiscoveryFeedClient } from "@/features/personalization/components/discovery-feed-client";

export default async function ForYouPage() {
  await requireCustomerContext();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">For You</h1>
        <p className="text-sm text-muted-foreground">Designs, designers, and inspiration picked for your style.</p>
      </div>
      <DiscoveryFeedClient />
    </div>
  );
}
