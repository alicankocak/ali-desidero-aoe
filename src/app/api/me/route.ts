import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions as any);
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: { include: { role: true } },
        player: true,
      },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const roleNames = user.roles.map(r => r.role.name);
    const displayName = user.player?.displayName ?? user.name ?? email;
    const favoriteCiv = user.player?.favoriteCiv ?? null;

    return NextResponse.json({
      id: user.id,
      displayName,
      avatarUrl: user.avatarUrl ?? null,
      roles: roleNames,            // ["ADMIN","PLAYER",...]
      favoriteCiv,                 // ör: "Gurjaras"
      playerId: user.player?.id ?? null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
