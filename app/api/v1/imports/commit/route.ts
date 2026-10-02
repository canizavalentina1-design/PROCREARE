import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireSession } from "../../../../../src/server/auth/session";
import { can } from "../../../../../src/server/authz/permissions";
import { prisma } from "../../../../../src/server/db";
import { previewInput, previewImport } from "../../../../../src/server/services/imports";
import { parseNumber } from "../../../../../src/domain/imports";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ctx = await requireSession();
    const body = await request.json();
    const parsed = previewInput.parse(body);
    if (!can(ctx.role, parsed.type === "SALES" ? "importSales" : "importAnimals")) throw new Error("FORBIDDEN");
    const preview = previewImport(parsed);
    const fileHash = String(body.fileHash || "");
    if (!fileHash) throw new Error("FILE_HASH_REQUIRED");
    const existing = await prisma.importBatch.findUnique({ where: { farmId_fileHash: { farmId: ctx.farmId, fileHash } } });
    if (existing) throw new Error("DUPLICATE_FILE");
    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.importBatch.create({
        data: {
          farmId: ctx.farmId, type: parsed.type, fileName: String(body.fileName || "importación"), fileHash,
          status: "COMMITTED", totalRows: preview.rows.length, validRows: preview.validRows, errorRows: preview.errorRows, committedAt: new Date(),
          rows: { create: preview.rows.map((row) => ({ rowNumber: row.rowNumber, raw: row.raw as Prisma.InputJsonValue, normalized: row.normalized as Prisma.InputJsonValue, status: row.status, errors: row.errors as Prisma.InputJsonValue })) },
        },
      });
      if (parsed.type === "ANIMALS") for (const row of preview.rows.filter((item) => item.status === "VALID")) {
        const data = row.normalized as Record<string, unknown>;
        const internalId = String(data.internalId || "").trim();
        const rawCategory = String(data.category || "TERNERO").toUpperCase();
        const category = rawCategory.includes("VAQUILLA") ? "VAQUILLA" : rawCategory.includes("VACA") ? "VACA" : rawCategory.includes("NOVILLO") ? "NOVILLO" : rawCategory.includes("TERNERA") ? "TERNERA" : rawCategory.includes("TORO") ? "TORO" : "TERNERO";
        const existing = await tx.animal.findUnique({ where: { farmId_internalId: { farmId: ctx.farmId, internalId } } });
        const values = { eid: data.eid ? String(data.eid) : undefined, microchip: data.microchip ? String(data.microchip) : undefined, name: data.name ? String(data.name) : undefined, breed: String(data.breed || "Sin especificar"), sex: (data.sex as "MALE" | "FEMALE") || (category === "TORO" || category === "NOVILLO" ? "MALE" : "FEMALE"), category: category as "TERNERO" | "TERNERA" | "DESMAMANTE" | "NOVILLO" | "VAQUILLA" | "VACA" | "TORO" | "BUEY", owner: data.owner ? String(data.owner) : undefined, value: data.value == null || data.value === "" ? undefined : parseNumber(data.value), birthDate: data.birthDate ? new Date(String(data.birthDate)) : undefined, origin: "OTHER" as const };
        if (existing) await tx.animal.update({ where: { id: existing.id }, data: values }); else await tx.animal.create({ data: { farmId: ctx.farmId, internalId, ...values } });
      }
      if (parsed.type === "WEIGHINGS") for (const row of preview.rows.filter((item) => item.status === "VALID")) {
        const data = row.normalized as Record<string, unknown>;
        const identifier = String(data.animalId || data.internalId || data.eid || "");
        const animal = await tx.animal.findFirst({ where: { farmId: ctx.farmId, OR: [{ id: identifier }, { internalId: identifier }, { eid: identifier }] } });
        const weight = parseNumber(data.weightKg);
        if (!animal || !weight || !data.date) throw new Error("WEIGHING_ANIMAL_NOT_FOUND");
        await tx.weighing.create({ data: { farmId: ctx.farmId, animalId: animal.id, date: new Date(String(data.date)), weightKg: weight, type: "ROUTINE" } });
      }
      if (parsed.type === "SALES") for (const row of preview.rows.filter((item) => item.status === "VALID")) {
        const data = row.normalized as Record<string, unknown>;
        const identifier = String(data.animalId || data.internalId || data.eid || "");
        const animal = await tx.animal.findFirst({ where: { farmId: ctx.farmId, OR: [{ id: identifier }, { internalId: identifier }, { eid: identifier }] } });
        const unitPrice = parseNumber(data.unitPrice);
        if (!animal || unitPrice === null || !data.date) throw new Error("SALE_ANIMAL_NOT_FOUND");
        const sale = await tx.sale.create({ data: { farmId: ctx.farmId, date: new Date(String(data.date)), buyerName: String(data.buyerName || "Sin especificar"), priceMode: "PER_HEAD", currency: "PYG", totalAmount: unitPrice, items: { create: { animalId: animal.id, unitPrice, lineTotal: unitPrice, weightKg: parseNumber(data.weightKg) || undefined } } } });
        await tx.animal.update({ where: { id: animal.id }, data: { status: "SOLD" } });
        void sale;
      }
      return batch;
    });
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_INPUT";
    const message = code === "FORBIDDEN" ? "Su rol no permite importar este tipo de datos." : code === "DUPLICATE_FILE" ? "Este archivo ya fue importado en esta finca." : code === "WEIGHING_ANIMAL_NOT_FOUND" ? "No se encontró el animal asociado a uno de los pesajes." : code === "SALE_ANIMAL_NOT_FOUND" ? "No se encontró el animal asociado a una de las ventas." : `No se pudo confirmar la importación (${code}).`;
    return NextResponse.json({ error: { code, message } }, { status: code === "UNAUTHENTICATED" ? 401 : code === "FORBIDDEN" ? 403 : 400 });
  }
}
