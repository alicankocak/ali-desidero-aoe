import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrModerator } from "@/lib/auth-helpers";

export async function GET() {
  const me = await requireAdminOrModerator();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const leagues = await prisma.leagueTable.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      seasons: {
        orderBy: { startAt: "desc" },
        include: { memberships: true },
      },
    },
  });

  const items = leagues.map((l) => {
    const activeSeason = l.seasons.find((s) => s.isActive);
    return {
      id: l.id,
      name: l.name,
      isActive: l.isActive,
      seasonsCount: l.seasons.length,
      activeSeasonLabel: activeSeason?.label ?? null,
      playerCount: activeSeason ? activeSeason.memberships.length : 0,
      createdAt: l.createdAt,
    };
  });

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const me = await requireAdminOrModerator();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || "").trim();
  const isActive = Boolean(body?.isActive ?? true);

  const seasonYear = Number(body?.seasonYear || 0);
  const seasonIndex = Number(body?.seasonIndex || 0);
  const startAt = body?.startAt ? new Date(body.startAt) : null;
  const endAt = body?.endAt ? new Date(body.endAt) : null;
  const playerIds: string[] = Array.isArray(body?.playerIds) ? body.playerIds.slice(0, 20) : [];

  if (!name) return NextResponse.json({ error: "Lig adı gerekli" }, { status: 400 });

  // Sezon oluşturulacaksa zorunluluklar
  if ((seasonYear || seasonIndex || startAt || endAt) && !(seasonYear && seasonIndex && startAt && endAt)) {
    return NextResponse.json({ error: "Sezon için yıl, sıra, başlangıç ve bitiş zorunlu" }, { status: 400 });
  }

  // Oyuncu limit ve tekrar kontrolü
  if (playerIds.length > 20) {
    return NextResponse.json({ error: "En fazla 20 oyuncu seçilebilir" }, { status: 400 });
  }
  const uniq = new Set(playerIds);
  if (uniq.size !== playerIds.length) {
    return NextResponse.json({ error: "Aynı oyuncu birden fazla seçilemez" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const league = await tx.leagueTable.create({
      data: { name, isActive },
    });

    let createdSeason: { id: string; label: string } | null = null;

    if (seasonYear && seasonIndex && startAt && endAt) {
      const label = `${seasonYear}-${seasonIndex}`;

      // Aynı sezonda (label bazlı) aynı oyuncular başka ligde mi?
      if (playerIds.length) {
        const seasonsSameLabel = await tx.season.findMany({
          where: { label },
          select: {
            id: true,
            label: true,
            memberships: { select: { playerId: true } },
            league: { select: { name: true } },
          },
        });

        if (seasonsSameLabel.length) {
          const used = new Set<string>();
          for (const s of seasonsSameLabel) {
            for (const m of s.memberships) used.add(m.playerId);
          }
          const conflicts = playerIds.filter((pid) => used.has(pid));
          if (conflicts.length) {
            // İsimleri çıkar
            const players = await tx.player.findMany({
              where: { id: { in: conflicts } },
              select: { displayName: true },
            });
            return NextResponse.json(
              { error: "Seçilmiş bazı oyuncular aynı sezonda başka ligde: " + players.map(p => p.displayName).join(", ") },
              { status: 400 }
            ) as any;
          }
        }
      }

      const season = await tx.season.create({
        data: {
          leagueId: league.id,
          label,
          year: seasonYear,
          index: seasonIndex,
          startAt,
          endAt,
          isActive: true,
        },
      });
      createdSeason = { id: season.id, label };

      if (playerIds.length) {
        await tx.seasonMembership.createMany({
          data: playerIds.map((pid) => ({ seasonId: season.id, playerId: pid })),
          skipDuplicates: true,
        });
      }
    }

    await tx.auditLog.create({
      data: {
        entity: "LEAGUE",
        entityId: league.id,
        userId: me.id,
        action: "CREATE",
        detail: { name, isActive, createdSeason, playerCount: playerIds.length },
      },
    });

    return { league, createdSeason };
  });

  if ("json" in result) {
    // Transaction içinde early return olmuşsa (conflict) burada error döner
    return result as any;
  }

  return NextResponse.json({ ok: true, id: result.league.id, season: result.createdSeason ?? null });
}
