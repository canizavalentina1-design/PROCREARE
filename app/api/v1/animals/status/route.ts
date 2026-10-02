import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "../../../../../src/server/auth/session";
import { createMovement } from "../../../../../src/server/services/movements";
export const runtime = "nodejs";
const input = z.object({ animalIds: z.array(z.string().uuid()).default([]), groupId: z.string().uuid().optional(), status: z.enum(["DEATH", "DISPOSAL", "TRANSFER_OUT"]), date: z.coerce.date().default(() => new Date()), reason: z.string().trim().min(1).max(240), notes: z.string().max(1000).optional() }).refine((value) => value.animalIds.length > 0 || value.groupId, "Seleccione animales o un grupo");
export async function POST(request: Request) { try { const ctx = await requireSession(); const data = input.parse(await request.json()); return NextResponse.json({ data: await createMovement(ctx, { ...data, type: data.status, quantity: data.animalIds.length }) }, { status: 201 }); } catch (error) { const code = error instanceof Error ? error.message : "INTERNAL"; return NextResponse.json({ error: { code, message: code === "ANIMAL_NOT_AVAILABLE" ? "Solo se pueden actualizar animales activos." : "No se pudo actualizar el estado." } }, { status: 400 }); } }
