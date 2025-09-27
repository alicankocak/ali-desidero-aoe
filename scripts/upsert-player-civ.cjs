const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Kullanım:
 *   node scripts/upsert-player-civ.cjs <email> [displayName] [favoriteCiv]
 *
 * Örnek:
 *   node scripts/upsert-player-civ.cjs admin@aoe2lig.local Admin Gurjaras
 */
(async () => {
  const [, , email, displayNameArg, civArg] = process.argv;
  if (!email) {
    console.error('Kullanım: node scripts/upsert-player-civ.cjs <email> [displayName] [favoriteCiv]');
    process.exit(1);
  }
  const favoriteCiv = civArg || 'Gurjaras';

  try {
    // 1) User bul
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('User bulunamadı: ' + email);

    // 2) PLAYER rolü varsa yoksa ekle
    const playerRole = await prisma.role.upsert({
      where: { name: 'PLAYER' },
      update: {},
      create: { name: 'PLAYER' },
    });

    const hasPlayerRole = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId: user.id, roleId: playerRole.id } },
    });
    if (!hasPlayerRole) {
      await prisma.userRole.create({
        data: { userId: user.id, roleId: playerRole.id },
      });
    }

    // 3) Player varsa al, yoksa oluştur
    let player = await prisma.player.findFirst({ where: { userId: user.id } });
    if (!player) {
      const displayName =
        displayNameArg ||
        user.name ||
        (email.includes('@') ? email.split('@')[0] : email);

      player = await prisma.player.create({
        data: {
          userId: user.id,
          displayName,
          activeInLeague: true,
          // currentLeague istersen burada set edebilirsin: 'LIG1' / 'LIG2'
        },
      });
      console.log('Yeni Player oluşturuldu:', player.displayName);
    }

    // 4) favoriteCiv güncelle
    await prisma.player.update({
      where: { id: player.id },
      data: { favoriteCiv },
    });

    console.log('OK:', email, 'favoriteCiv =', favoriteCiv);
  } catch (e) {
    console.error(e && e.message ? e.message : e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
