import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const MOCK_ORDERS = [
  { id: "FN-2201", customer: "Amara Chukwu", stage: "Production", amount: "₦185,000" },
  { id: "FN-2200", customer: "Chinedu Okafor", stage: "Fitting", amount: "₦96,500" },
  { id: "FN-2199", customer: "Fatima Bello", stage: "Design Approval", amount: "₦210,000" },
  { id: "FN-2198", customer: "Bola Adeyemi", stage: "Completed", amount: "₦72,000" },
];

const STAGE_TONE: Record<string, "default" | "secondary" | "outline"> = {
  Production: "default",
  Fitting: "secondary",
  "Design Approval": "outline",
  Completed: "secondary",
};

export function LatestOrders() {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {MOCK_ORDERS.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium text-foreground">{order.id}</TableCell>
              <TableCell className="text-muted-foreground">{order.customer}</TableCell>
              <TableCell>
                <Badge variant={STAGE_TONE[order.stage] ?? "outline"}>{order.stage}</Badge>
              </TableCell>
              <TableCell className="text-right font-medium text-foreground">{order.amount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
