import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../src/server/db";
import { verifyPassword } from "../../../../../src/server/auth/password";
import { createSession, accessCookie } from "../../../../../src/server/auth/session";
const schema=z.object({email:z.string().email(),password:z.string().min(10)});
export const runtime="nodejs";
export async function POST(request:Request){const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:{code:"INVALID_INPUT",message:"Revise su correo y contraseña."}},{status:400});const user=await prisma.user.findUnique({where:{email:parsed.data.email.toLowerCase()},include:{memberships:{include:{farm:true},take:1}}});if(!user||!user.isActive||!(await verifyPassword(parsed.data.password,user.passwordHash))||!user.memberships[0])return NextResponse.json({error:{code:"INVALID_CREDENTIALS",message:"El correo o la contraseña no son correctos."}},{status:401});const membership=user.memberships[0];const token=await createSession({userId:user.id,farmId:membership.farmId,organizationId:membership.farm.organizationId,role:membership.role});const response=NextResponse.json({data:{user:{id:user.id,name:user.name,email:user.email},farm:{id:membership.farm.id,name:membership.farm.name}}});response.cookies.set(accessCookie,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",maxAge:900,path:"/"});return response;}
