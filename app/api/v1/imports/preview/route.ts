import { NextResponse } from "next/server";
import { requireSession } from "../../../../../src/server/auth/session";
import { can } from "../../../../../src/server/authz/permissions";
import { previewImport } from "../../../../../src/server/services/imports";
export const runtime="nodejs";
export async function POST(request:Request){try{const ctx=await requireSession();const body=await request.json();if(!can(ctx.role,body.type==="SALES"?"importSales":"importAnimals"))throw new Error("FORBIDDEN");return NextResponse.json({data:previewImport(body)},{status:200});}catch(error){const code=error instanceof Error?error.message:"INVALID_INPUT";return NextResponse.json({error:{code,message:code==="FORBIDDEN"?"Su rol no permite importar este tipo de datos.":"No se pudo preparar la vista previa de la importación."}},{status:code==="UNAUTHENTICATED"?401:code==="FORBIDDEN"?403:400});}}
