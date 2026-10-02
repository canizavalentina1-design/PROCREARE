import { z } from "zod";
import { prisma } from "../db";
import { can } from "../authz/permissions";
import type { SessionContext } from "../auth/session";

export const movementInput = z.object({
  type: z.enum(["INITIAL", "PURCHASE", "BIRTH", "OTHER_IN", "TRANSFER_IN", "SALE", "DEATH", "DISPOSAL", "OTHER_OUT", "TRANSFER_OUT"]),
  date: z.coerce.date().default(() => new Date()),
  quantity: z.number().int().nonnegative().default(0),
  animalIds: z.array(z.string().uuid()).default([]),
  groupId: z.string().uuid().optional(),
  origin: z.string().trim().max(120).optional(),
  destination: z.string().trim().max(120).optional(),
  value: z.number().nonnegative().optional(),
  reason: z.string().trim().max(240).optional(),
  notes: z.string().trim().max(2000).optional(),
  groupId: z.string().uuid().optional(),
  lotId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
});

const incoming = new Set(["INITIAL", "PURCHASE", "BIRTH", "OTHER_IN", "TRANSFER_IN"]);
const outgoing = new Set(["SALE", "DEATH", "DISPOSAL", "OTHER_OUT", "TRANSFER_OUT"]);

export async function createMovement(ctx: SessionContext, input: unknown) {
  if (!can(ctx.role, "editAnimals")) throw new Error("FORBIDDEN");
  const data = movementInput.parse(input);
  if (!data.animalIds.length && data.groupId) { const groupAnimals = await prisma.animal.findMany({ where: { farmId: ctx.farmId, currentGroupId: data.groupId, status: "ACTIVE", deletedAt: null }, select: { id: true } }); data.animalIds = groupAnimals.map((animal) => animal.id); }
  if (data.animalIds.length > 0) data.quantity = data.animalIds.length;
  if (!data.quantity && !data.animalIds.length) throw new Error("QUANTITY_OR_ANIMAL_REQUIRED");
  if (!incoming.has(data.type) && !outgoing.has(data.type)) throw new Error("INVALID_MOVEMENT");

  return prisma.$transaction(async (tx) => {
    const animals = data.animalIds.length ? await tx.animal.findMany({ where: { id: { in: data.animalIds }, farmId: ctx.farmId, deletedAt: null } }) : [];
    if (animals.length !== data.animalIds.length) throw new Error("ANIMAL_NOT_FOUND");
    if (outgoing.has(data.type) && animals.some((animal) => animal.status !== "ACTIVE")) throw new Error("ANIMAL_NOT_AVAILABLE");
    const movement = await tx.stockMovement.create({
      data: {
        farmId: ctx.farmId, userId: ctx.userId, type: data.type, date: data.date, quantity: data.quantity,
        origin: data.origin || null, destination: data.destination || null, value: data.value ?? null,
        reason: data.reason || null, notes: data.notes || null, groupId: data.groupId || null,
        lotId: data.lotId || null, locationId: data.locationId || null,
        animals: data.animalIds.length ? { create: data.animalIds.map((animalId) => ({ animalId })) } : undefined,
      },
    });
    if (outgoing.has(data.type) && data.animalIds.length) {
      const status = data.type === "SALE" ? "SOLD" : data.type === "DEATH" ? "DEAD" : data.type === "TRANSFER_OUT" ? "TRANSFERRED" : "INACTIVE";
      await tx.animal.updateMany({ where: { id: { in: data.animalIds }, farmId: ctx.farmId }, data: { status } });
    }
    if (incoming.has(data.type) && data.animalIds.length) {
      await tx.animal.updateMany({ where: { id: { in: data.animalIds }, farmId: ctx.farmId }, data: { status: "ACTIVE", currentGroupId: data.groupId || null, currentLotId: data.lotId || null, currentLocationId: data.locationId || null } });
    }
    for (const animal of animals) {
      await tx.animalEvent.create({ data: { farmId: ctx.farmId, animalId: animal.id, userId: ctx.userId, type: `MOVEMENT_${data.type}`, date: data.date, before: { status: animal.status }, after: { status: outgoing.has(data.type) ? (data.type === "SALE" ? "SOLD" : data.type === "DEATH" ? "DEAD" : data.type === "TRANSFER_OUT" ? "TRANSFERRED" : "INACTIVE") : "ACTIVE" }, notes: data.notes || null } });
    }
    return movement;
  });
}

export async function listMovements(ctx: SessionContext, searchParams: URLSearchParams) {
  const type = searchParams.get("type") || undefined;
  return prisma.stockMovement.findMany({ where: { farmId: ctx.farmId, ...(type ? { type: type as never } : {}) }, include: { group: true, lot: true, location: true }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 200 });
}

export async function getStockSummary(ctx: SessionContext) {
  const rows = await prisma.stockMovement.groupBy({ by: ["type"], where: { farmId: ctx.farmId }, _sum: { quantity: true } });
  const summary = Object.fromEntries(rows.map((row) => [row.type, row._sum.quantity || 0]));
  const active = await prisma.animal.count({ where: { farmId: ctx.farmId, status: "ACTIVE", deletedAt: null } });
  return { active, byMovement: summary };
}
