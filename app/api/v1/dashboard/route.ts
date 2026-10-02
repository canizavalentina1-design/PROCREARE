import { NextResponse } from "next/server";
import { requireSession } from "../../../../src/server/auth/session";
import { prisma } from "../../../../src/server/db";
export const runtime = "nodejs";
export async function GET() {
  try {
    const ctx = await requireSession();
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const active = { farmId: ctx.farmId, status: "ACTIVE" as const, deletedAt: null };
    const [farm, activeAnimals, latestWeights, yearSales, categories, owners, stockValue, locations, services, diagnoses, births, abortions, movements] = await Promise.all([
      prisma.farm.findUnique({ where: { id: ctx.farmId }, select: { name: true, currency: true, targetDailyGainKg: true } }),
      prisma.animal.count({ where: active }),
      prisma.weighing.findMany({ where: { farmId: ctx.farmId }, orderBy: { date: "desc" }, take: 200, select: { weightKg: true } }),
      prisma.sale.aggregate({ where: { farmId: ctx.farmId, date: { gte: yearStart } }, _sum: { totalAmount: true }, _count: { _all: true } }),
      prisma.animal.groupBy({ by: ["category"], where: active, _count: { _all: true } }),
      prisma.animal.groupBy({ by: ["owner"], where: active, _count: { _all: true }, orderBy: { _count: { owner: "desc" } }, take: 8 }),
      prisma.animal.aggregate({ where: active, _sum: { value: true } }),
      prisma.location.findMany({ where: { farmId: ctx.farmId, isActive: true }, select: { id: true, name: true, type: true, _count: { select: { animals: true } } }, orderBy: { name: "asc" } }),
      prisma.reproductiveService.count({ where: { farmId: ctx.farmId } }), prisma.pregnancyDiagnosis.count({ where: { farmId: ctx.farmId } }),
      prisma.birth.aggregate({ where: { farmId: ctx.farmId }, _sum: { totalCalves: true } }), prisma.abortion.count({ where: { farmId: ctx.farmId } }),
      prisma.stockMovement.aggregate({ where: { farmId: ctx.farmId, date: { gte: yearStart } }, _sum: { value: true } }),
    ]);
    const averageWeight = latestWeights.length ? latestWeights.reduce((sum, item) => sum + Number(item.weightKg), 0) / latestWeights.length : null;
    const positive = await prisma.pregnancyDiagnosis.count({ where: { farmId: ctx.farmId, result: { contains: "PREÑ", mode: "insensitive" } } });
    const totalCost = Number(movements._sum.value ?? 0);
    return NextResponse.json({ data: { farm, activeAnimals, averageWeight, salesYear: Number(yearSales._sum.totalAmount ?? 0), salesCount: yearSales._count._all, categories, owners, stockValue: Number(stockValue._sum.value ?? 0), locations: locations.map(x => ({ id: x.id, name: x.name, type: x.type, animals: x._count.animals })), reproductive: { services, diagnoses, births: births._sum.totalCalves ?? 0, abortions, positive, pregnancyRate: diagnoses ? Math.round(positive / diagnoses * 100) : null }, financial: { movementValue: totalCost, costPerKg: averageWeight && activeAnimals ? Math.round(totalCost / (averageWeight * activeAnimals)) : null }, targetDailyGainKg: farm?.targetDailyGainKg ? Number(farm.targetDailyGainKg) : null } });
  } catch (error) { const code = error instanceof Error ? error.message : "INTERNAL"; return NextResponse.json({ error: { code, message: code === "UNAUTHENTICATED" ? "Debe ingresar para continuar." : "No se pudo cargar el resumen." } }, { status: code === "UNAUTHENTICATED" ? 401 : 403 }); }
}
