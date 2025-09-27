"use client";

import { useState } from "react";

type Row = {
  id: string;
  name: string;
  isActive: boolean;
  seasonsCount: number;
  playerCount: number;
  activeSeasonLabel: string | null;
  createdAt: string;
};

export default function AdminLeaguesClient({ initial }: { initial: Row[] }) {
  const [logsOpenId, setLogsOpenId] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function openLogs(id: string) {
    setLogsOpenId(id);
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/leagues/${id}/logs`, { cache: "no-store" });
      const d = await r.json();
      setLogs(d.items || []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="px-3 py-2 text-left">Lig</th>
              <th className="px-3 py-2 text-left">Aktif Sezon</th>
              <th className="px-3 py-2 text-left">Oyuncu Sayısı</th>
              <th className="px-3 py-2 text-left">Toplam Sezon</th>
              <th className="px-3 py-2 text-left">Durum</th>
              <th className="px-3 py-2 text-left">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {initial.map((r) => (
              <tr key={r.id} className="border-b hover:bg-muted/40">
                <td className="px-3 py-2 font-medium">{r.name}</td>
                <td className="px-3 py-2">{r.activeSeasonLabel ?? "-"}</td>
                <td className="px-3 py-2">{r.playerCount}</td>
                <td className="px-3 py-2">{r.seasonsCount}</td>
                <td className="px-3 py-2">
                  <span className={`rounded px-2 py-0.5 text-xs ${r.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-500/10 text-zinc-400"}`}>
                    {r.isActive ? "Aktif" : "Pasif"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded border px-2 py-1 text-xs hover:bg-muted"
                      onClick={() => openLogs(r.id)}
                    >
                      Loglar
                    </button>
                    <a
                      href={`/admin/leagues/${r.id}/edit`}
                      className="rounded border px-2 py-1 text-xs hover:bg-muted"
                    >
                      Düzenle
                    </a>
                  </div>
                </td>
              </tr>
            ))}
            {initial.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  Kayıt yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Basit Drawer */}
      {logsOpenId && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setLogsOpenId(null)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="absolute right-4 top-4 bottom-4 z-50 w-[360px] rounded-2xl border border-border bg-card p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">Lig Logları</div>
              <button
                className="rounded border px-2 py-1 text-xs hover:bg-muted"
                onClick={() => setLogsOpenId(null)}
              >
                Kapat
              </button>
            </div>
            <div className="h-full overflow-auto space-y-3">
              {loading && <div className="text-xs text-muted-foreground">Yükleniyor…</div>}
              {!loading && logs.length === 0 && (
                <div className="text-xs text-muted-foreground">Log bulunamadı.</div>
              )}
              {!loading && logs.map((lg: any) => (
                <div key={lg.id} className="rounded-lg border border-border p-2 text-xs">
                  <div className="mb-1">
                    <span className="font-medium">{lg.action}</span>{" "}
                    <span className="text-muted-foreground">
                      ({new Date(lg.createdAt).toLocaleString("tr-TR")})
                    </span>
                  </div>
                  <pre className="whitespace-pre-wrap break-words text-[11px] text-muted-foreground">
                    {JSON.stringify(lg.detail, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
