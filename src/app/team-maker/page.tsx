"use client";

import { useEffect, useMemo, useState } from "react";

/** ====== Tipler ====== */
type Answers = {
  q1: "KOTU" | "NORMAL" | "IYI";   // Feudal: -30 / +20 / +100  -> AGRESIF sinyali
  q2: "EVET" | "HAYIR";            // Boom seviyor mu? EVET -20 (PASIF), HAYIR +20 (ATAK)
  q3: "KOTU" | "NORMAL" | "IYI";   // Late: -30 / +20 / +50  -> YIKICI sinyali
};

type Archetype = "PASIF" | "ATAK" | "AGRESIF" | "YIKICI";

type DbPlayer = { id: string; displayName: string; elo?: number | null };

type Player = {
  id: string;        // UI uuid
  srcId?: string;    // DB kaynağı
  name: string;
  baseElo: number;   // veritabanından veya manuel
  answers: Answers;
  archetype: Archetype;
  bonus: number;     // soru cevaplarından gelen delta
  adjElo: number;    // baseElo + bonus (0 altına düşmez)
};

type Team = {
  id: number;
  players: Player[];
  sumBase: number;
  sumAdj: number;
  extraAdj: number;  // ATAK bonusları gibi takım düzeyinde eklenen puanlar
  winChance: number; // hesaplanmış kazanma oranı (0-100)
};

type Suggestion = {
  name: string;
  teams: Team[];
};

/** ====== Görsel yardımcılar ====== */
const badgeStyle: Record<Archetype, string> = {
  PASIF:
    "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40",
  ATAK:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40",
  AGRESIF:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40",
  YIKICI:
    "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40",
};

function starByElo(elo: number) {
  // 800-1000: gümüş 1 ★  | 1001-1200: gümüş 2 ★★
  // 1201-1300: sarı 3 ★★★ | 1301-1499: sarı 4 ★★★★
  // 1499-1600: sarı 5 ★★★★★ | 1601-1800: kırmızı 5 ★★★★★ | 1801+: kırmızı 6 ★★★★★★
  if (elo >= 1801) return { stars: "★★★★★★", cls: "text-red-500" };
  if (elo >= 1601) return { stars: "★★★★★", cls: "text-red-500" };
  if (elo >= 1499) return { stars: "★★★★★", cls: "text-yellow-500" };
  if (elo >= 1301) return { stars: "★★★★", cls: "text-yellow-500" };
  if (elo >= 1201) return { stars: "★★★", cls: "text-yellow-500" };
  if (elo >= 1001) return { stars: "★★", cls: "text-gray-400" };
  if (elo >= 800) return { stars: "★", cls: "text-gray-400" };
  return { stars: "", cls: "text-zinc-400" };
}

/** ====== Kurallar & Arketip çıkarımı ====== */
function computeFromAnswers(baseElo: number, answers: Answers) {
  let delta = 0;
  // Q1: Feudal
  if (answers.q1 === "KOTU") delta -= 30;
  if (answers.q1 === "NORMAL") delta += 20;
  if (answers.q1 === "IYI") delta += 100;

  // Q2: Boom seviyor mu? EVET -20 (PASIF), HAYIR +20 (ATAK)
  if (answers.q2 === "EVET") delta -= 20;
  if (answers.q2 === "HAYIR") delta += 20;

  // Q3: Late
  if (answers.q3 === "KOTU") delta -= 30;
  if (answers.q3 === "NORMAL") delta += 20;
  if (answers.q3 === "IYI") delta += 50;

  const bonus = delta;
  const adjElo = Math.max(0, baseElo + bonus);

  // Arketip öncelikleri: YIKICI (Q3=IYI) > AGRESIF (Q1=IYI) > ATAK (Q2=HAYIR veya Q3=NORMAL) > PASIF (Q2=EVET veya Q3=KOTU)
  let archetype: Archetype = "ATAK";
  if (answers.q2 === "EVET" || answers.q3 === "KOTU") archetype = "PASIF";
  if (answers.q1 === "IYI") archetype = "AGRESIF";
  if (answers.q3 === "IYI") archetype = "YIKICI";

  return { bonus, adjElo, archetype };
}

/** ====== Takım yardımcıları ====== */
function splitTargets(total: number, teamCount: number) {
  const base = Math.floor(total / teamCount);
  let rem = total % teamCount;
  return Array.from({ length: teamCount }, () => base + (rem-- > 0 ? 1 : 0));
}
function countByArchetype(players: Player[]) {
  const c = { PASIF: 0, ATAK: 0, AGRESIF: 0, YIKICI: 0 };
  for (const p of players) c[p.archetype] += 1;
  return c;
}
function newEmptyTeam(id: number): Team {
  return { id, players: [], sumBase: 0, sumAdj: 0, extraAdj: 0, winChance: 50 };
}
function recalcTeam(t: Team): Team {
  const sumBase = t.players.reduce((a, b) => a + b.baseElo, 0);
  const sumAdj = t.players.reduce((a, b) => a + b.adjElo, 0);
  const atkCount = t.players.filter((p) => p.archetype === "ATAK").length;
  let extraAdj = 0;
  if (atkCount >= 3) extraAdj += 100; // +3 ATAK → +100
  else if (atkCount >= 2) extraAdj += 50; // +2 ATAK → +50
  return { ...t, sumBase, sumAdj, extraAdj };
}
function enforceIndividualBalance(teams: Team[]) {
  for (let loop = 0; loop < 2; loop++) {
    for (let i = 0; i < teams.length - 1; i++) {
      const A = teams[i];
      const B = teams[i + 1];
      for (const pa of A.players) {
        for (const pb of B.players) {
          const diffBefore = Math.abs(
            (A.sumAdj + A.extraAdj) - (B.sumAdj + B.extraAdj)
          );
          const afterA = A.sumAdj - pa.adjElo + pb.adjElo;
          const afterB = B.sumAdj - pb.adjElo + pa.adjElo;
          const diffAfter = Math.abs((afterA + A.extraAdj) - (afterB + B.extraAdj));
          if (diffAfter < diffBefore) {
            const A2 = recalcTeam({
              ...A,
              players: A.players.map((p) => (p.id === pa.id ? pb : p)),
            });
            const B2 = recalcTeam({
              ...B,
              players: B.players.map((p) => (p.id === pb.id ? pa : p)),
            });
            teams[i] = A2;
            teams[i + 1] = B2;
          }
        }
      }
    }
  }
  return teams.map(recalcTeam);
}
function computeWinChances(teams: Team[]): Team[] {
  // Puanlama (senin kurallar + küçük normalizasyon):
  // - En yüksek toplam (adj+extra) takıma +10, en düşük -10
  // - 2+ AGRESIF varsa +10
  // - (2 ATAK + 1 AGRESIF + 1 YIKICI) varsa +20
  // - 3 PASIF -20, 2 PASIF -10
  // - 1 AGRESIF + 1 ATAK varsa +5
  const scoresBase = teams.map((t) => {
    let s = 50;
    const c = countByArchetype(t.players);
    if (c.AGRESIF >= 2) s += 10;
    if (c.ATAK >= 2 && c.AGRESIF >= 1 && c.YIKICI >= 1) s += 20;
    if (c.PASIF >= 3) s -= 20;
    else if (c.PASIF === 2) s -= 10;
    if (c.AGRESIF >= 1 && c.ATAK >= 1) s += 5;
    return s;
  });

  const totals = teams.map((t) => t.sumAdj + t.extraAdj);
  const maxT = Math.max(...totals);
  const minT = Math.min(...totals);
  const scores = scoresBase.map((s, i) => {
    if (totals[i] === maxT) return s + 10;
    if (totals[i] === minT && teams.length > 1) return s - 10;
    return s;
  });

  // Normalize ederek (≈100) dağıt
  const sumS = scores.reduce((a, b) => a + b, 0);
  let norm = scores.map((s) => Math.max(1, Math.min(99, Math.round((s / sumS) * 100))));
  // toplamı 100’e düzelt
  let diff = 100 - norm.reduce((a, b) => a + b, 0);
  for (let i = 0; i < norm.length && diff !== 0; i++) {
    const step = diff > 0 ? 1 : -1;
    norm[i] += step;
    diff -= step;
  }
  return teams.map((t, i) => ({ ...t, winChance: norm[i] }));
}

/** 3 öneri üret: Dengeli, Alternatif, %50–%50 */
function makeSuggestions(players: Player[], teamCount: number): Suggestion[] {
  if (players.length < teamCount) return [];
  const sizes = splitTargets(players.length, teamCount);
  const sorted = [...players].sort((a, b) => b.adjElo - a.adjElo);

  // 1) Dengeli: snake dağıtım
  const t1: Team[] = sizes.map((_, i) => newEmptyTeam(i + 1));
  let dir = 1, idx = 0;
  for (const p of sorted) {
    t1[idx].players.push(p);
    idx += dir;
    if (idx === t1.length) { dir = -1; idx = t1.length - 1; }
    else if (idx < 0) { dir = 1; idx = 0; }
  }
  let s1 = t1.map(recalcTeam);
  s1 = enforceIndividualBalance(s1);
  s1 = computeWinChances(s1);

  // 2) Alternatif: kaydırmalı
  const t2: Team[] = sizes.map((_, i) => newEmptyTeam(i + 1));
  for (const [k, p] of sorted.entries()) {
    const target = (k + 1) % t2.length;
    t2[target].players.push(p);
  }
  let s2 = t2.map(recalcTeam);
  s2 = enforceIndividualBalance(s2);
  s2 = computeWinChances(s2);

  // 3) %50–%50: s1 baz alınır, küçük swaplarla toplamları eşitle
  let t3 = s1.map((t) => ({ ...t, players: [...t.players] }));
  for (let loop = 0; loop < 3; loop++) {
    t3 = enforceIndividualBalance(t3);
    const totals = t3.map((t) => t.sumAdj + t.extraAdj);
    const maxI = totals.indexOf(Math.max(...totals));
    const minI = totals.indexOf(Math.min(...totals));
    const A = t3[maxI], B = t3[minI];
    let best: { a?: Player; b?: Player; diff?: number } = {};
    for (const pa of A.players) {
      for (const pb of B.players) {
        const diffBefore = Math.abs((A.sumAdj + A.extraAdj) - (B.sumAdj + B.extraAdj));
        const afterA = A.sumAdj - pa.adjElo + pb.adjElo;
        const afterB = B.sumAdj - pb.adjElo + pa.adjElo;
        const diffAfter = Math.abs((afterA + A.extraAdj) - (afterB + B.extraAdj));
        if (best.diff === undefined || diffAfter < best.diff) best = { a: pa, b: pb, diff: diffAfter };
      }
    }
    if (best.a && best.b) {
      t3[maxI].players = A.players.map((p) => (p.id === best!.a!.id ? best!.b! : p));
      t3[minI].players = B.players.map((p) => (p.id === best!.b!.id ? best!.a! : p));
      t3[maxI] = recalcTeam(t3[maxI]);
      t3[minI] = recalcTeam(t3[minI]);
    } else break;
  }
  t3 = t3.map((t) => ({ ...t, winChance: 50 }));

  return [
    { name: "Öneri 1 (Dengeli)", teams: s1 },
    { name: "Öneri 2 (Alternatif)", teams: s2 },
    { name: "Öneri 3 (50–50)", teams: t3 },
  ];
}

/** ====== Drag & Drop (native) ====== */
function useDnD(teams: Team[], setTeams: (v: Team[]) => void) {
  const onDragStart = (teamIdx: number, pid: string) => (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ teamIdx, pid }));
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const onDrop = (toTeamIdx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const { teamIdx, pid } = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (teamIdx === toTeamIdx) return;
      const src = teams[teamIdx];
      const dst = teams[toTeamIdx];
      const p = src.players.find((x) => x.id === pid);
      if (!p) return;
      const newSrc = { ...src, players: src.players.filter((x) => x.id !== pid) };
      const newDst = { ...dst, players: [...dst.players, p] };
      const next = teams.map((t, i) =>
        i === teamIdx ? recalcTeam(newSrc) : i === toTeamIdx ? recalcTeam(newDst) : t
      );
      setTeams(computeWinChances(next));
    } catch {}
  };
  return { onDragStart, onDragOver, onDrop };
}

/** ====== Sayfa ====== */
export default function TeamMakerPage() {
  // DB oyuncuları
  const [dbPlayers, setDbPlayers] = useState<DbPlayer[]>([]);
  const [loadingDb, setLoadingDb] = useState(false);

  // Çoklu seçim
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Havuz (eklenen oyuncular)
  const [players, setPlayers] = useState<Player[]>([]);

  // Manuel form
  const [name, setName] = useState("");
  const [baseElo, setBaseElo] = useState<number>(1400);
  const [answers, setAnswers] = useState<Answers>({ q1: "NORMAL", q2: "HAYIR", q3: "NORMAL" });

  // Takım ve öneriler
  const [teamCount, setTeamCount] = useState(2);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [active, setActive] = useState<number>(0); // aktif öneri index
  const activeTeams = suggestions?.[active]?.teams ?? [];

  // Düzenle modalı
  const [editId, setEditId] = useState<string | null>(null);

  // DB oyuncuları çek
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoadingDb(true);
      try {
        const r = await fetch("/api/players?take=200", { cache: "no-store" });
        if (!r.ok) throw new Error("fetch players failed");
        const d = await r.json();
        const items: DbPlayer[] = (d.items || d || []).map((x: any) => ({
          id: x.id,
          displayName: x.displayName || x.name || "Oyuncu",
          elo: typeof x.elo === "number" ? x.elo : undefined,
        }));
        if (!ignore) setDbPlayers(items);
      } catch {
      } finally {
        setLoadingDb(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  // Zaten eklenmiş srcId seti (tekrar seçtirmemek için)
  const addedSrcIds = useMemo(
    () => new Set(players.map((p) => p.srcId).filter(Boolean) as string[]),
    [players]
  );

  // Çoklu seçim toggle
  const toggleOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const toggleAll = () => {
    const candidates = dbPlayers
      .filter((p) => !addedSrcIds.has(p.id))
      .map((p) => p.id);
    const allSelected = candidates.length > 0 && candidates.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : candidates);
  };

  // DB’den seçilenleri ekle
  function addFromDB() {
    if (selectedIds.length === 0) return;
    const map = new Map(dbPlayers.map((p) => [p.id, p]));
    const toAdd: Player[] = [];
    selectedIds.forEach((id) => {
      if (addedSrcIds.has(id)) return;
      const row = map.get(id);
      if (!row) return;
      const bElo = typeof row.elo === "number" ? row.elo : 1400;
      const c = computeFromAnswers(bElo, { q1: "NORMAL", q2: "HAYIR", q3: "NORMAL" });
      toAdd.push({
        id: crypto.randomUUID(),
        srcId: row.id,
        name: row.displayName,
        baseElo: bElo,
        answers: { q1: "NORMAL", q2: "HAYIR", q3: "NORMAL" },
        archetype: c.archetype,
        bonus: c.bonus,
        adjElo: c.adjElo,
      });
    });
    if (!toAdd.length) return;
    setPlayers((prev) => [...prev, ...toAdd]);
    setSelectedIds([]); // temizle
  }

  // Manuel ekle
  function addManual() {
    if (!name.trim()) return;
    const c = computeFromAnswers(baseElo, answers);
    const p: Player = {
      id: crypto.randomUUID(),
      name: name.trim(),
      baseElo,
      answers,
      archetype: c.archetype,
      bonus: c.bonus,
      adjElo: c.adjElo,
    };
    setPlayers((x) => [...x, p]);
    setName("");
    setBaseElo(1400);
    setAnswers({ q1: "NORMAL", q2: "HAYIR", q3: "NORMAL" });
  }

  // Oyuncu Sil / Düzenle
  function removePlayer(id: string) {
    setPlayers((x) => x.filter((p) => p.id !== id));
  }
  const openEdit = (id: string) => setEditId(id);
  const closeEdit = () => setEditId(null);
  function saveEdit(partial: { id: string; name?: string; baseElo?: number; answers?: Answers }) {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== partial.id) return p;
        const next: Player = {
          ...p,
          name: partial.name ?? p.name,
          baseElo: partial.baseElo ?? p.baseElo,
          answers: partial.answers ?? p.answers,
          archetype: p.archetype,
          bonus: p.bonus,
          adjElo: p.adjElo,
        };
        const calc = computeFromAnswers(next.baseElo, next.answers);
        next.bonus = calc.bonus;
        next.adjElo = calc.adjElo;
        next.archetype = calc.archetype;
        return next;
      })
    );
    closeEdit();
  }

  // 3 öneri üret
  function buildAll() {
    if (players.length < teamCount) return;
    const s = makeSuggestions(players, teamCount);
    setSuggestions(s);
    setActive(0);
  }

  // Drag and drop (aktif öneri üzerinde)
  const setActiveTeams = (fnOrVal: Team[] | ((t: Team[]) => Team[])) => {
    if (!suggestions) return;
    const next = Array.from(suggestions);
    const prevTeams = suggestions[active].teams;
    const t = typeof fnOrVal === "function" ? (fnOrVal as any)(prevTeams) : fnOrVal;
    next[active] = { ...next[active], teams: t };
    setSuggestions(next);
  };
  const { onDragStart, onDragOver, onDrop } = useDnD(activeTeams, (t) =>
    setActiveTeams(t)
  );

  // Özet
  const totals = useMemo(() => {
    const tp = players.reduce((a, b) => a + b.adjElo, 0);
    const arch = { PASIF: 0, ATAK: 0, AGRESIF: 0, YIKICI: 0 };
    players.forEach((p) => (arch[p.archetype] += 1));
    return { count: players.length, tp, arch };
  }, [players]);

  // Düzenlenen oyuncu
  const editing = editId ? players.find((p) => p.id === editId) ?? null : null;

  return (
    <div className="mx-auto w-full max-w-[1200px] p-4">
      <div className="rounded-2xl bg-gradient-to-r from-fuchsia-500 via-indigo-500 to-cyan-400 p-6 text-white shadow">
        <h1 className="text-3xl font-bold">Team Maker</h1>
        <p className="mt-1 text-sm opacity-90">
          DB çoklu seçim + manuel ekleme • ELO ve oyun tarzına göre dengeli takımlar
        </p>
      </div>

      {/* Giriş Alanı */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {/* DB'den çoklu seçim */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold">Veritabanından oyuncu seç</div>
            <button
              onClick={toggleAll}
              className="text-xs text-indigo-600 hover:underline disabled:text-zinc-400"
              disabled={loadingDb || dbPlayers.length === 0}
            >
              Tümünü seç/kaldır
            </button>
          </div>

          <div className="mb-2 text-xs text-zinc-500">
            Zaten eklenen oyuncular kilitlidir (ekli).
          </div>

          <div className="max-h-72 overflow-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
            {loadingDb ? (
              <div className="p-3 text-sm text-zinc-500">Yükleniyor…</div>
            ) : dbPlayers.length === 0 ? (
              <div className="p-3 text-sm text-zinc-500">Kayıt yok.</div>
            ) : (
              <ul className="grid gap-1 md:grid-cols-2">
                {dbPlayers.map((p) => {
                  const checked = selectedIds.includes(p.id);
                  const alreadyAdded = addedSrcIds.has(p.id);
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                    >
                      <label className="flex flex-1 items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={checked}
                          disabled={alreadyAdded}
                          onChange={() => toggleOne(p.id)}
                        />
                        <span className="truncate">
                          {p.displayName}
                          {typeof p.elo === "number" ? (
                            <span className="ml-1 text-xs text-zinc-500">
                              ({p.elo})
                            </span>
                          ) : null}
                        </span>
                      </label>
                      {alreadyAdded && (
                        <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-[10px] text-green-700 dark:bg-green-900/40 dark:text-green-300">
                          ekli
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mt-2">
            <button
              onClick={addFromDB}
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white disabled:opacity-60"
              disabled={selectedIds.length === 0}
            >
              Seçilenleri ekle
            </button>
          </div>
        </div>

        {/* Manuel ekleme + önizleme */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-3 text-sm font-semibold">Manuel oyuncu ekle</div>
          <div className="grid gap-3">
            <div>
              <label className="text-xs text-zinc-500">Oyuncu adı</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800"
                placeholder="Örn: Ali Desidero"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Mevcut ELO</label>
              <input
                type="number"
                value={baseElo}
                onChange={(e) => setBaseElo(Number(e.target.value || 0))}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800"
                min={0}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <label className="text-xs text-zinc-500">Soru 1 — Feudal</label>
                <select
                  value={answers.q1}
                  onChange={(e) =>
                    setAnswers((a) => ({ ...a, q1: e.target.value as Answers["q1"] }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <option value="KOTU">Kötü (-30)</option>
                  <option value="NORMAL">Normal (+20)</option>
                  <option value="IYI">İyi (+100) → Agresif</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500">Soru 2 — Boom</label>
                <select
                  value={answers.q2}
                  onChange={(e) =>
                    setAnswers((a) => ({ ...a, q2: e.target.value as Answers["q2"] }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <option value="EVET">Evet (-20) → Pasif</option>
                  <option value="HAYIR">Hayır (+20) → Atak</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500">Soru 3 — Late</label>
                <select
                  value={answers.q3}
                  onChange={(e) =>
                    setAnswers((a) => ({ ...a, q3: e.target.value as Answers["q3"] }))
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <option value="KOTU">Kötü (-30) → Pasif</option>
                  <option value="NORMAL">Normal (+20) → Atak</option>
                  <option value="IYI">İyi (+50) → Yıkıcı</option>
                </select>
              </div>
            </div>

            <button
              onClick={addManual}
              className="mt-1 inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              Oyuncuyu ekle
            </button>
          </div>

          {/* Önizleme */}
          <div className="mt-4 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
            <div className="mb-1 text-xs text-zinc-500">Önizleme</div>
            {(() => {
              const c = computeFromAnswers(baseElo, answers);
              const s = starByElo(c.adjElo);
              return (
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs ${badgeStyle[c.archetype]}`}
                  >
                    {c.archetype}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-300">
                    Baz ELO: <b>{baseElo}</b> • Bonus:{" "}
                    <b className={c.bonus >= 0 ? "text-emerald-600" : "text-rose-600"}>
                      {c.bonus >= 0 ? `+${c.bonus}` : c.bonus}
                    </b>{" "}
                    • Toplam: <b>{c.adjElo}</b>{" "}
                    <span className={s.cls}>{s.stars}</span>
                  </span>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Havuz listesi */}
      <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold">
            Oyuncular ({totals.count}) • Toplam ELO: {totals.tp}
          </div>
          <div className="text-xs text-zinc-500">
            P:{totals.arch.PASIF} / A:{totals.arch.ATAK} / G:{totals.arch.AGRESIF} / Y:
            {totals.arch.YIKICI}
          </div>
        </div>

        {players.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            Henüz oyuncu eklenmedi.
          </div>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {players.map((p) => {
              const s = starByElo(p.adjElo);
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950/40"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      Baz: <b>{p.baseElo}</b> • Bonus:{" "}
                      <b className={p.bonus >= 0 ? "text-emerald-600" : "text-rose-600"}>
                        {p.bonus >= 0 ? `+${p.bonus}` : p.bonus}
                      </b>{" "}
                      • Toplam: <b>{p.adjElo}</b>{" "}
                      <span className={s.cls}>{s.stars}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded border px-2 py-0.5 text-xs ${badgeStyle[p.archetype]}`}>
                      {p.archetype}
                    </span>
                    <button
                      onClick={() => openEdit(p.id)}
                      className="rounded-md border border-indigo-300 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 dark:border-indigo-900/60 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => removePlayer(p.id)}
                      className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/40"
                    >
                      Sil
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Öneriler & Oluştur */}
      <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="text-sm font-semibold">Takımlar</div>
          <select
            value={teamCount}
            onChange={(e) => setTeamCount(Number(e.target.value))}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value={2}>2 Takım</option>
            <option value={3}>3 Takım</option>
            <option value={4}>4 Takım</option>
          </select>

          <button
            onClick={buildAll}
            className="ml-auto rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
            disabled={players.length < teamCount}
            title={players.length < teamCount ? "Takım sayısından az oyuncu var" : ""}
          >
            3 Öneri Oluştur
          </button>
        </div>

        {!suggestions ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            Takım dağılımını görmek için oyuncuları ekleyip “3 Öneri Oluştur”a tıklayın.
          </div>
        ) : (
          <>
            {/* Öneri sekmeleri */}
            <div className="mb-3 flex gap-2">
              {suggestions.map((s, i) => (
                <button
                  key={s.name}
                  onClick={() => setActive(i)}
                  className={
                    "rounded-md border px-3 py-1.5 text-sm " +
                    (active === i
                      ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300"
                      : "border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800/60")
                  }
                >
                  {s.name}
                </button>
              ))}
            </div>

            {/* Aktif önerinin takımları */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeTeams.map((t, ti) => {
                const totals = t.sumAdj + t.extraAdj;
                return (
                  <div
                    key={t.id}
                    className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40"
                    onDragOver={onDragOver}
                    onDrop={onDrop(ti)}
                  >
                    <div className="mb-2 flex items-baseline justify-between">
                      <div className="text-sm font-semibold">Takım {t.id}</div>
                      <div className="text-xs text-zinc-500">
                        Toplam: {t.sumAdj}{" "}
                        {t.extraAdj ? (
                          <span className="text-emerald-600">(+{t.extraAdj})</span>
                        ) : null}{" "}
                        = <b>{totals}</b> • Kazanma: <b>%{t.winChance}</b>
                      </div>
                    </div>
                    <ul className="space-y-1">
                      {t.players.map((p) => (
                        <li
                          key={p.id}
                          draggable
                          onDragStart={onDragStart(ti, p.id)}
                          className="flex cursor-move items-center justify-between rounded-md bg-zinc-50 px-2 py-1 text-sm dark:bg-zinc-900"
                          title="Sürükleyip diğer takıma bırak"
                        >
                          <span className="truncate">{p.name}</span>
                          <span className="flex items-center gap-2">
                            <span
                              className={`rounded border px-2 py-0.5 text-[11px] ${badgeStyle[p.archetype]}`}
                            >
                              {p.archetype}
                            </span>
                            <span className="text-[11px] text-zinc-500">
                              {p.baseElo} → <b>{p.adjElo}</b>
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Düzenle Modalı */}
      {editing && (
        <EditModal
          player={editing}
          onClose={closeEdit}
          onSave={saveEdit}
        />
      )}
    </div>
  );
}

/** ====== Düzenle Modalı ====== */
function EditModal({
  player,
  onClose,
  onSave,
}: {
  player: Player;
  onClose: () => void;
  onSave: (p: { id: string; name?: string; baseElo?: number; answers?: Answers }) => void;
}) {
  const [name, setName] = useState(player.name);
  const [baseElo, setBaseElo] = useState<number>(player.baseElo);
  const [answers, setAnswers] = useState<Answers>(player.answers);

  const c = computeFromAnswers(baseElo, answers);
  const s = starByElo(c.adjElo);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 text-sm font-semibold">Oyuncuyu Düzenle</div>

        <div className="grid gap-3">
          <div>
            <label className="text-xs text-zinc-500">Ad</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Baz ELO</label>
            <input
              type="number"
              value={baseElo}
              onChange={(e) => setBaseElo(Number(e.target.value || 0))}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800"
              min={0}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <label className="text-xs text-zinc-500">Soru 1 — Feudal</label>
              <select
                value={answers.q1}
                onChange={(e) =>
                  setAnswers((a) => ({ ...a, q1: e.target.value as Answers["q1"] }))
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="KOTU">Kötü (-30)</option>
                <option value="NORMAL">Normal (+20)</option>
                <option value="IYI">İyi (+100) → Agresif</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500">Soru 2 — Boom</label>
              <select
                value={answers.q2}
                onChange={(e) =>
                  setAnswers((a) => ({ ...a, q2: e.target.value as Answers["q2"] }))
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="EVET">Evet (-20) → Pasif</option>
                <option value="HAYIR">Hayır (+20) → Atak</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500">Soru 3 — Late</label>
              <select
                value={answers.q3}
                onChange={(e) =>
                  setAnswers((a) => ({ ...a, q3: e.target.value as Answers["q3"] }))
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="KOTU">Kötü (-30) → Pasif</option>
                <option value="NORMAL">Normal (+20) → Atak</option>
                <option value="IYI">İyi (+50) → Yıkıcı</option>
              </select>
            </div>
          </div>

        </div>

        {/* Önizleme */}
        <div className="mt-3 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
          <div className="mb-1 text-xs text-zinc-500">Önizleme</div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs ${badgeStyle[c.archetype]}`}
            >
              {c.archetype}
            </span>
            <span className="text-zinc-600 dark:text-zinc-300">
              Baz: <b>{baseElo}</b> • Bonus:{" "}
              <b className={c.bonus >= 0 ? "text-emerald-600" : "text-rose-600"}>
                {c.bonus >= 0 ? `+${c.bonus}` : c.bonus}
              </b>{" "}
              • Toplam: <b>{c.adjElo}</b>{" "}
              <span className={s.cls}>{s.stars}</span>
            </span>
          </div>
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/60"
          >
            İptal
          </button>
          <button
            onClick={() => onSave({ id: player.id, name, baseElo, answers })}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
