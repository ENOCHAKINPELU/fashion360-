import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { orderStatusOptions } from "@/lib/validations/order";
import { OrdersByStatusChart } from "@/features/orders/components/charts/orders-by-status-chart";
import { OrdersByMonthChart } from "@/features/orders/components/charts/orders-by-month-chart";
import { OrdersByCategoryChart } from "@/features/orders/components/charts/orders-by-category-chart";
import { OrdersByCustomerTypeChart } from "@/features/orders/components/charts/orders-by-customer-type-chart";

const STATUS_LABELS = Object.fromEntries(orderStatusOptions.map((o) => [o.value, o.label]));
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function OrderCharts({ businessId }: { businessId: string }) {
  const [byStatus, byCategory, byCustomer] = await Promise.all([
    prisma.order.groupBy({ by: ["status"], where: { businessId, isArchived: false }, _count: true }),
    prisma.orderItem.groupBy({
      by: ["designCategorySnapshot"],
      where: { businessId, order: { isArchived: false } },
      _count: true,
    }),
    prisma.order.groupBy({ by: ["customerId"], where: { businessId, isArchived: false }, _count: true }),
  ]);

  const statusData = byStatus
    .map((row) => ({ label: STATUS_LABELS[row.status] ?? row.status, value: row._count }))
    .sort((a, b) => b.value - a.value);

  const categoryData = byCategory
    .map((row) => ({ label: row.designCategorySnapshot ?? "Uncategorized", value: row._count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  let newCustomers = 0;
  let returningCustomers = 0;
  for (const row of byCustomer) {
    if (row._count > 1) returningCustomers += 1;
    else newCustomers += 1;
  }
  const customerTypeData = [
    { label: "New Customers", value: newCustomers },
    { label: "Returning Customers", value: returningCustomers },
  ];

  const now = new Date();
  const monthBuckets = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const monthCounts = await Promise.all(
    monthBuckets.map(({ year, month }) =>
      prisma.order.count({
        where: { businessId, orderDate: { gte: new Date(year, month, 1), lt: new Date(year, month + 1, 1) } },
      })
    )
  );
  const monthData = monthBuckets.map((b, i) => ({ label: MONTH_LABELS[b.month], value: monthCounts[i] }));

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Orders by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <OrdersByStatusChart data={statusData} />
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Orders by Month</CardTitle>
        </CardHeader>
        <CardContent>
          <OrdersByMonthChart data={monthData} />
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Orders by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <OrdersByCategoryChart data={categoryData} />
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Orders by Customer Type</CardTitle>
        </CardHeader>
        <CardContent>
          <OrdersByCustomerTypeChart data={customerTypeData} />
        </CardContent>
      </Card>
    </div>
  );
}
