import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/leagues  → aktif sezonları döner (selector için)
export async function GET() {
  const seasons = await prisma.season.findMany({
    where: { isActive: true },
    orderBy: [{ year: "desc" }, { index: "desc" }],
    include: {
      league: { select: { id: true, name: true } },
      _count: { select: { memberships: true, matches: true } },
    },
  });

  const items = seasons.map((s) => ({
    seasonId: s.id,
    label: s.label,              // "2025-1"
    year: s.year,
    index: s.index,
    leagueId: s.leagueId,
    leagueName: s.league.name,   // Admin panelde verdiğin lig adı
    players: s._count.memberships,
    matches: s._count.matches,
  }));

  return NextResponse.json({ items });
}
