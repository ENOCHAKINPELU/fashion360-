import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { ProductionBoard } from "@/features/orders/components/board/production-board";

export default async function OrdersBoardPage() {
  const session = await auth();
  const businessId = session!.user.businessId!;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/dashboard/orders"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to orders
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Production Board</h1>
        <p className="text-sm text-muted-foreground">
          Drag orders across stages to update their production status.
        </p>
      </div>

      <ProductionBoard businessId={businessId} />
    </div>
  );
}
