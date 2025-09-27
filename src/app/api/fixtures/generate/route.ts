import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Circle Method ile tek sezonluk (ör. 2025-1) fikstür üretir
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const league = (body.league as "LIG1" | "LIG2") || "LIG1";
  const season = (body.season as string) || "2025-1";

  const players = await prisma.player.findMany({
    where: { currentLeague: league },
    orderBy: { displayName: "asc" },
    select: { id: true },
  });

  const ids = players.map(p => p.id);
  if (ids.length < 2) {
    return NextResponse.json({ ok:false, error:"Fikstür için yeterli oyuncu yok" }, { status:400 });
  }

  if (ids.length % 2 === 1) ids.push("BYE");
  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;
  const fixed = ids[0];
  let rot = ids.slice(1);

  type Pair = { home: string; away: string };
  const firstLeg: Pair[][] = [];

  for (let r = 0; r < rounds; r++) {
    const pairs: Pair[] = [];
    const left = [fixed, ...rot.slice(0, half - 1)];
    const right = rot.slice(half - 1).reverse();

    for (let i = 0; i < half; i++) {
      const A = left[i], B = right[i];
      if (!A || !B || A === "BYE" || B === "BYE") continue;
      if (r % 2 === 0) pairs.push({ home: A, away: B });
      else pairs.push({ home: B, away: A });
    }
    firstLeg.push(pairs);
    rot = [rot[rot.length - 1], ...rot.slice(0, rot.length - 1)];
  }

  let created = 0, skipped = 0;
  for (let r = 0; r < firstLeg.length; r++) {
    for (const m of firstLeg[r]) {
      try {
        await prisma.match.create({
          data: { league, season, round: r+1, homeId: m.home, awayId: m.away, homeWins: 0, awayWins: 0 }
        });
        created++;
      } catch {
        skipped++;
      }
    }
  }

  return NextResponse.json({ ok:true, league, season, rounds:firstLeg.length, created, skipped });
}
