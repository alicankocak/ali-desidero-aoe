import { PrismaClient, League, NewsCategory, VideoType } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

/* ----------------------- Yardımcılar ----------------------- */

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")      // diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function emailForName(name: string, idx: number) {
  const s = slugify(name).replace(/-+/g, ".");
  return `${s || "oyuncu"}.${idx}@example.com`;
}

/* ----------------------- Çekirdek seed ---------------------- */

async function seedCore() {
  // Rolleri hazırla
  const roles = ["ADMIN", "MODERATOR", "EDITOR", "PLAYER"];
  for (const name of roles) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }

  const adminPass = await bcrypt.hash("TR2025", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@aoe2lig.local" },
    update: {},
    create: {
      email: "admin@aoe2lig.local",
      passwordHash: adminPass,
      name: "Admin",
      isActive: true,
    },
  });

  const adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });
  const playerRole = await prisma.role.findUnique({ where: { name: "PLAYER" } });

  if (adminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
      update: {},
      create: { userId: admin.id, roleId: adminRole.id },
    });
  }
  if (playerRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: playerRole.id } },
      update: {},
      create: { userId: admin.id, roleId: playerRole.id },
    });
  }

  // Verdiğin oyuncu adları
  const givenNamesRaw = [
    "Ali Desidero","Usta","Ahmetemmi","kenancakir","mr.robot","hitokiri","diyojen","ertugrulbey",
    "yargıchan","hbasri","damnant","KRL","yalavuu","vuriza","emre hkc","çarmendır bey","farazi",
    "ba1word","KASVA","fukoti","yuya_aoe","HYZ","dragluin","günercan","massaka","ÜSTAD",
    "30iqplayer","barış","m1s1r","madisyen","pikachu","kalaycı","enescpus","kqqn86","mr.guler",
    "xdiezing","fournonel","pengui","ofzemre","josephksk","rango"
  ];

  // 50’ye tamamla
  const target = 50;
  const names: string[] = [...givenNamesRaw];
  for (let i = names.length + 1; i <= target; i++) {
    names.push(`Oyuncu ${i}`);
  }

  // Oyuncuları oluştur
  const passHash = await bcrypt.hash("TR2025", 10);
  const players: { userId: string; playerId: string }[] = [];

  for (let i = 0; i < target; i++) {
    const displayName = names[i];
    const email = emailForName(displayName, i + 1);

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash: passHash,
        name: displayName,
        isActive: true,
      },
    });

    if (playerRole) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: playerRole.id } },
        update: {},
        create: { userId: user.id, roleId: playerRole.id },
      });
    }

    const currentLeague: League | null = i < 20 ? "LIG1" : i < 40 ? "LIG2" : null;

    const player = await prisma.player.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        displayName,
        currentLeague: currentLeague || undefined,
        activeInLeague: true,
      },
    });

    players.push({ userId: user.id, playerId: player.id });
  }

  return { admin, players };
}

/* ----------------------- Haberler --------------------------- */

async function seedNews() {
  const newsCount = await prisma.news.count();
  if (newsCount > 0) {
    console.log("Seed: News zaten var, atlandı.");
    return;
  }

  const items = [
    {
      title: "Lig 1 başlıyor: fikstür ve yayın planı",
      slug: "lig1-basliyor-fikstur-yayin",
      excerpt: "Lig 1 ilk hafta maçları ve yayın planı açıklandı.",
      content: "Detaylı fikstür, yayın linkleri ve maç saatleri burada...",
      category: NewsCategory.MATCH,
      year: 2025,
      tags: ["Lig 1", "Duyuru"],
    },
    {
      title: "Lig 2’de yeni kurallar",
      slug: "lig2-yeni-kurallar",
      excerpt: "Harita havuzu ve kural setinde güncelleme yapıldı.",
      content: "Afrika haritası zorunlu, eşleşme formatı 2 karşılaşma...",
      category: NewsCategory.ANNOUNCEMENT,
      year: 2025,
      tags: ["Lig 2", "Kural"],
    },
    {
      title: "Oyuncu X ile röportaj",
      slug: "oyuncu-x-roportaj",
      excerpt: "Favori ırklar, build order önerileri ve hedefler...",
      content: "Röportajın tam metni ve zaman damgaları burada...",
      category: NewsCategory.INTERVIEW,
      year: 2025,
      tags: ["Röportaj"],
    },
    {
      title: "M@A → FC Archer geçişi",
      slug: "maa-fc-archer",
      excerpt: "Meta’da popüler olan bu stratejiye kısa bir rehber.",
      content: "Ayrıntılı build order adımları ve karşı stratejiler...",
      category: NewsCategory.STRATEGY,
      year: 2024,
      tags: ["Build Order", "Strateji"],
    },
    {
      title: "Topluluktan kısa notlar",
      slug: "topluluktan-kisa-notlar",
      excerpt: "Haftanın öne çıkan klipleri ve duyuruları.",
      content: "Klip bağlantıları ve içerik özetleri burada...",
      category: NewsCategory.GENERAL,
      year: 2024,
      tags: ["Topluluk"],
    },
    {
      title: "Efsane maç arşivine 5 yeni ekleme",
      slug: "efsane-mac-arsivi-5-ek",
      excerpt: "Topluluğun seçtiği 5 efsane maç arşive eklendi.",
      content: "YouTube linkleri ve kısa özetler...",
      category: NewsCategory.GENERAL,
      year: 2023,
      tags: ["Efsane Maçlar"],
    },
  ];

  for (const n of items) {
    await prisma.news.create({ data: n });
  }
  console.log("Seed: News eklendi.");
}

/* --------------- Lig/Sezon + Üyelik + Örnek maç --------------- */

async function seedLeagueSeasonAndSampleMatch() {
  // Lig tabloları
  const lig1 = await prisma.leagueTable.upsert({
    where: { name: "Lig 1" },
    update: {},
    create: { name: "Lig 1", isActive: true },
  });
  const lig2 = await prisma.leagueTable.upsert({
    where: { name: "Lig 2" },
    update: {},
    create: { name: "Lig 2", isActive: true },
  });

  // Aktif sezonlar (2025-1)
  const s1 = await prisma.season.upsert({
    where: { leagueId_label: { leagueId: lig1.id, label: "2025-1" } },
    update: {},
    create: {
      leagueId: lig1.id,
      label: "2025-1",
      year: 2025,
      index: 1,
      startAt: new Date("2025-01-01"),
      endAt: new Date("2025-06-30"),
      isActive: true,
    },
  });

  const s2 = await prisma.season.upsert({
    where: { leagueId_label: { leagueId: lig2.id, label: "2025-1" } },
    update: {},
    create: {
      leagueId: lig2.id,
      label: "2025-1",
      year: 2025,
      index: 1,
      startAt: new Date("2025-01-01"),
      endAt: new Date("2025-06-30"),
      isActive: true,
    },
  });

  // İlk 20 oyuncu Lig1 sezonuna, sonraki 20 Lig2 sezonuna
  const pAll = await prisma.player.findMany({ orderBy: { createdAt: "asc" } });
  const p1 = pAll.slice(0, 20);
  const p2 = pAll.slice(20, 40);

  for (const pl of p1) {
    await prisma.seasonMembership.upsert({
      where: { seasonId_playerId: { seasonId: s1.id, playerId: pl.id } },
      update: {},
      create: { seasonId: s1.id, playerId: pl.id },
    });
  }
  for (const pl of p2) {
    await prisma.seasonMembership.upsert({
      where: { seasonId_playerId: { seasonId: s2.id, playerId: pl.id } },
      update: {},
      create: { seasonId: s2.id, playerId: pl.id },
    });
  }

  // Örnek bir maç + yorum (Lig 1 / 2025-1)
  if (p1.length >= 2) {
    const [home, away] = [p1[0], p1[1]];

    const exists = await prisma.match.findFirst({
      where: { league: "LIG1", season: "2025-1", homeId: home.id, awayId: away.id },
    });
    if (!exists) {
      const m = await prisma.match.create({
        data: {
          league: "LIG1",
          season: "2025-1",
          round: 1,
          playedAt: new Date(),
          homeId: home.id,
          awayId: away.id,
          homeWins: 2,
          awayWins: 0,
          homeCiv: "Franks",
          awayCiv: "Aztecs",
          durationSec: 1543,
          vodUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          seasonRelId: s1.id,
          map: "Arabia",
        },
      });

      const admin = await prisma.user.findUnique({
        where: { email: "admin@aoe2lig.local" },
      });

      if (admin) {
        await prisma.matchComment.create({
          data: {
            matchId: m.id,
            authorId: admin.id,
            text: "Açılış güçlüydü, map kontrolü iyi okundu. GG!",
          },
        });
      }
      console.log("Seed: 1 örnek maç ve 1 yorum eklendi.");
    }
  }
}

/* ----------------------------- main ----------------------------- */

async function main() {
  const { admin } = await seedCore();
  await seedNews();
  await seedLeagueSeasonAndSampleMatch();
  console.log("Seed tamamlandı.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seed hata:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
