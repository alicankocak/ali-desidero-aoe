import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
){
  const id = params.id;

  const m = await prisma.match.findUnique({
    where: { id },
    include: {
      home: { select: { id: true, displayName: true, favoriteCiv: true } },
      away: { select: { id: true, displayName: true, favoriteCiv: true } },
    }
  });

  if(!m) return NextResponse.json({ error: "Maç bulunamadı" }, { status: 404 });

  return NextResponse.json({
    id: m.id,
    league: m.league,
    season: m.season,
    round: m.round,
    playedAt: m.playedAt,
    durationMinutes: (m as any).durationMinutes ?? null, // şemanda varsa
    vodYoutube: (m as any).vodYoutube ?? (m as any).vodUrl ?? null,
    vodTwitch: (m as any).vodTwitch ?? null,
    home: {
      id: m.home.id,
      name: m.home.displayName,
      civ: m.home.favoriteCiv,
      wins: m.homeWins
    },
    away: {
      id: m.away.id,
      name: m.away.displayName,
      civ: m.away.favoriteCiv,
      wins: m.awayWins
    }
  });
}
