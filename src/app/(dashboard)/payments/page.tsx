import { CreditCard } from "lucide-react";
import { ModulePlaceholder } from "@/shared/components/module-placeholder";

export default function PaymentsPage() {
  return (
    <ModulePlaceholder
      icon={CreditCard}
      title="Payments"
      description="Deposits, balance payments, and refund status behind a swappable payment gateway provider."
    />
  );
}
