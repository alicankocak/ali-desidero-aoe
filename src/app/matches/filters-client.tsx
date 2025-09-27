"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

type League = { id: string; name: string; isActive: boolean };
type Season = { id: string; label: string; isActive: boolean };

export default function FiltersClient(props: {
  leagues: League[];
  seasons: Season[];
  selLeagueId?: string;
  selSeasonId?: string;
  roundBounds: { min: number; max: number };
  currentRound: number;
}) {
  const { leagues, seasons, selLeagueId, selSeasonId, roundBounds, currentRound } = props;
  const router = useRouter();
  const sp = useSearchParams();

  function pushWith(next: Record<string, string | number | undefined>) {
    const q = new URLSearchParams(sp.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") q.delete(k);
      else q.set(k, String(v));
    });
    router.push(`/matches?${q.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      {/* Lig & Sezon dropdown */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-sm text-muted-foreground">Lig</div>
        <Select
          value={selLeagueId}
          onValueChange={(val) => {
            // lig değişince sezon ve turu sıfırla
            pushWith({ leagueId: val, seasonId: undefined, round: undefined });
          }}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Lig seç" />
          </SelectTrigger>
          <SelectContent>
            {leagues.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name} {l.isActive ? "" : "(pasif)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="text-sm text-muted-foreground">Sezon</div>
        <Select
          value={selSeasonId}
          onValueChange={(val) => {
            pushWith({ seasonId: val, round: undefined });
          }}
          disabled={!seasons.length}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sezon seç" />
          </SelectTrigger>
          <SelectContent>
            {seasons.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label} {s.isActive ? "" : "(pasif)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tur gezgini */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={currentRound <= roundBounds.min}
          onClick={() => pushWith({ round: Math.max(roundBounds.min, currentRound - 1) })}
          title="Önceki tur"
        >
          ← Önceki
        </Button>
        <div className="rounded-md border border-border px-3 py-1 text-sm">
          Tur {currentRound}
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={currentRound >= roundBounds.max}
          onClick={() => pushWith({ round: Math.min(roundBounds.max, currentRound + 1) })}
          title="Sonraki tur"
        >
          Sonraki →
        </Button>
      </div>
    </div>
  );
}
