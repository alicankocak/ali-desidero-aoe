import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const league = searchParams.get("league"); // LIG1|LIG2
  const season = searchParams.get("season"); // "2025-1" vb.
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const take = Math.min(50, Number(searchParams.get("take") || 20));
  const skip = (page - 1) * take;

  const where: any = {};
  if (league) where.league = league;
  if (season) where.season = season;
  if (q) {
    where.OR = [
      { home: { displayName: { contains: q, mode: "insensitive" } } },
      { away: { displayName: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.match.count({ where }),
    prisma.match.findMany({
      where,
      orderBy: [{ playedAt: "desc" }, { createdAt: "desc" }],
      skip,
      take,
      include: {
        home: { select: { id: true, displayName: true } },
        away: { select: { id: true, displayName: true } },
      },
    }),
  ]);

  const items = rows.map(m => ({
    id: m.id,
    league: m.league,
    season: m.season,
    round: m.round,
    playedAt: m.playedAt,
    score: `${m.homeWins}-${m.awayWins}`,
    home: { id: m.home.id, name: m.home.displayName, civ: m.homeCiv ?? null, wins: m.homeWins },
    away: { id: m.away.id, name: m.away.displayName, civ: m.awayCiv ?? null, wins: m.awayWins },
    durationSec: m.durationSec ?? null,
  }));

  return NextResponse.json({ total, items, page, take });
}
