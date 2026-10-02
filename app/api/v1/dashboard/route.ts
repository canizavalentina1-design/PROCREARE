import { NextResponse } from "next/server";
import { requireSession } from "../../../../src/server/auth/session";
import { prisma } from "../../../../src/server/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const ctx = await requireSession();
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const [farm, activeAnimals, latestWeights, yearSales, latestWeighings, categories, owners, stockValue] = await Promise.all([
      prisma.farm.findUnique({ where: { id: ctx.farmId }, select: { name: true, currency: true, targetDailyGainKg: true } }),
      prisma.animal.count({ where: { farmId: ctx.farmId, status: "ACTIVE", deletedAt: null } }),
      prisma.weighing.findMany({ where: { farmId: ctx.farmId }, orderBy: { date: "desc" }, take: 200, select: { weightKg: true } }),
      prisma.sale.aggregate({ where: { farmId: ctx.farmId, date: { gte: yearStart } }, _sum: { totalAmount: true }, _count: { _all: true } }),
      prisma.weighing.findMany({ where: { farmId: ctx.farmId }, orderBy: { date: "desc" }, take: 6, include: { animal: { select: { internalId: true } } } }),
      prisma.animal.groupBy({ by: ["category"], where: { farmId: ctx.farmId, status: "ACTIVE", deletedAt: null }, _count: { _all: true } }),
      prisma.animal.groupBy({ by: ["owner"], where: { farmId: ctx.farmId, status: "ACTIVE", deletedAt: null }, _count: { _all: true }, orderBy: { _count: { owner: "desc" } }, take: 6 }),
      prisma.animal.aggregate({ where: { farmId: ctx.farmId, status: "ACTIVE", deletedAt: null }, _sum: { value: true } }),
    ]);
    const averageWeight = latestWeights.length ? latestWeights.reduce((sum, item) => sum + Number(item.weightKg), 0) / latestWeights.length : null;
    return NextResponse.json({ data: { farm, activeAnimals, averageWeight, salesYear: Number(yearSales._sum.totalAmount ?? 0), salesCount: yearSales._count._all, latestWeighings, categories, owners, stockValue: Number(stockValue._sum.value ?? 0) } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL";
    return NextResponse.json({ error: { code, message: code === "UNAUTHENTICATED" ? "Debe ingresar para continuar." : "No se pudo cargar el resumen." } }, { status: code === "UNAUTHENTICATED" ? 401 : 403 });
  }
}
