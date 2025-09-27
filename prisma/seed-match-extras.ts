import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const CIVS = [
  "Aztecs","Britons","Byzantines","Celts","Chinese","Franks","Goths","Huns",
  "Japanese","Mongols","Persians","Saracens","Teutons","Turks","Vikings",
  "Berbers","Bohemians","Bulgarians","Burgundians","Cumans","Dravidians",
  "Ethiopians","Georgians","Hindustanis","Incas","Italians","Khmer",
  "Koreans","Lithuanians","Magyars","Malay","Malians","Mayans","Poles",
  "Portuguese","Slavs","Spanish","Tatars","Vietnamese"
];

function pick<T>(arr: T[]) { return arr[Math.floor(Math.random()*arr.length)]; }

async function main(){
  const matches = await prisma.match.findMany({ take: 60, orderBy: { createdAt: "asc" }});
  for(const m of matches){
    await prisma.match.update({
      where: { id: m.id },
      data: {
        homeCiv: pick(CIVS),
        awayCiv: pick(CIVS),
        durationSec: 15*60 + Math.floor(Math.random()*20*60), // 15-35 dk arası
        vodUrl: Math.random() < 0.3 ? "https://youtu.be/dQw4w9WgXcQ" : null
      }
    });
  }
  console.log("Match extras seeded (civ/duration/vod).");
}

main().then(()=>prisma.$disconnect()).catch(async e=>{console.error(e);await prisma.$disconnect();process.exit(1);});
