"use client";

import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  author: { name: string };
};

export default function CommentsPanel({ matchId }: { matchId: string }) {
  const [rows, setRows] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [me, setMe] = useState<{ name?: string | null } | null>(null);
  const limit = 200;
  const listRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    const r = await fetch(`/api/matches/${matchId}/comments`, { cache: "no-store" });
    const d = await r.json();
    setRows(d.items || []);
  }

  useEffect(() => {
    load();
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => setMe(s?.user ?? null));
  }, [matchId]);

  async function submit() {
    if (!me?.name) {
      alert("Yorum yazmak için giriş yapmalısın.");
      return;
    }
    const trimmed = content.trim();
    if (!trimmed) return;
    if (trimmed.length > limit) return;

    const r = await fetch(`/api/matches/${matchId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: trimmed }),
    });
    const d = await r.json();
    if (d?.item) {
      setRows((prev) => [d.item, ...prev]);
      setContent("");
      // en üste kaydır (yeni yorumlar başta)
      requestAnimationFrame(() => {
        if (listRef.current) listRef.current.scrollTop = 0;
      });
    } else {
      alert(d?.error || "Yorum eklenemedi");
    }
  }

  return (
    <Card className="flex h-[560px] flex-col overflow-hidden">
      {/* Başlık */}
      <div className="border-b px-3 py-2 text-sm font-medium text-zinc-900">
        Yorumlar
      </div>

      {/* Liste (scrollable) */}
      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto px-3 py-3"
      >
        {rows.map((c) => (
          <div key={c.id} className="rounded-xl bg-zinc-100 p-3">
            <div className="mb-1 flex items-center gap-2 text-sm">
              <span className="inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500/90 ring-2 ring-white" />
              <span className="font-medium text-zinc-900">
                {c.author?.name ?? "-"}
              </span>
              <span className="ml-auto text-xs text-zinc-500">
                {new Date(c.createdAt).toLocaleString("tr-TR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="text-[13px] leading-5 text-zinc-700">
              {c.content}
            </div>
          </div>
        ))}

        {rows.length === 0 && (
          <div className="rounded-xl bg-zinc-100 p-3 text-sm text-zinc-500">
            İlk yorumu sen yaz!
          </div>
        )}
      </div>

      {/* Giriş alanı (kart içinde sabit altta) */}
      <div className="border-t px-3 py-2">
        <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
          <span>{content.length}/{limit}</span>
          {!me?.name && <span className="text-amber-600">Yorum için giriş yap.</span>}
        </div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, limit))}
          placeholder="Maks. 200 karakter"
          className="min-h-[88px] resize-none"
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={submit}>Gönder</Button>
        </div>
      </div>
    </Card>
  );
}
