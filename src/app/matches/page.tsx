// src/app/matches/page.tsx
import { prisma } from "@/lib/prisma";
import { Suspense } from "react";
import MatchesClient from "./MatchesClient";

export const dynamic = "force-dynamic";

async function getInitial() {
  const leagues = await prisma.leagueTable.findMany({
    orderBy: { name: "asc" },
    include: {
      seasons: { orderBy: [{ year: "desc" }, { index: "desc" }] },
    },
  });

  const firstWithActive =
    leagues.find((l) => l.seasons.some((s) => s.isActive)) || leagues[0];

  const selLeagueId = firstWithActive?.id ?? null;
  const selSeason =
    firstWithActive?.seasons.find((s) => s.isActive) ||
    firstWithActive?.seasons[0] ||
    null;

  let matches:
    | Array<{
        id: string;
        round: number | null;
        playedAt: Date | null;
        home: { id: string; displayName: string };
        away: { id: string; displayName: string };
        homeWins: number;
        awayWins: number;
        map: string | null;
      }>
    | [] = [];

  if (selSeason) {
    const rows = await prisma.match.findMany({
      where: { seasonRelId: selSeason.id },
      orderBy: [{ round: "asc" }, { playedAt: "asc" }, { createdAt: "asc" }],
      include: {
        home: { select: { id: true, displayName: true } },
        away: { select: { id: true, displayName: true } },
      },
      take: 1000,
    });
    matches = rows.map((m) => ({
      id: m.id,
      round: m.round ?? null,
      playedAt: m.playedAt,
      home: m.home,
      away: m.away,
      homeWins: m.homeWins,
      awayWins: m.awayWins,
      map: (m as any).map ?? null,
    }));
  }

  return {
    leagues: leagues.map((l) => ({
      id: l.id,
      name: l.name,
      seasons: l.seasons.map((s) => ({
        id: s.id,
        label: s.label,
        isActive: s.isActive,
      })),
    })),
    selected: {
      leagueId: selLeagueId,
      seasonId: selSeason?.id ?? null,
      seasonLabel: selSeason?.label ?? null,
    },
    matches,
  };
}

export default async function MatchesPage() {
  const initial = await getInitial();

  return (
    <div className="w-full">
      {/* Gradient başlık */}
      <div className="mx-4 mt-4 rounded-2xl bg-gradient-to-r from-fuchsia-500 via-indigo-500 to-cyan-400 px-6 py-6 text-white shadow-sm">
        <h1 className="text-3xl font-bold leading-tight">Matches</h1>
      </div>

      <Suspense>
        <MatchesClient initial={initial} />
      </Suspense>
    </div>
  );
}
