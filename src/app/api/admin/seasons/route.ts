import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrModerator } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request){
  const { searchParams } = new URL(req.url);
  const leagueId = searchParams.get("leagueId") || "";
  if (!leagueId) return NextResponse.json({ items: [] });
  const items = await prisma.season.findMany({
    where: { leagueId },
    orderBy: { startAt: "desc" },
    select: { id: true, label: true, leagueId: true },
  });
  return NextResponse.json({ items });
}

export async function GET(req: Request) {
  const me = await requireAdminOrModerator();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const onlyActive = searchParams.get("active");
  const id = searchParams.get("id");

  // Tek sezon detayı + oyuncular
  if (id) {
    const s = await prisma.season.findUnique({
      where: { id },
      include: {
        league: true,
        memberships: { include: { player: true } },
      },
    });
    if (!s) return NextResponse.json({ error: "Sezon bulunamadı" }, { status: 404 });

    return NextResponse.json({
      item: {
        id: s.id,
        label: s.label,
        leagueName: s.league.name,
        playerCount: s.memberships.length,
        players: s.memberships.map((m) => ({
          id: m.player.id,
          name: m.player.displayName,
        })),
      },
    });
  }

  // Liste
  const seasons = await prisma.season.findMany({
    where: onlyActive ? { isActive: true } : undefined,
    orderBy: [{ startAt: "desc" }],
    include: { league: true, memberships: true },
  });

  const items = seasons.map((s) => ({
    id: s.id,
    label: s.label,
    leagueName: s.league.name,
    startAt: s.startAt,
    endAt: s.endAt,
    playerCount: s.memberships.length,
  }));

  return NextResponse.json({ items });
}
