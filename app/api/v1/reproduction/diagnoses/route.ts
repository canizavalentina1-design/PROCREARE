import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "../../../../../src/server/auth/session";
import { prisma } from "../../../../../src/server/db";
const input = z.object({ motherId: z.string().uuid(), serviceId: z.string().uuid().optional(), date: z.coerce.date(), result: z.string().trim().min(1).max(60), gestationDays: z.number().int().nonnegative().optional(), evaluation: z.string().max(200).optional(), notes: z.string().max(1000).optional() });
export const runtime = "nodejs";
export async function GET() { try { const ctx = await requireSession(); return NextResponse.json({ data: await prisma.pregnancyDiagnosis.findMany({ where: { farmId: ctx.farmId }, orderBy: { date: "desc" }, take: 200 }) }); } catch { return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Debe ingresar para continuar." } }, { status: 401 }); } }
export async function POST(request: Request) { try { const ctx = await requireSession(); const data = input.parse(await request.json()); const mother = await prisma.animal.findFirst({ where: { id: data.motherId, farmId: ctx.farmId, sex: "FEMALE", deletedAt: null } }); if (!mother) throw new Error("MOTHER_NOT_FOUND"); return NextResponse.json({ data: await prisma.pregnancyDiagnosis.create({ data: { ...data, farmId: ctx.farmId, serviceId: data.serviceId || null, evaluation: data.evaluation || null, notes: data.notes || null } }) }, { status: 201 }); } catch { return NextResponse.json({ error: { code: "INVALID_INPUT", message: "No se pudo registrar el diagnóstico." } }, { status: 400 }); } }
