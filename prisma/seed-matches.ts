import { PrismaClient, League } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const players = await prisma.player.findMany({ take: 2, orderBy: { createdAt: "asc" } });
  if (players.length < 2) { console.log("Seed-matches: yeterli oyuncu yok, çıkılıyor."); return; }
  const [p1, p2] = players;

  const toMake = [
    {
      league: "LIG1" as League,
      season: "2025-1",
      round: 1, // ZORUNLU
      homeId: p1.id,
      awayId: p2.id,
      playedAt: new Date(),
      homeWins: 2,
      awayWins: 0,
      homeCiv: "Franks",
      awayCiv: "Aztecs",
      durationSec: 1543,
      vodUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      map: "Arabia",
    },
  ];

  for (const m of toMake) {
    await prisma.match.upsert({
      where: {
        // Şemanın composite unique ismi BU:
        // @@unique([season, league, homeId, awayId, round])
        season_league_homeId_awayId_round: {
          season: m.season,
          league: m.league,
          homeId: m.homeId,
          awayId: m.awayId,
          round: m.round!,
        },
      },
      update: {},
      create: m,
    });
  }

  console.log("Seed-matches: örnek maç(lar) eklendi.");
}

main().catch((e) => { console.error(e); process.exit(1); })
       .finally(async () => { await prisma.$disconnect(); });
