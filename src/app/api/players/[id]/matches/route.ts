import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const take = parseInt(searchParams.get("take") || "10", 10);
  const skip = (page - 1) * take;

  const id = params.id;

  const where = { OR: [{ homeId: id }, { awayId: id }] };

  const [items, total] = await Promise.all([
    prisma.match.findMany({
      where,
      orderBy: { playedAt: "desc" },
      skip,
      take,
      include: { home: true, away: true },
    }),
    prisma.match.count({ where }),
  ]);

  const mapped = items.map((m) => {
    const isHome = m.homeId === id;
    const opponent = isHome ? m.away : m.home;
    return {
      id: m.id,
      round: m.round,
      league: m.league,
      season: m.season,
      playedAt: m.playedAt,
      home: m.home.displayName,
      away: m.away.displayName,
      score: `${m.homeWins}-${m.awayWins}`,
      as: isHome ? "HOME" : "AWAY",
      opponentId: opponent.id,
      opponentName: opponent.displayName,
    };
  });

  return NextResponse.json({ items: mapped, total, page, take });
}
