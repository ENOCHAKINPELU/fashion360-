import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { invoiceCreateSchema } from "@/lib/validations/invoice";
import { nextInvoiceNumber } from "@/lib/invoice-code";
import { getOrCreateFinancialSettings } from "@/lib/financial-settings";
import { logFinancialTransaction } from "@/lib/financial-transaction";
import { notifyFinancialEvent } from "@/lib/financial-notifications";
import type { Prisma, InvoiceStatus } from "@prisma/client";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const params = req.nextUrl.searchParams;

    const search = params.get("search")?.trim();
    const status = params.get("status") as InvoiceStatus | null;
    const orderId = params.get("orderId");
    const customerId = params.get("customerId");
    const page = Math.max(1, Number(params.get("page") ?? 1));

    const where: Prisma.InvoiceWhereInput = {
      businessId,
      ...(status ? { status } : {}),
      ...(orderId ? { orderId } : {}),
      ...(customerId ? { customerId } : {}),
      ...(search
        ? {
            OR: [
              { invoiceNumber: { contains: search, mode: "insensitive" } },
              { order: { orderCode: { contains: search, mode: "insensitive" } } },
              { customer: { firstName: { contains: search, mode: "insensitive" } } },
              { customer: { lastName: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          order: { select: { id: true, orderCode: true } },
          customer: { select: { id: true, firstName: true, lastName: true, customerCode: true } },
          payments: {
            where: { status: "SUCCESSFUL" },
            orderBy: { paidAt: "desc" },
            select: { id: true, amount: true, currency: true, method: true, status: true, paidAt: true },
          },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json({
      invoices,
      pagination: { page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const data = invoiceCreateSchema.parse(await req.json());

    const [order, business] = await Promise.all([
      prisma.order.findFirst({ where: { id: data.orderId, businessId } }),
      prisma.business.findUniqueOrThrow({ where: { id: businessId }, select: { currency: true } }),
    ]);
    if (!order) throw new ApiError(404, "Order not found");

    const settings = await getOrCreateFinancialSettings(prisma, businessId);
    const dueDate = data.dueDate ?? new Date(Date.now() + settings.invoiceDueDays * 24 * 60 * 60 * 1000);

    const items = data.items.map((item, index) => ({
      businessId,
      type: item.type,
      name: item.name,
      description: item.description || null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      tax: item.tax,
      subtotal: item.quantity * item.unitPrice - item.discount + item.tax,
      sortOrder: index,
    }));
    const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const total = subtotal - data.discount + data.tax + data.deliveryFee + data.additionalCharges;

    const invoice = await prisma.$transaction(async (tx) => {
      const invoiceNumber = await nextInvoiceNumber(tx, businessId);
      const created = await tx.invoice.create({
        data: {
          businessId,
          orderId: data.orderId,
          customerId: data.customerId,
          quotationId: data.quotationId || null,
          invoiceNumber,
          status: "DRAFT",
          currency: business.currency,
          dueDate,
          subtotal,
          discount: data.discount,
          tax: data.tax,
          deliveryFee: data.deliveryFee,
          additionalCharges: data.additionalCharges,
          total,
          balanceDue: total,
          paymentInstructions: data.paymentInstructions,
          paymentTerms: data.paymentTerms || settings.defaultPaymentTerms,
          cancellationPolicy: data.cancellationPolicy || settings.defaultCancellationPolicy,
          refundPolicy: data.refundPolicy || settings.defaultRefundPolicy,
          alterationPolicy: data.alterationPolicy || settings.defaultAlterationPolicy,
          deliveryPolicy: data.deliveryPolicy || settings.defaultDeliveryPolicy,
          customTerms: data.customTerms,
          createdById: session.user.id,
          items: { create: items },
          ...(data.milestones && data.milestones.length > 0
            ? {
                paymentSchedule: {
                  create: {
                    businessId,
                    milestones: {
                      create: data.milestones.map((m, index) => ({
                        businessId,
                        label: m.label,
                        percentage: m.percentage,
                        amount: m.amount,
                        dueDate: m.dueDate,
                        sortOrder: index,
                      })),
                    },
                  },
                },
              }
            : {}),
        },
        include: { items: true, paymentSchedule: { include: { milestones: true } } },
      });

      await logFinancialTransaction(tx, {
        businessId,
        type: "INVOICE_CREATED",
        description: `Invoice ${invoiceNumber} created`,
        orderId: data.orderId,
        customerId: data.customerId,
        invoiceId: created.id,
        amount: total,
        actorType: "STAFF",
        actorId: session.user.id,
      });

      return created;
    });

    await notifyFinancialEvent(prisma, {
      businessId,
      orderId: data.orderId,
      title: "Invoice created",
      body: `${invoice.invoiceNumber} was created.`,
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
