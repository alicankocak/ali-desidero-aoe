"use client";

import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type MatchItem = {
  id: string;
  round: number;
  home: string;
  away: string;
  homeWins: number;
  awayWins: number;
  playedAt?: string | null;
};

export default function FixturesClient(){
  const [league, setLeague] = useState<"LIG1"|"LIG2">("LIG1");
  const [season, setSeason] = useState<string>("2025-1");
  const [rounds, setRounds] = useState<Record<string, MatchItem[]>>({});
  const [loading, setLoading] = useState(false);

  async function load(){
    setLoading(true);
    const res = await fetch(`/api/fixtures?league=${league}&season=${season}`, { cache: "no-store" });
    const data = await res.json();
    setRounds(data.items || {});
    setLoading(false);
  }

  useEffect(()=>{ load(); }, [league, season]);

  const roundKeys = Object.keys(rounds).sort((a,b)=> Number(a)-Number(b));

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Lig</span>
          <Select value={league} onValueChange={(v:any)=> setLeague(v)}>
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
          <Select value={season} onValueChange={(v:any)=> setSeason(v)}>
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

      <div className="space-y-4">
        {roundKeys.length === 0 && <div className="text-gray-500">Fikstür yok. (Önce üretmelisin)</div>}
        {roundKeys.map((rk) => (
          <div key={rk} className="rounded-2xl bg-white p-3 shadow">
            <div className="mb-2 font-semibold">Tur {rk}</div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {rounds[rk].map((m)=> (
                <li key={m.id} className="rounded-xl border p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>{m.home} vs {m.away}</span>
                    <span className="text-xs text-gray-600">{m.homeWins}-{m.awayWins}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
