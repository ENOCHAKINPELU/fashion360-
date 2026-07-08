import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessContext, apiErrorResponse } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const q = req.nextUrl.searchParams.get("q")?.trim();
    if (!q || q.length < 2) return NextResponse.json({ results: [] });

    const insensitive = { contains: q, mode: "insensitive" as const };

    const [customers, orders, appointments, invoices] = await Promise.all([
      prisma.customer.findMany({
        where: { businessId, OR: [{ name: insensitive }, { email: insensitive }, { phone: insensitive }] },
        take: 5,
      }),
      prisma.order.findMany({
        where: { businessId, OR: [{ orderNumber: insensitive }, { notes: insensitive }] },
        take: 5,
        include: { customer: { select: { name: true } } },
      }),
      prisma.appointment.findMany({
        where: { businessId, customer: { name: insensitive } },
        take: 5,
        include: { customer: { select: { name: true } } },
      }),
      prisma.invoice.findMany({
        where: { businessId, OR: [{ invoiceNumber: insensitive }] },
        take: 5,
        include: { customer: { select: { name: true } } },
      }),
    ]);

    const results = [
      ...customers.map((c) => ({ type: "customer", id: c.id, label: c.name, href: `/dashboard/customers/${c.id}` })),
      ...orders.map((o) => ({ type: "order", id: o.id, label: `${o.orderNumber} — ${o.customer.name}`, href: `/dashboard/orders/${o.id}` })),
      ...appointments.map((a) => ({ type: "appointment", id: a.id, label: `${a.customer.name} — ${a.type}`, href: `/dashboard/appointments` })),
      ...invoices.map((i) => ({ type: "invoice", id: i.id, label: `${i.invoiceNumber} — ${i.customer.name}`, href: `/dashboard/invoices` })),
    ];

    return NextResponse.json({ results });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
