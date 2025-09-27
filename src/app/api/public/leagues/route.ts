import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const leagues = await prisma.leagueTable.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      seasons: {
        where: { isActive: true },
        orderBy: { startAt: "desc" },
        take: 1,
        select: { id: true, label: true },
      },
    },
  });

  const items = leagues.map(l => ({
    id: l.id,
    name: l.name,
    activeSeason: l.seasons[0]
      ? { id: l.seasons[0].id, label: l.seasons[0].label }
      : null,
  }));

  return NextResponse.json({ items });
}
