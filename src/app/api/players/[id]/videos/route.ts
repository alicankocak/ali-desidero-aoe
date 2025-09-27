import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function detectType(url: string): "YOUTUBE" | "TWITCH" {
  try {
    const u = new URL(url);
    const host = u.hostname.replace("www.", "");
    if (host.includes("youtube") || host === "youtu.be") return "YOUTUBE";
    if (host.includes("twitch.tv")) return "TWITCH";
    return "YOUTUBE";
  } catch {
    return "YOUTUBE";
  }
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const items = await prisma.videoLink.findMany({
    where: { playerId: params.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => ({}));
  const url = String(body?.url || "").trim();
  const title = (body?.title as string | undefined) ?? null;
  if (!url) return NextResponse.json({ error: "URL zorunlu." }, { status: 400 });

  const item = await prisma.videoLink.create({
    data: {
      playerId: params.id,
      url,
      title,
      type: detectType(url),
    },
  });
  return NextResponse.json({ item });
}
