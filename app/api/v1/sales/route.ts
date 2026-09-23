import { NextResponse } from "next/server";
import { requireSession } from "../../../../src/server/auth/session";
import { createSale, listSales } from "../../../../src/server/services/sales";
export const runtime="nodejs";
export async function GET(){try{return NextResponse.json({data:await listSales(await requireSession())});}catch(error){const code=error instanceof Error?error.message:"INTERNAL";return NextResponse.json({error:{code,message:"No se pudieron cargar las ventas."}},{status:code==="UNAUTHENTICATED"?401:403});}}
export async function POST(request:Request){try{return NextResponse.json({data:await createSale(await requireSession(),await request.json())},{status:201});}catch(error){const code=error instanceof Error?error.message:"INTERNAL";return NextResponse.json({error:{code,message:code==="FORBIDDEN"?"Su rol no permite registrar ventas.":"No se pudo registrar la venta."}},{status:code==="FORBIDDEN"?403:400});}}
