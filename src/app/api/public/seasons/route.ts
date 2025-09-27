import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const leagueId = searchParams.get("leagueId") || "";
  if (!leagueId) return NextResponse.json({ items: [] });

  const items = await prisma.season.findMany({
    where: { leagueId },
    orderBy: [{ isActive: "desc" }, { startAt: "desc" }],
    select: { id: true, label: true, isActive: true },
  });

  return NextResponse.json({ items });
}
