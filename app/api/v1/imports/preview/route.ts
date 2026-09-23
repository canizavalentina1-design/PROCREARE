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
      const headers: string[] = [];
      sheet.getRow(1).eachCell((cell, index) => { headers[index - 1] = String(cell.value || ""); });
      const rows: Record<string, unknown>[] = [];
      sheet.eachRow((row, index) => {
        if (index === 1) return;
        const item: Record<string, unknown> = {};
        row.eachCell((cell, column) => { item[headers[column - 1] || `columna_${column}`] = cell.value instanceof Date ? cell.value.toISOString() : cell.value; });
        rows.push(item);
      });
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
