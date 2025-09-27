import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrModerator } from "@/lib/auth-helpers";

export async function GET(req: Request) {
  const me = await requireAdminOrModerator();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const seasonLabel = searchParams.get("seasonLabel") || undefined;

  const players = await prisma.player.findMany({
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true, currentLeague: true, userId: true },
  });

  let unavailable = new Set<string>();
  if (seasonLabel) {
    const seasons = await prisma.season.findMany({
      where: { label: seasonLabel },
      select: { memberships: { select: { playerId: true } } },
    });
    for (const s of seasons) {
      for (const m of s.memberships) unavailable.add(m.playerId);
    }
  }

  const items = players.map((p) => ({
    id: p.id,
    name: p.displayName,
    unavailable: unavailable.has(p.id),
  }));

  return NextResponse.json({ items });
}
