import { NextResponse } from "next/server";
import { requireSession } from "../../../../../src/server/auth/session";
import { previewImport } from "../../../../../src/server/services/imports";
export const runtime="nodejs";
export async function POST(request:Request){try{await requireSession();return NextResponse.json({data:previewImport(await request.json())},{status:200});}catch(error){const code=error instanceof Error?error.message:"INVALID_INPUT";return NextResponse.json({error:{code,message:"No se pudo preparar la vista previa de la importación."}},{status:code==="UNAUTHENTICATED"?401:400});}}
