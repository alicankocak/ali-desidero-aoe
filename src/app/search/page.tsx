"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SearchPage(){
  const [q,setQ]=useState("");
  const [res,setRes]=useState<any>({ players:[], news:[], matches:[] });

  async function go(){
    const r=await fetch("/api/search?q="+encodeURIComponent(q),{cache:"no-store"});
    const d=await r.json(); setRes(d);
  }

  useEffect(()=>{ const sp=new URLSearchParams(location.search); const qs=sp.get("q"); if(qs){ setQ(qs); setTimeout(go,10);} },[]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input placeholder="Oyuncu, haber, maç..." value={q} onChange={e=>setQ(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&go()} />
        <Button onClick={go}>Ara</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardContent className="p-4">
          <div className="mb-2 font-semibold">Oyuncular</div>
          <div className="flex flex-col gap-2">
            {res.players.map((p:any)=>(
              <a key={p.id} href={`/players/${p.id}`} className="rounded-xl border p-2 hover:bg-muted/40">
                {p.displayName} {p.currentLeague && <Badge className="ml-2" variant="secondary">{p.currentLeague}</Badge>}
              </a>
            ))}
            {(!res.players||res.players.length===0)&&<div className="text-sm text-gray-500">Kayıt yok.</div>}
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <div className="mb-2 font-semibold">Haberler</div>
          <div className="grid gap-2">
            {res.news.map((n:any)=>(
              <a key={n.id} href={`/news/${n.slug}`} className="rounded-xl border p-2 hover:bg-muted/40">
                <div className="text-sm text-gray-500">{new Date(n.createdAt).toLocaleDateString("tr-TR")}</div>
                <div className="font-medium">{n.title}</div>
                <div className="text-xs text-gray-600 flex gap-2">
                  <Badge variant="secondary">{n.category}</Badge>
                  <Badge variant="outline">{n.year}</Badge>
                </div>
              </a>
            ))}
            {(!res.news||res.news.length===0)&&<div className="text-sm text-gray-500">Kayıt yok.</div>}
          </div>
        </CardContent></Card>

        <Card className="lg:col-span-2"><CardContent className="p-4">
          <div className="mb-2 font-semibold">Maçlar</div>
          <div className="grid gap-2">
            {res.matches.map((m:any)=>(
              <a key={m.id} href={`/matches/${m.id}`} className="rounded-xl border p-2 hover:bg-muted/40">
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <Badge variant="secondary">{m.league}</Badge>
                  <Badge variant="outline">{m.season}</Badge>
                </div>
                <div className="font-medium">{m.home.name} vs {m.away.name} • {m.score}</div>
              </a>
            ))}
            {(!res.matches||res.matches.length===0)&&<div className="text-sm text-gray-500">Kayıt yok.</div>}
          </div>
        </CardContent></Card>
      </div>
    </div>
  );
}
