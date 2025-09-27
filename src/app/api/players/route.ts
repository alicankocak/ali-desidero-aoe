import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const take = Math.min(Number(searchParams.get("take") || 50), 100);
  const skip = Math.max(Number(searchParams.get("skip") || 0), 0);
  const league = searchParams.get("league"); // "LIG1" | "LIG2"
  const activeParam = searchParams.get("active"); // "true" | "false"

  const where: any = {};

  if (q) {
    where.OR = [
      { displayName: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  if (league === "LIG1" || league === "LIG2") {
    where.currentLeague = league;
  }

  if (activeParam === "true") where.activeInLeague = true;
  else if (activeParam === "false") where.activeInLeague = false;

  const [items, total] = await Promise.all([
    prisma.player.findMany({
      where,
      include: { user: true },
      orderBy: [{ currentLeague: "asc" }, { displayName: "asc" }],
      take,
      skip,
    }),
    prisma.player.count({ where }),
  ]);

  const data = items.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    league: p.currentLeague,
    active: p.activeInLeague,
    userName: p.user?.name,
    email: p.user?.email,
    favoriteCiv: p.favoriteCiv,
  }));

  return NextResponse.json({ total, items: data });
}
