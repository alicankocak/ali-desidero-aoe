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

  const matches = await prisma.match.findMany({
    where: { OR: [{ homeId: id }, { awayId: id }] },
    orderBy: [{ playedAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });

  const cum = [] as Array<{ idx: number; total: number; playedAt?: string; label: string }>;
  let idx = 1;
  let total = 0;
  for (const m of matches) {
    const isHome = m.homeId === id;
    const [hp, ap] = pointsOf(m.homeWins, m.awayWins);
    total += isHome ? hp : ap;
    cum.push({
      idx: idx++,
      total,
      playedAt: m.playedAt?.toISOString(),
      label: `${m.season} • ${m.league} • ${m.homeWins}-${m.awayWins}`,
    });
  }

  return NextResponse.json({ items: cum });
}
