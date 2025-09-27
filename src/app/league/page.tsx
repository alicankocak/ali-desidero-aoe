"use client";

import { useEffect, useState } from "react";

type SeasonOption = {
  seasonId: string;
  label: string;       // "2025-1"
  leagueId: string;
  leagueName: string;  // Admin panelde verdiğin ad
  players: number;
  matches: number;
};

type Row = {
  id: string;
  name: string;
  w: number; d: number; l: number;
  gw: number; gl: number;
  pts: number;
};

export default function LeaguePage(){
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [seasonId, setSeasonId] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  // Aktif sezonları çek
  useEffect(() => {
    fetch("/api/leagues", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        const items: SeasonOption[] = d.items || [];
        setSeasons(items);
        if (items[0]) setSeasonId(items[0].seasonId);
      });
  }, []);

  // Standings
  useEffect(() => {
    if (!seasonId) return;
    setLoading(true);
    fetch(`/api/standings?seasonId=${seasonId}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => setRows(d.items || []))
      .finally(() => setLoading(false));
  }, [seasonId]);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="text-xl font-semibold">Lig Tablosu</h1>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <select
          value={seasonId}
          onChange={(e)=>setSeasonId(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm sm:w-[320px]"
        >
          {seasons.map(s => (
            <option key={s.seasonId} value={s.seasonId}>
              {s.leagueName} • {s.label} ({s.players} oyuncu)
            </option>
          ))}
        </select>
        {loading && <span className="text-xs text-muted-foreground">Yükleniyor…</span>}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Oyuncu</th>
              <th className="px-3 py-2 text-center">G</th>
              <th className="px-3 py-2 text-center">B</th>
              <th className="px-3 py-2 text-center">M</th>
              <th className="px-3 py-2 text-center">GW</th>
              <th className="px-3 py-2 text-center">GL</th>
              <th className="px-3 py-2 text-center">P</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2">{i+1}</td>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 text-center">{r.w}</td>
                <td className="px-3 py-2 text-center">{r.d}</td>
                <td className="px-3 py-2 text-center">{r.l}</td>
                <td className="px-3 py-2 text-center">{r.gw}</td>
                <td className="px-3 py-2 text-center">{r.gl}</td>
                <td className="px-3 py-2 text-center font-semibold">{r.pts}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="px-3 py-6 text-center text-muted-foreground" colSpan={8}>Kayıt yok.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
