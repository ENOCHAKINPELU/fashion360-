import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, requireBusinessContext } from "@/lib/rbac";
import { renderToBuffer } from "@react-pdf/renderer";
import ExcelJS from "exceljs";
import { CustomersPdfDocument, type CustomerPdfRow } from "@/lib/pdf/customers-pdf";

const COLUMNS = ["Customer ID", "First Name", "Last Name", "Email", "Phone", "WhatsApp", "Gender", "Status", "VIP", "Created At"];

async function generateCustomersPdf(businessName: string, rows: CustomerPdfRow[]) {
  return renderToBuffer(<CustomersPdfDocument businessName={businessName} rows={rows} />);
}

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await requireBusinessContext();
    const params = req.nextUrl.searchParams;
    const format = params.get("format") ?? "csv";
    const idsParam = params.get("ids");
    const ids = idsParam ? idsParam.split(",") : undefined;

    const customers = await prisma.customer.findMany({
      where: { businessId, ...(ids ? { id: { in: ids } } : { isArchived: false }) },
      orderBy: { createdAt: "desc" },
    });

    if (format === "pdf") {
      const business = await prisma.business.findUnique({ where: { id: businessId } });
      const buffer = await generateCustomersPdf(
        business?.name ?? "Fashion360",
        customers.map((c) => ({
          customerCode: c.customerCode,
          name: `${c.firstName} ${c.lastName}`,
          phone: c.phone ?? "N/A",
          email: c.email ?? "N/A",
          status: c.status,
        }))
      );
      return new NextResponse(buffer as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="customers.pdf"',
        },
      });
    }

    const rows = customers.map((c) => [
      c.customerCode,
      c.firstName,
      c.lastName,
      c.email ?? "",
      c.phone ?? "",
      c.whatsapp ?? "",
      c.gender ?? "",
      c.status,
      c.isVip ? "Yes" : "No",
      c.createdAt.toISOString(),
    ]);

    if (format === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Customers");
      sheet.addRow(COLUMNS);
      rows.forEach((row) => sheet.addRow(row));
      sheet.getRow(1).font = { bold: true };
      sheet.columns.forEach((col) => (col.width = 20));

      const buffer = await workbook.xlsx.writeBuffer();
      return new NextResponse(buffer as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": 'attachment; filename="customers.xlsx"',
        },
      });
    }

    // Default: CSV
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [COLUMNS, ...rows].map((row) => row.map((cell) => escape(String(cell))).join(",")).join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="customers.csv"',
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
