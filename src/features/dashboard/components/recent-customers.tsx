import { UserAvatar } from "@/shared/components/user-avatar";

const MOCK_CUSTOMERS = [
  { name: "Amara Chukwu", orders: 4 },
  { name: "Bola Adeyemi", orders: 2 },
  { name: "Chinedu Okafor", orders: 7 },
  { name: "Fatima Bello", orders: 1 },
];

export function RecentCustomers() {
  return (
    <ul className="space-y-3">
      {MOCK_CUSTOMERS.map((customer) => (
        <li key={customer.name} className="flex items-center gap-3">
          <UserAvatar name={customer.name} className="size-8" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{customer.name}</p>
          </div>
          <span className="text-xs text-muted-foreground">{customer.orders} orders</span>
        </li>
      ))}
    </ul>
  );
}
