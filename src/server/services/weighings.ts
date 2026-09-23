import { z } from "zod";
import { prisma } from "../db";
import { can } from "../authz/permissions";
import type { SessionContext } from "../auth/session";
export const weighingInput=z.object({animalId:z.string().uuid(),date:z.coerce.date(),weightKg:z.coerce.number().positive().max(1500),type:z.enum(["INITIAL","ROUTINE","WEANING","SALE","REPRODUCTIVE"]),notes:z.string().max(1000).optional()});
export async function recordWeighing(ctx:SessionContext,input:unknown){if(!can(ctx.role,"weigh"))throw new Error("FORBIDDEN");const data=weighingInput.parse(input);const animal=await prisma.animal.findFirst({where:{id:data.animalId,farmId:ctx.farmId,deletedAt:null}});if(!animal)throw new Error("NOT_FOUND");return prisma.weighing.create({data:{farmId:ctx.farmId,animalId:animal.id,date:data.date,weightKg:data.weightKg,type:data.type,notes:data.notes}});}
export async function listWeighings(ctx:SessionContext,animalId?:string){return prisma.weighing.findMany({where:{farmId:ctx.farmId,...(animalId?{animalId}: {})},orderBy:{date:"desc"},take:200});}
