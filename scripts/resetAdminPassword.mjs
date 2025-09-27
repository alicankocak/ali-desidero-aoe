import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  try {
    const hash = await bcrypt.hash('admin123', 10);
    const user = await prisma.user.update({
      where: { email: 'admin@aoe2lig.local' },
      data: { passwordHash: hash }
    });
    console.log('admin şifresi yenilendi:', user.email);
  } catch (e) {
    console.error('Hata:', e?.message || e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
