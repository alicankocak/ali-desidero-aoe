import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request){
  const { searchParams } = new URL(req.url);
  const page = Math.max(Number(searchParams.get("page")||1),1);
  const take = Math.min(Number(searchParams.get("take")||12),48);
  const q = (searchParams.get("q")||"").trim();
  const category = searchParams.get("category")||undefined;
  const year = searchParams.get("year") ? Number(searchParams.get("year")) : undefined;

  const where:any = {};
  if(q) where.OR = [
    { title: { contains: q, mode: "insensitive" } },
    { excerpt: { contains: q, mode: "insensitive" } },
    { content: { contains: q, mode: "insensitive" } },
    { tags: { has: q } },
  ];
  if(category) where.category = category;
  if(year) where.year = year;

  const [total, items] = await Promise.all([
    prisma.news.count({ where }),
    prisma.news.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page-1)*take, take,
      select: { id:true, title:true, slug:true, excerpt:true, category:true, year:true, tags:true, createdAt:true }
    })
  ]);

  return NextResponse.json({ total, items, page, take });
}
