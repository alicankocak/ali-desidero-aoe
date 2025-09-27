"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type PlayerPick = { id: string; name: string; unavailable?: boolean };

export default function LeagueNewPage(){
  const router = useRouter();

  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [seasonYear, setSeasonYear] = useState<number>(new Date().getFullYear());
  const [seasonIndex, setSeasonIndex] = useState<number>(1);
  const seasonLabel = useMemo(() => `${seasonYear}-${seasonIndex}`, [seasonYear, seasonIndex]);

  const [startAt, setStartAt] = useState<string>("");
  const [endAt, setEndAt] = useState<string>("");

  const [players, setPlayers] = useState<PlayerPick[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [saving, setSaving] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  async function loadPlayers(label?: string){
    setLoadingPlayers(true);
    try{
      const q = label ? `?seasonLabel=${encodeURIComponent(label)}` : "";
      const r = await fetch(`/api/admin/players${q}`, { cache: "no-store" });
      const d = await r.json();
      setPlayers(d.items || []);
      // Müsait olmayanlar zaten seçiliyorsa çıkar
      setSelected((prev) => {
        const s = new Set(prev);
        for(const p of d.items || []){
          if(p.unavailable && s.has(p.id)) s.delete(p.id);
        }
        return s;
      });
    }finally{
      setLoadingPlayers(false);
    }
  }

  useEffect(() => { loadPlayers(seasonLabel); }, [seasonLabel]);

  function togglePlayer(id: string){
    setSelected(prev => {
      const s = new Set(prev);
      if (s.has(id)) { s.delete(id); return s; }
      if (s.size >= 20) return s; // limit
      s.add(id);
      return s;
    });
  }

  async function submit(){
    setSaving(true);
    try{
      const body: any = {
        name, isActive,
        seasonYear, seasonIndex,
        startAt: startAt || null,
        endAt: endAt || null,
        playerIds: Array.from(selected),
      };
      const r = await fetch("/api/admin/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if(!r.ok){ alert(d?.error || "Hata"); return; }
      router.push("/admin/leagues");
      router.refresh();
    }finally{
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h2 className="text-base font-semibold">Lig Oluştur</h2>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="space-y-1">
            <label className="text-sm">Lig Adı</label>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={name}
              onChange={(e)=>setName(e.target.value)}
              placeholder="Örn: Lig 1"
            />
          </div>

          <div className="flex items-center gap-2">
            <input id="ia" type="checkbox" checked={isActive} onChange={(e)=>setIsActive(e.target.checked)} />
            <label htmlFor="ia" className="text-sm">Aktif</label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm">Sezon Yılı</label>
              <input
                type="number"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={seasonYear}
                onChange={(e)=>setSeasonYear(Number(e.target.value || new Date().getFullYear()))}
                min={2000}
                max={2100}
              />
            </div>
            <div>
              <label className="text-sm">Sezon Sırası</label>
              <input
                type="number"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={seasonIndex}
                onChange={(e)=>setSeasonIndex(Math.max(1, Number(e.target.value || 1)))}
                min={1}
                max={4}
              />
            </div>
          </div>

          <div className="text-xs text-muted-foreground">Sezon: <b>{seasonLabel}</b></div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm">Başlangıç</label>
              <input
                type="date"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={startAt}
                onChange={(e)=>setStartAt(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm">Bitiş</label>
              <input
                type="date"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={endAt}
                onChange={(e)=>setEndAt(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium">Oyuncular (max 20)</div>
            <div className="text-xs text-muted-foreground">Seçili: {selected.size} / 20</div>
          </div>

          <div className="mb-3 text-xs text-muted-foreground">
            Sezon label: <b>{seasonLabel}</b> için başka ligde olan oyuncular <span className="text-red-500">seçilemez</span>.
          </div>

          <div className="h-[360px] overflow-auto rounded-lg border border-border">
            {loadingPlayers && <div className="p-3 text-xs text-muted-foreground">Yükleniyor…</div>}
            {!loadingPlayers && players.length === 0 && <div className="p-3 text-xs text-muted-foreground">Oyuncu yok.</div>}
            <ul className="divide-y divide-border">
              {players.map(p => {
                const checked = selected.has(p.id);
                return (
                  <li key={p.id} className="flex items-center justify-between px-3 py-2">
                    <div className="text-sm">{p.name}</div>
                    <div className="flex items-center gap-2">
                      {p.unavailable && <span className="text-xs text-red-500">meşgul</span>}
                      <input
                        type="checkbox"
                        disabled={p.unavailable || (!checked && selected.size >= 20)}
                        checked={checked}
                        onChange={()=>togglePlayer(p.id)}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={!name || saving}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
        >{saving ? "Kaydediliyor…" : "Oluştur"}</button>
        <button onClick={()=>history.back()} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">İptal</button>
      </div>
    </div>
  );
}
