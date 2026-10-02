import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireSession } from "../../../../../src/server/auth/session";
import { can } from "../../../../../src/server/authz/permissions";
import { previewImport } from "../../../../../src/server/services/imports";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ctx = await requireSession();
    const contentType = request.headers.get("content-type") || "";
    let body: Record<string, unknown>;
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const type = String(form.get("type") || "");
      const file = form.get("file");
      if (!(file instanceof File)) throw new Error("FILE_REQUIRED");
      if (file.size > 4 * 1024 * 1024) throw new Error("FILE_TOO_LARGE");
      if (!can(ctx.role, type === "SALES" ? "importSales" : "importAnimals")) throw new Error("FORBIDDEN");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const sheet = workbook.worksheets[0];
      if (!sheet) throw new Error("EMPTY_FILE");
      const rawRows: unknown[][] = [];
      sheet.eachRow(row => { const values: unknown[] = []; row.eachCell((cell, column) => { values[column - 1] = cell.value instanceof Date ? cell.value.toISOString() : cell.value; }); rawRows.push(values); });
      const headerIndex = rawRows.findIndex(row => row.some(value => String(value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes("identificador")));
      if (headerIndex < 0) throw new Error("HEADER_NOT_FOUND");
      const headers = (rawRows[headerIndex] || []).map(value => String(value || "").trim());
      const rows = rawRows.slice(headerIndex + 1).filter(row => row.some(value => value !== undefined && value !== null && String(value).trim() !== "")).map(row => Object.fromEntries(headers.map((header, index) => [header || `columna_${index + 1}`, row[index] ?? ""])));
      body = { type, headers, rows, fileName: file.name };
    } else body = await request.json();
    if (!can(ctx.role, body.type === "SALES" ? "importSales" : "importAnimals")) throw new Error("FORBIDDEN");
    return NextResponse.json({ data: previewImport(body), input: body });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_INPUT";
    const message = code === "FORBIDDEN" ? "Su rol no permite importar este tipo de datos." : code === "FILE_TOO_LARGE" ? "El archivo supera el límite de 4 MB." : "No se pudo preparar la vista previa de la importación.";
    return NextResponse.json({ error: { code, message } }, { status: code === "UNAUTHENTICATED" ? 401 : code === "FORBIDDEN" ? 403 : 400 });
  }
}
