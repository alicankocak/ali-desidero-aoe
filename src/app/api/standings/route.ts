import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Puanlama: maç galibi 3 puan, beraberlik 1-1, mağlup 0
// homeWins/awayWins üzerinden hesaplıyoruz.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");   // yeni yol (önerilen)
  const seasonLabel = searchParams.get("season");  // eski uyumluluk
  const leagueEnum = searchParams.get("league");   // eski uyumluluk

  let season = null;

  if (seasonId) {
    season = await prisma.season.findUnique({
      where: { id: seasonId },
      include: {
        memberships: { include: { player: true } },
        matches: {
          include: {
            home: { select: { id: true, displayName: true } },
            away: { select: { id: true, displayName: true } },
          },
        },
      },
    });
  } else if (seasonLabel) {
    // Eski yol: label + (opsiyonel) league
    season = await prisma.season.findFirst({
      where: { label: seasonLabel, ...(leagueEnum ? {} : {}) },
      include: {
        memberships: { include: { player: true } },
        matches: {
          include: {
            home: { select: { id: true, displayName: true } },
            away: { select: { id: true, displayName: true } },
          },
        },
      },
    });
  }

  if (!season) {
    return NextResponse.json({ items: [], total: 0 });
  }

  // Başlangıç stats
  const stats = new Map<string, {
    id: string;
    name: string;
    w: number; d: number; l: number;
    gw: number; gl: number; // game wins/losses
    pts: number;
  }>();

  for (const m of season.memberships) {
    stats.set(m.playerId, {
      id: m.playerId,
      name: m.player.displayName,
      w: 0, d: 0, l: 0,
      gw: 0, gl: 0,
      pts: 0,
    });
  }

  for (const match of season.matches) {
    const h = stats.get(match.homeId);
    const a = stats.get(match.awayId);
    if (!h || !a) continue;

    const hw = match.homeWins ?? 0;
    const aw = match.awayWins ?? 0;

    h.gw += hw; h.gl += aw;
    a.gw += aw; a.gl += hw;

    if (hw > aw) { h.w += 1; h.pts += 3; a.l += 1; }
    else if (aw > hw) { a.w += 1; a.pts += 3; h.l += 1; }
    else { h.d += 1; a.d += 1; h.pts += 1; a.pts += 1; }
  }

  const items = Array.from(stats.values()).sort((x, y) => {
    if (y.pts !== x.pts) return y.pts - x.pts;
    const gdX = x.gw - x.gl, gdY = y.gw - y.gl;
    if (gdY !== gdX) return gdY - gdX;
    return y.gw - x.gw;
  });

  return NextResponse.json({ items, total: items.length });
}
