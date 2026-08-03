import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { quotationCreateSchema } from "@/lib/validations/quotation";
import { nextQuotationNumber } from "@/lib/quotation-code";
import { getOrCreateFinancialSettings } from "@/lib/financial-settings";
import { logFinancialTransaction } from "@/lib/financial-transaction";
import type { Prisma, QuotationStatus } from "@prisma/client";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const params = req.nextUrl.searchParams;

    const search = params.get("search")?.trim();
    const status = params.get("status") as QuotationStatus | null;
    const orderId = params.get("orderId");
    const customerId = params.get("customerId");
    const page = Math.max(1, Number(params.get("page") ?? 1));

    const where: Prisma.QuotationWhereInput = {
      businessId,
      ...(status ? { status } : {}),
      ...(orderId ? { orderId } : {}),
      ...(customerId ? { customerId } : {}),
      ...(search
        ? {
            OR: [
              { quotationNumber: { contains: search, mode: "insensitive" } },
              { order: { orderCode: { contains: search, mode: "insensitive" } } },
              { customer: { firstName: { contains: search, mode: "insensitive" } } },
              { customer: { lastName: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          order: { select: { id: true, orderCode: true } },
          customer: { select: { id: true, firstName: true, lastName: true, customerCode: true } },
          versions: { orderBy: { versionNumber: "desc" }, take: 1, select: { total: true, versionNumber: true } },
        },
      }),
      prisma.quotation.count({ where }),
    ]);

    return NextResponse.json({
      quotations,
      pagination: { page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const data = quotationCreateSchema.parse(await req.json());

    const order = await prisma.order.findFirst({ where: { id: data.orderId, businessId } });
    if (!order) throw new ApiError(404, "Order not found");

    const settings = await getOrCreateFinancialSettings(prisma, businessId);
    const expiresAt = data.expiresAt ?? new Date(Date.now() + settings.quotationValidityDays * 24 * 60 * 60 * 1000);

    const items = data.items.map((item, index) => ({
      type: item.type,
      name: item.name,
      description: item.description || null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      tax: item.tax,
      subtotal: item.quantity * item.unitPrice - item.discount + item.tax,
      sortOrder: index,
      businessId,
    }));
    const itemsSubtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const subtotal = itemsSubtotal;
    const total = subtotal - data.discount + data.tax + data.deliveryFee + data.additionalCharges;
    const depositRequired = (total * data.depositPercentage) / 100;
    const balanceDue = total - depositRequired;

    const quotation = await prisma.$transaction(async (tx) => {
      const quotationNumber = await nextQuotationNumber(tx, businessId);
      const created = await tx.quotation.create({
        data: {
          businessId,
          orderId: data.orderId,
          customerId: data.customerId,
          quotationNumber,
          status: "DRAFT",
          latestVersionNumber: 1,
          expiresAt,
          createdById: session.user.id,
          versions: {
            create: {
              businessId,
              versionNumber: 1,
              status: "DRAFT",
              subtotal,
              discount: data.discount,
              tax: data.tax,
              deliveryFee: data.deliveryFee,
              additionalCharges: data.additionalCharges,
              total,
              depositPercentage: data.depositPercentage,
              depositRequired,
              balanceDue,
              paymentTerms: data.paymentTerms || settings.defaultPaymentTerms,
              balanceDueDate: data.balanceDueDate,
              productionStartConditions: data.productionStartConditions,
              cancellationPolicy: data.cancellationPolicy || settings.defaultCancellationPolicy,
              refundPolicy: data.refundPolicy || settings.defaultRefundPolicy,
              alterationPolicy: data.alterationPolicy || settings.defaultAlterationPolicy,
              deliveryPolicy: data.deliveryPolicy || settings.defaultDeliveryPolicy,
              customTerms: data.customTerms,
              changesSummary: data.changesSummary,
              notes: data.notes,
              createdById: session.user.id,
              items: { create: items },
            },
          },
        },
        include: { versions: { include: { items: true } } },
      });

      await logFinancialTransaction(tx, {
        businessId,
        type: "QUOTATION_CREATED",
        description: `Quotation ${quotationNumber} created`,
        orderId: data.orderId,
        customerId: data.customerId,
        quotationId: created.id,
        amount: total,
        actorType: "STAFF",
        actorId: session.user.id,
      });

      return created;
    });

    return NextResponse.json({ quotation }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
