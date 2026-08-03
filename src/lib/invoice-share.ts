import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/rbac";

export { generateShareToken } from "@/lib/share-token";

// Every public invoice-share/pay route starts here: resolves the token to
// its Invoice, rejecting expired/revoked links before any data leaks out.
export async function getInvoiceShareOrThrow(token: string) {
  const share = await prisma.invoiceShare.findUnique({
    where: { token },
    include: {
      invoice: {
        include: {
          business: { select: { id: true, name: true, logoUrl: true, email: true, phone: true } },
          customer: { select: { id: true, firstName: true, lastName: true, email: true } },
          order: { select: { id: true, orderCode: true } },
        },
      },
    },
  });
  if (!share) throw new ApiError(404, "This invoice link is invalid");
  if (share.revokedAt) throw new ApiError(410, "This invoice link has been revoked");
  if (share.expiresAt && share.expiresAt < new Date()) throw new ApiError(410, "This invoice link has expired");

  return share;
}
