import { PrismaClient, League } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // İki oyuncu çek (örnek)
  const players = await prisma.player.findMany({
    take: 2,
    orderBy: { createdAt: "asc" },
  });
  if (players.length < 2) {
    console.log("Seed-matches: yeterli oyuncu yok, çıkılıyor.");
    return;
  }
  const [p1, p2] = players;

  // Örnek maçlar (round ZORUNLU)
  const toMake = [
    {
      league: "LIG1" as League,
      season: "2025-1",
      round: 1,
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
      // DİKKAT: Şemadaki composite unique bu!
      where: {
        season_league_homeId_awayId_round: {
          season: m.season,
          league: m.league,
          homeId: m.homeId,
          awayId: m.awayId,
          round: m.round!, // round gerekli
        },
      },
      update: {},
      create: m,
    });
  }

  console.log("Seed-matches: örnek maç(lar) eklendi.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
