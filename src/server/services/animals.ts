import { prisma } from "../db";
import { can, type Role } from "../authz/permissions";
import type { SessionContext } from "../auth/session";
import { z } from "zod";

export const animalInput = z.object({
  internalId: z.string().trim().min(1).max(40),
  registrationNumber: z.string().trim().max(80).optional().or(z.literal("")),
  eid: z.string().trim().max(80).optional().or(z.literal("")),
  breed: z.string().trim().min(1).max(80),
  sex: z.enum(["MALE", "FEMALE"]),
  category: z.enum(["TERNERO","TERNERA","DESMAMANTE","NOVILLO","VAQUILLA","VACA","TORO","BUEY"]),
  origin: z.enum(["BORN_ON_FARM","PURCHASED","OTHER"]).default("OTHER"),
  birthDate: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
});
export type AnimalInput = z.infer<typeof animalInput>;
export async function listAnimals(ctx: SessionContext, search?: string) {
  return prisma.animal.findMany({ where: { farmId: ctx.farmId, deletedAt: null, ...(search ? { OR: [{ internalId: { contains: search, mode: "insensitive" } }, { registrationNumber: { contains: search, mode: "insensitive" } }, { eid: { contains: search, mode: "insensitive" } }, { breed: { contains: search, mode: "insensitive" } }] } : {}) }, orderBy: { internalId: "asc" }, take: 100 });
}
export async function createAnimal(ctx: SessionContext, input: AnimalInput) {
  if (!can(ctx.role, "editAnimals")) throw new Error("FORBIDDEN");
  const data = animalInput.parse(input);
  return prisma.$transaction(async (tx) => {
    const animal = await tx.animal.create({ data: { ...data, farmId: ctx.farmId, registrationNumber: data.registrationNumber || null, eid: data.eid || null } });
    return animal;
  });
}
