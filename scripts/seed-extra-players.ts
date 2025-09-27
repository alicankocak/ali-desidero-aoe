import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const givenNames = [
  "Ali Desidero","Usta","Ahmetemmi","kenancakir","mr.robot","hitokiri","diyojen",
  "ertugrulbey","yargıchan","hbasri","damnant","KRL","yalavuu","vuriza","emre hkc",
  "çarmendır bey","farazi","ba1word","KASVA","fukoti","yuya_aoe","HYZ","dragluin",
  "günercan","massaka","ÜSTAD","30iqplayer","barış","m1s1r","madisyen","pikachu",
  "kalaycı","enescpus","kqqn86","mr.guler","xdiezing","fournonel","pengui","ofzemre",
  "josephksk","rango"
];

function toSlug(s: string) {
  return s
    .toLowerCase()
    .replace(/ğ/g,"g").replace(/ü/g,"u").replace(/ş/g,"s").replace(/ı/g,"i").replace(/ö/g,"o").replace(/ç/g,"c")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
}
function rand(n=99999){ return Math.floor(Math.random()*n); }

async function main(){
  const playerRole = await prisma.role.upsert({
    where: { name: "PLAYER" },
    update: {},
    create: { name: "PLAYER" },
  });

  const passwordHash = await bcrypt.hash("TR2025", 10);

  for (const name of givenNames) {
    const slug = toSlug(name);
    const email = `${slug || "oyuncu"}${rand()}@example.com`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name, passwordHash, isActive: true },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: playerRole.id } },
      update: {},
      create: { userId: user.id, roleId: playerRole.id },
    });
    await prisma.player.upsert({
      where: { userId: user.id },
      update: { displayName: name, activeInLeague: true },
      create: { userId: user.id, displayName: name, activeInLeague: true },
    });
  }


  const count = await prisma.player.count();
  const need = Math.max(0, 50 - count);
  for (let i=1;i<=need;i++){
    const name = `player${Date.now().toString().slice(-6)}_${i}`;
    const email = `${name}@example.com`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name, passwordHash, isActive: true },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: playerRole.id } },
      update: {},
      create: { userId: user.id, roleId: playerRole.id },
    });
    await prisma.player.upsert({
      where: { userId: user.id },
      update: { displayName: name, activeInLeague: true },
      create: { userId: user.id, displayName: name, activeInLeague: true },
    });
  }

  console.log("Seed-extra: oyuncular hazır. Toplam:", await prisma.player.count());
}

main().then(()=>prisma.$disconnect()).catch(async e=>{console.error(e);await prisma.$disconnect();process.exit(1);});
