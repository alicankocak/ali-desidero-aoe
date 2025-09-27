import { prisma } from "@/lib/prisma";
import Scoreboard from "@/components/match/Scoreboard";
import Comments from "./comments-client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X } from "lucide-react";

export const dynamic = "force-dynamic";

/* --------------------- Yardımcı Bileşenler --------------------- */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="truncate font-medium text-foreground">{value}</span>
    </div>
  );
}

function Checks({ items }: { items: [string, boolean][] }) {
  return (
    <ul className="space-y-2">
      {items.map(([label, ok]) => (
        <li key={label} className="flex items-center justify-between text-sm">
          <span className="text-foreground">{label}</span>
          {ok ? (
            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
              <Check size={16} /> Açık
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-zinc-500">
              <X size={16} /> Kapalı
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
/* --------------------------------------------------------------- */

async function getMatch(id: string) {
  const m = await prisma.match.findUnique({
    where: { id },
    include: {
      home: { select: { id: true, displayName: true, favoriteCiv: true } },
      away: { select: { id: true, displayName: true, favoriteCiv: true } },
    },
  });
  if (!m) return null;

  const leagueLabel = m.league === "LIG1" ? "Lig 1" : "Lig 2";
  const seasonLabel = m.season;
  const weekLabel = typeof m.round === "number" ? `Hafta ${m.round}` : "";

  // Opsiyonel alanlar (şeman yoksa null döner)
  const durationMin =
    (m as any).durationMinutes != null ? Number((m as any).durationMinutes) : null;
  const youtubeUrl = (m as any).vodYoutube ?? (m as any).vodUrl ?? null;
  const twitchUrl = (m as any).vodTwitch ?? null;

  return {
    id: m.id,
    leagueLabel,
    seasonLabel,
    weekLabel,
    playedAt: m.playedAt ? m.playedAt.toISOString() : null,
    durationMin,
    youtubeUrl,
    twitchUrl,
    home: {
      id: m.home.id,
      name: m.home.displayName,
      civ: m.home.favoriteCiv,
    },
    away: {
      id: m.away.id,
      name: m.away.displayName,
      civ: m.away.favoriteCiv,
    },
    homeWins: m.homeWins,
    awayWins: m.awayWins,
  };
}

export default async function MatchDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getMatch(params.id);
  if (!data) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Maç bulunamadı.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-12">
      {/* 8 kolon: maç bilgileri */}
      <div className="space-y-4 md:col-span-8">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-md border px-2 py-0.5">{data.leagueLabel}</span>
          <span className="rounded-md border px-2 py-0.5">{data.seasonLabel}</span>
          {data.weekLabel && (
            <span className="rounded-md border px-2 py-0.5">{data.weekLabel}</span>
          )}
        </div>

        <Scoreboard
          leagueLabel={data.leagueLabel}
          seasonLabel={data.seasonLabel}
          weekLabel={data.weekLabel}
          playedAt={data.playedAt}
          durationMin={data.durationMin}
          home={data.home}
          away={data.away}
          homeWins={data.homeWins}
          awayWins={data.awayWins}
          youtubeUrl={data.youtubeUrl}
          twitchUrl={data.twitchUrl}
          className="rounded-xl"
        />

        <Card className="border bg-background shadow-sm">
          <CardContent className="p-4">
            <Tabs defaultValue="overview">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Genel Bilgiler</TabsTrigger>
                <TabsTrigger value="analiz">Analiz</TabsTrigger>
              </TabsList>

              {/* GENEL BİLGİLER */}
              <TabsContent value="overview">
                <Card className="border bg-card p-0 text-card-foreground">
                  <div className="divide-y divide-border">
                    <Row label="Game Mode"     value="Random Map" />
                    <Row label="Location"      value="African Clearing" />
                    <Row label="Map Size"      value="Unknown" />
                    <Row label="Resources"     value="Normal" />
                    <Row label="Population"    value="200" />
                    <Row label="Starting Age"  value="Dark Age" />
                    <Row label="Ending Age"    value="Imperial Age" />
                    <Row label="Victory"       value="Conquest" />
                    <Row label="Game Speed"    value="Normal" />
                  </div>

                  <div className="grid gap-4 border-t border-border p-4 md:grid-cols-2">
                    <div className="rounded-lg border border-border bg-muted/30 p-4 dark:bg-muted/20">
                      <div className="mb-2 text-sm font-semibold text-muted-foreground">
                        Team Settings
                      </div>
                      <Checks
                        items={[
                          ["Lock Teams", true],
                          ["Teams Together", true],
                          ["Team Positions", true],
                          ["Shared Exploration", true],
                        ]}
                      />
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-4 dark:bg-muted/20">
                      <div className="mb-2 text-sm font-semibold text-muted-foreground">
                        Advanced Settings
                      </div>
                      <Checks
                        items={[
                          ["Lock Speed", true],
                          ["Allow Cheats", false],
                          ["Turbo Mode", false],
                          ["Full Tech Tree", false],
                        ]}
                      />
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* ANALİZ */}
              <TabsContent value="analiz" className="mt-3 space-y-2 text-sm text-muted-foreground">
                <div>
                  İleride maç içi istatistikler, grafikler ve oyuncu performans analizleri
                  burada yer alacak.
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* 4 kolon: yorum paneli (tek kart, sabit yükseklik, iç scroll) */}
      <div className="md:col-span-4">
        <Comments matchId={params.id} />
      </div>
    </div>
  );
}
