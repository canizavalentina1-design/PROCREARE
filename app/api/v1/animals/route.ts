import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "../../../../src/server/auth/session";
import { createAnimal, listAnimals } from "../../../../src/server/services/animals";
export const runtime = "nodejs";
export async function GET(request: Request) { try { const ctx=await requireSession(); const search=new URL(request.url).searchParams.get("search")||undefined; return NextResponse.json({data:await listAnimals(ctx,search)}); } catch(error) { const code=error instanceof Error?error.message:"INTERNAL"; return NextResponse.json({error:{code,message:code==="UNAUTHENTICATED"?"Debe ingresar para continuar.":"No tiene permiso para ver estos datos."}},{status:code==="UNAUTHENTICATED"?401:403}); } }
export async function POST(request: Request) { try { const ctx=await requireSession(); const result=await createAnimal(ctx, z.any().parse(await request.json())); return NextResponse.json({data:result},{status:201}); } catch(error) { const code=error instanceof Error?error.message:"INTERNAL"; return NextResponse.json({error:{code,message:code==="FORBIDDEN"?"Su rol no permite crear animales.":"No se pudo guardar el animal."}},{status:code==="FORBIDDEN"?403:400}); } }
