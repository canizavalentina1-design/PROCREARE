import { NextResponse } from "next/server";
import { requireSession } from "../../../../src/server/auth/session";
import { createMovement, getStockSummary, listMovements } from "../../../../src/server/services/movements";
export const runtime = "nodejs";
export async function GET(request: Request) { try { const ctx = await requireSession(); const params = new URL(request.url).searchParams; return NextResponse.json({ data: params.get("summary") === "true" ? await getStockSummary(ctx) : await listMovements(ctx, params) }); } catch { return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Debe ingresar para continuar." } }, { status: 401 }); } }
export async function POST(request: Request) { try { const ctx = await requireSession(); return NextResponse.json({ data: await createMovement(ctx, await request.json()) }, { status: 201 }); } catch (error) { const code = error instanceof Error ? error.message : "INTERNAL"; return NextResponse.json({ error: { code, message: code === "FORBIDDEN" ? "Su rol no permite registrar movimientos." : "No se pudo registrar el movimiento." } }, { status: code === "FORBIDDEN" ? 403 : 400 }); } }
