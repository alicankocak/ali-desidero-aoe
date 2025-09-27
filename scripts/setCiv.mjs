// scripts/setCiv.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const [,, email, civ] = process.argv;

if (!email) {
  console.error("Kullanım: node scripts/setCiv.js <email> <civ>");
  process.exit(1);
}

async function main() {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("User bulunamadı: " + email);

  const player = await prisma.player.findFirst({ where: { userId: user.id } });
  if (!player) throw new Error("Player bulunamadı: " + email);

  await prisma.player.update({
    where: { id: player.id },
    data: { favoriteCiv: civ || "Gurjaras" },
  });

  console.log("OK:", email, "favoriteCiv=", civ);
}

main().finally(() => prisma.$disconnect());
