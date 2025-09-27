"use client";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type Initial = {
  match: {
    id: string;
    league: "LIG1" | "LIG2";
    season: string;
    round: number | null;
    playedAt: string | null;
    durationMinutes: number | null;
    home: { id: string; name: string; civ: string | null };
    away: { id: string; name: string; civ: string | null };
    score: { home: number; away: number };
    vodYoutube: string | null;
    vodTwitch: string | null;
    vodUrl: string | null;
  };
  comments: Array<{
    id: string;
    text: string;
    createdAt: string;
    author: { id: string | null; name: string; avatarUrl: string | null };
  }>;
};

export default function Client({ initial }: { initial: Initial }) {
  const m = initial.match;
  const [comments, setComments] = useState(initial.comments);
  const [text, setText] = useState("");
  const remain = 200 - text.length;

  const playedStr = useMemo(() => {
    if (!m.playedAt) return "-";
    const d = new Date(m.playedAt);
    return d.toLocaleString("tr-TR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }, [m.playedAt]);

  async function sendComment() {
    const t = text.trim();
    if (!t) return;
    if (t.length > 200) return alert("En fazla 200 karakter.");
    const res = await fetch(`/api/matches/${m.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: t }),
    });
    if (res.ok) {
      const data = await res.json();
      setComments((prev) => [data.item, ...prev]);
      setText("");
    } else if (res.status === 401) {
      alert("Yorum için giriş yapmalısınız.");
    } else {
      const e = await res.json().catch(() => ({}));
      alert(e?.error ?? "Yorum gönderilemedi");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
      {/* 8 kolon: maç detayı */}
      <div className="md:col-span-8 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{m.league === "LIG1" ? "Lig 1" : "Lig 2"}</Badge>
          <Badge variant="secondary">{m.season}</Badge>
          {m.round != null && <Badge variant="secondary">{m.round}. Hafta</Badge>}
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-500">Ev Sahibi</div>
                <div className="truncate text-lg font-semibold">{m.home.name}</div>
                <div className="text-xs text-gray-600">{m.home.civ ?? "-"}</div>
              </div>
              <div className="text-center px-3">
                <div className="text-2xl font-bold">{m.score.home} - {m.score.away}</div>
                <div className="text-xs text-gray-500">{playedStr} • {m.durationMinutes ? `${m.durationMinutes} dk` : "-"}</div>
              </div>
              <div className="flex-1 min-w-0 text-right">
                <div className="text-sm text-gray-500">Deplasman</div>
                <div className="truncate text-lg font-semibold">{m.away.name}</div>
                <div className="text-xs text-gray-600">{m.away.civ ?? "-"}</div>
              </div>
              <div className="flex flex-col gap-2 pl-2">
                {(m.vodYoutube || m.vodUrl) && (
                  <Button asChild size="sm" variant="outline">
                    <a href={m.vodYoutube ?? m.vodUrl!} target="_blank">YouTube izle</a>
                  </Button>
                )}
                {m.vodTwitch && (
                  <Button asChild size="sm" variant="outline">
                    <a href={m.vodTwitch} target="_blank">Twitch izle</a>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="general">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">Genel Bilgiler</TabsTrigger>
            <TabsTrigger value="analysis">Analiz</TabsTrigger>
          </TabsList>
          <TabsContent value="general">
            <Card>
              <CardContent className="p-4 text-sm">
                <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                  <div className="text-gray-500">Oynanma zamanı</div><div>{playedStr}</div>
                  <div className="text-gray-500">Süre</div><div>{m.durationMinutes ? `${m.durationMinutes} dakika` : "-"}</div>
                  <div className="text-gray-500">Ev Sahibi ırkı</div><div>{m.home.civ ?? "-"}</div>
                  <div className="text-gray-500">Deplasman ırkı</div><div>{m.away.civ ?? "-"}</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="analysis">
            <Card><CardContent className="p-4 text-sm text-gray-600">Analiz içerikleri eklenecek.</CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 4 kolon: yorumlar */}
      <div className="md:col-span-4 space-y-3">
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 font-semibold">Yorumlar</div>
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="rounded-xl bg-gray-100 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <div className="relative h-6 w-6 overflow-hidden rounded-full bg-gray-300">
                      {c.author.avatarUrl ? (
                        <Image src={c.author.avatarUrl} alt={c.author.name} fill className="object-cover" />
                      ) : null}
                    </div>
                    <div className="text-sm font-medium">{c.author.name}</div>
                    <div className="ml-auto text-xs text-gray-500">
                      {new Date(c.createdAt).toLocaleString("tr-TR")}
                    </div>
                  </div>
                  <div className="text-sm">{c.text}</div>
                </div>
              ))}
              {comments.length === 0 && <div className="text-sm text-gray-500">Henüz yorum yok.</div>}
            </div>

            <div className="mt-3 space-y-2">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={200}
                placeholder="Yorum yaz (max 200 karakter)…"
                className="resize-none"
              />
              <div className="flex items-center justify-between">
                <div className={`text-xs ${remain < 0 ? "text-red-600" : "text-gray-500"}`}>{remain} karakter kaldı</div>
                <Button size="sm" onClick={sendComment}>Gönder</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
