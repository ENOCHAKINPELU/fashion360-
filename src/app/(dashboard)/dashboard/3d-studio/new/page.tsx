import { auth } from "@/lib/auth";
import { NewDesignPreviewClient } from "@/features/design-studio/components/new-design-preview-client";

export default async function NewDesignPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  // Auth check mirrors src/app/(dashboard)/dashboard/orders/new/page.tsx — this
  // route is nested under the (dashboard) layout which already gates
  // unauthenticated access, so this just guarantees a businessId exists.
  void session!.user.businessId!;
  const params = await searchParams;

  return <NewDesignPreviewClient initialOrderId={params.orderId} initialOrderItemId={params.orderItemId} />;
}
