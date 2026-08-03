import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { customerFormSchema } from "@/lib/validations/customer";
import { nextCustomerCode } from "@/lib/customer-code";
import { logCustomerActivity } from "@/lib/customer-activity";
import type { Prisma, CustomerStatus, Gender } from "@prisma/client";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const params = req.nextUrl.searchParams;

    const search = params.get("search")?.trim();
    const status = params.get("status") as CustomerStatus | null;
    const gender = params.get("gender") as Gender | null;
    const vip = params.get("vip");
    const tag = params.get("tag");
    const archived = params.get("archived") === "true";
    const dateFrom = params.get("dateFrom");
    const dateTo = params.get("dateTo");
    const sort = params.get("sort") ?? "createdAt:desc";
    const page = Math.max(1, Number(params.get("page") ?? 1));

    const where: Prisma.CustomerWhereInput = {
      businessId,
      isArchived: archived,
      ...(status ? { status } : {}),
      ...(gender ? { gender } : {}),
      ...(vip === "true" ? { isVip: true } : {}),
      ...(tag ? { tags: { some: { id: tag } } } : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { customerCode: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [sortField, sortDir] = sort.split(":") as [string, "asc" | "desc"];
    const orderBy: Prisma.CustomerOrderByWithRelationInput =
      sortField === "name" ? { firstName: sortDir } : { [sortField]: sortDir };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { tags: true },
      }),
      prisma.customer.count({ where }),
    ]);

    return NextResponse.json({
      customers,
      pagination: { page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const data = customerFormSchema.parse(await req.json());

    if (data.email) {
      const existing = await prisma.customer.findFirst({
        where: { businessId, email: data.email, isArchived: false },
      });
      if (existing) throw new ApiError(409, "A customer with this email already exists");
    }

    const customer = await prisma.$transaction(async (tx) => {
      const customerCode = await nextCustomerCode(tx, businessId);
      const created = await tx.customer.create({
        data: {
          businessId,
          customerCode,
          profilePhotoUrl: data.profilePhotoUrl || null,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email || null,
          phone: data.phone || null,
          whatsapp: data.whatsapp || null,
          gender: data.gender,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          occupation: data.occupation || null,
          country: data.country || null,
          state: data.state || null,
          city: data.city || null,
          address: data.address || null,
          emergencyContactName: data.emergencyContactName || null,
          emergencyContactPhone: data.emergencyContactPhone || null,
          referralSource: data.referralSource || null,
          preferredCommunication: data.preferredCommunication,
          specialNotes: data.specialNotes || null,
          status: data.status,
          isVip: data.isVip,
          tags: data.tags.length ? { connect: data.tags.map((id) => ({ id })) } : undefined,
        },
        include: { tags: true },
      });

      await logCustomerActivity(tx, {
        customerId: created.id,
        businessId,
        type: "CUSTOMER_CREATED",
        title: "Customer profile created",
        actorId: session.user.id,
      });

      return created;
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
