import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { designPreviewCreateSchema } from "@/lib/validations/design-preview";
import { nextDesignPreviewCode } from "@/lib/design-preview-code";
import { logDesignActivity } from "@/lib/design-activity";
import { markOrderTimelineStage } from "@/lib/order-timeline";
import type { Prisma, DesignPreviewStatus } from "@prisma/client";

const PAGE_SIZE = 20;

const PREVIEW_LIST_INCLUDE = {
  order: { select: { id: true, orderCode: true, totalValue: true, expectedCompletionDate: true } },
  customer: {
    select: { id: true, firstName: true, lastName: true, customerCode: true, phone: true, email: true, profilePhotoUrl: true },
  },
} satisfies Prisma.DesignPreviewInclude;

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const params = req.nextUrl.searchParams;

    const search = params.get("search")?.trim();
    const status = params.get("status") as DesignPreviewStatus | null;
    const orderId = params.get("orderId");
    const customerId = params.get("customerId");
    const sort = params.get("sort") ?? "updatedAt:desc";
    const page = Math.max(1, Number(params.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(params.get("pageSize") ?? PAGE_SIZE)));

    const where: Prisma.DesignPreviewWhereInput = {
      businessId,
      ...(status ? { status } : {}),
      ...(orderId ? { orderId } : {}),
      ...(customerId ? { customerId } : {}),
      ...(search
        ? {
            OR: [
              { previewCode: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
              { order: { orderCode: { contains: search, mode: "insensitive" } } },
              { customer: { firstName: { contains: search, mode: "insensitive" } } },
              { customer: { lastName: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [sortField, sortDir] = sort.split(":") as [string, "asc" | "desc"];
    const orderBy: Prisma.DesignPreviewOrderByWithRelationInput = { [sortField]: sortDir };

    const [previews, total] = await Promise.all([
      prisma.designPreview.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: PREVIEW_LIST_INCLUDE,
      }),
      prisma.designPreview.count({ where }),
    ]);

    return NextResponse.json({
      previews,
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const data = designPreviewCreateSchema.parse(await req.json());

    const orderItem = await prisma.orderItem.findFirst({
      where: { id: data.orderItemId, businessId },
      include: { order: true, designPreview: true },
    });
    if (!orderItem) throw new ApiError(404, "Order item not found");
    if (orderItem.designPreview) throw new ApiError(409, "This order item already has a design preview");

    const previewType = data.version.model ? "THREE_D" : "TWO_D";

    const preview = await prisma.$transaction(async (tx) => {
      const previewCode = await nextDesignPreviewCode(tx, businessId);

      const created = await tx.designPreview.create({
        data: {
          businessId,
          orderId: orderItem.orderId,
          orderItemId: orderItem.id,
          customerId: orderItem.order.customerId,
          designId: data.designId || orderItem.designId || null,
          previewCode,
          name: data.name,
          previewType,
          latestVersionNumber: 1,
          status: "DRAFT",
          createdById: session.user.id,
        },
        include: PREVIEW_LIST_INCLUDE,
      });

      await tx.designVersion.create({
        data: {
          previewId: created.id,
          businessId,
          versionNumber: 1,
          status: "DRAFT",
          previewType,
          previewImageUrl: data.version.previewImageUrl || null,
          changesSummary: data.version.changesSummary || "Initial design preview",
          notes: data.version.notes || null,
          createdById: session.user.id,
          customization: {
            create: {
              fabricId: data.version.customization.fabricId || null,
              fabricNameSnapshot: data.version.customization.fabricNameSnapshot || null,
              primaryColor: data.version.customization.primaryColor || null,
              secondaryColor: data.version.customization.secondaryColor || null,
              pattern: data.version.customization.pattern || null,
              sleeveStyle: data.version.customization.sleeveStyle || null,
              neckline: data.version.customization.neckline || null,
              collarStyle: data.version.customization.collarStyle || null,
              cuffStyle: data.version.customization.cuffStyle || null,
              length: data.version.customization.length || null,
              buttonStyle: data.version.customization.buttonStyle || null,
              embroidery: data.version.customization.embroidery || null,
              pocketStyle: data.version.customization.pocketStyle || null,
              lining: data.version.customization.lining || null,
              accessories: data.version.customization.accessories,
              otherCustomizations: data.version.customization.otherCustomizations || null,
            },
          },
          model: data.version.model
            ? {
                create: {
                  businessId,
                  format: data.version.model.format,
                  url: data.version.model.url,
                  thumbnailUrl: data.version.model.thumbnailUrl || null,
                  fileSizeBytes: data.version.model.fileSizeBytes,
                  uploadedById: session.user.id,
                },
              }
            : undefined,
          textures: data.version.textures.length
            ? {
                create: data.version.textures.map((t) => ({
                  businessId,
                  role: t.role,
                  name: t.name,
                  imageUrl: t.imageUrl,
                  colorHex: t.colorHex || null,
                  materialType: t.materialType || null,
                  description: t.description || null,
                  fabricLibraryItemId: t.fabricLibraryItemId || null,
                })),
              }
            : undefined,
        },
      });

      await logDesignActivity(tx, {
        previewId: created.id,
        businessId,
        type: "CREATED",
        title: "Design preview created",
        actorId: session.user.id,
      });
      await logDesignActivity(tx, {
        previewId: created.id,
        businessId,
        type: "VERSION_CREATED",
        title: "Version 1 created",
        actorId: session.user.id,
      });

      await markOrderTimelineStage(tx, {
        orderId: orderItem.orderId,
        businessId,
        stage: "DESIGN_SELECTED",
        status: "COMPLETED",
        actorId: session.user.id,
      });
      await markOrderTimelineStage(tx, {
        orderId: orderItem.orderId,
        businessId,
        stage: "DESIGN_CUSTOMIZED",
        status: "COMPLETED",
        actorId: session.user.id,
      });

      return created;
    });

    return NextResponse.json({ preview }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
