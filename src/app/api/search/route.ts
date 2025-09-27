import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request){
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q")||"").trim();
  if(!q) return NextResponse.json({ players:[], news:[], matches:[] });

  const [players, news, matches] = await Promise.all([
    prisma.player.findMany({
      where:{ displayName:{ contains:q, mode:"insensitive" } },
      take:5,
      select:{ id:true, displayName:true, currentLeague:true }
    }),
    prisma.news.findMany({
      where:{ OR:[
        { title:{ contains:q, mode:"insensitive" }},
        { tags: { has: q }}
      ]},
      orderBy:{ createdAt:"desc" },
      take:6,
      select:{ id:true, title:true, slug:true, category:true, year:true, createdAt:true }
    }),
    prisma.match.findMany({
      where:{
        OR:[
          { home: { displayName:{ contains:q, mode:"insensitive" } } },
          { away: { displayName:{ contains:q, mode:"insensitive" } } },
          { season: { contains:q } }
        ]
      },
      orderBy:{ createdAt:"desc" },
      take:6,
      select:{ id:true, league:true, season:true, homeWins:true, awayWins:true,
        home:{ select:{ id:true, displayName:true }},
        away:{ select:{ id:true, displayName:true }},
      }
    })
  ]);

  const matchesMap = matches.map(m=>({
    id:m.id, league:m.league, season:m.season,
    score:`${m.homeWins}-${m.awayWins}`,
    home:{ id:m.home.id, name:m.home.displayName },
    away:{ id:m.away.id, name:m.away.displayName },
  }));

  return NextResponse.json({ players, news, matches: matchesMap });
}
