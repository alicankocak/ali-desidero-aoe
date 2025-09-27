import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrModerator } from "@/lib/auth-helpers";

// edge'te Prisma sıkıntı olmasın
export const runtime = "nodejs";

export async function GET() {
  const me = await requireAdminOrModerator();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const fixtures = await prisma.fixture.findMany({
    orderBy: { createdAt: "desc" },
    include: { season: { include: { league: true } } },
  });

  return NextResponse.json({
    items: fixtures.map((f) => ({
      id: f.id,
      name: f.name,
      map: f.map,
      isActive: f.isActive,
      seasonId: f.seasonId,
      seasonLabel: f.season.label,
      leagueName: f.season.league.name,
      createdAt: f.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  const me = await requireAdminOrModerator();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || "").trim();
  const map = String(body?.map || "").trim();
  const seasonId = String(body?.seasonId || "");
  const matches: Array<{ homeId: string; awayId: string; playedAt?: string | null }> =
    Array.isArray(body?.matches) ? body.matches : [];

  if (!name) return NextResponse.json({ error: "Fikstür adı gerekli" }, { status: 400 });
  if (!map) return NextResponse.json({ error: "Harita gerekli" }, { status: 400 });
  if (!seasonId) return NextResponse.json({ error: "Sezon gerekli" }, { status: 400 });
  if (!matches.length) return NextResponse.json({ error: "Maç listesi boş" }, { status: 400 });

  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    include: { memberships: true, league: true },
  });
  if (!season) return NextResponse.json({ error: "Sezon bulunamadı" }, { status: 404 });
  if (!season.isActive) return NextResponse.json({ error: "Sadece aktif sezon için fikstür oluşturulabilir" }, { status: 400 });

  // Sezondaki oyuncular dışında kimse fikstüre giremesin
  const seasonPlayerIds = new Set(season.memberships.map((m) => m.playerId));

  // Match.league enum'u zorunlu: basit bir eşleme (istersen geliştir)
  const leagueEnum = "LIG1" as const; // TODO: league tablosu adından/ayarından türet

  const created = await prisma.$transaction(async (tx) => {
    const fixture = await tx.fixture.create({
      data: { name, map, seasonId, isActive: true },
    });

    for (const m of matches) {
      if (!seasonPlayerIds.has(m.homeId) || !seasonPlayerIds.has(m.awayId)) {
        throw new Error("Fikstürde sezon dışı oyuncu var.");
      }
      await tx.match.create({
        data: {
          league: leagueEnum,
          season: season.label,
          seasonRelId: season.id,
          round: null,
          playedAt: m.playedAt ? new Date(m.playedAt) : null,
          homeId: m.homeId,
          awayId: m.awayId,
          homeWins: 0,
          awayWins: 0,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        entity: "FIXTURE",
        entityId: fixture.id,
        userId: me.id,
        action: "CREATE",
        detail: { name, map, seasonId, matchCount: matches.length },
      },
    });

    return fixture;
  });

  return NextResponse.json({ ok: true, id: created.id });
}
