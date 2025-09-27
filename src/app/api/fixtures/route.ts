import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const league = (searchParams.get("league") as "LIG1" | "LIG2") || "LIG1";
  const season = searchParams.get("season") || "2025-1";

  const matches = await prisma.match.findMany({
    where: { league, season },
    orderBy: [{ round: "asc" }, { createdAt: "asc" }],
    include: {
      home: { select: { displayName: true } },
      away: { select: { displayName: true } },
    },
  });

  const byRound: Record<string, any[]> = {};
  for (const m of matches) {
    const key = String(m.round ?? 0);
    (byRound[key] ??= []).push({
      id: m.id,
      round: m.round,
      homeId: m.homeId,
      awayId: m.awayId,
      home: m.home?.displayName,
      away: m.away?.displayName,
      homeWins: m.homeWins,
      awayWins: m.awayWins,
      playedAt: m.playedAt,
    });
  }

  return NextResponse.json({ league, season, rounds: Object.keys(byRound).length, items: byRound });
}
