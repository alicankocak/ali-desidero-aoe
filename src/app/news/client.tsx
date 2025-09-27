"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

type Item = { id:string; title:string; slug:string; excerpt?:string|null; category:string; year:number; tags:string[]; createdAt:string };

export default function NewsClient(){
  const [q,setQ]=useState("");
  const [category,setCategory]=useState<string>("ALL");
  const [year,setYear]=useState<string>("ALL");
  const [page,setPage]=useState(1);
  const [take]=useState(12);
  const [total,setTotal]=useState(0);
  const [items,setItems]=useState<Item[]>([]);

  async function load(){
    const qs=new URLSearchParams({ page:String(page), take:String(take) });
    if(q.trim()) qs.set("q", q.trim());
    if(category!=="ALL") qs.set("category", category);
    if(year!=="ALL") qs.set("year", year);
    const r=await fetch("/api/news?"+qs.toString(),{cache:"no-store"});
    const d=await r.json();
    setItems(d.items||[]); setTotal(d.total||0);
  }

  useEffect(()=>{ load(); /* eslint-disable-next-line */ },[page,category,year]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input placeholder="Ara..." value={q} onChange={(e)=>setQ(e.target.value)} className="sm:w-[260px]" />
        <Button onClick={()=>{ setPage(1); load(); }}>Ara</Button>

        <div className="flex items-center gap-2 sm:ml-auto">
          <Select value={category} onValueChange={v=>{setCategory(v); setPage(1);}}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Kategori"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tüm Kategoriler</SelectItem>
              <SelectItem value="GENERAL">Genel</SelectItem>
              <SelectItem value="MATCH">Maç</SelectItem>
              <SelectItem value="ANNOUNCEMENT">Duyuru</SelectItem>
              <SelectItem value="INTERVIEW">Röportaj</SelectItem>
              <SelectItem value="STRATEGY">Strateji</SelectItem>
            </SelectContent>
          </Select>

          <Select value={year} onValueChange={v=>{setYear(v); setPage(1);}}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Yıl"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tümü</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(it=>(
          <a key={it.id} href={`/news/${it.slug}`} className="rounded-xl border hover:shadow">
            <Card className="h-full">
              <CardContent className="p-4 space-y-2">
                <div className="text-sm text-gray-500">{new Date(it.createdAt).toLocaleDateString("tr-TR")}</div>
                <div className="font-semibold">{it.title}</div>
                <div className="text-sm text-gray-600 line-clamp-2">{it.excerpt}</div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="secondary">{it.category}</Badge>
                  <Badge variant="outline">{it.year}</Badge>
                  {it.tags?.slice(0,3).map(t=><Badge key={t}>{t}</Badge>)}
                </div>
              </CardContent>
            </Card>
          </a>
        ))}
        {items.length===0 && <div className="text-gray-500">Kayıt yok.</div>}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">Toplam {total} haber • Sayfa {page} / {Math.max(1, Math.ceil(total/take))}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>Önceki</Button>
          <Button size="sm" variant="outline" onClick={()=>setPage(p=>p+1)} disabled={page>=Math.max(1, Math.ceil(total/take))}>Sonraki</Button>
        </div>
      </div>
    </div>
  );
}
