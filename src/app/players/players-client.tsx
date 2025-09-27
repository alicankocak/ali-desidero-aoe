"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

type PlayerRow = {
  id: string;
  displayName: string;
  league: "LIG1" | "LIG2" | null;
  active: boolean;
  userName?: string | null;
  email?: string | null;
  favoriteCiv?: string | null;
};

type Initial = { total: number; items: PlayerRow[] };

export default function PlayersClient({ initial }: { initial: Initial }) {
  const [q, setQ] = useState("");
  const [league, setLeague] = useState<"LIG1" | "LIG2" | "ALL">("ALL");
  const [active, setActive] = useState<"ALL" | "true" | "false">("ALL");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PlayerRow[]>(initial.items);
  const [total, setTotal] = useState<number>(initial.total);
  const [page, setPage] = useState(1);
  const take = 20;

  async function fetchData(params?: { q?: string; league?: string; active?: string; page?: number }) {
    const qp = new URLSearchParams();
    qp.set("take", String(take));
    qp.set("skip", String(((params?.page ?? page) - 1) * take));
    if (params?.q) qp.set("q", params.q);
    if (params?.league && params.league !== "ALL") qp.set("league", params.league);
    if (params?.active && params.active !== "ALL") qp.set("active", params.active);

    setLoading(true);
    const res = await fetch(`/api/players?${qp.toString()}`, { cache: "no-store" });
    const data = await res.json();
    setItems(data.items);
    setTotal(data.total);
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchData({ q, league, active, page: 1 });
    }, 300);
    return () => clearTimeout(t);
  }, [q, league, active]);

  useEffect(() => {
    fetchData({ q, league, active, page });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const rows = useMemo(() => items, [items]);
  const totalPages = Math.max(1, Math.ceil(total / take));

  function resetFilters() {
    setQ("");
    setLeague("ALL");
    setActive("ALL");
    setPage(1);
    fetchData({ q: "", league: "ALL", active: "ALL", page: 1 });
  }

  return (
    <div className="space-y-3">
      {/* Filtreler */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
        <Input
          className="md:w-[300px]"
          placeholder="İsim / e-posta ara…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <Select value={league} onValueChange={(v: any) => setLeague(v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Lig" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tüm Ligler</SelectItem>
            <SelectItem value="LIG1">Lig 1</SelectItem>
            <SelectItem value="LIG2">Lig 2</SelectItem>
          </SelectContent>
        </Select>

        <Select value={active} onValueChange={(v: any) => setActive(v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Aktiflik" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Aktif/Pasif</SelectItem>
            <SelectItem value="true">Aktif</SelectItem>
            <SelectItem value="false">Pasif</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={resetFilters} variant="secondary">Sıfırla</Button>

        {loading && <span className="text-xs text-muted-foreground">Yükleniyor…</span>}
      </div>

      {/* Tablo */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card p-4">
        <div className="mb-3 text-sm text-muted-foreground">
          Toplam: <b className="text-foreground">{total}</b> oyuncu
        </div>

        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead className="px-4">Oyuncu</TableHead>
              <TableHead className="px-4">Lig</TableHead>
              <TableHead className="px-4">Aktif</TableHead>
              <TableHead className="px-4">Ad Soyad</TableHead>
              <TableHead className="px-4">E-posta</TableHead>
              <TableHead className="px-4">En Çok Oynadığı Irk</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} className="hover:bg-muted/40">
                <TableCell className="px-4 font-medium">
                  <a
                    href={`/players/${r.id}`}
                    className="underline underline-offset-2 hover:no-underline"
                  >
                    {r.displayName}
                  </a>
                </TableCell>
                <TableCell className="px-4">
                  {r.league ? (
                    <Badge variant="secondary">
                      {r.league === "LIG1" ? "Lig 1" : "Lig 2"}
                    </Badge>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="px-4">
                  <Badge variant={r.active ? "default" : "outline"}>
                    {r.active ? "Evet" : "Hayır"}
                  </Badge>
                </TableCell>
                <TableCell className="px-4">{r.userName || "-"}</TableCell>
                <TableCell className="px-4">{r.email || "-"}</TableCell>
                <TableCell className="px-4">{r.favoriteCiv || "-"}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  Kayıt bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Sayfa {page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Önceki
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Sonraki
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
