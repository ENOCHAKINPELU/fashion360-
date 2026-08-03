import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";

export { generateShareToken } from "@/lib/share-token";

// Every public quotation-share route starts here: resolves the token to its
// Quotation, rejecting expired/revoked links before any data leaks out.
export async function getQuotationShareOrThrow(token: string) {
  const share = await prisma.quotationShare.findUnique({
    where: { token },
    include: {
      quotation: {
        include: {
          business: { select: { id: true, name: true, logoUrl: true, email: true, phone: true, currency: true } },
          customer: { select: { id: true, firstName: true, lastName: true, email: true } },
          order: { select: { id: true, orderCode: true } },
        },
      },
    },
  });
  if (!share) throw new ApiError(404, "This quotation link is invalid");
  if (share.revokedAt) throw new ApiError(410, "This quotation link has been revoked");
  if (share.expiresAt && share.expiresAt < new Date()) throw new ApiError(410, "This quotation link has expired");

  return share;
}
