import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "../../../../../src/server/auth/session";
import { prisma } from "../../../../../src/server/db";
const input = z.object({ motherId: z.string().uuid(), serviceId: z.string().uuid().optional(), date: z.coerce.date(), gestationDays: z.number().int().nonnegative().optional(), cause: z.string().max(240).optional(), notes: z.string().max(1000).optional() });
export const runtime = "nodejs";
export async function POST(request: Request) { try { const ctx = await requireSession(); const data = input.parse(await request.json()); const mother = await prisma.animal.findFirst({ where: { id: data.motherId, farmId: ctx.farmId, sex: "FEMALE", deletedAt: null } }); if (!mother) throw new Error("MOTHER_NOT_FOUND"); return NextResponse.json({ data: await prisma.abortion.create({ data: { ...data, farmId: ctx.farmId, serviceId: data.serviceId || null, cause: data.cause || null, notes: data.notes || null } }) }, { status: 201 }); } catch { return NextResponse.json({ error: { code: "INVALID_INPUT", message: "No se pudo registrar el aborto." } }, { status: 400 }); } }
