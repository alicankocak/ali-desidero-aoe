"use client";

import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Row = {
  playerId: string;
  name: string;
  email: string | null;
  mp: number; w: number; d: number; l: number;
  gw: number; gl: number;
  pts: number;
};

export default function LeagueClient({ initial }: { initial: { league: "LIG1"|"LIG2"; season: string; items: Row[] } }) {
  const [league, setLeague] = useState<"LIG1"|"LIG2">(initial.league || "LIG1");
  const [season, setSeason] = useState<string>(initial.season || "2025-1");
  const [rows, setRows] = useState<Row[]>(initial.items);
  const [loading, setLoading] = useState(false);

  async function fetchData(nleague: "LIG1"|"LIG2", nseason: string) {
    setLoading(true);
    const res = await fetch(`/api/standings?league=${nleague}&season=${encodeURIComponent(nseason)}`, { cache: "no-store" });
    const data = await res.json();
    setRows(data.items);
    setLoading(false);
  }

  useEffect(() => {
    fetchData(league, season);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Lig</span>
          <Select value={league} onValueChange={(v:any)=>{ setLeague(v); fetchData(v, season); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Lig" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LIG1">Lig 1</SelectItem>
              <SelectItem value="LIG2">Lig 2</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Sezon</span>
          <Select value={season} onValueChange={(v:any)=>{ setSeason(v); fetchData(league, v); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Sezon" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025-1">2025 - 1. Yarı</SelectItem>
              <SelectItem value="2025-2">2025 - 2. Yarı</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading && <span className="text-xs text-gray-500">Yükleniyor…</span>}
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white p-3 shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Oyuncu</TableHead>
              <TableHead>O</TableHead>
              <TableHead>G</TableHead>
              <TableHead>B</TableHead>
              <TableHead>M</TableHead>
              <TableHead>GW</TableHead>
              <TableHead>GL</TableHead>
              <TableHead>Puan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, idx) => (
              <TableRow key={r.playerId} className="hover:bg-muted/40">
                <TableCell>{idx+1}</TableCell>
                <TableCell className="font-medium">
                  {r.name} {idx===0 && <Badge className="ml-2">Lider</Badge>}
                </TableCell>
                <TableCell>{r.mp}</TableCell>
                <TableCell>{r.w}</TableCell>
                <TableCell>{r.d}</TableCell>
                <TableCell>{r.l}</TableCell>
                <TableCell>{r.gw}</TableCell>
                <TableCell>{r.gl}</TableCell>
                <TableCell className="font-semibold">{r.pts}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-6 text-center text-gray-500">
                  Kayıt yok.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
