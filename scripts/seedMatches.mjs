import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const SEASON = '2025-1';
const LEAGUE = 'LIG1';

async function run() {
  try {
    const players = await prisma.player.findMany({
      where: { currentLeague: LEAGUE },
      orderBy: { displayName: 'asc' },
      take: 6
    });
    if (players.length < 4) {
      console.log('LIG1 içinde yeterli oyuncu yok. Seed oyuncuları kontrol et.');
      return;
    }
    const matches = [
      { home: players[0], away: players[1], homeWins: 2, awayWins: 0 },
      { home: players[2], away: players[3], homeWins: 1, awayWins: 1 },
      { home: players[4], away: players[5], homeWins: 0, awayWins: 2 },
      { home: players[0], away: players[2], homeWins: 1, awayWins: 1 },
      { home: players[1], away: players[3], homeWins: 2, awayWins: 0 },
    ];
    for (const m of matches) {
      await prisma.match.create({
        data: {
          league: LEAGUE,
          season: SEASON,
          playedAt: new Date(),
          homeId: m.home.id,
          awayId: m.away.id,
          homeWins: m.homeWins,
          awayWins: m.awayWins,
        },
      });
    }
    console.log('Örnek maçlar eklendi ✔');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
