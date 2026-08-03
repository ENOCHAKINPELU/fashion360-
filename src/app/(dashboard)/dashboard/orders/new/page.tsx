import { auth } from "@/lib/auth";
import { OrderWizard } from "@/features/orders/components/wizard/order-wizard";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  const businessId = session!.user.businessId!;
  const params = await searchParams;

  return (
    <OrderWizard
      businessId={businessId}
      initialCustomerId={params.customerId}
      reorderFrom={params.reorderFrom}
    />
  );
}
