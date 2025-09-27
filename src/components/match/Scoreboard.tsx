"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Side = {
  id: string;
  name: string;
  civ?: string | null;
  isWinner?: boolean;
};

export type ScoreboardProps = {
  leagueLabel: string;
  seasonLabel: string;
  weekLabel: string;
  playedAt?: string | null;
  durationMin?: number | null;
  home: Side;
  away: Side;
  homeWins: number;
  awayWins: number;
  youtubeUrl?: string | null;
  twitchUrl?: string | null;
  className?: string;
};

function CivPill({ label }: { label?: string | null }) {
  if (!label) return null;
  return (
    <span className="mt-1 inline-flex rounded-md bg-white/10 px-2 py-0.5 text-xs text-white/90 ring-1 ring-white/15">
      {label}
    </span>
  );
}

export default function Scoreboard({
  playedAt,
  durationMin,
  home,
  away,
  homeWins,
  awayWins,
  youtubeUrl,
  twitchUrl,
  className,
}: ScoreboardProps) {
  const dt = playedAt ? new Date(playedAt) : null;
  const when =
    dt &&
    dt.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }) +
      ", " +
      dt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-0 bg-zinc-900 text-white shadow-md",
        className
      )}
    >
      <div className="flex items-stretch">
        {/* LEFT PLAYER */}
        <div className="flex min-h-[92px] flex-1 items-center gap-3 px-4">
          <div className="h-10 w-10 shrink-0 rounded-full bg-white/10 ring-1 ring-white/20" />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold leading-5">
              {home.name}
            </div>
            <CivPill label={home.civ} />
          </div>
        </div>

        {/* SCORE */}
        <div className="flex min-w-[140px] flex-col items-center justify-center px-2 text-3xl font-bold">
          <div className="leading-none">
            {homeWins} <span className="mx-1 text-zinc-500">–</span> {awayWins}
          </div>
        </div>

        {/* RIGHT PLAYER */}
        <div className="flex min-h-[92px] flex-1 items-center justify-end gap-3 px-4">
          <div className="min-w-0 text-right">
            <div className="truncate text-[15px] font-semibold leading-5">
              {away.name}
            </div>
            <div className="flex justify-end">
              <CivPill label={away.civ} />
            </div>
          </div>
          <div className="h-10 w-10 shrink-0 rounded-full bg-white/10 ring-1 ring-white/20" />
        </div>
      </div>

      {/* Meta + Watch links */}
      <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-xs text-zinc-300">
        <div className="space-x-2">
          {when && <span>{when}</span>}
          {durationMin != null && (
            <>
              <span className="mx-1 text-zinc-500">•</span>
              <span>{durationMin} dakika</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          {youtubeUrl && (
            <Link
              href={youtubeUrl}
              target="_blank"
              className="underline underline-offset-4 hover:text-white"
            >
              Youtube izle
            </Link>
          )}
          {twitchUrl && (
            <Link
              href={twitchUrl}
              target="_blank"
              className="underline underline-offset-4 hover:text-white"
            >
              Twitch izle
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
