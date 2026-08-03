import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import type { Prisma, FinancialTransactionType } from "@prisma/client";

const PAGE_SIZE = 30;

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const params = req.nextUrl.searchParams;

    const type = params.get("type") as FinancialTransactionType | null;
    const customerId = params.get("customerId");
    const orderId = params.get("orderId");
    const invoiceId = params.get("invoiceId");
    const page = Math.max(1, Number(params.get("page") ?? 1));

    const where: Prisma.FinancialTransactionWhereInput = {
      businessId,
      ...(type ? { type } : {}),
      ...(customerId ? { customerId } : {}),
      ...(orderId ? { orderId } : {}),
      ...(invoiceId ? { invoiceId } : {}),
    };

    const [transactions, total] = await Promise.all([
      prisma.financialTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          actor: { select: { name: true } },
        },
      }),
      prisma.financialTransaction.count({ where }),
    ]);

    const [customerIds, orderIds, invoiceIds] = [
      [...new Set(transactions.map((t) => t.customerId).filter((v): v is string => !!v))],
      [...new Set(transactions.map((t) => t.orderId).filter((v): v is string => !!v))],
      [...new Set(transactions.map((t) => t.invoiceId).filter((v): v is string => !!v))],
    ];
    const [customers, orders, invoices] = await Promise.all([
      prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, firstName: true, lastName: true } }),
      prisma.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, orderCode: true } }),
      prisma.invoice.findMany({ where: { id: { in: invoiceIds } }, select: { id: true, invoiceNumber: true } }),
    ]);
    const customerMap = new Map(customers.map((c) => [c.id, c]));
    const orderMap = new Map(orders.map((o) => [o.id, o]));
    const invoiceMap = new Map(invoices.map((i) => [i.id, i]));

    return NextResponse.json({
      transactions: transactions.map((t) => ({
        ...t,
        customer: t.customerId ? customerMap.get(t.customerId) ?? null : null,
        order: t.orderId ? orderMap.get(t.orderId) ?? null : null,
        invoice: t.invoiceId ? invoiceMap.get(t.invoiceId) ?? null : null,
      })),
      pagination: { page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
