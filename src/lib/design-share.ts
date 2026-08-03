import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";

export { generateShareToken } from "@/lib/share-token";

// Every public design-share route starts here: resolves the token to its
// DesignPreview, rejecting expired/revoked links before any data leaks out.
export async function getShareOrThrow(token: string) {
  const share = await prisma.designShare.findUnique({
    where: { token },
    include: {
      preview: {
        include: {
          business: { select: { id: true, name: true, logoUrl: true } },
          customer: { select: { id: true, firstName: true, lastName: true } },
          order: {
            select: {
              id: true,
              orderCode: true,
              totalValue: true,
              expectedCompletionDate: true,
              measurementSnapshot: true,
              measurementProfileId: true,
            },
          },
        },
      },
    },
  });
  if (!share) throw new ApiError(404, "This design preview link is invalid");
  if (share.revokedAt) throw new ApiError(410, "This design preview link has been revoked");
  if (share.expiresAt && share.expiresAt < new Date()) throw new ApiError(410, "This design preview link has expired");

  return share;
}
