"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Check, Minus, Star, X } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type RecentItem = {
  id: string;
  playedAt?: string | null;
  home?: string | null;
  away?: string | null;
  score: string;
  result?: "W" | "D" | "L" | "-";
};

type ApiData = {
  player: {
    id: string;
    displayName: string;
    league: "LIG1" | "LIG2" | null;
    active: boolean;
    favoriteCiv?: string | null;
    // Geçici: ELO değerlerini manuel girmek için opsiyonel alanlar
    elo1v1?: number | null;
    eloTeam?: number | null;
    userId?: string | null;
    user?: { name?: string | null; email?: string | null; avatarUrl?: string | null } | null;
  };
  stats: { totalMatches: number; w: number; d: number; l: number; gw: number; gl: number; pts: number };
  recent: RecentItem[];
};

/* ---------------------- Elo/TP Renk-Kademe ---------------------- */
function eloTier(n?: number | null) {
  if (!n) return { stars: 0, className: "bg-muted text-muted-foreground", label: "-" };
  // örnek eşikler: 1200-, 1201–1400, 1401–1500, 1501–1600, 1601+
  if (n <= 1200) return { stars: 0, className: "bg-zinc-700 text-white", label: String(n) };
  if (n <= 1400) return { stars: 1, className: "bg-blue-600 text-white", label: String(n) };
  if (n <= 1500) return { stars: 2, className: "bg-indigo-600 text-white", label: String(n) };
  if (n <= 1600) return { stars: 3, className: "bg-rose-600 text-white", label: String(n) };
  return { stars: 4, className: "bg-amber-600 text-black", label: String(n) };
}

function tpTier(n?: number | null) {
  if (!n) return { stars: 0, className: "bg-muted text-muted-foreground", label: "-" };
  // TP için basit eşikler
  if (n < 5) return { stars: 1, className: "bg-emerald-700 text-white", label: String(n) };
  if (n < 10) return { stars: 2, className: "bg-emerald-600 text-white", label: String(n) };
  if (n < 20) return { stars: 3, className: "bg-emerald-500 text-white", label: String(n) };
  return { stars: 4, className: "bg-emerald-400 text-black", label: String(n) };
}

function Pill({
  title, value, kind,
}: { title: string; value?: number | null; kind: "elo" | "tp" }) {
  const t = kind === "elo" ? eloTier(value) : tpTier(value);
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs ${t.className}`}>
      <span className="opacity-90">{title}</span>
      <span className="font-semibold">{t.label}</span>
      {t.stars > 0 && (
        <span className="ml-0.5 flex">
          {Array.from({ length: t.stars }).map((_, i) => (
            <Star key={i} size={12} className="opacity-90" />
          ))}
        </span>
      )}
    </span>
  );
}

/* ---------------------- Component ---------------------- */

export default function PlayerClient({ initial }: { initial: ApiData }) {
  const p = initial.player;
  const s = initial.stats;
  const last5 = useMemo(() => initial.recent, [initial.recent]);

  // --- Video Sekmesi State ---
  const [videos, setVideos] = useState<Array<{ id: string; url: string; title?: string | null; type: "YOUTUBE" | "TWITCH"; createdAt: string }>>([]);
  const [vUrl, setVUrl] = useState("");
  const [vTitle, setVTitle] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch(`/api/players/${p.id}/videos`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setVideos(d.items || []));
    fetch("/api/me")
      .then((r) => r.json())
      .then((me) => {
        const email = me?.email as string | undefined;
        const roles: string[] = me?.roles || [];
        setCanEdit(!!email && email === initial.player.user?.email);
        setIsAdmin(roles.includes("ADMIN") || roles.includes("MODERATOR"));
      })
      .catch(() => {});
  }, [p.id, initial.player.user?.email]);

  // --- History Sekmesi State ---
  const [hLeague, setHLeague] = useState<"ALL" | "LIG1" | "LIG2">("ALL");
  const [hSeason, setHSeason] = useState<string>("ALL");
  const [hPage, setHPage] = useState<number>(1);
  const [hTake] = useState<number>(10);
  const [hTotal, setHTotal] = useState<number>(0);
  const [hRows, setHRows] = useState<
    Array<{
      id: string;
      round: number | null;
      league: "LIG1" | "LIG2";
      season: string;
      playedAt: string | null;
      home?: string | null;
      away?: string | null;
      score: string;
      as: "HOME" | "AWAY";
      opponentId: string | null;
      opponentName: string | null;
    }>
  >([]);

  async function loadHistory() {
    const qp = new URLSearchParams();
    qp.set("page", String(hPage));
    qp.set("take", String(hTake));
    if (hLeague !== "ALL") qp.set("league", hLeague);
    if (hSeason !== "ALL") qp.set("season", hSeason);
    const res = await fetch(`/api/players/${p.id}/matches?` + qp.toString(), { cache: "no-store" });
    const data = await res.json();
    setHRows(data.items || []);
    setHTotal(data.total || 0);
  }
  useEffect(() => { loadHistory(); }, [hPage, hLeague, hSeason]); // eslint-disable-line

  /* --------- UI --------- */
  return (
    <div className="space-y-3">
      {/* Üst bilgi kartı */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div className="relative h-16 w-16 overflow-hidden rounded-full bg-gray-200">
            {p.user?.avatarUrl ? (
              <Image src={p.user.avatarUrl} alt={p.displayName} fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-semibold">
                {p.displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 space-y-1">
            <div className="truncate text-lg font-semibold">{p.displayName}</div>

            {/* ELO & TP etiketleri */}
            <div className="flex flex-wrap gap-1.5">
              {/* 1v1 RM ve Team RM: şimdilik manuel; player'da yoksa "-" olarak gösterilir.
                 İstersen Player şemasına elo1v1 / eloTeam alanlarını ekleyip API'den doldururuz. */}
              <Pill title="1v1 RM" value={p.elo1v1 ?? null} kind="elo" />
              <Pill title="Team RM" value={p.eloTeam ?? null} kind="elo" />
              {/* TP: toplam puan — stats.pts */}
              <Pill title="TP" value={s?.pts ?? 0} kind="tp" />
            </div>

            {/* Gizlilik: e-posta sadece admin/moderator görür */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {p.user?.name || "-"}
              {isAdmin && p.user?.email ? <> • {p.user.email}</> : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {p.league && <Badge variant="secondary">{p.league === "LIG1" ? "Lig 1" : "Lig 2"}</Badge>}
              <Badge variant="outline">{p.active ? "Aktif" : "Pasif"}</Badge>
              {p.favoriteCiv && <Badge>{p.favoriteCiv}</Badge>}
            </div>
          </div>

          <div className="ml-auto grid grid-cols-3 gap-3 sm:gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-500">Maç</div>
              <div className="text-base font-semibold">{s.totalMatches}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">Puan</div>
              <div className="text-base font-semibold">{s.pts}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">G / B / M</div>
              <div className="text-base font-semibold">{s.w} / {s.d} / {s.l}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sekmeler */}
      <Tabs defaultValue="overview" className="mt-2">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="video">Video</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="message">Message</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-3">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <div>Tercih ettiği ırk: <b>{p.favoriteCiv || "-"}</b></div>
                <div>En sevdiği asker: <b>-</b></div>
                <div>Oynamak istediği pozisyon: <b>-</b></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="mb-2 text-sm font-semibold">Son 5 Maç</div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {last5.map((m) => (
                  <li key={m.id} className="rounded-xl border p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>{m.home} vs {m.away}</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">{m.score}</span>
                    </div>
                    <div className="mt-1">
                      {m.result === "W" && <span className="inline-flex items-center gap-1 text-green-600"><Check size={14}/> Galibiyet</span>}
                      {m.result === "D" && <span className="inline-flex items-center gap-1 text-amber-600"><Minus size={14}/> Beraberlik</span>}
                      {m.result === "L" && <span className="inline-flex items-center gap-1 text-red-600"><X size={14}/> Mağlubiyet</span>}
                      {(!m.result || m.result === "-") && <span className="text-gray-500">-</span>}
                    </div>
                  </li>
                ))}
                {last5.length === 0 && <li className="text-gray-500">Kayıt yok.</li>}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Video */}
        <TabsContent value="video">
          <Card>
            <CardContent className="space-y-3 p-4">
              {canEdit && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input className="sm:w-[360px]" placeholder="YouTube veya Twitch URL" value={vUrl} onChange={(e) => setVUrl(e.target.value)} />
                  <Input className="sm:w-[240px]" placeholder="Başlık (opsiyonel)" value={vTitle} onChange={(e) => setVTitle(e.target.value)} />
                  <Button
                    onClick={async () => {
                      const res = await fetch(`/api/players/${p.id}/videos`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ url: vUrl, title: vTitle }),
                      });
                      const data = await res.json();
                      if (data?.item) { setVideos((prev) => [data.item, ...prev]); setVUrl(""); setVTitle(""); }
                      else { alert(data?.error || "Kayıt başarısız"); }
                    }}
                  >Ekle</Button>
                </div>
              )}

              <ul className="grid gap-2 sm:grid-cols-2">
                {videos.map((v) => {
                  let embed: React.ReactNode = null;
                  try {
                    const u = new URL(v.url);
                    if (u.hostname.includes("youtube.com")) {
                      const vid = u.searchParams.get("v");
                      if (vid) embed = <div className="aspect-video w-full overflow-hidden rounded-lg border"><iframe className="h-full w-full" src={`https://www.youtube.com/embed/${vid}`} allowFullScreen/></div>;
                    } else if (u.hostname === "youtu.be") {
                      const id = u.pathname.replace("/", "");
                      if (id) embed = <div className="aspect-video w-full overflow-hidden rounded-lg border"><iframe className="h-full w-full" src={`https://www.youtube.com/embed/${id}`} allowFullScreen/></div>;
                    } else if (u.hostname.includes("twitch.tv")) {
                      const parts = u.pathname.split("/").filter(Boolean);
                      if (parts[0] === "videos" && parts[1]) {
                        embed = <div className="aspect-video w-full overflow-hidden rounded-lg border"><iframe className="h-full w-full" src={`https://player.twitch.tv/?video=${parts[1]}&parent=localhost`} allowFullScreen/></div>;
                      }
                    }
                  } catch {}
                  return (
                    <li key={v.id} className="space-y-2 rounded-xl border p-3">
                      <div className="text-xs text-gray-500">{v.type}</div>
                      <div className="font-medium">{v.title || "(başlıksız)"}</div>
                      {embed ?? <a href={v.url} target="_blank" className="break-all text-sm underline underline-offset-2">{v.url}</a>}
                    </li>
                  );
                })}
                {videos.length === 0 && <li className="text-gray-500">Video kaydı yok.</li>}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stats */}
        <TabsContent value="stats">
          <Card>
            <CardContent className="p-4 text-sm">
              <div>Toplam oyun (game) galibiyet/kayıp: <b>{s.gw}</b> / <b>{s.gl}</b></div>
              <div>Toplam puan: <b>{s.pts}</b></div>
              <div>Maç başına puan: <b>{s.totalMatches ? (s.pts / s.totalMatches).toFixed(2) : "0.00"}</b></div>

              <div className="mt-4 h-64 w-full"><TrendChart playerId={p.id} /></div>
              <div className="mt-4 h-64 w-full"><CumulativeChart playerId={p.id} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History */}
        <TabsContent value="history">
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Lig</span>
                  <Select value={hLeague} onValueChange={(v: any) => { setHLeague(v); setHPage(1); }}>
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="Lig" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Tümü</SelectItem>
                      <SelectItem value="LIG1">Lig 1</SelectItem>
                      <SelectItem value="LIG2">Lig 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Sezon</span>
                  <Select value={hSeason} onValueChange={(v: any) => { setHSeason(v); setHPage(1); }}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Sezon" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Tümü</SelectItem>
                      <SelectItem value="2025-1">2025 - 1. Yarı</SelectItem>
                      <SelectItem value="2025-2">2025 - 2. Yarı</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <TooltipProvider>
                <div className="overflow-x-auto rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tur</TableHead>
                        <TableHead>Lig</TableHead>
                        <TableHead>Sezon</TableHead>
                        <TableHead>Ev - Deplasman</TableHead>
                        <TableHead>Skor</TableHead>
                        <TableHead>Rol</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hRows.map((m) => (
                        <TableRow key={m.id} className="hover:bg-muted/40">
                          <TableCell>{m.round ?? "-"}</TableCell>
                          <TableCell>{m.league}</TableCell>
                          <TableCell>{m.season}</TableCell>
                          <TableCell className="font-medium">
                            {m.home} vs{" "}
                            {m.opponentId ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a href={`/players/${m.opponentId}`} className="underline underline-offset-2 hover:no-underline">
                                    {m.opponentName ?? m.away}
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs">
                                    {m.league} • {m.season} • Skor: {m.score}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              m.away
                            )}
                          </TableCell>
                          <TableCell>{m.score}</TableCell>
                          <TableCell>{m.as === "HOME" ? "Ev Sahibi" : "Deplasman"}</TableCell>
                        </TableRow>
                      ))}

                      {hRows.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="py-6 text-center text-gray-500">Kayıt yok.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TooltipProvider>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Toplam {hTotal} maç • Sayfa {hPage} / {Math.max(1, Math.ceil(hTotal / hTake))}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setHPage((p) => Math.max(1, p - 1))} disabled={hPage === 1}>Önceki</Button>
                  <Button size="sm" variant="outline" onClick={() => setHPage((p) => p + 1)} disabled={hPage >= Math.max(1, Math.ceil(hTotal / hTake))}>Sonraki</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Message */}
        <TabsContent value="message">
          <Card><CardContent className="p-4 text-sm text-gray-600 dark:text-gray-400">Özel mesaj kutusu burada olacak.</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TrendChart({ playerId }: { playerId: string }) {
  const [data, setData] = useState<Array<{ idx: number; pts: number; playedAt?: string; label: string }>>([]);
  useEffect(() => { fetch(`/api/players/${playerId}/points-trend`, { cache: "no-store" }).then(r=>r.json()).then(d=>setData(d.items||[])); }, [playerId]);
  if (!data.length) return <div className="text-xs text-gray-500">Trend verisi yok.</div>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="idx" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 3]} tick={{ fontSize: 12 }} />
        <RTooltip />
        <Line type="monotone" dataKey="pts" dot />
      </LineChart>
    </ResponsiveContainer>
  );
}

function CumulativeChart({ playerId }: { playerId: string }) {
  const [data, setData] = useState<Array<{ idx: number; total: number }>>([]);
  useEffect(() => { fetch(`/api/players/${playerId}/points-cumulative`, { cache: "no-store" }).then(r=>r.json()).then(d=>setData(d.items||[])); }, [playerId]);
  if (!data.length) return <div className="text-xs text-gray-500">Kümülatif veri yok.</div>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="idx" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <RTooltip />
        <Line type="monotone" dataKey="total" dot />
      </LineChart>
    </ResponsiveContainer>
  );
}
