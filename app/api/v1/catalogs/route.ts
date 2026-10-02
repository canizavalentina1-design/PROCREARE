import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "../../../../src/server/auth/session";
import { prisma } from "../../../../src/server/db";
import { can } from "../../../../src/server/authz/permissions";
export const runtime = "nodejs";
const input = z.object({ type: z.string().trim().min(1).max(60), name: z.string().trim().min(1).max(120), description: z.string().trim().max(500).optional() });
export async function GET(request: Request) { try { const ctx = await requireSession(); const type = new URL(request.url).searchParams.get("type") || undefined; return NextResponse.json({ data: await prisma.catalogItem.findMany({ where: { farmId: ctx.farmId, isActive: true, ...(type ? { type } : {}) }, orderBy: [{ type: "asc" }, { name: "asc" }] }) }); } catch { return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Debe ingresar para continuar." } }, { status: 401 }); } }
export async function POST(request: Request) { try { const ctx = await requireSession(); if (!can(ctx.role, "editAnimals")) throw new Error("FORBIDDEN"); const data = input.parse(await request.json()); return NextResponse.json({ data: await prisma.catalogItem.create({ data: { ...data, farmId: ctx.farmId } }) }, { status: 201 }); } catch (error) { const code = error instanceof Error ? error.message : "INTERNAL"; return NextResponse.json({ error: { code, message: code === "FORBIDDEN" ? "Su rol no permite modificar catálogos." : "No se pudo guardar el catálogo." } }, { status: code === "FORBIDDEN" ? 403 : 400 }); } }
