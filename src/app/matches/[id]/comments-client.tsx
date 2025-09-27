"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";

type CommentItem = {
  id: string;
  content: string;
  createdAt: string | Date;
  author: { id: string | null; name: string; avatarUrl: string | null };
};

export default function Comments({ matchId }: { matchId: string }) {
  const [items, setItems] = useState<CommentItem[]>([]);
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  async function load() {
    const r = await fetch(`/api/matches/${matchId}/comments`, { cache: "no-store" });
    const d = await r.json();
    setItems(d.items || []);
  }

  useEffect(() => {
    load();
  }, [matchId]);

  function canSend(v: string) {
    const t = v.trim();
    return t.length > 0 && t.length <= 200;
  }

  async function submit() {
    const content = value.trim();
    if (!canSend(content)) return;
    setSending(true);
    try {
      const r = await fetch(`/api/matches/${matchId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        alert(err?.error || "Gönderilemedi");
        return;
      }
      const d = await r.json();
      // yeni yorumu listenin başına ekle
      setItems((prev) => [d.item, ...prev]);
      setValue("");
      // üstteki liste alanı varsa en üste kaydır
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="sticky top-4 flex h-[560px] flex-col overflow-hidden border bg-card text-card-foreground">
      <div className="border-b px-4 py-3 text-sm font-semibold">Yorumlar</div>

      {/* Liste - sabit yükseklik, iç scroll */}
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {items.map((c) => {
          const dt = new Date(c.createdAt);
          const when =
            dt.toLocaleDateString("tr-TR") +
            " " +
            dt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
          return (
            <div key={c.id} className="rounded-lg border bg-muted/40 p-3">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-6 w-6 overflow-hidden rounded-full bg-muted">
                  {c.author?.avatarUrl ? (
                    <Image src={c.author.avatarUrl} alt={c.author.name} width={24} height={24} />
                  ) : null}
                </div>
                <div className="text-xs font-medium">{c.author?.name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{when}</div>
              </div>
              <div className="whitespace-pre-wrap text-sm leading-5">{c.content}</div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">Henüz yorum yok.</div>
        )}
      </div>

      {/* Giriş alanı */}
      <div className="border-t p-3">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Yorum yaz (en fazla 200 karakter)…"
          className="h-20 resize-none"
          maxLength={200}
        />
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{value.trim().length} / 200</span>
          <Button size="sm" onClick={submit} disabled={!canSend(value) || sending}>
            Gönder
          </Button>
        </div>
      </div>
    </Card>
  );
}
