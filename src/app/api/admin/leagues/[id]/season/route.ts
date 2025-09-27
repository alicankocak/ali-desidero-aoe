import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrModerator } from "@/lib/auth-helpers";
export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const me = await requireAdminOrModerator();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const year = Number(body?.year || 0);
  const index = Number(body?.index || 0);
  const startAt = body?.startAt ? new Date(body.startAt) : null;
  const endAt = body?.endAt ? new Date(body.endAt) : null;
  const isActive = !!body?.isActive;
  const playerIds: string[] = Array.isArray(body?.playerIds) ? body.playerIds : [];

  if (!year || !index) return NextResponse.json({ error: "Yıl ve sıra zorunlu" }, { status: 400 });
  if (!startAt || !endAt) return NextResponse.json({ error: "Başlangıç/Bitiş tarihi zorunlu" }, { status: 400 });

  const league = await prisma.leagueTable.findUnique({ where: { id: params.id } });
  if (!league) return NextResponse.json({ error: "Lig bulunamadı" }, { status: 404 });

  const label = `${year}-${index}`;

  const out = await prisma.$transaction(async (tx) => {
    // aktif sezon tek olsun
    if (isActive) {
      await tx.season.updateMany({
        where: { leagueId: league.id, isActive: true },
        data: { isActive: false },
      });
    }

    // varsa güncelle, yoksa oluştur
    let season = await tx.season.findFirst({ where: { leagueId: league.id, label } });
    if (season) {
      season = await tx.season.update({
        where: { id: season.id },
        data: { year, index, startAt, endAt, isActive },
      });
      // üyelikleri temizle ve yeniden yaz
      await tx.seasonMembership.deleteMany({ where: { seasonId: season.id } });
    } else {
      season = await tx.season.create({
        data: { leagueId: league.id, label, year, index, startAt, endAt, isActive },
      });
    }

    // Üyeleri ekle (20 sınırı UI’da kontrol edilir, burada da güvence al)
    const unique = Array.from(new Set(playerIds)).slice(0, 20);
    if (unique.length) {
      await tx.seasonMembership.createMany({
        data: unique.map((pid) => ({ seasonId: season!.id, playerId: pid })),
        skipDuplicates: true,
      });
    }

    await tx.auditLog.create({
      data: {
        entity: "LEAGUE",
        entityId: league.id,
        userId: me.id,
        action: "UPSERT_SEASON",
        detail: { label, year, index, startAt, endAt, isActive, playerCount: unique.length },
      },
    });

    return season;
  });

  return NextResponse.json({ ok: true, item: out });
}
