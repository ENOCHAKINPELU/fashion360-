import ExcelJS from "exceljs";
import { Readable } from "stream";
import { z } from "zod";

const HEADER_ALIASES: Record<string, string> = {
  "first name": "firstName",
  firstname: "firstName",
  "last name": "lastName",
  lastname: "lastName",
  email: "email",
  "email address": "email",
  phone: "phone",
  "phone number": "phone",
  whatsapp: "whatsapp",
  "whatsapp number": "whatsapp",
  gender: "gender",
  status: "status",
  vip: "isVip",
  occupation: "occupation",
  country: "country",
  state: "state",
  city: "city",
  address: "address",
  "referral source": "referralSource",
};

export interface ParsedImportRow {
  rowNumber: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  gender?: string;
  status?: string;
  isVip?: boolean;
  occupation?: string;
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  referralSource?: string;
}

export async function parseCustomerImportFile(buffer: Buffer, filename: string): Promise<ParsedImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  const isCsv = filename.toLowerCase().endsWith(".csv");

  let worksheet: ExcelJS.Worksheet;
  if (isCsv) {
    worksheet = await workbook.csv.read(bufferToStream(buffer));
  } else {
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    worksheet = workbook.worksheets[0];
  }
  if (!worksheet) return [];

  const headerRow = worksheet.getRow(1);
  const headerMap: Record<number, string> = {};
  headerRow.eachCell((cell, colNumber) => {
    const raw = String(cell.value ?? "").trim().toLowerCase();
    const key = HEADER_ALIASES[raw];
    if (key) headerMap[colNumber] = key;
  });

  const rows: ParsedImportRow[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record: Record<string, unknown> = {};
    row.eachCell((cell, colNumber) => {
      const key = headerMap[colNumber];
      if (key) record[key] = cell.value;
    });
    if (!record.firstName && !record.lastName) return;

    rows.push({
      rowNumber,
      firstName: String(record.firstName ?? "").trim(),
      lastName: String(record.lastName ?? "").trim(),
      email: record.email ? String(record.email).trim().toLowerCase() : undefined,
      phone: record.phone ? String(record.phone).trim() : undefined,
      whatsapp: record.whatsapp ? String(record.whatsapp).trim() : undefined,
      gender: record.gender ? String(record.gender).trim().toUpperCase() : undefined,
      status: record.status ? String(record.status).trim().toUpperCase() : undefined,
      isVip: record.isVip ? /^(yes|true|1)$/i.test(String(record.isVip)) : undefined,
      occupation: record.occupation ? String(record.occupation).trim() : undefined,
      country: record.country ? String(record.country).trim() : undefined,
      state: record.state ? String(record.state).trim() : undefined,
      city: record.city ? String(record.city).trim() : undefined,
      address: record.address ? String(record.address).trim() : undefined,
      referralSource: record.referralSource ? String(record.referralSource).trim() : undefined,
    });
  });

  return rows;
}

function bufferToStream(buffer: Buffer) {
  return Readable.from(buffer);
}

export const importRowValidation = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});
