import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrModerator } from "@/lib/auth-helpers";

/**
 * DELETE /api/admin/leagues/:id
 * - LeagueTable
 * - Seasons
 * - SeasonMembership
 * - Matches (Match.seasonRelId)
 * - (Varsa) Fixture
 * - AuditLog kaydı
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const me = await requireAdminOrModerator();
    if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const leagueId = params.id;
    const league = await prisma.leagueTable.findUnique({ where: { id: leagueId } });
    if (!league) return NextResponse.json({ error: "league_not_found" }, { status: 404 });

    const seasons = await prisma.season.findMany({
      where: { leagueId },
      select: { id: true },
    });
    const seasonIds = seasons.map((s) => s.id);

    await prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          entity: "LEAGUE",
          entityId: leagueId,
          action: "DELETE_LEAGUE",
          detail: { seasonCount: seasonIds.length },
        },
      });

      if (seasonIds.length) {
        await tx.match.deleteMany({ where: { seasonRelId: { in: seasonIds } } });
        await tx.seasonMembership.deleteMany({ where: { seasonId: { in: seasonIds } } });
        try {
          // @ts-ignore: Fixture modeli varsa silinir, yoksa try/catch yutar
          await tx.fixture.deleteMany({ where: { seasonId: { in: seasonIds } } });
        } catch {}
        await tx.season.deleteMany({ where: { id: { in: seasonIds } } });
      }

      await tx.leagueTable.delete({ where: { id: leagueId } });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/leagues/[id] error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
