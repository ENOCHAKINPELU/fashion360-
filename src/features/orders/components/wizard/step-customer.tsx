"use client";

import { useEffect, useState } from "react";
import { ShoppingBag, Ruler } from "lucide-react";
import { CustomerPicker } from "@/shared/components/customer-picker";

// Matches CustomerPicker's own (unexported) CustomerOption shape exactly —
// intentionally narrower than OrderCustomerOption (no customerCode) so the
// onSelectCustomer handler stays assignable to CustomerPicker's prop type.
export interface WizardCustomer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  profilePhotoUrl: string | null;
}

interface NewCustomerDraft {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export function StepCustomer({
  customerId,
  selectedCustomer,
  newCustomer,
  onSelectCustomer,
  onNewCustomerChange,
}: {
  customerId?: string;
  selectedCustomer: WizardCustomer | null;
  newCustomer?: NewCustomerDraft;
  onSelectCustomer: (customer: WizardCustomer | undefined) => void;
  onNewCustomerChange: (draft: NewCustomerDraft | undefined) => void;
}) {
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [profileCount, setProfileCount] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (!selectedCustomer) {
      setOrderCount(null);
      setProfileCount(null);
      return;
    }
    setLoadingStats(true);
    Promise.all([
      fetch(`/api/orders?customerId=${selectedCustomer.id}&pageSize=1`)
        .then((res) => res.json())
        .then((data) => setOrderCount(data.pagination?.total ?? 0))
        .catch(() => setOrderCount(null)),
      fetch(`/api/measurements/profiles?customerId=${selectedCustomer.id}`)
        .then((res) => res.json())
        .then((data) => setProfileCount(Array.isArray(data.profiles) ? data.profiles.length : 0))
        .catch(() => setProfileCount(null)),
    ]).finally(() => setLoadingStats(false));
  }, [selectedCustomer]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">Select Customer</h2>
        <p className="text-sm text-muted-foreground">
          Choose an existing customer or create a new profile for this order.
        </p>
      </div>

      <CustomerPicker
        customerId={customerId}
        onSelectCustomer={onSelectCustomer}
        newCustomer={newCustomer}
        onNewCustomerChange={onNewCustomerChange}
      />

      {selectedCustomer && (
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-foreground">
            <ShoppingBag className="size-3.5 text-muted-foreground" />
            {loadingStats || orderCount === null ? "..." : orderCount} previous order
            {orderCount === 1 ? "" : "s"}
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-foreground">
            <Ruler className="size-3.5 text-muted-foreground" />
            {loadingStats || profileCount === null ? "..." : profileCount} saved measurement profile
            {profileCount === 1 ? "" : "s"}
          </div>
        </div>
      )}
    </div>
  );
}
