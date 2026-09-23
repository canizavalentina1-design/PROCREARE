import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { randomBytes } from "node:crypto";
import { prisma } from "../db";
import type { Role } from "../authz/permissions";
export type SessionContext = { userId: string; farmId: string; organizationId: string; role: Role };
export const accessCookie = "procreare_session";
async function secret() { if (process.env.AUTH_SECRET) return new TextEncoder().encode(process.env.AUTH_SECRET); const setting = await prisma.systemSetting.findUnique({ where: { key: "auth_secret" }, select: { value: true } }); if (setting?.value) return new TextEncoder().encode(setting.value); const value = randomBytes(64).toString("base64url"); await prisma.systemSetting.upsert({ where: { key: "auth_secret" }, create: { key: "auth_secret", value }, update: {} }); return new TextEncoder().encode(value); }
export async function createSession(payload: SessionContext) { return new SignJWT(payload).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("15m").sign(await secret()); }
export async function readSession(): Promise<SessionContext|null> { const token=(await cookies()).get(accessCookie)?.value; if(!token)return null; try { const result=await jwtVerify<SessionContext>(token,await secret()); return result.payload.userId&&result.payload.farmId&&result.payload.organizationId&&result.payload.role?result.payload:null; } catch { return null; } }
export async function requireSession(): Promise<SessionContext> { const session=await readSession(); if(!session)throw new Error("UNAUTHENTICATED"); const membership=await prisma.membership.findFirst({where:{userId:session.userId,farmId:session.farmId},select:{role:true,farm:{select:{organizationId:true}}}}); if(!membership||membership.farm.organizationId!==session.organizationId)throw new Error("FORBIDDEN"); return {...session,role:membership.role as Role}; }
