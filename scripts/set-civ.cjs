const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const [, , email, civArg] = process.argv;
if (!email) {
  console.error('Kullanım: node scripts/set-civ.cjs <email> <civ>');
  process.exit(1);
}
const civ = civArg || 'Gurjaras';

(async () => {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('User bulunamadı: ' + email);

    const player = await prisma.player.findFirst({ where: { userId: user.id } });
    if (!player) throw new Error('Player bulunamadı: ' + email);

    await prisma.player.update({
      where: { id: player.id },
      data: { favoriteCiv: civ },
    });

    console.log('OK:', email, 'favoriteCiv =', civ);
  } catch (e) {
    console.error(e && e.message ? e.message : e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
