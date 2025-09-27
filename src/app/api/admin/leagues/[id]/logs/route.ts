import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrModerator } from "@/lib/auth-helpers";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const me = await requireAdminOrModerator();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const logs = await prisma.auditLog.findMany({
    where: { entity: "LEAGUE", entityId: params.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ items: logs });
}
