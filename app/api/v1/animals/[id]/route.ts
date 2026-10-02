import { NextResponse } from "next/server";
import { requireSession } from "../../../../../src/server/auth/session";
import { prisma } from "../../../../../src/server/db";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireSession();
    const { id } = await params;
    const animal = await prisma.animal.findFirst({
      where: { id, farmId: ctx.farmId, deletedAt: null },
      include: {
        currentGroup: true,
        currentLot: true,
        currentLocation: true,
        mother: { select: { id: true, internalId: true, name: true } },
        father: { select: { id: true, internalId: true, name: true } },
        offspringAsMother: { select: { id: true, internalId: true, name: true, sex: true, birthDate: true } },
        offspringAsFather: { select: { id: true, internalId: true, name: true, sex: true, birthDate: true } },
        weighings: { orderBy: { date: "asc" } },
        laboratoryRecords: { orderBy: { date: "desc" } },
        events: { orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 100 },
        servicesAsMother: { include: { diagnoses: true, births: { include: { calves: true } }, abortions: true }, orderBy: { date: "desc" } },
        diagnosesAsMother: { orderBy: { date: "desc" } },
        birthsAsMother: { include: { calves: true }, orderBy: { date: "desc" } },
        abortionsAsMother: { orderBy: { date: "desc" } },
      },
    });
    if (!animal) return NextResponse.json({ error: { code: "NOT_FOUND", message: "No se encontró el animal." } }, { status: 404 });
    return NextResponse.json({ data: animal });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL";
    return NextResponse.json({ error: { code, message: code === "UNAUTHENTICATED" ? "Debe ingresar para continuar." : "No se pudo cargar la ficha." } }, { status: code === "UNAUTHENTICATED" ? 401 : 400 });
  }
}
