import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// İsteğe bağlı: bu endpoint her istekte güncel veri üretsin
export const dynamic = "force-dynamic";

/**
 * Yorumları listele
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const matchId = params.id;
    if (!matchId) {
      return NextResponse.json({ error: "Match id gerekli" }, { status: 400 });
    }

    const items = await prisma.matchComment.findMany({
      where: { matchId },
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
      take: 100,
    });

    return NextResponse.json({
      items: items.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        author: {
          id: c.author?.id ?? null,
          name: c.author?.name ?? "—",
          avatarUrl: c.author?.avatarUrl ?? null,
        },
      })),
    });
  } catch (err) {
    console.error("GET /api/matches/[id]/comments error:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

/**
 * Yeni yorum ekle
 * Body: { content: string }  // 1..200 karakter
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
    }

    const matchId = params.id;
    if (!matchId) {
      return NextResponse.json({ error: "Match id gerekli" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({} as any));
    const raw = body?.content;

    if (typeof raw !== "string") {
      return NextResponse.json({ error: "Geçersiz yorum" }, { status: 400 });
    }

    const content = raw.trim();
    if (!content.length) {
      return NextResponse.json({ error: "Yorum boş olamaz" }, { status: 400 });
    }
    if (content.length > 200) {
      return NextResponse.json(
        { error: "En fazla 200 karakter" },
        { status: 400 }
      );
    }

    // Kullanıcıyı bul
    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true, avatarUrl: true },
    });
    if (!me) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı" },
        { status: 401 }
      );
    }

    // Maç var mı?
    const exists = await prisma.match.findUnique({ where: { id: matchId } });
    if (!exists) {
      return NextResponse.json({ error: "Maç bulunamadı" }, { status: 404 });
    }

    // Yorum oluştur
    const created = await prisma.matchComment.create({
      data: {
        matchId,
        authorId: me.id,
        content,
      },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return NextResponse.json({
      item: {
        id: created.id,
        content: created.content,
        createdAt: created.createdAt,
        author: {
          id: created.author?.id ?? null,
          name: created.author?.name ?? "—",
          avatarUrl: created.author?.avatarUrl ?? null,
        },
      },
    });
  } catch (err) {
    console.error("POST /api/matches/[id]/comments error:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
