import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { designVersionCreateSchema } from "@/lib/validations/design-preview";
import { logDesignActivity } from "@/lib/design-activity";
import { logOrderActivity } from "@/lib/order-activity";
import { getScopedPreview } from "@/app/api/design-previews/[id]/route";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { id } = await params;
    const preview = await getScopedPreview(businessId, id);

    const data = designVersionCreateSchema.parse(await req.json());
    const versionNumber = preview.latestVersionNumber + 1;
    const previewType = data.model ? "THREE_D" : "TWO_D";

    const version = await prisma.$transaction(async (tx) => {
      const created = await tx.designVersion.create({
        data: {
          previewId: id,
          businessId,
          versionNumber,
          status: "DRAFT",
          previewType,
          previewImageUrl: data.previewImageUrl || null,
          changesSummary: data.changesSummary || null,
          notes: data.notes || null,
          createdById: session.user.id,
          customization: {
            create: {
              fabricId: data.customization.fabricId || null,
              fabricNameSnapshot: data.customization.fabricNameSnapshot || null,
              primaryColor: data.customization.primaryColor || null,
              secondaryColor: data.customization.secondaryColor || null,
              pattern: data.customization.pattern || null,
              sleeveStyle: data.customization.sleeveStyle || null,
              neckline: data.customization.neckline || null,
              collarStyle: data.customization.collarStyle || null,
              cuffStyle: data.customization.cuffStyle || null,
              length: data.customization.length || null,
              buttonStyle: data.customization.buttonStyle || null,
              embroidery: data.customization.embroidery || null,
              pocketStyle: data.customization.pocketStyle || null,
              lining: data.customization.lining || null,
              accessories: data.customization.accessories,
              otherCustomizations: data.customization.otherCustomizations || null,
            },
          },
          model: data.model
            ? {
                create: {
                  businessId,
                  format: data.model.format,
                  url: data.model.url,
                  thumbnailUrl: data.model.thumbnailUrl || null,
                  fileSizeBytes: data.model.fileSizeBytes,
                  uploadedById: session.user.id,
                },
              }
            : undefined,
          textures: data.textures.length
            ? {
                create: data.textures.map((t) => ({
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
        include: { customization: true, model: true, textures: true },
      });

      await tx.designPreview.update({
        where: { id },
        data: { latestVersionNumber: versionNumber, previewType, status: "UPDATED" },
      });

      await logDesignActivity(tx, {
        previewId: id,
        businessId,
        type: "VERSION_CREATED",
        title: `Version ${versionNumber} created`,
        description: data.changesSummary,
        actorId: session.user.id,
      });
      await logDesignActivity(tx, {
        previewId: id,
        businessId,
        type: "DESIGNER_UPDATED",
        title: "Designer updated the design",
        actorId: session.user.id,
      });
      if (preview.orderId) {
        await logOrderActivity(tx, {
          orderId: preview.orderId,
          businessId,
          type: "DESIGN_UPDATED",
          title: `Design "${preview.name}" updated to version ${versionNumber}`,
        });
      }

      return created;
    });

    return NextResponse.json({ version }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
