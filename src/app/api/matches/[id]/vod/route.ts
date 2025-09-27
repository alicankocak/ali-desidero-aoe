import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const m = await prisma.match.findUnique({ where: { id: params.id }});
  if(!m) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  // Şimdilik Match tablosunda alan yoksa boş dön.
  // İstersen schema.prisma'ya `vodUrl String?` ekleyip db push yap.
  return NextResponse.json({ url: (m as any).vodUrl || null });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const url = String(body?.url || "").trim();
  if(!url) return NextResponse.json({ error: "URL zorunlu" }, { status: 400 });

  // Şimdilik `vodUrl` alanını varsaydık:
  const m = await prisma.match.update({ where: { id: params.id }, data: { /* vodUrl: url */ } as any });
  return NextResponse.json({ ok: true, /* url */ });
}
