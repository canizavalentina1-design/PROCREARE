import {NextResponse} from "next/server";
import {z} from "zod";
import ExcelJS from "exceljs";
import {requireSession} from "../../../../../src/server/auth/session";
import {prisma} from "../../../../../src/server/db";
const input=z.object({name:z.string().trim().min(1).max(120),identifiers:z.array(z.string().trim().min(1)).min(1).max(10000)});
export const runtime="nodejs";
export async function POST(request:Request){try{
 const ctx=await requireSession(); let raw:unknown;
 if(request.headers.get("content-type")?.includes("multipart/form-data")){const form=await request.formData();const file=form.get("file");if(!(file instanceof File))throw Error("FILE_REQUIRED");const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()) as never);const sheet=workbook.worksheets[0];if(!sheet)throw Error("EMPTY_FILE");const rows=sheet.getSheetValues().slice(1).filter(Array.isArray) as unknown[][];const header=(rows[0]||[]).map(v=>String(v??""));const column=header.findIndex(v=>/caravana|identificador|internal.?id|eid|id/i.test(v));const identifiers=(column>=0?rows.slice(1).map(row=>row[column]):rows.map(row=>row[1]??row[0])).map(v=>String(v??"").trim()).filter(Boolean);raw={name:String(form.get("name")||""),identifiers};}else raw=await request.json();
 const data=input.parse(raw);const group=await prisma.group.create({data:{farmId:ctx.farmId,name:data.name}});const animals=await prisma.animal.findMany({where:{farmId:ctx.farmId,deletedAt:null,OR:[{internalId:{in:data.identifiers}},{eid:{in:data.identifiers}}]},select:{id:true,internalId:true,eid:true}});const matched=new Set(animals.flatMap(a=>[a.internalId,a.eid].filter((v):v is string=>Boolean(v))));await prisma.animal.updateMany({where:{id:{in:animals.map(a=>a.id)},farmId:ctx.farmId},data:{currentGroupId:group.id}});await prisma.animalEvent.createMany({data:animals.map(a=>({farmId:ctx.farmId,animalId:a.id,userId:ctx.userId,type:"GROUP_IMPORT",date:new Date(),after:{groupId:group.id},notes:`Grupo ${group.name}`}))});return NextResponse.json({data:{group,matched:animals.length,missing:data.identifiers.filter(v=>!matched.has(v))}},{status:201});
}catch(error){return NextResponse.json({error:{code:error instanceof Error?error.message:"INVALID_INPUT",message:"No se pudo crear el grupo desde el archivo."}},{status:400});}}
