import { Gift } from "lucide-react";
import { ModulePlaceholder } from "@/shared/components/module-placeholder";

export default function LoyaltyPage() {
  return (
    <ModulePlaceholder
      icon={Gift}
      title="Loyalty"
      description="Reward points, referral bonuses, discount coupons, and repeat-customer perks."
    />
  );
}
