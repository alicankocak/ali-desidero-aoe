import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId") || "";
  const roundParam = searchParams.get("round");

  if (!seasonId) return NextResponse.json({ items: [], rounds: [], round: null });

  // Tüm turları çek
  const all = await prisma.match.findMany({
    where: { seasonRelId: seasonId },
    select: { round: true },
  });

  const rounds = Array.from(new Set(all.map(m => m.round ?? 0)))
    .filter(Boolean)
    .sort((a, b) => a - b);

  const round = roundParam ? Number(roundParam) : (rounds[0] ?? null);

  const itemsRaw = await prisma.match.findMany({
    where: { seasonRelId: seasonId, ...(round ? { round } : {}) },
    orderBy: [{ playedAt: "asc" }, { createdAt: "asc" }],
    include: {
      home: { select: { id: true, displayName: true } },
      away: { select: { id: true, displayName: true } },
    },
  });

  const items = itemsRaw.map(m => ({
    id: m.id,
    round: m.round,
    playedAt: m.playedAt ? m.playedAt.toISOString() : null,
    map: (m as any).map ?? null,
    home: { id: m.homeId, name: m.home.displayName },
    away: { id: m.awayId, name: m.away.displayName },
    homeWins: m.homeWins,
    awayWins: m.awayWins,
    vodUrl: m.vodUrl ?? null,
  }));

  return NextResponse.json({ items, rounds, round });
}
