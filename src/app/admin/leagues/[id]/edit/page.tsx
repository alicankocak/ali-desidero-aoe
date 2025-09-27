import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import MapSelect from "@/components/admin/MapSelect";

export const dynamic = "force-dynamic";

/* ---------------------- HELPERS ---------------------- */

function guessLeagueEnumByLeagueName(name?: string | null): "LIG1" | "LIG2" {
  if (!name) return "LIG1";
  if (/\b1\b/.test(name) || /lig ?1/i.test(name)) return "LIG1";
  if (/\b2\b/.test(name) || /lig ?2/i.test(name)) return "LIG2";
  return "LIG1";
}

/* ---------------------- DATA ---------------------- */

async function getData(id: string) {
  const league = await prisma.leagueTable.findUnique({
    where: { id },
    include: {
      seasons: {
        orderBy: { startAt: "desc" },
        include: {
          memberships: {
            select: {
              playerId: true,
              player: { select: { id: true, displayName: true } },
            },
          },
          matches: {
            orderBy: [{ round: "asc" }, { createdAt: "asc" }],
            include: {
              home: { select: { id: true, displayName: true } },
              away: { select: { id: true, displayName: true } },
            },
          },
        },
      },
    },
  });

  if (!league)
    return { league: null, active: null, allPlayers: [] as any[], busySet: new Set<string>() };

  const active = league.seasons.find((s) => s.isActive) ?? null;

  // Aynı sezon label'ında diğer liglerde kayıtlı oyuncuları "seçilemez"
  const sameLabel = active?.label ?? null;
  let busySet = new Set<string>();
  if (sameLabel) {
    const clashes = await prisma.season.findMany({
      where: { label: sameLabel, leagueId: { not: league.id } },
      include: { memberships: true },
    });
    for (const s of clashes) for (const m of s.memberships) busySet.add(m.playerId);
  }

  const allPlayers = await prisma.player.findMany({
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true },
  });

  return { league, active, allPlayers, busySet };
}

/* ---------------------- SERVER ACTIONS ---------------------- */

async function saveLeagueAction(formData: FormData) {
  "use server";
  const id = String(formData.get("leagueId"));
  const name = String(formData.get("name") || "").trim();
  const isActive = String(formData.get("isActive") || "true") === "true";

  await prisma.leagueTable.update({ where: { id }, data: { name, isActive } });
  await prisma.auditLog.create({
    data: { entity: "LEAGUE", entityId: id, action: "UPDATE_LEAGUE", detail: { name, isActive } },
  });
  revalidatePath(`/admin/leagues/${id}/edit`);
}

async function saveSeasonAction(formData: FormData) {
  "use server";
  const leagueId = String(formData.get("leagueId"));
  const year = Number(formData.get("year") || 0);
  const index = Number(formData.get("index") || 1);
  const startAt = new Date(String(formData.get("startAt") || ""));
  const endAt = new Date(String(formData.get("endAt") || ""));
  const isActive = String(formData.get("seasonActive") || "true") === "true";
  const label = `${year}-${index}`;

  const existing = await prisma.season.findFirst({ where: { leagueId, isActive: true } });
  if (existing) {
    await prisma.season.update({
      where: { id: existing.id },
      data: { year, index, label, startAt, endAt, isActive },
    });
    await prisma.auditLog.create({
      data: { entity: "LEAGUE", entityId: leagueId, action: "UPDATE_SEASON", detail: { seasonId: existing.id, year, index, startAt, endAt, isActive } },
    });
  } else {
    const created = await prisma.season.create({
      data: { leagueId, year, index, label, startAt, endAt, isActive },
    });
    await prisma.auditLog.create({
      data: { entity: "LEAGUE", entityId: leagueId, action: "CREATE_SEASON", detail: { seasonId: created.id, year, index, startAt, endAt, isActive } },
    });
  }
  revalidatePath(`/admin/leagues/${leagueId}/edit`);
}

async function addPlayersAction(formData: FormData) {
  "use server";
  const leagueId = String(formData.get("leagueId"));
  const seasonId = String(formData.get("seasonId") || "");
  const addIds = (formData.getAll("addIds") as string[]).filter(Boolean);
  if (!seasonId || addIds.length === 0) return;

  const current = await prisma.seasonMembership.count({ where: { seasonId } });
  const canAdd = Math.max(0, 20 - current);
  const picked = addIds.slice(0, canAdd);

  await prisma.$transaction(
    picked.map((pid) =>
      prisma.seasonMembership.upsert({
        where: { seasonId_playerId: { seasonId, playerId: pid } },
        update: {},
        create: { seasonId, playerId: pid },
      })
    )
  );

  await prisma.auditLog.create({
    data: { entity: "LEAGUE", entityId: leagueId, action: "ADD_PLAYERS", detail: { seasonId, add: picked } },
  });

  revalidatePath(`/admin/leagues/${leagueId}/edit`);
}

async function removePlayerAction(formData: FormData) {
  "use server";
  const leagueId = String(formData.get("leagueId"));
  const seasonId = String(formData.get("seasonId") || "");
  const playerId = String(formData.get("playerId") || "");
  if (!seasonId || !playerId) return;

  await prisma.seasonMembership.delete({
    where: { seasonId_playerId: { seasonId, playerId } },
  });

  await prisma.auditLog.create({
    data: { entity: "LEAGUE", entityId: leagueId, action: "REMOVE_PLAYER", detail: { seasonId, playerId } },
  });

  revalidatePath(`/admin/leagues/${leagueId}/edit`);
}

/* ---- Round-robin çift devre ---- */
function generateDoubleRoundRobin(ids: string[]) {
  const n = ids.length;
  const arr = [...ids];
  if (n % 2 === 1) arr.push("__bye__");
  const rounds = arr.length - 1;
  const half = arr.length / 2;
  const fixtures: Array<Array<[string, string]>> = [];
  let a = [...arr];
  for (let r = 0; r < rounds; r++) {
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < half; i++) {
      const home = a[i];
      const away = a[a.length - 1 - i];
      if (home !== "__bye__" && away !== "__bye__") pairs.push([home, away]);
    }
    fixtures.push(pairs);
    a = [a[0], ...a.slice(-1), ...a.slice(1, -1)];
  }
  const first = fixtures;
  const second = fixtures.map((round) => round.map(([h, w]) => [w, h] as [string, string]));
  return [...first, ...second];
}

async function randomFixtureAction(formData: FormData) {
  "use server";
  const leagueId = String(formData.get("leagueId"));
  const seasonId = String(formData.get("seasonId") || "");
  const defaultMap = String(formData.get("defaultMap") || "RANDOM");
  if (!seasonId) return;

  await prisma.match.deleteMany({ where: { seasonRelId: seasonId } });

  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    include: { league: true, memberships: true },
  });
  if (!season) return;

  const ids = season.memberships.map((m) => m.playerId);
  if (ids.length < 2) return;

  const leagueEnum = guessLeagueEnumByLeagueName(season.league?.name);
  const pool = ["Arabia", "Arena", "African Clearing", "Black Forest", "Nomad", "Steppe", "Golden Pit"];
  const pickMap = () => {
    if (defaultMap && defaultMap !== "RANDOM") return defaultMap;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const rounds = generateDoubleRoundRobin(ids);
  const data = [];
  let roundNo = 1;
  for (const pairs of rounds) {
    for (const [homeId, awayId] of pairs) {
      data.push({
        seasonRelId: seasonId,
        league: leagueEnum,
        season: season.label,
        round: roundNo,
        homeId,
        awayId,
        map: pickMap(),
      } as const);
    }
    roundNo++;
  }

  await prisma.match.createMany({ data });

  await prisma.auditLog.create({
    data: { entity: "LEAGUE", entityId: leagueId, action: "GENERATE_FIXTURE", detail: { seasonId, defaultMap, total: data.length } },
  });

  revalidatePath(`/admin/leagues/${leagueId}/edit`);
}

async function updateMatchAction(formData: FormData) {
  "use server";
  const leagueId = String(formData.get("leagueId"));
  const matchId = String(formData.get("matchId"));
  const homeId = String(formData.get("homeId") || "");
  const awayId = String(formData.get("awayId") || "");
  const map = String(formData.get("map") || "");
  const dtRaw = String(formData.get("playedAt") || "");
  const playedAt = dtRaw ? new Date(dtRaw) : null;

  await prisma.match.update({
    where: { id: matchId },
    data: { homeId, awayId, playedAt, ...(map ? { map } : {}) },
  });

  await prisma.auditLog.create({
    data: { entity: "LEAGUE", entityId: leagueId, action: "UPDATE_FIXTURE_ITEM", detail: { matchId, homeId, awayId, playedAt, map } },
  });

  revalidatePath(`/admin/leagues/${leagueId}/edit`);
}

async function deleteMatchAction(formData: FormData) {
  "use server";
  const leagueId = String(formData.get("leagueId"));
  const matchId = String(formData.get("matchId"));

  await prisma.match.delete({ where: { id: matchId } });

  await prisma.auditLog.create({
    data: { entity: "LEAGUE", entityId: leagueId, action: "DELETE_FIXTURE_ITEM", detail: { matchId } },
  });

  revalidatePath(`/admin/leagues/${leagueId}/edit`);
}

/* ---------------------- PAGE ---------------------- */

export default async function LeagueEditPage({ params }: { params: { id: string } }) {
  const { league, active, allPlayers, busySet } = await getData(params.id);
  if (!league) return <div className="p-4 text-sm text-muted-foreground">Lig bulunamadı.</div>;

  const selectedIds = new Set(active?.memberships?.map((m) => m.playerId) ?? []);
  const selectable = allPlayers.map((p) => {
    const selected = selectedIds.has(p.id);
    const busy = busySet.has(p.id) && !selected;
    return { ...p, selected, busy };
  });
  const seasonPlayers = (active?.memberships ?? []).map((m) => m.player);

  // round -> matches grubu
  const rounds = new Map<number, typeof active.matches>();
  if (active) {
    for (const m of active.matches) {
      const key = m.round ?? 0;
      if (!rounds.has(key)) rounds.set(key, [] as any);
      // @ts-ignore
      rounds.get(key)!.push(m);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h2 className="text-base font-semibold">Lig Düzenle</h2>

      {/* Lig Bilgileri */}
      <Card className="p-4">
        <form action={saveLeagueAction} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="leagueId" value={league.id} />
          <div>
            <label className="text-sm">Lig Adı</label>
            <input name="name" defaultValue={league.name} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="w-full">
              <label className="text-sm">Durum</label>
              <select name="isActive" defaultValue={league.isActive ? "true" : "false"} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option value="true">Aktif</option>
                <option value="false">Pasif</option>
              </select>
            </div>
            <Button type="submit" className="mt-6 bg-black text-white hover:bg-black/90">Lig Bilgilerini Kaydet</Button>
          </div>
        </form>
      </Card>

      {/* Aktif Sezon */}
      <Accordion type="single" collapsible defaultValue="season">
        <AccordionItem value="season">
          <AccordionTrigger className="rounded-md bg-muted/40 px-3 py-2 text-sm">Aktif Sezon</AccordionTrigger>
          <AccordionContent>
            <Card className="p-4 space-y-4">
              {!active ? (
                <div className="text-sm text-muted-foreground">Önce sezonu oluşturun/kaydedin.</div>
              ) : null}

              {/* Sezon satırı */}
              <form action={saveSeasonAction} className="grid gap-3 md:grid-cols-5">
                <input type="hidden" name="leagueId" value={league.id} />
                <div>
                  <label className="text-sm">Yıl</label>
                  <input name="year" type="number" defaultValue={active?.year ?? new Date().getFullYear()} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm">Sıra</label>
                  <input name="index" type="number" defaultValue={active?.index ?? 1} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm">Başlangıç</label>
                  <input name="startAt" type="date" defaultValue={active ? new Date(active.startAt).toISOString().slice(0,10) : ""} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm">Bitiş</label>
                  <input name="endAt" type="date" defaultValue={active ? new Date(active.endAt).toISOString().slice(0,10) : ""} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm">Sezon Durumu</label>
                  <select name="seasonActive" defaultValue={active?.isActive ? "true" : "true"} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                    <option value="true">Aktif</option>
                    <option value="false">Pasif</option>
                  </select>
                </div>
                <div className="md:col-span-5">
                  <Button type="submit" variant="outline">Sezonu Kaydet</Button>
                </div>
              </form>

              {/* Sezon Oyuncuları (nested accordion) */}
              <Accordion type="single" collapsible defaultValue="players">
                <AccordionItem value="players">
                  <AccordionTrigger className="rounded-md bg-muted/30 px-3 py-2 text-sm">
                    Sezon Oyuncuları {active ? `(${active.memberships.length})` : ""}
                  </AccordionTrigger>
                  <AccordionContent>
                    {active ? (
                      <>
                        <div className="flex items-center justify-between pb-2">
                          <div className="text-sm font-medium">Sezon Oyuncuları (max 20)</div>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm">Oyuncu Ekle</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-xl">
                              <DialogHeader>
                                <DialogTitle>Oyuncu Ekle</DialogTitle>
                              </DialogHeader>
                              <form action={addPlayersAction} className="space-y-3">
                                <input type="hidden" name="leagueId" value={league.id} />
                                <input type="hidden" name="seasonId" value={active.id} />
                                <div className="grid max-h-80 grid-cols-1 gap-2 overflow-auto rounded-md border border-border p-2">
                                  {selectable.map((p) => (
                                    <label key={p.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm">
                                      <div className="flex items-center gap-2">
                                        <input type="checkbox" name="addIds" value={p.id} disabled={p.busy || p.selected} />
                                        <span>{p.displayName}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {p.selected && <Badge>Seçildi</Badge>}
                                        {!p.selected && (p.busy ? <Badge variant="destructive">Seçilemez</Badge> : <Badge variant="secondary">Uygun</Badge>)}
                                      </div>
                                    </label>
                                  ))}
                                </div>
                                <Button type="submit">Ekle</Button>
                              </form>
                            </DialogContent>
                          </Dialog>
                        </div>

                        <div className="overflow-x-auto rounded-md border border-border">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-muted-foreground">
                              <tr>
                                <th className="px-3 py-2 text-left">Oyuncu</th>
                                <th className="px-3 py-2 text-right">İşlem</th>
                              </tr>
                            </thead>
                            <tbody>
                              {active.memberships.map((m) => (
                                <tr key={m.playerId} className="border-t border-border">
                                  <td className="px-3 py-2">{m.player.displayName}</td>
                                  <td className="px-3 py-2 text-right">
                                    <form action={removePlayerAction} className="inline">
                                      <input type="hidden" name="leagueId" value={league.id} />
                                      <input type="hidden" name="seasonId" value={active.id} />
                                      <input type="hidden" name="playerId" value={m.playerId} />
                                      <Button type="submit" size="sm" variant="outline" className="border-destructive text-destructive">Oyuncuyu Sil</Button>
                                    </form>
                                  </td>
                                </tr>
                              ))}
                              {active.memberships.length === 0 && (
                                <tr><td className="px-3 py-4 text-center text-muted-foreground" colSpan={2}>Oyuncu ekli değil.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">Önce sezonu oluşturun/kaydedin.</div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Fikstür (nested accordion) */}
              <Accordion type="single" collapsible defaultValue="fixture">
                <AccordionItem value="fixture">
                  <AccordionTrigger className="rounded-md bg-muted/30 px-3 py-2 text-sm">
                    {active ? `${active.label} Fikstürü` : "Fikstür"}
                  </AccordionTrigger>
                  <AccordionContent>
                    {active ? (
                      <>
                        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="text-sm font-medium">Fikstür</div>
                          <form action={randomFixtureAction} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <input type="hidden" name="leagueId" value={league.id} />
                            <input type="hidden" name="seasonId" value={active.id} />
                            <MapSelect name="defaultMap" label="Varsayılan Harita" defaultValue="RANDOM" className="w-full sm:w-64" />
                            <Button type="submit" size="sm" variant="secondary">
                              Random Fikstür Oluştur
                            </Button>
                          </form>
                        </div>

                        {/* Tur bazlı accordion */}
                        <Accordion type="multiple" className="space-y-2">
                          {[...rounds.keys()].sort((a, b) => a - b).map((r) => {
                            const list = rounds.get(r)!;
                            return (
                              <AccordionItem key={r} value={`round-${r}`} className="border rounded-md">
                                <AccordionTrigger className="px-3 py-2 text-sm">Tur {r}</AccordionTrigger>
                                <AccordionContent>
                                  <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                                    {list.map((m) => (
                                      <Card key={m.id} className="p-3">
                                        <form action={updateMatchAction} className="space-y-2">
                                          <input type="hidden" name="leagueId" value={league.id} />
                                          <input type="hidden" name="matchId" value={m.id} />
                                          <div className="text-xs text-muted-foreground">Tur: {m.round ?? "-"}</div>

                                          <div className="grid grid-cols-2 items-center gap-2">
                                            <div>
                                              <label className="text-xs">Ev Sahibi</label>
                                              <select name="homeId" defaultValue={m.homeId} className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm">
                                                {seasonPlayers.map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
                                              </select>
                                            </div>
                                            <div>
                                              <label className="text-xs">Deplasman</label>
                                              <select name="awayId" defaultValue={m.awayId} className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm">
                                                {seasonPlayers.map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
                                              </select>
                                            </div>
                                          </div>

                                          <div>
                                            <label className="text-xs">Tarih / Saat</label>
                                            <input name="playedAt" type="datetime-local" defaultValue={m.playedAt ? new Date(m.playedAt).toISOString().slice(0,16) : ""} className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
                                          </div>

                                          <MapSelect name="map" label="Harita" defaultValue={(m as any).map || "RANDOM"} className="w-full" />

                                          <div className="flex items-center justify-between pt-1">
                                            <Button type="submit" size="sm" variant="outline">Kaydet</Button>
                                            <form action={deleteMatchAction}>
                                              <input type="hidden" name="leagueId" value={league.id} />
                                              <input type="hidden" name="matchId" value={m.id} />
                                              <Button type="submit" size="sm" variant="outline" className="border-destructive text-destructive">Sil</Button>
                                            </form>
                                          </div>
                                        </form>
                                      </Card>
                                    ))}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                          {rounds.size === 0 && (
                            <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">
                              Bu sezon için maç oluşturulmamış. “Random Fikstür Oluştur” ile başlayın.
                            </div>
                          )}
                        </Accordion>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">Önce sezonu oluşturun/kaydedin.</div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}