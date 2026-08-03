import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, ApiError, requireBusinessContext } from "@/lib/rbac";
import { parseCustomerImportFile, importRowValidation, type ParsedImportRow } from "@/lib/customer-import";
import { nextCustomerCode } from "@/lib/customer-code";
import { logCustomerActivity } from "@/lib/customer-activity";
import { z } from "zod";
import type { Gender, CustomerStatus } from "@prisma/client";

const VALID_GENDERS = new Set(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]);
const VALID_STATUSES = new Set(["LEAD", "PROSPECT", "ACTIVE", "INACTIVE", "BLOCKED"]);

// Preview: parse the uploaded file, validate rows, and flag duplicates — no writes.
export async function POST(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "No file provided");

    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = await parseCustomerImportFile(buffer, file.name);

    const emails = rows.map((r) => r.email).filter((e): e is string => !!e);
    const existing = emails.length
      ? await prisma.customer.findMany({
          where: { businessId, email: { in: emails } },
          select: { id: true, email: true, firstName: true, lastName: true },
        })
      : [];
    const existingByEmail = new Map(existing.map((c) => [c.email, c]));

    const results = rows.map((row) => {
      const validation = importRowValidation.safeParse(row);
      const errors: string[] = [];
      if (!validation.success) errors.push("First and last name are required");
      if (row.gender && !VALID_GENDERS.has(row.gender)) errors.push(`Unrecognized gender "${row.gender}"`);
      if (row.status && !VALID_STATUSES.has(row.status)) errors.push(`Unrecognized status "${row.status}"`);

      const duplicate = row.email ? existingByEmail.get(row.email) : undefined;

      return { row, errors, isDuplicate: !!duplicate, duplicateOf: duplicate ?? null };
    });

    return NextResponse.json({
      total: rows.length,
      valid: results.filter((r) => r.errors.length === 0 && !r.isDuplicate).length,
      duplicates: results.filter((r) => r.isDuplicate).length,
      invalid: results.filter((r) => r.errors.length > 0).length,
      results,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const commitSchema = z.object({
  rows: z.array(
    z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().optional(),
      phone: z.string().optional(),
      whatsapp: z.string().optional(),
      gender: z.string().optional(),
      status: z.string().optional(),
      isVip: z.boolean().optional(),
      occupation: z.string().optional(),
      country: z.string().optional(),
      state: z.string().optional(),
      city: z.string().optional(),
      address: z.string().optional(),
      referralSource: z.string().optional(),
    })
  ),
});

// Commit: create customers from the rows the client confirmed after preview.
export async function PUT(req: NextRequest) {
  try {
    const { businessId, session } = await requireBusinessContext();
    const { rows } = commitSchema.parse(await req.json());

    let created = 0;
    let skipped = 0;

    await prisma.$transaction(async (tx) => {
      for (const row of rows as ParsedImportRow[]) {
        if (row.email) {
          const existing = await tx.customer.findFirst({ where: { businessId, email: row.email } });
          if (existing) {
            skipped += 1;
            continue;
          }
        }

        const customerCode = await nextCustomerCode(tx, businessId);
        const customer = await tx.customer.create({
          data: {
            businessId,
            customerCode,
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email || null,
            phone: row.phone || null,
            whatsapp: row.whatsapp || null,
            gender: VALID_GENDERS.has(row.gender ?? "") ? (row.gender as Gender) : undefined,
            status: VALID_STATUSES.has(row.status ?? "") ? (row.status as CustomerStatus) : "LEAD",
            isVip: row.isVip ?? false,
            occupation: row.occupation || null,
            country: row.country || null,
            state: row.state || null,
            city: row.city || null,
            address: row.address || null,
            referralSource: row.referralSource || null,
          },
        });

        await logCustomerActivity(tx, {
          customerId: customer.id,
          businessId,
          type: "CUSTOMER_CREATED",
          title: "Customer imported",
          actorId: session.user.id,
        });

        created += 1;
      }
    });

    return NextResponse.json({ created, skipped });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
