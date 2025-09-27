import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function pointsOf(h: number, a: number) {
  if (h === 2 && a === 0) return [3, 0];
  if (h === 1 && a === 1) return [1, 1];
  if (h === 0 && a === 2) return [0, 3];
  return [0, 0];
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;

  const player = await prisma.player.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!player) {
    return NextResponse.json({ error: "Oyuncu bulunamadı" }, { status: 404 });
  }

  // Son 5 maç (W/D/L sonucu ile birlikte)
  const recent = await prisma.match.findMany({
    where: { OR: [{ homeId: id }, { awayId: id }] },
    orderBy: { playedAt: "desc" },
    take: 5,
    include: {
      home: { select: { displayName: true } },
      away: { select: { displayName: true } },
    },
  });

  const recentMapped = recent.map((m) => {
    const isHome = m.homeId === id;
    const myWins = isHome ? m.homeWins : m.awayWins;
    const oppWins = isHome ? m.awayWins : m.homeWins;
    const result =
      myWins === 2 && oppWins === 0
        ? "W"
        : myWins === 1 && oppWins === 1
        ? "D"
        : myWins === 0 && oppWins === 2
        ? "L"
        : "-";
    return {
      id: m.id,
      playedAt: m.playedAt,
      home: m.home?.displayName,
      away: m.away?.displayName,
      score: `${m.homeWins}-${m.awayWins}`,
      result,
    };
  });

  // Toplam istatistikler
  const all = await prisma.match.findMany({
    where: { OR: [{ homeId: id }, { awayId: id }] },
  });

  let w = 0,
    d = 0,
    l = 0,
    gw = 0,
    gl = 0,
    pts = 0;

  for (const m of all) {
    const isHome = m.homeId === id;
    const myWins = isHome ? m.homeWins : m.awayWins;
    const oppWins = isHome ? m.awayWins : m.homeWins;
    gw += myWins;
    gl += oppWins;

    const [hp, ap] = pointsOf(m.homeWins, m.awayWins);
    pts += isHome ? hp : ap;

    if (m.homeWins === 2 && m.awayWins === 0) {
      if (isHome) w++;
      else l++;
    } else if (m.homeWins === 1 && m.awayWins === 1) {
      d++;
    } else if (m.homeWins === 0 && m.awayWins === 2) {
      if (isHome) l++;
      else w++;
    }
  }

  return NextResponse.json({
    player: {
      id: player.id,
      displayName: player.displayName,
      league: player.currentLeague,
      active: player.activeInLeague,
      favoriteCiv: player.favoriteCiv,
      userId: player.userId,
      user: {
        name: player.user?.name,
        email: player.user?.email,
        avatarUrl: player.user?.avatarUrl || null,
      },
    },
    stats: { totalMatches: all.length, w, d, l, gw, gl, pts },
    recent: recentMapped,
  });
}
