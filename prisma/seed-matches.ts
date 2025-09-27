import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main(){
  const players = await prisma.player.findMany({ orderBy: { createdAt: "asc" }, take: 4 });
  if(players.length < 2) { console.log("Yeterli oyuncu yok."); return; }

  const [p1, p2, p3, p4] = players;
  const season = "2025-1";

  const toMake = [
    { homeId: p1.id, awayId: p2.id, league: "LIG1" as const, season, round: 1, homeWins: 2, awayWins: 0, playedAt: new Date() },
    { homeId: p3.id, awayId: p4.id, league: "LIG1" as const, season, round: 1, homeWins: 1, awayWins: 1, playedAt: new Date() },
  ];

  for(const m of toMake){
    await prisma.match.upsert({
      where: { season_league_homeId_awayId: { season: m.season, league: m.league, homeId: m.homeId, awayId: m.awayId } },
      update: {},
      create: m
    });
  }
  console.log("Seed matches eklendi.");
}

main().then(()=>prisma.$disconnect()).catch(async e=>{console.error(e);await prisma.$disconnect();process.exit(1);});
