import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/public/seasons?leagueId=LEAGUE_TABLE_ID
 * - Public: sadece aktif sezonları verir
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const leagueId = searchParams.get("leagueId") || "";

  const where: any = { isActive: true };
  if (leagueId) where.leagueId = leagueId;

  const items = await prisma.season.findMany({
    where,
    orderBy: { startAt: "desc" },
    select: { id: true, label: true, leagueId: true },
  });

  return NextResponse.json({ items });
}
