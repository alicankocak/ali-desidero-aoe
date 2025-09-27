import { prisma } from "@/lib/prisma";

export async function writeAudit(entity: "LEAGUE"|"FIXTURE", entityId: string, userId: string|undefined, action: string, detail?: any){
  try{
    await prisma.auditLog.create({
      data: { entity: entity as any, entityId, userId, action, detail }
    });
  }catch(e){
    console.error("audit error", e);
  }
}
