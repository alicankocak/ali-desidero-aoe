import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrModerator } from "@/lib/auth-helpers";

/**
 * GET /api/admin/seasons?leagueId=LEAGUE_TABLE_ID&all=1
 * - Sadece ADMIN/MODERATOR erişimi
 * - leagueId yoksa tüm sezonları döner (admin listelemeleri için)
 * - all=1 verilmezse sadece aktif sezonlar gelir
 */
export async function GET(req: Request) {
  const me = await requireAdminOrModerator();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const leagueId = searchParams.get("leagueId") || "";
  const includeAll = searchParams.get("all") === "1";

  const where: any = {};
  if (leagueId) where.leagueId = leagueId;
  if (!includeAll) where.isActive = true;

  const items = await prisma.season.findMany({
    where,
    orderBy: { startAt: "desc" },
    select: {
      id: true,
      label: true,
      leagueId: true,
      isActive: true,
      year: true,
      index: true,
      startAt: true,
      endAt: true,
    },
  });

  return NextResponse.json({ items });
}
