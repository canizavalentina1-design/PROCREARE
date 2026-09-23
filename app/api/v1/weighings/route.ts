import { NextResponse } from "next/server";
import { requireSession } from "../../../../src/server/auth/session";
import { listWeighings, recordWeighing } from "../../../../src/server/services/weighings";
export const runtime="nodejs";
export async function GET(request:Request){try{const ctx=await requireSession();const animalId=new URL(request.url).searchParams.get("animalId")||undefined;return NextResponse.json({data:await listWeighings(ctx,animalId)});}catch(error){const code=error instanceof Error?error.message:"INTERNAL";return NextResponse.json({error:{code,message:"No se pudieron cargar los pesajes."}},{status:code==="UNAUTHENTICATED"?401:403});}}
export async function POST(request:Request){try{const ctx=await requireSession();return NextResponse.json({data:await recordWeighing(ctx,await request.json())},{status:201});}catch(error){const code=error instanceof Error?error.message:"INTERNAL";return NextResponse.json({error:{code,message:code==="FORBIDDEN"?"Su rol no permite registrar pesajes.":"Revise los datos del pesaje."}},{status:code==="FORBIDDEN"?403:400});}}
