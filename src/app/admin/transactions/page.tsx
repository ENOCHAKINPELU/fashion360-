import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { Receipt } from "lucide-react";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 30;

export default async function AdminTransactionsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1));

  const [transactions, total] = await Promise.all([
    prisma.financialTransaction.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { business: { select: { name: true } } },
    }),
    prisma.financialTransaction.count(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Transactions</h1>
        <p className="text-sm text-muted-foreground">Every quotation, invoice, payment, refund, dispute, and payout event across the platform ({total} total).</p>
      </div>

      {transactions.length === 0 ? (
        <EmptyState icon={Receipt} title="No transactions yet" description="Platform activity will appear here." />
      ) : (
        <div className="space-y-2">
          {transactions.map((t) => (
            <Card key={t.id} className="border-none shadow-sm">
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{t.type.replace(/_/g, " ")}</Badge>
                    <p className="text-sm text-muted-foreground">{t.business.name}</p>
                  </div>
                  <p className="mt-1 truncate text-sm text-foreground">{t.description}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {t.amount != null && <p className="text-sm font-medium text-foreground">{t.amount} {t.currency}</p>}
                  <p>{formatDate(t.createdAt)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
