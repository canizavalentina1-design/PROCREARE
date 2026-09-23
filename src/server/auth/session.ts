import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { prisma } from "../db";
import type { Role } from "../authz/permissions";
export type SessionContext = { userId: string; farmId: string; organizationId: string; role: Role };
export const accessCookie = "procreare_session";
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || "development-only-secret-change-me");
export async function createSession(payload: SessionContext) { return new SignJWT(payload).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("15m").sign(secret()); }
export async function readSession(): Promise<SessionContext|null> { const token=(await cookies()).get(accessCookie)?.value; if(!token)return null; try { const result=await jwtVerify<SessionContext>(token,secret()); return result.payload.userId&&result.payload.farmId&&result.payload.organizationId&&result.payload.role?result.payload:null; } catch { return null; } }
export async function requireSession(): Promise<SessionContext> { const session=await readSession(); if(!session)throw new Error("UNAUTHENTICATED"); const membership=await prisma.membership.findFirst({where:{userId:session.userId,farmId:session.farmId},select:{role:true,farm:{select:{organizationId:true}}}}); if(!membership||membership.farm.organizationId!==session.organizationId)throw new Error("FORBIDDEN"); return {...session,role:membership.role as Role}; }
