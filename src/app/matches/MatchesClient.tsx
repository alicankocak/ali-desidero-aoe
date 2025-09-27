"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";

type Initial = {
  leagues: Array<{ id: string; name: string; activeSeason: { id: string; label: string } | null }>;
  defaultLeagueId: string | null;
  defaultSeasonId: string | null;
};

type SeasonRow = { id: string; label: string; isActive: boolean };
type MatchRow = {
  id: string;
  round: number | null;
  playedAt: string | null;
  map: string | null;
  home: { id: string; name: string };
  away: { id: string; name: string };
  homeWins: number;
  awayWins: number;
  vodUrl: string | null;
};

export default function MatchesClient({ initial }: { initial: Initial }) {
  const [leagueId, setLeagueId] = useState<string>(initial.defaultLeagueId || "");
  const [seasonId, setSeasonId] = useState<string>(initial.defaultSeasonId || "");
  const [seasons, setSeasons] = useState<SeasonRow[]>([]);
  const [rounds, setRounds] = useState<number[]>([]);
  const [currentRound, setCurrentRound] = useState<number | null>(null);
  const [items, setItems] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Lig değişince sezonları çek
  useEffect(() => {
    async function loadSeasons() {
      if (!leagueId) { setSeasons([]); setSeasonId(""); return; }
      const r = await fetch(`/api/public/seasons?leagueId=${leagueId}`);
      const d = await r.json();
      setSeasons(d.items || []);
      if (!seasonId) {
        const act = (d.items || []).find((s: SeasonRow) => s.isActive) || (d.items || [])[0];
        setSeasonId(act?.id || "");
      }
    }
    loadSeasons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]);

  // Sezon/tur değişince maçları çek
  useEffect(() => {
    async function loadMatches(targetRound?: number | null) {
      if (!seasonId) { setItems([]); setRounds([]); setCurrentRound(null); return; }
      const qp = new URLSearchParams();
      qp.set("seasonId", seasonId);
      if (typeof targetRound === "number") qp.set("round", String(targetRound));
      setLoading(true);
      const r = await fetch(`/api/public/matches?${qp.toString()}`, { cache: "no-store" });
      const d = await r.json();
      setItems(d.items || []);
      setRounds(d.rounds || []);
      setCurrentRound(d.round ?? null);
      setLoading(false);
    }
    loadMatches(null);
  }, [seasonId]);

  const hasPrev = useMemo(() => {
    if (!rounds.length || currentRound == null) return false;
    const idx = rounds.indexOf(currentRound);
    return idx > 0;
  }, [rounds, currentRound]);

  const hasNext = useMemo(() => {
    if (!rounds.length || currentRound == null) return false;
    const idx = rounds.indexOf(currentRound);
    return idx >= 0 && idx < rounds.length - 1;
  }, [rounds, currentRound]);

  async function goPrev() {
    if (!hasPrev || currentRound == null) return;
    const idx = rounds.indexOf(currentRound);
    await fetchRound(rounds[idx - 1]);
  }

  async function goNext() {
    if (!hasNext || currentRound == null) return;
    const idx = rounds.indexOf(currentRound);
    await fetchRound(rounds[idx + 1]);
  }

  async function fetchRound(target: number) {
    if (!seasonId) return;
    const qp = new URLSearchParams();
    qp.set("seasonId", seasonId);
    qp.set("round", String(target));
    setLoading(true);
    const r = await fetch(`/api/public/matches?${qp.toString()}`, { cache: "no-store" });
    const d = await r.json();
    setItems(d.items || []);
    setRounds(d.rounds || []);
    setCurrentRound(d.round ?? target);
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      {/* Filtreler */}
      <Card className="p-3">
        <div className="grid gap-2 md:grid-cols-3">
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Lig</div>
            <Select value={leagueId} onValueChange={(v)=>{ setLeagueId(v); setSeasonId(""); }}>
              <SelectTrigger><SelectValue placeholder="Lig" /></SelectTrigger>
              <SelectContent>
                {initial.leagues.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="mb-1 text-xs text-muted-foreground">Sezon</div>
            <Select value={seasonId} onValueChange={setSeasonId} disabled={!leagueId}>
              <SelectTrigger><SelectValue placeholder="Sezon" /></SelectTrigger>
              <SelectContent>
                {seasons.map(s => <SelectItem key={s.id} value={s.id}>{s.label}{s.isActive ? " (aktif)" : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end justify-end">
            {currentRound != null && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={goPrev} disabled={!hasPrev}>←</Button>
                <span className="text-sm">Tur {currentRound}</span>
                <Button size="sm" variant="outline" onClick={goNext} disabled={!hasNext}>→</Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Maçlar listesi */}
      {loading ? (
        <div className="p-3 text-sm text-muted-foreground">Yükleniyor…</div>
      ) : items.length === 0 ? (
        <div className="p-3 text-sm text-muted-foreground">Bu turda maç bulunamadı.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map(m => (
            <MatchCard key={m.id} m={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function MatchCard({ m }: { m: MatchRow }) {
  const played = (m.homeWins + m.awayWins) > 0;
  const dateStr = m.playedAt
    ? new Date(m.playedAt).toLocaleString("tr-TR", {
        day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit"
      })
    : "-";

  return (
    <Card className="border bg-white p-3 text-sm shadow-sm dark:bg-card">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Tur {m.round ?? "-"}</span>
        <span className="text-xs text-muted-foreground">{dateStr}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="truncate font-semibold">{m.home.name}</div>
        </div>
        <div className="px-3 text-base font-bold">
          {played ? (
            <>
              {m.homeWins} <span className="mx-1 text-muted-foreground">–</span> {m.awayWins}
            </>
          ) : (
            <span className="text-muted-foreground">vs</span>
          )}
        </div>
        <div className="min-w-0 text-right">
          <div className="truncate font-semibold">{m.away.name}</div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {m.map && <Badge variant="secondary">{m.map}</Badge>}
          {m.vodUrl && (
            <Link href={m.vodUrl} target="_blank" className="text-xs underline underline-offset-4">
              VOD
            </Link>
          )}
        </div>
        <Link href={`/matches/${m.id}`} className="text-xs underline underline-offset-4">
          Detay
        </Link>
      </div>
    </Card>
  );
}
