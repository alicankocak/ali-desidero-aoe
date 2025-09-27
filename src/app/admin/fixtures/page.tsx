"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function FixturesAdminPage(){
  const [items,setItems]=useState<any[]>([]);
  const [seasons,setSeasons]=useState<any[]>([]);
  const [seasonId,setSeasonId]=useState<string>("");
  const [map,setMap]=useState("Arabia");
  const [name,setName]=useState("Fikstür");

  async function load(){
    const r=await fetch("/api/admin/fixtures",{cache:"no-store"});
    const d=await r.json(); setItems(d.items||[]);
  }
  async function loadSeasons(){
    const r=await fetch("/api/admin/leagues",{cache:"no-store"});
    const d=await r.json();
    // aktif sezonları çıkar
    const arr = (d.items||[]).flatMap((x:any)=> x.activeSeasonLabel ? [{ id: x.id, label: x.activeSeasonLabel, league: x.name }] : []);
    // ikinci istek yerine basitçe sezon endpoint yazmadık; prod’da ayrı endpoint tercih et
    setSeasons(arr);
  }
  useEffect(()=>{ load(); loadSeasons(); },[]);

  async function create(){
    if(!seasonId){ alert("Aktif sezon seç."); return; }
    const r=await fetch("/api/admin/fixtures",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ seasonId, map, name })});
    const d=await r.json();
    if(!r.ok){ alert(d.error||"Hata"); return; }
    alert(`Oluşturuldu. Maç sayısı: ${d.matches}`);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Fikstürler</h1>
        <div className="flex items-end gap-2">
          <div>
            <Label>Sezon</Label>
            <Select value={seasonId} onValueChange={setSeasonId}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Aktif sezon" /></SelectTrigger>
              <SelectContent>
                {seasons.map((s:any)=> <SelectItem key={s.id} value={s.id}>{s.league} • {s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fikstür adı</Label>
            <Input value={name} onChange={e=>setName(e.target.value)} />
          </div>
          <div>
            <Label>Harita</Label>
            <Select value={map} onValueChange={setMap}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Arabia">Arabia</SelectItem>
                <SelectItem value="African Clearing">African Clearing</SelectItem>
                <SelectItem value="Arena">Arena</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={create}>Fikstür Oluştur</Button>
        </div>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="px-3 py-2 text-left">Fikstür</th>
              <th className="px-3 py-2 text-left">Lig/Sezon</th>
              <th className="px-3 py-2 text-left">Durum</th>
            </tr>
          </thead>
          <tbody>
            {items.map((f:any)=>(
              <tr key={f.id} className="border-b last:border-0">
                <td className="px-3 py-2">{f.name} <span className="text-muted-foreground">• {f.map}</span></td>
                <td className="px-3 py-2">{f.leagueName} • {f.seasonLabel}</td>
                <td className="px-3 py-2">{f.isActive ? <Badge>Aktif</Badge> : <Badge variant="secondary">Pasif</Badge>} {f.ended && <span className="ml-2 text-xs text-muted-foreground">(Sezon bitti)</span>}</td>
              </tr>
            ))}
            {items.length===0 && <tr><td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">Kayıt yok.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
