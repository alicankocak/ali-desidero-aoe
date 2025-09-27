"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SeasonRow = { id: string; label: string; leagueName: string; playerCount: number };
type PlayerRow = { id: string; name: string };

export default function FixtureNewPage(){
  const router = useRouter();
  const [seasons, setSeasons] = useState<SeasonRow[]>([]);
  const [seasonId, setSeasonId] = useState<string>("");
  const [seasonPlayers, setSeasonPlayers] = useState<PlayerRow[]>([]);
  const [mapName, setMapName] = useState<string>("Arabia");
  const [name, setName] = useState<string>("Fikstür");
  const [rows, setRows] = useState<Array<{homeId:string;awayId:string;playedAt?:string|null}>>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/seasons?active=1", { cache: "no-store" })
      .then(r=>r.json()).then(d=>setSeasons(d.items || []));
  }, []);

  useEffect(() => {
    async function loadSeasonPlayers(){
      setSeasonPlayers([]);
      setRows([]);
      if(!seasonId) return;
      const r = await fetch(`/api/admin/seasons?id=${encodeURIComponent(seasonId)}`, { cache: "no-store" });
      const d = await r.json();
      const players: PlayerRow[] = d?.item?.players || [];
      setSeasonPlayers(players);
    }
    loadSeasonPlayers();
  }, [seasonId]);

  function shuffle<T>(a:T[]){
    const arr = a.slice();
    for(let i=arr.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function generateDoubleRoundRobin(){
    if(seasonPlayers.length < 2){ alert("Yeterli oyuncu yok"); return; }
    const ids = shuffle(seasonPlayers.map(p=>p.id));
    const pairs: Array<{homeId:string;awayId:string}> = [];
    for(let i=0;i<ids.length;i++){
      for(let j=i+1;j<ids.length;j++){
        const a = ids[i], b = ids[j];
        pairs.push({ homeId: a, awayId: b });
        pairs.push({ homeId: b, awayId: a });
      }
    }
    setRows(pairs.map(p=>({ ...p, playedAt: null })));
  }

  function updateRow(idx:number, patch: Partial<{homeId:string;awayId:string;playedAt?:string|null}>){
    setRows(prev=>{
      const next = prev.slice();
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  async function save(){
    if(!seasonId){ alert("Sezon seçiniz"); return; }
    if(!name.trim()){ alert("Fikstür adı gerekli"); return; }
    if(!mapName.trim()){ alert("Harita adı gerekli"); return; }
    if(!rows.length){ alert("Maç üretilmedi"); return; }

    setSaving(true);
    try{
      const r = await fetch("/api/admin/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          map: mapName,
          seasonId,
          matches: rows,
        }),
      });
      const d = await r.json();
      if(!r.ok){ alert(d?.error || "Hata"); return; }
      router.push("/admin/fixtures");
      router.refresh();
    }finally{
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <h2 className="text-base font-semibold">Fikstür Oluştur</h2>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 space-y-3 md:col-span-1">
          <div>
            <label className="text-sm">Sezon</label>
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={seasonId}
              onChange={(e)=>setSeasonId(e.target.value)}
            >
              <option value="">Sezon seç</option>
              {seasons.map(s=>(
                <option key={s.id} value={s.id}>{s.leagueName} — {s.label} ({s.playerCount})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm">Fikstür Adı</label>
            <input
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={name}
              onChange={(e)=>setName(e.target.value)}
              placeholder="Örn: Normal Sezon"
            />
          </div>

          <div>
            <label className="text-sm">Harita</label>
            <input
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={mapName}
              onChange={(e)=>setMapName(e.target.value)}
              placeholder="Arabia"
            />
          </div>

          <button
            className="w-full rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
            onClick={generateDoubleRoundRobin}
            disabled={!seasonId || seasonPlayers.length < 2}
          >
            Rastgele Çift Devre Oluştur
          </button>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 md:col-span-2">
          <div className="mb-2 text-sm font-medium">Maçlar ({rows.length})</div>
          <div className="h-[440px] overflow-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-2 py-2 text-left">Ev Sahibi</th>
                  <th className="px-2 py-2 text-left">Deplasman</th>
                  <th className="px-2 py-2 text-left">Tarih/Saat</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i)=>(
                  <tr key={i} className="border-b">
                    <td className="px-2 py-1">
                      <select
                        className="w-full rounded border border-border bg-background px-2 py-1"
                        value={r.homeId}
                        onChange={(e)=>updateRow(i,{homeId:e.target.value})}
                      >
                        {seasonPlayers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <select
                        className="w-full rounded border border-border bg-background px-2 py-1"
                        value={r.awayId}
                        onChange={(e)=>updateRow(i,{awayId:e.target.value})}
                      >
                        {seasonPlayers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="datetime-local"
                        className="w-full rounded border border-border bg-background px-2 py-1"
                        value={r.playedAt ?? ""}
                        onChange={(e)=>updateRow(i,{playedAt:e.target.value || null})}
                      />
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">Henüz üretilmedi.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              className="rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
              onClick={save}
              disabled={!rows.length || saving}
            >
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
