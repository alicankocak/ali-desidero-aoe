"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type Row = {
  id: string;
  league: "LIG1" | "LIG2";
  season: string;
  playedAt: string | null;
  round: number | null;
  score: string;
  home: { id: string; name: string; civ: string | null };
  away: { id: string; name: string; civ: string | null };
  durationSec: number | null;
  vodUrl: string | null;
};

function fmtDuration(sec?: number | null) {
  if(!sec) return "-";
  const m = Math.floor(sec/60);
  const s = sec%60;
  return `${m} dk ${s.toString().padStart(2,"0")} sn`;
}

export default function MatchesClient(){
  const [q, setQ] = useState("");
  const [league, setLeague] = useState<"ALL"|"LIG1"|"LIG2">("ALL");
  const [season, setSeason] = useState<"ALL"|"2025-1"|"2025-2">("ALL");
  const [page, setPage] = useState(1);
  const [take] = useState(20);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const pages = useMemo(()=> Math.max(1, Math.ceil(total/take)), [total, take]);

  async function load(){
    const sp = new URLSearchParams();
    sp.set("page", String(page));
    sp.set("take", String(take));
    if (q.trim()) sp.set("q", q.trim());
    if (league !== "ALL") sp.set("league", league);
    if (season !== "ALL") sp.set("season", season);

    const res = await fetch(`/api/matches?` + sp.toString(), { cache: "no-store" });
    const data = await res.json();
    setRows(data.items || []);
    setTotal(data.total || 0);
  }

  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, [page, league, season]);

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Oyuncu ara (isim)"
              value={q}
              onChange={(e)=> setQ(e.target.value)}
              onKeyDown={(e)=>{ if(e.key==='Enter'){ setPage(1); load(); } }}
              className="sm:w-[260px]"
            />
            <Select value={league} onValueChange={(v:any)=>{ setLeague(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Lig" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tümü</SelectItem>
                <SelectItem value="LIG1">Lig 1</SelectItem>
                <SelectItem value="LIG2">Lig 2</SelectItem>
              </SelectContent>
            </Select>
            <Select value={season} onValueChange={(v:any)=>{ setSeason(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sezon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tümü</SelectItem>
                <SelectItem value="2025-1">2025 - 1. Yarı</SelectItem>
                <SelectItem value="2025-2">2025 - 2. Yarı</SelectItem>
              </SelectContent>
            </Select>

            <div className="sm:ml-auto flex gap-2">
              <Button variant="outline" onClick={()=>{ setQ(""); setLeague("ALL"); setSeason("ALL"); setPage(1); }}>
                Sıfırla
              </Button>
              <Button onClick={()=>{ setPage(1); load(); }}>
                Uygula
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarih</TableHead>
              <TableHead>Lig/Sezon</TableHead>
              <TableHead>Maç</TableHead>
              <TableHead>Skor</TableHead>
              <TableHead>Süre</TableHead>
              <TableHead>VOD</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(m=>(
              <TableRow key={m.id} className="hover:bg-muted/40">
                <TableCell className="whitespace-nowrap">
                  {m.playedAt ? new Date(m.playedAt).toLocaleString() : "-"}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex gap-1">
                    <Badge variant="secondary">{m.league}</Badge>
                    <Badge variant="outline">{m.season}</Badge>
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  <Link href={`/matches/${m.id}`} className="underline-offset-2 hover:underline">
                    {m.home.name} ({m.home.civ ?? "-"}) vs {m.away.name} ({m.away.civ ?? "-"})
                  </Link>
                </TableCell>
                <TableCell>{m.score}</TableCell>
                <TableCell>{fmtDuration(m.durationSec)}</TableCell>
                <TableCell>
                  {m.vodUrl ? (
                    <a href={`/matches/${m.id}`} className="text-sm underline underline-offset-2">İzle</a>
                  ) : <span className="text-xs text-gray-500">-</span>}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-gray-500">
                  Kayıt bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">
          Toplam {total} maç • Sayfa {page} / {pages}
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page<=1} onClick={()=> setPage(p=> Math.max(1, p-1))}>
            Önceki
          </Button>
          <Button size="sm" variant="outline" disabled={page>=pages} onClick={()=> setPage(p=> p+1)}>
            Sonraki
          </Button>
        </div>
      </div>
    </div>
  );
}
