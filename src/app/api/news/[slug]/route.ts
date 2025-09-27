import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const item = await prisma.news.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      slug: true,
      title: true,
      content: true,
      createdAt: true,
    },
  });

  if (!item) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return NextResponse.json(item);
}
